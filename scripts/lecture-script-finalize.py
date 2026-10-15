"""생성된 스크립트에 사후 수정(42장 정리, 누락 줄 삽입, 중복 발문 정리)과 타임라인을 넣는다. 사용: python3 finalize.py <in.html> <out.html>"""
import re, html, json, sys
src, out = sys.argv[1], sys.argv[2]
h=open(src,encoding='utf-8').read()
secs=re.split(r'(?=<section class="slide" id="s\d+">)', h); head=secs[0]; secs=secs[1:]
by={int(re.search(r'id="s(\d+)"', s).group(1)):s for s in secs}
s=by[42]; s=re.sub(r'<div class="sc (?:say|ask|scr)"><span class="lab">클릭 ([1-9]|1\d) · [^<]+</span>.*?</div>\n?', '', s, flags=re.S); s=re.sub(r'<table class="tb"><tr><th>학생 반응</th>.*?</table>\n?', '', s, flags=re.S); by[42]=s
def has(n,k,kind): return re.search(rf'클릭 {k} · {kind}</span>', by[n]) is not None
def ins(n,k,kind,text):
    if has(n,k,kind): return
    cls={'교사':'say','발문':'ask','동작':'scr'}[kind]; s=by[n]
    blocks=list(re.finditer(r'<div class="sc (?:say|ask|scr)"><span class="lab">클릭 (\d+) · [^<]+</span>.*?</div>\n?', s, re.S))
    new=f'<div class="sc {cls}"><span class="lab">클릭 {k} · {kind}</span>{html.escape(text)}</div>\n'
    later=[b for b in blocks if int(b.group(1))>k or (int(b.group(1))==k and kind=='교사')]
    pos=later[0].start() if later else (blocks[-1].end() if blocks else len(s)-len('</section>'))
    by[n]=s[:pos]+new+s[pos:]
ins(38,7,'교사','관찰 문항입니다. 먼저 모두 생각하세요.')
ins(54,2,'교사','b = −2 행은 시범이니 확인만 하세요. 접선이 오른쪽 아래로 향해 기울기는 음수이고, 손실을 줄이려면 + 방향입니다.')
# 중복 발문: 같은 클릭에 둘이면 마지막 것(가장 나중에 삽입된 수정)을 남긴다
for n in by:
    s=by[n]; asks=list(re.finditer(r'<div class="sc ask"><span class="lab">클릭 (\d+) · 발문</span>.*?</div>\n?', s, re.S))
    seen={}; drop=[]
    for m in asks:
        k=m.group(1)
        if k in seen: drop.append(seen[k])
        seen[k]=m
    for m in sorted(drop, key=lambda m:-m.start()): s=s[:m.start()]+s[m.end():]
    by[n]=s
# ── 타임라인
WAITQ={38:{1,3,7},39:{3,5},40:{0,3},41:{2,6},43:{1,3},45:{1,5},47:{6,8},50:{5,7},51:{7},53:{9},54:{3,5},55:{1},56:{16},57:{16},59:{3,5},65:{1},68:{2,11,13},70:{0},74:{0,4}}
WHY={(38,7),(39,5),(47,6),(47,8),(51,7),(56,16),(65,1),(68,13)}; GROUP={(43,3),(50,5),(53,9),(54,3),(54,5),(55,1),(57,16),(59,5),(74,4)}
SOLO={46,56,68}; SKIP={42,48,60,66,69}; VIDEO={12,16}
SEC=[('도입',1,35),('세션 1 인공 뉴런',36,43),('세션 2 순전파',44,48),('세션 3 오차와 손실',49,51),('세션 4-A 경사하강법',52,57),('세션 4-B 기울기·업데이트',58,69),('마무리',70,78)]
WRITE={'세션 1 인공 뉴런':3.5,'세션 2 순전파':4.0,'세션 3 오차와 손실':2.0,'세션 4-A 경사하강법':3.0,'세션 4-B 기울기·업데이트':2.5,'마무리':4.5}
def speech(s):
    body=' '.join(html.unescape(re.sub(r'<[^>]+>','',x)) for x in re.findall(r'<div class="sc (?:say|ask)">(.*?)</div>', s, re.S))
    body=re.sub(r'클릭 \d+ · [^\s]+','',body); body=re.sub(r'\(예상 답:.*?\)','',body); body=re.sub(r'\s+',' ',body).strip(); return len(body)
