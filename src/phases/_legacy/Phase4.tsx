import { useEffect, useState } from 'react';
import { useApp } from '../store';

/**
 * 페이즈 4 — 학습률(보폭)의 이해
 *
 * 페이즈 3에서 만든 "다섯 점 + 손실 곡선"을 그대로 가져와
 * 같은 점을 다른 학습률로 굴려보는 비교 체험장.
 *
 * 네 가지 학습률(η = 1.2 / 1.0 / 0.1 / 0.01)을 동시에 진행해 한 화면에서:
 *   - 1.2: 진동하며 진폭이 매 step 1.4배씩 커지는 발산
 *   - 1.0: 정확히 진동 경계 (한 step에 정답을 지나친 뒤 다시 원위치 왕복)
 *   - 0.1: 빠르게 안전 수렴
 *   - 0.01: 같은 식으로 수렴은 하지만 답답하게 느림
 * 을 직접 비교한다.
 *
 * 안정 조건은 |1 − η·(d²L/db²)| < 1 → 이 곡선(d²L/db²=2)에선 0 < η < 1.
 *
 * 데이터·식·축은 페이즈 3과 동일 (w = 2 고정, b만 학습).
 */

const DATA: [number, number][] = [
  [1, 2.7], [2, 4.7], [3, 6.7], [4, 8.7], [5, 10.7],
];
const W_FIXED = 2;
const B_TRUE = 0.7;
const N = DATA.length;

const mseAt = (b: number) =>
  DATA.reduce((s, [x, y]) => {
    const e = (W_FIXED * x + b) - y;
    return s + e * e;
  }, 0) / N;

// dMSE/db = (2/N) Σ(pred − y)
const slopeAt = (b: number) =>
  (2 / N) * DATA.reduce((s, [x, y]) => s + ((W_FIXED * x + b) - y), 0);

type Runner = {
  id: 'diverge' | 'big' | 'mid' | 'small';
  label: string;
  lr: number;
  color: string;
  b: number;
  history: { b: number; mse: number }[];
};

const initRunner = (id: Runner['id'], lr: number, color: string, label: string, startB = -2): Runner => ({
  id, lr, color, label, b: startB,
  history: [{ b: startB, mse: mseAt(startB) }],
});

