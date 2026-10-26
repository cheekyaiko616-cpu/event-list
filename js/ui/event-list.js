// 一覧画面：月ごとの帯、予定の行、タップで開く詳細、日程未定のまとまり。
import { state, notify } from '../state.js';
import { $, el, clear } from '../util/dom.js';
import { ALERT_OPTIONS } from '../config.js';
import { parseDate, weekday, eventEnd, formatRange, todayIso, addDaysIso, daysUntil } from '../util/date.js';
import { kindLabel, nextDeadline, nextCloseDeadline } from '../data/dates.js';
import { isShown } from '../data/settings.js';
import { safeUrl } from '../util/text.js';
import { selectVisible, groupByMonth, removeSamples, addSamples } from '../data/events.js';
import { tabById } from '../data/tabs.js';
import { addToCalendar } from '../services/calendar.js';
import { openEventSheet } from './event-sheet.js';
import { toast } from './toast.js';
import { nowStrip, nextStrip, deadlineStrip } from './next-card.js';
import { reduced, EASE } from './motion.js';
import { closeDetail, isClosing } from './pin-close.js';
import { viewSwitchEl } from './view-switch.js';

const hueOf = (month) => (month * 150) % 360; // 隣り合う月の色が大きく離れるようにする

function alertText() {
  const labels = state.settings.alerts
    .map((id) => (ALERT_OPTIONS.find((o) => o.id === id) || {}).label)
    .filter(Boolean);
  return labels.length ? labels.join('・') : 'なし';
}

function noteBox(...children) {
  return el('div', { class: 'note' }, children);
}

/* ---------- 行と詳細 ---------- */
// 自動で日程が変わってから2週間は、目印を出す
const isRecentChange = (e) => !!(e.lastChange && e.lastChange.at >= addDaysIso(todayIso(), -14));

/** いちばん近い申し込み・期限の日付を、小さな印で出す。終わった予定には出さない。 */
function deadlineBadge(e) {
  const d = nextDeadline(e);
  if (!d || (e.date && eventEnd(e) < todayIso())) return null;
  const p = parseDate(d.date);
  const left = daysUntil(d.date);
  return el('span', {
    class: 'badge dl' + (left <= 3 ? ' soon' : ''),
    text: `${kindLabel(d.kind)} ${p.m}/${p.d}${left === 0 ? '（今日）' : left === 1 ? '（明日）' : ''}`
  });
}

function rowEl(e, past, pinned = false) {
  const open = state.ui.openId === e.id;
  const a = parseDate(e.date);
  const multi = a && e.date !== eventEnd(e);
  const b = multi ? parseDate(eventEnd(e)) : null;
  const tab = tabById(e.type);

  const when = a
    ? el('span', { class: 'when' },
        el('b', { class: 'd' + (multi ? ' multi' : ''), text: multi ? `${a.d}–${b.d}` : String(a.d) }),
        el('span', { class: 'w', text: multi ? `${weekday(a)}–${weekday(b)}` : weekday(a) }))
    : el('span', { class: 'when' }, el('b', { class: 'pill', text: '未定' }));

  const what = el('span', { class: 'what' },
    el('span', { class: 't', text: e.title || '（名前なし）' }),
    el('span', { class: 'meta' },
      state.ui.filter === 'all' && isShown(e, 'chip')
        ? el('span', { class: 'chip', style: `--c:${tab ? `var(--c${tab.color})` : 'var(--muted)'}`, text: tab ? tab.name : '未分類' })
        : null,
      e.sample ? el('span', { class: 'badge', text: '見本' }) : null,
      isShown(e, 'badges') && isRecentChange(e) ? el('span', { class: 'badge upd', text: e.lastChange.manual ? '公式で再更新' : '日程更新' }) : null,
      isShown(e, 'badges') && e.manual ? el('span', { class: 'badge man', text: '手動修正' }) : null,
      isShown(e, 'deadline') ? deadlineBadge(e) : null,
      isShown(e, 'place') && e.place ? el('span', { text: e.place }) : null));

  const btn = el('button', {
    class: 'row-btn', type: 'button', 'aria-expanded': String(open), 'aria-controls': `d-${e.id}`,
    onclick: () => {
      // 固定中に別の予定をタップしたら、その予定は開かず、固定を解除するだけにする
      if (state.ui.openId) { closeDetail(); return; }
      state.ui.openId = e.id;
      notify();
    }
  }, when, what, el('span', { class: 'chev', 'aria-hidden': 'true' }));

  // 開いた予定は、ヘッダーの下に固定して詳細を出す。一覧の中の行には詳細を出さず、印だけ付ける。
  return el('li', { class: 'row' + (past ? ' past' : '') + (open && !pinned ? ' is-open' : ''), 'data-id': e.id }, btn, open && pinned ? detailEl(e) : null);
}

