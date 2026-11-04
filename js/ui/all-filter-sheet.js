// 「すべて」タブの上にある絞り込みボタンと、その選択画面。
import { state, notify } from '../state.js';
import { $, el, clear } from '../util/dom.js';
import { colorCss } from '../util/tab-color.js';
import { mountSheet, showSheet, hideSheet } from './sheet.js';
import { sortedTabs } from '../data/tabs.js';
import { isOff, offCount, setOff, resetOff } from '../data/all-filter.js';

const MARKUP = `
  <div class="sheet" id="af-sheet" role="dialog" aria-modal="true" aria-labelledby="af-heading">
    <div class="sheet-head">
      <h2 id="af-heading">「すべて」に出すタブ</h2>
    </div>
    <p class="help">外したタブの予定は「すべて」に出ません（タブも予定も消えません）。</p>
    <ul class="tab-list" id="af-list"></ul>
    <div class="form-actions">
      <button type="button" class="btn grow" id="af-reset">すべて出す</button>
      <button type="button" class="btn solid grow" id="af-close">閉じる</button>
    </div>
  </div>`;

let wrap = null;

export function initAllFilter() {
  wrap = mountSheet(MARKUP);
  $('#af-close').addEventListener('click', () => hideSheet(wrap));
  $('#af-reset').addEventListener('click', () => { resetOff(); renderList(); notify(); });
}

function renderList() {
  const list = $('#af-list');
  clear(list);
  sortedTabs().filter((t) => !t.hidden).forEach((t) => {
    const input = el('input', { type: 'checkbox', 'data-af': t.id });
    input.checked = !isOff(t.id);
    input.addEventListener('change', () => { setOff(t.id, !input.checked); notify(); });
    list.append(el('li', { class: 'tab-row' },
      el('label', { class: 'check af-row' }, input,
        el('span', { class: 'dot', style: `--c:${colorCss(t.color)}` }),
        el('span', { class: 'tab-row-name', text: t.name }))));
  });
}

/** 一覧の上に固定する、絞り込みボタン。「すべて」を開いているときだけ出す。 */
export function allFilterEl() {
  const tabs = state.tabs.filter((t) => !t.hidden);
  const n = offCount();
  return el('div', { class: 'wrap af-bar' },
    el('button', {
      class: `btn af-btn${n ? ' on' : ''}`, type: 'button', id: 'btn-af',
      onclick: () => { renderList(); showSheet(wrap); }
    }, '絞り込み ', el('span', { class: 'af-n', text: n ? `${tabs.length - n}/${tabs.length}` : '全て' })));
}
