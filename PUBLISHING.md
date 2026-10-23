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
