// PhaseC3 — 모델 복잡도 + 역전파 박스
// 좌: 작은 NetworkDiagram(입력 4 / 은닉 3 / 출력 2). 정방향 회색 얇은 선 + 역방향 빨간 점선 곡선.
// "한 step 진행" 버튼을 누르면 출력→은닉→입력 방향으로 0.3초 시차 펄스 애니메이션.
// 우: 은닉층 크기 슬라이더(1~16) + 은닉층 추가/제거 토글(0층 vs 1층) + 시뮬레이션 acc 비교.
// 하단: PLAN ## 10-1 #6 본문 그대로 박스.
// ※ 체인룰 식·∂ 기호는 의도적으로 노출 0.

import { useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import { PHASES } from '../phases';

// 입력 4 / 은닉 3 / 출력 2 좌표
const NET_W = 460;
const NET_H = 240;
const COL_X = { input: 70, hidden: 230, output: 390 };
const INPUT_Y = [50, 110, 170, 220];
const HIDDEN_Y = [80, 140, 200];
const OUTPUT_Y = [110, 170];

interface Edge {
  from: { x: number; y: number };
  to: { x: number; y: number };
  // 역방향 곡선용 곡률 키 — 같은 노드 쌍은 일관되게 같은 곡률을 갖도록 인덱스 기반
  keyIndex: number;
}

export function PhaseC3() {
  const meta = PHASES.find((p) => p.id === 'c3')!;
  const markCompleted = useApp((s) => s.markCompleted);

  const [hiddenOn, setHiddenOn] = useState(true); // 0층 vs 1층 토글
  const [hiddenSize, setHiddenSize] = useState(8); // 은닉 뉴런 수 (1~16)
  // 펄스 애니메이션 트리거 — counter 올릴 때마다 새로 시작
  const [pulseId, setPulseId] = useState(0);

  // 시뮬레이션 acc — 은닉 0(=B4)일 땐 단순한 문제만, 은닉 N일 땐 더 잘 풀 수 있다는 직관.
  const { trainAcc0, evalAcc0, trainAccN, evalAccN } = useMemo(() => {
    // 은닉 0층(=B4 결과 가까이): 작은 train·eval acc
    const trainAcc0 = 0.86;
    const evalAcc0 = 0.81;
    // 은닉 N층: 뉴런 수가 많을수록 train ↑, eval은 어느 정도까지 ↑ 후 다시 하향(과적합 직전).
    // C2에서 본 갈림점 직관과 어긋나지 않게.
    const t = Math.min(hiddenSize / 16, 1);
    const tr = 0.88 + 0.11 * t;
    // eval은 8뉴런 근처에서 정점, 16뉴런이면 다시 살짝 하락.
    const dx = (hiddenSize - 8) / 8;
    const ev = 0.91 - 0.04 * Math.abs(dx);
    return {
      trainAcc0,
      evalAcc0,
      trainAccN: tr,
      evalAccN: ev,
    };
  }, [hiddenSize]);

  // 한 step 진행 → 펄스 애니메이션 트리거 + 처음 1번이라도 누르면 완료
  const completedRef = useRef(false);
  const onStep = () => {
    setPulseId((p) => p + 1);
    if (!completedRef.current) {
      completedRef.current = true;
      markCompleted('c3');
    }
  };

  // PLAN ## 10-2 V2: 입력 4 / 은닉 3 / 출력 2 — 다이어그램 자체는 고정 사양 그대로.
  // 슬라이더의 hiddenSize 변화는 우측 통계로 반영하고, 좌측 다이어그램은 고정값으로 유지한다.
  // (학생이 그림에서 "은닉이 있다/없다"만 즉시 보면 충분 — 노드 수가 흔들리면 시각이 어수선)
  const showHiddenLayer = hiddenOn;

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2 text-sm leading-relaxed">
        지금까지는 출력층 뉴런만으로 라벨을 갈랐어요. 입력과 출력 사이에 *은닉층*을 두면
        모델이 더 복잡한 패턴을 잡을 수 있고, 학습할 때 오차 신호가 출력 쪽에서 입력 쪽으로
        <strong> 거꾸로 흘러가요.</strong> 이 거꾸로 흐름이 신경망 학습의 핵심이에요.
      </p>

      <div className="mt-4 grid lg:grid-cols-[1.4fr_1fr] gap-4 items-start">
        {/* 좌측 — 네트워크 다이어그램 */}
        <div className="card p-3">
          <div className="flex items-baseline justify-between">
            <div className="text-sm font-medium">은닉층이 있는 작은 네트워크</div>
            <div className="text-[11px] font-mono text-muted">
              <span style={{ color: 'rgb(var(--color-muted))' }}>● 정방향</span>
              <span className="ml-3" style={{ color: 'rgb(190,18,60)' }}>● 역전파</span>
            </div>
          </div>

          <NetworkDiagramSmall
            showHidden={showHiddenLayer}
            pulseId={pulseId}
          />

          <div className="flex flex-wrap gap-2 mt-2">
            <button onClick={onStep} className="btn-primary">
              ▶ 한 step 진행
            </button>
            <span className="text-[11px] text-muted self-center">
              누르면 빨간 점선이 출력 → 은닉 → 입력 방향으로 펄스해요.
            </span>
          </div>
        </div>

        {/* 우측 — 모델 복잡도 컨트롤 */}
        <div className="space-y-3">
          <div className="card p-3 space-y-3">
            <div className="text-sm font-medium">모델 복잡도</div>

            {/* 은닉층 토글 */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12px]">은닉층</span>
              <div className="inline-flex rounded-md border border-border overflow-hidden">
                <button
                  onClick={() => setHiddenOn(false)}
                  className={`px-3 py-1.5 text-xs transition ${
                    !hiddenOn ? 'bg-accent text-white' : 'bg-bg text-muted hover:bg-surface'
                  }`}
                >
                  0층 (=B4)
                </button>
                <button
                  onClick={() => setHiddenOn(true)}
                  className={`px-3 py-1.5 text-xs transition ${
                    hiddenOn ? 'bg-accent text-white' : 'bg-bg text-muted hover:bg-surface'
                  }`}
                >
                  1층
                </button>
              </div>
            </div>

            {/* 은닉 뉴런 수 슬라이더 */}
            <div>
              <div className="flex items-baseline justify-between text-[12px]">
                <span>은닉 뉴런 수</span>
                <span className="font-mono text-accent">{hiddenSize}</span>
              </div>
              <input
                type="range"
                min={1}
                max={16}
                value={hiddenSize}
                onChange={(e) => setHiddenSize(Number(e.target.value))}
                disabled={!hiddenOn}
                className="w-full accent-violet-600 disabled:opacity-40"
              />
              <div className="flex justify-between text-[10px] font-mono text-muted">
                <span>1</span>
                <span>8</span>
                <span>16</span>
              </div>
            </div>

            {/* 정확도 비교 */}
            <div className="pt-1 space-y-2">
              <ResultRow
                title="은닉 0층 (=B4 결과)"
                trainAcc={trainAcc0}
                evalAcc={evalAcc0}
                muted
              />
              <ResultRow
                title={`은닉 1층 · ${hiddenSize}뉴런`}
                trainAcc={trainAccN}
                evalAcc={evalAccN}
                emphasize={hiddenOn}
              />
            </div>

            <div className="text-[10px] text-muted leading-snug">
              ※ 평가 정확도는 어느 지점까지 오르다가 다시 살짝 떨어져요 (C2에서 본 갈림점).
              모델 복잡도를 무한정 키우는 게 답은 아니라는 뜻.
            </div>
          </div>
        </div>
      </div>

      {/* 하단 — 역전파 박스 (PLAN ## 10-1 #6 본문 그대로) */}
      <div
        className="mt-4 rounded-md border px-4 py-3 text-sm leading-relaxed"
        style={{
          borderColor: 'rgb(190,18,60)',
          backgroundColor: 'rgba(190,18,60,0.05)',
        }}
      >
        <div className="text-[12px] font-mono mb-1" style={{ color: 'rgb(190,18,60)' }}>
          역전파 (backpropagation)
        </div>
        <p className="mb-2">
          은닉층이 생기면 가중치가 여러 층에 흩어져 있어, 어느 가중치를 얼마나 고쳐야 할지 한눈에 알기 어려워요.
        </p>
        <p className="mb-2">
          출력층의 오차는 <strong>A4에서 본 그대로</strong> (예측 − 정답)예요. 은닉층은 자기 정답이 없지만,
          {' '}<em>바로 뒷층의 오차</em>를 받아 자기 몫으로 나눠 가집니다 — 그래서 화살이 <strong>거꾸로</strong> 흘러요.
          이 거꾸로 흐름이 <strong>역전파(backpropagation)</strong> 예요.
        </p>
        <p>
          각 가중치는 A4에서 본 <code>dw = 평균(e·x)</code> 모양의 식을 자기 층 입력 x로 똑같이 써서 갱신돼요.
          {' '}<strong>A5에서 본 한 step의 갱신식이 모든 층에 동시에 적용</strong>된다고 보면 됩니다.
        </p>
      </div>
    </article>
  );
}

