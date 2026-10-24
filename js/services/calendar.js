// カレンダーへの追加。方法は3つ。
//  1. addToCalendar   … .ics を開く（iPhone 標準カレンダーの追加画面が出る）
//  2. shareIcs        … 共有シートで .ics を渡す（1 がうまくいかないとき）
//  3. googleCalendarUrl … Google カレンダーの追加画面を開くリンク
import { state } from '../state.js';
import { buildIcs } from './ics.js';
import { openBlob, saveFile } from './files.js';
import { parseDate, addDaysIso, eventEnd } from '../util/date.js';
import { safeUrl } from '../util/text.js';

const MIME = 'text/calendar';

export function addToCalendar(events) {
  const text = buildIcs(events, state.settings.alerts);
  openBlob(new Blob([text], { type: `${MIME};charset=utf-8` }));
}

export function shareIcs(events, filename) {
  return saveFile({ filename, mime: MIME, text: buildIcs(events, state.settings.alerts) });
}

export function googleCalendarUrl(e) {
  const a = parseDate(e.date);
  if (!a) return '';
  const compact = (iso) => iso.replace(/-/g, '');
  const details = [e.source ? `出典: ${e.source}` : '', safeUrl(e.url), e.note || ''].filter(Boolean).join('\n');
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE'
    + `&text=${encodeURIComponent(e.title || '')}`
    + `&dates=${compact(e.date)}/${compact(addDaysIso(eventEnd(e), 1))}`
    + `&location=${encodeURIComponent(e.place || '')}`
    + `&details=${encodeURIComponent(details)}`;
}
