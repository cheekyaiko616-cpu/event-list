// 日付まわりの計算と表示。日付は 'YYYY-MM-DD' の文字列で持つ。
import { WEEKDAYS } from '../config.js';

const pad = (n) => (n < 10 ? '0' : '') + n;

// 並べ替え用。localeCompare は呼ぶたびに照合の準備をするので遅い。1つを使い回す
const ja = new Intl.Collator('ja');
/** 日本語の名前順。sort() にそのまま渡せる。 */
export const compareJa = (a, b) => ja.compare(a || '', b || '');

const parsed = new Map(); // 同じ日付の文字は何度も調べる（一覧・並べ替え・バッジ）ので、結果を覚える
const PARSED_MAX = 2000;

/** 'YYYY-MM-DD' を { y, m, d } にする。実在しない日付や空欄は null。返した値は書き換えないこと（使い回すため）。 */
export function parseDate(s) {
  if (typeof s !== 'string') return null;
  const hit = parsed.get(s);
  if (hit !== undefined) return hit;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  let out = null;
  if (m) {
    const y = +m[1], mo = +m[2], d = +m[3];
    const t = new Date(y, mo - 1, d);
    if (t.getFullYear() === y && t.getMonth() === mo - 1 && t.getDate() === d) out = { y, m: mo, d };
  }
  if (parsed.size >= PARSED_MAX) parsed.clear();
  parsed.set(s, out);
  return out;
}

export const weekday = (p) => WEEKDAYS[new Date(p.y, p.m - 1, p.d).getDay()];
const toIso = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export const todayIso = () => toIso(new Date());

export function addDaysIso(iso, n) {
  const p = parseDate(iso);
  return toIso(new Date(p.y, p.m - 1, p.d + n));
}

/** 予定の最終日。終了日が無ければ開始日と同じ。 */
export const eventEnd = (e) => (e.end && e.end > e.date ? e.end : e.date);

const formatFull = (p) => `${p.y}年${p.m}月${p.d}日(${weekday(p)})`;

export function formatRange(e) {
  const a = parseDate(e.date);
  if (!a) return '未定（公式発表待ち）';
  const last = eventEnd(e);
  if (last === e.date) return formatFull(a);
  const b = parseDate(last);
  if (a.y === b.y && a.m === b.m) return `${formatFull(a)}〜${b.d}日(${weekday(b)})`;
  return `${formatFull(a)}〜${formatFull(b)}`;
}

/** 日付の早い順。同じ日は名前順。 */
export function compareEvents(a, b) {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  return compareJa(a.title, b.title);
}

/** 今日から指定日までの日数。今日なら0、明日なら1。 */
export function daysUntil(iso) {
  const a = parseDate(todayIso()), b = parseDate(iso);
  return Math.round((new Date(b.y, b.m - 1, b.d) - new Date(a.y, a.m - 1, a.d)) / 86400000);
}
