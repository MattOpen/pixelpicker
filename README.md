# pixelpicker

Color picker for text inputs — zero dependencies, ~20 KB, MIT licensed. Works with any framework
or a plain `<script>` tag.

**[Live demo & docs → mattopen.github.io/pixelpicker](https://mattopen.github.io/pixelpicker/)**

[![npm](https://img.shields.io/npm/v/pixelpicker.svg)](https://www.npmjs.com/package/pixelpicker)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

The panel lives in the browser's top layer via the
[Popover API](https://developer.mozilla.org/docs/Web/API/Popover_API) and is placed with
[CSS Anchor Positioning](https://developer.mozilla.org/docs/Web/CSS/CSS_anchor_positioning),
falling back to a small JavaScript calculation on older browsers.

**The panel is a helper, never a replacement for the input field.** You can always type into the
field yourself — the focus is never taken away from it and the field is never set to `readonly`.

This project is derived from [Coloris](https://github.com/mdbassit/Coloris) by Mohammed Bassit,
licensed under the MIT License. It is a rewrite rather than a fork: the instance model, the
positioning and the public API are new. The original copyright notice is retained in
[LICENSE](LICENSE).

## Why

| | |
|---|---|
| **No dependencies** | ~20 KB minified, no jQuery, no positioning library |
| **Real instances** | Every picker owns its options. Two pickers with different settings on one page behave differently |
| **Top layer** | No `z-index` fight, no clipping by an ancestor with `overflow: hidden` |
| **Accessible** | Full keyboard control, ARIA labels on every control, all strings replaceable |
| **ESM and IIFE** | Use it as a module or drop it in with a `<script>` tag |

## Install

```sh
npm install pixelpicker
```

Or download `dist/pixelpicker.js` and `dist/pixelpicker.css` and serve them yourself.

## Usage

### As a module

```js
import { create } from 'pixelpicker';
import 'pixelpicker/css';

create('.color-input', {
  thumbStyle: 'circle',
  formatToggle: true
});
```

### As a plain script

```html
<link rel="stylesheet" href="dist/pixelpicker.css">
<script src="dist/pixelpicker.js"></script>
<script>
  PixelPicker.create('.color-input', { thumbStyle: 'bar' });
</script>
```

### Without any JavaScript call

```html
<input type="text" data-pixelpicker data-pp-thumb="circle" value="#2a9d8f">

<script>PixelPicker.auto();</script>
```

`auto()` picks up every `[data-pixelpicker]` field, waiting for `DOMContentLoaded` if the document
is still loading.

## Thumb styles

Six ways to show the selected color in the field, chosen with `thumbStyle`:

| Value | Appearance |
|---|---|
| `bar` | A strip at the end of the field. The default |
| `circle` | A round swatch inside the field |
| `square` | A square swatch inside the field |
| `fill` | The color covers the field completely and hides the value — for fields where the color *is* the display |
| `fill-behind` | The color fills the field behind the text, so the value stays readable |
| `none` | No swatch — the field is left untouched |

`thumbPosition: 'start'` moves the swatch to the other side. It follows the writing direction, so
it works in right-to-left layouts without extra configuration.

## In an existing design

By default the picker needs an element to anchor the swatch to, because an `<input>` cannot hold
children. It uses the input's parent when the input sits there alone, and only inserts a wrapper
when it does not.

That last case breaks markup built on a direct parent-child or sibling relationship. Bootstrap's
`.form-floating` is the common one: it expects the input and its label to be siblings, and an
inserted element costs the field its height and shape. Set `wrap: false` and the existing parent
takes the role instead.

```html
<div class="form-floating">
  <input type="text" class="form-control" id="brand" value="#87a878">
  <label for="brand">Brand color</label>
</div>

<script>
  PixelPicker.create('#brand', { thumbStyle: 'circle', wrap: false });
</script>
```

The swatch scales with the field: `circle` and `square` take 60 % of its height, down to a floor of
14 px. Both are yours to change — set `--pp-thumb-size` and `--pp-thumb-min-size` on the field's
parent.

## Options

Everything you can pass to `create()`. Each option is independent — set only the ones you want to
change.

### Appearance

| Option | Type | Default | Description |
|---|---|---|---|
| `thumbStyle` | string | `'bar'` | How the color appears in the input. One of `'bar'`, `'circle'`, `'square'`, `'fill'`, `'fill-behind'` or `'none'`. `'fill'` covers the value, `'fill-behind'` keeps it readable |
| `thumbPosition` | string | `'end'` | Which side the swatch sits on: `'end'` or `'start'`. It follows the writing direction, so `'start'` is on the right in a right-to-left layout |
| `wrap` | string \| boolean | `'auto'` | Whether a wrapper element may be inserted around the input. `'auto'` adds one only when the parent holds more than the input, `false` always uses the existing parent, `true` always inserts one. Use `false` for markup that relies on a direct parent-child or sibling relationship, such as Bootstrap's `.form-floating` |
| `theme` | string | `'default'` | Shape of the panel: `'default'` with regular corners, or `'pill'` with rounded controls and round swatches |
| `themeMode` | string | `'auto'` | Color scheme of the panel: `'light'`, `'dark'`, or `'auto'` to follow the operating system setting |

### Behaviour

| Option | Type | Default | Description |
|---|---|---|---|
| `openOn` | string | `'click'` | What opens the panel: `'click'` on the field, `'focus'` (so it also opens via keyboard), or `'manual'` to open it yourself with `open()` |
| `closeOnSwatch` | boolean | `false` | Set `true` to close the panel as soon as a swatch is picked. Useful together with `swatchesOnly`, where one click is the whole interaction |
| `returnFocus` | boolean | `true` | Put the focus back into the field when the panel closes. Set `false` if your own code moves the focus somewhere else |
| `gap` | number | `4` | Distance in pixels between the field and the panel |
| `forcePositionFallback` | boolean | `false` | Set `true` to use the JavaScript positioning even in browsers that support CSS Anchor Positioning. For testing that path — leave it off in production |

### Color

| Option | Type | Default | Description |
|---|---|---|---|
| `format` | string | `'auto'` | What gets written into the field: `'hex'`, `'rgb'`, `'hsl'`, `'mixed'`, or `'auto'` to keep whatever format the field already holds |
| `formats` | array | `['hex','rgb','hsl']` | Which formats the switcher offers, in this order. Shorten it to offer fewer |
| `formatToggle` | boolean | `false` | Set `true` to show the format switcher inside the panel |
| `alpha` | boolean | `true` | Show the opacity slider. Set `false` for opaque colors only |
| `forceAlpha` | boolean | `false` | Set `true` to always write the alpha channel, even when it is `1` — you get `#2a9d8fff` instead of `#2a9d8f` |
| `defaultColor` | string | `'#000000'` | Which color the panel starts on when the field is empty |
| `swatches` | array | 12 colors | The palette shown at the bottom of the panel. Pass your own array of color strings, or an empty array `[]` to hide the palette entirely |
| `swatchesOnly` | boolean | `false` | Set `true` to show nothing but the palette — no area, no sliders. For brand colors, where free choice is not wanted |

### Controls

| Option | Type | Default | Description |
|---|---|---|---|
| `clearButton` | boolean | `false` | Set `true` to add a button that empties the field |
| `closeButton` | boolean | `true` | The button that closes the panel. Set `false` to rely on clicking outside or pressing `Esc` |
| `labels` | object | English | Every visible and assistive string, for translating the panel. Keys you leave out keep their English default — see [Localization](#localization) |

### Callbacks

| Option | Type | Default | Description |
|---|---|---|---|
| `onInput` | function | `null` | `(value, instance) => void` — fires on every change, including mid-drag and while typing into the field |
| `onChange` | function | `null` | `(value, instance) => void` — fires when a selection is complete. This is the one to save a value on |
| `onOpen` | function | `null` | `(value, instance) => void` — fires after the panel opens |
| `onClose` | function | `null` | `(value, instance) => void` — fires after the panel closes |

### The same options as data attributes

Most options can be set on the element itself, which is handy for server-rendered markup: no
JavaScript call per field, just `auto()` once. An attribute beats the value passed to `create()`,
because it is the more specific source.

| Option | Attribute |
|---|---|
| `thumbStyle` | `data-pp-thumb` |
| `thumbPosition` | `data-pp-thumb-position` |
| `wrap` | `data-pp-wrap` |
| `theme` | `data-pp-theme` |
| `themeMode` | `data-pp-theme-mode` |
| `openOn` | `data-pp-open-on` |
| `closeOnSwatch` | `data-pp-close-on-swatch` |
| `gap` | `data-pp-gap` |
| `format` | `data-pp-format` |
| `formatToggle` | `data-pp-format-toggle` |
| `alpha` | `data-pp-alpha` |
| `forceAlpha` | `data-pp-force-alpha` |
| `defaultColor` | `data-pp-default-color` |
| `swatches` | `data-pp-swatches` — comma-separated |
| `swatchesOnly` | `data-pp-swatches-only` |
| `clearButton` | `data-pp-clear-button` |
| `closeButton` | `data-pp-close-button` |

`formats`, `labels`, `returnFocus`, `forcePositionFallback` and the callbacks have no attribute —
they take values that do not fit into one.

Many options on one field? Use `data-pp-config` with a JSON object instead of a long list of
attributes:

```html
<input type="text" data-pixelpicker
       data-pp-config='{"thumbStyle":"circle","alpha":false}'>
```

Individual attributes still take precedence over the JSON.

## Events

Each instance dispatches events on its own field, so they bubble and can be delegated. Native
`input` and `change` events fire as well — forms and validators see exactly what they would see
from typing.

```js
field.addEventListener('pixelpicker:change', (event) => {
  console.log(event.detail.value);     // '#2a9d8f'
  console.log(event.detail.instance);  // the PickerInstance
});
```

| Event | When |
|---|---|
| `pixelpicker:open` | The panel opened |
| `pixelpicker:input` | The value changed, possibly mid-drag |
| `pixelpicker:change` | A selection completed |
| `pixelpicker:close` | The panel closed |

## API

| Function | Returns | Meaning |
|---|---|---|
| `create(target, options?)` | `PickerInstance[]` | Attach to a selector, element or list |
| `get(target)` | `PickerInstance \| undefined` | The instance belonging to a field |
| `getAll()` | `PickerInstance[]` | Every live instance |
| `destroy(target?)` | `number` | Tear down; without an argument, all |
| `closeAll()` | `void` | Close every open panel |
| `auto(selector?, options?)` | `PickerInstance[]` | Pick up `[data-pixelpicker]` fields |

### On an instance

| Method | Meaning |
|---|---|
| `open()` / `close()` / `toggle()` | Control the panel. `close({ revert: true })` restores the value from before opening |
| `getValue()` | The field's current value |
| `setValue(value, { silent })` | Set the value; `silent` suppresses the input event |
| `destroy()` | Tear this instance down |

Calling `create()` twice on the same field replaces the first instance instead of stacking a second
one on top. After `destroy()` a field is indistinguishable from one that never had a picker — no
listeners, no wrapper, no leftover nodes.

### Color helpers

The functions the picker uses internally are exported too — useful when you do something with the
chosen color elsewhere on the page.

| Function | Returns | Meaning |
|---|---|---|
| `parseColor(value)` | `Rgba \| null` | Parse any CSS color — hex, `rgb()`, `hsl()` or a named color. `null` if it is not a color |
| `formatColor(rgba, format, forceAlpha?)` | `string` | Write an `Rgba` back out as `'hex'`, `'rgb'` or `'hsl'` |
| `contrastColor(rgba)` | `'#000000' \| '#ffffff'` | Black or white, whichever stays readable on that color. Uses the WCAG relative-luminance threshold |
| `isValidColor(value)` | `boolean` | Whether a string parses as a color |
| `rgbaToHex(rgba)` / `rgbaToHsva(rgba)` | `string` / `Hsva` | Conversions between the internal representations |

```js
import { parseColor, contrastColor } from 'pixelpicker';

// Put the chosen color on a banner, with text that stays readable.
field.addEventListener('pixelpicker:input', (event) => {
  const rgba = parseColor(event.detail.value);
  if (!rgba) return;
  banner.style.background = event.detail.value;
  banner.style.color = contrastColor(rgba);
});
```

## Keyboard

| Key | Where | Action |
|---|---|---|
| `Alt` + `↓` | In the field | Open the panel and move into it |
| `Esc` | Anywhere | Close and restore the previous value |
| Arrow keys | On the marker | Adjust saturation and brightness |
| `Shift` + arrows | On the marker | Adjust in steps of ten |
| `Tab` | In the panel | Move through the controls |

## Localization

Every visible and assistive string lives in `labels`:

```js
create('.color-input', {
  labels: {
    dialog: 'Farbwähler',
    open: 'Farbwähler öffnen',
    close: 'Schließen',
    clear: 'Leeren',
    hue: 'Farbton',
    alpha: 'Deckkraft',
    value: 'Farbwert'
  }
});
```

Unlisted keys keep their English default. See `Labels` in
[`src/pixelpicker.d.ts`](src/pixelpicker.d.ts) for the full set.

## Browser support

Both modern APIs are feature-detected at runtime, and each has a fallback, so the picker works
without either:

| Feature | Used for | Without it |
|---|---|---|
| Popover API | Lifting the panel into the top layer | The panel becomes an ordinary positioned element in the flow |
| CSS Anchor Positioning | Letting the browser place and re-place the panel | A JavaScript fallback measures the field and follows scroll and resize |

Both positioning paths put the panel below the field and flip it above when there is not enough
room. To exercise the fallback on a browser that supports anchor positioning, pass
`forcePositionFallback: true` — the example page has a switch for it.

## Migrating from Coloris

| Coloris | pixelpicker |
|---|---|
| `Coloris({ el: '.field', ... })` | `create('.field', { ... })` — the selector is the first argument |
| `buttonStyle` | `thumbStyle`, with `fill` / `fill-behind` replacing `full` / `full-transparent` |
| `wrap`, `parent`, `inline`, `margin` | Gone. The top layer makes the wrapper and the parent option unnecessary; `gap` replaces `margin` |
| `rtl` | Gone. `thumbPosition` follows the writing direction on its own |
| `focusInput`, `selectInput` | Gone. The focus never leaves the field; `returnFocus` controls where it goes after closing |
| `cursorOffsetX`, `cursorOffsetY` | Gone. The top layer removes the problem they patched |
| `clearLabel`, `closeLabel`, `a11y` | All in one `labels` object |
| `data-coloris` | `data-pixelpicker` |
| `coloris:pick` event | `pixelpicker:change` |
| `themeMode`, `theme`, `alpha`, `format`, `swatches` | Unchanged in name and meaning |

## Development

```sh
npm install
npm run build     # build once into dist/
npm run watch     # rebuild on change
npm run demo      # build and serve the example page on :8080
```

The example page under [`docs/`](docs/index.html) shows every option and both positioning paths,
including a switch that forces the JavaScript fallback. It is also the published page at
**https://mattopen.github.io/pixelpicker/** — `docs/` is the GitHub Pages source, so editing that
file changes the live site.

## License

MIT — see [LICENSE](LICENSE). Derived from [Coloris](https://github.com/mdbassit/Coloris) by
Mohammed Bassit, also MIT. Built by [pixelquadrat GmbH](https://www.pixelquadrat.com/).
