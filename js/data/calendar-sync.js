// カレンダーに追加した予定の一覧を、GitHub の calendar.json に保存する（朝の支度ブリーフが読む）。
// 流れは watchlist-sync.js と同じ：中身が変わったときだけ書く。鍵が無ければ何もしない。
// 入れるのは、予定名・期間・場所・タブ名・タブの色・開場/開演の時刻だけ（メモの本文は入れない）。
import { state, subscribe } from '../state.js';
import { readRemote, writeRemote, getToken } from '../services/github.js';
import { GITHUB } from '../config.js';
import { tabById } from './tabs.js';
import { todayIso, addDaysIso } from '../util/date.js';

// タブの色の見本（明るい表示の色）。css/tokens.css の --c1〜--c12 と同じ
const PALETTE = ['#c2410c', '#2b7a3d', '#3a4cc4', '#b0266b', '#0f766e', '#8a5a00', '#6d3fc9', '#475569', '#b91c1c', '#0369a1', '#4d7c0f', '#a21caf'];
const hexOf = (c) => (Number.isInteger(c) ? PALETTE[c - 1] || '#475569' : typeof c === 'string' ? c : '#475569');
const time = (note, word) => { const m = (note || '').match(new RegExp(`${word}\\s*(\\d{1,2}:\\d{2})`)); return m ? m[1] : ''; };

/** calendar.json の中身。終わってから2日以上たった期間は入れない。 */
function calendarData() {
  const since = addDaysIso(todayIso(), -2);
  const items = [];
  state.events.forEach((e) => {
    (e.cal || []).forEach((r) => {
      if (r.to < since) return;
      const tab = tabById(e.type);
      items.push({
        id: `${e.id}-${r.from}`, title: e.title, from: r.from, to: r.to, place: e.place || '',
        tab: tab ? tab.name : '', color: hexOf(tab && tab.color),
        open: time(e.note, '開場'), start: time(e.note, '開演')
      });
    });
  });
  items.sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : a.title < b.title ? -1 : 1));
  return { app: 'event-list', kind: 'calendar', items };
}

const fingerprint = () => JSON.stringify(calendarData().items);
let baseline = null;
let timer = null;
let running = false;
let again = false;

async function syncNow() {
  if (!getToken()) return;
  if (running) { again = true; return; }
  running = true;
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const r = await readRemote(GITHUB.calendarPath);
      if (!r.ok) return;
      let same = false;
      try { same = !!r.text && JSON.stringify(JSON.parse(r.text).items) === fingerprint(); } catch (e) { same = false; }
      if (same) { baseline = fingerprint(); return; }
      const body = { ...calendarData(), savedAt: new Date().toISOString() };
      const w = await writeRemote(JSON.stringify(body, null, 2) + '\n', r.sha, 'アプリからカレンダー追加済みの予定を更新', GITHUB.calendarPath);
      if (w.ok) { baseline = fingerprint(); return; }
      if (w.status !== 409 && w.status !== 422) return;
    }
  } finally {
    running = false;
    if (again) { again = false; schedule(); }
  }
}

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(syncNow, 1500);
}

function onChange() {
  if (!state.ready) return;
  const f = fingerprint();
  if (baseline === null) { baseline = f; schedule(); return; } // 起動時に1回だけ、GitHub側と食い違っていないか確かめる
  if (f === baseline) return;
  baseline = f;
  schedule();
}

export function initCalendarSync() {
  subscribe(onChange);
}
