import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store';

/**
 * 페이즈 3 — 손실함수와 경사하강법
 *
 * 한 흐름의 다섯 단계로 진행:
 *   1. 데이터  : 여러 점이 있고, 가장 잘 맞는 직선을 찾고 싶다
 *   2. 오차    : 직선과 점 사이의 부호 있는 차이 e = ŷ − y
 *   3. 오차²   : 부호 제거 + 큰 실수 강조
 *   4. 평균(MSE): 한 숫자로 모은 손실함수
 *   5. 경사하강법: 손실 곡선 위에서 기울기 → 갱신 (보폭=학습률은 페이즈 4로)
 *
 * 모든 탭이 같은 데이터셋과 같은 슬라이더(b)를 공유한다 — w는 정답값 2로 고정해
 * b 한 변수만 움직이게 함으로써 손실 곡선을 1차원 포물선으로 깔끔히 그릴 수 있다.
 */

type TabId = 'data' | 'error' | 'square' | 'mse' | 'gd';
const TABS: { id: TabId; num: string; label: string; sub: string }[] = [
  { id: 'data',   num: '1', label: '데이터',       sub: '점 다섯 개 — 가장 잘 맞는 직선을 찾고 싶다' },
  { id: 'error',  num: '2', label: '오차',         sub: '각 점과 직선 사이의 부호 있는 차이 e = ŷ − y' },
  { id: 'square', num: '3', label: '오차 제곱',    sub: '부호 제거 + 큰 실수일수록 더 큰 페널티' },
  { id: 'mse',    num: '4', label: '손실(MSE)',    sub: '오차² 평균 — 한 숫자로 모은 손실함수' },
  { id: 'gd',     num: '5', label: '경사하강법',   sub: '기울기 → 가중치 갱신 (보폭=학습률은 페이즈 4)' },
];

// 데이터 — 정답 직선은 ŷ = 2x + 0.7 (페이즈 4·5와 공유 가능)
const DATA: [number, number][] = [
  [1, 2.7], [2, 4.7], [3, 6.7], [4, 8.7], [5, 10.7],
];
const W_FIXED = 2;          // w는 정답값으로 고정 — 한 변수(b)에 집중
const B_TRUE  = 0.7;
const N = DATA.length;

const predict = (b: number, x: number) => W_FIXED * x + b;
const errors = (b: number) => DATA.map(([x, y]) => predict(b, x) - y);
const mseAt = (b: number) => {
  const es = errors(b);
  return es.reduce((s, e) => s + e * e, 0) / N;
};
const slopeAt = (b: number) => {
  // dMSE/db = (2/N) * Σ(pred − y) — 데이터 5점에서의 기울기
  const es = errors(b);
  return (2 / N) * es.reduce((s, e) => s + e, 0);
};

