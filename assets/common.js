// 共通ヘルパー（グローバル PH に公開）
(function () {
  const store = {
    get(k) { try { return window.localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { window.localStorage.setItem(k, v); } catch {} },
    del(k) { try { window.localStorage.removeItem(k); } catch {} },
  };
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
  // ブラウザ単位の匿名 ID（リアクション重複防止用）
  function browserId() {
    let v = store.get('ph_bid');
    if (!v || !/^[A-Za-z0-9-]{16,64}$/.test(v)) { v = uuid(); store.set('ph_bid', v); }
    return v;
  }
  async function api(path, opts = {}) {
    const init = { method: opts.method || 'GET', headers: { ...(opts.headers || {}) }, credentials: 'same-origin' };
    if (opts.body !== undefined) { init.body = JSON.stringify(opts.body); init.headers['content-type'] = 'application/json'; }
    const res = await fetch(path, init);
    let data = null;
    try { data = await res.json(); } catch {}
    if (!res.ok) {
      const e = new Error((data && data.error) || `HTTP ${res.status}`);
      e.status = res.status;
      throw e;
    }
    return data;
  }
  function el(tag, attrs, ...children) {
    const n = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : String(v));
    }
    for (const c of children) if (c != null) n.append(c instanceof Node ? c : document.createTextNode(String(c)));
    return n;
  }
  function fmtDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    return m ? `${m[1]}年${+m[2]}月${+m[3]}日` : (iso || '');
  }
  function fmtDateTime(ms) {
    const d = new Date(ms);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }
  // EN（英語版）はまだ準備中
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-en]');
    if (!b) return;
    const t = document.createElement('div');
    t.className = 'en-toast'; t.setAttribute('role', 'status'); t.textContent = 'English version: Coming soon';
    document.body.append(t);
    setTimeout(() => t.remove(), 2200);
  });
  // 静的ホスティング版：フォーム内容をメール（info@plushigh.co.jp）で送る
  const MAIL_TO = 'info@plushigh.co.jp';
  const LABEL = { type:'お問い合わせの種類', category:'分野', side:'立場', company:'会社名', contact_name:'ご担当者', name:'お名前', email:'メールアドレス', phone:'電話番号', tel:'電話番号', country:'国', item:'品目・内容', message:'内容', body:'内容', detail:'詳細' };
  function mailto(subject, obj) {
    const lines = Object.entries(obj || {}).filter(([k, v]) => v !== '' && v != null && !['website','consent'].includes(k)).map(([k, v]) => `${LABEL[k] || k}: ${v}`);
    location.href = `mailto:${MAIL_TO}?subject=${encodeURIComponent('[plushigh.co.jp] ' + subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
  }
  window.PH = { store, uuid, browserId, api, el, fmtDate, fmtDateTime, mailto, MAIL_TO };
})();