export function Phase4() {
  const markCompleted = useApp((s) => s.markCompleted);

  // 색은 위험도 순으로 — 발산 빨강, 진동 주황, 적당 초록, 느림 파랑.
  const [runners, setRunners] = useState<Runner[]>(() => [
    initRunner('diverge', 1.2, 'rgb(239,68,68)',   '발산 η = 1.2'),
    initRunner('big',     1.0, 'rgb(251,146,60)',  '진동 η = 1.0'),
    initRunner('mid',     0.1, 'rgb(34,197,94)',   '적당 η = 0.1'),
    initRunner('small',   0.01, 'rgb(96,165,250)', '느림 η = 0.01'),
  ]);
  const [steps, setSteps] = useState(0);

  // 어느 한 모델이라도 정답 근처에 도달하면 완료
  useEffect(() => {
    if (runners.some((r) => mseAt(r.b) < 0.05)) markCompleted('p4');
  }, [runners, markCompleted]);

  const advance = (n: number) => {
    setRunners((prev) => prev.map((r) => {
      let bv = r.b;
      const newHist: { b: number; mse: number }[] = [];
      for (let i = 0; i < n; i++) {
        const g = slopeAt(bv);
        const next = bv - r.lr * g;
        // 발산 가드: |b| > 50을 넘어가면 발산으로 간주하고 멈춤(시각화 보호)
        if (!isFinite(next) || Math.abs(next) > 50) {
          newHist.push({ b: bv, mse: mseAt(bv) });
          break;
        }
        bv = next;
        newHist.push({ b: bv, mse: mseAt(bv) });
      }
      return { ...r, b: bv, history: [...r.history, ...newHist] };
    }));
    setSteps((s) => s + n);
  };

  const reset = () => {
    setRunners((prev) => prev.map((r) => initRunner(r.id, r.lr, r.color, r.label)));
    setSteps(0);
  };

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE 4</div>
      <h1>학습률의 이해</h1>
      <p className="text-muted mt-2">
        페이즈 3에서 만든 그 손실 곡선이에요. 같은 점을 <strong>네 가지 보폭</strong>으로 굴려 봅니다 —
        <span className="font-mono"> η = 1.2 / 1.0 / 0.1 / 0.01</span>. 보폭에 따라 발산하거나·정답을 지나치거나·빠르게 도달하거나·답답하게 느린 모습이 한 화면에 보여요.
      </p>

      <div className="aside-tip mt-3 text-sm">
        <div className="font-medium">한 step에 일어나는 일 (페이즈 3·5와 동일 식)</div>
        <div className="font-mono mt-1">새 b = b − η × (손실의 b에 대한 기울기)</div>
        <p className="text-xs text-muted mt-1">
          기울기는 곡선이 결정 — 우리가 바꾸는 건 오직 <strong>η(=보폭)</strong> 한 가지.
          같은 곡선·같은 출발점·같은 식, 보폭만 다르게 줘도 결과가 이렇게 다릅니다.
        </p>
      </div>

      {/* ── 메인 시각화 — 손실 곡선 위 세 점 ───────────── */}
      <LossCurveCompare runners={runners} steps={steps} />

      {/* ── 컨트롤 ──────────────────────────────────────── */}
      <div className="card p-3 mt-4 sticky bottom-2 z-20 bg-bg/85 backdrop-blur-md">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted mr-2">진행:</span>
          <button onClick={() => advance(1)} className="btn-primary text-sm py-1.5 px-3">+1 step</button>
          <button onClick={() => advance(10)} className="btn-ghost text-sm py-1.5 px-3">+10</button>
          <button onClick={() => advance(50)} className="btn-ghost text-sm py-1.5 px-3">+50</button>
          <button onClick={reset} className="btn-ghost text-sm py-1.5 px-3 ml-auto">초기화</button>
          <span className="text-xs text-muted ml-2 font-mono">총 {steps} step</span>
        </div>
      </div>

      {/* ── 네 모델 현재 상태 ───────────────────────────── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        {runners.map((r) => {
          const mse = mseAt(r.b);
          const reached = mse < 0.05;
          const diverged = Math.abs(r.b) >= 50;
          const overshooting = !reached && !diverged && r.history.length >= 4 && oscillating(r.history.slice(-4).map((h) => h.b));
          return (
            <div key={r.id} className="card p-3" style={{ borderColor: r.color }}>
              <div className="text-sm font-medium" style={{ color: r.color }}>{r.label}</div>
              <div className="font-mono text-xs mt-2 space-y-0.5">
                <div>현재 b = {r.b.toFixed(3)}</div>
                <div>MSE = <span className="font-bold" style={{ color: r.color }}>{mse.toFixed(3)}</span></div>
                <div className="text-muted">정답까지: {Math.abs(r.b - B_TRUE).toFixed(3)}</div>
              </div>
              <div className="text-xs mt-2">
                {reached && <span className="text-accent font-medium">✓ 정답 도달</span>}
                {diverged && <span className="text-red-500 font-medium">✗ 발산 (보폭이 너무 큼)</span>}
                {overshooting && !diverged && (
                  <span className="text-amber-500 font-medium">⚠ 정답 근처에서 진동 중</span>
                )}
                {!reached && !diverged && !overshooting && (
                  <span className="text-muted">진행 중…</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 정리 ────────────────────────────────────────── */}
      <div className="aside-note mt-6 text-sm">
        <div className="font-medium">정리 — 학습률 4단 비교</div>
        <ul className="mt-2 list-disc pl-5 space-y-1 text-muted">
          <li><strong>η = 1.2 (발산)</strong>: 매 step마다 부호가 뒤집히며 진폭이 1.4배씩 커짐 — 곡선 밖으로 튕겨나가요.</li>
          <li><strong>η = 1.0 (진동 경계)</strong>: 한 step에 정답을 정확히 지나쳐 다시 원위치로 — 영원히 왕복하며 손실이 안 줄어요.</li>
          <li><strong>η = 0.1 (적당)</strong>: 매 step마다 손실이 줄어 빠르게 정답에 도달.</li>
          <li><strong>η = 0.01 (느림)</strong>: 안전하지만 답답하게 느림 — 같은 정답에 도달하는 데 step이 훨씬 많이 필요.</li>
        </ul>
        <p className="text-xs text-muted mt-2 leading-relaxed">
          이 곡선의 안정 조건은 <code>0 &lt; η &lt; 1</code>이에요(곡률 d²L/db² = 2).
          실제 학습에서는 곡률이 데이터·모델마다 다르니 "딱 맞는 보폭"도 매번 다르게 잡아야 합니다 —
          학습률 튜닝이 학습의 핵심 작업인 이유예요.
        </p>
      </div>
    </article>
  );
}

// 직전 4개 b 값이 정답을 사이에 두고 부호가 바뀌면 진동으로 판정
function oscillating(bs: number[]): boolean {
  if (bs.length < 4) return false;
  const signs = bs.map((b) => Math.sign(b - B_TRUE));
  return signs[0] !== signs[1] && signs[1] !== signs[2] && signs[2] !== signs[3];
}

