// フォルダ形のタブ。「すべて」＋ 自分で作ったタブ ＋ 右端の「＋」（タブの追加）。
import { state, notify } from '../state.js';
import { $, el, clear } from '../util/dom.js';
import { visibleTabs } from '../data/settings.js';
import { openTabAdd } from './tab-add.js';
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

export function renderTabsBar() {
  const scroller = $('#tabs');
  const inner = $('#tabs-in');
  const left = scroller.scrollLeft;

  const items = [{ id: 'all', name: 'すべて', color: 'var(--ink)' }].concat(
    visibleTabs().map((t) => ({ id: t.id, name: t.name, color: `var(--c${t.color})` }))
  );
  const ids = items.map((x) => x.id);
  const key = items.map((x) => `${x.id}\u0001${x.name}\u0001${x.color}`).join('\u0002');

  if (key !== shownKey) { // タブが増減・改名・色変更されたときだけ、作り直す
    shownKey = key;
    clear(inner);
    items.forEach((x) => inner.append(tabButton(x, ids)));
    inner.append(el('button', {
      class: 'tab tab-add', type: 'button', 'aria-label': 'タブを追加', text: '＋', onclick: openTabAdd
    }));
  }
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
  const stickyW = pinned ? pinned.offsetWidth + 4 : 0;
  if (sel && sel !== pinned) {
    if (sel.offsetLeft - stickyW < scroller.scrollLeft) {
      scroller.scrollLeft = Math.max(0, sel.offsetLeft - stickyW - 8);
    } else if (sel.offsetLeft + sel.offsetWidth > scroller.scrollLeft + scroller.clientWidth - 48) {
      scroller.scrollLeft = sel.offsetLeft + sel.offsetWidth - scroller.clientWidth + 56;
    }
  }
}
