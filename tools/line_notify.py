"""毎日の結果（updates.json の今日の記録と、近い申込締切）を LINE に送る。LINE Messaging API を使う。
  python3 tools/line_notify.py              # 送る（鍵が無ければ、送らず内容だけ表示）
  python3 tools/line_notify.py --dry-run    # 送らず内容だけ表示
  python3 tools/line_notify.py --broadcast  # 友だち全員へ（既定は LINE_TO の1人へ）
  python3 tools/line_notify.py --remind 3,1  # 締切の何日前に知らせるか（既定は3日前だけ）
  python3 tools/line_notify.py --date 2026-10-26
  python3 tools/line_notify.py --today      # 朝の知らせ：今日開催の予定だけを送る（開催のない日は送らない）
環境変数（鍵はファイルに書かない。GitHub の Secrets などに入れる）:
  LINE_CHANNEL_ACCESS_TOKEN … チャネルアクセストークン（長期）
  LINE_TO                   … 送り先のユーザーID（push のとき）
※ 以前の「LINE Notify」は2025年3月末で終了しているため、Messaging API を使う。
同じ内容を二重に送らないよう、内容から作った再送キー（X-Line-Retry-Key）を付ける。"""
import hashlib, json, os, pathlib, re, sys, time, urllib.error, urllib.request, uuid
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


STALE_DAYS = 2  # 自動取得の最終確認が、これだけ前より古ければ警告する（11:59の取得が2回続けて動かなかった）


def stale_warning(date):
    """自動取得が止まっていそうなら、警告の文。大丈夫なら空文字。feed.json の最上位 checkedAt（毎日必ず書く）を見る。"""
    today = datetime.strptime(date, '%Y-%m-%d').date()
    raw = load('feed.json').get('checkedAt', '')
    try:
        last = datetime.strptime(raw, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        return '⚠ 日程の自動取得の確認日が記録されていません。取得が動いているか確かめてください'
    if (today - last).days >= STALE_DAYS:
        return f'⚠ 日程の自動取得が止まっている可能性があります（最終確認：{last.month}月{last.day}日）'
    return ''


def build(date, remind):
    """送る文章を作る。内容ごと（追加・更新・締切）にまとめる。送るものが無ければ空文字。"""
    blocks = []
    entry = next((e for e in load('updates.json').get('entries', []) if e.get('date') == date), None)
    places = {it.get('title'): it.get('place', '') for it in load('feed.json').get('items', [])}
    if entry and entry.get('added'):
        items = []
        for a in entry['added']:
            one = [f'・予定名：{a.get("title", "")}', f'　日程：{a.get("when", "")}']
            if places.get(a.get('title')):  # 場所が分かるものだけ載せる
                one.append(f'　場所：{places[a["title"]]}')
            items.append('\n'.join(one))
        blocks.append('📅 イベントの追加\n' + '\n\n'.join(items))  # イベントの間は空行
    if entry and entry.get('changed'):
        items = [f'・予定名：{c.get("title", "")}\n　{c.get("field") or "変更内容"}：{c.get("before", "")} → {c.get("after", "")}'
                 for c in entry['changed']]
        blocks.append('✎ 日程の更新\n' + '\n\n'.join(items))  # イベントの間は空行
    today = datetime.strptime(date, '%Y-%m-%d').date()
    soon = []
    for it in load('feed.json').get('items', []):
        for d in it.get('dates', []):
            try:
                left = (datetime.strptime(d.get('date', ''), '%Y-%m-%d').date() - today).days
            except ValueError:
                continue
            if d.get('kind') == 'close' and left in remind:  # ちょうどその日数前になった日だけ（毎日は知らせない）
                soon.append((left, it.get('title', '')))
    if soon:
        lines = ['⏰ 申込締切が近づいています']
        for left, title in sorted(soon):
            lines.append(f'・{title}（締切まであと{left}日）')
        blocks.append('\n'.join(lines))
    text = f'{today.month}月{today.day}日更新\n' + '\n\n'.join(blocks) if blocks else ''
    warn = stale_warning(date)  # 取得が止まっていたら、更新や締切が無い日でも知らせる
    return text + ('\n\n' if text and warn else '') + warn


LIVE_DAYS = 2  # この日数以内の予定（ライブ・イベント）は、期間中毎朝知らせる。これより長い予定（長期の展示など）は初日だけ
MOTOR_TAB = 'モータースポーツ'  # このタブは、決勝日（最終日）と予選日（その前日）だけ知らせる


def times_for(note, day):
    """メモから開場・開演の時刻を取り出す。日ごとに書かれていれば、その日の分だけ。"""
    segs = [x.strip() for x in re.split('[、，]', note or '')]
    dated = [x for x in segs if re.match(r'\d{1,2}/\d{1,2}', x)]
    if dated:
        segs = [x for x in dated if re.match(r'0?%d/0?%d(?!\d)' % (day.month, day.day), x)]
    text = ' '.join(segs)
    op, st = re.search(r'開場\s*(\d{1,2}:\d{2})', text), re.search(r'開演\s*(\d{1,2}:\d{2})', text)
    return (op.group(1) if op else ''), (st.group(1) if st else '')


def build_today(date):
    """今日開催の予定を、朝の知らせの文章にする。無ければ空文字。"""
    today = datetime.strptime(date, '%Y-%m-%d').date()
    items = []
    for it in load('feed.json').get('items', []):
        try:
            start = datetime.strptime(it.get('date', ''), '%Y-%m-%d').date()
            end = datetime.strptime(it.get('end') or it['date'], '%Y-%m-%d').date()
        except (ValueError, KeyError):
            continue  # 日程未定の予定は対象外
        tag = ''
        if MOTOR_TAB in it.get('tabName', ''):
            if today == end:
                tag = '（決勝日）'
            elif today == end - timedelta(days=1):
                tag = '（予選日）'
            else:
                continue
        elif not start <= today <= end or (end - start).days + 1 > LIVE_DAYS and today != start:
            continue
        lines = [f'・{it.get("title", "")}{tag}']
        when = today.strftime('%Y/%m/%d')  # 日程は今日の日付だけ。ただし長期の予定（初日だけ知らせるもの）は期間を載せる
        if not tag and (end - start).days + 1 > LIVE_DAYS:
            when = start.strftime('%Y/%m/%d') + '〜' + end.strftime('%Y/%m/%d')
        lines.append(f'　日程：{when}')
        if it.get('place'):
            lines.append(f'　場所：{it["place"]}')
        opening, starting = times_for(it.get('note', ''), today)
        if opening:
            lines.append(f'　開場：{opening}')
        if starting:
            lines.append(f'　開演：{starting}')
        items.append('\n'.join(lines))
    return f'{today.month}月{today.day}日 今日のイベント\n' + '\n\n'.join(items) if items else ''


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
    if '--today' in sys.argv:
        text = build_today(date)
    else:
        text = build(date, {int(x) for x in arg('--remind', '3').split(',') if x.strip().isdigit()})
    if not text:
        print('送る内容がありません' + ('（今日開催の予定なし）' if '--today' in sys.argv else '（今日の更新も、締切の知らせもなし）'))
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
