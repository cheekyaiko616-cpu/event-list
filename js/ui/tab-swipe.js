// 一覧の上で左右にスワイプしたら、タブを切り替える（左へ＝次のタブ、右へ＝前のタブ）。
import { state } from '../state.js';
import { $ } from '../util/dom.js';
import { sortedTabs } from '../data/tabs.js';
import { setFilter } from './tabs-bar.js';

export function initTabSwipe() {
  const area = $('#app-list');
  let x0 = 0, y0 = 0, on = false;
  area.addEventListener('touchstart', (ev) => {
    const t = ev.touches[0];
    x0 = t.clientX; y0 = t.clientY; on = ev.touches.length === 1 && t.clientX > 24; // 左端は引き出し用
  }, { passive: true });
  area.addEventListener('touchend', (ev) => {
    if (!on) return;
    on = false;
    const t = ev.changedTouches[0];
    const dx = t.clientX - x0, dy = t.clientY - y0;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.6) return; // 縦のスクロールは対象外
    const ids = ['all'].concat(sortedTabs().map((x) => x.id));
    const i = ids.indexOf(state.ui.filter);
    const j = i + (dx < 0 ? 1 : -1);
    if (i < 0 || j < 0 || j >= ids.length) return;
    setFilter(ids[j]);
    area.scrollTop = 0;
  }, { passive: true });
}
