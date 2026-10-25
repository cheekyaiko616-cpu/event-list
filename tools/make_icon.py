"""ホーム画面アイコンの背景だけを半透明の白にする。
使い方: python3 make_icon.py 元の画像 出力先 [背景の濃さ 0〜1]
外側の白（背景）だけを半透明にし、飛行機とカレンダーの白は不透明のまま残す。
"""
import sys
from collections import deque
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
bg_alpha = float(sys.argv[3]) if len(sys.argv) > 3 else 0.5

im = Image.open(src).convert("RGB")
w, h = im.size
px = im.load()
LIGHT = 246  # これ以上明るい点を「白」とみなす

def is_white(x, y):
    r, g, b = px[x, y]
    return min(r, g, b) >= LIGHT

# 外側の角から白をたどって「外側の背景」だけを見つける（絵の中の白はつながらない。左下はカレンダーの中なので使わない）
bg = [[False] * w for _ in range(h)]
q = deque()
for sx, sy in [(0, 0), (w - 1, 0), (w - 1, h // 2), (w - 1, h - 1)]:
    if is_white(sx, sy) and not bg[sy][sx]:
        bg[sy][sx] = True
        q.append((sx, sy))
while q:
    x, y = q.popleft()
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nx, ny = x + dx, y + dy
        if 0 <= nx < w and 0 <= ny < h and not bg[ny][nx] and is_white(nx, ny):
            bg[ny][nx] = True
            q.append((nx, ny))

out = Image.new("RGBA", (w, h))
o = out.load()
A = round(255 * bg_alpha)
for y in range(h):
    for x in range(w):
        r, g, b = px[x, y]
        if bg[y][x]:
            o[x, y] = (255, 255, 255, A)
        else:
            o[x, y] = (r, g, b, 255)

# 境目のにじみ（背景の白と混ざった点）を、濃さに合わせて自然に半透明へ
for y in range(h):
    for x in range(w):
        if bg[y][x]:
            continue
        near = any(
            0 <= x + dx < w and 0 <= y + dy < h and bg[y + dy][x + dx]
            for dx in (-1, 0, 1) for dy in (-1, 0, 1)
        )
        r, g, b = px[x, y]
        if near and min(r, g, b) > 150:
            t = (255 - min(r, g, b)) / 105.0  # 0=白に近い 1=線の色
            t = max(0.0, min(1.0, t))
            a = A + (255 - A) * t
            o[x, y] = (r, g, b, round(a))

out.save(dst)
print("saved", dst, out.size, "bg alpha", A)
