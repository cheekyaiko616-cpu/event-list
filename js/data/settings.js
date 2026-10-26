// 設定（通知の時刻・自動で取り込む項目）と、タブごとの表示（タブを出す・一覧に出す項目）。
import { sortedTabs, tabById } from './tabs.js';
import { DEFAULT_SETTINGS, ALERT_OPTIONS, DATE_KINDS, SHOW_KEYS } from '../config.js';

export function defaultSettings() {
  return { alerts: [...DEFAULT_SETTINGS.alerts] };
}

/** 保存データや読み込んだファイルの設定を、安全な形に整える。無い項目は初期値。 */
export function normalizeSettings(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const d = defaultSettings();
  const list = (v, ok, fallback) => (Array.isArray(v) ? v.filter((x, i) => typeof x === 'string' && ok(x) && v.indexOf(x) === i) : fallback);
  return {
    alerts: list(src.alerts, (id) => ALERT_OPTIONS.some((o) => o.id === id), d.alerts)
  };
}

/** タブごとの「自動で取り込む日付の種類」を整える。配列でなければ fallback（無ければ取り込まない）。 */
export function normalizeKinds(raw, fallback = []) {
  const src = Array.isArray(raw) ? raw : fallback;
  return DATE_KINDS.map((k) => k.id).filter((id) => src.includes(id)); // 種類の並び順にそろえる
}

/** タブごとの一覧に出す項目を整える。無い項目は「出す」。 */
export function normalizeShow(raw, fallback) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const fb = fallback && typeof fallback === 'object' ? fallback : {};
  return Object.fromEntries(SHOW_KEYS.map((k) => [k.id, src[k.id] === undefined ? fb[k.id] !== false : src[k.id] !== false]));
}

/** タブの帯と一覧に出すタブ（非表示にしたものを除く）。 */
export const visibleTabs = () => sortedTabs().filter((t) => !t.hidden);
export const isTabHidden = (id) => { const t = tabById(id); return !!(t && t.hidden); };
/** その予定の、タブの設定で、この項目を一覧に出すか。タブが無い（未分類）予定は、すべて出す。 */
export const isShown = (e, key) => { const t = tabById(e.type); return !t || !t.show || t.show[key] !== false; };
/** そのタブで、この種類の日付を自動で取り込むか。 */
export const importsKind = (tabId, kind) => { const t = tabById(tabId); return !!(t && (t.importKinds || []).includes(kind)); };
