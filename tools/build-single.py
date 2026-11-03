"""index.html + src/*.js + vendor/three.min.js 를 파일 하나(dist/single.html)로 합칩니다. (claude.ai 링크 게시용)
문구는 content.json에서 바로 읽어 넣어요(src/content.js도 함께 새로 만들어요)."""
import importlib.util, pathlib, re
root = pathlib.Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location('gen_content', root / 'tools/gen-content.py')
gen = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(gen)
(root / 'src/content.js').write_text(gen.render(), encoding='utf-8', newline='\n')
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
