// 一覧画面：月ごとの帯、日程未定のまとまり、見える分だけ描く仕組み。行と詳細は event-row.js、固定表示は pin.js。
import { state } from '../state.js';
import { $, el, clear } from '../util/dom.js';
import { todayIso } from '../util/date.js';
import { nextCloseDeadline } from '../data/dates.js';
import { isShown } from '../data/settings.js';
import { selectVisible, groupByMonth } from '../data/events.js';
import { openEventSheet } from './event-sheet.js';
import { nowStrip, nextStrip, deadlineStrip } from './next-card.js';
import { viewSwitchEl } from './view-switch.js';
import { rowEl } from './event-row.js';
import { renderPin } from './pin.js';

const hueOf = (month) => (month * 150) % 360; // 隣り合う月の色が大きく離れるようにする

function noteBox(...children) {
  return el('div', { class: 'note' }, children);
}

/* ---------- 帯と見出し ---------- */
function monthSection(g, past) {
  return el('section', { class: 'month', style: `--h:${hueOf(g.m)}` },
    el('div', { class: 'band' },
      el('div', { class: 'wrap band-in' },
        g.y !== new Date().getFullYear() ? el('span', { class: 'band-y', text: String(g.y) }) : null, // 今の年と違うときだけ、月の左に年を出す
        el('span', { class: 'band-m', text: String(g.m) }),
        el('span', { class: 'band-u', text: '月' }),
        el('span', { class: 'band-r', text: `${g.items.length}件` }))),
    el('ul', { class: 'wrap rows' }, g.items.map((e) => rowEl(e, past))));
}

function undatedSection(items) {
  return el('section', { class: 'month' },
    el('div', { class: 'band tbd' },
      el('div', { class: 'wrap band-in' },
        el('span', { class: 'band-t', text: '日程未定' }),
        el('span', { class: 'band-r', text: `公式発表待ち ・ ${items.length}件` }))),
    el('ul', { class: 'wrap rows' }, items.map((e) => rowEl(e, false))));
}

/* ---------- 空の状態 ---------- */
function emptyEl(past) {
  if (!past && state.events.length === 0) {
    return el('div', { class: 'wrap empty' },
      el('p', { text: '予定がありません。' }),
      el('div', { class: 'actions' },
        el('button', { class: 'btn solid', type: 'button', text: '＋ 予定を追加', onclick: () => openEventSheet(null) })));
  }
  return el('div', { class: 'wrap empty' },
    el('p', { text: past ? '終わった予定はありません。' : '予定がありません。' }),
    past ? null : el('div', { class: 'actions' },
      el('button', { class: 'btn solid', type: 'button', text: '＋ 予定を追加', onclick: () => openEventSheet(null) })));
}

/* ---------- 全体 ---------- */
const CHUNK = 40; // 1回に描く予定の行数のめやす
const loaded = { key: '', n: CHUNK }; // いま開いている一覧で、どこまで描いたか

function buildView(root, now, neighbor = false) {
  clear(root);
  clear(now);

  if (!state.ready) {
    root.append(el('p', { class: 'wrap empty', text: '予定を読み込んでいます…' }));
    return;
  }

  const past = state.ui.view === 'past';

  const notices = [];
  if (state.saveError) {
    notices.push(noteBox(el('p', { text: 'この端末に保存できませんでした。プライベートブラウズでは保存されないことがあります。' })));
  }
  if (notices.length) root.append(el('div', { class: 'wrap' }, notices));

  if (past) now.append(viewSwitchEl()); // 過去の一覧では、戻るボタンを一覧の外に固定する
  const v = selectVisible();
  if (!past) {
    const today = todayIso();
    const live = v.up.filter((e) => e.date <= today);
    const next = v.up.find((e) => e.date > today);
    const close = nextCloseDeadline([...v.up, ...v.undated].filter((e) => isShown(e, 'deadline'))); // 次の申込締切（日程未定の予定も含む）
    if (live.length || next || close) now.append(el('div', { class: 'wrap' }, [...live.map(nowStrip), next ? nextStrip(next) : null, close ? deadlineStrip(close.e, close.d) : null]));
  }
  // 一覧は、見える分だけ描く。下へ進むと、続きを足していく（予定が増えても軽く保つ）
  const sections = groupByMonth(past ? v.past : v.up).map((g) => ({ n: g.items.length, make: () => monthSection(g, past) }));
  if (!past && v.undated.length) sections.push({ n: v.undated.length, make: () => undatedSection(v.undated) });
  if (!sections.length) root.append(emptyEl(past));

  const key = `${state.ui.filter}|${state.ui.view}`;
  if (!neighbor && loaded.key !== key) { loaded.key = key; loaded.n = CHUNK; } // タブや表示を切り替えたら、最初の分から
  let limit = neighbor ? CHUNK : loaded.n;
  let i = 0, rows = 0;
  const fill = () => {
    while (i < sections.length && rows < limit) { rows += sections[i].n; root.insertBefore(sections[i].make(), tail); i++; }
    if (i >= sections.length) { more.remove(); watch && watch.disconnect(); }
  };
  const tail = el('div', { class: 'end-space' });
  const more = el('div', { class: 'more', 'aria-hidden': 'true' });
  root.append(tail);
  let watch = null;
  fill();
  if (!neighbor && i < sections.length && 'IntersectionObserver' in window) {
    root.insertBefore(more, tail);
    watch = new IntersectionObserver((es) => {
      if (!es.some((x) => x.isIntersecting)) return;
      limit += CHUNK; loaded.n = limit; // 再描画されても、ここまでは描き直す（スクロール位置が飛ばない）
      fill();
      if (i < sections.length) { watch.unobserve(more); watch.observe(more); } // まだ画面内なら続けて足す
    }, { rootMargin: '600px 0px' });
    watch.observe(more);
  } else if (!neighbor) { limit = Infinity; fill(); }
}

export function renderEventList() {
  if (state.ui.screen === 'settings') return; // 設定を開いている間は、一覧を描き直さない
  renderPin();
  buildView($('#app-list'), $('#app-now')); // 開催中・次の予定は、一覧とは別に固定しておく
}

/** スワイプ中に隣のタブの画面を見せるための、仮の画面を作る（今の画面や状態は変えない）。 */
export function buildNeighborView(filterId) {
  const keep = { f: state.ui.filter, o: state.ui.openId };
  state.ui.filter = filterId;
  state.ui.openId = null;
  const now = el('div', { id: 'ghost-now' });
  const list = el('div', { id: 'ghost-list' });
  try { buildView(list, now, true); } finally { state.ui.filter = keep.f; state.ui.openId = keep.o; }
  return { now, list };
}
