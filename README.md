# Event list

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
| 申し込み・期限の日付（入力欄 / データの整え方） | `js/ui/event-dates.js` / `js/data/dates.js` |
| 設定（取り込む項目）とタブごとの表示（出す・出さない）の整え方 / 設定画面の選択欄（タブごとの表示は `js/ui/tab-edit.js`） | `js/data/settings.js` / `js/ui/settings-view.js` |
| タブの並び | `js/ui/tabs-bar.js` |
| タブの一覧・追加・編集の画面 | `js/ui/tab-manager.js` / `js/ui/tab-add.js` / `js/ui/tab-edit.js` |
| ⚙️の設定画面（取り込み・バックアップ・カレンダー追加） | `js/ui/settings-page.js` / 見た目は `css/settings.css` |
| 画面上部（タイトル・i・⚙️） | `js/ui/header.js` |
| 右下の「＋」ボタン | `js/ui/fab.js` |
| 左側面の引き出し（設定・過去・イベント更新履歴） | `js/ui/drawer.js` |
| 「これから／過去」の切り替え | `js/ui/view-switch.js` |
| 初期のタブ・タブの上限・アラートの選択肢 | `js/config.js` |
| 自動取得（Claudeが調べた日程の反映ルール） | `js/data/feed.js` |
| Claude上の共有データへの入口 | `js/services/cloud.js` |
| 日程の取り込み（読み込み・比べ方） | `js/data/import.js` |
| 取り込みの確認画面 | `js/ui/import-sheet.js` |
| 予定やタブの増減・並べ方のルール | `js/data/events.js` / `js/data/tabs.js` |
| タブごとの「自動で取り込む内容」と、その一覧の形 | `js/data/watchlist.js` / タブの編集は `js/ui/tab-edit.js` |
| 保存先（localStorage → IndexedDB など） | `js/data/storage.js` だけ |
| 保存データの項目を増やす | `js/data/schema.js` と `js/data/events.js` |
| カレンダー用ファイルの中身 | `js/services/ics.js` |
| カレンダーの開き方・共有の仕方 | `js/services/calendar.js` / `js/services/files.js` |
| 日付や文字の小さな処理 | `js/util/` |

`js/main.js` は各部品をつなぐだけの入口です。

新しい画面を足すときは、`js/ui/` に1ファイル作り、`js/ui/sheet.js` の `mountSheet` で枠を作って、`main.js` で呼び出します。

## ホーム画面アイコン（クリア・色合い調整）

- `icons/` のアイコンは、外側の背景だけが半透明の白（濃さ0%）になっています（飛行機とカレンダーの白は不透明）
- 背景の濃さを変えたいときは、元の画像（`originals/`）に対して `tools/make_icon.py` を実行します
  例: `python3 tools/make_icon.py originals/apple-touch-icon.png icons/apple-touch-icon.png 0.4`（最後の数字が背景の濃さ。0=完全に透明、1=不透明の白）
- iPhoneはアイコンを覚えているため、差し替えたあとはホーム画面のアイコンを削除して、もう一度追加してください

## ファイルを足したり消したりしたとき

`sw.js`（オフライン用）の `ASSETS` の一覧を直し、`CACHE` の番号を1つ上げてください。

## 毎週の自動取得の仕組み（取り込み内容の一覧）

1. タブの追加・編集画面の「自動で取り込む内容」に、タブごとに欲しい日程を書く
2. 「取り込みの一覧をコピー」で、その内容をClaudeに貼る
3. Claudeが `watchlist.json`（このリポジトリの直下）を書き換える（pushは承認を得てから）
4. 毎週月曜、自動の作業が `watchlist.json` を読み、タブごとに公式情報を調べて `feed.json` に書く（手順は `tools/weekly-fetch.md`）
5. アプリは開くたびに `feed.json` を読み、予定に追加・更新する。変わった内容は「i」の更新履歴に出る

`watchlist.json` の `tabName` は、アプリのタブ名と同じにしてください。

## 自動取得（feed.json）

- サイト直下の `feed.json` に日程を書くと、アプリが開くたびに自動で予定へ反映します（追加・更新）。
- 形は `feed.json` の見本のとおりです。各件には `id`・`tabName`・`title`・`date`・`end`・`place`・`source`（出典。必須）・`url`・`note`・`checkedAt`（と、あれば `dates`）を書きます。
- 反映のルールは `js/data/feed.js` にあります。
- 申し込み・期限などの日付は、各件に `dates`（`kind`・`date`・`note` の並び。最大8つ）で書きます。`kind` は `open`（申込開始）・`close`（申込締切）・`result`（当落発表）・`pay`（入金期限）・`other` のどれかです。
- アプリの「設定」で、取り込む種類を選べます。外した種類は自動では入りません。手で入れた日付は消えません。
- 毎週の自動の作業の手順は、`tools/weekly-fetch.md` にあります。

## データについて

- 予定・タブ・設定は、この端末のブラウザの中（localStorage）に保存されます
- 「設定 → 書き出す」で、バックアップのファイル（.json）を保存できます。読み込みで元に戻せます
- Safariで開いたときと、ホーム画面から開いたときでは、保存場所が別です。最初からホーム画面のアイコンで使い始めるか、書き出し・読み込みで移してください

## 公開の前に（軽量化の仕組み）
ソースは機能・画面ごとのファイル（`js/`・`css/`）のままです。公開用には、これを1つにまとめて小さくした `dist/app.min.js` と `dist/app.min.css` を読み込みます。
ソースを直したら、公開の前に `python3 tools/build.py` を実行して `dist/` を作り直し、一緒に公開します。
