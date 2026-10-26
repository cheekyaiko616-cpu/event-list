// 設定の画面の中の「選べる項目」：自動で取り込む項目、一覧に出すタブ、一覧に出す項目。
import { $, el, clear } from '../util/dom.js';
import { state } from '../state.js';
import { DATE_KINDS, SHOW_KEYS } from '../config.js';
import { sortedTabs } from '../data/tabs.js';
import { isTabHidden, isShown, importsKind, toggleImportKind, toggleTabHidden, toggleShow } from '../data/settings.js';
import { refreshNow } from '../data/feed.js';

export const VIEW_MARKUP = `
    <section class="set-sec">
      <h3>一覧に出すタブ</h3>
      <div class="checks" id="sv-tabs"></div>
      <p class="help">外したタブの予定は、一覧に出ません（消えません）。</p>
    </section>

    <section class="set-sec">
      <h3>一覧に出す項目</h3>
      <div class="checks" id="sv-show"></div>
    </section>

    <section class="set-sec">
      <h3>自動で取り込む項目</h3>
      <div class="checks" id="sv-kinds"></div>
      <p class="help">開催日は、いつも取り込みます。ここは、申し込みなどの日付です。外した項目は、自動では入りません（手で入れた日付は消えません）。</p>
    </section>`;

function checkEl(id, label, on, onChange) {
  const input = el('input', { type: 'checkbox', id, checked: on });
  input.addEventListener('change', onChange);
  return el('label', { class: 'check', for: id }, input, label);
}

/** 設定の画面を開いているときに、今の設定に合わせて描き直す。 */
export function renderViewSettings() {
  const tabs = $('#sv-tabs');
  if (!tabs) return;
  clear(tabs);
  if (!state.tabs.length) tabs.append(el('p', { class: 'help', text: 'タブがありません。' }));
  sortedTabs().forEach((t) => tabs.append(checkEl(`sv-t-${t.id}`, t.name, !isTabHidden(t.id), () => toggleTabHidden(t.id))));

  const show = $('#sv-show');
  clear(show);
  SHOW_KEYS.forEach((k) => show.append(checkEl(`sv-s-${k.id}`, k.label, isShown(k.id), () => toggleShow(k.id))));

  const kinds = $('#sv-kinds');
  clear(kinds);
  DATE_KINDS.forEach((k) => kinds.append(checkEl(`sv-k-${k.id}`, k.label, importsKind(k.id), async () => {
    await toggleImportKind(k.id);
    refreshNow(); // 変えた内容を、すぐ予定に合わせる（読めなくても困らない）
  })));
}
