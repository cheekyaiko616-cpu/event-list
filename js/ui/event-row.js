// 予定1件の「行」と、タップで開く「詳細」。一覧（event-list.js）と固定表示（pin.js）で共通。
import { state, notify } from '../state.js';
import { el } from '../util/dom.js';
import { parseDate, weekday, eventEnd, formatRange, todayIso, addDaysIso, daysUntil } from '../util/date.js';
import { kindLabel, nextDeadline } from '../data/dates.js';
import { isShown } from '../data/settings.js';
import { safeUrl } from '../util/text.js';
import { tabById } from '../data/tabs.js';
import { addToCalendar } from '../services/calendar.js';
import { openEventSheet } from './event-sheet.js';
import { closeDetail } from './pin-close.js';
import { tripEl } from './event-trip.js';

/* ---------- 行と詳細 ---------- */
// 自動で日程が変わってから2週間は、目印を出す
// 新しく入った・内容が変わってから1週間は、「NEW」の印を出す
const isNew = (e) => !!(e.newAt && e.newAt >= addDaysIso(todayIso(), -7));
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

export function rowEl(e, past, pinned = false) {
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
      isNew(e) ? el('span', { class: 'badge new', text: 'NEW' }) : null,
      state.ui.filter === 'all' && isShown(e, 'chip')
        ? el('span', { class: 'chip', style: `--c:${tab ? `var(--c${tab.color})` : 'var(--muted)'}`, text: tab ? tab.name : '未分類' })
        : null,
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
  const box = el('div', { class: 'detail', id: `d-${e.id}` }, dl, tripEl(e), actions,
    el('button', { class: 'close-btn', type: 'button', text: '閉じる ▲', onclick: close }));
  // ボタンやリンク以外の、詳細のあいている所をタップしても閉じる
  box.addEventListener('click', (ev) => { if (!ev.target.closest('a, button, input, textarea, select, label')) close(); });
  return box;
}
