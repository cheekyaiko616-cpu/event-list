// 設定の画面の中の「選べる項目」：自動で取り込む項目。
// （一覧に出すタブ・項目は、タブごとに「タブの編集」の画面で選ぶ）
import { $, el, clear } from '../util/dom.js';
import { DATE_KINDS } from '../config.js';
import { importsKind, toggleImportKind } from '../data/settings.js';
import { refreshNow } from '../data/feed.js';

export const VIEW_MARKUP = `
    <section class="set-sec">
      <h3>自動で取り込む項目</h3>
      <div class="checks" id="sv-kinds"></div>
      <p class="help">開催日は、いつも取り込みます。ここは、申し込みなどの日付です。外した項目は、自動では入りません（手で入れた日付は消えません）。</p>
      <p class="help">一覧に出すタブや項目は、「タブの編集・並び替え」から、タブごとに選べます。</p>
    </section>`;

function checkEl(id, label, on, onChange) {
  const input = el('input', { type: 'checkbox', id, checked: on });
  input.addEventListener('change', onChange);
  return el('label', { class: 'check', for: id }, input, label);
}

/** 設定の画面を開いているときに、今の設定に合わせて描き直す。 */
export function renderViewSettings() {
  const kinds = $('#sv-kinds');
  if (!kinds) return;
  clear(kinds);
  DATE_KINDS.forEach((k) => kinds.append(checkEl(`sv-k-${k.id}`, k.label, importsKind(k.id), async () => {
    await toggleImportKind(k.id);
    refreshNow(); // 変えた内容を、すぐ予定に合わせる（読めなくても困らない）
  })));
}
