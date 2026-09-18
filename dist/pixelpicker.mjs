/*!
 * pixelpicker v1.0.0 -- https://mattopen.github.io/pixelpicker/
 * Copyright (c) 2026 pixelquadrat GmbH
 * Copyright (c) 2021 Mohammed Bassit -- derived from Coloris (MIT)
 * Licensed under the MIT License.
 */

// src/color.js
function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}
function hexPair(value) {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
}
function hsvaToRgba({ h, s, v, a = 1 }) {
  const saturation = s / 100;
  const value = v / 100;
  const chroma = saturation * value;
  const hueBy60 = h / 60;
  const x = chroma * (1 - Math.abs(hueBy60 % 2 - 1));
  const m = value - chroma;
  const index = Math.floor(hueBy60) % 6;
  const red = [chroma, x, 0, 0, x, chroma][index] + m;
  const green = [x, chroma, chroma, x, 0, 0][index] + m;
  const blue = [0, 0, x, chroma, chroma, x][index] + m;
  return {
    r: Math.round(red * 255),
    g: Math.round(green * 255),
    b: Math.round(blue * 255),
    a
  };
}
function rgbaToHsva({ r, g, b, a = 1 }) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const chroma = max - min;
  let hue = 0;
  let saturation = 0;
  if (chroma) {
    if (max === red) hue = (green - blue) / chroma;
    else if (max === green) hue = 2 + (blue - red) / chroma;
    else hue = 4 + (red - green) / chroma;
    if (max) saturation = chroma / max;
  }
  hue = Math.round(hue * 60);
  return {
    h: hue < 0 ? hue + 360 : hue,
    s: Math.round(saturation * 100),
    v: Math.round(max * 100),
    a
  };
}
function hsvaToHsla({ h, s, v, a = 1 }) {
  const value = v / 100;
  const lightness = value * (1 - s / 100 / 2);
  let saturation = 0;
  if (lightness > 0 && lightness < 1) {
    saturation = Math.round(
      (value - lightness) / Math.min(lightness, 1 - lightness) * 100
    );
  }
  return { h, s: saturation, l: Math.round(lightness * 100), a };
}
var RGB_PATTERN = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i;
function parseColor(str) {
  if (typeof str !== "string") return null;
  const value = str.trim();
  if (value === "") return null;
  const probe = document.createElement("div");
  probe.style.color = "";
  probe.style.color = value;
  if (probe.style.color === "") return null;
  probe.style.display = "none";
  document.head.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  const match = RGB_PATTERN.exec(computed);
  if (!match) return null;
  let alpha = match[4] === void 0 ? 1 : parseFloat(match[4]);
  if (String(match[4]).endsWith("%")) alpha /= 100;
  return {
    r: clamp(Math.round(parseFloat(match[1])), 0, 255),
    g: clamp(Math.round(parseFloat(match[2])), 0, 255),
    b: clamp(Math.round(parseFloat(match[3])), 0, 255),
    // Chromium rundet Alpha beim Auslesen ungenau -- auf zwei Stellen festnageln.
    a: clamp(Number(alpha.toFixed(2)), 0, 1)
  };
}
function isValidColor(str) {
  return parseColor(str) !== null;
}
function detectFormat(str) {
  if (typeof str !== "string") return "hex";
  const value = str.trim().toLowerCase();
  if (value.startsWith("rgb")) return "rgb";
  if (value.startsWith("hsl")) return "hsl";
  return "hex";
}
function rgbaToHex({ r, g, b, a = 1 }, withAlpha = false) {
  const base = `#${hexPair(r)}${hexPair(g)}${hexPair(b)}`;
  if (a < 1 || withAlpha) return base + hexPair(a * 255);
  return base;
}
function rgbaToString({ r, g, b, a = 1 }, withAlpha = false) {
  if (a < 1 || withAlpha) return `rgba(${r}, ${g}, ${b}, ${a})`;
  return `rgb(${r}, ${g}, ${b})`;
}
function hslaToString({ h, s, l, a = 1 }, withAlpha = false) {
  if (a < 1 || withAlpha) return `hsla(${h}, ${s}%, ${l}%, ${a})`;
  return `hsl(${h}, ${s}%, ${l}%)`;
}
function formatColor(rgba, format, forceAlpha = false) {
  let target = format;
  if (target === "mixed") target = rgba.a === 1 ? "hex" : "rgb";
  switch (target) {
    case "rgb":
      return rgbaToString(rgba, forceAlpha);
    case "hsl":
      return hslaToString(hsvaToHsla(rgbaToHsva(rgba)), forceAlpha);
    default:
      return rgbaToHex(rgba, forceAlpha);
  }
}
function luminance({ r, g, b }) {
  const channel = (value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
function contrastColor(rgba) {
  return luminance(rgba) > 0.179 ? "#000000" : "#ffffff";
}

// src/position.js
var anchorSupport;
var popoverSupport;
function supportsAnchorPositioning() {
  if (anchorSupport === void 0) {
    anchorSupport = typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports("anchor-name", "--probe");
  }
  return anchorSupport;
}
function supportsPopover() {
  if (popoverSupport === void 0) {
    popoverSupport = typeof HTMLElement !== "undefined" && Object.prototype.hasOwnProperty.call(HTMLElement.prototype, "popover");
  }
  return popoverSupport;
}
var anchorCounter = 0;
function nextAnchorName() {
  anchorCounter += 1;
  return `--pp-anchor-${anchorCounter}`;
}
function linkAnchor(anchor, panel, anchorName) {
  anchor.style.setProperty("anchor-name", anchorName);
  panel.style.setProperty("position-anchor", anchorName);
}
function unlinkAnchor(anchor, panel) {
  anchor.style.removeProperty("anchor-name");
  panel.style.removeProperty("position-anchor");
}
function positionFallback(anchor, panel, options = {}) {
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
  let top = flip ? rect.top - panelHeight - gap : rect.bottom + gap;
  let left = rect.left;
  if (left + panelWidth > viewportWidth - padding) {
    left = viewportWidth - panelWidth - padding;
  }
  if (left < padding) left = padding;
  if (top < padding) top = padding;
  if (top + panelHeight > viewportHeight - padding) {
    top = Math.max(padding, viewportHeight - panelHeight - padding);
  }
  panel.style.left = `${Math.round(left)}px`;
  panel.style.top = `${Math.round(top)}px`;
  panel.classList.toggle("pp-panel--flipped", flip);
}
function trackPosition(anchor, panel, options = {}) {
  if (supportsAnchorPositioning() && !options.forceFallback) {
    return () => {
    };
  }
  const update = () => positionFallback(anchor, panel, options);
  update();
  window.addEventListener("scroll", update, { passive: true, capture: true });
  window.addEventListener("resize", update, { passive: true });
  let observer;
  if (typeof ResizeObserver !== "undefined") {
    observer = new ResizeObserver(update);
    observer.observe(panel);
    observer.observe(anchor);
  }
  return () => {
    window.removeEventListener("scroll", update, { capture: true });
    window.removeEventListener("resize", update);
    observer?.disconnect();
  };
}

// src/panel.js
var panelCounter = 0;
function template(id, labels, formats) {
  const formatButtons = formats.map(
    (format) => `
      <button type="button" class="pp-format__option" data-pp-format="${format}"
              role="radio" aria-checked="false">${format.toUpperCase()}</button>`
  ).join("");
  return `
    <div class="pp-area" id="${id}-area" role="application" aria-label="${labels.area}" tabindex="-1">
      <div class="pp-area__saturation"></div>
      <div class="pp-area__value"></div>
      <div class="pp-marker" id="${id}-marker" tabindex="0" role="slider"
           aria-label="${labels.marker}" aria-valuemin="0" aria-valuemax="100"></div>
    </div>

    <div class="pp-controls">
      <div class="pp-preview" id="${id}-preview" aria-hidden="true"></div>
      <div class="pp-sliders">
        <label class="pp-slider pp-slider--hue">
          <span class="pp-visually-hidden">${labels.hue}</span>
          <input type="range" min="0" max="360" step="1" id="${id}-hue"
                 class="pp-slider__input" aria-label="${labels.hue}">
        </label>
        <label class="pp-slider pp-slider--alpha">
          <span class="pp-visually-hidden">${labels.alpha}</span>
          <input type="range" min="0" max="100" step="1" id="${id}-alpha"
                 class="pp-slider__input" aria-label="${labels.alpha}">
        </label>
      </div>
    </div>

    <div class="pp-value">
      <input type="text" class="pp-value__input" id="${id}-value" spellcheck="false"
             autocomplete="off" aria-label="${labels.value}">
      <div class="pp-format" role="radiogroup" aria-label="${labels.format}">${formatButtons}</div>
    </div>

    <div class="pp-swatches" id="${id}-swatches" role="group" aria-label="${labels.swatches}"></div>

    <div class="pp-actions">
      <button type="button" class="pp-action pp-action--clear" id="${id}-clear">${labels.clear}</button>
      <button type="button" class="pp-action pp-action--close" id="${id}-close">${labels.close}</button>
    </div>
  `;
}
var Panel = class {
  /**
   * @param {object} options Aufgeloeste Optionen der Instanz.
   * @param {(color: object | null, done: boolean) => void} onChange Wird bei
   *   jeder Aenderung gerufen. done === true heisst: Auswahl abgeschlossen.
   * @param {() => void} onClose Wird beim Schliessen gerufen.
   */
  constructor(options, onChange, onClose) {
    panelCounter += 1;
    this.id = `pp-${panelCounter}`;
    this.options = options;
    this.onChange = onChange;
    this.onClose = onClose;
    this.hsva = { h: 0, s: 0, v: 0, a: 1 };
    this.format = options.format === "auto" ? "hex" : options.format;
    this.isOpen = false;
    this.anchorName = nextAnchorName();
    this.stopTracking = null;
    this.dragging = null;
    this.#build();
  }
  #build() {
    const el = document.createElement("div");
    el.id = this.id;
    el.className = `pp-panel pp-panel--${this.options.theme}`;
    el.dataset.ppTheme = this.options.themeMode;
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", this.options.labels.dialog);
    el.innerHTML = template(this.id, this.options.labels, this.options.formats);
    if (supportsPopover()) {
      el.popover = "manual";
    } else {
      el.classList.add("pp-panel--no-popover");
      el.hidden = true;
    }
    this.el = el;
    this.area = el.querySelector(".pp-area");
    this.marker = el.querySelector(".pp-marker");
    this.preview = el.querySelector(".pp-preview");
    this.hueInput = el.querySelector(`#${this.id}-hue`);
    this.alphaInput = el.querySelector(`#${this.id}-alpha`);
    this.valueInput = el.querySelector(".pp-value__input");
    this.swatchesEl = el.querySelector(".pp-swatches");
    this.clearBtn = el.querySelector(".pp-action--clear");
    this.closeBtn = el.querySelector(".pp-action--close");
    this.#applyOptionVisibility();
    this.#renderSwatches();
    this.#bind();
    document.body.appendChild(el);
  }
  /** Optionale Teile ein- oder ausblenden. */
  #applyOptionVisibility() {
    const { alpha, formatToggle, clearButton, closeButton, swatches } = this.options;
    this.el.classList.toggle("pp-panel--no-alpha", !alpha);
    this.el.querySelector(".pp-format").hidden = !formatToggle;
    this.clearBtn.hidden = !clearButton;
    this.closeBtn.hidden = !closeButton;
    this.swatchesEl.hidden = !swatches.length;
    this.el.querySelector(".pp-actions").hidden = !clearButton && !closeButton;
    if (this.options.swatchesOnly) {
      this.el.classList.add("pp-panel--swatches-only");
    }
  }
  #renderSwatches() {
    const { swatches, labels } = this.options;
    if (!swatches.length) return;
    this.swatchesEl.innerHTML = swatches.map((swatch) => {
      const rgba = parseColor(swatch);
      const title = rgba ? rgbaToHex(rgba) : swatch;
      return `<button type="button" class="pp-swatch" style="--pp-swatch: ${swatch}"
                  data-pp-swatch="${swatch}" title="${title}"
                  aria-label="${labels.swatch}: ${title}"></button>`;
    }).join("");
  }
  #bind() {
    const on = (target, type, handler, opts) => {
      target.addEventListener(type, handler, opts);
      this.listeners.push(() => target.removeEventListener(type, handler, opts));
    };
    this.listeners = [];
    on(this.area, "pointerdown", (event) => {
      this.area.setPointerCapture(event.pointerId);
      this.dragging = event.pointerId;
      this.#pickFromArea(event);
      event.preventDefault();
    });
    on(this.area, "pointermove", (event) => {
      if (this.dragging === event.pointerId) this.#pickFromArea(event);
    });
    const endDrag = (event) => {
      if (this.dragging !== event.pointerId) return;
      this.dragging = null;
      this.area.releasePointerCapture?.(event.pointerId);
      this.#emit(true);
    };
    on(this.area, "pointerup", endDrag);
    on(this.area, "pointercancel", endDrag);
    on(this.marker, "keydown", (event) => {
      const step = event.shiftKey ? 10 : 1;
      const moves = {
        ArrowUp: [0, step],
        ArrowDown: [0, -step],
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0]
      };
      const move = moves[event.key];
      if (!move) return;
      this.setHsva({
        ...this.hsva,
        s: clamp(this.hsva.s + move[0], 0, 100),
        v: clamp(this.hsva.v + move[1], 0, 100)
      });
      this.#emit(true);
      event.preventDefault();
    });
    on(this.hueInput, "input", () => {
      this.setHsva({ ...this.hsva, h: Number(this.hueInput.value) });
      this.#emit(false);
    });
    on(this.hueInput, "change", () => this.#emit(true));
    on(this.alphaInput, "input", () => {
      this.setHsva({ ...this.hsva, a: Number(this.alphaInput.value) / 100 });
      this.#emit(false);
    });
    on(this.alphaInput, "change", () => this.#emit(true));
    on(this.valueInput, "input", () => {
      const rgba = parseColor(this.valueInput.value);
      this.valueInput.classList.toggle("pp-value__input--invalid", !rgba);
      if (!rgba) return;
      this.setHsva(rgbaToHsva(rgba), { skipValueInput: true });
      this.#emit(false);
    });
    on(this.valueInput, "change", () => {
      if (parseColor(this.valueInput.value)) this.#emit(true);
      else this.#syncValueInput();
    });
    on(this.el, "click", (event) => {
      const swatch = event.target.closest("[data-pp-swatch]");
      if (swatch) {
        const rgba = parseColor(swatch.dataset.ppSwatch);
        if (rgba) {
          this.setHsva(rgbaToHsva(rgba));
          this.#emit(true);
          if (this.options.closeOnSwatch) this.close();
        }
        return;
      }
      const format = event.target.closest("[data-pp-format]");
      if (format) {
        this.setFormat(format.dataset.ppFormat);
        this.#emit(true);
        return;
      }
      if (event.target === this.clearBtn) {
        this.onChange(null, true);
        this.close();
        return;
      }
      if (event.target === this.closeBtn) this.close();
    });
    on(this.el, "pointerdown", (event) => event.stopPropagation());
  }
  /** Farbe aus einem Zeigerereignis auf der Flaeche ableiten. */
  #pickFromArea(event) {
    const rect = this.area.getBoundingClientRect();
    const x = clamp(event.clientX - rect.left, 0, rect.width);
    const y = clamp(event.clientY - rect.top, 0, rect.height);
    this.setHsva({
      ...this.hsva,
      s: x / rect.width * 100,
      v: 100 - y / rect.height * 100
    });
    this.#emit(false);
  }
  #emit(done) {
    this.onChange(hsvaToRgba(this.hsva), done);
  }
  /**
   * Farbe setzen und die Anzeige nachziehen.
   * @param {object} hsva
   * @param {{skipValueInput?: boolean}} [opts] Das Textfeld nicht ueberschreiben,
   *   waehrend der Nutzer darin tippt.
   */
  setHsva(hsva, opts = {}) {
    this.hsva = {
      h: clamp(hsva.h ?? 0, 0, 360),
      s: clamp(hsva.s ?? 0, 0, 100),
      v: clamp(hsva.v ?? 0, 0, 100),
      a: clamp(hsva.a ?? 1, 0, 1)
    };
    this.#render(opts);
  }
  /** Farbe aus einer Zeichenkette uebernehmen. */
  setColor(str, opts = {}) {
    const rgba = parseColor(str);
    if (!rgba) return false;
    if (this.options.format === "auto") {
      this.setFormat(this.format, { silent: true });
    }
    this.setHsva(rgbaToHsva(rgba), opts);
    return true;
  }
  setFormat(format, opts = {}) {
    this.format = format;
    this.el.querySelectorAll("[data-pp-format]").forEach((button) => {
      const active = button.dataset.ppFormat === format;
      button.classList.toggle("pp-format__option--active", active);
      button.setAttribute("aria-checked", String(active));
    });
    if (!opts.silent) this.#syncValueInput();
  }
  /** Aktuelle Farbe als Zeichenkette im eingestellten Format. */
  getValue() {
    return formatColor(hsvaToRgba(this.hsva), this.format, this.options.forceAlpha);
  }
  #syncValueInput() {
    this.valueInput.value = this.getValue();
    this.valueInput.classList.remove("pp-value__input--invalid");
  }
  #render(opts = {}) {
    const rgba = hsvaToRgba(this.hsva);
    const opaque = rgbaToHex({ ...rgba, a: 1 });
    const hueColor = rgbaToString(hsvaToRgba({ h: this.hsva.h, s: 100, v: 100, a: 1 }));
    this.area.style.setProperty("--pp-hue", hueColor);
    this.preview.style.setProperty("--pp-color", rgbaToString(rgba, true));
    this.marker.style.setProperty("--pp-marker-color", opaque);
    this.marker.style.setProperty("--pp-marker-contrast", contrastColor(rgba));
    this.marker.style.left = `${this.hsva.s}%`;
    this.marker.style.top = `${100 - this.hsva.v}%`;
    this.alphaInput.style.setProperty("--pp-alpha-to", opaque);
    this.hueInput.value = String(Math.round(this.hsva.h));
    this.alphaInput.value = String(Math.round(this.hsva.a * 100));
    const hsla = hsvaToHsla(this.hsva);
    this.marker.setAttribute("aria-valuenow", String(Math.round(this.hsva.v)));
    this.marker.setAttribute(
      "aria-valuetext",
      this.options.labels.markerValue.replace("{s}", String(Math.round(this.hsva.s))).replace("{v}", String(Math.round(this.hsva.v))).replace("{l}", String(hsla.l))
    );
    if (!opts.skipValueInput) this.#syncValueInput();
  }
  /**
   * Panel oeffnen und am Feld verankern.
   * @param {HTMLElement} anchor Das Eingabefeld.
   */
  open(anchor) {
    if (this.isOpen) return;
    this.anchor = anchor;
    if (supportsPopover()) {
      this.el.showPopover();
    } else {
      this.el.hidden = false;
    }
    const useFallback = this.options.forcePositionFallback || !supportsAnchorPositioning();
    this.el.classList.toggle("pp-panel--js-position", useFallback);
    if (!useFallback) linkAnchor(anchor, this.el, this.anchorName);
    this.stopTracking = trackPosition(anchor, this.el, {
      gap: this.options.gap,
      forceFallback: this.options.forcePositionFallback
    });
    this.isOpen = true;
    this.el.classList.add("pp-panel--open");
  }
  close() {
    if (!this.isOpen) return;
    this.stopTracking?.();
    this.stopTracking = null;
    if (this.anchor) unlinkAnchor(this.anchor, this.el);
    if (supportsPopover()) {
      this.el.hidePopover();
    } else {
      this.el.hidden = true;
    }
    this.isOpen = false;
    this.el.classList.remove("pp-panel--open");
    this.anchor = null;
    this.onClose();
  }
  /** Den ersten bedienbaren Punkt fokussieren (Tastaturbedienung). */
  focusFirst() {
    this.marker.focus({ preventScroll: true });
  }
  /** Alles zurueckbauen: Listener, Tracking, DOM-Knoten. */
  destroy() {
    this.stopTracking?.();
    this.listeners.forEach((off) => off());
    this.listeners = [];
    if (this.isOpen && supportsPopover()) this.el.hidePopover();
    this.el.remove();
  }
};

