// PhaseA4 — 기울기 계산하기 (Phase5 탭2 + 탭3 압축)
// 한 viewport (prose, max-w-prose):
//   상: 도입 한 단락
//   중: 좌(샘플 표 — x, y, ŷ, e, e·x + 평균=dw, db) / 우(KaTeX 단계별 유도)
//   하: "x가 큰 샘플일수록 그 가중치 책임이 크다" 직관 한 줄 + A5 안내

import { useEffect, useState } from 'react';
import { BlockMath, InlineMath } from 'react-katex';
import { PHASES } from '../phases';
import { useApp } from '../store';

// 샘플 5개 — 정답 직선은 ŷ = 2x + 1 근처 (현재 모델은 ŷ = w·x + b)
const DATA: [number, number][] = [
  [1, 3], [2, 5], [3, 7], [4, 9], [5, 11],
];

const predict = (w: number, b: number, x: number) => w * x + b;

// ── 유도 단계 (KaTeX) ─────────────────────────────────────
// 미분 표기는 ∂를 쓰되 "기울기"라는 우리말로 부른다.
// 출발: 한 점 SE = (ŷ − y)² → ½을 도입한 L → 사슬규칙 → 깔끔한 e·x.
const DERIV_STEPS: { tex: string; why: string; highlight?: boolean }[] = [
  {
    tex: `\\text{SE} = (\\hat{y} - y)^2`,
    why: '한 점의 오차 제곱. 부호와 무관하게 어긋남의 크기만 본다.',
  },
  {
    tex: `L = \\tfrac{1}{2}(\\hat{y} - y)^2`,
    why: '½ 을 곱해 두면 미분할 때 제곱에서 떨어지는 2와 약분돼 식이 깔끔해져요. 최솟값 위치는 SE와 그대로 같습니다.',
  },
  {
    tex: `\\frac{\\partial L}{\\partial w} = (\\hat{y} - y)\\cdot \\frac{\\partial}{\\partial w}(wx + b - y)`,
    why: '½ × 2 = 1 약분. ŷ = wx + b였으니 안쪽도 풀어 적었다.',
  },
  {
    tex: `\\frac{\\partial L}{\\partial w} = (\\hat{y} - y)\\cdot x = e\\cdot x`,
    why: '안쪽 (wx + b − y)에서 w가 1 변하면 식 전체는 x만큼 변한다 → x가 곱해져 나옴.',
    highlight: true,
  },
  {
    tex: `\\frac{\\partial L}{\\partial b} = (\\hat{y} - y)\\cdot \\frac{\\partial}{\\partial b}(wx + b - y) = (\\hat{y} - y)\\cdot 1 = e`,
    why: 'b 쪽도 똑같이 사슬규칙. 안쪽 (wx + b − y)에서 b가 1 변하면 식 전체는 1만큼 변하니 곱해질 게 없다 → 그대로 e.',
    highlight: true,
  },
  {
    tex: `\\mathrm{dw} = \\overline{e\\cdot x} = \\tfrac{1}{N}\\sum_{i=1}^{N} e_i\\, x_i,\\quad \\mathrm{db} = \\overline{e} = \\tfrac{1}{N}\\sum_{i=1}^{N} e_i`,
    why: '점이 N개면 한 점에서 만든 e·x와 e를 각각 평균낸다. 이 두 숫자가 A3에서 본 보폭 식의 "기울기" 자리에 들어간다.',
    highlight: true,
  },
];

