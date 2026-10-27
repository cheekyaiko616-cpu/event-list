// 「最新の日程を取りに行く」操作と、その結果のお知らせ。設定の「今すぐ更新」と、一覧を引いての更新が共通で使う。
import { refreshNow } from '../data/feed.js';
import { toast } from './toast.js';

export async function runRefresh() {
  const r = await refreshNow();
  if (!r.ok) toast('更新できませんでした。通信を確認してください');
  else if (r.added || r.updated) toast(`更新しました（追加${r.added}件・変更${r.updated}件）`);
  else toast('最新です。新しい日程はありません');
  return r;
}
