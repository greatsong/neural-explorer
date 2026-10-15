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

SOLO = {(46,2),(56,8),(68,5)}  # 혼자 풀기(2분): 46장 h₂·ŷ, 56장 step 2 새 b, 68장 4B-3~4B-4
WAITQ = {38:{1,3,7},39:{3,5},40:{0,3},41:{2,6},43:{1,3},45:{1,5},47:{6,8},50:{5,7},51:{7},53:{9},54:{3,5},55:{1},56:{16},57:{16},59:{3,5},65:{1},68:{2,11,13},70:{0},74:{0,4}}  # 실제로 묻고 기다리는 질문 33개
SKIP = {42:'기본 경로에서 생략. 활동지 1-4의 손글씨 신경망 행은 복습으로 남긴다. 74장에서 "직접 세지는 않았지만 12,730개"라고 결과를 제공한다.',
        48:'기본 경로에서 생략. 47장의 두 그래프로 활성화 함수의 역할을 비교한다. 실험실 결과를 활동지에 적게 하지 않는다.',
        60:'기본 경로에서 생략. 59장의 두 입력 비교로 "가중치 변화에 입력이 곱해진다"를 확보한다. 4B-2에는 아무것도 적게 하지 않는다.',
        66:'기본 경로에서 생략. 62~65장의 유도로 충분하다.',
        69:'기본 경로에서 생략. 도전은 먼저 끝난 학생이나 복습용. 한 점의 한계 설명은 68장 마지막으로 옮긴다.'}
