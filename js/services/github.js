// GitHubとのやりとり：鍵の保存、watchlist.json の読み書き。
// 画面は扱わない。保存の流れは data/watchlist-sync.js が決める。
import { GITHUB } from '../config.js';

const API = 'https://api.github.com';

export function getToken() {
  try { return localStorage.getItem(GITHUB.tokenKey) || ''; } catch (e) { return ''; }
}
export function setToken(t) {
  try { localStorage.setItem(GITHUB.tokenKey, t); return true; } catch (e) { return false; }
}
export function clearToken() {
  try { localStorage.removeItem(GITHUB.tokenKey); } catch (e) { /* 消せなくても動く */ }
}

/** 日本語を含む文字を、GitHubが受け取れる形（base64）にする。 */
function toBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function fromBase64(b64) {
  const bin = atob(String(b64).replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

const url = () => `${API}/repos/${GITHUB.owner}/${GITHUB.repo}/contents/${GITHUB.path}`;
const headers = (token) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28'
});

/** 失敗の中身を、やさしい言葉にする。 */
function explain(status) {
  if (status === 401) return '鍵が正しくないか、期限が切れています。';
  if (status === 403) return '鍵の権限が足りません（Contentsの読み書きが必要です）。';
  if (status === 404) return '対象のリポジトリにアクセスできません。鍵の対象を確認してください。';
  if (status === 409 || status === 422) return 'GitHub側の内容が先に変わっていました。もう一度試します。';
  if (status === 0) return '通信できませんでした。';
  return `GitHubから想定外の返事がありました（${status}）。`;
}

/** 読む。{ ok, status, sha, text, error }。ファイルがまだ無いときは ok で sha=null。 */
export async function readRemote() {
  const token = getToken();
  if (!token) return { ok: false, status: 0, error: '鍵が登録されていません。' };
  try {
    const res = await fetch(`${url()}?ref=${GITHUB.branch}&t=${Date.now()}`, { headers: headers(token), cache: 'no-store' });
    if (res.status === 404) return { ok: true, status: 404, sha: null, text: '' };
    if (!res.ok) return { ok: false, status: res.status, error: explain(res.status) };
    const body = await res.json();
    return { ok: true, status: 200, sha: body.sha || null, text: body.content ? fromBase64(body.content) : '' };
  } catch (e) {
    return { ok: false, status: 0, error: explain(0) };
  }
}

/** 書く。sha は、読んだときの版（新規ならnull）。{ ok, status, sha, error }。 */
export async function writeRemote(text, sha, message) {
  const token = getToken();
  if (!token) return { ok: false, status: 0, error: '鍵が登録されていません。' };
  const body = { message, content: toBase64(text), branch: GITHUB.branch };
  if (sha) body.sha = sha;
  try {
    const res = await fetch(url(), {
      method: 'PUT',
      headers: { ...headers(token), 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) return { ok: false, status: res.status, error: explain(res.status) };
    const out = await res.json();
    return { ok: true, status: res.status, sha: out && out.content ? out.content.sha : null };
  } catch (e) {
    return { ok: false, status: 0, error: explain(0) };
  }
}
