// PhaseA6 — 기온 예측 프로젝트
// 단일 인공 뉴런 1개로 서울 연도별 기온 회귀.
// A에서 배운 한 step(예측 → 오차 → 기울기 → 갱신)을 실제 데이터에 그대로 적용.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import { PHASES } from '../phases';
import { SEOUL_TEMP } from '../data/seoulTemp';

// 입력 스케일링 — 연도 그대로 쓰면 |x| ≈ 2000이라 학습률 한 번이 폭주한다.
// year - 1960 으로 offset, 다시 ÷10 으로 스케일 ⇒ x ∈ 약 [-5.2, 6.5]
const YEAR_OFFSET = 1960;
const YEAR_SCALE = 10;
const xOf = (year: number) => (year - YEAR_OFFSET) / YEAR_SCALE;

interface Sample { year: number; x: number; y: number; interpolated?: boolean }

export function PhaseA6() {
  const meta = PHASES.find((p) => p.id === 'a6')!;
  const markCompleted = useApp((s) => s.markCompleted);

  // 데이터 — 메모리: 매 렌더마다 새로 계산할 필요 없음
  const samples: Sample[] = useMemo(
    () => SEOUL_TEMP.map((d) => ({
      year: d.year,
      x: xOf(d.year),
      y: d.mean,
      interpolated: d.interpolated,
    })),
    []
  );

  // 손실(MSE) 평균 기온 근처에서 시작. b 는 평균기온, w 는 0
  const meanY = useMemo(
    () => samples.reduce((s, r) => s + r.y, 0) / samples.length,
    [samples]
  );

  const [w, setW] = useState(0);
  const [b, setB] = useState(meanY);
  const [lr, setLr] = useState(0.02);
  const [auto, setAuto] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const [history, setHistory] = useState<number[]>([]);

  const completedRef = useRef(false);

  // setInterval 안에서 최신 w·b를 stale closure 없이 읽기 위한 ref
  const wRef = useRef(w);
  const bRef = useRef(b);
  useEffect(() => { wRef.current = w; bRef.current = b; }, [w, b]);

  // 손실(MSE)
  const mse = useMemo(() => {
    let s = 0;
    for (const r of samples) {
      const e = (w * r.x + b) - r.y;
      s += e * e;
    }
    return s / samples.length;
  }, [samples, w, b]);

  // 첫 손실 기록 한 번만
  useEffect(() => {
    setHistory([mse]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 한 step: w·b 갱신 + 기록
  const stepOnce = (curW: number, curB: number, curLr: number) => {
    let dw = 0, db = 0;
    for (const r of samples) {
      const e = (curW * r.x + curB) - r.y;
      dw += e * r.x;
      db += e;
    }
    dw /= samples.length;
    db /= samples.length;
    const nw = curW - curLr * dw;
    const nb = curB - curLr * db;
    if (!isFinite(nw) || !isFinite(nb)) return { nw: curW, nb: curB };
    return { nw, nb };
  };

  // 자동 학습 — setInterval 안에서는 setState만. markCompleted는 history useEffect에서.
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => {
      const cw = wRef.current;
      const cb = bRef.current;
      const r = stepOnce(cw, cb, lr);
      let s = 0;
      for (const sm of samples) {
        const e = (r.nw * sm.x + r.nb) - sm.y;
        s += e * e;
      }
      const newLoss = s / samples.length;
      setW(r.nw);
      setB(r.nb);
      setHistory((h) => [...h.slice(-299), newLoss]);
      setEpoch((n) => n + 1);
    }, 60);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, lr, samples]);

  // 손실 수렴 → 완료 처리.
  // 학습 step이 한 번이라도 진행됐을 때만 검사 — reset 직후의 시드 값이
  // 우연히 임계 이하라도 자동 완료되지 않도록 epoch > 0 가드.
  useEffect(() => {
    if (epoch === 0) return;
    const last = history[history.length - 1];
    if (!completedRef.current && last !== undefined && last < 0.6) {
      completedRef.current = true;
      markCompleted('a6');
    }
  }, [history, epoch, markCompleted]);

  const reset = () => {
    // 초기 상태(w=0, b=meanY)에서의 실제 MSE를 history 시드로 사용한다.
    // 0을 박으면 손실 useEffect가 last < 0.6을 만족해 의도치 않게 완료 처리된다.
    let s0 = 0;
    for (const r of samples) {
      const e = (0 * r.x + meanY) - r.y;
      s0 += e * e;
    }
    const initialMse = s0 / samples.length;
    setW(0);
    setB(meanY);
    setEpoch(0);
    setHistory([initialMse]);
    setAuto(false);
    completedRef.current = false;
  };

  // 표시용 — 회귀선의 양 끝점 (학습 데이터 범위 안)
  const yearMin = samples[0].year;
  const yearMax = samples[samples.length - 1].year;
  const lineY1 = w * xOf(yearMin) + b;
  const lineY2 = w * xOf(yearMax) + b;

  // 100년 당 상승 폭 — 기울기를 사람이 읽는 단위로
  const degPer100Years = w * (100 / YEAR_SCALE);

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2 text-sm">
        지금까지 배운 한 step(예측 → 오차 → 기울기 → 갱신)을 실제 데이터로 굴려봐요.
        서울 연도별 평균 기온을 단일 인공 뉴런 하나가 직선 <code>ŷ = w · x + b</code>로 맞춥니다.
        직접 슬라이더를 움직여 보거나, 자동 학습이 회귀선을 데이터에 맞춰가는 모습을 보세요.
      </p>

      <div className="mt-4 grid lg:grid-cols-[1.6fr_1fr] gap-4 items-start">
        {/* 좌: 산점도 + 회귀선 */}
        <div className="space-y-2">
          <Scatter
            samples={samples}
            yearMin={yearMin}
            yearMax={yearMax}
            lineY1={lineY1}
            lineY2={lineY2}
          />
          <LossCurve history={history} />
        </div>

        {/* 우: 슬라이더 + 학습 컨트롤 */}
        <div className="space-y-3">
          <div className="card p-3 space-y-3">
            <div className="text-sm font-medium">직접 조정</div>
            <Slider
              label="기울기 w"
              hint="x 1 단위 (= 10년) 당 ℃ 변화"
              value={w}
              setValue={setW}
              min={-1.5}
              max={1.5}
              step={0.005}
              fmt={(v) => v.toFixed(3)}
            />
            <Slider
              label="편향 b"
              hint="기준점 1960년의 ℃ 절편"
              value={b}
              setValue={setB}
              min={8}
              max={16}
              step={0.05}
              fmt={(v) => v.toFixed(2)}
            />
          </div>

          <div className="card p-3 space-y-2">
            <div className="text-sm font-medium">자동 학습</div>
            <Slider
              label="학습률 η"
              hint="너무 크면 발산, 너무 작으면 느림"
              value={lr}
              setValue={setLr}
              min={0.001}
              max={0.08}
              step={0.001}
              fmt={(v) => v.toFixed(3)}
            />
            <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
              <Stat label="MSE" value={mse.toFixed(3)} highlight={mse < 0.6} />
              <Stat label="epoch" value={epoch.toString()} />
              <Stat label="100년당" value={`${degPer100Years >= 0 ? '+' : ''}${degPer100Years.toFixed(2)}℃`} />
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setAuto((v) => !v)} className="btn-primary">
                {auto ? '⏸ 자동 멈춤' : '▶ 자동 학습'}
              </button>
              <button onClick={reset} className="btn-ghost">초기화</button>
            </div>
          </div>

          <div className="aside-note text-[12px] leading-relaxed">
            <div className="text-sm font-medium">빈 원(○) 점은 뭔가요? — 보간(interpolation)</div>
            <p className="mt-1 text-muted">
              한국전쟁(1950–1953) 시기에는 기온 관측이 끊겨 <strong>4 년치 데이터가 없어요</strong>.
              이런 빈 자리를 그냥 두면 그래프가 끊기니까, <strong>앞뒤 해의 기온을 부드럽게 이어
              "이쯤이었을 것"이라고 추정한 값</strong>으로 채웁니다 — 이걸 <strong>보간</strong>이라 해요.
              실제 측정값은 <span style={{ color: 'rgb(var(--color-accent))' }}>꽉 찬 파란 점</span>,
              보간 추정값은 <span style={{ color: 'rgb(var(--color-accent))' }}>빈 원(○)</span> 으로 구분돼 있어요.
            </p>
          </div>

          <div className="aside-tip text-[12px] leading-relaxed">
            <p className="text-muted">
              여기까지가 회귀(숫자 예측)의 마지막. 다음 <strong>B 영역</strong>에서는 <em>종류를 맞히는 분류</em>로 넘어가요.
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ────────── 슬라이더 한 줄 ────────── */
function Slider({
  label, hint, value, setValue, min, max, step, fmt,
}: {
  label: string; hint?: string;
  value: number; setValue: (v: number) => void;
  min: number; max: number; step: number;
  fmt: (v: number) => string;
}) {
  return (
    <label className="block">
      <div className="flex justify-between items-baseline text-xs">
        <span className="font-medium">{label}</span>
        <span className="font-mono text-accent">{fmt(value)}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => setValue(parseFloat(e.target.value))}
        className="w-full mt-1"
      />
      {hint && <div className="text-[11px] text-muted mt-0.5">{hint}</div>}
    </label>
  );
}

