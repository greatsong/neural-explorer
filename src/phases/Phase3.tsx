import { useEffect, useState } from 'react';
import { useApp } from '../store';

type TabId = 'error' | 'square' | 'loss' | 'gd';
const TABS: { id: TabId; num: string; label: string; sub: string }[] = [
  { id: 'error',  num: '1', label: '오차',       sub: '예측이 얼마나 어긋났나 — 부호가 있는 차이' },
  { id: 'square', num: '2', label: '오차 제곱',  sub: '오차의 부호를 없애고 크게 어긋날수록 더 아프게' },
  { id: 'loss',   num: '3', label: '손실함수',   sub: '여러 점의 오차 제곱을 한 숫자로 — 모델이 줄여야 할 값' },
  { id: 'gd',     num: '4', label: '경사하강법', sub: '기울기를 보고 가중치를 옮긴다' },
];

export function Phase3() {
  const TRUE = 5;
  const [pred, setPred] = useState(1);
  const [tab, setTab] = useState<TabId>('error');
  const markCompleted = useApp((s) => s.markCompleted);

  const error = pred - TRUE;
  const sqError = error * error;
  const slope = 2 * (pred - TRUE);

  useEffect(() => {
    if (Math.abs(error) < 0.3) markCompleted('p3');
  }, [error, markCompleted]);

  // 공통 좌표계
  const W = 480, H = 240;
  const xMin = -2, xMax = 12;
  const sx = (x: number) => ((x - xMin) / (xMax - xMin)) * W;

  // 손실 곡선(탭 2·3)
  const yMaxL = 50;
  const syL = (y: number) => H - (y / yMaxL) * H;
  const lossPath = (() => {
    const parts: string[] = [];
    for (let p = -2; p <= 12; p += 0.2) {
      parts.push(`${parts.length === 0 ? 'M' : 'L'}${sx(p)},${syL((p - TRUE) ** 2)}`);
    }
    return parts.join(' ');
  })();
  // 접선(탭 3)
  const tanY = (x: number) => sqError + slope * (x - pred);
  const baseLen = 2.5;
  const dxFromYBound = Math.abs(slope) > 0.01
    ? Math.min((yMaxL - sqError) / Math.abs(slope), sqError / Math.abs(slope))
    : Infinity;
  const tanLen = Math.max(0.3, Math.min(baseLen, dxFromYBound, pred - xMin, xMax - pred));
  const tanX1 = pred - tanLen, tanX2 = pred + tanLen;

  // 오차 직선(탭 1) — y는 부호 있는 오차
  const yMaxE = 7;
  const syE = (y: number) => H / 2 - (y / yMaxE) * (H / 2);
  const errPath = `M${sx(xMin)},${syE(xMin - TRUE)} L${sx(xMax)},${syE(xMax - TRUE)}`;

  const onRight = pred > 7;

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE 3</div>
      <h1>손실함수와 경사하강법의 이해</h1>
      <p className="text-muted mt-2">
        모델 학습의 핵심 흐름을 네 단계로 따라가 봅니다 — <strong>오차 → 오차 제곱 → 손실함수 → 경사하강법</strong>.
        한 번에 어긋남을 측정하고(오차), 그걸 가공해 한 숫자로 모으고(손실함수), 그 숫자를 줄이는 방향으로 가중치를 옮깁니다.
        슬라이더로 예측값을 움직이면서 탭을 순서대로 보세요.
      </p>

      <div className="aside-tip mt-3">
        정답은 <strong>{TRUE}</strong> 입니다.
      </div>

      {/* ── 탭 헤더 ───────────────────────────────────────── */}
      <nav className="mt-4 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-sm border-b-2 -mb-px transition ${
                active
                  ? 'border-accent text-accent font-medium'
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

      {/* ── 탭별 그래프 ──────────────────────────────────── */}
      <svg viewBox={`0 0 ${W + 40} ${H + 40}`} className="w-full max-w-2xl mt-4">
        <g transform="translate(20,10)">
          {tab === 'error' ? (
            <>
              {/* y=0 기준선 + 정답 수직선 */}
              <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="rgb(var(--color-border))" />
              <line x1={sx(TRUE)} y1={0} x2={sx(TRUE)} y2={H} stroke="rgb(var(--color-muted))" strokeDasharray="3 3" />
              <text x={sx(TRUE) + 4} y={14} fontSize={11} fill="rgb(var(--color-muted))">정답</text>
              <text x={4} y={syE(0) - 4} fontSize={11} fill="rgb(var(--color-muted))">오차 0</text>
              {/* 오차 직선 e = ŷ - y */}
              <path d={errPath} stroke="rgb(var(--color-accent))" strokeWidth={2} fill="none" />
              {/* 현재 점에서 0까지 수직선(=오차 크기 시각화) */}
              {Math.abs(error) > 0.02 && (
                <line x1={sx(pred)} y1={syE(0)} x2={sx(pred)} y2={syE(error)}
                  stroke="rgb(251,146,60)" strokeWidth={3} opacity={0.85} />
              )}
              <circle cx={sx(pred)} cy={syE(error)} r={7} fill="rgb(var(--color-accent))" stroke="white" strokeWidth={2} />
              <text
                x={sx(pred) + (onRight ? -10 : 10)}
                y={syE(error) + (error >= 0 ? -10 : 18)}
                fontSize={11}
                textAnchor={onRight ? 'end' : 'start'}
                fill="rgb(var(--color-text))"
              >
                예측 {pred.toFixed(1)} → 오차 {error.toFixed(2)}
              </text>
            </>
          ) : (
            <>
              <line x1={0} y1={H} x2={W} y2={H} stroke="rgb(var(--color-border))" />
              <line x1={sx(TRUE)} y1={0} x2={sx(TRUE)} y2={H} stroke="rgb(var(--color-muted))" strokeDasharray="3 3" />
              <text x={sx(TRUE) + 4} y={14} fontSize={11} fill="rgb(var(--color-muted))">정답</text>
              <path d={lossPath} stroke="rgb(var(--color-accent))" strokeWidth={2} fill="none" />
              {tab === 'gd' && Math.abs(error) > 0.05 && (
                <line
                  x1={sx(tanX1)} y1={syL(tanY(tanX1))}
                  x2={sx(tanX2)} y2={syL(tanY(tanX2))}
                  stroke="rgb(251, 146, 60)" strokeWidth={2} opacity={0.85}
                />
              )}
              <circle cx={sx(pred)} cy={syL(sqError)} r={7} fill="rgb(var(--color-accent))" stroke="white" strokeWidth={2} />
              <text
                x={sx(pred) + (onRight ? -10 : 10)}
                y={syL(sqError) - 6}
                fontSize={11}
                textAnchor={onRight ? 'end' : 'start'}
                fill="rgb(var(--color-text))"
              >
                예측 {pred.toFixed(1)} → 손실 {sqError.toFixed(2)}
              </text>
            </>
          )}
        </g>
      </svg>

      {/* ── 슬라이더(모든 탭 공유) ───────────────────────── */}
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

      {/* ── 수치 카드 — 현재 탭에 맞춰 강조 ─────────────── */}
      <div className="mt-4 grid grid-cols-3 gap-3 font-mono text-sm">
        <Stat label="예측" value={pred.toFixed(1)} highlight={tab === 'error'} />
        <Stat label="부호 있는 오차 e = ŷ − y" value={error.toFixed(2)} highlight={tab === 'error'} />
        <Stat label="손실 (오차²)" value={sqError.toFixed(2)} highlight={tab === 'square' || tab === 'loss' || tab === 'gd'} />
      </div>

      {/* ── 탭 1: 오차 ───────────────────────────────────── */}
      {tab === 'error' && (
        <div className="aside-tip mt-4">
          <div className="font-medium">1. 오차 — 예측이 얼마나 어긋났나</div>
          <p className="text-sm mt-2 text-muted">
            가장 먼저 필요한 건 <strong>예측이 정답에서 얼마나 떨어졌는지</strong>를 숫자로 만드는 일이에요.
            가장 단순한 방법은 그냥 빼는 것 — <code>오차 e = 예측 ŷ − 정답 y</code>.
            위 그래프의 <span style={{ color: 'rgb(251,146,60)' }}>주황색 수직선</span> 길이가 지금 예측의 오차 크기,
            점이 가로축 위에 있으면 +오차, 아래에 있으면 −오차입니다.
          </p>
          <ul className="text-sm mt-2 space-y-1 list-disc pl-5 text-muted">
            <li>예측 = 정답이면 오차 0 (직선이 가로축과 만나는 점).</li>
            <li>예측이 정답보다 작으면 음수, 크면 양수 — <strong>부호로 어느 쪽으로 어긋났는지</strong>까지 알 수 있어요.</li>
            <li>그런데 이 오차를 그대로 손실로 쓰면 문제가 있어요. 다음 탭으로.</li>
          </ul>
        </div>
      )}

      {/* ── 탭 2: 오차 제곱 ──────────────────────────────── */}
      {tab === 'square' && (
        <div className="aside-tip mt-4">
          <div className="font-medium">2. 오차 제곱 — 손실 함수의 정체</div>
          <p className="text-sm mt-2 text-muted">
            오차에 부호가 있으면 여러 점의 오차를 더할 때 +와 −가 상쇄되어 "오차 0"처럼 보일 수 있어요.
            그래서 오차를 <strong>제곱</strong>해서 손실 <code>L = (ŷ − y)²</code>로 씁니다.
            그래프가 직선에서 <strong>포물선</strong>으로 바뀐 게 이 때문이에요.
          </p>
          <ul className="text-sm mt-2 space-y-1 list-disc pl-5 text-muted">
            <li><strong>부호 상쇄 방지</strong> — +3과 −3을 더하면 0이지만, 9 + 9 = 18로 살아남아요.</li>
            <li><strong>큰 오차에 큰 페널티</strong> — 오차 1과 10의 제곱은 1과 100. 모델이 큰 실수부터 줄이게 됩니다.</li>
            <li><strong>매끄러운 곡선</strong> — 다음 탭에서 "어느 쪽이 내리막인지"를 미분으로 정확히 계산할 수 있어요.</li>
          </ul>
        </div>
      )}

      {/* ── 탭 3: 손실함수 ───────────────────────────────── */}
      {tab === 'loss' && (
        <div className="aside-tip mt-4">
          <div className="font-medium">3. 손실함수 — 여러 점의 오차 제곱을 한 숫자로</div>
          <p className="text-sm mt-2 text-muted">
            지금 그래프는 데이터가 한 점(정답 = {TRUE})만 있는 경우라 곡선이 그대로 손실이에요.
            실제 학습에서는 데이터가 여러 개라 <strong>여러 점의 오차 제곱을 모두 모아 한 숫자로 만든 값</strong>을 손실로 써요.
            가장 흔한 방법은 평균:
          </p>
          <div className="card p-3 mt-2 font-mono text-sm bg-bg/60">
            <div>손실 L = (오차₁² + 오차₂² + … + 오차ₙ²) ÷ n</div>
            <div className="text-muted text-xs not-italic mt-1" style={{ fontFamily: 'system-ui' }}>
              모든 데이터에서 모델이 얼마나 틀렸는지를 한 숫자로 요약한 값이에요.
            </div>
          </div>
          <ul className="text-sm mt-3 space-y-1 list-disc pl-5 text-muted">
            <li>모델이 잘 맞히면 L이 작고, 많이 틀리면 L이 커요.</li>
            <li>학습 = <strong>이 L을 최대한 작게 만드는 가중치를 찾는 일</strong>.</li>
            <li>그럼 어느 쪽으로 가중치를 옮겨야 L이 줄어들까? — 다음 탭으로.</li>
          </ul>
        </div>
      )}

      {/* ── 탭 4: 경사하강법 ─────────────────────────────── */}
      {tab === 'gd' && (
        <div className="aside-tip mt-4">
          <div className="font-medium">4. 경사하강법 — 기울기로 가중치를 옮긴다</div>
          <p className="text-sm mt-2 text-muted">
            손실 곡선이 매끄러운 포물선이 됐으니, 한 점에서의 <strong>기울기</strong>
            (<span style={{ color: 'rgb(251,146,60)' }}>주황색 접선</span>)를 보면 어느 쪽이 내리막인지 알 수 있어요.
            지금 기울기는 <strong className="font-mono">{slope.toFixed(2)}</strong>.
          </p>
          <ul className="text-sm mt-2 space-y-1 list-disc pl-5 text-muted">
            <li className={slope > 0.05 ? 'text-accent font-medium' : ''}>
              <strong>기울기 +</strong> (양수) → 오른쪽이 오르막. 가중치를 <strong>왼쪽(작은 쪽)</strong>으로 옮기면 손실이 줄어요.
              {slope > 0.05 && <span className="ml-1 text-xs">← 지금</span>}
            </li>
            <li className={slope < -0.05 ? 'text-accent font-medium' : ''}>
              <strong>기울기 −</strong> (음수) → 왼쪽이 오르막. 가중치를 <strong>오른쪽(큰 쪽)</strong>으로 옮기면 손실이 줄어요.
              {slope < -0.05 && <span className="ml-1 text-xs">← 지금</span>}
            </li>
            <li className={Math.abs(slope) <= 0.05 ? 'text-accent font-medium' : ''}>
              <strong>기울기 ≈ 0</strong> → 거의 골짜기 바닥. 더 줄일 곳이 없어요(학습 종료 신호).
              {Math.abs(slope) <= 0.05 && <span className="ml-1 text-xs">← 지금</span>}
            </li>
            <li>어느 쪽이든 갱신 규칙은 같아요 — <strong>"기울기의 반대 방향(=빼기)"</strong>, 한 번에 얼마나 옮길지는 <strong>학습률</strong>로 정합니다.</li>
          </ul>
          <div className="card p-3 mt-3 font-mono text-sm bg-bg/60">
            <div className="text-xs text-muted not-italic mb-1" style={{ fontFamily: 'system-ui' }}>
              한 줄로 쓰면:
            </div>
            <div>새 가중치 = 지금 가중치 − 학습률 × <span className="text-accent">기울기</span></div>
            <div className="text-muted text-xs not-italic mt-2" style={{ fontFamily: 'system-ui' }}>
              컴퓨터가 이 갱신을 매 스텝 자동으로 수행하면서 손실을 줄여 나가요. 다음 페이즈(학습률·오차 역전파)에서 이어집니다.
            </div>
          </div>
        </div>
      )}

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
