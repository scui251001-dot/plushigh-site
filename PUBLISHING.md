# ビジネス通信 発刊フロー（plushigh.co.jp）

公開 = このリポジトリ（scui251001-dot/plushigh-site）の main に push すること。GitHub Pages が約1分で https://plushigh.co.jp に反映する。

## 1号分の追加手順
1. `issues/YYYY-MM-DD.html` を作る。直近の号（例 `issues/2026-10-21-junbi.html`）をコピーし、構造・class・script はそのまま、中身だけ差し替える。
   - `<title>` `description` `og:*` `canonical`（https://plushigh.co.jp/issues/<slug>）、`<body data-slug="<slug>">`
   - 本号は `<meta name="robots" content="noindex">` を入れない（サンプルのみ noindex）
   - セクション: 今週の3行 / 数字で見る今週 / s1 今週の結論 / s2 政局・人事 / s3 安全・物流 / s4 為替・資金 / s5 商機 / s6 プラスハイについて / 来週の注目 / 出典
2. `issues/index.json` の `issues` 先頭に {slug, title, date, summary, conclusion, label} を追加し、`updated` を更新。`sample: true` の項目は本号が出たら削除。
3. `issues/latest.json` を本号の内容に置き換え（slug, title, label, date, sample:false, conclusion, summary, three_lines, signals, countries[]）。countries の href は `/issues/<slug>#sN`。
4. `git add issues && git commit && git push origin main`
5. 1〜2分後に https://plushigh.co.jp/issues/<slug>.html と https://plushigh.co.jp/tsushin.html を確認。

## 規則
- 個人名（Steven Cui / 崔希光）を出さない。WODA 関連は一切書かない。参股・投資参加には触れない。
- 為替は「並行市場レート」と表記（「闇レート」「ブラックマーケット」は使わない）。
- Steven の「OK」なしに push しない。

## セキュリティ（全ページ共通・新しい号にも必ず入れる）
- `<head>` に Content-Security-Policy と referrer の `<meta>`（直近の号からそのままコピー）。
- `<form>` は必ず `method="post"`（JS が失敗してもメールアドレスが URL に載らないように）。
- インライン `<script>` は書かない（CSP で動かない）。スクリプトは assets/ に置く。
- claude.ai の預覧 artifact で表示が崩れる場合は、預覧用コピーからだけ CSP の meta を外してよい（本番ファイルからは外さない）。

## トップページ
- https://plushigh.co.jp/ を開くと最初にビジネス通信が出るよう、`index.html` は `tsushin.html` のコピー（Steven 2026-10-23）。`tsushin.html` を直したら `cp tsushin.html index.html` も行う。会社紹介は `home.html`。

## SEO（新しい号ごとに）
- 新しい号の `<head>` に NewsArticle の `<script type="application/ld+json">`（直近の号からコピーして headline・description・datePublished・mainEntityOfPage を差し替え）。
- `sitemap.xml` に `<url><loc>https://plushigh.co.jp/issues/<slug></loc>…</url>` を追加し、トップ（/）の lastmod を当日に更新。
- title は「<号名>｜東アフリカ・中東ビジネス通信｜株式会社プラスハイ」、description は今週の結論を 120 字前後で。
- 狙うキーワード（Steven 2026-10-23）：アフリカ・東アフリカ・エチオピア・中東・ジブチ。各号の title・description・見出しに、内容に合う範囲で自然に入れる（例「エチオピア・ジブチ…」）。詰め込みはしない。
