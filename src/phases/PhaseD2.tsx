// PhaseD2 — 분류 평가
// 두 갈래로 가르치는 챕터:
//   1) 시나리오 4 개 (암 검진 / 스팸 필터 / 가짜 댓글 / 공항 보안) — 어떤 실수가 더 아픈지에 따라
//      좋은 모델이 달라진다는 직관. 학생이 모델 A/B 중 하나를 고르고 즉시 해설.
//   2) 임계값 슬라이더 — 한 모델의 100개 점수·정답을 두고 임계값을 0~1 사이에서 옮기면
//      혼동 행렬과 정확도·정밀도·재현율·F1 이 실시간으로 변한다.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import { PHASES } from '../phases';

const STEP_LABELS = [
  '1. 도입',
  '2. 혼동 행렬',
  '3. 정밀도 · 재현율',
  '4. 시나리오 비교',
  '5. 임계값 슬라이더',
  '6. F1 — 절충안',
];

interface Matrix { tp: number; fp: number; fn: number; tn: number }

interface Scenario {
  id: string;
  name: string;
  blurb: string;
  fnCost: string;
  fpCost: string;
  bestModel: 'A' | 'B';
  bestReason: string;
  whichMetric: string;
  A: Matrix;
  B: Matrix;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'cancer',
    name: '암 검진',
    blurb: '진료실에서 사용하는 1차 선별 검사. 양성으로 뜨면 정밀 검사로 다시 확인합니다.',
    fnCost: '실제 암인데 "음성"이라고 답하면 환자가 치료 시기를 놓침 — 치명적.',
    fpCost: '실제 암이 아닌데 "양성"이라고 답하면 추가 검사로 확인 — 시간·비용 손실은 있지만 회복 가능.',
    bestModel: 'A',
    bestReason: 'FN(놓침)이 환자 생명을 위협하므로 재현율(놓치지 않기) 우선. 모델 A는 거의 모든 환자를 잡아냄.',
    whichMetric: '재현율',
    A: { tp: 95, fn: 5,  fp: 200, tn: 700 }, // 재현율 95%, 정밀도 32%
    B: { tp: 80, fn: 20, fp: 20,  tn: 880 }, // 재현율 80%, 정밀도 80%
  },
  {
    id: 'spam',
    name: '스팸 필터',
    blurb: '받은 메일함에서 스팸을 자동으로 휴지통에 보내는 필터.',
    fnCost: '스팸을 못 막아 메일함에 들어옴 — 짜증나지만 사용자가 직접 지우면 그만.',
    fpCost: '정상 메일을 스팸으로 보내 사용자가 영영 못 봄 — 합격 통지·예약 확인 등을 놓침. 큰 피해.',
    bestModel: 'A',
    bestReason: 'FP(정상 메일 삭제)가 사용자에게 더 큰 피해. 정밀도(양성 판정이 맞을 확률) 우선. 모델 A는 정밀도가 거의 100%.',
    whichMetric: '정밀도',
    A: { tp: 380, fn: 20, fp: 15,  tn: 585 }, // 재현율 95%, 정밀도 96%
    B: { tp: 400, fn: 0,  fp: 100, tn: 500 }, // 재현율 100%, 정밀도 80%
  },
  {
    id: 'fake-comment',
    name: '가짜 댓글 삭제',
    blurb: '광고·여론 조작용 가짜 댓글을 자동으로 가리는 모더레이션 모델.',
    fnCost: '가짜를 못 잡으면 게시판이 광고·조작으로 오염 — 서비스 신뢰도 하락.',
    fpCost: '정상 댓글을 가짜로 삭제하면 검열 시비 — 사용자 이탈.',
    bestModel: 'B',
    bestReason: '둘 다 무겁고 어느 한쪽으로 기울 수 없음 → F1(둘의 균형)이 더 높은 쪽이 적합. 모델 B의 F1이 약간 더 높음.',
    whichMetric: 'F1',
    A: { tp: 70, fn: 30, fp: 10, tn: 890 }, // 재현율 70%, 정밀도 88%, F1 78%
    B: { tp: 85, fn: 15, fp: 30, tn: 870 }, // 재현율 85%, 정밀도 74%, F1 79%
  },
  {
    id: 'airport',
    name: '공항 보안 검색',
    blurb: '수하물 X-ray에서 위협 물품(폭발물·무기)을 자동 탐지.',
    fnCost: '실제 위협을 못 잡으면 — 끔찍한 결과. 절대 놓치면 안 됨.',
    fpCost: '위협이 아닌 가방을 위협으로 잘못 표시 — 인력이 추가 검사. 시간 손실은 있지만 안전.',
    bestModel: 'A',
    bestReason: '암 검진과 같은 논리, 더 극단적. 재현율을 최우선으로 — 99% 잡는 A가 90%인 B보다 훨씬 안전.',
    whichMetric: '재현율',
    A: { tp: 99, fn: 1,  fp: 400, tn: 9500 }, // 재현율 99%, 정밀도 ~20%
    B: { tp: 90, fn: 10, fp: 50,  tn: 9850 }, // 재현율 90%, 정밀도 64%
  },
];

