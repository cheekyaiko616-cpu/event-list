// 画面下部のフッターの右下に置く「＋」ボタン：予定を追加する。設定の画面ではフッターごと隠す。
import { state } from '../state.js';
import { $ } from '../util/dom.js';
import { openEventSheet } from './event-sheet.js';

export function initFab() {
  const b = document.createElement('button');
  b.type = 'button';
  b.id = 'btn-add';
  b.className = 'fab';
  b.setAttribute('aria-label', '予定を追加');
  b.textContent = '＋';
  b.addEventListener('click', () => openEventSheet(null));
  $('#app-foot').append(b);
}

export function renderFab() {
  const f = $('#app-foot');
  if (f) f.hidden = state.ui.screen === 'settings';
}
