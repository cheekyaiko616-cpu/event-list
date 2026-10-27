// イベント更新履歴の画面：毎日の自動調査で、何が追加・変更されたかを、日ごとのカードで見る。
import { $, el, clear } from '../util/dom.js';
import { mountSheet, showSheet, hideSheet } from './sheet.js';
import { loadUpdates } from '../data/updates.js';

const MARKUP = `
  <div class="sheet" id="up-sheet" role="dialog" aria-modal="true" aria-labelledby="up-heading">
    <div class="sheet-head">
      <h2 id="up-heading">イベント更新履歴</h2>
      <button type="button" class="ghost" id="up-close">閉じる</button>
    </div>
    <div id="up-body"></div>
  </div>`;

let wrap = null;

export function initUpdatesSheet() {
  wrap = mountSheet(MARKUP);
  $('#up-close').addEventListener('click', () => hideSheet(wrap));
}

const WD = ['日', '月', '火', '水', '木', '金', '土'];

function dateEl(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const w = WD[new Date(y, m - 1, d).getDay()];
  return el('div', { class: 'up-date' },
    el('b', { class: 'up-md', text: `${m}/${d}` }),
    el('span', { class: 'up-yw', text: `${y}（${w}）` }));
}

function count(label, n, cls) {
  return el('span', { class: `up-count ${cls}${n ? '' : ' zero'}`, text: `${label} ${n}` });
}

function group(title, cls, lines) {
  if (!lines.length) return null;
  return el('div', { class: 'up-group' }, el('h4', { class: cls, text: title }), ...lines);
}

function entryEl(x) {
  const added = x.added.map((a) => el('p', { class: 'up-line' },
    el('b', { text: a.title }), el('span', { text: [a.tab, a.when].filter(Boolean).join(' ・ ') })));
  const changed = x.changed.map((c) => el('p', { class: 'up-line' },
    el('b', { text: c.title }), el('span', { text: `${c.before || '（なし）'} → ${c.after || '（なし）'}` })));
  return el('article', { class: 'up-card' },
    el('header', { class: 'up-head' },
      dateEl(x.date),
      el('div', { class: 'up-counts' },
        count('追加', x.added.length, 'c-add'), count('変更', x.changed.length, 'c-chg'))),
    group('追加', 'g-add', added),
    group('変更', 'g-chg', changed));
}

export async function openUpdates() {
  const body = $('#up-body');
  clear(body);
  body.append(el('p', { class: 'help', text: '読み込み中…' }));
  showSheet(wrap);
  const entries = await loadUpdates();
  clear(body);
  if (entries === null) body.append(el('p', { class: 'help', text: '読み込めませんでした。通信を確認してください。' }));
  else if (!entries.length) body.append(el('p', { class: 'help', text: 'まだ記録がありません。' }));
  else entries.forEach((x) => body.append(entryEl(x)));
}
