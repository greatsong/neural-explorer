// PhaseD2 — 한 뉴런에서 두 뉴런으로 (역전파 스캐폴딩)
// A4 의 한 줄 식 dw = e·x 를 두 자리 패턴 (끝점 오차 × 직전 입력값) 으로 일반화한 뒤,
// 2층 네트워크에 같은 식을 두 번 적용하는 흐름을 11 단계로 점진 공개.
// 다이어그램 한 장이 매 단계마다 새 요소를 켜며 학생이 시선을 잃지 않게 한다.

import { useEffect, useState } from 'react';
import { useApp } from '../store';
import { PHASES } from '../phases';

// 예시 셋업 — 활성화·편향 없이 단순 곱으로 흐름만 본다.
const X = 2;
const W1 = 0.5;
const W2 = 0.8;
const Y_TARGET = 1.0;

const H = W1 * X;          // 1.0
const Y_HAT = W2 * H;      // 0.8
const E = Y_HAT - Y_TARGET; // -0.2
const W2_GRAD = E * H;      // -0.2
const H_ERROR = E * W2;     // -0.16
const W1_GRAD = H_ERROR * X; // -0.32

interface Step {
  title: string;
  body: React.ReactNode;
  formula?: React.ReactNode;
  highlight?: boolean;
}

