// タブ（予定の種類）の追加・名前変更・色・並び替え・削除。
import { state } from '../state.js';
import { commit } from './store.js';
import { COLORS, MAX_TABS, WATCH_MAX } from '../config.js';
import { newId } from '../util/text.js';

/** 取り込み内容の文字を整える（前後の空白を消し、長さを上限まで） */
export const cleanWatch = (raw) => (typeof raw === 'string' ? raw.trim().slice(0, WATCH_MAX) : '');

export const sortedTabs = () =>
  [...state.tabs].sort((a, b) => (a.order - b.order) || a.name.localeCompare(b.name, 'ja'));

export const tabById = (id) => state.tabs.find((t) => t.id === id) || null;

export const countEvents = (id) => state.events.filter((e) => e.type === id).length;

export async function addTab(rawName, rawWatch = '') {
  const name = rawName.trim().slice(0, 20);
  if (!name) return { ok: false, error: 'タブの名前を入れてください。' };
  if (state.tabs.some((t) => t.name === name)) return { ok: false, error: '同じ名前のタブがあります。' };
  if (state.tabs.length >= MAX_TABS) return { ok: false, error: `タブは${MAX_TABS}個までです。` };

  const used = state.tabs.map((t) => t.color);
  let color = (state.tabs.length % COLORS) + 1;
  for (let c = 1; c <= COLORS; c++) {
    if (!used.includes(c)) { color = c; break; }
  }
  const order = state.tabs.reduce((m, t) => Math.max(m, t.order), 0) + 1;
  state.tabs.push({ id: newId('t'), name, color, order, watch: cleanWatch(rawWatch) });
  await commit();
  return { ok: true };
}

export async function renameTab(id, rawName) {
  const t = tabById(id);
  const name = rawName.trim().slice(0, 20);
  if (!t) return { ok: false, error: 'タブが見つかりません。' };
  if (!name) return { ok: false, error: 'タブの名前を入れてください。' };
  if (name === t.name) return { ok: true };
  if (state.tabs.some((x) => x.id !== id && x.name === name)) return { ok: false, error: '同じ名前のタブがあります。' };
  t.name = name;
  await commit();
  return { ok: true };
}

export async function cycleColor(id) {
  const t = tabById(id);
  if (!t) return;
  t.color = (t.color % COLORS) + 1;
  await commit();
}

/** このタブに自動で取り込む内容を変える。 */
export async function setTabWatch(id, rawWatch) {
  const t = tabById(id);
  if (!t) return { ok: false, error: 'タブが見つかりません。' };
  const watch = cleanWatch(rawWatch);
  if (watch === (t.watch || '')) return { ok: true };
  t.watch = watch;
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

/** withEvents が true なら、そのタブの予定も一緒に消す。false なら予定は「未分類」で残る。 */
export async function removeTab(id, { withEvents }) {
  if (withEvents) state.events = state.events.filter((e) => e.type !== id);
  state.tabs = state.tabs.filter((t) => t.id !== id);
  await commit();
}
