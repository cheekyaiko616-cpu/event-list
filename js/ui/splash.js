// 起動画面。ゲームのロード画面のように、乗りものが輪の上を一定の速さで回り続ける。
// 種類は3つ（飛行機・スポーツカー・新幹線）。前回と同じものが続かないように選ぶ。
// 電池のため：動くのは起動中の約5秒だけ。終わったら画面の部品ごと取り除く。
const SHOW_MS = 5000;
const KEY = 'event-cho-splash';

import { VEHICLES } from './splash-art.js';

function pick() {
  let last = -1;
  try { last = Number(localStorage.getItem(KEY)); } catch (e) { /* なくても動く */ }
  let i = Math.floor(Math.random() * VEHICLES.length);
  if (i === last) i = (i + 1) % VEHICLES.length;
  try { localStorage.setItem(KEY, String(i)); } catch (e) { /* なくても動く */ }
  return VEHICLES[i];
}

export function initSplash() {
  const root = document.getElementById('splash');
  if (!root) return;
  const v = pick();
  root.innerHTML =
    `<div class="sp-ring"><div class="sp-arm"><div class="sp-veh" style="width:${v.w}px;height:${v.h}px;transform:translate(-50%,${v.ground ? '-100%' : '-50%'})">${v.svg}</div></div></div>` +
    '<div class="sp-title">Event list</div>' +
    `<div class="sp-bar"><i style="animation-duration:${SHOW_MS}ms"></i></div>` +
    '<div class="sp-note">Loading…</div>';
  root.hidden = false;
  let done = false;
  const close = () => {
    if (done) return;
    done = true;
    root.classList.add('out');
    setTimeout(() => root.remove(), 320);
  };
  setTimeout(close, SHOW_MS);
}