const STEPS: Step[] = [
  {
    title: '① 셋업 — 두 단계짜리 작은 신경망',
    body: (
      <>
        입력 <code>x = 2</code> 가 첫 가중치 <code>w₁ = 0.5</code> 를 거쳐 <strong>중간 뉴런(은닉층/중간층)</strong> 으로,
        다시 마지막 가중치 <code>w₂ = 0.8</code> 을 거쳐 출력 뉴런으로 흐릅니다. 정답은 <code>y = 1.0</code>.
        활성화·편향 없이 곱셈만으로 흐름을 보겠습니다.
      </>
    ),
  },
  {
    title: '② 앞으로 첫 곱 — 가중치 = 비율',
    body: (
      <>
        가중치는 <strong>입력 신호를 다음 뉴런으로 얼마나 보낼지 정하는 비율</strong> 이에요. <code>w₁ = 0.5</code> 면
        입력의 절반만큼 다음으로 보낸다는 뜻. 그래서 중간 뉴런 출력 <code>h = w₁ · x = 0.5 × 2 = 1.0</code>.
      </>
    ),
    formula: <>h = w₁ · x = 0.5 × 2 = <strong>1.0</strong></>,
  },
  {
    title: '③ 앞으로 두 번째 곱 — 같은 패턴 반복',
    body: (
      <>
        출력 뉴런도 똑같은 곱셈. 중간이 보낸 <code>h = 1.0</code> 에 마지막 가중치 <code>w₂ = 0.8</code> 을 곱해
        <code> ŷ = w₂ · h = 0.8 × 1.0 = 0.8</code>. 두 단계 모두 "곱하고 보내기" 한 번.
      </>
    ),
    formula: <>ŷ = w₂ · h = 0.8 × 1.0 = <strong>0.8</strong></>,
  },
  {
    title: '④ 정답과 비교 → 출력의 오차',
    body: (
      <>
        예측 <code>ŷ = 0.8</code>, 정답 <code>y = 1.0</code>. 오차 <code>e = ŷ − y = −0.2</code>.
        예측이 0.2 만큼 모자랍니다. 이 빨간 값이 우리 출발점.
      </>
    ),
    formula: <>e = ŷ − y = 0.8 − 1.0 = <strong style={{ color: 'rgb(190,18,60)' }}>−0.2</strong></>,
  },
  {
    title: '⑤ A4 식 다시 — 모든 가중치에 쓰는 두 자리 패턴',
    body: (
      <>
        A4 에서 한 뉴런의 가중치 갱신 = <code>e · x</code> 였어요. 사실 이건 모든 가중치에 통하는
        <strong> 두 자리 패턴</strong>:
        <div className="my-2 px-3 py-2 bg-accent-bg/40 rounded font-mono text-sm">
          가중치 책임 = (그 가중치 <strong>끝점</strong>에서 본 오차) × (그 가중치 <strong>직전</strong> 입력값)
        </div>
        한 뉴런일 땐 끝점이 곧 출력 ŷ 이라 끝점 오차 = e, 직전 입력 = x. 그래서 <code>e · x</code>. 이제 두 자리만 채우면 어떤 가중치든 책임을 구할 수 있어요.
      </>
    ),
    highlight: true,
  },
  {
    title: '⑥ 마지막 가중치(w₂) — A4 식 그대로 채우기',
    body: (
      <>
        <code>w₂</code> 의 끝점은 출력 뉴런. 출력은 손실에 직접 닿아 있으니 <strong>끝점 오차 = e = −0.2</strong>.
        <code>w₂</code> 의 직전 입력 = 중간 뉴런이 보낸 <code>h = 1.0</code>. 두 자리 채우면 끝.
      </>
    ),
    formula: (
      <>
        w₂ 책임 = e · h = (−0.2) × 1.0 = <strong style={{ color: 'rgb(190,18,60)' }}>−0.2</strong>
      </>
    ),
  },
  {
    title: '⑦ 첫 가중치(w₁) — 끝점 오차가 뭐지?',
    body: (
      <>
        같은 식을 <code>w₁</code> 에 쓰려는데 <code>w₁</code> 의 끝점은 <strong>중간 뉴런</strong>.
        중간 뉴런은 손실에 직접 닿지 않아요 — 한 단계 거쳐서야 영향을 준다. 그러니 "끝점 오차" 자리에
        뭘 넣어야 할지 모름. ❓
      </>
    ),
  },
  {
    title: '⑧ 가중치의 진짜 의미 — "변화 비율"',
    body: (
      <>
        <code>w₂ = 0.8</code> 을 다시 봅시다. 중간 뉴런 출력 <code>h</code> 가 1 만큼 늘면, 출력 ŷ 은 얼마나 늘까?
        <code> ŷ = w₂ · h</code> 이니까 <code>w₂ × 1 = 0.8</code> 만큼 늘어요. 즉
        <strong> 가중치 = 한쪽이 1 변할 때 다음 쪽이 변하는 비율</strong>.
        <table className="my-2 text-xs font-mono w-full">
          <thead>
            <tr className="text-muted">
              <th className="text-left pr-3">h</th>
              <th className="text-left pr-3">ŷ = 0.8 · h</th>
              <th className="text-left">변화량</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>1.0</td><td>0.8</td><td>—</td></tr>
            <tr><td>2.0</td><td>1.6</td><td>Δh = 1, Δŷ = 0.8</td></tr>
            <tr><td>3.0</td><td>2.4</td><td>Δh = 1, Δŷ = 0.8</td></tr>
          </tbody>
        </table>
        한쪽이 1 변할 때 늘 0.8 만큼 변한다 — 이 비율의 정체가 곧 <code>w₂</code>.
      </>
    ),
  },
  {
    title: '⑨ 두 비율을 곱하면 = 중간 자리 오차',
    body: (
      <>
        이미 두 비율을 알고 있어요.
        <ul className="my-1 list-disc pl-5 text-sm">
          <li>중간 1 변화 → 출력 변화 비율 = <strong>w₂ = 0.8</strong> (⑧ 에서)</li>
          <li>출력 1 변화 → 손실 변화 비율 = <strong>e = −0.2</strong> (A4 사슬규칙 ②번)</li>
        </ul>
        두 단계 거치면 비율도 곱. 중간 1 변화 → 손실 변화 비율 = <code>w₂ × e = 0.8 × (−0.2) = −0.16</code>.
        이게 바로 <strong>중간 뉴런 자리에서 본 오차</strong>. 출력에서 가중치 한 번 곱해 거꾸로 가져온 값.
      </>
    ),
    formula: (
      <>
        중간 자리 오차 = e · w₂ = (−0.2) × 0.8 = <strong style={{ color: 'rgb(190,18,60)' }}>−0.16</strong>
      </>
    ),
    highlight: true,
  },
  {
    title: '⑩ 첫 가중치(w₁) 책임 — A4 식 한 번 더',
    body: (
      <>
        ⑨ 에서 <code>w₁</code> 의 끝점 오차를 −0.16 으로 구했고, <code>w₁</code> 의 직전 입력 = <code>x = 2</code>.
        ⑤ 의 두 자리 패턴 그대로:
      </>
    ),
    formula: (
      <>
        w₁ 책임 = (중간 자리 오차) · x = (−0.16) × 2 = <strong style={{ color: 'rgb(190,18,60)' }}>−0.32</strong>
      </>
    ),
  },
  {
    title: '⑪ 한 컷으로 비교 — 깊어져도 같은 패턴',
    body: (
      <>
        두 가중치 책임을 나란히 보면:
        <ul className="my-2 list-disc pl-5 text-sm font-mono">
          <li>w₂ 책임 = e · h = <strong>−0.2</strong> &nbsp;&nbsp;(A4 식 그대로 한 번)</li>
          <li>w₁ 책임 = (e · w₂) · x = <strong>−0.32</strong> &nbsp;&nbsp;(A4 식 + 가중치 한 번 더 곱)</li>
        </ul>
        깊은 망이 되어도 식 모양은 같아요. <strong>한 단계 거슬러 갈 때마다 그 단계 가중치 한 번 곱이 추가될 뿐.</strong>
        다음 카드(D3 — 역전파 식 유도)에서 이 한 줄을 ∂ 기호로 깔끔하게 옮겨 적습니다.
      </>
    ),
    highlight: true,
  },
];

