// 管理画面・現場スキャン共通: 画像圧縮（幅 1600px）、R2 アップロード、ロット番号の抽出、QR 画像生成
(function () {
  const MAX_W = 1600;
  const IMG_MAX = 5 * 1024 * 1024;
  const VIDEO_MAX = 50 * 1024 * 1024;
  const STAGES = [
    ['cultivation', '栽培'], ['harvest', '収穫'], ['drying', '乾燥'], ['hulling', '脱穀・選別'], ['export_inspection', '輸出検査'],
    ['transport', '輸送'], ['customs_jp', '日本の通関'], ['roasting', '焙煎'], ['packing', '包装'], ['delivery', 'お届け'],
  ];
  const CARRIERS = [['', '（なし）'], ['yamato', 'ヤマト運輸'], ['sagawa', '佐川急便'], ['japanpost', '日本郵便']];

  async function compressImage(file) {
    let bmp;
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch { bmp = await createImageBitmap(file); }
    const scale = Math.min(1, MAX_W / bmp.width);
    const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(bmp, 0, 0, w, h);
    if (bmp.close) bmp.close();
    for (const q of [0.85, 0.75, 0.6]) {
      const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', q));
      if (blob && blob.size <= IMG_MAX) return blob;
    }
    throw new Error('画像を十分に小さくできませんでした');
  }

  /** ファイル 1 件をアップロードして R2 キーを返す */
  async function upload(token, lot, file, onStatus) {
    let body = file, type = file.type;
    if (type.startsWith('image/')) {
      onStatus && onStatus(`${file.name}: 圧縮中…`);
      body = await compressImage(file); type = 'image/jpeg';
    } else if (type.startsWith('video/')) {
      if (file.size > VIDEO_MAX) throw new Error(`${file.name}: 動画は 50MB までです`);
    } else throw new Error(`${file.name}: 画像か動画を選んでください`);
    onStatus && onStatus(`${file.name}: 送信中…`);
    const res = await fetch(`/api/admin/media?lot=${encodeURIComponent(lot)}`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': type }, body });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`);
    return d.key;
  }

  /** QR の中身（URL / 生のロット番号）からロット番号を取り出す */
  function parseLot(text) {
    const t = String(text || '').trim();
    let m = /[?&]lot=([A-Za-z0-9-]{3,32})/.exec(t) || /\/lot\/([A-Za-z0-9-]{3,32})/.exec(t);
    const id = (m ? m[1] : t).toUpperCase();
    return /^[A-Z0-9][A-Z0-9-]{2,31}$/.test(id) ? id : null;
  }

  /** 印刷用 QR PNG（下にロット番号）を canvas に描く。qrcode-generator が必要 */
  function drawQr(canvas, url, lotId) {
    const qr = window.qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    const n = qr.getModuleCount();
    const cell = 10, quiet = 4 * cell, size = n * cell + quiet * 2;
    const footer = 70;
    canvas.width = size; canvas.height = size + footer;
    const g = canvas.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = '#000';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) g.fillRect(quiet + c * cell, quiet + r * cell, cell, cell);
    g.textAlign = 'center';
    g.font = 'bold 28px system-ui, sans-serif';
    g.fillText(lotId, size / 2, size + 26);
    g.font = '18px system-ui, sans-serif';
    g.fillText('Mother Tree Coffee', size / 2, size + 54);
    return canvas;
  }

  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  window.LotTools = { STAGES, CARRIERS, compressImage, upload, parseLot, drawQr, today };
})();