export function PhaseA4() {
  const meta = PHASES.find((p) => p.id === 'a4')!;
  const markCompleted = useApp((s) => s.markCompleted);

  // 학생이 손으로 따라가도록 w, b 슬라이더로 ŷ가 변하게 함 (정답 w=2, b=1).
  const [w, setW] = useState(1.5);
  const [b, setB] = useState(0);

  // 유도는 단계별로 펼치기. 마지막까지 보면 완료 처리.
  const [derivStep, setDerivStep] = useState(1); // 1..STEPS.length

  useEffect(() => {
    if (derivStep >= DERIV_STEPS.length) markCompleted('a4');
  }, [derivStep, markCompleted]);

  const rows = DATA.map(([x, y]) => {
    const yhat = predict(w, b, x);
    const e = yhat - y;
    return { x, y, yhat, e, ex: e * x };
  });
  const sumE = rows.reduce((s, r) => s + r.e, 0);
  const sumEx = rows.reduce((s, r) => s + r.ex, 0);
  const N = rows.length;
  const dw = sumEx / N;
  const db = sumE / N;

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2">
        A3에서 본 갱신 식 <code>w ← w − η · dw</code>의 dw가 어디서 오는지,
        한 번만 손으로 계산해 봅니다. 결론은 단순해요 —{' '}
        <strong className="text-accent">dw = 평균(e · x)</strong>,{' '}
        <strong className="text-accent">db = 평균(e)</strong>.
      </p>

      {/* ── 좌: 표 / 우: 유도 ─────────────────────────────── */}
      <div className="mt-5 grid lg:grid-cols-[1.1fr_1fr] gap-4">
        {/* 좌 — 다섯 점 표 */}
        <div className="card p-3">
          <div className="text-sm font-medium">샘플 다섯 점에서 직접 계산</div>
          <p className="text-[11px] text-muted mt-1">
            슬라이더로 w·b를 움직이면 ŷ과 오차 e, 그리고 e·x가 전부 다시 계산돼요.
          </p>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-[12px] font-mono">
              <thead className="text-muted">
                <tr className="border-b border-border">
                  <th className="text-left py-1">x</th>
                  <th>y</th>
                  <th>ŷ = w·x + b</th>
                  <th style={{ color: 'rgb(190,18,60)' }}>e = ŷ − y</th>
                  <th style={{ color: 'rgb(59,130,246)' }}>e · x</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.x} className="border-b border-border/50">
                    <td className="py-0.5">{r.x}</td>
                    <td className="text-center">{r.y}</td>
                    <td className="text-center text-muted">{r.yhat.toFixed(2)}</td>
                    <td className="text-center" style={{ color: 'rgb(190,18,60)' }}>
                      {r.e >= 0 ? '+' : ''}{r.e.toFixed(2)}
                    </td>
                    <td className="text-center" style={{ color: 'rgb(59,130,246)' }}>
                      {r.ex >= 0 ? '+' : ''}{r.ex.toFixed(2)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={3} className="pt-1.5 text-right text-muted text-[11px]">합계 ÷ {N} →</td>
                  <td className="text-center pt-1.5" style={{ color: 'rgb(190,18,60)', fontWeight: 700 }}>
                    db = {db.toFixed(3)}
                  </td>
                  <td className="text-center pt-1.5" style={{ color: 'rgb(59,130,246)', fontWeight: 700 }}>
                    dw = {dw.toFixed(3)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="block">
              <div className="flex justify-between text-[11px] mb-0.5">
                <span>w</span><span className="font-mono text-accent">{w.toFixed(2)}</span>
              </div>
              <input type="range" min={0} max={3} step={0.05} value={w}
                onChange={(e) => setW(parseFloat(e.target.value))} className="w-full" />
            </label>
            <label className="block">
              <div className="flex justify-between text-[11px] mb-0.5">
                <span>b</span><span className="font-mono text-accent">{b.toFixed(2)}</span>
              </div>
              <input type="range" min={-2} max={3} step={0.05} value={b}
                onChange={(e) => setB(parseFloat(e.target.value))} className="w-full" />
            </label>
          </div>
          <div className="text-[11px] text-muted mt-2 leading-snug">
            정답은 <code>w = 2, b = 1</code>. 그 근처에서 e와 e·x가 모두 0에 가까워지는지 확인해 보세요.
          </div>
        </div>

        {/* 우 — 단계별 유도 (펼치기) */}
        <div className="card p-3">
          <div className="flex items-baseline justify-between">
            <div className="text-sm font-medium">왜 e·x인가 — 한 줄씩</div>
            <div className="text-[11px] text-muted font-mono">
              {Math.min(derivStep, DERIV_STEPS.length)} / {DERIV_STEPS.length}
            </div>
          </div>
          <p className="text-[11px] text-muted mt-1">
            <strong>사슬규칙</strong>: 제곱(겉)의 미분 = 2 · (안), (안 = ŷ − y)을 또 w로 미분하면 x가 떨어진다 → 두 미분이 곱해져 e·x.
            ½과 2가 약분돼 깔끔한 한 줄이 남아요.
          </p>

          <div className="mt-3 space-y-2">
            {DERIV_STEPS.slice(0, derivStep).map((s, i) => (
              <div
                key={i}
                className={`rounded-md border p-2.5 ${
                  s.highlight
                    ? 'border-accent bg-accent-bg/40'
                    : 'border-border bg-surface/40'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className={`shrink-0 w-5 h-5 rounded-full text-[11px] font-mono flex items-center justify-center ${
                    s.highlight ? 'bg-accent text-white' : 'bg-accent/15 text-accent'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`overflow-x-auto text-[14px] ${s.highlight ? 'font-semibold' : ''}`}>
                      <BlockMath math={s.tex} />
                    </div>
                    <div className="text-[11px] text-muted mt-1 leading-snug">{s.why}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-3">
            {derivStep < DERIV_STEPS.length ? (
              <button
                onClick={() => setDerivStep((s) => Math.min(s + 1, DERIV_STEPS.length))}
                className="btn-primary text-sm py-1.5 px-3 flex-1"
              >
                다음 단계 펼치기 →
              </button>
            ) : (
              <div className="aside-tip text-[12px] flex-1 my-0 py-2">
                ✓ 마지막 단계까지 보았어요. 갱신 식의 정체는 <strong>평균(e·x)</strong>와 <strong>평균(e)</strong>.
              </div>
            )}
            {derivStep > 1 && (
              <button
                onClick={() => setDerivStep((s) => Math.max(s - 1, 1))}
                className="btn-ghost text-sm py-1.5 px-3"
              >
                ← 접기
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 직관 박스 ────────────────────────────────────── */}
      <div className="aside-tip mt-4 text-sm">
        <div className="font-medium">한 줄 직관</div>
        <p className="mt-1 text-muted">
          <code>dw = 평균(e · x)</code>의 핵심은 <strong>x가 곱해진다</strong>는 사실이에요 —{' '}
          <strong>x 값이 큰 샘플일수록 그 가중치 w의 변화에 책임을 더 진다</strong>.
          반대로 b 쪽은 입력과 무관하게 모두에게 똑같이 묻는 평균(e).
        </p>
        <div className="mt-2 text-[12px] font-mono text-muted">
          이번 표에서: <InlineMath math="\mathrm{dw}" /> = {dw.toFixed(3)},{' '}
          <InlineMath math="\mathrm{db}" /> = {db.toFixed(3)}
        </div>
      </div>

      <div className="aside-note mt-3 text-sm">
        <strong>다음 A5에서</strong> 이 dw·db에 학습률 η를 곱해 한 step을 돌려요 —{' '}
        예측 → 오차 → 기울기 → 갱신을 한 묶음으로.
      </div>
    </article>
  );
}
