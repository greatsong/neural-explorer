import { useMemo, useState } from 'react';
import { useApp } from '../store';
import { PRESET_DATASETS } from '../data/dotPresets';

const SIZE = 8;
const PIXELS = SIZE * SIZE;

export function Phase13() {
  const [setIdx, setSetIdx] = useState(0);
  const [blend, setBlend] = useState(0.5);
  const [noise, setNoise] = useState(0);
  const [seed, setSeed] = useState(0);
  const markCompleted = useApp((s) => s.markCompleted);

  const dataset = PRESET_DATASETS[setIdx];
  const labelA = dataset.labels[0];
  const labelB = dataset.labels[1];
  const aSamples = dataset.patterns.filter((p) => p.label === labelA);
  const bSamples = dataset.patterns.filter((p) => p.label === labelB);

  // 라벨별 평균/분산
  const meanA = useMemo(() => avg(aSamples.map((p) => p.pixels)), [aSamples]);
  const meanB = useMemo(() => avg(bSamples.map((p) => p.pixels)), [bSamples]);
  const varA = useMemo(() => variance(aSamples.map((p) => p.pixels), meanA), [aSamples, meanA]);
  const varB = useMemo(() => variance(bSamples.map((p) => p.pixels), meanB), [bSamples, meanB]);

  // 보간 + 노이즈
  const generated = useMemo(() => {
    let s = seed * 9301 + 49297;
    const rand = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    const out = new Array(PIXELS);
    for (let i = 0; i < PIXELS; i++) {
      const base = meanA[i] * (1 - blend) + meanB[i] * blend;
      const n = (rand() - 0.5) * 2 * noise;
      out[i] = Math.max(0, Math.min(1, base + n));
    }
    return out;
  }, [meanA, meanB, blend, noise, seed]);

  if (blend > 0.1 && blend < 0.9) markCompleted('p13');

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE 13 · 5부 시작</div>
      <h1>평균과 분포 — 가장 단순한 생성 모델</h1>
      <p className="text-muted mt-2">
        지금까지는 그림을 보고 <strong>분류</strong>했어요. 이번엔 방향을 뒤집어서, 그림을 직접 <strong>만들어볼게요</strong>.
        가장 단순한 방법은 모든 같은 라벨 그림의 픽셀을 <strong>평균</strong>내는 거예요.
      </p>

      <div className="aside-tip">
        <div className="font-medium">💡 평균이 곧 생성</div>
        <p className="text-sm mt-1">
          24장 ⬛ 네모 그림의 픽셀을 평균내면 "평균적인 네모"가 나타나요. 이건 사실 가장 단순한 생성 모델이에요.
          데이터가 어디에 모여 있는지(중심)를 알면, 거기서 새 그림을 뽑아낼 수 있어요.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mt-6">
        {PRESET_DATASETS.map((p, i) => (
          <button
            key={i}
            onClick={() => setSetIdx(i)}
            className={`px-3 py-1.5 rounded-md text-sm border ${
              setIdx === i ? 'border-accent text-accent bg-accent-bg' : 'border-border text-muted'
            }`}
          >
            {p.labels[0]} vs {p.labels[1]}
          </button>
        ))}
      </div>

      <h2>① 평균 이미지</h2>
      <div className="grid sm:grid-cols-2 gap-4 mt-2">
        <AvgCard title={`${labelA} 평균 (${aSamples.length}장)`} pixels={meanA} />
        <AvgCard title={`${labelB} 평균 (${bSamples.length}장)`} pixels={meanB} />
      </div>
      <p className="text-xs text-muted mt-2">
        밝은 픽셀 = 그 자리에 자주 칠해짐. 어두운 픽셀 = 거의 비어 있음.
      </p>

      <h2>② 분산 — 어느 픽셀이 자주 흔들리나</h2>
      <div className="grid sm:grid-cols-2 gap-4 mt-2">
        <AvgCard title={`${labelA} 분산`} pixels={varA} alt />
        <AvgCard title={`${labelB} 분산`} pixels={varB} alt />
      </div>
      <p className="text-xs text-muted mt-2">
        밝은 픽셀일수록 그림마다 칠해졌다 안 칠해졌다 변화가 큰 자리. 모델이 다양성을 표현해야 할 영역.
      </p>

      <h2>③ 두 평균 사이 보간 + 노이즈로 새 그림 만들기</h2>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 items-start mt-3">
        <div className="card p-4 space-y-3">
          <Slider
            label={`보간 (← ${labelA} ··· ${labelB} →)`}
            value={blend}
            setValue={setBlend}
            min={0} max={1} step={0.05}
          />
          <Slider
            label="노이즈 (다양성)"
            value={noise}
            setValue={setNoise}
            min={0} max={0.5} step={0.02}
          />
          <button onClick={() => setSeed((s) => s + 1)} className="btn-ghost text-sm">
            🎲 다시 뽑기
          </button>
        </div>
        <div className="card p-4">
          <div className="text-xs text-muted mb-2">생성된 그림 (8×8)</div>
          <PixelView pixels={generated} large />
          <div className="text-xs font-mono text-muted mt-3">
            blend={blend.toFixed(2)} · noise={noise.toFixed(2)}
          </div>
          <div className="text-xs text-muted mt-2">
            슬라이더 양 끝(0 또는 1)에 두면 한 라벨의 평균, 가운데로 가면 둘이 섞인 모양이 나와요. 노이즈를 더하면 매번 살짝 다른 그림.
          </div>
        </div>
      </div>

      <div className="aside-note mt-8">
        <div className="font-medium">한계</div>
        <p className="text-sm mt-1">
          평균은 너무 부드러워요. 실제 그림은 또렷한 윤곽이 있는데, 평균은 흐릿하죠. 더 진짜 같은 그림을 만들려면
          단순 평균이 아니라 <strong>잠재 공간</strong>이 필요해요. 다음 페이즈로 가봅시다.
        </p>
      </div>
    </article>
  );
}

function avg(arr: number[][]): number[] {
  const n = arr.length, out = new Array(PIXELS).fill(0);
  for (const r of arr) for (let i = 0; i < PIXELS; i++) out[i] += r[i];
  for (let i = 0; i < PIXELS; i++) out[i] /= n;
  return out;
}

function variance(arr: number[][], mean: number[]): number[] {
  const n = arr.length, out = new Array(PIXELS).fill(0);
  for (const r of arr) for (let i = 0; i < PIXELS; i++) {
    const d = r[i] - mean[i];
    out[i] += d * d;
  }
  for (let i = 0; i < PIXELS; i++) out[i] = Math.sqrt(out[i] / n);
  return out;
}

function AvgCard({ title, pixels, alt }: { title: string; pixels: number[]; alt?: boolean }) {
  return (
    <div className="card p-3">
      <div className="text-xs text-muted mb-2">{title}</div>
      <PixelView pixels={pixels} large alt={alt} />
    </div>
  );
}

function PixelView({ pixels, large, alt }: { pixels: number[]; large?: boolean; alt?: boolean }) {
  const px = large ? 28 : 12;
  return (
    <div className="inline-grid bg-border p-0.5 rounded" style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)`, gap: 1 }}>
      {pixels.map((v, i) => {
        const c = Math.max(0, Math.min(1, v));
        const color = alt
          ? `rgba(167, 139, 250, ${c})`  // 보라
          : `rgba(0, 0, 0, ${c})`;
        return <div key={i} style={{ width: px, height: px, background: alt ? color : c > 0 ? `rgb(${(1 - c) * 255}, ${(1 - c) * 255}, ${(1 - c) * 255})` : 'white' }} />;
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
