// カレンダーへの追加。方法は3つ。
//  1. addToCalendar   … .ics を開く（iPhone 標準カレンダーの追加画面が出る）
//  2. shareIcs        … 共有シートで .ics を渡す（1 がうまくいかないとき）
//  3. googleCalendarUrl … Google カレンダーの追加画面を開くリンク
import { state } from '../state.js';
import { buildIcs } from './ics.js';
import { openBlob, saveFile } from './files.js';
import { parseDate, addDaysIso, eventEnd } from '../util/date.js';
import { safeUrl, safeFileName } from '../util/text.js';

const MIME = 'text/calendar';

/**
 * カレンダーに追加する。iPhone では共有シートを先に出す（ホーム画面のアプリではファイルを直接開けないため）。
 * 共有シートが使えないときだけ、ファイルを開く。※ ボタンを押した直後に呼ぶこと。
 */
export async function addToCalendar(events) {
  const text = buildIcs(events, state.settings.alerts);
  const name = events.length === 1 ? safeFileName(events[0].title) : 'event-list';
  const file = typeof File === 'function' ? new File([text], `${name}.ics`, { type: MIME }) : null;
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled';
    }
  }
  openBlob(new Blob([text], { type: `${MIME};charset=utf-8` }));
  return 'opened';
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
