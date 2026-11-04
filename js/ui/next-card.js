// 一覧の一番上に出す、開催中と次の予定の1行の帯。
import { tabColorCss } from '../util/tab-color.js';
import { state, notify } from '../state.js';
import { el } from '../util/dom.js';
import { daysUntil, parseDate } from '../util/date.js';
import { tabById } from '../data/tabs.js';
import { closeDetail } from './pin-close.js';

/** 開催中の予定を、1行の細い帯で出す（「次の予定」とは別に並べる）。 */
export function nowStrip(e) {
  const tab = tabById(e.type);
  return el('button', {
    class: 'now', type: 'button', style: `--c:${tabColorCss(tab)}`,
    onclick: () => { if (state.ui.openId) { closeDetail(); return; } state.ui.openId = e.id; notify(); }
  },
    el('span', { class: 'now-pill', text: '開催中' }),
    el('span', { class: 'now-title', text: e.title || '（名前なし）' }));
}

/** 次の申込締切を、同じ1行の帯で出す。3日以内は、印を塗りつぶして目立たせる。 */
export function deadlineStrip(e, d) {
  const tab = tabById(e.type);
  const n = daysUntil(d.date);
  const p = parseDate(d.date);
  return el('button', {
    class: 'now dl-s' + (n <= 3 ? ' soon' : ''), type: 'button', style: `--c:${tabColorCss(tab)}`,
    onclick: () => { if (state.ui.openId) { closeDetail(); return; } state.ui.openId = e.id; notify(); }
  },
    el('span', { class: 'now-pill', text: `締切 ${p.m}/${p.d}` }),
    el('span', { class: 'now-title', text: e.title || '（名前なし）' }));
}

/**
 * 同じ種類の帯が複数あるとき、先頭の1本と「+N件」だけを出す。「+N件」を押すと、残りが縦に並び、「閉じる」で戻る。
 * key は 'live'（開催中）か 'dl'（申込締切）。広げているかは state.ui.nowOpen[key]。帯が1本以下なら、そのまま返す。
 */
export function moreGroup(key, strips) {
  if (strips.length <= 1) return strips;
  const open = !!state.ui.nowOpen[key];
  const more = el('button', {
    class: 'now-more', type: 'button', 'aria-expanded': String(open),
    'aria-label': open ? '残りの帯を閉じる' : `ほか${strips.length - 1}件を表示`,
    onclick: () => { state.ui.nowOpen[key] = !open; notify(); }
  }, open ? '閉じる' : `+${strips.length - 1}件`);
  const head = el('div', { class: 'now-row' }, strips[0], more);
  return open ? [head, ...strips.slice(1)] : [head];
}

/** 次の予定も、開催中と同じ大きさの1行の帯で出す。 */
export function nextStrip(e) {
  const tab = tabById(e.type);
  return el('button', {
    class: 'now next-s', type: 'button', style: `--c:${tabColorCss(tab)}`,
    onclick: () => { if (state.ui.openId) { closeDetail(); return; } state.ui.openId = e.id; notify(); }
  },
    el('span', { class: 'now-pill', text: '次の予定' }),
    el('span', { class: 'now-title', text: e.title || '（名前なし）' }));
}
