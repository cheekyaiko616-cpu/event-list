// 画面の左側面から開く引き出し：設定・過去のイベント・イベント更新履歴。
// 左端の持ち手を押すか、左端から右へスワイプすると開く。項目のボタン以外（余白やすきま）をタップするか、左へスワイプすると閉じる。
import { state } from '../state.js';
import { $, el, clear } from '../util/dom.js';
import { openUpdates } from './updates-sheet.js';
import { toggleSettings } from './settings-page.js';
import { toggleView } from './view-switch.js';

const EDGE = 24; // 左端のこの幅（px）から始めたスワイプで開く
let wrap = null;
let panel = null;

export const isDrawerOpen = () => !!wrap && !wrap.hidden;

export function initDrawer() {
  const handle = el('button', { class: 'drawer-handle', type: 'button', id: 'drawer-handle', 'aria-label': 'メニューを開く', onclick: openDrawer });
  panel = el('nav', { class: 'drawer', id: 'drawer', 'aria-label': 'メニュー' });
  wrap = el('div', { class: 'drawer-scrim', id: 'drawer-scrim', hidden: true }, panel);
  const blank = (e) => !(e.target instanceof Element && e.target.closest('.drawer-item')); // 項目のボタン以外は、どこを押しても閉じる
  wrap.addEventListener('click', (e) => { if (blank(e)) closeDrawer(); });
  // iPhoneは、何も押せない余白では click が出ないことがあるため、タップ（ほぼ動かさず離した）も閉じる合図にする
  let tx = 0, ty = 0;
  wrap.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  wrap.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0];
    if (blank(e) && Math.abs(t.clientX - tx) < 10 && Math.abs(t.clientY - ty) < 10) closeDrawer();
  }, { passive: true });
  document.body.append(handle, wrap);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isDrawerOpen()) closeDrawer(); });
  initSwipe(handle);
}

export function openDrawer() {
  if (state.ui.screen === 'settings') return; // 設定の画面では、横タブは使わない
  renderDrawer();
  wrap.hidden = false;
  requestAnimationFrame(() => wrap.classList.add('open'));
  document.documentElement.classList.add('lock');
}

export function closeDrawer() {
  if (!isDrawerOpen()) return;
  wrap.classList.remove('open');
  setTimeout(() => { if (!wrap.classList.contains('open')) wrap.hidden = true; }, 200);
  document.documentElement.classList.remove('lock');
}

function item(label, id, onclick, on) {
  return el('button', {
    class: 'drawer-item' + (on ? ' on' : ''), type: 'button', id, text: label,
    onclick: () => { closeDrawer(); onclick(); }
  });
}

/** 設定の画面では、持ち手を隠して横タブを無効にする。 */
export function renderDrawerHandle() {
  const h = $('#drawer-handle');
  if (!h) return;
  const off = state.ui.screen === 'settings';
  h.hidden = off;
  if (off) closeDrawer();
}

/** 開くたびに、今の状態に合わせて中身を作り直す。 */
export function renderDrawer() {
  if (!panel) return;
  clear(panel);
  const settings = state.ui.screen === 'settings';
  const past = state.ui.view === 'past' && !settings;
  panel.append(
    item('設定', 'dr-settings', toggleSettings, settings),
    item('過去のイベント', 'dr-past', toggleView, past),
    item('イベント更新履歴', 'dr-info', openUpdates, false));
}

/** 左端から右へのスワイプで開く／開いているとき左へのスワイプで閉じる。 */
function initSwipe(handle) {
  let x0 = 0, y0 = 0, on = false, edge = false;
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) { on = false; return; }
    const t = e.touches[0];
    x0 = t.clientX; y0 = t.clientY; on = true;
    edge = state.ui.screen !== 'settings' && !isDrawerOpen() && t.clientX <= EDGE && !document.querySelector('.scrim:not([hidden])');
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (!on) return;
    on = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - x0, dy = t.clientY - y0;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (edge && dx > 0) openDrawer();
    else if (isDrawerOpen() && dx < 0) closeDrawer();
  }, { passive: true });
  void handle;
}
