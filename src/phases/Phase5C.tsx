import { useMemo, useState } from 'react';
import { SEOUL_TEMP } from '../data/seoulTemp';
import type { SeoulTempRow } from '../data/seoulTemp';

// 서울 연평균 기온 = w · 연도 + b 모델을 학습.
// 연도 값이 매우 크므로 학습 안정을 위해 연도를 (year - 2000)로 평행이동해 학습한 뒤
// 화면에 표시할 때만 다시 변환한다 (학습률을 너무 작게 하지 않아도 수렴).

type Range = { from: number; to: number };
// 각 모델은 자기 학습 구간의 "평균 연도"를 offset으로 잡아 x 범위를 작게 유지한다
// (그래야 같은 학습률에서 두 모델이 모두 안정적으로 수렴).
type ModelState = { w: number; b: number; epoch: number; offset: number };

const RANGE_A: Range = { from: 1908, to: 2025 };
const RANGE_B: Range = { from: 1980, to: 2025 };
const LR = 0.001;

const subset = (r: Range) => SEOUL_TEMP.filter((d) => d.year >= r.from && d.year <= r.to);

const initModel = (rows: SeoulTempRow[]): ModelState => {
  const offset = rows.reduce((s, r) => s + r.year, 0) / rows.length; // 학습 구간 평균 연도
  return {
    w: 0,
    b: rows.reduce((s, r) => s + r.mean, 0) / rows.length, // y 평균으로 b 초기화
    epoch: 0,
    offset,
  };
};

// 한 step(=1 epoch) 진행: 페이즈 5와 동일한 갱신 식 — w ← w − η·평균(e·x), b ← b − η·평균(e)
// NaN 가드: 만약 어떤 이유로든 w·b가 발산하면 그 step부터는 더 이상 진행하지 않고 직전 안전 값을 유지.
const trainSteps = (m: ModelState, rows: SeoulTempRow[], steps: number): ModelState => {
  let { w, b, epoch } = m;
  const N = rows.length;
  for (let i = 0; i < steps; i++) {
    let dw = 0, db = 0;
    for (const { year, mean } of rows) {
      const x = year - m.offset;
      const e = (w * x + b) - mean;
      dw += e * x;
      db += e;
    }
    dw /= N; db /= N;
    const nw = w - LR * dw;
    const nb = b - LR * db;
    if (!isFinite(nw) || !isFinite(nb)) break;
    w = nw; b = nb;
    epoch += 1;
  }
  return { w, b, epoch, offset: m.offset };
};

const mse = (m: ModelState, rows: SeoulTempRow[]) =>
  rows.reduce((s, r) => {
    const e = (m.w * (r.year - m.offset) + m.b) - r.mean;
    return s + e * e;
  }, 0) / rows.length;

const predict = (m: ModelState, year: number) => m.w * (year - m.offset) + m.b;

// 페이즈 5의 "실생활 문제해결" 탭에서 동일 본문을 재사용하기 위한 wrapper (헤더 숨김).
export function PracticalContent() {
  return <Phase5CBody embedded />;
}

export function Phase5C() {
  return <Phase5CBody />;
}

