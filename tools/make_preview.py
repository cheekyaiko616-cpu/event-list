"""動作確認用の「1枚のHTML」を作る。ブラウザで開くだけで、アプリの画面を試せる。
使い方: python3 tools/make_preview.py 出力先.html
（通信を使う機能──日程の自動反映・GitHub連携──は、この1枚では動かない。画面の確認用）"""
import base64, re, subprocess, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
out = pathlib.Path(sys.argv[1])
ESB = '/opt/npm-tools/node_modules/.bin/esbuild'
js = subprocess.run([ESB, str(root / 'js/main.js'), '--bundle', '--format=iife', '--minify'],
                    capture_output=True, text=True, check=True).stdout
for p in (root / 'img').glob('*.png'):
    uri = 'data:image/png;base64,' + base64.b64encode(p.read_bytes()).decode()
    js = js.replace(f'img/{p.name}', uri)
html = (root / 'index.html').read_text(encoding='utf-8')
html = re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>\n?', '', html)
html = re.sub(r'<link rel="manifest"[^>]*>\n?', '', html)
def css(m):
    return '<style>\n' + (root / m.group(1)).read_text(encoding='utf-8') + '\n</style>'
html = re.sub(r'<link rel="stylesheet" href="(css/[^"]+)">', css, html)
js = js.replace('</script', '<\\/script')
html = html.replace('<script type="module" src="js/main.js"></script>', '<script>' + js + '</script>')
out.write_text(html, encoding='utf-8')
print(out, len(html) // 1024, 'KB')
