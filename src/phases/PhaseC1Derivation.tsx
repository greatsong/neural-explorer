// 역전파 식 유도 카드 — 사슬규칙 단계별 펼치기.
// KaTeX 대신 plain HTML+monospace로 표시(어떤 환경에서도 raw LaTeX 노출 위험 0).
// 각 단계 옆에 *지금 사이클의 수치 대입*도 같이 보여 다이어그램의 숫자와 연결한다.
// 카드 상단의 미니 다이어그램은 현재까지 펼친 단계에 따라 활성 부분만 빨갛게 강조해
// "이 식이 그림의 어디에서 나오는가"를 시각으로 보여준다.
// 다이어그램은 sticky top, 버튼은 sticky bottom — 단계 박스가 길어져도 컨트롤이 항상 보임.
// 새 단계 펼치면 그 박스로 자동 스크롤되어 사용자가 매번 스크롤할 필요 없음.
import { useEffect, useRef, useState, type ReactNode } from 'react';

/** *텍스트* 패턴을 <strong>으로 자동 변환 — 학생용 강조. */
function emph(text: string): ReactNode {
  const parts = text.split(/(\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <strong key={i} className="font-semibold text-text">{part.slice(1, -1)}</strong>;
    }
    return part;
  });
}

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
  // 식 영역(모노스페이스로 렌더). 줄바꿈은 \n.
  formula: string;
  why: string;
  numeric?: string;   // 현재 사이클 수치 대입 (식과 같은 모노스페이스, 빨간색)
  highlight?: boolean;
}

function buildSteps(a: Args): DerivStep[] {
  const f = (n: number, d = 2) => n.toFixed(d);
  const fSign = (n: number) => (n < 0 ? `(${f(n)})` : f(n)); // 음수는 괄호
  return [
    {
      formula:
        `L  = ½(ŷ − y)²\n` +
        `ŷ  = z₂ = w₂·h + b₂\n` +
        `h  = ReLU(z₁)\n` +
        `z₁ = w₁·x + b₁`,
      why:
        '함수 합성 — x 한 점이 두 층을 통과해 손실 L까지 가는 전체 식. ' +
        '아래 모든 그래디언트는 이 합성에서 *사슬규칙(연쇄법칙)*으로 한 줄씩 나옵니다.',
    },
    {
      formula: `e  ≡  ∂L/∂ŷ  =  ŷ − y`,
      why:
        '½·(ŷ−y)² 을 ŷ에 대해 미분 — ½과 2가 약분되어 깔끔하게 e. ' +
        'A2에서 정의한 e가 *모든 그래디언트의 출발점*임이 식에서 보입니다.',
      numeric: `   =  ${f(a.yhat)} − ${a.y}  =  ${f(a.e)}`,
    },
    {
      formula:
        `∂L/∂w₂  =  (∂L/∂ŷ) · (∂ŷ/∂w₂)\n` +
        `        =  e · h`,
      why:
        'w₂ → ŷ → L 사슬. ŷ = w₂h + b₂에서 w₂가 1 변하면 ŷ은 h만큼 변하므로 ' +
        '곱해지는 것은 h. A4의 *e·x* 모양 그대로 — "그 층의 입력"이 x에서 h로 바뀐 것.',
      numeric: `        =  ${fSign(a.e)} · ${f(a.h)}  =  ${f(a.dw2)}`,
      highlight: true,
    },
    {
      formula: `∂L/∂b₂  =  e · 1  =  e`,
      why: 'b₂는 항상 1이 곱해지는 상수항이라 곱해질 게 1. A4와 같은 패턴.',
      numeric: `        =  ${f(a.db2)}`,
      highlight: true,
    },
    {
      formula:
        `e_h  ≡  ∂L/∂h\n` +
        `     =  (∂L/∂ŷ) · (∂ŷ/∂h)\n` +
        `     =  e · w₂`,
      why:
        '★ h → ŷ → L 사슬. ŷ = w₂h + b₂에서 *h가 1 변하면 ŷ은 w₂만큼 변한다* — ' +
        '그래서 거꾸로 흐를 때도 같은 w₂가 곱해집니다. ' +
        '"w₂를 거꾸로 통과"라는 비유의 정확한 의미가 바로 이 한 줄.',
      numeric: `     =  ${fSign(a.e)} · ${f(a.w2)}  =  ${f(a.eh)}`,
      highlight: true,
    },
    {
      formula:
        `e_z₁  ≡  ∂L/∂z₁\n` +
        `      =  (∂L/∂h) · (∂h/∂z₁)\n` +
        `      =  e_h · ReLU′(z₁)`,
      why:
        '★ z₁ → h → L 사슬. h = ReLU(z₁)이라 ∂h/∂z₁ = ReLU′(z₁) — z₁ > 0이면 1, ≤ 0이면 0. ' +
        '*ReLU 문지기*가 식에 등장하는 자리. 이번 사이클은 z₁ > 0이라 1이 곱해져 ' +
        'e_h와 e_z₁이 같은 수치가 되지만, *통과 단계 자체는 식에 명시*됩니다.',
      numeric:
        `      =  ${fSign(a.eh)} · ${a.reluP}  =  ${f(a.ez1)}` +
        (a.reluP === 1 ? '   (문지기 열림)' : '   (문지기 막힘)'),
      highlight: true,
    },
    {
      formula:
        `∂L/∂w₁  =  (∂L/∂z₁) · (∂z₁/∂w₁)\n` +
        `        =  e_z₁ · x`,
      why:
        'w₁ → z₁ → h → ŷ → L의 긴 사슬을 적은 결과 — 마지막 곱은 z₁ = w₁x + b₁에서 ' +
        '∂z₁/∂w₁ = x. 다시 *e·x* 모양 (e 자리에 z₁까지 거꾸로 흘러온 e_z₁).',
      numeric: `        =  ${fSign(a.ez1)} · ${a.x}  =  ${f(a.dw1)}`,
      highlight: true,
    },
    {
      formula: `∂L/∂b₁  =  e_z₁ · 1  =  e_z₁`,
      why:
        'b₁도 같은 패턴. *모든 층에서 d_가중치 = (그 층의 오차) × (그 층의 입력)* 모양이 ' +
        '한 패턴으로 완성됩니다.',
      numeric: `        =  ${f(a.db1)}`,
      highlight: true,
    },
  ];
}

