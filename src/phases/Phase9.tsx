import { useEffect, useState } from 'react';
import { useApp } from '../store';

interface MedicalScenario {
  id: 'covid' | 'cancer';
  emoji: string;
  name: string;
  population: number;
  prevalence: number;       // 실제 양성 비율
  modelMean: { pos: number; neg: number };  // 모델이 출력하는 점수의 평균 (양성, 음성)
  modelStd: number;          // 점수 분포의 표준편차
  context: string;
  threshold: { default: number; min: number; max: number };
  costPerFN: string;         // 놓쳤을 때 사회적 비용 설명
  costPerFP: string;         // 잘못 양성판정 시 비용
}

const SCENARIOS: MedicalScenario[] = [
  {
    id: 'covid',
    emoji: '🦠',
    name: '코로나 진단 키트',
    population: 1000,
    prevalence: 0.02,
    modelMean: { pos: 0.75, neg: 0.20 },
    modelStd: 0.15,
    context:
      '인구 1000명을 검사해요. 실제로는 약 2%(20명)만 코로나 양성. 우리 진단 모델은 각 사람에게 0~1 사이 "양성 확률"을 출력해요. 이 확률이 임계값보다 높으면 양성 판정.',
    threshold: { default: 0.5, min: 0, max: 1 },
    costPerFN: '진짜 환자를 놓치면 → 본인 악화 + 주변 전염 (큰 비용)',
    costPerFP: '음성인데 양성 판정 → 격리 부담, 추가 검사 (작은 비용)',
  },
  {
    id: 'cancer',
    emoji: '🎗️',
    name: '암 조기검진',
    population: 1000,
    prevalence: 0.005,
    modelMean: { pos: 0.70, neg: 0.18 },
    modelStd: 0.18,
    context:
      '인구 1000명을 정기검진해요. 실제 암 환자는 0.5%(5명) 수준. 우리 모델은 영상에서 각 환자에게 "암(양성)일 확률"을 0~1 사이로 출력해요.',
    threshold: { default: 0.5, min: 0, max: 1 },
    costPerFN: '진짜 암을 놓치면 → 진행 후 발견 → 생존율 급락 (매우 큰 비용)',
    costPerFP: '암 아닌데 의심 판정 → 추가 검사, 환자 불안 (중간 비용)',
  },
];

// 시드 기반 가짜 데이터셋 — 양성/음성에서 점수를 정규분포로 샘플링
function makeData(scenario: MedicalScenario, seed: number) {
  let s = seed;
  const rand = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const randn = () => { let u = 0, v = 0; while (u === 0) u = rand(); while (v === 0) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const cases: { score: number; positive: boolean }[] = [];
  const numPos = Math.round(scenario.population * scenario.prevalence);
  for (let i = 0; i < numPos; i++) {
    const score = Math.max(0, Math.min(1, scenario.modelMean.pos + randn() * scenario.modelStd));
    cases.push({ score, positive: true });
  }
  for (let i = 0; i < scenario.population - numPos; i++) {
    const score = Math.max(0, Math.min(1, scenario.modelMean.neg + randn() * scenario.modelStd));
    cases.push({ score, positive: false });
  }
  return cases;
}

export function Phase9() {
  const [idx, setIdx] = useState(0);
  const scenario = SCENARIOS[idx];
  const [threshold, setThreshold] = useState(scenario.threshold.default);
  const [data] = useState(() => makeData(scenario, 42));
  const markCompleted = useApp((s) => s.markCompleted);

  // 시나리오 바뀌면 데이터/임계값도 바꿔야 — useState로 새로 만들기 위해 키 사용
  // 위 useState(()=>) 1회만 실행 → 시나리오 바꿀 때마다 unmount/remount하기 위해 key 사용
  return (
    <div>
      <div className="flex gap-2 mb-6">
        {SCENARIOS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => { setIdx(i); }}
            className={`px-3 py-1.5 rounded-md text-sm border ${
              idx === i ? 'border-accent text-accent bg-accent-bg' : 'border-border text-muted'
            }`}
          >
            {s.emoji} {s.name}
          </button>
        ))}
      </div>
      <ScenarioContent
        key={scenario.id}
        scenario={scenario}
        threshold={threshold}
        setThreshold={setThreshold}
        data={data}
        onPass={() => markCompleted('p9')}
      />
    </div>
  );
}

