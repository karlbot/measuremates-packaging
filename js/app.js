// App shell: parameter state, generated controls, rebuild pipeline, presets, exports.
window.PP = window.PP || {};
(function () {
  const STORE_KEY = "pp-charm-card-v1";
  const PRESETS_KEY = "pp-charm-card-presets-v1";

  const DEFAULTS = {
    // Card
    cardW: 76.2, cardH: 101.6, cardT: 2.0, cardR: 2.0,
    bevelW: 0, bevelH: 0.6, bevelSides: "top",
    // Charm & pocket
    charmUnits: "auto", charmT: 1.0, clearance: 0.12, pocketDepth: 0.8,
    charmDX: 0, charmDY: 0, charmRot: 0, notch: "none", notchR: 4.5, charmLineW: 0.15,
    pushHole: "circle", pushD: 8, pushLen: 14, pushLedge: 2.5, pushDX: 0, pushDY: 0,
    charmDxfText: null, charmDxfName: null,
    // Box the charm sits in (frame marks are drawn at its corners)
    boxX: 25.4, boxY: 25.4, boxW: 25.4, boxH: 25.4,
    frameOn: true, frameLen: 4.6, frameGap: 1.6, frameW: 0.327,
    // Wordmark
    wmSource: "original", wmText: "INCH\nWORM", wmFont: "permanent-marker", wmLetterSpacing: 0, wmLineHeight: 1.0,
    wmX: 38.27, wmY: 76.82, wmWidth: 43.59, wmRot: 0, wmStroke: 2.126, wmWeight: 0, wmIgnoreLight: true,
    wmSvgText: null, wmSvgName: null,
    // Ruler
    rulerUnits: "in", rulerSub: 8, labelScheme: "clockwise",
    tick_top: true, tick_right: true, tick_bottom: true, tick_left: true,
    tickLen1: 1.3, tickLen2: 2.6, tickLen3: 3.6, majorLen: 4.7,
    minorW: 0.163, majorW: 0.327,
    // Numbers
    numFont: "inter-600", numHeight: 2.44, numWeight: 0, numInset: 11.8, numRotate: false, numAutoHide: true,
    num_top: true, num_right: true, num_bottom: true, num_left: true,
    // Feature styles
    wordmarkMode: "inlay", wordmarkMat: "accent1", wordmarkDepth: 0.4,
    numbersMode: "inlay", numbersMat: "accent2", numbersDepth: 0.4,
    frameMode: "inlay", frameMat: "accent2", frameDepth: 0.4,
    majorMode: "inlay", majorMat: "accent2", majorDepth: 0.4,
    minorMode: "inlay", minorMat: "accent2", minorDepth: 0.4,
    // Filament
    colBody: "#f0efef", colAccent1: "#1d1d1f", colAccent2: "#9a9898", finish: "matte",
    transBody: false, transAccent1: false, transAccent2: false, transDist: 1.5, backlight: false,
    // Printer / preview
    nozzle: 0.4, layerH: 0.2, firstLayerH: 0.2, simSlicer: true, minFeaturePct: 25, minBeadPct: 85,
    layerLines: true, topFinish: "lines", showPlate: true, showCharm: true, showThin: true,
    // Laser cutting
    laserMarks: "fill", laserPreview: false,
    customFonts: [],
  };

  const WEIGHT_PRESETS = {
    original: { label: "Original artwork", v: { minorW: 0.163, majorW: 0.327, frameW: 0.327, numWeight: 0, wmWeight: 0, wmStroke: 2.126 } },
    printable: { label: "Printable (0.4 nozzle)", v: { minorW: 0.42, majorW: 0.6, frameW: 0.6, numWeight: 0.06, wmWeight: 0, wmStroke: 2.126 } },
    bold: { label: "Bold", v: { minorW: 0.6, majorW: 0.9, frameW: 0.9, numWeight: 0.15, wmWeight: 0, wmStroke: 2.6 } },
  };
  const STYLE_PRESETS = {
    inlay: { label: "Colour inlay", desc: "Flush, multi-material", f: (g) => ({ Mode: "inlay", Mat: g === "wordmark" ? "accent1" : "accent2", Depth: 0.4 }) },
    raised2: { label: "Raised 2-tone", desc: "One filament swap", f: () => ({ Mode: "emboss", Mat: "accent1", Depth: 0.4 }) },
    emboss: { label: "Embossed", desc: "Single colour", f: () => ({ Mode: "emboss", Mat: "body", Depth: 0.4 }) },
    deboss: { label: "Debossed", desc: "Single colour", f: () => ({ Mode: "deboss", Mat: "body", Depth: 0.6 }) },
    cut: { label: "Cut-out", desc: "Through holes", f: (g) => ({ Mode: g === "wordmark" ? "inlay" : "cut", Mat: "accent1", Depth: 0.4 }) },
  };

  const MODE_OPTS = [["inlay", "Inlay (flush colour)"], ["emboss", "Emboss (raised)"], ["deboss", "Deboss (recessed)"], ["cut", "Cut through"], ["off", "Off"]];
  const MAT_OPTS = [["accent1", "Accent 1"], ["accent2", "Accent 2"], ["body", "Body colour"]];

  const fontOptions = () => (PP.BUNDLED_FONTS || []).map((f) => [f.id, f.name]).concat((state.customFonts || []).map((f) => [f.id, f.name + " (uploaded)"]));
  // Ruler numbers: the original Inter plus the bundled monospace ("techy") fonts and any uploads.
  const numFontOptions = () => {
    const B = PP.BUNDLED_FONTS || [];
    const orig = B.filter((f) => f.id === "inter-600").map((f) => [f.id, f.name]);
    const mono = B.filter((f) => f.mono).map((f) => [f.id, f.name]);
    return orig.concat(mono, (state.customFonts || []).map((f) => [f.id, f.name + " (uploaded)"]));
  };
  const inchHint = (v) => (v / 25.4).toFixed(3) + " in";

  const SCHEMA = [
    { id: "presets", title: "Quick presets", open: true, custom: "presets" },
    { id: "styles", title: "Feature styles", open: true, custom: "styles" },
    { id: "weights", title: "Line weights", open: true, fields: [
      { k: "minorW", label: "Minor tick width", type: "num", unit: "mm", min: 0.05, max: 1.5, step: 0.01 },
      { k: "majorW", label: "Inch mark width", type: "num", unit: "mm", min: 0.05, max: 2, step: 0.01 },
      { k: "frameW", label: "Frame mark width", type: "num", unit: "mm", min: 0.05, max: 2, step: 0.01 },
      { k: "numWeight", label: "Number weight ±", type: "num", unit: "mm", min: -0.2, max: 0.4, step: 0.01, help: "Grows or thins the digit outlines." },
      { k: "wmStroke", label: "Wordmark pen width", type: "num", unit: "mm", min: 0.4, max: 5, step: 0.01, when: (p) => p.wmSource === "original" },
      { k: "wmWeight", label: "Wordmark weight ±", type: "num", unit: "mm", min: -0.5, max: 1, step: 0.01 },
    ] },
    { id: "wordmark", title: "Wordmark", open: false, fields: [
      { k: "wmSource", label: "Source", type: "seg", opts: [["original", "Original"], ["text", "Text"], ["svg", "SVG file"]] },
      { k: "wmText", label: "Text", type: "textarea", when: (p) => p.wmSource === "text" },
      { k: "wmFont", label: "Font", type: "select", opts: fontOptions, when: (p) => p.wmSource === "text" },
      { k: "_fontUpload", label: "Upload font", type: "file", accept: ".ttf,.otf,.woff", when: (p) => p.wmSource === "text", onFile: "font" },
      { k: "wmLetterSpacing", label: "Letter spacing", type: "num", unit: "em", min: -0.1, max: 0.5, step: 0.005, when: (p) => p.wmSource === "text" },
      { k: "wmLineHeight", label: "Line height", type: "num", unit: "×", min: 0.6, max: 2, step: 0.01, when: (p) => p.wmSource === "text" },
      { k: "_svgUpload", label: "SVG file", type: "file", accept: ".svg,image/svg+xml", when: (p) => p.wmSource === "svg", onFile: "svg", status: (p) => p.wmSvgName || "none loaded" },
      { k: "wmIgnoreLight", label: "Ignore white/background shapes", type: "check", when: (p) => p.wmSource === "svg" },
      { k: "wmWidth", label: "Width", type: "num", unit: "mm", min: 5, max: 200, step: 0.1 },
      { k: "wmRot", label: "Rotation", type: "num", unit: "°", min: -180, max: 180, step: 0.5 },
      { k: "wmX", label: "Centre X", type: "num", unit: "mm", min: 0, max: 300, step: 0.1 },
      { k: "wmY", label: "Centre Y", type: "num", unit: "mm", min: 0, max: 300, step: 0.1, help: "Tip: drag the wordmark in the 2D view." },
    ] },
    { id: "numbers", title: "Numbers", open: false, fields: [
      { k: "numFont", label: "Font", type: "select", opts: numFontOptions },
      { k: "_numFontUpload", label: "Upload number font", type: "file", accept: ".ttf,.otf,.woff", onFile: "numfont" },
      { k: "numHeight", label: "Digit height", type: "num", unit: "mm", min: 1, max: 10, step: 0.01 },
      { k: "numInset", label: "Distance from edge", type: "num", unit: "mm", min: 2, max: 30, step: 0.1 },
      { k: "labelScheme", label: "Counting", type: "select", opts: [["clockwise", "Clockwise around card (original)"], ["standard", "From bottom-left"]] },
      { k: "num_top", label: "Top", type: "check", inline: true },
      { k: "num_right", label: "Right", type: "check", inline: true },
      { k: "num_bottom", label: "Bottom", type: "check", inline: true },
      { k: "num_left", label: "Left", type: "check", inline: true },
      { k: "numAutoHide", label: "Hide numbers that collide with the wordmark/pocket", type: "check" },
      { k: "numRotate", label: "Rotate to follow edge", type: "check" },
    ] },
    { id: "ruler", title: "Ruler ticks", open: false, fields: [
      { k: "rulerUnits", label: "Units", type: "seg", opts: [["in", "Inches"], ["cm", "Centimetres"]] },
      { k: "rulerSub", label: "Subdivision", type: "select", opts: [[8, "1/8 in"], [16, "1/16 in"], [4, "1/4 in"]], num: true, when: (p) => p.rulerUnits === "in" },
      { k: "tickLen1", label: "Short tick length", type: "num", unit: "mm", min: 0.3, max: 10, step: 0.05 },
      { k: "tickLen2", label: "¼ tick length", type: "num", unit: "mm", min: 0.3, max: 10, step: 0.05, when: (p) => p.rulerUnits === "in" },
      { k: "tickLen3", label: "½ tick length", type: "num", unit: "mm", min: 0.3, max: 12, step: 0.05 },
      { k: "majorLen", label: "Inch mark length", type: "num", unit: "mm", min: 0.3, max: 15, step: 0.05 },
      { k: "tick_top", label: "Top", type: "check", inline: true },
      { k: "tick_right", label: "Right", type: "check", inline: true },
      { k: "tick_bottom", label: "Bottom", type: "check", inline: true },
      { k: "tick_left", label: "Left", type: "check", inline: true },
    ] },
    { id: "charm", title: "Charm & pocket", open: false, fields: [
      { k: "_dxfUpload", label: "Charm DXF", type: "file", accept: ".dxf", onFile: "dxf", status: (p) => p.charmDxfName || PP.DEFAULT_DXF_NAME },
      { k: "charmUnits", label: "DXF units", type: "select", opts: [["auto", "Auto (from file)"], ["in", "Inches"], ["mm", "Millimetres"]] },
      { k: "charmT", label: "Charm thickness", type: "num", unit: "mm", min: 0.3, max: 4, step: 0.05 },
      { k: "pocketDepth", label: "Pocket depth", type: "num", unit: "mm", min: 0.2, max: 4, step: 0.05 },
      { k: "clearance", label: "Clearance (per side)", type: "num", unit: "mm", min: 0, max: 0.6, step: 0.01 },
      { k: "charmDX", label: "Offset X", type: "num", unit: "mm", min: -60, max: 60, step: 0.1 },
      { k: "charmDY", label: "Offset Y", type: "num", unit: "mm", min: -60, max: 60, step: 0.1, help: "Relative to the frame box (bottom-centre). Drag the charm in 2D." },
      { k: "charmRot", label: "Rotation", type: "num", unit: "°", min: -180, max: 180, step: 1 },
      { k: "notch", label: "Finger notch", type: "select", opts: [["none", "None"], ["left", "Left"], ["right", "Right"], ["top", "Top"], ["bottom", "Bottom"], ["both", "Left + right"]] },
      { k: "notchR", label: "Notch radius", type: "num", unit: "mm", min: 1, max: 12, step: 0.1, when: (p) => p.notch !== "none" },
      { k: "pushHole", label: "Push-out hole (through the pocket floor)", type: "select", opts: [["none", "None"], ["circle", "Round hole"], ["slot", "Slot"], ["window", "Window (follows charm, leaves a ledge)"]] },
      { k: "pushD", label: "Hole diameter / slot width", type: "num", unit: "mm", min: 2, max: 25, step: 0.1, when: (p) => p.pushHole === "circle" || p.pushHole === "slot" },
      { k: "pushLen", label: "Slot length", type: "num", unit: "mm", min: 2, max: 40, step: 0.1, when: (p) => p.pushHole === "slot" },
      { k: "pushLedge", label: "Ledge width", type: "num", unit: "mm", min: 0.8, max: 8, step: 0.1, when: (p) => p.pushHole === "window", help: "How much of the charm rests on the floor around the window." },
      { k: "pushDX", label: "Hole offset X", type: "num", unit: "mm", min: -15, max: 15, step: 0.1, when: (p) => p.pushHole === "circle" || p.pushHole === "slot" },
      { k: "pushDY", label: "Hole offset Y", type: "num", unit: "mm", min: -15, max: 15, step: 0.1, when: (p) => p.pushHole === "circle" || p.pushHole === "slot", help: "Offset from the centre of the charm." },
      { k: "charmLineW", label: "Engraved line width (preview)", type: "num", unit: "mm", min: 0.02, max: 0.6, step: 0.01 },
    ] },
    { id: "frame", title: "Frame marks & box", open: false, fields: [
      { k: "frameOn", label: "Show frame marks", type: "check" },
      { k: "frameLen", label: "Mark length", type: "num", unit: "mm", min: 0.5, max: 15, step: 0.1 },
      { k: "frameGap", label: "Gap from corner", type: "num", unit: "mm", min: 0, max: 10, step: 0.1 },
      { k: "boxX", label: "Box left", type: "num", unit: "mm", min: 0, max: 300, step: 0.1, hint: inchHint },
      { k: "boxY", label: "Box bottom", type: "num", unit: "mm", min: 0, max: 300, step: 0.1, hint: inchHint },
      { k: "boxW", label: "Box width", type: "num", unit: "mm", min: 2, max: 300, step: 0.1, hint: inchHint },
      { k: "boxH", label: "Box height", type: "num", unit: "mm", min: 2, max: 300, step: 0.1, hint: inchHint },
    ] },
    { id: "card", title: "Card", open: false, fields: [
      { k: "cardW", label: "Width", type: "num", unit: "mm", min: 20, max: 250, step: 0.1, hint: inchHint },
      { k: "cardH", label: "Height", type: "num", unit: "mm", min: 20, max: 250, step: 0.1, hint: inchHint },
      { k: "cardT", label: "Thickness", type: "num", unit: "mm", min: 0.6, max: 8, step: 0.05 },
      { k: "cardR", label: "Corner radius", type: "num", unit: "mm", min: 0, max: 20, step: 0.1 },
      { k: "bevelW", label: "Outer edge bevel", type: "num", unit: "mm", min: 0, max: 4, step: 0.05, help: "Chamfers the card's outer perimeter across layers (0 = off)." },
      { k: "bevelH", label: "Bevel height", type: "num", unit: "mm", min: 0.2, max: 4, step: 0.05, when: (p) => p.bevelW > 0 },
      { k: "bevelSides", label: "Bevel edges", type: "seg", opts: [["top", "Top"], ["bottom", "Bottom"], ["both", "Both"]], when: (p) => p.bevelW > 0 },
    ] },
    { id: "colors", title: "Filament colours", open: true, fields: [
      { k: "colBody", label: "Body", type: "color", trans: "transBody" },
      { k: "colAccent1", label: "Accent 1", type: "color", trans: "transAccent1" },
      { k: "colAccent2", label: "Accent 2", type: "color", trans: "transAccent2" },
      { k: "transDist", label: "Translucent clarity", type: "num", unit: "mm", min: 0.3, max: 12, step: 0.1, when: (p) => p.transBody || p.transAccent1 || p.transAccent2, help: "How far light travels before taking on the full colour. Low = milky/saturated, high = clear." },
      { k: "backlight", label: "Backlight view (hold up to a light)", type: "check" },
      { k: "finish", label: "Filament finish", type: "select", opts: [["matte", "Matte PLA"], ["standard", "Basic PLA"], ["silk", "Silk PLA"], ["glossy", "Glossy PETG"]] },
    ] },
    { id: "printer", title: "Printer & preview", open: false, fields: [
      { k: "nozzle", label: "Nozzle", type: "select", opts: [[0.2, "0.2 mm"], [0.25, "0.25 mm"], [0.4, "0.4 mm"], [0.6, "0.6 mm"], [0.8, "0.8 mm"]], num: true },
      { k: "layerH", label: "Layer height", type: "num", unit: "mm", min: 0.04, max: 0.4, step: 0.01 },
      { k: "firstLayerH", label: "First layer", type: "num", unit: "mm", min: 0.08, max: 0.4, step: 0.01 },
      { k: "simSlicer", label: "Simulate slicer (thin-feature handling)", type: "check" },
      { k: "minFeaturePct", label: "Min feature size", type: "num", unit: "% nozzle", min: 5, max: 100, step: 1, when: (p) => p.simSlicer },
      { k: "minBeadPct", label: "Min line width", type: "num", unit: "% nozzle", min: 20, max: 120, step: 1, when: (p) => p.simSlicer },
      { k: "layerLines", label: "Show layer lines & top infill", type: "check" },
      { k: "topFinish", label: "Top surface", type: "select", opts: [["lines", "Top infill lines"], ["ironed", "Ironed"], ["textured", "Textured plate (printed face-down)"]] },
      { k: "showPlate", label: "Show build plate", type: "check" },
      { k: "showCharm", label: "Show charm", type: "check" },
      { k: "showThin", label: "Highlight unprintable detail in 2D", type: "check" },
    ] },
    { id: "laser", title: "Laser cutting", open: false, fields: [
      { k: "laserMarks", label: "Markings on the front sheet", type: "seg", opts: [["fill", "Filled (engrave)"], ["line", "Single line (score)"]],
        help: "Single line exports every tick, frame mark, number and the wordmark as one centerline - fast vector scoring. Numbers use a built-in single-stroke digit font; text/SVG-fill wordmarks fall back to their outlines." },
      { k: "laserPreview", label: "Preview laser paths in the 2D view", type: "check" },
    ], after: "laserButtons" },
    { id: "export", title: "Export & settings", open: true, custom: "export" },
  ];

  let state = {};
  let charmCache = { key: null, charm: null, info: "" };
  let lastDesign = null, lastModel = null;
  const $ = (s, r) => (r || document).querySelector(s);

  function loadState() {
    state = JSON.parse(JSON.stringify(DEFAULTS));
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      if (s) Object.keys(DEFAULTS).forEach((k) => { if (k in s) state[k] = s[k]; });
    } catch (e) { /* ignore */ }
  }
  function saveState() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (e) {
      // Large uploads can exceed the quota - keep everything else.
      try { const s = { ...state, wmSvgText: null, charmDxfText: null }; localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e2) { /* ignore */ }
    }
  }

  function isKeyDefault(k) {
    const a = state[k], b = DEFAULTS[k];
    if (typeof b === "number") return Math.abs((+a || 0) - b) <= 1e-6;
    if (Array.isArray(b)) return JSON.stringify(a || []) === JSON.stringify(b);
    return a === b;
  }
  function makeResetBtn(keys, label) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "reset-btn";
    btn.textContent = "↺";
    btn.title = `Reset ${label} to default`;
    btn.setAttribute("aria-label", `Reset ${label} to default`);
    btn.hidden = true;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      keys.forEach((k) => { state[k] = JSON.parse(JSON.stringify(DEFAULTS[k])); });
      syncControls();
      changed(keys[0]);
    });
    return btn;
  }
  function loadSavedPresets() {
    try { return JSON.parse(localStorage.getItem(PRESETS_KEY) || "[]") || []; }
    catch (e) { return []; }
  }
  function writeSavedPresets(list) {
    try { localStorage.setItem(PRESETS_KEY, JSON.stringify(list)); return true; }
    catch (e) {
      // Strip raw file blobs if quota is tight.
      try {
        const slim = list.map((p) => ({ ...p, data: { ...p.data, wmSvgText: null, charmDxfText: null } }));
        localStorage.setItem(PRESETS_KEY, JSON.stringify(slim));
        return true;
      } catch (e2) { toast("Could not save preset: storage full", true); return false; }
    }
  }

  // ---------- control generation ----------
  const controls = [];
  function buildPanel() {
    const panel = $("#panel-sections");
    panel.innerHTML = "";
    controls.length = 0;
    SCHEMA.forEach((sec) => {
      const det = document.createElement("details");
      det.className = "sec";
      det.dataset.sec = sec.id;
      det.open = !!sec.open;
      det.innerHTML = `<summary>${sec.title}</summary><div class="sec-body"></div>`;
      const body = det.querySelector(".sec-body");
      if (sec.custom === "presets") buildPresets(body);
      else if (sec.custom === "styles") buildStyles(body);
      else if (sec.custom === "export") buildExport(body);
      else {
        let inlineRow = null;
        sec.fields.forEach((f) => {
          const row = buildField(f);
          if (f.inline) {
            if (!inlineRow) { inlineRow = document.createElement("div"); inlineRow.className = "row inline-checks"; body.appendChild(inlineRow); }
            inlineRow.appendChild(row);
          } else { inlineRow = null; body.appendChild(row); }
        });
        if (sec.after === "laserButtons") buildLaserButtons(body);
      }
      panel.appendChild(det);
    });
    refreshVisibility();
  }

  let uid = 0;
  function buildField(f) {
    const id = "f-" + f.k + "-" + uid++;
    const row = document.createElement(f.inline ? "label" : "div");
    row.className = f.inline ? "chk-inline" : "row row-" + f.type;
    let resetKeys = f.k in DEFAULTS ? [f.k] : [];
    if (f.type === "file") {
      if (f.onFile === "dxf") resetKeys = ["charmDxfText", "charmDxfName"];
      else if (f.onFile === "svg") resetKeys = ["wmSvgText", "wmSvgName"];
    }
    const rbtn = resetKeys.length ? makeResetBtn(resetKeys, f.label) : null;
    const ctl = { f, row, set: null, resetKeys, rbtn };
    if (f.type === "num") {
      row.innerHTML = `<div class="row-head"><label for="${id}">${f.label}</label></div><div class="num-wrap"><input type="range" min="${f.min}" max="${f.max}" step="${f.step}" aria-label="${f.label} slider"><input type="number" id="${id}" min="${f.min}" max="${f.max}" step="${f.step}"><span class="unit">${f.unit || ""}</span></div>${f.hint || f.help ? `<div class="hint"></div>` : ""}`;
      if (rbtn) row.querySelector(".row-head").appendChild(rbtn);
      const [rng, num] = row.querySelectorAll("input");
      const hint = row.querySelector(".hint");
      const commit = (v, from) => {
        v = parseFloat(v);
        if (!isFinite(v)) return;
        state[f.k] = v;
        if (from !== rng) rng.value = v;
        if (from !== num) num.value = +v.toFixed(4);
        if (hint) hint.textContent = f.hint ? f.hint(v) : f.help;
        changed(f.k);
      };
      rng.addEventListener("input", () => commit(rng.value, rng));
      num.addEventListener("input", () => commit(num.value, num));
      ctl.set = (v) => { rng.value = v; num.value = +(+v).toFixed(4); if (hint) hint.textContent = f.hint ? f.hint(v) : f.help; };
    } else if (f.type === "select") {
      row.innerHTML = `<div class="row-head"><label for="${id}">${f.label}</label></div><select id="${id}"></select>`;
      if (rbtn) row.querySelector(".row-head").appendChild(rbtn);
      const sel = row.querySelector("select");
      const fill = () => {
        const opts = typeof f.opts === "function" ? f.opts() : f.opts;
        sel.innerHTML = opts.map(([v, l]) => `<option value="${v}">${l}</option>`).join("");
      };
      fill();
      sel.addEventListener("change", () => { state[f.k] = f.num ? parseFloat(sel.value) : sel.value; changed(f.k); });
      ctl.set = (v) => { if (typeof f.opts === "function") fill(); sel.value = String(v); };
    } else if (f.type === "seg") {
      row.innerHTML = `<div class="row-head"><span class="lbl">${f.label}</span></div><div class="seg" role="radiogroup" aria-label="${f.label}">${f.opts.map(([v, l]) => `<label><input type="radio" name="${id}" value="${v}"><span>${l}</span></label>`).join("")}</div>`;
      if (rbtn) row.querySelector(".row-head").appendChild(rbtn);
      row.querySelectorAll("input").forEach((r) => r.addEventListener("change", () => { if (r.checked) { state[f.k] = r.value; changed(f.k); } }));
      ctl.set = (v) => row.querySelectorAll("input").forEach((r) => (r.checked = r.value === String(v)));
    } else if (f.type === "check") {
      if (f.inline) {
        row.innerHTML = `<input type="checkbox" id="${id}"><span>${f.label}</span>`;
        if (rbtn) row.appendChild(rbtn);
      } else {
        row.innerHTML = `<div class="row-head"><label class="chk"><input type="checkbox" id="${id}"><span>${f.label}</span></label></div>`;
        if (rbtn) row.querySelector(".row-head").appendChild(rbtn);
      }
      const cb = row.querySelector("input");
      cb.addEventListener("change", () => { state[f.k] = cb.checked; changed(f.k); });
      ctl.set = (v) => (cb.checked = !!v);
    } else if (f.type === "color") {
      row.innerHTML = `<div class="row-head"><label for="${id}">${f.label}</label></div><div class="color-wrap"><input type="color" id="${id}"><input type="text" class="hex" aria-label="${f.label} hex" maxlength="7" spellcheck="false">${f.trans ? `<label class="chk trans-chk" title="Translucent filament (e.g. translucent PETG/PLA)"><input type="checkbox"><span>Translucent</span></label>` : ""}</div>`;
      if (rbtn) row.querySelector(".row-head").appendChild(rbtn);
      const [c, t] = row.querySelectorAll("input");
      if (f.trans) {
        const tcWrap = row.querySelector(".trans-chk");
        const tc = tcWrap.querySelector("input");
        const trBtn = makeResetBtn([f.trans], f.label + " translucent");
        tcWrap.appendChild(trBtn);
        tc.addEventListener("change", () => { state[f.trans] = tc.checked; changed(f.trans); });
        controls.push({ f: { k: f.trans }, set: (v) => (tc.checked = !!v), resetKeys: [f.trans], rbtn: trBtn });
      }
      c.addEventListener("input", () => { state[f.k] = c.value; t.value = c.value; changed(f.k); });
      t.addEventListener("change", () => { if (/^#[0-9a-f]{6}$/i.test(t.value)) { state[f.k] = t.value.toLowerCase(); c.value = state[f.k]; changed(f.k); } });
      ctl.set = (v) => { c.value = v; t.value = v; };
    } else if (f.type === "textarea") {
      row.innerHTML = `<div class="row-head"><label for="${id}">${f.label}</label></div><textarea id="${id}" rows="2" spellcheck="false"></textarea>`;
      if (rbtn) row.querySelector(".row-head").appendChild(rbtn);
      const ta = row.querySelector("textarea");
      ta.addEventListener("input", () => { state[f.k] = ta.value; changed(f.k); });
      ctl.set = (v) => (ta.value = v);
    } else if (f.type === "file") {
      row.innerHTML = `<div class="row-head"><label for="${id}">${f.label}</label></div><input type="file" id="${id}" accept="${f.accept}"><div class="hint file-status"></div>`;
      if (rbtn) row.querySelector(".row-head").appendChild(rbtn);
      const inp = row.querySelector("input");
      inp.addEventListener("change", () => { if (inp.files[0]) handleFile(f.onFile, inp.files[0]); inp.value = ""; });
      ctl.set = () => { const s = row.querySelector(".file-status"); if (s && f.status) s.textContent = "Loaded: " + f.status(state); };
    }
    if (f.help && f.type !== "num" && !f.inline) {
      const h = document.createElement("div");
      h.className = "hint";
      h.textContent = f.help;
      row.appendChild(h);
    }
    controls.push(ctl);
    return row;
  }

  function buildPresets(body) {
    body.innerHTML = `
      <div class="preset-label">Feature style</div>
      <div class="preset-grid" id="style-presets"></div>
      <div class="preset-label">Line weights</div>
      <div class="preset-grid" id="weight-presets"></div>
      <div class="preset-label">Saved presets (local)</div>
      <div class="preset-save-row">
        <input type="text" id="preset-name" placeholder="Preset name…" aria-label="Preset name" maxlength="40">
        <button type="button" id="preset-save-btn">Save current</button>
      </div>
      <div class="preset-grid" id="saved-presets"></div>`;
    const sp = body.querySelector("#style-presets");
    Object.entries(STYLE_PRESETS).forEach(([k, pr]) => {
      const b = document.createElement("button");
      b.className = "preset";
      b.innerHTML = `<strong>${pr.label}</strong><small>${pr.desc}</small>`;
      b.addEventListener("click", () => {
        PP.GROUPS.forEach((g) => { const v = pr.f(g.id); state[g.id + "Mode"] = v.Mode; state[g.id + "Mat"] = v.Mat; state[g.id + "Depth"] = v.Depth; });
        syncControls(); changed("preset");
      });
      sp.appendChild(b);
    });
    const wp = body.querySelector("#weight-presets");
    Object.entries(WEIGHT_PRESETS).forEach(([k, pr]) => {
      const b = document.createElement("button");
      b.className = "preset";
      b.innerHTML = `<strong>${pr.label}</strong>`;
      b.addEventListener("click", () => { Object.assign(state, pr.v); syncControls(); changed("preset"); });
      wp.appendChild(b);
    });

    const nameInp = body.querySelector("#preset-name");
    const saveBtn = body.querySelector("#preset-save-btn");
    const savedHost = body.querySelector("#saved-presets");

    function renderSaved() {
      const list = loadSavedPresets();
      savedHost.innerHTML = "";
      if (!list.length) {
        const empty = document.createElement("div");
        empty.className = "hint preset-empty";
        empty.textContent = "No saved presets yet.";
        savedHost.appendChild(empty);
        return;
      }
      list.forEach((item) => {
        const wrap = document.createElement("div");
        wrap.className = "preset-saved";
        const b = document.createElement("button");
        b.type = "button";
        b.className = "preset";
        b.innerHTML = `<strong></strong><small></small>`;
        b.querySelector("strong").textContent = item.name;
        b.querySelector("small").textContent = item.desc || "Custom preset";
        b.addEventListener("click", () => {
          Object.keys(DEFAULTS).forEach((k) => {
            if (item.data && k in item.data) state[k] = JSON.parse(JSON.stringify(item.data[k]));
          });
          syncControls();
          changed("preset");
          toast(`Loaded preset "${item.name}"`);
        });
        const del = document.createElement("button");
        del.type = "button";
        del.className = "preset-del";
        del.textContent = "×";
        del.title = `Delete preset "${item.name}"`;
        del.setAttribute("aria-label", `Delete preset ${item.name}`);
        del.addEventListener("click", (e) => {
          e.stopPropagation();
          const next = loadSavedPresets().filter((p) => p.id !== item.id);
          writeSavedPresets(next);
          renderSaved();
          toast(`Deleted preset "${item.name}"`);
        });
        wrap.append(b, del);
        savedHost.appendChild(wrap);
      });
    }

    function doSavePreset() {
      const list = loadSavedPresets();
      const rawName = nameInp.value.trim() || `Preset ${list.length + 1}`;
      const snapshot = {};
      Object.keys(DEFAULTS).forEach((k) => { snapshot[k] = JSON.parse(JSON.stringify(state[k])); });
      const desc = `${state.cardT}mm · ${state.wordmarkMode}${state.bevelW > 0 ? ` · ${state.bevelW}mm bevel` : ""}`;
      const existing = list.find((p) => p.name.toLowerCase() === rawName.toLowerCase());
      if (existing) {
        existing.name = rawName;
        existing.desc = desc;
        existing.data = snapshot;
      } else {
        list.push({ id: "p-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6), name: rawName, desc, data: snapshot });
      }
      if (writeSavedPresets(list)) {
        nameInp.value = "";
        renderSaved();
        toast(existing ? `Updated preset "${rawName}"` : `Saved preset "${rawName}"`);
      }
    }

    saveBtn.addEventListener("click", doSavePreset);
    nameInp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); doSavePreset(); } });
    renderSaved();
    buildPresets._saveNamed = (customName) => {
      if (customName != null) nameInp.value = customName;
      doSavePreset();
    };
  }

  function buildStyles(body) {
    const tbl = document.createElement("div");
    tbl.className = "styles";
    tbl.innerHTML = `<div class="sh">Feature</div><div class="sh">Treatment</div><div class="sh">Colour</div><div class="sh">Depth</div><div class="sh"></div>`;
    PP.GROUPS.forEach((g) => {
      const name = document.createElement("div");
      name.className = "sname";
      name.textContent = g.label;
      const mode = document.createElement("select");
      mode.setAttribute("aria-label", g.label + " treatment");
      mode.innerHTML = MODE_OPTS.map(([v, l]) => `<option value="${v}">${l}</option>`).join("");
      const mat = document.createElement("select");
      mat.setAttribute("aria-label", g.label + " colour");
      mat.innerHTML = MAT_OPTS.map(([v, l]) => `<option value="${v}">${l}</option>`).join("");
      const dep = document.createElement("input");
      dep.type = "number"; dep.min = 0.04; dep.max = 4; dep.step = 0.05;
      dep.setAttribute("aria-label", g.label + " depth or height");
      const swatch = document.createElement("span");
      swatch.className = "swatch";
      const matWrap = document.createElement("div");
      matWrap.className = "mat-wrap";
      matWrap.append(swatch, mat);
      const rKeys = [g.id + "Mode", g.id + "Mat", g.id + "Depth"];
      const rbtn = makeResetBtn(rKeys, g.label + " style");
      mode.addEventListener("change", () => { state[g.id + "Mode"] = mode.value; sync(); changed("styles"); });
      mat.addEventListener("change", () => { state[g.id + "Mat"] = mat.value; sync(); changed("styles"); });
      dep.addEventListener("input", () => { const v = parseFloat(dep.value); if (isFinite(v)) { state[g.id + "Depth"] = v; changed("styles"); } });
      const sync = () => {
        const m = state[g.id + "Mode"];
        mode.value = m;
        mat.value = state[g.id + "Mat"];
        dep.value = state[g.id + "Depth"];
        const colorable = m === "inlay" || m === "emboss";
        mat.disabled = !colorable;
        dep.disabled = m === "cut" || m === "off";
        dep.title = m === "emboss" ? "Raised height (mm)" : m === "cut" ? "Cuts all the way through" : "Depth (mm)";
        swatch.style.background = colorable ? state[{ accent1: "colAccent1", accent2: "colAccent2", body: "colBody" }[state[g.id + "Mat"]]] : "transparent";
        swatch.classList.toggle("none", !colorable);
      };
      controls.push({ f: { k: g.id + "Mode" }, set: sync, resetKeys: rKeys, rbtn });
      tbl.append(name, mode, matWrap, dep, rbtn);
    });
    body.appendChild(tbl);
    const note = document.createElement("p");
    note.className = "hint";
    note.innerHTML = "Depth = inlay/deboss depth or emboss height, snapped to whole layers. Overlapping features: higher rows win.";
    body.appendChild(note);
  }

  function exportLaserFront() {
    const suffix = state.laserMarks === "line" ? "-laser-front-lines.svg" : "-laser-front.svg";
    PP.exporters.download(new Blob([PP.view2d.exportLaserFrontSVG(lastDesign, lastModel, state)], { type: "image/svg+xml" }), baseName() + suffix);
  }
  function exportLaserBack() {
    PP.exporters.download(new Blob([PP.view2d.exportLaserBackSVG(lastDesign, lastModel, state)], { type: "image/svg+xml" }), baseName() + "-laser-back.svg");
  }
  function buildLaserButtons(body) {
    const wrap = document.createElement("div");
    wrap.className = "btn-grid";
    wrap.innerHTML = `
      <button type="button" class="lx-front">Laser Front SVG <small>markings + charm inset</small></button>
      <button type="button" class="lx-back">Laser Back SVG <small>outline + finger hole</small></button>`;
    wrap.querySelector(".lx-front").addEventListener("click", exportLaserFront);
    wrap.querySelector(".lx-back").addEventListener("click", exportLaserBack);
    const key = document.createElement("p");
    key.className = "hint";
    key.innerHTML = `Colours: <b style="color:#ff6b6b">red</b> = outer cut, <b style="color:#6b8bff">blue</b> = inner cuts (charm inset, finger hole, cut-through features), black = engrave / score.`;
    body.append(wrap, key);
  }

  function buildExport(body) {
    body.innerHTML = `
      <div class="btn-grid">
        <button id="ex-3mf" class="primary">Download 3MF <small>multi-colour, one object</small></button>
        <button id="ex-laser-front">Laser Front SVG <small>markings + charm inset</small></button>
        <button id="ex-laser-back">Laser Back SVG <small>outline + finger hole</small></button>
        <button id="ex-stl">STLs (.zip) <small>one per colour</small></button>
        <button id="ex-svg">2D artwork SVG</button>
        <button id="ex-png">Preview PNG</button>
        <button id="ex-json">Save settings</button>
        <label class="btn-like">Load settings<input type="file" id="im-json" accept=".json,application/json" hidden></label>
      </div>
      <button id="reset-all" class="link">Reset everything to defaults</button>`;
    body.querySelector("#ex-3mf").addEventListener("click", export3MF);
    body.querySelector("#ex-laser-front").addEventListener("click", exportLaserFront);
    body.querySelector("#ex-laser-back").addEventListener("click", exportLaserBack);
    body.querySelector("#ex-stl").addEventListener("click", exportSTL);
    body.querySelector("#ex-svg").addEventListener("click", () => PP.exporters.download(new Blob([PP.view2d.exportSVG(lastDesign, lastModel, state)], { type: "image/svg+xml" }), baseName() + ".svg"));
    body.querySelector("#ex-png").addEventListener("click", () => {
      fetch(PP.view3d.snapshot()).then((r) => r.blob()).then((b) => PP.exporters.download(b, baseName() + "-preview.png"));
    });
    body.querySelector("#ex-json").addEventListener("click", () => PP.exporters.download(new Blob([JSON.stringify(state, null, 1)], { type: "application/json" }), baseName() + "-settings.json"));
    body.querySelector("#im-json").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      file.text().then((t) => {
        const s = JSON.parse(t);
        state = JSON.parse(JSON.stringify(DEFAULTS));
        Object.keys(DEFAULTS).forEach((k) => { if (k in s) state[k] = s[k]; });
        (state.customFonts || []).forEach((f) => PP.forgetFont(f.id));
        buildPanel(); syncControls(); changed("load");
      }).catch((err) => toast("Could not load settings: " + err.message, true));
      e.target.value = "";
    });
    body.querySelector("#reset-all").addEventListener("click", () => {
      if (!confirm("Reset all settings (including uploaded files) to defaults?")) return;
      state = JSON.parse(JSON.stringify(DEFAULTS));
      buildPanel(); syncControls(); changed("reset");
    });
  }

  function baseName() {
    const n = state.wmSource === "text" ? state.wmText.replace(/\s+/g, "-") : state.wmSource === "svg" && state.wmSvgName ? state.wmSvgName.replace(/\.svg$/i, "") : "inchworm";
    return (n || "charm") .toLowerCase().replace(/[^a-z0-9-_]/g, "") + "-card";
  }

  function syncControls() { controls.forEach((c) => c.set && c.set(state[c.f.k])); refreshVisibility(); }
  function refreshVisibility() {
    controls.forEach((c) => {
      if (c.row && c.f.when) c.row.hidden = !c.f.when(state);
      if (c.rbtn && c.resetKeys) c.rbtn.hidden = c.resetKeys.every(isKeyDefault);
    });
  }

  function handleFile(kind, file) {
    if (kind === "dxf") {
      file.text().then((t) => {
        try { PP.buildCharm(PP.parseDXF(t, state.charmUnits === "auto" ? null : state.charmUnits)); }
        catch (e) { toast("Could not read DXF: " + e.message, true); return; }
        state.charmDxfText = t; state.charmDxfName = file.name; syncControls(); changed("dxf");
        toast("Loaded charm " + file.name);
      });
    } else if (kind === "svg") {
      file.text().then((t) => {
        try { PP.importSVG(t, { ignoreLight: state.wmIgnoreLight }); }
        catch (e) { toast("Could not read SVG: " + e.message, true); return; }
        state.wmSvgText = t; state.wmSvgName = file.name; state.wmSource = "svg"; syncControls(); changed("svg");
        toast("Loaded wordmark " + file.name);
      });
    } else if (kind === "font" || kind === "numfont") {
      file.arrayBuffer().then((buf) => {
        try { opentype.parse(buf); } catch (e) { toast("Unsupported font (use TTF, OTF or WOFF): " + e.message, true); return; }
        let bin = "";
        const u8 = new Uint8Array(buf);
        for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
        const id = "custom-" + file.name.replace(/[^a-z0-9]/gi, "").toLowerCase();
        state.customFonts = (state.customFonts || []).filter((f) => f.id !== id).concat([{ id, name: file.name.replace(/\.[^.]+$/, ""), data: btoa(bin) }]);
        PP.forgetFont(id);
        if (kind === "numfont") state.numFont = id; else state.wmFont = id;
        syncControls(); changed("font");
        toast("Loaded font " + file.name);
      });
    }
  }

  // ---------- rebuild ----------
  // Throttled rather than debounced: while a slider is dragged we keep rebuilding at the pace
  // the pipeline allows (always using the latest state), instead of waiting for the drag to stop.
  let pending = null;
  function changed(key) {
    refreshVisibility();
    scheduleSave();
    if (pending) return; // a rebuild is already queued and will read the latest state
    pending = setTimeout(rebuild, key === "drag" ? 0 : 16);
  }
  // localStorage writes serialise the whole state (incl. embedded fonts/SVG/DXF) - don't do it per input event.
  let saveTimer = null;
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveState, 300);
  }
  window.addEventListener("pagehide", () => { if (saveTimer) { clearTimeout(saveTimer); saveState(); } });

  function getCharm() {
    const text = state.charmDxfText || PP.DEFAULT_DXF;
    const key = (state.charmDxfName || "default") + "|" + text.length + "|" + state.charmUnits;
    if (charmCache.key !== key) {
      try {
        const dxf = PP.parseDXF(text, state.charmUnits === "auto" ? null : state.charmUnits);
        const charm = PP.buildCharm(dxf);
        charmCache = { key, charm, info: `${charm.w.toFixed(2)} × ${charm.h.toFixed(2)} mm · ${dxf.unitsLabel} · ${charm.innerLoops} inner cut(s), ${charm.openLines} engraved line(s)` };
      } catch (e) {
        charmCache = { key, charm: null, info: "DXF error: " + e.message };
      }
    }
    return charmCache.charm;
  }

  function rebuild() {
    pending = null;
    const t0 = performance.now();
    try {
      const charm = getCharm();
      const design = PP.buildDesign(state, charm);
      const model = PP.buildModel(design, state);
      lastDesign = design; lastModel = model;
      PP.view3d.update(model, design, state, layerClipZ());
      PP.view2d.setOptions({ showThin: state.showThin, showCharm: state.showCharm });
      PP.view2d.update(design, model, state);
      updateLayerSlider(model);
      renderInfo(design, model, performance.now() - t0);
    } catch (e) {
      console.error(e);
      toast("Build error: " + e.message, true);
    }
  }

  function renderInfo(design, model, ms) {
    const colors = { body: state.colBody, accent1: state.colAccent1, accent2: state.colAccent2 };
    const names = { body: "Body", accent1: "Accent 1", accent2: "Accent 2" };
    const grams = Object.entries(model.grams).map(([k, g]) => `<li><span class="swatch" style="background:${colors[k]}"></span>${names[k]} <b>${g.toFixed(1)} g</b></li>`).join("");
    const warn = design.warnings.concat(model.warnings).map((w) => `<li class="warn">${w}</li>`).join("");
    const notes = (design.notes || []).concat(model.notes).map((w) => `<li>${w}</li>`).join("");
    const hidden = design.hiddenLabels ? `<li>${design.hiddenLabels} number(s) hidden behind the wordmark/pocket.</li>` : "";
    const nWarn = design.warnings.length + model.warnings.length;
    let det = $("#info details");
    if (!det) {
      $("#info").innerHTML = `<details${document.body.dataset.view === "split" ? "" : " open"}><summary></summary><div class="info-body"></div></details>`;
      det = $("#info details");
    }
    det.querySelector("summary").innerHTML = `<b>Print plan</b><span class="muted">${model.totalLayers} layers${nWarn ? ` · <span class="warn-count">${nWarn} warning${nWarn > 1 ? "s" : ""}</span>` : ""}</span>`;
    det.querySelector(".info-body").innerHTML = `
      <p class="method ${model.method.kind}">${model.method.text}</p>
      <ul class="mats">${grams}</ul>
      <p class="muted">${model.zMax.toFixed(2)} mm tall · ${(design.W / 25.4).toFixed(2)} × ${(design.H / 25.4).toFixed(2)} in · rebuilt in ${ms.toFixed(0)} ms</p>
      <p class="muted small">Charm: ${charmCache.info}</p>
      ${warn || notes || hidden ? `<ul class="notes">${warn}${notes}${hidden}</ul>` : ""}`;
  }

  // ---------- layer scrubber ----------
  function updateLayerSlider(model) {
    const s = $("#layer-slider");
    const atMax = +s.value >= +s.max;
    s.max = model.totalLayers;
    if (atMax) s.value = model.totalLayers;
    onLayer();
  }
  function onLayer() {
    const s = $("#layer-slider");
    const n = +s.value, N = +s.max;
    const z = state.firstLayerH + (n - 1) * state.layerH;
    $("#layer-label").textContent = n >= N ? `All ${N} layers` : `Layer ${n} / ${N} · z ${z.toFixed(2)} mm`;
    PP.view3d.setClip(layerClipZ());
  }
  function layerClipZ() {
    const s = $("#layer-slider");
    const n = +s.value, N = +s.max;
    if (!lastModel || n >= N || n >= lastModel.totalLayers) return null;
    return +(state.firstLayerH + (n - 1) * state.layerH).toFixed(4);
  }

  // ---------- exports ----------
  function export3MF() {
    if (state.simSlicer) toast("Exporting exact geometry (slicer simulation is preview-only).");
    const ex = exactGeoms();
    const blob = PP.exporters.threeMF(ex, baseName());
    PP.exporters.download(blob, baseName() + ".3mf");
  }
  function exportSTL() {
    const ex = exactGeoms();
    const files = ex.map((p) => ({ name: `${baseName()}-${p.key}.stl`, data: PP.exporters.stl(p.geometry, p.name) }));
    PP.exporters.download(PP.exporters.zip(files), baseName() + "-stl.zip");
  }
  // Exports use the exact designed geometry (without the slicer thin-feature simulation).
  function exactGeoms() {
    const model = state.simSlicer ? PP.buildModel(lastDesign, { ...state, simSlicer: false }) : lastModel;
    const names = { body: "Body", accent1: "Accent 1", accent2: "Accent 2" };
    const colors = { body: state.colBody, accent1: state.colAccent1, accent2: state.colAccent2 };
    const by = {};
    model.solids.forEach((s) => (by[s.mat] = by[s.mat] || []).push(s));
    return Object.entries(by).map(([k, list]) => {
      const geoms = list.map((s) => extrudeForExport(s.region, s.z0, s.z1)).filter(Boolean);
      const trans = { body: state.transBody, accent1: state.transAccent1, accent2: state.transAccent2 }[k];
      return { key: k, name: names[k] + (trans ? " (translucent)" : ""), color: colors[k], alpha: trans ? "80" : "FF", geometry: mergeGeoms(geoms) };
    });
  }
  function extrudeForExport(region, z0, z1) {
    const shapes = PP.geo.shapes(region).map((s) => {
      const sh = new THREE.Shape(s.outer.map(([x, y]) => new THREE.Vector2(x, y)));
      s.holes.forEach((h) => sh.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y)))));
      return sh;
    });
    if (!shapes.length) return null;
    const g = new THREE.ExtrudeGeometry(shapes, { depth: z1 - z0, bevelEnabled: false, curveSegments: 1 });
    g.translate(0, 0, z0);
    return g;
  }
  function mergeGeoms(geoms) {
    let n = 0;
    geoms.forEach((g) => (n += g.attributes.position.count));
    const pos = new Float32Array(n * 3);
    let o = 0;
    geoms.forEach((g) => { pos.set(g.attributes.position.array, o); o += g.attributes.position.array.length; g.dispose(); });
    const out = new THREE.BufferGeometry();
    out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return out;
  }

  // ---------- misc UI ----------
  let toastTimer = null;
  function toast(msg, isErr) {
    const t = $("#toast");
    t.textContent = msg;
    t.className = "toast show" + (isErr ? " err" : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.className = "toast"), isErr ? 6000 : 2500);
  }

  function setView(v) {
    document.body.dataset.view = v;
    document.querySelectorAll("[data-setview]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.setview === v)));
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
      if (lastDesign) PP.view3d.resetCamera(lastDesign, PP.view3d._camView);
    }, 30);
  }

  function onDrag(kind, dx, dy, done) {
    if (kind === "wordmark") { state.wmX += dx; state.wmY += dy; }
    else if (kind === "charm") { state.charmDX += dx; state.charmDY += dy; }
    if (done) { ["wmX", "wmY", "charmDX", "charmDY"].forEach((k) => (state[k] = Math.round(state[k] * 100) / 100)); syncControls(); }
    changed("drag");
  }

  PP.app = {
    init() {
      loadState();
      // Optional overrides via URL hash: #s={"wordmarkMode":"emboss",...}
      const hs = (location.hash.match(/[#&]s=([^&]+)/) || [])[1];
      if (hs) { try { Object.assign(state, JSON.parse(decodeURIComponent(hs))); } catch (e) { console.warn("bad #s", e); } }
      buildPanel();
      const ho = (location.hash.match(/[#&]open=([^&]+)/) || [])[1];
      if (ho) {
        const openIds = new Set(ho.split(","));
        document.querySelectorAll("details.sec").forEach((d) => { d.open = openIds.has(d.dataset.sec); });
      }
      const hp = (location.hash.match(/[#&]savePreset=([^&]+)/) || [])[1];
      if (hp) {
        const inp = $("#preset-name"), btn = $("#preset-save-btn");
        if (inp && btn) { inp.value = decodeURIComponent(hp); btn.click(); }
      }
      syncControls();
      PP.view3d.init($("#view3d"));
      PP.view2d.init($("#view2d"), onDrag);
      document.querySelectorAll("[data-setview]").forEach((b) => b.addEventListener("click", () => setView(b.dataset.setview)));
      document.querySelectorAll("[data-cam]").forEach((b) => b.addEventListener("click", () => lastDesign && PP.view3d.resetCamera(lastDesign, b.dataset.cam)));
      $("#fit2d").addEventListener("click", () => lastDesign && PP.view2d.resetView(lastDesign.W, lastDesign.H));
      $("#layer-slider").addEventListener("input", onLayer);
      $("#foot-3mf").addEventListener("click", export3MF);
      $("#foot-save-json").addEventListener("click", () => PP.exporters.download(new Blob([JSON.stringify(state, null, 1)], { type: "application/json" }), baseName() + "-settings.json"));
      $("#foot-save-preset").addEventListener("click", () => {
        const inp = $("#preset-name");
        let name = inp && inp.value.trim();
        if (!name) {
          const list = loadSavedPresets();
          const ans = prompt("Save current setup as local preset:", `Preset ${list.length + 1}`);
          if (ans === null) return;
          name = ans.trim() || `Preset ${list.length + 1}`;
        }
        if (buildPresets._saveNamed) buildPresets._saveNamed(name);
      });
      const hv = (location.hash.match(/view=(\w+)/) || [])[1];
      setView(hv || "split");
      rebuild();
      const hc = (location.hash.match(/cam=(\w+)/) || [])[1];
      if (hc) PP.view3d.resetCamera(lastDesign, hc);
      const hl = (location.hash.match(/layer=(\d+)/) || [])[1];
      if (hl) { $("#layer-slider").value = hl; onLayer(); }
    },
    get state() { return state; },
    set(k, v) { state[k] = v; syncControls(); changed(k); },
    rebuild,
    get model() { return lastModel; },
    get design() { return lastDesign; },
  };
})();
