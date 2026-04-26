import type { ReactElement } from 'react';
// 뉴럴넷 구조를 시각적으로 보여주는 SVG 다이어그램.
// layers: 각 층의 뉴런 수 배열 (예: [784, 16, 10])
// labels(선택): 각 층 캡션 직접 지정. 미지정 시 입력/은닉 N/출력 자동.

interface Props {
  layers: number[];
  labels?: string[];
  height?: number;
  maxDots?: number;
}

export function NetworkDiagram({ layers, labels, height = 240, maxDots = 12 }: Props) {
  const W = 720;
  const H = height;
  const pad = 24;
  const colX = (k: number) =>
    pad + (layers.length === 1 ? W / 2 : (k / (layers.length - 1)) * (W - pad * 2));
  const dotsFor = (n: number) => Math.min(n, maxDots);
  const labelFor = (k: number) => {
    if (labels && labels[k]) return labels[k];
    if (k === 0) return `입력 (${layers[k]})`;
    if (k === layers.length - 1) return `출력 (${layers[k]})`;
    return `은닉 ${k} (${layers[k]})`;
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full border border-border rounded-md bg-surface/40">
      {layers.slice(0, -1).map((_, k) => {
        const x1 = colX(k), x2 = colX(k + 1);
        const dA = dotsFor(layers[k]);
        const dB = dotsFor(layers[k + 1]);
        const lines: ReactElement[] = [];
        for (let i = 0; i < dA; i++) {
          const y1 = (H - 40) * ((i + 1) / (dA + 1)) + 20;
          for (let j = 0; j < dB; j++) {
            const y2 = (H - 40) * ((j + 1) / (dB + 1)) + 20;
            lines.push(
              <line key={`${k}-${i}-${j}`} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="rgb(var(--color-border))" strokeWidth={0.4} />
            );
          }
        }
        return <g key={`g-${k}`}>{lines}</g>;
      })}
      {layers.map((n, k) => {
        const x = colX(k);
        const d = dotsFor(n);
        const truncated = n > maxDots;
        const isInput = k === 0;
        const isOutput = k === layers.length - 1;
        const fill = isInput ? 'rgb(96, 165, 250)' : isOutput ? 'rgb(16, 185, 129)' : 'rgb(251, 146, 60)';
        return (
          <g key={`n-${k}`}>
            {Array.from({ length: d }).map((_, i) => {
              const y = (H - 40) * ((i + 1) / (d + 1)) + 20;
              return <circle key={i} cx={x} cy={y} r={6} fill={fill} stroke="rgb(var(--color-bg))" strokeWidth={1} />;
            })}
            {truncated && (
              <text x={x} y={H - 30} textAnchor="middle" fontSize={11} fill="rgb(var(--color-muted))">⋮</text>
            )}
            <text x={x} y={H - 6} textAnchor="middle" fontSize={11} fill="rgb(var(--color-muted))">{labelFor(k)}</text>
          </g>
        );
      })}
    </svg>
  );
}

interface LayerEditorProps {
  hiddenLayers: number[];
  setHiddenLayers: (v: number[]) => void;
  disabled?: boolean;
  minNeurons?: number;
  maxNeurons?: number;
  maxLayers?: number;
}

export function LayerEditor({
  hiddenLayers, setHiddenLayers, disabled,
  minNeurons = 1, maxNeurons = 256, maxLayers = 4,
}: LayerEditorProps) {
  const update = (i: number, v: number) => {
    const next = hiddenLayers.slice();
    next[i] = Math.max(minNeurons, Math.min(maxNeurons, Math.round(v)));
    setHiddenLayers(next);
  };
  const add = () => {
    if (hiddenLayers.length >= maxLayers) return;
    const last = hiddenLayers[hiddenLayers.length - 1] ?? 16;
    setHiddenLayers([...hiddenLayers, Math.max(4, Math.round(last / 2))]);
  };
  const remove = (i: number) => {
    if (hiddenLayers.length <= 1) return;
    setHiddenLayers(hiddenLayers.filter((_, k) => k !== i));
  };
  return (
    <div className="space-y-3 mt-3">
      {hiddenLayers.map((n, i) => (
        <div key={i} className="card p-3 flex flex-wrap items-center gap-3">
          <div className="text-sm font-mono w-20 text-muted">은닉 {i + 1}</div>
          <input
            type="range" min={1} max={Math.min(128, maxNeurons)} step={1} value={n}
            disabled={disabled}
            onChange={(e) => update(i, parseInt(e.target.value))}
            className="flex-1 min-w-[160px]"
          />
          <input
            type="number" min={minNeurons} max={maxNeurons} value={n}
            disabled={disabled}
            onChange={(e) => update(i, parseInt(e.target.value || String(minNeurons)))}
            className="w-20 px-2 py-1 bg-surface border border-border rounded font-mono text-sm"
          />
          <span className="text-sm text-muted">뉴런</span>
          <button onClick={() => remove(i)} disabled={disabled || hiddenLayers.length <= 1} className="btn-ghost text-xs">삭제</button>
        </div>
      ))}
      <button onClick={add} disabled={disabled || hiddenLayers.length >= maxLayers} className="btn-ghost text-sm">
        + 은닉층 추가 (최대 {maxLayers})
      </button>
    </div>
  );
}