chars={n:speech(by[n]) for n in by}; acts={n:len(re.findall('sc scr', by[n])) for n in by}
t={}; detail={}
for name,a,b in SEC:
    secw=WRITE.get(name,0); actsum=sum(acts[n] for n in range(a,b+1) if n not in SKIP) or 1
    for n in range(a,b+1):
        d={}
        if n in SKIP: d['발화']=10/60
        else:
            sp=chars[n]/270; d['발화']=sp if chars[n] else (20/60)
            if 36<=n<=69: d['수식']=sp*0.10
        resp=sum(60 if (n,k)==(68,11) else 30 if (n,k) in WHY else 20 if (n,k) in GROUP else 10 for k in WAITQ.get(n,set()))
        if resp: d['응답']=resp/60
        if n in SOLO: d['혼자']=2.0
        if n in VIDEO: d['영상']=1.0; d['전환']=0.5
        if name=='마무리': d['필기']=4.0 if n==75 else (0.5 if n==74 else 0)
        elif secw and n not in SKIP and acts[n]: d['필기']=secw*acts[n]/actsum
        if n in (36,44,49,52,58,70): d['전환']=d.get('전환',0)+0.5
        t[n]=sum(d.values()); detail[n]=d
cum=0; start={}; end={}
for n in range(1,79): start[n]=cum; cum+=t[n]; end[n]=cum
def mmss(m): return f'{int(m):d}:{int(round((m-int(m))*60)):02d}'
for n in range(1,79):
    s=by[n]; d=detail[n]; parts=' · '.join(f'{k} {v:.1f}' for k,v in d.items() if v>=0.05)
    s=re.sub(r'<p class="tl">.*?</p>', '', s, flags=re.S)
    s=re.sub(r'(<p class="meta">클릭 \d+회[^<]*</p>)', r'\1'+f'<p class="tl">⏱ {mmss(start[n])} → {mmss(end[n])} ({t[n]:.1f}분: {parts})</p>', s, count=1); by[n]=s
tot={}
for n in detail:
    for k,v in detail[n].items(): tot[k]=tot.get(k,0)+v
