import { useState } from 'react';
import { useApp } from '../store';
import { SCENARIO_A, SCENARIO_B, type Scenario, type Student } from '../data/scenarios';
import { useAdmissions } from '../adminStore';

type Tab = 'intro' | 'tune' | 'evaluate';

export function Phase6() {
  const sel = useAdmissions((s) => s.selected);
  const setSel = useAdmissions((s) => s.setSelected);

  if (!sel) return <ScenarioPicker onPick={setSel} />;
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
          <button key={s.id} onClick={() => onPick(s.id)} className="card p-6 text-left hover:border-accent transition">
            <div className="text-3xl">{s.emoji}</div>
            <div className="text-lg font-semibold mt-2">{s.name}</div>
            <div className="text-sm text-muted mt-2">{s.description}</div>
            <div className="text-xs text-muted mt-4 font-mono">변수: {s.variableNames.join(' · ')}</div>
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

  const [tab, setTab] = useState<Tab>('intro');
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

  const trainAcc = scenario.train.filter((s) => predict(s, w, cutoff) === s.passed).length / scenario.train.length;
  const testAcc = scenario.test.filter((s) => predict(s, w, cutoff) === s.passed).length / scenario.test.length;

  if (testAcc >= 0.85) markCompleted('p6');

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE 6 · 시나리오 {scenario.emoji} {scenario.name}</div>
      <h1>입시 합격 예측</h1>
      <button onClick={() => setSel(null)} className="text-xs text-muted underline mt-1">
        ← 시나리오 다시 선택
      </button>

      <div className="flex gap-1 mt-6 border-b border-border">
        <TabButton active={tab === 'intro'} onClick={() => setTab('intro')}>① 상황과 데이터</TabButton>
        <TabButton active={tab === 'tune'} onClick={() => setTab('tune')}>② 가중치 조정</TabButton>
        <TabButton active={tab === 'evaluate'} onClick={() => setTab('evaluate')}>③ 시험 데이터로 평가</TabButton>
      </div>

      {tab === 'intro' && <IntroTab scenario={scenario} onNext={() => setTab('tune')} />}
      {tab === 'tune' && (
        <TuneTab scenario={scenario} w={w} cutoff={cutoff} updateW={updateW} updateCutoff={updateCutoff}
          trainAcc={trainAcc} onNext={() => setTab('evaluate')} />
      )}
      {tab === 'evaluate' && (
        <EvaluateTab scenario={scenario} w={w} cutoff={cutoff} testAcc={testAcc} trainAcc={trainAcc} />
      )}
    </article>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm border-b-2 -mb-px transition ${
        active ? 'border-accent text-accent font-medium' : 'border-transparent text-muted hover:text-text'
      }`}
    >
      {children}
    </button>
  );
}

// ──────── 탭 1 ────────
function IntroTab({ scenario, onNext }: { scenario: Scenario; onNext: () => void }) {
  return (
    <div className="mt-6">
      <h2>🎓 상황</h2>
      <p>
        ○○대학교는 학생을 뽑을 때 <strong>{scenario.variableNames.join(', ')}</strong> 점수를 보고
        합격/불합격을 결정합니다. 그런데 어느 항목에 얼마나 가중치를 두는지는 <strong>비밀</strong>이에요.
      </p>
      <p className="mt-3">
        합격자/불합격자 명단의 점수만 가지고, 대학이 사용한 비밀 공식을 우리가 거꾸로 추적할 수 있을까요?
      </p>

      <div className="aside-tip">
        <strong>공식</strong>: 점수 = w₁·{scenario.variableNames[0]} + w₂·{scenario.variableNames[1]} + w₃·{scenario.variableNames[2]} + w₄·{scenario.variableNames[3]}
        <br />점수가 <strong>합격컷</strong>보다 크면 합격, 작거나 같으면 불합격.
        <br />— 이건 우리가 페이즈 1~5에서 배운 <strong>단일 뉴런</strong> 그 자체예요.
      </div>

      <h2>👥 학생 데이터 10명 (학습 데이터)</h2>
      <p className="text-muted text-sm">
        아래 학생들의 점수와 실제 합격 여부를 잘 살펴보세요. 어떤 점수가 합격에 영향을 많이 주는 것 같나요?
      </p>
      <div className="overflow-x-auto mt-3">
        <table className="w-full text-sm font-mono border-collapse">
          <thead>
            <tr className="text-xs text-muted border-b border-border">
              <th className="text-left py-2 pr-2">이름</th>
              {scenario.variableNames.map((vn) => (
                <th key={vn} className="px-2">{vn}</th>
              ))}
              <th className="px-2">결과</th>
            </tr>
          </thead>
          <tbody>
            {scenario.train.map((s, i) => (
              <tr key={i} className="border-b border-border">
                <td className="py-2 pr-2">{scenario.studentNames[i]}</td>
                {s.scores.map((sc, j) => <td key={j} className="text-center px-2">{sc}</td>)}
                <td className="text-center px-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    s.passed
                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                  }`}>
                    {s.passed ? '합격' : '불합격'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="aside-note mt-6">
        <div className="font-medium text-sm">🤔 잠깐, 데이터를 보면서 생각해볼 점</div>
        <ul className="text-sm mt-2 list-disc pl-5 space-y-1">
          <li>모든 항목이 합격/불합격에 똑같이 중요할까요?</li>
          <li>합격자들은 어떤 항목 점수가 특히 높은가요?</li>
          <li>불합격자들도 어떤 항목은 높을 수 있어요. 결정적인 차이는 어디서 나는지 보세요.</li>
        </ul>
      </div>

      <button onClick={onNext} className="btn-primary mt-6">② 가중치 조정해보기 →</button>
    </div>
  );
}

