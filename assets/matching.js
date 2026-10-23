// /matching.html — 品目カテゴリ、サプライチェーン図（3D / SVG）、参加申込フォーム
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';

// 一般的な流れのみ（特定の企業名・数値は記載しない）
const EXPORT_TAIL = [
  { k: '陸送', s: 'アディス〜ジブチ回廊', d: 'トラックまたは鉄道でアディスアベバ周辺からジブチ港へ。治安や道路状況により所要日数が変わるため、余裕を見た計画が必要です。' },
  { k: 'ジブチ港', s: 'コンテナ積み', d: '内陸国エチオピアの主要な玄関口。通関書類の確認後、コンテナで本船に積み込みます。' },
  { k: '海上輸送', s: '紅海・アデン湾', d: '紅海を経て日本・中東へ。航路の安全状況により、経路変更や保険料の上乗せが生じることがあります。' },
];
const IMPORT_HEAD = [
  { k: '海上輸送', s: '紅海・アデン湾', d: '積出港から紅海を経てジブチへ。航路の安全状況により、経路変更や保険料の上乗せが生じることがあります。' },
  { k: 'ジブチ港', s: '荷揚げ・通関準備', d: '荷揚げ後、エチオピア向けのトランジット手続きを行います。書類の不備は滞留の原因になります。' },
  { k: '陸送', s: 'ジブチ〜アディス回廊', d: 'トラックまたは鉄道でエチオピア国内へ。輸入許可や外貨の手当てを事前に確認しておく必要があります。' },
];
const CHAINS = {
  coffee: {
    title: 'コーヒー', dir: '輸出 ・ エチオピア → 日本・中東', export: true,
    lead: 'コーヒー発祥の地とされるエチオピアの豆を、日本・中東のロースターや商社へ。品質・トレーサビリティの確認が取引の要になります。',
    nodes: [
      { k: '産地・生産者', s: '農家・協同組合', d: '小規模農家や協同組合が栽培・収穫します。産地や標高、品種が風味と価格を左右します。' },
      { k: '加工・選別', s: '精製・等級選別', d: 'ウォッシュドやナチュラルなどの方法で精製し、欠点豆の除去や等級の選別を行います。' },
      { k: '輸出業者', s: '輸出手続き・品質検査', d: '輸出許可を持つ事業者が品質検査や書類を整え、契約条件に沿って出荷を手配します。' },
      ...EXPORT_TAIL,
      { k: '輸入者', s: '日本・中東', d: 'ロースター、商社、食品メーカーなど。サンプル確認や規格の合意を経て継続取引につなげます。' },
    ],
  },
  sesame: {
    title: 'ゴマ・油糧種子', dir: '輸出 ・ エチオピア → 日本・中東', export: true,
    lead: 'エチオピアの主要輸出品の一つであるゴマなどの油糧種子を、日本・中東の食品・搾油メーカーへ。異物・残留物の検査対応が重要です。',
    nodes: [
      { k: '産地・生産者', s: '農家・集荷業者', d: '農家が栽培し、集荷業者が地域ごとに取りまとめます。収穫期と品質のばらつきに注意が必要です。' },
      { k: '加工・選別', s: '洗浄・選別・袋詰め', d: '洗浄・選別で異物を除き、規格に合わせて袋詰めします。輸入国の基準に合わせた検査を行います。' },
      { k: '輸出業者', s: '輸出手続き・検査証明', d: '輸出許可を持つ事業者が検査証明などの書類を整え、出荷を手配します。' },
      ...EXPORT_TAIL,
      { k: '輸入者', s: '日本・中東', d: '食品メーカー、搾油メーカー、商社など。用途に応じた規格と検査項目の合意が取引の前提になります。' },
    ],
  },
  tires: {
    title: 'タイヤ', dir: '輸入 ・ 中国・日本・中東 → エチオピア', export: false,
    lead: '物流・建設需要を背景にしたトラック・乗用車用タイヤの輸入。サイズ・規格の適合とアフターサービスの体制が選定のポイントです。',
    nodes: [
      { k: '工場', s: '中国・日本・中東', d: 'タイヤメーカーの工場。用途（トラック、バス、乗用車、建機など）とサイズ・規格を確認します。' },
      { k: '積出港', s: '輸出通関', d: '工場近くの港で輸出通関を行い、コンテナで出荷します。' },
      ...IMPORT_HEAD,
      { k: '輸入者', s: 'エチオピア', d: '輸入許可を持つ事業者が通関・納税を行います。外貨の手当てが取引の前提になります。' },
      { k: '販売店・利用者', s: '販売店・運送会社など', d: '販売店や運送会社などのフリートへ。交換・保守の体制が継続的な需要につながります。' },
    ],
  },
  building: {
    title: '建材', dir: '輸入 ・ 中国・日本・中東 → エチオピア', export: false,
    lead: '都市開発や工業団地の整備に伴う建材の輸入。品目ごとの規格・認証と、重量物輸送のコスト管理がポイントです。',
    nodes: [
      { k: '工場', s: '中国・日本・中東', d: '鋼材、タイル、衛生陶器、断熱材など建材メーカーの工場。現地の規格・認証との適合を確認します。' },
      { k: '積出港', s: '輸出通関', d: '工場近くの港で輸出通関を行い、コンテナやバラ積みで出荷します。' },
      ...IMPORT_HEAD,
      { k: '輸入者', s: 'エチオピア', d: '輸入許可を持つ事業者が通関・納税を行います。外貨の手当てと納期管理が重要です。' },
      { k: '販売店・現場', s: '販売店・建設現場', d: '販売店や建設会社・現場へ。数量と納期の確実さが信頼につながります。' },
    ],
  },
};

