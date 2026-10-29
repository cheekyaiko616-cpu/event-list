// 戻すための「控え」。操作の間違いや不具合でデータを失っても、前の状態に戻せるようにする。
//   pre    … 大きな操作（バックアップの読み込み・タブの削除・戻す操作）の直前に、自動で残す。最新の3つ
//   weekly … アプリを開いたとき、前回から7日以上たっていれば残す。最新の4つ
//   corrupt… 保存データが壊れていたときに、storage.js が残したコピー（読めるときだけ戻せる）
// 控えは端末の中（localStorage）にある。端末の故障・アプリの削除・Safariのデータ消去には効かない（それには「書き出す」を使う）。
// 控えを残せなくても、元の操作は止めない。
import { SNAPSHOT, STORAGE_KEY } from '../config.js';
import { snapshot } from './store.js';
import { normalizeData } from './schema.js';

function readAll() {
  try {
    const body = JSON.parse(localStorage.getItem(SNAPSHOT.key) || '{}');
    return Array.isArray(body.items) ? body.items.filter((x) => x && typeof x.json === 'string') : [];
  } catch (e) { return []; }
}

/** 大きさの上限と、種類ごとの数に収めて保存する。新しいものを優先して残す。保存できなければ false。 */
function writeAll(items) {
  const byKind = { pre: 0, weekly: 0 };
  const max = { pre: SNAPSHOT.keepPre, weekly: SNAPSHOT.keepWeekly };
  let kept = items.filter((x) => {  // 新しい順に並んでいる前提
    if (!(x.kind in byKind)) return false;
    byKind[x.kind] += 1;
    return byKind[x.kind] <= max[x.kind];
  });
  const size = (list) => list.reduce((n, x) => n + x.json.length, 0);
  while (kept.length > 1 && size(kept) > SNAPSHOT.maxBytes) kept = kept.slice(0, -1); // 一番古いものから消す（最新の1つは残す）
  try {
    localStorage.setItem(SNAPSHOT.key, JSON.stringify({ items: kept }));
    return true;
  } catch (e) { return false; }
}

const empty = (s) => !s.events.length && !s.tabs.length;

/** 今のデータを控えにする。種類は 'pre' か 'weekly'。残せたら true。 */
export function takeSnapshot(kind, label) {
  const s = snapshot();
  if (empty(s)) return false; // 何も入っていない状態は、控えにしない
  const item = { id: 's' + Date.now().toString(36), kind, at: new Date().toISOString(), label: label || '', nEvents: s.events.length, nTabs: s.tabs.length, json: JSON.stringify(s) };
  return writeAll([item, ...readAll()]);
}

/** 週1回の控え：前回の週1回から7日以上たっていれば残す。起動のあとに1回呼ぶ。 */
export function weeklyIfDue() {
  const last = readAll().find((x) => x.kind === 'weekly');
  const age = last ? Date.now() - Date.parse(last.at) : Infinity;
  if (age < SNAPSHOT.weeklyDays * 86400000) return false;
  return takeSnapshot('weekly', '週1回の自動の控え');
}

/** 戻せる状態の一覧（新しい順）。{ id, kind, at, label, nEvents, nTabs, readable }。 */
export function listSnapshots() {
  const list = readAll().sort((a, b) => (a.at < b.at ? 1 : -1)).map((x) => ({ id: x.id, kind: x.kind, at: x.at, label: x.label, nEvents: x.nEvents, nTabs: x.nTabs, readable: true }));
  try {
    const raw = localStorage.getItem(STORAGE_KEY + '.corrupt');
    if (raw) {
      let ok = false;
      try { const d = JSON.parse(raw); ok = !!(d && Array.isArray(d.events) && Array.isArray(d.tabs)); } catch (e) { /* 読めない */ }
      list.push({ id: 'corrupt', kind: 'corrupt', at: '', label: '壊れていたデータのコピー', nEvents: 0, nTabs: 0, readable: ok });
    }
  } catch (e) { /* 何もしない */ }
  return list;
}

/** 戻すデータ（整えた形）を取り出す。読めなければ null。 */
export function loadSnapshot(id) {
  try {
    const raw = id === 'corrupt' ? localStorage.getItem(STORAGE_KEY + '.corrupt') : (readAll().find((x) => x.id === id) || {}).json;
    const d = raw ? JSON.parse(raw) : null;
    if (!d || !Array.isArray(d.events) || !Array.isArray(d.tabs)) return null;
    return normalizeData(d);
  } catch (e) { return null; }
}
