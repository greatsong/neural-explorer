// 마무리 — 작은 신경망이 "어느 날 토끼 가" 다음 단어 확률을 말뭉치로 실제 학습하는 시연.
// 입력 4단어 → 숫자 벡터(16) → 은닉 6 → 은닉 6 → 출력 7(단어 6개 + 그 외). 손실은 교차 엔트로피, 경사 하강법.
// 학습 전에는 모든 칸이 같은 확률(출력 가중치 0). 정답 비율은 앞 장과 같은 n-gram 모델(앱 E4 말뭉치)에서
// temperature 1.5로 계산한 값이라 한 단어에 몰리지 않고 여러 단어에 퍼진다. 손실은 정답 비율의 엔트로피(0이 아님)로 수렴한다.
// 버튼을 누를 때마다 w·b를 실제 기울기로 업데이트한다(가짜 숫자 없음).
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { Layout, Key, Hot } from './common';
import { ACCENT, ACCENT_BG, MUTED, TEXT, BG, SURFACE, ORANGE, ORANGE_BG, VB_W, VB_H } from './NeuronFigure';
import { STORY_CORPUS } from '../data/storyCorpus';
import { buildNGram, logitsFor, softmax } from '../lib/ngram';

const NG = buildNGram(STORY_CORPUS);
const CTX = ['어느', '날', '토끼', '가'];
const WORDS = ['숲', '살았다', '말했다', '강', '당근', '길'];
const OUT = [...WORDS, '그 외'];
const D = 4, H = 6, ETA = 1.2, TEMP = 1.5;

function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function gauss(r: () => number) { return Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r()); }
const mat = (rows: number, cols: number, s: number, r: () => number) => Array.from({ length: rows }, () => Array.from({ length: cols }, () => gauss(r) * s));

type Net = { W1: number[][]; b1: number[]; W2: number[][]; b2: number[]; W3: number[][]; b3: number[] };
const relu = (v: number[]) => v.map((x) => (x > 0 ? x : 0));
const affine = (W: number[][], b: number[], x: number[]) => W.map((row, j) => row.reduce((s, w, i) => s + w * x[i], b[j]));
function sm(z: number[]) { const m = Math.max(...z); const e = z.map((v) => Math.exp(v - m)); const s = e.reduce((a, b) => a + b, 0); return e.map((v) => v / s); }

// 입력 벡터: 단어마다 고정된 4차원 숫자(학습하지 않음)
const R0 = rng(7);
const EMB = new Map(CTX.map((w) => [w, Array.from({ length: D }, () => gauss(R0) * 0.8)]));
const X = CTX.flatMap((w) => EMB.get(w)!);

// 정답 비율 q: 말뭉치의 n-gram 모델이 "토끼 가" 다음에 준 확률. 마지막 칸은 나머지 단어 전부의 합.
const Q: number[] = (() => {
  const idx = (w: string) => NG.index.get(w) ?? null;
  const pAll = softmax(logitsFor(NG, idx(CTX[2]), idx(CTX[3])), TEMP);
  const q = WORDS.map((w) => pAll[NG.index.get(w) ?? -1] ?? 0);
  const rest = 1 - q.reduce((a, b) => a + b, 0);
  return [...q, Math.max(rest, 0)];
})();
const K = OUT.length;

