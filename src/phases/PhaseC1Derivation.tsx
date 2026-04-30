// 역전파 식 유도 카드 — A4 스타일(KaTeX 단계별 펼치기)을 C1에 맞춰 확장.
// 모든 식은 합성 함수의 미분 = 사슬규칙에서 한 줄씩 나오고,
// 각 단계 옆에 *지금 사이클의 수치 대입*도 같이 보여 다이어그램의 숫자와 연결한다.
import { useState } from 'react';
import { BlockMath } from 'react-katex';

interface Args {
  w1: number; b1: number; w2: number; b2: number;
  x: number; y: number;
  z1: number; h: number; z2: number; yhat: number;
  e: number; reluP: 0 | 1;
  dw2: number; db2: number;
  eh: number; ez1: number;
  dw1: number; db1: number;
}

interface DerivStep {
  tex: string;
  why: string;
  numeric?: string;
  highlight?: boolean;
}

function buildSteps(a: Args): DerivStep[] {
  const f = (n: number, d = 2) => n.toFixed(d);
  const fSign = (n: number) => (n < 0 ? `(${f(n)})` : f(n)); // 음수는 괄호
  return [
    {
      tex:
        `\\begin{aligned}` +
        `L &= \\tfrac{1}{2}(\\hat{y} - y)^2 \\\\ ` +
        `\\hat{y} &= z_2 = w_2 h + b_2 \\\\ ` +
        `h &= \\text{ReLU}(z_1) \\\\ ` +
        `z_1 &= w_1 x + b_1` +
        `\\end{aligned}`,
      why:
        '함수 합성 — x 한 점이 두 층을 통과해 손실 L까지 가는 전체 식. ' +
        '아래 모든 그래디언트는 이 합성에서 *사슬규칙*으로 한 줄씩 나옵니다.',
    },
    {
      tex: `e \\equiv \\dfrac{\\partial L}{\\partial \\hat{y}} = \\hat{y} - y`,
      why:
        '½·(ŷ−y)² 을 ŷ에 대해 미분 — ½과 2가 약분되어 깔끔하게 e. ' +
        'A2에서 정의한 e가 *모든 그래디언트의 출발점*임이 식에서 보입니다.',
      numeric: `= ${f(a.yhat)} - ${a.y} = ${f(a.e)}`,
    },
    {
      tex:
        `\\begin{aligned}` +
        `\\dfrac{\\partial L}{\\partial w_2} ` +
        `&= \\dfrac{\\partial L}{\\partial \\hat{y}} \\cdot \\dfrac{\\partial \\hat{y}}{\\partial w_2} \\\\ ` +
        `&= e \\cdot h` +
        `\\end{aligned}`,
      why:
        'w₂ → ŷ → L 사슬. ŷ = w₂h + b₂에서 w₂가 1 변하면 ŷ은 h만큼 변하므로 ' +
        '곱해지는 것은 h. A4의 *e·x* 모양 그대로 — "그 층의 입력"이 x에서 h로 바뀐 것.',
      numeric: `= ${fSign(a.e)} \\cdot ${f(a.h)} = ${f(a.dw2)}`,
      highlight: true,
    },
    {
      tex: `\\dfrac{\\partial L}{\\partial b_2} = e \\cdot 1 = e`,
      why: 'b₂는 항상 1이 곱해지는 상수항이라 곱해질 게 1. A4와 같은 패턴.',
      numeric: `= ${f(a.db2)}`,
      highlight: true,
    },
    {
      tex:
        `\\begin{aligned}` +
        `e_h \\equiv \\dfrac{\\partial L}{\\partial h} ` +
        `&= \\dfrac{\\partial L}{\\partial \\hat{y}} \\cdot \\dfrac{\\partial \\hat{y}}{\\partial h} \\\\ ` +
        `&= e \\cdot w_2` +
        `\\end{aligned}`,
      why:
        '★ h → ŷ → L 사슬. ŷ = w₂h + b₂에서 *h가 1 변하면 ŷ은 w₂만큼 변한다* — ' +
        '그래서 거꾸로 흐를 때도 같은 w₂가 곱해집니다. ' +
        '"w₂를 거꾸로 통과"라는 비유의 정확한 의미가 바로 이 한 줄.',
      numeric: `= ${fSign(a.e)} \\cdot ${f(a.w2)} = ${f(a.eh)}`,
      highlight: true,
    },
    {
      tex:
        `\\begin{aligned}` +
        `e_{z_1} \\equiv \\dfrac{\\partial L}{\\partial z_1} ` +
        `&= \\dfrac{\\partial L}{\\partial h} \\cdot \\dfrac{\\partial h}{\\partial z_1} \\\\ ` +
        `&= e_h \\cdot \\text{ReLU}'(z_1)` +
        `\\end{aligned}`,
      why:
        '★ z₁ → h → L 사슬. h = ReLU(z₁)이라 ∂h/∂z₁ = ReLU′(z₁) — z₁ > 0이면 1, ≤ 0이면 0. ' +
        '*ReLU 문지기*가 식에 등장하는 자리. 이번 사이클은 z₁ > 0이라 1이 곱해져 ' +
        'e_h와 e_z₁이 같은 수치가 되지만, *통과 단계 자체는 식에 명시*됩니다.',
      numeric:
        `= ${fSign(a.eh)} \\cdot ${a.reluP} = ${f(a.ez1)}` +
        (a.reluP === 1 ? '\\;\\;\\text{(문지기 열림)}' : '\\;\\;\\text{(문지기 막힘)}'),
      highlight: true,
    },
    {
      tex:
        `\\begin{aligned}` +
        `\\dfrac{\\partial L}{\\partial w_1} ` +
        `&= \\dfrac{\\partial L}{\\partial z_1} \\cdot \\dfrac{\\partial z_1}{\\partial w_1} \\\\ ` +
        `&= e_{z_1} \\cdot x` +
        `\\end{aligned}`,
      why:
        'w₁ → z₁ → h → ŷ → L의 긴 사슬을 적은 결과 — 마지막 곱은 z₁ = w₁x + b₁에서 ' +
        '∂z₁/∂w₁ = x. 다시 *e·x* 모양 (e 자리에 z₁까지 거꾸로 흘러온 e_z₁).',
      numeric: `= ${fSign(a.ez1)} \\cdot ${a.x} = ${f(a.dw1)}`,
      highlight: true,
    },
    {
      tex: `\\dfrac{\\partial L}{\\partial b_1} = e_{z_1} \\cdot 1 = e_{z_1}`,
      why:
        'b₁도 같은 패턴. *모든 층에서 d_가중치 = (그 층의 오차) × (그 층의 입력)* 모양이 ' +
        '한 패턴으로 완성됩니다.',
      numeric: `= ${f(a.db1)}`,
      highlight: true,
    },
  ];
}

