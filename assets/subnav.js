(function(){
  var p = location.pathname, inIssues = /\/issues\//.test(p), pre = inIssues ? '../' : '';
  var file = (p.split('/').pop() || '').toLowerCase();
  var H = pre + 'home.html';
  var MAIN = [
    ['私たちについて', H + '#about'], ['代表', H + '#people'], ['事業', H + '#business'],
    ['ビジネスマッチング', H + '#matching'], ['ビジネス通信', H + '#bulletin'],
    ['関連会社', H + '#group'], ['お問い合わせ', H + '#contact']
  ];
  var hash = (location.hash || '').slice(1);
  var map = {
    'matching.html': [['ビジネスマッチング', H + '#matching'], hash === 'talent' ? ['人材育成'] : hash === 'consulting' ? ['コンサルティング'] : hash === 'trade' ? ['一般貿易'] : null],
    'coffee.html': [['ビジネスマッチング', H + '#matching'], ['一般貿易', pre + 'matching.html#trade'], ['MTC コーヒー']],
    'tsushin.html': [['ビジネス通信', H + '#bulletin'], ['バックナンバー']],
    'world.html': [['ビジネス通信', H + '#bulletin'], ['3D 世界']],
    'about.html': [['私たちについて', H + '#about']], 'leadership.html': [['代表', H + '#people']],
    'business.html': [['事業', H + '#business']], 'group.html': [['関連会社', H + '#group']],
    'contact.html': [['お問い合わせ', H + '#contact']], 'terms.html': [['利用規約']], 'privacy.html': [['プライバシーポリシー']]
  };
  var trail = inIssues ? [['ビジネス通信', H + '#bulletin'], ['バックナンバー', pre + 'tsushin.html'], [document.querySelector('h1') ? document.querySelector('h1').textContent.trim().slice(0, 24) : '本号']] : (map[file] || []);
  trail = trail.filter(Boolean);
  var parent = trail.length > 1 && trail[trail.length - 2][1] ? trail[trail.length - 2][1] : (trail[0] && trail[0][1]) || H;

  var css = '.sbar{position:sticky;top:env(safe-area-inset-top,0px);z-index:30;background:var(--bg,var(--paper,#f7f5f0));border-bottom:1px solid rgba(127,127,127,.25);font:13.5px/1.4 system-ui,-apple-system,"Hiragino Sans","Noto Sans JP",sans-serif}' +
    '.sbar-in{max-width:1120px;margin:0 auto;display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding-block:8px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}' +
    '.sbar button,.sbar summary{font:inherit;cursor:pointer;border:1px solid rgba(127,127,127,.4);background:none;color:inherit;padding:5px 11px;border-radius:4px;list-style:none;white-space:nowrap}' +
    '.sbar summary::-webkit-details-marker{display:none}.sbar details{position:relative}' +
    '.sbar .pop{position:absolute;left:0;top:calc(100% + 6px);min-width:220px;background:var(--bg,var(--paper,#fff));border:1px solid rgba(127,127,127,.35);box-shadow:0 10px 28px rgba(0,0,0,.15);display:flex;flex-direction:column;padding:6px 0;z-index:40}' +
    '.sbar .pop a{padding:9px 14px;text-decoration:none;color:inherit}.sbar .pop a:hover,.sbar .pop a.cur{background:rgba(127,127,127,.12);font-weight:700}' +
    '.sbar .crumb{display:flex;gap:6px;align-items:center;flex-wrap:wrap;min-width:0;color:inherit;opacity:.85}.sbar .crumb a{color:inherit}.sbar .crumb b{opacity:1}' +
    '.sbar button:focus-visible,.sbar summary:focus-visible,.sbar a:focus-visible{outline:2px solid currentColor;outline-offset:2px}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var bar = document.createElement('nav'); bar.className = 'sbar'; bar.setAttribute('aria-label', 'ページ移動');
  var inner = document.createElement('div'); inner.className = 'sbar-in'; bar.appendChild(inner);

  var back = document.createElement('button'); back.type = 'button'; back.textContent = '← 戻る';
  back.addEventListener('click', function(){
    var same = document.referrer && document.referrer.indexOf(location.origin) === 0;
    if (same && history.length > 1) history.back(); else location.href = parent;
  });
  inner.appendChild(back);

  var dd = document.createElement('details'); var sm = document.createElement('summary'); sm.textContent = 'ホーム ▾'; dd.appendChild(sm);
  var pop = document.createElement('div'); pop.className = 'pop';
  var home = document.createElement('a'); home.href = H; home.textContent = 'ホーム（トップ）'; pop.appendChild(home);
  MAIN.forEach(function(m){ var a = document.createElement('a'); a.href = m[1]; a.textContent = m[0]; if (trail[0] && trail[0][0] === m[0]) { a.className = 'cur'; a.setAttribute('aria-current', 'true'); } pop.appendChild(a); });
  dd.appendChild(pop); inner.appendChild(dd);
  document.addEventListener('click', function(e){ if (!dd.contains(e.target)) dd.open = false; });

  var cr = document.createElement('div'); cr.className = 'crumb';
  trail.forEach(function(t, i){
    var s = document.createElement('span'); s.textContent = '›'; s.setAttribute('aria-hidden', 'true'); cr.appendChild(s);
    if (t[1] && i < trail.length - 1) { var a = document.createElement('a'); a.href = t[1]; a.textContent = t[0]; cr.appendChild(a); }
    else { var b = document.createElement('b'); b.textContent = t[0]; if (i === trail.length - 1) b.setAttribute('aria-current', 'page'); cr.appendChild(b); }
  });
  inner.appendChild(cr);

  var hdr = document.querySelector('header');
  if (hdr && hdr.parentNode) hdr.parentNode.insertBefore(bar, hdr.nextSibling); else document.body.insertBefore(bar, document.body.firstChild);
  if (hdr) { var cs = getComputedStyle(hdr); if (cs.position === 'sticky' || cs.position === 'fixed') bar.style.top = (hdr.offsetHeight) + 'px'; }
})();
