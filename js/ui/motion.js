// 動きの部品。画面の切り替えを、ふわっと自然にする。
// 「視覚効果を減らす」の設定でも、なめらかさは残す（動きは短く、軽い処理だけにして、電池を使いすぎない）。
export const reduced = () => false;

export const EASE = 'cubic-bezier(.2, .7, .2, 1)';

/** 一覧を、横（dir=±1）または、その場（dir=0）でふわっと入れ替える。 */
export function slideList(dir) {
  if (reduced()) return;
  const root = document.getElementById('app-list');
  if (!root || !root.animate) return;
  root.animate(
    [{ opacity: 0, transform: dir ? `translateX(${dir * 28}px)` : 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
    { duration: 240, easing: EASE }
  );
}
