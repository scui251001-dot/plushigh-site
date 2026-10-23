(function () {
  const { api, el, fmtDate } = window.PH;
  const y = document.getElementById('year');
  if (y) y.textContent = String(new Date().getFullYear());

  async function load() {
    const latestBox = document.getElementById('latest');
    const archive = document.getElementById('archive');
    let issues = [];
    try {
      const data = await api('issues/index.json');
      issues = Array.isArray(data) ? data : (data.issues || []);
    } catch {
      latestBox.replaceChildren(el('p', { class: 'empty', text: '号の一覧を読み込めませんでした。時間をおいて再度お試しください。' }));
      return;
    }
    issues.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const real = issues.filter((i) => !i.sample);
    const latest = real[0] || issues[0];
    if (!latest) {
      latestBox.replaceChildren(el('p', { class: 'empty', text: '創刊準備中です。' }));
      return;
    }
    const meta = el('div', { class: 'meta' },
      el('span', { class: 'badge', text: latest.sample ? 'サンプル' : '最新号' }),
      latest.label ? el('span', { text: latest.label }) : latest.no ? el('span', { text: `第${latest.no}号` }) : null,
      el('time', { datetime: latest.date, text: fmtDate(latest.date) }),
      el('span', { class: 'vc', 'data-vslug': latest.slug }));
    if (latest.sample) meta.firstChild.className = 'badge sample';
    latestBox.replaceChildren(
      el('a', { class: 'latest', href: `issues/${latest.slug}.html` },
        meta,
        el('h3', { text: latest.title }),
        el('p', { text: latest.summary || '' }),
        el('div', { class: 'go', text: '本号を読む →' })));

    const rest = issues.filter((i) => i !== latest);
    if (!rest.length) {
      archive.replaceChildren(el('li', null, el('p', { class: 'empty pad', text: 'バックナンバーはまだありません。' })));
      return;
    }
    archive.replaceChildren(...rest.map((i) =>
      el('li', null, el('a', { href: `issues/${i.slug}.html` },
        el('time', { datetime: i.date, text: fmtDate(i.date) }),
        el('span', { class: 't' }, i.sample && !/サンプル/.test(i.title) ? '【サンプル】' : '', i.title),
        el('span', { class: 'vc', 'data-vslug': i.slug })))));
    fillViews();
  }
  function fillViews() {
    if (!window.PH.views) return;
    document.querySelectorAll('[data-vslug]').forEach(async (sp) => {
      try { const n = await window.PH.views(sp.dataset.vslug, false); sp.textContent = `閲覧 ${n.toLocaleString('ja-JP')}`; } catch { sp.textContent = ''; }
    });
  }
  load().then(fillViews);
})();
