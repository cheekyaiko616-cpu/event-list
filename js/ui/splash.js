// 起動画面。ゲームのロード画面のように、乗りものが輪の上を一定の速さで回り続ける。
// 乗りもの（飛行機・スポーツカー・新幹線）は、最初の1コマから出すため js/boot-splash.js が足す。ここは、ゲージと画面の切り替えだけ。
// 電池のため：動くのは起動中の約2秒だけ。終わったら画面の部品ごと取り除く。
// 枠だけの間のゲージ（CSS）の長さは、index.html の animation-duration を SHOW_MS と同じにそろえる。
const SHOW_MS = 2000;
export function initSplash() {
  const root = document.getElementById('splash');
  if (!root) return;
  // 輪・題名・ゲージ・「Loading…」・乗りものは、最初から置いてあり、ゲージは最初の1コマから進んでいる。
  // ここではゲージを引き継ぐだけ。ゲージは作り直さない（作り直すと、進みがやり直しになり、画面の切り替わりとずれる）。
  root.hidden = false;
  let done = false;
  const close = () => {
    if (done) return;
    done = true;
    root.classList.add('out');
    setTimeout(() => root.remove(), 320);
  };

  // ゲージと画面の切り替えは、同じ1つの時計で動かす。見えているゲージの量が、そのまま切り替えの条件になる。
  // 時計は「画面に最初に映った瞬間（描画の通知）」から数える。スクリプトが動き始めた時刻や、描画の準備ができた時刻から数えると、
  // 起動が遅くて真っ黒な時間が長い端末で、映った瞬間に満タンになり、すぐ切り替わってしまうため。
  const bar = root.querySelector('.sp-bar i');
  let start = null; // 最初に映った時刻（まだ映っていなければ null）
  let noPaintInfo = false; // 描画の通知が使えない端末
  const setStart = (t) => {
    if (start !== null) return;
    start = Number.isFinite(t) && t >= 0 && t <= performance.now() ? t : performance.now(); // おかしい値なら、今から数える
  };
  try {
    const seen = performance.getEntriesByName('first-contentful-paint')[0];
    if (seen) setStart(seen.startTime); // スクリプトが動く前に、すでに映っていた
    else if (typeof PerformanceObserver === 'function') {
      const po = new PerformanceObserver((list) => {
        const e = list.getEntriesByName('first-contentful-paint')[0];
        if (e) { setStart(e.startTime); po.disconnect(); }
      });
      po.observe({ type: 'paint', buffered: true });
    } else noPaintInfo = true;
  } catch (e) { noPaintInfo = true; }
  setTimeout(() => setStart(performance.now()), 6000); // 保険：描画の通知が来なくても、6秒後には数え始める
  const level = (ts) => (start === null ? 0 : Math.min(1, Math.max(0, (ts - start) / SHOW_MS)));
  const draw = (p) => { if (bar) bar.style.transform = `scaleX(${p.toFixed(3)})`; };
  if (bar) { bar.style.animation = 'none'; draw(level(performance.now())); } // 枠だけの間のCSSの動きから、ここで引き継ぐ
  const tick = (ts) => {
    if (done) return;
    if (start === null && noPaintInfo) setStart(ts); // 通知が使えないときは、描画の最初の1コマから
    const p = level(ts);
    draw(p);
    if (p >= 1) { close(); return; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
