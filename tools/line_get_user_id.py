"""LINE のユーザーIDを調べる。公式アカウントに届いたメッセージ(Webhook)から、送った人のIDを表示する。
  python3 tools/line_get_user_id.py            # 8787番ポートで待つ（既定）
  python3 tools/line_get_user_id.py --port 9000
使い方:
  1. このツールを動かす
  2. LINE Developers の Webhook URL に、外から届く住所を設定する（ngrok などで 8787 を公開）
  3. 友だち追加した公式アカウントに、何か1通送る
  4. 画面に「userId」が表示される。それを LINE_TO に設定する
ユーザーIDは個人の識別子なので、表示した後は共有・保存しないこと。"""
import json, sys
from http.server import BaseHTTPRequestHandler, HTTPServer


def ids_from(body):
    """Webhook の本文から、送り主のユーザーIDを取り出す。取れなければ空のリスト。"""
    out = []
    for ev in (body or {}).get('events', []):
        src = ev.get('source') or {}
        if src.get('type') == 'user' and src.get('userId'):
            out.append((src['userId'], ev.get('type', ''), (ev.get('message') or {}).get('text', '')))
    return out


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        raw = self.rfile.read(int(self.headers.get('Content-Length') or 0))
        try:
            found = ids_from(json.loads(raw or b'{}'))
        except ValueError:
            found = []
        for uid, kind, text in found:
            print(f'userId: {uid}（種類: {kind}、本文: {text[:20]}）', flush=True)
        if not found:
            print('ユーザーIDは見つかりませんでした（友だちからのメッセージではない可能性）', flush=True)
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'ok')

    def log_message(self, *a):
        pass


if __name__ == '__main__':
    port = int(sys.argv[sys.argv.index('--port') + 1]) if '--port' in sys.argv else 8787
    print(f'待機中: ポート {port}。公式アカウントにメッセージを送ってください', flush=True)
    HTTPServer(('127.0.0.1', port), Handler).serve_forever()
