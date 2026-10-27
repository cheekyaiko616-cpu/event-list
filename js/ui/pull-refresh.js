// 一覧の一番上で、上から下へ引っ張ると、最新の日程を取りに行く（引いて更新）。
//   ・一番上まで戻っているときだけ反応する。予定の詳細を開いているときや、横のスワイプ（タブ切り替え）とは干渉しない
//   ・引いている間は、一覧が指についてきて、上に「↓ 引いて更新」→「↑ 離すと更新」と出る。離すと更新して、結果をお知らせする
import { state } from '../state.js';
import { $ } from '../util/dom.js';
import { runRefresh } from './refresh-run.js';

const LOCK = 10;      // 縦の動きと決める最小の距離（px）
const TRIGGER = 64;   // この距離まで引いて離すと更新する（指の動き。画面の動きはこの半分）
const MAX = 120;      // 引ける最大の距離
const RESIST = 0.5;   // 指の動きに対する、画面の動く割合
const MIN_BUSY = 700; // 「更新中」を最低限見せる時間（ms）

export function initPullRefresh() {
  const area = $('#app-list');
  const ind = document.createElement('div');
  ind.className = 'pull-ind';
  ind.setAttribute('aria-hidden', 'true');
  ind.innerHTML = '<span class="pull-arrow">↓</span><span class="pull-text"></span>';
  document.body.append(ind);
  const text = ind.querySelector('.pull-text');
  const arrow = ind.querySelector('.pull-arrow');

  let x0 = 0, y0 = 0, mode = 'idle'; // idle / wait / pull / busy
  let top = 0;

  const show = (h) => { ind.style.top = `${top}px`; ind.style.height = `${h}px`; };
  const move = (h, ms) => {
    area.style.transition = ms ? `transform ${ms}ms ease` : 'none';
    area.style.transform = h ? `translateY(${h}px)` : '';
    ind.style.transition = ms ? `height ${ms}ms ease` : 'none';
    show(h);
  };
  const reset = (ms = 180) => {
    move(0, ms);
    setTimeout(() => { area.style.transition = ''; ind.classList.remove('ready', 'busy'); mode = 'idle'; }, ms + 20);
  };

  area.addEventListener('touchstart', (ev) => {
    if (mode !== 'idle') return;
    const t = ev.touches[0];
    if (ev.touches.length !== 1 || area.scrollTop > 0 || state.ui.openId || state.ui.screen !== 'list') return;
    x0 = t.clientX; y0 = t.clientY; mode = 'wait';
    top = area.getBoundingClientRect().top;
  }, { passive: true });

  area.addEventListener('touchmove', (ev) => {
    if (mode !== 'wait' && mode !== 'pull') return;
    const t = ev.touches[0];
    const dx = t.clientX - x0, dy = t.clientY - y0;
    if (mode === 'wait') {
      if (Math.abs(dx) < LOCK && Math.abs(dy) < LOCK) return;
      if (dy > 0 && Math.abs(dy) > Math.abs(dx) * 1.4 && area.scrollTop <= 0) mode = 'pull';
      else { mode = 'idle'; return; } // 横の動き・上向きの動きは対象外
      ind.classList.remove('ready');
    }
    if (ev.cancelable) ev.preventDefault();
    const pull = Math.max(0, Math.min(MAX, dy - LOCK));
    const ready = pull >= TRIGGER;
    text.textContent = ready ? '離すと更新' : '引いて更新';
    ind.classList.toggle('ready', ready);
    move(pull * RESIST, 0);
  }, { passive: false });

  async function finish(ev) {
    if (mode !== 'pull') { if (mode !== 'busy') mode = 'idle'; return; }
    const t = ev.changedTouches && ev.changedTouches[0];
    const pull = t ? Math.max(0, Math.min(MAX, t.clientY - y0 - LOCK)) : 0;
    if (pull < TRIGGER) { reset(); return; }
    mode = 'busy';
    ind.classList.remove('ready'); ind.classList.add('busy');
    arrow.textContent = '↻';
    text.textContent = '更新中…';
    move(TRIGGER * RESIST, 160);
    const started = Date.now();
    try { await runRefresh(); } catch (e) { /* 失敗してもアプリは動く */ }
    const rest = MIN_BUSY - (Date.now() - started);
    if (rest > 0) await new Promise((r) => setTimeout(r, rest));
    arrow.textContent = '↓';
    reset(220);
  }
  area.addEventListener('touchend', finish, { passive: true });
  area.addEventListener('touchcancel', () => { if (mode === 'pull') reset(); else if (mode === 'wait') mode = 'idle'; }, { passive: true });
}
