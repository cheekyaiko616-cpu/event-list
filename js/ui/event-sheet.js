// 予定の追加・編集の画面。
import { state } from '../state.js';
import { $, el, clear } from '../util/dom.js';
import { mountSheet, showSheet, hideSheet } from './sheet.js';
import { toast } from './toast.js';
import { sortedTabs, tabById } from '../data/tabs.js';
import { saveEvent, deleteEvent, validateEventForm } from '../data/events.js';
import { openTabManager } from './tab-manager.js';

const MARKUP = `
  <form class="sheet" id="es-form" role="dialog" aria-modal="true" aria-labelledby="es-heading" novalidate>
    <div class="sheet-head">
      <h2 id="es-heading">予定を追加</h2>
      <button type="button" class="ghost" id="es-close">閉じる</button>
    </div>

    <fieldset class="seg">
      <legend class="legend">種類（タブ）</legend>
      <div class="seg-row" id="es-types"></div>
    </fieldset>

    <div class="field">
      <label for="es-title">名前</label>
      <input class="input" id="es-title" type="text" autocomplete="off" maxlength="100" placeholder="例）スーパーGT 第5戦 富士">
    </div>

    <div class="field">
      <div class="two">
        <div class="field flush">
          <label for="es-date">開始日</label>
          <input class="input" id="es-date" type="date">
        </div>
        <div class="field flush">
          <label for="es-end">終了日（複数日のとき）</label>
          <input class="input" id="es-end" type="date">
        </div>
      </div>
      <p class="help">公式発表がまだなら、日付は空欄のまま保存します。「日程未定」に入ります。</p>
    </div>

    <div class="field">
      <label for="es-place">場所</label>
      <input class="input" id="es-place" type="text" autocomplete="off" maxlength="100">
    </div>

    <div class="field">
      <label for="es-source">出典メモ</label>
      <input class="input" id="es-source" type="text" autocomplete="off" maxlength="200" placeholder="例）公式サイト／主催者発表を報じたニュース">
      <p class="help">出どころが分からない日程は入力しません。</p>
    </div>

    <div class="field">
      <label for="es-url">リンク（任意）</label>
      <input class="input" id="es-url" type="url" inputmode="url" autocomplete="off" maxlength="500" placeholder="https://">
    </div>

    <div class="field">
      <label for="es-note">メモ（任意）</label>
      <textarea class="input" id="es-note" rows="2" maxlength="1000"></textarea>
    </div>

    <p class="note" id="es-auto-note" hidden>自動取得した予定です。ここで直すと「手動修正」として残り、公式の情報が変わるまで、直した内容を守ります。</p>

    <label class="check" id="es-continue-row"><input type="checkbox" id="es-continue">続けて追加する（種類・出典・リンクは引き継ぎ）</label>

    <p class="err" id="es-error" role="alert"></p>

    <div class="form-actions">
      <button type="submit" class="btn solid grow" id="es-save">保存</button>
      <button type="button" class="btn danger" id="es-delete" hidden>削除</button>
    </div>
  </form>`;

let wrap = null;
let editingId = null;
let armed = false;
let armTimer = null;

export function initEventSheet() {
  wrap = mountSheet(MARKUP);
  $('#es-close').addEventListener('click', () => hideSheet(wrap));
  $('#es-form').addEventListener('submit', onSubmit);
  $('#es-delete').addEventListener('click', onDelete);
  wrap.addEventListener('sheetclose', () => { resetDelete(); editingId = null; });
}

function buildTypes(selected) {
  const row = $('#es-types');
  clear(row);
  sortedTabs().forEach((t) => {
    row.append(el('label', { class: 'seg-opt' },
      el('input', { type: 'radio', name: 'type', id: `es-type-${t.id}`, value: t.id, checked: t.id === selected }),
      el('span', { text: t.name })));
  });
}

function showError(msg) {
  $('#es-error').textContent = msg;
}

function resetDelete() {
  armed = false;
  clearTimeout(armTimer);
  const b = $('#es-delete');
  b.textContent = '削除';
  b.classList.remove('armed');
}

/** ev があれば編集、なければ新規。preset は「続けて追加」で引き継ぐ項目。 */
export function openEventSheet(ev, preset) {
  if (!state.tabs.length) {
    toast('先にタブを作ってください');
    openTabManager();
    return;
  }
  const isEdit = !!(ev && ev.id);
  const d = ev || preset || {};
  editingId = isEdit ? ev.id : null;
  resetDelete();

  $('#es-heading').textContent = isEdit ? '予定を編集' : '予定を追加';
  const selected = d.type && tabById(d.type)
    ? d.type
    : isEdit ? '' : (tabById(state.ui.filter) ? state.ui.filter : sortedTabs()[0].id);
  buildTypes(selected);
  $('#es-title').value = d.title || '';
  $('#es-date').value = d.date || '';
  $('#es-end').value = d.end || '';
  $('#es-place').value = d.place || '';
  $('#es-source').value = d.source || '';
  $('#es-url').value = d.url || '';
  $('#es-note').value = d.note || '';
  $('#es-continue').checked = false;
  $('#es-continue-row').hidden = isEdit;
  $('#es-delete').hidden = !isEdit;
  $('#es-auto-note').hidden = !(isEdit && ev.feedId);
  showError('');
  showSheet(wrap);
  setTimeout(() => $('#es-title').focus(), 30);
}

function readForm() {
  const chosen = document.querySelector('input[name="type"]:checked');
  return {
    type: chosen ? chosen.value : '',
    title: $('#es-title').value.trim(),
    date: $('#es-date').value,
    end: $('#es-end').value,
    place: $('#es-place').value.trim(),
    source: $('#es-source').value.trim(),
    url: $('#es-url').value.trim(),
    note: $('#es-note').value.trim()
  };
}

async function onSubmit(ev) {
  ev.preventDefault();
  const form = readForm();
  const problem = validateEventForm(form);
  if (problem) {
    showError(problem);
    return;
  }
  const again = !editingId && $('#es-continue').checked;
  const btn = $('#es-save');
  btn.disabled = true;
  showError('');
  const ok = await saveEvent(form, editingId);
  btn.disabled = false;
  if (!ok) {
    showError('保存できませんでした。もう一度試してください。');
    return;
  }
  if (again) {
    openEventSheet(null, { type: form.type, source: form.source, url: form.url });
    $('#es-continue').checked = true;
    toast('追加しました。続けて入力できます');
  } else {
    hideSheet(wrap);
    toast(form.date ? '保存しました' : '日程未定として保存しました');
  }
}

// 削除は2回押す必要がある（誤操作の防止）
async function onDelete() {
  if (!editingId) return;
  const btn = $('#es-delete');
  if (!armed) {
    armed = true;
    btn.textContent = '本当に削除する';
    btn.classList.add('armed');
    armTimer = setTimeout(resetDelete, 4000);
    return;
  }
  await deleteEvent(editingId); // 自動取得の予定は、消しても自動では戻らない
  hideSheet(wrap);
  toast('削除しました');
}
