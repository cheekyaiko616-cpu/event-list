// 設定画面の「自動取り込みの連携」：GitHubの鍵を登録して、取り込み内容を自動で保存できるようにする。
import { $ } from '../util/dom.js';
import { toast } from './toast.js';
import { getToken, setToken, clearToken } from '../services/github.js';
import { syncNow, syncLabel, syncInfo } from '../data/watchlist-sync.js';

// 固定の文字だけで作る（入力された内容は入れない）
export const GITHUB_MARKUP = `
    <section class="set-sec" id="gh-sec">
      <h3>自動取り込みの連携</h3>
      <p class="help">タブに書いた「取り込み内容」を、GitHubに自動で保存します。毎週月曜の取得が、この内容を読んで日程を調べます。</p>
      <p class="set-msg" id="gh-state" role="status"></p>
      <div id="gh-form">
        <label class="legend" for="gh-token">GitHubの鍵（トークン）</label>
        <div class="tab-new-row">
          <input class="input" id="gh-token" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="github_pat_…">
          <button type="button" class="btn solid" id="gh-save">登録</button>
        </div>
      </div>
      <div class="actions" id="gh-actions" hidden>
        <button type="button" class="btn" id="gh-now">今すぐ保存して確かめる</button>
        <button type="button" class="btn danger" id="gh-clear">鍵を外す</button>
      </div>
      <details class="gh-help">
        <summary>鍵の作り方</summary>
        <ol>
          <li>GitHubで Settings → Developer settings → Fine-grained tokens → Generate new token</li>
          <li>Repository access は「Only select repositories」で event-list だけを選ぶ</li>
          <li>Permissions の Contents を「Read and write」にする</li>
          <li>作った鍵（github_pat_ で始まる文字）を、上の欄に貼って「登録」</li>
        </ol>
      </details>
      <p class="help">鍵はこの端末の中だけに保存され、バックアップには入りません。端末を他の人に渡さないでください。</p>
    </section>`;

export function initGithubLink() {
  $('#gh-save').addEventListener('click', onSave);
  $('#gh-now').addEventListener('click', async () => {
    const r = await syncNow();
    if (r && r.ok) toast(r.wrote ? 'GitHubに保存しました' : '接続できています（内容が同じなので書き込み不要）');
  });
  $('#gh-clear').addEventListener('click', () => {
    clearToken();
    toast('鍵を外しました');
    renderGithubLink();
  });
}

async function onSave() {
  const input = $('#gh-token');
  const t = input.value.trim();
  if (!t) { toast('鍵を貼り付けてください'); return; }
  if (!/^[\w-]{20,}$/.test(t)) { toast('鍵の形が正しくありません'); return; }
  if (!setToken(t)) { toast('この端末に鍵を保存できませんでした'); return; }
  input.value = '';
  renderGithubLink();
  const r = await syncNow();
  if (r && r.ok) toast(r.wrote ? '連携できました（GitHubに保存しました）' : '連携できました');
  else clearTokenIfRejected();
}

/** 鍵が拒否されたら、使えない鍵は残さない。 */
function clearTokenIfRejected() {
  const s = syncInfo();
  if (s.status === 'error' && /鍵が正しくない/.test(s.error)) {
    clearToken();
    renderGithubLink();
  }
}

/** 開いているときに呼ぶ。状態の文と、ボタンの出し入れを今に合わせる。 */
export function renderGithubLink() {
  const on = !!getToken();
  $('#gh-state').textContent = syncLabel();
  $('#gh-state').style.color = syncInfo().status === 'error' ? 'var(--danger)' : 'var(--muted)';
  $('#gh-form').hidden = on;
  $('#gh-actions').hidden = !on;
}
