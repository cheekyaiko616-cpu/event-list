// 設定の画面：左の引き出しから開く。右へスワイプするか「← 戻る」で、予定の一覧へ戻る。
// 日程の取り込み、バックアップ。
import { state, notify } from '../state.js';
import { $ } from '../util/dom.js';
import { toast } from './toast.js';
import { buildBackup, parseBackup, applyBackup } from '../data/backup.js';
import { saveFile } from '../services/files.js';
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

    ${GITHUB_MARKUP}

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
  initGithubLink();
  $('#st-export').addEventListener('click', onExport);
  $('#st-import').addEventListener('click', () => $('#st-file').click());
  $('#st-file').addEventListener('change', onFile);
  $('#st-apply').addEventListener('click', onApply);
  $('#st-cancel').addEventListener('click', clearPending);
  initSwipeClose();
}

/**
 * 左から右へスワイプすると、設定の画面が指についてきて、離すと閉じる（予定の一覧へ戻る）。右から左は何もしない。
 * 少しの距離でも、勢いよく払えば閉じる。縦のスクロールは、そのまま使える。
 */
function initSwipeClose() {
  const page = $('#app-settings');
  let x0 = 0, y0 = 0, t0 = 0, mode = 'idle'; // idle / wait / h / v / anim
  const typing = (el) => !!(el && el.closest('textarea, input:not([type="checkbox"])'));
  page.addEventListener('touchstart', (e) => {
    if (mode === 'anim') return;
    const t = e.touches[0];
    const el = e.target instanceof Element ? e.target : null;
    if (e.touches.length !== 1 || typing(el)) { mode = 'idle'; return; }
    x0 = t.clientX; y0 = t.clientY; t0 = e.timeStamp; mode = 'wait';
  }, { passive: true });
  page.addEventListener('touchmove', (e) => {
    if (mode !== 'wait' && mode !== 'h') return;
    const t = e.touches[0];
    const dx = t.clientX - x0, dy = t.clientY - y0;
    if (mode === 'wait') {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      // 右へ動かしたときだけ閉じる動作にする。左のふちは、iPhone自身の「戻る」用に残す
      if (dx > 0 && Math.abs(dx) > Math.abs(dy) * 1.2 && x0 > 24) mode = 'h';
      else { mode = 'v'; return; }
    }
    if (e.cancelable) e.preventDefault(); // 横に動かしている間は、縦スクロールを止める
    page.style.transition = 'none';
    page.style.transform = `translateX(${Math.max(0, dx)}px)`;
  }, { passive: false });
  const reset = () => { page.style.transform = ''; page.style.transition = ''; mode = 'idle'; };
  page.addEventListener('touchend', (e) => {
    if (mode !== 'h') { if (mode !== 'anim') mode = 'idle'; return; }
    const dx = e.changedTouches[0].clientX - x0;
    const w = page.clientWidth || window.innerWidth;
    const fast = dx / Math.max(1, e.timeStamp - t0) > 0.5 && dx > 40; // 勢いよく払った
    mode = 'anim';
    page.style.transition = 'transform .2s ease-out';
    if (dx > w * 0.2 || fast) {
      page.style.transform = `translateX(${w}px)`;
      setTimeout(() => { closeSettings(); reset(); }, 200);
    } else {
      page.style.transform = '';
      setTimeout(reset, 220);
    }
  }, { passive: true });
  page.addEventListener('touchcancel', () => { if (mode !== 'anim') reset(); }, { passive: true });
}

/** 引き出しの「設定」で切り替える。もう一度押すか「← 戻る」で一覧に戻る。 */
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
let screenOn = null; // 設定の画面を出しているか。切り替わったときだけ、画面を入れ替える
export function renderSettings() {
  const on = state.ui.screen === 'settings';
  if (on !== screenOn) {
    screenOn = on;
    $('#app-settings').hidden = !on;
    $('#app-list').hidden = on;
    $('#app-pin').hidden = on;
    $('#app-now').hidden = on;
    if (!on) { clearPending(); setMsg('', false); }
  }
  if (on) renderGithubLink();
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
