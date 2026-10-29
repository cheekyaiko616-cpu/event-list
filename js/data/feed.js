// 自動取得：Claudeが公式情報から調べて共有データ(feed)に書いた日程を、予定に反映する。
// 画面は扱わない。反映のルールはこのファイルだけに置く。
//   新しい日程        … 自動で追加
//   日程の変更         … 自動で更新（変更前を残す）
//   こちらで直した予定 … 「手動修正」。feedの内容が変わらない限り、直した内容を守る
//   こちらで削除した予定 … 二度と自動では戻さない
import { state } from '../state.js';
import { commit } from './store.js';
import { sortedTabs, newTab } from './tabs.js';
import { getDb } from '../services/cloud.js';
import { parseDate, eventEnd, formatRange, todayIso, addDaysIso } from '../util/date.js';
import { safeUrl, newId } from '../util/text.js';
import { RETENTION_DAYS } from '../config.js';
import { cleanDates } from './dates.js';
import { importsKind } from './settings.js';

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const norm = (s) => (s || '').normalize('NFKC').replace(/\s+/g, '').toLowerCase();

/** feedの1件を安全な形にする。出典が無い・名前が無いものは null（使わない）。 */
function cleanFeedItem(id, raw) {
  const x = raw && typeof raw === 'object' ? raw : {};
  const title = str(x.title, 100);
  const source = str(x.source, 200);
  if (!id || !title || !source) return null;
  const date = parseDate(x.date) ? x.date : '';
  const end = date && parseDate(x.end) && x.end > date ? x.end : '';
  return {
    id: String(id).slice(0, 100), tabName: str(x.tabName, 20), title, date, end,
    place: str(x.place, 100), source, url: safeUrl(str(x.url, 500)) || '', note: str(x.note, 1000),
    dates: cleanDates(x.dates).map((d) => ({ ...d, auto: true })),
    checkedAt: parseDate(x.checkedAt) ? x.checkedAt : ''
  };
}

/** 反映すべき内容が変わったかを見分けるための印。確認日(checkedAt)は含めない。 */
export const feedHash = (f) => [f.tabName, f.title, f.date, f.end, f.place, f.source, f.url, f.note, (f.dates || []).map((d) => `${d.kind}:${d.date}`).join(',')].join('|');

/**
 * 自動取得の期限日付を、予定に合わせる。そのタブの設定で「取り込む」にした種類だけ入れる。
 * 手で入れた日付（auto でないもの）は消さない。変わったら true。
 */
function syncDates(e, f) {
  const mine = (e.dates || []).filter((d) => !d.auto);
  const fromFeed = (f.dates || [])
    .filter((d) => importsKind(e.type, d.kind) && !mine.some((m) => m.kind === d.kind && m.date === d.date))
    .map((d) => ({ ...d, auto: true }));
  const next = cleanDates([...mine, ...fromFeed]);
  if (JSON.stringify(next) === JSON.stringify(e.dates || [])) return false;
  e.dates = next;
  return true;
}

/** feed の1件から、新しい予定を作る。 */
function createEvent(f, tab, hash, newAt) {
  const e = {
    id: newId('e'), rev: 1, type: tab.id, title: f.title, date: f.date, end: f.end, place: f.place,
    source: f.source, url: f.url, note: f.note,
    feedId: f.id, feedHash: hash, manual: false, checkedAt: f.checkedAt, lastChange: null, dates: [],
    newAt
  };
  syncDates(e, f);
  return e;
}

/** feed の内容が前回と同じ予定：確認日と、期限の日付だけを合わせる。変わったら true。 */
function refreshSame(e, f, today, firstSync) {
  let touched = false;
  if (f.checkedAt && e.checkedAt !== f.checkedAt) { e.checkedAt = f.checkedAt; touched = true; }
  const autoCount = () => (e.dates || []).filter((d) => d.auto).length;
  const before = autoCount();
  if (syncDates(e, f)) {  // 設定で取り込む種類を変えたときも反映する
    touched = true;
    if (!firstSync && autoCount() > before) e.newAt = today; // 新しい申し込みの日付が入った
  }
  return touched;
}

/** feed の内容が変わった予定：上書きして、日程が動いたら「前の日程」を残す。 */
function overwrite(e, f, hash, today, firstSync) {
  const before = e.date ? formatRange(e) : '日程未定';
  const changedDate = e.date !== f.date || eventEnd(e) !== (f.end || f.date);
  const wasManual = e.manual === true;
  Object.assign(e, {
    title: e.feedId ? f.title : e.title, date: f.date, end: f.end, place: f.place || e.place,
    source: f.source, url: f.url || e.url, note: f.note || e.note,
    feedId: f.id, feedHash: hash, manual: false, checkedAt: f.checkedAt || e.checkedAt,
    rev: (e.rev || 1) + 1
  });
  syncDates(e, f);
  if (!firstSync) e.newAt = today; // 内容が変わった
  if (changedDate) e.lastChange = { at: today, from: before, manual: wasManual };
}

