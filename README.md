# pixelpicker

A lightweight, dependency-free color picker for text inputs. The panel lives in the browser's top
layer via the [Popover API](https://developer.mozilla.org/docs/Web/API/Popover_API) and is placed
with [CSS Anchor Positioning](https://developer.mozilla.org/docs/Web/CSS/CSS_anchor_positioning),
falling back to a small JavaScript calculation on older browsers.

This project is derived from [Coloris](https://github.com/mdbassit/Coloris) by Mohammed Bassit,
licensed under the MIT License. It is a rewrite rather than a fork: the instance model, the
positioning and the public API are new. The original copyright notice is retained in
[LICENSE](LICENSE).

**The panel is a helper, never a replacement for the input field.** You can always type into the
field yourself — the focus is never taken away from it and the field is never set to `readonly`.

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
| `fill` | The whole field takes the color; text contrast is computed |
| `fill-behind` | Color behind the text, field background transparent |
| `none` | No swatch — the field is left untouched |

`thumbPosition: 'start'` moves the swatch to the other side. It follows the writing direction, so
it works in right-to-left layouts without extra configuration.

## Options

Every option can be passed to `create()` or set per field as a `data-` attribute. Attributes win,
because they are the more specific source.

### Appearance

| Option | Attribute | Default | Meaning |
|---|---|---|---|
| `thumbStyle` | `data-pp-thumb` | `'bar'` | See the table above |
| `thumbPosition` | `data-pp-thumb-position` | `'end'` | `start` or `end` |
| `theme` | `data-pp-theme` | `'default'` | `default` or `pill` |
| `themeMode` | `data-pp-theme-mode` | `'auto'` | `light`, `dark` or `auto` (follows the OS) |

### Behaviour

| Option | Attribute | Default | Meaning |
|---|---|---|---|
| `openOn` | `data-pp-open-on` | `'click'` | `click`, `focus` or `manual` |
| `closeOnSwatch` | `data-pp-close-on-swatch` | `false` | Close after picking a swatch |
| `returnFocus` | — | `true` | Return focus to the field on close |
| `gap` | `data-pp-gap` | `4` | Distance between field and panel, in pixels |
| `forcePositionFallback` | — | `false` | Use the JavaScript fallback even where anchor positioning exists. For testing |

### Color

| Option | Attribute | Default | Meaning |
|---|---|---|---|
| `format` | `data-pp-format` | `'auto'` | `auto`, `hex`, `rgb`, `hsl`, `mixed`. `auto` follows what is already in the field |
| `formats` | — | `['hex','rgb','hsl']` | Which formats the switcher offers |
| `formatToggle` | `data-pp-format-toggle` | `false` | Show the format switcher |
| `alpha` | `data-pp-alpha` | `true` | Show the opacity slider |
| `forceAlpha` | `data-pp-force-alpha` | `false` | Always write the alpha channel, even at 1 |
| `defaultColor` | `data-pp-default-color` | `'#000000'` | Where an empty field starts |
| `swatches` | `data-pp-swatches` | 12 colors | Array, or a comma-separated list in the attribute. An empty array hides them |
| `swatchesOnly` | `data-pp-swatches-only` | `false` | Only swatches, no free selection |

### Controls and callbacks

| Option | Attribute | Default | Meaning |
|---|---|---|---|
| `clearButton` | `data-pp-clear-button` | `false` | Button that empties the field |
| `closeButton` | `data-pp-close-button` | `true` | Button that closes the panel |
| `onInput` | — | `null` | `(value, instance) => void`, on every change |
| `onChange` | — | `null` | `(value, instance) => void`, when a selection completes |
| `onOpen` / `onClose` | — | `null` | `(value, instance) => void` |
| `labels` | — | English | All accessible names, see below |

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
