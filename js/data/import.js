// 取り込みファイル（AIなどが調べた日程）を読み、今の予定と比べて「候補」にする。
// 候補は画面で確認してから追加する。ここでは画面を扱わない。
import { IMPORT_APP } from '../config.js';
import { state } from '../state.js';
import { commit } from './store.js';
import { sortedTabs } from './tabs.js';
import { parseDate } from '../util/date.js';
import { safeUrl, newId } from '../util/text.js';

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const norm = (s) => (s || '').normalize('NFKC').replace(/\s+/g, '').toLowerCase();

/**
 * 読み込んだ文字を確認する。{ ok: true, items, skipped } か { ok: false, error }。
 * 出典が無い項目は使わない（公式情報だけを入れる方針のため）。
 */
export function parseImport(text) {
  let obj;
  try {
    obj = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: '内容を読み込めませんでした。取り込み用のファイルか確認してください。' };
  }
  if (!obj || obj.app !== IMPORT_APP || !Array.isArray(obj.items)) {
    return { ok: false, error: 'このアプリの取り込み用ファイルではありません。' };
  }
  const items = [];
  let skipped = 0;
  obj.items.forEach((x) => {
    const title = str(x && x.title, 100);
    const source = str(x && x.source, 200);
    if (!title || !source) { skipped++; return; }
    const date = parseDate(x.date) ? x.date : '';
    const end = date && parseDate(x.end) && x.end > date ? x.end : '';
    items.push({
      tabName: str(x.tabName, 20), title, date, end,
      place: str(x.place, 100), source, url: safeUrl(str(x.url, 500)) || '', note: str(x.note, 1000)
    });
  });
  return { ok: true, items, skipped };
}

/**
 * 候補にする。kind は次のどれか。
 *   new … 今の予定に無い / update … 同じ名前があり、日程が違う（未定が決まった場合を含む） / dup … すでに同じ内容がある
 */
export function buildCandidates(items) {
  const tabs = sortedTabs();
  return items.map((item, i) => {
    const tab = tabs.find((t) => norm(t.name) === norm(item.tabName));
    const existing = state.events.find((e) => norm(e.title) === norm(item.title));
    let kind = 'new';
    if (existing) {
      const same = !item.date || (existing.date === item.date && (existing.end || '') === item.end);
      kind = same ? 'dup' : 'update';
    }
    return {
      key: i, kind, item, existing: existing || null,
      tabId: tab ? tab.id : (tabs[0] ? tabs[0].id : ''), tabGuess: !tab
    };
  });
}

/** 選ばれた候補を追加・更新する。{ added, updated } を返す。 */
export async function applyCandidates(list) {
  let added = 0, updated = 0;
  list.forEach((c) => {
    const x = c.item;
    if (c.kind === 'update' && c.existing) {
      Object.assign(c.existing, { date: x.date, end: x.end, source: x.source, rev: (c.existing.rev || 1) + 1});
      if (x.place) c.existing.place = x.place;
      if (x.url) c.existing.url = x.url;
      updated++;
    } else if (c.kind === 'new') {
      state.events.push({
        id: newId('e'), rev: 1, type: c.tabId, title: x.title, date: x.date, end: x.end,
        place: x.place, source: x.source, url: x.url, note: x.note
      });
      added++;
    }
  });
  if (added || updated) await commit();
  return { added, updated };
}
