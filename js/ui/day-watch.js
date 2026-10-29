// 日付が変わったら、表示を描き直す。
// アプリを開いたまま日付をまたぐと、「今日」「開催中」「あと○日」が前の日のままになるため。
// 画面に戻ってきたとき（ホーム画面から開き直した・他のアプリから戻った）に、日付が変わっていれば描き直す。
// 動きは日付が変わったときだけ。常に見はるわけではないので、電池は使わない。
import { todayIso } from '../util/date.js';

export function initDayWatch(rerender) {
  let day = todayIso();
  const check = () => {
    const now = todayIso();
    if (now === day) return;
    day = now;
    rerender();
  };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
  window.addEventListener('pageshow', check);
  window.addEventListener('focus', check);
}
