/**
 * Optionen: Standardwerte, Zusammenfuehrung, Aufloesung aus dem Markup.
 *
 * Eine Instanz bekommt ihre Optionen genau einmal beim Anlegen -- aus drei
 * Quellen, in dieser Reihenfolge:
 *
 *   1. Standardwerte hier
 *   2. Optionen des create()-Aufrufs
 *   3. data-Attribute am Feld (haben Vorrang, weil sie am konkretesten sind)
 *
 * Danach gehoert der Optionsblock der Instanz. Es wird nichts nachtraeglich
 * global veraendert -- genau daran krankte der Vorgaenger.
 */

import { THUMB_STYLES } from './instance.js';

/**
 * Die Farbfelder, die ohne eigene Angabe im Panel stehen.
 *
 * Sie sind ein Vorschlag, kein Bekenntnis: Acht Buntwerte im Kreis, damit
 * jede Richtung vertreten ist, dazu vier Neutralwerte von Schwarz bis fast
 * Weiss. Die Uebernahme aus dem Vorgaenger hatte fuenf Blautoene, kein
 * Violett und reines Weiss, das auf hellem Panel nicht zu sehen war.
 */
export const DEFAULT_SWATCHES = [
  // Bunt, im Kreis von Rot nach Violett.
  '#e5484d',
  '#f76b15',
  '#ffb224',
  '#46a758',
  '#12a594',
  '#0090ff',
  '#3e63dd',
  '#8e4ec6',
  // Neutral, von dunkel nach hell. Kein reines Weiss -- es verschwindet.
  '#1c2024',
  '#60646c',
  '#b9bbc6',
  '#f0f0f3'
];

export const DEFAULTS = {
  // --- Darstellung ---------------------------------------------------------
  /** Farbschema des Panels: 'light', 'dark' oder 'auto'. */
  themeMode: 'auto',
  /** Gestaltungsvariante des Panels: 'default' oder 'pill'. */
  theme: 'default',
  /**
   * Darstellung des Farbfelds im Eingabefeld:
   * 'bar' Streifen am Rand · 'circle' rund · 'square' eckig ·
   * 'fill' das Feld nimmt die Farbe an · 'fill-behind' Farbe hinter dem Text ·
   * 'none' kein Farbfeld.
   */
  thumbStyle: 'bar',
  /** Seite des Farbfelds: 'end' (Standard) oder 'start'. */
  thumbPosition: 'end',

  // --- Verhalten -----------------------------------------------------------
  /** Wann sich das Panel oeffnet: 'click', 'focus' oder 'manual'. */
  openOn: 'click',
  /** Panel nach Wahl eines Farbfelds schliessen. */
  closeOnSwatch: false,
  /** Fokus nach dem Schliessen zurueck ins Feld. */
  returnFocus: true,
  /** Abstand zwischen Feld und Panel in Pixeln. */
  gap: 4,
  /** Nur zum Pruefen: erzwingt den JS-Fallback trotz Anchor-Positioning. */
  forcePositionFallback: false,

  // --- Farbe ---------------------------------------------------------------
  /** Ausgabeformat: 'auto', 'hex', 'rgb', 'hsl' oder 'mixed'. */
  format: 'auto',
  /** Formate, zwischen denen im Panel gewechselt werden kann. */
  formats: ['hex', 'rgb', 'hsl'],
  /** Formatumschalter im Panel zeigen. */
  formatToggle: false,
  /** Alpha-Regler zeigen. */
  alpha: true,
  /** Alphawert auch dann ausgeben, wenn er 1 ist. */
  forceAlpha: false,
  /** Farbe, mit der ein leeres Feld im Panel startet. */
  defaultColor: '#000000',
  /** Farbfelder im Panel. Leeres Array blendet sie aus. */
  swatches: DEFAULT_SWATCHES,
  /** Nur Farbfelder zeigen, keine freie Auswahl. */
  swatchesOnly: false,

  // --- Bedienelemente ------------------------------------------------------
  clearButton: false,
  closeButton: true,

  // --- Rueckrufe -----------------------------------------------------------
  /** Bei jeder Wertaenderung. */
  onInput: null,
  /** Wenn eine Auswahl abgeschlossen ist. */
  onChange: null,
  onOpen: null,
  onClose: null,

  // --- Beschriftungen ------------------------------------------------------
  labels: {
    dialog: 'Color picker',
    open: 'Open color picker',
    close: 'Close',
    clear: 'Clear',
    area: 'Saturation and brightness. Use the arrow keys to adjust.',
    marker: 'Saturation and brightness',
    markerValue: 'Saturation {s} percent, brightness {v} percent',
    hue: 'Hue',
    alpha: 'Opacity',
    value: 'Color value',
    format: 'Color format',
    swatch: 'Color swatch',
    swatches: 'Color swatches'
  }
};