rows=''.join(f'<tr><td>{name} ({a}~{b}장)</td><td>{mmss(start[a])} → {mmss(end[b])}</td><td>{end[b]-start[a]:.1f}분</td><td>{sum(chars[n] for n in range(a,b+1) if n not in SKIP):,}자</td></tr>' for name,a,b in SEC)
total=cum; allch=sum(chars[n] for n in by if n not in SKIP); sp_t=tot.get('발화',0)+tot.get('수식',0); rest=total-sp_t
box=f'''<div class="box90"><h2>함께 풀기 운영안과 타임라인 (2026-10-16, 코덱스 1·2라운드 반영)</h2>
<p>대부분은 교사와 함께 계산하되, 세 곳에서는 답을 공개하기 전에 2분씩 혼자 계산하고, 마지막에는 자기 설명을 4분 동안 씁니다. 아래 표의 <b>"함께 풀기"</b>(33곳)에서만 묻고 "먼저 모두 생각하세요"라고 한 뒤 학생이 답을 말하면 다음 클릭으로 공개합니다. <b>"공개·설명(묻지 않음)"</b>은 화면에 물음표가 있어도 묻지 않고 교사가 답을 이어 말합니다. 함께 푸는 단계에서는 답을 공개한 클릭 뒤에 기록합니다. 인쇄된 시범 값·정답·공식은 다시 적지 않습니다.</p>
<ul>
<li><b>혼자 풀기 2분 (초록 줄)</b>: 46장 클릭 2(2-2의 h₂와 ŷ), 56장 클릭 8(4A-2 step 2의 새 b), 68장 클릭 5(dw 계산 → 방향 → 4B-4 새 w·b). 2분 동안 다음 클릭의 답을 공개하지 않습니다.</li>
<li><b>기본 경로에서 생략</b>: 42장(손글씨 신경망 세기, 복습으로), 48장(활성화 랩), 60장(입력 하나 실험), 66장(뉴런 그림 유도), 69장(도전). 장 머리에 대신 말할 것을 적었습니다.</li>
<li><b>12·16장 영상은 1분씩만</b> 틀고 요약합니다. 1~33장 도입은 원본 노트를 한두 문장으로 줄인 발화만 말합니다(원본 노트는 회색으로 남김). 75장 자기 말로 쓰기는 총 4분 한 번입니다.</li>
<li><b>수업 중 비워 두는 활동지 칸</b>: 1-4 손글씨 신경망 행, 도전. 35장에서 처음에 알립니다.</li>
</ul>
<h3>타임라인 (추정, 실측 아님)</h3>
<table><tr><th>구간</th><th>시작 → 종료</th><th>소요</th><th>발화</th></tr>{rows}<tr><td><b>합계</b></td><td>0:00 → {mmss(total)}</td><td><b>{total:.1f}분</b></td><td>{allch:,}자</td></tr></table>
<p>장마다 머리의 ⏱ 줄에 누적 시각과 그 장의 시간 구성을 적었습니다. 산정 기준: 발화 {allch:,}자 ÷ 분당 270자({tot.get('발화',0):.1f}분) + 36~69장 수식 읽기 보정 10%({tot.get('수식',0):.1f}분) + 질문 33개 응답(단순 10초·묶음 20초·이유 30초·68장 손실 재계산 60초, {tot.get('응답',0):.1f}분) + 필기·그래프·글쓰기(구간 가정 세션1 3.5·세션2 4·세션3 2·4-A 3·4-B 2.5·마무리 4.5 = {tot.get('필기',0):.1f}분) + 혼자 풀기 {tot.get('혼자',0):.0f}분 + 영상 {tot.get('영상',0):.0f}분 + 전환 {tot.get('전환',0):.1f}분. 발화 속도를 분당 240~300자로 바꾸면 약 {rest+sp_t*270/300:.0f}~{rest+sp_t*270/240:.0f}분입니다. {"<b>90분 완료를 보장하지 않습니다.</b> " if total>90 else ""}예기치 않은 질문·오답 처리 여유는 들어 있지 않습니다.</p>
<p>리허설 조정 목표(현재 대본의 예측값이 아니라 운영 목표): 40분까지 세션 3, 57분까지 4-A, 78분까지 4-B. 실제 리허설 기록과 위 타임라인을 비교해 뒤처지는 구간부터 줄입니다. 줄일 때는 추가 시연과 마무리 확장을 먼저 줄이고, 4-B의 유도 연결과 손실 확인은 빠른 낭독으로 밀어붙이지 않습니다.</p></div>
'''
head=re.sub(r'<div class="box90">.*?</div>\n(?=<h2>AI와 미래)', '', head, flags=re.S)
if '.tl{' not in head: head=head.replace('</style>', '.tl{font-size:13px;color:#166534;background:#f0fdf4;display:inline-block;padding:2px 8px;border-radius:4px;margin:2px 0 8px}\n</style>',1)
head=head.replace('<h2>AI와 미래 (원본 도입부)</h2>', box+'<h2>AI와 미래 (원본 도입부)</h2>')
head=head.replace('슬라이드별 스크립트 (2026-10-16, 함께 풀기)','슬라이드별 스크립트 (2026-10-16, 함께 풀기·타임라인)')
open(out,'w',encoding='utf-8').write(head+''.join(by[n] for n in sorted(by)))
json.dump({'total':total,'tot':tot,'sec':[(name,start[a],end[b]) for name,a,b in SEC],'chars':allch}, open('timeline.json','w'), ensure_ascii=False, indent=1)
print('합계', round(total,1), {k:round(v,1) for k,v in tot.items()}, '발화', allch)
for name,a,b in SEC: print(f'  {name}: {mmss(start[a])} → {mmss(end[b])} ({end[b]-start[a]:.1f}분, {sum(chars[n] for n in range(a,b+1) if n not in SKIP):,}자)')
