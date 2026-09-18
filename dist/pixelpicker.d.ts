/**
 * Typdeklarationen fuer pixelpicker.
 * https://github.com/MattOpen/pixelpicker
 */

export type ThumbStyle = 'bar' | 'circle' | 'square' | 'fill' | 'fill-behind' | 'none';
export type ThumbPosition = 'start' | 'end';
export type ColorFormat = 'auto' | 'hex' | 'rgb' | 'hsl' | 'mixed';
export type PanelFormat = 'hex' | 'rgb' | 'hsl';
export type ThemeMode = 'light' | 'dark' | 'auto';
export type Theme = 'default' | 'pill';
export type OpenTrigger = 'click' | 'focus' | 'manual';

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Hsva {
  h: number;
  s: number;
  v: number;
  a: number;
}

export interface Labels {
  dialog: string;
  open: string;
  close: string;
  clear: string;
  area: string;
  marker: string;
  markerValue: string;
  hue: string;
  alpha: string;
  value: string;
  format: string;
  swatch: string;
  swatches: string;
}

export interface Options {
  /** Farbschema des Panels. Voreinstellung: 'auto'. */
  themeMode?: ThemeMode;
  /** Gestaltungsvariante des Panels. Voreinstellung: 'default'. */
  theme?: Theme;
  /** Darstellung des Farbfelds im Eingabefeld. Voreinstellung: 'bar'. */
  thumbStyle?: ThumbStyle;
  /** Seite des Farbfelds. Voreinstellung: 'end'. */
  thumbPosition?: ThumbPosition;
  /** Wann sich das Panel oeffnet. Voreinstellung: 'click'. */
  openOn?: OpenTrigger;
  /** Panel nach Wahl eines Farbfelds schliessen. Voreinstellung: false. */
  closeOnSwatch?: boolean;
  /** Fokus nach dem Schliessen zurueck ins Feld. Voreinstellung: true. */
  returnFocus?: boolean;
  /** Abstand zwischen Feld und Panel in Pixeln. Voreinstellung: 4. */
  gap?: number;
  /** Nur zum Pruefen: erzwingt den JavaScript-Fallback der Positionierung. */
  forcePositionFallback?: boolean;
  /** Ausgabeformat. Voreinstellung: 'auto'. */
  format?: ColorFormat;
  /** Formate im Umschalter. Voreinstellung: ['hex', 'rgb', 'hsl']. */
  formats?: PanelFormat[];
  /** Formatumschalter zeigen. Voreinstellung: false. */
  formatToggle?: boolean;
  /** Alpha-Regler zeigen. Voreinstellung: true. */
  alpha?: boolean;
  /** Alphawert auch bei 1 ausgeben. Voreinstellung: false. */
  forceAlpha?: boolean;
  /** Startfarbe eines leeren Feldes. Voreinstellung: '#000000'. */
  defaultColor?: string;
  /** Farbfelder im Panel. Leeres Array blendet sie aus. */
  swatches?: string[];
  /** Nur Farbfelder zeigen. Voreinstellung: false. */
  swatchesOnly?: boolean;
  /** Schaltflaeche zum Leeren. Voreinstellung: false. */
  clearButton?: boolean;
  /** Schaltflaeche zum Schliessen. Voreinstellung: true. */
  closeButton?: boolean;
  /** Bei jeder Wertaenderung. */
  onInput?: ((value: string, instance: PickerInstance) => void) | null;
  /** Wenn eine Auswahl abgeschlossen ist. */
  onChange?: ((value: string, instance: PickerInstance) => void) | null;
  onOpen?: ((value: string, instance: PickerInstance) => void) | null;
  onClose?: ((value: string, instance: PickerInstance) => void) | null;
  /** Beschriftungen fuer Screenreader und Schaltflaechen. */
  labels?: Partial<Labels>;
}

export declare class PickerInstance {
  readonly id: string;
  readonly field: HTMLInputElement;
  readonly options: Required<Options>;

