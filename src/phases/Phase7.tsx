import { useState } from 'react';
import { useApp } from '../store';
import { SCENARIO_A, SCENARIO_B, type Scenario, type Student } from '../data/scenarios';
import { useAdmissions } from '../adminStore';

export function Phase7() {
  const sel = useAdmissions((s) => s.selected);
  const setSel = useAdmissions((s) => s.setSelected);

  if (!sel) {
    return (
      <article>
        <div className="text-xs font-mono text-muted">PHASE 7</div>
        <h1>데이터 추가 후 재학습</h1>
        <p className="text-muted mt-2">먼저 시나리오를 선택해주세요.</p>
        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          {[SCENARIO_A, SCENARIO_B].map((s) => (
            <button key={s.id} onClick={() => setSel(s.id)} className="card p-6 text-left hover:border-accent">
              <div className="text-2xl">{s.emoji}</div>
              <div className="font-semibold mt-2">{s.name}</div>
              <div className="text-sm text-muted mt-1">{s.description}</div>
            </button>
          ))}
        </div>
      </article>
    );
  }
  const scenario = sel === 'A' ? SCENARIO_A : SCENARIO_B;
  return <Workbench scenario={scenario} />;
}

function Workbench({ scenario }: { scenario: Scenario }) {
  const setSel = useAdmissions((s) => s.setSelected);
  const stored = useAdmissions((s) => s.weights[scenario.id]);
  const setWeights = useAdmissions((s) => s.setWeights);

  const [w, setW] = useState<[number, number, number, number]>(stored?.w ?? [0.25, 0.25, 0.25, 0.25]);
  const [cutoff, setCutoff] = useState(stored?.cutoff ?? 5);
  const markCompleted = useApp((s) => s.markCompleted);

  // 페이즈 6의 결과(10명만 본 가중치)를 보여주기 위해 별도 저장
  const [phase6Result] = useState(() => {
    const initialW = stored?.w ?? [0.25, 0.25, 0.25, 0.25];
    const initialCutoff = stored?.cutoff ?? 5;
    return computeMetrics(scenario, initialW, initialCutoff);
  });

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

  const all40 = [...scenario.train, ...scenario.extra];
  const trainAcc = all40.filter((s) => predict(s, w, cutoff) === s.passed).length / all40.length;
  const testAcc = scenario.test.filter((s) => predict(s, w, cutoff) === s.passed).length / scenario.test.length;

  if (testAcc >= 0.85) markCompleted('p7');

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE 7 · 시나리오 {scenario.emoji} {scenario.name}</div>
      <h1>데이터 추가 후 재학습 (40명)</h1>
      <button onClick={() => setSel(null)} className="text-xs text-muted underline mt-1">
        ← 시나리오 다시 선택
      </button>

      <p className="text-muted mt-3">
        다른 학교 합격생까지 모아서 30명을 추가했어요. 이제 40명을 보고 가중치를 다시 조정해보세요.
        <strong> 시험 데이터 20명</strong>은 학습에 쓰이지 않은 별도 데이터예요.
      </p>

      <h2>비교 표</h2>
      <table className="w-full text-sm font-mono mt-2">
        <thead>
          <tr className="text-muted text-xs">
            <th className="text-left py-2"></th>
            <th>10명 학습 (페이즈 6)</th>
            <th>40명 학습 (지금)</th>
          </tr>
        </thead>
        <tbody className="border-t border-border">
          <tr className="border-b border-border">
            <td className="py-2 text-xs text-muted">학습 정답률</td>
            <td className="text-center">{(phase6Result.trainAcc * 100).toFixed(0)}%</td>
            <td className="text-center text-accent">{(trainAcc * 100).toFixed(0)}%</td>
          </tr>
          <tr>
            <td className="py-2 text-xs text-muted">시험 정답률</td>
            <td className="text-center">{(phase6Result.testAcc * 100).toFixed(0)}%</td>
            <td className={`text-center ${testAcc >= 0.85 ? 'text-accent font-semibold' : ''}`}>
              {(testAcc * 100).toFixed(0)}%
              {testAcc - phase6Result.testAcc > 0.01 && (
                <span className="text-xs text-emerald-600 ml-1">+{((testAcc - phase6Result.testAcc) * 100).toFixed(0)}%p</span>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      <h2>학습 데이터 40명 — 슬라이더로 가중치 조정</h2>
      <div className="grid sm:grid-cols-2 gap-4 mt-2">
        {scenario.variableNames.map((vn, i) => (
          <Slider key={i} label={`w${i + 1} · ${vn}`} value={w[i]}
            setValue={(v) => updateW(i, v)} min={0} max={0.5} step={0.05} />
        ))}
      </div>
      <div className="mt-4 max-w-md">
        <Slider label="합격 컷" value={cutoff} setValue={updateCutoff} min={2} max={8} step={0.5} />
      </div>

      <details className="card p-3 mt-4 text-sm">
        <summary className="cursor-pointer text-muted">학생 카드 40명 펼쳐보기</summary>
        <div className="grid sm:grid-cols-2 gap-2 mt-3">
          {all40.map((s, i) => {
            const right = predict(s, w, cutoff) === s.passed;
            return (
              <div key={i} className={`p-2 rounded border text-xs ${right ? 'border-emerald-500/30' : 'border-rose-500/30'}`}>
                <span className="font-medium">{scenario.studentNames[i]}</span>
                <span className="text-muted font-mono ml-2">[{s.scores.join(', ')}]</span>
                <span className={`ml-2 ${right ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {right ? '✓' : '✗'} {s.passed ? '합격' : '불합'}
                </span>
              </div>
            );
          })}
        </div>
      </details>

      {testAcc >= 0.85 && (
        <div className="aside-tip mt-6">
          <strong>관찰</strong> — 데이터가 많아질수록 진짜 가중치 비율이 또렷이 보여요.
          같은 슬라이더 조작이라도 더 정확한 답을 찾을 수 있게 됩니다. 이게 ML이 데이터를 갈구하는 이유.
        </div>
      )}

      <h2>가상 인물 합불 예측 — SNS 통지서</h2>
      <p className="text-sm text-muted">
        지금 만든 모델로 새 학생을 평가해봐요. 점수를 직접 입력하면 통지서가 발급돼요.
      </p>
      <Predictor scenario={scenario} w={w} cutoff={cutoff} />
    </article>
  );
}

const predict = (s: Student, w: number[], cutoff: number) =>
  s.scores.reduce((acc, x, i) => acc + x * w[i], 0) > cutoff;

function computeMetrics(scenario: Scenario, w: number[], cutoff: number) {
  const trainAcc = scenario.train.filter((s) => predict(s, w, cutoff) === s.passed).length / scenario.train.length;
  const testAcc = scenario.test.filter((s) => predict(s, w, cutoff) === s.passed).length / scenario.test.length;
  return { trainAcc, testAcc };
}

function Predictor({
  scenario, w, cutoff,
}: { scenario: Scenario; w: number[]; cutoff: number }) {
  const [name, setName] = useState('');
  const [scores, setScores] = useState<string[]>(['', '', '', '']);
  const [result, setResult] = useState<null | { name: string; scores: number[]; score: number; status: 'pass' | 'reserve' | 'fail' }>(null);
  const [showCalc, setShowCalc] = useState(false);

  const submit = () => {
    const ns = scores.map((s) => parseFloat(s));
    if (ns.some((n) => isNaN(n) || n < 1 || n > 10)) {
      alert('각 점수는 1~10 사이의 숫자로 입력해주세요.');
      return;
    }
    const score = ns.reduce((acc, x, i) => acc + x * w[i], 0);
    const margin = score - cutoff;
    const status = margin > 0.5 ? 'pass' : margin > -0.5 ? 'reserve' : 'fail';
    setResult({ name: name || '익명의 학생', scores: ns, score, status });
    setShowCalc(false);
  };

  return (
    <div className="card p-5 mt-3 space-y-3">
      <input
        type="text"
        placeholder="이름 (예: 김새내기)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full px-3 py-2 rounded-md border border-border bg-bg"
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {scenario.variableNames.map((vn, i) => (
          <label key={i} className="text-sm">
            <div className="text-xs text-muted">{vn} (1~10)</div>
            <input
              type="number" min={1} max={10} step={0.5}
              value={scores[i]}
              onChange={(e) => {
                const next = [...scores];
                next[i] = e.target.value;
                setScores(next);
              }}
              className="w-full mt-1 px-2 py-1 rounded border border-border bg-bg font-mono"
            />
          </label>
        ))}
      </div>
      <button onClick={submit} className="btn-primary">통지서 발급 →</button>

      {result && <SnsCard {...result} cutoff={cutoff} w={w} variableNames={scenario.variableNames} showCalc={showCalc} setShowCalc={setShowCalc} />}

      <div className="aside-note">
        <div className="font-medium text-sm">💡 한계 짚기</div>
        <p className="text-sm mt-1">
          이 모델은 점수만 보고 판단해요. 실제 입시는 자기소개서, 면접 분위기, 학과별 특성 등 더 많은 요소가 작용합니다.
          AI 모델은 강력한 도구지만 만능이 아니에요.
        </p>
      </div>
    </div>
  );
}

function SnsCard({
  name, scores, score, status, cutoff, w, variableNames, showCalc, setShowCalc,
}: {
  name: string; scores: number[]; score: number; status: 'pass' | 'reserve' | 'fail';
  cutoff: number; w: number[]; variableNames: string[];
  showCalc: boolean; setShowCalc: (v: boolean) => void;
}) {
  const STYLES = {
    pass: {
      bg: 'bg-gradient-to-br from-orange-300 via-pink-300 to-purple-400',
      title: '🎉 합격이야!!',
      msg: `${name} 축하해`,
      tags: '#합격 #축하해 #드디어해냈다',
      likes: 1247, comments: 89, shares: 32,
    },
    reserve: {
      bg: 'bg-gradient-to-br from-violet-300 via-blue-300 to-cyan-300',
      title: '⚡ 예비합격 떴어!',
      msg: `${name} 예비번호 권으로 충원 가능`,
      tags: '#예비합격 #추합기원 #제발',
      likes: 856, comments: 124, shares: 78,
    },
    fail: {
      bg: 'bg-gradient-to-br from-slate-300 via-slate-200 to-slate-400 dark:from-slate-700 dark:via-slate-600 dark:to-slate-800',
      title: '💪 다음을 기약하자',
      msg: `${name} 가중치 조정해보면 결과가 달라질지도?`,
      tags: '#괜찮아 #다음기회 #아직안끝났다',
      likes: 432, comments: 67, shares: 12,
    },
  } as const;
  const s = STYLES[status];

  return (
    <div className={`rounded-2xl p-1 ${s.bg}`}>
      <div className="bg-bg/95 dark:bg-bg/90 rounded-xl p-5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span>🎓</span>
            <span className="font-medium">○○대학교 입학처</span>
            <span className="text-blue-500">✓</span>
          </div>
          <span className="text-muted">방금 전</span>
        </div>
        <div className="mt-4 text-2xl font-bold">{s.title}</div>
        <div className="text-sm mt-2">{s.msg}</div>
        <div className="mt-4 font-mono text-sm space-y-0.5">
          <div>▶ 종합점수 <span className="text-accent">{score.toFixed(2)}</span></div>
          <div>▶ 합격 컷 {cutoff.toFixed(1)}</div>
          <div>
            ▶ 결과 {status === 'pass' ? '🎉 합격' : status === 'reserve' ? '⚡ 예비' : '다음 기회에'}
          </div>
        </div>
        <div className="mt-4 text-xs text-blue-500">{s.tags}</div>
        <div className="mt-4 flex gap-4 text-xs text-muted">
          <span>❤️ {s.likes}</span>
          <span>💬 {s.comments}</span>
          <span>🔄 {s.shares}</span>
        </div>
        <button onClick={() => setShowCalc(!showCalc)} className="mt-3 text-xs underline text-muted">
          {showCalc ? '계산 과정 접기 ▴' : '계산 과정 펼쳐보기 ▾'}
        </button>
        {showCalc && (
          <div className="card p-3 mt-2 font-mono text-xs space-y-0.5 bg-surface/40">
            {scores.map((x, i) => (
              <div key={i}>
                {variableNames[i]} {x} × w{i + 1} {w[i].toFixed(2)} = {(x * w[i]).toFixed(2)}
              </div>
            ))}
            <div className="border-t border-border pt-1 mt-1">
              합계 = {score.toFixed(2)} {score > cutoff ? '>' : '≤'} 컷 {cutoff.toFixed(1)}
            </div>
          </div>
        )}
        <div className="mt-3 text-[10px] text-muted">
          본 결과는 학생이 만든 AI 모델의 예측이며 실제와 다를 수 있습니다.
        </div>
      </div>
    </div>
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