const $ = (id) => document.getElementById(id);
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const narrow = () => window.matchMedia('(max-width: 640px)').matches;
const lowPower = window.matchMedia('(pointer: coarse)').matches || narrow();
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
function webglOk() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

// ---------- ノードのラベルと説明 ----------
const tip = $('chain-tip');
const labelsHost = $('chain-labels');
let labelEls = [];
let openIdx = -1;
function buildLabels(nodes) {
  labelEls = nodes.map((n, i) => {
    const b = h('button', { class: 'm-node', type: 'button', 'aria-expanded': 'false', 'aria-describedby': 'chain-tip' },
      `${i + 1}. ${n.k}`, h('small', { text: n.s }));
    const show = () => showTip(i);
    b.addEventListener('mouseenter', show);
    b.addEventListener('focus', show);
    b.addEventListener('click', () => (openIdx === i ? hideTip() : showTip(i)));
    b.addEventListener('mouseleave', () => { if (document.activeElement !== b) hideTip(); });
    b.addEventListener('blur', hideTip);
    return b;
  });
  labelsHost.replaceChildren(...labelEls);
}
let curNodes = [];
function showTip(i) {
  openIdx = i;
  const n = curNodes[i];
  tip.replaceChildren(h('b', { text: `${i + 1}. ${n.k}（${n.s}）` }), n.d);
  tip.hidden = false;
  labelEls.forEach((el, j) => el.setAttribute('aria-expanded', j === i ? 'true' : 'false'));
  positionTip();
}
function hideTip() {
  openIdx = -1;
  tip.hidden = true;
  labelEls.forEach((el) => el.setAttribute('aria-expanded', 'false'));
}
function positionTip() {
  if (openIdx < 0 || tip.hidden) return;
  const host = $('chain').getBoundingClientRect();
  const el = labelEls[openIdx].getBoundingClientRect();
  let x = el.left - host.left + el.width / 2 - tip.offsetWidth / 2;
  x = Math.max(8, Math.min(host.width - tip.offsetWidth - 8, x));
  let y = el.bottom - host.top + 8;
  if (y + tip.offsetHeight > host.height - 8) y = el.top - host.top - tip.offsetHeight - 8;
  tip.style.left = `${x}px`;
  tip.style.top = `${y}px`;
}
function placeLabel(i, x, y, visible = true) {
  const el = labelEls[i];
  if (!el) return;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.classList.toggle('hide', !visible);
}

