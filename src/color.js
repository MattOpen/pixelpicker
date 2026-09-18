/**
 * Farbumrechnung und -parsing.
 *
 * Reine Funktionen ohne DOM-Zugriff und ohne Modulzustand: Jede nimmt Werte
 * entgegen und gibt neue zurueck. Das macht sie einzeln pruefbar und haelt die
 * Umrechnung aus dem Rest des Pakets heraus.
 *
 * Farbraeume: RGBA (0-255, Alpha 0-1), HSVA (H 0-360, S/V 0-100, Alpha 0-1),
 * HSLA (H 0-360, S/L 0-100, Alpha 0-1).
 */

/** Auf [min, max] begrenzen. */
export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

/** Zweistellige Hex-Ziffer mit fuehrender Null. */
function hexPair(value) {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0');
}

/**
 * HSVA nach RGBA.
 * @param {{h: number, s: number, v: number, a: number}} hsva
 * @returns {{r: number, g: number, b: number, a: number}}
 */
export function hsvaToRgba({ h, s, v, a = 1 }) {
  const saturation = s / 100;
  const value = v / 100;
  const chroma = saturation * value;
  const hueBy60 = h / 60;
  const x = chroma * (1 - Math.abs((hueBy60 % 2) - 1));
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

/**
 * RGBA nach HSVA.
 * @param {{r: number, g: number, b: number, a: number}} rgba
 * @returns {{h: number, s: number, v: number, a: number}}
 */
export function rgbaToHsva({ r, g, b, a = 1 }) {
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

/**
 * HSVA nach HSLA.
 * @param {{h: number, s: number, v: number, a: number}} hsva
 * @returns {{h: number, s: number, l: number, a: number}}
 */
export function hsvaToHsla({ h, s, v, a = 1 }) {
  const value = v / 100;
  const lightness = value * (1 - s / 100 / 2);
  let saturation = 0;

  if (lightness > 0 && lightness < 1) {
    saturation = Math.round(
      ((value - lightness) / Math.min(lightness, 1 - lightness)) * 100
    );
  }

  return { h, s: saturation, l: Math.round(lightness * 100), a };
}

// Erkennt rgb()/rgba() in der von getComputedStyle normalisierten Form.
const RGB_PATTERN =
  /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i;

/**
 * Beliebige CSS-Farbangabe nach RGBA.
 *
 * Die Normalisierung uebernimmt der Browser: Der Wert wird einem abgekoppelten
 * Element zugewiesen und wieder ausgelesen. Damit werden auch benannte Farben,
 * hsl(), color() und moderne Syntaxformen erkannt, ohne sie selbst zu parsen.
 *
 * @param {string} str Farbangabe, z. B. '#2a9d8f', 'rebeccapurple', 'hsl(0 0% 0%)'.
 * @returns {{r: number, g: number, b: number, a: number} | null} null, wenn ungueltig.
 */
export function parseColor(str) {
  if (typeof str !== 'string') return null;

  const value = str.trim();
  if (value === '') return null;

  const probe = document.createElement('div');
  probe.style.color = '';
  probe.style.color = value;

  // Ungueltige Werte laesst der Browser stehen: die Zuweisung greift nicht.
  if (probe.style.color === '') return null;

  probe.style.display = 'none';
  document.head.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();

  const match = RGB_PATTERN.exec(computed);
  if (!match) return null;

  let alpha = match[4] === undefined ? 1 : parseFloat(match[4]);
  if (String(match[4]).endsWith('%')) alpha /= 100;

  return {
    r: clamp(Math.round(parseFloat(match[1])), 0, 255),
    g: clamp(Math.round(parseFloat(match[2])), 0, 255),
    b: clamp(Math.round(parseFloat(match[3])), 0, 255),
    // Chromium rundet Alpha beim Auslesen ungenau -- auf zwei Stellen festnageln.
    a: clamp(Number(alpha.toFixed(2)), 0, 1)
  };
}

/** Sagt, ob eine Zeichenkette eine gueltige Farbe ist. */
export function isValidColor(str) {
  return parseColor(str) !== null;
}

/**
 * Das Format einer Farbangabe erkennen.
 * @returns {'hex' | 'rgb' | 'hsl'} 'hex' auch fuer benannte Farben.
 */
export function detectFormat(str) {
  if (typeof str !== 'string') return 'hex';

  const value = str.trim().toLowerCase();
  if (value.startsWith('rgb')) return 'rgb';
  if (value.startsWith('hsl')) return 'hsl';
  return 'hex';
}

/**
 * RGBA als Hex-Zeichenkette.
 * @param {object} rgba
 * @param {boolean} withAlpha Achtstelliges Hex erzwingen, auch bei a === 1.
 */
export function rgbaToHex({ r, g, b, a = 1 }, withAlpha = false) {
  const base = `#${hexPair(r)}${hexPair(g)}${hexPair(b)}`;
  if (a < 1 || withAlpha) return base + hexPair(a * 255);
  return base;
}

/** RGBA als rgb()/rgba()-Zeichenkette. */
export function rgbaToString({ r, g, b, a = 1 }, withAlpha = false) {
  if (a < 1 || withAlpha) return `rgba(${r}, ${g}, ${b}, ${a})`;
  return `rgb(${r}, ${g}, ${b})`;
}

/** HSLA als hsl()/hsla()-Zeichenkette. */
export function hslaToString({ h, s, l, a = 1 }, withAlpha = false) {
  if (a < 1 || withAlpha) return `hsla(${h}, ${s}%, ${l}%, ${a})`;
  return `hsl(${h}, ${s}%, ${l}%)`;
}

/**
 * Eine Farbe im gewuenschten Format ausgeben.
 * @param {object} rgba
 * @param {'hex' | 'rgb' | 'hsl' | 'mixed'} format 'mixed' = hex ohne Alpha, sonst rgb.
 * @param {boolean} forceAlpha Alpha auch bei a === 1 mitschreiben.
 */
export function formatColor(rgba, format, forceAlpha = false) {
  let target = format;
  if (target === 'mixed') target = rgba.a === 1 ? 'hex' : 'rgb';

  switch (target) {
    case 'rgb':
      return rgbaToString(rgba, forceAlpha);
    case 'hsl':
      return hslaToString(hsvaToHsla(rgbaToHsva(rgba)), forceAlpha);
    default:
      return rgbaToHex(rgba, forceAlpha);
  }
}

/**
 * Relative Leuchtdichte nach WCAG.
 * Wird gebraucht, um Text auf einer Farbflaeche lesbar zu halten.
 */
export function luminance({ r, g, b }) {
  const channel = (value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * Gut lesbare Textfarbe zu einem Hintergrund.
 * Schwelle 0.179 ist der Punkt, an dem Schwarz gegenueber Weiss den besseren
 * Kontrast liefert.
 */
export function contrastColor(rgba) {
  return luminance(rgba) > 0.179 ? '#000000' : '#ffffff';
}
