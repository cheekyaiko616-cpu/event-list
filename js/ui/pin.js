// 開いた予定をヘッダーの下に固定して見せる仕組み（固定の描画・外側タップで閉じる・スワイプで解除）。
import { state } from '../state.js';
import { $, el, clear } from '../util/dom.js';
import { reduced, EASE } from './motion.js';
import { closeDetail, isClosing } from './pin-close.js';
import { rowEl } from './event-row.js';

let pinId = null;      // いま固定している予定

/** 開いている詳細の外をタップしたら閉じる。起動後に1回だけ呼ぶ。 */
export function initOutsideClose() {
  document.addEventListener('click', (ev) => {
    const id = state.ui.openId;
    if (!id) return;
    const t = ev.target;
    if (!(t instanceof Element)) return;
    // 詳細の中の操作と、予定の行そのもの（行は自分で開閉する）は除く。行の横の余白は「外」として閉じる。
    if (t.closest(`[data-id="${id}"] .detail`) || t.closest(`[data-id="${id}"] .row-btn`) || t.closest('.now') || t.closest('[role="dialog"]') || t.closest('.toast')) return;
    closeDetail();
  });
}

/** 開いている予定を、ヘッダーの下に固定して表示する。閉じたら消える。 */
export function renderPin() {
  const pin = $('#app-pin');
  if (!pin) return;
  clear(pin);
  const e = state.ui.openId ? state.events.find((x) => x.id === state.ui.openId) : null;
  if (!e || !state.ready) { pinId = null; return; }
  pin.append(el('ul', { class: 'wrap rows' }, rowEl(e, state.ui.view === 'past', true)));
  if (pinId !== e.id) { // 出現：高さを広げながら、ふわっと出す
    pinId = e.id;
    if (!reduced() && pin.animate) {
      const h = pin.getBoundingClientRect().height;
      pin.animate([{ height: '0px', opacity: 0 }, { height: `${h}px`, opacity: 1 }], { duration: 240, easing: EASE });
    }
  }
}

/** 固定表示の上で、上か下にスワイプしたら、固定を解除する。指に合わせて動き、離すとなめらかに消える／戻る。 */
export function initPinSwipe() {
  const pin = $('#app-pin');
  let x0 = 0, y0 = 0, on = false, drag = false;
  const body = () => pin.firstElementChild;
  const scrollable = () => pin.scrollHeight > pin.clientHeight + 2; // 中を読むためのスクロールは、解除にしない
  pin.addEventListener('touchstart', (ev) => {
    const t = ev.touches[0];
    x0 = t.clientX; y0 = t.clientY; on = ev.touches.length === 1; drag = false;
  }, { passive: true });
  pin.addEventListener('touchmove', (ev) => {
    if (!on || isClosing() || scrollable() || !body()) return;
    const t = ev.touches[0];
    const dx = t.clientX - x0, dy = t.clientY - y0;
    if (!drag && !(Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx) * 1.5)) return;
    drag = true;
    body().style.transform = `translateY(${dy * 0.6}px)`;
    body().style.opacity = String(Math.max(0.25, 1 - Math.abs(dy) / 220));
  }, { passive: true });
  pin.addEventListener('touchend', (ev) => {
    if (!on) return;
    on = false;
    const b = body();
    if (!b || !drag) return;
    drag = false;
    const t = ev.changedTouches[0];
    const dy = t.clientY - y0;
    if (Math.abs(dy) >= 50) { closeDetail(); return; }
    // 足りなければ、元の位置になめらかに戻す
    b.style.transition = `transform .2s ${EASE}, opacity .2s ${EASE}`;
    b.style.transform = ''; b.style.opacity = '';
    setTimeout(() => { if (b) b.style.transition = ''; }, 220);
  }, { passive: true });
}

/** 一覧の中身（root）と、固定する開催中・次の予定（now）を作る。 */
