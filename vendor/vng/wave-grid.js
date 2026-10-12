/*! Wave grid 3D — cubi istanziati che ondeggiano al passaggio del cursore/dito.
   Riscritto da VengeanceUI WaveGridBackground (MIT, © 2025-2026 Ashutoshx7) in modulo ES senza React.
   Differenze rispetto all'originale (collaudo 2026-10-12):
   - niente post-processing (EffectComposer non serve: basta three.module.min.js); la vignetta è CSS (.vng-wave::after);
   - si ferma fuori schermo (IntersectionObserver) e con la scheda nascosta: l'originale girava sempre;
   - ?shot=1 e prefers-reduced-motion: un solo fotogramma con un'onda "congelata";
   - pixel ratio massimo 1,5 su telefono.
   Uso:
     <div class="vng-wave" data-vng-wave style="height:520px"><div class="vng-wave__content">…</div></div>
     <script type="module">
       import { mountWaveGrid } from "./vng/wave-grid.js";
       try { const THREE = await import("../vendor/three.module.min.js");
             mountWaveGrid(THREE, document.querySelector("[data-vng-wave]"), { colorBase: "#18181b", colorHigh: "#f59e0b" });
       } catch (e) { console.info("3D non disponibile: resta lo sfondo CSS di .vng-wave"); }
     </script>
*/
const MAX_TRAIL = 128;

function overrideVertexShader(vs) {
  return vs
    .replace("#include <common>", `#include <common>
      varying float vHeight;
      attribute vec2 aOffset;
      uniform sampler2D uTrailTexture;
      uniform int uTrailCount;
      uniform float uWaveSpeed, uWaveFreq, uWaveWidth, uFadeTime, uAmplitude, uJitter, uMaxHeight;
      vec2 hash2(vec2 p){ p = vec2(dot(p, vec2(127.1,311.7)), dot(p, vec2(269.5,183.3))); return fract(sin(p)*43758.5453123) - 0.5; }`)
    .replace("#include <begin_vertex>", `#include <begin_vertex>
      vHeight = 0.0;
      if (position.y > 0.0) {
        vec2 worldXZ = aOffset + hash2(aOffset) * uJitter;
        float waveHeight = 0.0, totalWeight = 0.0;
        for (int i = 0; i < ${MAX_TRAIL}; i++) {
          if (i >= uTrailCount) break;
          vec4 td = texture2D(uTrailTexture, vec2((float(i) + 0.5) / ${MAX_TRAIL}.0, 0.5));
          float dist = length(worldXZ - td.rg);
          float relDist = dist - uWaveSpeed * td.b;
          float w = exp(-td.b / uFadeTime) * exp(-(relDist*relDist)/(uWaveWidth*uWaveWidth)) * (1.0/(1.0 + dist*0.1)) * td.a;
          waveHeight += w * cos(uWaveFreq * relDist); totalWeight += w;
        }
        waveHeight /= max(totalWeight, 1.0);
        float d = clamp(waveHeight * uAmplitude, -uMaxHeight, uMaxHeight);
        transformed.y += d; vHeight = d;
      }`);
}

