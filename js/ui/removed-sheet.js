// 地域外で消した予定の履歴：毎日の自動取得が、設定した地域の外として消した予定を見て、必要なら一覧に戻す。
import { $, el, clear } from '../util/dom.js';
import { mountSheet, showSheet, hideSheet } from './sheet.js';
import { loadRemoved } from '../data/removed.js';
import { restoreFeedItem } from '../data/feed.js';
import { state } from '../state.js';
import { formatRange } from '../util/date.js';
import { toast } from './toast.js';

const MARKUP = `
  <div class="sheet" id="rm-sheet" role="dialog" aria-modal="true" aria-labelledby="rm-heading">
    <div class="sheet-head">
      <h2 id="rm-heading">地域外で消した予定</h2>
      <button type="button" class="ghost" id="rm-close">閉じる</button>
    </div>
    <div id="rm-body"></div>
  </div>`;

let wrap = null;

export function initRemovedSheet() {
  wrap = mountSheet(MARKUP);
  $('#rm-close').addEventListener('click', () => hideSheet(wrap));
}

function card(x) {
  const when = x.date ? formatRange({ date: x.date, end: x.end }) : '日程未定';
  const back = el('button', { class: 'btn', type: 'button', text: '復元' });
  const done = () => { back.disabled = true; back.textContent = '復元済み'; };
  if (state.restored.includes(x.id) || state.events.some((e) => e.feedId === x.id)) done();
  back.addEventListener('click', async () => {
    back.disabled = true;
    const r = await restoreFeedItem(x);
    toast(r.message);
    if (r.ok) done(); else back.disabled = false;
  });
  return el('article', { class: 'up-card' },
    el('p', { class: 'up-line' },
      el('b', { text: x.title }),
      el('span', { text: [x.tabName, when, x.place].filter(Boolean).join(' ・ ') }),
      el('span', { text: [x.reason, x.removedAt && `${x.removedAt.slice(5).replace('-', '/')}に消去`].filter(Boolean).join(' ・ ') })),
    el('div', { class: 'actions' }, back));
}

export async function openRemoved() {
  const body = $('#rm-body');
  clear(body);
  body.append(el('p', { class: 'help', text: '読み込み中…' }));
  showSheet(wrap);
  const list = await loadRemoved();
  clear(body);
  if (list === null) body.append(el('p', { class: 'help', text: '読み込めませんでした。通信を確認してください。' }));
  else if (!list.length) body.append(el('p', { class: 'help', text: '地域外として消した予定は、まだありません。' }));
  else list.forEach((x) => body.append(card(x)));
}
