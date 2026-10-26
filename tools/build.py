"""配信用の軽い部品を作る。ソース（js/ と css/ の機能ごとのファイル）はそのまま。
  python3 tools/build.py
  → dist/app.min.js と dist/app.min.css ができる（index.html はこの2つだけを読む）。
ソースを直したら、必ずこれを実行してから公開する。見た目・動作は変わらない（ファイルが1つにまとまり、小さくなるだけ）。"""
import pathlib, re, subprocess, sys
root = pathlib.Path(__file__).resolve().parent.parent
ESB = '/opt/npm-tools/node_modules/.bin/esbuild'
dist = root / 'dist'
dist.mkdir(exist_ok=True)

# index.html に書かれた順に CSS を並べる（順番が見た目に効くため）
html = (root / 'index.html').read_text(encoding='utf-8')
order = re.findall(r'<!--css:(css/[^ ]+) -->', html)
if not order:  # 初回：元の <link> の並びを使う
    order = re.findall(r'<link rel="stylesheet" href="(css/[^"]+)">', html)
css = '\n'.join((root / p).read_text(encoding='utf-8') for p in order)
tmp = dist / '_all.css'
tmp.write_text(css, encoding='utf-8')
subprocess.run([ESB, str(tmp), '--minify', '--loader:.css=css', f'--outfile={dist / "app.min.css"}'], check=True, capture_output=True)
tmp.unlink()
subprocess.run([ESB, str(root / 'js/main.js'), '--bundle', '--minify', '--format=iife', '--target=es2020',
                f'--outfile={dist / "app.min.js"}'], check=True, capture_output=True)
for f in ('app.min.js', 'app.min.css'):
    print(f, (dist / f).stat().st_size // 1024, 'KB')
