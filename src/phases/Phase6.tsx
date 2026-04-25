import { useState } from 'react';
import { useApp } from '../store';
import { SCENARIO_A, SCENARIO_B, type Scenario, type Student } from '../data/scenarios';
import { useAdmissions } from '../adminStore';

export function Phase6() {
  const sel = useAdmissions((s) => s.selected);
  const setSel = useAdmissions((s) => s.setSelected);

  if (!sel) {
    return <ScenarioPicker onPick={setSel} />;
  }
  const scenario = sel === 'A' ? SCENARIO_A : SCENARIO_B;
  return <Workbench scenario={scenario} />;
}

function ScenarioPicker({ onPick }: { onPick: (id: 'A' | 'B') => void }) {
  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE 6</div>
      <h1>입시 합격 예측 — 시나리오 선택</h1>
      <p className="text-muted mt-2">
        대학은 어떤 가중치로 학생을 뽑는지 공개하지 않아요. 합격자/불합격자 명단을 보고 그 비율을 거꾸로 추적해봅시다.
      </p>
      <div className="aside-tip">
        지금까지 배운 단일 뉴런으로 — 가중치 4개와 합격컷(편향) — 이 문제를 풀 수 있어요.
      </div>
      <div className="grid sm:grid-cols-2 gap-4 mt-6">
        {[SCENARIO_A, SCENARIO_B].map((s) => (
          <button
            key={s.id}
            onClick={() => onPick(s.id)}
            className="card p-6 text-left hover:border-accent transition"
          >
            <div className="text-3xl">{s.emoji}</div>
            <div className="text-lg font-semibold mt-2">{s.name}</div>
            <div className="text-sm text-muted mt-2">{s.description}</div>
            <div className="text-xs text-muted mt-4 font-mono">
              변수: {s.variableNames.join(' · ')}
            </div>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted mt-4">둘 다 풀어봐도 좋아요.</p>
    </article>
  );
}

function Workbench({ scenario }: { scenario: Scenario }) {
  const setSel = useAdmissions((s) => s.setSelected);
  const stored = useAdmissions((s) => s.weights[scenario.id]);
  const setWeights = useAdmissions((s) => s.setWeights);

  const [w, setW] = useState<[number, number, number, number]>(stored?.w ?? [0.25, 0.25, 0.25, 0.25]);
  const [cutoff, setCutoff] = useState(stored?.cutoff ?? 5);
  const markCompleted = useApp((s) => s.markCompleted);

  const updateW = (i: number, v: number) => {
    const next = [...w] as typeof w;
    next[i] = v;
    setW(next);
    setWeights(scenario.id, { w: next, cutoff });
  };
  const updateCutoff = (v: number) => {
    setCutoff(v);
    setWeights(scenario.id, { w, cutoff: v });
  };

  const score = (s: Student) =>
    s.scores.reduce((acc, x, i) => acc + x * w[i], 0);
  const predict = (s: Student) => score(s) > cutoff;

  const correct = scenario.train.filter((s) => predict(s) === s.passed).length;
  const acc = correct / scenario.train.length;

  if (acc >= 0.8) markCompleted('p6');

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE 6 · 시나리오 {scenario.emoji} {scenario.name}</div>
      <h1>입시 합격 예측 (10명)</h1>
      <button onClick={() => setSel(null)} className="text-xs text-muted underline mt-1">
        ← 시나리오 다시 선택
      </button>

      <p className="text-muted mt-3">
        아래 학생 10명의 점수와 합격 여부를 보고, 가중치 4개와 <strong>합격 컷</strong>을 조정해서
        모두를 맞히는 공식을 찾아봐요. 공식은:
      </p>

      <div className="card p-3 mt-3 font-mono text-sm">
        합격 점수 = w₁·{scenario.variableNames[0]} + w₂·{scenario.variableNames[1]} + w₃·{scenario.variableNames[2]} + w₄·{scenario.variableNames[3]}
        <br />
        합격 점수 &gt; 합격컷 ⇒ 합격
      </div>

      <h2>학생 카드 10명</h2>
      <div className="grid sm:grid-cols-2 gap-3 mt-2">
        {scenario.train.map((s, i) => {
          const sc = score(s);
          const pred = sc > cutoff;
          const right = pred === s.passed;
          return (
            <div
              key={i}
              className={`card p-3 ${right ? 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-rose-500/50 bg-rose-50/50 dark:bg-rose-950/20'}`}
            >
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium">{scenario.studentNames[i]}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${s.passed ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/20 text-rose-700 dark:text-rose-300'}`}>
                  실제 {s.passed ? '합격' : '불합격'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1 mt-2 text-xs font-mono text-muted">
                {scenario.variableNames.map((vn, j) => (
                  <div key={j}>
                    <div>{vn}</div>
                    <div className="text-text">{s.scores[j]}</div>
                  </div>
                ))}
              </div>
              <div className="text-xs font-mono mt-2">
                점수 <span className="text-accent">{sc.toFixed(2)}</span> {sc > cutoff ? '>' : '≤'} {cutoff.toFixed(1)} → 예측 <strong>{pred ? '합격' : '불합격'}</strong>
                {right ? ' ✓' : ' ✗'}
              </div>
            </div>
          );
        })}
      </div>

      <div className={`mt-4 p-4 rounded-md border ${acc >= 0.8 ? 'border-accent bg-accent-bg' : 'border-border bg-surface/40'}`}>
        <div className="text-sm">정답률</div>
        <div className={`text-3xl font-mono ${acc >= 0.8 ? 'text-accent' : ''}`}>
          {correct} / {scenario.train.length}
          <span className="text-base text-muted ml-2">({(acc * 100).toFixed(0)}%)</span>
        </div>
        {acc >= 0.8 && <div className="text-sm text-accent mt-1">8명 이상 맞췄어요. 페이즈 통과!</div>}
      </div>

      <h2>가중치 슬라이더</h2>
      <div className="grid sm:grid-cols-2 gap-4 mt-2">
        {scenario.variableNames.map((vn, i) => (
          <Slider
            key={i}
            label={`w${i + 1} · ${vn}`}
            value={w[i]}
            setValue={(v) => updateW(i, v)}
            min={0}
            max={0.5}
            step={0.05}
          />
        ))}
      </div>
      <div className="mt-4 max-w-md">
        <Slider
          label="합격 컷 (편향)"
          value={cutoff}
          setValue={updateCutoff}
          min={2}
          max={8}
          step={0.5}
        />
      </div>

      <div className="aside-note mt-6">
        <div className="font-medium text-sm">📚 더 알고 싶다면</div>
        <ul className="text-sm mt-1 space-y-0.5">
          {scenario.links.map((l) => (
            <li key={l.url}>
              <a href={l.url} target="_blank" rel="noreferrer" className="text-accent underline">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </article>
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