function ScenarioContent({
  scenario, threshold, setThreshold, data, onPass,
}: {
  scenario: MedicalScenario; threshold: number; setThreshold: (n: number) => void;
  data: { score: number; positive: boolean }[]; onPass: () => void;
}) {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (const c of data) {
    const pred = c.score >= threshold;
    if (pred && c.positive) tp++;
    else if (pred && !c.positive) fp++;
    else if (!pred && c.positive) fn++;
    else tn++;
  }
  const total = tp + fp + tn + fn;
  const accuracy = (tp + tn) / total;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const allNegAcc = (data.filter((c) => !c.positive).length) / total;

  useEffect(() => {
    if (recall > 0.5 && precision > 0.5) onPass();
  }, [recall, precision, onPass]);

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE 9</div>
      <h1>평가의 함정</h1>
      <p className="text-muted mt-2">{scenario.context}</p>

      <div className="aside-warn mt-4">
        <div className="font-medium">🤯 정확도의 함정</div>
        <p className="text-sm mt-1">
          만약 모델이 <strong>"전원 음성"</strong>이라고만 출력해도 정확도는 <strong>{(allNegAcc * 100).toFixed(1)}%</strong>예요.
          하지만 진짜 환자를 한 명도 못 잡잖아요. 정확도만 보면 안 되는 이유.
        </p>
      </div>

      <h2>임계값 조절</h2>
      <p className="text-sm text-muted">
        모델은 각 사람에게 <strong>양성일 확률(0~1)</strong>을 출력해요. 1에 가까울수록 "양성이 거의 확실", 0에 가까울수록 "음성이 거의 확실".
        그런데 확률만으론 양/음을 결정 못 하니, <strong>어디서 자를지</strong>를 정해야 해요. 이 자르는 위치가 임계값.
      </p>

      <div className="aside-tip mt-3 text-sm">
        <div className="font-medium mb-1">예시 — 세 사람의 양성 확률</div>
        <div className="grid grid-cols-3 gap-2 font-mono text-center">
          <div className="rounded-md border border-border p-2">A: 0.82<div className="text-xs text-muted mt-0.5">거의 확실</div></div>
          <div className="rounded-md border border-border p-2">B: 0.45<div className="text-xs text-muted mt-0.5">애매</div></div>
          <div className="rounded-md border border-border p-2">C: 0.13<div className="text-xs text-muted mt-0.5">거의 음성</div></div>
        </div>
        <p className="text-xs text-muted mt-2">→ 임계값을 0.5로 두면 A만 양성. 0.4로 낮추면 A·B 양성. 어디서 자를까?</p>
      </div>

      <div className="mt-3">
        <Slider
          label="이 확률 이상이면 양성으로 — 어디서 자를까?"
          value={threshold}
          setValue={setThreshold}
          min={scenario.threshold.min}
          max={scenario.threshold.max}
          step={0.01}
        />
      </div>

      <ScoreDistribution data={data} threshold={threshold} />
      <div className="text-xs text-muted mt-1 px-1 flex justify-between">
        <span>가로축: 모델이 출력한 양성 확률 (0=확실히 음성 · 1=확실히 양성)</span>
        <span>막대 색: 실제 정답 (회색=음성 / 주황=양성)</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 text-sm font-mono">
        <Metric label="정확도" value={accuracy} note="(TP+TN)/전체" />
        <Metric label="정밀도" value={precision} note="TP/(TP+FP)" highlight={precision >= 0.5} />
        <Metric label="재현율" value={recall} note="TP/(TP+FN)" highlight={recall >= 0.5} />
        <div className="card p-3 text-center">
          <div className="text-xs text-muted">놓친 환자</div>
          <div className={`text-lg ${fn > 0 ? 'text-rose-600 dark:text-rose-400' : ''}`}>{fn}명</div>
        </div>
      </div>

      <h2>혼동 행렬</h2>
      <div className="grid grid-cols-[auto_1fr_1fr] gap-2 max-w-xl mt-3 text-sm">
        <div></div>
        <div className="text-center text-xs text-muted">실제 양성</div>
        <div className="text-center text-xs text-muted">실제 음성</div>
        <div className="text-xs text-muted self-center text-right pr-2">예측 양성</div>
        <Cell value={tp} label="TP" desc="제대로 잡음" tone="good" />
        <Cell value={fp} label="FP" desc="음성을 양성으로 (오인)" tone="bad" />
        <div className="text-xs text-muted self-center text-right pr-2">예측 음성</div>
        <Cell value={fn} label="FN" desc="진짜 환자 놓침" tone="bad" />
        <Cell value={tn} label="TN" desc="음성을 음성으로" tone="good" />
      </div>

      <div className="aside-tip mt-6 text-sm space-y-2">
        <div><strong>📌 정밀도(precision)</strong> — 양성이라고 한 것 중 진짜 양성 비율. 낮으면 "양치기 소년" 같은 모델.</div>
        <div><strong>📌 재현율(recall, sensitivity)</strong> — 진짜 양성 중 우리가 잡은 비율. 낮으면 환자를 놓치는 모델.</div>
        <div className="border-t border-border pt-2 mt-2">
          <div><strong>{scenario.emoji} 이 시나리오의 비용</strong></div>
          <div className="text-xs mt-1">FN: {scenario.costPerFN}</div>
          <div className="text-xs">FP: {scenario.costPerFP}</div>
          <div className="text-xs mt-2 text-muted">
            → {scenario.id === 'cancer' ? '암은 놓치면 큰일 → 재현율 높이는 게 우선' : '코로나는 격리 부담을 감안 → 정밀도와 재현율의 균형'}
          </div>
        </div>
      </div>
    </article>
  );
}

