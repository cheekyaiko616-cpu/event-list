// タブを編集する画面。名前・色・自動で取り込む内容を直す。削除もここ。
import { $, el, clear } from '../util/dom.js';
import { mountSheet, showSheet, hideSheet } from './sheet.js';
import { toast } from './toast.js';
import { tabById, countEvents, updateTab, removeTab } from '../data/tabs.js';
import { COLORS, WATCH_MAX, SHOW_KEYS, DATE_KINDS } from '../config.js';
import { refreshNow } from '../data/feed.js';

const MARKUP = `
  <form class="sheet" id="te-sheet" role="dialog" aria-modal="true" aria-labelledby="te-heading" novalidate>
    <div class="sheet-head">
      <h2 id="te-heading">タブを編集</h2>
      <button type="button" class="ghost" id="te-close">閉じる</button>
    </div>
    <div class="field">
      <label for="te-name">タブの名前</label>
      <input class="input" id="te-name" type="text" maxlength="20" autocomplete="off">
    </div>
    <fieldset class="seg">
      <legend class="legend">色</legend>
      <div class="palette" id="te-colors"></div>
    </fieldset>
    <div class="field">
      <label for="te-watch">自動で取り込む内容</label>
      <textarea class="input" id="te-watch" rows="3" maxlength="${WATCH_MAX}" placeholder="例）SUPER GTの2027年の公式日程"></textarea>
    </div>
    <fieldset class="seg">
      <legend class="legend">自動で取り込む日付（開催日のほか）</legend>
      <div class="checks" id="te-kinds"></div>
    </fieldset>
    <fieldset class="seg">
      <legend class="legend">表示</legend>
      <div class="checks" id="te-show"></div>
    </fieldset>
    <p class="err" id="te-error" role="alert"></p>
    <div class="form-actions">
      <button type="submit" class="btn solid grow">保存</button>
      <button type="button" class="btn danger" id="te-delete">削除</button>
    </div>
    <div class="tab-confirm" id="te-confirm" hidden></div>
  </form>`;

let wrap = null;
let tabId = null;
let color = 1;
let hidden = false;
let show = {};
let kinds = [];

export function initTabEdit() {
  wrap = mountSheet(MARKUP);
  $('#te-close').addEventListener('click', () => hideSheet(wrap));
  $('#te-sheet').addEventListener('submit', onSubmit);
  $('#te-delete').addEventListener('click', onDeleteAsk);
  wrap.addEventListener('sheetclose', () => { tabId = null; });
}

function drawColors() {
  const box = $('#te-colors');
  clear(box);
  for (let c = 1; c <= COLORS; c++) {
    box.append(el('button', {
      class: 'swatch', type: 'button', style: `--c:var(--c${c})`,
      'aria-label': `色${c}`, 'aria-pressed': String(c === color), 'data-color': String(c),
      onclick: () => { color = c; drawColors(); }
    }));
  }
}

/** 自動で取り込む日付の種類の選択欄。 */
function drawKinds() {
  const box = $('#te-kinds');
  clear(box);
  DATE_KINDS.forEach((k) => {
    const input = el('input', { type: 'checkbox', id: `te-k-${k.id}`, checked: kinds.includes(k.id) });
    input.addEventListener('change', () => { kinds = input.checked ? [...kinds, k.id] : kinds.filter((x) => x !== k.id); });
    box.append(el('label', { class: 'check', for: `te-k-${k.id}` }, input, k.label));
  });
}

/** 表示の選択欄。「このタブを一覧に出す」と、一覧に出す項目。 */
function drawShow() {
  const box = $('#te-show');
  clear(box);
  const add = (key, label, on, set) => {
    const input = el('input', { type: 'checkbox', id: `te-s-${key}`, checked: on });
    input.addEventListener('change', () => { set(input.checked); drawShow(); });
    box.append(el('label', { class: 'check', for: `te-s-${key}` }, input, label));
  };
  add('visible', 'このタブを一覧に出す', !hidden, (on) => { hidden = !on; });
  SHOW_KEYS.forEach((k) => {
    const row = el('div', { class: 'check-sub' });
    box.append(row);
    const input = el('input', { type: 'checkbox', id: `te-s-${k.id}`, checked: show[k.id] !== false, disabled: hidden });
    input.addEventListener('change', () => { show = { ...show, [k.id]: input.checked }; });
    row.append(el('label', { class: 'check', for: `te-s-${k.id}` }, input, k.label));
  });
}

export function openTabEdit(id) {
  const t = tabById(id);
  if (!t) return;
  tabId = id;
  color = t.color;
  hidden = !!t.hidden;
  show = { ...(t.show || {}) };
  kinds = [...(t.importKinds || [])];
  $('#te-name').value = t.name;
  $('#te-watch').value = t.watch || '';
  $('#te-error').textContent = '';
  $('#te-confirm').hidden = true;
  drawColors();
  drawShow();
  drawKinds();
  showSheet(wrap);
}

async function onSubmit(ev) {
  ev.preventDefault();
  if (!tabId) return;
  const r = await updateTab(tabId, { name: $('#te-name').value, color, watch: $('#te-watch').value, hidden, show, importKinds: kinds });
  if (!r.ok) { $('#te-error').textContent = r.error; return; }
  hideSheet(wrap);
  refreshNow(); // 取り込む種類を変えたときも、すぐ予定に合わせる（読めなくても困らない）
  toast('保存しました');
}

async function doRemove(withEvents) {
  const id = tabId;
  hideSheet(wrap);
  await removeTab(id, { withEvents });
  toast('タブを消しました');
}

function onDeleteAsk() {
  const t = tabById(tabId);
  if (!t) return;
  const n = countEvents(tabId);
  const box = $('#te-confirm');
  clear(box);
  const cancel = el('button', { class: 'btn', type: 'button', text: 'やめる', onclick: () => { box.hidden = true; } });
  if (!n) {
    box.append(el('p', { text: `「${t.name}」を消します。` }),
      el('div', { class: 'actions' },
        el('button', { class: 'btn danger', type: 'button', text: '消す', onclick: () => doRemove(false) }), cancel));
  } else {
    box.append(el('p', { text: `「${t.name}」には予定が${n}件あります。` }),
      el('div', { class: 'actions' },
        el('button', { class: 'btn danger', type: 'button', text: '予定も一緒に消す', onclick: () => doRemove(true) }),
        el('button', { class: 'btn', type: 'button', text: 'タブだけ消す（予定は「未分類」に残る）', onclick: () => doRemove(false) }),
        cancel));
  }
  box.hidden = false;
}
