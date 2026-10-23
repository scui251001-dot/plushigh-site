// メールで受け取る（購読登録）
(function () {
  const { api } = window.PH;
  document.querySelectorAll('#subscribe-form').forEach((form) => {
    const msg = form.querySelector('.form-msg');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const email = String(fd.get('email') || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.textContent = 'メールアドレスをご確認ください'; msg.className = 'form-msg err'; return; }
      const btn = form.querySelector('button[type=submit]');
      btn.disabled = true;
      try {
        const how = await window.PH.send('ビジネス通信の購読登録', { email });
        form.reset();
        msg.textContent = how === 'sent' ? '購読登録を受け付けました。' : 'メールアプリが開きます。そのまま送信いただくと登録を受け付けます。'; msg.className = 'form-msg';
      } catch (ex) {
        msg.textContent = ex.message || '登録できませんでした'; msg.className = 'form-msg err';
      } finally { btn.disabled = false; }
    });
  });
})();
