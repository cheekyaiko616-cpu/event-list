// 保存先との出し入れだけを担当する。
// Claude上で開いたときは共有データ(db)に、そうでなければ端末内(localStorage)に保存する。
// 保存先を変えるときは、このファイルだけを書き換える。
import { STORAGE_KEY } from '../config.js';
import { getDb } from '../services/cloud.js';

const DOC = 'app/state';

function readLocal() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    return { status: 'unavailable', data: null };
  }
  if (raw === null) return { status: 'missing', data: null };
  try {
    return { status: 'ok', data: JSON.parse(raw) };
  } catch (e) {
    // 壊れていた場合は、上書きされる前にコピーを残す
    try { localStorage.setItem(STORAGE_KEY + '.corrupt', raw); } catch (_) { /* 残せなくても続ける */ }
    return { status: 'corrupt', data: null };
  }
}

function writeLocal(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** { status: 'ok' | 'missing' | 'corrupt' | 'unavailable', data, cloud } を返す。 */
export async function loadData() {
  const db = await getDb();
  if (db) {
    try {
      const snap = await db.doc(DOC).get();
      if (snap.exists) {
        const body = snap.data() || {};
        try { return { status: 'ok', data: JSON.parse(body.json), cloud: true }; } catch (e) { /* 下で端末内を見る */ }
      }
      // 共有データがまだ空：以前この端末に保存したものがあれば引き継ぐ
      const local = readLocal();
      if (local.status === 'ok') {
        await saveData(local.data);
        return { ...local, cloud: true };
      }
      return { status: 'missing', data: null, cloud: true };
    } catch (e) { /* 共有データを読めないときは、端末内で続ける */ }
  }
  return { ...readLocal(), cloud: false };
}

let queue = Promise.resolve();

/** 保存に失敗したら例外を投げる。同じ書類への書き込みは1つずつ順に行う。 */
export function saveData(data) {
  const run = async () => {
    try { writeLocal(data); } catch (e) { /* 共有データに保存できれば続ける */ }
    const db = await getDb();
    if (db) {
      await db.doc(DOC).set({ json: JSON.stringify(data), savedAt: new Date().toISOString() });
      return;
    }
    writeLocal(data);
  };
  const p = queue.then(run, run);
  queue = p.catch(() => {});
  return p;
}

/** ブラウザに「このデータは消さないで」と頼む。通らなくても支障はない。 */
export async function requestPersistence() {
  try {
    if (navigator.storage && navigator.storage.persist) await navigator.storage.persist();
  } catch (e) { /* 何もしない */ }
}
