// 一覧のまとめ方（月・週）。画面や保存に関わらない計算だけを置く（tools/test.mjs で確かめる）。
import { parseDate, addDaysIso } from './date.js';

/** その日を含む週の月曜の日付。 */
export function weekStart(iso) {
  const p = parseDate(iso);
  return addDaysIso(iso, -((new Date(p.y, p.m - 1, p.d).getDay() + 6) % 7));
}

/** 一覧に置く場所を決める日付。今週より前に始まって続いている予定は、今日の位置（今週）に置く。 */
export function placeDate(e, today) {
  return e.date < weekStart(today) ? today : e.date;
}

/** 月の変わり目ごとにまとめる。key は置く日付を返す関数（並びは key の順を前提にする）。 */
export function groupByMonth(items, key = (e) => e.date) {
  const out = [];
  let cur = null;
  items.forEach((e) => {
    const p = parseDate(key(e));
    const k = p.y * 100 + p.m;
    if (!cur || cur.key !== k) {
      cur = { key: k, y: p.y, m: p.m, items: [] };
      out.push(cur);
    }
    cur.items.push(e);
  });
  return out;
}

/** 週（月曜はじまり）ごとにまとめる。start / end はその週の月曜と日曜の日付。 */
export function groupByWeek(items, key = (e) => e.date) {
  const out = [];
  let cur = null;
  items.forEach((e) => {
    const mon = weekStart(key(e));
    if (!cur || cur.start !== mon) {
      cur = { start: mon, end: addDaysIso(mon, 6), items: [] };
      out.push(cur);
    }
    cur.items.push(e);
  });
  return out;
}
