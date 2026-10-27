// カレンダーへの追加（1件ずつ）。.ics を見えない枠で開き、iPhone 標準カレンダーの登録画面をポップアップで出す。
import { state } from '../state.js';
import { buildIcs } from './ics.js';

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
