// 号ページ: 閲覧数・リアクション・コメント
(function () {
  const { store, browserId, api, el, fmtDateTime } = window.PH;
  const slug = document.body.dataset.slug;
  if (!slug) return;

  // ---- 閲覧数（ブラウザ側でも 30 分に 1 回だけ送信） ----
  const viewsEl = document.getElementById('views');
  const VIEW_KEY = `ph_view_${slug}`;
  const showViews = (n) => { if (viewsEl) viewsEl.textContent = `閲覧 ${Number(n).toLocaleString('ja-JP')}`; };
  (async () => {
    const last = Number(store.get(VIEW_KEY) || 0);
    try {
      const count = Date.now() - last > 30 * 60 * 1000;
      const n = await window.PH.views(slug, count);
      if (count) store.set(VIEW_KEY, String(Date.now()));
      showViews(n);
    } catch { if (viewsEl) viewsEl.textContent = ''; }
  })();

  // ---- リアクション ----
  const bid = browserId();
  const buttons = [...document.querySelectorAll('.rx[data-kind]')];
  function applyRx(d) {
    for (const b of buttons) {
      const k = b.dataset.kind;
      b.querySelector('.n').textContent = String((d.counts && d.counts[k]) || 0);
      b.setAttribute('aria-pressed', d.mine && d.mine.includes(k) ? 'true' : 'false');
    }
  }
  api(`/api/reactions?slug=${encodeURIComponent(slug)}&vid=${encodeURIComponent(bid)}`).then(applyRx).catch(() => {});
  for (const b of buttons) {
    b.addEventListener('click', async () => {
      const on = b.getAttribute('aria-pressed') !== 'true';
      b.disabled = true;
      try {
        applyRx(await api('/api/reactions', { method: 'POST', body: { slug, kind: b.dataset.kind, vid: bid, on } }));
      } catch {} finally { b.disabled = false; }
    });
  }

  // ---- コメント ----
  const list = document.getElementById('comment-list');
  const form = document.getElementById('comment-form');
  const msg = document.getElementById('comment-msg');
  const count = document.getElementById('comment-count');
  function item(c) {
    return el('li', null,
      el('div', { class: 'who' }, c.nickname || '匿名の読者', el('span', { class: 'when', text: fmtDateTime(c.created_at) })),
      el('p', { class: 'body', text: c.body }));
  }
  function setCount() { if (count) count.textContent = list.children.length ? `（${list.children.length}）` : ''; }
  api(`/api/comments?slug=${encodeURIComponent(slug)}`)
    .then((d) => { list.replaceChildren(...(d.comments || []).map(item)); setCount(); })
    .catch(() => {});
  if (form) form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const body = String(fd.get('body') || '').trim();
    if (!body) { msg.textContent = 'コメントを入力してください'; msg.className = 'form-msg err'; return; }
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    msg.textContent = '送信しています…'; msg.className = 'form-msg';
    try {
      const d = await api('/api/comments', { method: 'POST', body: {
        slug, body, nickname: String(fd.get('nickname') || ''), website: String(fd.get('website') || ''),
      } });
      if (d.comment) { list.append(item(d.comment)); setCount(); }
      form.reset();
      msg.textContent = 'コメントを掲載しました。ありがとうございます。';
    } catch (ex) {
      msg.textContent = ex.message || '送信できませんでした'; msg.className = 'form-msg err';
    } finally { btn.disabled = false; }
  });
})();

// 目次・スクロール位置・読書進捗・前後の号
(function () {
  const { api, el } = window.PH;
  const slug = document.body.dataset.slug;
  const toc = document.getElementById('toc');
  const mq = window.matchMedia('(min-width: 980px)');
  if (toc) {
    const sync = () => { if (mq.matches) toc.open = true; };
    sync();
    mq.addEventListener ? mq.addEventListener('change', sync) : mq.addListener(sync);
    toc.addEventListener('click', (e) => { if (e.target.closest('a') && !mq.matches) toc.open = false; });
  }

  // スクロールスパイ
  const links = toc ? [...toc.querySelectorAll('a[href^="#"]')] : [];
  const targets = links.map((a) => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
  function spy() {
    let current = null;
    const line = window.innerHeight * 0.3;
    for (const t of targets) if (t.getBoundingClientRect().top <= line) current = t;
    for (const a of links) a.setAttribute('aria-current', current && a.getAttribute('href') === `#${current.id}` ? 'true' : 'false');
  }

  // 読書進捗バー（本文の開始〜終了）
  const bar = document.getElementById('progress-bar');
  const article = document.querySelector('.prose');
  function progress() {
    if (!bar || !article) return;
    const r = article.getBoundingClientRect();
    const total = r.height - window.innerHeight * 0.6;
    const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1;
    bar.style.transform = `scaleX(${p})`;
  }
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { spy(); progress(); ticking = false; });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  // 前号 / 次号（index.json から）
  const pager = document.getElementById('pager');
  if (pager && slug) {
    api('../issues/index.json').then((d) => {
      const all = (Array.isArray(d) ? d : d.issues || []);
      const me = all.find((i) => i.slug === slug);
      const list = all.filter((i) => (me && me.sample) || !i.sample)
        .sort((a, b) => String(a.date).localeCompare(String(b.date)) || a.slug.localeCompare(b.slug));
      const idx = list.findIndex((i) => i.slug === slug);
      if (idx < 0) return;
      const prev = list[idx - 1];
      const next = list[idx + 1];
      const name = (i) => i.label || (i.no ? `第${i.no}号` : '');
      const nodes = [];
      if (prev) nodes.push(el('a', { class: 'prev', href: `${prev.slug}.html` }, el('small', { text: `← 前号 ${name(prev)}` }), prev.title));
      if (next) nodes.push(el('a', { class: 'next', href: `${next.slug}.html` }, el('small', { text: `次号 ${name(next)} →` }), next.title));
      pager.prepend(...nodes);
    }).catch(() => {});
  }
})();
