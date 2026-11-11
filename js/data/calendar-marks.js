// 「カレンダーに追加」した印。予定ごとに、追加した期間（from〜to）を残す。
// iPhoneのカレンダーはアプリから読めないため、ボタンを押した時点で、ここに記録する。
// 記録は data/calendar-sync.js が GitHub の calendar.json に保存し、朝の支度ブリーフ（別アプリ）が読む。
import { state } from '../state.js';
import { commit } from './store.js';
import { eventEnd } from '../util/date.js';

/** 追加した期間があるか。 */
export const isOnCalendar = (e) => !!(e && e.cal && e.cal.length);

/** 追加した期間の文字（例: 11/15〜11/16, 11/20）。 */
export function calLabel(e) {
  const md = (iso) => `${+iso.slice(5, 7)}/${+iso.slice(8, 10)}`;
  return (e.cal || []).map((r) => (r.to > r.from ? `${md(r.from)}〜${md(r.to)}` : md(r.from))).join(', ');
}

/** 追加した印を付ける。ranges を省くと、予定の期間まるごと。同じ開始日は上書き。 */
export function markCalendar(e, ranges) {
  const target = state.events.find((x) => x.id === e.id);
  if (!target || !target.date) return;
  const add = ranges && ranges.length ? ranges : [{ from: target.date, to: eventEnd(target) }];
  const map = new Map((target.cal || []).map((r) => [r.from, r]));
  add.forEach((r) => map.set(r.from, { from: r.from, to: r.to || r.from }));
  target.cal = [...map.values()].sort((a, b) => (a.from < b.from ? -1 : 1)).slice(-20);
  commit();
}

/** 印を外す（ダッシュボードに出さない）。iPhoneのカレンダーの予定は消えないので、必要なら自分で消す。 */
export function unmarkCalendar(e) {
  const target = state.events.find((x) => x.id === e.id);
  if (!target || !isOnCalendar(target)) return;
  target.cal = [];
  commit();
}