function detailEl(e) {
  const dated = !!parseDate(e.date);
  const url = safeUrl(e.url);

  const dl = el('dl', { class: 'kv' });
  const add = (k, v) => dl.append(el('dt', { text: k }), el('dd', { text: v }));
  add('日程', formatRange(e));
  (e.dates || []).forEach((d) => {
    const p = parseDate(d.date);
    add(kindLabel(d.kind), `${p.m}月${p.d}日(${weekday(p)})`);
  });
  if (e.place) add('場所', e.place);
  if (e.source) add('出典', e.source);
  if (e.note) add('メモ', e.note);
  if (e.feedId) {
    if (e.lastChange) add('変更前', `${e.lastChange.from}（${e.lastChange.at} に更新）`);
  }

  const actions = el('div', { class: 'actions' },
    url ? el('a', { class: 'btn', href: url, target: '_blank', rel: 'noopener noreferrer', text: 'リンクを開く ↗' }) : null,
    dated || (e.dates || []).length
      ? el('button', { class: 'btn solid', type: 'button', text: 'カレンダーに追加', onclick: () => { addToCalendar([e]); closeDetail(); } })
      : el('button', { class: 'btn', type: 'button', disabled: true, text: 'カレンダーに追加' }),
    el('button', { class: 'btn', type: 'button', text: '編集', onclick: () => openEventSheet(e) }),
    null);


  const close = () => closeDetail();
  const box = el('div', { class: 'detail', id: `d-${e.id}` }, dl, actions,
    el('button', { class: 'close-btn', type: 'button', text: '閉じる ▲', onclick: close }));
  // ボタンやリンク以外の、詳細のあいている所をタップしても閉じる
  box.addEventListener('click', (ev) => { if (!ev.target.closest('a, button, input, textarea, select, label')) close(); });
  return box;
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
        el('button', { class: 'btn solid', type: 'button', text: '＋ 予定を追加', onclick: () => openEventSheet(null) }),
        el('button', {
          class: 'btn', type: 'button', text: '見本を入れて試す',
          onclick: async () => { if (!(await addSamples())) toast('先にタブを作ってください'); }
        })));
  }
  return el('div', { class: 'wrap empty' },
    el('p', { text: past ? '終わった予定はありません。' : '予定がありません。' }),
    past ? null : el('div', { class: 'actions' },
      el('button', { class: 'btn solid', type: 'button', text: '＋ 予定を追加', onclick: () => openEventSheet(null) })));
}

/* ---------- 全体 ---------- */
/* ---------- 固定表示（開いた予定をヘッダーの下に出す） ---------- */
let pinId = null;      // いま固定している予定

