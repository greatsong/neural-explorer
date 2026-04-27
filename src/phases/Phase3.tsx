import { useEffect, useState } from 'react';
import { useApp } from '../store';

export function Phase3() {
  const TRUE = 5;
  const [pred, setPred] = useState(1);
  const markCompleted = useApp((s) => s.markCompleted);

  const error = pred - TRUE;
  const sqError = error * error;

  useEffect(() => {
    if (Math.abs(error) < 0.3) markCompleted('p3');
  }, [error, markCompleted]);

  // parabola visualization
  const points: [number, number][] = [];
  for (let p = -2; p <= 12; p += 0.2) {
    points.push([p, (p - TRUE) ** 2]);
  }
  const W = 480, H = 240;
  const xMin = -2, xMax = 12, yMin = 0, yMax = 50;
  const sx = (x: number) => ((x - xMin) / (xMax - xMin)) * W;
  const sy = (y: number) => H - ((y - yMin) / (yMax - yMin)) * H;
  const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${sx(x)},${sy(y)}`).join(' ');

  // 손실 = (예측 − 정답)² 의 예측에 대한 기울기 = 2(예측 − 정답)
  const slope = 2 * (pred - TRUE);
  const tanY = (x: number) => sqError + slope * (x - pred);
  // 접선 길이를 viewBox(yMin~yMax, xMin~xMax) 안에 들어오게 동적으로 결정 —
  // 길이를 임의로 잡고 clamp하면 직선이 변형되어 점과 어긋난다. 길이 자체를 잘라야 한다.
  const baseLen = 2.5;
  const dxFromYBound = Math.abs(slope) > 0.01
    ? Math.min((yMax - sqError) / Math.abs(slope), sqError / Math.abs(slope))
    : Infinity;
  const tanLen = Math.max(0.3, Math.min(baseLen, dxFromYBound, pred - xMin, xMax - pred));
  const tanX1 = pred - tanLen, tanX2 = pred + tanLen;

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE 3</div>
      <h1>손실함수와 경사하강법의 이해</h1>
      <p className="text-muted mt-2">
        예측이 정답과 얼마나 멀리 떨어져 있는지 숫자로 표현하는 게 <strong>손실(loss)</strong>이에요.
        가장 단순한 손실은 <code>(예측 − 정답)²</code>입니다.
      </p>

      <div className="aside-tip">
        <div className="font-medium">왜 제곱을 할까?</div>
        <ul className="mt-2 text-sm space-y-1 list-disc pl-5">
          <li><strong>부호 상쇄 방지</strong> — 어떤 점은 +3, 어떤 점은 −3 으로 어긋나 있을 때 그대로 더하면 0이 되어 "오차 없음"처럼 보입니다. 제곱하면 모두 양수가 되어 그런 일이 생기지 않습니다.</li>
          <li><strong>큰 오차에 더 큰 페널티</strong> — 오차 1과 10의 제곱은 1과 100. 큰 오차일수록 손실이 훨씬 커지므로, 모델이 큰 실수를 먼저 줄이려고 합니다.</li>
          <li><strong>매끄러운 곡선</strong> — 손실이 아래 그림처럼 부드러운 포물선이 되어, 페이즈 5에서 컴퓨터가 "어느 쪽이 내리막인지"를 정확히 계산할 수 있습니다.</li>
        </ul>
      </div>

      <div className="aside-tip mt-3">
        정답은 <strong>{TRUE}</strong> 입니다. 슬라이더로 예측값을 움직여 손실을 0에 가깝게 만들어 보세요.
      </div>

      <svg viewBox={`0 0 ${W + 40} ${H + 40}`} className="w-full max-w-2xl mt-4">
        <g transform="translate(20,10)">
          <line x1={0} y1={H} x2={W} y2={H} stroke="rgb(var(--color-border))" />
          <line x1={sx(TRUE)} y1={0} x2={sx(TRUE)} y2={H} stroke="rgb(var(--color-muted))" strokeDasharray="3 3" />
          <text x={sx(TRUE) + 4} y={14} fontSize={11} fill="rgb(var(--color-muted))">정답</text>
          <path d={path} stroke="rgb(var(--color-accent))" strokeWidth={2} fill="none" />
          {/* 현재 점에서의 접선 — clamp 없이 정확한 접선 식. 길이는 위에서 viewBox에 맞춰 잘려 있음. */}
          {Math.abs(error) > 0.05 && (
            <line
              x1={sx(tanX1)} y1={sy(tanY(tanX1))}
              x2={sx(tanX2)} y2={sy(tanY(tanX2))}
              stroke="rgb(251, 146, 60)" strokeWidth={2} opacity={0.85}
            />
          )}
          <circle cx={sx(pred)} cy={sy(sqError)} r={7} fill="rgb(var(--color-accent))" stroke="white" strokeWidth={2} />
          <text x={sx(pred) + 10} y={sy(sqError) - 6} fontSize={11} fill="rgb(var(--color-text))">
            예측 {pred.toFixed(1)} → 손실 {sqError.toFixed(2)}
          </text>
        </g>
      </svg>

      <div className="mt-6">
        <label className="block">
          <div className="flex justify-between text-sm mb-1">
            <span>예측값</span>
            <span className="font-mono text-accent">{pred.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min={-2}
            max={12}
            step={0.1}
            value={pred}
            onChange={(e) => setPred(parseFloat(e.target.value))}
            className="w-full"
          />
        </label>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 font-mono text-sm">
        <Stat label="예측" value={pred.toFixed(1)} />
        <Stat label="오차" value={error.toFixed(2)} />
        <Stat label="손실 (오차²)" value={sqError.toFixed(2)} highlight={Math.abs(error) < 0.3} />
      </div>

      {/* ── 직관 코너: 기울기 → 어느 쪽으로 줄여야 할까 ─────────── */}
      <div className="aside-tip mt-6">
        <div className="font-medium">기울기를 보고 어느 쪽으로 옮기면 손실이 줄까?</div>
        <p className="text-sm mt-2 text-muted">
          이 페이지에서 슬라이더로 움직이는 값은 <strong>모델의 가중치</strong> 역할을 해요
          (가장 단순한 모델 — "가중치를 그대로 예측으로 쓰는 모델"이라 가중치 = 예측).
          위 그래프의 <span style={{ color: 'rgb(251,146,60)' }}>주황색 직선</span>이 지금 가중치에서의 기울기예요.
          포물선의 한 점에서 기울기는 <code>2 × (가중치 − 정답)</code>으로 계산됩니다 — 지금은 <strong className="font-mono">{slope.toFixed(2)}</strong>.
        </p>
        <ul className="text-sm mt-2 space-y-1 list-disc pl-5 text-muted">
          {slope > 0.05 ? (
            <li><strong>기울기 +</strong> → 오른쪽이 오르막. 가중치를 <strong>왼쪽(작은 쪽)</strong>으로 옮기면 손실이 줄어요.</li>
          ) : slope < -0.05 ? (
            <li><strong>기울기 −</strong> → 왼쪽이 오르막. 가중치를 <strong>오른쪽(큰 쪽)</strong>으로 옮기면 손실이 줄어요.</li>
          ) : (
            <li><strong>기울기 ≈ 0</strong> → 거의 골짜기 바닥. 더 줄일 곳이 없어요.</li>
          )}
          <li>그래서 갱신 규칙은 항상 <strong>"기울기의 반대 방향(=빼기)"</strong> 으로 옮기기.</li>
        </ul>
        <div className="card p-3 mt-3 font-mono text-sm bg-bg/60">
          <div className="text-xs text-muted not-italic mb-1" style={{ fontFamily: 'system-ui' }}>
            한 줄로 쓰면:
          </div>
          <div>수정된 가중치 = 지금 가중치 − <span className="text-accent">기울기</span></div>
          <div className="text-muted text-xs not-italic mt-1" style={{ fontFamily: 'system-ui' }}>
            일반화: <code>w ← w − ∂SE/∂w</code> (∂SE/∂w = "SE의 w에 대한 기울기") — 페이즈 5의 자동 학습 출발 식이에요.
          </div>
        </div>
      </div>

      {Math.abs(error) < 0.3 && (
        <div className="aside-tip mt-4">
          정답 근처에 도달했어요. 손실이 0에 가까울수록 모델이 잘 맞힌 거예요.
          기울기도 0에 가까워졌죠 — <strong>기울기 ≈ 0</strong>이 학습 종료 신호입니다.
        </div>
      )}
    </article>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`p-3 rounded-md border ${highlight ? 'border-accent bg-accent-bg' : 'border-border bg-surface/40'}`}>
      <div className="text-xs text-muted">{label}</div>
      <div className={`text-lg ${highlight ? 'text-accent font-semibold' : ''}`}>{value}</div>
    </div>
  );
}
