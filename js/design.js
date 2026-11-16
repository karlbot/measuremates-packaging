// Builds the 2D layout (all regions in mm, y-up, origin = card bottom-left) from parameters.
window.PP = window.PP || {};
(function () {
  const G = PP.geo;
  const fontCache = {};
  const glyphCache = {};
  let fontVersion = 0; // bumped when an uploaded font is replaced, so cached wordmarks rebuild

  PP.getFont = function (id, customFonts) {
    if (fontCache[id]) return fontCache[id];
    let entry = (PP.BUNDLED_FONTS || []).find((f) => f.id === id);
    if (!entry && customFonts) entry = customFonts.find((f) => f.id === id);
    if (!entry) entry = PP.BUNDLED_FONTS[0];
    const bin = atob(entry.data);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    const font = opentype.parse(buf.buffer);
    const digits = font.getPath("0123456789", 0, 0, 100).getBoundingBox();
    font._ppDigit = { top: digits.y1, bottom: digits.y2, h: digits.y2 - digits.y1 };
    fontCache[id] = font;
    return font;
  };
  PP.forgetFont = (id) => { fontVersion++; delete fontCache[id]; Object.keys(glyphCache).forEach((k) => { if (k.startsWith(id + "|")) delete glyphCache[k]; }); };

  // Label glyphs at font size 100 (y-down), cached as [x,y] polygons + bbox.
  function labelPolys(font, fontId, label) {
    const key = fontId + "|" + label;
    if (glyphCache[key]) return glyphCache[key];
    const subs = PP.commandsToSubs(font.getPath(label, 0, 0, 100).commands);
    let x0 = Infinity, x1 = -Infinity;
    subs.forEach((s) => s.pts.forEach(([x]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }));
    return (glyphCache[key] = { subs, cx: (x0 + x1) / 2 });
  }

  function placeLabel(font, fontId, label, px, py, height, angleDeg) {
    const L = labelPolys(font, fontId, label);
    const k = height / font._ppDigit.h;
    const cy = (font._ppDigit.top + font._ppDigit.bottom) / 2;
    const a = (angleDeg * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
    const polys = L.subs.map((s) => s.pts.map(([x, y]) => {
      const lx = (x - L.cx) * k, ly = -(y - cy) * k;
      return [px + lx * ca - ly * sa, py + lx * sa + ly * ca];
    }));
    return G.normalize(G.toPaths(polys));
  }

  // Area centroid of a region (mm).
  function centroid(region) {
    let A = 0, X = 0, Y = 0;
    G.fromPaths(region).forEach((L) => {
      for (let i = 0, j = L.length - 1; i < L.length; j = i++) {
        const c = L[j][0] * L[i][1] - L[i][0] * L[j][1];
        A += c; X += (L[j][0] + L[i][0]) * c; Y += (L[j][1] + L[i][1]) * c;
      }
    });
    if (Math.abs(A) < 1e-9) { const b = G.bounds(region); return [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2]; }
    return [X / (3 * A), Y / (3 * A)];
  }

  function edges(W, H, scheme) {
    if (scheme === "standard") {
      return {
        top: { o: [0, H], d: [1, 0], n: [0, -1], L: W },
        right: { o: [W, 0], d: [0, 1], n: [-1, 0], L: H },
        bottom: { o: [0, 0], d: [1, 0], n: [0, 1], L: W },
        left: { o: [0, 0], d: [0, 1], n: [1, 0], L: H },
      };
    }
    // "clockwise": the ruler wraps around the card (as in the original artwork).
    return {
      top: { o: [0, H], d: [1, 0], n: [0, -1], L: W },
      right: { o: [W, H], d: [0, -1], n: [-1, 0], L: H },
      bottom: { o: [W, 0], d: [-1, 0], n: [0, 1], L: W },
      left: { o: [0, 0], d: [0, 1], n: [1, 0], L: H },
    };
  }

  // Bar perpendicular to an edge at distance t along it, from the edge inward by len.
  function bar(e, t, len, w) {
    const px = e.o[0] + e.d[0] * t, py = e.o[1] + e.d[1] * t;
    const out = 1; // extend past the edge so the card clip makes a clean end
    const ax = px - e.n[0] * out, ay = py - e.n[1] * out;
    const bx = px + e.n[0] * len, by = py + e.n[1] * len;
    const hx = (e.d[0] * w) / 2, hy = (e.d[1] * w) / 2;
    return G.toPath([[ax - hx, ay - hy], [bx - hx, by - hy], [bx + hx, by + hy], [ax + hx, ay + hy]]);
  }

  function segRect(x0, y0, x1, y1, w) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
    const nx = (-dy / L) * (w / 2), ny = (dx / L) * (w / 2);
    return G.toPath([[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]]);
  }

  PP.wordmarkDrawing = function (p) {
    if (p.wmSource === "svg" && p.wmSvgText) {
      const dr = PP.importSVG(p.wmSvgText, { ignoreLight: p.wmIgnoreLight });
      return { dr, stroke: null };
    }
    if (p.wmSource === "text") {
      const font = PP.getFont(p.wmFont, p.customFonts);
      return { dr: PP.textToFills(font, p.wmText, { letterSpacing: p.wmLetterSpacing, lineHeight: p.wmLineHeight }), stroke: null };
    }
    // Original hand-drawn "INCH WORM" strokes (mm, y-up) -> treat as y-down drawing.
    const wm = PP.DEFAULT_WORDMARK;
    const dr = {
      fills: [],
      strokes: [{ subs: wm.strokes.map((s) => ({ pts: s.map(([x, y]) => [x, -y]), closed: false })), width: wm.strokeWidth, cap: "round", join: "round" }],
      warnings: [],
    };
    return { dr, stroke: p.wmStroke };
  };

  let wmCache = { key: null, dr: null };

  PP.buildDesign = function (p, charm) {
    const warnings = [], notes = [];
    const W = p.cardW, H = p.cardH;
    const card = G.roundRect(0, 0, W, H, p.cardR);

    // ---------- charm placement & pocket ----------
    let charmSolid = [], charmOutline = [], charmSlots = [], pocket = [], charmBounds = null, pushHole = [];
    if (charm) {
      const a = ((p.charmRot || 0) * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
      const hx = charm.w / 2, hy = charm.h / 2;
      const rot = (paths) => G.map(paths, (x, y) => [(x - hx) * ca - (y - hy) * sa, (x - hx) * sa + (y - hy) * ca]);
      const o = rot(charm.outline);
      const rb = G.bounds(o);
      const tx = p.boxX + p.boxW / 2 + p.charmDX - (rb.x0 + rb.x1) / 2;
      const ty = p.boxY + p.charmDY - rb.y0;
      charmOutline = G.translate(o, tx, ty);
      charmSolid = G.translate(rot(charm.solid), tx, ty);
      const lines = G.translate(rot(charm.lines), tx, ty);
      charmSlots = lines.length ? G.strokeOpen(lines, p.charmLineW, "round") : [];
      charmBounds = G.bounds(charmOutline);
      pocket = G.offset(charmOutline, p.clearance);
      if (p.notch && p.notch !== "none") {
        const pb = G.bounds(pocket);
        const cx = (pb.x0 + pb.x1) / 2, cy = (pb.y0 + pb.y1) / 2;
        const pos = { left: [pb.x0, cy], right: [pb.x1, cy], top: [cx, pb.y1], bottom: [cx, pb.y0] };
        const sides = p.notch === "both" ? ["left", "right"] : [p.notch];
        sides.forEach((s) => { if (pos[s]) pocket = G.union(pocket, G.circle(pos[s][0], pos[s][1], p.notchR)); });
      }
      pocket = G.inter(pocket, card);

      // Push-out hole through the pocket floor, so the charm can be pressed out from behind.
      if (p.pushHole && p.pushHole !== "none") {
        const c = centroid(charmOutline);
        const cx = c[0] + p.pushDX, cy = c[1] + p.pushDY;
        if (p.pushHole === "circle") pushHole = G.circle(cx, cy, p.pushD / 2);
        else if (p.pushHole === "slot") {
          const L = Math.max(0, p.pushLen - p.pushD);
          pushHole = G.strokeOpen([G.toPath([[cx, cy - L / 2], [cx, cy + L / 2]])], p.pushD, "round");
        } else if (p.pushHole === "window") pushHole = G.offset(charmOutline, -p.pushLedge);
        pushHole = G.inter(pushHole, pocket);
        // The hole must stay inside the charm with a ledge left to rest on.
        const support = G.offset(charmOutline, -0.8);
        if (G.area(G.diff(pushHole, support)) > 0.05) warnings.push("Push-out hole reaches within 0.8 mm of the charm's edge - the charm may fall through or rock.");
      }
    }

    // ---------- wordmark ----------
    let wordmark = [];
    try {
      const key = [p.wmSource, p.wmSource === "svg" ? p.wmSvgText && p.wmSvgText.length + ":" + p.wmSvgName : "", p.wmSource === "text" ? p.wmText + p.wmFont + p.wmLetterSpacing + p.wmLineHeight + "@" + fontVersion : "", p.wmIgnoreLight].join("|");
      if (wmCache.key !== key) wmCache = { key, val: PP.wordmarkDrawing(p) };
      const { dr } = wmCache.val;
      // Anything that only affects placement must be read live from p (not from the cached
      // drawing) and appear in placeKey, otherwise edits are ignored until reload.
      const stroke = wmCache.val.stroke != null ? p.wmStroke : null;
      (dr.warnings || []).forEach((w) => (/^Ignored/.test(w) ? notes : warnings).push("Wordmark: " + w));
      const placeKey = [key, p.wmX, p.wmY, p.wmWidth, stroke, p.wmWeight, p.wmRot || 0].join("|");
      if (wmCache.placeKey === placeKey) wordmark = wmCache.region;
      else {
        const b = PP.drawingBounds(dr);
        if (b) {
          // Width is the finished outer width; for the stroked original, account for the pen width.
          const centerW = stroke != null ? Math.max(1, p.wmWidth - stroke) : p.wmWidth;
          wordmark = PP.placeDrawing(dr, p.wmX, p.wmY, centerW, { strokeWidth: stroke, weight: p.wmWeight, rotation: p.wmRot || 0 });
        }
        wmCache.placeKey = placeKey;
        wmCache.region = wordmark;
      }
    } catch (e) {
      warnings.push("Wordmark error: " + e.message);
    }

    // ---------- ruler ticks & numbers ----------
    const E = edges(W, H, p.labelScheme);
    const minorBars = [], majorBars = [], labelRegions = [];
    const unit = p.rulerUnits === "cm" ? 10 : 25.4;
    const sub = p.rulerUnits === "cm" ? 10 : p.rulerSub;
    const step = unit / sub;
    let font = null;
    try { font = PP.getFont(p.numFont, p.customFonts); } catch (e) { warnings.push("Number font error: " + e.message); }
    ["top", "right", "bottom", "left"].forEach((side) => {
      const e = E[side];
      const tickOn = p["tick_" + side], numOn = p["num_" + side];
      for (let i = 1; i * step < e.L - 0.25; i++) {
        const t = i * step;
        if (i % sub === 0) {
          if (tickOn) majorBars.push(bar(e, t, p.majorLen, p.majorW));
          if (numOn && font) {
            const label = String(i / sub);
            const up = [-e.n[0], -e.n[1]];
            const ang = p.numRotate ? (Math.atan2(up[1], up[0]) * 180) / Math.PI - 90 : 0;
            const px = e.o[0] + e.d[0] * t + e.n[0] * p.numInset, py = e.o[1] + e.d[1] * t + e.n[1] * p.numInset;
            labelRegions.push(placeLabel(font, p.numFont, label, px, py, p.numHeight, ang));
          }
        } else if (tickOn) {
          let len;
          if (p.rulerUnits === "cm") len = i % 5 === 0 ? p.tickLen3 : p.tickLen1;
          else if (i % (sub / 2) === 0) len = p.tickLen3;
          else if (i % (sub / 4) === 0) len = p.tickLen2;
          else if (sub === 16 && i % 2 === 1) len = p.tickLen1 * 0.65;
          else len = p.tickLen1;
          minorBars.push(bar(e, t, len, p.minorW));
        }
      }
    });
    let minor = G.inter(G.normalize(minorBars), card);
    let major = G.inter(G.normalize(majorBars), card);

    // Numbers: grow/shrink weight, optionally hide ones colliding with wordmark or pocket.
    const blockers = G.union(G.offset(wordmark, 0.6), G.offset(pocket, 0.6));
    let hidden = 0;
    const keptLabels = [];
    labelRegions.forEach((r) => {
      let rr = p.numWeight ? G.offset(r, p.numWeight) : r;
      if (p.numAutoHide && blockers.length && G.area(G.inter(rr, blockers)) > 0.01) { hidden++; return; }
      keptLabels.push(rr);
    });
    let numbers = G.inter(G.unionAll(keptLabels), card);

    // ---------- frame (crop) marks around the charm box ----------
    let frame = [];
    if (p.frameOn) {
      const x0 = p.boxX, y0 = p.boxY, x1 = p.boxX + p.boxW, y1 = p.boxY + p.boxH;
      const g = p.frameGap, L = p.frameLen, w = p.frameW;
      const segs = [];
      [[x0, y0, -1, -1], [x1, y0, 1, -1], [x0, y1, -1, 1], [x1, y1, 1, 1]].forEach(([cx, cy, sx, sy]) => {
        segs.push(segRect(cx + sx * g, cy, cx + sx * (g + L), cy, w));
        segs.push(segRect(cx, cy + sy * g, cx, cy + sy * (g + L), w));
      });
      frame = G.inter(G.normalize(segs), card);
    }

    return {
      W, H, card, pocket, pushHole, charmSolid, charmOutline, charmSlots, charmBounds,
      groups: { wordmark, numbers, frame, major, minor },
      wordmarkBounds: G.bounds(wordmark),
      hiddenLabels: hidden,
      warnings,
      notes,
    };
  };

  PP.GROUPS = [
    { id: "wordmark", label: "Wordmark" },
    { id: "numbers", label: "Numbers" },
    { id: "frame", label: "Frame marks" },
    { id: "major", label: "Inch marks" },
    { id: "minor", label: "Minor ticks" },
  ];
})();
