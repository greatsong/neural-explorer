import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store';

/**
 * 페이즈 3 — 손실함수와 경사하강법
 *
 * 한 흐름의 다섯 단계:
 *   1. 데이터  : 여러 점(노이즈 포함), 가장 잘 맞는 직선을 찾고 싶다
 *   2. 오차    : 직선과 점 사이의 부호 있는 차이 e = ŷ − y (w, b 모두 슬라이더)
 *   3. 오차²   : 부호 제거 + 큰 실수 강조 (w=2 고정)
 *   4. 평균(MSE): 한 숫자로 모은 손실함수
 *   5. 경사하강법: 손실 곡선 위에서 기울기 → 갱신
 */

type TabId = 'data' | 'error' | 'square' | 'mse' | 'gd';
const TABS: { id: TabId; num: string; label: string; sub: string }[] = [
  { id: 'data',   num: '1', label: '데이터',       sub: '점 다섯 개 — 가장 잘 맞는 직선을 찾고 싶다' },
  { id: 'error',  num: '2', label: '오차',         sub: '각 점과 직선 사이의 부호 있는 차이 e = ŷ − y' },
  { id: 'square', num: '3', label: '오차 제곱',    sub: '부호 제거 + 큰 실수일수록 더 큰 페널티' },
  { id: 'mse',    num: '4', label: '손실(MSE)',    sub: '오차² 평균 — 한 숫자로 모은 손실함수' },
  { id: 'gd',     num: '5', label: '경사하강법',   sub: '기울기 → 가중치 갱신 (보폭=학습률은 페이즈 4)' },
];

// 데이터 — 실제 데이터처럼 노이즈가 있는 다섯 점 (대략 y ≈ 2x + 0.8 방향)
const DATA: [number, number][] = [
  [1, 2.5], [2, 5.1], [3, 6.8], [4, 8.5], [5, 10.9],
];
const W_FIXED = 2;   // 탭3~5(오차²·MSE·GD)에서 w를 고정해 1차원 손실 곡선을 그림
const N = DATA.length;

// 탭4-5용 손실 함수: w=W_FIXED 고정, b만 변수
const predict = (b: number, x: number) => W_FIXED * x + b;
const errors = (b: number) => DATA.map(([x, y]) => predict(b, x) - y);
const mseAt = (b: number) => errors(b).reduce((s, e) => s + e * e, 0) / N;
const slopeAt = (b: number) => (2 / N) * errors(b).reduce((s, e) => s + e, 0);

// w=W_FIXED 고정 시 최적 b (= mean(y − W_FIXED·x))
const B_OPT = +(DATA.reduce((s, [x, y]) => s + (y - W_FIXED * x), 0) / N).toFixed(2);

// 오차/오차² 탭: w, b 모두 자유
const predictWith = (w: number, b: number, x: number) => w * x + b;
const errorsWithW = (w: number, b: number) => DATA.map(([x, y]) => predictWith(w, b, x) - y);