function forward(n: Net, x: number[]) {
  const z1 = affine(n.W1, n.b1, x), h1 = relu(z1);
  const z2 = affine(n.W2, n.b2, h1), h2 = relu(z2);
  const z3 = affine(n.W3, n.b3, h2), p = sm(z3);
  return { z1, h1, z2, h2, z3, p };
}
function initNet(): Net {
  const r = rng(2026);
  // 출력 가중치·편향은 0에서 시작 → 학습 전에는 모든 칸이 같은 확률
  return { W1: mat(H, D * 4, 0.5, r), b1: Array(H).fill(0.1), W2: mat(H, H, 0.5, r), b2: Array(H).fill(0.1), W3: Array.from({ length: K }, () => Array(H).fill(0)), b3: Array(K).fill(0) };
}
const lossOf = (p: number[]) => -Q.reduce((s, q, k) => s + (q > 0 ? q * Math.log(p[k]) : 0), 0);
function stepNet(n: Net): Net {
  const f = forward(n, X);
  const dz3 = f.p.map((v, k) => v - Q[k]);
  const dh2 = Array.from({ length: H }, (_, j) => dz3.reduce((s, g, k) => s + g * n.W3[k][j], 0));
  const dz2 = dh2.map((g, j) => (f.z2[j] > 0 ? g : 0));
  const dh1 = Array.from({ length: H }, (_, j) => dz2.reduce((s, g, k) => s + g * n.W2[k][j], 0));
  const dz1 = dh1.map((g, j) => (f.z1[j] > 0 ? g : 0));
  const upd = (W: number[][], g: number[], h: number[]) => W.map((row, k) => row.map((w, j) => w - ETA * g[k] * h[j]));
  return {
    W1: upd(n.W1, dz1, X), b1: n.b1.map((b, k) => b - ETA * dz1[k]),
    W2: upd(n.W2, dz2, f.h1), b2: n.b2.map((b, k) => b - ETA * dz2[k]),
    W3: upd(n.W3, dz3, f.h2), b3: n.b3.map((b, k) => b - ETA * dz3[k]),
  };
}

const Svg = ({ children }: { children: ReactNode }) => (
  <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet" fontFamily="Pretendard, system-ui, sans-serif">{children}</svg>
);

