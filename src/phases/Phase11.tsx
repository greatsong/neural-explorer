import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store';
import { loadMnist, filterByLabels, type Sample } from '../lib/mnist';
import { createDeepMLP, paramCount, evaluate, trainStep, shuffle, type MLP, type TrainSample } from '../lib/nn';
import { NetworkDiagram, LayerEditor } from '../components/NetworkDiagram';

interface StageDef {
  id: 'A' | 'B' | 'C';
  emoji: string;
  title: string;
  description: string;
  labels: number[];
  defaultHidden: number;
}

const STAGES: StageDef[] = [
  { id: 'A', emoji: '🟢', title: '단계 A — 0과 1 (2종)',           description: '구분이 매우 쉬운 두 숫자',         labels: [0, 1],          defaultHidden: 4 },
  { id: 'B', emoji: '🟡', title: '단계 B — 0, 1, 7 (3종)',         description: '비슷하게 생긴 1과 7이 섞이면',     labels: [0, 1, 7],       defaultHidden: 8 },
  { id: 'C', emoji: '🔴', title: '단계 C — 0~9 모두 (10종)',       description: '진짜 MNIST 문제',                  labels: [0,1,2,3,4,5,6,7,8,9], defaultHidden: 16 },
];

interface StageResult {
  hiddenLayers: number[];
  params: number;
  trainAcc: number;
  testAcc: number;
}

export function Phase11() {
  const [stageIdx, setStageIdx] = useState(0);
  const [results, setResults] = useState<Record<string, StageResult>>({});
  const [allSamples, setAllSamples] = useState<Sample[] | null>(null);
  const markCompleted = useApp((s) => s.markCompleted);

  useEffect(() => {
    loadMnist().then(setAllSamples);
  }, []);

  if (!allSamples) {
    return (
      <article>
        <div className="text-xs font-mono text-muted">PHASE 11</div>
        <h1>신경망 설계</h1>
        <p className="text-muted mt-3">MNIST 데이터 불러오는 중...</p>
      </article>
    );
  }

  const stage = STAGES[stageIdx];
  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE 11</div>
      <h1>신경망 설계 — 문제 복잡도 vs 신경망 크기</h1>
      <p className="text-muted mt-2">
        같은 MNIST 데이터로 분류 문제의 난이도를 점점 올려봅니다. 어려운 문제일수록 신경망이 더 커야 한다는 걸 직접 체감해보세요.
      </p>

      <div className="flex gap-2 mt-6">
        {STAGES.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setStageIdx(i)}
            className={`px-3 py-1.5 rounded-md text-sm border ${
              stageIdx === i ? 'border-accent text-accent bg-accent-bg' : 'border-border text-muted'
            }`}
          >
            {s.emoji} {s.id === 'A' ? '2종' : s.id === 'B' ? '3종' : '10종'}
            {results[s.id] ? ' ✓' : ''}
          </button>
        ))}
      </div>

      <StageView
        key={stage.id}
        stage={stage}
        allSamples={allSamples}
        onResult={(r) => {
          setResults((p) => ({ ...p, [stage.id]: r }));
          if (Object.keys({ ...results, [stage.id]: r }).length === 3) markCompleted('p11');
        }}
      />

      {Object.keys(results).length > 0 && <ComparisonTable results={results} />}
    </article>
  );
}

