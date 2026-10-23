// 静的ホスティング版：チャットの代わりに「お問い合わせ」へ案内
(function () {
  const src = (document.currentScript && document.currentScript.src) || '';
  const base = src.replace(/assets\/chat\.js.*$/, '');
  const href = base + 'contact.html';
  const fab = document.createElement('a');
  fab.className = 'chat-fab'; fab.href = href; fab.textContent = 'お問い合わせ';
  document.body.append(fab);
  document.querySelectorAll('[data-open-chat]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); location.href = href; }));
})();
