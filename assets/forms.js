// 汎用フォーム送信: <form data-endpoint="/api/xxx"> → JSON POST → 完了表示（次の .form-done を表示）
(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('form[data-endpoint]').forEach((form) => {
    const msg = form.querySelector('.form-msg');
    const done = form.nextElementSibling && form.nextElementSibling.classList.contains('form-done') ? form.nextElementSibling : null;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = {};
      for (const [k, v] of new FormData(form).entries()) body[k] = String(v).trim();
      const consent = form.elements.consent;
      if (consent) body.consent = consent.checked;
      const missing = [...form.querySelectorAll('[required]')].filter((f) => (f.type === 'checkbox' ? !f.checked : !String(f.value).trim()));
      if (missing.length) {
        msg.textContent = missing[0].type === 'checkbox' ? 'プライバシーポリシーへの同意が必要です' : '必須項目を入力してください';
        msg.className = 'form-msg err';
        missing[0].focus();
        return;
      }
      const btn = form.querySelector('button[type=submit]');
      btn.disabled = true;
      msg.textContent = '送信しています…'; msg.className = 'form-msg';
      try {
        const SUBJ = { '/api/contact': 'お問い合わせ', '/api/consult': 'ご相談', '/api/requests': 'ご要望', '/api/talent': '人材育成のご相談' };
        const how = await window.PH.send(SUBJ[form.dataset.endpoint] || 'お問い合わせ', body);
        form.reset();
        msg.textContent = '';
        if (done) {
          form.hidden = true; done.hidden = false;
          done.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
          const again = done.querySelector('[data-again]');
          if (again) again.onclick = () => { done.hidden = true; form.hidden = false; };
        } else msg.textContent = how === 'sent' ? '送信しました。担当者よりご連絡いたします。' : 'メールアプリが開きます。そのまま送信してください。';
        form.dispatchEvent(new CustomEvent('submitted'));
      } catch (ex) {
        msg.textContent = ex.message; msg.className = 'form-msg err';
      } finally { btn.disabled = false; }
    });
  });
})();
