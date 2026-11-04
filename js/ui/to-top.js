// 一覧の右下（「＋」の上）の「先頭へ戻る」ボタン：下のほうまで進んだときだけ出す。押すと、一覧のいちばん上へ戻る。
import { state } from '../state.js';
import { $ } from '../util/dom.js';

const SHOW_AFTER = 400; // これだけ下へ進んだら出す（px）

function sync() {
  const b = $('#btn-top');
  if (!b) return;
  const on = state.ui.screen !== 'settings' && $('#app-list').scrollTop > SHOW_AFTER;
  b.classList.toggle('show', on);
  b.tabIndex = on ? 0 : -1;
  b.setAttribute('aria-hidden', on ? 'false' : 'true');
}

export function initToTop() {
  const list = $('#app-list');
  const b = document.createElement('button');
  b.type = 'button';
  b.id = 'btn-top';
  b.className = 'to-top';
  b.setAttribute('aria-label', '一覧の先頭へ戻る');
  b.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M5 15l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  b.addEventListener('click', () => {
    const calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    list.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
  });
  document.body.append(b);
  // 「＋」と同じく、スクロール中は薄くする
  let t = 0;
  list.addEventListener('scroll', () => {
    sync();
    b.classList.add('dim');
    clearTimeout(t);
    t = setTimeout(() => b.classList.remove('dim'), 600);
  }, { passive: true });
  sync();
}

export function renderToTop() { sync(); }
