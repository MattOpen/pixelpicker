/**
 * pixelpicker -- oeffentliche API.
 *
 * Eine Instanz je Eingabefeld, jede mit eigenen Optionen. Das Register haelt
 * fest, welches Feld welche Instanz hat: Ein zweiter create()-Aufruf auf
 * dasselbe Feld baut die alte Instanz sauber ab, statt eine zweite daneben zu
 * stellen.
 *
 * @example
 * import { create } from 'pixelpicker';
 * import 'pixelpicker/css';
 *
 * const pickers = create('.color-input', { thumbStyle: 'circle' });
 */

import { PickerInstance, THUMB_STYLES } from './instance.js';
import { DEFAULTS, DEFAULT_SWATCHES, resolveOptions } from './options.js';
import { supportsAnchorPositioning, supportsPopover } from './position.js';
import {
  contrastColor,
  formatColor,
  isValidColor,
  parseColor,
  rgbaToHex,
  rgbaToHsva
} from './color.js';

/** field -> instance. WeakMap, damit entfernte Felder nichts festhalten. */
const registry = new WeakMap();
/** Alle lebenden Instanzen, fuer destroyAll() und getAll(). */
const living = new Set();

/** Ein Ziel in eine Liste von Feldern aufloesen. */
function resolveTargets(target) {
  if (typeof target === 'string') {
    return Array.from(document.querySelectorAll(target));
  }
  if (target instanceof Element) return [target];
  if (target && typeof target.length === 'number') return Array.from(target);
  return [];
}

/** Warnen, wenn ein Ziel kein Textfeld ist -- dort wirkt der Picker nicht. */
function isUsableField(el) {
  if (!(el instanceof HTMLInputElement)) return false;
  const type = el.type.toLowerCase();
  return type === 'text' || type === 'search' || type === 'color' || type === 'hidden';
}

/**
 * Picker an einem oder mehreren Feldern anlegen.
 *
 * @param {string | Element | Iterable<Element>} target Selektor, Element oder Liste.
 * @param {object} [options] Optionen fuer alle getroffenen Felder.
 * @returns {PickerInstance[]} Die angelegten Instanzen.
 */
export function create(target, options = {}) {
  const fields = resolveTargets(target);
  const instances = [];

  for (const field of fields) {
    if (!isUsableField(field)) {
      console.warn(
        '[pixelpicker] Skipping element: expected a text input, got',
        field
      );
      continue;
    }

    // Ein zweiter Aufruf ersetzt, statt zu stapeln.
    destroy(field);

    const instance = new PickerInstance(field, resolveOptions(options, field));
    registry.set(field, instance);
    living.add(instance);
    instances.push(instance);
  }

  return instances;
}

/**
 * Die Instanz eines Feldes holen.
 * @param {Element | string} target
 * @returns {PickerInstance | undefined}
 */
export function get(target) {
  const field = typeof target === 'string' ? document.querySelector(target) : target;
  return field ? registry.get(field) : undefined;
}

/** Alle lebenden Instanzen. */
export function getAll() {
  return Array.from(living);
}

/**
 * Instanzen abbauen. Ohne Argument alle.
 * @param {string | Element | Iterable<Element>} [target]
 * @returns {number} Anzahl der abgebauten Instanzen.
 */
export function destroy(target) {
  if (target === undefined) return destroyAll();

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

/** Alle Instanzen abbauen. */
export function destroyAll() {
  const count = living.size;
  for (const instance of living) {
    registry.delete(instance.field);
    instance.destroy();
  }
  living.clear();
  return count;
}

/** Alle offenen Panels schliessen. */
export function closeAll() {
  for (const instance of living) instance.close();
}

/**
 * Felder mit data-pixelpicker-Attribut automatisch einrichten.
 * Fuer Seiten, die ohne eigenen JavaScript-Aufruf auskommen wollen.
 *
 * @param {string} [selector]
 * @param {object} [options]
 */
export function auto(selector = '[data-pixelpicker]', options = {}) {
  const start = () => create(selector, options);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
    return [];
  }
  return start();
}

// Ein Klick ausserhalb schliesst offene Panels. Panels stoppen pointerdown
// selbst, deshalb erreicht uns nur, was wirklich daneben liegt.
let globalsBound = false;

function bindGlobals() {
  if (globalsBound || typeof document === 'undefined') return;
  globalsBound = true;

  document.addEventListener('pointerdown', (event) => {
    for (const instance of living) {
      if (!instance.isOpen()) continue;
      if (event.target === instance.field) continue;
      if (instance.wrapper?.contains(event.target)) continue;
      instance.close();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    for (const instance of living) {
      if (instance.isOpen()) instance.close({ revert: true });
    }
  });
}

bindGlobals();

export {
  DEFAULTS,
  DEFAULT_SWATCHES,
  THUMB_STYLES,
  PickerInstance,
  contrastColor,
  formatColor,
  isValidColor,
  parseColor,
  rgbaToHex,
  rgbaToHsva,
  supportsAnchorPositioning,
  supportsPopover
};

export default {
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
