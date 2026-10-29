// 「読み込み中」「空」「エラー」の表示を1つにまとめた部品。画面ごとに同じ作りを書かないための共通の枠。
//   statePanel({ status: 'loading', message: '予定を読み込んでいます…' })
//   statePanel({ status: 'empty',   message: '予定がありません。', actions: [{ text: '＋ 予定を追加', onClick: fn, solid: true }] })
//   statePanel({ status: 'error',   message: '保存できませんでした。', actions: [{ text: 'もう一度', onClick: retry }] })
// props:
//   status   'loading' | 'empty' | 'error'（知らない値は 'empty' として扱う）
//   message  メイン文。空なら何も出さない文面にはせず、status ごとの既定文を使う
//   detail   補足の1行（省略可）
//   actions  [{ text, onClick, solid?, disabled? }]（省略可。error と empty だけに出す）
// アクセシビリティ：loading は role=status + aria-busy、error は role=alert。骨組み(skeleton)は読み上げない。
import { el } from '../util/dom.js';

const DEFAULT_MESSAGE = { loading: '読み込んでいます…', empty: '表示するものがありません。', error: 'うまくいきませんでした。' };
const SKELETON_ROWS = 3;

function skeleton() {
  const rows = [];
  for (let i = 0; i < SKELETON_ROWS; i++) rows.push(el('li', { class: 'skel-row' }, el('i', { class: 'skel-d' }), el('i', { class: 'skel-t' })));
  return el('ul', { class: 'skel', 'aria-hidden': 'true' }, rows);
}

function actionsEl(actions) {
  const list = (Array.isArray(actions) ? actions : []).filter((a) => a && a.text && typeof a.onClick === 'function');
  if (!list.length) return null;
  return el('div', { class: 'actions' }, list.map((a) =>
    el('button', { class: 'btn' + (a.solid ? ' solid' : ''), type: 'button', text: a.text, disabled: a.disabled === true, onclick: a.onClick })));
}

export function statePanel({ status = 'empty', message = '', detail = '', actions = [] } = {}) {
  const kind = status === 'loading' || status === 'error' ? status : 'empty';
  const text = message || DEFAULT_MESSAGE[kind];
  const body = [
    el('p', { text }),
    detail ? el('p', { class: 'sub', text: detail }) : null,
    kind === 'loading' ? skeleton() : actionsEl(actions)
  ];
  if (kind === 'error') return el('div', { class: 'wrap' }, el('div', { class: 'note', role: 'alert' }, body));
  return el('div', kind === 'loading'
    ? { class: 'wrap empty', role: 'status', 'aria-busy': 'true' }
    : { class: 'wrap empty' }, body);
}
