// 一覧画面：月ごとの帯、日程未定のまとまり、見える分だけ描く仕組み。行と詳細は event-row.js、固定表示は pin.js。
import { state } from '../state.js';
import { $, el, clear } from '../util/dom.js';
import { todayIso, addDaysIso, parseDate, compareEvents } from '../util/date.js';
import { closeDeadlines } from '../data/dates.js';
import { isShown } from '../data/settings.js';
import { tabById } from '../data/tabs.js';
import { selectVisible } from '../data/events.js';
import { groupByMonth, groupByWeek, placeDate, weekStart } from '../util/group.js';
import { openEventSheet } from './event-sheet.js';
import { nowStrip, nextStrip, deadlineStrip, nowBar } from './next-card.js';
import { viewSwitchEl } from './view-switch.js';
import { rowEl } from './event-row.js';
import { renderPin } from './pin.js';
import { statePanel } from './state-panel.js';

const hueOf = (month) => (month * 150) % 360; // 隣り合う月の色が大きく離れるようにする

/* ---------- 帯と見出し ---------- */
/** 週の帯の文字。今週・来週・先週はそう呼び、それ以外は「11/16の週」。 */
function weekLabel(g) {
  const t = todayIso();
  const thisMon = weekStart(t);
  if (g.start === thisMon) return '今週';
  if (g.start === addDaysIso(thisMon, 7)) return '来週';
  if (g.start === addDaysIso(thisMon, -7)) return '先週';
  const p = parseDate(g.start);
  return `${p.m}/${p.d}の週`;
}

function weekRange(g) {
  const a = parseDate(g.start), b = parseDate(g.end);
  const yr = a.y !== new Date().getFullYear() ? `${a.y}/` : '';
  return `${yr}${a.m}/${a.d}–${a.m === b.m ? '' : `${b.m}/`}${b.d}`;
}

/** 月の帯（上に固定）。その中を、週の見出しで区切る。 */
function monthSection(g, past, key) {
  const parts = [];
  groupByWeek(g.items, key).forEach((w) => {
    parts.push(el('div', { class: 'week' },
      el('div', { class: 'week-h' },
        el('div', { class: 'wrap week-in' },
          el('span', { class: 'week-w', text: weekLabel(w) }),
          el('span', { class: 'week-s', text: weekRange(w) }),
          el('span', { class: 'week-n', text: `${w.items.length}件` }))),
      el('ul', { class: 'wrap rows' }, w.items.map((e) => rowEl(e, past)))));
  });
  return el('section', { class: 'month', style: `--h:${hueOf(g.m)}` },
    el('div', { class: 'band' },
      el('div', { class: 'wrap band-in' },
        g.y !== new Date().getFullYear() ? el('span', { class: 'band-y', text: String(g.y) }) : null, // 今の年と違うときだけ、月の左に年を出す
        el('span', { class: 'band-m', text: String(g.m) }),
        el('span', { class: 'band-u', text: '月' }),
        el('span', { class: 'band-r', text: `${g.items.length}件` }))),
    parts);
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
  return statePanel({
    status: 'empty',
    message: past ? '終わった予定はありません。' : '予定がありません。',
    actions: past ? [] : [{ text: '＋ 予定を追加', onClick: () => openEventSheet(null), solid: true }]
  });
}

/* ---------- 全体 ---------- */
const CHUNK = 12; // 1回に描く予定の行数のめやす
const loaded = { key: '', n: CHUNK }; // いま開いている一覧で、どこまで描いたか

