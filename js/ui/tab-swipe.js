// 一覧の上で左右にスワイプしたら、タブを切り替える（左へ＝次のタブ、右へ＝前のタブ）。
// 指に合わせて今の画面が動き、動いた先に、切り替わる先のタブの画面が続いて見える。
// 十分に動かして離すと切り替わる。足りなければ元の位置へ戻る。
import { state } from '../state.js';
import { $ } from '../util/dom.js';
import { visibleTabs } from '../data/settings.js';
import { setFilter } from './tabs-bar.js';
import { buildNeighborView } from './event-list.js';
import { EASE } from './motion.js';

const EDGE = 24;     // 左端のこの幅から始めたスワイプは、引き出し用なので対象外
const LOCK = 10;     // 横の動きと決める最小の距離（px）
const GIVE = 0.2;    // 端のタブで、それ以上進めないときに指についてくる割合
const MS = 200;

export function initTabSwipe() {
  const area = $('#app-list');
  const now = $('#app-now');
  const pin = $('#app-pin');
  let x0 = 0, y0 = 0, t0 = 0, mode = 'idle'; // idle / wait / h / v / anim
  let ghost = null;   // 隣のタブの仮の画面
  let ghostDir = 0;   // 仮の画面を作った向き（+1 次のタブ側、-1 前のタブ側）

  const ids = () => ['all'].concat(visibleTabs().map((x) => x.id));
  const neighbor = (dir) => {
    const list = ids();
    const j = list.indexOf(state.ui.filter) + dir;
    return j >= 0 && j < list.length ? list[j] : null;
  };
  // 今の画面として一緒に動かす部分（固定の帯と一覧）
  const movers = () => [now, area];
  const setX = (x, ms) => movers().forEach((m) => {
    m.style.transition = ms ? `transform ${ms}ms ${EASE}` : 'none';
    m.style.transform = x ? `translateX(${x}px)` : '';
  });
  const clearStyle = () => movers().forEach((m) => { m.style.transform = ''; m.style.transition = ''; });

  function dropGhost() {
    if (ghost) ghost.remove();
    ghost = null; ghostDir = 0;
  }

  function makeGhost(dir) {
    dropGhost();
    const id = neighbor(dir);
    if (!id) return;
    const view = buildNeighborView(id);
    const top = [now, pin, area].map((e) => e.getBoundingClientRect()).find((r) => r.height > 0).top;
    const bottom = area.getBoundingClientRect().bottom;
    ghost = document.createElement('div');
    ghost.className = 'swipe-ghost';
    ghost.style.cssText = `top:${top}px;height:${bottom - top}px`;
    view.list.className = 'swipe-ghost-list';
    ghost.append(view.now, view.list);
    document.body.append(ghost);
    ghostDir = dir;
  }

  const W = () => area.clientWidth || window.innerWidth;
  const setGhostX = (x, ms) => {
    if (!ghost) return;
    ghost.style.transition = ms ? `transform ${ms}ms ${EASE}` : 'none';
    ghost.style.transform = `translateX(${x}px)`;
  };

  area.addEventListener('touchstart', (ev) => {
    if (mode === 'anim') return;
    const t = ev.touches[0];
    if (ev.touches.length !== 1 || t.clientX <= EDGE) { mode = 'idle'; return; }
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
    const dir = dx < 0 ? 1 : -1;
    if (dx !== 0 && ghostDir !== dir) makeGhost(dir); // 向きが変わったら、その向きの隣を用意する
    const move = ghost ? dx : dx * GIVE;
    setX(move);
    if (ghost) setGhostX(move + dir * W());
  }, { passive: true });

  const settle = () => { clearStyle(); area.style.overflowY = ''; dropGhost(); mode = 'idle'; };

  const finish = (ev) => {
    if (mode !== 'h') { if (mode !== 'anim') mode = 'idle'; return; }
    const t = ev.changedTouches[0];
    const dx = t.clientX - x0;
    const w = W();
    const dir = dx < 0 ? 1 : -1;
    const fast = Math.abs(dx) > 40 && Math.abs(dx) / Math.max(1, Date.now() - t0) > 0.5;
    const to = ghost && ghostDir === dir ? neighbor(dir) : null;
    mode = 'anim';
    if (!to || !(Math.abs(dx) > w * 0.25 || fast)) { // 元へ戻る
      setX(0, MS);
      if (ghost) setGhostX(dir * w, MS);
      setTimeout(settle, MS + 20);
      return;
    }
    // 切り替える：今の画面を外へ、隣の画面を所定の位置へ。終わったら本物の画面に入れ替える
    setX(-dir * w, MS);
    setGhostX(0, MS);
    setTimeout(() => {
      clearStyle();
      setFilter(to, { animate: false });
      area.scrollTop = 0;
      area.style.overflowY = '';
      dropGhost();
      mode = 'idle';
    }, MS + 10);
  };
  area.addEventListener('touchend', finish, { passive: true });
  area.addEventListener('touchcancel', () => { if (mode === 'h') settle(); else if (mode !== 'anim') mode = 'idle'; }, { passive: true });
}