function StageView({
  stage, allSamples, onResult,
}: { stage: StageDef; allSamples: Sample[]; onResult: (r: StageResult) => void }) {
  const [hiddenLayers, setHiddenLayers] = useState<number[]>([stage.defaultHidden]);
  const [lr, setLr] = useState(0.05);
  const [epochs, setEpochs] = useState(15);
  const [training, setTraining] = useState(false);
  const [progress, setProgress] = useState<{ epoch: number; loss: number; acc: number }[]>([]);
  const [final, setFinal] = useState<{ trainAcc: number; testAcc: number } | null>(null);
  const cancelRef = useRef(false);

  const labelToIdx = new Map(stage.labels.map((l, i) => [l, i]));
  const filtered = filterByLabels(allSamples, stage.labels);
  const split = Math.floor(filtered.length * 0.7);
  const trainData: TrainSample[] = filtered.slice(0, split).map((s) => ({ x: s.pixels, y: labelToIdx.get(s.label)! }));
  const testData: TrainSample[] = filtered.slice(split).map((s) => ({ x: s.pixels, y: labelToIdx.get(s.label)! }));

  const layerSizes = [784, ...hiddenLayers, stage.labels.length];
  const params = paramCount({ layers: layerSizes });

  const train = async () => {
    cancelRef.current = false;
    setTraining(true);
    setProgress([]);
    setFinal(null);
    const m: MLP = createDeepMLP(layerSizes);
    const log: { epoch: number; loss: number; acc: number }[] = [];
    const batchSize = 16;

    for (let ep = 0; ep < epochs; ep++) {
      if (cancelRef.current) break;
      const batches = shuffle(trainData);
      let lossSum = 0;
      let nBatches = 0;
      for (let i = 0; i < batches.length; i += batchSize) {
        const batch = batches.slice(i, i + batchSize);
        lossSum += trainStep(m, batch, lr);
        nBatches++;
      }
      const trainAcc = evaluate(m, trainData);
      log.push({ epoch: ep + 1, loss: lossSum / nBatches, acc: trainAcc });
      setProgress([...log]);
      await new Promise((r) => setTimeout(r, 0));
    }
    const trainAcc = evaluate(m, trainData);
    const testAcc = evaluate(m, testData);
    setFinal({ trainAcc, testAcc });
    onResult({ hiddenLayers: hiddenLayers.slice(), params, trainAcc, testAcc });
    setTraining(false);
  };

  return (
    <div className="mt-6">
      <h2>{stage.title}</h2>
      <p className="text-muted text-sm">{stage.description}</p>
      <div className="text-xs text-muted mt-1">
        학습 데이터: {trainData.length}장 · 시험 데이터: {testData.length}장
      </div>

      <h3 className="mt-4">🧱 신경망 구조 짜기</h3>
      <p className="text-muted text-sm">
        은닉층의 수와 각 층 뉴런 수를 자유롭게 정해보세요. 입력은 28×28 픽셀(784), 출력은 클래스 수({stage.labels.length})로 고정입니다.
      </p>
      <LayerEditor hiddenLayers={hiddenLayers} setHiddenLayers={setHiddenLayers} disabled={training} />
      <div className="mt-4">
        <NetworkDiagram layers={layerSizes} />
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 mt-6 items-start">
        <div className="space-y-4">
          <details className="text-sm" open>
            <summary className="cursor-pointer text-muted">학습 옵션 (학습률, 에폭)</summary>
            <div className="space-y-2 mt-3">
              <Slider label="학습률" value={lr} setValue={setLr} min={0.005} max={0.2} step={0.005} />
              <Slider label="에폭 수" value={epochs} setValue={setEpochs} min={5} max={40} step={5} format={(v) => `${v}회`} />
            </div>
          </details>

          <div className="card p-4 font-mono text-sm">
            <div className="text-xs text-muted mb-2">파라미터(가중치+편향) 수</div>
            <div className="text-xs text-muted">구조: {layerSizes.join(' → ')}</div>
            <div className="mt-2 text-lg text-accent">
              {params.toLocaleString()}개
            </div>
          </div>

          <button onClick={train} disabled={training} className="btn-primary">
            {training ? '학습 중...' : '학습 시작'}
          </button>
          {training && <button onClick={() => { cancelRef.current = true; }} className="btn-ghost ml-2">중단</button>}
        </div>

        <div>
          <ProgressChart log={progress} />
          {final && (
            <div className="grid grid-cols-2 gap-2 mt-3 font-mono text-sm">
              <div className="card p-3">
                <div className="text-xs text-muted">학습 정확도</div>
                <div className="text-xl">{(final.trainAcc * 100).toFixed(1)}%</div>
              </div>
              <div className="card p-3 border-accent bg-accent-bg">
                <div className="text-xs text-muted">시험 정확도</div>
                <div className="text-xl text-accent">{(final.testAcc * 100).toFixed(1)}%</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressChart({ log }: { log: { epoch: number; loss: number; acc: number }[] }) {
  const W = 460, H = 200;
  if (log.length === 0) {
    return (
      <div className="card p-6 text-center text-muted text-sm">
        학습 시작 버튼을 누르면 손실·정확도 곡선이 여기에 그려져요.
      </div>
    );
  }
  const lossPath = log.map((l, i) => {
    const x = 30 + (i / Math.max(log.length - 1, 1)) * (W - 40);
    const y = H - 20 - (l.loss / Math.max(...log.map((x) => x.loss))) * (H - 30);
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ');
  const accPath = log.map((l, i) => {
    const x = 30 + (i / Math.max(log.length - 1, 1)) * (W - 40);
    const y = H - 20 - l.acc * (H - 30);
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full border border-border rounded-md bg-surface/40">
      <text x={20} y={14} fontSize={10} fill="rgb(var(--color-muted))">손실(주황) · 정확도(녹색)</text>
      <line x1={30} y1={H - 20} x2={W - 10} y2={H - 20} stroke="rgb(var(--color-border))" />
      <path d={lossPath} stroke="rgb(251, 146, 60)" strokeWidth={2} fill="none" />
      <path d={accPath} stroke="rgb(16, 185, 129)" strokeWidth={2} fill="none" />
    </svg>
  );
}

function ComparisonTable({ results }: { results: Record<string, StageResult> }) {
  const order = ['A', 'B', 'C'];
  return (
    <div className="mt-8">
      <h2>📊 단계별 비교표</h2>
      <table className="w-full text-sm font-mono mt-3">
        <thead>
          <tr className="text-xs text-muted">
            <th className="text-left py-2">단계</th>
            <th>클래스 수</th>
            <th>은닉 구조</th>
            <th>파라미터</th>
            <th>시험 정확도</th>
          </tr>
        </thead>
        <tbody>
          {order.map((id) => {
            const r = results[id];
            const stage = STAGES.find((s) => s.id === id)!;
            return (
              <tr key={id} className="border-t border-border">
                <td className="py-2">{stage.emoji} {stage.id}</td>
                <td className="text-center">{stage.labels.length}</td>
                <td className="text-center">{r ? r.hiddenLayers.join('-') : '—'}</td>
                <td className="text-center">{r ? r.params.toLocaleString() : '—'}</td>
                <td className="text-center">{r ? `${(r.testAcc * 100).toFixed(1)}%` : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {Object.keys(results).length === 3 && (
        <div className="aside-tip mt-4 space-y-2">
          <div className="font-medium">📌 발견한 패턴</div>
          <p className="text-sm">
            클래스 수가 늘수록 신경망에 필요한 가중치도 늘어나는 게 보이죠?
            문제가 복잡할수록 모델도 커야 합니다.
          </p>
          <div className="text-sm border-t border-border pt-2 mt-2">
            <div className="font-medium">🌌 같은 원리, 다른 규모</div>
            <ul className="text-xs space-y-1 mt-1 font-mono">
              <li>우리 신경망 (단계 C): {results.C ? results.C.params.toLocaleString() : '—'}개 파라미터</li>
              <li>GPT-4: 약 1,800,000,000,000개 (1.8조)</li>
              <li>사람 뇌 시냅스: 약 100,000,000,000,000개 (100조)</li>
            </ul>
            <p className="text-xs text-muted mt-2">
              모두 같은 원리로 작동해요. 규모만 다를 뿐.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Slider({
  label, value, setValue, min, max, step, format,
}: { label: string; value: number; setValue: (v: number) => void; min: number; max: number; step: number; format?: (v: number) => string }) {
  return (
    <label className="block">
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="font-mono text-accent">{format ? format(value) : value.toFixed(3)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => setValue(parseFloat(e.target.value))} className="w-full" />
    </label>
  );
}
