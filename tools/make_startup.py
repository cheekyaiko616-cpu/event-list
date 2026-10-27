"""iPhoneのホーム画面から開いたときの「起動前の画面」を作る（白や黒の一瞬を、アプリの背景色にそろえる）。
  python3 tools/make_startup.py
  → img/startup/ に端末の大きさごとの無地の画像（明るい/暗い）を作り、index.html の
    <!--startup-start--> と <!--startup-end--> の間にその一覧を書き込む。
色は css/tokens.css の --bg（明るい／暗い）から読む。色を変えたら、この作業を実行し直す。
※ iPhoneはこの画像を「ホーム画面に追加したとき」に覚えるため、反映するにはホーム画面のアイコンを入れ直す。"""
import pathlib, re
from PIL import Image
root = pathlib.Path(__file__).resolve().parent.parent
tokens = (root / 'css' / 'tokens.css').read_text(encoding='utf-8')
bgs = re.findall(r'--bg:\s*(#[0-9a-fA-F]{6})', tokens)  # 1つ目が明るい表示、2つ目が暗い表示
LIGHT, DARK = bgs[0], bgs[1]
# (画面の幅pt, 高さpt, 倍率)  iPhone 16 以降だけ。新しい機種を足すときはここへ
SIZES = [
    (390, 844, 3),  # 16e
    (393, 852, 3),  # 16
    (402, 874, 3),  # 16 Pro / 17 / 17 Pro
    (420, 912, 3),  # Air
    (430, 932, 3),  # 16 Plus
    (440, 956, 3),  # 16 Pro Max / 17 Pro Max
]
out = root / 'img' / 'startup'
out.mkdir(parents=True, exist_ok=True)
for f in out.glob('*.png'): f.unlink()
links = []
for scheme, color in (('light', LIGHT), ('dark', DARK)):
    for w, h, r in SIZES:
        name = f'{scheme}-{w * r}x{h * r}.png'
        img = Image.new('P', (w * r, h * r), 0)  # 無地なので、色は1色だけ（軽い形式で保存する）
        img.putpalette([int(color[i:i + 2], 16) for i in (1, 3, 5)] + [0] * 765)
        img.save(out / name, optimize=True)
        media = f'(device-width: {w}px) and (device-height: {h}px) and (-webkit-device-pixel-ratio: {r}) and (orientation: portrait) and (prefers-color-scheme: {scheme})'
        links.append(f'<link rel="apple-touch-startup-image" media="{media}" href="img/startup/{name}">')
p = root / 'index.html'
html = p.read_text(encoding='utf-8')
html = re.sub(r'<!--startup-start-->.*?<!--startup-end-->', lambda m: '<!--startup-start-->\n' + '\n'.join(links) + '\n<!--startup-end-->', html, flags=re.S)
p.write_text(html, encoding='utf-8')
print(len(links), 'links')