// 임계값 슬라이더용 가짜 데이터 — 100개 (score, label) 쌍.
// 양성 50, 음성 50. 양성은 점수 분포가 우편향, 음성은 좌편향. 중간에서 약간 겹치게.
function generateScoredSamples(): { score: number; label: 0 | 1 }[] {
  // 결정론적 — 같은 시드. seededRandom 으로 안정 (간단 LCG)
  let seed = 42;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const samples: { score: number; label: 0 | 1 }[] = [];
  for (let i = 0; i < 50; i++) {
    // 양성: 평균 0.7, 좌우 0.2 정도 흩어짐, 0~1 클램프
    const s = clamp01(0.7 + (rand() - 0.5) * 0.55);
    samples.push({ score: s, label: 1 });
  }
  for (let i = 0; i < 50; i++) {
    // 음성: 평균 0.3, 흩어짐
    const s = clamp01(0.3 + (rand() - 0.5) * 0.55);
    samples.push({ score: s, label: 0 });
  }
  samples.sort((a, b) => a.score - b.score);
  return samples;
}
function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }

const SAMPLES = generateScoredSamples();

function computeMetrics(m: Matrix) {
  const total = m.tp + m.fp + m.fn + m.tn;
  const accuracy = total === 0 ? 0 : (m.tp + m.tn) / total;
  const predPos = m.tp + m.fp;
  const actualPos = m.tp + m.fn;
  const precision = predPos === 0 ? 0 : m.tp / predPos;
  const recall = actualPos === 0 ? 0 : m.tp / actualPos;
  const f1 = (precision + recall) === 0 ? 0 : 2 * precision * recall / (precision + recall);
  return { accuracy, precision, recall, f1 };
}

function matrixFromThreshold(threshold: number): Matrix {
  let tp = 0, fp = 0, fn = 0, tn = 0;
  for (const s of SAMPLES) {
    const pred = s.score >= threshold ? 1 : 0;
    if (s.label === 1 && pred === 1) tp++;
    else if (s.label === 0 && pred === 1) fp++;
    else if (s.label === 1 && pred === 0) fn++;
    else tn++;
  }
  return { tp, fp, fn, tn };
}

