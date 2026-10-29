"""毎日の結果（updates.json の今日の記録と、近い申込締切）を LINE に送る。LINE Messaging API を使う。
  python3 tools/line_notify.py              # 送る（鍵が無ければ、送らず内容だけ表示）
  python3 tools/line_notify.py --dry-run    # 送らず内容だけ表示
  python3 tools/line_notify.py --broadcast  # 友だち全員へ（既定は LINE_TO の1人へ）
  python3 tools/line_notify.py --remind 3,1  # 締切の何日前に知らせるか（既定は3日前だけ）
  python3 tools/line_notify.py --date 2026-10-26
環境変数（鍵はファイルに書かない。GitHub の Secrets などに入れる）:
  LINE_CHANNEL_ACCESS_TOKEN … チャネルアクセストークン（長期）
  LINE_TO                   … 送り先のユーザーID（push のとき）
※ 以前の「LINE Notify」は2025年3月末で終了しているため、Messaging API を使う。
同じ内容を二重に送らないよう、内容から作った再送キー（X-Line-Retry-Key）を付ける。"""
import hashlib, json, os, pathlib, sys, time, urllib.error, urllib.request, uuid
from datetime import datetime, timedelta, timezone

root = pathlib.Path(__file__).resolve().parent.parent
API = os.environ.get('LINE_API_BASE', 'https://api.line.me')
JST = timezone(timedelta(hours=9))
LIMIT = 4800  # LINE の1通は5000文字まで。余裕を持たせて分ける


def arg(name, default):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


def load(name):
    p = root / name
    return json.loads(p.read_text(encoding='utf-8')) if p.exists() else {}


def build(date, remind):
    """送る文章を作る。送るものが無ければ空文字。"""
    lines = []
    entry = next((e for e in load('updates.json').get('entries', []) if e.get('date') == date), None)
    if entry and (entry.get('added') or entry.get('changed')):
        lines.append(f'📅 日程の更新（{date}）')
        for a in entry.get('added', []):
            lines.append(f'＋ {a.get("title", "")}［{a.get("tab", "")}］{a.get("when", "")}')
        for c in entry.get('changed', []):
            lines.append(f'✎ {c.get("title", "")}：{c.get("before", "")} → {c.get("after", "")}')
    today = datetime.strptime(date, '%Y-%m-%d').date()
    soon = []
    for it in load('feed.json').get('items', []):
        for d in it.get('dates', []):
            try:
                left = (datetime.strptime(d.get('date', ''), '%Y-%m-%d').date() - today).days
            except ValueError:
                continue
            if d.get('kind') == 'close' and left in remind:  # ちょうどその日数前になった日だけ（毎日は知らせない）
                soon.append((left, it.get('title', ''), d.get('note', '')))
    if soon:
        lines += ([''] if lines else []) + ['⏰ 申込締切が近づいています']
        for left, title, note in sorted(soon):
            lines.append(f'・{title}（締切まであと{left}日）' + (f' {note}' if note else ''))
    return '\n'.join(lines)


def chunks(text):
    out, cur = [], ''
    for line in text.split('\n'):
        if cur and len(cur) + len(line) + 1 > LIMIT:
            out.append(cur)
            cur = ''
        cur += ('\n' if cur else '') + line[:LIMIT]
    return out + ([cur] if cur else [])


def post(path, payload, token, retry_key):
    req = urllib.request.Request(API + path, data=json.dumps(payload).encode('utf-8'), method='POST', headers={
        'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token, 'X-Line-Retry-Key': retry_key})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=15):
                return True
        except urllib.error.HTTPError as e:
            if e.code == 409:  # 同じ再送キーが受け付け済み＝すでに送れている
                return True
            if e.code < 500 and e.code != 429:
                raise RuntimeError(f'LINE が受け付けませんでした（{e.code}）')
        except urllib.error.URLError:
            pass
        time.sleep(2 ** attempt)
    raise RuntimeError('LINE に送れませんでした（通信エラーが続きました）')


def main():
    date = arg('--date', datetime.now(JST).strftime('%Y-%m-%d'))
    text = build(date, {int(x) for x in arg('--remind', '3').split(',') if x.strip().isdigit()})
    if not text:
        print('送る内容がありません（今日の更新も、締切の知らせもなし）')
        return 0
    token, to = os.environ.get('LINE_CHANNEL_ACCESS_TOKEN', ''), os.environ.get('LINE_TO', '')
    broadcast = '--broadcast' in sys.argv
    if '--dry-run' in sys.argv or not token or (not broadcast and not to):
        print(text)
        print('\n（送っていません：--dry-run か、LINE_CHANNEL_ACCESS_TOKEN / LINE_TO が未設定）')
        return 0
    parts = chunks(text)
    for i in range(0, len(parts), 5):  # 1回の送信は5通まで
        batch = [{'type': 'text', 'text': t} for t in parts[i:i + 5]]
        key = str(uuid.UUID(hashlib.md5((date + '|' + ('b' if broadcast else to) + '|' + '|'.join(parts[i:i + 5])).encode('utf-8')).hexdigest()))
        post('/v2/bot/message/broadcast' if broadcast else '/v2/bot/message/push',
             {'messages': batch} if broadcast else {'to': to, 'messages': batch}, token, key)
    print(f'LINE に送りました（{len(parts)}通）')
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except RuntimeError as e:
        print('エラー:', e, file=sys.stderr)
        sys.exit(1)
