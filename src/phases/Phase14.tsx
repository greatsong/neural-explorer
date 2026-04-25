import { useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import { PRESET_DATASETS } from '../data/dotPresets';
import { createAE, encode, decode, trainBatch, type AE } from '../lib/ae';

const SIZE = 8;
const PIXELS = SIZE * SIZE;
const HIDDEN = 12;
const LATENT = 2;

type Tab = 'idea' | 'train' | 'explore';

export function Phase14() {
  const [tab, setTab] = useState<Tab>('idea');
  const [setIdx, setSetIdx] = useState(0);
  const [ae, setAe] = useState<AE | null>(null);
  const [trainLog, setTrainLog] = useState<{ epoch: number; loss: number }[]>([]);
  const markCompleted = useApp((s) => s.markCompleted);

  const dataset = PRESET_DATASETS[setIdx];

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE 14</div>
      <h1>오토인코더 — 잠재 공간으로 그림 만들기</h1>
      <p className="text-muted mt-2">
        지금까지 신경망은 그림 → 라벨로 갔어요. 오토인코더는 <strong>그림 → 짧은 코드 → 그림</strong>으로 자기 자신을 복원합니다.
        가운데 "짧은 코드"가 잠재 공간이고, 거기서 새 그림을 뽑을 수 있어요. 이게 Stable Diffusion·VAE 가족의 출발점이에요.
      </p>

      <div className="flex gap-1 mt-6 border-b border-border">
        <TabBtn active={tab === 'idea'} onClick={() => setTab('idea')}>① 구조 이해</TabBtn>
        <TabBtn active={tab === 'train'} onClick={() => setTab('train')}>② 학습</TabBtn>
        <TabBtn active={tab === 'explore'} onClick={() => setTab('explore')}>③ 잠재 공간 탐험</TabBtn>
      </div>

      {tab === 'idea' && <IdeaTab />}
      {tab === 'train' && (
        <TrainTab
          dataset={dataset}
          setIdx={setIdx}
          setSetIdx={(i) => { setSetIdx(i); setAe(null); setTrainLog([]); }}
          onTrained={(m, log) => {
            setAe(m); setTrainLog(log);
            markCompleted('p14');
          }}
        />
      )}
      {tab === 'explore' && (
        ae ? <ExploreTab ae={ae} dataset={dataset} trainLog={trainLog} />
           : <div className="aside-warn mt-6">먼저 ② 학습 탭에서 모델을 학습시켜주세요.</div>
      )}
    </article>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 text-sm border-b-2 -mb-px transition ${
        active ? 'border-accent text-accent font-medium' : 'border-transparent text-muted hover:text-text'
      }`}
    >
      {children}
    </button>
  );
}

// ──────── 탭 1 ────────
function IdeaTab() {
  return (
    <div className="mt-6 space-y-4">
      <div className="aside-tip">
        <div className="font-medium">🎯 핵심 아이디어</div>
        <p className="text-sm mt-1">
          그림을 <strong>아주 짧은 코드 (잠재 벡터)</strong>로 줄였다가 다시 펼쳐서 똑같이 복원하도록 신경망 둘을 학습시켜요.
          <br />학습이 끝나면 <strong>디코더</strong>는 "코드 → 그림"이라는 마법 함수가 돼 있어요. 코드를 직접 만들어서 넣으면 새 그림이 나와요.
        </p>
      </div>

      <h2>🔧 구조</h2>
      <div className="card p-4 font-mono text-sm space-y-3 overflow-x-auto">
        <div>입력 (64픽셀)</div>
        <div className="text-muted">  ↓ 인코더 W1 + b1 (ReLU)</div>
        <div>은닉층 ({HIDDEN}뉴런)</div>
        <div className="text-muted">  ↓ 인코더 W2 + b2</div>
        <div className="text-accent">잠재 코드 (z, {LATENT}차원) ← 핵심!</div>
        <div className="text-muted">  ↓ 디코더 W1 + b1 (ReLU)</div>
        <div>은닉층 ({HIDDEN}뉴런)</div>
        <div className="text-muted">  ↓ 디코더 W2 + b2 (sigmoid)</div>
        <div>출력 (64픽셀)</div>
      </div>

      <h2>📐 손실</h2>
      <div className="card p-4 text-sm">
        <div className="font-mono">손실 = (입력과 출력의 차이)</div>
        <p className="text-muted mt-2 text-xs">
          입력 그림과 출력 그림이 같아질수록 좋음. 목표가 "라벨 맞추기"가 아니라 "자기 자신 복원하기"라는 점이 분류와 다른 점.
        </p>
      </div>

      <h2>🎨 왜 새 그림을 만들 수 있을까?</h2>
      <p className="text-sm">
        잠재 코드는 단 {LATENT}개 숫자예요. 학습 끝나면 인코더가 모든 입력 그림을 평면(2D) 위 한 점으로 매핑해요.
        디코더는 그 반대 — 평면의 어떤 점을 줘도 그림으로 복원해줘요. 그래서 학습 데이터에 없던 점을 디코더에 넣으면, <strong>새 그림</strong>이 나오는 거예요.
      </p>
    </div>
  );
}

// ──────── 탭 2 ────────
function TrainTab({
  dataset, setIdx, setSetIdx, onTrained,
}: {
  dataset: typeof PRESET_DATASETS[0]; setIdx: number;
  setSetIdx: (i: number) => void;
  onTrained: (ae: AE, log: { epoch: number; loss: number }[]) => void;
}) {
  const [training, setTraining] = useState(false);
  const [log, setLog] = useState<{ epoch: number; loss: number }[]>([]);
  const cancelRef = useRef(false);

  const train = async () => {
    cancelRef.current = false;
    setTraining(true);
    setLog([]);
    const ae = createAE(PIXELS, HIDDEN, LATENT);
    const samples = dataset.patterns.map((p) => p.pixels);
    // 풀 배치 SGD: 데이터셋 작아서 풀 배치가 안정적
    let lr = 0.1;
    const epochs = 800;
    const out: { epoch: number; loss: number }[] = [];

    for (let ep = 0; ep < epochs; ep++) {
      if (cancelRef.current) break;
      // 학습률 감쇠 (마지막 100에폭에서 절반)
      if (ep === epochs - 100) lr *= 0.5;
      const loss = trainBatch(ae, samples, lr);
      out.push({ epoch: ep + 1, loss });
      if (ep % 20 === 0) {
        setLog([...out]);
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    setLog(out);
    setTraining(false);
    onTrained(ae, out);
  };

  return (
    <div className="mt-6">
      <h2>학습 데이터</h2>
      <div className="flex flex-wrap gap-2 mt-2">
        {PRESET_DATASETS.map((p, i) => (
          <button key={i} onClick={() => setSetIdx(i)}
            className={`px-3 py-1.5 rounded-md text-sm border ${
              setIdx === i ? 'border-accent text-accent bg-accent-bg' : 'border-border text-muted'
            }`}
          >
            {p.labels[0]} vs {p.labels[1]} ({p.patterns.length}장)
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 mt-4 items-start">
        <div className="space-y-4">
          <div className="card p-4 font-mono text-sm">
            <div className="text-xs text-muted mb-2">설정</div>
            <div>입력 64 → 은닉 {HIDDEN} → 잠재 <span className="text-accent">{LATENT}</span> → 은닉 {HIDDEN} → 출력 64</div>
            <div>학습률 0.1 (감쇠) · 에폭 800 · 풀 배치 + 그래디언트 클리핑</div>
          </div>

          <button onClick={train} disabled={training} className="btn-primary">
            {training ? '학습 중...' : '학습 시작'}
          </button>
          {training && (
            <button onClick={() => { cancelRef.current = true; }} className="btn-ghost ml-2">중단</button>
          )}

          {log.length > 0 && (
            <div className="card p-3 font-mono text-sm">
              <div className="text-xs text-muted">현재 손실</div>
              <div className="text-lg text-accent">{log[log.length - 1].loss.toFixed(4)}</div>
              <div className="text-xs text-muted mt-1">에폭 {log[log.length - 1].epoch} / 800</div>
            </div>
          )}
        </div>
        <div>
          <LossChart log={log} />
          <p className="text-xs text-muted mt-2">
            손실이 충분히 떨어지면 ③ 잠재 공간 탐험 탭으로 가세요.
          </p>
        </div>
      </div>
    </div>
  );
}

function LossChart({ log }: { log: { epoch: number; loss: number }[] }) {
  const W = 460, H = 200;
  if (log.length < 2) {
    return (
      <div className="card p-6 text-center text-muted text-sm">학습 시작 후 손실 곡선이 그려져요.</div>
    );
  }
  const max = Math.max(...log.map((x) => x.loss));
  const path = log.map((l, i) => {
    const x = 30 + (i / Math.max(log.length - 1, 1)) * (W - 40);
    const y = H - 20 - (l.loss / max) * (H - 30);
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full border border-border rounded-md bg-surface/40">
      <text x={20} y={14} fontSize={10} fill="rgb(var(--color-muted))">손실 곡선</text>
      <line x1={30} y1={H - 20} x2={W - 10} y2={H - 20} stroke="rgb(var(--color-border))" />
      <path d={path} stroke="rgb(var(--color-accent))" strokeWidth={2} fill="none" />
    </svg>
  );
}

// ──────── 탭 3: 잠재 공간 탐험 ────────
function ExploreTab({
  ae, dataset, trainLog,
}: { ae: AE; dataset: typeof PRESET_DATASETS[0]; trainLog: { epoch: number; loss: number }[] }) {
  const samples = dataset.patterns;
  const labelA = dataset.labels[0];
  const labelB = dataset.labels[1];

  // 모든 학습 샘플의 잠재 좌표 계산
  const points = useMemo(() => samples.map((p) => ({
    z: encode(ae, p.pixels), label: p.label, pixels: p.pixels,
  })), [ae, samples]);

  // 잠재 좌표 범위
  const bounds = useMemo(() => {
    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    for (const p of points) {
      if (p.z[0] < xMin) xMin = p.z[0];
      if (p.z[0] > xMax) xMax = p.z[0];
      if (p.z[1] < yMin) yMin = p.z[1];
      if (p.z[1] > yMax) yMax = p.z[1];
    }
    const padX = (xMax - xMin) * 0.2 || 1;
    const padY = (yMax - yMin) * 0.2 || 1;
    return { xMin: xMin - padX, xMax: xMax + padX, yMin: yMin - padY, yMax: yMax + padY };
  }, [points]);

  const [pointer, setPointer] = useState<[number, number]>([
    (bounds.xMin + bounds.xMax) / 2,
    (bounds.yMin + bounds.yMax) / 2,
  ]);

  // pointer 위치 디코딩
  const generated = useMemo(() => decode(ae, pointer), [ae, pointer]);

  // 학생이 직접 잠재 슬라이더로도 조절 가능
  const setZ = (i: 0 | 1, v: number) => {
    const next: [number, number] = [...pointer];
    next[i] = v;
    setPointer(next);
  };

  const W = 480, H = 360;
  const sx = (zx: number) => 30 + ((zx - bounds.xMin) / (bounds.xMax - bounds.xMin)) * (W - 40);
  const sy = (zy: number) => H - 20 - ((zy - bounds.yMin) / (bounds.yMax - bounds.yMin)) * (H - 30);
  const inv = (px: number, py: number) => ([
    bounds.xMin + ((px - 30) / (W - 40)) * (bounds.xMax - bounds.xMin),
    bounds.yMin + ((H - 20 - py) / (H - 30)) * (bounds.yMax - bounds.yMin),
  ]) as [number, number];

  const onMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const py = ((e.clientY - rect.top) / rect.height) * H;
    setPointer(inv(px, py));
  };

  return (
    <div className="mt-6">
      <p className="text-muted">
        학습 끝난 오토인코더의 <strong>잠재 평면</strong>에 모든 학습 그림을 점으로 놓았어요.
        평면 어디든 클릭하면 그 좌표를 디코더에 넣어 새 그림을 만들어요.
      </p>

      <div className="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-6 mt-4 items-start">
        {/* 잠재 평면 */}
        <div>
          <div className="text-sm font-medium mb-2">2D 잠재 공간 (클릭해서 탐험)</div>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full border border-border rounded-md bg-surface/40 cursor-crosshair"
            onClick={onMapClick}
          >
            {/* axes */}
            <line x1={30} y1={H - 20} x2={W - 10} y2={H - 20} stroke="rgb(var(--color-border))" />
            <line x1={30} y1={20} x2={30} y2={H - 20} stroke="rgb(var(--color-border))" />
            <text x={W - 10} y={H - 6} textAnchor="end" fontSize={10} fill="rgb(var(--color-muted))">z₁</text>
            <text x={36} y={26} fontSize={10} fill="rgb(var(--color-muted))">z₂</text>

            {/* points */}
            {points.map((p, i) => (
              <circle key={i} cx={sx(p.z[0])} cy={sy(p.z[1])} r={5}
                fill={p.label === labelA ? 'rgb(59, 130, 246)' : 'rgb(251, 146, 60)'}
                opacity={0.7}
              >
                <title>{p.label}</title>
              </circle>
            ))}

            {/* pointer */}
            <circle cx={sx(pointer[0])} cy={sy(pointer[1])} r={9}
              fill="none" stroke="rgb(var(--color-accent))" strokeWidth={2} />
            <circle cx={sx(pointer[0])} cy={sy(pointer[1])} r={3} fill="rgb(var(--color-accent))" />
          </svg>
          <div className="flex gap-3 text-xs mt-2 font-mono">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> {labelA}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400" /> {labelB}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent" /> 현재 좌표</span>
          </div>
        </div>

        {/* 디코더 출력 + 슬라이더 */}
        <div>
          <div className="text-sm font-medium mb-2">디코더가 만든 그림</div>
          <div className="card p-4">
            <PixelView pixels={Array.from(generated)} large />
            <div className="text-xs font-mono text-muted mt-3">
              z = ({pointer[0].toFixed(2)}, {pointer[1].toFixed(2)})
            </div>
          </div>

          <div className="card p-4 mt-3 space-y-3">
            <Slider label="z₁" value={pointer[0]} setValue={(v) => setZ(0, v)}
              min={bounds.xMin} max={bounds.xMax} step={0.05} />
            <Slider label="z₂" value={pointer[1]} setValue={(v) => setZ(1, v)}
              min={bounds.yMin} max={bounds.yMax} step={0.05} />
            <button onClick={() => setPointer([
              (bounds.xMin + bounds.xMax) / 2, (bounds.yMin + bounds.yMax) / 2,
            ])} className="btn-ghost text-xs">중앙으로</button>
          </div>

          <div className="aside-tip mt-3 text-sm">
            <strong>해보기</strong> — 두 라벨 점들 사이를 천천히 움직여보세요. 한쪽 모양이 다른 쪽으로 부드럽게 변하는 게 보여요.
            데이터에 없던 좌표를 클릭해도 그림이 만들어져요.
          </div>
        </div>
      </div>

      <h2>📚 같은 원리, 더 큰 규모</h2>
      <div className="aside-note">
        <p className="text-sm">
          오늘 만든 건 잠재 차원 2개짜리, 64픽셀 출력이에요.<br />
          Stable Diffusion·DALL·E 같은 이미지 생성 AI는 잠재 차원이 수천~수만, 출력은 수백만 픽셀.
          하지만 <strong>"코드 → 그림" 디코더가 핵심</strong>이라는 건 같아요.
          ChatGPT 4o가 그림을 만드는 것도 결국 큰 잠재 공간에서 좌표를 정해 디코더에 넣는 일입니다.
        </p>
      </div>

      <details className="mt-4">
        <summary className="text-sm text-muted cursor-pointer">학습 정보 보기 (손실 곡선 등)</summary>
        <div className="text-xs font-mono mt-2">
          최종 손실 {trainLog[trainLog.length - 1]?.loss.toFixed(4) ?? '—'} · 총 에폭 {trainLog.length}
        </div>
      </details>
    </div>
  );
}

function PixelView({ pixels, large }: { pixels: number[]; large?: boolean }) {
  const px = large ? 28 : 12;
  return (
    <div className="inline-grid bg-border p-0.5 rounded" style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)`, gap: 1 }}>
      {pixels.map((v, i) => {
        const c = Math.max(0, Math.min(1, v));
        const bg = c > 0 ? `rgb(${(1 - c) * 255}, ${(1 - c) * 255}, ${(1 - c) * 255})` : 'white';
        return <div key={i} style={{ width: px, height: px, background: bg }} />;
      })}
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