export function mountWaveGrid(THREE, container, opts = {}) {
  const o = Object.assign({
    gridSize: 32, colorBase: "#ffffff", colorHigh: "#0055ff", waveAmplitude: 0.4, waveSpeed: 6, waveFrequency: 1.2,
    waveWidth: 3, waveMaxHeight: 0.4, waveJitter: 0.2, autoAnimate: true, exposure: 1.95,
  }, opts);
  const still = /[?&]shot=1\b/.test(location.search) || matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile = matchMedia("(max-width: 760px)").matches;
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  container.prepend(canvas);

  const cubeW = 0.8, cubeH = 3, gap = 0.01, spacing = cubeW + gap, bounds = o.gridSize * spacing;
  const size = () => ({ w: container.clientWidth || 1, h: container.clientHeight || 1, pr: Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2) });
  let s = size();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(o.colorBase).multiplyScalar(0.5);
  const camera = new THREE.PerspectiveCamera(40, s.w / s.h, 0.1, 500);
  let radius = 12;
  const mouse = new THREE.Vector2(), lerped = new THREE.Vector2();
  const fit = () => {
    const vh = THREE.MathUtils.degToRad(camera.fov) / 2, hh = Math.atan(Math.tan(vh) * camera.aspect);
    radius = Math.min((bounds / 2) / Math.tan(vh), (bounds / 2) / Math.tan(hh)) * 0.9 + cubeH * 0.5;
  };
  const place = (mx, my) => {
    const a = my * Math.PI * 0.03, b = mx * Math.PI * 0.05;
    camera.position.set(-radius * Math.cos(a) * Math.sin(b), radius * Math.cos(a) * Math.cos(b), radius * Math.sin(a));
    camera.up.set(0, 0, -1); camera.lookAt(0, 0, 0);
  };
  fit(); place(0, 0); scene.add(camera);

  scene.add(new THREE.AmbientLight("#ffffff", 0.5));
  const key = new THREE.DirectionalLight("#ffffff", 4); key.position.set(-20, 10, 6); key.castShadow = !mobile;
  Object.assign(key.shadow.camera, { near: 0.1, far: 60, left: -22, right: 22, top: 22, bottom: -22 });
  key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 6; key.shadow.bias = 0.0001; scene.add(key);
  const fill = new THREE.DirectionalLight("#ffffff", 1); fill.position.set(10, 5, -3); scene.add(fill);

  const trailData = new Float32Array(MAX_TRAIL * 4);
  const trailTex = new THREE.DataTexture(trailData, MAX_TRAIL, 1, THREE.RGBAFormat, THREE.FloatType); trailTex.needsUpdate = true;
  const U = {
    uTrailTexture: { value: trailTex }, uTrailCount: { value: 0 }, uFadeTime: { value: 2 },
    uWaveSpeed: { value: o.waveSpeed }, uWaveFreq: { value: o.waveFrequency }, uWaveWidth: { value: o.waveWidth },
    uAmplitude: { value: o.waveAmplitude }, uJitter: { value: o.waveJitter }, uMaxHeight: { value: o.waveMaxHeight },
  };
  const C = { uColorBase: { value: new THREE.Color(o.colorBase) }, uColorHigh: { value: new THREE.Color(o.colorHigh) } };

  const trail = []; let last = null, idle = 0, randT = 0, randomMode = true;
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(bounds, bounds), new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }));
  plane.rotation.x = -Math.PI / 2; plane.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const push = (x, z, d) => { if (trail.length >= MAX_TRAIL) trail.shift(); trail.push({ x, z, age: 0, d }); };
  const onMove = (e) => {
    const r = canvas.getBoundingClientRect(); if (!r.width) return;
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); mouse.copy(ndc);
    ray.setFromCamera(ndc, camera); const hit = ray.intersectObject(plane)[0]; if (!hit) return;
    const { x, z } = hit.point; let d = 0;
    if (last) { d = Math.hypot(x - last.x, z - last.z); if (d < 0.1) return; }
    push(x, z, d); last = { x, z }; idle = 0; randomMode = false; randT = 0; wake();
  };
  const onLeave = () => { mouse.set(0, 0); last = null; };
  container.addEventListener("pointermove", onMove); container.addEventListener("pointerleave", onLeave);
  const randomPoint = () => push((Math.random() * 0.5 - 0.25) * bounds, (Math.random() * 0.5 - 0.25) * bounds, 0.8 + Math.random() * 0.2);
  const updateTrail = (dt) => {
    for (let i = trail.length - 1; i >= 0; i--) { trail[i].age += dt; if (trail[i].age > 8) trail.splice(i, 1); }
    idle += dt;
    if (idle >= 3 && !randomMode && o.autoAnimate) { randomMode = true; randT = 0; }
    if (randomMode && o.autoAnimate) { randT += dt; if (randT >= 1.5) { randomPoint(); randT = 0; } }
    const n = Math.min(trail.length, MAX_TRAIL);
    for (let i = 0; i < n; i++) { const t = i * 4; trailData[t] = trail[i].x; trailData[t + 1] = trail[i].z; trailData[t + 2] = trail[i].age; trailData[t + 3] = trail[i].d; }
    trailTex.needsUpdate = true; U.uTrailCount.value = n;
  };

  const count = o.gridSize * o.gridSize;
  const geo = new THREE.BoxGeometry(cubeW, cubeH, cubeW);
  const offs = new THREE.InstancedBufferAttribute(new Float32Array(count * 2), 2); geo.setAttribute("aOffset", offs);
  const mat = new THREE.MeshPhongMaterial({ color: 0xffffff });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U, C);
    sh.vertexShader = overrideVertexShader(sh.vertexShader);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vHeight; uniform vec3 uColorBase; uniform vec3 uColorHigh; uniform float uMaxHeight;")
      .replace("#include <color_fragment>", "#include <color_fragment>\nfloat t = clamp(vHeight / uMaxHeight, 0.0, 1.0); diffuseColor.rgb = mix(uColorBase, uColorHigh, t);");
  };
  const depth = new THREE.MeshDepthMaterial();
  depth.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, U); sh.vertexShader = overrideVertexShader(sh.vertexShader); };
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.customDepthMaterial = depth; mesh.castShadow = mesh.receiveShadow = !mobile; scene.add(mesh);
  const dummy = new THREE.Object3D(), off = ((o.gridSize - 1) * spacing) / 2;
  for (let i = 0; i < o.gridSize; i++) for (let j = 0; j < o.gridSize; j++) {
    const k = i * o.gridSize + j, x = i * spacing - off, z = j * spacing - off;
    dummy.position.set(x, 0, z); dummy.updateMatrix(); mesh.setMatrixAt(k, dummy.matrix); offs.setXY(k, x, z);
  }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, alpha: false });
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = o.exposure;
  renderer.shadowMap.enabled = !mobile; renderer.shadowMap.type = THREE.PCFShadowMap;
  const resize = () => {
    s = size(); camera.aspect = s.w / s.h; camera.updateProjectionMatrix(); fit(); place(lerped.x, lerped.y);
    renderer.setPixelRatio(s.pr); renderer.setSize(s.w, s.h, false); if (!running) renderer.render(scene, camera);
  };
  const ro = new ResizeObserver(resize); ro.observe(container);
  renderer.setPixelRatio(s.pr); renderer.setSize(s.w, s.h, false);

  let running = false, visible = false, destroyed = false, io = null, prev = performance.now();
  const onVis = () => (document.hidden ? sleep() : wake());
  const frame = (t) => {
    const dt = Math.min(0.05, (t - prev) / 1000); prev = t;
    updateTrail(dt);
    lerped.x += (mouse.x - lerped.x) * 0.04; lerped.y += (mouse.y - lerped.y) * 0.04; place(lerped.x, lerped.y);
    renderer.render(scene, camera);
  };
  function wake() { if (!destroyed && !still && visible && !running && !document.hidden) { running = true; prev = performance.now(); renderer.setAnimationLoop(frame); } }
  function sleep() { if (running) { running = false; renderer.setAnimationLoop(null); } }

  if (still) {
    // un'onda congelata, così lo screenshot mostra l'effetto
    push(-bounds * 0.12, bounds * 0.05, 1); trail[0].age = 0.6; updateTrail(0); renderer.render(scene, camera);
  } else {
    io = new IntersectionObserver((e) => { visible = e[0].isIntersecting; visible ? wake() : sleep(); });
    io.observe(container);
    document.addEventListener("visibilitychange", onVis);
  }

  return {
    destroy() {
      destroyed = true; sleep(); ro.disconnect(); if (io) io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      mesh.dispose();
      container.removeEventListener("pointermove", onMove); container.removeEventListener("pointerleave", onLeave);
      geo.dispose(); mat.dispose(); depth.dispose(); trailTex.dispose(); plane.geometry.dispose(); plane.material.dispose();
      renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
    },
  };
}
