// 予定の追加・更新・削除と、一覧に出す内容の絞り込み。
import { state } from '../state.js';
import { commit } from './store.js';
import { sortedTabs, tabById } from './tabs.js';
import { buildSamples } from './samples.js';
import { parseDate, eventEnd, todayIso, addDaysIso, compareEvents } from '../util/date.js';
import { RETENTION_DAYS } from '../config.js';
import { safeUrl, newId } from '../util/text.js';
import { cleanDates } from './dates.js';
import { isTabHidden } from './settings.js';

/** 入力内容の確認。問題があれば画面に出すメッセージ、なければ空文字。 */
export function validateEventForm(f) {
  if (!f.type || !tabById(f.type)) return '種類（タブ）を選んでください。';
  if (!f.title) return '名前を入れてください。';
  if (f.end && !f.date) return '終了日を入れるときは、開始日も入れてください。';
  if (f.date && f.end && f.end < f.date) return '終了日は開始日と同じか、それより後の日にしてください。';
  if (f.url && !safeUrl(f.url)) return 'リンクは https:// から始まる形で入れてください。';
  return '';
}

/** id が無ければ新規、あれば更新。更新のたびに rev が増え、カレンダー側の上書きに使われる。 */
export async function saveEvent(f, id = null) {
  const data = {
    type: f.type,
    title: f.title,
    date: f.date,
    end: f.date && f.end && f.end !== f.date ? f.end : '',
    place: f.place,
    source: f.source,
    url: f.url,
    note: f.note,
    dates: cleanDates(f.dates),
    sample: false
  };
  if (id) {
    const e = state.events.find((x) => x.id === id);
    if (!e) return false;
    Object.assign(e, data, { rev: (e.rev || 1) + 1 });
    if (e.feedId) e.manual = true; // 自動取得の予定を直したら「手動修正」として残す
  } else {
    state.events.push({ id: newId('e'), rev: 1, ...data });
  }
  return commit();
}

/** 予定を開いたら、その予定の「NEW」の印を消す。 */
export async function markSeen(id) {
  const e = state.events.find((x) => x.id === id);
  if (!e || !e.newAt) return;
  e.newAt = '';
  await commit();
}

export async function deleteEvent(id) {
  const gone = state.events.find((e) => e.id === id);
  if (gone && gone.feedId && !state.dismissed.includes(gone.feedId)) state.dismissed.push(gone.feedId); // 自動で戻さない
  state.events = state.events.filter((e) => e.id !== id);
  return commit();
}

/** 見本の予定を入れる。タブが1つも無いときは false。 */
export async function addSamples() {
  const tabs = sortedTabs();
  if (!tabs.length) return false;
  const ids = new Set(tabs.map((t) => t.id));
  buildSamples().forEach((s) => {
    state.events.push({
      id: newId('s'), rev: 1, ...s,
      type: ids.has(s.type) ? s.type : tabs[0].id,
      end: s.end || '', url: '', note: '', sample: true
    });
  });
  await commit();
  return true;
}

export async function removeSamples() {
  state.events = state.events.filter((e) => !e.sample);
  return commit();
}

/** 終わってから1年(RETENTION_DAYS)たった予定を消す。消した件数を返す。日程未定の予定は消さない。 */
export async function pruneOld() {
  const limit = addDaysIso(todayIso(), -RETENTION_DAYS);
  const keep = state.events.filter((e) => !parseDate(e.date) || eventEnd(e) >= limit);
  const n = state.events.length - keep.length;
  if (!n) return 0;
  state.events = keep;
  await commit();
  return n;
}

/** 今のタブで、一覧に出す予定。{ up: これから, past: 終わった, undated: 日程未定 } */
export function selectVisible() {
  const t = todayIso();
  const f = state.ui.filter;
  const order = sortedTabs().map((x) => x.id);
  const list = state.events.filter((e) => (f === 'all' ? !isTabHidden(e.type) : e.type === f)); // 非表示のタブの予定は、一覧に出さない（消えない）
  const dated = list.filter((e) => parseDate(e.date));
  const undated = list
    .filter((e) => !parseDate(e.date))
    .sort((a, b) => (order.indexOf(a.type) - order.indexOf(b.type)) || (a.title || '').localeCompare(b.title || '', 'ja'));
  return {
    up: dated.filter((e) => eventEnd(e) >= t).sort(compareEvents),
    past: dated.filter((e) => eventEnd(e) < t).sort((a, b) => compareEvents(b, a)),
    undated
  };
}

/** 月の変わり目ごとにまとめる。 */
export function groupByMonth(items) {
  const out = [];
  let cur = null;
  items.forEach((e) => {
    const p = parseDate(e.date);
    const key = p.y * 100 + p.m;
    if (!cur || cur.key !== key) {
      cur = { key, y: p.y, m: p.m, items: [] };
      out.push(cur);
    }
    cur.items.push(e);
  });
  return out;
}
