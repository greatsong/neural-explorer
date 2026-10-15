# 슬라이드별 교사 스크립트 HTML 생성. 사용: python3 scripts/lecture-script-build.py private/lecture-all.json <활동지 본문 txt> print/special-ms2-slide-script.html  (솔라 프로4 키는 github-eval/.env)
# 슬라이드별 교사 스크립트 HTML 생성기.
# 입력: lecture-all.json(전 장 화면 글자·제목·노트), worksheet-v2.txt(활동지 본문)
# 교사 발화(한글 산문)는 솔라 프로4가 장마다 설계서를 받아 쓴다(34~75장). 1~33장은 원본 덱 노트, 76~78장은 노트를 그대로 쓴다.
# 사용: python3 make-script.py <lecture-all.json> <worksheet.txt> <out.html> [--dry]
import json, re, sys, os, html, time, urllib.request

J, W, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
DRY = '--dry' in sys.argv
CACHE = os.path.join(os.path.dirname(OUT), 'solar-cache.json')
KEY = None
for f in ['/Users/greatsong/greatsong-project/github-eval/.env', '/Users/greatsong/greatsong-project/openchat-smalltalk/.env']:
    try:
        for line in open(f, encoding='utf-8'):
            if line.startswith('UPSTAGE_API_KEY='): KEY = line.split('=', 1)[1].strip().strip('"').strip("'")
    except FileNotFoundError: pass
    if KEY: break

slides = json.load(open(J, encoding='utf-8'))
ws = open(W, encoding='utf-8').read()

# ── 활동지 문항 추출: "1-1가중치만 있을 때" 같은 머리글로 자른다
item_re = re.compile(r'^(1-[1-5]|2-[1-3]|3-[12]|4A-[123]|4B-[1-5]|도전|끝-[12])(?=[가-힣])', re.M)
pos = [(m.start(), m.group(1)) for m in item_re.finditer(ws)]
items = {}
for i, (st, key) in enumerate(pos):
    en = pos[i + 1][0] if i + 1 < len(pos) else len(ws)
    items.setdefault(key, ws[st:en].strip())
items['4-A'] = ws[ws.index('세션 4-A'):ws.index('4A-1')].strip()
items['4-B'] = ws[ws.index('세션 4-B'):ws.index('4B-1')].strip()
items['1-1'] = ws[ws.index('세션 1.'):ws.index('1-2')].strip()

def ws_for(tag):
    t = tag.replace('활동지', '').strip()
    if not t: return ''
    keys = []
    m = re.match(r'(4B-2) ~ (4B-5)', t)
    if m: keys = ['4B-2', '4B-3', '4B-4', '4B-5']
    else: keys = [t]
    return '\n'.join(items.get(k, '') for k in keys)

SOLO = {(51,5),(51,7),(56,8),(68,9)}  # 혼자 풀기(2분): 51장 e²·MSE, 56장 step 2 새 b, 68장 4B-4 업데이트
def is_question(cap): return cap.rstrip().endswith('?') or cap.rstrip().endswith('는?') or '나머지는' in cap

