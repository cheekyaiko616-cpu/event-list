// 過去の一覧の一番上に出す「これからの予定へ戻る」ボタン。過去を開くのは右の引き出し（drawer.js）。
import { state, notify } from '../state.js';
import { $, el } from '../util/dom.js';
import { slideList } from './motion.js';

/** 「これから」と「過去」を入れ替える（右の引き出しと、過去の一覧の戻るボタンで共通）。 */
export function toggleView() {
  state.ui.screen = 'list';
  state.ui.view = state.ui.view === 'past' ? 'upcoming' : 'past';
  state.ui.openId = null;
  notify();
  $('#app-list').scrollTo(0, 0);
  slideList(0);
}

export function viewSwitchEl() {
  return el('div', { class: 'wrap view-switch' },
    el('button', { class: 'btn', type: 'button', id: 'btn-view', text: '← これからの予定', onclick: toggleView }));
}
