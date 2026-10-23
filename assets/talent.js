// ビジネスマッチング ② 人材育成: 「日本とエチオピア：人材の現状」地球儀（遅延読み込み・SVG 代替・文字版）
import { createGlobe, createFlatMap, webglOk, reducedMotion } from './globe-core.js';

const $ = (id) => document.getElementById(id);
function h(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, String(v));
  }
  for (const c of kids) if (c != null) n.append(c);
  return n;
}
const isUrl = (u) => /^https:\/\//.test(u || '');

function factRows(items) {
  return items.flatMap((it) => [
    h('dt', { text: it.label }),
    h('dd', null,
      h('span', { class: it.value === 'データ確認中' ? 'tg-pending' : 'tg-val', text: it.value }),
      it.year || it.source ? h('small', null, [it.year, ''].filter(Boolean).join(''), it.year && it.source ? ' ・ ' : '',
        isUrl(it.url) ? h('a', { href: it.url, target: '_blank', rel: 'noopener noreferrer', text: it.source }) : (it.source || '')) : null),
  ]);
}

async function main() {
  const stage = $('tg-stage');
  if (!stage) return;
  let data;
  try { data = await (await fetch('assets/data/talent.json')).json(); } catch { $('tg-loading').textContent = 'データを読み込めませんでした'; return; }

  // 文字版（常に表示）
  $('tg-jp').replaceChildren(...factRows(data.japan.items));
  $('tg-et').replaceChildren(...factRows(data.ethiopia.items));
  const d = data.destinations;
  $('tg-dest').replaceChildren(h('b', { text: '海外就労の主な行き先：' }), d.list.map((x) => x.name).join('、') + '。',
    h('br'), h('small', null, d.note + ' 出典：', h('a', { href: d.url, target: '_blank', rel: 'noopener noreferrer', text: d.source })));
  $('ben-jp').replaceChildren(...data.benefits.japan.map((t) => h('li', { text: t })));
  $('ben-et').replaceChildren(...data.benefits.ethiopia.map((t) => h('li', { text: t })));
  $('tg-updated').textContent = `データ更新日：${data.updated}。出典で確認できない項目は「データ確認中」と表示しています（推計による補完はしていません）。`;

  // 地図上の地点
  const places = {
    JP: { lat: 35.68, lon: 139.69, color: 0xffffff, name: '日本', city: '東京' },
    ET: { lat: 9.03, lon: 38.74, color: 0xffb070, name: 'エチオピア', city: 'アディスアベバ' },
  };
  for (const x of d.list) places[x.code] = { lat: x.lat, lon: x.lon, color: 0x7fe3d6, name: x.name, city: x.city, note: x.note, count: x.count };
  // 線の太さ: 人数データがある場合のみ相対値、ない場合は一律
  const counts = d.list.map((x) => x.count).filter((n) => typeof n === 'number' && n > 0);
  const maxC = counts.length ? Math.max(...counts) : 0;
  const arcs = [
    { from: 'JP', to: 'ET', color: 0xffc48a, css: '#ffc48a', width: 1.6 },
    ...d.list.map((x) => ({ from: 'ET', to: x.code, color: 0x7fe3d6, css: '#7fe3d6', width: maxC && x.count ? 0.6 + 1.6 * (x.count / maxC) : 0.8 })),
  ];
  const focusIso = new Set(['392', '231', '682', '784', '414', '634', '400', '422']);

  const labels = $('tg-labels');
  const pins = {};
  for (const [code, p] of Object.entries(places)) {
    const b = h('button', { class: `w-pin${code === 'JP' ? ' home' : ''}`, type: 'button', 'aria-label': `${p.name}の情報` },
      h('span', { class: 'dot' }), h('span', { class: 'lbl', text: code === 'JP' || code === 'ET' ? p.name : p.city }));
    b.addEventListener('click', () => openCard(code));
    labels.append(b);
    pins[code] = b;
  }
  const pos = {};
  let pending = false;
  const PRI = ['JP', 'ET', 'SA', 'AE', 'KW', 'QA', 'JO', 'LB'];
  function declutter() {
    pending = false;
    const taken = [];
    for (const code of PRI) {
      const b = pins[code], p = pos[code];
      if (!b || !p || b.classList.contains('back')) continue;
      const w = b.offsetWidth || 60;
      const r = { x0: p.x - 8, x1: p.x - 8 + w, y0: p.y - 11, y1: p.y + 11 };
      const hit = taken.some((t) => r.x0 < t.x1 && r.x1 > t.x0 && r.y0 < t.y1 && r.y1 > t.y0);
      b.classList.toggle('nolbl', hit);
      taken.push({ x0: p.x - 8, x1: p.x + 8, y0: p.y - 8, y1: p.y + 8 });
      if (!hit) taken.push(r);
    }
  }
  const place = (code, x, y, vis) => {
    const b = pins[code]; b.style.left = `${x}px`; b.style.top = `${y}px`; b.classList.toggle('back', !vis);
    pos[code] = { x, y };
    if (!pending) { pending = true; requestAnimationFrame(declutter); }
  };

  function openCard(code) {
    const p = places[code];
    const body = $('tg-card-body');
    if (code === 'JP' || code === 'ET') {
      const items = (code === 'JP' ? data.japan : data.ethiopia).items;
      body.replaceChildren(h('dl', { class: 'tg-mini' }, ...factRows(items.slice(0, code === 'JP' ? 5 : 5))));
    } else {
      body.replaceChildren(h('p', { text: p.note || '' }),
        h('p', { class: 'tg-pending', text: typeof p.count === 'number' ? `${p.count.toLocaleString('ja-JP')}人` : '人数：データ確認中' }),
        h('small', null, '出典：', h('a', { href: d.url, target: '_blank', rel: 'noopener noreferrer', text: d.source })));
    }
    $('tg-card-title').textContent = code === 'JP' || code === 'ET' ? p.name : `${p.name}（${p.city}）`;
    $('tg-card').hidden = false;
  }
  $('tg-card-x').addEventListener('click', () => { $('tg-card').hidden = true; });

  // 画面に入ったときにだけ 3D を読み込む
  const start = async () => {
    const host = $('tg-canvas');
    if (!reducedMotion() && webglOk()) {
      try {
        await createGlobe({ host, geo: await geoP(), places, arcs, focusIso, view: { lat: 18, lon: 70 }, place });
        $('tg-loading').hidden = true;
        return;
      } catch (e) { console.warn('3D を開始できませんでした', e); }
    }
    stage.classList.add('flat');
    $('tg-hint').textContent = '地点を選ぶと数値を表示します';
    createFlatMap({ host, geo: await geoP(), places, arcs, focusIso, bbox: { lon0: 25, lon1: 150, lat0: -5, lat1: 47 }, place });
    $('tg-loading').hidden = true;
  };
  let geoCache = null;
  const geoP = () => geoCache || (geoCache = fetch('assets/geo/countries-110m.json').then((r) => r.json()).catch(() => null));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); start(); } }, { rootMargin: '200px' });
    io.observe(stage);
  } else start();
}
main();