/* ─────────────────────────────────────────────────────────
   손실 곡선 위에서 세 점이 동시에 굴러내려오는 시각화
───────────────────────────────────────────────────────── */
function LossCurveCompare({ runners }: { runners: Runner[]; steps: number }) {
  const W = 720, H = 320, padL = 44, padR = 14, padT = 14, padB = 32;
  const bMin = -3, bMax = 4;
  const lMax = Math.max(mseAt(bMin), mseAt(bMax)) * 1.05;

  const sx = (bv: number) => padL + ((bv - bMin) / (bMax - bMin)) * (W - padL - padR);
  const sy = (lv: number) => H - padB - (Math.min(lv, lMax) / lMax) * (H - padT - padB);

  // 손실 곡선
  const curve = (() => {
    const parts: string[] = [];
    for (let bv = bMin; bv <= bMax; bv += 0.05) {
      parts.push(`${parts.length === 0 ? 'M' : 'L'}${sx(bv)},${sy(mseAt(bv))}`);
    }
    return parts.join(' ');
  })();

  return (
    <div className="card p-2 mt-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* axes */}
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="rgb(var(--color-border))" />
        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="rgb(var(--color-border))" />
        {[-2, -1, 0, 1, 2, 3, 4].map((bv) => (
          <text key={bv} x={sx(bv)} y={H - padB + 16} textAnchor="middle"
            fontSize={10} fill="rgb(var(--color-muted))">{bv}</text>
        ))}
        <text x={W - padR - 4} y={H - padB - 4} textAnchor="end" fontSize={10} fill="rgb(var(--color-muted))">b</text>
        <text x={padL + 4} y={padT + 10} fontSize={10} fill="rgb(var(--color-muted))">MSE</text>

        {/* 정답 b 수직선 */}
        <line x1={sx(B_TRUE)} y1={padT} x2={sx(B_TRUE)} y2={H - padB}
          stroke="rgb(var(--color-muted))" strokeDasharray="3 3" opacity={0.7} />
        <text x={sx(B_TRUE) + 4} y={padT + 10} fontSize={10} fill="rgb(var(--color-muted))">b={B_TRUE} (최저)</text>

        {/* 손실 곡선 */}
        <path d={curve} fill="none" stroke="rgb(var(--color-accent))" strokeWidth={2} opacity={0.8} />

        {/* 각 runner의 자취 */}
        {runners.map((r) => {
          // 자취는 마지막 30개 step만 표시 (가독성)
          const recent = r.history.slice(-30);
          const trail = recent.map((h, i) => {
            const cx = sx(Math.max(bMin, Math.min(bMax, h.b)));
            const cy = sy(h.mse);
            return `${i === 0 ? 'M' : 'L'}${cx},${cy}`;
          }).join(' ');
          const last = r.history[r.history.length - 1];
          const lastCx = sx(Math.max(bMin, Math.min(bMax, last.b)));
          const lastCy = sy(last.mse);
          const inBound = last.b >= bMin && last.b <= bMax;
          return (
            <g key={r.id}>
              <path d={trail} fill="none" stroke={r.color} strokeWidth={1.4} opacity={0.5} strokeDasharray="2 2" />
              {recent.map((h, i) => {
                const isLast = i === recent.length - 1;
                if (isLast) return null;
                const cx = sx(Math.max(bMin, Math.min(bMax, h.b)));
                const cy = sy(h.mse);
                return <circle key={i} cx={cx} cy={cy} r={2} fill={r.color} opacity={0.45} />;
              })}
              {/* 현재 위치 — 곡선을 벗어나면 화면 가장자리 화살표 */}
              {inBound ? (
                <circle cx={lastCx} cy={lastCy} r={6.5}
                  fill={r.color} stroke="white" strokeWidth={2} />
              ) : (
                <g>
                  <polygon
                    points={last.b > bMax
                      ? `${W - padR - 4},${padT + 8} ${W - padR - 14},${padT + 2} ${W - padR - 14},${padT + 14}`
                      : `${padL + 4},${padT + 8} ${padL + 14},${padT + 2} ${padL + 14},${padT + 14}`}
                    fill={r.color} />
                  <text x={last.b > bMax ? W - padR - 18 : padL + 18}
                    y={padT + 12} fontSize={10}
                    textAnchor={last.b > bMax ? 'end' : 'start'} fill={r.color}>발산!</text>
                </g>
              )}
            </g>
          );
        })}

        {/* 범례 */}
        <g transform={`translate(${W - 200}, ${padT + 6})`}>
          <rect x={0} y={0} width={186} height={66} rx={4}
            fill="rgb(var(--color-bg))" stroke="rgb(var(--color-border))" />
          {runners.map((r, i) => (
            <g key={r.id} transform={`translate(8, ${14 + i * 18})`}>
              <circle cx={6} cy={0} r={5} fill={r.color} />
              <text x={18} y={4} fontSize={11} fill="rgb(var(--color-text))">{r.label}</text>
            </g>
          ))}
        </g>
      </svg>
      <div className="text-[11px] text-muted px-2 pb-2">
        세 점이 같은 손실 곡선 위에서 출발(b = −2)해 매 step마다 자기 보폭만큼 내려가요.
        점선 자취는 최근 30 step.
      </div>
    </div>
  );
}
