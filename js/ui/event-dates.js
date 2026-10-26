// 予定の編集画面にある「申し込み・期限の日付」の入力欄。行の追加・削除と、入力内容の読み出しだけを持つ。
import { $, el, clear } from '../util/dom.js';
import { DATE_KINDS, DATES_MAX } from '../config.js';

export const DATES_MARKUP = `
    <details class="more" id="es-dates-box">
      <summary id="es-dates-sum">申し込み・期限の日付</summary>
      <div class="dates-list" id="es-dates"></div>
      <button type="button" class="btn" id="es-dates-add">＋ 日付を追加</button>
    </details>`;

function rowEl(d) {
  const sel = el('select', { class: 'input dk', 'aria-label': '種類' },
    DATE_KINDS.map((k) => el('option', { value: k.id, text: k.label, selected: k.id === d.kind })));
  const date = el('input', { class: 'input dd', type: 'date', 'aria-label': '日付', value: d.date || '' });
  const del = el('button', {
    class: 'btn', type: 'button', text: '×', 'aria-label': 'この日付を消す',
    onclick: (ev) => { ev.currentTarget.closest('.date-row').remove(); refresh(); }
  });
  const row = el('div', { class: 'date-row' }, sel, date, del);
  if (d.auto) { row.dataset.auto = '1'; row.dataset.k0 = d.kind; row.dataset.d0 = d.date; } // 自動取得の日付。直さなければ自動のまま
  return row;
}

function refresh() {
  const n = document.querySelectorAll('#es-dates .date-row').length;
  $('#es-dates-add').disabled = n >= DATES_MAX;
  $('#es-dates-sum').textContent = n ? `申し込み・期限の日付（${n}件）` : '申し込み・期限の日付';
}

export function initDatesEditor() {
  $('#es-dates-add').addEventListener('click', () => {
    if (document.querySelectorAll('#es-dates .date-row').length >= DATES_MAX) return;
    const row = rowEl({ kind: 'close', date: '' });
    $('#es-dates').append(row);
    refresh();
    row.querySelector('.dd').focus();
  });
}

/** 編集画面を開くときに、保存済みの日付を並べる。 */
export function fillDates(list) {
  const box = $('#es-dates');
  clear(box);
  (list || []).forEach((d) => box.append(rowEl(d)));
  $('#es-dates-box').open = !!(list && list.length);
  refresh();
}

/** 入力された日付を読む。日付が空の行は無視する。 */
export function readDates() {
  return Array.from(document.querySelectorAll('#es-dates .date-row'))
    .map((r) => {
      const kind = r.querySelector('.dk').value, date = r.querySelector('.dd').value;
      return { kind, date, note: '', auto: r.dataset.auto === '1' && kind === r.dataset.k0 && date === r.dataset.d0 };
    })
    .filter((d) => d.date);
}
