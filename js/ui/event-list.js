// 一覧画面：月ごとの帯、予定の行、タップで開く詳細、日程未定のまとまり。
import { state, notify } from '../state.js';
import { $, el, clear } from '../util/dom.js';
import { ALERT_OPTIONS } from '../config.js';
import { parseDate, weekday, eventEnd, formatRange, todayIso, addDaysIso } from '../util/date.js';
import { safeUrl } from '../util/text.js';
import { selectVisible, groupByMonth, createNextYear, removeSamples, addSamples } from '../data/events.js';
import { tabById } from '../data/tabs.js';
import { googleCalendarUrl, openGoogleCalendar } from '../services/calendar.js';
import { openEventSheet } from './event-sheet.js';
import { openSettings } from './settings-sheet.js';
import { toast } from './toast.js';
import { nextCard } from './next-card.js';
import { nowStrip } from './next-card.js';
import { openImportSheet } from './import-sheet.js';

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
      state.ui.filter === 'all'
        ? el('span', { class: 'chip', style: `--c:${tab ? `var(--c${tab.color})` : 'var(--muted)'}`, text: tab ? tab.name : '未分類' })
        : null,
      e.sample ? el('span', { class: 'badge', text: '見本' }) : null,
      isRecentChange(e) ? el('span', { class: 'badge upd', text: e.lastChange.manual ? '公式で再更新' : '日程更新' }) : null,
      e.manual ? el('span', { class: 'badge man', text: '手動修正' }) : null,
      e.place ? el('span', { text: e.place }) : null));

  const btn = el('button', {
    class: 'row-btn', type: 'button', 'aria-expanded': String(open), 'aria-controls': `d-${e.id}`,
    onclick: () => {
      state.ui.openId = open ? null : e.id;
      notify();
      const again = document.querySelector(`[data-id="${e.id}"] .row-btn`);
      if (again) again.focus({ preventScroll: true });
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
  if (e.place) add('場所', e.place);
  add('出典', e.source || '未記入');
  if (e.note) add('メモ', e.note);
  if (e.feedId) {
    add('自動取得', e.checkedAt ? `公式情報を自動で確認（最終確認 ${e.checkedAt}）` : '公式情報を自動で確認');
    if (e.lastChange) add('変更前', `${e.lastChange.from}（${e.lastChange.at} に更新）`);
  }

  const actions = el('div', { class: 'actions' },
    url ? el('a', { class: 'btn', href: url, target: '_blank', rel: 'noopener noreferrer', text: 'リンクを開く ↗' }) : null,
    dated
      ? el('button', { class: 'btn solid', type: 'button', text: 'カレンダーに追加', onclick: () => { openGoogleCalendar(e); state.ui.openId = null; notify(); } })
      : el('button', { class: 'btn', type: 'button', disabled: true, text: 'カレンダーに追加' }),
    dated
      ? el('a', { class: 'btn', href: googleCalendarUrl(e), target: '_blank', rel: 'noopener noreferrer', text: '試験：リンクで追加', onclick: () => setTimeout(() => { state.ui.openId = null; notify(); }, 0) })
      : null,
    el('button', { class: 'btn', type: 'button', text: '編集', onclick: () => openEventSheet(e) }),
    dated
      ? el('button', {
          class: 'btn', type: 'button', text: '来年分を未定で作る',
          onclick: async () => toast(`「${await createNextYear(e)}」を日程未定に追加しました`)
        })
      : null);

  const hint = dated
    ? el('p', { class: 'hint' },
        '「カレンダーに追加」でGoogleカレンダーの登録画面が開きます。アラートは保存のときに付けてください。Googleカレンダーのアプリが開きます。保存したあと、画面が残ったときは、左上の「×」で閉じます。')
    : el('p', { class: 'hint', text: '公式に日程が出たら、編集で日付を入れます。' });

  const close = () => { state.ui.openId = null; notify(); };
  const box = el('div', { class: 'detail', id: `d-${e.id}` }, dl, actions, hint,
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
        el('span', { class: 'band-m', text: String(g.m) }),
        el('span', { class: 'band-u', text: '月' }),
        el('span', { class: 'band-r', text: `${g.y} ・ ${g.items.length}件` }))),
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
      el('p', { text: 'まだ予定がありません。公式発表を見て、「＋ 追加」から入力します。' }),
      el('div', { class: 'actions' },
        el('button', { class: 'btn solid', type: 'button', text: '＋ 予定を追加', onclick: () => openEventSheet(null) }),
        el('button', {
          class: 'btn', type: 'button', text: '見本を入れて試す',
          onclick: async () => { if (!(await addSamples())) toast('先にタブを作ってください'); }
        })));
  }
  return el('div', { class: 'wrap empty' },
    el('p', { text: past ? '終わったイベントはまだありません。' : state.ui.filter === 'all' ? '予定はまだありません。' : 'このタブの予定はまだありません。' }),
    past ? null : el('div', { class: 'actions' },
      el('button', { class: 'btn solid', type: 'button', text: '＋ 予定を追加', onclick: () => openEventSheet(null) })));
}