export function BackpropDerivation(props: Args) {
  const STEPS = buildSteps(props);
  const [step, setStep] = useState(1);

  return (
    <div className="card p-4 mt-4">
      <div className="flex items-baseline justify-between">
        <div className="text-sm font-medium">역전파 식 유도 — 한 줄씩 펼치기</div>
        <div className="text-[11px] text-muted font-mono">
          {Math.min(step, STEPS.length)} / {STEPS.length}
        </div>
      </div>
      <p className="text-[11.5px] text-muted mt-1 leading-snug">
        모든 식은 <strong>사슬규칙(연쇄법칙)</strong>에서 한 줄씩 나옵니다.
        다이어그램의 빨간 화살표 하나하나가 여기서 *왜 그 모양인가*를 따라가요.
        각 단계 옆 <span style={{ color: 'rgb(190,18,60)' }}>붉은 줄</span>은 *지금 사이클의 수치 대입*.
      </p>

      <div className="mt-3 space-y-2">
        {STEPS.slice(0, step).map((s, i) => (
          <div
            key={i}
            className={`rounded-md border p-2.5 ${
              s.highlight ? 'border-accent bg-accent-bg/40' : 'border-border bg-surface/40'
            }`}
          >
            <div className="flex items-start gap-2">
              <div
                className={`shrink-0 w-5 h-5 rounded-full text-[11px] font-mono flex items-center justify-center ${
                  s.highlight ? 'bg-accent text-white' : 'bg-accent/15 text-accent'
                }`}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`overflow-x-auto text-[14px] ${s.highlight ? 'font-semibold' : ''}`}>
                  <BlockMath math={s.tex} />
                </div>
                {s.numeric && (
                  <div
                    className="overflow-x-auto text-[12.5px] -mt-1"
                    style={{ color: 'rgb(190,18,60)' }}
                  >
                    <BlockMath math={s.numeric} />
                  </div>
                )}
                <div className="text-[11px] text-muted mt-1 leading-snug">{s.why}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-3">
        {step < STEPS.length ? (
          <button
            onClick={() => setStep((s) => Math.min(s + 1, STEPS.length))}
            className="btn-primary text-sm py-1.5 px-3"
          >
            다음 단계 펼치기 →
          </button>
        ) : (
          <div className="text-[12px] text-muted py-1.5">
            ✓ 모든 단계를 펼쳤어요. 다이어그램의 빨간 화살표 하나하나가 사슬규칙의 한 줄임을
            확인했나요?
          </div>
        )}
        {step > 1 && step < STEPS.length && (
          <button
            onClick={() => setStep((s) => Math.max(s - 1, 1))}
            className="btn-ghost text-sm py-1.5 px-3"
          >
            ← 접기
          </button>
        )}
        {step < STEPS.length && (
          <button
            onClick={() => setStep(STEPS.length)}
            className="btn-ghost text-sm py-1.5 px-3 ml-auto"
          >
            모두 펼치기
          </button>
        )}
        {step === STEPS.length && (
          <button
            onClick={() => setStep(1)}
            className="btn-ghost text-sm py-1.5 px-3 ml-auto"
          >
            처음부터
          </button>
        )}
      </div>
    </div>
  );
}