/* ────────── 산점도 + 회귀선 ────────── */
function Scatter({
  samples, yearMin, yearMax, lineY1, lineY2,
}: {
  samples: Sample[];
  yearMin: number; yearMax: number;
  lineY1: number; lineY2: number;
}) {
  const W = 720, H = 280;
  const padL = 44, padR = 16, padT = 14, padB = 28;
  const yMin = 9, yMax = 16;
  const sx = (year: number) => padL + ((year - yearMin) / (yearMax - yearMin)) * (W - padL - padR);
  const sy = (t: number) => H - padB - ((t - yMin) / (yMax - yMin)) * (H - padT - padB);
  const lineY1c = Math.max(yMin, Math.min(yMax, lineY1));
  const lineY2c = Math.max(yMin, Math.min(yMax, lineY2));

  const xTicks = [1920, 1940, 1960, 1980, 2000, 2020];
  const yTicks = [10, 12, 14, 16];

  return (
    <div className="card p-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* 축 */}
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="rgb(var(--color-border))" />
        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="rgb(var(--color-border))" />
        {xTicks.map((y) => (
          <g key={y}>
            <line x1={sx(y)} y1={H - padB} x2={sx(y)} y2={H - padB + 4} stroke="rgb(var(--color-muted))" />
            <text x={sx(y)} y={H - padB + 16} textAnchor="middle" fontSize={10} fill="rgb(var(--color-muted))">{y}</text>
          </g>
        ))}
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={padL - 4} y1={sy(t)} x2={padL} y2={sy(t)} stroke="rgb(var(--color-muted))" />
            <text x={padL - 6} y={sy(t) + 3} textAnchor="end" fontSize={10} fill="rgb(var(--color-muted))">{t}℃</text>
          </g>
        ))}
        {/* 데이터 점 */}
        {samples.map((s) =>
          s.interpolated ? (
            <circle key={s.year} cx={sx(s.year)} cy={sy(s.y)} r={2.6}
              fill="none" stroke="rgb(var(--color-muted))" strokeWidth={1} opacity={0.7}>
              <title>{`${s.year}년 · ${s.y.toFixed(2)}℃ (보간 추정)`}</title>
            </circle>
          ) : (
            <circle key={s.year} cx={sx(s.year)} cy={sy(s.y)} r={2.4}
              fill="rgb(59,130,246)" opacity={0.7}>
              <title>{`${s.year}년 · ${s.y.toFixed(2)}℃`}</title>
            </circle>
          )
        )}
        {/* 회귀선 */}
        <line x1={sx(yearMin)} y1={sy(lineY1c)} x2={sx(yearMax)} y2={sy(lineY2c)}
          stroke="rgb(var(--color-accent))" strokeWidth={2.2} />
        {/* 축 라벨 */}
        <text x={W - padR} y={H - 4} textAnchor="end" fontSize={10} fill="rgb(var(--color-muted))">연도</text>
        <text x={padL - 4} y={padT - 2} textAnchor="end" fontSize={10} fill="rgb(var(--color-muted))">℃</text>
      </svg>
      <div className="text-[11px] text-muted px-1 pb-1 leading-snug">
        파란 점 = 서울 연평균 기온 (1908~2025, 출처 기상청 ASOS). 빈 원 = 한국전쟁기 결측 4년 보간값.
        주황 직선 = 인공 뉴런 1개의 회귀선 ŷ = w · x + b.
      </div>
    </div>
  );
}