export function PhaseD2() {
  const meta = PHASES.find((p) => p.id === 'd2')!;
  const markCompleted = useApp((s) => s.markCompleted);

  const [step, setStep] = useState(0);

  // 시나리오 선택 상태
  const [picks, setPicks] = useState<Record<string, 'A' | 'B' | undefined>>({});
  const allScenariosAnswered = SCENARIOS.every((s) => picks[s.id]);

  // 임계값
  const [threshold, setThreshold] = useState(0.5);
  const [thresholdMoved, setThresholdMoved] = useState(false);
  const m = useMemo(() => matrixFromThreshold(threshold), [threshold]);
  const metrics = useMemo(() => computeMetrics(m), [m]);

  // 완료 조건: 모든 시나리오 답함 + 임계값 한 번 이상 움직임 + 종합 단계 도달
  const completedRef = useRef(false);
  useEffect(() => {
    if (completedRef.current) return;
    if (step >= 5 && allScenariosAnswered && thresholdMoved) {
      completedRef.current = true;
      markCompleted('d2');
    }
  }, [step, allScenariosAnswered, thresholdMoved, markCompleted]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 헤더 */}
      <div>
        <div className="text-xs font-mono text-accent mb-1">{meta.num}</div>
        <h1 className="!mb-1">{meta.title}</h1>
        <p className="text-muted">{meta.subtitle}</p>
      </div>

      {/* 단계 탭 */}
      <div className="flex flex-wrap gap-2">
        {STEP_LABELS.map((label, i) => (
          <button
            key={label}
            onClick={() => setStep(i)}
            className={
              'px-3 py-1.5 text-sm rounded-md border transition ' +
              (step === i
                ? 'bg-accent text-white border-accent'
                : 'border-border text-muted hover:text-fg hover:border-accent/50')
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* 본문 */}
      {step === 0 && <Intro0 />}
      {step === 1 && <Confusion1 />}
      {step === 2 && <FourMetrics2 />}
      {step === 3 && (
        <ScenarioCompare
          picks={picks}
          setPick={(id, v) => setPicks((p) => ({ ...p, [id]: v }))}
          allAnswered={allScenariosAnswered}
        />
      )}
      {step === 4 && (
        <ThresholdLab
          threshold={threshold}
          setThreshold={(v) => { setThreshold(v); setThresholdMoved(true); }}
          matrix={m}
          metrics={metrics}
        />
      )}
      {step === 5 && (
        <Summary
          allAnswered={allScenariosAnswered}
          thresholdMoved={thresholdMoved}
          picks={picks}
          liveMatrix={m}
          liveMetrics={metrics}
          threshold={threshold}
        />
      )}

      {/* 단계 이동 */}
      <div className="flex justify-between">
        <button
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="btn-ghost px-4 py-2 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← 이전
        </button>
        <button
          onClick={() => setStep(Math.min(5, step + 1))}
          disabled={step === 5}
          className="btn-primary px-4 py-2 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
        >
          다음 →
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────── 단계 0: 도입 ─────────────────────────── */
function Intro0() {
  return (
    <div className="card p-5 space-y-3 text-sm leading-relaxed">
      <div className="font-medium text-base">정확도 한 숫자로는 부족할 때</div>
      <p>
        B4에서 우리는 이진 분류 모델의 정확도(맞춘 비율)를 봤어요. 정확도 92% 라면 꽤 잘하는 모델 같죠.
        그런데 이 한 숫자로는 다음 두 모델의 차이를 설명할 수 없어요.
      </p>
      <div className="grid sm:grid-cols-2 gap-3 text-xs">
        <div className="rounded bg-surface/60 p-3">
          <div className="font-medium mb-1">모델 X</div>
          <div>정확도 92% — 실제 양성 100개 중 95개를 잡아냄</div>
        </div>
        <div className="rounded bg-surface/60 p-3">
          <div className="font-medium mb-1">모델 Y</div>
          <div>정확도 92% — 실제 양성 100개 중 80개만 잡아냄</div>
        </div>
      </div>
      <p>
        같은 92%지만 한 쪽은 양성을 더 잘 잡고, 한 쪽은 음성을 더 잘 가립니다.
        <strong> 어떤 실수가 더 아픈가</strong>에 따라 좋은 모델은 달라져요. 이 챕터에서는 그 차이를
        다섯 숫자로 정리합니다 — 혼동 행렬, 정확도, 정밀도, 재현율, F1, 그리고 임계값.
      </p>
    </div>
  );
}

/* ─────────────────────────── 단계 1: 혼동 행렬 ─────────────────────────── */
function Confusion1() {
  return (
    <div className="space-y-4">
      <div className="card p-5 text-sm leading-relaxed space-y-3">
        <div className="font-medium text-base">혼동 행렬 — 정답×예측 표 한 장</div>
        <p>
          어떤 모델이 100개 표본에 대해 답한 결과를 정리하려면 정답과 예측을 함께 봐야 해요.
          이걸 2×2 표로 그리면 <strong>혼동 행렬</strong>이에요. 칸이 네 개라 영문 약자가 흔히 쓰입니다.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <ConfusionMatrixCard
          tp={42} fp={8} fn={3} tn={47}
          highlight={null}
        />
        <div className="card p-4 text-sm space-y-3 leading-relaxed">
          <div className="font-medium">네 칸 읽는 법</div>
          <ul className="space-y-2 text-xs">
            <li><strong>TP</strong> (참 양성) — 실제 양성을 양성으로 맞힘 ✓</li>
            <li><strong>FP</strong> (거짓 양성) — 실제 음성을 양성으로 잘못 — <em>오경보</em></li>
            <li><strong>FN</strong> (거짓 음성) — 실제 양성을 음성으로 잘못 — <em>놓침</em></li>
            <li><strong>TN</strong> (참 음성) — 실제 음성을 음성으로 맞힘 ✓</li>
          </ul>
          <p className="text-muted">
            대각선(TP, TN)이 맞춘 자리, 반대 대각선(FP, FN)이 틀린 자리예요.
            앞으로 나올 모든 지표는 이 네 숫자의 조합일 뿐입니다.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── 단계 2: 정밀도 · 재현율 두 갈래 ─────────────────────────── */
function FourMetrics2() {
  // 예시 행렬 — 직관적 숫자
  const m: Matrix = { tp: 42, fp: 8, fn: 3, tn: 47 };
  const k = computeMetrics(m);
  return (
    <div className="space-y-4">
      <div className="card p-5 text-sm leading-relaxed space-y-2">
        <div className="font-medium text-base">정밀도와 재현율 — 분류 모델을 가르는 두 갈래</div>
        <p>
          도입에서 봤듯이 정확도 한 숫자는 양성·음성 비율이 치우치면 속기 쉬워요. 그래서 분류 모델을 본격적으로
          비교할 때는 거의 항상 <strong>정밀도</strong>와 <strong>재현율</strong> 두 숫자를 함께 봅니다.
          이 둘이 분류 모델을 가르는 핵심 두 갈래예요.
        </p>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-4">
        <ConfusionMatrixCard {...m} highlight={null} />
        <div className="card p-4 space-y-3 text-sm">
          <MetricRow
            name="정밀도 (Precision)"
            formula="TP / (TP + FP) = TP / 예측 양성"
            calc={`${m.tp} / (${m.tp} + ${m.fp}) = ${m.tp} / ${m.tp + m.fp} = ${k.precision.toFixed(3)}`}
            mean="내가 양성이라고 한 것 중 진짜 양성의 비율. 1에 가까울수록 '내 양성 판정은 거짓말 안 함'. → 오경보(FP)가 무서운 상황에 우선."
          />
          <MetricRow
            name="재현율 (Recall)"
            formula="TP / (TP + FN) = TP / 실제 양성"
            calc={`${m.tp} / (${m.tp} + ${m.fn}) = ${m.tp} / ${m.tp + m.fn} = ${k.recall.toFixed(3)}`}
            mean="실제 양성을 얼마나 놓치지 않았나. 1에 가까울수록 '진짜 양성을 거의 다 잡음'. → 놓침(FN)이 치명적인 상황에 우선."
          />
        </div>
      </div>

      <div className="card p-4 text-sm leading-relaxed space-y-2">
        <div className="font-medium">두 갈래의 트레이드오프 — 보통 한쪽이 올라가면 다른 쪽이 내려간다</div>
        <p>
          정밀도와 재현율은 동시에 1.0이 되기 어려워요. 다음 두 극단을 떠올려 보세요.
        </p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li><strong>완전 정밀도 우선 모델</strong> — "정말 확실한 것만 양성으로 답하자" → 양성 판정 개수가 적음 → FP는 거의 0이지만 FN은 늘어남. <em>정밀도↑ · 재현율↓</em></li>
          <li><strong>완전 재현율 우선 모델</strong> — "조금이라도 의심되면 다 양성" → 양성 판정이 많음 → FN은 거의 0이지만 FP가 폭증. <em>재현율↑ · 정밀도↓</em></li>
        </ul>
        <p>
          그래서 같은 데이터에 같은 모델이라도 <strong>임계값을 어디 두느냐</strong>에 따라 정밀도·재현율 비중이 바뀝니다.
          이 부분은 ⑤ 임계값 슬라이더에서 직접 만져 봅니다.
        </p>
        <div className="rounded bg-surface/60 p-3 text-xs">
          <div className="font-medium mb-1">현재 예시 행렬에서 — 정확도는 참고용</div>
          <span className="font-mono">정확도 = (TP+TN)/전체 = ({m.tp}+{m.tn})/{m.tp + m.fp + m.fn + m.tn} = {k.accuracy.toFixed(3)}</span>
          <p className="mt-1 text-muted">정확도는 도입에서 다뤘듯이 양·음 비율이 치우치면 속기 쉬워요. 본격 비교는 정밀도와 재현율 두 갈래로 합니다.</p>
        </div>
      </div>

      <div className="aside-tip text-sm">
        <div className="font-medium">📌 F1은 마지막 단계에서</div>
        <p className="mt-1">
          정밀도·재현율이 둘 다 중요한 상황에서는 두 갈래를 하나의 점수로 합쳐 보는 절충안이 필요해요.
          그 절충안이 <strong>F1</strong>인데, 어떻게 계산하고 왜 단순 평균이 아니라 조화평균인지는
          ⑥ 단계에서 본격적으로 다룹니다.
        </p>
      </div>
    </div>
  );
}

function MetricRow({ name, formula, calc, mean }: { name: string; formula: string; calc: string; mean: string }) {
  return (
    <div className="border-b border-border pb-3 last:border-b-0 last:pb-0">
      <div className="font-medium text-sm">{name}</div>
      <div className="font-mono text-xs text-muted mt-1">{formula}</div>
      <div className="font-mono text-xs mt-1">{calc}</div>
      <div className="text-xs text-muted mt-1">{mean}</div>
    </div>
  );
}

/* ─────────────────────────── 단계 3: 시나리오 비교 ─────────────────────────── */
function ScenarioCompare({
  picks, setPick, allAnswered,
}: {
  picks: Record<string, 'A' | 'B' | undefined>;
  setPick: (id: string, v: 'A' | 'B') => void;
  allAnswered: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="card p-5 text-sm leading-relaxed space-y-2">
        <div className="font-medium text-base">시나리오마다 좋은 모델은 다르다</div>
        <p>
          네 가지 상황을 보고 모델 A와 B 중 어느 쪽이 그 상황에 더 적합한지 골라 보세요.
          정답이 정해진 게 아니라 <strong>어떤 실수가 더 아픈가</strong>에 따라 답이 달라집니다.
          각 시나리오의 비용 비대칭과 두 모델의 혼동 행렬을 비교해 가며 골라 보세요.
        </p>
      </div>

      {SCENARIOS.map((sc) => (
        <ScenarioCard
          key={sc.id}
          sc={sc}
          pick={picks[sc.id]}
          onPick={(v) => setPick(sc.id, v)}
        />
      ))}

      {allAnswered && (
        <div className="aside-tip">
          <div className="font-medium">네 시나리오 모두 답했어요.</div>
          <p className="text-sm mt-2">
            정답을 외우는 게 목표가 아니에요. <strong>어떤 실수가 더 아픈지 먼저 묻는 습관</strong>이 핵심이에요.
            다음 단계에서는 한 모델의 임계값을 직접 움직여서, 같은 모델도 어떻게 정밀도·재현율을 바꿔
            가며 시나리오에 맞출 수 있는지 봅니다.
          </p>
        </div>
      )}
    </div>
  );
}

function ScenarioCard({ sc, pick, onPick }: { sc: Scenario; pick?: 'A' | 'B'; onPick: (v: 'A' | 'B') => void }) {
  const mA = computeMetrics(sc.A);
  const mB = computeMetrics(sc.B);
  return (
    <div className="card p-5 space-y-4">
      <div>
        <div className="text-xs font-mono text-accent">시나리오 — {sc.name}</div>
        <p className="text-sm mt-1">{sc.blurb}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 text-xs">
        <div className="rounded bg-rose-50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/50 p-3">
          <div className="font-medium text-rose-700 dark:text-rose-300 mb-1">FN — 놓침의 비용</div>
          <div>{sc.fnCost}</div>
        </div>
        <div className="rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/50 p-3">
          <div className="font-medium text-amber-700 dark:text-amber-300 mb-1">FP — 오경보의 비용</div>
          <div>{sc.fpCost}</div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <ModelMiniCard letter="A" m={sc.A} k={mA} picked={pick === 'A'} onClick={() => onPick('A')} />
        <ModelMiniCard letter="B" m={sc.B} k={mB} picked={pick === 'B'} onClick={() => onPick('B')} />
      </div>

      {pick && (
        <div className={
          'rounded p-3 text-xs leading-relaxed ' +
          (pick === sc.bestModel
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/50'
            : 'bg-slate-50 dark:bg-slate-900/40 border border-border')
        }>
          <div className="font-medium text-sm mb-1">
            {pick === sc.bestModel ? '✓ 일반적으로 이 답이 적합합니다' : '한 번 더 생각해 볼 자리예요'} —
            추천 답: 모델 {sc.bestModel} ({sc.whichMetric} 우선)
          </div>
          <p>{sc.bestReason}</p>
        </div>
      )}
    </div>
  );
}

function ModelMiniCard({ letter, m, k, picked, onClick }: {
  letter: 'A' | 'B'; m: Matrix; k: ReturnType<typeof computeMetrics>; picked: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        'text-left rounded-md p-3 border-2 transition ' +
        (picked ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/40 bg-surface/40')
      }
    >
      <div className="flex items-baseline justify-between mb-2">
        <div className="font-medium">모델 {letter}</div>
        <div className="text-[10px] font-mono text-muted">전체 {m.tp + m.fp + m.fn + m.tn}건</div>
      </div>
      <div className="grid grid-cols-2 gap-1 text-[11px] font-mono mb-2">
        <div className="rounded bg-emerald-100 dark:bg-emerald-950/40 px-2 py-1">TP {m.tp}</div>
        <div className="rounded bg-amber-100 dark:bg-amber-950/40 px-2 py-1">FP {m.fp}</div>
        <div className="rounded bg-rose-100 dark:bg-rose-950/40 px-2 py-1">FN {m.fn}</div>
        <div className="rounded bg-slate-100 dark:bg-slate-900/40 px-2 py-1">TN {m.tn}</div>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
        <div>정확도 <span className="font-mono">{(k.accuracy * 100).toFixed(1)}%</span></div>
        <div>F1 <span className="font-mono">{(k.f1 * 100).toFixed(1)}%</span></div>
        <div>정밀도 <span className="font-mono">{(k.precision * 100).toFixed(1)}%</span></div>
        <div>재현율 <span className="font-mono">{(k.recall * 100).toFixed(1)}%</span></div>
      </div>
    </button>
  );
}

/* ─────────────────────────── 단계 4: 임계값 슬라이더 ─────────────────────────── */
function ThresholdLab({
  threshold, setThreshold, matrix, metrics,
}: {
  threshold: number;
  setThreshold: (v: number) => void;
  matrix: Matrix;
  metrics: ReturnType<typeof computeMetrics>;
}) {
  return (
    <div className="space-y-4">
      <div className="card p-5 text-sm leading-relaxed space-y-2">
        <div className="font-medium text-base">임계값 — 같은 모델, 다른 판정</div>
        <p>
          B4에서 "<code>σ(z) ≥ 0.5</code>이면 양성"이라고 약속했죠. 사실 그 <strong>0.5는 우리가 골라 쓰는 값</strong>이에요.
          모델이 만든 점수는 그대로지만, <strong>임계값</strong>을 어디로 두느냐에 따라 양성 판정의 개수가 바뀌고
          정확도·정밀도·재현율·F1이 함께 바뀝니다.
        </p>
        <p>
          아래 100명의 환자가 있다고 해 봐요. 각 환자마다 모델이 0~1 사이 점수를 매겼고, 진짜 양성/음성도 알고 있어요.
          슬라이더로 임계값을 옮기면 그 점수 이상인 사람은 양성으로 판정합니다.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        <div className="space-y-4">
          {/* 점수 분포 시각화 */}
          <div className="card p-4">
            <ScoreDistribution threshold={threshold} />
            <div className="text-xs text-muted mt-2">
              가로축 = 모델이 매긴 점수 (0~1). 빨강 = 실제 양성, 회색 = 실제 음성. 노란 세로선 = 임계값.
              임계값 오른쪽은 모두 양성 판정, 왼쪽은 음성 판정.
            </div>
          </div>

          {/* 슬라이더 */}
          <div className="card p-4 space-y-2">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">임계값</span>
              <span className="font-mono">{threshold.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0} max={1} step={0.01}
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted font-mono">
              <span>0.00 (다 양성)</span>
              <span>0.50 (기본)</span>
              <span>1.00 (다 음성)</span>
            </div>
            <div className="flex gap-2 pt-2">
              {[0.2, 0.5, 0.8].map((v) => (
                <button
                  key={v}
                  onClick={() => setThreshold(v)}
                  className="btn-ghost text-xs px-2 py-1"
                >
                  {v.toFixed(2)}
                </button>
              ))}
            </div>
          </div>

          {/* 관찰 가이드 */}
          <div className="card p-4 text-sm space-y-2 leading-relaxed">
            <div className="font-medium">관찰 — 슬라이더를 움직이며 확인</div>
            <ul className="list-disc list-inside text-xs space-y-1">
              <li>임계값을 <strong>낮추면</strong> 양성 판정이 늘어 — 재현율↑(놓치지 않음), 정밀도↓(오경보 늘어남)</li>
              <li>임계값을 <strong>높이면</strong> 양성 판정이 줄어 — 정밀도↑(확실한 것만), 재현율↓(놓침 늘어남)</li>
              <li>같은 모델이라도 임계값으로 정밀도 우선 ↔ 재현율 우선을 직접 옮길 수 있다 — 이게 핵심 트레이드오프</li>
              <li>두 갈래의 균형을 한 숫자로 보고 싶다면 다음 ⑥ 단계의 <strong>F1 절충안</strong></li>
            </ul>
          </div>
        </div>

        {/* 우측 — 혼동 행렬 + 지표 카드 (이 단계에서는 정밀도·재현율 두 갈래만 표시. F1은 ⑥ 단계에서) */}
        <aside className="space-y-4">
          <ConfusionMatrixCard {...matrix} highlight={null} />
          <div className="card p-4 space-y-2">
            <div className="font-medium text-sm">실시간 지표 — 두 갈래</div>
            <MetricLine name="정밀도" value={metrics.precision} bold />
            <MetricLine name="재현율" value={metrics.recall}  bold />
            <div className="border-t border-border pt-2 mt-1">
              <MetricLine name="정확도 (참고)" value={metrics.accuracy} />
            </div>
            <div className="text-[11px] text-muted pt-1 border-t border-border">
              F1은 다음 ⑥ 단계에서 — 정밀도·재현율 두 숫자를 어떻게 한 점수로 합치는지 (조화평균 식·계산법).
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function MetricLine({ name, value, bold }: { name: string; value: number; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={bold ? 'font-medium' : ''}>{name}</span>
      <div className="flex items-center gap-2 w-44">
        <div className="flex-1 h-2 rounded bg-surface/60 overflow-hidden">
          <div className="h-full bg-accent" style={{ width: `${(value * 100).toFixed(1)}%` }} />
        </div>
        <span className={'font-mono text-xs w-12 text-right ' + (bold ? 'font-bold' : '')}>
          {(value * 100).toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

function ScoreDistribution({ threshold }: { threshold: number }) {
  const W = 600;
  const H = 140;
  const padL = 16, padR = 16, padT = 12, padB = 24;
  const xPx = (s: number) => padL + s * (W - padL - padR);
  // 점들을 양성/음성 두 줄로 흩뿌리되 score 위치를 가로축으로
  const posSamples = SAMPLES.filter((s) => s.label === 1);
  const negSamples = SAMPLES.filter((s) => s.label === 0);
  const posY = padT + 28;
  const negY = padT + 78;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {/* 축선 */}
      <line x1={padL} x2={W - padR} y1={H - padB} y2={H - padB} stroke="currentColor" opacity={0.2} />
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line x1={xPx(t)} x2={xPx(t)} y1={H - padB} y2={H - padB + 4} stroke="currentColor" opacity={0.3} />
          <text x={xPx(t)} y={H - 6} fontSize="10" textAnchor="middle" fill="currentColor" opacity={0.55}>{t}</text>
        </g>
      ))}

      {/* 라벨 */}
      <text x={padL} y={posY - 16} fontSize="10" fill="currentColor" opacity={0.6}>실제 양성</text>
      <text x={padL} y={negY - 16} fontSize="10" fill="currentColor" opacity={0.6}>실제 음성</text>

      {/* 점들 */}
      {posSamples.map((s, i) => {
        const past = s.score >= threshold;
        return (
          <circle
            key={`p${i}`} cx={xPx(s.score)} cy={posY + (i % 5 - 2) * 3}
            r={4} fill="rgb(220,38,38)" opacity={past ? 0.95 : 0.35} stroke={past ? '#fff' : 'none'} strokeWidth={1}
          />
        );
      })}
      {negSamples.map((s, i) => {
        const past = s.score >= threshold;
        return (
          <circle
            key={`n${i}`} cx={xPx(s.score)} cy={negY + (i % 5 - 2) * 3}
            r={4} fill="rgb(100,116,139)" opacity={past ? 0.95 : 0.35} stroke={past ? '#fff' : 'none'} strokeWidth={1}
          />
        );
      })}

      {/* 임계값 라인 */}
      <line
        x1={xPx(threshold)} x2={xPx(threshold)}
        y1={padT - 2} y2={H - padB + 2}
        stroke="rgb(234,179,8)" strokeWidth={2}
      />
      <text x={xPx(threshold)} y={padT + 4} fontSize="10" textAnchor="middle" fill="rgb(234,179,8)" fontWeight={600}>
        임계값
      </text>
    </svg>
  );
}

/* ─────────────────────────── 단계 5: F1 절충안 ─────────────────────────── */
function Summary({ allAnswered, thresholdMoved, picks, liveMatrix, liveMetrics, threshold }: {
  allAnswered: boolean; thresholdMoved: boolean;
  picks: Record<string, 'A' | 'B' | undefined>;
  liveMatrix: Matrix;
  liveMetrics: ReturnType<typeof computeMetrics>;
  threshold: number;
}) {
  // 손계산 예시 — 도전적인 비대칭 사례
  const exP = 0.80, exR = 0.50;
  const arith = (exP + exR) / 2;
  const harmonic = 2 * exP * exR / (exP + exR);
  return (
    <div className="space-y-4">
      <div className="card p-5 text-sm leading-relaxed space-y-3">
        <div className="font-medium text-base">F1 — 정밀도와 재현율의 절충안</div>
        <p>
          ③ 단계에서 본 것처럼 분류 모델은 보통 <strong>정밀도</strong>(오경보 줄이기)와
          <strong> 재현율</strong>(놓침 줄이기) 두 갈래로 갈립니다. 그런데 두 비용이
          비슷하게 무거운 상황(예: 가짜 댓글 삭제)이면 한 갈래만 보고 모델을 고를 수 없어요.
          이럴 때 두 숫자를 <strong>한 점수로 합치는 절충안</strong>이 <strong>F1</strong>입니다.
        </p>
      </div>

      <div className="card p-5 text-sm leading-relaxed space-y-3">
        <div className="font-medium">왜 단순 평균이 아닐까 — 산술평균의 함정</div>
        <p>
          가장 먼저 떠오르는 방법은 두 숫자의 <strong>산술평균</strong>이에요.
        </p>
        <div className="rounded bg-surface/60 p-3 font-mono text-xs">
          산술평균 = ( 정밀도 + 재현율 ) / 2
        </div>
        <p>
          그런데 산술평균은 한 가지 큰 문제가 있어요. 정밀도 1.0인데 재현율 0.0인 모델
          (= 양성을 단 한 번만 답하고 그 한 번이 정답인 극단적 모델)도 산술평균은 0.5예요.
          이 모델은 실제 양성을 거의 다 놓치는 <em>쓸모없는 모델</em>인데 점수는 평범하게 나옵니다.
        </p>
        <p>
          그래서 두 숫자를 평균낼 때 <strong>"한쪽이 너무 작으면 결과도 같이 작아지는"</strong>
          평균이 필요해요. 그게 <strong>조화평균</strong>이고, 분류에서 부르는 이름이 <strong>F1</strong>입니다.
        </p>
      </div>

      <div className="card p-5 text-sm leading-relaxed space-y-3">
        <div className="font-medium">F1 계산법 — 조화평균</div>
        <div className="rounded bg-surface/60 p-3 font-mono text-xs space-y-1">
          <div>F1 = 2 · 정밀도 · 재현율 / ( 정밀도 + 재현율 )</div>
          <div className="text-muted">(= 두 숫자의 조화평균)</div>
        </div>
        <p>식이 외워지지 않으면 다음 두 줄로 기억하세요.</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li><strong>분자</strong> = 2 × (정밀도) × (재현율) — 두 숫자의 곱에 2를 곱한 값</li>
          <li><strong>분모</strong> = 정밀도 + 재현율 — 두 숫자의 합</li>
          <li>결과는 항상 작은 쪽에 가까워짐. 한쪽이 0이면 분자가 0 → F1 = 0</li>
        </ul>

        <div className="rounded bg-surface/60 p-3 text-xs leading-relaxed">
          <div className="font-medium text-sm mb-1">손계산 예시 — 정밀도 0.80, 재현율 0.50</div>
          <div className="font-mono space-y-0.5 mt-1">
            <div>산술평균 = (0.80 + 0.50) / 2 = {arith.toFixed(3)}  ← 너무 후함</div>
            <div>F1 (조화평균) = 2 × 0.80 × 0.50 / (0.80 + 0.50)</div>
            <div className="pl-12">= 0.80 / 1.30 = {harmonic.toFixed(3)}  ← 작은 쪽(0.50)에 더 가까움</div>
          </div>
          <p className="mt-2 text-muted">
            "재현율이 0.50으로 약한 쪽"의 영향이 F1에 그대로 반영돼서 0.65보다 아래로 떨어집니다.
            이게 "두 갈래 모두 좋아야 점수가 좋다"는 F1의 성질이에요.
          </p>
        </div>

        <div className="rounded bg-surface/60 p-3 text-xs leading-relaxed">
          <div className="font-medium text-sm mb-1">F1 = 0 이 되는 경우</div>
          <div className="font-mono">정밀도 1.0 + 재현율 0.0 → F1 = 2 × 1.0 × 0.0 / (1.0 + 0.0) = 0 / 1 = 0.000</div>
          <p className="mt-1 text-muted">
            산술평균은 0.5로 후하지만 F1은 0이에요. "한쪽이 0이면 F1도 0" — 절충안다운 성질.
          </p>
        </div>
      </div>

      <div className="card p-5 text-sm leading-relaxed space-y-3">
        <div className="font-medium">⑤ 임계값 슬라이더 값으로 F1 계산해 보기</div>
        <p>지금 ⑤에서 설정한 임계값({threshold.toFixed(2)}) 기준으로 100명 검진 모델의 라이브 지표:</p>
        <div className="rounded bg-surface/60 p-3 font-mono text-xs space-y-1">
          <div>정밀도 = TP / (TP + FP) = {liveMatrix.tp} / ({liveMatrix.tp} + {liveMatrix.fp}) = {liveMetrics.precision.toFixed(3)}</div>
          <div>재현율 = TP / (TP + FN) = {liveMatrix.tp} / ({liveMatrix.tp} + {liveMatrix.fn}) = {liveMetrics.recall.toFixed(3)}</div>
          <div>F1 = 2 × {liveMetrics.precision.toFixed(3)} × {liveMetrics.recall.toFixed(3)} / ({liveMetrics.precision.toFixed(3)} + {liveMetrics.recall.toFixed(3)})</div>
          <div className="pl-7">= <strong className="text-fg">{liveMetrics.f1.toFixed(3)}</strong></div>
        </div>
        <p className="text-muted text-xs">
          ⑤로 돌아가 슬라이더를 천천히 움직여 보면, F1이 가장 커지는 임계값이 정밀도와 재현율이
          가장 균형 잡힌 자리(보통 0.5 근처)예요. 한쪽 끝(0.0이나 1.0)으로 갈수록 한쪽이 0에 수렴하면서 F1도 0에 가까워집니다.
        </p>
      </div>

      <div className="card p-5 text-sm leading-relaxed space-y-2">
        <div className="font-medium text-base">분류 모델 평가 — 한 줄 정리</div>
        <ul className="list-disc list-inside space-y-1">
          <li>정확도는 직관적이지만 양·음 비율이 치우치면 속는다 (도입).</li>
          <li>본격 비교는 두 갈래로 — <strong>정밀도</strong>(오경보 줄이기) vs <strong>재현율</strong>(놓침 줄이기).</li>
          <li>같은 모델도 <strong>임계값</strong>으로 두 갈래 사이를 이동할 수 있다.</li>
          <li>두 갈래가 모두 중요한 상황에는 <strong>F1(조화평균)</strong> 절충안 — 한쪽이 약하면 F1도 약해진다.</li>
          <li>최종 결정은 <strong>"어떤 실수가 더 아픈가"</strong> — 시나리오에 따라 정밀도 우선·재현율 우선·F1 균형 중 선택.</li>
        </ul>
      </div>

      <div className="rounded bg-surface/60 p-3 text-xs">
        <div className="font-medium mb-1">진행 상태</div>
        <div>· 시나리오 4개 답하기 — {allAnswered ? '✓ 완료' : `진행 중 (${Object.keys(picks).length}/4)`}</div>
        <div>· 임계값 슬라이더 움직이기 — {thresholdMoved ? '✓ 완료' : '미진행'}</div>
        <div className="mt-1 text-muted">
          둘 다 ✓ 가 되면 이 페이즈가 완료 처리됩니다. 활동지(partD)의 2~4번 문제로 같은 시나리오·매트릭스를 손으로 한 번 더 풀어볼 수 있어요.
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── 공통 — 혼동 행렬 카드 ─────────────────────────── */
function ConfusionMatrixCard({ tp, fp, fn, tn, highlight }: Matrix & { highlight: 'tp' | 'fp' | 'fn' | 'tn' | null }) {
  const cellClass = (k: 'tp' | 'fp' | 'fn' | 'tn', base: string) =>
    'rounded p-3 ' + base + (highlight === k ? ' ring-2 ring-accent' : '');
  return (
    <div className="card p-4">
      <div className="text-xs text-muted mb-2 font-mono">혼동 행렬 (정답 × 예측)</div>
      <div className="grid grid-cols-[60px_1fr_1fr] gap-1 text-xs">
        <div></div>
        <div className="text-center font-medium pb-1">예측 양성</div>
        <div className="text-center font-medium pb-1">예측 음성</div>

        <div className="flex items-center justify-end pr-2 font-medium">실제 양성</div>
        <div className={cellClass('tp', 'bg-emerald-100 dark:bg-emerald-950/40')}>
          <div className="text-[10px] opacity-70">TP</div>
          <div className="font-mono text-base">{tp}</div>
        </div>
        <div className={cellClass('fn', 'bg-rose-100 dark:bg-rose-950/40')}>
          <div className="text-[10px] opacity-70">FN — 놓침</div>
          <div className="font-mono text-base">{fn}</div>
        </div>

        <div className="flex items-center justify-end pr-2 font-medium">실제 음성</div>
        <div className={cellClass('fp', 'bg-amber-100 dark:bg-amber-950/40')}>
          <div className="text-[10px] opacity-70">FP — 오경보</div>
          <div className="font-mono text-base">{fp}</div>
        </div>
        <div className={cellClass('tn', 'bg-slate-100 dark:bg-slate-900/40')}>
          <div className="text-[10px] opacity-70">TN</div>
          <div className="font-mono text-base">{tn}</div>
        </div>
      </div>
    </div>
  );
}
