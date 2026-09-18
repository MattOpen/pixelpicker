/**
 * Eine Picker-Instanz: genau ein Eingabefeld, genau ein Panel.
 *
 * 🔴 Der Leitsatz dieses Moduls: Das Panel ist ein Hilfsmittel, kein Ersatz
 * fuer das Feld. Der Nutzer kann jederzeit selbst hineinschreiben -- der Fokus
 * wird ihm nie weggenommen und das Feld nie auf readonly gesetzt.
 * Auftrag pixelpicker-149, Punkt 7.a.
 *
 * Jede Instanz haelt ihre eigenen Optionen. Es gibt keinen modulweiten Zustand,
 * aus dem gelesen wird -- zwei Picker auf einer Seite kommen sich nicht ins
 * Gehege.
 */

import { contrastColor, detectFormat, formatColor, parseColor, rgbaToHsva } from './color.js';
import { Panel } from './panel.js';

/** Darstellungsarten des Farbfelds im Eingabefeld. */
export const THUMB_STYLES = ['bar', 'circle', 'square', 'fill', 'fill-behind', 'none'];

let instanceCounter = 0;

export class PickerInstance {
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

    // Bei 'auto' richtet sich das Ausgabeformat nach dem, was im Feld steht.
    this.format =
      options.format === 'auto' ? detectFormat(field.value) : options.format;

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
    if (thumbStyle === 'none') return;

    const parent = this.field.parentNode;
    let wrapper = parent;

    if (!parent.classList.contains('pp-field')) {
      wrapper = document.createElement('div');
      wrapper.className = 'pp-field';
      parent.insertBefore(wrapper, this.field);
      wrapper.appendChild(this.field);
      this.createdWrapper = true;
    }

    wrapper.classList.add(`pp-field--${thumbStyle}`);
    if (this.options.thumbPosition === 'start') {
      wrapper.classList.add('pp-field--thumb-start');
    }

    const thumb = document.createElement('button');
    thumb.type = 'button';
    thumb.className = 'pp-thumb';
    thumb.tabIndex = -1;
    thumb.setAttribute('aria-label', this.options.labels.open);
    // Das Feld traegt die Beschriftung; der Thumb ist nur ein zweiter Weg dorthin.
    thumb.setAttribute('aria-hidden', 'true');

    wrapper.appendChild(thumb);

    // Den Eckenradius des Feldes an den Wrapper durchreichen. Die Varianten,
    // die eine Flaeche hinter oder ueber dem Feld zeichnen, brauchen ihn --
    // CSS kann ihn von dort aus nicht auslesen, und ohne ihn stehen eckige
    // Ecken hinter den runden des Feldes hervor.
    const radius = getComputedStyle(this.field).borderRadius;
    if (radius && radius !== '0px') {
      wrapper.style.setProperty('--pp-field-radius', radius);
    }

    this.wrapper = wrapper;
    this.thumb = thumb;
  }

  /** Farbe des Feldes in den Thumb uebernehmen. */
  #syncThumb() {
    const rgba = parseColor(this.field.value);

    if (this.wrapper) {
      this.wrapper.classList.toggle('pp-field--empty', !rgba);
    }

    if (!this.thumb) return;

    if (rgba) {
      const color = formatColor(rgba, 'rgb', true);
      this.thumb.style.setProperty('--pp-thumb-color', color);
      this.wrapper.style.setProperty('--pp-thumb-color', color);
      this.wrapper.style.setProperty('--pp-thumb-contrast', contrastColor(rgba));
    } else {
      this.thumb.style.removeProperty('--pp-thumb-color');
      this.wrapper.style.removeProperty('--pp-thumb-color');
      this.wrapper.style.removeProperty('--pp-thumb-contrast');
    }
  }

  // ------------------------------------------------------------------- Ereignisse

  #on(target, type, handler, opts) {
    target.addEventListener(type, handler, opts);
    this.listeners.push(() => target.removeEventListener(type, handler, opts));
  }

  #bindField() {
    const { field } = this;

    // Oeffnen -- der Fokus bleibt dabei im Feld. Kein focus() auf das Panel,
    // kein readonly auf dem Feld.
    this.#on(field, 'focus', () => {
      if (this.options.openOn === 'focus') this.open();
    });

    this.#on(field, 'click', () => {
      if (this.options.openOn !== 'manual') this.open();
    });

    // Tippt der Nutzer, folgt das Panel -- nicht umgekehrt.
    this.#on(field, 'input', () => {
      this.#syncThumb();
      const rgba = parseColor(field.value);
      if (rgba && this.panel?.isOpen) {
        this.panel.setHsva(rgbaToHsva(rgba), { skipValueInput: false });
      }
      this.#emit('input');
    });

    this.#on(field, 'change', () => {
      this.#syncThumb();
      this.#emit('change');
    });

    this.#on(field, 'keydown', (event) => {
      if (event.key === 'Escape' && this.isOpen()) {
        this.close({ revert: true });
        event.stopPropagation();
        return;
      }

      // Nach unten ins Panel wechseln -- der einzige Weg dorthin per Tastatur,
      // und er geht vom Nutzer aus.
      if (event.key === 'ArrowDown' && event.altKey) {
        if (!this.isOpen()) this.open();
        this.panel?.focusFirst();
        event.preventDefault();
      }
    });

    if (this.thumb) {
      this.#on(this.thumb, 'click', (event) => {
        event.preventDefault();
        // Der Klick auf den Thumb gehoert dem Feld: Fokus dorthin, dann oeffnen.
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

    // Der Fokus bleibt, wo er ist: im Feld. Genau hier lag der Fehler des
    // Altstands -- er rief focus() auf dem Panel-Eingabefeld.
    this.#emit('open');
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
    const value = rgba === null ? '' : formatColor(rgba, this.panel.format, this.options.forceAlpha);
    this.format = this.panel.format;
    this.#setFieldValue(value, { silent: false });
    if (done) this.#emit('change');
  }

  #onPanelClose() {
    this.#emit('close');
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
    // Das value-Attribut mitziehen, damit serverseitig gerendertes Markup und
    // DOM nicht auseinanderlaufen.
    this.field.setAttribute('value', value);
    this.#syncThumb();

    if (!silent) {
      this.field.dispatchEvent(new Event('input', { bubbles: true }));
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
    const normalized = value === '' || value === null ? '' : value;
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
    if (typeof handler === 'function') handler(this.field.value, this);
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
      this.wrapper.classList.remove('pp-field--thumb-start', 'pp-field--empty');
      this.wrapper.style.removeProperty('--pp-thumb-color');
      this.wrapper.style.removeProperty('--pp-thumb-contrast');
      this.wrapper.style.removeProperty('--pp-field-radius');

      if (this.createdWrapper) {
        this.wrapper.replaceWith(this.field);
      } else {
        this.wrapper.classList.remove('pp-field');
      }
      this.wrapper = null;
    }

    delete this.field.dataset.pixelpicker;
  }
}
