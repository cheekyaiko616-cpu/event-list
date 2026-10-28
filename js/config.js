// アプリ全体の定数。数や初期値を変えたいときは、まずここを直す。
export const APP = { id: 'event-cho', name: 'Event list', schema: 1 };

export const STORAGE_KEY = 'eventcho.data.v1'; // 予定・タブ・設定の保存先

export const COLORS = 8;     // タブの色の数（css/tokens.css の --c1〜--c8 と合わせる）
export const MAX_TABS = 12;  // タブの上限
export const WATCH_MAX = 300; // タブごとの「取り込み内容」の文字数の上限

export const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

// 初めて開いたときに作られるタブ
export const DEFAULT_TABS = [
  { id: 'motor', name: 'モータースポーツ', color: 1, order: 1 },
  { id: 'rept', name: '爬虫類', color: 2, order: 2 },
  { id: 'ado', name: 'Ado', color: 3, order: 3, importKinds: ['open', 'close', 'result', 'pay', 'other'] }
];

// カレンダーに付けるアラート。trigger は「予定の0時」からの差（終日の予定なので0時が基準）
export const ALERT_OPTIONS = [
  { id: 'd3', label: '3日前の朝9時', trigger: '-P2DT15H' },
  { id: 'd1', label: '前日の朝9時', trigger: '-PT15H' },
  { id: 'd0', label: '当日の朝9時', trigger: 'PT9H' }
];

// 予定に付けられる「関連する日付」の種類（チケットの申し込みなど）と、1件の予定に付けられる数
export const DATE_KINDS = [
  { id: 'open', label: '申込開始' },
  { id: 'close', label: '申込締切' },
  { id: 'result', label: '当落発表' },
  { id: 'pay', label: '入金期限' },
  { id: 'other', label: 'その他' }
];
export const DATES_MAX = 8;

// 一覧の各行に出せる項目（設定で出す／出さないを選ぶ）
export const SHOW_KEYS = [
  { id: 'chip', label: 'タブ名（「すべて」のとき）' },
  { id: 'place', label: '場所' },
  { id: 'deadline', label: '近い申し込み・期限の印' },
  { id: 'badges', label: '「日程更新」「手動修正」の印' }
];

export const DEFAULT_SETTINGS = { alerts: ['d1'] };

// 終わった予定を残す日数。これを過ぎた予定は、起動時に一覧から消える。
export const RETENTION_DAYS = 365;

// 取り込み内容の一覧(watchlist.json)を保存するGitHub上の場所。毎日の取得がここを読む。
export const GITHUB = {
  owner: 'cheekyaiko616-cpu', repo: 'event-list', path: 'watchlist.json', branch: 'main',
  tokenKey: 'eventcho.gh.token',   // 鍵の保存先（この端末の中だけ。バックアップには入れない）
  filledKey: 'eventcho.gh.filled'  // 初回の「GitHubの内容を取り込む」を済ませたか
};

// 取り込みファイルの種類の名前。Claudeが作るファイルの先頭に書く。

// 現地の天気・乗り換え・ナビ・マップ（予定の詳細に出す）
export const TRIP = {
  weatherApi: 'https://api.open-meteo.com/v1/forecast',
  geoApi: 'https://nominatim.openstreetmap.org/search',
  transit: 'https://transit.yahoo.co.jp/search/result',
  carnaviScheme: 'yjcarnavi://navi/select',
  forecastDays: 16,                // 天気予報が出せる日数（今日から）
  weatherTtl: 3 * 3600 * 1000,     // 天気の保存期間（3時間）
  geoTtl: 90 * 86400 * 1000,       // 場所の保存期間（90日）
  cacheKey: 'eventcho.trip.v1',    // 天気・場所の保存先（バックアップには入れない）
  defaultTime: '09:00',            // 乗り換えの初期の時刻
  offline: /オンライン|配信|未発表|未定/  // 現地がない予定
};