function buildView(root, now, neighbor = false) {
  clear(root);
  clear(now);

  if (!state.ready) {
    root.append(statePanel({ status: 'loading', message: '予定を読み込んでいます…' }));
    return;
  }

  const past = state.ui.view === 'past';

  if (state.saveError) {
    root.append(statePanel({ status: 'error', message: 'この端末に保存できませんでした。プライベートブラウズでは保存されないことがあります。' }));
  }

  if (past) now.append(viewSwitchEl()); // 過去の一覧では、戻るボタンを一覧の外に固定する
  const v = selectVisible();
  if (!past) appendNow(now, v);

  // これからの一覧では、今週より前に始まって続いている予定を「今週」に置く（終わった予定に見えないように）
  const today = todayIso();
  const key = past ? (e) => e.date : (e) => placeDate(e, today);
  const items = past ? v.past : v.up.slice().sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : compareEvents(a, b)));
  const sections = groupByMonth(items, key).map((g) => ({ n: g.items.length, make: () => monthSection(g, past, key) }));
  if (!past && v.undated.length) sections.push({ n: v.undated.length, make: () => undatedSection(v.undated) });
  if (!sections.length) root.append(emptyEl(past));
  appendChunked(root, sections, neighbor);
  if (!neighbor) syncBandH(root);
}

/** 月の帯の高さを覚えておく。週の見出しを、その真下に重ねて固定するため。 */
function syncBandH(root) {
  const set = () => {
    const b = root.querySelector('.band');
    if (b && b.offsetHeight) document.documentElement.style.setProperty('--band-h', `${b.offsetHeight}px`);
  };
  set();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(set);
}

/** 一覧の上に固定する、開催中・次の予定・次の申込締切。 */
function appendNow(now, v) {
  const today = todayIso();
  const live = v.up.filter((e) => e.date <= today);
  const next = v.up.find((e) => e.date > today);
  const closes = closeDeadlines([...v.up, ...v.undated].filter((e) => isShown(e, 'deadline'))); // 今日以降の申込締切（日程未定の予定も含む）。近い順
  // 開催中・次の予定・申込締切は、該当するものだけを1列に並べる（押すと、その項目の予定が縦に広がる）
  const groups = [
    live.length ? { key: 'live', label: '開催中', strips: live.map(nowStrip), tabs: live.map((e) => tabById(e.type)) } : null,
    next ? { key: 'next', label: '次の予定', strips: [nextStrip(next)], tabs: [tabById(next.type)] } : null,
    closes.length ? { key: 'dl', label: '締切', strips: closes.map((c) => deadlineStrip(c.e, c.d)), tabs: closes.map((c) => tabById(c.e.type)) } : null
  ].filter(Boolean);
  if (groups.length) now.append(el('div', { class: 'wrap' }, nowBar(groups)));
}

/**
 * 一覧は、見える分だけ描く。下へ進むと続きを足していく（予定が増えても軽く保つ）。
 * neighbor（スワイプ用の仮の画面）は、最初の分だけ。
 */
function appendChunked(root, sections, neighbor) {
  const key = `${state.ui.filter}|${state.ui.view}`;
  if (!neighbor && loaded.key !== key) { loaded.key = key; loaded.n = CHUNK; } // タブや表示を切り替えたら、最初の分から
  let limit = neighbor ? CHUNK : loaded.n;
  let next = 0, rows = 0;
  const tail = el('div', { class: 'end-space' });
  root.append(tail);
  const fill = () => {
    while (next < sections.length && rows < limit) { rows += sections[next].n; root.insertBefore(sections[next].make(), tail); next++; }
  };
  fill();
  if (neighbor || next >= sections.length) return;
  if (!('IntersectionObserver' in window)) { limit = Infinity; fill(); return; }

  const more = el('div', { class: 'list-more', 'aria-hidden': 'true' });
  root.insertBefore(more, tail);
  const watch = new IntersectionObserver((entries) => {
    if (!entries.some((x) => x.isIntersecting)) return;
    limit += CHUNK; loaded.n = limit; // 再描画されても、ここまでは描き直す（スクロール位置が飛ばない）
    fill();
    if (next >= sections.length) { more.remove(); watch.disconnect(); return; }
    watch.unobserve(more); watch.observe(more); // まだ画面内なら続けて足す
  }, { rootMargin: '600px 0px' });
  watch.observe(more);
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
