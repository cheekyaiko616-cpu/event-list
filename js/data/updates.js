// 毎日の自動調査で「何が追加・変更されたか」の記録（updates.json）を読む。画面は扱わない。
const MAX_ENTRIES = 50; // 画面に出すのは新しい順に50件まで（記録の側でも50件にそろえる。tools/weekly-fetch.md）
const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
const list = (v) => (Array.isArray(v) ? v : []);

function cleanEntry(x) {
  if (!x || typeof x !== 'object' || !/^\d{4}-\d{2}-\d{2}$/.test(x.date || '')) return null;
  return {
    date: x.date,
    summary: str(x.summary, 300),
    added: list(x.added).slice(0, 200).map((a) => ({ title: str(a && a.title, 100), when: str(a && a.when, 60), tab: str(a && a.tab, 20) })).filter((a) => a.title),
    changed: list(x.changed).slice(0, 200).map((c) => ({ title: str(c && c.title, 100), before: str(c && c.before, 100), after: str(c && c.after, 100) })).filter((c) => c.title)
  };
}

/** 新しい順の記録を返す。読めなかったときは null。 */
export async function loadUpdates() {
  try {
    const res = await fetch('updates.json?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) return null;
    const body = await res.json();
    return list(body && body.entries).map(cleanEntry).filter((x) => x && (x.added.length || x.changed.length)).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, MAX_ENTRIES);
  } catch (e) {
    return null;
  }
}