// 自動で作ったタブの名前を、この端末に覚えておく。あとで消したタブが、開くたびに戻らないようにするため。
const SEEN_KEY = 'eventcho.tabs.seen';
const seenNames = () => { try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); } catch (e) { return new Set(); } };
const saveSeen = (set) => { try { localStorage.setItem(SEEN_KEY, JSON.stringify([...set])); } catch (e) { /* 覚えられなくても動く */ } };

/**
 * まだ無いタブを、自動取得の内容から作る：feedの予定のタブ名と、watchlist.json にあるタブ名。
 * 取り込み内容は watchlist.json から引き継ぐ。いちど自動で作った名前は、消されても作り直さない。作った数を返す。
 */
function createTabs(items, watch) {
  const have = new Set(state.tabs.map((t) => norm(t.name)));
  const seen = seenNames();
  const names = new Map(); // 正規化した名前 → 表示名（watchlist の順、そのあと feed だけにある名前）
  watch.forEach((w, k) => names.set(k, w.name));
  items.forEach((f) => { if (f.tabName && !names.has(norm(f.tabName))) names.set(norm(f.tabName), f.tabName); });
  let n = 0;
  names.forEach((name, k) => {
    if (have.has(k) || seen.has(k)) return;
    if (newTab(name, watch.get(k) || {})) { seen.add(k); n++; }
  });
  state.tabs.forEach((t) => seen.add(norm(t.name))); // 今あるタブも「作ったことがある」扱い（消したら戻さない）
  saveSeen(seen);
  return n;
}

/** feedの内容を予定に反映する。変わった件数 { added, updated } を返し、変わったときだけ保存する。 */
async function applyFeed(items, watch = new Map()) {
  let touched = createTabs(items, watch) > 0;
  const tabs = sortedTabs();
  const today = todayIso();
  const limit = addDaysIso(today, -RETENTION_DAYS);
  // 初めて自動取得を読むとき（入れ直したときなど）は、全部が新着になってしまうので、NEWの印は付けない
  const firstSync = !state.events.some((x) => x.feedId);
  let added = 0, updated = 0;

  items.forEach((f) => {
    if (state.dismissed.includes(f.id)) return;
    if (f.date && (f.end || f.date) < limit) return; // 終わって1年たったものは戻さない
    const hash = feedHash(f);
    const tab = tabs.find((t) => norm(t.name) === norm(f.tabName)) || tabs[0];
    if (!tab) return;

    const e = state.events.find((x) => x.feedId === f.id) || state.events.find((x) => !x.feedId && norm(x.title) === norm(f.title));
    if (!e) {
      state.events.push(createEvent(f, tab, hash, firstSync ? '' : today));
      added++; touched = true;
    } else if (e.feedId === f.id && e.feedHash === hash) {
      if (refreshSame(e, f, today, firstSync)) touched = true;
    } else {
      overwrite(e, f, hash, today, firstSync);
      updated++; touched = true;
    }
  });

  if (touched) await commit();
  return { added, updated };
}

let started = false;

/** サイトの watchlist.json から、タブごとの取り込み内容を読む（新しく現れるタブに引き継ぐ用）。読めなければ空。 */
async function pullWatch() {
  const map = new Map();
  try {
    const res = await fetch('watchlist.json?t=' + Date.now(), { cache: 'no-store' });
    const body = res.ok ? await res.json() : null;
    (body && Array.isArray(body.tabs) ? body.tabs : []).forEach((x) => {
      if (x && typeof x.tabName === 'string' && typeof x.watch === 'string') map.set(norm(x.tabName), { name: x.tabName.slice(0, 20), watch: x.watch.trim().slice(0, 300), importKinds: x.kinds });
    });
  } catch (e) { /* 読めなくても、取り込み内容が空のタブができるだけ */ }
  return map;
}

/** 公開しているサイトの feed.json を読んで反映する（ホーム画面で使う形）。 */
async function pullFile() {
  try {
    const res = await fetch('feed.json?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) return null;
    const body = await res.json();
    const list = body && Array.isArray(body.items) ? body.items : [];
    const items = list.map((x) => cleanFeedItem(x && x.id, x)).filter(Boolean);
    return await applyFeed(items, await pullWatch());
  } catch (e) { return null; /* 読めなくてもアプリは動く */ }
}

/** 取り込む種類を変えたときに、すぐ反映する用。{ ok, added, updated } を返す。 */
export async function refreshNow() {
  if (await getDb()) return { ok: true, added: 0, updated: 0 }; // Claude上は常に自動で反映済み
  const r = await pullFile();
  return r ? { ok: true, ...r } : { ok: false, added: 0, updated: 0 };
}

/**
 * 自動取得を始める。起動後に1回だけ呼ぶ。
 *   Claude上で開いた  … 共有データ(feed)を見はる
 *   ホーム画面などで開いた … サイトの feed.json を、開いたときと戻ってきたときに読む
 */
export async function startFeed() {
  if (started) return;
  started = true;
  const db = await getDb();
  if (!db) {
    pullFile();
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pullFile(); });
    return;
  }
  let busy = Promise.resolve();
  db.collection('feed').onSnapshot((snap) => {
    const items = snap.docs
      .map((d) => cleanFeedItem(d.id, d.data()))
      .filter(Boolean);
    busy = busy.then(() => applyFeed(items)).catch(() => {});
  }, () => { /* 見はれなくてもアプリは動く */ });
}
