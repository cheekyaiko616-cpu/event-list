// カレンダーへの追加。方法は3つ。
//  1. addToCalendar   … .ics を開く（iPhone 標準カレンダーの追加画面が出る）
//  2. shareIcs        … 共有シートで .ics を渡す（1 がうまくいかないとき）
//  3. googleCalendarUrl … Google カレンダーの追加画面を開くリンク
import { state } from '../state.js';
import { buildIcs } from './ics.js';
import { saveFile } from './files.js';
import { parseDate, addDaysIso, eventEnd } from '../util/date.js';
import { safeUrl } from '../util/text.js';

const MIME = 'text/calendar';

function icsFor(events) {
  return buildIcs(events, state.settings.alerts);
}

/**
 * 標準カレンダーに追加する。画面は切り替えず、見えない枠で .ics を開く。
 * iPhone では、カレンダーの追加画面がポップアップで出る。※ ボタンを押した直後に呼ぶこと。
 */
export function addToCalendar(events) {
  const url = URL.createObjectURL(new Blob([icsFor(events)], { type: `${MIME};charset=utf-8` }));
  const f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0;pointer-events:none';
  f.setAttribute('aria-hidden', 'true');
  f.src = url;
  document.body.append(f);
  setTimeout(() => { f.remove(); URL.revokeObjectURL(url); }, 60000);
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

/**
 * Googleカレンダーの登録画面を、アプリの中の画面で開く。
 * アプリに戻ってきたら、開いた画面（保存後に白く残る画面）を閉じにいく。
 * 閉じられるかはiPhone次第なので、戻った直後と、画面に触れたときに、何度か試す。
 */
export function openGoogleCalendar(e) {
  const w = window.open(googleCalendarUrl(e), '_blank');
  if (!w) return;
  const names = ['visibilitychange', 'focus', 'pageshow', 'touchstart', 'click'];
  const stop = () => names.forEach((n) => { document.removeEventListener(n, tryClose, true); window.removeEventListener(n, tryClose, true); });
  function tryClose() {
    if (document.visibilityState === 'hidden') return;
    // 1) 同じサイトの小さなページ（close.html）に切り替えて、そのページ自身に閉じさせる。
    // 2) うまくいかなければ、外から閉じる命令を出す。閉じられなくても、案内の画面が残る。
    try { w.location.replace(new URL('close.html', location.href).href); } catch (_) { /* 次へ */ }
    try { w.close(); } catch (_) { /* 閉じられなくても支障はない */ }
    if (w.closed) stop();
  }
  names.forEach((n) => { document.addEventListener(n, tryClose, true); window.addEventListener(n, tryClose, true); });
  setTimeout(stop, 10 * 60 * 1000);
}
