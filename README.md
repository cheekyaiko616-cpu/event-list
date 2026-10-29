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
| 一覧の表示内容（月の帯・日程未定・見える分だけ描く仕組み） | `js/ui/event-list.js` |
| 予定1件の行と、開いたときの詳細・ボタン | `js/ui/event-row.js` |
| 開いた予定をヘッダーの下に固定する仕組み | `js/ui/pin.js` / `js/ui/pin-close.js` |
| 予定の入力画面 | `js/ui/event-sheet.js` |
| 申し込み・期限の日付（入力欄 / データの整え方） | `js/ui/event-dates.js` / `js/data/dates.js` |
| タブごとの設定（一覧に出す・出さない、自動で取り込む日付の種類）の整え方 / 調べ方 / 選択欄 | `js/data/settings-normalize.js` / `js/data/settings.js` / `js/ui/tab-edit.js` |
| 一覧の「NEW」の印（新しく入った・変わった予定。1週間たつと消える。開いても消えない） | `js/ui/event-row.js` / 付ける条件は `js/data/feed.js` |
| 起動時に最初に出す画面（いつも「すべて」） | `js/main.js` |
| 起動の最初の1コマ（背景色・起動画面。`tools/build.py` が `index.html` に埋め込む） | `css/tokens.css` / `css/splash.css` |
| iPhoneで開いた直後の画面（無地。`tools/make_startup.py` で作る。反映にはホーム画面のアイコンの入れ直しが必要） | `img/startup/` / `tools/make_startup.py` |
| 起動画面（乗りものが回る約2秒の画面） | `js/ui/splash.js` / `js/ui/splash-art.js` |
| 文字フォントの読み込み（画面を止めない） | `js/boot-fonts.js` |
| タブの並び | `js/ui/tabs-bar.js` |
| タブの一覧・追加・編集の画面 | `js/ui/tab-manager.js` / `js/ui/tab-add.js` / `js/ui/tab-edit.js` |
| 設定画面（取り込み・バックアップ。引き出しから開く） | `js/ui/settings-page.js` / 見た目は `css/settings.css` |
| 画面上部（タイトルと今日の日付） | `js/ui/header.js` |
| 右下の「＋」ボタン | `js/ui/fab.js` |
| 左側面の引き出し（設定・過去・イベント更新履歴） | `js/ui/drawer.js` |
| 「これから／過去」の切り替え | `js/ui/view-switch.js` |
| タブの上限・アラートの選択肢（初めはタブなし。自動取得の予定が入ると、そのタブ名で現れる） | `js/config.js` |
| 自動取得（Claudeが調べた日程の反映ルール） | `js/data/feed.js` |
| Claude上の共有データへの入口 | `js/services/cloud.js` |
| 予定やタブの増減・並べ方のルール | `js/data/events.js` / `js/data/tabs.js` |
| タブごとの「自動で取り込む内容」と、その一覧の形 | `js/data/watchlist.js` / タブの編集は `js/ui/tab-edit.js` |
| 保存先（localStorage → IndexedDB など） | `js/data/storage.js` だけ |
| 保存データの項目を増やす | `js/data/schema.js` と `js/data/events.js` |
| 詳細の「現地の天気」「乗り換え・ナビ・マップ」のボタン / 乗り換えの入力画面（出発駅・到着駅だけ） / 見た目 | `js/ui/event-trip.js` / `js/ui/transit-sheet.js` / `css/trip.css` |
| 場所の特定（会場表に足す / 地図の検索） / 天気 / 最寄り駅（`data/stations.json`） | `js/services/venues.js` / `js/services/geo.js` / `js/services/weather.js` / `js/services/stations.js` |
| 乗り換え・ナビ・マップのリンクの作り方 / 天気・場所の一時保存 | `js/services/trip-links.js` / `js/services/trip-cache.js` |
| カレンダー用ファイルの中身 | `js/services/ics.js` |
| 予定1件ずつの「カレンダーに追加」 / ファイルの保存 | `js/services/calendar.js` / `js/services/files.js` |
| 状態（予定・タブ・今の画面）の置き場 | `js/state.js` |
| 保存データの読み書き / バックアップの書き出し・読み込み | `js/data/store.js` / `js/data/backup.js` |
| イベント更新履歴（記録の読み込み / 画面） | `js/data/updates.js` / `js/ui/updates-sheet.js` |
| 取り込み内容をGitHubへ書く（鍵の登録 / 書き込み / 画面） | `js/services/github.js` / `js/data/watchlist-sync.js` / `js/ui/github-link.js` |
| タブを左右のスワイプで切り替える | `js/ui/tab-swipe.js` |
| 動き・お知らせの小さな部品 | `js/ui/motion.js` / `js/ui/toast.js` |
| 日付や文字の小さな処理 | `js/util/` |
| ビルドと点検（食い違い・無駄・番号の上げ忘れを自動で見つける） | `tools/build.py` / `tools/check.py` |
| 日々の自動取得の手順書 | `tools/daily-fetch.md` |
| 動作確認用のプレビュー / 起動画像の作成 | `tools/make_preview.py` / `tools/make_startup.py` |
| 読み込み中・空・エラーの共通の表示（骨組み・読み上げ対応） | `js/ui/state-panel.js` |
| 毎日の結果をLINEに送る | `tools/line_notify.py` |
| LINEのユーザーIDを調べる（Webhookで受け取る） | `tools/line_get_user_id.py` |

