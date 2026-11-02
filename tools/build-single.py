"""index.html + src/*.js + vendor/three.min.js 를 파일 하나(dist/single.html)로 합칩니다. (claude.ai 링크 게시용)"""
import pathlib, re
root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text(encoding='utf-8')
css = (root / 'src/style.css').read_text(encoding='utf-8')
html = html.replace('<link rel="stylesheet" href="src/style.css">', '<style>\n' + css + '\n</style>')
def inline(m):
    src = m.group(1)
    code = (root / src).read_text(encoding='utf-8').replace('</script', '<\\/script')
    return '<script>\n' + code + '\n</script>'
html = re.sub(r'<script src="([^"]+)"></script>', inline, html)
out = root / 'dist'; out.mkdir(exist_ok=True)
(out / 'single.html').write_text(html, encoding='utf-8')
print('dist/single.html', len(html))
