// 再利用できる地球儀（three.js）と SVG 平面地図のフォールバック
// createGlobe({ host, places:{code:{lat,lon,color?}}, arcs:[{from,to,color,width}], focusIso:Set, view:{lat,lon}, onFrame(place) })
export const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';
export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const lowPower = () => window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(max-width: 899px)').matches;
export function webglOk() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

export async function createGlobe({ host, geo, places, arcs = [], focusIso = new Set(), view: v0 = { lat: 20, lon: 60 }, place }) {
  const THREE = await import(THREE_URL);
  const low = lowPower();
  const reduced = reducedMotion();
  const renderer = new THREE.WebGLRenderer({ antialias: !low, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1.5 : 2));
  host.replaceChildren(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  const globe = new THREE.Group();
  scene.add(globe, new THREE.AmbientLight(0x8899bb, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(-3, 2, 4); scene.add(sun);
  const R = 1, segs = low ? 40 : 72;
  const rad = (d) => (d * Math.PI) / 180;
  const vec = (lat, lon, r = R) => new THREE.Vector3(r * Math.cos(rad(lat)) * Math.sin(rad(lon)), r * Math.sin(rad(lat)), r * Math.cos(rad(lat)) * Math.cos(rad(lon)));
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(R, segs, segs), new THREE.MeshPhongMaterial({ color: 0x0c1c33, emissive: 0x050d1a, specular: 0x1d3a5f, shininess: 18 })));
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.14, segs, segs), new THREE.ShaderMaterial({
    side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
    vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'varying vec3 vN; void main(){ float i = pow(0.72 - dot(vN, vec3(0.0,0.0,1.0)), 3.0); gl_FragColor = vec4(0.35,0.65,1.0,1.0) * i; }',
  })));
  if (geo && geo.countries) {
    const base = [], focus = [];
    for (const c of geo.countries) {
      const arr = focusIso.has(String(c.id)) ? focus : base;
      for (const ring of c.rings) for (let i = 0; i + 3 < ring.length; i += 2) arr.push(vec(ring[i + 1], ring[i], R * 1.002), vec(ring[i + 3], ring[i + 2], R * 1.002));
    }
    globe.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(base), new THREE.LineBasicMaterial({ color: 0x6f8fb5, transparent: true, opacity: 0.5 })));
    globe.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(focus), new THREE.LineBasicMaterial({ color: 0xf0a35e, transparent: true, opacity: 0.95 })));
  }
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'); const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.25, 'rgba(255,255,255,.8)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
  })();
  const markers = {};
  for (const [code, p] of Object.entries(places)) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: p.color || 0xffb070, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    s.position.copy(vec(p.lat, p.lon, R * 1.01)); s.scale.setScalar(0.08); globe.add(s); markers[code] = s;
  }
  for (const a of arcs) {
    const A = vec(places[a.from].lat, places[a.from].lon).normalize();
    const B = vec(places[a.to].lat, places[a.to].lon).normalize();
    const ang = A.angleTo(B); const n = low ? 40 : 80; const pts = [];
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const p = A.clone().multiplyScalar(Math.sin((1 - t) * ang) / Math.sin(ang)).add(B.clone().multiplyScalar(Math.sin(t * ang) / Math.sin(ang)));
      pts.push(p.normalize().multiplyScalar(R * (1.01 + Math.sin(Math.PI * t) * (0.08 + ang * 0.14))));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const w = a.width || 1;
    globe.add(new THREE.Mesh(new THREE.TubeGeometry(curve, n, 0.0035 * w, 6, false), new THREE.MeshBasicMaterial({ color: a.color || 0xffc48a, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })));
    globe.add(new THREE.Mesh(new THREE.TubeGeometry(curve, n, 0.011 * w, 6, false), new THREE.MeshBasicMaterial({ color: a.color || 0xffc48a, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false })));
  }
  const view = { rx: rad(v0.lat), ry: -rad(v0.lon), dist: 3.2 };
  let fit = 3.2;
  function resize() {
    const w = host.clientWidth || 300, h = host.clientHeight || 300;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    const vf = rad(camera.fov) / 2, hf = Math.atan(Math.tan(vf) * camera.aspect);
    fit = (R * 1.12) / Math.sin(Math.min(vf, hf));
    if (!resize.done) { view.dist = fit; resize.done = true; }
    view.dist = Math.min(Math.max(view.dist, fit * 0.5), fit * 1.6);
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(host); resize();
  const el = renderer.domElement; const ptrs = new Map(); let pinch0 = 0, d0 = 0, last = 0;
  el.addEventListener('pointerdown', (e) => { el.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); d0 = view.dist; } });
  el.addEventListener('pointermove', (e) => {
    const prev = ptrs.get(e.pointerId); if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY }; ptrs.set(e.pointerId, cur); last = performance.now();
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) view.dist = Math.min(Math.max(d0 * pinch0 / d, fit * 0.5), fit * 1.6); return; }
    const k = 0.0045 * (view.dist / fit); view.ry += (cur.x - prev.x) * k; view.rx = Math.min(1.25, Math.max(-1.25, view.rx + (cur.y - prev.y) * k));
  });
  const up = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0; };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.addEventListener('wheel', (e) => { e.preventDefault(); last = performance.now(); view.dist = Math.min(Math.max(view.dist * (1 + Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 100) * 0.0012), fit * 0.5), fit * 1.6); }, { passive: false });
  const tmp = new THREE.Vector3(); let running = true, prevT = performance.now();
  function frame(now) {
    if (!running) return; requestAnimationFrame(frame); if (document.hidden) return;
    const dt = Math.min(64, now - prevT); prevT = now;
    if (!reduced && ptrs.size === 0 && now - last > 6000) view.ry += dt * 0.00004;
    globe.rotation.set(view.rx, view.ry, 0); camera.position.set(0, 0, view.dist); camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    const w = host.clientWidth, h = host.clientHeight, horizon = R / view.dist + 0.06;
    for (const [code, s] of Object.entries(markers)) {
      s.getWorldPosition(tmp); const facing = tmp.clone().normalize().dot(camera.position.clone().normalize());
      tmp.project(camera); place && place(code, (tmp.x + 1) / 2 * w, (1 - tmp.y) / 2 * h, facing > horizon);
    }
  }
  requestAnimationFrame(frame);
  return { dispose() { running = false; ro.disconnect(); renderer.dispose(); host.replaceChildren(); } };
}

