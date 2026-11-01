// Exporters: binary STL, multi-part 3MF, and a tiny STORE-only ZIP writer.
window.PP = window.PP || {};
(function () {
  const X = (PP.exporters = {});

  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  // files: [{name, data: Uint8Array|string}] -> Blob (zip, no compression)
  X.zip = function (files, mime) {
    const enc = new TextEncoder();
    const chunks = [], central = [];
    let offset = 0;
    files.forEach((f) => {
      const data = typeof f.data === "string" ? enc.encode(f.data) : f.data;
      const name = enc.encode(f.name);
      const crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, 0, true); lh.setUint16(12, 0x21, true); lh.setUint32(14, crc, true);
      lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      chunks.push(new Uint8Array(lh.buffer), name, data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0, true); ch.setUint16(10, 0, true);
      ch.setUint16(12, 0, true); ch.setUint16(14, 0x21, true); ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true);
      ch.setUint16(28, name.length, true); ch.setUint16(30, 0, true); ch.setUint16(32, 0, true); ch.setUint16(34, 0, true); ch.setUint16(36, 0, true);
      ch.setUint32(38, 0, true); ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), name);
      offset += 30 + name.length + data.length;
    });
    const cdSize = central.reduce((s, c) => s + c.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    return new Blob(chunks.concat(central, [new Uint8Array(end.buffer)]), { type: mime || "application/zip" });
  };

  X.stl = function (geometry, name) {
    const pos = geometry.attributes.position.array;
    const tris = pos.length / 9;
    const buf = new ArrayBuffer(84 + tris * 50);
    const dv = new DataView(buf);
    const header = ("PP " + (name || "")).slice(0, 79);
    for (let i = 0; i < header.length; i++) dv.setUint8(i, header.charCodeAt(i));
    dv.setUint32(80, tris, true);
    let o = 84;
    for (let t = 0; t < tris; t++) {
      const i = t * 9;
      const ax = pos[i], ay = pos[i + 1], az = pos[i + 2], bx = pos[i + 3], by = pos[i + 4], bz = pos[i + 5], cx = pos[i + 6], cy = pos[i + 7], cz = pos[i + 8];
      let nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay), ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az), nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
      const L = Math.hypot(nx, ny, nz) || 1;
      dv.setFloat32(o, nx / L, true); dv.setFloat32(o + 4, ny / L, true); dv.setFloat32(o + 8, nz / L, true);
      for (let k = 0; k < 9; k++) dv.setFloat32(o + 12 + k * 4, pos[i + k], true);
      o += 50;
    }
    return new Uint8Array(buf);
  };

  // parts: [{name, color:'#rrggbb', geometry}]
  X.threeMF = function (parts, title) {
    const xmlEsc = (s) => String(s).replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]);
    let model = `<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">\n`;
    model += `<metadata name="Title">${xmlEsc(title || "Charm card")}</metadata>\n<metadata name="Application">Parametric Charm Packaging</metadata>\n<resources>\n`;
    model += `<basematerials id="1">\n` + parts.map((p) => `<base name="${xmlEsc(p.name)}" displaycolor="${p.color.toUpperCase()}${p.alpha || "FF"}"/>`).join("\n") + `\n</basematerials>\n`;
    const ids = [];
    parts.forEach((p, idx) => {
      const id = idx + 2;
      ids.push(id);
      const pos = p.geometry.attributes.position.array;
      const map = new Map();
      const verts = [];
      const tris = [];
      const key = (x, y, z) => Math.round(x * 1e4) + "," + Math.round(y * 1e4) + "," + Math.round(z * 1e4);
      for (let i = 0; i < pos.length; i += 9) {
        const t = [];
        for (let k = 0; k < 3; k++) {
          const x = pos[i + k * 3], y = pos[i + k * 3 + 1], z = pos[i + k * 3 + 2];
          const kk = key(x, y, z);
          let vi = map.get(kk);
          if (vi === undefined) { vi = verts.length; map.set(kk, vi); verts.push(`<vertex x="${x.toFixed(4)}" y="${y.toFixed(4)}" z="${z.toFixed(4)}"/>`); }
          t.push(vi);
        }
        if (t[0] !== t[1] && t[1] !== t[2] && t[0] !== t[2]) tris.push(`<triangle v1="${t[0]}" v2="${t[1]}" v3="${t[2]}"/>`);
      }
      model += `<object id="${id}" type="model" name="${xmlEsc(p.name)}" pid="1" pindex="${idx}">\n<mesh>\n<vertices>\n${verts.join("\n")}\n</vertices>\n<triangles>\n${tris.join("\n")}\n</triangles>\n</mesh>\n</object>\n`;
    });
    const asm = parts.length + 2;
    model += `<object id="${asm}" type="model" name="${xmlEsc(title || "Charm card")}">\n<components>\n${ids.map((id) => `<component objectid="${id}"/>`).join("\n")}\n</components>\n</object>\n`;
    model += `</resources>\n<build>\n<item objectid="${asm}"/>\n</build>\n</model>\n`;
    const types = `<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>\n</Types>\n`;
    const rels = `<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n<Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>\n</Relationships>\n`;
    return X.zip([
      { name: "[Content_Types].xml", data: types },
      { name: "_rels/.rels", data: rels },
      { name: "3D/3dmodel.model", data: model },
    ], "model/3mf");
  };

  X.download = function (blob, filename) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  };
})();
