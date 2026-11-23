// 2D artwork / layout view (SVG) with pan, zoom and drag-to-move for wordmark, charm and frame box.
window.PP = window.PP || {};
(function () {
  const V = (PP.view2d = {});
  const NS = "http://www.w3.org/2000/svg";
  let svg, content, vb = null, lastWH = null, onDrag = null, dragState = null, showThin = true, showCharm = true;

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.round(r * f); g = Math.round(g * f); b = Math.round(b * f);
    return "#" + ((1 << 24) | (Math.min(255, r) << 16) | (Math.min(255, g) << 8) | Math.min(255, b)).toString(16).slice(1);
  }

  V.init = function (container, dragCb) {
    onDrag = dragCb;
    svg = el("svg", { class: "view2d-svg", xmlns: NS });
    const defs = el("defs", {}, svg);
    const hatch = el("pattern", { id: "pp-hole", width: 2, height: 2, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
    el("rect", { width: 2, height: 2, fill: "#2a2c30" }, hatch);
    el("line", { x1: 0, y1: 0, x2: 0, y2: 2, stroke: "#4a4d55", "stroke-width": 0.8 }, hatch);

    // 2mm chipboard grain patterns (front face & recessed back layer).
    const chip = el("pattern", { id: "pp-chipboard", width: 18, height: 18, patternUnits: "userSpaceOnUse" }, defs);
    el("rect", { width: 18, height: 18, fill: "#c8b496" }, chip);
    [
      [2, 3, 1.4, 0.25, "#b8a182", 18], [8, 2, 0.9, 0.22, "#d7c6ab", -25], [14, 5, 1.6, 0.2, "#a99274", 42],
      [5, 9, 1.1, 0.25, "#bfa98b", -12], [12, 11, 1.5, 0.22, "#b39c7d", 68], [3, 15, 1.2, 0.2, "#d4c1a5", 8],
      [16, 14, 1.1, 0.25, "#a68e70", -40], [9, 16, 1.7, 0.22, "#baa384", 15], [6, 5, 0.45, 0.45, "#9c8568", 0],
      [15, 9, 0.4, 0.4, "#968064", 0], [11, 6, 0.5, 0.35, "#deceb5", 0], [2, 12, 0.35, 0.35, "#968064", 0],
    ].forEach(([x, y, w, h, fill, rot]) => {
      el("rect", { x, y, width: w, height: h, rx: 0.15, fill, opacity: 0.65, transform: rot ? `rotate(${rot} ${x} ${y})` : "" }, chip);
    });

    const chipBack = el("pattern", { id: "pp-chipboard-back", width: 18, height: 18, patternUnits: "userSpaceOnUse" }, defs);
    el("rect", { width: 18, height: 18, fill: "#ad9779" }, chipBack);
    [
      [2, 3, 1.4, 0.25, "#9c8668", 18], [8, 2, 0.9, 0.22, "#bca78a", -25], [14, 5, 1.6, 0.2, "#8f795c", 42],
      [5, 9, 1.1, 0.25, "#a28c6e", -12], [12, 11, 1.5, 0.22, "#978063", 68], [3, 15, 1.2, 0.2, "#b8a386", 8],
      [16, 14, 1.1, 0.25, "#8b7558", -40], [9, 16, 1.7, 0.22, "#9f886a", 15], [6, 5, 0.45, 0.45, "#826c51", 0],
    ].forEach(([x, y, w, h, fill, rot]) => {
      el("rect", { x, y, width: w, height: h, rx: 0.15, fill, opacity: 0.65, transform: rot ? `rotate(${rot} ${x} ${y})` : "" }, chipBack);
    });

    const cardShadow = el("filter", { id: "pp-card-shadow", x: "-10%", y: "-10%", width: "125%", height: "125%" }, defs);
    el("feDropShadow", { dx: 0.8, dy: -1.2, stdDeviation: 1.1, "flood-color": "#000", "flood-opacity": 0.45 }, cardShadow);

    content = el("g", {}, svg);
    container.appendChild(svg);

    svg.addEventListener("wheel", (e) => {
      e.preventDefault();
      const pt = clientToVB(e.clientX, e.clientY);
      const k = Math.exp(e.deltaY * 0.0015);
      vb.x = pt.x - (pt.x - vb.x) * k;
      vb.y = pt.y - (pt.y - vb.y) * k;
      vb.w *= k; vb.h *= k;
      applyVB();
    }, { passive: false });
    svg.addEventListener("pointerdown", (e) => {
      const target = e.target.closest("[data-drag]");
      const pt = clientToVB(e.clientX, e.clientY);
      svg.setPointerCapture(e.pointerId);
      dragState = { kind: target ? target.getAttribute("data-drag") : "pan", start: pt, client: [e.clientX, e.clientY], vb0: { ...vb } };
      if (target) svg.classList.add("dragging");
    });
    svg.addEventListener("pointermove", (e) => {
      if (!dragState) return;
      if (dragState.kind === "pan") {
        const r = svg.getBoundingClientRect();
        const s = vb.w / r.width;
        vb.x = dragState.vb0.x - (e.clientX - dragState.client[0]) * s;
        vb.y = dragState.vb0.y - (e.clientY - dragState.client[1]) * s;
        applyVB();
      } else {
        const pt = clientToVB(e.clientX, e.clientY);
        // y is flipped in content (mm y-up)
        onDrag && onDrag(dragState.kind, pt.x - dragState.start.x, -(pt.y - dragState.start.y), false);
        dragState.start = pt;
      }
    });
    const end = () => {
      if (dragState && dragState.kind !== "pan") onDrag && onDrag(dragState.kind, 0, 0, true);
      dragState = null;
      svg.classList.remove("dragging");
    };
    svg.addEventListener("pointerup", end);
    svg.addEventListener("pointercancel", end);
    new ResizeObserver(() => fitAspect()).observe(container);
  };

  function clientToVB(cx, cy) {
    const r = svg.getBoundingClientRect();
    const s = Math.max(vb.w / r.width, vb.h / r.height);
    const ox = vb.x + vb.w / 2 - (r.width * s) / 2, oy = vb.y + vb.h / 2 - (r.height * s) / 2;
    return { x: ox + (cx - r.left) * s, y: oy + (cy - r.top) * s };
  }
  function applyVB() { svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`); }
  function fitAspect() { if (vb) applyVB(); }

  V.resetView = function (W, H) {
    const m = 8;
    vb = { x: -m, y: -m, w: W + 2 * m, h: H + 2 * m };
    applyVB();
  };

  V.setOptions = (o) => { showThin = o.showThin; showCharm = o.showCharm; };

  V.update = function (design, model, p) {
    const G = PP.geo;
    const W = design.W, H = design.H;
    if (!vb || !lastWH || lastWH[0] !== W || lastWH[1] !== H) { V.resetView(W, H); lastWH = [W, H]; }
    content.innerHTML = "";
    const g = el("g", { transform: `translate(0 ${H}) scale(1 -1)` }, content);
    const path = (region, attrs, parent) => region && region.length ? el("path", Object.assign({ d: G.toSvgD(region), "fill-rule": "nonzero" }, attrs), parent || g) : null;

    const view = p.laserView || "chipboard";
    const C = V.LASER_COLORS;
    const wmCol = p.laserWmCol || p.laserWmOutlineCol || "#00a651";
    const L = V.laserFront(design, p);

    if (view === "chipboard") {
      // Top 2mm chipboard sheet with through-cut holes exposing the back 2mm layer underneath.
      const holeUnion = G.unionAll([design.pocket].concat(L.cutRegions));
      const topSheet = holeUnion.length ? G.diff(design.card, holeUnion) : design.card;

      // Drop shadow under the assembled 2-layer chipboard card.
      path(design.card, { fill: "#2b1e10", filter: "url(#pp-card-shadow)" });
      // Back 2mm layer exposed inside the charm pocket and any cut-through shapes.
      if (holeUnion.length) {
        path(holeUnion, { fill: "url(#pp-chipboard-back)" });
        // 2mm top-sheet wall shadow (top & left edge cast onto the back sheet).
        const wallShadow = G.diff(holeUnion, G.translate(holeUnion, 0.4, -0.4));
        if (wallShadow.length) path(wallShadow, { fill: "#2b1a0c", "fill-opacity": 0.48 });
      }
      // Top 2mm chipboard sheet.
      path(topSheet, { fill: "url(#pp-chipboard)", stroke: "#5a4026", "stroke-width": 0.25 });
      if (design.pocket.length) {
        path(design.pocket, { fill: "none", stroke: "#4a321b", "stroke-width": 0.22 });
      }
      L.cutRegions.forEach((r) => path(r, { fill: "none", stroke: "#4a321b", "stroke-width": 0.2 }));

      // Engraved fills -> toasted brown laser burn in chipboard.
      L.fills.forEach((f) => el("path", { d: f.d, fill: "#5a3b1c", "fill-opacity": 0.88 }, g));

      // Vector score / cut lines -> fine charred brown lines on the chipboard face.
      const scoreAttr = { fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" };
      L.lines.forEach((f) => el("path", Object.assign({ d: f.d, stroke: "#472e17", "stroke-width": 0.2 }, scoreAttr), g));
      L.wmLines.forEach((f) => el("path", Object.assign({ d: f.d, stroke: "#3b2310", "stroke-width": 0.24 }, scoreAttr), g));
      // Open cut paths (ticks / centreline cut-through) appear as thin dark slits through the top sheet.
      L.cuts.filter((f) => f.open).forEach((f) => el("path", Object.assign({ d: f.d, stroke: "#2b1a0c", "stroke-width": 0.3 }, scoreAttr), g));

      // Push-out finger hole cuts all the way through the back chipboard layer to the workbench.
      if (design.pushHole && design.pushHole.length) {
        path(design.pushHole, { fill: "#22252a", stroke: "#432c17", "stroke-width": 0.22 });
        const phShadow = G.diff(design.pushHole, G.translate(design.pushHole, 0.4, -0.4));
        if (phShadow.length) path(phShadow, { fill: "#131518", "fill-opacity": 0.65 });
      }

      // Brass charm resting in the 2mm chipboard pocket.
      if (showCharm && design.charmSolid.length) {
        path(G.diff(design.charmSolid, design.charmSlots), { fill: "#d6ae55", stroke: "#8a6a22", "stroke-width": 0.08, opacity: 0.94 });
      }
      if (design.pushHole && design.pushHole.length) {
        path(design.pushHole, { fill: "none", stroke: "#3b82f6", "stroke-width": 0.16, "stroke-dasharray": "0.8 0.5", opacity: showCharm ? 0.65 : 0.35 });
      }
    } else if (view === "front") {
      path(design.card, { fill: "#f7f7f5", filter: "url(#pp-card-shadow)" });
      if (showCharm && design.charmSolid.length) {
        path(G.diff(design.charmSolid, design.charmSlots), { fill: "#d6ae55", "fill-opacity": 0.14, stroke: "#8a6a22", "stroke-opacity": 0.3, "stroke-width": 0.08 });
      }
      const lg = el("g", { "pointer-events": "none" }, g);
      const hair = { fill: "none", "vector-effect": "non-scaling-stroke", "stroke-width": 1.35, "stroke-linecap": "round", "stroke-linejoin": "round" };
      L.fills.forEach((f) => el("path", { d: f.d, fill: C.engrave, "fill-opacity": 0.88 }, lg));
      L.lines.forEach((f) => el("path", Object.assign({ d: f.d, stroke: C.score }, hair), lg));
      L.wmLines.forEach((f) => el("path", Object.assign({ d: f.d, stroke: wmCol }, hair), lg));
      L.cuts.forEach((f) => el("path", Object.assign({ d: f.d, stroke: C.cut }, hair), lg));
      if (L.inset) el("path", Object.assign({ d: L.inset, stroke: C.cut }, hair), lg);
      el("path", Object.assign({ d: L.outline, stroke: C.outline }, hair), lg);
    } else {
      // Back SVG preview: outer card outline + push-out finger hole (plus faint charm ghost for alignment).
      path(design.card, { fill: "#f7f7f5", filter: "url(#pp-card-shadow)" });
      if (design.pocket.length) {
        path(design.pocket, { fill: "none", stroke: "#bbb", "stroke-width": 0.12, "stroke-dasharray": "0.6 0.4" });
      }
      if (showCharm && design.charmSolid.length) {
        path(G.diff(design.charmSolid, design.charmSlots), { fill: "#d6ae55", "fill-opacity": 0.16, stroke: "#8a6a22", "stroke-opacity": 0.35, "stroke-width": 0.08 });
      }
      const hair = { fill: "none", "vector-effect": "non-scaling-stroke", "stroke-width": 1.4, "stroke-linecap": "round", "stroke-linejoin": "round" };
      if (design.pushHole && design.pushHole.length) {
        el("path", Object.assign({ d: G.toSvgD(design.pushHole, 4), stroke: C.cut }, hair), g);
      }
      el("path", Object.assign({ d: G.toSvgD(design.card, 4), stroke: C.outline }, hair), g);
    }

    // Drag handles (available on Front & Chipboard previews).
    if (view !== "back") {
      const handle = (b, kind, label) => {
        if (!b) return;
        const r = el("rect", { x: b.x0, y: b.y0, width: b.w, height: b.h, class: "handle", "data-drag": kind }, g);
        const t = el("title", {}, r);
        t.textContent = "Drag to move " + label;
      };
      handle(design.wordmarkBounds, "wordmark", "wordmark");
      if (p.frameOn) {
        const bx = { x0: p.boxX, y0: p.boxY, w: p.boxW, h: p.boxH };
        el("rect", { x: bx.x0, y: bx.y0, width: bx.w, height: bx.h, class: "box-guide" }, g);
      }
      handle(design.charmBounds, "charm", "charm (and pocket)");
    }
  };

  // Export the current layout as a standalone SVG string (mm units).
  V.exportSVG = function (design, model, p) {
    const G = PP.geo;
    const W = design.W, H = design.H;
    const colors = { body: p.colBody, accent1: p.colAccent1, accent2: p.colAccent2 };
    let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">\n<g transform="translate(0 ${H}) scale(1 -1)">\n`;
    const P = (id, region, fill, extra) => region && region.length ? `<path id="${id}" d="${G.toSvgD(region, 4)}" fill="${fill}" ${extra || ""}/>\n` : "";
    const cuts = G.unionAll(PP.GROUPS.filter((gr) => p[gr.id + "Mode"] === "cut").map((gr) => design.groups[gr.id]));
    s += P("card", G.diff(design.card, cuts), colors.body, 'stroke="#000" stroke-width="0.1"');
    s += P("pocket", design.pocket, "none", 'stroke="#f00" stroke-width="0.1" stroke-dasharray="0.6 0.4"');
    s += P("push-hole", design.pushHole, "none", 'stroke="#00f" stroke-width="0.1"');
    PP.GROUPS.forEach((gr) => {
      const mode = p[gr.id + "Mode"];
      if (mode === "off" || mode === "cut") return;
      s += P(gr.id, G.diff(design.groups[gr.id], design.pocket), mode === "deboss" ? shade(p.colBody, 0.78) : colors[p[gr.id + "Mat"]] || colors.body);
    });
    s += `</g>\n</svg>\n`;
    return s;
  };

  // Laser layers for the FRONT sheet, shared by the SVG export and the chipboard / laser previews.
  // laserMarks = "line": non-wordmark features are single centerlines (vector score / cut).
  // laserMarks = "fill": non-wordmark features are filled shapes (raster engrave / cut).
  // Wordmark is controlled separately by:
  //   laserWmStyle: "outline" (outer edge only, omits middle line), "center" (middle line only),
  //                 "both" (middle line in score + outline in laserWmCut), or "fill" (filled engrave).
  //   laserWmCut:   "score" (black), "score2" (separate colour), or "cut" (blue inner cut).
  V.laserFront = function (design, p) {
    const G = PP.geo;
    const free = G.diff(design.card, design.pocket);
    const lineMode = p.laserMarks === "line";
    const fills = [], lines = [], wmLines = [], cuts = [], cutRegions = [];

    PP.GROUPS.forEach((gr) => {
      if (gr.id === "wordmark") return;
      const mode = p[gr.id + "Mode"];
      if (mode === "off") return;
      if (lineMode) {
        const L = G.clipOpen((design.lines || {})[gr.id] || [], free);
        if (L.length) (mode === "cut" ? cuts : lines).push({ id: (mode === "cut" ? "cut-" : "") + gr.id, d: G.linesToSvgD(L, 4), open: true });
      } else {
        const R = G.diff(design.groups[gr.id], design.pocket);
        if (!R.length) return;
        if (mode === "cut") { cuts.push({ id: "cut-" + gr.id, d: G.toSvgD(R, 4) }); cutRegions.push(R); }
        else fills.push({ id: gr.id, d: G.toSvgD(R, 4) });
      }
    });

    if (p.wordmarkMode !== "off") {
      const wmStyle = p.laserWmStyle || "outline";
      const wmCut = p.wordmarkMode === "cut" ? "cut" : (p.laserWmCut || "score2");
      const route = (item, cutType, region) => {
        if (cutType === "cut") { cuts.push(item); if (region) cutRegions.push(region); }
        else if (cutType === "score2") wmLines.push(item);
        else lines.push(item);
      };
      if (wmStyle === "fill") {
        const R = G.diff(design.groups.wordmark || [], design.pocket);
        if (R.length) {
          if (wmCut === "cut") { cuts.push({ id: "cut-wordmark", d: G.toSvgD(R, 4) }); cutRegions.push(R); }
          else fills.push({ id: "wordmark", d: G.toSvgD(R, 4) });
        }
      } else {
        if (wmStyle === "center" || wmStyle === "both") {
          const L = G.clipOpen((design.lines || {}).wordmark || [], free);
          if (L.length) {
            // In "both" mode the middle line always goes to the main black score group and the outline gets wmCut;
            // in "center" mode the middle line itself uses wmCut.
            route({ id: "wordmark", d: G.linesToSvgD(L, 4), open: true }, wmStyle === "center" ? wmCut : "score", null);
          }
        }
        if (wmStyle === "outline" || wmStyle === "both") {
          const R = G.diff(design.groups.wordmark || [], design.pocket);
          if (R.length) route({ id: "wordmark-outline", d: G.toSvgD(R, 4) }, wmCut, R);
        }
      }
    }

    return {
      fills, lines, wmLines, cuts, cutRegions,
      inset: design.pocket.length ? G.toSvgD(design.pocket, 4) : "",
      outline: G.toSvgD(design.card, 4),
    };
  };

  V.LASER_COLORS = { engrave: "#000000", score: "#000000", cut: "#0000ff", outline: "#ff0000" };

  // Laser-cutting SVG for the FRONT layer: outer card cut, charm inset cut, and all markings.
  V.exportLaserFrontSVG = function (design, model, p) {
    const W = design.W, H = design.H, C = V.LASER_COLORS;
    const wmCol = p.laserWmCol || p.laserWmOutlineCol || "#00a651";
    const L = V.laserFront(design, p);
    let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">\n<g transform="translate(0 ${H}) scale(1 -1)">\n`;
    if (L.fills.length) {
      s += `<g id="engrave" fill="${C.engrave}" stroke="none">\n`;
      L.fills.forEach((f) => (s += `  <path id="${f.id}" d="${f.d}"/>\n`));
      s += `</g>\n`;
    }
    if (L.lines.length) {
      s += `<g id="score" fill="none" stroke="${C.score}" stroke-width="0.1" stroke-linecap="round" stroke-linejoin="round">\n`;
      L.lines.forEach((f) => (s += `  <path id="${f.id}" d="${f.d}"/>\n`));
      s += `</g>\n`;
    }
    if (L.wmLines.length) {
      s += `<g id="wordmark-lines" fill="none" stroke="${wmCol}" stroke-width="0.1" stroke-linecap="round" stroke-linejoin="round">\n`;
      L.wmLines.forEach((f) => (s += `  <path id="${f.id}" d="${f.d}"/>\n`));
      s += `</g>\n`;
    }
    s += `<g id="cuts" fill="none" stroke-width="0.1">\n`;
    L.cuts.forEach((f) => (s += `  <path id="${f.id}" d="${f.d}" stroke="${C.cut}"/>\n`));
    if (L.inset) s += `  <path id="charm-inset" d="${L.inset}" stroke="${C.cut}"/>\n`;
    s += `  <path id="card-outline" d="${L.outline}" stroke="${C.outline}"/>\n`;
    s += `</g>\n</g>\n</svg>\n`;
    return s;
  };

  // Laser-cutting SVG for the BACK layer: just the outer card shape outline and the finger push-out hole.
  V.exportLaserBackSVG = function (design) {
    const G = PP.geo;
    const W = design.W, H = design.H;
    let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">\n<g transform="translate(0 ${H}) scale(1 -1)" fill="none" stroke-width="0.1">\n`;
    if (design.pushHole && design.pushHole.length) {
      s += `  <path id="finger-hole" d="${G.toSvgD(design.pushHole, 4)}" stroke="#0000ff"/>\n`;
    }
    s += `  <path id="card-outline" d="${G.toSvgD(design.card, 4)}" stroke="#ff0000"/>\n`;
    s += `</g>\n</svg>\n`;
    return s;
  };
})();
