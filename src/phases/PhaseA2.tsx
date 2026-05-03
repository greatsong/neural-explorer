// PhaseA2 — 오차와 MSE
// 한 viewport 안에서 데이터 표 + 산점도 + MSE 값을 동시에 본다.
// 슬라이더(기울기 w / 절편 b)로 예측선을 움직이면 표·막대·MSE가 동시에 갱신된다.
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store';
import { PHASES } from '../phases';

// 정답 데이터 — A2~A5 가 공유하는 정확한 직선 y = 2x + 1.
// (실생활 노이즈 데이터는 A6 의 서울 기온에서 따로 만난다.)
const DATA: { x: number; y: number }[] = [
  { x: 1, y: 3 },
  { x: 2, y: 5 },
  { x: 3, y: 7 },
  { x: 4, y: 9 },
  { x: 5, y: 11 },
];

const MSE_TARGET = 0.05; // 정답 직선 근처에 가면 a2 완료 처리

export function PhaseA2() {
  const meta = PHASES.find((p) => p.id === 'a2')!;
  const markCompleted = useApp((s) => s.markCompleted);

  const [w, setW] = useState(1.5);
  const [b, setB] = useState(0);

  const rows = useMemo(
    () =>
      DATA.map(({ x, y }) => {
        const yhat = w * x + b;
        const e = yhat - y;
        return { x, y, yhat, e, e2: e * e };
      }),
    [w, b]
  );

  const mse = useMemo(
    () => rows.reduce((s, r) => s + r.e2, 0) / rows.length,
    [rows]
  );

  useEffect(() => {
    if (mse < MSE_TARGET) markCompleted('a2');
  }, [mse, markCompleted]);

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2 text-sm">
        예측이 정답과 얼마나 어긋났는지를 <strong>숫자</strong>로 만들면 학습이 시작됩니다.
        오차 e = ŷ − y 를 점마다 계산하고, 제곱해서 평균을 내면 그게 바로 <strong>평균 제곱 오차(MSE)</strong>예요.
      </p>

      {/* 좌: 데이터 표 / 우: 산점도 + MSE */}
      <div className="grid md:grid-cols-2 gap-4 mt-4 items-start">
        {/* 표 */}
        <div className="card overflow-hidden">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="bg-surface text-muted text-[11px]">
                <th className="px-2 py-1.5 text-right">x</th>
                <th className="px-2 py-1.5 text-right">y</th>
                <th className="px-2 py-1.5 text-right">ŷ</th>
                <th className="px-2 py-1.5 text-right" style={{ color: 'rgb(190,18,60)' }}>e=ŷ−y</th>
                <th className="px-2 py-1.5 text-right">e²</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.x} className="border-t border-border">
                  <td className="px-2 py-1 text-right">{r.x}</td>
                  <td className="px-2 py-1 text-right">{r.y.toFixed(1)}</td>
                  <td className="px-2 py-1 text-right text-accent">{r.yhat.toFixed(2)}</td>
                  <td className="px-2 py-1 text-right" style={{ color: 'rgb(190,18,60)' }}>
                    {r.e >= 0 ? '+' : ''}{r.e.toFixed(2)}
                  </td>
                  <td className="px-2 py-1 text-right">{r.e2.toFixed(2)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-border bg-surface/40">
                <td className="px-2 py-1.5 text-right text-[11px] text-muted" colSpan={4}>
                  MSE = (1/N) · Σ e²
                </td>
                <td className="px-2 py-1.5 text-right font-semibold text-accent">{mse.toFixed(3)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 산점도 + 큰 MSE */}
        <div className="card p-3">
          <ScatterPlot rows={rows} w={w} b={b} />
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-[11px] text-muted">현재 손실</div>
            <div className="font-mono text-2xl font-semibold"
                 style={{ color: mse < MSE_TARGET ? 'rgb(16,185,129)' : 'rgb(var(--color-accent))' }}>
              MSE = {mse.toFixed(3)}
            </div>
          </div>
          {mse < MSE_TARGET && (
            <div className="text-[11px] mt-1" style={{ color: 'rgb(16,185,129)' }}>
              충분히 낮아요. 이 값을 더 줄이는 방법이 다음 페이즈의 주제입니다.
            </div>
          )}
        </div>
      </div>

      {/* 슬라이더 */}
      <div className="grid grid-cols-2 gap-4 mt-3">
        <Slider label="기울기 w" value={w} setValue={setW} min={0} max={4} step={0.05} />
        <Slider label="절편 b" value={b} setValue={setB} min={-3} max={4} step={0.05} />
      </div>

      {/* 왜 제곱? + 다음 안내 */}
      <div className="grid md:grid-cols-3 gap-3 mt-3 text-xs">
        <div className="aside-tip md:col-span-2 !my-0 !py-2 !px-3">
          <div className="text-sm font-medium mb-0.5">왜 제곱인가?</div>
          오차 e 그대로 더하면 +와 −가 서로 상쇄됩니다. 절댓값 |e|는 부호는 없애지만
          <strong> 큰 실수와 작은 실수를 같은 비율로</strong> 봅니다. 제곱 e²는 부호도 없애고,
          <strong> 큰 오차에 더 큰 페널티</strong>를 줍니다 — 그래서 학습이 큰 실수부터 빠르게 줄여 나가요.
        </div>
        <div className="aside-note !my-0 !py-2 !px-3">
          <div className="text-sm font-medium mb-0.5">다음 단계</div>
          A3에서는 이 MSE를 <strong>스스로 줄여 가는 방법</strong>(경사하강법)을 배웁니다.
        </div>
      </div>
    </article>
  );
}

