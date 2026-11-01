// Minimal DXF reader: SPLINE, LWPOLYLINE, POLYLINE, LINE, ARC, CIRCLE, ELLIPSE.
// Returns geometry in millimetres with closed loops and open polylines separated.
window.PP = window.PP || {};
(function () {
  const UNIT_MM = { 0: null, 1: 25.4, 2: 304.8, 4: 1, 5: 10, 6: 1000, 8: 0.0000254, 9: 0.0254, 10: 914.4 };

  function pairs(text) {
    const lines = text.replace(/\r/g, "").split("\n");
    const out = [];
    for (let i = 0; i + 1 < lines.length; i += 2) out.push([parseInt(lines[i].trim(), 10), lines[i + 1].trim()]);
    return out;
  }

  function bsplineSample(deg, knots, ctrl, weights, perSpan) {
    const n = ctrl.length;
    if (n < 2) return ctrl.slice();
    if (knots.length !== n + deg + 1) {
      // Malformed - fall back to the control polygon.
      return ctrl.slice();
    }
    const evalAt = (t) => {
      let k = deg;
      while (k < n - 1 && t >= knots[k + 1]) k++;
      const d = [];
      for (let j = 0; j <= deg; j++) {
        const i = j + k - deg;
        const w = weights ? weights[i] : 1;
        d.push([ctrl[i][0] * w, ctrl[i][1] * w, w]);
      }
      for (let r = 1; r <= deg; r++) {
        for (let j = deg; j >= r; j--) {
          const i = j + k - deg;
          const den = knots[i + deg - r + 1] - knots[i];
          const a = den === 0 ? 0 : (t - knots[i]) / den;
          d[j] = [d[j - 1][0] * (1 - a) + d[j][0] * a, d[j - 1][1] * (1 - a) + d[j][1] * a, d[j - 1][2] * (1 - a) + d[j][2] * a];
        }
      }
      return [d[deg][0] / d[deg][2], d[deg][1] / d[deg][2]];
    };
    const t0 = knots[deg], t1 = knots[n];
    const pts = [];
    for (let s = deg; s < n; s++) {
      const a = knots[s], b = knots[s + 1];
      if (b <= a) continue;
      for (let i = 0; i < perSpan; i++) pts.push(evalAt(a + ((b - a) * i) / perSpan));
    }
    pts.push(evalAt(t1 - 1e-12 * Math.max(1, Math.abs(t1 - t0))));
    return pts;
  }

  function arcPts(cx, cy, r, a0, a1, segPerMM) {
    while (a1 <= a0) a1 += Math.PI * 2;
    const n = Math.max(8, Math.ceil(r * (a1 - a0) * segPerMM));
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return pts;
  }

  // Polyline vertex list with bulges -> points.
  function bulgePts(verts, closed) {
    const pts = [];
    const N = verts.length;
    const segs = closed ? N : N - 1;
    for (let i = 0; i < segs; i++) {
      const [x0, y0, b] = verts[i];
      const [x1, y1] = verts[(i + 1) % N];
      pts.push([x0, y0]);
      if (b && Math.abs(b) > 1e-9) {
        const theta = 4 * Math.atan(b); // signed sweep, + = CCW
        const dx = x1 - x0, dy = y1 - y0, c = Math.hypot(dx, dy);
        if (c < 1e-12) continue;
        const r = Math.abs((c * (1 + b * b)) / (4 * b));
        const d = (c * (1 - b * b)) / (4 * b); // midpoint -> centre along left normal
        const cx = (x0 + x1) / 2 + (-dy / c) * d, cy = (y0 + y1) / 2 + (dx / c) * d;
        const a0 = Math.atan2(y0 - cy, x0 - cx);
        const steps = Math.max(4, Math.ceil(Math.abs(theta) * 12));
        for (let k = 1; k < steps; k++) {
          const a = a0 + (theta * k) / steps;
          pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
        }
      }
    }
    if (!closed && N) pts.push([verts[N - 1][0], verts[N - 1][1]]);
    return pts;
  }

  PP.parseDXF = function (text, unitOverride) {
    const P = pairs(text);
    let insunits = 0;
    for (let i = 0; i < P.length - 1; i++) {
      if (P[i][0] === 9 && P[i][1] === "$INSUNITS") { insunits = parseInt(P[i + 1][1], 10) || 0; break; }
    }
    let scale = UNIT_MM[insunits];
    let unitsLabel = { 0: "unitless", 1: "inches", 2: "feet", 4: "mm", 5: "cm", 6: "m" }[insunits] || "code " + insunits;
    if (unitOverride === "mm") { scale = 1; unitsLabel = "mm (forced)"; }
    else if (unitOverride === "in") { scale = 25.4; unitsLabel = "inches (forced)"; }
    if (!scale) { scale = 1; unitsLabel += " → assuming mm"; }

    // Collect entities in ENTITIES section.
    let i = 0;
    while (i < P.length - 1 && !(P[i][0] === 0 && P[i][1] === "SECTION" && P[i + 1][1] === "ENTITIES")) i++;
    const ents = [];
    let cur = null;
    for (i += 2; i < P.length; i++) {
      const [c, v] = P[i];
      if (c === 0) {
        if (v === "ENDSEC") break;
        cur = { type: v, codes: [] };
        ents.push(cur);
      } else if (cur) cur.codes.push([c, v]);
    }

    const open = [], closed = [], skipped = {};
    let polyBuf = null;
    const segPerMM = 4 / scale; // in source units
    ents.forEach((e) => {
      const g = (code) => { const f = e.codes.find((x) => x[0] === code); return f ? f[1] : undefined; };
      const gf = (code, d) => { const v = g(code); return v === undefined ? d || 0 : parseFloat(v); };
      const all = (code) => e.codes.filter((x) => x[0] === code).map((x) => parseFloat(x[1]));
      switch (e.type) {
        case "SPLINE": {
          const flags = gf(70), deg = gf(71, 3);
          const knots = all(40), weights = all(41);
          const xs = all(10), ys = all(20);
          const ctrl = xs.map((x, k) => [x, ys[k]]);
          let pts;
          if (ctrl.length >= 2) pts = bsplineSample(deg, knots, ctrl, weights.length === ctrl.length ? weights : null, 8);
          else {
            const fx = all(11), fy = all(21);
            pts = fx.map((x, k) => [x, fy[k]]);
          }
          const isClosed = (flags & 1) === 1 || (pts.length > 2 && Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 1e-6);
          (isClosed ? closed : open).push(pts);
          break;
        }
        case "LWPOLYLINE": {
          const flags = gf(70);
          const verts = [];
          e.codes.forEach(([c, v]) => {
            if (c === 10) verts.push([parseFloat(v), 0, 0]);
            else if (c === 20 && verts.length) verts[verts.length - 1][1] = parseFloat(v);
            else if (c === 42 && verts.length) verts[verts.length - 1][2] = parseFloat(v);
          });
          const isClosed = (flags & 1) === 1;
          (isClosed ? closed : open).push(bulgePts(verts, isClosed));
          break;
        }
        case "POLYLINE": polyBuf = { closed: (gf(70) & 1) === 1, verts: [] }; break;
        case "VERTEX": if (polyBuf) polyBuf.verts.push([gf(10), gf(20), gf(42)]); break;
        case "SEQEND":
          if (polyBuf) { (polyBuf.closed ? closed : open).push(bulgePts(polyBuf.verts, polyBuf.closed)); polyBuf = null; }
          break;
        case "LINE": open.push([[gf(10), gf(20)], [gf(11), gf(21)]]); break;
        case "ARC": {
          const a0 = (gf(50) * Math.PI) / 180, a1 = (gf(51) * Math.PI) / 180;
          open.push(arcPts(gf(10), gf(20), gf(40), a0, a1, segPerMM));
          break;
        }
        case "CIRCLE": {
          const pts = arcPts(gf(10), gf(20), gf(40), 0, Math.PI * 2, segPerMM);
          pts.pop();
          closed.push(pts);
          break;
        }
        case "ELLIPSE": {
          const cx = gf(10), cy = gf(20), mx = gf(11), my = gf(21), ratio = gf(40, 1);
          let t0 = gf(41, 0), t1 = gf(42, Math.PI * 2);
          while (t1 <= t0) t1 += Math.PI * 2;
          const R = Math.hypot(mx, my), rot = Math.atan2(my, mx);
          const n = Math.max(24, Math.ceil(R * (t1 - t0) * segPerMM));
          const pts = [];
          for (let k = 0; k <= n; k++) {
            const t = t0 + ((t1 - t0) * k) / n;
            const x = R * Math.cos(t), y = R * ratio * Math.sin(t);
            pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
          }
          if (Math.abs(t1 - t0 - Math.PI * 2) < 1e-6) { pts.pop(); closed.push(pts); } else open.push(pts);
          break;
        }
        case "HATCH": case "POINT": case "DIMENSION": case "MTEXT": case "TEXT": case "INSERT":
        default:
          skipped[e.type] = (skipped[e.type] || 0) + 1;
      }
    });

    // Scale to mm.
    const sc = (pts) => pts.map((p) => [p[0] * scale, p[1] * scale]);
    let loops = closed.map(sc), lines = open.map(sc);

    // Chain open pieces whose endpoints touch into longer chains / loops.
    const tol = 0.01;
    const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < tol;
    let changed = true;
    while (changed) {
      changed = false;
      outer: for (let a = 0; a < lines.length; a++) {
        for (let b = 0; b < lines.length; b++) {
          if (a === b) continue;
          const A = lines[a], B = lines[b];
          let merged = null;
          if (near(A[A.length - 1], B[0])) merged = A.concat(B.slice(1));
          else if (near(A[A.length - 1], B[B.length - 1])) merged = A.concat(B.slice().reverse().slice(1));
          else if (near(A[0], B[B.length - 1])) merged = B.concat(A.slice(1));
          else if (near(A[0], B[0])) merged = B.slice().reverse().concat(A.slice(1));
          if (merged) {
            lines[a] = merged;
            lines.splice(b, 1);
            changed = true;
            break outer;
          }
        }
      }
    }
    lines = lines.filter((L) => {
      if (L.length > 3 && near(L[0], L[L.length - 1])) { loops.push(L.slice(0, -1)); return false; }
      return true;
    });

    // Light simplification.
    loops = loops.map((L) => PP.geo.simplifyLine(L, 0.002)).filter((L) => L.length >= 3);
    lines = lines.map((L) => PP.geo.simplifyLine(L, 0.002)).filter((L) => L.length >= 2);

    return { loops, lines, unitsLabel, skipped };
  };

  // Build a placed-ready charm description (local coords, bbox min at 0,0).
  PP.buildCharm = function (dxf) {
    const G = PP.geo;
    if (!dxf.loops.length) throw new Error("DXF has no closed outline");
    // Outline = loop with the largest absolute area.
    let best = 0, bestA = -1;
    const areaOf = (L) => {
      let a = 0;
      for (let i = 0, j = L.length - 1; i < L.length; j = i++) a += (L[j][0] + L[i][0]) * (L[j][1] - L[i][1]);
      return Math.abs(a / 2);
    };
    dxf.loops.forEach((L, k) => { const a = areaOf(L); if (a > bestA) { bestA = a; best = k; } });
    const outline = G.normalize(G.toPaths([dxf.loops[best]]));
    const solid = G.normalize(G.toPaths(dxf.loops), "evenodd");
    const lines = G.toPaths(dxf.lines);
    const b = G.bounds(outline);
    const tx = (paths) => G.translate(paths, -b.x0, -b.y0);
    return {
      outline: tx(outline),
      solid: tx(solid),
      lines: tx(lines),
      w: b.w,
      h: b.h,
      innerLoops: dxf.loops.length - 1,
      openLines: dxf.lines.length,
    };
  };
})();
