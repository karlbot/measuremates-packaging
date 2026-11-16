// 2D polygon toolkit built on ClipperLib (integer coordinates, 1 unit = 1 µm).
// A "region" is a Clipper Paths array (outer contours + holes, non-zero fill).
window.PP = window.PP || {};
(function () {
  const C = ClipperLib;
  const S = 1000; // mm -> integer units
  const ARC_TOL = 8; // 0.008 mm arc tolerance for round joins
  const G = (PP.geo = { S });

  G.toPath = (pts) => pts.map((p) => ({ X: Math.round(p[0] * S), Y: Math.round(p[1] * S) }));
  G.toPaths = (list) => list.map(G.toPath);
  G.fromPath = (path) => path.map((p) => [p.X / S, p.Y / S]);
  G.fromPaths = (paths) => paths.map(G.fromPath);

  const FT = { nonzero: C.PolyFillType.pftNonZero, evenodd: C.PolyFillType.pftEvenOdd };

  function exec(ct, a, b, fa, fb) {
    const c = new C.Clipper();
    if (a && a.length) c.AddPaths(a, C.PolyType.ptSubject, true);
    if (b && b.length) c.AddPaths(b, C.PolyType.ptClip, true);
    const out = new C.Paths();
    c.Execute(ct, out, fa || FT.nonzero, fb || FT.nonzero);
    return out;
  }

  G.union = (a, b, rule) => exec(C.ClipType.ctUnion, a, b || [], FT[rule || "nonzero"], FT[rule || "nonzero"]);
  G.unionAll = (list) => {
    let all = [];
    list.forEach((r) => { if (r && r.length) all = all.concat(r); });
    return all.length ? G.union(all) : [];
  };
  G.diff = (a, b) => (!a || !a.length ? [] : !b || !b.length ? a : exec(C.ClipType.ctDifference, a, b));
  G.inter = (a, b) => (!a || !a.length || !b || !b.length ? [] : exec(C.ClipType.ctIntersection, a, b));
  G.normalize = (paths, rule) => (paths.length ? exec(C.ClipType.ctUnion, paths, [], FT[rule || "nonzero"]) : []);

  function offsetRaw(paths, deltaMM, join, end) {
    const co = new C.ClipperOffset(2, ARC_TOL);
    co.AddPaths(paths, join, end);
    const out = new C.Paths();
    co.Execute(out, deltaMM * S);
    return out;
  }
  const JOIN = { round: C.JoinType.jtRound, miter: C.JoinType.jtMiter, square: C.JoinType.jtSquare, bevel: C.JoinType.jtSquare };
  const CAP = { round: C.EndType.etOpenRound, butt: C.EndType.etOpenButt, square: C.EndType.etOpenSquare };

  // Grow (+) or shrink (-) a closed region.
  G.offset = (region, d, join) => {
    if (!region || !region.length) return [];
    if (!d) return region;
    return offsetRaw(region, d, JOIN[join || "round"], C.EndType.etClosedPolygon);
  };

  // Turn open polylines (Clipper paths) into a filled region of the given width.
  G.strokeOpen = (lines, width, cap, join) => {
    if (!lines.length || width <= 0) return [];
    return G.normalize(offsetRaw(lines, width / 2, JOIN[join || "round"], CAP[cap || "round"]));
  };
  // Stroke closed polylines (outline ring).
  G.strokeClosed = (loops, width, join) => {
    if (!loops.length || width <= 0) return [];
    return G.normalize(offsetRaw(loops, width / 2, JOIN[join || "round"], C.EndType.etClosedLine));
  };

  // Morphological opening: removes every part narrower than w.
  G.opening = (region, w) => (w > 0 ? G.offset(G.offset(region, -w / 2), w / 2) : region);

  G.area = (region) => region.reduce((s, p) => s + C.Clipper.Area(p), 0) / (S * S);

  G.bounds = (region) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    region.forEach((p) => p.forEach((q) => {
      if (q.X < x0) x0 = q.X; if (q.X > x1) x1 = q.X;
      if (q.Y < y0) y0 = q.Y; if (q.Y > y1) y1 = q.Y;
    }));
    if (x0 === Infinity) return null;
    return { x0: x0 / S, y0: y0 / S, x1: x1 / S, y1: y1 / S, w: (x1 - x0) / S, h: (y1 - y0) / S };
  };

  G.rect = (x0, y0, x1, y1) => [G.toPath([[x0, y0], [x1, y0], [x1, y1], [x0, y1]])];

  G.roundRect = (x0, y0, x1, y1, r) => {
    r = Math.max(0, Math.min(r, (x1 - x0) / 2 - 1e-3, (y1 - y0) / 2 - 1e-3));
    if (r <= 0.001) return G.rect(x0, y0, x1, y1);
    const pts = [];
    const corners = [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]];
    const n = Math.max(6, Math.ceil(r * 4));
    corners.forEach(([cx, cy, a0]) => {
      for (let i = 0; i <= n; i++) {
        const a = ((a0 + (90 * i) / n) * Math.PI) / 180;
        pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
      }
    });
    return [G.toPath(pts)];
  };

  G.circle = (cx, cy, r, n) => {
    n = n || Math.max(24, Math.ceil(r * 12));
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return [G.toPath(pts)];
  };

  // Apply an affine function (x,y)->[x,y] in mm to a region or path list.
  G.map = (paths, fn) => paths.map((p) => p.map((q) => {
    const r = fn(q.X / S, q.Y / S);
    return { X: Math.round(r[0] * S), Y: Math.round(r[1] * S) };
  }));

  G.translate = (paths, dx, dy) => {
    const ix = Math.round(dx * S), iy = Math.round(dy * S);
    return paths.map((p) => p.map((q) => ({ X: q.X + ix, Y: q.Y + iy })));
  };

  G.clean = (paths, distMM) => C.Clipper.CleanPolygons(paths, (distMM || 0.002) * S);

  // Region -> [{outer:[[x,y]...], holes:[[[x,y]...]...]}] (mm), via PolyTree.
  // strict (default) splits touching contours for manifold triangulation; it is very slow on
  // inputs with many small pieces, so pass strict=false when only areas/topology are needed.
  G.shapes = (region, strict) => {
    if (!region || !region.length) return [];
    const c = new C.Clipper();
    c.StrictlySimple = strict !== false;
    c.AddPaths(region, C.PolyType.ptSubject, true);
    const tree = new C.PolyTree();
    c.Execute(C.ClipType.ctUnion, tree, FT.nonzero, FT.nonzero);
    const out = [];
    const walk = (node) => {
      node.Childs().forEach((outerNode) => {
        const shape = { outer: G.fromPath(C.Clipper.CleanPolygon(outerNode.Contour(), 1.5)), holes: [] };
        outerNode.Childs().forEach((holeNode) => {
          const h = G.fromPath(C.Clipper.CleanPolygon(holeNode.Contour(), 1.5));
          if (h.length >= 3) shape.holes.push(h);
          walk(holeNode); // islands inside holes
        });
        if (shape.outer.length >= 3) out.push(shape);
      });
    };
    walk(tree);
    return out;
  };

  // Number of enclosed islands that would fall out if region were cut through a sheet.
  G.countIslandsIfCut = (region, sheet) => {
    // Pieces of (sheet - region) that don't touch the sheet's outer boundary.
    const rest = G.shapes(G.diff(sheet, region), false);
    return Math.max(0, rest.length - 1);
  };

  // Region -> SVG path data (y flipped by caller via transform).
  G.toSvgD = (region, prec) => {
    prec = prec == null ? 3 : prec;
    let d = "";
    region.forEach((p) => {
      if (p.length < 2) return;
      d += "M" + p.map((q) => (q.X / S).toFixed(prec) + " " + (q.Y / S).toFixed(prec)).join("L") + "Z";
    });
    return d;
  };

  // Douglas-Peucker for [x,y] polylines (mm).
  G.simplifyLine = (pts, tol) => {
    if (pts.length < 3) return pts;
    // Closed / nearly closed input: split at the point farthest from the start so DP has a real chord.
    const f = pts[0], l = pts[pts.length - 1];
    if (Math.hypot(f[0] - l[0], f[1] - l[1]) < tol * 2) {
      let far = 1, fd = -1;
      for (let i = 1; i < pts.length - 1; i++) {
        const d = Math.hypot(pts[i][0] - f[0], pts[i][1] - f[1]);
        if (d > fd) { fd = d; far = i; }
      }
      if (far <= 0 || far >= pts.length - 1) return pts;
      const a = G.simplifyLine(pts.slice(0, far + 1), tol);
      const b = G.simplifyLine(pts.slice(far), tol);
      return a.concat(b.slice(1));
    }
    const keep = new Uint8Array(pts.length);
    keep[0] = keep[pts.length - 1] = 1;
    const stack = [[0, pts.length - 1]];
    while (stack.length) {
      const [a, b] = stack.pop();
      const [ax, ay] = pts[a], [bx, by] = pts[b];
      const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1e-12;
      let md = -1, mi = -1;
      for (let i = a + 1; i < b; i++) {
        const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / L;
        if (d > md) { md = d; mi = i; }
      }
      if (md > tol) { keep[mi] = 1; stack.push([a, mi], [mi, b]); }
    }
    return pts.filter((_, i) => keep[i]);
  };
})();
