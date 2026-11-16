// Three.js print preview: layered meshes with simulated layer lines, top-surface infill and a brass charm.
window.PP = window.PP || {};
(function () {
  const V = (PP.view3d = {});
  let renderer, scene, camera, controls, root, plate, backlight, keyLight, needsRender = true;
  let materials = {}, charmMat, lastFrame = { W: 0, H: 0 };
  const U = {
    ppLayerH: { value: 0.2 }, ppFirst: { value: 0.2 }, ppLineW: { value: 0.42 },
    ppLines: { value: 1 }, ppTop: { value: 0 },
  };

  function patchMaterial(mat) {
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, U);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vPPWorld;\nvarying vec3 vPPN;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvPPWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvPPN = normalize(mat3(modelMatrix) * objectNormal);");
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", `#include <common>
uniform float ppLayerH; uniform float ppFirst; uniform float ppLineW; uniform float ppLines; uniform float ppTop;
varying vec3 vPPWorld; varying vec3 vPPN;
float ppHash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float ppNoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(ppHash(i),ppHash(i+vec2(1.0,0.0)),f.x), mix(ppHash(i+vec2(0.0,1.0)),ppHash(i+vec2(1.0,1.0)),f.x), f.y); }`)
        .replace("#include <color_fragment>", `#include <color_fragment>
