// 取り込み内容の自動保存：タブの「取り込み内容」が変わったら、GitHubの watchlist.json に保存する。
// 毎週の取得は、このファイルを読んで日程を調べる。画面は扱わない（状態は syncLabel で読む）。
//   ・起動しただけでは保存しない（変えたときだけ保存）
//   ・鍵を登録した最初の1回だけ、GitHub側にある内容で「空のタブ」を埋める（上書きはしない）
import { state, subscribe, notify } from '../state.js';
import { commit } from './store.js';
import { watchlistData } from './watchlist.js';
import { readRemote, writeRemote, getToken } from '../services/github.js';
import { GITHUB } from '../config.js';

const sync = { status: 'off', error: '', at: '', wrote: false }; // off / idle / saving / ok / error。wrote: 最後に実際に書き込んだか
let baseline = null;   // 最後に確認した、内容の印
let timer = null;
let running = false;
let again = false;

const fingerprint = () => JSON.stringify(watchlistData().tabs);
const filled = () => { try { return localStorage.getItem(GITHUB.filledKey) === '1'; } catch (e) { return false; } };
const markFilled = () => { try { localStorage.setItem(GITHUB.filledKey, '1'); } catch (e) { /* 次回もう一度行うだけ */ } };

function set(status, error = '', wrote = false) {
  sync.status = status;
  sync.error = error;
  if (status === 'ok') sync.wrote = wrote;
  if (status === 'ok') sync.at = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  notify();
}

export function syncInfo() {
  return { ...sync, connected: !!getToken() };
}

/** 画面に出す一言。 */
export function syncLabel() {
  if (!getToken()) return '未設定';
  if (sync.status === 'saving') return '保存しています…';
  if (sync.status === 'error') return `保存できませんでした。${sync.error}`;
  if (sync.status === 'ok') {
    return sync.wrote
      ? `保存しました（${sync.at}）`
      : `接続OK・書き込みは不要でした（${sync.at}）`;
  }
  return '連携中';
}

/** 内容を保存する。変わっていなければ書かない。 */
export async function syncNow() {
  if (!getToken()) { set('off'); return { ok: false }; }
  if (running) { again = true; return { ok: true, queued: true }; }
  running = true;
  set('saving');
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const r = await readRemote();
      if (!r.ok) { set('error', r.error); return { ok: false }; }

      // 鍵を登録した最初の1回だけ：GitHub側の内容で、空のタブを埋める
      if (!filled()) {
        let remote = null;
        try { remote = r.text ? JSON.parse(r.text) : null; } catch (e) { remote = null; }
        const rt = remote && Array.isArray(remote.tabs) ? remote.tabs : [];
        let changed = false;
        state.tabs.forEach((t) => {
          if ((t.watch || '').trim()) return;
          const hit = rt.find((x) => x && x.tabName === t.name && typeof x.watch === 'string' && x.watch.trim());
          if (hit) { t.watch = hit.watch.trim().slice(0, 300); changed = true; }
        });
        if (changed) { baseline = fingerprint(); await commit(); } // 先に印を更新して、二重に保存しない
        markFilled();
      }

      // 中身が同じなら書かない
      let same = false;
      try { same = r.text && JSON.stringify(JSON.parse(r.text).tabs) === fingerprint(); } catch (e) { same = false; }
      if (same) { baseline = fingerprint(); set('ok', '', false); return { ok: true, wrote: false }; }

      const text = JSON.stringify(watchlistData(), null, 2) + '\n';
      const w = await writeRemote(text, r.sha, 'アプリから取り込み内容を更新');
      if (w.ok) { baseline = fingerprint(); set('ok', '', true); return { ok: true, wrote: true }; }
      if (w.status !== 409 && w.status !== 422) { set('error', w.error); return { ok: false }; }
      // 先にGitHub側が変わっていたので、読み直してもう一度
    }
    set('error', 'GitHub側の内容と食い違っています。少し待ってからもう一度試してください。');
    return { ok: false };
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
  if (baseline === null) { baseline = f; return; } // 起動直後の状態は、変更とみなさない
  if (f === baseline) return;
  baseline = f;
  if (getToken()) schedule();
}

export function initWatchSync() {
  if (getToken()) sync.status = 'idle';
  subscribe(onChange);
}
