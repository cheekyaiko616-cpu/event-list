// フォルダ形のタブ。「すべて」＋ 自分で作ったタブ ＋ 右端の「＋」（タブの管理）。
import { state, notify } from '../state.js';
import { $, el, clear } from '../util/dom.js';
import { FILTER_KEY } from '../config.js';
import { sortedTabs } from '../data/tabs.js';
import { openTabManager } from './tab-manager.js';

export function initTabsBar() {
  $('#tabs-mount').innerHTML =
    '<div class="tabs" id="tabs" role="tablist" aria-label="種類で絞り込み"><div class="tabs-in" id="tabs-in"></div></div>';
}

export function setFilter(id) {
  state.ui.filter = id;
  state.ui.openId = null;
  try { localStorage.setItem(FILTER_KEY, id); } catch (e) { /* 覚えておけなくても動く */ }
  notify();
}

export function renderTabsBar() {
  const scroller = $('#tabs');
  const inner = $('#tabs-in');
  const left = scroller.scrollLeft;
  clear(inner);

  const items = [{ id: 'all', name: 'すべて', color: 'var(--ink)' }].concat(
    sortedTabs().map((t) => ({ id: t.id, name: t.name, color: `var(--c${t.color})` }))
  );
  const ids = items.map((x) => x.id);

  items.forEach((x) => {
    const selected = state.ui.filter === x.id;
    inner.append(el('button', {
      class: 'tab', type: 'button', role: 'tab',
      'aria-selected': String(selected), tabindex: selected ? '0' : '-1',
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
    }));
  });
  inner.append(el('button', {
    class: 'tab tab-add', type: 'button', 'aria-label': 'タブを追加・編集', text: '＋', onclick: openTabManager
  }));

  // 選んでいるタブが見える位置までスクロールする
  scroller.scrollLeft = left;
  const sel = inner.querySelector('[aria-selected="true"]');
  if (sel) {
    if (sel.offsetLeft < scroller.scrollLeft) {
      scroller.scrollLeft = Math.max(0, sel.offsetLeft - 8);
    } else if (sel.offsetLeft + sel.offsetWidth > scroller.scrollLeft + scroller.clientWidth - 48) {
      scroller.scrollLeft = sel.offsetLeft + sel.offsetWidth - scroller.clientWidth + 56;
    }
  }
}
