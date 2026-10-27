// 保存データや読み込んだファイルの中身を、安全な形に整える。
// 項目を増やすときは、ここに足す。
import { COLORS, WATCH_MAX, DATE_KINDS, KIND_DEFAULT_TABS } from '../config.js';
import { normalizeSettings, normalizeShow, normalizeKinds } from './settings.js';
import { parseDate } from '../util/date.js';
import { cleanDates } from './dates.js';

const ALL_KINDS = DATE_KINDS.map((k) => k.id);
const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

export function normalizeData(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};

  const legacy = src.settings && typeof src.settings === 'object' ? src.settings : {}; // 以前は設定にあった表示の項目を引き継ぐ
  // 以前は設定全体の項目だった。すでに自動の日付が入っているタブだけ、その内容を引き継ぐ
  const receiving = new Set((Array.isArray(src.events) ? src.events : []).filter((e) => e && Array.isArray(e.dates) && e.dates.some((d) => d && d.auto === true)).map((e) => e.type));
  const tabs = [];
  const seenTabs = new Set();
  (Array.isArray(src.tabs) ? src.tabs : []).forEach((t, i) => {
    if (!t || typeof t.id !== 'string' || !t.id || seenTabs.has(t.id)) return;
    seenTabs.add(t.id);
    tabs.push({
      id: t.id.slice(0, 60),
      name: str(t.name, 20) || '無題',
      color: Number.isInteger(t.color) && t.color >= 1 && t.color <= COLORS ? t.color : COLORS,
      order: Number.isFinite(t.order) ? t.order : i + 1,
      watch: str(t.watch, WATCH_MAX).trim(),
      hidden: t.hidden === true || (legacy.hiddenTabs || []).includes(t.id), // 一覧に出さない
      show: normalizeShow(t.show, legacy.show), // 一覧に出す項目
      importKinds: normalizeKinds(t.importKinds, receiving.has(t.id) || KIND_DEFAULT_TABS.includes(str(t.name, 20)) ? (legacy.importKinds || ALL_KINDS) : []) // 自動で取り込む日付の種類
    });
  });

  const events = [];
  const seenEvents = new Set();
  (Array.isArray(src.events) ? src.events : []).forEach((e) => {
    if (!e || typeof e.id !== 'string' || !e.id || seenEvents.has(e.id)) return;
    if (e.sample === true) return; // 以前あった「見本の予定」は、読み込むときに取り除く
    seenEvents.add(e.id);
    const date = parseDate(e.date) ? e.date : '';
    const end = date && parseDate(e.end) && e.end > date ? e.end : '';
    events.push({
      id: e.id.slice(0, 60),
      type: str(e.type, 60),
      title: str(e.title, 100),
      date,
      end,
      place: str(e.place, 100),
      source: str(e.source, 200),
      url: str(e.url, 500),
      note: str(e.note, 1000),
      dates: cleanDates(e.dates),
      feedId: str(e.feedId, 100),
      feedHash: str(e.feedHash, 600),
      manual: e.manual === true,
      checkedAt: parseDate(e.checkedAt) ? e.checkedAt : '',
      newAt: parseDate(e.newAt) ? e.newAt : '', // 新しく入った・変わった日（一覧の「NEW」の印に使う）
      lastChange: e.lastChange && parseDate(e.lastChange.at) ? { at: e.lastChange.at, from: str(e.lastChange.from, 100), manual: e.lastChange.manual === true } : null,
      rev: Number.isInteger(e.rev) && e.rev > 0 ? e.rev : 1
    });
  });


  const dismissed = (Array.isArray(src.dismissed) ? src.dismissed : []).filter((x) => typeof x === 'string' && x).map((x) => x.slice(0, 100)).slice(0, 2000);

  return { tabs, events, settings: normalizeSettings(src.settings), dismissed };
}