// ---------- レイアウト（3D/2D 共通の座標: 横長は左→右、縦長はジグザグで上→下） ----------
function layout(count, portrait) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    if (portrait) pts.push({ x: (i % 2 ? 1 : -1) * 1.1, y: 4.6 - t * 9.2, z: Math.sin(t * Math.PI) * 0.8 });
    else pts.push({ x: -6.6 + t * 13.2, y: Math.sin(t * Math.PI * 1.5) * 0.7, z: Math.sin(t * Math.PI) * -1.4 });
  }
  return pts;
}

// ---------- 3D ----------
let THREE = null;
let three3d = null;
async function mount3D(chain) {
  if (!THREE) THREE = await import(THREE_URL);
  const host = $('chain-canvas');
  host.hidden = false;
  if (three3d) three3d.dispose();
  const renderer = new THREE.WebGLRenderer({ antialias: !lowPower, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2));
  host.replaceChildren(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  scene.add(new THREE.AmbientLight(0x9fb4d8, 1.2));
  const dl = new THREE.DirectionalLight(0xffffff, 1.4);
  dl.position.set(3, 6, 5);
  scene.add(dl);
  const world = new THREE.Group();
  scene.add(world);

  let portrait = host.clientWidth / Math.max(1, host.clientHeight) < 1;
  const P = layout(chain.nodes.length, portrait).map((p) => new THREE.Vector3(p.x, p.y, p.z));
  const grid = new THREE.GridHelper(portrait ? 10 : 18, portrait ? 10 : 18, 0x24406a, 0x15263f);
  grid.position.y = portrait ? -5.4 : -1.6;
  if (portrait) { grid.rotation.x = Math.PI / 2; grid.position.set(0, 0, -1.2); }
  world.add(grid);

  const accent = chain.export ? 0xf0a35e : 0x5fd4c4;
  const curve = new THREE.CatmullRomCurve3(P, false, 'catmullrom', 0.3);
  const segs = lowPower ? 120 : 240;
  world.add(new THREE.Mesh(new THREE.TubeGeometry(curve, segs, 0.03, 8, false),
    new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.9 })));
  world.add(new THREE.Mesh(new THREE.TubeGeometry(curve, segs, 0.09, 8, false),
    new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false })));

  const nodeGeo = new THREE.CylinderGeometry(0.42, 0.48, 0.18, lowPower ? 24 : 48);
  const coreGeo = new THREE.SphereGeometry(0.16, 24, 16);
  const nodes = P.map((p, i) => {
    const g = new THREE.Group();
    g.position.copy(p);
    const base = new THREE.Mesh(nodeGeo, new THREE.MeshStandardMaterial({ color: 0x1b2d4a, metalness: 0.3, roughness: 0.5, emissive: 0x0a1424 }));
    if (portrait) base.rotation.x = Math.PI / 2;
    const core = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: i === 0 || i === P.length - 1 ? 0xffffff : accent }));
    core.position.y = portrait ? 0 : 0.2;
    if (portrait) core.position.z = 0.2;
    g.add(base, core);
    world.add(g);
    return g;
  });

  // 流れを表す粒子
  const pc = lowPower ? 18 : 36;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(pc * 3);
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xfff1dc, size: lowPower ? 0.09 : 0.07, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
  world.add(particles);

  const view = { ry: portrait ? 0 : -0.18, rx: portrait ? 0.05 : 0.32 };
  function resize() {
    const w = host.clientWidth, hh = host.clientHeight;
    renderer.setSize(w, hh, false);
    camera.aspect = w / hh;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  // ドラッグで回転（横方向のみ。縦スクロールは妨げない）
  let drag = null, lastInteract = 0;
  const el = renderer.domElement;
  el.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; lastInteract = performance.now(); });
  el.addEventListener('pointermove', (e) => {
    if (!drag) return;
    view.ry = Math.max(-0.9, Math.min(0.9, view.ry + (e.clientX - drag.x) * 0.006));
    view.rx = Math.max(-0.2, Math.min(0.7, view.rx + (e.clientY - drag.y) * 0.003));
    drag = { x: e.clientX, y: e.clientY };
    lastInteract = performance.now();
  });
  const end = () => { drag = null; };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointerleave', end);
  el.addEventListener('pointercancel', end);

  const tmp = new THREE.Vector3();
  let running = true, raf = 0;
  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    if (!reduced && !drag && now - lastInteract > 3000) view.ry = Math.sin(now / 5200) * 0.22 + (portrait ? 0 : -0.1);
    world.rotation.set(view.rx, view.ry, 0);
    camera.position.set(0, portrait ? 0 : 1.2, portrait ? 13.5 : (camera.aspect < 1.6 ? 14.5 : 12));
    camera.lookAt(0, portrait ? 0 : -0.2, 0);
    for (let i = 0; i < pc; i++) {
      const t = (((reduced ? 0 : now / 9000) + i / pc) % 1);
      curve.getPoint(t, tmp); // ノードは流れの順に並んでいる
      pPos[i * 3] = tmp.x; pPos[i * 3 + 1] = tmp.y; pPos[i * 3 + 2] = tmp.z;
    }
    pGeo.attributes.position.needsUpdate = true;
    if (!reduced) nodes.forEach((g, i) => { g.children[1].scale.setScalar(1 + 0.15 * Math.sin(now / 400 + i)); });
    renderer.render(scene, camera);
    const w = host.clientWidth, hh = host.clientHeight;
    nodes.forEach((g, i) => {
      g.getWorldPosition(tmp);
      tmp.project(camera);
      placeLabel(i, (tmp.x + 1) / 2 * w, (1 - tmp.y) / 2 * hh, tmp.z < 1);
    });
    positionTip();
  }
  raf = requestAnimationFrame(frame);
  three3d = {
    dispose() {
      running = false; cancelAnimationFrame(raf); ro.disconnect();
      renderer.dispose(); host.replaceChildren();
    },
  };
}