// src/instance.js
var THUMB_STYLES = ["bar", "circle", "square", "fill", "fill-behind", "none"];
var instanceCounter = 0;
var PickerInstance = class {
  /**
   * @param {HTMLElement} field Das Eingabefeld.
   * @param {object} options Bereits aufgeloeste Optionen.
   */
  constructor(field, options) {
    instanceCounter += 1;
    this.id = `pp-instance-${instanceCounter}`;
    this.field = field;
    this.options = options;
    this.panel = null;
    this.wrapper = null;
    this.thumb = null;
    this.listeners = [];
    this.destroyed = false;
    this.valueBeforeOpen = null;
    this.format = options.format === "auto" ? detectFormat(field.value) : options.format;
    this.#buildThumb();
    this.#bindField();
    this.#syncThumb();
    field.dataset.pixelpicker = this.id;
  }
  // ---------------------------------------------------------------- Darstellung
  /**
   * Wrapper und Farbfeld anlegen.
   *
   * Das Feld bekommt einen Wrapper, damit das Farbfeld darin liegen kann. Der
   * Wrapper traegt den Modifier, nicht das Feld -- so kann das Farbfeld ueber
   * dem Feld liegen (fill-behind) oder darin (bar, circle, square).
   */
  #buildThumb() {
    const { thumbStyle } = this.options;
    if (thumbStyle === "none") return;
    const parent = this.field.parentNode;
    let wrapper = parent;
    if (!parent.classList.contains("pp-field")) {
      wrapper = document.createElement("div");
      wrapper.className = "pp-field";
      parent.insertBefore(wrapper, this.field);
      wrapper.appendChild(this.field);
      this.createdWrapper = true;
    }
    wrapper.classList.add(`pp-field--${thumbStyle}`);
    if (this.options.thumbPosition === "start") {
      wrapper.classList.add("pp-field--thumb-start");
    }
    const thumb = document.createElement("button");
    thumb.type = "button";
    thumb.className = "pp-thumb";
    thumb.tabIndex = -1;
    thumb.setAttribute("aria-label", this.options.labels.open);
    thumb.setAttribute("aria-hidden", "true");
    wrapper.appendChild(thumb);
    const radius = getComputedStyle(this.field).borderRadius;
    if (radius && radius !== "0px") {
      wrapper.style.setProperty("--pp-field-radius", radius);
    }
    this.wrapper = wrapper;
    this.thumb = thumb;
  }
  /** Farbe des Feldes in den Thumb uebernehmen. */
  #syncThumb() {
    const rgba = parseColor(this.field.value);
    if (this.wrapper) {
      this.wrapper.classList.toggle("pp-field--empty", !rgba);
    }
    if (!this.thumb) return;
    if (rgba) {
      const color = formatColor(rgba, "rgb", true);
      this.thumb.style.setProperty("--pp-thumb-color", color);
      this.wrapper.style.setProperty("--pp-thumb-color", color);
      this.wrapper.style.setProperty("--pp-thumb-contrast", contrastColor(rgba));
    } else {
      this.thumb.style.removeProperty("--pp-thumb-color");
      this.wrapper.style.removeProperty("--pp-thumb-color");
      this.wrapper.style.removeProperty("--pp-thumb-contrast");
    }
  }
  // ------------------------------------------------------------------- Ereignisse
  #on(target, type, handler, opts) {
    target.addEventListener(type, handler, opts);
    this.listeners.push(() => target.removeEventListener(type, handler, opts));
  }
  #bindField() {
    const { field } = this;
    this.#on(field, "focus", () => {
      if (this.options.openOn === "focus") this.open();
    });
    this.#on(field, "click", () => {
      if (this.options.openOn !== "manual") this.open();
    });
    this.#on(field, "input", () => {
      this.#syncThumb();
      const rgba = parseColor(field.value);
      if (rgba && this.panel?.isOpen) {
        this.panel.setHsva(rgbaToHsva(rgba), { skipValueInput: false });
      }
      this.#emit("input");
    });
    this.#on(field, "change", () => {
      this.#syncThumb();
      this.#emit("change");
    });
    this.#on(field, "keydown", (event) => {
      if (event.key === "Escape" && this.isOpen()) {
        this.close({ revert: true });
        event.stopPropagation();
        return;
      }
      if (event.key === "ArrowDown" && event.altKey) {
        if (!this.isOpen()) this.open();
        this.panel?.focusFirst();
        event.preventDefault();
      }
    });
    if (this.thumb) {
      this.#on(this.thumb, "click", (event) => {
        event.preventDefault();
        this.field.focus();
        this.toggle();
      });
    }
  }
  // ------------------------------------------------------------------ Oeffnen/Schliessen
  isOpen() {
    return Boolean(this.panel?.isOpen);
  }
  open() {
    if (this.destroyed || this.isOpen()) return;
    if (this.field.disabled || this.field.readOnly) return;
    if (!this.panel) this.#createPanel();
    this.valueBeforeOpen = this.field.value;
    this.panel.setFormat(this.format, { silent: true });
    this.panel.setColor(this.field.value || this.options.defaultColor);
    this.panel.open(this.field);
    this.#emit("open");
  }
  close(opts = {}) {
    if (!this.isOpen()) return;
    if (opts.revert && this.valueBeforeOpen !== null) {
      this.#setFieldValue(this.valueBeforeOpen, { silent: false });
    }
    this.panel.close();
  }
  toggle() {
    if (this.isOpen()) this.close();
    else this.open();
  }
  #createPanel() {
    this.panel = new Panel(
      this.options,
      (rgba, done) => this.#onPanelChange(rgba, done),
      () => this.#onPanelClose()
    );
  }
  #onPanelChange(rgba, done) {
    const value = rgba === null ? "" : formatColor(rgba, this.panel.format, this.options.forceAlpha);
    this.format = this.panel.format;
    this.#setFieldValue(value, { silent: false });
    if (done) this.#emit("change");
  }
  #onPanelClose() {
    this.#emit("close");
    if (this.options.returnFocus) {
      this.field.focus({ preventScroll: true });
    }
  }
  // ------------------------------------------------------------------------ Wert
  /**
   * Wert ins Feld schreiben und die ueblichen Ereignisse ausloesen.
   * Formulare und fremde Listener sehen damit dasselbe wie bei einer Eingabe
   * von Hand.
   */
  #setFieldValue(value, { silent }) {
    if (this.field.value === value) return;
    this.field.value = value;
    this.field.setAttribute("value", value);
    this.#syncThumb();
    if (!silent) {
      this.field.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
  /** Aktueller Wert des Feldes. */
  getValue() {
    return this.field.value;
  }
  /**
   * Wert von aussen setzen.
   * @param {string} value
   * @param {{silent?: boolean}} [opts] silent unterdrueckt das input-Ereignis.
   */
  setValue(value, opts = {}) {
    const normalized = value === "" || value === null ? "" : value;
    this.#setFieldValue(normalized, { silent: opts.silent === true });
    if (this.panel?.isOpen && normalized) {
      this.panel.setColor(normalized);
    }
    return this;
  }
  #emit(type) {
    const detail = { instance: this, value: this.field.value };
    this.field.dispatchEvent(
      new CustomEvent(`pixelpicker:${type}`, { bubbles: true, detail })
    );
    const handler = this.options[`on${type[0].toUpperCase()}${type.slice(1)}`];
    if (typeof handler === "function") handler(this.field.value, this);
  }
  // --------------------------------------------------------------------- Abbau
  /**
   * Instanz vollstaendig zurueckbauen.
   *
   * 🔴 Alles, was angelegt wurde, wird hier wieder entfernt: Listener, Panel,
   * Thumb und ein selbst erzeugter Wrapper. Ein Feld nach destroy() ist
   * ununterscheidbar von einem, das nie eine Instanz hatte.
   */
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.panel?.destroy();
    this.panel = null;
    this.listeners.forEach((off) => off());
    this.listeners = [];
    this.thumb?.remove();
    this.thumb = null;
    if (this.wrapper) {
      THUMB_STYLES.forEach((style) => this.wrapper.classList.remove(`pp-field--${style}`));
      this.wrapper.classList.remove("pp-field--thumb-start", "pp-field--empty");
      this.wrapper.style.removeProperty("--pp-thumb-color");
      this.wrapper.style.removeProperty("--pp-thumb-contrast");
      this.wrapper.style.removeProperty("--pp-field-radius");
      if (this.createdWrapper) {
        this.wrapper.replaceWith(this.field);
      } else {
        this.wrapper.classList.remove("pp-field");
      }
      this.wrapper = null;
    }
    delete this.field.dataset.pixelpicker;
  }
};