function Phase5CBody({ embedded = false }: { embedded?: boolean }) {
  const [futureYear, setFutureYear] = useState(2050);

  const rowsA = useMemo(() => subset(RANGE_A), []);
  const rowsB = useMemo(() => subset(RANGE_B), []);

  const [modelA, setModelA] = useState<ModelState>(() => initModel(rowsA));
  const [modelB, setModelB] = useState<ModelState>(() => initModel(rowsB));

  const advance = (steps: number) => {
    setModelA((m) => trainSteps(m, rowsA, steps));
    setModelB((m) => trainSteps(m, rowsB, steps));
  };
  const reset = () => {
    setModelA(initModel(rowsA));
    setModelB(initModel(rowsB));
  };

  const maeA = mse(modelA, rowsA);
  const maeB = mse(modelB, rowsB);

  const yearsPerDeg = (w: number) => (w > 0 ? 1 / w : Infinity);

  const predA = predict(modelA, futureYear);
  const predB = predict(modelB, futureYear);

  return (
    <article>
      {!embedded && (
        <>
          <div className="text-xs font-mono text-muted">PHASE 5*</div>
          <h1>서울 기온으로 학습하기</h1>
        </>
      )}
      <p className="text-muted mt-2">
        페이즈 5에서 익힌 식 <code>ŷ = w · x + b</code>를 실제 데이터에 적용합니다.
        서울 연평균 기온(1908~2025)을 가지고 두 모델을 학습시켜 봅시다 —
        같은 식인데 <strong>학습 데이터의 구간이 다르면 결과가 달라집니다.</strong>
      </p>

      <div className="aside-tip mt-3 text-sm">
        <div className="font-medium">활동 — "데이터의 시야를 다르게"</div>
        <ul className="mt-1 list-disc pl-5 space-y-1 text-muted">
          <li><strong>모델 A</strong>: 1908~2025 (118년 전체) — 긴 시야, 천천히 데워진 시기까지 포함</li>
          <li><strong>모델 B</strong>: 1980~2025 (최근 46년) — 짧은 시야, 가속 시기 위주</li>
          <li>두 모델로 미래 기온을 예측해 보고, <strong>왜 다른 답이 나오는지</strong> 토론</li>
        </ul>
      </div>

      <h2>1. 두 모델을 직접 학습시키기</h2>
      <p className="text-sm text-muted">
        파란 점이 서울의 연평균 기온이에요. 두 직선은 처음엔 평평하게 누워 있다가, 아래 버튼으로 step을 진행할수록
        각자의 데이터에 맞게 기울어집니다. <strong>+1 step</strong>씩 천천히 진행하면 학습이 어떻게 흘러가는지 보여요 —
        급하면 +100, +1000으로 한 번에 수렴까지 가도 됩니다.
      </p>
      <ScatterWithLines
        modelA={modelA}
        modelB={modelB}
        focusFutureYear={futureYear}
      />

      <div className="card p-3 mt-3 sticky bottom-2 z-20 bg-bg/85 backdrop-blur-md">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted mr-2">학습 진행:</span>
          <button onClick={() => advance(1)} className="btn-primary">+1 step</button>
          <button onClick={() => advance(100)} className="btn-ghost">+100</button>
          <button onClick={() => advance(1000)} className="btn-ghost">+1000</button>
          <button onClick={reset} className="btn-ghost ml-auto">초기화</button>
        </div>
        <div className="grid sm:grid-cols-2 gap-2 mt-3 text-xs font-mono">
          <div className="card p-2" style={{ borderColor: 'rgb(96,165,250)' }}>
            <div className="text-muted">모델 A — epoch <span className="font-bold" style={{ color: 'rgb(96,165,250)' }}>{modelA.epoch}</span></div>
            <div>w = {modelA.w.toFixed(4)}, b = {modelA.b.toFixed(2)}</div>
            <div>MSE = <span className="font-bold">{maeA.toFixed(4)}</span></div>
          </div>
          <div className="card p-2" style={{ borderColor: 'rgb(244,114,182)' }}>
            <div className="text-muted">모델 B — epoch <span className="font-bold" style={{ color: 'rgb(244,114,182)' }}>{modelB.epoch}</span></div>
            <div>w = {modelB.w.toFixed(4)}, b = {modelB.b.toFixed(2)}</div>
            <div>MSE = <span className="font-bold">{maeB.toFixed(4)}</span></div>
          </div>
        </div>
        <div className="text-xs text-muted mt-2">
          학습률 η = {LR} (고정). 페이즈 5와 동일한 식 <code>w ← w − η · 평균(e·x)</code>, <code>b ← b − η · 평균(e)</code>를 매 step 적용합니다.
        </div>
      </div>

      <h2>2. 학습된 두 모델</h2>
      <div className="grid md:grid-cols-2 gap-3 mt-3 text-sm">
        <ModelCard
          label="모델 A — 1908~2025"
          color="rgb(96,165,250)"
          model={modelA}
          n={rowsA.length}
          mseTrain={maeA}
          yearsPerDeg={yearsPerDeg(modelA.w)}
        />
        <ModelCard
          label="모델 B — 1980~2025"
          color="rgb(244,114,182)"
          model={modelB}
          n={rowsB.length}
          mseTrain={maeB}
          yearsPerDeg={yearsPerDeg(modelB.w)}
        />
      </div>

      <h2>3. 미래 기온 예측</h2>
      <label className="block max-w-md mt-3">
        <div className="flex justify-between text-xs mb-1">
          <span>예측할 연도</span>
          <span className="font-mono text-accent">{futureYear}년</span>
        </div>
        <input type="range" min={2026} max={2100} step={1} value={futureYear}
          onChange={(e) => setFutureYear(parseInt(e.target.value))} className="w-full" />
      </label>
      <div className="grid sm:grid-cols-2 gap-3 mt-3">
        <div className="card p-3">
          <div className="text-xs text-muted">모델 A 예측 ({futureYear}년)</div>
          <div className="text-2xl font-mono font-bold" style={{ color: 'rgb(96,165,250)' }}>
            {predA.toFixed(2)} ℃
          </div>
        </div>
        <div className="card p-3">
          <div className="text-xs text-muted">모델 B 예측 ({futureYear}년)</div>
          <div className="text-2xl font-mono font-bold" style={{ color: 'rgb(244,114,182)' }}>
            {predB.toFixed(2)} ℃
          </div>
        </div>
        <div className="card p-3 sm:col-span-2 bg-amber-500/5 border-amber-500/30">
          <div className="text-xs text-muted">두 모델의 차이</div>
          <div className="text-lg font-mono">
            |A − B| = <span className="font-bold">{Math.abs(predA - predB).toFixed(2)} ℃</span>
            <span className="text-xs text-muted ml-2">— 같은 식·같은 도시, 다른 학습 구간</span>
          </div>
        </div>
      </div>

      <h2>4. 왜 결과가 달라지나 — 생각해 볼 점</h2>
      <ul className="mt-2 list-disc pl-5 space-y-2 text-sm">
        <li>
          <strong>모델 B가 더 가파르다.</strong> 최근 46년만 보면 온난화 가속 시기라 기울기가 큽니다.
          모델 A는 천천히 데워지던 1908~1970년대까지 모두 평균에 포함하므로 완만해요.
        </li>
        <li>
          <strong>둘 다 직선 한 개.</strong> 실제 기온은 해마다 출렁이고 가속·감속도 있어요.
          직선 한 개는 평균 추세만 잡을 뿐, <em>해마다의 변동</em>은 설명하지 못합니다.
        </li>
        <li>
          <strong>외삽(미래 예측)은 위험하다.</strong> 학습 구간 밖으로 멀리 갈수록 두 모델 간 격차가 벌어집니다.
          어느 쪽이 옳은지는 데이터만으로는 결정 불가 — <strong>"무엇을 가정할지"의 문제</strong>예요.
        </li>
        <li>
          <strong>토론 질문</strong>: 2050년 서울 기온을 한 가지로 맞춰야 한다면 A·B 중 어느 모델을 믿겠어요? 왜?
          제3의 모델(예: 곡선, 더 짧은/긴 구간)을 만든다면?
        </li>
      </ul>

      <div className="aside-note mt-6 text-sm">
        <div className="font-medium">데이터 출처</div>
        <p className="mt-1 text-muted">
          기상청 ASOS — 서울(108번 지점) 연평균 기온 1908~2025년. 학습은 페이즈 5와 동일한 식
          <code> ŷ = w · x + b</code>(여기서 <code>x = 연도 − 2000</code>)로 평균제곱오차를 줄이는 방향으로 자동 진행됩니다.
        </p>
      </div>

      <div className="aside-tip mt-3 text-sm">
        <div className="font-medium">결측 데이터 전처리 — 선형 보간</div>
        <p className="mt-1 text-muted">
          원본에서 <strong>1950~1953년</strong> 4년치 평균기온이 비어 있었어요(한국전쟁기 관측 중단).
          시계열에서는 <em>그 행을 그냥 빼면 안 됩니다</em> — 시간 축이 1949년에서 1954년으로 점프하면서
          학습이 추세를 잘못 잡거든요. 그래서 <strong>선형 보간</strong>으로 채웠습니다.
        </p>
        <p className="mt-2 text-muted">
          원리: 양 끝값을 직선으로 잇고 그 위의 값을 가져옴. 1949년 = <strong>11.7℃</strong>, 1954년 = <strong>11.4℃</strong>이므로
          5년에 걸쳐 0.3℃씩 일정하게 떨어진다고 보고:
        </p>
        <div className="card p-2 mt-2 font-mono text-xs">
          1950 = 11.7 − 0.06 = <strong>11.64℃</strong>, 1951 = <strong>11.58℃</strong>, 1952 = <strong>11.52℃</strong>, 1953 = <strong>11.46℃</strong>
        </div>
        <p className="mt-2 text-muted text-xs">
          ※ 보간값은 <em>실측이 아니라 추정</em>이므로 모델 평가나 토론에서 비중을 줄이는 것이 안전합니다.
        </p>
      </div>

      {!embedded && (
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <a href="#/p5" className="underline text-accent">← 페이즈 5로 돌아가기</a>
          <a href="#/p6" className="underline text-accent ml-auto">페이즈 6 입시 합격 예측 →</a>
        </div>
      )}
    </article>
  );
}