// ──────── 탭 2 ────────
function TuneTab({
  scenario, w, cutoff, updateW, updateCutoff, trainAcc, onNext,
}: {
  scenario: Scenario; w: [number, number, number, number]; cutoff: number;
  updateW: (i: number, v: number) => void; updateCutoff: (v: number) => void;
  trainAcc: number; onNext: () => void;
}) {
  const correct = Math.round(trainAcc * scenario.train.length);
  const total = scenario.train.length;

  return (
    <div className="mt-6">
      <p className="text-muted">
        슬라이더를 움직이면 학생 카드 색이 실시간으로 바뀌어요.
        <strong className="text-text"> 정답률 {correct}/{total}</strong>이 가능한 한 높아지도록 가중치를 조정해보세요.
      </p>

      <div className="grid sm:grid-cols-2 gap-4 mt-4">
        {scenario.variableNames.map((vn, i) => (
          <Slider key={i} label={`w${i + 1} · ${vn}`} value={w[i]}
            setValue={(v) => updateW(i, v)} min={0} max={0.6} step={0.05} />
        ))}
      </div>
      <div className="mt-4 max-w-md">
        <Slider label="합격 컷 (편향)" value={cutoff} setValue={updateCutoff} min={2} max={8} step={0.25} />
      </div>

      <div className={`mt-4 p-4 rounded-md border ${trainAcc >= 0.8 ? 'border-accent bg-accent-bg' : 'border-border bg-surface/40'}`}>
        <div className="text-xs text-muted">학습 데이터 정답률</div>
        <div className={`text-3xl font-mono ${trainAcc >= 0.8 ? 'text-accent' : ''}`}>
          {correct} / {total}
          <span className="text-base text-muted ml-2">({(trainAcc * 100).toFixed(0)}%)</span>
        </div>
      </div>

      <h2>학생 카드 (실시간 갱신)</h2>
      <div className="grid sm:grid-cols-2 gap-3 mt-2">
        {scenario.train.map((s, i) => {
          const sc = s.scores.reduce((a, x, j) => a + x * w[j], 0);
          const pred = sc > cutoff;
          const right = pred === s.passed;
          return (
            <div key={i}
              className={`card p-3 transition ${
                right
                  ? 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20'
                  : 'border-rose-500/50 bg-rose-50/50 dark:bg-rose-950/20'
              }`}
            >
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium">{scenario.studentNames[i]}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  s.passed
                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                }`}>
                  실제 {s.passed ? '합격' : '불합'}
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
                점수 <span className="text-accent">{sc.toFixed(2)}</span> {sc > cutoff ? '>' : '≤'} {cutoff.toFixed(1)} → 예측 <strong>{pred ? '합격' : '불합'}</strong>
                {right ? ' ✓' : ' ✗'}
              </div>
            </div>
          );
        })}
      </div>

      <div className="aside-note mt-6">
        <div className="font-medium text-sm">💡 힌트</div>
        <p className="text-sm mt-1">
          모든 항목을 똑같이 0.25로 두면 평범해 보이지만 실제론 정답률이 안 올라요.
          어떤 항목 가중치를 높이고 어떤 걸 낮춰야 할지, 데이터에서 단서를 찾아보세요.
        </p>
      </div>

      <button onClick={onNext} className="btn-primary mt-6">③ 시험 데이터로 평가하기 →</button>
    </div>
  );
}

// ──────── 탭 3 ────────
function EvaluateTab({
  scenario, w, cutoff, testAcc, trainAcc,
}: { scenario: Scenario; w: number[]; cutoff: number; testAcc: number; trainAcc: number }) {
  const testCorrect = Math.round(testAcc * scenario.test.length);

  return (
    <div className="mt-6">
      <p>
        학습에 한 번도 쓰지 않은 새로운 학생 <strong>20명</strong>으로 모델을 평가합니다.
        진짜 실력이 여기서 드러나요.
      </p>

      <div className="grid sm:grid-cols-2 gap-4 mt-4">
        <div className="card p-4">
          <div className="text-xs text-muted">학습 데이터 (10명)</div>
          <div className="text-2xl font-mono mt-1">{(trainAcc * 100).toFixed(0)}%</div>
        </div>
        <div className={`card p-4 ${testAcc >= 0.85 ? 'border-accent bg-accent-bg' : ''}`}>
          <div className="text-xs text-muted">시험 데이터 (20명)</div>
          <div className={`text-2xl font-mono mt-1 ${testAcc >= 0.85 ? 'text-accent font-semibold' : ''}`}>
            {testCorrect} / {scenario.test.length} <span className="text-sm text-muted">({(testAcc * 100).toFixed(0)}%)</span>
          </div>
        </div>
      </div>

      <h2>시험 데이터 결과</h2>
      <div className="grid sm:grid-cols-2 gap-2 mt-2">
        {scenario.test.map((s, i) => {
          const sc = s.scores.reduce((a, x, j) => a + x * w[j], 0);
          const pred = sc > cutoff;
          const right = pred === s.passed;
          return (
            <div key={i} className={`p-2 rounded border text-xs ${right ? 'border-emerald-500/30' : 'border-rose-500/30'}`}>
              <div className="flex justify-between">
                <span className="font-medium">{scenario.studentNames[10 + i]}</span>
                <span className="text-muted font-mono">[{s.scores.join(', ')}]</span>
              </div>
              <div className="font-mono mt-1">
                점수 {sc.toFixed(2)} → 예측 {pred ? '합' : '불'} / 실제 {s.passed ? '합' : '불'}
                <span className={`ml-2 ${right ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {right ? '✓' : '✗'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {testAcc >= 0.85 ? (
        <div className="aside-tip mt-6">
          <strong>훌륭해요!</strong> 시험 데이터에서도 {(testAcc * 100).toFixed(0)}%를 맞췄어요.
          비밀 공식의 비율을 거의 정확하게 추정했네요.
        </div>
      ) : (
        <div className="aside-warn mt-6">
          <div className="font-medium">시험 데이터 정확도가 아쉬워요 ({(testAcc * 100).toFixed(0)}%).</div>
          <p className="text-sm mt-1">
            10명만 보고 추정한 가중치가 새 학생들에겐 잘 안 맞는 거예요.
            <strong> 데이터를 더 모으면</strong> 비밀 공식의 진짜 비율이 더 또렷이 보일 수 있어요.
          </p>
          <p className="text-sm mt-2">
            👉 다음 페이즈에서 학생 30명을 더 추가해서 다시 시도해봅시다.
          </p>
        </div>
      )}
    </div>
  );
}

const predict = (s: Student, w: number[], cutoff: number) =>
  s.scores.reduce((a, x, i) => a + x * w[i], 0) > cutoff;

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
