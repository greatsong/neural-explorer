"""교사 스크립트 HTML에 수정 목록(JSON)을 적용한다. 사용: python3 apply-edits.py <in.html> <edits.json> <out.html> <log.md>
edits.json: [{"slide":56,"click":8,"kind":"교사|발문|동작","action":"replace|delete|insert","text":"...","why":"..."},
             {"slide":51,"click":7,"action":"progress","value":"함께 풀기|혼자 풀기 2분|공개·설명","why":"..."},
             {"slide":42,"action":"note","text":"...","why":"..."}]  # note: 장 머리에 운영 안내 추가
"""
import sys, json, re, html
src, ed, out, log = sys.argv[1:5]
h = open(src, encoding='utf-8').read(); edits = json.load(open(ed, encoding='utf-8'))
secs = re.split(r'(?=<section class="slide" id="s\d+">)', h); head = secs[0]; secs = secs[1:]
bysl = {int(re.search(r'id="s(\d+)"', s).group(1)): s for s in secs}
cls = {'교사': 'say', '발문': 'ask', '동작': 'scr'}
rows = []; fails = []
for e in edits:
    n = e['slide']; s = bysl[n]; before = ''
    if e['action'] in ('replace', 'delete'):
        pat = re.compile(rf'<div class="sc {cls[e["kind"]]}"><span class="lab">클릭 {e["click"]} · {e["kind"]}</span>(.*?)</div>\n?', re.S)
        m = pat.search(s)
        if not m:
            if not e.get('opt'): fails.append(e)
            continue
        before = html.unescape(m.group(1))
        new = '' if e['action'] == 'delete' else f'<div class="sc {cls[e["kind"]]}"><span class="lab">클릭 {e["click"]} · {e["kind"]}</span>{html.escape(e["text"])}</div>\n'
        s = s[:m.start()] + new + s[m.end():]
    elif e['action'] == 'insert':
        # 같은 클릭의 마지막 블록 뒤, 없으면 다음 클릭의 첫 블록 앞에 넣는다
        blocks = list(re.finditer(r'<div class="sc (?:say|ask|scr)"><span class="lab">클릭 (\d+) · [^<]+</span>.*?</div>\n?', s, re.S))
        new = f'<div class="sc {cls[e["kind"]]}"><span class="lab">클릭 {e["click"]} · {e["kind"]}</span>{html.escape(e["text"])}</div>\n'
        same = [b for b in blocks if int(b.group(1)) == e['click']]
        if same: pos = same[-1].end()
        else:
            later = [b for b in blocks if int(b.group(1)) > e['click']]
            pos = later[0].start() if later else (blocks[-1].end() if blocks else len(s) - len('</section>'))
        s = s[:pos] + new + s[pos:]
    elif e['action'] == 'progress':
        pat = re.compile(rf'<tr( class="solo")?><td>{e["click"]}</td><td>(.*?)</td><td>(.*?)</td></tr>', re.S)
        m = pat.search(s)
        if not m: fails.append(e); continue
        before = re.sub(r'<[^>]+>', '', m.group(3))
        solo = e['value'].startswith('혼자'); cell = f'<b>{e["value"]}</b>' if solo else e['value']
        trcls = ' class="solo"' if solo else ''
        s = s[:m.start()] + f'<tr{trcls}><td>{e["click"]}</td><td>{m.group(2)}</td><td>{cell}</td></tr>' + s[m.end():]
    elif e['action'] == 'note':
        s = re.sub(r'(</h3>)', r'\1<p class="op90">⏱ ' + html.escape(e['text']) + '</p>', s, count=1)
    bysl[n] = s
    rows.append((n, e.get('click', ''), e.get('kind', e['action']), e['action'], before, e.get('text', e.get('value', '')), e.get('why', '')))
doc = head + ''.join(bysl[k] for k in sorted(bysl))
open(out, 'w', encoding='utf-8').write(doc)
with open(log, 'w', encoding='utf-8') as f:
    f.write('| 장 | 클릭 | 종류 | 작업 | 수정 전 | 수정 후 | 이유 |\n|---|---|---|---|---|---|---|\n')
    for r in rows: f.write('| ' + ' | '.join(str(x).replace('|', '｜').replace('\n', ' ') for x in r) + ' |\n')
print('적용', len(rows), '실패', len(fails)); [print('  실패', e) for e in fails]
