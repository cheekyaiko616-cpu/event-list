// アプリの「今の状態」を1か所にまとめる。画面は state を見て描き直すだけにする。
export const state = {
  ready: false,       // 保存データの読み込みが終わったか
  saveError: false,   // 保存に失敗したか
  startupMessage: '', // 起動時に出すお知らせ
  tabs: [],           // { id, name, color, order }
  events: [],         // { id, type, title, date, end, place, source, url, note, rev }
  settings: { alerts: [] },
  dismissed: [],      // 自動取得の予定のうち、利用者が削除したもの（feedId）。再び追加しない
  cloud: false,       // 保存先がクラウド（Claude上の共有データ）か
  ui: { filter: 'all', view: 'upcoming', openId: null, screen: 'list' } // screen: 'list'（予定）か 'settings'（設定）
};

const listeners = new Set();

/** 状態が変わったときに呼ばれる関数を登録する。解除する関数を返す。 */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** 登録された関数をすべて呼ぶ。 */
export function notify() {
  listeners.forEach((fn) => fn(state));
}
