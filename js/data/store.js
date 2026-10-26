// 状態の読み込みと保存の入口。データを変えたあとは commit() を呼ぶ。
import { APP, DEFAULT_TABS } from '../config.js';
import { defaultSettings } from './settings.js';
import { state, notify } from '../state.js';
import { loadData, saveData, requestPersistence } from './storage.js';
import { normalizeData } from './schema.js';

/** 保存・書き出し用の形にまとめる。 */
export function snapshot() {
  return {
    app: APP.id,
    schema: APP.schema,
    savedAt: new Date().toISOString(),
    tabs: state.tabs,
    events: state.events,
    settings: state.settings,
    dismissed: state.dismissed
  };
}

function apply(d) {
  state.tabs = d.tabs;
  state.events = d.events;
  state.settings = d.settings;
  state.dismissed = d.dismissed || [];
  keepFilterValid();
}

// 開いているタブが消えた・非表示になったら「すべて」に戻す
function keepFilterValid() {
  const f = state.ui.filter;
  const hidden = state.tabs.some((t) => t.id === f && t.hidden);
  if (f !== 'all' && (hidden || !state.tabs.some((t) => t.id === f))) state.ui.filter = 'all';
}

export async function persist() {
  try {
    await saveData(snapshot());
    state.saveError = false;
    return true;
  } catch (e) {
    state.saveError = true;
    return false;
  }
}

/** データを変えたあとに呼ぶ。保存して、画面を描き直す。 */
export async function commit() {
  keepFilterValid();
  const ok = await persist();
  notify();
  return ok;
}

/** 起動時に1回だけ呼ぶ。 */
export async function init() {
  const { status, data, cloud } = await loadData();
  state.cloud = !!cloud;
  if (status === 'ok') {
    apply(normalizeData(data));
  } else {
    apply({
      tabs: DEFAULT_TABS.map((t) => ({ ...t })),
      events: [],
      settings: defaultSettings(),
      dismissed: []
    });
    if (status === 'missing') await persist();
    if (status === 'unavailable') state.saveError = true;
    if (status === 'corrupt') state.startupMessage = '保存データを読み込めませんでした。初期の状態で始めます。';
  }
  state.ready = true;
  notify();
  requestPersistence();
}

/** 書き出したファイルの内容で、今のデータをすべて置き換える。 */
export async function replaceAll(raw) {
  apply(normalizeData(raw));
  state.ui.openId = null;
  return commit();
}
