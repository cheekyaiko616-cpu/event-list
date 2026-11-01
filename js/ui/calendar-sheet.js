// 「カレンダーに追加」の画面（下から出る）。何日かにまたがる予定で、期間まるごと／特定の日だけ を選ぶ。
// 1日だけの予定は、この画面を出さずに、そのまま追加する（event-row.js）。
import { $, el, clear } from '../util/dom.js';
import { mountSheet, showSheet, hideSheet } from './sheet.js';
import { addToCalendar } from '../services/calendar.js';
import { closeDetail } from './pin-close.js';
import { parseDate, weekday, eventEnd, addDaysIso } from '../util/date.js';

const MARKUP = `
  <div class="sheet" id="cs-sheet" role="dialog" aria-modal="true" aria-labelledby="cs-heading">
    <div class="sheet-head">
      <h2 id="cs-heading">カレンダーに追加</h2>
      <button type="button" class="ghost" id="cs-close">閉じる</button>
    </div>
    <div id="cs-body"></div>
  </div>`;

let wrap = null;

export function initCalendarSheet() {
  wrap = mountSheet(MARKUP);
  $('#cs-close').addEventListener('click', () => hideSheet(wrap));
}

const md = (iso) => { const p = parseDate(iso); return `${p.m}/${p.d}(${weekday(p)})`; };

/** 選んだ日 → 続いている日をまとめた「予定」の並び。同じ日の追加し直しで上書きされるよう、IDは開始日で決める。 */
function pickedEvents(e, days) {
  const out = [];
  let from = null;
  let prev = null;
  const flush = () => {
    if (from) out.push({ ...e, id: `${e.id}-${from}`, date: from, end: prev > from ? prev : '', dates: [] });
  };
  days.forEach((d) => {
    if (prev && addDaysIso(prev, 1) === d) { prev = d; return; }
    flush();
    from = d;
    prev = d;
  });
  flush();
  return out;
}

/** e: 何日かにまたがる予定。 */
export function openCalendarSheet(e) {
  const days = [];
  for (let d = e.date; d <= eventEnd(e); d = addDaysIso(d, 1)) days.push(d);

  const radios = { all: null, pick: null };
  const list = el('div', { class: 'cs-days', hidden: true });
  const boxes = days.map((d) => {
    const b = el('input', { type: 'checkbox', value: d });
    list.append(el('label', { class: 'check' }, b, el('span', { text: md(d) })));
    return b;
  });
  const opt = (key, label) => {
    const r = el('input', { type: 'radio', name: 'cs-mode', value: key });
    radios[key] = r;
    return el('label', { class: 'seg-opt' }, r, el('span', { text: label }));
  };
  const go = el('button', { type: 'button', class: 'btn solid grow', text: '追加' });
  const refresh = () => {
    const pick = radios.pick.checked;
    list.hidden = !pick;
    go.disabled = pick && !boxes.some((b) => b.checked);
  };
  const row = el('div', { class: 'seg-row' }, opt('all', `期間まるごと（${md(e.date)}〜${md(eventEnd(e))}）`), opt('pick', '日を選ぶ'));
  radios.all.checked = true;
  row.addEventListener('change', refresh);
  list.addEventListener('change', refresh);

  go.addEventListener('click', () => {
    // ボタンを押した直後に呼ぶ（iPhoneのカレンダーの画面を出すため）
    if (radios.pick.checked) addToCalendar(pickedEvents(e, boxes.filter((b) => b.checked).map((b) => b.value)));
    else addToCalendar([e]);
    hideSheet(wrap);
    closeDetail();
  });
  const cancel = el('button', { type: 'button', class: 'btn', text: 'やめる', onclick: () => hideSheet(wrap) });

  const body = $('#cs-body');
  clear(body);
  body.append(
    el('p', { class: 'cs-title', text: e.title || '' }),
    el('fieldset', { class: 'seg' }, el('legend', { class: 'legend', text: '追加する日' }), row),
    list,
    el('div', { class: 'form-actions' }, go, cancel));
  refresh();
  showSheet(wrap);
}
