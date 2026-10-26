// 一覧の一番上に出す、開催中と次の予定の1行の帯。
import { state, notify } from '../state.js';
import { el } from '../util/dom.js';
import { daysUntil, eventEnd, todayIso, parseDate } from '../util/date.js';
import { tabById } from '../data/tabs.js';
import { closeDetail } from './pin-close.js';

/** 開催中の予定を、1行の細い帯で出す（「次の予定」とは別に並べる）。 */
export function nowStrip(e) {
  const tab = tabById(e.type);
  const last = eventEnd(e) === todayIso();
  return el('button', {
    class: 'now', type: 'button', style: `--c:${tab ? `var(--c${tab.color})` : 'var(--muted)'}`,
    onclick: () => { if (state.ui.openId) { closeDetail(); return; } state.ui.openId = e.id; notify(); }
  },
    el('span', { class: 'now-pill', text: '開催中' }),
    el('span', { class: 'now-title', text: e.title || '（名前なし）' }),
    el('span', { class: 'now-end', text: last ? '今日まで' : `あと${daysUntil(eventEnd(e))}日` }));
}

/** 次の申込締切を、同じ1行の帯で出す。3日以内は、印を塗りつぶして目立たせる。 */
export function deadlineStrip(e, d) {
  const tab = tabById(e.type);
  const n = daysUntil(d.date);
  const p = parseDate(d.date);
  const left = n === 0 ? '今日まで' : n === 1 ? '明日まで' : `${p.m}/${p.d}（あと${n}日）`;
  return el('button', {
    class: 'now dl-s' + (n <= 3 ? ' soon' : ''), type: 'button', style: `--c:${tab ? `var(--c${tab.color})` : 'var(--muted)'}`,
    onclick: () => { if (state.ui.openId) { closeDetail(); return; } state.ui.openId = e.id; notify(); }
  },
    el('span', { class: 'now-pill', text: '申込締切' }),
    el('span', { class: 'now-title', text: e.title || '（名前なし）' }),
    el('span', { class: 'now-end', text: left }));
}

/** 次の予定も、開催中と同じ大きさの1行の帯で出す。 */
export function nextStrip(e) {
  const tab = tabById(e.type);
  const n = daysUntil(e.date);
  const left = n === 0 ? '今日' : n === 1 ? '明日' : `${n}日後`;
  return el('button', {
    class: 'now next-s', type: 'button', style: `--c:${tab ? `var(--c${tab.color})` : 'var(--muted)'}`,
    onclick: () => { if (state.ui.openId) { closeDetail(); return; } state.ui.openId = e.id; notify(); }
  },
    el('span', { class: 'now-pill', text: '次の予定' }),
    el('span', { class: 'now-title', text: e.title || '（名前なし）' }),
    el('span', { class: 'now-end', text: left }));
}