DIRECTIVES = {
 34:['기록시키지 않는다(끝-2에 그 문구를 적는 칸이 없다). "이제 인공지능의 계산 원리를 손으로 확인하겠습니다"로 연결한다. 발문 없음.'],
 35:['발문 없음(B의 뜻은 아직 배우지 않았다). 학습 목표 네 개를 읽어 주고 넘어간다.'],
 36:['세션 1의 시작이다. "먼저 뉴런의 연결을 보겠습니다"로 연다. "마지막 질문"이라고 말하지 않는다. 발문 없음.'],
 37:['활동지 1-1의 입력 2·3과 시범 줄 4 + 3 = 7은 이미 인쇄되어 있고 ŷ 전용 칸은 없다. 이 장에서는 아무것도 적게 하지 않는다. "눈으로 확인하세요"로만 안내한다. 동작 줄 없음.','x는 들어온 값, w와 b는 학습으로 바꿀 값, 곱해 더한 z가 ReLU를 지나 예측값이 된다는 연결 문장 하나를 남긴다.'],
 38:['[0] 회색 시범 줄은 인쇄되어 있으니 확인만. 기록은 둘째·셋째·넷째 줄의 z 칸과 관찰 괄호뿐이며, 각 값은 공개한 클릭 뒤에 적게 한다.'],
 39:['[0] 시범(b = 0, z = 5)은 인쇄되어 있다. 기록은 b = +3, −7 행의 z 칸과 "b가 하는 일" 칸. 공개 뒤에 적게 한다.'],
 40:['[0] z = −2의 답은 표 아래 "ŷ =" 빈칸에 적게 한다(표 첫 칸이 아니다. 표 첫 사례 z = −4의 시범 0은 인쇄됨). [4]에서 표의 나머지 네 칸을 채우게 한다.'],
 41:['[0] 1-4의 첫 행(시범)은 인쇄되어 있다. "첫 행은 확인만 하고 3 × 2 × 1 신경망 행을 채우겠습니다". 각 수는 공개한 클릭 뒤에 적게 한다. [4]·[8]의 선 합계·파라미터 합계는 묻지 않고 제공한다.'],
 43:['[1]·[3]만 묻는다. 선 개수와 파라미터 합계는 묻지 않고 한 묶음으로 제공한다.','은닉층을 여러 층 쌓은 그림을 읽는 것이 이 장의 역할이다.'],
 44:['세션 2의 시작이다. "이제 순전파를 계산하겠습니다"로 연다. "정리"라고 말하지 않는다. 발문 없음.'],
 45:['"첫 뉴런의 출력 h가 다음 뉴런의 입력 자리에 들어갑니다"를 반드시 말하고 그 경로를 가리킨다. 양수의 ReLU([3]·[7])는 묻지 않고 설명한다.'],
 46:['[1] h₁ = 3 시범은 인쇄되어 있다. 다시 적게 하지 않는다.','[2] 혼자 풀기 2분: "h₁ = 3은 시범입니다. 활동지 2-2의 h₂와 마지막 예측값 ŷ을 2분 동안 계산하세요. 점선의 세 가중치와 편향부터 찾으세요." 이 2분 동안 [3]의 h₂ 답을 공개하지 않는다.','[3]~[5]는 2분이 끝난 뒤 해설로 진행하며 [4]에서 다시 기다리지 않는다. 막힌 학생에게는 답 대신 "점선의 세 가중치와 b부터 찾으세요"라고 짚는다.'],
 47:['[1]·[3]·[4]의 값은 공개한 뒤에 적게 한다. 활동지에는 별도 h 행이 없으므로 "ReLU 있음 줄의 같은 칸 안에 h와 ŷ를 두 줄로 적으세요"라고 안내한다. 그래프는 학생이 그린다.','[6]·[8]만 묻는다. "ReLU가 없으면 이 식은 2x − 4라는 직선 하나로 합쳐지지만, ReLU를 넣으면 꺾인 모양을 만들 수 있습니다"를 남긴다.'],
 49:['세션 3의 시작이다. "이제 예측이 정답과 얼마나 다른지 숫자로 계산하겠습니다"로 연다. 손실·정확도·예측값 세 기준을 회상시키는 질문은 하지 않는다. 발문 없음.'],
 50:['[1]·[3]의 값은 공개한 뒤에 적게 한다. [5]·[7]만 묻는다.','"오차는 예측 빼기 정답이라 방향이 남고, 제곱해서 평균 낸 손실은 전체가 얼마나 틀렸는지 나타냅니다"를 남긴다.'],
 51:['[0] 정답 y(3, 5, 7, 9, 11)는 인쇄되어 있다. 적게 하지 않는다. 예측값·오차·제곱·합·평균만 채운다.','혼자 풀기 없음. [5]는 제곱 1, 4, 9, 16과 합 30을 함께 확인한다. [7]만 묻는다: "합 30을 왜 5로 나눌까요?" 그리고 "여기서 N은 점의 개수 5입니다"를 말한다.'],
 52:['세션 4-A의 시작이다. "이제 손실을 줄여 보겠습니다"로 연다. "오늘 수업은 여기까지"라고 말하지 않는다.'],
 53:['이 장의 계산표에 대응하는 활동지 작성표는 없다. 활동지에 아무것도 적게 하지 않는다("이 장의 계산은 화면으로만 확인합니다"). 동작 줄 없음.','연결 문장을 반드시 남긴다: "아까 예측식은 x + 2였지만 이제는 계산을 쉽게 하려고 w를 2로 고정하고 b만 바꿉니다. 정답 2x + 1을 빼면 모든 점의 오차가 b − 1로 같습니다. 오른쪽 그래프의 가로축은 입력 x가 아니라 b입니다."','b = 3에서 x = 1 한 사례만 설명하고 나머지 점과 b = −2는 묻지 않고 공개한다. [9]만 묻는다.'],
 54:['[2] b = −2 행은 활동지 4A-1의 시범이다. 기록은 b = 3, 1의 두 행과 아래 세 괄호(→, ←, 반대). "마지막 빈칸"은 없다.','[3]·[5]만 묻는다. [8]은 규칙을 짧게 정리하고 같은 질문을 반복하지 않는다. "기울기와 반대로 조금 움직입니다"라고 말한다.'],
 55:['활동지에 접선 기울기나 손실 4.5를 적는 칸은 없다. 아무것도 적게 하지 않는다. 동작 줄 없음.','[1]만 묻는다(접선의 세로 변화와 기울기). 나머지 클릭은 빠르게 공개하되 "½을 곱하지 않으면 −6, ½을 곱하면 이 예의 b 기울기가 오차 e와 같고 바닥 위치는 같습니다"는 남긴다. "곡선 위 서로 다른 두 점을 잇는 계산과 구별하세요"를 한 번 말한다.'],
 56:['[7] step 1은 활동지 4A-2의 시범(인쇄됨). 다시 적게 하지 않는다.','[8] 혼자 풀기 2분: "지금 b = −0.5, 기울기 −1.5입니다. 두 번째 줄의 새 b를 2분 동안 계산하세요. 먼저 끝나면 식에 빼기가 있는 이유를 생각하세요."','[9]~[10] 공개 뒤 "구한 0.25를 세 번째 줄의 지금 b에도 넣으세요". step 3([11]~[13])은 묻지 않고 식과 결과를 이어서 공개한다. 각 중간식마다 연산 순서를 다시 말하지 않는다.','[14]~[15]는 두 괄호(가까워집니다 / 작아집니다)를 적게 한다. [16]만 묻는다(빼기 이유). "이동 거리는 η에 기울기의 크기를 곱한 값"이라고 말한다. −3보다 −1.5가 작다고 말하지 않는다.'],
 57:['짧은 시연. 활동지 4A-3의 각 행에는 새 b·남은 거리·결과만 적게 한다: η = 0.05 → −1.85 / 2.85 / 느림, η = 2 → 4 / 3 / 진동, η = 2.5 → 5.5 / 4.5 / 발산. 두 번째 업데이트([8]·[13])의 숫자는 묻지 않고 화면으로만 확인한다.','[16]만 묻는다(두 학습률의 남은 거리 비교). [15]와 [16]에도 교사 줄을 반드시 쓴다. "느림도 수렴이고, 발산하면서 양옆을 오갈 수도 있습니다"를 한 번 말한다.'],
 58:['세션 4-B의 시작이다. "이번에는 기울기를 구해 w와 b를 함께 고치겠습니다"로 연다. "마지막 장"이라고 말하지 않는다. 발문 없음.'],
 59:['[0] 처음 상태는 4B-1의 시범(인쇄됨). 확인만. [6]의 정리 문장도 인쇄되어 있다. 실제 기록은 관찰 문항: 입력 3을 고르고 "늘어난 양" 빈칸에 1.5를 적게 한다.','[3]·[5]만 묻는다. 두 실험은 각각 처음 상태에서 가중치 하나만 바꾼다는 점을 짚는다.'],
 61:['"여기부터는 기울기 계산을 배우기 위해 활성화 함수 없는 선형 모델 ŷ = wx + b를 사용합니다"를 먼저 선언한다. "입력이 둘인 실험에서 입력 하나인 모델로 바뀝니다"라고 말한다(60장은 생략하므로). 발문 없음.'],
 62:['활동지에 ∂ 표기나 유도 값을 적는 칸이 없다. "62~65장은 적지 않고 화면의 연결을 봅니다. w가 예측을 바꾸고, 예측이 손실을 바꿉니다"라고 한 번 안내한다. 동작 줄 없음.','"기울기는 다른 값들을 고정하고 한 값을 아주 조금 바꿀 때의 변화 비율입니다"를 남긴다.'],
 63:['기록 없음. 동작 줄 없음. L = ½(ŷ − y)²에서 예측값 쪽 기울기가 e가 되는 과정만 말한다.'],
 64:['기록 없음. 동작 줄 없음. w가 예측을 바꾸는 비율은 x, b는 1이라고 말한다.'],
 65:['기록 없음. 동작 줄 없음. ∂는 "무엇에 대한 기울기인지 나타내는 기호"로 소개하고 분수의 약분처럼 설명하지 않는다.','[1]만 묻는다: "w 쪽에 곱하는 x는 어디에서 왔나요?"'],
 67:['공식(모델·오차·손실·기울기·업데이트)은 활동지 4-B 첫 상자에 인쇄되어 있다. 베끼게 하지 않는다. "해당 줄을 찾아 확인하고 빈칸 계산에 사용하세요".','"dw·db는 손실의 기울기이고, 실제로 더하는 변화량은 −η·dw, −η·db입니다. 이번 모델의 η는 0.05로 새로 정했습니다"를 말한다. 발문 없음.'],
 68:['[2]만 묻는다(오차). [3] 4B-5의 출발점 행은 시범(인쇄됨). 다시 적게 하지 않는다.','[5] 혼자 풀기 2분: "여기서 멈춥니다. e = −7과 인쇄된 식을 이용해 4B-3의 기울기와 방향, 4B-4의 업데이트를 2분 동안 계산하세요. 두 기울기는 모두 바꾸기 전의 같은 w와 b에서 구합니다." 이때 [6]~[10]을 공개하지 않는다. −21·−7을 미리 적게 하지 않는다.','[6]~[10]은 2분이 끝난 뒤 해설로 진행한다. [9]에서 다시 2분을 주지 않고 기다리지 않는다.','[11]은 묻는다(새 w, b로 예측과 손실 재계산, 60초). 24.5 → 6.125를 반드시 연결한다. "바꾸었다고 끝내지 말고 새 w, b로 예측과 손실을 다시 계산합니다".','[13]은 묻는다(방향·이동 거리). 활동지 4B-5 정리 문장의 괄호는 "반대", 빈칸에는 "학습률 η"만 적게 한다(η × 기울기의 크기 전체가 아니다). 이동 거리는 기울기의 크기로 읽는다.','[14] 마지막에 "줄어든 것은 점 (3, 7) 하나의 손실입니다. 이 한 점만으로 정답 직선 전체를 알아낸 것은 아닙니다. 도전은 먼저 끝난 사람이나 복습 때 풀고, 지금 비워 두어도 됩니다"를 말한다.'],
 70:['[0]만 묻는다(다음에 올 말을 예측한다는 답).'],
 73:['후보 목록에 "길"이 있는지 추측시키는 질문은 하지 않는다. 발문 없음. "언어 모델은 손실과 기울기를 계산하는 식이 더 복잡하지만, 손실을 줄이도록 파라미터를 고치는 흐름은 이어집니다"를 남긴다. 단어끼리 빼지 않는다고 말한다.'],
 74:['클릭 0~5를 화면과 맞춘다: [0] 파라미터 몇 개? 묻는다 → [1] 2를 끝-1 첫 빈칸에 적게 한다 → [2] 11 설명 → [3] "직접 세지는 않았지만 12,730개" 제공 → [4] 3B는 몇 개? 묻는다 → [5] 30억을 둘째 빈칸에 적게 하고 정리. 끝-1의 빈칸은 2와 30억 둘뿐이다. 11과 12,730은 적게 하지 않는다. 흐름 칸은 없다. [5] 교사 줄을 반드시 쓴다.'],
 75:['공식을 회상시키는 질문 네 개를 하지 않는다. 발문 없음. "오늘 계산한 선형 모델을 예로 들어 다섯 단어를 모두 사용해 자기 말로 설명하세요. 4분 동안 씁니다"로 운영한다. 동작: 끝-2에 4분 쓰게 한다.'],
}
BUDGET = {53:400,54:300,55:350,56:500,57:450,38:450,41:400,43:350,47:500,34:120,35:200}  # 교사 줄 합계 상한(공백 제외 글자)
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
진행 방식(함께 풀기): 시간이 90분뿐이라 학생에게 혼자 풀 시간을 주지 않습니다. 설계서에 "(질문·기다림)"으로 표시된 단계에서만 교사가 묻고 "먼저 모두 생각하세요"라고 한 뒤 학생이 답을 말하면 다음 클릭으로 공개합니다. "(질문 문장이지만 묻지 않음)"으로 표시된 단계는 화면에 물음표가 있어도 발문하지 않고 교사가 답을 이어 말합니다(발문: 줄을 쓰지 않습니다). 학생은 공개된 값을 활동지 칸에 받아 적습니다. "(혼자 풀기 2분)" 단계에서만 학생이 활동지 칸을 직접 계산할 2분을 줍니다.
분량: 공개 단계의 교사 줄은 한 문장이 원칙입니다. 설계서의 장별 지시에 "남긴다"고 적힌 연결 설명은 두세 문장을 허용합니다. 같은 클릭에서 질문을 예고한 뒤 발문에서 다시 묻지 않습니다("얼마인지 묻겠습니다" 금지). 화면 식 전체를 읽고 같은 뜻을 다시 풀어 말하지 않습니다.
활동지 기록: 장별 지시에 적힌 칸만 적게 합니다. 활동지에 이미 인쇄된 시범 값·정답·공식을 다시 적게 하지 않습니다. 지시에 "기록 없음"이면 동작 줄을 쓰지 않습니다. "적게 한다"는 값을 공개한 클릭에만 붙이고, 답을 공개하기 전 클릭에는 붙이지 않습니다.
장별 지시는 반드시 따릅니다. 지시와 화면 문장이 다르면 지시를 따릅니다.
규칙:
- 교사 말은 합쇼체(~합니다, ~입니다). 짧고 또렷하게. 은유·과장 없이. 대시(—) 연결 금지. "견주다"·"쓰다"(사용 의미) 금지.
- 화면에 적힌 숫자·기호·식만 말합니다. 설계서에 없는 수치나 사실을 지어내지 않습니다.
- "(질문·기다림)" 단계에만 발문: 줄을 씁니다. "계산할 시간을 주겠습니다", "직접 계산해 보십시오" 같은 말은 (혼자 풀기 2분) 단계에서만 씁니다. 공개 단계에서는 답을 확인하며 짧게 설명합니다.
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
        q = any(is_question(c) for c in st['caps']); mark = '(혼자 풀기 2분) ' if (sl['n'], st['k']) in SOLO else ('(질문·기다림) ' if st['k'] in WAITQ.get(sl['n'], set()) else ('(질문 문장이지만 묻지 않음) ' if q else ''))
        lines.append(f"  [{st['k']}] {mark}{caps}")
    extra = [t for t in sl['steps'][-1]['all'] if len(t) > 1][:60]
    lines.append("마지막 단계에 화면에 보이는 그 밖의 글자(표·배지): " + ' | '.join(extra)[:900])
    if sl['notes']: lines.append("발표자 노트(교사용 메모): " + ' / '.join(sl['notes']))
    if sl['n'] in SKIP: lines.append("이 장은 " + SKIP[sl['n']] + " 교사 줄은 [0]에 한두 문장만 쓴다(무엇을 생략하고 무엇으로 대신하는지). 발문·동작 없음.")
    if sl['n'] in DIRECTIVES: lines.append("이 장의 운영 지시(반드시 따른다):\n" + '\n'.join('- ' + d for d in DIRECTIVES[sl['n']]))
    if sl['n'] in BUDGET: lines.append(f"분량 상한(반드시 지킨다): 이 장의 교사: 줄을 모두 합쳐 공백 제외 {BUDGET[sl['n']]}자 이내. 공개 단계는 한 문장, 같은 연산 순서를 매번 다시 말하지 않는다. 화면 식은 읽지 말고 가리킨다.")
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
        # 분량 상한 초과 시 압축 패스(최대 2회)
        if n in BUDGET and not DRY:
            def say_len(t): return sum(len(re.sub(r'\s', '', m)) for m in re.findall(r'^\[k?\d+\]\s*교사\s*:\s*(.*)$', t, re.M))
            for _ in range(2):
                L = say_len(text)
                if L <= BUDGET[n]: break
                print(f'  압축 {n}: {L}자 → 상한 {BUDGET[n]}자')
                text = solar(f"아래 교사 스크립트의 '교사:' 줄만 줄이십시오. 모든 교사: 줄의 글자 수 합계(공백 제외)가 {BUDGET[n]}자 이내가 되게 합니다. 각 교사: 줄은 한 문장이 원칙이고, 숫자·기호·식은 바꾸지 않으며, 발문:·동작:·반응 줄과 단계 번호·형식은 그대로 둡니다. 장별 운영 지시에 '남긴다'고 한 연결 설명은 짧게라도 남깁니다. 출력은 스크립트 전체(같은 형식)만.\n\n" + text, "당신은 교사 스크립트를 분량에 맞게 줄이는 편집자입니다. 요청한 형식만 출력합니다.") or text
            cache[key] = text
            json.dump(cache, open(CACHE, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
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
    if n in SKIP: frag.append(f'<p class="op90">⏱ {esc(SKIP[n])}</p>')
    if nsteps > 0 or any(sl['steps'][0]['caps']):
        frag.append('<table class="tb steps"><tr><th>클릭</th><th>화면에 나오는 문장</th><th>진행</th></tr>')
        for st in sl['steps']:
            caps = '<br>'.join(esc(c) for c in st['caps']) or '<span class="dim">(그림만)</span>'
            q = any(is_question(c) for c in st['caps'])
            solo = (n, st['k']) in SOLO
            wait = st['k'] in WAITQ.get(n, set())
            cell = '<b>혼자 풀기 2분</b>' if solo else ('함께 풀기' if wait else ('공개·설명(묻지 않음)' if q else '공개·설명'))
            trcls = ' class="solo"' if solo else ''
            frag.append(f'<tr{trcls}><td>{st["k"]}</td><td>{caps}</td><td>{cell}</td></tr>')
        frag.append('</table>')
    if sl['script']:
        frag.append(render_script(sl['script'], sl['tag']))
    elif sl['notes']:
        body = [t for t in sl['notes'] if not t.startswith('원본:')]
        for t in sl['notes']:
            if t.startswith('원본:'): frag.append(f'<p class="meta">{esc(t)}</p>')
        if body:
            key = f'intro{n}'
            if key not in cache or not cache[key]:
                print('솔라 요약', n)
                cache[key] = solar("다음은 특강 도입부 슬라이드의 발표자 노트입니다. 교사가 이 장에서 말할 내용을 합쇼체 한두 문장(공백 포함 70자 이내)으로 줄여 주세요. 인물 이력·연도 나열·수상 목록은 빼고 수업과 이어지는 핵심만 남깁니다. 은유·과장 없이. 출력은 그 문장만.\n\n노트:\n" + ' / '.join(body)[:1500], "당신은 중학교 특강 교사 스크립트를 짧게 다듬는 편집자입니다. 요청한 문장만 출력합니다.")
                json.dump(cache, open(CACHE, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
            frag.append(f'<div class="sc say"><span class="lab">교사</span>{esc(cache[key].strip())}</div>')
            frag.append(f'<p class="meta dim">원본 노트: {esc(" / ".join(body))[:600]}</p>')
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
<li>장마다 <strong>화면에 나오는 문장</strong>을 클릭 순서대로 표에 적었다. "함께 풀기"는 교사가 묻고 학생이 답을 말하면 바로 공개하는 단계(33곳), "공개·설명(묻지 않음)"은 화면에 물음표가 있어도 묻지 않고 교사가 답을 이어 말하는 단계, "혼자 풀기 2분"(초록 줄, 세 군데)은 학생이 활동지 칸을 직접 계산하는 단계, "공개·설명"은 답을 보이며 설명하는 단계다.</li>
<li><strong>교사</strong>는 말할 내용, <strong>발문</strong>은 묻고 기다릴 질문, <strong>동작</strong>은 교사가 할 일이다. 번호는 그 장의 클릭 번호(0은 처음 화면)다.</li>
<li>1~33장은 세종특강 원본 도입부라 원본 덱의 노트를 그대로 적었다. 34~75장의 교사 발화는 설계서를 바탕으로 솔라 프로4가 집필했고, 숫자는 화면·활동지와 대조했다.</li>
<li>슬라이드 주소: <span class="mono">https://neural-explorer.vercel.app/#/lecture/N</span> (N은 장 번호). 오프라인은 번들의 index.html. 다음 →/←, 전체 화면 F, 발표자 노트 N.</li>
</ul>
<div class="box90"><h2>함께 풀기 운영안 (2026-10-16, 코덱스 사실 확인 반영)</h2>
<p>학생에게 혼자 풀 시간을 주지 않고 교사와 함께 풉니다. 아래 표의 <b>"함께 풀기"</b>(33곳)에서만 묻고 "먼저 모두 생각하세요"라고 한 뒤 학생이 답을 말하면 다음 클릭으로 공개합니다. <b>"공개·설명(묻지 않음)"</b>은 화면에 물음표가 있어도 묻지 않고 교사가 답을 이어 말합니다. 학생은 공개된 값만 활동지에 받아 적습니다. 인쇄된 시범 값·정답·공식은 다시 적지 않습니다.</p>
<ul>
<li><b>혼자 풀기 2분 (초록 줄, 세 군데)</b>: 46장 클릭 2(2-2의 h₂와 ŷ), 56장 클릭 8(4A-2 step 2의 새 b), 68장 클릭 5(4B-3 기울기·방향과 4B-4 업데이트). 2분 동안 다음 클릭의 답을 공개하지 않습니다.</li>
<li><b>기본 경로에서 생략</b>: 42장(손글씨 신경망 세기, 복습으로), 48장(활성화 랩), 60장(입력 하나 실험), 66장(뉴런 그림 유도), 69장(도전). 각 장 머리에 대신 말할 것을 적었습니다.</li>
<li><b>12·16장 영상은 1분씩만</b> 틀고 요약합니다. 75장 자기 말로 쓰기 4분은 남깁니다.</li>
<li><b>수업 중 비워 두는 활동지 칸</b>: 1-4 손글씨 신경망 행, 도전. 학생에게 "오늘 계산할 칸과 복습으로 남길 칸이 있습니다"라고 처음에 알립니다.</li>
</ul>
<table><tr><th>시간 항목</th><th>추정</th><th>기준</th></tr>
<tr><td>교사 발화</td><td>약 49분</td><td>압축 발화 약 13,100자 ÷ 분당 270자(질문 읽기·해설 포함)</td></tr>
<tr><td>수식 읽기 보정</td><td>약 3.5분</td><td>36~69장 발화의 10% (가정)</td></tr>
<tr><td>학생 생각·응답</td><td>약 10분</td><td>질문 33개: 단순 확인 10초, 묶음 20초, 이유 30초, 68장 손실 재계산 60초 (가정)</td></tr>
<tr><td>필기·그래프·글쓰기</td><td>약 19.5분</td><td>세션1 3.5, 세션2 4(그래프 포함), 세션3 2, 4-A 3, 4-B 2.5, 마무리 4.5(글쓰기 4) (가정)</td></tr>
<tr><td>혼자 풀기</td><td>6분</td><td>2분 × 3</td></tr>
<tr><td>영상</td><td>2분</td><td>12·16장 각 1분</td></tr>
<tr><td>전환</td><td>약 3.5분</td><td>영상 시작·종료, 활동지 위치 찾기, 타이머 (가정)</td></tr>
<tr><td><b>합계</b></td><td><b>약 93분</b></td><td>발화 속도 분당 240~300자면 약 88~99분. <b>90분 완료로 판정할 수 없습니다.</b> 예기치 않은 질문·오답 처리 여유는 없습니다.</td></tr></table>
<p>리허설 기준: 시작 후 40분까지 세션 3, 57분까지 4-A, 78분까지 4-B를 마쳐야 합니다. 뒤처지면 추가 시연과 마무리 확장을 먼저 줄이고, 4-B의 유도 연결과 손실 확인은 빠른 낭독으로 밀어붙이지 않습니다. 도입·세션 2·마무리가 배정보다 길어지기 쉬운 구간입니다.</p></div>
{''.join(body)}
</body></html>'''
open(OUT, 'w', encoding='utf-8').write(doc)
print('저장', OUT, '장', len(slides), '솔라 집필', sum(1 for s in slides if s['script']))
if warn:
    print('수치 경고(화면·활동지에 없는 숫자):')
    for n, bad in warn: print(' ', n, bad)