export const EndTrainDemo: ComponentType<{ step: number }> = ({ step }) => {
  const init = useMemo(initNet, []);
  const [net, setNet] = useState<Net>(init);
  const [hist, setHist] = useState<number[]>([]);
  const [pulse, setPulse] = useState(0);
  const f = useMemo(() => forward(net, X), [net]);
  const loss = lossOf(f.p);
  const L = hist.length ? hist : [loss];
  const reset = () => { setNet(init); setHist([]); setPulse(0); };
  useEffect(() => { if (step === 0) reset(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [step]);
  const run = (k: number) => { let n = net; const h = [...(hist.length ? hist : [loss])]; for (let i = 0; i < k; i++) { n = stepNet(n); h.push(lossOf(forward(n, X).p)); } setNet(n); setHist(h); setPulse((v) => v + 1); };
  const count = Math.max(0, L.length - 1);
  const top = f.p.indexOf(Math.max(...f.p));

  const IY = [70, 150, 230, 310], CX = 62, NX = 150;
  const HR = Array.from({ length: H }, (_, r) => 70 + r * 50);     // 은닉 뉴런 세로
  const OR = Array.from({ length: K }, (_, r) => 48 + r * 46);     // 출력 뉴런 세로
  const C1 = 255, C2 = 355, OX = 460, BX = 575, BW = 125;
  const GX = 800, GW = 185, GY0 = 150, GH = 180; // 손실 그래프
  const lineW = (w: number) => Math.min(5.5, 0.4 + Math.abs(w) * 3);
  const lineC = (w: number) => (w >= 0 ? ACCENT : MUTED);
  const inW = (j: number, i: number) => net.W1[j].slice(i * D, i * D + D).reduce((s, w) => s + w, 0) / D;
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const wire = { transition: 'stroke-width .6s ease, stroke .6s ease' } as const;
  const segs: { k: string; x1: number; y1: number; x2: number; y2: number; w: number; layer: number }[] = [];
  IY.forEach((iy, i) => HR.forEach((ry, j) => segs.push({ k: `a${i}${j}`, x1: NX + 26, y1: iy, x2: C1 - 14, y2: ry, w: inW(j, i), layer: 0 })));
  HR.forEach((y1, j) => HR.forEach((y2, k) => segs.push({ k: `b${j}${k}`, x1: C1 + 14, y1, x2: C2 - 14, y2, w: net.W2[k][j], layer: 1 })));
  HR.forEach((y1, j) => OR.forEach((y2, k) => segs.push({ k: `c${j}${k}`, x1: C2 + 14, y1, x2: OX - 14, y2, w: net.W3[k][j], layer: 2 })));
  const L0 = L[0];
  const gx = (i: number) => GX + (i / Math.max(L.length - 1, 1)) * GW;
  const gy = (v: number) => GY0 + GH - (v / L0) * GH;

  return (
    <Layout
      figure={
        <Svg>
          {/* 선: 굵기는 가중치 크기, 색은 부호 */}
          {segs.map((s) => <line key={s.k} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={lineC(s.w)} strokeOpacity={0.45} strokeWidth={lineW(s.w)} style={wire} />)}
          {/* 업데이트 순간: 출력 쪽부터 입력 쪽으로 주황 점선이 거꾸로 흐름(역전파) */}
          {pulse > 0 && (
            <g key={pulse}>
              {segs.map((s) => <line key={s.k} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={ORANGE} strokeWidth={3} className="lec-pulse" style={{ animationDelay: `${(2 - s.layer) * 0.22}s` }} />)}
            </g>
          )}

          {/* 입력 단어 → 번호 */}
          {CTX.map((w, i) => (
            <g key={i}>
              <rect x={CX - 44} y={IY[i] - 24} width={88} height={48} rx={10} fill={SURFACE} stroke={MUTED} strokeOpacity={0.5} strokeWidth={2} />
              <text x={CX} y={IY[i] + 9} textAnchor="middle" fill={TEXT} fontSize={24} fontWeight={700}>{w}</text>
              <rect x={NX - 26} y={IY[i] - 16} width={52} height={32} rx={16} fill={ACCENT} />
              <text x={NX} y={IY[i] + 8} textAnchor="middle" fill={BG} fontSize={20} fontWeight={700}>{NG.index.get(w)}</text>
            </g>
          ))}
          <text x={(CX + NX) / 2} y={382} textAnchor="middle" fill={MUTED} fontSize={18}>단어 → 숫자 벡터</text>

          {/* 은닉층 두 개 */}
          {[C1, C2].map((cx, c) => HR.map((y, r) => <circle key={`${c}${r}`} cx={cx} cy={y} r={14} fill={ACCENT_BG} stroke={ACCENT} strokeWidth={2} />))}
          <text x={(C1 + C2) / 2} y={382} textAnchor="middle" fill={MUTED} fontSize={18}>뉴런마다 Σ와 ReLU</text>

          {/* 출력: 칸마다 뉴런 하나 + 확률 막대 + 말뭉치 비율 눈금 */}
          {OUT.map((w, k) => {
            const y = OR[k], isTop = k === top && count > 0, rest = k === K - 1;
            const bw = Math.max(3, f.p[k] * BW);
            return (
              <g key={w}>
                <circle cx={OX} cy={y} r={14} fill={isTop ? ACCENT : ACCENT_BG} stroke={ACCENT} strokeWidth={2} strokeDasharray={rest ? '4 3' : undefined} />
                <text x={OX + 24} y={y + 8} fill={isTop ? ACCENT : rest ? MUTED : TEXT} fontSize={21} fontWeight={700}>{w}</text>
                <rect x={BX} y={y - 12} width={bw} height={24} rx={6} fill={isTop ? ACCENT : ACCENT_BG} style={{ transition: 'width .6s ease' }} />
                <line x1={BX + Q[k] * BW} y1={y - 17} x2={BX + Q[k] * BW} y2={y + 17} stroke={ORANGE} strokeWidth={3} />
                <text x={BX + BW + 12} y={y + 8} fill={isTop ? ACCENT : MUTED} fontSize={20} fontWeight={isTop ? 700 : 500}>{pct(f.p[k])}</text>
              </g>
            );
          })}
          <text x={OX + 120} y={382} textAnchor="middle" fill={MUTED} fontSize={18}>출력: 단어마다 뉴런 하나</text>
          <line x1={BX} y1={400} x2={BX} y2={418} stroke={ORANGE} strokeWidth={3} />
          <text x={BX + 10} y={415} fill={MUTED} fontSize={17}>= 말뭉치 {STORY_CORPUS.length}문장으로 계산한 실제 비율(정답)</text>

          {/* 손실 패널 */}
          <rect x={GX - 22} y={30} width={GW + 44} height={330} rx={16} fill={ORANGE_BG} stroke={ORANGE} strokeOpacity={0.5} strokeWidth={2} />
          <text x={GX - 4} y={66} fill={ORANGE} fontSize={22} fontWeight={700}>손실 L</text>
          <text x={GX + GW + 4} y={72} textAnchor="end" fill={ORANGE} fontSize={48} fontWeight={800}>{loss.toFixed(2)}</text>
          <text x={GX - 4} y={98} fill={MUTED} fontSize={16}>정답 비율과 예측 확률의 차이</text>
          <text x={GX - 4} y={124} fill={TEXT} fontSize={18} fontWeight={700}>업데이트 {count}회</text>
          <line x1={GX} y1={GY0 + GH} x2={GX + GW} y2={GY0 + GH} stroke={MUTED} strokeOpacity={0.5} />
          <line x1={GX} y1={GY0} x2={GX} y2={GY0 + GH} stroke={MUTED} strokeOpacity={0.5} />
          <text x={GX - 6} y={GY0 + GH + 5} textAnchor="end" fill={MUTED} fontSize={14}>0</text>
          {L.length > 1 && <polyline fill="none" stroke={ORANGE} strokeWidth={4} strokeLinejoin="round" points={L.map((v, i) => `${gx(i)},${gy(v)}`).join(' ')} />}
          {L.map((v, i) => <circle key={i} cx={gx(i)} cy={gy(v)} r={i === L.length - 1 ? 7 : 3.5} fill={ORANGE} />)}
          <text x={GX + GW / 2} y={GY0 + GH + 22} textAnchor="middle" fill={MUTED} fontSize={15}>업데이트 횟수 →</text>
        </Svg>
      }
      aside={
        <div onClick={(e) => e.stopPropagation()} className="lec-fade">
          <button type="button" className="btn-primary text-[20px] px-[16px] py-[8px] mb-[8px] w-full justify-center" onClick={() => run(1)}>업데이트 1회</button>
          <button type="button" className="btn-primary text-[20px] px-[16px] py-[8px] mb-[8px] w-full justify-center" onClick={() => run(5)}>업데이트 5회</button>
          <button type="button" className="btn-ghost text-[18px] px-[16px] py-[6px] w-full justify-center" onClick={reset}>처음부터</button>
          <div className="mt-[14px] text-[19px] leading-snug">
            <div><span className="text-muted">1등 단어</span> <span className="font-bold text-accent">{count > 0 ? OUT[top] : '없음(모두 같음)'}</span></div>
            <div><span className="text-muted">학습률 η</span> <span className="font-bold text-text">{ETA}</span></div>
          </div>
          <div className="text-[15px] text-muted mt-[10px] leading-snug">입력 16 → 6 → 6 → 7의 작은 신경망을 실제로 계산함. 주황 점선은 오차가 거꾸로 흐르는 역전파.</div>
        </div>
      }
      lines={[
        step === 0 ? <>학습 전 신경망. 단어마다 점수를 내지만 아직 모든 칸이 <Hot>같은 확률</Hot>. 주황 눈금이 말뭉치의 실제 비율.</> : null,
        step === 1 ? <>손실에서 기울기를 구해 <Key>w와 b를 업데이트</Key>. 반복할수록 손실이 줄고 확률이 눈금에 가까워짐. 0이 되지는 않음.</> : null,
      ]}
    />
  );
};
