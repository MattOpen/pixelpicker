/**
 * Positionierung des Panels am Eingabefeld.
 *
 * Zwei Wege, und der Browser entscheidet, welcher greift:
 *
 * 1. CSS Anchor Positioning -- der Browser rechnet selbst, inklusive Ausweichen
 *    an den Viewport-Raendern. Kostet zur Laufzeit nichts und haelt die Position
 *    auch beim Scrollen ohne Listener nach.
 * 2. JavaScript-Fallback ueber getBoundingClientRect fuer aeltere Browser.
 *
 * Beides setzt voraus, dass das Panel im Top Layer liegt (Popover API). Erst
 * dadurch entfallen die Sonderfaelle, an denen eine klassische Loesung
 * scheitert: ein Vorfahr mit overflow: hidden, ein transform (das einen neuen
 * Containing Block erzeugt) oder ein Scroll-Container.
 *
 * Auftrag pixelpicker-149, Punkt 6.
 */

let anchorSupport;
let popoverSupport;

/** Unterstuetzt der Browser CSS Anchor Positioning? */
export function supportsAnchorPositioning() {
  if (anchorSupport === undefined) {
    anchorSupport =
      typeof CSS !== 'undefined' &&
      typeof CSS.supports === 'function' &&
      CSS.supports('anchor-name', '--probe');
  }
  return anchorSupport;
}

/** Unterstuetzt der Browser die Popover API? */
export function supportsPopover() {
  if (popoverSupport === undefined) {
    popoverSupport =
      typeof HTMLElement !== 'undefined' &&
      Object.prototype.hasOwnProperty.call(HTMLElement.prototype, 'popover');
  }
  return popoverSupport;
}

let anchorCounter = 0;

/** Einen eindeutigen anchor-name vergeben. */
export function nextAnchorName() {
  anchorCounter += 1;
  return `--pp-anchor-${anchorCounter}`;
}

/**
 * Panel und Feld ueber CSS Anchor Positioning verbinden.
 * Die Ausweichregeln stehen im Stylesheet, hier wird nur der Name gesetzt.
 */
export function linkAnchor(anchor, panel, anchorName) {
  anchor.style.setProperty('anchor-name', anchorName);
  panel.style.setProperty('position-anchor', anchorName);
}

/** Die Verbindung wieder loesen (beim Zerstoeren einer Instanz). */
export function unlinkAnchor(anchor, panel) {
  anchor.style.removeProperty('anchor-name');
  panel.style.removeProperty('position-anchor');
}

/**
 * Position im Fallback berechnen und setzen.
 *
 * Bevorzugt unterhalb des Feldes, linksbuendig. Reicht der Platz nach unten
 * nicht und oberhalb schon, klappt das Panel nach oben; seitlich wird es in den
 * Viewport geschoben, statt ueber den Rand hinauszulaufen.
 *
 * @param {HTMLElement} anchor Das Eingabefeld.
 * @param {HTMLElement} panel Das Panel.
 * @param {{gap?: number, padding?: number}} [options] gap = Abstand zum Feld,
 *   padding = Mindestabstand zum Viewport-Rand.
 */
export function positionFallback(anchor, panel, options = {}) {
  const gap = options.gap ?? 4;
  const padding = options.padding ?? 8;

  const rect = anchor.getBoundingClientRect();
  const panelWidth = panel.offsetWidth;
  const panelHeight = panel.offsetHeight;
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;

  const spaceBelow = viewportHeight - rect.bottom - gap;
  const spaceAbove = rect.top - gap;
  const flip = spaceBelow < panelHeight && spaceAbove > spaceBelow;

  // Im Top Layer bezieht sich die Position auf den Viewport, nicht auf das
  // Dokument -- scrollY gehoert deshalb nicht in die Rechnung.
  let top = flip ? rect.top - panelHeight - gap : rect.bottom + gap;
  let left = rect.left;

  if (left + panelWidth > viewportWidth - padding) {
    left = viewportWidth - panelWidth - padding;
  }
  if (left < padding) left = padding;

  // Passt es weder darueber noch darunter, klebt es am Rand statt teilweise
  // ausserhalb zu stehen.
  if (top < padding) top = padding;
  if (top + panelHeight > viewportHeight - padding) {
    top = Math.max(padding, viewportHeight - panelHeight - padding);
  }

  panel.style.left = `${Math.round(left)}px`;
  panel.style.top = `${Math.round(top)}px`;
  panel.classList.toggle('pp-panel--flipped', flip);
}

/**
 * Das Panel positioniert halten, solange es offen ist.
 *
 * Nur im Fallback noetig: Bei Anchor Positioning macht der Browser das selbst.
 *
 * @returns {() => void} Aufraeumfunktion -- sie MUSS beim Schliessen laufen,
 *   sonst bleiben Listener auf Fenster und Scroll-Containern zurueck.
 */
export function trackPosition(anchor, panel, options = {}) {
  if (supportsAnchorPositioning() && !options.forceFallback) {
    return () => {};
  }

  const update = () => positionFallback(anchor, panel, options);
  update();

  // capture: true faengt auch Scrollen in Containern zwischen Feld und Wurzel.
  window.addEventListener('scroll', update, { passive: true, capture: true });
  window.addEventListener('resize', update, { passive: true });

  // Groessenaenderungen des Panels selbst -- etwa wenn die Farbfelder umbrechen.
  let observer;
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(update);
    observer.observe(panel);
    observer.observe(anchor);
  }

  return () => {
    window.removeEventListener('scroll', update, { capture: true });
    window.removeEventListener('resize', update);
    observer?.disconnect();
  };
}
