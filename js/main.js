// 入口。各部品をつなぐだけにして、中身は js/ 以下の各ファイルに置く。
//   data/      … 保存と、予定・タブのデータ操作
//   services/  … カレンダーのファイル作成、ファイルの受け渡し
//   ui/        … 画面ごとの部品
//   util/      … 日付や文字の小さな道具
import { state, subscribe } from './state.js';
import { init } from './data/store.js';
import { pruneOld } from './data/events.js';
import { startFeed } from './data/feed.js';
import { initHeader, renderHeader } from './ui/header.js';
import { initTabsBar, renderTabsBar } from './ui/tabs-bar.js';
import { renderEventList } from './ui/event-list.js';
import { initOutsideClose, initPinSwipe } from './ui/pin.js';
import { initTabSwipe } from './ui/tab-swipe.js';
import { initEventSheet } from './ui/event-sheet.js';
import { initTabManager, renderTabManager } from './ui/tab-manager.js';
import { initDrawer, renderDrawerHandle } from './ui/drawer.js';
import { initFab, renderFab } from './ui/fab.js';
import { initTabAdd } from './ui/tab-add.js';
import { initTabEdit } from './ui/tab-edit.js';
import { initSettingsPage, renderSettings } from './ui/settings-page.js';
import { initUpdatesSheet } from './ui/updates-sheet.js';
import { initTransitSheet } from './ui/transit-sheet.js';
import { initWatchSync } from './data/watchlist-sync.js';
import { toast } from './ui/toast.js';
import { initSplash } from './ui/splash.js';

// 状態が変わるたびに、全画面を描き直す
function renderAll() {
  renderHeader();
  renderFab();
  renderDrawerHandle();
  renderTabsBar();
  renderEventList();
  renderTabManager();
  renderSettings();
}

// 起動時のトップ画面は、いつも「すべて」から始める（最後に開いたタブは引き継がない）
state.ui.filter = 'all';

initSplash();
initHeader();
initFab();
initDrawer();
initOutsideClose();
initPinSwipe();
initTabSwipe();
initTabsBar();
initEventSheet();
initTabManager();
initTabAdd();
initTabEdit();
initSettingsPage();
initUpdatesSheet();
initTransitSheet();
initWatchSync();
// 2本指の拡大・縮小を止める
['gesturestart', 'gesturechange', 'gestureend'].forEach((n) => document.addEventListener(n, (e) => e.preventDefault()));
subscribe(renderAll);
renderAll();

init().then(async () => {
  if (state.startupMessage) toast(state.startupMessage);
  await pruneOld(); // 終わって1年たった予定を消す
  startFeed();      // Claudeが調べた日程を自動で反映する（Claude上で開いたときだけ）
});

// オフラインでも開けるようにする（sw.js）
if ('serviceWorker' in navigator) {
  const register = () => navigator.serviceWorker.register('./sw.js').catch(() => { /* 使えなくてもアプリは動く */ });
  // 本体は書体の読み込みを待ってから動くため、このときすでに「読み込み完了」を過ぎていることがある
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register);
}
