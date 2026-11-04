// 一覧の右下（「＋」の上）の「先頭へ戻る」ボタン：常に出す（設定の画面では隠す）。押すと、指ではじいたような素早い動きで、一覧のいちばん上へ戻る。
import { state } from '../state.js';
import { $ } from '../util/dom.js';

const MS = 320; // 戻るのにかかる時間。距離によらず一定（速くはじく感じ）

function sync() {
  const b = $('#btn-top');
  if (b) b.hidden = state.ui.screen === 'settings';
}

/** 先頭へ、はじくように素早く戻る（最初が速く、終わりへ向けてゆるやかに止まる）。 */
function flick(list) {
  const from = list.scrollTop;
  if (from <= 0) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) { list.scrollTop = 0; return; }
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / MS);
    list.scrollTop = from * Math.pow(1 - k, 3); // 先に速く進み、後半でゆるむ
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function initToTop() {
  const list = $('#app-list');
  const b = document.createElement('button');
  b.type = 'button';
  b.id = 'btn-top';
  b.className = 'to-top';
  b.setAttribute('aria-label', '一覧の先頭へ戻る');
  b.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M5 15l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  b.addEventListener('click', () => flick(list));
  document.body.append(b);
  // 「＋」と同じく、スクロール中は薄くする
  let t = 0;
  list.addEventListener('scroll', () => {
    b.classList.add('dim');
    clearTimeout(t);
    t = setTimeout(() => b.classList.remove('dim'), 600);
  }, { passive: true });
  sync();
}

export function renderToTop() { sync(); }
