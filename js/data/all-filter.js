// 「すべて」タブの中だけで使う絞り込み。外したタブの予定を「すべて」に出さない（タブ自体も予定も消えない）。端末だけに保存する。
import { state } from '../state.js';

const KEY = 'eventcho.allfilter.v1';
let off = load();

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return new Set(Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
  } catch (e) { return new Set(); }
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify([...off])); } catch (e) { /* 保存できなくても動く */ }
}

/** 絞り込みで外しているタブか（いまあるタブだけ数える）。 */
export const isOff = (id) => off.has(id);

/** 外しているタブの数（消えたタブは数えない）。 */
export function offCount() {
  return state.tabs.filter((t) => !t.hidden && off.has(t.id)).length;
}

export function setOff(id, value) {
  if (value) off.add(id); else off.delete(id);
  save();
}

export function resetOff() {
  off = new Set();
  save();
}
