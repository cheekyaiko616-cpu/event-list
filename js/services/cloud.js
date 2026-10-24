// Claude上で開いたときだけ使える共有データ（db）への入口。使えないときは null。
// 使えない場合（ファイルとして開いたときなど）は、アプリは端末内の保存だけで動く。
let cached = null;

export function getDb() {
  if (!cached) {
    cached = (async () => {
      try {
        if (!window.claude || typeof window.claude.use !== 'function') return null;
        return (await window.claude.use('db')) || null;
      } catch (e) {
        return null;
      }
    })();
  }
  return cached;
}
