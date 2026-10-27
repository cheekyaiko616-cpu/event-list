"""iPhoneのホーム画面から開いたときの「起動前の画面」を作る（白や黒の一瞬を、アプリの背景色にそろえる）。
  python3 tools/make_startup.py
  → img/startup/ に端末の大きさごとの無地の画像（明るい/暗い）を作り、index.html の
    <!--startup-start--> と <!--startup-end--> の間にその一覧を書き込む。
色を変えたら（css/tokens.css の --bg）、下の LIGHT / DARK も同じ色にして実行し直す。
※ iPhoneはこの画像を「ホーム画面に追加したとき」に覚えるため、反映するにはホーム画面のアイコンを入れ直す。"""
import pathlib, re
from PIL import Image
root = pathlib.Path(__file__).resolve().parent.parent
LIGHT, DARK = '#f2f3ef', '#1b2124'
# (画面の幅pt, 高さpt, 倍率)  新しい機種を足すときはここへ
SIZES = [
    (320, 568, 2), (375, 667, 2), (414, 736, 3), (375, 812, 3), (414, 896, 2), (414, 896, 3),
    (390, 844, 3), (428, 926, 3), (393, 852, 3), (430, 932, 3),
    (402, 874, 3), (440, 956, 3), (420, 912, 3),
]
out = root / 'img' / 'startup'
out.mkdir(parents=True, exist_ok=True)
for f in out.glob('*.png'): f.unlink()
links = []
for scheme, color in (('light', LIGHT), ('dark', DARK)):
    for w, h, r in SIZES:
        name = f'{scheme}-{w * r}x{h * r}.png'
        Image.new('RGB', (w * r, h * r), color).save(out / name, optimize=True)
        media = f'(device-width: {w}px) and (device-height: {h}px) and (-webkit-device-pixel-ratio: {r}) and (orientation: portrait) and (prefers-color-scheme: {scheme})'
        links.append(f'<link rel="apple-touch-startup-image" media="{media}" href="img/startup/{name}">')
p = root / 'index.html'
html = p.read_text(encoding='utf-8')
html = re.sub(r'<!--startup-start-->.*?<!--startup-end-->', lambda m: '<!--startup-start-->\n' + '\n'.join(links) + '\n<!--startup-end-->', html, flags=re.S)
p.write_text(html, encoding='utf-8')
print(len(links), 'links')
