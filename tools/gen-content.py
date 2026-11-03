"""content.json → src/content.js 로 옮겨 적어요.

브라우저는 index.html을 더블클릭해서 열면(file://) JSON을 fetch로 읽지 못해요.
그래서 같은 내용을 스크립트(src/content.js)로도 만들어 둡니다.
문구는 content.json만 고치고, 고친 뒤에는 이 스크립트를 한 번 실행하세요:  python tools/gen-content.py
(웹 서버로 열면 main.js가 content.json을 바로 읽으니 content.js가 조금 늦어도 화면은 최신이에요.)
"""
import json, pathlib

root = pathlib.Path(__file__).resolve().parent.parent


def render():
    data = json.loads((root / 'content.json').read_text(encoding='utf-8'))
    body = json.dumps(data, ensure_ascii=False, indent=2).replace('</script', '<\\/script')
    return ('// 자동 생성 파일이에요. 직접 고치지 말고 content.json을 고친 뒤 `python tools/gen-content.py`를 실행하세요.\n'
            'window.MB = window.MB || {};\n'
            'MB.content = ' + body + ';\n')


if __name__ == '__main__':
    out = root / 'src' / 'content.js'
    out.write_text(render(), encoding='utf-8', newline='\n')
    print(out.relative_to(root))
