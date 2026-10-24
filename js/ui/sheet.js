// 「下から出る画面」の共通の動き（開く・閉じる・外をタップで閉じる・Escで閉じる）。
// 新しい画面を足すときは、mountSheet で枠を作り、中身を自分のファイルで用意する。
import { $ } from '../util/dom.js';

const open = []; // いま開いている画面（後に開いたものが末尾）

/** 画面の枠を作る。html は固定の文字だけを渡すこと（入力された内容は入れない）。 */
export function mountSheet(html) {
  const wrap = document.createElement('div');
  wrap.className = 'scrim';
  wrap.hidden = true;
  wrap.innerHTML = html;
  $('#app-sheets').append(wrap);
  wrap.addEventListener('click', (e) => { if (e.target === wrap) hideSheet(wrap); });
  // 画面の背景や、中身が短くて動かす必要のない画面は、指で動かせないようにする
  wrap.addEventListener('touchmove', (e) => {
    const sheet = e.target instanceof Element ? e.target.closest('.sheet') : null;
    if (!sheet || sheet.scrollHeight <= sheet.clientHeight + 1) e.preventDefault();
  }, { passive: false });
  return wrap;
}

export function showSheet(wrap) {
  clearTimeout(wrap._t);
  wrap.classList.remove('closing');
  wrap.hidden = false;
  if (!open.includes(wrap)) open.push(wrap);
  document.documentElement.classList.add('lock');
}

export function hideSheet(wrap) {
  if (wrap.hidden || wrap.classList.contains('closing')) return;
  // 閉じる動き（下へ滑って消える）のあとで、実際に隠す
  wrap.classList.add('closing');
  clearTimeout(wrap._t);
  wrap._t = setTimeout(() => { wrap.hidden = true; wrap.classList.remove('closing'); }, 200);
  const i = open.indexOf(wrap);
  if (i >= 0) open.splice(i, 1);
  if (!open.length) document.documentElement.classList.remove('lock');
  wrap.dispatchEvent(new CustomEvent('sheetclose'));
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && open.length) hideSheet(open[open.length - 1]);
});
