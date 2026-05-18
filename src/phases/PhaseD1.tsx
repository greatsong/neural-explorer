// PhaseD1 — 회귀 평가
// A6 에서 학습한 단일 뉴런 모델을 평가하는 네 가지 지표:
//   잔차 → MAE → MSE/RMSE → R²
// 슬라이더로 절편(b)·기울기(w)를 직접 움직이면 네 지표가 실시간으로 변한다.
// 차트의 잔차 선분을 통해 "어디서 빗나갔나"를 시각으로 잡는다.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import { PHASES } from '../phases';
import { SEOUL_TEMP } from '../data/seoulTemp';

const YEAR_OFFSET = 1960;
const YEAR_SCALE = 10;
const xOf = (year: number) => (year - YEAR_OFFSET) / YEAR_SCALE;

interface Sample { year: number; x: number; y: number }

const STEP_LABELS = ['1. 잔차', '2. MAE', '3. MSE · RMSE', '4. R²', '5. 종합'];

export function PhaseD1() {
  const meta = PHASES.find((p) => p.id === 'd1')!;
  const markCompleted = useApp((s) => s.markCompleted);

  const samples: Sample[] = useMemo(
    () => SEOUL_TEMP.map((d) => ({ year: d.year, x: xOf(d.year), y: d.mean })),
    []
  );

  const meanY = useMemo(
    () => samples.reduce((s, r) => s + r.y, 0) / samples.length,
    [samples]
  );

  // 슬라이더 — 학생이 직접 직선을 움직여 본다. A6에서 학습으로 도달했던 근사값을 기본값으로.
  const [w, setW] = useState(0.5);   // ℃ / 10년
  const [b, setB] = useState(meanY); // 평균 기온 근처
  const [step, setStep] = useState(0);
  const [sliderTouched, setSliderTouched] = useState(false);

  // 잔차 표시 강조용 — 한 점 하이라이트
  const [hoverYear, setHoverYear] = useState<number | null>(1990);

  // 네 지표 — useMemo 로 한 번에 계산
  const metrics = useMemo(() => {
    let absSum = 0;
    let sqSum = 0;
    let totalSS = 0; // Σ(y-ȳ)²
    for (const r of samples) {
      const pred = w * r.x + b;
      const e = pred - r.y;
      absSum += Math.abs(e);
      sqSum += e * e;
      totalSS += (r.y - meanY) ** 2;
    }
    const N = samples.length;
    const mae = absSum / N;
    const mse = sqSum / N;
    const rmse = Math.sqrt(mse);
    const r2 = totalSS === 0 ? 0 : 1 - sqSum / totalSS;
    return { mae, mse, rmse, r2 };
  }, [samples, w, b, meanY]);

  // 최소제곱 해석해 — "최적 직선 보기" 버튼.
  // w* = Σ(x-x̄)(y-ȳ) / Σ(x-x̄)², b* = ȳ - w*·x̄
  const best = useMemo(() => {
    const meanX = samples.reduce((s, r) => s + r.x, 0) / samples.length;
    let num = 0;
    let den = 0;
    for (const r of samples) {
      num += (r.x - meanX) * (r.y - meanY);
      den += (r.x - meanX) ** 2;
    }
    const w_ = den === 0 ? 0 : num / den;
    const b_ = meanY - w_ * meanX;
    return { w: w_, b: b_ };
  }, [samples, meanY]);

  // 완료 조건: 종합 단계 도달 + 슬라이더 한 번이라도 움직임 + RMSE ≤ 1.5 도달 경험
  const completedRef = useRef(false);
  useEffect(() => {
    if (completedRef.current) return;
    if (step >= 4 && sliderTouched && metrics.rmse <= 1.5) {
      completedRef.current = true;
      markCompleted('d1');
    }
  }, [step, sliderTouched, metrics.rmse, markCompleted]);

  // 차트 영역
  const yearMin = samples[0].year;
  const yearMax = samples[samples.length - 1].year;
  const yMin = 8;
  const yMax = 16;
  const W = 720;
  const H = 360;
  const padL = 44, padR = 14, padT = 14, padB = 30;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const xPx = (year: number) => padL + ((year - yearMin) / (yearMax - yearMin)) * innerW;
  const yPx = (t: number) => padT + (1 - (t - yMin) / (yMax - yMin)) * innerH;
  const predAt = (year: number) => w * xOf(year) + b;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 헤더 */}
      <div>
        <div className="text-xs font-mono text-accent mb-1">{meta.num}</div>
        <h1 className="!mb-1">{meta.title}</h1>
        <p className="text-muted">{meta.subtitle}</p>
      </div>

      {/* 들어가며 */}
      <div className="card p-5 space-y-3 text-sm leading-relaxed">
        <p>
          A6에서 단일 뉴런 하나로 서울 연도별 기온을 따라 직선을 그었어요. 그런데 그 직선이
          "잘 맞춘 직선"인지 어떻게 알 수 있을까요? 사람이 눈으로 보면 대충 알 수 있지만,
          모델 둘을 놓고 어느 쪽이 더 낫다고 말하려면 <strong>숫자 하나</strong>가 필요해요.
        </p>
        <p>
          이 챕터에서는 회귀 모델을 평가하는 네 숫자를 차근차근 만나 봅니다 —
          <strong> 잔차 → MAE → MSE/RMSE → R²</strong>. 슬라이더로 직선을 움직이면
          네 숫자가 어떻게 같이 움직이는지 직접 보세요.
        </p>
      </div>

      {/* 단계 탭 */}
      <div className="flex flex-wrap gap-2">
        {STEP_LABELS.map((label, i) => (
          <button
            key={label}
            onClick={() => setStep(i)}
            className={
              'px-3 py-1.5 text-sm rounded-md border transition ' +
              (step === i
                ? 'bg-accent text-white border-accent'
                : 'border-border text-muted hover:text-fg hover:border-accent/50')
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* 본문 — 좌우 분할 */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* 좌측 — 차트 + 설명 */}
        <div className="space-y-4">
          <div className="card p-4">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
              {/* y 그리드 */}
              {[8, 10, 12, 14, 16].map((t) => (
                <g key={t}>
                  <line x1={padL} x2={W - padR} y1={yPx(t)} y2={yPx(t)} stroke="currentColor" opacity={0.07} />
                  <text x={padL - 6} y={yPx(t) + 3} textAnchor="end" fontSize="10" fill="currentColor" opacity={0.55}>{t}°C</text>
                </g>
              ))}
              {/* x 라벨 */}
              {[1920, 1950, 1980, 2010].map((yr) => (
                <text key={yr} x={xPx(yr)} y={H - 8} textAnchor="middle" fontSize="10" fill="currentColor" opacity={0.55}>{yr}</text>
              ))}

              {/* 평균선 (R² 단계에서만) */}
              {step >= 3 && (
                <g>
                  <line x1={padL} x2={W - padR} y1={yPx(meanY)} y2={yPx(meanY)} stroke="rgb(120,120,120)" strokeDasharray="4 4" strokeWidth={1.2} />
                  <text x={W - padR - 4} y={yPx(meanY) - 4} textAnchor="end" fontSize="10" fill="currentColor" opacity={0.6}>
                    ȳ = {meanY.toFixed(2)}°C (기준선)
                  </text>
                </g>
              )}

              {/* 잔차 선분 — step ≥ 0 이면 표시. step==0 이면 hover한 한 점만 굵게 */}
              {samples.map((r) => {
                const pred = w * r.x + b;
                const isHover = hoverYear === r.year;
                const show = step === 0 ? isHover : true;
                if (!show) return null;
                return (
                  <line
                    key={`res-${r.year}`}
                    x1={xPx(r.year)} x2={xPx(r.year)}
                    y1={yPx(r.y)} y2={yPx(pred)}
                    stroke={isHover ? 'rgb(220,38,38)' : 'rgb(190,18,60)'}
                    strokeWidth={isHover ? 2 : 0.8}
                    opacity={isHover ? 0.95 : 0.35}
                  />
                );
              })}

              {/* 예측 직선 */}
              <line
                x1={xPx(yearMin)} x2={xPx(yearMax)}
                y1={yPx(predAt(yearMin))} y2={yPx(predAt(yearMax))}
                stroke="rgb(59,130,246)" strokeWidth={2}
              />

              {/* 데이터 점 */}
              {samples.map((r) => (
                <circle
                  key={r.year}
                  cx={xPx(r.year)} cy={yPx(r.y)} r={hoverYear === r.year ? 4.5 : 2.5}
                  fill="rgb(59,130,246)" opacity={0.8}
                  onMouseEnter={() => setHoverYear(r.year)}
                />
              ))}
            </svg>
            <div className="text-xs text-muted mt-2">
              파란 점 = 서울 연평균 기온(1908~2025). 파란 직선 = 현재 슬라이더 값으로 만든 예측. 빨간 세로선 = 잔차(예측 − 실제).
            </div>
          </div>

          {/* 단계별 설명 */}
          <StepText
            step={step}
            mae={metrics.mae}
            mse={metrics.mse}
            rmse={metrics.rmse}
            r2={metrics.r2}
            meanY={meanY}
            hoverYear={hoverYear}
            samples={samples}
            w={w}
            b={b}
          />

          {/* 단계 이동 */}
          <div className="flex justify-between">
            <button
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="btn-ghost px-4 py-2 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← 이전
            </button>
            <button
              onClick={() => setStep(Math.min(4, step + 1))}
              disabled={step === 4}
              className="btn-primary px-4 py-2 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
            >
              다음 →
            </button>
          </div>
        </div>

        {/* 우측 — 슬라이더 + 지표 카드 */}
        <aside className="space-y-4">
          <div className="card p-4 space-y-3">
            <div className="font-medium text-sm">직선 직접 움직이기</div>
            <SliderRow
              label="b (절편)"
              value={b}
              min={5} max={15} step={0.1}
              onChange={(v) => { setB(v); setSliderTouched(true); }}
              suffix="°C"
            />
            <SliderRow
              label="w (10년당 기울기)"
              value={w}
              min={-0.5} max={1.5} step={0.01}
              onChange={(v) => { setW(v); setSliderTouched(true); }}
              suffix="°C"
            />
            <button
              onClick={() => { setW(best.w); setB(best.b); setSliderTouched(true); }}
              className="w-full btn-ghost text-xs py-1.5"
            >
              최적 직선으로 점프 (w={best.w.toFixed(3)}, b={best.b.toFixed(2)})
            </button>
          </div>

          <div className="card p-4 space-y-3">
            <div className="font-medium text-sm">평가 지표 (실시간)</div>
            <Metric label="MAE" value={metrics.mae.toFixed(3)} unit="°C" highlight={step === 1} hint="잔차 절대값 평균" />
            <Metric label="MSE" value={metrics.mse.toFixed(3)} unit="°C²" highlight={step === 2} hint="잔차 제곱 평균 (단위가 변함)" />
            <Metric label="RMSE" value={metrics.rmse.toFixed(3)} unit="°C" highlight={step === 2} hint="MSE에 루트 — 단위 회복" />
            <Metric label="R²" value={metrics.r2.toFixed(3)} unit="" highlight={step === 3} hint="기준선 대비 설명력 (1에 가까울수록 좋음)" />
            <div className="text-xs text-muted leading-relaxed pt-1 border-t border-border">
              완료 목표: 종합 단계에서 RMSE ≤ 1.5 만들기. "최적 직선으로 점프" 한 번이면 도달해요.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SliderRow({ label, value, min, max, step, onChange, suffix }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; suffix?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs mb-1">
        <span>{label}</span>
        <span className="font-mono">{value.toFixed(2)}{suffix}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

function Metric({ label, value, unit, highlight, hint }: {
  label: string; value: string; unit: string; highlight?: boolean; hint: string;
}) {
  return (
    <div className={'rounded-md px-3 py-2 ' + (highlight ? 'bg-accent/10 ring-1 ring-accent/40' : 'bg-surface/60')}>
      <div className="flex items-baseline justify-between">
        <div className="text-xs font-mono opacity-70">{label}</div>
        <div className="font-mono text-base">
          {value}<span className="text-xs opacity-60 ml-1">{unit}</span>
        </div>
      </div>
      <div className="text-[10px] text-muted mt-0.5">{hint}</div>
    </div>
  );
}

function StepText({
  step, mae, mse, rmse, r2, meanY, hoverYear, samples, w, b,
}: {
  step: number; mae: number; mse: number; rmse: number; r2: number; meanY: number;
  hoverYear: number | null; samples: Sample[]; w: number; b: number;
}) {
  if (step === 0) {
    const target = hoverYear ?? 1990;
    const row = samples.find((r) => r.year === target);
    const pred = row ? w * row.x + b : 0;
    const res = row ? pred - row.y : 0;
    return (
      <div className="card p-4 text-sm space-y-2 leading-relaxed">
        <div className="font-medium">1. 잔차 — 한 점의 오차</div>
        <p>
          데이터 점 한 개를 골라 살펴봐요. 그 해의 실제 기온이 <code>y</code>, 우리 직선이 만든 예측이 <code>ŷ</code>.
          둘의 차이 <code>ŷ − y</code>를 <strong>잔차</strong>라고 불러요. 차트의 빨간 세로선 한 개가 바로 잔차예요.
        </p>
        {row && (
          <div className="rounded bg-surface/60 p-3 font-mono text-xs">
            {row.year}년 — 실제 y = {row.y.toFixed(2)}°C, 예측 ŷ = {pred.toFixed(2)}°C → 잔차 {res >= 0 ? '+' : ''}{res.toFixed(2)}°C
          </div>
        )}
        <p>
          잔차가 양수면 모델이 <strong>과대평가</strong>(실제보다 높게 예측), 음수면 <strong>과소평가</strong>예요.
          전체 데이터에서 잔차를 어떻게 모아 한 숫자로 만들지가 다음 단계의 질문이에요.
        </p>
        <p className="text-muted text-xs">
          차트의 다른 점에 마우스를 올려 보세요 — 그 해의 잔차가 빨갛게 굵어집니다.
        </p>
      </div>
    );
  }
  if (step === 1) {
    return (
      <div className="card p-4 text-sm space-y-2 leading-relaxed">
        <div className="font-medium">2. MAE — 잔차의 절대값을 평균</div>
        <p>
          잔차는 양수도 있고 음수도 있어요. 그냥 더하면 서로 상쇄돼서 "0에 가까운데 사실은 다 빗나간" 경우를 잡지 못해요.
          그래서 <strong>절대값</strong>(부호 떼기)을 먼저 씌운 뒤 평균을 냅니다. 이것이 <strong>MAE</strong>(Mean Absolute Error)예요.
        </p>
        <div className="rounded bg-surface/60 p-3 font-mono text-xs space-y-1">
          <div>MAE = ( |잔차₁| + |잔차₂| + … + |잔차ₙ| ) / N</div>
          <div>현재 MAE = <strong className="text-fg">{mae.toFixed(3)} °C</strong></div>
        </div>
        <p>
          단위가 원본과 같은 <strong>°C</strong>인 것이 장점이에요. "평균적으로 {mae.toFixed(2)}°C 빗나간다"고 자연스럽게 읽을 수 있어요.
        </p>
      </div>
    );
  }
  if (step === 2) {
    return (
      <div className="card p-4 text-sm space-y-2 leading-relaxed">
        <div className="font-medium">3. MSE와 RMSE — 큰 오차에 더 큰 페널티</div>
        <p>
          MAE는 깔끔하지만 한 가지 약점이 있어요. 잔차 10°C인 한 점이나 잔차 1°C인 점 열 개가 합계는 같지만,
          크게 빗나간 한 점이 사실 더 심각한 문제잖아요. 잔차를 <strong>제곱</strong>해 평균을 내면 큰 오차에 더 큰 페널티가 갑니다.
          이것이 <strong>MSE</strong>(Mean Squared Error)예요.
        </p>
        <div className="rounded bg-surface/60 p-3 font-mono text-xs space-y-1">
          <div>MSE = ( 잔차₁² + 잔차₂² + … + 잔차ₙ² ) / N</div>
          <div>현재 MSE = <strong className="text-fg">{mse.toFixed(3)} °C²</strong></div>
        </div>
        <p>
          그런데 단위가 °C²가 됐어요. 사람이 직관적으로 못 읽죠. 그래서 <strong>루트</strong>를 씌워 단위를 °C로 되돌립니다.
          이것이 <strong>RMSE</strong>(Root MSE)예요.
        </p>
        <div className="rounded bg-surface/60 p-3 font-mono text-xs space-y-1">
          <div>RMSE = √MSE</div>
          <div>현재 RMSE = <strong className="text-fg">{rmse.toFixed(3)} °C</strong></div>
        </div>
        <p>
          MAE와 비교해 보세요. RMSE는 항상 MAE보다 크거나 같은데, 차이가 클수록 <strong>큰 오차가 일부 점에 몰려 있다</strong>는 신호예요.
        </p>
      </div>
    );
  }
  if (step === 3) {
    const totalSS = samples.reduce((s, r) => s + (r.y - meanY) ** 2, 0);
    const resSS = samples.reduce((s, r) => s + ((w * r.x + b) - r.y) ** 2, 0);
    return (
      <div className="card p-4 text-sm space-y-2 leading-relaxed">
        <div className="font-medium">4. R² — 기준선 대비 얼마나 나아졌나</div>
        <p>
          MAE·RMSE는 절대 숫자라서 "이 모델이 좋은 모델인지" 판단하기 어려울 때가 있어요.
          기준이 필요한데, 가장 자연스러운 기준은 <strong>평균만 답하는 모델</strong>이에요 — 모든 해를 그냥 평균 {meanY.toFixed(2)}°C로 예측하는 모델.
        </p>
        <p>
          <strong>R²</strong>(결정계수)는 이렇게 읽어요. <em>"우리 모델이 평균만 답하는 것보다 잔차를 얼마나 줄였나"</em>.
          1이면 완벽, 0이면 평균만큼만, 음수면 평균보다 못함.
        </p>
        <div className="rounded bg-surface/60 p-3 font-mono text-xs space-y-1">
          <div>R² = 1 − (잔차 제곱합) / (기준선 제곱합)</div>
          <div>잔차 제곱합 = {resSS.toFixed(2)}</div>
          <div>기준선 제곱합 = {totalSS.toFixed(2)} (각 점이 평균 {meanY.toFixed(2)}에서 떨어진 거리의 제곱 합)</div>
          <div>R² = <strong className="text-fg">{r2.toFixed(3)}</strong></div>
        </div>
        <p>
          차트에 회색 점선으로 평균선이 추가됐어요. 우리 직선이 이 평균선보다 점들을 얼마나 잘 따라가는지가 R²의 뜻이에요.
        </p>
      </div>
    );
  }
  // step 4
  return (
    <div className="card p-4 text-sm space-y-2 leading-relaxed">
      <div className="font-medium">5. 종합 — 네 숫자가 함께 어떻게 움직이나</div>
      <p>
        이제 슬라이더를 자유롭게 움직여 보면서 네 지표가 함께 어떻게 변하는지 관찰하세요.
      </p>
      <ul className="list-disc list-inside space-y-1 text-xs">
        <li>기울기 <code>w</code>를 0으로 두면? — 그냥 절편 하나로만 예측하는 셈. R²가 0에 가까워져요.</li>
        <li><code>w</code>를 음수로 두면? — 추세 반대 방향. R²가 음수가 될 수 있어요(평균만 답하는 것보다 못함).</li>
        <li>"최적 직선으로 점프" 버튼을 누르면 RMSE가 가장 작은 (w, b) 조합으로 이동해요.</li>
        <li>MAE와 RMSE의 차이가 크면 큰 오차가 일부 점에 몰려 있다는 신호 — 차트에서 유난히 긴 빨간 선분을 찾아 보세요.</li>
      </ul>
      <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-border">
        <div>MAE  = {mae.toFixed(3)} °C</div>
        <div>MSE  = {mse.toFixed(3)} °C²</div>
        <div>RMSE = {rmse.toFixed(3)} °C</div>
        <div>R²   = {r2.toFixed(3)}</div>
      </div>
      <p className="text-muted text-[11px] pt-1">
        RMSE를 1.5 이하로 만들면 이 페이즈가 완료 처리됩니다. 활동지(partD) 1번에서 직접 손계산도 해 볼게요.
      </p>
    </div>
  );
}