/* ---------- 全体 ---------- */
/** 開いている詳細の外をタップしたら閉じる。起動後に1回だけ呼ぶ。 */
export function initOutsideClose() {
  document.addEventListener('click', (ev) => {
    const id = state.ui.openId;
    if (!id) return;
    const t = ev.target;
    if (!(t instanceof Element)) return;
    // 詳細の中の操作と、予定の行そのもの（行は自分で開閉する）は除く。行の横の余白は「外」として閉じる。
    if (t.closest(`[data-id="${id}"] .detail`) || t.closest(`[data-id="${id}"] .row-btn`) || t.closest('.next') || t.closest('.now') || t.closest('[role="dialog"]') || t.closest('.toast')) return;
    state.ui.openId = null;
    notify();
  });
}

/** 開いている予定を、ヘッダーの下に固定して表示する。閉じたら消える。 */
function renderPin() {
  const pin = $('#app-pin');
  if (!pin) return;
  clear(pin);
  const e = state.ui.openId ? state.events.find((x) => x.id === state.ui.openId) : null;
  if (!e || !state.ready) return;
  pin.append(el('ul', { class: 'wrap rows' }, rowEl(e, state.ui.view === 'past', true)));
}

export function renderEventList() {
  renderPin();
  const root = $('#app-list');
  clear(root);

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
      el('p', { text: '「見本」の予定は仮の内容です。日程は公式発表を見て入力します。' }),
      el('button', {
        class: 'link-btn', type: 'button', text: '見本をすべて消す',
        onclick: async () => { await removeSamples(); toast('見本を消しました'); }
      })));
  }
  if (past) notices.push(el('p', { class: 'help', style: 'margin-top:12px', text: '終わってから1年たった予定は、自動で消えます。' }));
  if (notices.length) root.append(el('div', { class: 'wrap' }, notices));

  const v = selectVisible();
  if (!past) {
    const today = todayIso();
    const live = v.up.filter((e) => e.date <= today);
    const next = v.up.find((e) => e.date > today);
    if (live.length || next) root.append(el('div', { class: 'wrap' }, [...live.map(nowStrip), next ? nextCard(next) : null]));
  }
  const groups = groupByMonth(past ? v.past : v.up);
  groups.forEach((g) => root.append(monthSection(g, past)));
  if (!past && v.undated.length) root.append(undatedSection(v.undated));
  if (!groups.length && !(!past && v.undated.length)) root.append(emptyEl(past));

  root.append(el('div', { class: 'wrap foot' },
    el('button', { class: 'link-btn', type: 'button', text: '日程の取り込み', onclick: openImportSheet }),
    el('span', { class: 'foot-gap', text: '　' }),
    el('button', { class: 'link-btn', type: 'button', text: 'データ・通知の設定', onclick: openSettings })));
  root.append(el('div', { class: 'end-space' }));
}
