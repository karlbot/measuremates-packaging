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
    const lost = el("pattern", { id: "pp-lost", width: 0.6, height: 0.6, patternUnits: "userSpaceOnUse", patternTransform: "rotate(-45)" }, defs);
    el("rect", { width: 0.6, height: 0.6, fill: "rgba(255,40,40,0.35)" }, lost);
    el("line", { x1: 0, y1: 0, x2: 0, y2: 0.6, stroke: "#ff2020", "stroke-width": 0.3 }, lost);
    const f = el("filter", { id: "pp-emboss", x: "-10%", y: "-10%", width: "120%", height: "120%" }, defs);
    el("feDropShadow", { dx: 0.25, dy: -0.25, stdDeviation: 0.2, "flood-color": "#000", "flood-opacity": 0.45 }, f);
    const f2 = el("filter", { id: "pp-deboss", x: "-10%", y: "-10%", width: "120%", height: "120%" }, defs);
    el("feDropShadow", { dx: -0.2, dy: 0.2, stdDeviation: 0.15, "flood-color": "#fff", "flood-opacity": 0.6 }, f2);
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
    const colors = { body: p.colBody, accent1: p.colAccent1, accent2: p.colAccent2 };
    const path = (region, attrs, parent) => region && region.length ? el("path", Object.assign({ d: G.toSvgD(region), "fill-rule": "nonzero" }, attrs), parent || g) : null;

    // Card body with through-cuts (holes show hatch background).
    const cutsShown = G.unionAll(PP.GROUPS.filter((gr) => p[gr.id + "Mode"] === "cut").map((gr) => design.groups[gr.id]));
    if (cutsShown.length) path(G.inter(cutsShown, design.card), { fill: "url(#pp-hole)" });
    path(G.diff(design.card, cutsShown), { fill: colors.body, "fill-opacity": p.transBody ? 0.8 : 1, stroke: "#888", "stroke-width": 0.15 });
    if (p.bevelW > 0) {
      const innerCard = G.offset(design.card, -p.bevelW);
      const bevelRim = G.diff(G.diff(design.card, innerCard), cutsShown);
      path(bevelRim, { fill: shade(p.colBody, 0.9), "fill-opacity": p.transBody ? 0.6 : 0.85 });
      path(innerCard, { fill: "none", stroke: shade(p.colBody, 0.68), "stroke-width": 0.12, "stroke-dasharray": "0.6 0.4" });
    }

    // Pocket
    if (design.pocket.length) path(G.diff(design.pocket, cutsShown), { fill: shade(p.colBody, 0.8), stroke: shade(p.colBody, 0.6), "stroke-width": 0.12 });

    // Features
    PP.GROUPS.forEach((gr) => {
      const mode = p[gr.id + "Mode"];
      const R = design.groups[gr.id];
      if (!R || !R.length || mode === "off" || mode === "cut") return;
      const col = colors[p[gr.id + "Mat"]] || colors.body;
      const op = { body: p.transBody, accent1: p.transAccent1, accent2: p.transAccent2 }[p[gr.id + "Mat"]] ? 0.7 : 1;
      const shown = G.diff(R, design.pocket);
      if (mode === "inlay") path(shown, { fill: col, "fill-opacity": op });
      else if (mode === "emboss") path(shown, { fill: col, "fill-opacity": op, filter: "url(#pp-emboss)" });
      else if (mode === "deboss") path(shown, { fill: shade(p.colBody, 0.78), filter: "url(#pp-deboss)" });
    });

    // Slicer simulation overlay: red = will not print, orange outline = widened.
    if (showThin && model.thin) {
      Object.values(model.thin).forEach((t) => {
        path(t.lost, { fill: "url(#pp-lost)" });
        path(t.gained, { fill: "rgba(255,138,0,0.75)" });
      });
    }

    // Charm
    path(design.pushHole, { fill: "url(#pp-hole)" });
    if (showCharm && design.charmSolid.length) {
      path(G.diff(design.charmSolid, design.charmSlots), { fill: "#d6ae55", stroke: "#8a6a22", "stroke-width": 0.08, opacity: 0.92 });
    }
    // Push-out hole outline stays visible on top of the charm.
    path(design.pushHole, { fill: "none", stroke: "#3b82f6", "stroke-width": 0.2, "stroke-dasharray": "0.8 0.5" });

    // Drag handles
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

  // Laser-cutting SVG for the FRONT layer: outer card cut, charm inset cut, and all markings for engraving.
  V.exportLaserFrontSVG = function (design, model, p) {
    const G = PP.geo;
    const W = design.W, H = design.H;
    let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">\n<g transform="translate(0 ${H}) scale(1 -1)">\n`;
    const P = (id, region, attrs) => region && region.length ? `  <path id="${id}" d="${G.toSvgD(region, 4)}" ${attrs}/>\n` : "";
    s += `<g id="markings">\n`;
    PP.GROUPS.forEach((gr) => {
      const mode = p[gr.id + "Mode"];
      if (mode === "off" || mode === "cut") return;
      const mark = G.diff(design.groups[gr.id], design.pocket);
      s += P(gr.id, mark, 'fill="#000000" stroke="none"');
    });
    s += `</g>\n`;
    s += `<g id="cuts" fill="none" stroke-width="0.1">\n`;
    PP.GROUPS.forEach((gr) => {
      if (p[gr.id + "Mode"] !== "cut") return;
      const cutFeat = G.diff(design.groups[gr.id], design.pocket);
      s += P("cut-" + gr.id, cutFeat, 'stroke="#0000ff"');
    });
    s += P("charm-inset", design.pocket, 'stroke="#0000ff"');
    s += P("card-outline", design.card, 'stroke="#ff0000"');
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
