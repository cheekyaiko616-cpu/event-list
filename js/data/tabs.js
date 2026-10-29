// タブ（予定の種類）の追加・編集・並び替え・削除。
import { state } from '../state.js';
import { commit } from './store.js';
import { takeSnapshot } from './snapshots.js';
import { COLORS, MAX_TABS, WATCH_MAX } from '../config.js';
import { newId } from '../util/text.js';
import { compareJa } from '../util/date.js';
import { normalizeShow, normalizeKinds } from './settings-normalize.js';

/** 取り込み内容の文字を整える（前後の空白を消し、長さを上限まで） */
const cleanWatch = (raw) => (typeof raw === 'string' ? raw.trim().slice(0, WATCH_MAX) : '');

export const sortedTabs = () =>
  [...state.tabs].sort((a, b) => (a.order - b.order) || compareJa(a.name, b.name));

export const tabById = (id) => state.tabs.find((t) => t.id === id) || null;

export const countEvents = (id) => state.events.filter((e) => e.type === id).length;

/** タブを1つ足す（保存はしない）。色と並びは、使っていないものを自動で選ぶ。上限なら null。 */
export function newTab(name, { watch = '', importKinds = [] } = {}) {
  if (state.tabs.length >= MAX_TABS) return null;
  const used = state.tabs.map((t) => t.color);
  let color = (state.tabs.length % COLORS) + 1;
  for (let c = 1; c <= COLORS; c++) {
    if (!used.includes(c)) { color = c; break; }
  }
  const order = state.tabs.reduce((m, t) => Math.max(m, t.order), 0) + 1;
  const tab = { id: newId('t'), name, color, order, watch, hidden: false, show: normalizeShow(null), importKinds: normalizeKinds(importKinds) };
  state.tabs.push(tab);
  return tab;
}

export async function addTab(rawName, rawWatch = '') {
  const name = rawName.trim().slice(0, 20);
  if (!name) return { ok: false, error: 'タブの名前を入れてください。' };
  if (state.tabs.some((t) => t.name === name)) return { ok: false, error: '同じ名前のタブがあります。' };
  if (state.tabs.length >= MAX_TABS) return { ok: false, error: `タブは${MAX_TABS}個までです。` };

  newTab(name, { watch: cleanWatch(rawWatch) });
  await commit();
  return { ok: true };
}

/** 名前・色・取り込み内容・表示を、まとめて1回で保存する。 */
export async function updateTab(id, { name, color, watch, hidden, show, importKinds }) {
  const t = tabById(id);
  if (!t) return { ok: false, error: 'タブが見つかりません。' };
  const n = String(name).trim().slice(0, 20);
  if (!n) return { ok: false, error: 'タブの名前を入れてください。' };
  if (state.tabs.some((x) => x.id !== id && x.name === n)) return { ok: false, error: '同じ名前のタブがあります。' };
  const c = Number.isInteger(color) && color >= 1 && color <= COLORS ? color : t.color;
  const w = cleanWatch(watch);
  const h = hidden === true;
  const sh = normalizeShow(show, t.show);
  const ik = normalizeKinds(importKinds, t.importKinds);
  if (n === t.name && c === t.color && w === (t.watch || '') && h === !!t.hidden && JSON.stringify(sh) === JSON.stringify(t.show) && JSON.stringify(ik) === JSON.stringify(t.importKinds || [])) return { ok: true };
  t.name = n; t.color = c; t.watch = w; t.hidden = h; t.show = sh; t.importKinds = ik;
  await commit();
  return { ok: true };
}

/** dir: -1 で前へ、1 で後ろへ。 */
export async function moveTab(id, dir) {
  const tabs = sortedTabs();
  const i = tabs.findIndex((t) => t.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= tabs.length) return;
  const [t] = tabs.splice(i, 1);
  tabs.splice(j, 0, t);
  tabs.forEach((x, k) => { x.order = k + 1; });
  await commit();
}

/** タブを消す。そのタブの予定も、いつも一緒に消す。自動取得の予定は、消した後に自動で戻らないようにする。 */
export async function removeTab(id) {
  takeSnapshot('pre', 'タブを削除する前');
  state.events.filter((e) => e.type === id && e.feedId).forEach((e) => {
    if (!state.dismissed.includes(e.feedId)) state.dismissed.push(e.feedId);
  });
  state.events = state.events.filter((e) => e.type !== id);
  state.tabs = state.tabs.filter((t) => t.id !== id);
  await commit();
}
