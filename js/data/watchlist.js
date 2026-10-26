// 取り込みの一覧：タブごとの「取り込み内容」を、GitHub保存用の形にまとめる。
// 画面は扱わない。形を変えるときはここだけ直す。
import { sortedTabs } from './tabs.js';

/** 取り込み内容が書かれたタブだけを、並び順どおりに集める。 */
export function watchlistData() {
  return {
    app: 'event-cho-watchlist',
    version: 1,
    updatedAt: new Date().toISOString(),
    tabs: sortedTabs()
      .filter((t) => (t.watch || '').trim())
      .map((t) => ({ tabName: t.name, watch: t.watch.trim() }))
  };
}
