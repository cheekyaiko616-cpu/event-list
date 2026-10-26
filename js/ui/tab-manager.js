// タブの一覧の画面（設定から開く）。並び替えと、編集・追加の画面への入口だけを持つ。
import { $, el, clear } from '../util/dom.js';
import { mountSheet, showSheet, hideSheet } from './sheet.js';
import { sortedTabs, moveTab } from '../data/tabs.js';
import { openTabAdd } from './tab-add.js';
import { openTabEdit } from './tab-edit.js';

const MARKUP = `
  <div class="sheet" id="tm-sheet" role="dialog" aria-modal="true" aria-labelledby="tm-heading">
    <div class="sheet-head">
      <h2 id="tm-heading">タブ</h2>
      <button type="button" class="ghost" id="tm-close">閉じる</button>
    </div>
    <ul class="tab-list" id="tm-list"></ul>
    <div class="form-actions">
      <button type="button" class="btn solid grow" id="tm-add">＋ タブを追加</button>
    </div>
  </div>`;

let wrap = null;

export function initTabManager() {
  wrap = mountSheet(MARKUP);
  $('#tm-close').addEventListener('click', () => hideSheet(wrap));
  $('#tm-add').addEventListener('click', openTabAdd);
}

export function openTabManager() {
  showSheet(wrap);
  renderTabManager();
}

function rowEl(tab, i, tabs) {
  const move = (dir) => async () => {
    await moveTab(tab.id, dir);
    const again = document.querySelector(`[data-mv="${tab.id}:${dir}"]`);
    if (again && !again.disabled) again.focus();
  };
  return el('li', { class: 'tab-row' },
    el('button', {
      class: 'tab-row-main', type: 'button', 'data-edit': tab.id, onclick: () => openTabEdit(tab.id)
    },
      el('span', { class: 'dot', style: `--c:var(--c${tab.color})` }),
      el('span', { class: 'tab-row-name', text: tab.name }),
      el('span', { class: 'tab-row-go', text: '編集' })),
    el('div', { class: 'mv' },
      el('button', { class: 'btn', type: 'button', text: '↑', 'aria-label': '前へ', 'data-mv': `${tab.id}:-1`, disabled: i === 0, onclick: move(-1) }),
      el('button', { class: 'btn', type: 'button', text: '↓', 'aria-label': '後ろへ', 'data-mv': `${tab.id}:1`, disabled: i === tabs.length - 1, onclick: move(1) })));
}

/** 画面が開いているときだけ描き直す。 */
export function renderTabManager() {
  if (!wrap || wrap.hidden) return;
  const list = $('#tm-list');
  clear(list);
  const tabs = sortedTabs();
  if (!tabs.length) list.append(el('li', { class: 'help', text: 'タブがありません。' }));
  tabs.forEach((t, i) => list.append(rowEl(t, i, tabs)));
}
