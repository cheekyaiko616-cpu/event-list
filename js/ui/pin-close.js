// 固定表示（開いた予定）を閉じる処理だけを置く。どの画面からも呼べるよう、独立させてある。
import { state, notify } from '../state.js';
import { $ } from '../util/dom.js';
import { reduced, EASE } from './motion.js';

let closing = false; // 閉じる動きの途中

export const isClosing = () => closing;

/** 固定を解除する。高さを縮めながら、ふわっと消す。 */
export function closeDetail() {
  if (!state.ui.openId || closing) return;
  const pin = $('#app-pin');
  const finish = () => { closing = false; state.ui.openId = null; notify(); };
  if (!pin || reduced() || !pin.animate || !pin.firstElementChild) { finish(); return; }
  closing = true;
  const h = pin.getBoundingClientRect().height;
  const anim = pin.animate([{ height: `${h}px`, opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 200, easing: EASE, fill: 'forwards' });
  anim.onfinish = () => { anim.cancel(); finish(); };
}
