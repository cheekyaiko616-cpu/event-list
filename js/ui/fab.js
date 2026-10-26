// 画面右下の「＋」ボタン：予定を追加する。設定の画面では隠す。
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
  document.body.append(b);
}

export function renderFab() {
  const b = $('#btn-add');
  if (b) b.hidden = state.ui.screen === 'settings';
}