/* ────────── NetworkDiagram 직접 구현 — 입력 4 / 은닉 3 / 출력 2 ──────────
   PLAN ## 10-2 V2 시각화 사양:
   - 정방향: 회색 얇은 간선 (왼→오)
   - 역방향: 빨간 점선 곡선 stroke="rgb(190,18,60)" strokeDasharray="7 5"
   - 화살촉 입력 쪽으로
   - 출력 → 은닉 → 입력 방향, 0.3초 시차 펄스
   - 한 step 진행 버튼 → 펄스 애니메이션
*/
function NetworkDiagramSmall({
  showHidden,
  pulseId,
}: {
  showHidden: boolean;
  pulseId: number;
}) {
  // 정방향 간선
  const fwdEdges: Edge[] = useMemo(() => {
    const e: Edge[] = [];
    let key = 0;
    if (showHidden) {
      // input → hidden
      INPUT_Y.forEach((iy) => {
        HIDDEN_Y.forEach((hy) => {
          e.push({
            from: { x: COL_X.input, y: iy },
            to: { x: COL_X.hidden, y: hy },
            keyIndex: key++,
          });
        });
      });
      // hidden → output
      HIDDEN_Y.forEach((hy) => {
        OUTPUT_Y.forEach((oy) => {
          e.push({
            from: { x: COL_X.hidden, y: hy },
            to: { x: COL_X.output, y: oy },
            keyIndex: key++,
          });
        });
      });
    } else {
      // input → output (직접)
      INPUT_Y.forEach((iy) => {
        OUTPUT_Y.forEach((oy) => {
          e.push({
            from: { x: COL_X.input, y: iy },
            to: { x: COL_X.output, y: oy },
            keyIndex: key++,
          });
        });
      });
    }
    return e;
  }, [showHidden]);

  // 역방향 간선 — output→hidden 다음에 hidden→input 순서로 그룹 분리
  // (펄스는 두 그룹에 0.3초 시차로)
  const backLayer1: Edge[] = useMemo(() => {
    if (!showHidden) {
      // output → input (직접)
      const e: Edge[] = [];
      let k = 0;
      OUTPUT_Y.forEach((oy) => {
        INPUT_Y.forEach((iy) => {
          e.push({
            from: { x: COL_X.output, y: oy },
            to: { x: COL_X.input, y: iy },
            keyIndex: k++,
          });
        });
      });
      return e;
    }
    // output → hidden
    const e: Edge[] = [];
    let k = 0;
    OUTPUT_Y.forEach((oy) => {
      HIDDEN_Y.forEach((hy) => {
        e.push({
          from: { x: COL_X.output, y: oy },
          to: { x: COL_X.hidden, y: hy },
          keyIndex: k++,
        });
      });
    });
    return e;
  }, [showHidden]);

  const backLayer2: Edge[] = useMemo(() => {
    if (!showHidden) return [];
    const e: Edge[] = [];
    let k = 0;
    HIDDEN_Y.forEach((hy) => {
      INPUT_Y.forEach((iy) => {
        e.push({
          from: { x: COL_X.hidden, y: hy },
          to: { x: COL_X.input, y: iy },
          keyIndex: k++,
        });
      });
    });
    return e;
  }, [showHidden]);

  // 곡선 path — 가운데 control point를 살짝 위/아래로 흔들어 곡선처럼
  const curvePath = (e: Edge): string => {
    const mx = (e.from.x + e.to.x) / 2;
    const my = (e.from.y + e.to.y) / 2;
    // 곡률은 keyIndex 기반으로 약간씩 달리해 다발이 보이도록
    const offset = ((e.keyIndex % 5) - 2) * 6;
    return `M ${e.from.x} ${e.from.y} Q ${mx} ${my + offset} ${e.to.x} ${e.to.y}`;
  };

  // 화살촉 — 역방향용. 입력 쪽으로 향하므로 곡선 끝에 자동 orient.
  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${NET_W} ${NET_H}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <marker
            id="c3-back-arr"
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 z" fill="rgb(190,18,60)" />
          </marker>
          {/* 펄스 애니메이션 — strokeDashoffset 흐름 */}
          <style>{`
            @keyframes nv-backflow {
              0%   { stroke-dashoffset: 24; opacity: 0.15; }
              25%  { opacity: 1; }
              100% { stroke-dashoffset: 0;  opacity: 0.85; }
            }
            .nv-back-edge {
              stroke: rgb(190,18,60);
              stroke-width: 1.4;
              fill: none;
              stroke-dasharray: 7 5;
              opacity: 0.55;
            }
            .nv-back-edge.pulsing-1 {
              animation: nv-backflow 0.55s ease-out 1;
            }
            .nv-back-edge.pulsing-2 {
              animation: nv-backflow 0.55s ease-out 1;
              animation-delay: 0.3s;
            }
            .nv-fwd-edge {
              stroke: rgb(var(--color-muted));
              stroke-width: 0.8;
              stroke-opacity: 0.45;
              fill: none;
            }
          `}</style>
        </defs>

        {/* 컬럼 라벨 */}
        <text x={COL_X.input} y={20} textAnchor="middle" fontSize={11}
          fill="rgb(var(--color-muted))" fontWeight={600}>입력 (4)</text>
        {showHidden && (
          <text x={COL_X.hidden} y={20} textAnchor="middle" fontSize={11}
            fill="rgb(var(--color-muted))" fontWeight={600}>은닉 (3)</text>
        )}
        <text x={COL_X.output} y={20} textAnchor="middle" fontSize={11}
          fill="rgb(var(--color-muted))" fontWeight={600}>출력 (2)</text>

        {/* 정방향 간선 */}
        {fwdEdges.map((e) => (
          <line
            key={`fwd-${e.keyIndex}`}
            x1={e.from.x}
            y1={e.from.y}
            x2={e.to.x}
            y2={e.to.y}
            className="nv-fwd-edge"
          />
        ))}

        {/* 역방향 간선 — layer1 (출력→은닉 또는 출력→입력) */}
        <g key={`back1-${pulseId}`}>
          {backLayer1.map((e) => (
            <path
              key={`b1-${e.keyIndex}`}
              d={curvePath(e)}
              className={`nv-back-edge${pulseId > 0 ? ' pulsing-1' : ''}`}
              markerEnd="url(#c3-back-arr)"
            />
          ))}
        </g>

        {/* 역방향 간선 — layer2 (은닉→입력) */}
        {showHidden && (
          <g key={`back2-${pulseId}`}>
            {backLayer2.map((e) => (
              <path
                key={`b2-${e.keyIndex}`}
                d={curvePath(e)}
                className={`nv-back-edge${pulseId > 0 ? ' pulsing-2' : ''}`}
                markerEnd="url(#c3-back-arr)"
              />
            ))}
          </g>
        )}

        {/* 노드 — 입력 4 */}
        {INPUT_Y.map((y, i) => (
          <Node key={`i-${i}`} cx={COL_X.input} cy={y} label={`x${i + 1}`} />
        ))}
        {/* 노드 — 은닉 3 */}
        {showHidden &&
          HIDDEN_Y.map((y, i) => (
            <Node key={`h-${i}`} cx={COL_X.hidden} cy={y} label={`h${i + 1}`} mid />
          ))}
        {/* 노드 — 출력 2 */}
        {OUTPUT_Y.map((y, i) => (
          <Node key={`o-${i}`} cx={COL_X.output} cy={y} label={`y${i + 1}`} accent />
        ))}
      </svg>
    </div>
  );
}