/** 開いている詳細の外をタップしたら閉じる。起動後に1回だけ呼ぶ。 */
export function initOutsideClose() {
  document.addEventListener('click', (ev) => {
    const id = state.ui.openId;
    if (!id) return;
    const t = ev.target;
    if (!(t instanceof Element)) return;
    // 詳細の中の操作と、予定の行そのもの（行は自分で開閉する）は除く。行の横の余白は「外」として閉じる。
    if (t.closest(`[data-id="${id}"] .detail`) || t.closest(`[data-id="${id}"] .row-btn`) || t.closest('.now') || t.closest('[role="dialog"]') || t.closest('.toast')) return;
    closeDetail();
  });
}

/** 開いている予定を、ヘッダーの下に固定して表示する。閉じたら消える。 */
function renderPin() {
  const pin = $('#app-pin');
  if (!pin) return;
  clear(pin);
  const e = state.ui.openId ? state.events.find((x) => x.id === state.ui.openId) : null;
  if (!e || !state.ready) { pinId = null; return; }
  pin.append(el('ul', { class: 'wrap rows' }, rowEl(e, state.ui.view === 'past', true)));
  if (pinId !== e.id) { // 出現：高さを広げながら、ふわっと出す
    pinId = e.id;
    if (!reduced() && pin.animate) {
      const h = pin.getBoundingClientRect().height;
      pin.animate([{ height: '0px', opacity: 0 }, { height: `${h}px`, opacity: 1 }], { duration: 240, easing: EASE });
    }
  }
}

/** 固定表示の上で、上か下にスワイプしたら、固定を解除する。指に合わせて動き、離すとなめらかに消える／戻る。 */
export function initPinSwipe() {
  const pin = $('#app-pin');
  let x0 = 0, y0 = 0, on = false, drag = false;
  const body = () => pin.firstElementChild;
  const scrollable = () => pin.scrollHeight > pin.clientHeight + 2; // 中を読むためのスクロールは、解除にしない
  pin.addEventListener('touchstart', (ev) => {
    const t = ev.touches[0];
    x0 = t.clientX; y0 = t.clientY; on = ev.touches.length === 1; drag = false;
  }, { passive: true });
  pin.addEventListener('touchmove', (ev) => {
    if (!on || isClosing() || scrollable() || !body()) return;
    const t = ev.touches[0];
    const dx = t.clientX - x0, dy = t.clientY - y0;
    if (!drag && !(Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx) * 1.5)) return;
    drag = true;
    body().style.transform = `translateY(${dy * 0.6}px)`;
    body().style.opacity = String(Math.max(0.25, 1 - Math.abs(dy) / 220));
  }, { passive: true });
  pin.addEventListener('touchend', (ev) => {
    if (!on) return;
    on = false;
    const b = body();
    if (!b || !drag) return;
    drag = false;
    const t = ev.changedTouches[0];
    const dy = t.clientY - y0;
    if (Math.abs(dy) >= 50) { closeDetail(); return; }
    // 足りなければ、元の位置になめらかに戻す
    b.style.transition = `transform .2s ${EASE}, opacity .2s ${EASE}`;
    b.style.transform = ''; b.style.opacity = '';
    setTimeout(() => { if (b) b.style.transition = ''; }, 220);
  }, { passive: true });
}

/** 一覧の中身（root）と、固定する開催中・次の予定（now）を作る。 */
function buildView(root, now) {
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
  if (state.events.some((e) => e.sample)) {
    notices.push(noteBox(
      el('p', { text: '見本の予定が入っています。' }),
      el('button', {
        class: 'link-btn', type: 'button', text: '見本をすべて消す',
        onclick: async () => { await removeSamples(); toast('見本を消しました'); }
      })));
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
  const groups = groupByMonth(past ? v.past : v.up);
  groups.forEach((g) => root.append(monthSection(g, past)));
  if (!past && v.undated.length) root.append(undatedSection(v.undated));
  if (!groups.length && !(!past && v.undated.length)) root.append(emptyEl(past));

  root.append(el('div', { class: 'end-space' }));
}

export function renderEventList() {
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
  try { buildView(list, now); } finally { state.ui.filter = keep.f; state.ui.openId = keep.o; }
  return { now, list };
}
