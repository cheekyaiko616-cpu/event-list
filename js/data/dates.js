// 予定に付ける「関連する日付」（申込開始・締切・当落発表・入金期限など）の整え方と取り出し方。
import { DATE_KINDS, DATES_MAX } from '../config.js';
import { parseDate, todayIso } from '../util/date.js';

export const kindLabel = (id) => (DATE_KINDS.find((k) => k.id === id) || { label: 'その他' }).label;

/** 保存・読み込みの前に、安全な形に整える。日付の早い順。 */
export function cleanDates(list) {
  const out = [];
  (Array.isArray(list) ? list : []).forEach((x) => {
    if (!x || !parseDate(x.date)) return;
    const kind = DATE_KINDS.some((k) => k.id === x.kind) ? x.kind : 'other';
    out.push({ kind, date: x.date, note: typeof x.note === 'string' ? x.note.slice(0, 40) : '', auto: x.auto === true }); // auto: 自動取得で入った日付
  });
  out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return out.slice(0, DATES_MAX);
}

/** 予定の一覧の中で、今日以降でいちばん近い「申込締切」。{ e, d } か、無ければ null。 */
export function nextCloseDeadline(events) {
  const t = todayIso();
  let best = null;
  events.forEach((e) => {
    const d = (e.dates || []).find((x) => x.kind === 'close' && x.date >= t);
    if (d && (!best || d.date < best.d.date)) best = { e, d };
  });
  return best;
}

/** 今日以降でいちばん近い関連日付。無ければ null。 */
export function nextDeadline(e) {
  const t = todayIso();
  return (e.dates || []).find((d) => d.date >= t) || null;
}
