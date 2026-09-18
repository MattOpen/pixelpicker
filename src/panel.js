/**
 * Das Auswahlpanel: Markup, Eingaben, Darstellung.
 *
 * Eine Panel-Instanz gehoert genau einer Picker-Instanz. Sie kennt die Farbe,
 * die gerade eingestellt ist, und meldet jede Aenderung ueber einen Rueckruf --
 * sie schreibt selbst nie in das Eingabefeld des Nutzers.
 *
 * Alle Listener haengen am Panel oder werden beim Zerstoeren wieder entfernt;
 * destroy() hinterlaesst nichts.
 */

import {
  clamp,
  contrastColor,
  formatColor,
  hsvaToHsla,
  hsvaToRgba,
  parseColor,
  rgbaToHex,
  rgbaToHsva,
  rgbaToString
} from './color.js';
import {
  linkAnchor,
  nextAnchorName,
  supportsAnchorPositioning,
  supportsPopover,
  trackPosition,
  unlinkAnchor
} from './position.js';

let panelCounter = 0;

/** Markup des Panels. Die IDs sind je Instanz eindeutig. */
function template(id, labels, formats) {
  const formatButtons = formats
    .map(
      (format) => `
      <button type="button" class="pp-format__option" data-pp-format="${format}"
              role="radio" aria-checked="false">${format.toUpperCase()}</button>`
    )
    .join('');

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

export class Panel {
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
    this.format = options.format === 'auto' ? 'hex' : options.format;
    this.isOpen = false;
    this.anchorName = nextAnchorName();
    this.stopTracking = null;
    this.dragging = null;

    this.#build();
  }

  #build() {
    const el = document.createElement('div');
    el.id = this.id;
    el.className = `pp-panel pp-panel--${this.options.theme}`;
    el.dataset.ppTheme = this.options.themeMode;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', this.options.labels.dialog);
    el.innerHTML = template(this.id, this.options.labels, this.options.formats);

    // Popover hebt das Panel in den Top Layer: kein z-index-Streit, kein
    // Abschneiden durch overflow: hidden eines Vorfahren.
    if (supportsPopover()) {
      el.popover = 'manual';
    } else {
      el.classList.add('pp-panel--no-popover');
      el.hidden = true;
    }

    this.el = el;
    this.area = el.querySelector('.pp-area');
    this.marker = el.querySelector('.pp-marker');
    this.preview = el.querySelector('.pp-preview');
    this.hueInput = el.querySelector(`#${this.id}-hue`);
    this.alphaInput = el.querySelector(`#${this.id}-alpha`);
    this.valueInput = el.querySelector('.pp-value__input');
    this.swatchesEl = el.querySelector('.pp-swatches');
    this.clearBtn = el.querySelector('.pp-action--clear');
    this.closeBtn = el.querySelector('.pp-action--close');

    this.#applyOptionVisibility();
    this.#renderSwatches();
    this.#bind();

    document.body.appendChild(el);
  }

  /** Optionale Teile ein- oder ausblenden. */
  #applyOptionVisibility() {
    const { alpha, formatToggle, clearButton, closeButton, swatches } = this.options;

    this.el.classList.toggle('pp-panel--no-alpha', !alpha);
    this.el.querySelector('.pp-format').hidden = !formatToggle;
    this.clearBtn.hidden = !clearButton;
    this.closeBtn.hidden = !closeButton;
    this.swatchesEl.hidden = !swatches.length;
    this.el.querySelector('.pp-actions').hidden = !clearButton && !closeButton;

    if (this.options.swatchesOnly) {
      this.el.classList.add('pp-panel--swatches-only');
    }
  }

  #renderSwatches() {
    const { swatches, labels } = this.options;
    if (!swatches.length) return;

    this.swatchesEl.innerHTML = swatches
      .map((swatch) => {
        const rgba = parseColor(swatch);
        const title = rgba ? rgbaToHex(rgba) : swatch;
        return `<button type="button" class="pp-swatch" style="--pp-swatch: ${swatch}"
                  data-pp-swatch="${swatch}" title="${title}"
                  aria-label="${labels.swatch}: ${title}"></button>`;
      })
      .join('');
  }

  #bind() {
    const on = (target, type, handler, opts) => {
      target.addEventListener(type, handler, opts);
      this.listeners.push(() => target.removeEventListener(type, handler, opts));
    };
    this.listeners = [];

    // Farbflaeche: Zeigen und Ziehen.
    on(this.area, 'pointerdown', (event) => {
      this.area.setPointerCapture(event.pointerId);
      this.dragging = event.pointerId;
      this.#pickFromArea(event);
      event.preventDefault();
    });

    on(this.area, 'pointermove', (event) => {
      if (this.dragging === event.pointerId) this.#pickFromArea(event);
    });

    const endDrag = (event) => {
      if (this.dragging !== event.pointerId) return;
      this.dragging = null;
      this.area.releasePointerCapture?.(event.pointerId);
      this.#emit(true);
    };
    on(this.area, 'pointerup', endDrag);
    on(this.area, 'pointercancel', endDrag);

    // Marker per Tastatur.
    on(this.marker, 'keydown', (event) => {
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

    on(this.hueInput, 'input', () => {
      this.setHsva({ ...this.hsva, h: Number(this.hueInput.value) });
      this.#emit(false);
    });
    on(this.hueInput, 'change', () => this.#emit(true));

    on(this.alphaInput, 'input', () => {
      this.setHsva({ ...this.hsva, a: Number(this.alphaInput.value) / 100 });
      this.#emit(false);
    });
    on(this.alphaInput, 'change', () => this.#emit(true));

    // Texteingabe im Panel: erst uebernehmen, wenn sie gueltig ist.
    on(this.valueInput, 'input', () => {
      const rgba = parseColor(this.valueInput.value);
      this.valueInput.classList.toggle('pp-value__input--invalid', !rgba);
      if (!rgba) return;
      this.setHsva(rgbaToHsva(rgba), { skipValueInput: true });
      this.#emit(false);
    });
    on(this.valueInput, 'change', () => {
      if (parseColor(this.valueInput.value)) this.#emit(true);
      else this.#syncValueInput();
    });

    on(this.el, 'click', (event) => {
      const swatch = event.target.closest('[data-pp-swatch]');
      if (swatch) {
        const rgba = parseColor(swatch.dataset.ppSwatch);
        if (rgba) {
          this.setHsva(rgbaToHsva(rgba));
          this.#emit(true);
          if (this.options.closeOnSwatch) this.close();
        }
        return;
      }

      const format = event.target.closest('[data-pp-format]');
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

    // Klicks im Panel duerfen den Schliess-Handler draussen nicht ausloesen.
    on(this.el, 'pointerdown', (event) => event.stopPropagation());
  }

  /** Farbe aus einem Zeigerereignis auf der Flaeche ableiten. */
  #pickFromArea(event) {
    const rect = this.area.getBoundingClientRect();
    const x = clamp(event.clientX - rect.left, 0, rect.width);
    const y = clamp(event.clientY - rect.top, 0, rect.height);

    this.setHsva({
      ...this.hsva,
      s: (x / rect.width) * 100,
      v: 100 - (y / rect.height) * 100
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
    if (this.options.format === 'auto') {
      this.setFormat(this.format, { silent: true });
    }
    this.setHsva(rgbaToHsva(rgba), opts);
    return true;
  }

  setFormat(format, opts = {}) {
    this.format = format;
    this.el.querySelectorAll('[data-pp-format]').forEach((button) => {
      const active = button.dataset.ppFormat === format;
      button.classList.toggle('pp-format__option--active', active);
      button.setAttribute('aria-checked', String(active));
    });
    if (!opts.silent) this.#syncValueInput();
  }

  /** Aktuelle Farbe als Zeichenkette im eingestellten Format. */
  getValue() {
    return formatColor(hsvaToRgba(this.hsva), this.format, this.options.forceAlpha);
  }

  #syncValueInput() {
    this.valueInput.value = this.getValue();
    this.valueInput.classList.remove('pp-value__input--invalid');
  }

  #render(opts = {}) {
    const rgba = hsvaToRgba(this.hsva);
    const opaque = rgbaToHex({ ...rgba, a: 1 });
    const hueColor = rgbaToString(hsvaToRgba({ h: this.hsva.h, s: 100, v: 100, a: 1 }));

    this.area.style.setProperty('--pp-hue', hueColor);
    this.preview.style.setProperty('--pp-color', rgbaToString(rgba, true));
    this.marker.style.setProperty('--pp-marker-color', opaque);
    this.marker.style.setProperty('--pp-marker-contrast', contrastColor(rgba));
    this.marker.style.left = `${this.hsva.s}%`;
    this.marker.style.top = `${100 - this.hsva.v}%`;

    this.alphaInput.style.setProperty('--pp-alpha-to', opaque);
    this.hueInput.value = String(Math.round(this.hsva.h));
    this.alphaInput.value = String(Math.round(this.hsva.a * 100));

    const hsla = hsvaToHsla(this.hsva);
    this.marker.setAttribute('aria-valuenow', String(Math.round(this.hsva.v)));
    this.marker.setAttribute(
      'aria-valuetext',
      this.options.labels.markerValue
        .replace('{s}', String(Math.round(this.hsva.s)))
        .replace('{v}', String(Math.round(this.hsva.v)))
        .replace('{l}', String(hsla.l))
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

    // Entweder rechnet der Browser (Anchor Positioning) oder JavaScript --
    // niemals beide. Sonst prallen die Inline-Werte des Fallbacks gegen die
    // position-area-Regel, und das Panel landet daneben.
    const useFallback =
      this.options.forcePositionFallback || !supportsAnchorPositioning();

    this.el.classList.toggle('pp-panel--js-position', useFallback);
    if (!useFallback) linkAnchor(anchor, this.el, this.anchorName);

    this.stopTracking = trackPosition(anchor, this.el, {
      gap: this.options.gap,
      forceFallback: this.options.forcePositionFallback
    });

    this.isOpen = true;
    this.el.classList.add('pp-panel--open');
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
    this.el.classList.remove('pp-panel--open');
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
}
