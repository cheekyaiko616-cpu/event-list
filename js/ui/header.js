// 画面上部：タイトルと今日の日付だけ。設定・過去・イベント更新履歴は、右の引き出し（drawer.js）。タブは tabs-bar.js が作る。
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
}

export function renderHeader() {
  const past = state.ui.view === 'past';
  const settings = state.ui.screen === 'settings';
  const h = $('#h-title');
  setText(h, settings ? '設定' : 'Event list');
  h.classList.toggle('brand', !settings);
  $('#tabs-mount').hidden = settings;
  const d = new Date();
  setText($('#today'), `今日 ${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]})${past ? ' ・ 過去' : ''}`);
}

/** 文字が変わったときだけ書き換える（同じ文字で、描き直しを起こさない）。 */
function setText(node, text) {
  if (node.textContent !== text) node.textContent = text;
}