// ---------- 2D（SVG フローチャート） ----------
function mount2D(chain) {
  const host = $('chain-svg');
  host.hidden = false;
  $('chain-canvas').hidden = true;
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); return n; };
  function draw() {
    const W = host.clientWidth || 800, H = host.clientHeight || 440;
    const portrait = W / H < 1;
    const n = chain.nodes.length;
    const pts = chain.nodes.map((_, i) => {
      const t = n === 1 ? 0.5 : i / (n - 1);
      return portrait
        ? { x: W * (i % 2 ? 0.66 : 0.34), y: 40 + t * (H - 110) }
        : { x: 60 + t * (W - 120), y: H * 0.42 + Math.sin(t * Math.PI * 1.5) * H * 0.08 };
    });
    const svg = mk('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `${chain.title}のサプライチェーン（一般的な流れ）` });
    const accent = chain.export ? '#f0a35e' : '#5fd4c4';
    const defs = mk('defs', {});
    const marker = mk('marker', { id: 'arrow', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' });
    marker.append(mk('path', { d: 'M0,0 L10,5 L0,10 z', fill: accent }));
    defs.append(marker);
    svg.append(defs);
    for (let i = 0; i < n - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
      const ux = dx / len, uy = dy / len;
      svg.append(mk('line', { x1: a.x + ux * 16, y1: a.y + uy * 16, x2: b.x - ux * 18, y2: b.y - uy * 18, stroke: accent, 'stroke-width': 2.5, 'marker-end': 'url(#arrow)', opacity: 0.9 }));
    }
    pts.forEach((p, i) => {
      svg.append(mk('circle', { cx: p.x, cy: p.y, r: 12, fill: '#1b2d4a', stroke: i === 0 || i === n - 1 ? '#ffffff' : accent, 'stroke-width': 3 }));
    });
    host.replaceChildren(svg);
    pts.forEach((p, i) => placeLabel(i, p.x, p.y));
    positionTip();
  }
  draw();
  const ro = new ResizeObserver(draw);
  ro.observe(host);
  three3d = { dispose() { ro.disconnect(); host.replaceChildren(); host.hidden = true; } };
}

// ---------- カテゴリ選択 ----------
let use3D = !reduced && webglOk();
let current = null;
async function selectCat(cat, scroll) {
  const chain = CHAINS[cat];
  if (!chain) return;
  current = cat;
  document.querySelectorAll('.m-cat').forEach((b) => b.setAttribute('aria-selected', b.dataset.cat === cat ? 'true' : 'false'));
  $('m-detail').hidden = false;
  $('d-dir').textContent = chain.dir;
  $('d-title').textContent = chain.title;
  $('d-lead').textContent = chain.lead;
  $('chain-text').replaceChildren(...chain.nodes.map((n) => h('li', null, h('b', { text: `${n.k}（${n.s}）` }), `：${n.d}`)));
  curNodes = chain.nodes;
  hideTip();
  buildLabels(chain.nodes);
  if (three3d) { three3d.dispose(); three3d = null; }
  if (use3D) {
    try { await mount3D(chain); $('chain-svg').hidden = true; }
    catch (e) { console.warn('3D を開始できませんでした', e); use3D = false; mount2D(chain); }
  } else mount2D(chain);
  if (scroll) { try { history.replaceState(null, '', `#${cat}`); } catch {} }
  if (scroll) $('m-detail').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
}
document.querySelectorAll('.m-cat').forEach((b) => b.addEventListener('click', () => selectCat(b.dataset.cat, true)));

// ---------- 申込フォーム ----------
const form = $('m-form');
const msg = $('m-msg');
document.querySelectorAll('.m-actions [data-side]').forEach((b) => b.addEventListener('click', () => {
  $('apply').hidden = false;
  $('m-done').hidden = true;
  form.hidden = false;
  form.elements.category.value = current || 'coffee';
  form.querySelector(`input[name=side][value=${b.dataset.side}]`).checked = true;
  $('apply').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  setTimeout(() => form.elements.company.focus({ preventScroll: true }), reduced ? 0 : 400);
}));
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const body = Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v).trim()]));
  body.consent = form.elements.consent.checked;
  const missing = ['company', 'contact_name', 'country', 'email', 'item'].filter((k) => !body[k]);
  if (!body.side) missing.push('side');
  if (missing.length) { msg.textContent = '必須項目を入力してください'; msg.className = 'form-msg err'; return; }
  if (!body.consent) { msg.textContent = '利用規約・プライバシーポリシーへの同意が必要です'; msg.className = 'form-msg err'; return; }
  const btn = form.querySelector('button[type=submit]');
  btn.disabled = true;
  msg.textContent = '送信しています…'; msg.className = 'form-msg';
  try {
    await window.PH.send('ビジネスマッチングのお申込み', body);
    form.reset();
    form.hidden = true;
    msg.textContent = '';
    $('m-done').hidden = false;
    $('m-done').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
  } catch (ex) {
    msg.textContent = ex.message; msg.className = 'form-msg err';
  } finally { btn.disabled = false; }
});
$('m-again').addEventListener('click', () => { $('m-done').hidden = true; form.hidden = false; });

// 関心を登録した企業数
fetch('/api/trade/stats').then((r) => (r.ok ? r.json() : null)).then((d) => {
  if (!d) return;
  document.querySelectorAll('.m-cat').forEach((b) => {
    const n = d.interest[b.dataset.cat] || 0;
    const c = b.querySelector('[data-count]');
    if (c) c.textContent = n ? `関心を登録した企業 ${n} 社` : '関心登録の受付を開始しました';
  });
  const rc = document.getElementById('req-count');
  if (rc) rc.textContent = d.requests ? `これまでのリクエスト ${d.requests} 件` : '';
}).catch(() => {});

// 初期表示: #coffee などのハッシュ、なければコーヒー
const initial = (location.hash || '').slice(1);
selectCat(CHAINS[initial] ? initial : 'coffee', false);
