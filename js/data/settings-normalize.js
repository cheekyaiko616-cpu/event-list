// 設定・タブの表示項目を、安全な形に整える関数（他のデータに依存しない。タブの一覧は見ない）。
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