/** data-Attribute, die eine Option setzen koennen. */
const DATA_MAP = {
  ppThumb: 'thumbStyle',
  ppThumbPosition: 'thumbPosition',
  ppTheme: 'theme',
  ppThemeMode: 'themeMode',
  ppFormat: 'format',
  ppOpenOn: 'openOn',
  ppAlpha: 'alpha',
  ppForceAlpha: 'forceAlpha',
  ppFormatToggle: 'formatToggle',
  ppSwatchesOnly: 'swatchesOnly',
  ppClearButton: 'clearButton',
  ppCloseButton: 'closeButton',
  ppCloseOnSwatch: 'closeOnSwatch',
  ppDefaultColor: 'defaultColor',
  ppGap: 'gap'
};

const BOOLEAN_OPTIONS = new Set([
  'alpha',
  'forceAlpha',
  'formatToggle',
  'swatchesOnly',
  'clearButton',
  'closeButton',
  'closeOnSwatch',
  'forcePositionFallback'
]);

const NUMBER_OPTIONS = new Set(['gap']);

function coerce(name, raw) {
  if (BOOLEAN_OPTIONS.has(name)) return raw !== 'false' && raw !== '0';
  if (NUMBER_OPTIONS.has(name)) {
    const value = Number(raw);
    return Number.isFinite(value) ? value : undefined;
  }
  return raw;
}

/**
 * Optionen aus den data-Attributen eines Feldes lesen.
 *
 * Zusaetzlich wird data-pp-config als JSON gelesen, fuer den Fall, dass viele
 * Optionen an einem Feld haengen. Einzelattribute haben Vorrang davor.
 */
export function readDataOptions(field) {
  const options = {};

  if (field.dataset.ppConfig) {
    try {
      Object.assign(options, JSON.parse(field.dataset.ppConfig));
    } catch {
      console.warn('[pixelpicker] data-pp-config is not valid JSON:', field);
    }
  }

  for (const [key, name] of Object.entries(DATA_MAP)) {
    const raw = field.dataset[key];
    if (raw === undefined) continue;
    const value = coerce(name, raw);
    if (value !== undefined) options[name] = value;
  }

  // Farbfelder als kommagetrennte Liste.
  if (field.dataset.ppSwatches !== undefined) {
    options.swatches = field.dataset.ppSwatches
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return options;
}

/** Warnen, wo ein Wert nicht zu seiner Option passt, und zurueckfallen. */
function validate(options) {
  if (!THUMB_STYLES.includes(options.thumbStyle)) {
    console.warn(
      `[pixelpicker] Unknown thumbStyle "${options.thumbStyle}". ` +
        `Expected one of: ${THUMB_STYLES.join(', ')}. Falling back to "bar".`
    );
    options.thumbStyle = 'bar';
  }

  if (options.themeMode === 'auto') {
    options.themeMode =
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
  }

  if (!Array.isArray(options.swatches)) options.swatches = [];

  return options;
}

/**
 * Die drei Quellen zu einem Optionsblock zusammenfuehren.
 * @param {object} userOptions Optionen des create()-Aufrufs.
 * @param {HTMLElement} field Das Feld, dessen data-Attribute gelesen werden.
 */
export function resolveOptions(userOptions, field) {
  const merged = {
    ...DEFAULTS,
    ...userOptions,
    ...readDataOptions(field),
    labels: { ...DEFAULTS.labels, ...(userOptions.labels || {}) }
  };

  // Ein eigenes Array je Instanz: sonst teilen sich alle Instanzen dasselbe.
  merged.swatches = [...merged.swatches];
  merged.formats = [...merged.formats];

  return validate(merged);
}
