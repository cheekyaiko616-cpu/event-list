// 「これから」と「過去」の切り替え。一覧の下（過去へ）と、過去の一覧の上（これからへ）に置く。
import { state, notify } from '../state.js';
import { $, el } from '../util/dom.js';
import { slideList } from './motion.js';

function toggle() {
  state.ui.view = state.ui.view === 'past' ? 'upcoming' : 'past';
  state.ui.openId = null;
  notify();
  $('#app-list').scrollTo(0, 0);
  slideList(0);
}

export function viewSwitchEl(past) {
  return el('div', { class: 'wrap view-switch' },
    el('button', { class: 'btn', type: 'button', id: 'btn-view', text: past ? '← これからの予定' : '過去の予定を見る', onclick: toggle }));
}
