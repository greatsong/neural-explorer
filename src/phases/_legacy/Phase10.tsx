import { useEffect, useState } from 'react';
import { useApp } from '../store';
import { PRESET_DATASETS } from '../data/dotPresets';
import { NetworkDiagram } from '../components/NetworkDiagram';

const SIZE = 8;
const PIXELS = SIZE * SIZE;

interface Drawing {
  pixels: number[]; // length 64, 0 or 1
  label: string;
}

type Tab = 'draw' | 'train' | 'test' | 'share';

const PRESET_LABELS = PRESET_DATASETS.map((p) => p.labels) as readonly (readonly [string, string])[];

export function Phase10() {
  const [tab, setTab] = useState<Tab>('draw');
  const [labels, setLabels] = useState<[string, string]>([PRESET_LABELS[0][0], PRESET_LABELS[0][1]]);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [model, setModel] = useState<number[] | null>(null); // 64 weights + 1 bias
  const [trainLog, setTrainLog] = useState<{ epoch: number; loss: number; acc: number }[]>([]);

  const markCompleted = useApp((s) => s.markCompleted);

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE 10</div>
      <h1>도트 그림 학습 — 직접 만들고 학습하고 공유하기</h1>
      <p className="text-muted mt-2">
        8×8 도트로 두 가지 그림을 직접 그리고, 단일 뉴런이 그 둘을 구분하도록 학습시켜봐요.
        만든 그림은 오픈 갤러리에 공유할 수도 있어요(CC-BY 4.0).
      </p>

      <div className="flex gap-1 mt-6 border-b border-border">
        <TabBtn active={tab === 'draw'} onClick={() => setTab('draw')}>① 그림 모으기</TabBtn>
        <TabBtn active={tab === 'train'} onClick={() => setTab('train')}>② 학습</TabBtn>
        <TabBtn active={tab === 'test'} onClick={() => setTab('test')}>③ 테스트</TabBtn>
        <TabBtn active={tab === 'share'} onClick={() => setTab('share')}>④ 갤러리에 공유</TabBtn>
      </div>

      {tab === 'draw' && (
        <DrawTab labels={labels} setLabels={setLabels} drawings={drawings} setDrawings={setDrawings} />
      )}
      {tab === 'train' && (
        <TrainTab
          labels={labels} drawings={drawings}
          model={model} setModel={setModel}
          trainLog={trainLog} setTrainLog={setTrainLog}
          onCompleted={() => markCompleted('p10')}
        />
      )}
      {tab === 'test' && <TestTab labels={labels} model={model} />}
      {tab === 'share' && <ShareTab labels={labels} drawings={drawings} />}
    </article>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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
function DrawTab({
  labels, setLabels, drawings, setDrawings,
}: {
  labels: [string, string]; setLabels: (l: [string, string]) => void;
  drawings: Drawing[]; setDrawings: (d: Drawing[]) => void;
}) {
  const [current, setCurrent] = useState<number[]>(new Array(PIXELS).fill(0));
  const [activeLabel, setActiveLabel] = useState(0);

  const counts = labels.map((l) => drawings.filter((d) => d.label === l).length);

  const togglePixel = (idx: number) => {
    const next = [...current];
    next[idx] = next[idx] ? 0 : 1;
    setCurrent(next);
  };

  const save = () => {
    if (current.every((v) => v === 0)) return;
    setDrawings([...drawings, { pixels: current, label: labels[activeLabel] }]);
    setCurrent(new Array(PIXELS).fill(0));
  };

  const loadPreset = () => {
    const set = PRESET_DATASETS.find((p) => p.labels[0] === labels[0] && p.labels[1] === labels[1]);
    if (!set) return;
    const additions: Drawing[] = set.patterns.map((p) => ({ pixels: p.pixels, label: p.label }));
    // 기존 동일 라벨의 프리셋 중복은 제거 (픽셀 동일성으로 비교)
    const existing = new Set(drawings.map((d) => `${d.label}|${d.pixels.join('')}`));
    const fresh = additions.filter((a) => !existing.has(`${a.label}|${a.pixels.join('')}`));
    setDrawings([...drawings, ...fresh]);
  };

  const clearAll = () => {
    if (drawings.length === 0) return;
    if (!confirm(`모은 그림 ${drawings.length}장을 모두 지울까요?`)) return;
    setDrawings([]);
  };

  return (
    <div className="mt-6">
      <h2>분류할 두 가지를 정해요</h2>
      <div className="flex flex-wrap gap-2 mt-2">
        {PRESET_LABELS.map(([a, b], i) => (
          <button
            key={i}
            onClick={() => setLabels([a, b])}
            className={`px-3 py-1.5 rounded-md text-sm border ${
              labels[0] === a && labels[1] === b ? 'border-accent text-accent bg-accent-bg' : 'border-border text-muted'
            }`}
          >
            {a} vs {b}
          </button>
        ))}
      </div>

      <h2>📦 데이터 수집 + 전처리</h2>
      <p className="text-muted text-sm">
        머신러닝에서 모델보다 먼저 만지는 게 <strong>데이터</strong>예요. 두 단계가 있어요.
      </p>
      <ul className="text-sm text-muted mt-2 list-disc pl-5 space-y-1">
        <li><strong>수집(collection)</strong> — 라벨이 붙은 예시를 모아요. 여기선 "{labels[0]}"과 "{labels[1]}" 두 라벨이 있죠.</li>
        <li><strong>전처리(preprocessing)</strong> — 모델이 먹기 좋게 다듬어요. 여기선 자유로운 그림을 8×8 도트로 줄이고, 검정/흰색만 쓰는 0/1 값으로 바꾸는 게 전처리에 해당합니다.</li>
      </ul>
      <div className="aside-tip mt-3">
        <div className="font-medium text-sm">미리 다듬어 둔 데이터 불러오기</div>
        <p className="text-sm mt-1">
          위에서 고른 짝마다 미리 그려둔 8×8 도트가 각 라벨 12장씩, 총 24장 있어요.
          이걸 시작 데이터로 쓰고, 직접 그린 그림을 더해서 키워도 좋아요.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <button onClick={loadPreset} className="btn-primary text-xs">
            📦 "{labels[0]} / {labels[1]}" 프리셋 24장 불러오기
          </button>
          {drawings.length > 0 && (
            <button onClick={clearAll} className="btn-ghost text-xs">
              모은 그림 모두 지우기
            </button>
          )}
        </div>
      </div>
      <div className="aside-warn mt-3">
        <div className="font-medium text-sm">🧹 데이터 정제(data cleaning) — 학습 전에 꼭!</div>
        <p className="text-sm mt-1">
          모델은 우리가 보여준 그대로를 진실이라고 믿어요. 그래서 <strong>잘못 라벨링된 그림이나 두 라벨 어디에도 속하지 않는 모호한 그림은 학습 전에 빼야</strong> 합니다.
          오른쪽 "모은 그림" 영역에서 어색하거나 헷갈리는 도트는 <strong>삭제</strong> 버튼으로 제거해 주세요.
        </p>
        <ul className="text-xs text-muted mt-2 list-disc pl-5 space-y-1">
          <li>예: "네모"인데 픽셀 한두 칸만 찍혀 있다면 → 빼기</li>
          <li>예: "동그라미"인데 네모처럼 보인다면 → 빼기</li>
          <li>비어 있는 그림(픽셀 0개)은 자동으로 저장이 안 되지만, 이미 들어 있는 게 있다면 정리</li>
        </ul>
        <p className="text-xs text-muted mt-2">
          <em>"쓰레기를 넣으면 쓰레기가 나온다(garbage in, garbage out)"</em> — 데이터의 질이 모델 성능을 결정합니다.
        </p>
      </div>

      <h2>그림 그리기 (직접 추가)</h2>
      <div className="grid lg:grid-cols-[auto_1fr] gap-6 items-start mt-2">
        <div>
          <div className="flex gap-2 mb-3">
            {labels.map((l, i) => (
              <button
                key={i}
                onClick={() => setActiveLabel(i)}
                className={`px-3 py-1.5 rounded-md text-sm border ${
                  activeLabel === i ? 'border-accent text-accent bg-accent-bg' : 'border-border text-muted'
                }`}
              >
                {l} ({counts[i]})
              </button>
            ))}
          </div>
          <Grid pixels={current} onToggle={togglePixel} />
          <div className="flex gap-2 mt-3">
            <button onClick={save} className="btn-primary">{labels[activeLabel]}로 저장</button>
            <button onClick={() => setCurrent(new Array(PIXELS).fill(0))} className="btn-ghost">지우기</button>
          </div>
        </div>

        <div>
          <div className="text-sm font-medium">모은 그림 ({drawings.length}장)</div>
          <p className="text-xs text-muted mt-1">각 라벨당 최소 3장 이상 모으면 학습 효과가 좋아요.</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 mt-3">
            {drawings.map((d, i) => (
              <div key={i} className="card p-2 text-center">
                <MiniGrid pixels={d.pixels} />
                <div className="text-xs mt-1">{d.label}</div>
                <button
                  onClick={() => setDrawings(drawings.filter((_, j) => j !== i))}
                  className="text-xs text-muted hover:text-rose-500"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────── 탭 2 ────────
function TrainTab({
  labels, drawings, model, setModel, trainLog, setTrainLog, onCompleted,
}: {
  labels: [string, string]; drawings: Drawing[];
  model: number[] | null; setModel: (m: number[]) => void;
  trainLog: { epoch: number; loss: number; acc: number }[];
  setTrainLog: (l: { epoch: number; loss: number; acc: number }[]) => void;
  onCompleted: () => void;
}) {
  const [training, setTraining] = useState(false);
  const counts = labels.map((l) => drawings.filter((d) => d.label === l).length);
  const ready = counts[0] >= 2 && counts[1] >= 2;

  const train = async () => {
    setTraining(true);
    // 단일 뉴런 + 시그모이드, BCE 손실
    const w = new Array(PIXELS).fill(0).map(() => (Math.random() - 0.5) * 0.1);
    let b = 0;
    const lr = 0.5;
    const log: { epoch: number; loss: number; acc: number }[] = [];

    const samples = drawings.map((d) => ({
      x: d.pixels,
      y: d.label === labels[0] ? 0 : 1,
    }));

    for (let epoch = 0; epoch < 80; epoch++) {
      let lossSum = 0;
      let correct = 0;
      // shuffle
      const ids = samples.map((_, i) => i).sort(() => Math.random() - 0.5);
      for (const i of ids) {
        const { x, y } = samples[i];
        let z = b;
        for (let k = 0; k < PIXELS; k++) z += w[k] * x[k];
        const p = 1 / (1 + Math.exp(-z));
        const loss = -(y * Math.log(Math.max(p, 1e-9)) + (1 - y) * Math.log(Math.max(1 - p, 1e-9)));
        lossSum += loss;
        if ((p > 0.5 ? 1 : 0) === y) correct++;
        const dz = p - y;
        for (let k = 0; k < PIXELS; k++) w[k] -= lr * dz * x[k];
        b -= lr * dz;
      }
      log.push({ epoch: epoch + 1, loss: lossSum / samples.length, acc: correct / samples.length });
      if (epoch % 5 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    setModel([...w, b]);
    setTrainLog(log);
    setTraining(false);
    onCompleted();
  };

  const finalLog = trainLog[trainLog.length - 1];

  return (
    <div className="mt-6">
      <p className="text-muted">
        모은 그림으로 단일 뉴런을 학습시켜요. 64개 픽셀 → 1개 뉴런 → 0(첫 라벨) 또는 1(두 번째 라벨).
      </p>

      <details className="mt-4 card p-3">
        <summary className="cursor-pointer text-sm font-medium">신경망 구조 보기 (이번 단계는 64 → 1로 고정)</summary>
        <div className="mt-3">
          <NetworkDiagram
            layers={[64, 1]}
            labels={[`8×8 픽셀 (64)`, `시그모이드 (1)`]}
            height={150}
            maxDots={8}
          />
          <p className="text-xs text-muted mt-2">
            페이즈 11부터는 은닉층 수와 뉴런 수를 직접 정해볼 수 있어요. 지금은 "픽셀 → 단일 뉴런"의 가장 간단한 형태입니다.
          </p>
        </div>
      </details>

      {!ready && (
        <div className="aside-warn mt-4">
          <strong>그림이 부족해요.</strong> 각 라벨당 최소 2장씩 그려주세요.
          <div className="text-sm mt-1">
            현재: {labels[0]} {counts[0]}장 / {labels[1]} {counts[1]}장
          </div>
        </div>
      )}

      {ready && (
        <>
          <div className="aside-tip mt-4 text-sm">
            <div className="font-medium">📌 페이즈 5에서 본 그 식이 여기서 돌아갑니다</div>
            <p className="mt-1 text-muted">
              학습 시작을 누르면 80번 반복하며 <code>w ← w − η · e · x</code>, <code>b ← b − η · e</code>를 적용해요
              (단일 뉴런 + 시그모이드 + BCE 손실, <code>e = ŷ − y</code>). 페이즈 5는 5점 회귀였고 여기는 64픽셀 분류이지만
              갱신 식의 골격은 똑같습니다.
            </p>
          </div>
          <button onClick={train} disabled={training} className="btn-primary mt-4">
            {training ? '학습 중...' : '학습 시작 (80 에폭)'}
          </button>

          {trainLog.length > 0 && (
            <>
              <div className="grid sm:grid-cols-3 gap-2 mt-4 font-mono text-sm">
                <div className="card p-3">
                  <div className="text-xs text-muted">최종 손실</div>
                  <div className="text-lg">{finalLog.loss.toFixed(4)}</div>
                </div>
                <div className="card p-3">
                  <div className="text-xs text-muted">학습 정확도</div>
                  <div className="text-lg text-accent">{(finalLog.acc * 100).toFixed(0)}%</div>
                </div>
                <div className="card p-3">
                  <div className="text-xs text-muted">에폭</div>
                  <div className="text-lg">{finalLog.epoch}</div>
                </div>
              </div>

              <LossChart log={trainLog} />

              {model && <WeightVis weights={model.slice(0, PIXELS)} labels={labels} />}
            </>
          )}
        </>
      )}
    </div>
  );
}

function LossChart({ log }: { log: { epoch: number; loss: number; acc: number }[] }) {
  const W = 480, H = 160;
  const maxLoss = Math.max(...log.map((l) => l.loss));
  const path = log.map((l, i) => {
    const x = 20 + (i / Math.max(log.length - 1, 1)) * (W - 30);
    const y = H - 20 - (l.loss / Math.max(maxLoss, 0.001)) * (H - 30);
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-4 border border-border rounded-md bg-surface/40">
      <text x={20} y={14} fontSize={10} fill="rgb(var(--color-muted))">손실 곡선 (낮을수록 좋음)</text>
      <line x1={20} y1={H - 20} x2={W - 10} y2={H - 20} stroke="rgb(var(--color-border))" />
      <path d={path} stroke="rgb(var(--color-accent))" strokeWidth={2} fill="none" />
    </svg>
  );
}

function WeightVis({ weights, labels }: { weights: number[]; labels: [string, string] }) {
  // 양수 = label[1], 음수 = label[0] 쪽으로 미는 픽셀
  const max = Math.max(...weights.map(Math.abs), 0.01);
  return (
    <div className="card p-4 mt-4">
      <div className="text-sm font-medium">학습된 가중치 시각화</div>
      <div className="text-xs text-muted mt-1">
        🟦 파란 픽셀: <strong>{labels[0]}</strong>으로 분류시키는 픽셀 / 🟧 주황: <strong>{labels[1]}</strong>으로
      </div>
      <div className="mt-3 inline-grid grid-cols-8 gap-0.5 bg-border p-0.5 rounded">
        {weights.map((w, i) => {
          const norm = w / max;
          const color = norm > 0
            ? `rgba(251, 146, 60, ${Math.abs(norm)})`
            : `rgba(59, 130, 246, ${Math.abs(norm)})`;
          return <div key={i} style={{ background: color, width: 24, height: 24 }} />;
        })}
      </div>
    </div>
  );
}

// ──────── 탭 3 ────────
function TestTab({ labels, model }: { labels: [string, string]; model: number[] | null }) {
  const [pixels, setPixels] = useState<number[]>(new Array(PIXELS).fill(0));
  if (!model) {
    return (
      <div className="mt-6">
        <div className="aside-warn">먼저 ② 학습 탭에서 모델을 학습시켜주세요.</div>
      </div>
    );
  }
  let z = model[PIXELS]; // bias
  for (let i = 0; i < PIXELS; i++) z += model[i] * pixels[i];
  const p = 1 / (1 + Math.exp(-z));
  const pred = p > 0.5 ? labels[1] : labels[0];
  const conf = Math.max(p, 1 - p);
  const empty = pixels.every((v) => v === 0);

  return (
    <div className="mt-6">
      <p className="text-muted">새 그림을 그려보고 모델이 어떻게 분류하는지 확인해요.</p>
      <div className="grid lg:grid-cols-[auto_1fr] gap-6 mt-4 items-start">
        <div>
          <Grid pixels={pixels} onToggle={(i) => {
            const next = [...pixels]; next[i] = next[i] ? 0 : 1; setPixels(next);
          }} />
          <button onClick={() => setPixels(new Array(PIXELS).fill(0))} className="btn-ghost mt-3">
            지우기
          </button>
        </div>
        <div className="card p-5">
          <div className="text-sm font-medium">모델의 판단</div>
          {empty ? (
            <div className="text-muted mt-2 text-sm">왼쪽에 그림을 그려보세요.</div>
          ) : (
            <>
              <div className="mt-3 text-3xl">{pred}</div>
              <div className="font-mono text-sm mt-2">
                확신도 <span className="text-accent">{(conf * 100).toFixed(0)}%</span>
              </div>
              <div className="mt-3 flex gap-2">
                <Bar label={labels[0]} value={1 - p} />
                <Bar label={labels[1]} value={p} />
              </div>
              <div className="text-xs font-mono mt-3 text-muted">
                z = {z.toFixed(2)} → σ(z) = {p.toFixed(3)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1">
      <div className="text-xs">{label}</div>
      <div className="h-2 bg-border rounded mt-1 overflow-hidden">
        <div className="h-full bg-accent" style={{ width: `${value * 100}%` }} />
      </div>
      <div className="text-xs font-mono text-muted mt-0.5">{(value * 100).toFixed(0)}%</div>
    </div>
  );
}

// ──────── 탭 4 ────────
function ShareTab({ labels, drawings }: { labels: [string, string]; drawings: Drawing[] }) {
  const [nickname, setNickname] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ count: number; deleteToken: string } | null>(null);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!consent) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drawings: drawings.map((d) => ({ pixels: d.pixels, label: d.label, size: SIZE })),
          nickname: nickname || null,
          phase: 10,
          labels,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      const j = await res.json();
      setDone({ count: drawings.length, deleteToken: j.deleteToken ?? '—' });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-6">
      <h2>🌍 오픈 갤러리에 공유</h2>
      <p className="text-muted">
        공유한 그림은{' '}
        <a href="https://github.com/greatsong/neural-explorer-gallery" target="_blank" rel="noreferrer" className="text-accent underline">
          neural-explorer-gallery
        </a>
        에 <strong>CC-BY 4.0</strong> 라이선스로 추가돼요. 다음 학기 학생들이 여러분의 그림으로 학습할 수도 있어요.
      </p>

      <div className="card p-5 mt-4 space-y-3">
        <div>
          <div className="text-sm font-medium">현재 모은 그림</div>
          <div className="text-xs text-muted">총 {drawings.length}장 · {labels[0]}/{labels[1]}</div>
        </div>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="닉네임 (선택)"
          maxLength={20}
          className="w-full px-3 py-2 rounded-md border border-border bg-bg"
        />
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
          <span>
            나는 만 14세 이상이며, 내 그림이 CC-BY 4.0 라이선스로 공개 데이터셋에 포함되는 것에 동의합니다.
          </span>
        </label>
        <button
          onClick={submit}
          disabled={!consent || drawings.length === 0 || submitting}
          className="btn-primary disabled:opacity-50"
        >
          {submitting ? '전송 중...' : '갤러리에 공유하기'}
        </button>

        {done && (
          <div className="aside-tip mt-3">
            <div className="font-medium">🎉 {done.count}장 제출 완료!</div>
            <div className="text-sm mt-1">
              삭제 토큰: <code>{done.deleteToken}</code> (저장해두세요)
            </div>
            <a
              href="https://github.com/greatsong/neural-explorer-gallery/tree/main/submissions"
              target="_blank" rel="noreferrer"
              className="text-sm text-accent underline mt-1 inline-block"
            >
              갤러리 둘러보기 →
            </a>
          </div>
        )}
        {error && (
          <div className="aside-warn">
            전송 실패: {error}
            <p className="text-xs mt-1 text-muted">
              (운영자가 GitHub 토큰을 Vercel 환경변수에 등록해야 동작해요)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ──────── 공통 컴포넌트 ────────
function Grid({ pixels, onToggle }: { pixels: number[]; onToggle: (i: number) => void }) {
  const [drawing, setDrawing] = useState(false);
  useEffect(() => {
    const stop = () => setDrawing(false);
    window.addEventListener('mouseup', stop);
    return () => window.removeEventListener('mouseup', stop);
  }, []);
  return (
    <div
      className="inline-grid bg-border p-0.5 rounded select-none"
      style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)`, gap: 2 }}
    >
      {pixels.map((v, i) => (
        <div
          key={i}
          onMouseDown={() => { setDrawing(true); onToggle(i); }}
          onMouseEnter={() => { if (drawing) onToggle(i); }}
          className={`cursor-pointer ${v ? 'bg-text' : 'bg-bg'}`}
          style={{ width: 36, height: 36 }}
        />
      ))}
    </div>
  );
}

function MiniGrid({ pixels }: { pixels: number[] }) {
  return (
    <div className="inline-grid bg-border p-0.5 rounded" style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)`, gap: 1 }}>
      {pixels.map((v, i) => (
        <div key={i} className={v ? 'bg-text' : 'bg-bg'} style={{ width: 8, height: 8 }} />
      ))}
    </div>
  );
}