`js/main.js` は各部品をつなぐだけの入口です。

新しい画面を足すときは、`js/ui/` に1ファイル作り、`js/ui/sheet.js` の `mountSheet` で枠を作って、`main.js` で呼び出します。

## ホーム画面アイコン

- `icons/` のアイコンは、外側の背景だけが半透明の白（濃さ0%）になっています（飛行機とカレンダーの白は不透明）
- iPhoneはアイコンを覚えているため、差し替えたあとはホーム画面のアイコンを削除して、もう一度追加してください

## ファイルを足したり消したりしたとき

`sw.js`（オフライン用。アプリ本体は保存済みを先に出し、裏で更新）の `ASSETS` の一覧を直し、`CACHE` の番号を1つ上げてください。

## 毎日の自動取得の仕組み（取り込み内容の一覧）

1. タブの追加・編集画面の「自動で取り込む内容」に、タブごとに欲しい日程を書く
2. 設定画面の「自動取り込みの連携（GitHub）」に鍵を登録しておくと、その内容が `watchlist.json`（このリポジトリの直下）に自動で保存される
4. 毎日11:59（日本時間）、自動の作業が `watchlist.json` を読み、タブごとに公式情報を調べて `feed.json` に書く（手順は `tools/daily-fetch.md`）
5. アプリは開くたびに `feed.json` を読み、予定に追加・更新する。変わった内容は、引き出しの「イベント更新履歴」に出る

`watchlist.json` の `tabName` は、アプリのタブ名と同じにしてください。

## 自動取得（feed.json）

- サイト直下の `feed.json` に日程を書くと、アプリが開くたびに自動で予定へ反映します（追加・更新）。
- 形は `feed.json` の見本のとおりです。各件には `id`・`tabName`・`title`・`date`・`end`・`place`・`source`（出典。必須）・`url`・`note`・`checkedAt`（と、あれば `dates`）を書きます。
- 反映のルールは `js/data/feed.js` にあります。
- 申し込み・期限などの日付は、各件に `dates`（`kind`・`date`・`note` の並び。最大8つ）で書きます。`kind` は `open`（申込開始）・`close`（申込締切）・`result`（当落発表）・`pay`（入金期限）・`other` のどれかです。
- 取り込む種類は、タブごとに「タブの編集」の「自動で取り込む日付」で選びます（その内容は `watchlist.json` の `kinds` に保存され、自動の作業もそれに従います）。外した種類は自動では入りません。手で入れた日付は消えません。
- 毎日の自動の作業の手順は、`tools/daily-fetch.md` にあります。

## データについて

- 予定・タブ・設定は、この端末のブラウザの中（localStorage）に保存されます
- 「設定 → 書き出す」で、バックアップのファイル（.json）を保存できます。読み込みで元に戻せます
- Safariで開いたときと、ホーム画面から開いたときでは、保存場所が別です。最初からホーム画面のアイコンで使い始めるか、書き出し・読み込みで移してください

## 公開の前に（軽量化の仕組み）
ソースは機能・画面ごとのファイル（`js/`・`css/`）のままです。公開用には、これを1つにまとめて小さくした `dist/app.min.js` と `dist/app.min.css` を読み込みます。
ソースを直したら、公開の前に `python3 tools/build.py` を実行して `dist/` を作り直し、一緒に公開します。ビルドの最初に `tools/check.py` が動き、食い違い（説明文のファイル名、READMEの載せ忘れ、ぐるぐる参照、使われていないCSS・export、番号の上げ忘れ）が見つかると止まります。

## LINEへの知らせ

1. LINE Messaging API のチャネルを作り、チャネルアクセストークンと、送り先のユーザーID（`tools/line_get_user_id.py` で調べられる）を、環境変数 `LINE_CHANNEL_ACCESS_TOKEN` と `LINE_TO` に入れる
2. `python3 tools/line_notify.py` で、今日のアプリ内の更新と、申込締切のちょうど3日前になったものをLINEに送る（`--remind 3,1` で日数を変えられる）。旧LINE Notifyは終了しているため Messaging API を使う。鍵が無いときは内容を表示するだけ