/* ────────── 손실 곡선 ────────── */
function LossCurve({ history }: { history: number[] }) {
  const W = 720, H = 100, padL = 44, padR = 12, padT = 8, padB = 18;
  const N = history.length;
  if (N < 2) {
    return (
      <div className="card p-3 text-[12px] text-muted">
        자동 학습을 시작하면 손실 곡선이 그려져요.
      </div>
    );
  }
  const finite = history.filter((v) => isFinite(v) && v > 0);
  const Lmax = Math.max(0.5, ...finite);
  const Lmin = Math.max(1e-3, Math.min(...finite));
  const useLog = Lmax / Lmin > 50;
  const sx = (i: number) => padL + (N > 1 ? (i / (N - 1)) : 0) * (W - padL - padR);
  const sy = (v: number) => {
    if (useLog) {
      const lv = Math.log10(Math.max(v, 1e-6));
      const lmax = Math.log10(Lmax);
      const lmin = Math.log10(Lmin);
      return H - padB - ((lv - lmin) / (lmax - lmin || 1)) * (H - padT - padB);
    }
    return H - padB - ((v - 0) / (Lmax - 0)) * (H - padT - padB);
  };
  let path = '';
  history.forEach((v, i) => { path += `${i === 0 ? 'M' : 'L'}${sx(i)},${sy(v)} `; });

  return (
    <div className="card p-2">
      <div className="flex items-baseline justify-between px-1">
        <div className="text-xs font-medium">학습 손실 (MSE)</div>
        <div className="text-[11px] font-mono text-muted">
          현재 <span className="text-accent">{history[N - 1].toFixed(3)}</span>
          {useLog && <span className="ml-2">log scale</span>}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="rgb(var(--color-border))" />
        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="rgb(var(--color-border))" />
        <path d={path} fill="none" stroke="rgb(var(--color-accent))" strokeWidth={1.6} />
      </svg>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`p-1.5 rounded border ${highlight ? 'border-accent bg-accent-bg' : 'border-border'}`}>
      <div className="text-[11px] text-muted">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
