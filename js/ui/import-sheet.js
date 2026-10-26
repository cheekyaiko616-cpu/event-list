// 日程の取り込み画面：ファイルまたは貼り付けで読み込み、候補を確認して追加する。
import { $, el, clear } from '../util/dom.js';
import { mountSheet, showSheet, hideSheet } from './sheet.js';
import { toast } from './toast.js';
import { parseImport, buildCandidates, applyCandidates } from '../data/import.js';
import { tabById } from '../data/tabs.js';
import { formatRange } from '../util/date.js';

const MARKUP = `
  <div class="sheet" id="im-sheet" role="dialog" aria-modal="true" aria-labelledby="im-heading">
    <div class="sheet-head">
      <h2 id="im-heading">日程の取り込み</h2>
      <button type="button" class="ghost" id="im-close">閉じる</button>
    </div>

    <div id="im-step1">
      <div class="actions" style="margin-top:12px">
        <button type="button" class="btn solid" id="im-pick">ファイルを選ぶ</button>
      </div>
      <input type="file" id="im-file" accept=".json,application/json" hidden>
      <div class="field">
        <label for="im-text">または貼り付け</label>
        <textarea class="input" id="im-text" rows="4" placeholder="{ &quot;app&quot;: &quot;event-cho-import&quot;, ... }"></textarea>
      </div>
      <div class="actions" style="margin-top:10px"><button type="button" class="btn" id="im-read">読み込む</button></div>
      <p class="set-msg" id="im-msg" role="alert"></p>
    </div>

    <div id="im-step2" hidden>
      <p class="help" id="im-summary" style="margin-top:8px"></p>
      <ul class="cand-list" id="im-list"></ul>
      <div class="form-actions">
        <button type="button" class="btn solid grow" id="im-apply">選んだ予定を追加する</button>
        <button type="button" class="btn" id="im-back">やり直す</button>
      </div>
    </div>
  </div>`;

const KIND = {
  new: '新規',
  update: '日程の変更',
  dup: '登録済み'
};

let wrap = null;
let cands = [];
let picked = new Set();

function showStep(n) {
  $('#im-step1').hidden = n !== 1;
  $('#im-step2').hidden = n !== 2;
}

function reset() {
  cands = [];
  picked = new Set();
  $('#im-msg').textContent = '';
  $('#im-text').value = '';
  showStep(1);
}

export function initImportSheet() {
  wrap = mountSheet(MARKUP);
  $('#im-close').addEventListener('click', () => hideSheet(wrap));
  wrap.addEventListener('sheetclose', reset);
  $('#im-pick').addEventListener('click', () => $('#im-file').click());
  $('#im-file').addEventListener('change', async (ev) => {
    const file = ev.target.files && ev.target.files[0];
    ev.target.value = '';
    if (!file) return;
    try { load(await file.text()); } catch (e) { $('#im-msg').textContent = 'ファイルを開けませんでした。'; }
  });
  $('#im-read').addEventListener('click', () => load($('#im-text').value));
  $('#im-back').addEventListener('click', reset);
  $('#im-apply').addEventListener('click', onApply);
}

export function openImportSheet() {
  reset();
  showSheet(wrap);
}

function load(text) {
  const r = parseImport(text);
  if (!r.ok) { $('#im-msg').textContent = r.error; return; }
  if (!r.items.length) { $('#im-msg').textContent = '使える項目がありませんでした（出典の無い項目は使いません）。'; return; }
  cands = buildCandidates(r.items);
  picked = new Set(cands.filter((c) => c.kind !== 'dup').map((c) => c.key));
  const fresh = cands.filter((c) => c.kind !== 'dup').length;
  $('#im-summary').textContent =
    `${cands.length}件のうち、追加・変更の候補は${fresh}件です。` +
    (r.skipped ? `出典の無い${r.skipped}件は使っていません。` : '') +
    '出典を見て、よいものだけ選んでください。';
  renderList();
  showStep(2);
}

function candEl(c) {
  const x = c.item;
  const tab = tabById(c.tabId);
  const box = el('input', { type: 'checkbox', id: `im-c-${c.key}`, disabled: c.kind === 'dup' });
  box.checked = picked.has(c.key);
  box.addEventListener('change', () => {
    if (box.checked) picked.add(c.key); else picked.delete(c.key);
    updateApply();
  });

  const when = x.date ? formatRange(x) : '日程未定';
  const lines = [
    el('span', { class: 'cand-t', text: x.title }),
    el('span', { class: 'cand-when', text: c.kind === 'update' ? `${formatRange(c.existing)} → ${when}` : when }),
    x.place ? el('span', { class: 'cand-meta', text: x.place }) : null,
    el('span', { class: 'cand-meta', text: `出典：${x.source}` }),
    x.url ? el('a', { class: 'cand-meta', href: x.url, target: '_blank', rel: 'noopener noreferrer', text: 'リンクを開いて確かめる ↗' }) : null,
    c.kind === 'new' && c.tabGuess ? el('span', { class: 'cand-warn', text: `タブ「${x.tabName || '指定なし'}」が無いので「${tab ? tab.name : '未分類'}」に入れます` }) : null
  ];
  return el('li', { class: 'cand' + (c.kind === 'dup' ? ' dup' : '') },
    el('label', { class: 'cand-in', for: `im-c-${c.key}` }, box,
      el('span', { class: 'cand-body' },
        el('span', { class: `cand-kind k-${c.kind}`, text: KIND[c.kind] }),
        ...lines)));
}

function renderList() {
  const list = $('#im-list');
  clear(list);
  cands.forEach((c) => list.append(candEl(c)));
  updateApply();
}

function updateApply() {
  const b = $('#im-apply');
  b.disabled = picked.size === 0;
  b.textContent = picked.size ? `選んだ${picked.size}件を追加する` : '追加するものを選んでください';
}

async function onApply() {
  const r = await applyCandidates(cands.filter((c) => picked.has(c.key)));
  hideSheet(wrap);
  const parts = [];
  if (r.added) parts.push(`${r.added}件を追加`);
  if (r.updated) parts.push(`${r.updated}件の日程を更新`);
  toast(parts.length ? parts.join('、') + 'しました' : '追加するものがありませんでした');
}