def solar(prompt, system):
    if DRY: return '(dry)'
    req = urllib.request.Request('https://api.upstage.ai/v1/chat/completions', data=json.dumps({
        'model': 'solar-pro4', 'messages': [{'role': 'system', 'content': system}, {'role': 'user', 'content': prompt}],
        'temperature': 0.3, 'max_tokens': 1800}).encode('utf-8'),
        headers={'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                d = json.load(r); return d['choices'][0]['message']['content']
        except Exception as e:
            print('  솔라 오류', e); time.sleep(5)
    return ''

SYSTEM = """당신은 중학교 2학년 90분 특강 「손으로 풀어보는 딥러닝의 원리」의 교사 스크립트를 쓰는 강사입니다. 교사는 프로젝터로 슬라이드를 한 클릭씩 넘기고, 학생은 종이 활동지를 앞에 두고 교사와 함께 계산합니다. 웹앱 실습은 없습니다.
진행 방식(함께 풀기): 시간이 90분뿐이라 학생에게 혼자 풀 시간을 주지 않습니다. 질문 단계에서 교사가 묻고, 학생이 입으로 답하면 바로 다음 클릭으로 답을 공개합니다. 학생은 공개된 값을 활동지 칸에 받아 적습니다. 예외로 "(혼자 풀기 2분)"이라고 표시된 단계에서만 학생이 활동지 칸을 직접 계산할 2분을 줍니다.
규칙:
- 교사 말은 합쇼체(~합니다, ~입니다). 짧고 또렷하게. 은유·과장 없이. 대시(—) 연결 금지. "견주다"·"쓰다"(사용 의미) 금지.
- 화면에 적힌 숫자·기호·식만 말합니다. 설계서에 없는 수치나 사실을 지어내지 않습니다.
- 질문 단계(캡션이 물음표로 끝남)에서는 발문을 던지고 학생이 답을 말하게 한 뒤 바로 공개합니다. "계산할 시간을 주겠습니다", "칸을 채워 보십시오" 같은 말은 (혼자 풀기 2분) 단계에서만 씁니다. 공개 단계에서는 답을 확인하며 짧게 설명합니다.
- 동작 줄에서 활동지를 언급할 때는 "공개한 값을 활동지 ○○ 칸에 적게 한다"처럼 받아 적기로 씁니다. (혼자 풀기 2분) 단계에서만 "활동지 ○○ 칸을 2분 동안 계산하게 한다"로 씁니다.
- 화면의 문장을 그대로 읽지 말고 교사가 학생에게 말하듯 풀어 말합니다. 식 상자의 계산 줄("= (−2) − 0.5 × (−3)" 같은 것)은 문장으로 읽지 않고 "식 상자에 대입한 식이 보입니다"처럼 가리킵니다.
- 그 장의 화면에 아직 나오지 않은 계산 결과(뒤 장에서 학생이 계산할 값)는 활동지 원문에 있더라도 말하지 않습니다.
- 단계 표시는 반드시 [0], [1], [2]처럼 대괄호 안에 숫자만 씁니다. "반응:" 줄은 한 줄에 "학생 말 | 원인 | 교사 대응" 순서로 적고, 머리글은 쓰지 않습니다.
- 출력 형식을 정확히 지킵니다. 다른 말은 쓰지 않습니다."""

def brief(sl):
    lines = [f"[슬라이드 {sl['n']}] 제목: {sl['title']}  {sl['tag']}"]
    lines.append("클릭 단계별 화면 문장:")
    for st in sl['steps']:
        caps = ' / '.join(st['caps']) if st['caps'] else '(설명 문장 없음)'
        q = any(is_question(c) for c in st['caps']); mark = '(혼자 풀기 2분) ' if (sl['n'], st['k']) in SOLO else ('(질문·함께 풀기: 묻고 바로 공개) ' if q else '')
        lines.append(f"  [{st['k']}] {mark}{caps}")
    extra = [t for t in sl['steps'][-1]['all'] if len(t) > 1][:60]
    lines.append("마지막 단계에 화면에 보이는 그 밖의 글자(표·배지): " + ' | '.join(extra)[:900])
    if sl['notes']: lines.append("발표자 노트(교사용 메모): " + ' / '.join(sl['notes']))
    w = ws_for(sl['tag'])
    if w: lines.append("대응하는 활동지 문항 원문(학생이 종이에 채우는 칸):\n" + w[:1400])
    lines.append("""
출력 형식(이 형식만):
[k] 교사: (클릭 k에서 말할 내용. 1~3문장)
[k] 발문: (질문 단계에만. 묻고 기다릴 질문 한 문장. "(예상 답: …)"를 붙임)
[k] 동작: (필요할 때만. 대괄호 없이 "활동지 4A-2 step 2 칸을 채우게 한다"처럼)
반응: 학생 말 | 원인 | 교사 대응   (예상되는 학생 반응 1~2줄, 없으면 생략)
단계 k는 위 번호를 그대로 씁니다. 모든 단계에 교사: 줄을 씁니다.""")
    return '\n'.join(lines)

cache = json.load(open(CACHE, encoding='utf-8')) if os.path.exists(CACHE) else {}
NUM = re.compile(r'−?-?\d+(?:[.,]\d+)?')
def numbers(s): return set(x.replace('−', '-').replace(',', '') for x in NUM.findall(s))

sections = []
warn = []
for sl in slides:
    n = sl['n']
    if 34 <= n <= 75 and sl['steps'][0]['caps'] or (34 <= n <= 75):
        key = str(n)
        b = brief(sl)
        if key not in cache or not cache[key]:
            print('솔라 집필', n, sl['title'])
            cache[key] = solar(b, SYSTEM)
            json.dump(cache, open(CACHE, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        text = cache[key]
        # 수치 검증: 발화의 숫자가 화면·활동지에 없으면 경고
        shown = set()
        for st in sl['steps']:
            for t in st['all']: shown |= numbers(t)
            for c in st['caps']: shown |= numbers(c)
        shown |= numbers(ws_for(sl['tag'])); shown |= numbers(' '.join(sl['notes']))
        clicks = {str(i) for i in range(0, 20)}
        bad = sorted(x for x in numbers(text) if x not in shown and x not in clicks)
        if bad: warn.append((n, bad))
        sl['script'] = text
    else:
        sl['script'] = None

# ── HTML
def esc(s): return html.escape(s)
WSCODE = re.compile(r'(1-[1-5]|2-[1-3]|3-[12]|4A-[123]|4B-[1-5]|끝-[12])')
def render_script(text, tag=''):
    out = []
    last_k = None
    for line in text.splitlines():
        line = line.strip()
        if not line: continue
        m = re.match(r'\[k?(\d+)\]\s*(교사|발문|동작)\s*:\s*(.*)', line)
        if m:
            k, kind, body = m.groups()
            if kind == '교사': last_k = k
            elif last_k is not None and int(k) < int(last_k): k = last_k  # 동작·발문의 번호가 앞 교사 줄보다 작으면(집필 오류) 앞 번호를 따른다
            if kind == '동작' and '활동지' in body:
                codes = set(WSCODE.findall(body)); tagcodes = set(WSCODE.findall(tag))
                if '4B-2' in tagcodes: tagcodes |= {'4B-3', '4B-4', '4B-5'}
                if not tag or (codes and not codes <= tagcodes):
                    print(f'  활동지 언급 제거/경고: tag={tag!r} 동작={body[:60]}')
                    if not tag: continue
            cls = {'교사': 'say', '발문': 'ask', '동작': 'scr'}[kind]
            out.append(f'<div class="sc {cls}"><span class="lab">클릭 {k} · {kind}</span>{esc(body)}</div>')
        elif line.startswith('반응') or line.count('|') >= 2:
            body = line.split(':', 1)[1] if line.startswith('반응') and ':' in line else line
            if body.strip() in ('학생 말 | 원인 | 교사 대응', '') or body.replace(' ', '') == '학생말|원인|교사대응': continue
            cells = [esc(c.strip()) for c in body.split('|')]
            while len(cells) < 3: cells.append('')
            out.append(f'<table class="tb"><tr><th>학생 반응</th><th>원인</th><th>교사 대응</th></tr><tr><td>{cells[0]}</td><td>{cells[1]}</td><td>{cells[2]}</td></tr></table>')
        else:
            out.append(f'<p>{esc(line)}</p>')
    return '\n'.join(out)

parts = []
for sl in slides:
    n = sl['n']; title = sl['title'] or ('원본 도입부' if n <= 33 else '')
    tag = sl['tag']
    frag = []
    parts.append(frag)
    parts = parts  # (장별 조각 목록)
    frag.append(f'<section class="slide" id="s{n}"><h3><span class="num">{n}</span> {esc(title)} {f"<span class=tag>{esc(tag)}</span>" if tag else ""}</h3>')
    nsteps = len(sl['steps']) - 1
    frag.append(f'<p class="meta">클릭 {nsteps}회 · 화면 캡션은 아래 표, 교사 발화는 그 아래</p>')
    if nsteps > 0 or any(sl['steps'][0]['caps']):
        frag.append('<table class="tb steps"><tr><th>클릭</th><th>화면에 나오는 문장</th><th>진행</th></tr>')
        for st in sl['steps']:
            caps = '<br>'.join(esc(c) for c in st['caps']) or '<span class="dim">(그림만)</span>'
            q = any(is_question(c) for c in st['caps'])
            solo = (n, st['k']) in SOLO
            cell = '<b>혼자 풀기 2분</b>' if solo else ('함께 풀기' if q else '공개·설명')
            trcls = ' class="solo"' if solo else ''
            frag.append(f'<tr{trcls}><td>{st["k"]}</td><td>{caps}</td><td>{cell}</td></tr>')
        frag.append('</table>')
    if sl['script']:
        frag.append(render_script(sl['script'], sl['tag']))
    elif sl['notes']:
        for t in sl['notes']:
            if t.startswith('원본:'): frag.append(f'<p class="meta">{esc(t)}</p>')
            else: frag.append(f'<div class="sc say"><span class="lab">교사</span>{esc(t)}</div>')
    else:
        frag.append('<p class="meta dim">화면만 보여 주고 넘어간다.</p>')
    frag.append('</section>')

SECTIONS = [(1, 'AI와 미래 (원본 도입부)'), (34, '표지·학습 목표'), (36, '세션 1 · 인공 뉴런'), (44, '세션 2 · 순전파'), (49, '세션 3 · 오차와 손실'), (52, '세션 4-A · 경사하강법'), (58, '세션 4-B · 기울기와 업데이트'), (70, '마무리 · 언어 모델'), (76, '여러분의 미래')]
body = []
si = 0
for idx, sl in enumerate(slides):
    while si < len(SECTIONS) and SECTIONS[si][0] == sl['n']:
        body.append(f'<h2>{esc(SECTIONS[si][1])}</h2>'); si += 1
    body.append(''.join(parts[idx]))

doc = f'''<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>[교사용] 손으로 풀어보는 딥러닝의 원리 · 슬라이드별 스크립트</title>
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:'Noto Sans KR',Pretendard,sans-serif;font-size:10.5pt;line-height:1.7;color:#1a1a1a;background:#fff;padding:14mm 12mm 16mm;max-width:210mm;margin:0 auto}}
h1{{font-size:19pt;font-weight:700;line-height:1.3}}
h2{{font-size:14pt;font-weight:700;margin-top:22pt;margin-bottom:6pt;padding-bottom:4pt;border-bottom:1px solid #ccc;page-break-after:avoid}}
h3{{font-size:12pt;font-weight:700;margin-top:16pt;margin-bottom:3pt;page-break-after:avoid}}
h3 .num{{display:inline-block;min-width:28pt;background:#1a1a1a;color:#fff;font-size:9.5pt;padding:1pt 6pt;border-radius:3px;text-align:center;margin-right:6pt}}
h3 .tag{{display:inline-block;background:#eceaff;color:#4a3fc7;font-size:9pt;padding:1pt 7pt;border-radius:3px;margin-left:6pt;font-weight:600}}
p{{margin-bottom:6pt}} ul{{padding-left:20pt;margin:4pt 0 8pt}} li{{margin-bottom:3pt}}
.lh{{border-bottom:2px solid #1a1a1a;padding-bottom:10pt;margin-bottom:12pt}}
.lh .lab{{font-size:9pt;color:#666;letter-spacing:2px}}
.lh .tlab{{display:inline-block;background:#1a1a1a;color:#fff;font-size:9pt;padding:1pt 8pt;border-radius:3px;margin-right:8pt;font-weight:700}}
.lh .sub{{font-size:10.5pt;color:#555;margin-top:3pt}}
.meta{{font-size:9.5pt;color:#555;margin:0 0 6pt}} .dim{{color:#888}}
.sc{{border-radius:0 4px 4px 0;padding:6pt 10pt;margin:5pt 0;break-inside:avoid;page-break-inside:avoid}}
.sc .lab{{display:inline-block;font-size:8.5pt;font-weight:700;padding:1pt 7pt;border-radius:3px;margin-right:6pt;color:#fff;white-space:nowrap}}
.scr{{background:#eef3fa;border-left:3px solid #557}} .scr .lab{{background:#335}}
.say{{background:#f7f7f4;border-left:3px solid #555}} .say .lab{{background:#222}}
.ask{{background:#fff8e1;border-left:3px solid #c89000}} .ask .lab{{background:#8a6200}}
.tb{{width:100%;border-collapse:collapse;margin:6pt 0 10pt;font-size:9.4pt;break-inside:avoid;page-break-inside:avoid}}
.tb th,.tb td{{border:1px solid #999;padding:3pt 6pt;text-align:left;vertical-align:top}}
.tb th{{background:#1a1a1a;color:#fff;font-weight:600}}
.tb.steps td:first-child{{width:9%;text-align:center}} .tb.steps td:last-child{{width:16%;color:#444}}
.slide{{break-inside:avoid-page}}
@media print{{@page{{size:A4;margin:12mm 10mm 14mm}} body{{font-size:9.6pt;padding:0;max-width:none}} .tb th,.lh .tlab,.sc .lab,h3 .num{{-webkit-print-color-adjust:exact;print-color-adjust:exact}} .sc{{-webkit-print-color-adjust:exact;print-color-adjust:exact}}}}
.solo td{{background:#e8f7ec}}.solo b{{color:#15803d}}.box90{{border:2px solid #16a34a;border-radius:8px;padding:12px 16px;margin:16px 0;background:#f0fdf4}}.box90 table{{font-size:14px;border-collapse:collapse}}.box90 td,.box90 th{{border:1px solid #e5e7eb;padding:4px 10px}}
</style></head><body>
<header class="lh">
<div><span class="tlab">교사용</span><span class="lab">NEURAL EXPLORER · 슬라이드별 스크립트 (2026-10-16, 함께 풀기)</span></div>
<h1>손으로 풀어보는 딥러닝의 원리</h1>
<div class="sub">슬라이드 웹앱(78장)과 활동지 v2를 함께 사용하는 교사 발화 · 클릭 단계별</div>
</header>
<h2>읽는 법</h2>
<ul>
<li>장마다 <strong>화면에 나오는 문장</strong>을 클릭 순서대로 표에 적었다. "함께 풀기"는 교사가 묻고 학생이 답을 말하면 바로 공개하는 단계, "혼자 풀기 2분"(초록 줄, 세 군데)은 학생이 활동지 칸을 직접 계산하는 단계, "공개·설명"은 답을 보이며 설명하는 단계다.</li>
<li><strong>교사</strong>는 말할 내용, <strong>발문</strong>은 묻고 기다릴 질문, <strong>동작</strong>은 교사가 할 일이다. 번호는 그 장의 클릭 번호(0은 처음 화면)다.</li>
<li>1~33장은 세종특강 원본 도입부라 원본 덱의 노트를 그대로 적었다. 34~75장의 교사 발화는 설계서를 바탕으로 솔라 프로4가 집필했고, 숫자는 화면·활동지와 대조했다.</li>
<li>슬라이드 주소: <span class="mono">https://neural-explorer.vercel.app/#/lecture/N</span> (N은 장 번호). 오프라인은 번들의 index.html. 다음 →/←, 전체 화면 F, 발표자 노트 N.</li>
</ul>
<div class="box90"><h2>함께 풀기 운영안 (2026-10-16)</h2>
<p>학생에게 혼자 풀 시간을 주지 않고 교사와 함께 풉니다. 질문 단계에서 교사가 묻고 학생이 답을 말하면 바로 다음 클릭으로 공개하며, 학생은 공개된 값을 활동지에 받아 적습니다. 예외로 세 군데만 2분씩 혼자 계산합니다.</p>
<ul>
<li><b>혼자 풀기 2분 (초록 줄)</b>: 51장 클릭 5·7(오차 제곱의 합과 MSE), 56장 클릭 8(step 2의 새 b), 68장 클릭 9(4B-4 새 w·b). 세션 3·4-A·4-B의 핵심 계산 하나씩입니다.</li>
<li><b>12·16장 영상은 1분씩만</b> 틀고 요약합니다.</li>
<li>48장 활성화 랩, 60장 입력 하나 실험, 66장 뉴런 그림 유도, 69장 도전 step은 시간이 남을 때만 합니다.</li>
</ul>
<table><tr><th>구간</th><th>클릭</th><th>예상</th></tr>
<tr><td>도입 1~35장 (영상 1분씩)</td><td>40</td><td>14분</td></tr>
<tr><td>세션 1 인공 뉴런 36~43장</td><td>60</td><td>12분</td></tr>
<tr><td>세션 2 순전파 44~48장</td><td>29</td><td>7분</td></tr>
<tr><td>세션 3 오차와 손실 49~51장 (+혼자 2분)</td><td>21</td><td>7분</td></tr>
<tr><td>세션 4-A 경사하강법 52~57장 (+혼자 2분)</td><td>68</td><td>20분</td></tr>
<tr><td>세션 4-B 기울기·업데이트 58~69장 (+혼자 2분)</td><td>68</td><td>16분</td></tr>
<tr><td>마무리 70~78장</td><td>28</td><td>6분</td></tr>
<tr><td><b>합계</b></td><td>314</td><td><b>약 82분</b> (여유 8분)</td></tr></table>
<p>추정 근거: 화면 문장을 소리 내어 읽는 시간(초당 5자) + 클릭마다 2초 + 질문 단계마다 학생이 답하는 15초 + 혼자 풀기 2분 × 3. 교사가 설명을 덧붙이면 그만큼 늘어나므로 여유 8분 안에서 조절합니다.</p></div>
{''.join(body)}
</body></html>'''
open(OUT, 'w', encoding='utf-8').write(doc)
print('저장', OUT, '장', len(slides), '솔라 집필', sum(1 for s in slides if s['script']))
if warn:
    print('수치 경고(화면·활동지에 없는 숫자):')
    for n, bad in warn: print(' ', n, bad)
