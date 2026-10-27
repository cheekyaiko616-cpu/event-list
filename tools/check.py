"""食い違いと無駄を見つける点検。`python3 tools/build.py` の最初に自動で動く（単独でも動く: python3 tools/check.py）。
見つかったら、直すまでビルドを止める。点検する内容:
  1. 説明文（README・手順書・コメント）に書かれたファイル名が、実在するか
  2. README の「直したいときの目安」に、js/ css/ tools/ のファイルがすべて載っているか
  3. JS のファイル同士が、ぐるぐる参照していないか
  4. CSS の、使われていない class / id、同じ場所の二重定義
  5. JS の、使われていない export
  6. 画面や動きを直したのに sw.js の CACHE の番号を上げ忘れていないか（git の直前の版と比べる）"""
import pathlib, re, subprocess, sys

root = pathlib.Path(__file__).resolve().parent.parent
read = lambda p: p.read_text(encoding='utf-8')
js_files = sorted(root.glob('js/**/*.js'))
css_files = sorted(root.glob('css/*.css'))
errors = []
rel = lambda p: str(p.relative_to(root))

# 1. 書かれたファイル名が実在するか
PATH = re.compile(r'(?<![\w/.-])((?:js|css|tools|img|icons)/[\w./-]*[\w-]\.(?:js|css|md|py|png|json))')
docs = [root / 'README.md', root / 'tools/daily-fetch.md'] + js_files + css_files
for f in docs:
    for m in PATH.finditer(read(f)):
        if not (root / m.group(1)).exists():
            errors.append(f'存在しないファイル名: {rel(f)} → {m.group(1)}')

# 2. README に全ファイルが載っているか（ファイル名、または js/util/ のようなフォルダ名で）
readme = read(root / 'README.md')
listed = {t.strip() for block in re.findall(r'`([^`]+)`', readme) for t in block.split(' / ')}
for f in js_files + css_files + sorted(root.glob('tools/*')):
    if rel(f) not in listed and not (len(f.relative_to(root).parts) > 2 and (rel(f.parent) + '/') in listed):
        errors.append(f'README に載っていないファイル: {rel(f)}')

# 3. import のぐるぐる参照
graph = {}
for f in js_files:
    graph[f] = [(f.parent / m).resolve() for m in re.findall(r"from '(\.[^']+)'", read(f))]
seen_cycles = set()
def walk(n, path):
    if n in path:
        cyc = path[path.index(n):] + [n]
        key = frozenset(cyc)
        if key not in seen_cycles:
            seen_cycles.add(key)
            errors.append('ぐるぐる参照: ' + ' → '.join(p.name for p in cyc))
        return
    for m in graph.get(n, []):
        if m in graph:
            walk(m, path + [n])
for f in graph:
    walk(f, [])

# 4. CSS
all_src = ''.join(read(f) for f in js_files) + read(root / 'index.html')
tokens = set(re.findall(r'[A-Za-z0-9_-]+', all_src))
def top_rules(text):
    """入れ子（@media など）の外にある規則だけを、(セレクタ, 中身) で返す。"""
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
    out, depth, start, sel = [], 0, 0, ''
    for i, ch in enumerate(text):
        if ch == '{':
            if depth == 0:
                sel = ' '.join(text[start:i].split())
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                if not sel.startswith('@'):
                    out.append(sel)
                start = i + 1
    return out
defined = {}
for f in css_files:
    text = re.sub(r'/\*.*?\*/', '', read(f), flags=re.S)
    flat = re.sub(r'\{[^{}]*\}', '{}', text)
    for m in re.finditer(r'(?<![\w-])([.#])([A-Za-z_][\w-]*)', flat):
        if m.group(2) not in tokens and (m.group(1) + m.group(2)) not in defined:
            defined[m.group(1) + m.group(2)] = 1
            errors.append(f'使われていないCSS: {rel(f)} {m.group(1)}{m.group(2)}')
seen_sel = {}
for f in css_files:
    for sel in top_rules(read(f)):
        seen_sel.setdefault(sel, []).append(rel(f))
for sel, where in seen_sel.items():
    if len(where) > 1:
        errors.append(f'同じセレクタが複数回: {sel} （{", ".join(where)}）')

# 5. 使われていない export
texts = {f: read(f) for f in js_files}
for f, s in texts.items():
    for name in re.findall(r'export (?:async )?(?:function|const|let) (\w+)', s):
        used = sum(len(re.findall(r'\b' + name + r'\b', t)) for g, t in texts.items() if g != f)
        if not used:
            errors.append(f'使われていないexport: {rel(f)} {name}')

# 6. CACHE の上げ忘れ
def git(*a):
    r = subprocess.run(['git', '-C', str(root)] + list(a), capture_output=True, text=True)
    return r.stdout if r.returncode == 0 else None
cache = lambda t: (re.search(r"const CACHE = '([^']+)'", t or '') or [None, None])[1]
head_sw = git('show', 'HEAD:sw.js')
if head_sw:
    changed = git('diff', '--name-only', 'HEAD', '--', 'js', 'css', 'index.html', 'img', 'icons', 'manifest.webmanifest')
    if changed and changed.strip() and cache(head_sw) == cache(read(root / 'sw.js')):
        errors.append(f'画面や動きを直したのに、sw.js の CACHE（{cache(head_sw)}）が上がっていません')

if errors:
    print('点検で見つかったこと（直してからビルドしてください）:')
    for e in errors:
        print(' -', e)
    sys.exit(1)
print('点検: 問題なし')
