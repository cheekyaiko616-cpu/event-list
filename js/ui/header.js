// 画面上部：タイトル、今日の日付、「過去」「＋追加」ボタン。タブは tabs-bar.js が作る。
import { state, notify } from '../state.js';
import { $ } from '../util/dom.js';
import { WEEKDAYS } from '../config.js';
import { openEventSheet } from './event-sheet.js';
import { refreshNow } from '../data/feed.js';
import { toast } from './toast.js';

export function initHeader() {
  $('#app-header').innerHTML = `
    <div class="wrap">
      <div class="bar">
        <div>
          <h1 id="h-title"></h1>
          <span class="today" id="today"></span>
        </div>
        <div class="bar-actions">
          <button type="button" class="btn" id="btn-refresh" aria-label="今すぐ更新">↻ 更新</button>
          <button type="button" class="btn" id="btn-view" aria-pressed="false"></button>
          <button type="button" class="btn solid" id="btn-add">＋ 追加</button>
        </div>
      </div>
      <div id="tabs-mount"></div>
    </div>`;

  const now = new Date();
  $('#today').textContent = `今日 ${now.getMonth() + 1}/${now.getDate()}(${WEEKDAYS[now.getDay()]})`;

  $('#btn-add').addEventListener('click', () => openEventSheet(null));
  $('#btn-refresh').addEventListener('click', async () => {
    const b = $('#btn-refresh');
    b.disabled = true;
    const r = await refreshNow();
    b.disabled = false;
    if (!r.ok) toast('更新できませんでした。通信を確認してください');
    else if (r.added || r.updated) toast(`更新しました（追加${r.added}件・変更${r.updated}件）`);
    else toast('最新です。新しい日程はありません');
  });
  $('#btn-view').addEventListener('click', () => {
    state.ui.view = state.ui.view === 'past' ? 'upcoming' : 'past';
    state.ui.openId = null;
    notify();
    window.scrollTo(0, 0);
  });
}

export function renderHeader() {
  const past = state.ui.view === 'past';
  $('#h-title').textContent = past ? '過去のイベント' : 'イベント帳';
  const b = $('#btn-view');
  b.textContent = past ? '予定へ' : '過去';
  b.setAttribute('aria-pressed', String(past));
}
