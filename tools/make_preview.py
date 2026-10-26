"""動作確認用の「1枚のHTML」を作る。ブラウザで開くだけで、アプリの画面を試せる。
使い方: python3 tools/make_preview.py 出力先.html
（通信を使う機能──日程の自動反映・GitHub連携──は、この1枚では動かない。画面の確認用）"""
import base64, re, subprocess, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
out = pathlib.Path(sys.argv[1])
ESB = '/opt/npm-tools/node_modules/.bin/esbuild'
subprocess.run(['python3', str(root / 'tools/build.py')], check=True, capture_output=True)
js = (root / 'dist/app.min.js').read_text(encoding='utf-8')
for p in (root / 'img').glob('*.png'):
    uri = 'data:image/png;base64,' + base64.b64encode(p.read_bytes()).decode()
    js = js.replace(f'img/{p.name}', uri)
html = (root / 'index.html').read_text(encoding='utf-8')
html = re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>\n?', '', html)
html = re.sub(r'<link rel="manifest"[^>]*>\n?', '', html)
html = html.replace('<link rel="stylesheet" href="dist/app.min.css">', '<style>\n' + (root / 'dist/app.min.css').read_text(encoding='utf-8') + '\n</style>')
js = js.replace('</script', '<\\/script')
html = html.replace('<script src="dist/app.min.js" defer></script>', '<script>' + js + '</script>')
out.write_text(html, encoding='utf-8')
print(out, len(html) // 1024, 'KB')