/* ───────── 슬라이더 ───────── */
function Slider({
  label, value, setValue, min, max, step,
}: {
  label: string;
  value: number;
  setValue: (v: number) => void;
  min: number;
  max: number;
  step: number;
}) {
  return (
    <label className="block">
      <div className="flex justify-between text-xs mb-0.5">
        <span className="text-muted">{label}</span>
        <span className="font-mono text-accent">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setValue(parseFloat(e.target.value))}
        className="w-full accent-[rgb(var(--color-accent))]"
      />
    </label>
  );
}

/* ───────── 산점도 ─────────
   x축 = x, y축 = 값. 정답 점(검정) + 예측선(주황) + 오차 막대(빨강).
*/
function ScatterPlot({
  rows, w, b,
}: {
  rows: { x: number; y: number; yhat: number; e: number; e2: number }[];
  w: number;
  b: number;
}) {
  const W = 360, H = 200;
  const padL = 30, padR = 12, padT = 10, padB = 24;
  const xMin = 0, xMax = 6, yMin = 0, yMax = 14;
  const sx = (x: number) => padL + ((x - xMin) / (xMax - xMin)) * (W - padL - padR);
  const sy = (y: number) => H - padB - ((y - yMin) / (yMax - yMin)) * (H - padT - padB);

  const lineX1 = 0;
  const lineX2 = 6;
  const lineY1 = w * lineX1 + b;
  const lineY2 = w * lineX2 + b;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* 격자 */}
      <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="rgb(var(--color-border))" />
      <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="rgb(var(--color-border))" />
      {[1, 2, 3, 4, 5].map((x) => (
        <text key={x} x={sx(x)} y={H - padB + 14} textAnchor="middle"
              fontSize={10} fill="rgb(var(--color-muted))">{x}</text>
      ))}
      {[0, 4, 8, 12].map((y) => (
        <text key={y} x={padL - 5} y={sy(y) + 3} textAnchor="end"
              fontSize={10} fill="rgb(var(--color-muted))">{y}</text>
      ))}

      {/* 예측선(주황) */}
      <line
        x1={sx(lineX1)} y1={sy(lineY1)}
        x2={sx(lineX2)} y2={sy(lineY2)}
        stroke="rgb(var(--color-accent))" strokeWidth={2} strokeOpacity={0.85}
      />

      {/* 오차 막대(빨강) — y와 ŷ 사이 세로선 */}
      {rows.map((r) => (
        <line
          key={`e-${r.x}`}
          x1={sx(r.x)} y1={sy(r.y)}
          x2={sx(r.x)} y2={sy(r.yhat)}
          stroke="rgb(190,18,60)" strokeWidth={2.5} strokeOpacity={0.7} strokeLinecap="round"
        />
      ))}

      {/* 정답 점 */}
      {rows.map((r) => (
        <circle
          key={`y-${r.x}`}
          cx={sx(r.x)} cy={sy(r.y)} r={4}
          fill="rgb(var(--color-text))"
        />
      ))}

      {/* 예측 점 — 선 위 작은 동그라미 */}
      {rows.map((r) => (
        <circle
          key={`yh-${r.x}`}
          cx={sx(r.x)} cy={sy(r.yhat)} r={3}
          fill="rgb(var(--color-bg))"
          stroke="rgb(var(--color-accent))" strokeWidth={1.5}
        />
      ))}

      {/* 범례 */}
      <g transform={`translate(${W - padR - 96}, ${padT + 4})`} fontSize={10}>
        <circle cx={6} cy={6} r={3} fill="rgb(var(--color-text))" />
        <text x={14} y={9} fill="rgb(var(--color-muted))">정답 y</text>
        <line x1={50} y1={6} x2={62} y2={6} stroke="rgb(var(--color-accent))" strokeWidth={2} />
        <text x={66} y={9} fill="rgb(var(--color-muted))">ŷ</text>
        <line x1={78} y1={2} x2={78} y2={10} stroke="rgb(190,18,60)" strokeWidth={2} />
        <text x={84} y={9} fill="rgb(var(--color-muted))">오차</text>
      </g>
    </svg>
  );
}
