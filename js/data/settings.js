// タブごとの表示（タブを出す・一覧に出す項目・自動で取り込む種類）を、タブの一覧から調べる。
// 設定そのものの整え方は settings-normalize.js。
import { sortedTabs, tabById } from './tabs.js';

/** タブの帯と一覧に出すタブ（非表示にしたものを除く）。 */
export const visibleTabs = () => sortedTabs().filter((t) => !t.hidden);
export const isTabHidden = (id) => { const t = tabById(id); return !!(t && t.hidden); };
/** その予定の、タブの設定で、この項目を一覧に出すか。タブが無い（未分類）予定は、すべて出す。 */
export const isShown = (e, key) => { const t = tabById(e.type); return !t || !t.show || t.show[key] !== false; };
/** そのタブで、この種類の日付を自動で取り込むか。 */
export const importsKind = (tabId, kind) => { const t = tabById(tabId); return !!(t && (t.importKinds || []).includes(kind)); };
