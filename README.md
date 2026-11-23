# Charm Card — parametric laser-cut packaging tool

A browser tool for designing the 2-layer **2mm chipboard** backing card that holds the laser-cut brass
**inchworm** charm. It reads the charm outline from the DXF, rebuilds the ruler card from
`allRuler.svg` as parametric vector geometry, previews it as cut and scored 2mm chipboard (or raw Front/Back SVG cut sheets), and exports laser-ready SVGs.

## Run it

Double-click **`index.html`**. It runs straight from the folder over `file://`, with no
server, build step or internet connection. All libraries and fonts are in `vendor/` and `assets/`.

### Deploy on Cloudflare (Workers or Pages CD)

This repository is pre-configured for Cloudflare Git continuous deployment:
- **Cloudflare Workers (Static Assets):** Uses `wrangler.jsonc` and `.assetsignore` out of the box (default deploy command: `npx wrangler deploy`).
- **Cloudflare Pages:** Set **Build command** to empty (or `npm run build`) and **Build output directory** to `/`.

## What you can change

| Area | Controls |
| --- | --- |
| **Laser cutting** | Switch non-wordmark marks (ruler ticks, frame marks, numbers) between *Single line (score)* and *Filled (engrave)*. Choose wordmark path style: *Outline only (no middle line)*, *Middle line only*, *Middle line + outline*, or *Filled*, and pick its cut type (*Score separate colour*, *Score black*, or *Cut through*). Toggle individual feature layers On / Cut through / Off. |
| **Wordmark** | Original hand-drawn "INCH WORM", typed **text** in a bundled or uploaded font (TTF/OTF/WOFF), or an uploaded **SVG**. Adjust outline pen width, outline weight, width, rotation, and X/Y position (or drag directly in the preview). |
| **Numbers / ruler** | Built-in single-stroke digits in *Single line* mode, or bundled/uploaded fonts in *Filled* mode. Per-edge visibility, left-to-right / bottom-to-top ordering (`1, 2, 3 →`), custom comma-separated labels, collision auto-hide, inch (1/4, 1/8, 1/16) or cm ticks, tick lengths. |
| **Charm & pocket cut** | Load any charm DXF (SPLINE, LWPOLYLINE, POLYLINE, LINE, ARC, CIRCLE, ELLIPSE; units read from `$INSUNITS`). Pocket clearance (including negative press-fit), hairline slit filling, offset, rotation, optional finger notch, and a back push-out hole (round, slot, or charm-shaped window). |
| **Frame & card** | Frame mark visibility, length, gap, charm box dimensions, card width/height and corner radius. |
| **Presets & resets** | Built-in laser presets plus locally saved custom presets in the browser (`Quick presets → Saved presets`). Modified parameters show a circular **reset (`↺`)** button to restore defaults. |

## Preview & export

- **2mm Chipboard preview:** Renders the assembled 2-layer 2mm chipboard card with pocket depth shadow, toasted laser score/engrave lines, through-cuts exposing the back layer, and the brass charm in place.
- **Front SVG & Back SVG previews:** Switch toolbar modes to inspect the exact colour-coded cut/score vectors (`#ff0000` outer card cut, `#0000ff` inner cuts / charm inset / push-out hole, `#000000` black score/engrave, plus your chosen colour for separate wordmark lines).
- **Sticky footer buttons:** Always-visible **Front SVG**, **Back SVG**, **Save preset**, and **Save settings** buttons, plus a combined **Both Laser SVGs (.zip)** download under *Laser cutting* and *Export & settings*.

## Files

```
index.html            app shell
css/style.css
js/geometry.js        Clipper-based polygon ops (offset, boolean, opening)
js/dxf.js             DXF reader (B-spline evaluation, bulges, chaining)
js/svgpath.js         SVG path flattening, SVG import, font text → polygons
js/design.js          parameters → 2D layout (ruler, numbers, frame, wordmark, pocket)
js/model.js           2D layout → stacked layer solids + slicer simulation + print plan
js/view3d.js          three.js preview with layer-line shader
js/view2d.js          SVG layout view (pan/zoom/drag)
js/export.js          STL / 3MF / zip writers
js/app.js             UI, state, presets
assets/defaults.js    embedded default DXF + original wordmark (generated)
assets/fonts.js       embedded fonts (generated)
tools/build_defaults.py  regenerates the two asset files from the DXF/SVG/fonts
```

If you edit `allRuler.svg` or the default DXF, run `python3 tools/build_defaults.py` to
refresh the embedded copies.

Libraries: three.js r147, clipper-lib 6.4.2, opentype.js 1.3.4. Fonts (OFL) come from Fontsource:
Inter, Space Mono, JetBrains Mono, IBM Plex Mono, Roboto Mono, Fira Code, DM Mono, Share Tech Mono,
Permanent Marker, Caveat Brush, Rubik Mono One, Bungee.
