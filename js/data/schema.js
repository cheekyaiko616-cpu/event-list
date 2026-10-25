// 保存データや読み込んだファイルの中身を、安全な形に整える。
// 項目を増やすときは、ここに足す。
import { COLORS, DEFAULT_SETTINGS, ALERT_OPTIONS, WATCH_MAX } from '../config.js';
import { parseDate } from '../util/date.js';

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

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
      color: Number.isInteger(t.color) && t.color >= 1 && t.color <= COLORS ? t.color : COLORS,
      order: Number.isFinite(t.order) ? t.order : i + 1,
      watch: str(t.watch, WATCH_MAX).trim()
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
      sample: e.sample === true,
      feedId: str(e.feedId, 100),
      feedHash: str(e.feedHash, 600),
      manual: e.manual === true,
      checkedAt: parseDate(e.checkedAt) ? e.checkedAt : '',
      lastChange: e.lastChange && parseDate(e.lastChange.at) ? { at: e.lastChange.at, from: str(e.lastChange.from, 100), manual: e.lastChange.manual === true } : null,
      rev: Number.isInteger(e.rev) && e.rev > 0 ? e.rev : 1
    });
  });

  const given = src.settings && src.settings.alerts;
  const alerts = Array.isArray(given)
    ? given.filter((id) => ALERT_OPTIONS.some((o) => o.id === id))
    : DEFAULT_SETTINGS.alerts.slice();

  const dismissed = (Array.isArray(src.dismissed) ? src.dismissed : []).filter((x) => typeof x === 'string' && x).map((x) => x.slice(0, 100)).slice(0, 2000);

  return { tabs, events, settings: { alerts }, dismissed };
}
