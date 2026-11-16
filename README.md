# Charm Card — parametric packaging tool

A browser tool for designing the 3D-printed backing card that holds the laser-cut brass
**inchworm** charm. It reads the charm outline from the DXF, rebuilds the ruler card from
`allRuler.svg` as parametric geometry, and previews the result as a 3D print.

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
| **Feature styles** | For each of Wordmark / Numbers / Frame marks / Inch marks / Minor ticks: *Colour inlay* (flush, multi-material), *Embossed*, *Debossed*, *Cut through*, or *Off*, with the colour and depth/height. |
| **Line weights** | Minor tick width, inch mark width, frame mark width, number weight (outline grow/shrink), wordmark pen width / weight. |
| **Wordmark** | Original hand-drawn "INCH WORM", typed **text** in a bundled or uploaded font (TTF/OTF/WOFF), or an uploaded **SVG** (fills and strokes, transforms, curves, arcs). Position, width. You can also drag it in the 2D view. |
| **Numbers / ruler** | Font (the original Inter, monospace fonts — Space Mono, JetBrains Mono, IBM Plex Mono, Roboto Mono, Fira Code, DM Mono, Share Tech Mono — or upload your own), digit height, edge inset, counting direction (clockwise like the original, or from bottom-left), per-edge on/off, auto-hide behind the wordmark, inch (1/4, 1/8, 1/16) or cm ruler, tick lengths. |
| **Charm & pocket** | Load any charm DXF (SPLINE, LWPOLYLINE, POLYLINE, LINE, ARC, CIRCLE, ELLIPSE; units read from `$INSUNITS`). Pocket depth, clearance, offset, rotation, optional finger notch. A push-out hole through the pocket floor (round, slot, or a window that follows the charm and leaves a ledge) lets you press the charm out from behind. |
| **Filament colours** | Body plus 2 accents, each optionally **translucent** (with a clarity setting), finish (matte / basic / silk / glossy). **Backlight view** shows the card held up to a light. |
| **Card** | Size, thickness, corner radius, and an optional stepped **outer edge bevel** (top, bottom, or both) with configurable bevel width and height. |
| **Presets & resets** | Save custom named **presets locally** in the browser (`Quick presets → Saved presets`), load them with one click, or delete them. Any parameter changed from its default shows a circular **reset (`↺`)** button next to it to restore that single setting. |
| **Printer & preview** | Nozzle, layer height, first-layer height, slicer simulation, layer lines, top-surface finish, build plate. |

## Print preview

- **Height snapping.** Heights and depths snap to whole layers, so the preview matches what the slicer will produce.
- **Slicer simulation.** Approximates Arachne (the default perimeter generator in PrusaSlicer, Bambu Studio and Orca). Detail thinner than *min feature size* (25% of the nozzle) is dropped. Detail between that and *min line width* (85% of the nozzle) is widened. The 2D view shows dropped detail as red hatching and widened detail in orange. Exports always contain the exact designed geometry.
- **Surface rendering.** The 3D view shades layer lines on the walls and alternating top-infill lines, and renders the brass charm in its pocket. Use the **Back** camera to check the push-out hole, and the **Layer preview** slider to step through the print layer by layer and see cross-sections.
- **Print plan.** The panel says whether the design needs a multi-material printer (flush inlays) or works with one filament swap (*Raised 2-tone*: all raised features in one accent colour). If a swap works, it gives the layer for the colour change. It also estimates the grams of each filament.

## Export

- **3MF.** One object with one part per colour, with colours assigned. Bambu Studio, PrusaSlicer and Orca open it as a multi-part object.
- **Laser Front SVG & Laser Back SVG.** Two 1:1 `mm`-scaled SVGs for laser-cutting a two-layer card:
  - **Laser Front SVG (`*-laser-front.svg`):** Outer card cut (`#ff0000`), charm pocket inset cut (`#0000ff`), and all markings (`#000000` fills in `#markings`) clipped outside the charm inset.
  - **Laser Back SVG (`*-laser-back.svg`):** Just the outer card shape outline (`#ff0000`) and the finger push-out hole (`#0000ff`).
- **STLs (.zip).** One STL per colour, all sharing the same origin.
- **2D artwork SVG**, a **preview PNG**, and **settings JSON** (save/load). Settings also auto-save in the browser.

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
