// 페이즈 5의 갱신 식 (w ← w − η · dw, dw = 평균(e·x))이 어디에서 왔는지를
// 한 줄씩 풀어 보여준다. 부호 약속은 페이즈 5 본문과 동일하게 e = ŷ − y (예측 − 정답).
// 미분이라는 단어는 사용하지 않고 "기울기"로 통일. (∂SE/∂w = "SE의 w에 대한 기울기")
// 결론: 11단계의 복잡한 식이 마지막에 매우 깔끔한 한 줄로 정리된다.

const STEPS: { id: number; expr: string; why: string; highlight?: boolean }[] = [
  {
    id: 1,
    expr: 'SE = (ŷ − y)²',
    why: '한 점의 오차의 제곱. 부호와 무관하게 "얼마나 어긋났는가"만 본다. (ŷ − y가 이 페이지의 오차 e의 정의)',
  },
  {
    id: 2,
    expr: 'L := ½ × (ŷ − y)²',
    why: 'SE 자체는 그대로 두고, 미분 편의를 위한 새 기호 L을 도입한다. ½을 곱해도 최소가 되는 위치는 똑같으니 L과 SE는 "최소를 찾는 문제"로는 동치 — 다만 기울기를 구할 때 ½ × 2가 1로 깔끔히 사라진다.',
  },
  {
    id: 3,
    expr: 'w ← w − ∂L/∂w',
    why: '갱신의 출발 식. (정식으로는 처음부터 학습률 η가 곱해지지만, 식의 모양을 보기 위해 일단 η = 1로 두고 시작 — η는 11단계에서 다시 끼워 넣는다.) ∂L/∂w = "L의 w에 대한 기울기" — w를 살짝 바꿀 때 L이 얼마나 변하는지의 비율. 그 반대 방향으로 가면 L이 줄어든다.',
  },
  {
    id: 4,
    expr: 'w ← w − ∂/∂w · ½ (ŷ − y)²',
    why: '③의 ∂L/∂w 자리에 ②의 L 정의를 그대로 끼워 넣는다.',
  },
  {
    id: 5,
    expr: 'w ← w − ½ × 2(ŷ − y) · ∂/∂w (ŷ − y)',
    why: '제곱 (□)²의 기울기는 2 × □. 그리고 그 안의 □가 또 w에 의존하므로 안쪽 (ŷ − y)의 기울기를 한 번 더 곱한다 (변화의 사슬).',
  },
  {
    id: 6,
    expr: 'w ← w − (ŷ − y) · ∂/∂w (wx + b − y)',
    why: '½ × 2 = 1이라 깔끔히 사라진다. 그리고 ŷ = wx + b였으니 (ŷ − y) = (wx + b − y)로 바꿔 적는다.',
  },
  {
    id: 7,
    expr: 'w ← w − (ŷ − y) · x',
    highlight: true,
    why: '(wx + b − y)에서 w가 1만큼 변하면 식 전체는 x만큼 변한다 (b·y는 w와 무관). 결과는 매우 깔끔한 한 줄. e = ŷ − y이므로 곧 w ← w − e · x.',
  },
];

const STEPS_B: { id: number; expr: string; why: string; highlight?: boolean }[] = [
  {
    id: 8,
    expr: 'b ← b − ∂L/∂b',
    why: 'b도 같은 방식. b의 갱신은 L의 b에 대한 기울기의 반대 방향으로 (여기서도 일단 η = 1).',
  },
  {
    id: 9,
    expr: 'b ← b − (ŷ − y) · ∂/∂b (wx + b − y)',
    why: 'w와 같은 절차. 안쪽 (wx + b − y)의 b에 대한 기울기는?',
  },
  {
    id: 10,
    expr: 'b ← b − (ŷ − y)',
    why: '(wx + b − y)에서 b가 1만큼 변하면 식 전체도 1만큼 변한다 → (ŷ − y) × 1. 결과는 단순히 b ← b − e.',
  },
];

