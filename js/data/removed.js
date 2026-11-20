// 地域外として自動で消された予定の記録（removed.json）を読む。画面は扱わない。
// 毎日の取得が、設定した地域の外の予定を feed.json から removed.json へ移す。ここは読むだけ。
const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
const MAX_ENTRIES = 300;

async function readEntries() {
  const res = await fetch('removed.json', { cache: 'no-cache' }); // 変わっていなければ「変更なし」の返事だけで済む
  if (!res.ok) return null;
  const body = await res.json();
  return Array.isArray(body && body.entries) ? body.entries : [];
}

/** 新しく消された順の記録（予定の中身つき）。読めなかったときは null。 */
export async function loadRemoved() {
  try {
    const list = await readEntries();
    if (!list) return null;
    return list
      .filter((x) => x && typeof x === 'object' && typeof x.id === 'string' && x.id && typeof x.title === 'string' && x.title)
      .map((x) => ({ ...x, removedAt: /^\d{4}-\d{2}-\d{2}$/.test(x.removedAt || '') ? x.removedAt : '', reason: str(x.reason, 100) }))
      .sort((a, b) => (a.removedAt < b.removedAt ? 1 : -1))
      .slice(0, MAX_ENTRIES);
  } catch (e) {
    return null;
  }
}

/** 一覧から外す対象の id だけ。読めなければ空。 */
export async function loadRemovedIds() {
  const list = await loadRemoved();
  return new Set((list || []).map((x) => x.id));
}