function ModelCard({ label, color, model, n, mseTrain, yearsPerDeg }: {
  label: string; color: string;
  model: ModelState;
  n: number; mseTrain: number; yearsPerDeg: number;
}) {
  return (
    <div className="card p-3">
      <div className="text-xs font-medium" style={{ color }}>{label}</div>
      <div className="font-mono text-sm mt-2 space-y-1">
        <div>식: ŷ = <span style={{ color }}>{model.w.toFixed(4)}</span> · (연도 − {model.offset.toFixed(0)}) + <span style={{ color }}>{model.b.toFixed(2)}</span></div>
        <div className="text-xs text-muted">학습 데이터 N = {n}년 · 진행 epoch = {model.epoch}</div>
        <div className="text-xs text-muted">학습 데이터 MSE = {mseTrain.toFixed(4)} ℃²</div>
        <div className="text-xs text-muted">
          1℃ 오르는 데 약 <span className="text-accent">{isFinite(yearsPerDeg) ? yearsPerDeg.toFixed(1) : '∞'}년</span>
        </div>
      </div>
    </div>
  );
}

function ScatterWithLines({ modelA, modelB, focusFutureYear }: {
  modelA: ModelState;
  modelB: ModelState;
  focusFutureYear: number;
}) {
  const W = 720, H = 360, padL = 50, padR = 16, padT = 16, padB = 32;
  const xMin = 1908, xMax = Math.max(2100, focusFutureYear);
  const yMin = 9, yMax = 18;
  const sx = (v: number) => padL + ((v - xMin) / (xMax - xMin)) * (W - padL - padR);
  const sy = (v: number) => H - padB - ((v - yMin) / (yMax - yMin)) * (H - padT - padB);

  const lineA1 = sy(predict(modelA, xMin));
  const lineA2 = sy(predict(modelA, xMax));
  const lineB1 = sy(predict(modelB, xMin));
  const lineB2 = sy(predict(modelB, xMax));

  // 모델 B는 1980 이전엔 점선(외삽), 이후엔 실선
  const lineB_fitX1 = sx(1980), lineB_fitY1 = sy(predict(modelB, 1980));

  return (
    <div className="card p-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* axes */}
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="rgb(var(--color-border))" />
        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="rgb(var(--color-border))" />
        {[1920, 1950, 1980, 2010, 2040, 2070, 2100].map((y) => (
          <g key={y}>
            <line x1={sx(y)} y1={H - padB} x2={sx(y)} y2={H - padB + 4} stroke="rgb(var(--color-muted))" />
            <text x={sx(y)} y={H - padB + 16} textAnchor="middle" fontSize={10} fill="rgb(var(--color-muted))">{y}</text>
          </g>
        ))}
        {[10, 12, 14, 16, 18].map((t) => (
          <g key={t}>
            <line x1={padL - 4} y1={sy(t)} x2={padL} y2={sy(t)} stroke="rgb(var(--color-muted))" />
            <text x={padL - 6} y={sy(t) + 3} textAnchor="end" fontSize={10} fill="rgb(var(--color-muted))">{t}℃</text>
          </g>
        ))}

        {/* 학습 구간 음영 */}
        <rect x={sx(1980)} y={padT} width={sx(2025) - sx(1980)} height={H - padT - padB}
          fill="rgb(244,114,182)" opacity={0.07} />

        {/* 모델 A 직선 (전체 구간 실선) */}
        <line x1={sx(xMin)} y1={lineA1} x2={sx(xMax)} y2={lineA2}
          stroke="rgb(96,165,250)" strokeWidth={2} />

        {/* 모델 B 직선: 1908~1980은 점선(외삽 거꾸로), 1980~끝은 실선 */}
        <line x1={sx(xMin)} y1={lineB1} x2={lineB_fitX1} y2={lineB_fitY1}
          stroke="rgb(244,114,182)" strokeWidth={1.5} strokeDasharray="4 4" opacity={0.7} />
        <line x1={lineB_fitX1} y1={lineB_fitY1} x2={sx(xMax)} y2={lineB2}
          stroke="rgb(244,114,182)" strokeWidth={2} />

        {/* 데이터 점 — 실측은 파랑, 보간은 회색 빈 원 */}
        {SEOUL_TEMP.map((d) => (
          d.interpolated
            ? <circle key={d.year} cx={sx(d.year)} cy={sy(d.mean)} r={2.5}
                fill="none" stroke="rgb(var(--color-muted))" strokeWidth={1} opacity={0.7} />
            : <circle key={d.year} cx={sx(d.year)} cy={sy(d.mean)} r={2} fill="rgb(59,130,246)" opacity={0.65} />
        ))}

        {/* 미래 연도 세로선 */}
        <line x1={sx(focusFutureYear)} y1={padT} x2={sx(focusFutureYear)} y2={H - padB}
          stroke="rgb(251,146,60)" strokeWidth={1.5} strokeDasharray="3 3" />
        <text x={sx(focusFutureYear)} y={padT + 10} textAnchor="middle" fontSize={11} fill="rgb(251,146,60)" fontWeight={700}>
          {focusFutureYear}
        </text>

        {/* 범례 */}
        <g transform={`translate(${W - 200}, ${padT + 10})`}>
          <rect x={0} y={0} width={186} height={50} rx={4} fill="rgb(var(--color-bg))" stroke="rgb(var(--color-border))" />
          <line x1={8} y1={16} x2={32} y2={16} stroke="rgb(96,165,250)" strokeWidth={2} />
          <text x={38} y={20} fontSize={11} fill="rgb(var(--color-text))">모델 A (1908~2025)</text>
          <line x1={8} y1={36} x2={32} y2={36} stroke="rgb(244,114,182)" strokeWidth={2} />
          <text x={38} y={40} fontSize={11} fill="rgb(var(--color-text))">모델 B (1980~2025)</text>
        </g>
      </svg>
      <div className="text-xs text-muted px-2 pb-2">
        파란 점 = 실제 연평균 기온. 분홍 음영 = 모델 B의 학습 구간(1980~2025).
        모델 B의 1980년 이전은 학습에 사용되지 않은 영역이라 점선으로 외삽 표시.
      </div>
    </div>
  );
}
