import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store';
import { SCENARIO_A, SCENARIO_B, type Student } from '../data/scenarios';
import { useAdmissions } from '../adminStore';

export function Phase8() {
  const sel = useAdmissions((s) => s.selected);
  const stored = useAdmissions((s) => s.weights);
  const [scenarioId, setScenarioId] = useState<'A' | 'B'>(sel ?? 'A');

  const scenario = scenarioId === 'A' ? SCENARIO_A : SCENARIO_B;
  const wts = stored[scenarioId];
  const w = wts?.w ?? [0.25, 0.25, 0.25, 0.25];
  const cutoff = wts?.cutoff ?? 5;

  const { tp, fp, tn, fn } = useMemo(() => countConfusion(scenario.test, w, cutoff), [scenario, w, cutoff]);
  const total = tp + fp + tn + fn;
  const acc = total > 0 ? (tp + tn) / total : 0;
  const markCompleted = useApp((s) => s.markCompleted);
  // 학생이 한 번이라도 의미 있는 정확도(혼동행렬을 본 뒤)를 확보했을 때 완료 처리.
  // 진입 즉시 완료되는 버그를 막기 위해 useEffect + 의미 있는 임계값 사용.
  useEffect(() => {
    if (acc >= 0.7) markCompleted('p8');
  }, [acc, markCompleted]);

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE 8</div>
      <h1>정확도 — 모델을 어떻게 평가할까</h1>
      <p className="text-muted mt-2">
        페이즈 7에서 만든 모델을 시험 데이터 20명에 적용한 결과로 <strong>혼동 행렬</strong>을 그려봅시다.
      </p>

      <div className="aside-tip">
        <strong>혼동 행렬(confusion matrix)</strong>은 모델의 예측을 4가지로 분류한 표예요. 정답률(accuracy) 한 숫자만 보면 놓치는 게 많거든요.
      </div>

      <div className="mt-4 flex gap-2">
        {(['A', 'B'] as const).map((id) => (
          <button
            key={id}
            onClick={() => setScenarioId(id)}
            className={`px-3 py-1.5 rounded-md text-sm border ${
              scenarioId === id ? 'border-accent text-accent bg-accent-bg' : 'border-border text-muted'
            }`}
          >
            {id === 'A' ? '📊 정시' : '📚 학종'}
          </button>
        ))}
      </div>

      <h2>혼동 행렬</h2>
      <div className="grid grid-cols-[auto_1fr_1fr] gap-2 max-w-xl mt-3 text-sm">
        <div></div>
        <div className="text-center text-xs text-muted">실제 합격</div>
        <div className="text-center text-xs text-muted">실제 불합격</div>

        <div className="text-xs text-muted self-center text-right pr-2">예측 합격</div>
        <Cell value={tp} label="TP" desc="진짜 합격을 합격으로" tone="good" />
        <Cell value={fp} label="FP" desc="불합격을 합격으로 (오인)" tone="bad" />

        <div className="text-xs text-muted self-center text-right pr-2">예측 불합격</div>
        <Cell value={fn} label="FN" desc="합격을 불합격으로 (놓침)" tone="bad" />
        <Cell value={tn} label="TN" desc="진짜 불합격을 불합격으로" tone="good" />
      </div>

      <h2>정확도 계산</h2>
      <div className="card p-4 mt-3 font-mono text-sm space-y-1">
        <div>
          정확도 = <span className="text-muted">(TP + TN) / 전체</span>
        </div>
        <div>
          = ({tp} + {tn}) / {total} = <span className="text-accent text-lg">{(acc * 100).toFixed(0)}%</span>
        </div>
      </div>

      <div className="aside-note mt-6">
        <div className="font-medium">🤔 정확도가 전부일까?</div>
        <p className="text-sm mt-1">
          만약 1000명 중 990명이 진짜 불합격이고, 모델이 <strong>"전원 불합격"</strong>이라고 외치면 정확도는 99%예요.
          하지만 합격자 10명을 모두 놓친 모델이죠. 다음 페이즈에서 이 함정을 파헤쳐봅시다.
        </p>
      </div>
    </article>
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
      <div className="text-[10px] text-muted mt-1">{desc}</div>
    </div>
  );
}

function countConfusion(students: Student[], w: number[], cutoff: number) {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (const s of students) {
    const score = s.scores.reduce((a, x, i) => a + x * w[i], 0);
    const pred = score > cutoff;
    if (pred && s.passed) tp++;
    else if (pred && !s.passed) fp++;
    else if (!pred && s.passed) fn++;
    else tn++;
  }
  return { tp, fp, tn, fn };
}
