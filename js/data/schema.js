// 保存データや読み込んだファイルの中身を、安全な形に整える。
// 項目を増やすときは、ここに足す。
import { WATCH_MAX } from '../config.js';
import { normalizeColor } from '../util/tab-color.js';
import { normalizeSettings, normalizeShow, normalizeKinds } from './settings-normalize.js';
import { parseDate } from '../util/date.js';
import { cleanDates } from './dates.js';

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

/** 「カレンダーに追加」した期間の並び [{ from, to }]。正しくないものは捨てる。 */
function cleanCal(list) {
  return (Array.isArray(list) ? list : [])
    .filter((r) => r && parseDate(r.from) && parseDate(r.to) && r.to >= r.from)
    .map((r) => ({ from: r.from, to: r.to }))
    .slice(-20);
}

export function normalizeData(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};

  const tabs = [];
  const seenTabs = new Set();
  (Array.isArray(src.tabs) ? src.tabs : []).forEach((t, i) => {
    if (!t || typeof t.id !== 'string' || !t.id || seenTabs.has(t.id)) return;
    seenTabs.add(t.id);
    tabs.push({
      id: t.id.slice(0, 60),
      name: str(t.name, 20) || '無題',
      color: normalizeColor(t.color),
      order: Number.isFinite(t.order) ? t.order : i + 1,
      watch: str(t.watch, WATCH_MAX).trim(),
      hidden: t.hidden === true, // 一覧に出さない
      show: normalizeShow(t.show), // 一覧に出す項目
      importKinds: normalizeKinds(t.importKinds), // 自動で取り込む日付の種類
    });
  });

  const events = [];
  const seenEvents = new Set();
  (Array.isArray(src.events) ? src.events : []).forEach((e) => {
    if (!e || typeof e.id !== 'string' || !e.id || seenEvents.has(e.id)) return;
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
      feedHash: str(e.feedHash, 2400), // feedHash()（最大で約2100字）より長く取る。切ると、開くたびに「変更あり」になる
      manual: e.manual === true,
      checkedAt: parseDate(e.checkedAt) ? e.checkedAt : '',
      newAt: parseDate(e.newAt) ? e.newAt : '', // 新しく入った・変わった日（一覧の「NEW」の印に使う）
      cal: cleanCal(e.cal), // 「カレンダーに追加」した期間（朝の支度ブリーフへ渡す）
      lastChange: e.lastChange && parseDate(e.lastChange.at) ? { at: e.lastChange.at, from: str(e.lastChange.from, 100), manual: e.lastChange.manual === true } : null,
      rev: Number.isInteger(e.rev) && e.rev > 0 ? e.rev : 1
    });
  });

  const dismissed = (Array.isArray(src.dismissed) ? src.dismissed : []).filter((x) => typeof x === 'string' && x).map((x) => x.slice(0, 100)).slice(0, 2000);

  return { tabs, events, settings: normalizeSettings(src.settings), dismissed };
}
