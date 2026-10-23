// /world.html — 東京から東アフリカ・中東へ（3D 地球儀 / 2D 地図フォールバック）
// three.js はこのページでだけ、固定バージョンを CDN から動的 import する。
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';

const PLACES = {
  JP: { name: '日本', city: '東京', en: 'TOKYO', lat: 35.68, lon: 139.69, home: true, iso: '392' },
  ET: { name: 'エチオピア', city: 'アディスアベバ', en: 'ADDIS ABABA', lat: 9.03, lon: 38.74, iso: '231' },
  DJ: { name: 'ジブチ', city: 'ジブチ', en: 'DJIBOUTI', lat: 11.59, lon: 43.15, iso: '262' },
  KE: { name: 'ケニア', city: 'ナイロビ', en: 'NAIROBI', lat: -1.29, lon: 36.82, iso: '404' },
  AE: { name: 'アラブ首長国連邦', city: 'ドバイ', en: 'DUBAI', lat: 25.2, lon: 55.27, iso: '784' },
  SA: { name: 'サウジアラビア', city: 'リヤド', en: 'RIYADH', lat: 24.71, lon: 46.68, iso: '682' },
  OM: { name: 'オマーン', city: 'マスカット', en: 'MUSCAT', lat: 23.59, lon: 58.41, iso: '512' },
  QA: { name: 'カタール', city: 'ドーハ', en: 'DOHA', lat: 25.29, lon: 51.53, iso: '634' },
};
const ORDER = ['ET', 'DJ', 'KE', 'AE', 'SA', 'OM', 'QA'];
const ARCS = ['ET', 'AE', 'DJ']; // 東京→アディス、東京→ドバイ、東京→ジブチ
const FOCUS_ISO = new Set(Object.values(PLACES).map((p) => p.iso));
const SIG_KEYS = ['安全', '為替', '政局', '物流'];
const LEVEL = { 改善: ['up', '↑'], 横ばい: ['flat', '→'], 悪化: ['down', '↓'] };
const TARGET = { lat: 14, lon: 47 }; // 紅海・アフリカの角
const INTRO_MS = 4000;

const $ = (id) => document.getElementById(id);
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isNarrow = () => window.matchMedia('(max-width: 899px)').matches;
const lowPower = window.matchMedia('(pointer: coarse)').matches || isNarrow();

function h(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kids) if (c != null) n.append(c);
  return n;
}
async function getJson(url) {
  const r = await fetch(url, { credentials: 'same-origin' });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
}
function webglOk() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

// ---------------- データ・パネル・カード（2D/3D 共通） ----------------
let issue = null;
const info = {}; // code → { name, city, signals, point, href }
let activeCode = null;
let focusHandler = null; // 3D のとき国へ回転

function signalItems(sig) {
  return SIG_KEYS.map((k) => {
    const v = sig && sig[k];
    const [cls, mark] = LEVEL[v] || ['na', ''];
    return h('li', { class: cls }, h('span', { text: k }), h('b', { text: v ? `${mark} ${v}` : '未評価' }));
  });
}

function buildInfo() {
  for (const code of ORDER) {
    const p = PLACES[code];
    const c = issue && Array.isArray(issue.countries) ? issue.countries.find((x) => x.code === code) : null;
    info[code] = {
      ...p,
      signals: c ? c.signals : {},
      point: c && c.point ? c.point : '最新号ではまだ取り上げていません。',
      href: c && c.href ? c.href : null,
    };
  }
}

function renderPanel() {
  if (issue) {
    $('issue-meta').textContent = `東アフリカ・中東ビジネス通信 ・ ${issue.label || ''} ${issue.date || ''}`.trim();
    $('panel-title').textContent = issue.title;
    $('issue-conc').textContent = issue.conclusion || issue.summary || '';
    $('issue-sig').replaceChildren(...signalItems(issue.signals));
    $('issue-three').replaceChildren(...(issue.three_lines || []).map((t) => h('li', { text: t })));
    $('issue-link').href = `issues/${issue.slug}.html`;
  } else {
    $('panel-title').textContent = '創刊準備中';
    $('issue-sig').replaceChildren(...signalItems({}));
  }
  $('country-list').replaceChildren(...ORDER.map((code) => {
    const c = info[code];
    return h('li', null, h('button', { type: 'button', 'data-code': code, 'aria-pressed': 'false', onclick: () => select(code, true) },
      h('b', { text: `${c.name}（${c.city}）` }), h('span', { text: c.point })));
  }));
  const panel = $('panel');
  const toggle = $('panel-toggle');
  if (isNarrow()) { panel.classList.add('collapsed'); toggle.setAttribute('aria-expanded', 'false'); }
  toggle.addEventListener('click', () => {
    const collapsed = panel.classList.toggle('collapsed');
    toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  });
}