function Metric({ label, value, note, highlight }: { label: string; value: number; note: string; highlight?: boolean }) {
  return (
    <div className={`card p-3 text-center ${highlight ? 'border-accent bg-accent-bg' : ''}`}>
      <div className="text-xs text-muted">{label}</div>
      <div className={`text-lg ${highlight ? 'text-accent' : ''}`}>{(value * 100).toFixed(1)}%</div>
      <div className="text-xs text-muted mt-0.5">{note}</div>
    </div>
  );
}

function Cell({ value, label, desc, tone }: { value: number; label: string; desc: string; tone: 'good' | 'bad' }) {
  return (
    <div className={`p-3 rounded-md border text-center ${
      tone === 'good'
        ? 'border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20'
        : 'border-rose-500/40 bg-rose-50/40 dark:bg-rose-950/20'
    }`}>
      <div className="text-xs text-muted">{label}</div>
      <div className="text-2xl font-mono font-semibold">{value}</div>
      <div className="text-xs text-muted mt-1">{desc}</div>
    </div>
  );
}

function ScoreDistribution({ data, threshold }: { data: { score: number; positive: boolean }[]; threshold: number }) {
  // 누적 히스토그램: x = 점수 0..1, y = 인원수 (음성 + 양성 같은 스케일).
  // 임계값 오른쪽 영역은 "양성 판정" 영역으로 옅은 보라색 음영.
  const BINS = 30;
  const posBin = new Array(BINS).fill(0);
  const negBin = new Array(BINS).fill(0);
  data.forEach((c) => {
    const b = Math.min(BINS - 1, Math.floor(c.score * BINS));
    if (c.positive) posBin[b]++;
    else negBin[b]++;
  });
  const maxStack = Math.max(...posBin.map((p, i) => p + negBin[i]), 1);
  const W = 600, H = 200;
  const PAD_L = 30, PAD_R = 10, PAD_T = 30, PAD_B = 28;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const binW = plotW / BINS;
  const sx = (i: number) => PAD_L + i * binW;
  const sh = (v: number) => (v / maxStack) * plotH;
  const thrX = PAD_L + threshold * plotW;

  // 통계: 임계값 기준 좌/우 양성·음성 합계
  let tp = 0, fp = 0, fn = 0, tn = 0;
  data.forEach((c) => {
    const pred = c.score >= threshold;
    if (pred && c.positive) tp++;
    else if (pred && !c.positive) fp++;
    else if (!pred && c.positive) fn++;
    else tn++;
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-4 border border-border rounded-md bg-surface/40">
      <text x={PAD_L - 6} y={14} fontSize={10} fill="rgb(var(--color-muted))">양성 확률 분포 (같은 인원 스케일) — 실제 음성(회색) · 실제 양성(주황)</text>

      {/* 양성 판정 영역 음영 (임계값 오른쪽) */}
      <rect x={thrX} y={PAD_T} width={Math.max(0, W - PAD_R - thrX)} height={plotH}
        fill="rgb(var(--color-accent))" opacity={0.08} />
      <text x={W - PAD_R - 2} y={PAD_T - 4} fontSize={10}
        textAnchor="end" fill="rgb(var(--color-accent))">
        양성 판정 → (TP {tp} · FP {fp})
      </text>
      <text x={PAD_L + 2} y={PAD_T - 4} fontSize={10}
        textAnchor="start" fill="rgb(var(--color-muted))">
        ← 음성 판정 (TN {tn} · FN {fn})
      </text>

      {/* 막대: 음성을 아래, 양성을 위에 누적 */}
      {negBin.map((nv, i) => {
        const pv = posBin[i];
        const yNeg = H - PAD_B - sh(nv);
        const yPos = yNeg - sh(pv);
        return (
          <g key={i}>
            <rect x={sx(i) + 0.5} y={yNeg} width={binW - 1} height={sh(nv)}
              fill="rgb(var(--color-muted))" opacity={0.45} />
            <rect x={sx(i) + 0.5} y={yPos} width={binW - 1} height={sh(pv)}
              fill="rgb(251, 146, 60)" opacity={0.9} />
          </g>
        );
      })}

      {/* x축 */}
      <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="rgb(var(--color-border))" />

      {/* 임계값 선 */}
      <line x1={thrX} y1={PAD_T} x2={thrX} y2={H - PAD_B}
        stroke="rgb(var(--color-accent))" strokeWidth={2} strokeDasharray="4 3" />
      <text x={thrX + 4} y={PAD_T + 12} fontSize={10} fill="rgb(var(--color-accent))">
        임계값 {threshold.toFixed(2)}
      </text>

      {/* x 라벨 */}
      <text x={PAD_L} y={H - 10} fontSize={10} fill="rgb(var(--color-muted))">0.0</text>
      <text x={W - PAD_R - 16} y={H - 10} fontSize={10} fill="rgb(var(--color-muted))">1.0</text>
    </svg>
  );
}

function Slider({
  label, value, setValue, min, max, step,
}: { label: string; value: number; setValue: (v: number) => void; min: number; max: number; step: number }) {
  return (
    <label className="block">
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="font-mono text-accent">{value.toFixed(2)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => setValue(parseFloat(e.target.value))} className="w-full" />
    </label>
  );
}