/* ════════════════════════════════════════════════════════════
   미니 다이어그램 — 현재 펼친 단계까지의 *역전파 신호 흐름*만
   빨갛게 누적 강조. 본문 위 큰 다이어그램과 같은 노드 배치.
══════════════════════════════════════════════════════════════ */
function MiniDiagram({ step, args }: { step: number; args: Args }) {
  // viewBox를 살짝 더 크게(위쪽 여유 +20, 아래쪽 +10) — 정답 y/ReLU′ 라벨이 잘리지 않도록
  const W_SVG = 620, H_SVG = 200;
  const cy = 90;
  const xCx = 50, sum1Cx = 165, reluCx = 290, sum2Cx = 415, yhCx = 565;

  // 순전파(구조)는 하늘색 계열, 역전파(신호)는 빨강 — 두 흐름이 한눈에 구분되도록.
  const FWD = '#0284c7';                // sky-600 (순전파/구조 — 항상 활성)
  const FWD_FILL = '#444';              // 노드 안 텍스트는 진한 회색 (가독성)
  const BACK = 'rgb(190, 18, 60)';      // 활성 역전파 신호
  const OFF = '#d4d4d4';                // 아직 안 펼친 부분의 역전파 화살표

  // 단계별 활성 매핑 (누적):
  //   2: ŷ + e
  //   3-4: + dw₂ 화살표(ŷ→Σ₂) + h 노드 강조
  //   5: + e_h 라벨 + Σ₂→ReLU 화살표
  //   6: + e_z₁ 라벨 + ReLU 박스 거꾸로
  //   7-8: + dw₁ 화살표(Σ₁→x) + z₁ 강조
  const A = (n: number) => step >= n;
  const onActive = (n: number) => (A(n) ? BACK : OFF);

  return (
    <div className="rounded-md border border-border bg-bg/40 p-2">
      <svg viewBox={`0 0 ${W_SVG} ${H_SVG}`} className="w-full" style={{ maxHeight: 240 }}>
        <defs>
          <marker id="dv-back" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 z" fill={BACK} />
          </marker>
          <marker id="dv-off" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 z" fill={OFF} />
          </marker>
        </defs>

        {/* ── 순전파 구조 (항상 회색) ── */}
        <line x1={xCx + 18} y1={cy} x2={sum1Cx - 20} y2={cy} stroke={FWD} strokeWidth={1.5} />
        <line x1={sum1Cx + 20} y1={cy} x2={reluCx - 26} y2={cy} stroke={FWD} strokeWidth={1.5} />
        <line x1={reluCx + 26} y1={cy} x2={sum2Cx - 20} y2={cy} stroke={FWD} strokeWidth={1.5} />
        <line x1={sum2Cx + 20} y1={cy} x2={yhCx - 18} y2={cy} stroke={FWD} strokeWidth={1.5} />

        {/* w/b 라벨 (항상 회색) */}
        <text x={(xCx + sum1Cx) / 2} y={cy - 8} textAnchor="middle" fontSize={12} fill={FWD} fontFamily="JetBrains Mono">×w₁</text>
        <text x={(reluCx + sum2Cx) / 2} y={cy - 8} textAnchor="middle" fontSize={12} fill={FWD} fontFamily="JetBrains Mono">×w₂</text>

        {/* 노드들 */}
        <circle cx={xCx} cy={cy} r={16} fill="white" stroke={FWD} strokeWidth={1.5} />
        <text x={xCx} y={cy + 5} textAnchor="middle" fontSize={14} fontFamily="JetBrains Mono" fill={FWD_FILL}>x</text>
        <text x={xCx} y={cy + 36} textAnchor="middle" fontSize={11.5} fontFamily="JetBrains Mono" fill={FWD}>= {args.x}</text>

        <circle cx={sum1Cx} cy={cy} r={20} fill="white" stroke={A(7) ? BACK : FWD} strokeWidth={A(7) ? 2.4 : 1.5} />
        <text x={sum1Cx} y={cy + 6} textAnchor="middle" fontSize={17} fontWeight={700} fill={A(7) ? BACK : FWD_FILL}>Σ</text>
        <text x={sum1Cx} y={cy + 36} textAnchor="middle" fontSize={11.5} fontFamily="JetBrains Mono" fill={A(7) ? BACK : FWD}>z₁ = {args.z1.toFixed(2)}</text>

        <rect x={reluCx - 26} y={cy - 14} width={52} height={28} rx={4}
              fill="white" stroke={A(6) ? BACK : FWD} strokeWidth={A(6) ? 2.4 : 1.5} />
        <text x={reluCx} y={cy + 5} textAnchor="middle" fontSize={12.5} fontWeight={700} fill={A(6) ? BACK : FWD_FILL}>ReLU</text>
        <text x={reluCx} y={cy + 36} textAnchor="middle" fontSize={11.5} fontFamily="JetBrains Mono" fill={A(3) ? BACK : FWD}>h = {args.h.toFixed(2)}</text>

        <circle cx={sum2Cx} cy={cy} r={20} fill="white" stroke={A(3) ? BACK : FWD} strokeWidth={A(3) ? 2.4 : 1.5} />
        <text x={sum2Cx} y={cy + 6} textAnchor="middle" fontSize={17} fontWeight={700} fill={A(3) ? BACK : FWD_FILL}>Σ</text>
        <text x={sum2Cx} y={cy + 36} textAnchor="middle" fontSize={11.5} fontFamily="JetBrains Mono" fill={FWD}>z₂ = {args.z2.toFixed(2)}</text>

        <circle cx={yhCx} cy={cy} r={18} fill="white" stroke={A(2) ? BACK : FWD} strokeWidth={A(2) ? 2.6 : 1.5} />
        <text x={yhCx} y={cy + 5} textAnchor="middle" fontSize={14} fontFamily="JetBrains Mono" fontWeight={700} fill={A(2) ? BACK : FWD_FILL}>ŷ</text>
        {/* 정답 y는 ŷ 위쪽에 — 항상 표시(데이터 컨텍스트) */}
        <text x={yhCx} y={cy - 26} textAnchor="middle" fontSize={11} fontFamily="JetBrains Mono" fill={FWD_FILL}>정답 y = {args.y}</text>
        <text x={yhCx} y={cy + 36} textAnchor="middle" fontSize={11.5} fontFamily="JetBrains Mono" fill={A(2) ? BACK : FWD}>ŷ = {args.yhat.toFixed(2)}</text>

        {/* ── 역전파 화살표 (단계별 활성) ── */}
        {/* dw₂ 화살표: ŷ → Σ₂ */}
        <line x1={yhCx - 22} y1={cy + 28} x2={sum2Cx + 22} y2={cy + 28}
              stroke={onActive(3)} strokeWidth={A(3) ? 2 : 1.3}
              strokeDasharray="4 3"
              markerEnd={A(3) ? 'url(#dv-back)' : 'url(#dv-off)'} />

        {/* e_h 화살표 (w₂ 거꾸로): Σ₂ → ReLU */}
        <line x1={sum2Cx - 22} y1={cy + 28} x2={reluCx + 28} y2={cy + 28}
              stroke={onActive(5)} strokeWidth={A(5) ? 2 : 1.3}
              strokeDasharray="4 3"
              markerEnd={A(5) ? 'url(#dv-back)' : 'url(#dv-off)'} />

        {/* e_z₁ 화살표 (ReLU 거꾸로): ReLU 박스 위 */}
        {A(6) && (
          <g>
            <text x={reluCx} y={cy - 26} textAnchor="middle" fontSize={11} fill={BACK} fontFamily="JetBrains Mono" fontWeight={600}>
              ReLU′
            </text>
            <line x1={reluCx + 18} y1={cy - 22} x2={reluCx - 18} y2={cy - 22}
                  stroke={BACK} strokeWidth={1.8}
                  markerEnd="url(#dv-back)" />
          </g>
        )}

        {/* dw₁ 화살표 (w₁ 거꾸로): ReLU → Σ₁ → x */}
        <line x1={reluCx - 28} y1={cy + 28} x2={sum1Cx + 22} y2={cy + 28}
              stroke={onActive(7)} strokeWidth={A(7) ? 2 : 1.3}
              strokeDasharray="4 3"
              markerEnd={A(7) ? 'url(#dv-back)' : 'url(#dv-off)'} />
        <line x1={sum1Cx - 22} y1={cy + 28} x2={xCx + 18} y2={cy + 28}
              stroke={onActive(7)} strokeWidth={A(7) ? 2 : 1.3}
              strokeDasharray="4 3"
              markerEnd={A(7) ? 'url(#dv-back)' : 'url(#dv-off)'} />

        {/* ── 역전파 라벨 (단계별 활성) ── */}
        {A(2) && (
          <text x={yhCx} y={cy + 60} textAnchor="middle" fontSize={13}
                fontFamily="JetBrains Mono" fill={BACK} fontWeight={700}>
            e = {args.e.toFixed(2)}
          </text>
        )}
        {A(3) && (
          <text x={(sum2Cx + yhCx) / 2 - 4} y={cy + 60} textAnchor="middle" fontSize={13}
                fontFamily="JetBrains Mono" fill={BACK} fontWeight={700}>
            dw₂ = {args.dw2.toFixed(2)}
          </text>
        )}
        {A(5) && (
          <text x={(reluCx + sum2Cx) / 2} y={cy + 60} textAnchor="middle" fontSize={13}
                fontFamily="JetBrains Mono" fill={BACK} fontWeight={700}>
            e_h = {args.eh.toFixed(2)}
          </text>
        )}
        {A(6) && (
          <text x={(sum1Cx + reluCx) / 2 - 4} y={cy + 60} textAnchor="middle" fontSize={13}
                fontFamily="JetBrains Mono" fill={BACK} fontWeight={700}>
            e_z₁ = {args.ez1.toFixed(2)}
          </text>
        )}
        {A(7) && (
          <text x={(xCx + sum1Cx) / 2} y={cy + 60} textAnchor="middle" fontSize={13}
                fontFamily="JetBrains Mono" fill={BACK} fontWeight={700}>
            dw₁ = {args.dw1.toFixed(2)}
          </text>
        )}
      </svg>
      <div className="text-[13px] text-muted leading-snug px-1 pb-1 pt-0.5">
        {step <= 1 && emph('단계를 펼칠수록 *역전파 신호가 거꾸로 흘러* 활성 부분이 빨갛게 누적됩니다.')}
        {step === 2 && 'ŷ에서 측정된 오차 e가 출발점.'}
        {(step === 3 || step === 4) && 'ŷ → Σ₂ 사이로 dw₂·db₂ 신호. 출력층 가중치 그래디언트.'}
        {step === 5 && emph('★ Σ₂ → ReLU 사이로 *w₂를 거꾸로 통과* — h의 오차 e_h.')}
        {step === 6 && emph('★ ReLU 박스 내부 *문지기 거꾸로 통과* — z₁의 오차 e_z₁.')}
        {(step === 7 || step === 8) && 'ReLU → Σ₁ → x 사이로 dw₁·db₁ 신호. 입력층까지 도달.'}
      </div>
    </div>
  );
}