function Node({
  cx,
  cy,
  label,
  accent,
  mid,
}: {
  cx: number;
  cy: number;
  label: string;
  accent?: boolean;
  mid?: boolean;
}) {
  const fill = accent
    ? 'rgb(var(--color-accent))'
    : mid
    ? 'rgb(var(--color-accent-bg))'
    : 'rgb(var(--color-surface))';
  const stroke = accent ? 'rgb(var(--color-accent))' : 'rgb(var(--color-muted))';
  const txt = accent ? '#fff' : 'rgb(var(--color-text))';
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={16}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.2}
        strokeOpacity={accent ? 1 : 0.6}
      />
      <text
        x={cx}
        y={cy + 4}
        textAnchor="middle"
        fontSize={11}
        fontWeight={700}
        fill={txt}
      >
        {label}
      </text>
    </g>
  );
}

/* ────────── 우측 — 결과 한 줄 ────────── */
function ResultRow({
  title,
  trainAcc,
  evalAcc,
  muted,
  emphasize,
}: {
  title: string;
  trainAcc: number;
  evalAcc: number;
  muted?: boolean;
  emphasize?: boolean;
}) {
  return (
    <div
      className="rounded-md border p-2"
      style={{
        borderColor: emphasize
          ? 'rgb(var(--color-accent))'
          : 'rgb(var(--color-border))',
        backgroundColor: emphasize ? 'rgb(var(--color-accent-bg))' : 'transparent',
        opacity: muted ? 0.75 : 1,
      }}
    >
      <div className="text-[11px]">{title}</div>
      <div className="flex gap-3 mt-1 text-xs font-mono">
        <span>
          <span className="text-muted">train </span>
          <span style={{ color: 'rgb(59,130,246)' }}>
            {(trainAcc * 100).toFixed(1)}%
          </span>
        </span>
        <span>
          <span className="text-muted">eval </span>
          <span style={{ color: 'rgb(234,88,12)' }}>
            {(evalAcc * 100).toFixed(1)}%
          </span>
        </span>
      </div>
    </div>
  );
}
