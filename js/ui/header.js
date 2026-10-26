// 画面上部：タイトル、「i」（更新の履歴）、⚙️（設定）だけ。タブは tabs-bar.js が作る。
import { state } from '../state.js';
import { $ } from '../util/dom.js';
import { WEEKDAYS } from '../config.js';
import { openUpdates } from './updates-sheet.js';
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
          <button type="button" class="btn icon-btn" id="btn-settings" aria-label="設定" aria-pressed="false">⚙️</button>
        </div>
      </div>
      <div id="tabs-mount"></div>
    </div>`;

  const now = new Date();
  $('#today').textContent = `今日 ${now.getMonth() + 1}/${now.getDate()}(${WEEKDAYS[now.getDay()]})`;

  $('#btn-info').addEventListener('click', openUpdates);
  $('#btn-settings').addEventListener('click', toggleSettings);
}

export function renderHeader() {
  const past = state.ui.view === 'past';
  const settings = state.ui.screen === 'settings';
  const h = $('#h-title');
  h.textContent = settings ? '設定' : 'Event list';
  h.classList.toggle('brand', !settings);
  $('#tabs-mount').hidden = settings;
  const g = $('#btn-settings');
  g.setAttribute('aria-pressed', String(settings));
  g.classList.toggle('on', settings);
  const d = new Date();
  $('#today').textContent = `今日 ${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]})${past ? ' ・ 過去' : ''}`;
}
