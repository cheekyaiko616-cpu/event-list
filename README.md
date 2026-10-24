# イベント帳

モータースポーツ・爬虫類イベント・Adoライブなどの日程を、日付順の1本リストで管理する個人用のウェブアプリです。
iPhoneのホーム画面に追加して使います。ビルド作業は不要で、このフォルダをそのまま公開できます。

## 公開のしかた（GitHub Pages）

1. このフォルダの中身を、リポジトリの直下に置く（`index.html` が一番上に来る形）
2. リポジトリの Settings → Pages で、公開するブランチを選ぶ
3. 表示されたURLをiPhoneのSafariで開き、共有ボタンから「ホーム画面に追加」

※ フォルダ構成は崩さないでください（`css/`、`js/`、`icons/` の場所が決まっています）。

## 構成と、直したいときの目安

| 変えたいこと | 直すファイル |
| --- | --- |
| 色・文字・暗いテーマ | `css/tokens.css` |
| ボタン・入力欄など共通の見た目 | `css/base.css` |
| 画面上部とタブの見た目 | `css/header.css` |
| 一覧（月の帯・行・詳細）の見た目 | `css/list.css` |
| 下から出る画面（入力・タブ管理・設定）の見た目 | `css/sheets.css` |
| 「次の予定」カードの中身・見た目 | `js/ui/next-card.js` / `css/next.css` |
| 一覧の表示内容・ボタン | `js/ui/event-list.js` |
| 予定の入力画面 | `js/ui/event-sheet.js` |
| タブの並び・タブの管理画面 | `js/ui/tabs-bar.js` / `js/ui/tab-manager.js` |
| 設定画面（アラート・バックアップ） | `js/ui/settings-sheet.js` |
| 画面上部のボタン | `js/ui/header.js` |
| 初期のタブ・タブの上限・アラートの選択肢 | `js/config.js` |
| 自動取得（Claudeが調べた日程の反映ルール） | `js/data/feed.js` |
| Claude上の共有データへの入口 | `js/services/cloud.js` |
| 日程の取り込み（読み込み・比べ方） | `js/data/import.js` |
| 取り込みの確認画面 | `js/ui/import-sheet.js` |
| 予定やタブの増減・並べ方のルール | `js/data/events.js` / `js/data/tabs.js` |
| 保存先（localStorage → IndexedDB など） | `js/data/storage.js` だけ |
| 保存データの項目を増やす | `js/data/schema.js` と `js/data/events.js` |
| カレンダー用ファイルの中身 | `js/services/ics.js` |
| カレンダーの開き方・共有の仕方 | `js/services/calendar.js` / `js/services/files.js` |
| 日付や文字の小さな処理 | `js/util/` |

`js/main.js` は各部品をつなぐだけの入口です。

新しい画面を足すときは、`js/ui/` に1ファイル作り、`js/ui/sheet.js` の `mountSheet` で枠を作って、`main.js` で呼び出します。

## ファイルを足したり消したりしたとき

`sw.js`（オフライン用）の `ASSETS` の一覧を直し、`CACHE` の番号を1つ上げてください。

## 自動取得（feed.json）

- サイト直下の `feed.json` に日程を書くと、アプリが開くたびに自動で予定へ反映します（追加・更新）。
- 形は `feed.json` の見本のとおりです。各件には `id`・`tabName`・`title`・`date`・`end`・`place`・`source`（出典。必須）・`url`・`note`・`checkedAt` を書きます。
- 反映のルールは `js/data/feed.js` にあります。

## データについて

- 予定・タブ・設定は、この端末のブラウザの中（localStorage）に保存されます
- 「設定 → 書き出す」で、バックアップのファイル（.json）を保存できます。読み込みで元に戻せます
- Safariで開いたときと、ホーム画面から開いたときでは、保存場所が別です。最初からホーム画面のアイコンで使い始めるか、書き出し・読み込みで移してください
