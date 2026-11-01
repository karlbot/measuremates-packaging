// Turns a 2D design + feature styles into stacked 2.5D solids, simulating slicer behaviour.
window.PP = window.PP || {};
(function () {
  const G = PP.geo;

  // Arachne-style thin feature handling (PrusaSlicer / Bambu / Orca default):
  // thinner than minFeature -> dropped; between minFeature and minBead -> widened to minBead.
  const simCache = new Map();
  function fingerprint(R) {
    let h = 2166136261 >>> 0, n = 0;
    R.forEach((p) => p.forEach((q) => { h = Math.imul(h ^ (q.X * 7 + q.Y * 13), 16777619) >>> 0; n++; }));
    return h + ":" + n;
  }
  function simPositive(R, minF, minB) {
    if (!R.length) return R;
    const key = fingerprint(R) + "|" + minF + "|" + minB;
    if (simCache.has(key)) return simCache.get(key);
    const out = simPositiveRaw(R, minF, minB);
    if (simCache.size > 64) simCache.delete(simCache.keys().next().value);
    simCache.set(key, out);
    return out;
  }
  function simPositiveRaw(R, minF, minB) {
    const base = G.opening(R, minF);
    if (!base.length) return base;
    const wide = G.opening(base, minB);
    // Opening also rounds sharp corners; ignore those tiny corner slivers and keep only
    // genuinely narrow pieces (lines/strokes) as "thin".
    const minArea = 0.6 * minB * minB;
    const thinPieces = G.shapes(G.diff(base, wide)).filter((s) => {
      const a = Math.abs(polyArea(s.outer)) - s.holes.reduce((t, h) => t + Math.abs(polyArea(h)), 0);
      return a > minArea;
    });
    if (!thinPieces.length) return base;
    const thin = G.normalize(G.toPaths(thinPieces.flatMap((s) => [s.outer].concat(s.holes))), "evenodd");
    let out = base;
    const N = 4;
    let prevOpen = base;
    for (let k = 0; k < N; k++) {
      const s1 = minF + ((minB - minF) * (k + 1)) / N;
      const nextOpen = k === N - 1 ? wide : G.opening(base, s1);
      const band = G.inter(G.diff(prevOpen, nextOpen), thin);
      if (band.length) {
        const wEst = minF + ((minB - minF) * (k + 0.5)) / N;
        out = G.union(out, G.offset(band, Math.max(0, (minB - wEst) / 2)));
      }
      prevOpen = nextOpen;
    }
    return out;
  }
  function polyArea(L) {
    let a = 0;
    for (let i = 0, j = L.length - 1; i < L.length; j = i++) a += (L[j][0] + L[i][0]) * (L[j][1] - L[i][1]);
    return a / 2;
  }

  PP.buildModel = function (d, p) {
    const warnings = [], notes = [];
    const lh = p.layerH, first = p.firstLayerH;
    const snap = (z) => (z <= first + 1e-9 ? first : first + Math.round((z - first) / lh) * lh);
    const T = snap(p.cardT);
    if (Math.abs(T - p.cardT) > 1e-6) notes.push(`Card thickness snapped to ${T.toFixed(2)} mm (layer grid).`);

    const nozzle = p.nozzle;
    const minF = (nozzle * p.minFeaturePct) / 100, minB = (nozzle * p.minBeadPct) / 100;
    const simulate = !!p.simSlicer;

    // Outer edge bevel configuration (stepped per FDM layer).
    const bw = Math.max(0, p.bevelW || 0);
    const bh = Math.max(0, p.bevelH || 0);
    const bSides = p.bevelSides || "top";
    const hasTopBevel = bw > 1e-6 && bh > 1e-6 && (bSides === "top" || bSides === "both");
    const hasBotBevel = bw > 1e-6 && bh > 1e-6 && (bSides === "bottom" || bSides === "both");
    const zTop0 = hasTopBevel ? Math.max(0, snap(T - bh)) : T;
    const zBot1 = hasBotBevel ? Math.min(T, snap(bh)) : 0;
    if (hasTopBevel && zTop0 >= T - 1e-6) warnings.push("Top edge bevel height rounds to 0 layers.");
    if (hasBotBevel && zBot1 <= 1e-6) warnings.push("Bottom edge bevel height rounds to 0 layers.");

    const layerGrid = [0];
    for (let z = first; z < T - 1e-6; z += lh) layerGrid.push(+z.toFixed(4));
    layerGrid.push(+T.toFixed(4));
    const bevelZ = layerGrid.filter((z) => (hasBotBevel && z <= zBot1 + 1e-6) || (hasTopBevel && z >= zTop0 - 1e-6));

    const cardInsetCache = new Map();
    function cardAtInset(ins) {
      if (ins <= 1e-6) return d.card;
      const key = ins.toFixed(4);
      if (!cardInsetCache.has(key)) cardInsetCache.set(key, G.offset(d.card, -ins));
      return cardInsetCache.get(key);
    }
    function slabInset(a, b) {
      let ins = 0;
      if (hasTopBevel && T > zTop0 + 1e-6 && b > zTop0 + 1e-6) {
        ins = Math.max(ins, bw * Math.min(1, Math.max(0, (b - zTop0) / (T - zTop0))));
      }
      if (hasBotBevel && zBot1 > 1e-6 && a < zBot1 - 1e-6) {
        ins = Math.max(ins, bw * Math.min(1, Math.max(0, (zBot1 - a) / zBot1)));
      }
      return ins;
    }
    function pushBeveledSolid(mat, z0, z1, R, group) {
      const cuts = Array.from(new Set([+z0.toFixed(4), +z1.toFixed(4)].concat(bevelZ.filter((z) => z > z0 + 1e-6 && z < z1 - 1e-6)))).sort((a, b) => a - b);
      // Merge adjacent intervals that share the same bevel inset (e.g. non-beveled middle layers).
      const segs = [];
      for (let i = 0; i < cuts.length - 1; i++) {
        const a = cuts[i], b = cuts[i + 1], ins = slabInset(a, b);
        if (segs.length && Math.abs(segs[segs.length - 1].ins - ins) < 1e-6) segs[segs.length - 1].b = b;
        else segs.push({ a, b, ins });
      }
      segs.forEach(({ a, b, ins }) => {
        const reg = ins > 1e-6 ? G.inter(R, cardAtInset(ins)) : R;
        if (reg.length) solids.push({ mat, z0: a, z1: b, region: reg, group });
      });
    }

    // Effective group regions with priority (earlier groups win overlaps).
    const eff = {};
    let taken = [];
    PP.GROUPS.forEach((g) => {
      const mode = p[g.id + "Mode"];
      let R = d.groups[g.id] || [];
      if (mode === "off" || !R.length) { eff[g.id] = { mode: "off", region: [] }; return; }
      R = G.diff(R, taken);
      taken = G.union(taken, R);
      eff[g.id] = { mode, region: R, mat: p[g.id + "Mat"], depth: p[g.id + "Depth"], label: g.label };
    });

    // Through cuts.
    const cutList = PP.GROUPS.filter((g) => eff[g.id].mode === "cut").map((g) => eff[g.id].region);
    let cuts = G.unionAll(cutList);
    if (simulate) cuts = G.opening(cuts, 0.1);
    const card0 = G.diff(G.diff(d.card, cuts), d.pushHole || []);
    if (cutList.length) {
      const islands = G.countIslandsIfCut(cuts, d.card);
      if (islands > 0) warnings.push(`Cut-through features create ${islands} loose island(s) (e.g. the inside of an "O") that will fall out.`);
    }

    // Pocket.
    const pocket = G.inter(d.pocket, card0);
    const pocketBottom = snap(T - p.pocketDepth);
    const pocketDepth = T - pocketBottom;
    if (d.pocket.length) {
      if (pocketBottom < 0.6 - 1e-6) warnings.push(`Only ${pocketBottom.toFixed(2)} mm of material under the pocket - the floor may be fragile or show through.`);
      if (pocketDepth < p.charmT - 0.001) notes.push(`Charm stands ${(p.charmT - pocketDepth).toFixed(2)} mm proud of the card surface.`);
      else if (pocketDepth > p.charmT + 0.001) notes.push(`Charm sits ${(pocketDepth - p.charmT).toFixed(2)} mm below the card surface.`);
      else notes.push("Charm sits flush with the card surface.");
      if (p.clearance < 0.05) warnings.push("Pocket clearance below 0.05 mm - the charm may not fit after printing.");
    }

    const recesses = []; // {region, zb}
    if (pocket.length) recesses.push({ region: pocket, zb: pocketBottom, what: "pocket" });
    const solids = [];
    const thin = {};
    const usage = {};
    const freeTop = G.diff(card0, pocket);

    const widened = [];
    PP.GROUPS.forEach((g) => {
      const f = eff[g.id];
      if (f.mode === "off" || f.mode === "cut") return;
      let R = G.inter(f.region, freeTop);
      if (!R.length) return;
      const orig = R;
      if (f.mode === "deboss") {
        if (simulate) R = G.opening(R, 0.1);
        const zb = Math.max(first, snap(T - f.depth));
        if (zb >= T - 1e-9) { warnings.push(`${f.label}: deboss depth rounds to 0 layers.`); return; }
        recesses.push({ region: R, zb, what: g.id });
      } else {
        if (simulate) {
          R = G.inter(simPositive(R, minF, minB), freeTop);
          const lost = G.diff(orig, R), gained = G.diff(R, orig);
          const aO = G.area(orig), aL = G.area(lost), aG = G.area(gained);
          thin[g.id] = { lost, gained };
          if (aO > 0 && aL / aO > 0.02) warnings.push(`${f.label}: ${Math.round((100 * aL) / aO)}% of the artwork is thinner than ${minF.toFixed(2)} mm and won't print.`);
          if (aO > 0 && aG / aO > 0.05) widened.push(`${f.label.toLowerCase()} (+${Math.round((100 * aG) / aO)}%)`);
        }
        if (!R.length) return;
        if (f.mode === "inlay") {
          const zb = Math.max(first, snap(T - f.depth));
          if (zb >= T - 1e-9) { warnings.push(`${f.label}: inlay depth rounds to 0 layers.`); return; }
          recesses.push({ region: R, zb, what: g.id, filled: true });
          pushBeveledSolid(f.mat, zb, T, R, g.id);
        } else if (f.mode === "emboss") {
          const zt = snap(T + f.depth);
          if (zt <= T + 1e-9) { warnings.push(`${f.label}: emboss height rounds to 0 layers.`); return; }
          const topR = hasTopBevel && T > zTop0 + 1e-6 ? G.inter(R, cardAtInset(bw)) : R;
          if (topR.length) solids.push({ mat: f.mat, z0: T, z1: zt, region: topR, group: g.id });
        }
      }
    });

    if (widened.length) notes.push(`Slicer will widen lines thinner than ${minB.toFixed(2)} mm (shown orange in 2D): ${widened.join(", ")}.`);

    // Body slabs between distinct recess and bevel levels.
    const levels = Array.from(new Set([0, T].concat(bevelZ, recesses.map((r) => +r.zb.toFixed(4))))).sort((a, b) => a - b);
    for (let k = 0; k < levels.length - 1; k++) {
      const a = levels[k], b = levels[k + 1];
      if (b - a < 1e-6) continue;
      const removed = G.unionAll(recesses.filter((r) => r.zb <= a + 1e-6).map((r) => r.region));
      const ins = slabInset(a, b);
      const baseCard = ins > 1e-6 ? G.inter(card0, cardAtInset(ins)) : card0;
      const region = G.diff(baseCard, removed);
      if (region.length) solids.unshift({ mat: "body", z0: a, z1: b, region });
    }
    if ((hasTopBevel && T > zTop0 + 1e-6) || (hasBotBevel && zBot1 > 1e-6)) {
      const sideLbl = bSides === "both" ? "top & bottom" : bSides;
      notes.push(`Outer edge bevel (${sideLbl}): ${bw.toFixed(2)} mm wide × ${bh.toFixed(2)} mm tall.`);
    }

    // Charm (visual only).
    let charm = null;
    if (d.charmSolid.length) {
      const region = G.diff(d.charmSolid, d.charmSlots);
      charm = { region, z0: pocket.length ? pocketBottom : T, z1: (pocket.length ? pocketBottom : T) + p.charmT };
    }

    // Material usage + print plan.
    let zMax = T;
    solids.forEach((s) => {
      const v = G.area(s.region) * (s.z1 - s.z0);
      usage[s.mat] = (usage[s.mat] || 0) + v;
      zMax = Math.max(zMax, s.z1);
    });
    const mats = Object.keys(usage);
    const inlayAccents = new Set(solids.filter((s) => s.mat !== "body" && s.z1 <= T + 1e-9).map((s) => s.mat));
    const embossAccents = new Set(solids.filter((s) => s.mat !== "body" && s.z0 >= T - 1e-9).map((s) => s.mat));
    const bodyEmboss = solids.some((s) => s.mat === "body" && s.z0 >= T - 1e-9);
    const layerOf = (z) => Math.round((z - first) / lh) + 1;
    let method;
    if (!inlayAccents.size && !embossAccents.size) method = { kind: "single", text: "Single colour - prints on any printer." };
    else if (!inlayAccents.size && embossAccents.size === 1 && !bodyEmboss) {
      const L = layerOf(T) + 1;
      method = { kind: "swap", text: `Single-nozzle friendly: pause & swap filament at layer ${L} (z = ${T.toFixed(2)} mm). Use your slicer's "Add color change" at that height.` };
    } else method = { kind: "multi", text: `Needs multi-material printing (AMS / MMU / toolchanger): ${inlayAccents.size ? "flush inlays change colour inside the same layer." : "raised features mix colours on the same layers."}` };

    if (d.pushHole && d.pushHole.length) {
      const b = G.bounds(d.pushHole);
      notes.push(`Push-out hole ${b.w.toFixed(1)} × ${b.h.toFixed(1)} mm through the pocket floor - press the charm out from the back.`);
    }
    const transNames = { body: "body", accent1: "accent 1", accent2: "accent 2" };
    const transMats = mats.filter((k) => ({ body: p.transBody, accent1: p.transAccent1, accent2: p.transAccent2 })[k]);
    if (transMats.length) {
      notes.push(`Translucent ${transMats.map((k) => transNames[k]).join(" + ")}: translucent PETG/PLA. Fewer walls and 100% infill (aligned/concentric) give the most even glow.`);
      if (transMats.includes("body")) notes.push("Translucent body: anything under the surface (the charm silhouette, push-out hole, inlay undersides) will show when backlit.");
      solids.forEach((sd) => {
        if (sd.mat !== "body" && transMats.includes(sd.mat) && sd.z1 - sd.z0 < 0.6 - 1e-6 && sd.group) {
          const lbl = (PP.GROUPS.find((g) => g.id === sd.group) || {}).label;
          if (lbl && !notes.some((n) => n.includes(lbl + " is"))) notes.push(`${lbl} is only ${(sd.z1 - sd.z0).toFixed(2)} mm of translucent filament - the colour will look pale; 0.6 mm+ reads stronger.`);
        }
      });
    }

    const grams = {};
    mats.forEach((m) => (grams[m] = (usage[m] / 1000) * 1.24));
    const totalLayers = layerOf(zMax);

    return { solids, charm, T, zMax, warnings, notes, thin, method, grams, totalLayers, levels, pocketBottom };
  };
})();