export function Phase3() {
  const [tab, setTab] = useState<TabId>('data');
  const [b, setB] = useState(0);
  const markCompleted = useApp((s) => s.markCompleted);

  const mse = useMemo(() => mseAt(b), [b]);
  const slope = useMemo(() => slopeAt(b), [b]);
  const errs = useMemo(() => errors(b), [b]);

  useEffect(() => {
    if (mse < 0.05) markCompleted('p3');
  }, [mse, markCompleted]);

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE 3</div>
      <h1>손실함수와 경사하강법의 이해</h1>
      <p className="text-muted mt-2">
        다섯 점에 가장 잘 맞는 직선을 어떻게 찾을까? 다섯 단계로 따라가 봅니다 —
        <strong> 데이터 → 점별 오차 → 오차 제곱 → 평균(MSE) → 경사하강법</strong>.
        모든 탭이 같은 데이터와 같은 슬라이더를 공유하니, 한 흐름으로 보면 돼요.
      </p>

      {/* ── 탭 ───────────────────────────── */}
      <nav className="mt-4 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-sm border-b-2 -mb-px transition ${
                active ? 'border-accent text-accent font-medium'
                       : 'border-transparent text-muted hover:text-text hover:border-border'
              }`}>
              <span className="font-mono text-xs mr-1">{t.num}.</span>{t.label}
            </button>
          );
        })}
      </nav>
      <div className="mt-3 text-xs text-muted">
        <span className="font-mono mr-1">{TABS.find((t) => t.id === tab)!.num}.</span>
        {TABS.find((t) => t.id === tab)!.sub}
      </div>

      {/* ── 그래프 영역 — 탭에 따라 산점도 또는 손실 곡선 ── */}
      <div className="mt-4">
        {tab === 'data' && <ScatterView b={null} errs={[]} mode="data" />}
        {tab === 'error' && <ScatterView b={b} errs={errs} mode="error" />}
        {tab === 'square' && <ScatterView b={b} errs={errs} mode="square" />}
        {(tab === 'mse' || tab === 'gd') && (
          <LossCurveView b={b} mse={mse} slope={slope} showTangent={tab === 'gd'} />
        )}
      </div>

      {/* ── 슬라이더 (데이터 탭 외 모두) ─── */}
      {tab !== 'data' && (
        <div className="mt-4">
          <label className="block">
            <div className="flex justify-between text-sm mb-1">
              <span>편향 b (가중치 w = {W_FIXED}로 고정 — b만 움직여 직선의 높이를 맞춰 보세요)</span>
              <span className="font-mono text-accent">b = {b.toFixed(2)}</span>
            </div>
            <input
              type="range" min={-3} max={4} step={0.05}
              value={b} onChange={(e) => setB(parseFloat(e.target.value))}
              className="w-full"
            />
          </label>
        </div>
      )}

      {/* ── 점별 표 — 모든 탭에서 공유, 탭에 따라 강조 컬럼 변경 ─ */}
      {tab !== 'data' && (
        <PointsTable b={b} highlight={tab} />
      )}

      {/* ── 탭별 설명 ───────────────────── */}
      {tab === 'data' && <DataExplain />}
      {tab === 'error' && <ErrorExplain b={b} errs={errs} />}
      {tab === 'square' && <SquareExplain errs={errs} />}
      {tab === 'mse' && <MseExplain b={b} mse={mse} />}
      {tab === 'gd' && <GdExplain b={b} slope={slope} mse={mse} setB={setB} />}

      {mse < 0.05 && tab !== 'data' && (
        <div className="aside-tip mt-4 text-sm">
          정답 직선에 거의 도달했어요 (정답: w = {W_FIXED}, b = {B_TRUE}). MSE ≈ 0이면 이 데이터에 더 줄일 수 없는 상태예요.
          <strong> 한 번에 얼마나 옮길지(=학습률)</strong>는 다음 페이즈에서 직접 체험합니다.
        </div>
      )}
    </article>
  );
}

/* ─────────────────────────────────────────────────────────
   산점도 뷰 — 데이터/오차/오차² 탭에서 사용
───────────────────────────────────────────────────────── */
function ScatterView({ b, errs, mode }: {
  b: number | null;
  errs: number[];
  mode: 'data' | 'error' | 'square';
}) {
  const W = 540, H = 280, padL = 36, padR = 14, padT = 14, padB = 30;
  const xMin = 0, xMax = 6, yMin = 0, yMax = 13;
  const sx = (x: number) => padL + ((x - xMin) / (xMax - xMin)) * (W - padL - padR);
  const sy = (y: number) => H - padB - ((y - yMin) / (yMax - yMin)) * (H - padT - padB);

  return (
    <div className="card p-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* 격자 */}
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="rgb(var(--color-border))" />
        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="rgb(var(--color-border))" />
        {[1, 2, 3, 4, 5].map((x) => (
          <text key={x} x={sx(x)} y={H - padB + 16} textAnchor="middle"
                fontSize={10} fill="rgb(var(--color-muted))">{x}</text>
        ))}
        {[2, 4, 6, 8, 10, 12].map((y) => (
          <text key={y} x={padL - 6} y={sy(y) + 3} textAnchor="end"
                fontSize={10} fill="rgb(var(--color-muted))">{y}</text>
        ))}
        <text x={W - padR - 4} y={H - padB - 4} textAnchor="end" fontSize={10} fill="rgb(var(--color-muted))">x</text>
        <text x={padL + 4} y={padT + 10} fontSize={10} fill="rgb(var(--color-muted))">y</text>

        {/* 직선 (오차/제곱 탭) */}
        {b !== null && (
          <line
            x1={sx(xMin)} y1={sy(predict(b, xMin))}
            x2={sx(xMax)} y2={sy(predict(b, xMax))}
            stroke="rgb(var(--color-accent))" strokeWidth={2} />
        )}

        {/* 데이터 점 + 오차/제곱 시각화 */}
        {DATA.map(([x, y], i) => {
          const px = sx(x), py = sy(y);
          if (b === null) {
            return <circle key={x} cx={px} cy={py} r={5} fill="rgb(var(--color-text))" />;
          }
          const yhat = predict(b, x);
          const lineY = sy(yhat);
          const e = errs[i];
          if (mode === 'error') {
            return (
              <g key={x}>
                <line x1={px} y1={lineY} x2={px} y2={py}
                  stroke="rgb(251,146,60)" strokeWidth={2.5} opacity={0.9} />
                <circle cx={px} cy={py} r={4.5} fill="rgb(var(--color-text))" />
                <text x={px + 7} y={(lineY + py) / 2 + 3} fontSize={10}
                  fill="rgb(251,146,60)" fontWeight={700}>
                  {e >= 0 ? '+' : ''}{e.toFixed(2)}
                </text>
              </g>
            );
          }
          // square mode — 오차²를 정사각형 면적으로 표현
          const sq = e * e;
          // 화면 단위 길이 (1 단위 = sx(1)-sx(0)와 sy(0)-sy(1)의 평균)
          const unit = (sx(1) - sx(0) + sy(0) - sy(1)) / 2;
          const side = Math.abs(e) * unit;
          const sqX = e >= 0 ? px : px - side; // 오차 부호에 따라 사각형이 점 좌/우로 펼쳐짐
          const sqY = e >= 0 ? lineY : py;     // 사각형은 점과 직선 사이에 걸침
          return (
            <g key={x}>
              <rect x={sqX} y={sqY} width={side} height={side}
                fill="rgb(251,146,60)" fillOpacity={0.18}
                stroke="rgb(251,146,60)" strokeWidth={1.2} />
              <line x1={px} y1={lineY} x2={px} y2={py}
                stroke="rgb(251,146,60)" strokeWidth={1.5} opacity={0.7} strokeDasharray="3 3" />
              <circle cx={px} cy={py} r={4.5} fill="rgb(var(--color-text))" />
              <text x={sqX + side / 2} y={sqY + side / 2 + 3} textAnchor="middle"
                fontSize={10} fill="rgb(251,146,60)" fontWeight={700}>
                {sq.toFixed(2)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="text-[11px] text-muted px-2 pb-2">
        {b === null ? '검은 점 = 데이터 (x, y)' : (
          <>
            검은 점 = 데이터, 보라 직선 = 현재 모델 ŷ = {W_FIXED}x + {b.toFixed(2)},
            {' '}주황 = {mode === 'error' ? '점별 부호 있는 오차' : '오차²(정사각형 면적)'}.
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   손실 곡선 뷰 — MSE / GD 탭에서 사용
───────────────────────────────────────────────────────── */
function LossCurveView({ b, mse, slope, showTangent }: {
  b: number; mse: number; slope: number; showTangent: boolean;
}) {
  const W = 540, H = 280, padL = 40, padR = 14, padT = 14, padB = 30;
  const bMin = -3, bMax = 4;
  // 손실 최댓값 — bMin과 bMax 중 더 큰 손실
  const lMax = Math.max(mseAt(bMin), mseAt(bMax)) * 1.05;
  const sx = (bv: number) => padL + ((bv - bMin) / (bMax - bMin)) * (W - padL - padR);
  const sy = (lv: number) => H - padB - (lv / lMax) * (H - padT - padB);

  // 곡선
  const path = (() => {
    const parts: string[] = [];
    for (let bv = bMin; bv <= bMax; bv += 0.05) {
      parts.push(`${parts.length === 0 ? 'M' : 'L'}${sx(bv)},${sy(mseAt(bv))}`);
    }
    return parts.join(' ');
  })();

  // 접선 (gd 탭)
  const tanLen = 1.0;
  const tanY = (bv: number) => mse + slope * (bv - b);
  const t1 = b - tanLen, t2 = b + tanLen;

  return (
    <div className="card p-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
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

        {/* 곡선 */}
        <path d={path} fill="none" stroke="rgb(var(--color-accent))" strokeWidth={2} />

        {/* 접선 */}
        {showTangent && Math.abs(slope) > 0.01 && (
          <line
            x1={sx(t1)} y1={sy(Math.max(0, tanY(t1)))}
            x2={sx(t2)} y2={sy(Math.max(0, tanY(t2)))}
            stroke="rgb(251,146,60)" strokeWidth={2} opacity={0.85} />
        )}

        {/* 현재 점 */}
        <circle cx={sx(b)} cy={sy(mse)} r={6.5}
          fill="rgb(var(--color-accent))" stroke="white" strokeWidth={2} />
        <text x={sx(b) + 10} y={sy(mse) - 8} fontSize={11} fill="rgb(var(--color-text))">
          b = {b.toFixed(2)}, MSE = {mse.toFixed(2)}
        </text>
      </svg>
      <div className="text-[11px] text-muted px-2 pb-2">
        가로축 = 편향 b의 후보값, 세로축 = 그 b로 만든 직선의 평균 손실(MSE).
        {showTangent && ' 주황색 = 현재 점에서의 접선(기울기).'}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   점별 표 — 탭마다 강조 컬럼이 다름
───────────────────────────────────────────────────────── */
function PointsTable({ b, highlight }: { b: number; highlight: TabId }) {
  return (
    <div className="card p-3 mt-4 overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead className="text-muted">
          <tr>
            <th className="text-left py-1">x</th>
            <th>y (실제)</th>
            <th>ŷ = {W_FIXED}x + b</th>
            <th className={highlight === 'error' ? 'text-accent' : ''}>오차 e = ŷ − y</th>
            <th className={highlight === 'square' ? 'text-accent' : ''}>오차² (e²)</th>
          </tr>
        </thead>
        <tbody>
          {DATA.map(([x, y]) => {
            const yhat = predict(b, x);
            const e = yhat - y;
            return (
              <tr key={x} className="border-t border-border">
                <td className="py-1">{x}</td>
                <td className="text-center">{y.toFixed(1)}</td>
                <td className="text-center text-muted">{yhat.toFixed(2)}</td>
                <td className={`text-center ${highlight === 'error' ? 'text-accent font-semibold' : ''}`}>
                  {e >= 0 ? '+' : ''}{e.toFixed(2)}
                </td>
                <td className={`text-center ${highlight === 'square' ? 'text-accent font-semibold' : 'text-muted'}`}>
                  {(e * e).toFixed(2)}
                </td>
              </tr>
            );
          })}
          {(highlight === 'mse' || highlight === 'gd') && (
            <tr className="border-t border-accent/40 bg-accent/5">
              <td colSpan={4} className="py-1 text-right text-accent">평균 (MSE) = (오차² 합) ÷ {N} =</td>
              <td className="text-center text-accent font-bold">{mseAt(b).toFixed(3)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   탭별 설명 박스
───────────────────────────────────────────────────────── */
function DataExplain() {
  return (
    <div className="aside-tip mt-4">
      <div className="font-medium">1. 데이터 — 다섯 점에 가장 잘 맞는 직선?</div>
      <p className="text-sm mt-2 text-muted">
        다섯 개의 점이 있어요. 이 점들을 가장 잘 설명하는 <strong>직선 한 개</strong>를 찾는 게 목표입니다.
        직선은 두 숫자 <code>w</code>(기울기)와 <code>b</code>(높이)로 정해져요 — <code>ŷ = w · x + b</code>.
      </p>
      <ul className="text-sm mt-2 space-y-1 list-disc pl-5 text-muted">
        <li>여기서는 <code>w = {W_FIXED}</code>로 <strong>고정</strong>하고, 직선의 높이 <code>b</code> 한 가지만 움직여 봅니다.</li>
        <li>그래야 "가장 잘 맞다"의 의미를 한 변수의 곡선으로 깔끔히 그릴 수 있어요(다음 탭부터).</li>
        <li>그런데 "잘 맞다"는 어떻게 측정할까? — <strong>다음 탭으로</strong>.</li>
      </ul>
    </div>
  );
}

function ErrorExplain({ b, errs }: { b: number; errs: number[] }) {
  const sumE = errs.reduce((s, e) => s + e, 0);
  return (
    <div className="aside-tip mt-4">
      <div className="font-medium">2. 오차 — 점 하나마다 직선까지의 부호 있는 차이</div>
      <p className="text-sm mt-2 text-muted">
        한 점의 오차는 <code>e = 예측 ŷ − 실제 y</code>. 점이 직선 위에 있으면 +, 아래면 −.
        주황색 세로 막대 길이가 그 점의 오차 크기, 부호는 +/− 표시로 보여요.
      </p>
      <div className="card p-3 mt-2 font-mono text-sm">
        <div>다섯 점의 오차 합 = {sumE.toFixed(2)}
          <span className="text-muted ml-2 text-xs not-italic" style={{ fontFamily: 'system-ui' }}>
            (b = {b.toFixed(2)}일 때)
          </span>
        </div>
        <div className="text-xs text-muted mt-1.5 not-italic" style={{ fontFamily: 'system-ui' }}>
          그런데 합을 그대로 쓰면 <strong>+오차와 −오차가 상쇄</strong>되어, 직선이 점들 가운데를 지날 때만 합이 0에 가까워져요.
          → "어긋남이 큰지 작은지"의 정보가 사라져요. 그래서 다음 탭에서 <strong>제곱</strong>합니다.
        </div>
      </div>
    </div>
  );
}

function SquareExplain({ errs }: { errs: number[] }) {
  return (
    <div className="aside-tip mt-4">
      <div className="font-medium">3. 오차 제곱 — 부호를 없애고 큰 실수에 더 큰 페널티</div>
      <p className="text-sm mt-2 text-muted">
        각 오차에 자기 자신을 곱하면(<code>e² = e × e</code>) 부호가 사라지고, <strong>큰 오차일수록 훨씬 큰 값</strong>이 됩니다.
        그림에서는 정사각형의 <strong>면적</strong>이 곧 e²예요 — 한 변의 길이가 |e|니까요.
      </p>
      <ul className="text-sm mt-2 space-y-1 list-disc pl-5 text-muted">
        <li>오차 ±1 → e² = 1. 오차 ±2 → e² = 4. <strong>2배가 4배</strong>가 됩니다.</li>
        <li>주황 사각형들을 보세요 — 큰 오차의 사각형이 작은 오차의 사각형보다 훨씬 더 넓죠?</li>
        <li>다섯 사각형의 면적을 모두 더하면 <strong>{errs.reduce((s, e) => s + e * e, 0).toFixed(2)}</strong>. 이걸 한 숫자로 묶으면 다음 단계.</li>
      </ul>
    </div>
  );
}

function MseExplain({ b, mse }: { b: number; mse: number }) {
  return (
    <div className="aside-tip mt-4">
      <div className="font-medium">4. 평균 제곱 오차 (MSE) — 한 숫자로 모은 손실함수</div>
      <p className="text-sm mt-2 text-muted">
        다섯 사각형 면적의 <strong>평균</strong>이 이 모델의 손실입니다. 식은 단순 — <code>MSE = (e₁² + ⋯ + e₅²) ÷ 5</code>.
      </p>
      <div className="card p-3 mt-2 font-mono text-sm">
        <div>지금 b = {b.toFixed(2)} → MSE = <span className="text-accent font-bold">{mse.toFixed(3)}</span></div>
        <div className="text-xs text-muted mt-2 not-italic" style={{ fontFamily: 'system-ui' }}>
          이 한 숫자가 <strong>"이 모델이 얼마나 틀렸는지"</strong>의 종합 점수예요.
          위 그래프는 b를 좌우로 움직였을 때 MSE가 그리는 곡선 — 정답 b={B_TRUE} 근처에서 최저가 됩니다.
          학습 = 이 곡선의 <strong>가장 낮은 곳</strong>을 찾는 일.
        </div>
      </div>
    </div>
  );
}

function GdExplain({ b, slope, mse, setB }: {
  b: number; slope: number; mse: number; setB: (v: number) => void;
}) {
  // 기울기 반대 방향으로 한 step (학습률 0.1 가정 — 페이즈 4에서 이 값을 직접 다룸)
  const lrFixed = 0.1;
  const stepOnce = () => setB(b - lrFixed * slope);

  return (
    <div className="aside-tip mt-4">
      <div className="font-medium">5. 경사하강법 — 기울기로 b를 옮긴다</div>
      <p className="text-sm mt-2 text-muted">
        손실 곡선이 매끄러운 포물선이 됐으니, 한 점에서의 <strong>기울기</strong>(주황 접선)를 보면 어느 쪽이 내리막인지 알 수 있어요.
        기울기가 +면 왼쪽으로, −면 오른쪽으로, 그 <strong>반대 방향</strong>으로 옮기면 MSE가 줄어듭니다.
      </p>
      <ul className="text-sm mt-2 space-y-1 list-disc pl-5 text-muted">
        <li>지금 기울기 = <strong className="font-mono">{slope.toFixed(2)}</strong>, MSE = <strong className="font-mono">{mse.toFixed(3)}</strong></li>
        <li>갱신 규칙: <code>새 b = b − (보폭) × 기울기</code></li>
        <li>"한 번에 얼마나 옮길지(=보폭)"가 바로 <strong>학습률</strong>이에요. <strong>너무 크면 정답을 지나치고, 너무 작으면 너무 느립니다</strong> — 다음 페이즈에서 직접 체험.</li>
      </ul>
      <div className="flex flex-wrap gap-2 mt-3">
        <button onClick={stepOnce} disabled={Math.abs(slope) < 0.005}
          className="btn-primary text-sm py-1.5 px-3 disabled:opacity-50">
          한 step 내려가기 (보폭 = {lrFixed} 가정)
        </button>
        <button onClick={() => setB(0)} className="btn-ghost text-sm py-1.5 px-3">b 초기화 (b=0)</button>
      </div>
      <p className="text-[11px] text-muted mt-2">
        ※ 지금은 보폭을 0.1로 고정했어요. 같은 곡선·같은 점에서 보폭만 다르게 줘 보면 학습이 어떻게 달라지는지 — 페이즈 4의 주제입니다.
      </p>
    </div>
  );
}
