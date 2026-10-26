// タブを追加する画面。名前と、自動で取り込む内容（任意）だけを入れる。
import { $ } from '../util/dom.js';
import { mountSheet, showSheet, hideSheet } from './sheet.js';
import { toast } from './toast.js';
import { addTab } from '../data/tabs.js';
import { WATCH_MAX } from '../config.js';

const MARKUP = `
  <form class="sheet" id="ta-sheet" role="dialog" aria-modal="true" aria-labelledby="ta-heading" novalidate>
    <div class="sheet-head">
      <h2 id="ta-heading">タブを追加</h2>
      <button type="button" class="ghost" id="ta-close">閉じる</button>
    </div>
    <div class="field">
      <label for="ta-name">タブの名前</label>
      <input class="input" id="ta-name" type="text" maxlength="20" autocomplete="off" placeholder="例）グルメ、旅行">
    </div>
    <div class="field">
      <label for="ta-watch">自動で取り込む内容（任意）</label>
      <textarea class="input" id="ta-watch" rows="3" maxlength="${WATCH_MAX}" placeholder="例）SUPER GTの2027年の公式日程"></textarea>
    </div>
    <p class="err" id="ta-error" role="alert"></p>
    <div class="form-actions">
      <button type="submit" class="btn solid grow">追加</button>
    </div>
  </form>`;

let wrap = null;

export function initTabAdd() {
  wrap = mountSheet(MARKUP);
  $('#ta-close').addEventListener('click', () => hideSheet(wrap));
  $('#ta-sheet').addEventListener('submit', onSubmit);
}

export function openTabAdd() {
  $('#ta-name').value = '';
  $('#ta-watch').value = '';
  $('#ta-error').textContent = '';
  showSheet(wrap);
  setTimeout(() => $('#ta-name').focus(), 30);
}

async function onSubmit(ev) {
  ev.preventDefault();
  const r = await addTab($('#ta-name').value, $('#ta-watch').value);
  if (!r.ok) { $('#ta-error').textContent = r.error; return; }
  hideSheet(wrap);
  toast('タブを追加しました');
}
