// 設定の画面：カレンダーのアラート、まとめて追加、バックアップ、見本の削除。
import { state } from '../state.js';
import { $, el } from '../util/dom.js';
import { mountSheet, showSheet, hideSheet } from './sheet.js';
import { toast } from './toast.js';
import { commit } from '../data/store.js';
import { upcomingDated, removeSamples } from '../data/events.js';
import { buildBackup, parseBackup, applyBackup } from '../data/backup.js';
import { googleCalendarUrl } from '../services/calendar.js';
import { formatRange } from '../util/date.js';
import { saveFile } from '../services/files.js';

const MARKUP = `
  <div class="sheet" id="st-sheet" role="dialog" aria-modal="true" aria-labelledby="st-heading">
    <div class="sheet-head">
      <h2 id="st-heading">設定</h2>
      <button type="button" class="ghost" id="st-close">閉じる</button>
    </div>

    <section class="set-sec">
      <h3>Googleカレンダーにまとめて追加</h3>
      <p class="help" id="st-bulk-help"></p>
      <div class="bulk-list" id="st-bulk-list"></div>
    </section>

    <section class="set-sec">
      <h3>バックアップ</h3>
      <p class="help">データはこの端末のブラウザの中だけに保存されています。機種変更やブラウザのデータ削除に備えて、ときどき書き出してください。</p>
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
      <p class="help">「（例）」が付いた仮の予定が残っています。</p>
      <div class="actions"><button type="button" class="btn danger" id="st-sample-clear">見本をすべて消す</button></div>
    </section>
  </div>`;

let wrap = null;
let pending = null; // 読み込み待ちのデータ

function setMsg(text, isError) {
  const m = $('#st-msg');
  m.textContent = text;
  m.style.color = isError ? 'var(--danger)' : 'var(--muted)';
}

function clearPending() {
  pending = null;
  $('#st-confirm').hidden = true;
}

export function initSettingsSheet() {
  wrap = mountSheet(MARKUP);
  $('#st-close').addEventListener('click', () => hideSheet(wrap));
  wrap.addEventListener('sheetclose', () => { clearPending(); setMsg('', false); });

  $('#st-export').addEventListener('click', onExport);
  $('#st-import').addEventListener('click', () => $('#st-file').click());
  $('#st-file').addEventListener('change', onFile);
  $('#st-apply').addEventListener('click', onApply);
  $('#st-cancel').addEventListener('click', clearPending);

  $('#st-sample-clear').addEventListener('click', async () => {
    await removeSamples();
    toast('見本を消しました');
  });
}

export function openSettings() {
  setMsg('', false);
  showSheet(wrap);
  renderSettings();
}

/** 開いているときだけ、表示内容を今の状態に合わせる。 */
export function renderSettings() {
  if (!wrap || wrap.hidden) return;
  const list = upcomingDated();
  $('#st-bulk-help').textContent = list.length
    ? `これからの確定した予定 ${list.length} 件です。「追加」を押すと、その予定の登録画面が開きます（Googleカレンダーは1件ずつ追加します）。`
    : 'これからの確定した予定がありません。';
  const box = $('#st-bulk-list');
  box.replaceChildren(...list.map((e) => el('div', { class: 'bulk-row' },
    el('span', { class: 'bulk-text' },
      el('b', { text: e.title || '（名前なし）' }),
      el('span', { text: formatRange(e) })),
    el('a', {
      class: 'btn', href: googleCalendarUrl(e), target: '_blank', rel: 'noopener noreferrer', text: '追加',
      onclick: (ev) => ev.currentTarget.classList.add('done')
    }))));
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
