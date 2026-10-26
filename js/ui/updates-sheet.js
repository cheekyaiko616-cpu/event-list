// 更新の履歴の画面：毎週の自動調査で、何が追加・変更されたかを見る。
import { $, el, clear } from '../util/dom.js';
import { mountSheet, showSheet, hideSheet } from './sheet.js';
import { loadUpdates } from '../data/updates.js';

const MARKUP = `
  <div class="sheet" id="up-sheet" role="dialog" aria-modal="true" aria-labelledby="up-heading">
    <div class="sheet-head">
      <h2 id="up-heading">更新の履歴</h2>
      <button type="button" class="ghost" id="up-close">閉じる</button>
    </div>
    <div id="up-body"></div>
  </div>`;

let wrap = null;

export function initUpdatesSheet() {
  wrap = mountSheet(MARKUP);
  $('#up-close').addEventListener('click', () => hideSheet(wrap));
}

function section(title, nodes) {
  return nodes.length ? el('div', { class: 'up-sec' }, el('h4', { text: title }), ...nodes) : null;
}

function entryEl(x) {
  const added = x.added.map((a) => el('p', { class: 'up-line' },
    el('b', { text: a.title }), el('span', { text: [a.tab, a.when].filter(Boolean).join('　') })));
  const changed = x.changed.map((c) => el('p', { class: 'up-line' },
    el('b', { text: c.title }), el('span', { text: `${c.before || '（なし）'} → ${c.after || '（なし）'}` })));
  const uncertain = x.uncertain.map((u) => el('p', { class: 'up-line' }, el('span', { text: u })));
  return el('article', { class: 'up-entry' },
    el('h3', { text: x.date.replace(/-/g, '/') }),
    el('p', { class: 'up-sum', text: x.summary || `追加 ${x.added.length}件・変更 ${x.changed.length}件・変更なし ${x.unchanged}件` }),
    section(`追加（${x.added.length}件）`, added),
    section(`変更（${x.changed.length}件）`, changed),
    section('確認できなかったこと', uncertain));
}

export async function openUpdates() {
  const body = $('#up-body');
  clear(body);
  body.append(el('p', { class: 'help', text: '読み込み中…' }));
  showSheet(wrap);
  const entries = await loadUpdates();
  clear(body);
  if (entries === null) body.append(el('p', { class: 'help', text: '履歴を読み込めませんでした。通信を確認してください。' }));
  else if (!entries.length) body.append(el('p', { class: 'help', text: 'まだ記録がありません。' }));
  else entries.forEach((x) => body.append(entryEl(x)));
}
