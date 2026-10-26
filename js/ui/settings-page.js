// 設定の画面：左の引き出しから開く。左から右へスワイプしても、予定の一覧へ戻る。
// 日程の取り込み、カレンダーへのまとめて追加、バックアップ、見本の削除。
import { state, notify } from '../state.js';
import { $ } from '../util/dom.js';
import { toast } from './toast.js';
import { upcomingDated, removeSamples } from '../data/events.js';
import { buildBackup, parseBackup, applyBackup } from '../data/backup.js';
import { addToCalendar } from '../services/calendar.js';
import { saveFile } from '../services/files.js';
import { openImportSheet } from './import-sheet.js';
import { refreshNow } from '../data/feed.js';
import { openTabManager } from './tab-manager.js';
import { GITHUB_MARKUP, initGithubLink, renderGithubLink } from './github-link.js';

// 固定の文字だけで作る（入力された内容は入れない）
const MARKUP = `
  <div class="wrap set-page" id="st-page">
    <div class="set-head">
      <button type="button" class="btn" id="st-back">← 戻る</button>
    </div>

    <section class="set-sec">
      <h3>タブ</h3>
      <div class="actions"><button type="button" class="btn solid" id="st-tabs">タブの編集・並び替え</button></div>
    </section>

    <section class="set-sec">
      <h3>日程の更新・取り込み</h3>
      <div class="actions">
        <button type="button" class="btn solid" id="st-refresh">今すぐ更新</button>
        <button type="button" class="btn" id="st-import-open">ファイルから取り込む</button>
      </div>
    </section>

    ${GITHUB_MARKUP}

    <section class="set-sec">
      <h3>カレンダー</h3>
      <div class="actions"><button type="button" class="btn" id="st-bulk">まとめて標準カレンダーに追加</button></div>
    </section>

    <section class="set-sec">
      <h3>バックアップ</h3>
      <div class="actions">
        <button type="button" class="btn" id="st-export">書き出す</button>
        <button type="button" class="btn" id="st-import">読み込む</button>
      </div>
      <input type="file" id="st-file" accept=".json,application/json" hidden>
      <div class="confirm-box" id="st-confirm" hidden>
        <p id="st-confirm-text"></p>
        <div class="actions">
          <button type="button" class="btn danger" id="st-apply">置き換える</button>
          <button type="button" class="btn" id="st-cancel">やめる</button>
        </div>
      </div>
      <p class="set-msg" id="st-msg" role="status"></p>
    </section>

    <section class="set-sec" id="st-sample-sec" hidden>
      <h3>見本の予定</h3>
      <div class="actions"><button type="button" class="btn danger" id="st-sample-clear">見本をすべて消す</button></div>
    </section>
  </div>`;

let pending = null; // 読み込み待ちのデータ

function setMsg(text, isError) {
  const m = $('#st-msg');
  if (!m) return;
  m.textContent = text;
  m.style.color = isError ? 'var(--danger)' : 'var(--muted)';
}

function clearPending() {
  pending = null;
  const c = $('#st-confirm');
  if (c) c.hidden = true;
}

export function initSettingsPage() {
  $('#app-settings').innerHTML = MARKUP;
  $('#st-back').addEventListener('click', closeSettings);
  $('#st-tabs').addEventListener('click', openTabManager);
  $('#st-refresh').addEventListener('click', async () => {
    const b = $('#st-refresh');
    b.disabled = true;
    const r = await refreshNow();
    b.disabled = false;
    if (!r.ok) toast('更新できませんでした。通信を確認してください');
    else if (r.added || r.updated) toast(`更新しました（追加${r.added}件・変更${r.updated}件）`);
    else toast('最新です。新しい日程はありません');
  });
  $('#st-import-open').addEventListener('click', openImportSheet);
  initGithubLink();
  $('#st-bulk').addEventListener('click', () => addToCalendar(upcomingDated()));
  $('#st-export').addEventListener('click', onExport);
  $('#st-import').addEventListener('click', () => $('#st-file').click());
  $('#st-file').addEventListener('change', onFile);
  $('#st-apply').addEventListener('click', onApply);
  $('#st-cancel').addEventListener('click', clearPending);
  $('#st-sample-clear').addEventListener('click', async () => {
    await removeSamples();
    toast('見本を消しました');
  });
  initSwipeClose();
}

