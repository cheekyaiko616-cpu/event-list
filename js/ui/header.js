// 画面上部：タイトルと今日の日付だけ。設定・過去・インフォメーションは、右の引き出し（drawer.js）。タブは tabs-bar.js が作る。
import { state } from '../state.js';
import { $ } from '../util/dom.js';
import { WEEKDAYS } from '../config.js';

export function initHeader() {
  $('#app-header').innerHTML = `
    <div class="wrap">
      <div class="bar">
        <div>
          <div class="brand-row">
            <h1 id="h-title"></h1>
          </div>
          <span class="today" id="today"></span>
        </div>
      </div>
      <div id="tabs-mount"></div>
    </div>`;

  const now = new Date();
  $('#today').textContent = `今日 ${now.getMonth() + 1}/${now.getDate()}(${WEEKDAYS[now.getDay()]})`;

}

export function renderHeader() {
  const past = state.ui.view === 'past';
  const settings = state.ui.screen === 'settings';
  const h = $('#h-title');
  h.textContent = settings ? '設定' : 'Event list';
  h.classList.toggle('brand', !settings);
  $('#tabs-mount').hidden = settings;
  const d = new Date();
  $('#today').textContent = `今日 ${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]})${past ? ' ・ 過去' : ''}`;
}
