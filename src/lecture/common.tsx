// 특강 슬라이드 공용 조각 — 레이아웃, 글자 강조, 숫자 표기, 슬라이더
import type { ReactNode } from 'react';
import { ORANGE } from './NeuronFigure';

export function Layout({ figure, lines, aside }: { figure: ReactNode; lines?: (ReactNode | null)[]; aside?: ReactNode }) {
  const shown = (lines ?? []).filter((l) => l !== null && l !== undefined);
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 flex items-stretch gap-[24px]">
        <div className="flex-1 min-w-0">{figure}</div>
        {aside && <div className="w-[300px] shrink-0 flex flex-col justify-center">{aside}</div>}
      </div>
      <div className="h-[112px] shrink-0 flex flex-col justify-center gap-[6px]">
        {shown.map((l, i) => (
          <div key={i} className={`lec-fade text-[34px] leading-snug ${i === shown.length - 1 ? 'text-text font-semibold' : 'text-muted'}`}>{l}</div>
        ))}
      </div>
    </div>
  );
}
export const M = ({ children }: { children: ReactNode }) => <span className="tabular-nums font-semibold text-text">{children}</span>;
export const Key = ({ children }: { children: ReactNode }) => <span className="text-accent font-bold">{children}</span>;
export const Hot = ({ children }: { children: ReactNode }) => <span style={{ color: ORANGE }} className="font-bold">{children}</span>;

export function Slider({ label, value, set, min, max, step }: { label: string; value: number; set: (v: number) => void; min: number; max: number; step: number }) {
  return (
    <label className="block mb-[14px]" onClick={(e) => e.stopPropagation()}>
      <div className="flex justify-between text-[19px] mb-[2px]"><span className="text-muted">{label}</span><span className="font-mono text-accent font-semibold">{fmt(value)}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => set(parseFloat(e.target.value))} className="w-full accent-[rgb(var(--color-accent))]" />
    </label>
  );
}
export function fmt(v: number) { const r = Math.round(v * 1000) / 1000; return (r < 0 ? '−' : '') + Math.abs(r).toString(); }
export function fmt2(v: number) { const r = Math.round(v * 100) / 100; return (r < 0 ? '−' : '') + Math.abs(r).toString(); }
// 식 안에서 더할 때 음수는 괄호로: 4 + (−3) + 0
export const par = (v: number) => (v < 0 ? `(${fmt(v)})` : fmt(v));
export const relu = (z: number) => Math.max(0, z);
