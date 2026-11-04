// フォルダ形のタブ。「すべて」＋ 自分で作ったタブ ＋ 右端の「＋」（タブの追加）。
import { state, notify } from '../state.js';
import { $, el, clear } from '../util/dom.js';
import { visibleTabs } from '../data/settings.js';
import { colorCss } from '../util/tab-color.js';
import { openTabAdd } from './tab-add.js';
import { openAllFilter } from './all-filter-sheet.js';
import { offCount } from '../data/all-filter.js';
import { slideList } from './motion.js';

export function initTabsBar() {
  $('#tabs-mount').innerHTML =
    '<div class="tabs" id="tabs" role="tablist" aria-label="種類で絞り込み"><div class="tabs-in" id="tabs-in"></div></div>';
}

export function setFilter(id, { animate = true } = {}) {
  const ids = ['all'].concat(visibleTabs().map((x) => x.id));
  const dir = Math.sign(ids.indexOf(id) - ids.indexOf(state.ui.filter));
  state.ui.filter = id;
  state.ui.openId = null;
  notify();
  if (dir && animate) slideList(dir);
}

let shownKey = ''; // いま並んでいるタブの顔ぶれ（id・名前・色）。変わったときだけ作り直す

function tabButton(x, ids) {
  return el('button', {
    class: x.id === 'all' ? 'tab tab-all' : 'tab', type: 'button', role: 'tab',
    style: `--c:${x.color}`, 'data-tab': x.id, text: x.name,
    onclick: () => setFilter(x.id),
    onkeydown: (ev) => {
      if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
      const i = ids.indexOf(x.id) + (ev.key === 'ArrowRight' ? 1 : -1);
      if (i < 0 || i >= ids.length) return;
      ev.preventDefault();
      setFilter(ids[i]);
      const b = document.querySelector(`[data-tab="${ids[i]}"]`);
      if (b) b.focus();
    }
  });
}

/** じょうご形の絞り込みボタン（「すべて」の左横）。 */
function filterButton() {
  const b = el('button', { class: 'tab tab-filter', type: 'button', id: 'btn-af', 'aria-label': '「すべて」に出すタブを選ぶ', onclick: openAllFilter });
  b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h18l-7 8.5V20l-4-2v-5.5z"/></svg>'; // 固定の図だけ
  return b;
}

export function renderTabsBar() {
  const scroller = $('#tabs');
  const inner = $('#tabs-in');
  const left = scroller.scrollLeft;

  const items = [{ id: 'all', name: 'すべて', color: 'var(--ink)' }].concat(
    visibleTabs().map((t) => ({ id: t.id, name: t.name, color: colorCss(t.color) }))
  );
  const ids = items.map((x) => x.id);
  const key = items.map((x) => `${x.id}\u0001${x.name}\u0001${x.color}`).join('\u0002');

  if (key !== shownKey) { // タブが増減・改名・色変更されたときだけ、作り直す
    shownKey = key;
    clear(inner);
    inner.append(filterButton());
    items.forEach((x) => inner.append(tabButton(x, ids)));
    inner.append(el('button', {
      class: 'tab tab-add', type: 'button', 'aria-label': 'タブを追加', text: '＋', onclick: openTabAdd
    }));
  }
  const fb = $('#btn-af');
  if (fb) fb.classList.toggle('on', offCount() > 0); // 絞り込み中の印
  // 選んでいる印だけを、その場で付け替える（切り替えのたびに作り直さない）
  inner.querySelectorAll('[data-tab]').forEach((b) => {
    const on = b.dataset.tab === state.ui.filter;
    if (b.getAttribute('aria-selected') !== String(on)) b.setAttribute('aria-selected', String(on));
    const ti = on ? '0' : '-1';
    if (b.getAttribute('tabindex') !== ti) b.setAttribute('tabindex', ti);
  });

  // 選んでいるタブが見える位置までスクロールする（左に固定した「すべて」の幅は除く）
  scroller.scrollLeft = left;
  const sel = inner.querySelector('[aria-selected="true"]');
  const pinned = inner.querySelector('.tab-all');
  const funnel = inner.querySelector('.tab-filter');
  const stickyW = pinned ? pinned.offsetWidth + (funnel ? funnel.offsetWidth + 4 : 0) + 4 : 0;
  if (sel && sel !== pinned) {
    if (sel.offsetLeft - stickyW < scroller.scrollLeft) {
      scroller.scrollLeft = Math.max(0, sel.offsetLeft - stickyW - 8);
    } else if (sel.offsetLeft + sel.offsetWidth > scroller.scrollLeft + scroller.clientWidth - 48) {
      scroller.scrollLeft = sel.offsetLeft + sel.offsetWidth - scroller.clientWidth + 56;
    }
  }
}
