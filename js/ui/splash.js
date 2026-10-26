// 起動画面。ゲームのロード画面のように、乗りものが輪の上を一定の速さで回り続ける。
// 種類は3つ（飛行機・スポーツカー・新幹線）。前回と同じものが続かないように選ぶ。
// 電池のため：動くのは起動中の約5秒だけ。終わったら画面の部品ごと取り除く。
// ゲージの長さは index.html の animation-duration と同じ値（SHOW_MS）にそろえる。
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
  // 輪・題名・ゲージ・「Loading…」は、index.html に最初から置いてあり、ゲージは最初の1コマから進んでいる。
  // ここでは乗りものを足すだけ。ゲージは作り直さない（作り直すと、進みがやり直しになり、画面の切り替わりとずれる）。
  const arm = root.querySelector('.sp-arm');
  if (arm) arm.innerHTML = `<div class="sp-veh" style="width:${v.w}px;height:${v.h}px;transform:translate(-50%,${v.ground ? '-100%' : '-50%'})">${v.svg}</div>`;
  root.hidden = false;
  let done = false;
  const close = () => {
    if (done) return;
    done = true;
    root.classList.add('out');
    setTimeout(() => root.remove(), 320);
  };
  // 画面の切り替えは、ゲージが満タンになった瞬間にそろえる（すでに満タンなら、すぐ切り替える）。
  const bar = root.querySelector('.sp-bar i');
  const anim = bar && bar.getAnimations ? bar.getAnimations()[0] : null;
  if (anim) anim.finished.then(close, close);
  else setTimeout(close, SHOW_MS); // ゲージの動きを調べられないときの保険
  setTimeout(close, SHOW_MS + 1500); // もっと保険：どんな場合でも、少し遅れて必ず切り替える
}
