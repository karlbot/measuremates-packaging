// SVG path flattening, SVG file import and font text -> polygons.
window.PP = window.PP || {};
(function () {
  // ---------- path data parser ----------
  // Returns [{pts:[[x,y]...], closed:bool}] in the path's own coordinates.
  function parsePathD(d, tol) {
    tol = tol || 0.25;
    const subs = [];
    let i = 0;
    const n = d.length;
    const isSep = (ch) => ch === " " || ch === "," || ch === "\n" || ch === "\t" || ch === "\r";
    const skip = () => { while (i < n && isSep(d[i])) i++; };
    const numRe = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/;
    const num = () => {
      skip();
      const m = numRe.exec(d.slice(i, i + 40));
      if (!m) return null;
      i += m[0].length;
      return parseFloat(m[0]);
    };
    const flag = () => { skip(); const ch = d[i]; i++; return ch === "1" ? 1 : 0; };
    const hasNum = () => { skip(); return i < n && /[0-9+\-.]/.test(d[i]); };

    let cur = null, x = 0, y = 0, sx = 0, sy = 0, lcx = 0, lcy = 0, lqx = 0, lqy = 0, prev = "";
    const start = (px, py) => { if (cur && cur.pts.length > 1) subs.push(cur); cur = { pts: [[px, py]], closed: false }; sx = px; sy = py; };
    const line = (px, py) => { if (!cur) start(x, y); cur.pts.push([px, py]); };
    const steps = (len) => Math.max(2, Math.min(256, Math.ceil(Math.sqrt(len / tol) * 1.5)));
    const cubic = (x1, y1, x2, y2, x3, y3) => {
      const len = Math.hypot(x1 - x, y1 - y) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(x3 - x2, y3 - y2);
      const N = steps(len);
      for (let k = 1; k <= N; k++) {
        const t = k / N, u = 1 - t;
        line(u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
             u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3);
      }
    };
    const quad = (x1, y1, x2, y2) => {
      const len = Math.hypot(x1 - x, y1 - y) + Math.hypot(x2 - x1, y2 - y1);
      const N = steps(len);
      for (let k = 1; k <= N; k++) {
        const t = k / N, u = 1 - t;
        line(u * u * x + 2 * u * t * x1 + t * t * x2, u * u * y + 2 * u * t * y1 + t * t * y2);
      }
    };
    const arc = (rx, ry, phi, fa, fs, x2, y2) => {
      if (rx === 0 || ry === 0) { line(x2, y2); return; }
      rx = Math.abs(rx); ry = Math.abs(ry);
      const p = (phi * Math.PI) / 180, cp = Math.cos(p), sp = Math.sin(p);
      const dx = (x - x2) / 2, dy = (y - y2) / 2;
      const x1p = cp * dx + sp * dy, y1p = -sp * dx + cp * dy;
      let lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
      if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
      const num_ = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
      const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
      let co = Math.sqrt(Math.max(0, num_ / den));
      if (fa === fs) co = -co;
      const cxp = (co * rx * y1p) / ry, cyp = (-co * ry * x1p) / rx;
      const cx = cp * cxp - sp * cyp + (x + x2) / 2, cy = sp * cxp + cp * cyp + (y + y2) / 2;
      const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
      const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
      let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
      if (!fs && dt > 0) dt -= 2 * Math.PI;
      else if (fs && dt < 0) dt += 2 * Math.PI;
      const N = Math.max(4, Math.ceil(steps(Math.abs(dt) * Math.max(rx, ry))));
      for (let k = 1; k <= N; k++) {
        const t = t1 + (dt * k) / N;
        line(cx + rx * Math.cos(t) * cp - ry * Math.sin(t) * sp, cy + rx * Math.cos(t) * sp + ry * Math.sin(t) * cp);
      }
    };

    while (i < n) {
      skip();
      if (i >= n) break;
      let cmd = d[i];
      if (/[A-Za-z]/.test(cmd)) i++;
      else if (prev) cmd = prev === "M" ? "L" : prev === "m" ? "l" : prev;
      else break;
      const rel = cmd === cmd.toLowerCase();
      const C_ = cmd.toUpperCase();
      const ox = rel ? x : 0, oy = rel ? y : 0;
      switch (C_) {
        case "M": { const a = num(), b = num(); if (a === null) break; x = ox + a; y = oy + b; start(x, y); break; }
        case "L": { const a = num(), b = num(); if (a === null) break; x = ox + a; y = oy + b; line(x, y); break; }
        case "H": { const a = num(); if (a === null) break; x = (rel ? x : 0) + a; line(x, y); break; }
        case "V": { const a = num(); if (a === null) break; y = (rel ? y : 0) + a; line(x, y); break; }
        case "C": {
          const v = [num(), num(), num(), num(), num(), num()];
          if (v[5] === null) break;
          const x1 = ox + v[0], y1 = oy + v[1], x2 = ox + v[2], y2 = oy + v[3], x3 = ox + v[4], y3 = oy + v[5];
          cubic(x1, y1, x2, y2, x3, y3); lcx = x2; lcy = y2; x = x3; y = y3; break;
        }
        case "S": {
          const v = [num(), num(), num(), num()];
          if (v[3] === null) break;
          const x1 = /[CS]/i.test(prev) ? 2 * x - lcx : x, y1 = /[CS]/i.test(prev) ? 2 * y - lcy : y;
          const x2 = ox + v[0], y2 = oy + v[1], x3 = ox + v[2], y3 = oy + v[3];
          cubic(x1, y1, x2, y2, x3, y3); lcx = x2; lcy = y2; x = x3; y = y3; break;
        }
        case "Q": {
          const v = [num(), num(), num(), num()];
          if (v[3] === null) break;
          const x1 = ox + v[0], y1 = oy + v[1], x2 = ox + v[2], y2 = oy + v[3];
          quad(x1, y1, x2, y2); lqx = x1; lqy = y1; x = x2; y = y2; break;
        }
        case "T": {
          const v = [num(), num()];
          if (v[1] === null) break;
          const x1 = /[QT]/i.test(prev) ? 2 * x - lqx : x, y1 = /[QT]/i.test(prev) ? 2 * y - lqy : y;
          const x2 = ox + v[0], y2 = oy + v[1];
          quad(x1, y1, x2, y2); lqx = x1; lqy = y1; x = x2; y = y2; break;
        }
        case "A": {
          const rx = num(), ry = num(), phi = num(), fa = flag(), fs = flag(), a = num(), b = num();
          if (b === null) break;
          arc(rx, ry, phi, fa, fs, ox + a, oy + b); x = ox + a; y = oy + b; break;
        }
        case "Z": if (cur) { cur.closed = true; subs.push(cur); cur = null; } x = sx; y = sy; break;
        default: i++;
      }
      prev = cmd === "M" ? "L" : cmd === "m" ? "l" : cmd;
      if (C_ === "Z") prev = "";
    }
    if (cur && cur.pts.length > 1) subs.push(cur);
    return subs;
  }
  PP.parsePathD = parsePathD;

  // ---------- SVG file import ----------
  function shapeToD(el) {
    const tag = el.tagName.toLowerCase();
    const f = (a) => parseFloat(el.getAttribute(a)) || 0;
    switch (tag) {
      case "path": return el.getAttribute("d") || "";
      case "rect": {
        const x = f("x"), y = f("y"), w = f("width"), h = f("height");
        let rx = el.hasAttribute("rx") ? f("rx") : el.hasAttribute("ry") ? f("ry") : 0;
        let ry = el.hasAttribute("ry") ? f("ry") : rx;
        rx = Math.min(rx, w / 2); ry = Math.min(ry, h / 2);
        if (!rx || !ry) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
        return `M${x + rx} ${y}H${x + w - rx}A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}V${y + h - ry}A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z`;
      }
      case "circle": case "ellipse": {
        const cx = f("cx"), cy = f("cy");
        const rx = tag === "circle" ? f("r") : f("rx"), ry = tag === "circle" ? f("r") : f("ry");
        return `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`;
      }
      case "line": return `M${f("x1")} ${f("y1")}L${f("x2")} ${f("y2")}`;
      case "polyline": case "polygon": {
        const nums = (el.getAttribute("points") || "").trim().split(/[\s,]+/).map(parseFloat);
        let s = "";
        for (let k = 0; k + 1 < nums.length; k += 2) s += (k ? "L" : "M") + nums[k] + " " + nums[k + 1];
        return tag === "polygon" ? s + "Z" : s;
      }
    }
    return "";
  }

  function parseColor(str) {
    if (!str || str === "none" || str === "transparent") return null;
    const m = str.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const v = m[1].split(",").map((s) => parseFloat(s));
      return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 };
    }
    if (str.startsWith("url(")) return { url: true };
    return { r: 0, g: 0, b: 0, a: 1 };
  }

  // Returns {fills:[{subs, rule}], strokes:[{subs, width, cap, join}], warnings:[]}, coordinates in
  // the root SVG viewport space (y down).
  PP.importSVG = function (text, opts) {
    opts = opts || {};
    const doc = new DOMParser().parseFromString(text, "image/svg+xml");
    const root = doc.documentElement;
    if (!root || root.tagName.toLowerCase() !== "svg") throw new Error("Not an SVG file");
    const host = document.createElement("div");
    // Off-screen (not visibility:hidden - that is inherited and would hide every shape).
    host.style.cssText = "position:absolute;left:-10000px;top:0;width:1000px;height:1000px;opacity:0;pointer-events:none";
    document.body.appendChild(host);
    const svg = document.importNode(root, true);
    host.appendChild(svg);
    const warnings = [];
    const fills = [], strokes = [];
    try {
      const vb = svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width ? svg.viewBox.baseVal : null;
      const diag = vb ? Math.hypot(vb.width, vb.height) : 1000;
      const els = svg.querySelectorAll("path,rect,circle,ellipse,line,polyline,polygon");
      let skippedLight = 0, skippedUrl = 0;
      if (svg.querySelector("text")) warnings.push("SVG contains <text>; convert text to outlines/paths first.");
      els.forEach((el) => {
        if (el.closest("defs,clipPath,mask,symbol,pattern,marker")) return;
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) === 0) return;
        const d = shapeToD(el);
        if (!d) return;
        const m = el.getCTM();
        const scale = m ? Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) : 1;
        const subs = parsePathD(d, (diag / 3000) / Math.max(scale, 1e-9)).map((s) => ({
          closed: s.closed,
          pts: s.pts.map(([px, py]) => (m ? [m.a * px + m.c * py + m.e, m.b * px + m.d * py + m.f] : [px, py])),
        }));
        if (!subs.length) return;
        const fill = parseColor(cs.fill), stroke = parseColor(cs.stroke);
        const isLight = (c) => c && !c.url && (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255 > (opts.lightThreshold || 0.88);
        const fillOp = parseFloat(cs.fillOpacity), strokeOp = parseFloat(cs.strokeOpacity);
        if (fill && fillOp > 0 && fill.a > 0) {
          if (fill.url) skippedUrl++;
          else if (opts.ignoreLight && isLight(fill)) skippedLight++;
          else fills.push({ subs, rule: cs.fillRule === "evenodd" ? "evenodd" : "nonzero" });
        }
        const sw = parseFloat(cs.strokeWidth) || 0;
        if (stroke && strokeOp > 0 && stroke.a > 0 && sw > 0) {
          if (stroke.url) skippedUrl++;
          else if (opts.ignoreLight && isLight(stroke)) skippedLight++;
          else strokes.push({ subs, width: sw * scale, cap: cs.strokeLinecap || "butt", join: cs.strokeLinejoin || "miter" });
        }
      });
      if (skippedLight) warnings.push(`Ignored ${skippedLight} white/very light shape(s) (background).`);
      if (skippedUrl) warnings.push(`Ignored ${skippedUrl} gradient/pattern/image-filled shape(s).`);
      if (!fills.length && !strokes.length) warnings.push("No usable shapes found in SVG.");
    } finally {
      document.body.removeChild(host);
    }
    return { fills, strokes, warnings };
  };

  // ---------- font text -> fills ----------
  PP.textToFills = function (font, text, opts) {
    opts = opts || {};
    const size = 100;
    const lines = String(text || "").split(/\n/);
    const lh = (opts.lineHeight || 1.0) * size;
    const fopts = { kerning: true, letterSpacing: opts.letterSpacing || 0 };
    const subsAll = [];
    lines.forEach((ln, li) => {
      if (!ln.trim()) return;
      const adv = font.getAdvanceWidth(ln, size, fopts);
      const x0 = -adv / 2;
      const p = font.getPath(ln, x0, li * lh, size, fopts);
      subsAll.push(...commandsToSubs(p.commands));
    });
    return { fills: [{ subs: subsAll, rule: "nonzero" }], strokes: [], warnings: [] };
  };

  function commandsToSubs(cmds) {
    const subs = [];
    let cur = null, x = 0, y = 0;
    const N = 10;
    cmds.forEach((c) => {
      if (c.type === "M") { if (cur && cur.pts.length > 2) subs.push(cur); cur = { pts: [[c.x, c.y]], closed: true }; x = c.x; y = c.y; }
      else if (c.type === "L") { cur.pts.push([c.x, c.y]); x = c.x; y = c.y; }
      else if (c.type === "Q") {
        for (let k = 1; k <= N; k++) { const t = k / N, u = 1 - t; cur.pts.push([u * u * x + 2 * u * t * c.x1 + t * t * c.x, u * u * y + 2 * u * t * c.y1 + t * t * c.y]); }
        x = c.x; y = c.y;
      } else if (c.type === "C") {
        for (let k = 1; k <= N; k++) {
          const t = k / N, u = 1 - t;
          cur.pts.push([u * u * u * x + 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t * t * t * c.x,
                        u * u * u * y + 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t * t * t * c.y]);
        }
        x = c.x; y = c.y;
      } else if (c.type === "Z") { if (cur && cur.pts.length > 2) subs.push(cur); cur = null; }
    });
    if (cur && cur.pts.length > 2) subs.push(cur);
    return subs;
  }
  PP.commandsToSubs = commandsToSubs;

  // Bounding box of a {fills, strokes} drawing (centerlines for strokes).
  PP.drawingBounds = function (dr) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const add = (s) => s.pts.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
    dr.fills.forEach((f) => f.subs.forEach(add));
    dr.strokes.forEach((s) => s.subs.forEach(add));
    if (x0 === Infinity) return null;
    return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  };

  // Place a y-down drawing so its bbox centre is at (cx,cy) (mm, y-up) with total width W.
  // strokeOverride (mm) replaces stroke widths; weight (mm) grows/shrinks the result.
  PP.placeDrawing = function (dr, cx, cy, W, opt) {
    const G = PP.geo;
    opt = opt || {};
    const b = PP.drawingBounds(dr);
    if (!b || b.w <= 0) return [];
    const s = W / b.w;
    const map = ([x, y]) => [cx + (x - b.cx) * s, cy - (y - b.cy) * s];
    const parts = [];
    dr.fills.forEach((f) => {
      const paths = G.toPaths(f.subs.map((sub) => sub.pts.map(map)));
      parts.push(G.normalize(paths, f.rule));
    });
    dr.strokes.forEach((st) => {
      const w = opt.strokeWidth != null ? opt.strokeWidth : st.width * s;
      const closedSubs = st.subs.filter((q) => q.closed), openSubs = st.subs.filter((q) => !q.closed);
      if (openSubs.length) parts.push(G.strokeOpen(G.toPaths(openSubs.map((q) => q.pts.map(map))), w, st.cap, st.join));
      if (closedSubs.length) parts.push(G.strokeClosed(G.toPaths(closedSubs.map((q) => q.pts.map(map))), w, st.join));
    });
    let region = G.unionAll(parts);
    if (opt.weight) region = G.offset(region, opt.weight);
    return region;
  };
})();