// src/options.js
var DEFAULT_SWATCHES = [
  "#264653",
  "#2a9d8f",
  "#8ab17d",
  "#e9c46a",
  "#f4a261",
  "#e76f51",
  "#d62828",
  "#023e8a",
  "#0077b6",
  "#00b4d8",
  "#48cae4",
  "#ffffff"
];
var DEFAULTS = {
  // --- Darstellung ---------------------------------------------------------
  /** Farbschema des Panels: 'light', 'dark' oder 'auto'. */
  themeMode: "auto",
  /** Gestaltungsvariante des Panels: 'default' oder 'pill'. */
  theme: "default",
  /**
   * Darstellung des Farbfelds im Eingabefeld:
   * 'bar' Streifen am Rand · 'circle' rund · 'square' eckig ·
   * 'fill' das Feld nimmt die Farbe an · 'fill-behind' Farbe hinter dem Text ·
   * 'none' kein Farbfeld.
   */
  thumbStyle: "bar",
  /** Seite des Farbfelds: 'end' (Standard) oder 'start'. */
  thumbPosition: "end",
  // --- Verhalten -----------------------------------------------------------
  /** Wann sich das Panel oeffnet: 'click', 'focus' oder 'manual'. */
  openOn: "click",
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
  format: "auto",
  /** Formate, zwischen denen im Panel gewechselt werden kann. */
  formats: ["hex", "rgb", "hsl"],
  /** Formatumschalter im Panel zeigen. */
  formatToggle: false,
  /** Alpha-Regler zeigen. */
  alpha: true,
  /** Alphawert auch dann ausgeben, wenn er 1 ist. */
  forceAlpha: false,
  /** Farbe, mit der ein leeres Feld im Panel startet. */
  defaultColor: "#000000",
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
    dialog: "Color picker",
    open: "Open color picker",
    close: "Close",
    clear: "Clear",
    area: "Saturation and brightness. Use the arrow keys to adjust.",
    marker: "Saturation and brightness",
    markerValue: "Saturation {s} percent, brightness {v} percent",
    hue: "Hue",
    alpha: "Opacity",
    value: "Color value",
    format: "Color format",
    swatch: "Color swatch",
    swatches: "Color swatches"
  }
};
var DATA_MAP = {
  ppThumb: "thumbStyle",
  ppThumbPosition: "thumbPosition",
  ppTheme: "theme",
  ppThemeMode: "themeMode",
  ppFormat: "format",
  ppOpenOn: "openOn",
  ppAlpha: "alpha",
  ppForceAlpha: "forceAlpha",
  ppFormatToggle: "formatToggle",
  ppSwatchesOnly: "swatchesOnly",
  ppClearButton: "clearButton",
  ppCloseButton: "closeButton",
  ppCloseOnSwatch: "closeOnSwatch",
  ppDefaultColor: "defaultColor",
  ppGap: "gap"
};
var BOOLEAN_OPTIONS = /* @__PURE__ */ new Set([
  "alpha",
  "forceAlpha",
  "formatToggle",
  "swatchesOnly",
  "clearButton",
  "closeButton",
  "closeOnSwatch",
  "forcePositionFallback"
]);
var NUMBER_OPTIONS = /* @__PURE__ */ new Set(["gap"]);
function coerce(name, raw) {
  if (BOOLEAN_OPTIONS.has(name)) return raw !== "false" && raw !== "0";
  if (NUMBER_OPTIONS.has(name)) {
    const value = Number(raw);
    return Number.isFinite(value) ? value : void 0;
  }
  return raw;
}
function readDataOptions(field) {
  const options = {};
  if (field.dataset.ppConfig) {
    try {
      Object.assign(options, JSON.parse(field.dataset.ppConfig));
    } catch {
      console.warn("[pixelpicker] data-pp-config is not valid JSON:", field);
    }
  }
  for (const [key, name] of Object.entries(DATA_MAP)) {
    const raw = field.dataset[key];
    if (raw === void 0) continue;
    const value = coerce(name, raw);
    if (value !== void 0) options[name] = value;
  }
  if (field.dataset.ppSwatches !== void 0) {
    options.swatches = field.dataset.ppSwatches.split(",").map((entry) => entry.trim()).filter(Boolean);
  }
  return options;
}
function validate(options) {
  if (!THUMB_STYLES.includes(options.thumbStyle)) {
    console.warn(
      `[pixelpicker] Unknown thumbStyle "${options.thumbStyle}". Expected one of: ${THUMB_STYLES.join(", ")}. Falling back to "bar".`
    );
    options.thumbStyle = "bar";
  }
  if (options.themeMode === "auto") {
    options.themeMode = typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  if (!Array.isArray(options.swatches)) options.swatches = [];
  return options;
}
function resolveOptions(userOptions, field) {
  const merged = {
    ...DEFAULTS,
    ...userOptions,
    ...readDataOptions(field),
    labels: { ...DEFAULTS.labels, ...userOptions.labels || {} }
  };
  merged.swatches = [...merged.swatches];
  merged.formats = [...merged.formats];
  return validate(merged);
}

// src/index.js
var registry = /* @__PURE__ */ new WeakMap();
var living = /* @__PURE__ */ new Set();
function resolveTargets(target) {
  if (typeof target === "string") {
    return Array.from(document.querySelectorAll(target));
  }
  if (target instanceof Element) return [target];
  if (target && typeof target.length === "number") return Array.from(target);
  return [];
}
function isUsableField(el) {
  if (!(el instanceof HTMLInputElement)) return false;
  const type = el.type.toLowerCase();
  return type === "text" || type === "search" || type === "color" || type === "hidden";
}
function create(target, options = {}) {
  const fields = resolveTargets(target);
  const instances = [];
  for (const field of fields) {
    if (!isUsableField(field)) {
      console.warn(
        "[pixelpicker] Skipping element: expected a text input, got",
        field
      );
      continue;
    }
    destroy(field);
    const instance = new PickerInstance(field, resolveOptions(options, field));
    registry.set(field, instance);
    living.add(instance);
    instances.push(instance);
  }
  return instances;
}
function get(target) {
  const field = typeof target === "string" ? document.querySelector(target) : target;
  return field ? registry.get(field) : void 0;
}
function getAll() {
  return Array.from(living);
}
function destroy(target) {
  if (target === void 0) return destroyAll();
  let count = 0;
  for (const field of resolveTargets(target)) {
    const instance = registry.get(field);
    if (!instance) continue;
    instance.destroy();
    registry.delete(field);
    living.delete(instance);
    count += 1;
  }
  return count;
}
function destroyAll() {
  const count = living.size;
  for (const instance of living) {
    registry.delete(instance.field);
    instance.destroy();
  }
  living.clear();
  return count;
}
function closeAll() {
  for (const instance of living) instance.close();
}
function auto(selector = "[data-pixelpicker]", options = {}) {
  const start = () => create(selector, options);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
    return [];
  }
  return start();
}
var globalsBound = false;
function bindGlobals() {
  if (globalsBound || typeof document === "undefined") return;
  globalsBound = true;
  document.addEventListener("pointerdown", (event) => {
    for (const instance of living) {
      if (!instance.isOpen()) continue;
      if (event.target === instance.field) continue;
      if (instance.wrapper?.contains(event.target)) continue;
      instance.close();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    for (const instance of living) {
      if (instance.isOpen()) instance.close({ revert: true });
    }
  });
}
bindGlobals();
var index_default = {
  create,
  get,
  getAll,
  destroy,
  destroyAll,
  closeAll,
  auto,
  DEFAULTS,
  DEFAULT_SWATCHES,
  THUMB_STYLES
};
export {
  DEFAULTS,
  DEFAULT_SWATCHES,
  PickerInstance,
  THUMB_STYLES,
  auto,
  closeAll,
  contrastColor,
  create,
  index_default as default,
  destroy,
  destroyAll,
  formatColor,
  get,
  getAll,
  isValidColor,
  parseColor,
  rgbaToHex,
  rgbaToHsva,
  supportsAnchorPositioning,
  supportsPopover
};
