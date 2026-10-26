// 一覧の上で左右にスワイプしたら、タブを切り替える（左へ＝次のタブ、右へ＝前のタブ）。
// 指に合わせて一覧が動き、十分に動かして離すと切り替わる。足りなければ元の位置へ戻る。
import { state } from '../state.js';
import { $ } from '../util/dom.js';
import { sortedTabs } from '../data/tabs.js';
import { setFilter } from './tabs-bar.js';
import { EASE } from './motion.js';

const EDGE = 24;     // 左端のこの幅から始めたスワイプは、引き出し用なので対象外
const LOCK = 10;     // 横の動きと決める最小の距離（px）
const GIVE = 0.2;    // 端のタブで、それ以上進めないときに指についてくる割合
const MS = 180;

export function initTabSwipe() {
  const area = $('#app-list');
  let x0 = 0, y0 = 0, t0 = 0, mode = 'idle'; // idle / wait / h / v / anim

  const ids = () => ['all'].concat(sortedTabs().map((x) => x.id));
  const neighbor = (dx) => {
    const list = ids();
    const j = list.indexOf(state.ui.filter) + (dx < 0 ? 1 : -1);
    return j >= 0 && j < list.length ? list[j] : null;
  };
  const clearStyle = () => {
    area.style.transform = ''; area.style.opacity = ''; area.style.transition = ''; area.style.overflowY = '';
  };

  area.addEventListener('touchstart', (ev) => {
    const t = ev.touches[0];
    if (mode === 'anim' || ev.touches.length !== 1 || t.clientX <= EDGE) { mode = mode === 'anim' ? mode : 'idle'; return; }
    x0 = t.clientX; y0 = t.clientY; t0 = Date.now(); mode = 'wait';
  }, { passive: true });

  area.addEventListener('touchmove', (ev) => {
    if (mode !== 'wait' && mode !== 'h') return;
    const t = ev.touches[0];
    const dx = t.clientX - x0, dy = t.clientY - y0;
    if (mode === 'wait') {
      if (Math.abs(dx) < LOCK && Math.abs(dy) < LOCK) return;
      if (Math.abs(dx) > Math.abs(dy) * 1.4) { mode = 'h'; area.style.overflowY = 'hidden'; } else { mode = 'v'; return; }
    }
    const move = neighbor(dx) ? dx : dx * GIVE;
    area.style.transition = 'none';
    area.style.transform = `translateX(${move}px)`;
    area.style.opacity = String(1 - Math.min(0.4, Math.abs(move) / 500));
  }, { passive: true });

  const finish = (ev) => {
    if (mode !== 'h') { if (mode !== 'anim') mode = 'idle'; return; }
    const t = ev.changedTouches[0];
    const dx = t.clientX - x0;
    const W = area.clientWidth || window.innerWidth;
    const fast = Math.abs(dx) > 40 && Math.abs(dx) / Math.max(1, Date.now() - t0) > 0.5;
    const to = neighbor(dx);
    if (!to || !(Math.abs(dx) > W * 0.25 || fast)) { // 元へ戻る
      area.style.transition = `transform ${MS}ms ${EASE}, opacity ${MS}ms ${EASE}`;
      area.style.transform = ''; area.style.opacity = '';
      mode = 'anim';
      setTimeout(() => { clearStyle(); mode = 'idle'; }, MS + 20);
      return;
    }
    // 切り替える：今の一覧を画面の外へ送り、新しい一覧を反対側から入れる
    const dir = dx < 0 ? 1 : -1;
    mode = 'anim';
    area.style.transition = `transform ${MS}ms ${EASE}, opacity ${MS}ms ${EASE}`;
    area.style.transform = `translateX(${-dir * W * 0.6}px)`;
    area.style.opacity = '0';
    setTimeout(() => {
      clearStyle();
      setFilter(to, { animate: false });
      area.scrollTop = 0;
      if (area.animate) {
        const a = area.animate(
          [{ transform: `translateX(${dir * W * 0.4}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }],
          { duration: MS + 40, easing: EASE });
        a.onfinish = () => { mode = 'idle'; };
        a.oncancel = () => { mode = 'idle'; };
      } else mode = 'idle';
    }, MS);
  };
  area.addEventListener('touchend', finish, { passive: true });
  area.addEventListener('touchcancel', () => {
    if (mode === 'h') { clearStyle(); mode = 'idle'; } else if (mode !== 'anim') mode = 'idle';
  }, { passive: true });
}