export function PhaseD2() {
  const meta = PHASES.find((p) => p.id === 'd2')!;
  const markCompleted = useApp((s) => s.markCompleted);
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (step >= STEPS.length) markCompleted('d2');
  }, [step, markCompleted]);

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2">
        D1 에서 본 "거꾸로 흐르는 신호" 의 직관을 <strong>숫자와 그림</strong>으로 한 단계씩 따라가 봅니다.
        A4 에서 배운 한 뉴런의 가중치 갱신 식이 두 뉴런 짜리 망에서도 그대로 통한다는 게 핵심.
        각 단계마다 다이어그램이 한 부분씩 켜집니다.
      </p>

      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-4 mt-4 items-start">
        <div className="card p-3 lg:sticky lg:top-16 lg:z-10">
          <BackpropDiagram step={step} />
          <div className="text-[11px] text-muted mt-2 leading-snug text-center">
            검정 = 앞으로(forward) 흐르는 신호 ·
            <span style={{ color: 'rgb(190,18,60)' }}> 빨강 = 거꾸로(backward) 흐르는 책임</span>
          </div>
        </div>

        <div className="space-y-2.5">
          {STEPS.slice(0, step).map((s, i) => (
            <div
              key={i}
              className={`rounded-md border p-3 ${
                s.highlight ? 'border-accent bg-accent-bg/40' : 'border-border bg-surface/40'
              }`}
            >
              <div className="text-sm font-semibold mb-1">{s.title}</div>
              <div className="text-[13px] text-muted leading-relaxed">{s.body}</div>
              {s.formula && (
                <div className="mt-2 px-3 py-2 bg-bg border border-border rounded font-mono text-sm">
                  {s.formula}
                </div>
              )}
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            {step < STEPS.length ? (
              <button
                onClick={() => setStep((s) => Math.min(s + 1, STEPS.length))}
                className="btn-primary text-sm flex-1"
              >
                다음 단계 펼치기 →
              </button>
            ) : (
              <div className="aside-tip text-[12px] flex-1 my-0 py-2">
                ✓ 모든 단계 완료. 다음 D3 에서 같은 흐름을 ∂ 기호로 옮겨 적습니다.
              </div>
            )}
            {step > 1 && (
              <button onClick={() => setStep((s) => Math.max(s - 1, 1))} className="btn-ghost text-sm">
                ← 접기
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

/* ───────── 다이어그램 ─────────
   step 1~11 에 따라 어떤 요소가 켜질지 결정.
   forward 값: step ≥ 표시 단계.
   backward(빨강) 값: 해당 단계 이상에서만.
*/
function BackpropDiagram({ step }: { step: number }) {
  // 노드 좌표
  const xCol = 80;
  const hCol = 280;
  const yCol = 480;
  const nodeY = 130;
  const accent = 'rgb(var(--color-accent))';
  const muted = 'rgb(var(--color-muted))';
  const text = 'rgb(var(--color-text))';
  const bg = 'rgb(var(--color-bg))';
  const red = 'rgb(190,18,60)';

  const showH = step >= 2;
  const showYHat = step >= 3;
  const showE = step >= 4;
  const showW2Grad = step >= 6;
  const showQ = step >= 7 && step < 9; // ⑦ 만 ❓
  const showRate = step >= 8; // ⑧ 미니 라벨
  const showHError = step >= 9;
  const showBackArrow = step >= 9;
  const showW1Grad = step >= 10;

  return (
    <svg viewBox="0 0 560 240" className="w-full" style={{ maxHeight: 280 }}>
      <defs>
        <marker id="d2-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 z" fill={muted} />
        </marker>
        <marker id="d2-arrow-red" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 z" fill={red} />
        </marker>
      </defs>

      {/* forward 화살표: x → h */}
      <line x1={xCol + 28} y1={nodeY} x2={hCol - 32} y2={nodeY} stroke={muted} strokeWidth={2} markerEnd="url(#d2-arrow)" />
      {/* w₁ 라벨 박스 */}
      <g>
        <rect x={(xCol + hCol) / 2 - 36} y={nodeY - 38} width={72} height={20} rx={4} fill={bg} stroke={muted} />
        <text x={(xCol + hCol) / 2} y={nodeY - 24} textAnchor="middle" fontSize={12} fontFamily="JetBrains Mono">w₁ = 0.5</text>
      </g>

      {/* forward 화살표: h → ŷ */}
      <line x1={hCol + 28} y1={nodeY} x2={yCol - 32} y2={nodeY} stroke={muted} strokeWidth={2} markerEnd="url(#d2-arrow)" />
      <g>
        <rect x={(hCol + yCol) / 2 - 36} y={nodeY - 38} width={72} height={20} rx={4} fill={bg} stroke={muted} />
        <text x={(hCol + yCol) / 2} y={nodeY - 24} textAnchor="middle" fontSize={12} fontFamily="JetBrains Mono">w₂ = 0.8</text>
      </g>

      {/* 노드: 입력 x */}
      <g>
        <circle cx={xCol} cy={nodeY} r={26} fill="rgb(var(--color-surface))" stroke={muted} />
        <text x={xCol} y={nodeY + 5} textAnchor="middle" fontSize={14} fontFamily="JetBrains Mono" fill={text}>x = {X}</text>
      </g>

      {/* 노드: 중간 h */}
      <g>
        <circle cx={hCol} cy={nodeY} r={28} fill="rgb(var(--color-accent-bg))" stroke={accent} />
        <text x={hCol} y={nodeY - 2} textAnchor="middle" fontSize={11} fill={accent}>중간</text>
        {showH && (
          <text x={hCol} y={nodeY + 12} textAnchor="middle" fontSize={13} fontFamily="JetBrains Mono" fill={text}>h = {H.toFixed(1)}</text>
        )}
      </g>

      {/* 노드: 출력 ŷ */}
      <g>
        <circle cx={yCol} cy={nodeY} r={28} fill={accent} stroke={accent} />
        <text x={yCol} y={nodeY - 2} textAnchor="middle" fontSize={11} fill="white">출력</text>
        {showYHat && (
          <text x={yCol} y={nodeY + 12} textAnchor="middle" fontSize={13} fontFamily="JetBrains Mono" fill="white">ŷ = {Y_HAT.toFixed(1)}</text>
        )}
      </g>

      {/* 정답 y */}
      <g>
        <text x={yCol} y={nodeY - 50} textAnchor="middle" fontSize={11} fill={muted}>정답 y = {Y_TARGET.toFixed(1)}</text>
        <line x1={yCol} y1={nodeY - 42} x2={yCol} y2={nodeY - 30} stroke={muted} strokeWidth={1} strokeDasharray="2 2" />
      </g>

      {/* ④ 출력 오차 (빨강) */}
      {showE && (
        <g>
          <rect x={yCol - 38} y={nodeY + 38} width={76} height={22} rx={4} fill={bg} stroke={red} strokeWidth={1.5} />
          <text x={yCol} y={nodeY + 53} textAnchor="middle" fontSize={12} fontFamily="JetBrains Mono" fill={red} fontWeight={600}>e = {E.toFixed(1)}</text>
        </g>
      )}

      {/* ⑥ w₂ 책임 (빨강 라벨) */}
      {showW2Grad && (
        <g>
          <rect x={(hCol + yCol) / 2 - 40} y={nodeY + 14} width={80} height={20} rx={4} fill={bg} stroke={red} strokeWidth={1.5} />
          <text x={(hCol + yCol) / 2} y={nodeY + 28} textAnchor="middle" fontSize={11} fontFamily="JetBrains Mono" fill={red} fontWeight={600}>책임 {W2_GRAD.toFixed(2)}</text>
        </g>
      )}

      {/* ⑦ 중간에 ❓ */}
      {showQ && (
        <text x={hCol} y={nodeY + 56} textAnchor="middle" fontSize={20} fill={red} fontWeight={700}>?</text>
      )}

      {/* ⑧ 변화 비율 라벨 */}
      {showRate && (
        <g>
          <rect x={(hCol + yCol) / 2 - 50} y={nodeY + 70} width={100} height={20} rx={4} fill={bg} stroke={accent} strokeWidth={1} />
          <text x={(hCol + yCol) / 2} y={nodeY + 84} textAnchor="middle" fontSize={11} fontFamily="JetBrains Mono" fill={accent}>Δh=1 → Δŷ=0.8</text>
        </g>
      )}

      {/* ⑨ 빨간 역방향 화살표 (h ← ŷ) */}
      {showBackArrow && (
        <g>
          <line x1={yCol - 32} y1={nodeY + 8} x2={hCol + 30} y2={nodeY + 8} stroke={red} strokeWidth={2} strokeDasharray="4 3" markerEnd="url(#d2-arrow-red)" />
        </g>
      )}

      {/* ⑨ 중간 자리 오차 라벨 */}
      {showHError && (
        <g>
          <rect x={hCol - 45} y={nodeY + 38} width={90} height={22} rx={4} fill={bg} stroke={red} strokeWidth={1.5} />
          <text x={hCol} y={nodeY + 53} textAnchor="middle" fontSize={12} fontFamily="JetBrains Mono" fill={red} fontWeight={600}>{H_ERROR.toFixed(2)}</text>
        </g>
      )}

      {/* ⑩ w₁ 책임 라벨 */}
      {showW1Grad && (
        <g>
          <rect x={(xCol + hCol) / 2 - 40} y={nodeY + 14} width={80} height={20} rx={4} fill={bg} stroke={red} strokeWidth={1.5} />
          <text x={(xCol + hCol) / 2} y={nodeY + 28} textAnchor="middle" fontSize={11} fontFamily="JetBrains Mono" fill={red} fontWeight={600}>책임 {W1_GRAD.toFixed(2)}</text>
        </g>
      )}

      {/* 빨간 역방향 화살표 (x ← h) */}
      {showW1Grad && (
        <g>
          <line x1={hCol - 30} y1={nodeY + 8} x2={xCol + 28} y2={nodeY + 8} stroke={red} strokeWidth={2} strokeDasharray="4 3" markerEnd="url(#d2-arrow-red)" />
        </g>
      )}
    </svg>
  );
}