vec3 ppN = normalize(vPPN);
float ppSide = 1.0 - smoothstep(0.35, 0.75, abs(ppN.z));
float ppTopF = smoothstep(0.8, 0.97, ppN.z);
float ppLz = (vPPWorld.z - ppFirst) / ppLayerH;
float ppAA = 1.0 - smoothstep(0.2, 0.55, fwidth(ppLz));
float ppPh = fract(ppLz + 1.0);
float ppBead = 4.0 * ppPh * (1.0 - ppPh);
float ppShade = mix(1.0, mix(0.80, 1.0, sqrt(ppBead)), ppSide * ppAA * ppLines);
float ppLayerIdx = floor(ppLz + 0.5);
float ppDirSel = mod(ppLayerIdx, 2.0);
vec2 ppXY = vPPWorld.xy;
float ppU = (ppDirSel < 0.5 ? (ppXY.x + ppXY.y) : (ppXY.x - ppXY.y)) * 0.70710678 / ppLineW;
float ppAAu = 1.0 - smoothstep(0.2, 0.55, fwidth(ppU));
float ppTph = fract(ppU);
float ppTb = 4.0 * ppTph * (1.0 - ppTph);
float ppTopStrength = ppTop < 0.5 ? 0.09 : (ppTop < 1.5 ? 0.02 : 0.0);
ppShade *= mix(1.0, mix(1.0 - ppTopStrength, 1.0, ppTb), ppTopF * ppAAu * ppLines);
if (ppTop > 1.5) { float nz = ppNoise(ppXY * 9.0) * 0.6 + ppNoise(ppXY * 23.0) * 0.4; ppShade *= mix(1.0, 0.88 + 0.16 * nz, ppTopF * ppLines); }
diffuseColor.rgb *= ppShade;`)
        .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
{
  vec3 ppUpV = normalize((viewMatrix * vec4(0.0, 0.0, 1.0, 0.0)).xyz);
  float ppTilt = (ppPh - 0.5) * 2.0;
  normal = normalize(normal + ppUpV * ppTilt * 0.6 * ppSide * ppAA * ppLines);
  vec3 ppAx = ppDirSel < 0.5 ? vec3(0.7071, -0.7071, 0.0) : vec3(0.7071, 0.7071, 0.0);
  vec3 ppAcross = normalize((viewMatrix * vec4(ppAx, 0.0)).xyz);
  normal = normalize(normal + ppAcross * (ppTph - 0.5) * 2.0 * ppTopStrength * 3.0 * ppTopF * ppAAu * ppLines);
}`)
;
    };
    mat.customProgramCacheKey = () => "pp-layer";
  }

  function brassTextures() {
    const c = document.createElement("canvas");
    c.width = c.height = 1024;
    const g = c.getContext("2d");
    g.fillStyle = "#c4c4c4";
    g.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 2600; i++) {
      const x = Math.random() * 1024, y = Math.random() * 1024;
      const a = Math.random() * Math.PI, L = 20 + Math.random() * 260;
      g.strokeStyle = `rgba(${Math.random() < 0.5 ? "255,255,255" : "0,0,0"},${0.04 + Math.random() * 0.12})`;
      g.lineWidth = 0.5 + Math.random() * 1.2;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a) * L * 0.5 + (Math.random() - 0.5) * 30, y + Math.sin(a) * L * 0.5, x + Math.cos(a) * L, y + Math.sin(a) * L);
      g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1 / 30, 1 / 30);
    return t;
  }

  function plateTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const g = c.getContext("2d");
    const img = g.createImageData(512, 512);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 30 + Math.random() * 40;
      img.data[i] = v; img.data[i + 1] = v * 0.95; img.data[i + 2] = v * 0.9; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(8, 8);
    t.encoding = THREE.sRGBEncoding;
    return t;
  }

  V.init = function (container) {
    THREE.ColorManagement.legacyMode = false;
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;

    camera = new THREE.PerspectiveCamera(28, 1, 1, 5000);
    camera.up.set(0, 0, 1);
    camera.position.set(38, -150, 190);
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.addEventListener("change", () => (needsRender = true));
    controls.addEventListener("start", () => (V._userMoved = true));

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.2));
    keyLight = new THREE.DirectionalLight(0xffffff, 1.15);
    keyLight.position.set(-60, -80, 160);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(4096, 4096);
    keyLight.shadow.bias = -0.0002;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);
    scene.add(keyLight.target);

    plate = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map: plateTexture(), roughness: 0.85, metalness: 0.1, color: 0xb59a5a }));
    plate.receiveShadow = true;
    plate.position.z = -0.01;
    scene.add(plate);

    // Light-box panel for the backlight view (translucent parts glow, opaque parts silhouette).
    backlight = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.98, 0.94).multiplyScalar(2.2), toneMapped: true }));
    backlight.visible = false;
    scene.add(backlight);

    root = new THREE.Group();
    scene.add(root);

    const brass = brassTextures();
    charmMat = new THREE.MeshStandardMaterial({ color: 0xc9973a, metalness: 1, roughness: 0.42, roughnessMap: brass, bumpMap: brass, bumpScale: 0.003, envMapIntensity: 1.0 });

    const ro = new ResizeObserver(() => V.resize(container));
    ro.observe(container);
    V.resize(container);
    const loop = () => {
      requestAnimationFrame(loop);
      controls.update();
      if (needsRender) { renderer.render(scene, camera); needsRender = false; }
    };
    loop();
  };

  V.resize = function (container) {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = w + "px";
    renderer.domElement.style.height = h + "px";
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // Keep the card framed while the user hasn't orbited away from a preset view.
    if (!V._userMoved && V._design) V.resetCamera(V._design, V._camView);
    needsRender = true;
  };

  function finishProps(finish) {
    return {
      matte: { roughness: 0.82, metalness: 0, clearcoat: 0 },
      standard: { roughness: 0.5, metalness: 0, clearcoat: 0 },
      silk: { roughness: 0.28, metalness: 0.35, clearcoat: 0 },
      glossy: { roughness: 0.18, metalness: 0, clearcoat: 0.6 },
    }[finish] || { roughness: 0.5, metalness: 0 };
  }

  function getMat(key, color, finish, trans, p) {
    let m = materials[key];
    if (!m) {
      m = new THREE.MeshPhysicalMaterial({ color, envMapIntensity: 0.6 });
      patchMaterial(m);
      materials[key] = m;
    }
    m.color.set(color);
    Object.assign(m, finishProps(finish));
    const wasTrans = m.transmission > 0;
    if (trans) {
      // Translucent filament: light passes through, tinted by the filament colour over
      // "clarity" mm; layer lines and infill keep it frosted rather than glass-clear.
      m.transmission = 0.6;
      m.thickness = p.cardT;
      m.ior = 1.5;
      m.attenuationColor.set(color);
      m.attenuationDistance = p.transDist;
      m.roughness = Math.max(m.roughness * 0.6, 0.22);
      m.metalness = 0;
      m.color.set(color);
    } else {
      m.transmission = 0;
    }
    if (wasTrans !== m.transmission > 0) m.needsUpdate = true;
    return m;
  }

  // Region -> extruded geometry. Triangulation is the expensive part of a 3D refresh, so results are
  // cached by (region contents, z0, z1): colour/material/layer-slider changes reuse geometry, and so
  // do solids that didn't change when a single feature is edited.
  const extrudeCache = new Map();
  const EXTRUDE_CACHE_MAX = 600;
  function regionKey(region) {
    let h = 2166136261 >>> 0, n = 0;
    for (let i = 0; i < region.length; i++) {
      const p = region[i];
      h = Math.imul(h ^ p.length, 16777619) >>> 0;
      for (let j = 0; j < p.length; j++) { h = Math.imul(h ^ (p[j].X * 7 + p[j].Y * 13), 16777619) >>> 0; n++; }
    }
    return h.toString(36) + ":" + n;
  }
  function extrude(region, z0, z1) {
    const key = regionKey(region) + "|" + z0.toFixed(4) + "|" + z1.toFixed(4);
    if (extrudeCache.has(key)) {
      const g = extrudeCache.get(key);
      extrudeCache.delete(key); extrudeCache.set(key, g); // LRU bump
      return g;
    }
    const g = extrudeRaw(region, z0, z1);
    extrudeCache.set(key, g);
    if (extrudeCache.size > EXTRUDE_CACHE_MAX) {
      const [k0, g0] = extrudeCache.entries().next().value;
      extrudeCache.delete(k0);
      g0 && g0.dispose();
    }
    return g;
  }
  function extrudeRaw(region, z0, z1) {
    const shapes = PP.geo.shapes(region).map((s) => {
      const sh = new THREE.Shape(s.outer.map(([x, y]) => new THREE.Vector2(x, y)));
      s.holes.forEach((h) => sh.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y)))));
      return sh;
    });
    if (!shapes.length) return null;
    const g = new THREE.ExtrudeGeometry(shapes, { depth: z1 - z0, bevelEnabled: false, curveSegments: 1 });
    g.translate(0, 0, z0);
    // Store non-indexed once so merging is a straight copy.
    return g.index ? g.toNonIndexed() : g;
  }

  // Concatenate cached geometries into one buffer (inputs are cached, so never disposed here).
  function merge(geoms) {
    geoms = geoms.filter(Boolean);
    if (!geoms.length) return null;
    let n = 0;
    geoms.forEach((g) => (n += g.attributes.position.count));
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    let o = 0;
    geoms.forEach((g) => {
      pos.set(g.attributes.position.array, o * 3);
      if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3);
      if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
      o += g.attributes.position.count;
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    return out;
  }

  // Returns {mat: BufferGeometry} for export as well.
  // clipZ: show the print only up to this height (layer preview), truncating each solid.
  V.update = function (model, design, p, clipZ) {
    V._last = { model, design, p };
    V._clipZ = clipZ == null ? null : clipZ;
    const zc = V._clipZ == null ? Infinity : V._clipZ;
    while (root.children.length) {
      const c = root.children.pop();
      if (c.geometry && !c.userData.cachedGeometry) c.geometry.dispose();
    }
    const colors = { body: p.colBody, accent1: p.colAccent1, accent2: p.colAccent2 };
    const byMat = {};
    model.solids.forEach((s) => {
      if (s.z0 >= zc - 1e-6) return;
      (byMat[s.mat] = byMat[s.mat] || []).push(extrude(s.region, s.z0, Math.min(s.z1, zc)));
    });
    const out = {};
    Object.keys(byMat).forEach((k) => {
      const g = merge(byMat[k]);
      if (!g) return;
      out[k] = g;
      const trans = { body: p.transBody, accent1: p.transAccent1, accent2: p.transAccent2 }[k];
      const mesh = new THREE.Mesh(g, getMat(k, colors[k] || "#ff00ff", p.finish, trans, p));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      root.add(mesh);
    });
    if (model.charm && p.showCharm && zc === Infinity) {
      const g = extrude(model.charm.region, model.charm.z0 + 0.002, model.charm.z1);
      if (g) {
        const m = new THREE.Mesh(g, charmMat);
        m.castShadow = m.receiveShadow = true;
        m.userData.charm = true;
        m.userData.cachedGeometry = true;
        root.add(m);
      }
    }
    U.ppLayerH.value = p.layerH;
    U.ppFirst.value = p.firstLayerH;
    U.ppLineW.value = p.nozzle * 1.05;
    U.ppLines.value = p.layerLines ? 1 : 0;
    U.ppTop.value = { lines: 0, ironed: 1, textured: 2 }[p.topFinish] || 0;

    const W = design.W, H = design.H;
    plate.visible = !!p.showPlate && !p.backlight;
    plate.scale.set(W + 60, H + 60, 1);
    plate.position.set(W / 2, H / 2, -0.01);
    backlight.visible = !!p.backlight;
    backlight.scale.set(W * 3, H * 3, 1);
    backlight.position.set(W / 2, H / 2, -6);
    keyLight.intensity = p.backlight ? 0.3 : 1.15;
    // Dim the room in the backlight view so the light box dominates (opaque parts go dark).
    Object.values(materials).forEach((m) => (m.envMapIntensity = p.backlight ? 0.2 : 0.6));
    charmMat.envMapIntensity = p.backlight ? 0.25 : 1.0;
    // Transmission samples an offscreen render that only contains opaque objects; give it an
    // opaque background so translucent parts don't pick up black.
    const anyTrans = p.transBody || p.transAccent1 || p.transAccent2;
    scene.background = anyTrans || p.backlight ? new THREE.Color(p.backlight ? 0x15171b : 0x2a2e35) : null;
    const sc = keyLight.shadow.camera;
    const R = Math.max(W, H) * 0.8 + 20;
    sc.left = -R; sc.right = R; sc.top = R; sc.bottom = -R; sc.near = 1; sc.far = 600;
    sc.updateProjectionMatrix();
    keyLight.target.position.set(W / 2, H / 2, 0);
    keyLight.position.set(W / 2 - 70, H / 2 - 90, 180);

    if (lastFrame.W !== W || lastFrame.H !== H) {
      lastFrame = { W, H };
      V.resetCamera(design, V._camView);
    }
    V._design = design;
    needsRender = true;
    return out;
  };

  V.resetCamera = function (design, view) {
    const W = design.W, H = design.H;
    V._camView = view || "persp";
    V._design = design;
    V._userMoved = false;
    // Distance that fits the card's bounding circle in the narrower field of view.
    const vfov = (camera.fov * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const r = 0.5 * Math.hypot(W, H);
    const fit = (r / Math.sin(Math.min(vfov, hfov) / 2)) * 1.02;
    let dir, target = new THREE.Vector3(W / 2, H / 2, 0), dist = fit;
    if (view === "top") dir = new THREE.Vector3(0, -0.0001, 1);
    else if (view === "back") dir = new THREE.Vector3(0.2, -0.55, -1);
    else if (view === "close") {
      const cb = design.charmBounds;
      target = cb ? new THREE.Vector3((cb.x0 + cb.x1) / 2, (cb.y0 + cb.y1) / 2, 1) : new THREE.Vector3(W / 2, H * 0.38, 0);
      dir = new THREE.Vector3(0.35, -0.75, 0.75);
      dist = fit * 0.42;
    } else dir = new THREE.Vector3(0.18, -0.62, 1);
    dir.normalize();
    controls.target.copy(target);
    camera.position.copy(target).addScaledVector(dir, dist);
    controls.update();
    needsRender = true;
  };

  // Layer preview: rebuild the meshes truncated at height z (null = whole print).
  V._clipZ = null;
  V.setClip = function (z) {
    if ((z == null && V._clipZ == null) || z === V._clipZ || !V._last) return;
    V.update(V._last.model, V._last.design, V._last.p, z);
  };

  V.snapshot = function () {
    renderer.render(scene, camera);
    return renderer.domElement.toDataURL("image/png");
  };
  V.requestRender = () => (needsRender = true);
})();
