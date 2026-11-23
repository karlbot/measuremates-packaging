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
    charmUnits: "auto", charmT: 1.0, clearance: 0.12, pocketFill: 0.6, pocketDepth: 0.8,
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
    numOrder_top: "auto", numOrder_right: "auto", numOrder_bottom: "auto", numOrder_left: "auto",
    numLabels_top: "", numLabels_right: "", numLabels_bottom: "", numLabels_left: "",
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
    laserMarks: "line", laserPreview: false, laserWmOutline: false, laserWmOutlineCol: "#00a651",
    laserWmStyle: "outline", laserWmCut: "score2", laserWmCol: "#00a651", laserView: "chipboard",
    customFonts: [],
  };

  const LASER_PRESETS = {
    outlineScore: {
      label: "Outline + score",
      desc: "Wordmark outline, 1-line marks",
      v: { laserMarks: "line", laserWmStyle: "outline", laserWmCut: "score2", wordmarkMode: "inlay", numbersMode: "inlay", frameMode: "inlay", majorMode: "inlay", minorMode: "inlay" },
    },
    outlineCut: {
      label: "Cut-out wordmark",
      desc: "Wordmark cut through",
      v: { laserMarks: "line", laserWmStyle: "outline", laserWmCut: "cut", wordmarkMode: "inlay", numbersMode: "inlay", frameMode: "inlay", majorMode: "inlay", minorMode: "inlay" },
    },
    singleAll: {
      label: "Single-line all",
      desc: "Fast vector score",
      v: { laserMarks: "line", laserWmStyle: "center", laserWmCut: "score", wordmarkMode: "inlay", numbersMode: "inlay", frameMode: "inlay", majorMode: "inlay", minorMode: "inlay" },
    },
    fillEngrave: {
      label: "Filled engrave",
      desc: "Raster engrave fills",
      v: { laserMarks: "fill", laserWmStyle: "fill", laserWmCut: "score", wordmarkMode: "inlay", numbersMode: "inlay", frameMode: "inlay", majorMode: "inlay", minorMode: "inlay" },
    },
  };
  const WEIGHT_PRESETS = {
    original: { label: "Original artwork", v: { minorW: 0.163, majorW: 0.327, frameW: 0.327, numWeight: 0, wmWeight: 0, wmStroke: 2.126 } },
    thin: { label: "Fine (0.2 mm)", v: { minorW: 0.22, majorW: 0.38, frameW: 0.38, numWeight: 0, wmWeight: 0, wmStroke: 1.4 } },
    bold: { label: "Bold", v: { minorW: 0.6, majorW: 0.9, frameW: 0.9, numWeight: 0.15, wmWeight: 0, wmStroke: 2.6 } },
  };

  const LASER_FEAT_OPTS = [["inlay", "On (score/engrave)"], ["cut", "Cut through"], ["off", "Off"]];
  const WM_FEAT_OPTS = [["inlay", "On"], ["off", "Off"]];

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
    { id: "laser", title: "Laser cutting", open: true, fields: [
      { k: "laserMarks", label: "Ruler, numbers & frame marks", type: "seg", opts: [["line", "Single line (score)"], ["fill", "Filled (engrave)"]],
        help: "Single line exports ticks, frame marks and numbers as one centreline for fast vector scoring. Numbers use a built-in single-stroke digit font." },
      { k: "laserWmStyle", label: "Wordmark paths", type: "select", opts: [
        ["outline", "Outline only (no middle line)"],
        ["center", "Middle line only"],
        ["both", "Middle line + outline"],
        ["fill", "Filled (engrave)"],
      ], help: "Outline only traces the outer edge of the letters and omits the centreline." },
      { k: "laserWmCut", label: "Wordmark cut type", type: "select", opts: [
        ["score2", "Score (separate colour)"],
        ["score", "Score (same black as ruler)"],
        ["cut", "Cut through top sheet (blue)"],
      ], when: (p) => p.laserWmStyle !== "fill" },
      { k: "laserWmCol", label: "Wordmark line colour", type: "color", when: (p) => p.laserWmStyle !== "fill" && p.laserWmCut === "score2" },
      { k: "_laserFeats", type: "laserFeats" },
    ], after: "laserButtons" },
    { id: "presets", title: "Quick presets", open: true, custom: "presets" },
    { id: "wordmark", title: "Wordmark", open: false, fields: [
      { k: "wmSource", label: "Source", type: "seg", opts: [["original", "Original"], ["text", "Text"], ["svg", "SVG file"]] },
      { k: "wmText", label: "Text", type: "textarea", when: (p) => p.wmSource === "text" },
      { k: "wmFont", label: "Font", type: "select", opts: fontOptions, when: (p) => p.wmSource === "text" },
      { k: "_fontUpload", label: "Upload font", type: "file", accept: ".ttf,.otf,.woff", when: (p) => p.wmSource === "text", onFile: "font" },
      { k: "wmLetterSpacing", label: "Letter spacing", type: "num", unit: "em", min: -0.1, max: 0.5, step: 0.005, when: (p) => p.wmSource === "text" },
      { k: "wmLineHeight", label: "Line height", type: "num", unit: "×", min: 0.6, max: 2, step: 0.01, when: (p) => p.wmSource === "text" },
      { k: "_svgUpload", label: "SVG file", type: "file", accept: ".svg,image/svg+xml", when: (p) => p.wmSource === "svg", onFile: "svg", status: (p) => p.wmSvgName || "none loaded" },
      { k: "wmIgnoreLight", label: "Ignore white/background shapes", type: "check", when: (p) => p.wmSource === "svg" },
      { k: "wmStroke", label: "Outline pen width", type: "num", unit: "mm", min: 0.4, max: 5, step: 0.01, when: (p) => p.wmSource === "original" },
      { k: "wmWeight", label: "Outline weight ±", type: "num", unit: "mm", min: -0.5, max: 1, step: 0.01 },
      { k: "wmWidth", label: "Width", type: "num", unit: "mm", min: 5, max: 200, step: 0.1 },
      { k: "wmRot", label: "Rotation", type: "num", unit: "°", min: -180, max: 180, step: 0.5 },
      { k: "wmX", label: "Centre X", type: "num", unit: "mm", min: 0, max: 300, step: 0.1 },
      { k: "wmY", label: "Centre Y", type: "num", unit: "mm", min: 0, max: 300, step: 0.1, help: "Tip: drag the wordmark in the preview." },
    ] },
    { id: "numbers", title: "Numbers", open: false, fields: [
      { k: "numFont", label: "Font (for filled engrave)", type: "select", opts: numFontOptions },
      { k: "_numFontUpload", label: "Upload number font", type: "file", accept: ".ttf,.otf,.woff", onFile: "numfont" },
      { k: "numHeight", label: "Digit height", type: "num", unit: "mm", min: 1, max: 10, step: 0.01 },
      { k: "numInset", label: "Distance from edge", type: "num", unit: "mm", min: 2, max: 30, step: 0.1 },
      { k: "labelScheme", label: "Counting (when edge order is Auto)", type: "select", opts: [["clockwise", "Clockwise around card (original)"], ["standard", "From bottom-left"]] },
      { k: "_numEdges", type: "numEdges" },
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
    { id: "charm", title: "Charm & pocket cut", open: false, fields: [
      { k: "_dxfUpload", label: "Charm DXF", type: "file", accept: ".dxf", onFile: "dxf", status: (p) => p.charmDxfName || PP.DEFAULT_DXF_NAME },
      { k: "charmUnits", label: "DXF units", type: "select", opts: [["auto", "Auto (from file)"], ["in", "Inches"], ["mm", "Millimetres"]] },
      { k: "clearance", label: "Pocket clearance (per side)", type: "num", unit: "mm", min: -0.3, max: 0.6, step: 0.01, help: "Negative = pocket smaller than the charm for a tight press fit." },
      { k: "pocketFill", label: "Fill slits narrower than", type: "num", unit: "mm", min: 0, max: 3, step: 0.05, help: "Ignores narrow gaps cut into the charm outline (between segments, ruler notches). 0 = follow the outline exactly." },
      { k: "charmDX", label: "Offset X", type: "num", unit: "mm", min: -60, max: 60, step: 0.1 },
      { k: "charmDY", label: "Offset Y", type: "num", unit: "mm", min: -60, max: 60, step: 0.1, help: "Relative to the frame box (bottom-centre). Drag the charm in the preview." },
      { k: "charmRot", label: "Rotation", type: "num", unit: "°", min: -180, max: 180, step: 1 },
      { k: "notch", label: "Finger notch", type: "select", opts: [["none", "None"], ["left", "Left"], ["right", "Right"], ["top", "Top"], ["bottom", "Bottom"], ["both", "Left + right"]] },
      { k: "notchR", label: "Notch radius", type: "num", unit: "mm", min: 1, max: 12, step: 0.1, when: (p) => p.notch !== "none" },
      { k: "pushHole", label: "Back push-out hole", type: "select", opts: [["none", "None"], ["circle", "Round hole"], ["slot", "Slot"], ["window", "Window (follows charm, leaves a ledge)"]] },
      { k: "pushD", label: "Hole diameter / slot width", type: "num", unit: "mm", min: 2, max: 25, step: 0.1, when: (p) => p.pushHole === "circle" || p.pushHole === "slot" },
      { k: "pushLen", label: "Slot length", type: "num", unit: "mm", min: 2, max: 40, step: 0.1, when: (p) => p.pushHole === "slot" },
      { k: "pushLedge", label: "Ledge width", type: "num", unit: "mm", min: 0.8, max: 8, step: 0.1, when: (p) => p.pushHole === "window", help: "How much of the charm rests on the back chipboard around the window." },
      { k: "pushDX", label: "Hole offset X", type: "num", unit: "mm", min: -15, max: 15, step: 0.1, when: (p) => p.pushHole === "circle" || p.pushHole === "slot" },
      { k: "pushDY", label: "Hole offset Y", type: "num", unit: "mm", min: -15, max: 15, step: 0.1, when: (p) => p.pushHole === "circle" || p.pushHole === "slot", help: "Offset from the centre of the charm." },
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
    { id: "weights", title: "Line weights (filled engrave)", open: false, fields: [
      { k: "minorW", label: "Minor tick width", type: "num", unit: "mm", min: 0.05, max: 1.5, step: 0.01 },
      { k: "majorW", label: "Inch mark width", type: "num", unit: "mm", min: 0.05, max: 2, step: 0.01 },
      { k: "frameW", label: "Frame mark width", type: "num", unit: "mm", min: 0.05, max: 2, step: 0.01 },
      { k: "numWeight", label: "Number weight ±", type: "num", unit: "mm", min: -0.2, max: 0.4, step: 0.01, help: "Grows or thins the digit outlines (filled mode)." },
    ] },
    { id: "card", title: "Card", open: false, fields: [
      { k: "cardW", label: "Width", type: "num", unit: "mm", min: 20, max: 250, step: 0.1, hint: inchHint },
      { k: "cardH", label: "Height", type: "num", unit: "mm", min: 20, max: 250, step: 0.1, hint: inchHint },
      { k: "cardR", label: "Corner radius", type: "num", unit: "mm", min: 0, max: 20, step: 0.1 },
    ] },
    { id: "export", title: "Export & settings", open: false, custom: "export" },
  ];

  let state = {};
  let charmCache = { key: null, charm: null, info: "" };
  let lastDesign = null;
  const $ = (s, r) => (r || document).querySelector(s);

  function loadState() {
    state = JSON.parse(JSON.stringify(DEFAULTS));
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      if (s) {
        Object.keys(DEFAULTS).forEach((k) => { if (k in s) state[k] = s[k]; });
        // Migrate legacy boolean outline toggle into the new wordmark style/colour controls.
        if (!("laserWmStyle" in s) && s.laserWmOutline) {
          state.laserWmStyle = "both";
          state.laserWmCut = "score2";
          if (s.laserWmOutlineCol) state.laserWmCol = s.laserWmOutlineCol;
        }
        if (state.wordmarkMode && state.wordmarkMode !== "off") state.wordmarkMode = "inlay";
      }
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
          if (f.type === "numEdges") { inlineRow = null; body.appendChild(buildNumEdges()); return; }
          if (f.type === "laserFeats") { inlineRow = null; body.appendChild(buildLaserFeats()); return; }
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
      <div class="preset-label">Laser presets</div>
      <div class="preset-grid" id="style-presets"></div>
      <div class="preset-label">Line weights (engrave / outline)</div>
      <div class="preset-grid" id="weight-presets"></div>
      <div class="preset-label">Saved presets (local)</div>
      <div class="preset-save-row">
        <input type="text" id="preset-name" placeholder="Preset name…" aria-label="Preset name" maxlength="40">
        <button type="button" id="preset-save-btn">Save current</button>
      </div>
      <div class="preset-grid" id="saved-presets"></div>`;
    const sp = body.querySelector("#style-presets");
    Object.entries(LASER_PRESETS).forEach(([k, pr]) => {
      const b = document.createElement("button");
      b.className = "preset";
      b.innerHTML = `<strong>${pr.label}</strong><small>${pr.desc}</small>`;
      b.addEventListener("click", () => { Object.assign(state, pr.v); syncControls(); changed("preset"); });
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
      const desc = `${state.laserMarks === "line" ? "score" : "engrave"} · wm:${state.laserWmStyle}`;
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

  // Per-edge number controls: show/hide, reading order, and optional custom labels per position.
  function buildNumEdges() {
    const wrap = document.createElement("div");
    wrap.className = "row";
    const tbl = document.createElement("div");
    tbl.className = "num-edges";
    tbl.innerHTML = `<div class="sh">Edge</div><div class="sh">Order</div><div class="sh">Custom labels</div><div class="sh"></div>`;
    const SIDES = [["top", "Top", "→"], ["bottom", "Bottom", "→"], ["left", "Left", "↑"], ["right", "Right", "↑"]];
    SIDES.forEach(([side, label, arrow]) => {
      const kOn = "num_" + side, kOrd = "numOrder_" + side, kLab = "numLabels_" + side;
      const horiz = arrow === "→";
      const name = document.createElement("label");
      name.className = "chk ne-name";
      name.innerHTML = `<input type="checkbox"><span>${label}</span>`;
      const cb = name.querySelector("input");
      cb.setAttribute("aria-label", `Show numbers on ${label.toLowerCase()} edge`);
      const ord = document.createElement("select");
      ord.setAttribute("aria-label", `${label} number order`);
      ord.innerHTML = [
        ["auto", "Auto"],
        ["asc", horiz ? "1, 2, 3 →" : "1, 2, 3 ↑"],
        ["desc", horiz ? "← 1, 2, 3" : "↓ 1, 2, 3"],
      ].map(([v, l]) => `<option value="${v}">${l}</option>`).join("");
      ord.title = horiz ? "Reading order left → right" : "Reading order bottom → top";
      const lab = document.createElement("input");
      lab.type = "text";
      lab.placeholder = "e.g. 1,2 or 1,-,3";
      lab.spellcheck = false;
      lab.setAttribute("aria-label", `${label} custom labels, ${horiz ? "left to right" : "bottom to top"}, comma separated`);
      lab.title = `Labels for each inch mark ${horiz ? "left → right" : "bottom → top"}, comma separated. Use - to hide one. Blank = use Order.`;
      const rbtn = makeResetBtn([kOn, kOrd, kLab], `${label} numbers`);
      cb.addEventListener("change", () => { state[kOn] = cb.checked; sync(); changed(kOn); });
      ord.addEventListener("change", () => { state[kOrd] = ord.value; changed(kOrd); });
      lab.addEventListener("input", () => { state[kLab] = lab.value; changed(kLab); });
      const sync = () => {
        cb.checked = !!state[kOn];
        ord.value = state[kOrd] || "auto";
        if (document.activeElement !== lab) lab.value = state[kLab] || "";
        ord.disabled = lab.disabled = !state[kOn];
      };
      controls.push({ f: { k: kOn }, set: sync, resetKeys: [kOn, kOrd, kLab], rbtn });
      tbl.append(name, ord, lab, rbtn);
    });
    const hint = document.createElement("div");
    hint.className = "hint";
    hint.textContent = "Order: Auto follows Counting. Custom labels override each inch mark in reading order (left → right, bottom → top); use - to hide one, e.g. \"-,2\". Single-line laser mode draws digits only.";
    wrap.append(tbl, hint);
    return wrap;
  }

  function buildLaserFeats() {
    const wrap = document.createElement("div");
    wrap.className = "row";
    const tbl = document.createElement("div");
    tbl.className = "laser-feats";
    tbl.innerHTML = `<div class="sh">Feature</div><div class="sh">Laser action</div><div class="sh"></div>`;
    PP.GROUPS.forEach((g) => {
      const k = g.id + "Mode";
      const name = document.createElement("div");
      name.className = "lname";
      name.textContent = g.label;
      const sel = document.createElement("select");
      sel.setAttribute("aria-label", g.label + " laser action");
      const opts = g.id === "wordmark" ? WM_FEAT_OPTS : LASER_FEAT_OPTS;
      sel.innerHTML = opts.map(([v, l]) => `<option value="${v}">${l}</option>`).join("");
      const rbtn = makeResetBtn([k], g.label);
      sel.addEventListener("change", () => { state[k] = sel.value; changed("laserFeats"); });
      const sync = () => {
        const cur = state[k];
        if (g.id === "wordmark") sel.value = cur === "off" ? "off" : "inlay";
        else sel.value = cur === "off" || cur === "cut" ? cur : "inlay";
      };
      controls.push({ f: { k }, set: sync, resetKeys: [k], rbtn });
      tbl.append(name, sel, rbtn);
    });
    wrap.appendChild(tbl);
    return wrap;
  }

  function laserFrontFilename() {
    return baseName() + (state.laserMarks === "line" ? "-laser-front-lines.svg" : "-laser-front.svg");
  }
  function exportLaserFront() {
    PP.exporters.download(new Blob([PP.view2d.exportLaserFrontSVG(lastDesign, null, state)], { type: "image/svg+xml" }), laserFrontFilename());
  }
  function exportLaserBack() {
    PP.exporters.download(new Blob([PP.view2d.exportLaserBackSVG(lastDesign, null, state)], { type: "image/svg+xml" }), baseName() + "-laser-back.svg");
  }
  function exportLaserZip() {
    const files = [
      { name: laserFrontFilename(), data: PP.view2d.exportLaserFrontSVG(lastDesign, null, state) },
      { name: baseName() + "-laser-back.svg", data: PP.view2d.exportLaserBackSVG(lastDesign, null, state) },
    ];
    PP.exporters.download(PP.exporters.zip(files), baseName() + "-laser-svgs.zip");
  }
  function buildLaserButtons(body) {
    const wrap = document.createElement("div");
    wrap.className = "btn-grid";
    wrap.innerHTML = `
      <button type="button" class="lx-front primary">Front Laser SVG <small>markings + charm inset</small></button>
      <button type="button" class="lx-back">Back Laser SVG <small>outline + finger hole</small></button>
      <button type="button" class="lx-zip">Both SVGs (.zip) <small>front + back pair</small></button>`;
    wrap.querySelector(".lx-front").addEventListener("click", exportLaserFront);
    wrap.querySelector(".lx-back").addEventListener("click", exportLaserBack);
    wrap.querySelector(".lx-zip").addEventListener("click", exportLaserZip);
    const key = document.createElement("p");
    key.className = "hint";
    key.innerHTML = `SVG colours: <b style="color:#ff6b6b">red</b> = outer card cut, <b style="color:#6b8bff">blue</b> = inner cuts (charm inset, finger hole, cut-throughs), black = score / engrave.`;
    body.append(wrap, key);
  }

  function buildExport(body) {
    body.innerHTML = `
      <div class="btn-grid">
        <button id="ex-laser-zip" class="primary">Download Both Laser SVGs (.zip) <small>2mm chipboard front + back</small></button>
        <button id="ex-laser-front">Laser Front SVG <small>markings + charm inset</small></button>
        <button id="ex-laser-back">Laser Back SVG <small>outline + finger hole</small></button>
        <button id="ex-svg">2D artwork SVG <small>full composite</small></button>
        <button id="ex-json">Save settings <small>.json</small></button>
        <label class="btn-like">Load settings<input type="file" id="im-json" accept=".json,application/json" hidden></label>
      </div>
      <button id="reset-all" class="link">Reset everything to defaults</button>`;
    body.querySelector("#ex-laser-zip").addEventListener("click", exportLaserZip);
    body.querySelector("#ex-laser-front").addEventListener("click", exportLaserFront);
    body.querySelector("#ex-laser-back").addEventListener("click", exportLaserBack);
    body.querySelector("#ex-svg").addEventListener("click", () => PP.exporters.download(new Blob([PP.view2d.exportSVG(lastDesign, null, state)], { type: "image/svg+xml" }), baseName() + ".svg"));
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

  function syncControls() {
    controls.forEach((c) => c.set && c.set(state[c.f.k]));
    document.querySelectorAll("[data-laserview]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.laserview === (state.laserView || "chipboard"))));
    const tc = $("#toggle-charm");
    if (tc) tc.setAttribute("aria-pressed", String(!!state.showCharm));
    refreshVisibility();
  }
  function refreshVisibility() {
    controls.forEach((c) => {
      if (c.row && c.f.when) c.row.hidden = !c.f.when(state);
      if (c.rbtn && c.resetKeys) c.rbtn.hidden = c.resetKeys.every(isKeyDefault);
    });
  }

  // Read an uploaded file with feedback. Cloud-synced files (Google Drive / iCloud "online only")
  // can hang or fail while the OS fetches them; without this the upload silently did nothing.
  function readFile(file, asText) {
    const label = file.name;
    const slow = setTimeout(() => toast(`Reading ${label}… (waiting for the file - if it's in Google Drive/iCloud, make it available offline)`), 800);
    const read = asText ? file.text() : file.arrayBuffer();
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("timed out after 30 s - the file may be online-only in Google Drive/iCloud. Download it or copy it to a local folder and try again.")), 30000));
    return Promise.race([read, timeout])
      .finally(() => clearTimeout(slow))
      .catch((e) => {
        toast(`Could not read ${label}: ${e && e.message ? e.message : e}`, true);
        throw e;
      });
  }

  function handleFile(kind, file) {
    const ignore = () => {}; // errors already reported by readFile
    if (kind === "dxf") {
      readFile(file, true).then((t) => {
        let charm;
        try { charm = PP.buildCharm(PP.parseDXF(t, state.charmUnits === "auto" ? null : state.charmUnits)); }
        catch (e) { toast("Could not read DXF: " + e.message, true); return; }
        state.charmDxfText = t; state.charmDxfName = file.name; syncControls(); changed("dxf");
        toast(`Loaded charm ${file.name} (${charm.w.toFixed(2)} × ${charm.h.toFixed(2)} mm)`);
      }, ignore);
    } else if (kind === "svg") {
      readFile(file, true).then((t) => {
        try { PP.importSVG(t, { ignoreLight: state.wmIgnoreLight }); }
        catch (e) { toast("Could not read SVG: " + e.message, true); return; }
        state.wmSvgText = t; state.wmSvgName = file.name; state.wmSource = "svg"; syncControls(); changed("svg");
        toast("Loaded wordmark " + file.name);
      }, ignore);
    } else if (kind === "font" || kind === "numfont") {
      readFile(file, false).then((buf) => {
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
      }, ignore);
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
      lastDesign = design;
      PP.view2d.setOptions({ showCharm: state.showCharm });
      PP.view2d.update(design, null, state);
      updateLegend();
      renderInfo(design, performance.now() - t0);
    } catch (e) {
      console.error(e);
      toast("Build error: " + e.message, true);
    }
  }

  function updateLegend() {
    const leg = $("#view-legend");
    if (!leg) return;
    const view = state.laserView || "chipboard";
    if (view === "chipboard") {
      leg.innerHTML = `
        <span><i class="lg chip-cut"></i>2mm cutout (back sheet)</span>
        <span><i class="lg score-line"></i>scored / engraved</span>
        <span class="muted">Drag wordmark / charm · scroll to zoom · drag to pan</span>`;
    } else if (view === "front") {
      const hasWmCol = state.wordmarkMode !== "off" && state.laserWmStyle !== "fill" && state.laserWmCut === "score2";
      leg.innerHTML = `
        <span><i class="lg cut-outer"></i>outer cut (#ff0000)</span>
        <span><i class="lg cut-inner"></i>inner cuts + charm inset (#0000ff)</span>
        <span><i class="lg score-black"></i>score / engrave</span>
        ${hasWmCol ? `<span><i class="lg score-black" style="background:${state.laserWmCol};border-color:transparent"></i>wordmark</span>` : ""}
        <span class="muted">Drag wordmark / charm · scroll to zoom</span>`;
    } else {
      leg.innerHTML = `
        <span><i class="lg cut-outer"></i>outer cut (#ff0000)</span>
        <span><i class="lg cut-inner"></i>finger push hole (#0000ff)</span>
        <span class="muted">2mm chipboard back layer (scroll to zoom · drag to pan)</span>`;
    }
  }

  function renderInfo(design, ms) {
    const warnings = design.warnings.slice();
    const notes = (design.notes || []).slice();
    if (design.pushHole && design.pushHole.length) {
      const hb = PP.geo.bounds(design.pushHole);
      notes.push(`Back push-out hole: ${hb.w.toFixed(1)} × ${hb.h.toFixed(1)} mm.`);
    }
    if (state.clearance < 0) {
      notes.push(`Press-fit pocket: ${Math.abs(state.clearance).toFixed(2)} mm smaller per side than the charm DXF.`);
    } else if (state.clearance < 0.05) {
      warnings.push("Pocket clearance below 0.05 mm — test fit a cut before batching.");
    }
    if (state.wordmarkMode !== "off" && state.laserWmStyle !== "fill" && state.laserWmCut === "cut") {
      notes.push("Wordmark cut through: enclosed letter centres (O, R) cut out as separate pieces.");
    }
    const cutList = PP.GROUPS.filter((g) => g.id !== "wordmark" && state[g.id + "Mode"] === "cut").map((g) => design.groups[g.id]);
    if (cutList.length) {
      const islands = PP.geo.countIslandsIfCut(PP.geo.unionAll(cutList), design.card);
      if (islands > 0) warnings.push(`Cut-through markings create ${islands} loose island(s) that will fall out.`);
    }
    const warn = warnings.map((w) => `<li class="warn">${w}</li>`).join("");
    const noteItems = notes.map((w) => `<li>${w}</li>`).join("");
    const hidden = design.hiddenLabels ? `<li>${design.hiddenLabels} number(s) hidden behind wordmark/pocket.</li>` : "";
    const nWarn = warnings.length;
    const wmDesc = state.wordmarkMode === "off"
      ? "off"
      : `${{ outline: "outline only", center: "middle line", both: "middle + outline", fill: "filled" }[state.laserWmStyle] || "outline only"} · ${state.laserWmStyle === "fill" ? "engrave" : ({ score: "black score", score2: "colour score", cut: "cut through" }[state.laserWmCut] || "score")}`;
    let det = $("#info details");
    if (!det) {
      $("#info").innerHTML = `<details open><summary></summary><div class="info-body"></div></details>`;
      det = $("#info details");
    }
    det.querySelector("summary").innerHTML = `<b>Laser cut summary</b><span class="muted">2mm chipboard${nWarn ? ` · <span class="warn-count">${nWarn} warning${nWarn > 1 ? "s" : ""}</span>` : ""}</span>`;
    det.querySelector(".info-body").innerHTML = `
      <p class="method">2 × 2mm chipboard layers (Front + Back)</p>
      <p class="muted"><b>Front:</b> ${(design.W / 25.4).toFixed(2)} × ${(design.H / 25.4).toFixed(2)} in · ${state.laserMarks === "line" ? "1-line score" : "filled engrave"} · wordmark ${wmDesc}</p>
      <p class="muted"><b>Card:</b> ${design.W.toFixed(1)} × ${design.H.toFixed(1)} mm · rebuilt in ${ms.toFixed(0)} ms</p>
      <p class="muted small">Charm: ${charmCache.info}</p>
      ${warn || noteItems || hidden ? `<ul class="notes">${warn}${noteItems}${hidden}</ul>` : ""}`;
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

  function setLaserView(v) {
    state.laserView = v;
    document.querySelectorAll("[data-laserview]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.laserview === v)));
    saveState();
    if (lastDesign) {
      PP.view2d.setOptions({ showCharm: state.showCharm });
      PP.view2d.update(lastDesign, null, state);
      updateLegend();
    }
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
      // Optional overrides via URL hash: #s={"laserWmCut":"cut",...}
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
      PP.view2d.init($("#view2d"), onDrag);
      document.querySelectorAll("[data-laserview]").forEach((b) => b.addEventListener("click", () => setLaserView(b.dataset.laserview)));
      const tc = $("#toggle-charm");
      if (tc) {
        tc.setAttribute("aria-pressed", String(!!state.showCharm));
        tc.addEventListener("click", () => {
          state.showCharm = !state.showCharm;
          tc.setAttribute("aria-pressed", String(!!state.showCharm));
          saveState();
          rebuild();
        });
      }
      $("#fit2d").addEventListener("click", () => lastDesign && PP.view2d.resetView(lastDesign.W, lastDesign.H));
      $("#foot-laser-front").addEventListener("click", exportLaserFront);
      $("#foot-laser-back").addEventListener("click", exportLaserBack);
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
      const hv = (location.hash.match(/view=(chipboard|front|back)/) || [])[1];
      if (hv) state.laserView = hv;
      setLaserView(state.laserView || "chipboard");
      rebuild();
    },
    get state() { return state; },
    set(k, v) { state[k] = v; syncControls(); changed(k); },
    rebuild,
    get design() { return lastDesign; },
  };
})();