export function Phase3() {
  const [tab, setTab] = useState<TabId>('data');
  const [b, setB] = useState(0);
  const [w, setW] = useState<number>(W_FIXED);
  const markCompleted = useApp((s) => s.markCompleted);

  // 탭4-5용 (w=W_FIXED 고정)
  const mse = useMemo(() => mseAt(b), [b]);
  const slope = useMemo(() => slopeAt(b), [b]);
  // 오차 탭용 (w 자유)
  const errs = useMemo(() => errorsWithW(w, b), [w, b]);

  useEffect(() => {
    if (mse < 0.15) markCompleted('p3');
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

      {/* ── 그래프 영역 ── */}
      <div className="mt-4">
        {tab === 'data' && <ScatterView w={W_FIXED} b={null} errs={[]} mode="data" />}
        {tab === 'error' && <ScatterView w={w} b={b} errs={errs} mode="error" />}
        {tab === 'square' && <ScatterView w={W_FIXED} b={b} errs={errors(b)} mode="square" />}
        {(tab === 'mse' || tab === 'gd') && (
          <LossCurveView b={b} mse={mse} slope={slope} showTangent={tab === 'gd'} />
        )}
      </div>

      {/* ── 슬라이더 ─── */}
      {tab === 'error' && (
        <div className="mt-4 grid sm:grid-cols-2 gap-4">
          <label className="block">
            <div className="flex justify-between text-sm mb-1">
              <span>가중치 w (기울기)</span>
              <span className="font-mono text-accent">w = {w.toFixed(1)}</span>
            </div>
            <input
              type="range" min={0} max={4} step={0.1}
              value={w} onChange={(e) => setW(parseFloat(e.target.value))}
              className="w-full"
            />
          </label>
          <label className="block">
            <div className="flex justify-between text-sm mb-1">
              <span>편향 b (높이 조절)</span>
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
      {(tab === 'square' || tab === 'mse' || tab === 'gd') && (
        <div className="mt-4">
          <label className="block">
            <div className="flex justify-between text-sm mb-1">
              <span>편향 b &nbsp;<span className="text-muted text-xs">(가중치 w = {W_FIXED}로 고정 — b만 움직여 보세요)</span></span>
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

      {/* ── 점별 표 ─ */}
      {tab !== 'data' && (
        <PointsTable
          w={tab === 'error' ? w : W_FIXED}
          b={b}
          highlight={tab}
        />
      )}

      {/* ── 탭별 설명 ───────────────────── */}
      {tab === 'data' && <DataExplain />}
      {tab === 'error' && <ErrorExplain w={w} b={b} errs={errs} />}
      {tab === 'square' && <SquareExplain errs={errors(b)} />}
      {tab === 'mse' && <MseExplain b={b} mse={mse} />}
      {tab === 'gd' && <GdExplain b={b} slope={slope} mse={mse} setB={setB} />}

      {mse < 0.15 && tab !== 'data' && (
        <div className="aside-tip mt-4 text-sm">
          좋아요! w = {W_FIXED} 고정 시 최적 b ≈ {B_OPT} 근처에서 MSE가 거의 최저가 됩니다.
          <strong> 한 번에 얼마나 옮길지(=학습률)</strong>는 다음 페이즈에서 직접 체험합니다.
        </div>
      )}
    </article>
  );
}

/* ─────────────────────────────────────────────────────────
   산점도 뷰 — 데이터/오차/오차² 탭에서 사용
───────────────────────────────────────────────────────── */
function ScatterView({ w, b, errs, mode }: {
  w: number;
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
            x1={sx(xMin)} y1={sy(predictWith(w, b, xMin))}
            x2={sx(xMax)} y2={sy(predictWith(w, b, xMax))}
            stroke="rgb(var(--color-accent))" strokeWidth={2} />
        )}

        {/* 데이터 점 + 오차/제곱 시각화 */}
        {DATA.map(([x, y], i) => {
          const px = sx(x), py = sy(y);
          if (b === null) {
            return <circle key={x} cx={px} cy={py} r={5} fill="rgb(var(--color-text))" />;
          }
          const yhat = predictWith(w, b, x);
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
          // square mode — 사각형 면적이 아니라 오차 제곱값을 그대로 보여줍니다
          const sq = e * e;
          return (
            <g key={x}>
              <line x1={px} y1={lineY} x2={px} y2={py}
                stroke="rgb(251,146,60)" strokeWidth={2} opacity={0.85} />
              <circle cx={px} cy={py} r={4.5} fill="rgb(var(--color-text))" />
              <text x={px + 7} y={(lineY + py) / 2 - 2} fontSize={10}
                fill="rgb(251,146,60)" opacity={0.85}>
                e = {e >= 0 ? '+' : ''}{e.toFixed(2)}
              </text>
              <text x={px + 7} y={(lineY + py) / 2 + 11} fontSize={10}
                fill="rgb(251,146,60)" fontWeight={700}>
                e² = {sq.toFixed(2)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="text-[11px] text-muted px-2 pb-2">
        {b === null ? '검은 점 = 데이터 (x, y)' : (
          <>
            검은 점 = 데이터, 보라 직선 = 현재 모델 ŷ = {w.toFixed(1)}x + {b.toFixed(2)},
            {' '}주황 = {mode === 'error' ? '점별 부호 있는 오차' : '점별 오차(e)와 그 제곱(e²)'}.
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
  const lMax = Math.max(mseAt(bMin), mseAt(bMax)) * 1.05;
  const sx = (bv: number) => padL + ((bv - bMin) / (bMax - bMin)) * (W - padL - padR);
  const sy = (lv: number) => H - padB - (lv / lMax) * (H - padT - padB);

  const path = (() => {
    const parts: string[] = [];
    for (let bv = bMin; bv <= bMax; bv += 0.05) {
      parts.push(`${parts.length === 0 ? 'M' : 'L'}${sx(bv)},${sy(mseAt(bv))}`);
    }
    return parts.join(' ');
  })();

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

        {/* 최적 b 수직선 */}
        <line x1={sx(B_OPT)} y1={padT} x2={sx(B_OPT)} y2={H - padB}
          stroke="rgb(var(--color-muted))" strokeDasharray="3 3" opacity={0.7} />
        <text x={sx(B_OPT) + 4} y={padT + 10} fontSize={10} fill="rgb(var(--color-muted))">b≈{B_OPT} (최저)</text>

        {/* 곡선 */}
        <path d={path} fill="none" stroke="rgb(var(--color-accent))" strokeWidth={2} />

        {/* 접선 */}
        {showTangent && Math.abs(slope) > 0.01 && (
          <line
            x1={sx(t1)} y1={sy(Math.max(0, tanY(t1)))}
            x2={sx(t2)} y2={sy(Math.max(0, tanY(t2)))}
            stroke="rgb(251,146,60)" strokeWidth={2} opacity={0.85} />
        )}

        {/* 현재 점 — 오른쪽 가장자리 근처일 때 라벨을 왼쪽에 표시 */}
        <circle cx={sx(b)} cy={sy(mse)} r={6.5}
          fill="rgb(var(--color-accent))" stroke="white" strokeWidth={2} />
        <text
          x={b > bMax - 1.5 ? sx(b) - 10 : sx(b) + 10}
          y={sy(mse) - 8}
          textAnchor={b > bMax - 1.5 ? 'end' : 'start'}
          fontSize={11} fill="rgb(var(--color-text))">
          b = {b.toFixed(2)}, MSE = {mse.toFixed(2)}
        </text>
      </svg>
      <div className="text-[11px] text-muted px-2 pb-2">
        가로축 = 편향 b의 후보값, 세로축 = 그 b로 만든 직선의 평균 손실(MSE). w = {W_FIXED} 고정.
        {showTangent && ' 주황색 = 현재 점에서의 접선(기울기).'}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   점별 표
───────────────────────────────────────────────────────── */
function PointsTable({ w, b, highlight }: { w: number; b: number; highlight: TabId }) {
  return (
    <div className="card p-3 mt-4 overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead className="text-muted">
          <tr>
            <th className="text-left py-1">x</th>
            <th>y (실제)</th>
            <th>ŷ = {w.toFixed(1)}x + {b.toFixed(2)}</th>
            <th className={highlight === 'error' ? 'text-accent' : ''}>오차 e = ŷ − y</th>
            <th className={highlight === 'square' ? 'text-accent' : ''}>오차² (e²)</th>
          </tr>
        </thead>
        <tbody>
          {DATA.map(([x, y]) => {
            const yhat = predictWith(w, b, x);
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
        다섯 개의 점이 있어요. 실제 데이터는 이렇게 약간씩 노이즈가 섞여 있어 완벽한 직선 위에 있지 않아요.
        이 점들을 가장 잘 설명하는 <strong>직선 한 개</strong>를 찾는 게 목표입니다 — <code>ŷ = w · x + b</code>.
      </p>

      <div className="card p-3 mt-3 text-sm">
        <div className="font-medium text-text">📌 그런데 "모델"이 뭐예요?</div>
        <p className="text-muted mt-1.5">
          <strong>모델</strong>이란 입력 <code>x</code>가 들어왔을 때 출력 <code>ŷ</code>를 어떻게 예측할지에 대한
          <strong> 규칙(함수)</strong>이에요. 여기서 우리가 고른 규칙은 직선 <code>ŷ = w · x + b</code>고,
          이 규칙의 모양을 결정하는 두 숫자 <code>w</code>와 <code>b</code>를 <strong>매개변수(파라미터)</strong>라고 불러요.
        </p>
        <ul className="text-muted mt-2 space-y-1 list-disc pl-5 text-[13px]">
          <li><strong>모델 구조</strong> = "직선이다"라는 가정 — 사람이 정함</li>
          <li><strong>매개변수 <code>w, b</code></strong> = 그 직선의 기울기와 높이 — 데이터로부터 찾음</li>
          <li><strong>학습</strong> = <code>w, b</code>를 데이터에 가장 잘 맞도록 조정하는 일</li>
        </ul>
        <p className="text-muted mt-2 text-[13px]">
          앞으로 페이즈가 바뀌면 모델 구조도 바뀝니다(직선 → 곡선 → 신경망). 하지만 "구조 + 매개변수 + 학습"이라는 틀은 그대로예요.
        </p>
      </div>

      <ul className="text-sm mt-3 space-y-1 list-disc pl-5 text-muted">
        <li>탭 2(오차)에서 <code>w</code>와 <code>b</code>를 직접 움직여 직선을 맞춰보세요.</li>
        <li>탭 3~5에서는 <code>w = {W_FIXED}</code>로 <strong>고정</strong>하고, <code>b</code>만 움직입니다 — 손실 곡선을 1차원으로 깔끔히 그릴 수 있어요.</li>
        <li>그런데 "잘 맞다"는 어떻게 측정할까? — <strong>다음 탭으로</strong>.</li>
      </ul>
    </div>
  );
}

function ErrorExplain({ w, b, errs }: { w: number; b: number; errs: number[] }) {
  const sumE = errs.reduce((s, e) => s + e, 0);
  return (
    <div className="aside-tip mt-4">
      <div className="font-medium">2. 오차 — 점 하나마다 직선까지의 부호 있는 차이</div>
      <p className="text-sm mt-2 text-muted">
        한 점의 오차는 <code>e = 예측 ŷ − 실제 y</code>. 점이 직선 위에 있으면 +, 아래면 −.
        주황색 세로 막대 길이가 그 점의 오차 크기입니다. 여기서는 <strong>w와 b 모두</strong> 직접 움직여 볼 수 있어요.
      </p>
      <div className="card p-3 mt-2 font-mono text-sm">
        <div>현재 직선: ŷ = {w.toFixed(1)}x + {b.toFixed(2)}</div>
        <div className="mt-1">다섯 점의 오차 합 = {sumE.toFixed(2)}
          <span className="text-muted ml-2 text-xs not-italic" style={{ fontFamily: 'system-ui' }}>
            (w = {w.toFixed(1)}, b = {b.toFixed(2)} 일 때)
          </span>
        </div>
        <div className="text-xs text-muted mt-1.5 not-italic" style={{ fontFamily: 'system-ui' }}>
          그런데 합을 그대로 쓰면 <strong>+오차와 −오차가 상쇄</strong>되어, 어긋남의 정도가 사라져요.
          → 그래서 다음 탭에서 <strong>제곱</strong>합니다.
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
      </p>
      <ul className="text-sm mt-2 space-y-1 list-disc pl-5 text-muted">
        <li>오차 ±1 → e² = 1. 오차 ±2 → e² = 4. <strong>2배가 4배</strong>가 됩니다.</li>
        <li>큰 오차의 e²가 작은 것보다 훨씬 크죠? 큰 실수에 더 큰 페널티를 줍니다.</li>
        <li>다섯 점의 e² 합 = <strong>{errs.reduce((s, e) => s + e * e, 0).toFixed(2)}</strong>. 이걸 평균내면 다음 단계.</li>
      </ul>
    </div>
  );
}

function MseExplain({ b, mse }: { b: number; mse: number }) {
  return (
    <div className="aside-tip mt-4">
      <div className="font-medium">4. 평균 제곱 오차 (MSE) — 한 숫자로 모은 손실함수</div>
      <p className="text-sm mt-2 text-muted">
        다섯 점의 <strong>오차 제곱을 모두 더한 뒤 5로 나눈 평균</strong>이 이 모델의 손실입니다 — <code>MSE = (e₁² + ⋯ + e₅²) ÷ 5</code>.
        여기서는 w = {W_FIXED}로 고정하고 b만 바꿔가며 손실이 어떻게 변하는지 봅니다.
      </p>
      <div className="card p-3 mt-2 font-mono text-sm">
        <div>지금 b = {b.toFixed(2)} → MSE = <span className="text-accent font-bold">{mse.toFixed(3)}</span></div>
        <div className="text-xs text-muted mt-2 not-italic" style={{ fontFamily: 'system-ui' }}>
          이 한 숫자가 <strong>"이 모델이 얼마나 틀렸는지"</strong>의 종합 점수예요.
          위 그래프는 b를 좌우로 움직였을 때 MSE가 그리는 곡선 — b ≈ {B_OPT} 근처에서 최저가 됩니다.
          학습 = 이 곡선의 <strong>가장 낮은 곳</strong>을 찾는 일.
        </div>
      </div>
    </div>
  );
}

function GdExplain({ b, slope, mse, setB }: {
  b: number; slope: number; mse: number; setB: (v: number) => void;
}) {
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
        <li>"한 번에 얼마나 옮길지(=보폭)"가 바로 <strong>학습률</strong>이에요. 너무 크면 정답을 지나치고, 너무 작으면 너무 느립니다 — 다음 페이즈에서 직접 체험.</li>
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
