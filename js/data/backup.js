// データの書き出しと読み込み（バックアップ）。
import { APP } from '../config.js';
import { snapshot, replaceAll } from './store.js';
import { normalizeData } from './schema.js';
import { todayIso } from '../util/date.js';

/** 書き出すファイルの名前と中身。 */
export function buildBackup() {
  return {
    filename: `${APP.id}-${todayIso()}.json`,
    text: JSON.stringify(snapshot(), null, 2)
  };
}

/** 読み込んだ文字を確認する。{ ok: true, data } か { ok: false, error }。 */
export function parseBackup(text) {
  let obj;
  try {
    obj = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: 'ファイルを読み込めませんでした。書き出したファイルか確認してください。' };
  }
  if (!obj || obj.app !== APP.id || !Array.isArray(obj.events) || !Array.isArray(obj.tabs)) {
    return { ok: false, error: 'このアプリで書き出したファイルではありません。' };
  }
  return { ok: true, data: normalizeData(obj) };
}

/** 今のデータを、読み込んだ内容で置き換える。 */
export function applyBackup(data) {
  return replaceAll(data);
}
