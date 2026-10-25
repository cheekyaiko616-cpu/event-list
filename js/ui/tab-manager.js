// タブの管理画面：追加、名前の変更、色、並び替え、削除。
import { $, el, clear } from '../util/dom.js';
import { mountSheet, showSheet, hideSheet } from './sheet.js';
import { toast } from './toast.js';
import { sortedTabs, countEvents, addTab, renameTab, cycleColor, moveTab, removeTab, setTabWatch } from '../data/tabs.js';
import { watchlistText, watchlistData } from '../data/watchlist.js';
import { WATCH_MAX } from '../config.js';

const MARKUP = `
  <div class="sheet" id="tm-sheet" role="dialog" aria-modal="true" aria-labelledby="tm-heading">
    <div class="sheet-head">
      <h2 id="tm-heading">タブの管理</h2>
      <button type="button" class="ghost" id="tm-close">閉じる</button>
    </div>
    <p class="help" style="margin-top:6px">色の四角をタップすると色が変わります。変更はすぐ反映されます。</p>
    <ul class="tab-list" id="tm-list"></ul>
    <form class="tab-new" id="tm-form" novalidate>
      <label class="legend" for="tm-name">新しいタブ</label>
      <div class="tab-new-row">
        <input class="input" id="tm-name" type="text" maxlength="20" autocomplete="off" placeholder="例）グルメ、旅行">
        <button type="submit" class="btn solid">追加</button>
      </div>
      <label class="legend" for="tm-watch" style="margin-top:8px">自動で取り込む内容（任意）</label>
      <textarea class="input" id="tm-watch" rows="2" maxlength="${WATCH_MAX}" placeholder="例）SUPER GTの2027年の公式日程"></textarea>
      <p class="err" id="tm-error" role="alert"></p>
    </form>
    <div class="tab-share">
      <p class="help">タブごとの「取り込み内容」を、Claudeに渡す一覧にまとめます。</p>
      <button type="button" class="btn" id="tm-copy">取り込みの一覧をコピー</button>
      <p class="help" id="tm-copy-msg" role="status"></p>
    </div>
  </div>`;

let wrap = null;
let deleting = null; // 削除の確認を出しているタブの id

export function initTabManager() {
  wrap = mountSheet(MARKUP);
  $('#tm-close').addEventListener('click', () => hideSheet(wrap));
  $('#tm-form').addEventListener('submit', onAdd);
  $('#tm-copy').addEventListener('click', onCopy);
  wrap.addEventListener('sheetclose', () => { deleting = null; });
}

export function openTabManager() {
  deleting = null;
  $('#tm-error').textContent = '';
  showSheet(wrap);
  renderTabManager(true);
}

function redraw() {
  renderTabManager(true);
}

async function onAdd(ev) {
  ev.preventDefault();
  const input = $('#tm-name');
  $('#tm-error').textContent = '';
  const watch = $('#tm-watch');
  const r = await addTab(input.value, watch.value);
  if (!r.ok) {
    $('#tm-error').textContent = r.error;
    return;
  }
  input.value = '';
  watch.value = '';
  toast('タブを追加しました');
}

async function onCopy() {
  const msg = $('#tm-copy-msg');
  const count = watchlistData().tabs.length;
  if (!count) { msg.textContent = '取り込み内容が書かれたタブがありません。'; return; }
  try {
    await navigator.clipboard.writeText(watchlistText());
    msg.textContent = `${count}件のタブの内容をコピーしました。Claudeに貼り付けてください。`;
  } catch (e) {
    msg.textContent = 'コピーできませんでした。';
  }
}

async function doRemove(tab, withEvents) {
  deleting = null;
  await removeTab(tab.id, { withEvents });
  toast('タブを消しました');
}

function confirmEl(tab, n) {
  const cancel = el('button', { class: 'btn', type: 'button', text: 'やめる', onclick: () => { deleting = null; redraw(); } });
  if (!n) {
    return el('div', { class: 'tab-confirm', role: 'group' },
      el('p', { text: `「${tab.name}」を消します。` }),
      el('div', { class: 'actions' },
        el('button', { class: 'btn danger', type: 'button', text: '消す', onclick: () => doRemove(tab, false) }),
        cancel));
  }
  return el('div', { class: 'tab-confirm', role: 'group' },
    el('p', { text: `「${tab.name}」には予定が${n}件あります。` }),
    el('div', { class: 'actions' },
      el('button', { class: 'btn danger', type: 'button', text: '予定も一緒に消す', onclick: () => doRemove(tab, true) }),
      el('button', { class: 'btn', type: 'button', text: '予定は残してタブだけ消す', onclick: () => doRemove(tab, false) }),
      cancel),
    el('p', { class: 'help', style: 'margin-top:8px', text: '残した予定は「すべて」で「未分類」として見られます。' }));
}

function itemEl(tab, i, tabs) {
  const n = countEvents(tab.id);

  const input = el('input', {
    class: 'input', type: 'text', id: `tm-${tab.id}`, value: tab.name,
    maxlength: '20', autocomplete: 'off', 'aria-label': 'タブの名前'
  });
  input.addEventListener('change', async () => {
    const r = await renameTab(tab.id, input.value);
    if (!r.ok) {
      toast(r.error);
      input.value = tab.name;
    }
  });

  const move = (dir) => async () => {
    await moveTab(tab.id, dir);
    const again = document.querySelector(`[data-mv="${tab.id}:${dir}"]`);
    if (again && !again.disabled) again.focus();
  };

  const watch = el('textarea', {
    class: 'input tab-watch-input', rows: '2', maxlength: String(WATCH_MAX), 'aria-label': '自動で取り込む内容',
    placeholder: '例）SUPER GTの2027年の公式日程'
  });
  watch.value = tab.watch || '';
  watch.addEventListener('change', async () => {
    const r = await setTabWatch(tab.id, watch.value);
    if (!r.ok) toast(r.error);
  });

  return el('li', { class: 'tab-item' },
    el('button', {
      class: 'swatch', type: 'button', style: `--c:var(--c${tab.color})`, 'aria-label': '色を変える', 'data-sw': tab.id,
      onclick: async () => {
        await cycleColor(tab.id);
        const again = document.querySelector(`[data-sw="${tab.id}"]`);
        if (again) again.focus();
      }
    }),
    input,
    el('div', { class: 'mv' },
      el('button', { class: 'btn', type: 'button', text: '↑', 'aria-label': '前へ', 'data-mv': `${tab.id}:-1`, disabled: i === 0, onclick: move(-1) }),
      el('button', { class: 'btn', type: 'button', text: '↓', 'aria-label': '後ろへ', 'data-mv': `${tab.id}:1`, disabled: i === tabs.length - 1, onclick: move(1) })),
    el('button', { class: 'btn danger sm', type: 'button', text: '削除', onclick: () => { deleting = tab.id; redraw(); } }),
    el('label', { class: 'tab-watch' },
      el('span', { class: 'legend', text: '自動で取り込む内容' }),
      watch),
    deleting === tab.id ? confirmEl(tab, n) : null);
}

/** 画面が開いているときだけ描く。入力中は、打っている途中の文字が消えないよう描き直さない。 */
export function renderTabManager(force) {
  if (!wrap || wrap.hidden) return;
  const list = $('#tm-list');
  const active = document.activeElement;
  if (!force && active && active.tagName === 'INPUT' && list.contains(active)) return;
  clear(list);
  const tabs = sortedTabs();
  if (!tabs.length) list.append(el('li', { class: 'help', text: 'タブがありません。下から追加します。' }));
  tabs.forEach((t, i) => list.append(itemEl(t, i, tabs)));
}