  /** Ist das Panel gerade offen? */
  isOpen(): boolean;
  /** Panel oeffnen. Der Fokus bleibt dabei im Eingabefeld. */
  open(): void;
  /** Panel schliessen. revert stellt den Wert von vor dem Oeffnen wieder her. */
  close(options?: { revert?: boolean }): void;
  /** Panel umschalten. */
  toggle(): void;
  /** Aktueller Wert des Feldes. */
  getValue(): string;
  /** Wert setzen. silent unterdrueckt das input-Ereignis. */
  setValue(value: string, options?: { silent?: boolean }): this;
  /** Instanz vollstaendig abbauen. */
  destroy(): void;
}

export type Target = string | Element | Iterable<Element> | ArrayLike<Element>;

/** Picker an einem oder mehreren Feldern anlegen. */
export declare function create(target: Target, options?: Options): PickerInstance[];
/** Die Instanz eines Feldes holen. */
export declare function get(target: Element | string): PickerInstance | undefined;
/** Alle lebenden Instanzen. */
export declare function getAll(): PickerInstance[];
/** Instanzen abbauen. Ohne Argument alle. Gibt die Anzahl zurueck. */
export declare function destroy(target?: Target): number;
/** Alle Instanzen abbauen. Gibt die Anzahl zurueck. */
export declare function destroyAll(): number;
/** Alle offenen Panels schliessen. */
export declare function closeAll(): void;
/** Felder mit data-pixelpicker automatisch einrichten. */
export declare function auto(selector?: string, options?: Options): PickerInstance[];

export declare const DEFAULTS: Required<Options>;
export declare const DEFAULT_SWATCHES: string[];
export declare const THUMB_STYLES: ThumbStyle[];

/** Beliebige CSS-Farbangabe nach RGBA. null, wenn ungueltig. */
export declare function parseColor(str: string): Rgba | null;
/** Sagt, ob eine Zeichenkette eine gueltige Farbe ist. */
export declare function isValidColor(str: string): boolean;
/** Eine Farbe im gewuenschten Format ausgeben. */
export declare function formatColor(
  rgba: Rgba,
  format: ColorFormat | 'mixed',
  forceAlpha?: boolean
): string;
export declare function rgbaToHex(rgba: Rgba, withAlpha?: boolean): string;
export declare function rgbaToHsva(rgba: Rgba): Hsva;
/**
 * Schwarz oder Weiss -- was auf dieser Farbe lesbar bleibt.
 * Schwelle nach WCAG-Relativhelligkeit.
 */
export declare function contrastColor(rgba: Rgba): '#000000' | '#ffffff';
/** Unterstuetzt der Browser CSS Anchor Positioning? */
export declare function supportsAnchorPositioning(): boolean;
/** Unterstuetzt der Browser die Popover API? */
export declare function supportsPopover(): boolean;

declare const pixelpicker: {
  create: typeof create;
  get: typeof get;
  getAll: typeof getAll;
  destroy: typeof destroy;
  destroyAll: typeof destroyAll;
  closeAll: typeof closeAll;
  auto: typeof auto;
  DEFAULTS: typeof DEFAULTS;
  DEFAULT_SWATCHES: typeof DEFAULT_SWATCHES;
  THUMB_STYLES: typeof THUMB_STYLES;
};

export default pixelpicker;

/** Ereignisse, die eine Instanz auf ihrem Feld ausloest. */
declare global {
  interface HTMLElementEventMap {
    'pixelpicker:input': CustomEvent<{ instance: PickerInstance; value: string }>;
    'pixelpicker:change': CustomEvent<{ instance: PickerInstance; value: string }>;
    'pixelpicker:open': CustomEvent<{ instance: PickerInstance; value: string }>;
    'pixelpicker:close': CustomEvent<{ instance: PickerInstance; value: string }>;
  }
}
