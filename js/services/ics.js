// カレンダー用ファイル（.ics）の中身を作る。画面にも保存先にも触れない、文字を作るだけの部分。
import { ALERT_OPTIONS } from '../config.js';
import { parseDate, addDaysIso, eventEnd } from '../util/date.js';
import { safeUrl } from '../util/text.js';
import { kindLabel } from '../data/dates.js';

const encoder = new TextEncoder();

function escapeText(s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** 1行は75バイトまで。超える分は改行して先頭に空白を付ける（日本語の文字は途中で切らない）。 */
function foldLine(line) {
  const out = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const b = encoder.encode(ch).length;
    if (bytes + b > 75) {
      out.push(cur);
      cur = ' ';
      bytes = 1;
    }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join('\r\n');
}

const compact = (iso) => iso.replace(/-/g, '');
const p2 = (n) => String(n).padStart(2, '0');

function stamp(d) {
  return `${d.getUTCFullYear()}${p2(d.getUTCMonth() + 1)}${p2(d.getUTCDate())}T${p2(d.getUTCHours())}${p2(d.getUTCMinutes())}${p2(d.getUTCSeconds())}Z`;
}

/** 予定の終わり：URL・アラームをつけて VEVENT を閉じる。 */
function closeEvent(lines, rawUrl, alertIds, title) {
  const url = safeUrl(rawUrl);
  if (url) lines.push(`URL:${url}`);
  alertIds.forEach((id) => {
    const o = ALERT_OPTIONS.find((x) => x.id === id);
    if (!o) return;
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(title)}`, `TRIGGER:${o.trigger}`, 'END:VALARM');
  });
  lines.push('END:VEVENT');
  return lines;
}

function eventLines(e, alertIds, now) {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${e.id}@event-cho`,
    `DTSTAMP:${stamp(now)}`,
    `SEQUENCE:${(e.rev || 1) - 1}`, // 修正して追加し直したとき、カレンダー側の予定が上書きされる
    `DTSTART;VALUE=DATE:${compact(e.date)}`,
    `DTEND;VALUE=DATE:${compact(addDaysIso(eventEnd(e), 1))}`, // 終日の予定は終了日の翌日を指定する
    `SUMMARY:${escapeText(e.title)}`
  ];
  if (e.place) lines.push(`LOCATION:${escapeText(e.place)}`);
  const desc = [e.source ? `出典: ${e.source}` : '', e.note || ''].filter(Boolean).join('\n');
  if (desc) lines.push(`DESCRIPTION:${escapeText(desc)}`);
  return closeEvent(lines, e.url, alertIds, e.title);
}

/** 申し込み・締切などの関連日付を、1日だけの終日予定にする。 */
function dateLines(e, d, i, alertIds, now) {
  const title = `【${kindLabel(d.kind)}】${e.title}`;
  const lines = [
    'BEGIN:VEVENT',
    `UID:${e.id}-d${i}@event-cho`,
    `DTSTAMP:${stamp(now)}`,
    `SEQUENCE:${(e.rev || 1) - 1}`,
    `DTSTART;VALUE=DATE:${compact(d.date)}`,
    `DTEND;VALUE=DATE:${compact(addDaysIso(d.date, 1))}`,
    `SUMMARY:${escapeText(title)}`
  ];
  return closeEvent(lines, e.url, alertIds, title);
}

/** 予定の一覧から .ics の文字を作る。開催日が決まっていない予定は、関連日付だけを含める。 */
export function buildIcs(events, alertIds, now = new Date()) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//event-cho//JA', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  events.forEach((e) => {
    if (parseDate(e.date)) lines.push(...eventLines(e, alertIds, now));
    (e.dates || []).forEach((d, i) => { if (parseDate(d.date)) lines.push(...dateLines(e, d, i, alertIds, now)); });
  });
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