/** 左から右へスワイプすると、設定の画面が指についてきて、離すと閉じる（予定の一覧へ戻る）。 */
function initSwipeClose() {
  const page = $('#app-settings');
  let x0 = 0, y0 = 0, mode = 'idle'; // idle / wait / h / v / anim
  page.addEventListener('touchstart', (e) => {
    if (mode === 'anim') return;
    const t = e.touches[0];
    const el = e.target instanceof Element ? e.target : null;
    // 左端は引き出し用。入力欄の中の操作も除く
    if (e.touches.length !== 1 || t.clientX <= 24 || (el && el.closest('input, textarea'))) { mode = 'idle'; return; }
    x0 = t.clientX; y0 = t.clientY; mode = 'wait';
  }, { passive: true });
  page.addEventListener('touchmove', (e) => {
    if (mode !== 'wait' && mode !== 'h') return;
    const t = e.touches[0];
    const dx = t.clientX - x0, dy = t.clientY - y0;
    if (mode === 'wait') {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      if (dx > 0 && Math.abs(dx) > Math.abs(dy) * 1.4) { mode = 'h'; page.style.overflowY = 'hidden'; } else { mode = 'v'; return; }
    }
    page.style.transition = 'none';
    page.style.transform = `translateX(${Math.max(0, dx)}px)`;
  }, { passive: true });
  const reset = () => { page.style.transform = ''; page.style.transition = ''; page.style.overflowY = ''; mode = 'idle'; };
  page.addEventListener('touchend', (e) => {
    if (mode !== 'h') { if (mode !== 'anim') mode = 'idle'; return; }
    const dx = e.changedTouches[0].clientX - x0;
    const w = page.clientWidth || window.innerWidth;
    mode = 'anim';
    page.style.transition = 'transform .2s ease-out';
    if (dx > w * 0.25) {
      page.style.transform = `translateX(${w}px)`;
      setTimeout(() => { closeSettings(); reset(); }, 200);
    } else {
      page.style.transform = '';
      setTimeout(reset, 220);
    }
  }, { passive: true });
  page.addEventListener('touchcancel', () => { if (mode !== 'anim') reset(); }, { passive: true });
}

/** ⚙️ボタンで切り替える。もう一度押すか「予定へ戻る」で一覧に戻る。 */
export function toggleSettings() {
  state.ui.screen = state.ui.screen === 'settings' ? 'list' : 'settings';
  state.ui.openId = null;
  notify();
  const page = $('#app-settings');
  if (page) page.scrollTop = 0;
}

function closeSettings() {
  state.ui.screen = 'list';
  notify();
}

/** 画面の切り替えと、表示内容を今の状態に合わせる。 */
export function renderSettings() {
  const on = state.ui.screen === 'settings';
  $('#app-settings').hidden = !on;
  $('#app-list').hidden = on;
  $('#app-pin').hidden = on;
  $('#app-now').hidden = on;
  if (!on) { clearPending(); setMsg('', false); return; }

  renderGithubLink();
  const list = upcomingDated();
  const bulk = $('#st-bulk');
  bulk.disabled = !list.length;
  bulk.textContent = list.length ? `まとめて標準カレンダーに追加（${list.length}件）` : 'まとめて標準カレンダーに追加';
  $('#st-sample-sec').hidden = !state.events.some((e) => e.sample);
}

async function onExport() {
  const { filename, text } = buildBackup(); // 共有シートを開くため、この前に await を挟まない
  const result = await saveFile({ filename, mime: 'application/json', text });
  if (result === 'downloaded') setMsg('書き出しました。ダウンロードした場所を確認してください。', false);
  else if (result === 'shared') setMsg('書き出しました。', false);
}

async function onFile(ev) {
  const file = ev.target.files && ev.target.files[0];
  ev.target.value = '';
  if (!file) return;
  clearPending();
  let text;
  try {
    text = await file.text();
  } catch (e) {
    setMsg('ファイルを開けませんでした。', true);
    return;
  }
  const r = parseBackup(text);
  if (!r.ok) {
    setMsg(r.error, true);
    return;
  }
  pending = r.data;
  setMsg('', false);
  $('#st-confirm-text').textContent =
    `予定${pending.events.length}件・タブ${pending.tabs.length}個を読み込みます。今のデータは、この内容に置き換わります。`;
  $('#st-confirm').hidden = false;
}

async function onApply() {
  if (!pending) return;
  const data = pending;
  clearPending();
  const ok = await applyBackup(data);
  setMsg(ok ? '読み込みました。' : '読み込みましたが、保存できませんでした。', !ok);
}
