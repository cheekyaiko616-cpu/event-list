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
 * 一覧の上の1列の帯。groups は該当する項目だけ（[{ key: 'live'|'next'|'dl', label, strips }]）。
 * 各項目を1つのボタンにして横に並べ、押すとその項目の予定が下に縦に広がる（もう一度押すと閉じる。広げるのは1つだけ）。
 * 2件以上あるときは、ボタンに件数を添える。返すのは、1列の帯と、広げている項目の帯。
 */
export function nowBar(groups) {
  if (!groups.length) return [];
  // 広げた項目は、そのタブでだけ有効（タブを切り替えると、閉じた状態から始まる）
  const o = state.ui.nowOpen;
  const open = o && o.f === state.ui.filter ? groups.find((g) => g.key === o.key) : null;
  const bar = el('div', { class: 'now-bar' }, groups.map((g) => {
    const on = g === open;
    const n = g.strips.length;
    return el('button', {
      class: 'now-chip' + (on ? ' on' : ''), type: 'button', 'aria-expanded': String(on),
      onclick: () => { state.ui.nowOpen = on ? null : { f: state.ui.filter, key: g.key }; notify(); }
    },
      el('span', { class: 'chip-t', text: g.label }),
      n > 1 ? el('span', { class: 'chip-n', text: String(n) }) : null);
  }));
  return open ? [bar, ...open.strips] : [bar];
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