// ---------------- 基本情報（assets/data/countries.json） ----------------
let basics = null;
const CMP_GROUPS = new Set(['economy', 'demography', 'power', 'wage']); // 日本と並べて比較する分類
const CMP_SKIP = new Set(['主要産業', '首都']);
const fmtAsOf = (s) => {
  if (!s) return '';
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(s);
  if (m) return m[3] ? `${m[1]}/${m[2]}/${m[3]}` : m[2] ? `${m[1]}年${+m[2]}月` : `${m[1]}年`;
  return s.replace('-Q', '年Q');
};
function srcLink(source, text = '出典') {
  if (!source || !source.url) return h('span', { class: 'w-src none', text: '—', 'aria-hidden': 'true' });
  return h('a', { class: 'w-src', href: source.url, target: '_blank', rel: 'noopener noreferrer', title: source.title, text,
    'aria-label': `出典：${source.title}（新しいタブ）` });
}
function kvRow(it, jp, extraCls) {
  const val = h('div', { class: 'w-kv-v' });
  if (it.value == null) val.append(h('span', { class: 'w-na', text: 'データ確認中' }));
  else val.append(h('span', { text: it.value }));
  const meta = [fmtAsOf(it.as_of), it.note].filter(Boolean).join(' ・ ');
  if (meta) val.append(h('small', { class: 'w-kv-m', text: meta }));
  if (jp && jp.value != null) val.append(h('small', { class: 'w-kv-jp', text: `日本：${jp.value}` }));
  return h('tr', { class: extraCls || null },
    h('th', { scope: 'row', text: it.label }),
    h('td', null, val),
    h('td', { class: 'w-kv-s' }, srcLink(it.source)));
}
function renderBasics(code) {
  const host = $('card-basic');
  const foot = $('card-basic-foot');
  const c = basics && basics.countries && basics.countries[code];
  if (!c) {
    host.replaceChildren(h('p', { class: 'w-na', text: basics ? 'データ確認中' : '基本情報を読み込めませんでした。' }));
    foot.textContent = '';
    return;
  }
  const jp = basics.countries.JP || {};
  const out = [];
  for (const [key, label] of basics.groups || []) {
    const items = c[key] || [];
    if (!items.length) continue;
    const tb = h('tbody');
    for (const it of items) {
      const j = CMP_GROUPS.has(key) && !CMP_SKIP.has(it.label) && code !== 'JP'
        ? (jp[key] || []).find((x) => x.label === it.label) : null;
      tb.append(kvRow(it, j));
    }
    const grp = h('div', { class: 'w-kv-g' }, h('h4', { text: label }), h('table', { class: 'w-kv' }, tb));
    if (key === 'fx' && c.fx_parallel) grp.append(parallelBlock(c));
    out.push(grp);
  }
  host.replaceChildren(...out);
  foot.textContent = basics.updated ? `更新 ${fmtAsOf(basics.updated)} ・ ${basics.note || ''}` : (basics.note || '');
}
let pxSeq = 0;
function parallelBlock(c) {
  const p = c.fx_parallel;
  const id = `w-px-${++pxSeq}`;
  const btn = h('button', { class: 'w-px-t', type: 'button', 'aria-expanded': 'false', 'aria-controls': id, text: '並行市場レート' });
  const srcs = (c.fx_parallel_sources || [p.source]).filter(Boolean);
  const box = h('div', { class: 'w-px', id, hidden: true },
    h('p', { class: 'w-px-v', text: p.value == null ? 'データ確認中' : p.value }),
    h('p', { class: 'w-kv-m', text: [`取得日 ${fmtAsOf(p.as_of)}`, p.note].filter(Boolean).join(' ・ ') }),
    h('p', { class: 'w-px-s' }, h('span', { text: '出典：' }), ...srcs.flatMap((s, i) => [i ? h('span', { text: ' ／ ' }) : null, srcLink(s, s.title)]).filter(Boolean)));
  btn.addEventListener('click', () => {
    const open = box.hidden;
    box.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  return h('div', { class: 'w-px-wrap' }, btn, box);
}

const card = $('card');
function openCard(code, xy) {
  const c = info[code];
  if (!c) return;
  activeCode = code;
  $('card-city').textContent = `${c.city} ・ ${c.en}`;
  $('card-title').textContent = c.name;
  renderBasics(code);
  $('card-body').scrollTop = 0;
  $('card-sig').replaceChildren(...signalItems(c.signals));
  $('card-point').textContent = c.point;
  const link = $('card-link');
  if (c.href) { link.href = c.href; link.removeAttribute('aria-disabled'); link.textContent = 'この国の記事を読む'; }
  else { link.href = issue ? `issues/${issue.slug}.html` : '/'; link.setAttribute('aria-disabled', 'true'); link.textContent = '次号以降で掲載予定'; }
  card.hidden = false;
  document.body.classList.add('card-open');
  placeCard(xy);
  document.querySelectorAll('[data-code]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.code === code ? 'true' : 'false'));
}
function placeCard(xy) {
  if (card.hidden || isNarrow() || !xy) return;
  const stage = $('stage').getBoundingClientRect();
  // 固定ヘッダー（とサブナビがあればその下）より上には出さない
  const topMin = Math.max(72, ...[...document.querySelectorAll('.w-top, .sbar')].map((e) => e.getBoundingClientRect().bottom + 8));
  const maxH = `${Math.max(240, stage.height - topMin - 12)}px`;
  if (card.style.maxHeight !== maxH) card.style.maxHeight = maxH;
  const maxX = (window.innerWidth >= 900 ? window.innerWidth - 392 : window.innerWidth) - card.offsetWidth - 12;
  const x = Math.min(Math.max(12, xy.x + 18), maxX);
  const y = Math.max(topMin, Math.min(xy.y - 40, stage.height - card.offsetHeight - 12));
  card.style.left = `${x}px`;
  card.style.top = `${y}px`;
}
function closeCard() {
  card.hidden = true;
  document.body.classList.remove('card-open');
  activeCode = null;
  document.querySelectorAll('[data-code]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
}
$('card-close').addEventListener('click', closeCard);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCard(); });

const pinXY = {};
function select(code, fromList) {
  if (fromList && focusHandler) focusHandler(code);
  openCard(code, pinXY[code]);
}

// 地図上のラベル（HTML ボタン。キーボード操作可能）
const pins = {};
function buildPins() {
  const host = $('labels');
  for (const code of ['JP', ...ORDER]) {
    const p = PLACES[code];
    const el = p.home
      ? h('span', { class: 'w-pin home', 'aria-hidden': 'true' }, h('span', { class: 'dot' }), h('span', { class: 'lbl', text: '東京' }))
      : h('button', { class: 'w-pin', type: 'button', 'data-code': code, 'aria-pressed': 'false', 'aria-label': `${p.name}（${p.city}）の基本情報と今週の信号`,
          onclick: () => select(code, false) },
        h('span', { class: 'dot' }), h('span', { class: 'lbl', text: p.city }));
    host.append(el);
    pins[code] = el;
  }
}
// ラベルの重なりを減らす（優先度の低い地点は点だけ表示）
const PRIORITY = ['JP', 'ET', 'DJ', 'AE', 'SA', 'KE', 'QA', 'OM'];
const lblW = {};
function declutter() {
  const taken = [];
  for (const code of PRIORITY) {
    const el = pins[code], p = pinXY[code];
    if (!el || !p || el.classList.contains('back')) continue;
    const w = (lblW[code] ||= (el.querySelector('.lbl') || el).offsetWidth + 22);
    const r = { x0: p.x - 8, x1: p.x - 8 + w, y0: p.y - 12, y1: p.y + 12 };
    const hit = taken.some((t) => r.x0 < t.x1 && r.x1 > t.x0 && r.y0 < t.y1 && r.y1 > t.y0);
    el.classList.toggle('nolbl', hit && code !== activeCode);
    if (!hit) taken.push(r);
  }
}
function placePin(code, x, y, visible) {
  const el = pins[code];
  pinXY[code] = { x, y };
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.classList.toggle('back', !visible);
  if (code === activeCode) placeCard(visible ? { x, y } : null);
}

// ---------------- 3D ----------------
async function start3D(geo) {
  let THREE;
  try { THREE = await import(new URL('vendor/three-0.160.module.min.js', import.meta.url).href); }
  catch (e) { THREE = await import(/* @vite-ignore */ THREE_URL); }
  const host = $('canvas-host');
  const renderer = new THREE.WebGLRenderer({ antialias: !lowPower, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2));
  host.append(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  const globe = new THREE.Group();
  scene.add(globe);
  scene.add(new THREE.AmbientLight(0x8899bb, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-3, 2, 4);
  scene.add(sun);

  const R = 1;
  const segs = lowPower ? 40 : 72;
  const vec = (lat, lon, r = R) => {
    const la = (lat * Math.PI) / 180, lo = (lon * Math.PI) / 180;
    return new THREE.Vector3(r * Math.cos(la) * Math.sin(lo), r * Math.sin(la), r * Math.cos(la) * Math.cos(lo));
  };

  // 海
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(R, segs, segs),
    new THREE.MeshPhongMaterial({ color: 0x0c1c33, emissive: 0x050d1a, specular: 0x1d3a5f, shininess: 18 })));
  // 大気の光（フレネル）
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.14, segs, segs), new THREE.ShaderMaterial({
    side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
    vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'varying vec3 vN; void main(){ float i = pow(0.72 - dot(vN, vec3(0.0,0.0,1.0)), 3.0); gl_FragColor = vec4(0.35,0.65,1.0,1.0) * i; }',
  }));
  scene.add(atmo);

  // 経緯線
  const grat = [];
  for (let lon = -180; lon < 180; lon += 30) for (let lat = -80; lat < 80; lat += 4) grat.push(vec(lat, lon, R * 1.001), vec(lat + 4, lon, R * 1.001));
  for (let lat = -60; lat <= 60; lat += 30) for (let lon = -180; lon < 180; lon += 4) grat.push(vec(lat, lon, R * 1.001), vec(lat, lon + 4, R * 1.001));
  globe.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(grat),
    new THREE.LineBasicMaterial({ color: 0x1f3554, transparent: true, opacity: 0.5 })));

  // 国境線（Natural Earth 110m）
  if (geo && geo.countries) {
    const base = [], focus = [];
    for (const c of geo.countries) {
      const arr = FOCUS_ISO.has(String(c.id)) ? focus : base;
      for (const ring of c.rings) {
        for (let i = 0; i + 3 < ring.length; i += 2) {
          arr.push(vec(ring[i + 1], ring[i], R * 1.002), vec(ring[i + 3], ring[i + 2], R * 1.002));
        }
      }
    }
    globe.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(base),
      new THREE.LineBasicMaterial({ color: 0x6f8fb5, transparent: true, opacity: 0.55 })));
    globe.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(focus),
      new THREE.LineBasicMaterial({ color: 0xf0a35e, transparent: true, opacity: 0.95 })));
  }

  // 光る点
  const glowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.2, 'rgba(255,200,140,.9)');
    grd.addColorStop(1, 'rgba(255,160,80,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const markers = {};
  for (const [code, p] of Object.entries(PLACES)) {
    const pos = vec(p.lat, p.lon, R * 1.01);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: p.home ? 0xffffff : 0xffb070, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    s.position.copy(pos);
    s.scale.setScalar(p.home ? 0.1 : 0.08);
    globe.add(s);
    markers[code] = s;
  }

  // 東京からの弧（大円 + 高度）
  const arcs = ARCS.map((code, i) => {
    const a = vec(PLACES.JP.lat, PLACES.JP.lon).normalize();
    const b = vec(PLACES[code].lat, PLACES[code].lon).normalize();
    const angle = a.angleTo(b);
    const n = lowPower ? 48 : 96;
    const pts = [];
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const v = new THREE.Vector3().copy(a).multiplyScalar(Math.sin((1 - t) * angle) / Math.sin(angle))
        .add(new THREE.Vector3().copy(b).multiplyScalar(Math.sin(t * angle) / Math.sin(angle)));
      v.normalize().multiplyScalar(R * (1.01 + Math.sin(Math.PI * t) * (0.12 + angle * 0.12)));
      pts.push(v);
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const core = new THREE.Mesh(new THREE.TubeGeometry(curve, n, 0.0045, 6, false),
      new THREE.MeshBasicMaterial({ color: [0xffc48a, 0x7fe3d6, 0xffe08a][i], transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
    const glow = new THREE.Mesh(new THREE.TubeGeometry(curve, n, 0.014, 6, false),
      new THREE.MeshBasicMaterial({ color: [0xff9a4a, 0x3fc7b6, 0xffc94a][i], transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
    const comet = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    comet.scale.setScalar(0.07);
    globe.add(glow, core, comet);
    return { core, glow, comet, curve, count: core.geometry.index.count, delay: i * 0.12 };
  });
  function setArcProgress(p) {
    for (const a of arcs) {
      const t = Math.min(1, Math.max(0, (p - 0.12 - a.delay) / 0.6));
      const cnt = Math.floor((a.count * t) / 36) * 36; // 6 radial × 6 index/quad
      a.core.geometry.setDrawRange(0, cnt);
      a.glow.geometry.setDrawRange(0, cnt);
      a.comet.visible = t > 0 && t < 1;
      if (a.comet.visible) a.comet.position.copy(a.curve.getPoint(t));
    }
  }

  // 向き: rotation.x = 緯度, rotation.y = -経度 でその地点が正面
  const rad = (d) => (d * Math.PI) / 180;
  const view = { rx: rad(PLACES.JP.lat), ry: -rad(PLACES.JP.lon), dist: 3.2 };
  let fitDist = 3.2;
  const tween = { active: false };
  function aimAt(lat, lon, ms = 900) {
    let to = -rad(lon);
    while (to - view.ry > Math.PI) to -= 2 * Math.PI;
    while (to - view.ry < -Math.PI) to += 2 * Math.PI;
    Object.assign(tween, { active: true, t0: performance.now(), ms: reduced ? 1 : ms, fx: view.rx, fy: view.ry, tx: rad(lat), ty: to });
  }
  focusHandler = (code) => { const p = PLACES[code]; aimAt(Math.min(p.lat, 40), p.lon); lastInteract = performance.now(); };
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  // サイズ
  function resize() {
    const w = host.clientWidth || window.innerWidth;
    const hh = host.clientHeight || window.innerHeight;
    renderer.setSize(w, hh, false);
    camera.aspect = w / hh;
    const vf = rad(camera.fov) / 2;
    const hf = Math.atan(Math.tan(vf) * camera.aspect);
    fitDist = (R * 1.12) / Math.sin(Math.min(vf, hf));
    if (isNarrow()) fitDist *= 1.05;
    view.dist = Math.min(Math.max(view.dist, fitDist * 0.45), fitDist * 1.6);
    if (!resize.done) { view.dist = fitDist; resize.done = true; }
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(host);
  resize();

  // 操作: ドラッグ回転、ホイール／ピンチ拡大
  const el = renderer.domElement;
  const ptrs = new Map();
  let lastInteract = 0;
  let moved = 0;
  let pinch0 = 0, dist0 = 0;
  el.addEventListener('pointerdown', (e) => {
    el.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved = 0;
    if (ptrs.size === 2) {
      const [p1, p2] = [...ptrs.values()];
      pinch0 = Math.hypot(p1.x - p2.x, p1.y - p2.y); dist0 = view.dist;
    }
    endIntro();
  });
  el.addEventListener('pointermove', (e) => {
    const prev = ptrs.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    ptrs.set(e.pointerId, cur);
    lastInteract = performance.now();
    tween.active = false;
    if (ptrs.size === 2) {
      const [p1, p2] = [...ptrs.values()];
      const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      if (pinch0 > 0) view.dist = Math.min(Math.max(dist0 * (pinch0 / d), fitDist * 0.45), fitDist * 1.6);
      return;
    }
    const k = 0.0045 * (view.dist / fitDist);
    view.ry += (cur.x - prev.x) * k;
    view.rx = Math.min(1.25, Math.max(-1.25, view.rx + (cur.y - prev.y) * k));
    moved += Math.abs(cur.x - prev.x) + Math.abs(cur.y - prev.y);
  });
  const up = (e) => {
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch0 = 0;
    if (e.type === 'pointerup' && moved < 4) closeCard();
  };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('wheel', (e) => {
    e.preventDefault();
    lastInteract = performance.now();
    view.dist = Math.min(Math.max(view.dist * (1 + Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 100) * 0.0012), fitDist * 0.45), fitDist * 1.6);
  }, { passive: false });

  // 開場アニメーション
  let introStart = null;
  let introDone = reduced;
  function endIntro() {
    if (introDone) return;
    introDone = true;
    setArcProgress(1);
    view.rx = rad(TARGET.lat); view.ry = -rad(TARGET.lon);
    $('intro').hidden = true;
    lastInteract = performance.now();
  }
  $('skip').addEventListener('click', endIntro);
  if (!introDone) $('intro').hidden = false; else { setArcProgress(1); view.rx = rad(TARGET.lat); view.ry = -rad(TARGET.lon); }

  // 描画ループ
  const tmp = new THREE.Vector3();
  let last = performance.now();
  let running = true;
  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    if (document.hidden) return;
    const dt = Math.min(64, now - last); last = now;
    if (!introDone) {
      if (introStart === null) introStart = now;
      const p = Math.min(1, (now - introStart) / INTRO_MS);
      const e = ease(p);
      view.rx = rad(PLACES.JP.lat) + (rad(TARGET.lat) - rad(PLACES.JP.lat)) * e;
      view.ry = -rad(PLACES.JP.lon) + (-rad(TARGET.lon) + rad(PLACES.JP.lon)) * e;
      setArcProgress(p * 1.05);
      if (p >= 1) endIntro();
    } else if (tween.active) {
      const t = Math.min(1, (now - tween.t0) / tween.ms);
      const e = ease(t);
      view.rx = tween.fx + (tween.tx - tween.fx) * e;
      view.ry = tween.fy + (tween.ty - tween.fy) * e;
      if (t >= 1) tween.active = false;
    } else if (!reduced && ptrs.size === 0 && now - lastInteract > 6000 && card.hidden) {
      view.ry += dt * 0.00005; // 空き時間はゆっくり自転
    }
    globe.rotation.set(view.rx, view.ry, 0);
    camera.position.set(0, 0, view.dist);
    camera.lookAt(0, 0, 0);
    if (!reduced) {
      const pulse = 1 + 0.18 * Math.sin(now / 420);
      for (const [code, s] of Object.entries(markers)) s.scale.setScalar((PLACES[code].home ? 0.1 : 0.08) * pulse);
    }
    renderer.render(scene, camera);
    // HTML ラベルを投影位置へ
    const w = host.clientWidth, hh = host.clientHeight;
    const horizon = R / view.dist + 0.06;
    for (const [code, s] of Object.entries(markers)) {
      s.getWorldPosition(tmp);
      const facing = tmp.clone().normalize().dot(camera.position.clone().normalize());
      tmp.project(camera);
      placePin(code, (tmp.x + 1) / 2 * w, (1 - tmp.y) / 2 * hh, facing > horizon);
    }
    declutter();
  }
  requestAnimationFrame(frame);
  return {
    stop() { running = false; host.hidden = true; },
    resume() { if (running) return; running = true; host.hidden = false; last = performance.now(); requestAnimationFrame(frame); },
  };
}

// ---------------- 2D（SVG 静的地図。WebGL 不可・動きを減らす設定のとき） ----------------
function start2D(geo) {
  const host = $('svg-host');
  host.hidden = false;
  const S = 8;
  const W = 135 * S, H = 70 * S; // 経度 15〜150, 緯度 -20〜50
  const px = (lon) => (lon - 15) * S;
  const py = (lat) => (50 - lat) * S;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', '東京と東アフリカ・中東を結ぶ地図');
  const mk = (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); return n; };
  svg.append(mk('rect', { x: -2000, y: -2000, width: 6000, height: 6000, fill: 'transparent' }));
  const gGrid = mk('g', { stroke: '#1f3554', 'stroke-width': 1, opacity: 0.6 });
  for (let lon = 30; lon <= 150; lon += 30) gGrid.append(mk('line', { x1: px(lon), y1: 0, x2: px(lon), y2: H }));
  for (let lat = -15; lat <= 45; lat += 15) gGrid.append(mk('line', { x1: 0, y1: py(lat), x2: W, y2: py(lat) }));
  svg.append(gGrid);
  if (geo && geo.countries) {
    const g = mk('g', { 'stroke-linejoin': 'round' });
    for (const c of geo.countries) {
      const focus = FOCUS_ISO.has(String(c.id));
      let d = '';
      for (const ring of c.rings) {
        let inside = false;
        for (let i = 0; i < ring.length; i += 2) if (ring[i] > 0 && ring[i] < 170 && ring[i + 1] > -40 && ring[i + 1] < 70) { inside = true; break; }
        if (!inside) continue;
        d += 'M' + ring.reduce((acc, v, i) => acc + (i % 2 ? `,${(50 - v) * S}` : `${i ? 'L' : ''}${((v - 15) * S).toFixed(1)}`), '') + 'Z';
      }
      if (d) g.append(mk('path', { d, fill: focus ? 'rgba(240,163,94,.22)' : '#13233a', stroke: focus ? '#f0a35e' : '#3d5a7d', 'stroke-width': focus ? 1.6 : 1 }));
    }
    svg.append(g);
  }
  const colors = ['#ffc48a', '#7fe3d6', '#ffe08a'];
  ARCS.forEach((code, i) => {
    const a = PLACES.JP, b = PLACES[code];
    const x1 = px(a.lon), y1 = py(a.lat), x2 = px(b.lon), y2 = py(b.lat);
    const len = Math.hypot(x2 - x1, y2 - y1);
    const path = mk('path', { d: `M${x1},${y1} Q${(x1 + x2) / 2},${Math.min(y1, y2) - len * (0.22 + i * 0.05)} ${x2},${y2}`, fill: 'none', stroke: colors[i], 'stroke-width': 2.4, 'stroke-linecap': 'round', opacity: 0.9 });
    svg.append(path);
  });
  host.replaceChildren(svg);

  function layout() {
    // 縦長画面では紅海・アフリカの角を中心に切り出す
    const r = host.getBoundingClientRect();
    const portrait = r.width / Math.max(1, r.height) < 1.1;
    const vb = portrait ? { x: px(26), y: py(34), w: 44 * S, h: 44 * S } : { x: 0, y: 0, w: W, h: H };
    svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    const sr = svg.getBoundingClientRect();
    const sc = Math.min(sr.width / vb.w, sr.height / vb.h);
    const ox = sr.left + (sr.width - vb.w * sc) / 2;
    const oy = sr.top + (sr.height - vb.h * sc) / 2;
    for (const [code, p] of Object.entries(PLACES)) {
      const x = ox + (px(p.lon) - vb.x) * sc;
      const y = oy + (py(p.lat) - vb.y) * sc;
      placePin(code, x, y, x > sr.left - 2 && x < sr.right - 20 && y > sr.top && y < sr.bottom);
    }
    declutter();
  }
  new ResizeObserver(layout).observe(host);
  layout();
  return { layout };
}

// ---------------- 起動 ----------------
async function main() {
  const [iss, geo, bas] = await Promise.all([
    getJson('issues/latest.json').catch(() => null),
    getJson('assets/geo/countries-110m.json').catch(() => null),
    getJson('assets/data/countries.json').catch(() => null),
  ]);
  issue = iss;
  basics = bas;
  buildInfo();
  renderPanel();
  buildPins();

  const toggle = $('mode-toggle');
  let three = null, flat = null, mode = '2d';
  if (webglOk()) {
    try { three = await start3D(geo); three.focus = focusHandler; mode = '3d'; } catch (e) { console.warn('3D を開始できませんでした', e); three = null; }
  }
  if (mode === '2d') { flat = start2D(geo); $('hint').textContent = '地点をクリックすると基本情報と今週の信号を表示します'; }
  $('loading').hidden = true;

  if (three) {
    toggle.hidden = false;
    toggle.addEventListener('click', () => {
      closeCard();
      if (mode === '3d') {
        three.stop(); $('intro').hidden = true;
        if (!flat) flat = start2D(geo); else { $('svg-host').hidden = false; flat.layout(); }
        mode = '2d'; focusHandler = null;
        toggle.textContent = '3D 地球儀で見る';
      } else {
        $('svg-host').hidden = true; three.resume(); mode = '3d'; focusHandler = three.focus;
        toggle.textContent = '2D 地図で見る';
      }
    });
  }
}
main();
