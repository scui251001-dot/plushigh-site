// /coffee.html — 工程のスクロール演出とロット追跡
(function () {
  const { el, api } = window.PH;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1) スクロールで各工程を表示
  const stages = [...document.querySelectorAll('.c-stage')];
  if (!reduced && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('js-anim');
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }, { rootMargin: '0px 0px -15% 0px', threshold: 0.1 });
    stages.forEach((s) => io.observe(s));
  } else {
    stages.forEach((s) => s.classList.add('static'));
  }

  // 2) ロット追跡
  const LOT_RE = /^[A-Z0-9][A-Z0-9-]{2,31}$/;
  const box = document.getElementById('lot-result');
  const form = document.getElementById('lot-form');
  const input = document.getElementById('lot-input');
  const SPEC = [['variety', '品種'], ['region', '産地'], ['altitude', '標高'], ['process', '精製方法'], ['harvest_year', '収穫年'], ['weight', '内容量']];

  function render(d) {
    const { lot, events, stages: st } = d;
    const byStage = {};
    for (const e of events) (byStage[e.stage] ||= []).push(e);
    let currentIdx = -1;
    st.forEach(([k], i) => { if (byStage[k]) currentIdx = i; });
    const tl = el('ol', { class: 'lot-tl' }, ...st.map(([k, name], i) => {
      const evs = byStage[k] || [];
      const cls = i < currentIdx ? 'done' : i === currentIdx ? 'done current' : 'todo';
      return el('li', { class: cls, 'aria-current': i === currentIdx ? 'step' : null },
        el('span', { class: 'lot-dot', 'aria-hidden': 'true', text: String(i + 1) }),
        el('div', null,
          el('div', { class: 'lot-stage-name' }, name, i === currentIdx ? el('span', { class: 'lot-now', text: '現在の段階' }) : null,
            !evs.length ? el('span', { class: 'empty', text: i > currentIdx ? '（これから）' : '（記録なし）' }) : null),
          ...evs.map((e) => el('div', { class: 'lot-ev' },
            el('div', { class: 'meta' }, el('time', { datetime: e.date, text: e.date.replace(/-/g, '/') }), e.place ? el('span', { text: e.place }) : null, e.actor ? el('span', { text: e.actor }) : null),
            e.note ? el('p', { text: e.note }) : null,
            e.media && e.media.length ? el('div', { class: 'lot-media' }, ...e.media.map((m) => m.type === 'video'
              ? el('video', { src: m.url, controls: true, preload: 'metadata', playsinline: true })
              : el('img', { src: m.url, alt: `${name}の写真`, loading: 'lazy' }))) : null,
            e.tracking ? el('p', { class: 'lot-track' }, `${e.tracking.carrier} 伝票番号 ${e.tracking.number} ・ `,
              el('a', { href: e.tracking.url, target: '_blank', rel: 'noopener noreferrer', text: '配送状況を確認する' })) : null))));
    }));
    box.replaceChildren(el('article', { class: 'lot-card' },
      el('div', { class: 'lot-head' }, el('h3', { text: lot.lot_id }), lot.is_sample ? el('span', { class: 'badge sample', text: 'サンプル' }) : el('span', { class: 'badge', text: 'MTC ロット' })),
      lot.is_sample ? el('p', { class: 'lot-sample', text: 'これは表示確認用のサンプルロットです。日付・地域・内容は実在のロットの記録ではありません。' }) : null,
      el('dl', { class: 'lot-spec' }, ...SPEC.filter(([k]) => lot[k]).map(([k, label]) => el('div', null, el('dt', { text: label }), el('dd', { text: lot[k] })))),
      tl));
  }

  async function lookup(id, push) {
    id = String(id || '').trim().toUpperCase();
    if (!LOT_RE.test(id)) { box.replaceChildren(el('p', { class: 'lot-err', text: 'ロット番号の形式をご確認ください（英数字とハイフン）' })); return; }
    box.replaceChildren(el('p', { class: 'empty', text: '読み込んでいます…' }));
    try {
      render(await api(`/api/lot?id=${encodeURIComponent(id)}`));
      if (push) { try { history.replaceState(null, '', `/coffee.html?lot=${encodeURIComponent(id)}#lot`); } catch {} }
    } catch (e) {
      box.replaceChildren(el('p', { class: 'lot-err', text: e.status === 404 ? 'このロット番号は見つかりませんでした。袋の表記をご確認ください。' : '読み込めませんでした。時間をおいて再度お試しください。' }));
    }
  }
  form.addEventListener('submit', (e) => { e.preventDefault(); lookup(input.value, true); });
  const q = new URLSearchParams(location.search).get('lot');
  if (q) {
    input.value = q.toUpperCase();
    lookup(q, false).then(() => { if (location.hash !== '#lot') document.getElementById('lot').scrollIntoView(); });
  }
})();
