// 一覧の一番上に出す「次の予定」のカード。
import { state, notify } from '../state.js';
import { el } from '../util/dom.js';
import { daysUntil, eventEnd, formatRange, todayIso } from '../util/date.js';
import { tabById } from '../data/tabs.js';

function countdown(e) {
  if (e.date <= todayIso()) return { big: '開催中', small: eventEnd(e) === todayIso() ? '今日が最終日' : `あと${daysUntil(eventEnd(e))}日で終了` };
  const n = daysUntil(e.date);
  if (n === 0) return { big: '今日', small: '' };
  if (n === 1) return { big: '明日', small: '' };
  return { big: String(n), small: '日後' };
}

/** e は一覧の先頭にある、これからの予定。タップすると、その予定の詳細を開く。 */
export function nextCard(e) {
  const c = countdown(e);
  const tab = tabById(e.type);
  return el('button', {
    class: 'next', type: 'button', style: `--c:${tab ? `var(--c${tab.color})` : 'var(--muted)'}`,
    onclick: () => {
      state.ui.openId = e.id;
      notify();
      const row = document.querySelector(`[data-id="${e.id}"]`);
      if (row) row.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  },
    el('span', { class: 'next-cd' },
      el('b', { class: 'next-big' + (c.big.length > 3 ? ' word' : ''), text: c.big }),
      c.small ? el('span', { class: 'next-small', text: c.small }) : null),
    el('span', { class: 'next-body' },
      el('span', { class: 'next-label', text: '次の予定' }),
      el('span', { class: 'next-title', text: e.title || '（名前なし）' }),
      el('span', { class: 'next-when', text: formatRange(e) })));
}