/** SVG 平面地図（正距円筒）。bbox: {lon0, lon1, lat0, lat1} */
export function createFlatMap({ host, geo, places, arcs = [], focusIso = new Set(), bbox, place }) {
  const NS = 'http://www.w3.org/2000/svg';
  const S = 8; const W = (bbox.lon1 - bbox.lon0) * S, H = (bbox.lat1 - bbox.lat0) * S;
  const px = (lon) => (lon - bbox.lon0) * S, py = (lat) => (bbox.lat1 - lat) * S;
  const mk = (t, a) => { const n = document.createElementNS(NS, t); for (const [k, v] of Object.entries(a)) n.setAttribute(k, v); return n; };
  const svg = mk('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': '地図' });
  if (geo && geo.countries) {
    const g = mk('g', { 'stroke-linejoin': 'round' });
    for (const c of geo.countries) {
      let d = '';
      for (const ring of c.rings) {
        let inside = false;
        for (let i = 0; i < ring.length; i += 2) if (ring[i] > bbox.lon0 - 20 && ring[i] < bbox.lon1 + 20 && ring[i + 1] > bbox.lat0 - 20 && ring[i + 1] < bbox.lat1 + 20) { inside = true; break; }
        if (!inside) continue;
        d += 'M' + ring.reduce((acc, v, i) => acc + (i % 2 ? `,${py(v).toFixed(1)}` : `${i ? 'L' : ''}${px(v).toFixed(1)}`), '') + 'Z';
      }
      const f = focusIso.has(String(c.id));
      if (d) g.append(mk('path', { d, fill: f ? 'rgba(240,163,94,.22)' : '#13233a', stroke: f ? '#f0a35e' : '#3d5a7d', 'stroke-width': f ? 1.6 : 1 }));
    }
    svg.append(g);
  }
  for (const a of arcs) {
    const p = places[a.from], q = places[a.to];
    const x1 = px(p.lon), y1 = py(p.lat), x2 = px(q.lon), y2 = py(q.lat), len = Math.hypot(x2 - x1, y2 - y1);
    svg.append(mk('path', { d: `M${x1},${y1} Q${(x1 + x2) / 2},${Math.min(y1, y2) - len * 0.25} ${x2},${y2}`, fill: 'none', stroke: a.css || '#ffc48a', 'stroke-width': 2.2 * (a.width || 1), 'stroke-linecap': 'round', opacity: 0.9 }));
  }
  host.replaceChildren(svg);
  function layout() {
    const sr = svg.getBoundingClientRect(), hr = host.getBoundingClientRect();
    const sc = Math.min(sr.width / W, sr.height / H);
    const ox = sr.left - hr.left + (sr.width - W * sc) / 2, oy = sr.top - hr.top + (sr.height - H * sc) / 2;
    for (const [code, p] of Object.entries(places)) place && place(code, ox + px(p.lon) * sc, oy + py(p.lat) * sc, true);
  }
  const ro = new ResizeObserver(layout); ro.observe(host); layout();
  return { dispose() { ro.disconnect(); host.replaceChildren(); } };
}
