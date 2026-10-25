// 画面上部：タイトル、今日の日付、「過去」「＋追加」ボタン。タブは tabs-bar.js が作る。
import { state, notify } from '../state.js';
import { $ } from '../util/dom.js';
import { WEEKDAYS } from '../config.js';
import { openEventSheet } from './event-sheet.js';
import { refreshNow } from '../data/feed.js';
import { toast } from './toast.js';
import { openUpdates } from './updates-sheet.js';
import { slideList } from './motion.js';
import { toggleSettings } from './settings-page.js';

export function initHeader() {
  $('#app-header').innerHTML = `
    <div class="wrap">
      <div class="bar">
        <div>
          <div class="brand-row">
            <h1 id="h-title"></h1>
            <button type="button" class="info-btn" id="btn-info" aria-label="更新の履歴">i</button>
          </div>
          <span class="today" id="today"></span>
        </div>
        <div class="bar-actions">
          <button type="button" class="btn icon-btn" id="btn-refresh" aria-label="今すぐ更新" title="今すぐ更新">↻</button>
          <button type="button" class="btn" id="btn-view" aria-pressed="false"></button>
          <button type="button" class="btn solid" id="btn-add">＋ 追加</button>
          <button type="button" class="btn icon-btn" id="btn-settings" aria-label="設定" aria-pressed="false">⚙️</button>
        </div>
      </div>
      <div id="tabs-mount"></div>
    </div>`;

  const now = new Date();
  $('#today').textContent = `今日 ${now.getMonth() + 1}/${now.getDate()}(${WEEKDAYS[now.getDay()]})`;

  $('#btn-add').addEventListener('click', () => openEventSheet(null));
  $('#btn-info').addEventListener('click', openUpdates);
  $('#btn-settings').addEventListener('click', toggleSettings);
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
    $('#app-list').scrollTo(0, 0);
    slideList(0);
  });
}

export function renderHeader() {
  const past = state.ui.view === 'past';
  const settings = state.ui.screen === 'settings';
  const h = $('#h-title');
  h.textContent = settings ? '設定' : 'Event list';
  h.classList.toggle('brand', !settings);
  ['#btn-refresh', '#btn-view', '#btn-add'].forEach((id) => { $(id).hidden = settings; });
  $('#tabs-mount').hidden = settings;
  const g = $('#btn-settings');
  g.setAttribute('aria-pressed', String(settings));
  g.classList.toggle('on', settings);
  const d = new Date();
  $('#today').textContent = `今日 ${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]})${past ? ' ・ 過去' : ''}`;
  const b = $('#btn-view');
  b.textContent = past ? '予定へ' : '過去';
  b.setAttribute('aria-pressed', String(past));
}
