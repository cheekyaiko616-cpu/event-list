// 設定（通知の時刻・自動で取り込む項目・一覧に出すタブと項目）の初期値、整え方、変更の操作。
import { state } from '../state.js';
import { commit } from './store.js';
import { sortedTabs } from './tabs.js';
import { DEFAULT_SETTINGS, ALERT_OPTIONS, DATE_KINDS, SHOW_KEYS } from '../config.js';

export function defaultSettings() {
  return {
    alerts: [...DEFAULT_SETTINGS.alerts],
    importKinds: DATE_KINDS.map((k) => k.id),
    hiddenTabs: [],
    show: Object.fromEntries(SHOW_KEYS.map((k) => [k.id, true]))
  };
}

/** 保存データや読み込んだファイルの設定を、安全な形に整える。無い項目は初期値。 */
export function normalizeSettings(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const d = defaultSettings();
  const list = (v, ok, fallback) => (Array.isArray(v) ? v.filter((x, i) => typeof x === 'string' && ok(x) && v.indexOf(x) === i) : fallback);
  return {
    alerts: list(src.alerts, (id) => ALERT_OPTIONS.some((o) => o.id === id), d.alerts),
    importKinds: list(src.importKinds, (id) => DATE_KINDS.some((k) => k.id === id), d.importKinds),
    hiddenTabs: list(src.hiddenTabs, (id) => id.length > 0 && id.length <= 60, d.hiddenTabs),
    show: Object.fromEntries(SHOW_KEYS.map((k) => [k.id, src.show && typeof src.show === 'object' ? src.show[k.id] !== false : true]))
  };
}

export const isTabHidden = (id) => (state.settings.hiddenTabs || []).includes(id);
/** タブの帯と一覧に出すタブ（非表示にしたものを除く）。 */
export const visibleTabs = () => sortedTabs().filter((t) => !isTabHidden(t.id));
export const isShown = (key) => !state.settings.show || state.settings.show[key] !== false;
export const importsKind = (kind) => (state.settings.importKinds || []).includes(kind);

function toggleIn(list, id) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export async function toggleImportKind(id) {
  state.settings.importKinds = toggleIn(state.settings.importKinds, id);
  return commit();
}
export async function toggleTabHidden(id) {
  state.settings.hiddenTabs = toggleIn(state.settings.hiddenTabs, id);
  return commit();
}
export async function toggleShow(key) {
  state.settings.show = { ...state.settings.show, [key]: !isShown(key) };
  return commit();
}