// 결론 직전 — 한 점 식에 학습률 η를 도입하는 마지막 단계
const STEPS_LR: { id: number; expr: string; why: string; highlight?: boolean }[] = [
  {
    id: 11,
    expr: 'w ← w − η · (ŷ − y) · x',
    highlight: true,
    why: '③에서 잠시 빼두었던 학습률 η를 다시 끼워 넣는다. 한 점의 기울기 (ŷ − y) · x를 그대로 빼면 한 step에 너무 멀리 튀어 나갈 수 있어서 보폭 조절용 작은 양수 η를 곱한다. 보통 0보다 크고 1보다 작은 작은 값(예: 0.01 ~ 0.1)을 쓰지만, 모델·데이터에 따라 더 클 수도 있다.',
  },
  {
    id: 12,
    expr: 'b ← b − η · (ŷ − y)',
    highlight: true,
    why: 'b도 마찬가지. 같은 학습률 η를 곱해 보폭을 맞춘다.',
  },
];

// 페이즈 5의 "수식 유도" 탭에서도 동일 본문을 재사용하도록 헤더 없이 노출.
export function DerivationContent() {
  return (
    <>
      <p className="text-muted">
        페이즈 5의 갱신량 <code>e · x</code>와 <code>e</code>가 어디에서 왔는지, 식을 한 줄씩 풀어가는 과정을 가볍게 따라가 봅니다.
        외울 필요는 없어요 — <strong>"아 이렇게 차근차근 약분하면 결국 깔끔한 한 줄이 되는구나"</strong> 정도만 눈에 들어오면 충분합니다.
      </p>

      <div className="aside-tip mt-3 text-sm">
        <div className="font-medium">기호 약속 (페이즈 5 본문과 동일)</div>
        <ul className="mt-2 list-disc pl-5 space-y-1 text-muted">
          <li><code>y</code> = 정답, <code>ŷ = w · x + b</code> = 예측</li>
          <li><code>e = ŷ − y</code> = 한 점의 오차 (예측 − 정답)</li>
          <li><code>SE</code> (Squared Error) = <code>e²</code> = 한 점의 오차 제곱</li>
          <li><code>L = ½·SE</code> = 미분 편의를 위해 ½을 곱한 손실 (최소가 되는 위치는 SE와 동일)</li>
          <li>
            <code>∂L/∂w</code> = "<strong>L의 w에 대한 기울기</strong>" =
            "<code>w</code>를 살짝 바꿀 때 <code>L</code>이 얼마나 변하는지의 비율"
          </li>
          <li>
            <strong>출발 원리</strong>: 기울기는 L이 가장 빠르게 <em>증가</em>하는 방향.
            우리는 L을 <em>감소</em>시키고 싶으니 그 <strong>반대 방향(=빼기)</strong>으로 옮긴다.
          </li>
          <li>
            <strong>활성화 함수 가정</strong>: 본 유도는 <code>ŷ = w·x + b</code>로 진행한다 (즉 ReLU′ = 1인 영역, 페이즈 5의 학습 데이터처럼 z &gt; 0인 구간).
            ReLU′가 0인 영역에서는 그 점이 갱신에 기여하지 않는다는 작은 차이만 생기고, 식의 뼈대는 동일.
          </li>
        </ul>
        <p className="mt-2 text-xs text-muted">
          ※ 이 페이지에서는 <em>미분</em>이라는 단어 대신 <strong>기울기</strong>로 통일합니다.
          미분을 배우지 않아도 "변화의 비율"이라는 직관만 있으면 모든 단계를 따라갈 수 있어요.
        </p>
      </div>

      <h2>w 업데이트 식 유도 — 7단계</h2>
      <p className="text-sm text-muted">
        그냥 위에서 아래로 쭉 훑어보세요. 회색 한 줄 설명만 곁눈질하면 "왜 이렇게 바뀌었구나"가 보입니다.
      </p>
      <div className="mt-3 space-y-2">
        {STEPS.map((s) => <DerivStep key={s.id} step={s} />)}
      </div>

      <h2>b 업데이트 식 유도 — 같은 절차로 3단계</h2>
      <p className="text-sm text-muted">
        <code>b</code>도 똑같이 풉니다. <code>w</code>의 자리를 <code>b</code>로 바꾸기만 하면 돼요.
      </p>
      <div className="mt-3 space-y-2">
        {STEPS_B.map((s) => <DerivStep key={s.id} step={s} />)}
      </div>

      <h2>학습률 η 도입 — 보폭 조절 한 단계</h2>
      <p className="text-sm text-muted">
        지금까지 나온 식은 "기울기 그 자체"만큼 빼는 식이에요. 그런데 그 양이 한 step에 너무 클 수 있으니
        <strong> 보폭을 조절하는 작은 양수 <code>η</code>(에타)</strong>를 곱해 줍니다. 이걸 <strong>학습률</strong>이라고 부르고,
        페이즈 5의 슬라이더로 조절했던 그 값이에요.
      </p>
      <div className="mt-3 space-y-2">
        {STEPS_LR.map((s) => <DerivStep key={s.id} step={s} />)}
      </div>

      <h2>결론 — 매우 깔끔한 두 줄</h2>
      <div className="card p-5 mt-3 bg-accent/5 border-accent/40">
        <div className="text-center font-mono text-lg space-y-3">
          <div>
            <span className="text-muted text-sm">새 w =</span>{' '}
            w − η · <span className="text-accent font-bold">(ŷ − y) · x</span>{' '}
            = w − η · <span className="text-accent font-bold">e · x</span>
          </div>
          <div>
            <span className="text-muted text-sm">새 b =</span>{' '}
            b − η · <span className="text-accent font-bold">(ŷ − y)</span>{' '}
            = b − η · <span className="text-accent font-bold">e</span>
          </div>
        </div>
        <p className="text-sm text-muted mt-4 leading-relaxed">
          12단계의 ∂·½ 같은 것들이 <strong>약분(½ × 2 = 1)</strong>을 거치며 모두 사라지고,
          남은 건 그저 <strong>"오차에 입력 x를 곱한 양에 보폭 η를 곱하기"</strong>(w 쪽)와
          <strong> "오차에 보폭 η를 곱하기"</strong>(b 쪽)입니다. 이게 바로 페이즈 5에서 보던 갱신 식의 정체예요.
        </p>
      </div>

      <h2>여러 점이면? — 평균</h2>
      <p className="text-sm text-muted">
        지금까지의 식은 모두 <strong>한 점</strong>에서 만들어진 거예요.
        데이터가 <strong>N개</strong>이면 점마다 같은 식을 한 번씩 만든 뒤 그 값들을 <strong>평균</strong>낸 게
        페이즈 5에서 보던 <code>dw</code>·<code>db</code>입니다.
      </p>
      <div className="card p-4 mt-3 space-y-3">
        <div>
          <div className="text-xs text-muted mb-1.5">w의 변화량</div>
          <div className="font-mono text-base">
            <code>dw</code> = 평균(<span className="text-accent">e · x</span>) =
            <span className="text-muted"> (e</span><sub>1</sub><span className="text-muted">·x</span><sub>1</sub>
            <span className="text-muted"> + ⋯ + e</span><sub>N</sub><span className="text-muted">·x</span><sub>N</sub>
            <span className="text-muted">) ÷ N</span>
          </div>
        </div>
        <div className="border-t border-border pt-3">
          <div className="text-xs text-muted mb-1.5">b의 변화량</div>
          <div className="font-mono text-base">
            <code>db</code> = 평균(<span className="text-accent">e</span>) =
            <span className="text-muted"> (e</span><sub>1</sub>
            <span className="text-muted"> + ⋯ + e</span><sub>N</sub>
            <span className="text-muted">) ÷ N</span>
          </div>
        </div>
        <div className="border-t border-border pt-3">
          <div className="text-xs text-muted mb-1.5">최종 갱신 식 (페이즈 5의 한 step)</div>
          <div className="font-mono text-base space-y-1">
            <div>새 w = w − η · <span className="text-accent">dw</span></div>
            <div>새 b = b − η · <span className="text-accent">db</span></div>
          </div>
        </div>
      </div>
    </>
  );
}

function DerivStep({ step }: { step: { id: number; expr: string; why: string; highlight?: boolean } }) {
  return (
    <div className={`card p-3 ${step.highlight ? 'border-accent bg-accent/5' : ''}`}>
      <div className="flex items-start gap-3">
        <div className={`shrink-0 w-7 h-7 rounded-full text-xs font-mono flex items-center justify-center ${step.highlight ? 'bg-accent text-white' : 'bg-accent/15 text-accent'}`}>
          {step.id}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`font-mono text-base sm:text-lg ${step.highlight ? 'text-accent font-bold' : ''}`}>
            {step.expr}
          </div>
          <div className="text-xs text-muted mt-1.5 leading-relaxed">
            {step.why}
          </div>
        </div>
      </div>
    </div>
  );
}