export function BackpropDerivation(props: Args) {
  const STEPS = buildSteps(props);
  const [step, setStep] = useState(1);
  const stepsContainerRef = useRef<HTMLDivElement>(null);

  // 새 단계 펼치면 그 박스 상단이 sticky 다이어그램 바로 아래에 오도록 자동 스크롤.
  // ref 대신 컨테이너의 lastElementChild로 직접 찾아 ref 타이밍 이슈 회피.
  const prevStepRef = useRef(step);
  useEffect(() => {
    if (step > prevStepRef.current) {
      const id = setTimeout(() => {
        const lastBox = stepsContainerRef.current?.lastElementChild as HTMLElement | null;
        if (lastBox) {
          const rect = lastBox.getBoundingClientRect();
          const STICKY_OFFSET = 320; // sticky 다이어그램 영역(SVG 240 + 캡션 ~60) + 여유 20
          const targetY = window.scrollY + rect.top - STICKY_OFFSET;
          window.scrollTo({ top: Math.max(0, targetY), behavior: 'auto' });
        }
      }, 120);
      prevStepRef.current = step;
      return () => clearTimeout(id);
    }
    prevStepRef.current = step;
  }, [step]);

  return (
    <div className="card p-4 mt-4">
      <div className="flex items-baseline justify-between">
        <div className="text-base font-medium">역전파 식 유도 — 한 줄씩 펼치기</div>
        <div className="text-[13px] text-muted font-mono">
          {Math.min(step, STEPS.length)} / {STEPS.length}
        </div>
      </div>
      <p className="text-[14px] text-muted mt-1.5 leading-relaxed">
        모든 식은 <strong>사슬규칙(연쇄법칙)</strong>에서 한 줄씩 나옵니다.
        아래 미니 다이어그램은 <strong>지금까지 펼친 단계</strong>에 해당하는 부분만 빨갛게 강조 —
        식과 그림이 어디서 만나는지 한눈에 보이도록.
        식 아래 <span style={{ color: 'rgb(190,18,60)' }}>붉은 줄</span>은 <strong>지금 사이클의 수치 대입</strong>.
      </p>

      {/* 미니 다이어그램 — sticky로 viewport 상단에 고정. 단계 펼쳐 카드가 길어져도 항상 보임. */}
      <div
        className="mt-3 sticky z-10 -mx-4 px-4 py-2 backdrop-blur"
        style={{ top: 0, backgroundColor: 'rgb(var(--color-bg) / 0.95)' }}
      >
        <MiniDiagram step={step} args={props} />
      </div>

      <div ref={stepsContainerRef} className="mt-4 space-y-3">
        {STEPS.slice(0, step).map((s, i) => (
          <div
            key={i}
            className={`rounded-md border p-4 ${
              s.highlight ? 'border-accent bg-accent-bg/40' : 'border-border bg-surface/40'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`shrink-0 w-7 h-7 rounded-full text-[13px] font-mono flex items-center justify-center ${
                  s.highlight ? 'bg-accent text-white' : 'bg-accent/15 text-accent'
                }`}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <pre
                  className={`font-mono text-[15px] leading-[1.75] whitespace-pre overflow-x-auto m-0 ${
                    s.highlight ? 'font-semibold' : ''
                  }`}
                  style={{ tabSize: 2 }}
                >
                  {s.formula}
                </pre>
                {s.numeric && (
                  <pre
                    className="font-mono text-[15px] leading-[1.75] whitespace-pre overflow-x-auto m-0 mt-1 font-semibold"
                    style={{ color: 'rgb(190,18,60)' }}
                  >
                    {s.numeric}
                  </pre>
                )}
                <div className="text-[13.5px] text-muted mt-2.5 leading-relaxed">{emph(s.why)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div
        className="flex gap-2 mt-4 flex-wrap sticky z-10 -mx-4 px-4 py-3 backdrop-blur border-t border-border"
        style={{ bottom: 0, backgroundColor: 'rgb(var(--color-bg) / 0.95)' }}
      >
        {step < STEPS.length ? (
          <button
            onClick={() => setStep((s) => Math.min(s + 1, STEPS.length))}
            className="btn-primary text-base py-2 px-4"
          >
            다음 단계 펼치기 →
          </button>
        ) : (
          <div className="text-[14px] text-muted py-2">
            ✓ 모든 단계를 펼쳤어요. 다이어그램의 빨간 화살표 하나하나가 사슬규칙의 한 줄임을
            확인했나요?
          </div>
        )}
        {step > 1 && step < STEPS.length && (
          <button
            onClick={() => setStep((s) => Math.max(s - 1, 1))}
            className="btn-ghost text-base py-2 px-4"
          >
            ← 접기
          </button>
        )}
        {step < STEPS.length && (
          <button
            onClick={() => setStep(STEPS.length)}
            className="btn-ghost text-base py-2 px-4 ml-auto"
          >
            모두 펼치기
          </button>
        )}
        {step === STEPS.length && (
          <button
            onClick={() => setStep(1)}
            className="btn-ghost text-base py-2 px-4 ml-auto"
          >
            처음부터
          </button>
        )}
      </div>
    </div>
  );
}
