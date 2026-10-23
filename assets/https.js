// http で開かれたら https に切り替える（GitHub Pages の Enforce HTTPS の保険）
if (location.protocol === 'http:' && /(^|\.)plushigh\.co\.jp$/.test(location.hostname)) {
  location.replace('https://plushigh.co.jp' + location.pathname + location.search + location.hash);
}
