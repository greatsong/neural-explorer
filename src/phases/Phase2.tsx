import { useState } from 'react';
import { useApp } from '../store';

interface Q {
  x1: number; x2: number; w1: number; w2: number; b: number;
}

const QUESTIONS: Q[] = [
  { x1: 2, x2: 3, w1: 1, w2: 2, b: -1 },   // 2+6-1 = 7 → ReLU 7
  { x1: 4, x2: 1, w1: -1, w2: 3, b: 2 },   // -4+3+2 = 1 → ReLU 1
  { x1: 5, x2: 2, w1: -2, w2: -1, b: 3 },  // -10-2+3 = -9 → ReLU 0
];

const relu = (x: number) => Math.max(0, x);
const answer = (q: Q) => relu(q.x1 * q.w1 + q.x2 * q.w2 + q.b);

export function Phase2() {
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState('');
  const [tries, setTries] = useState(0);
  const [solved, setSolved] = useState<boolean[]>([false, false, false]);
  const [showHint, setShowHint] = useState(false);
  const markCompleted = useApp((s) => s.markCompleted);

  const q = QUESTIONS[idx];
  const correct = answer(q);

  const submit = () => {
    const v = parseFloat(input);
    if (isNaN(v)) return;
    if (Math.abs(v - correct) < 0.001) {
      const next = [...solved];
      next[idx] = true;
      setSolved(next);
      if (next.every(Boolean)) markCompleted('p2');
    } else {
      setTries(tries + 1);
    }
  };

  const goNext = () => {
    if (idx < QUESTIONS.length - 1) {
      setIdx(idx + 1);
      setInput('');
      setTries(0);
      setShowHint(false);
    }
  };

  const isSolved = solved[idx];
  const sum = q.x1 * q.w1 + q.x2 * q.w2 + q.b;

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE 2</div>
      <h1>순전파 퀴즈</h1>
      <p className="text-muted mt-2">
        뉴런이 출력하는 값을 직접 계산해보세요. 곱셈 → 합산 → ReLU 순서예요.
      </p>

      <div className="flex gap-2 mt-6">
        {QUESTIONS.map((_, i) => (
          <button
            key={i}
            onClick={() => { setIdx(i); setInput(''); setTries(0); setShowHint(false); }}
            className={`w-10 h-10 rounded-md border text-sm font-mono ${
              idx === i ? 'border-accent text-accent' : 'border-border text-muted'
            } ${solved[i] ? 'bg-accent-bg' : ''}`}
          >
            {solved[i] ? '✓' : i + 1}
          </button>
        ))}
      </div>

      <div className="card p-6 mt-6">
        <div className="font-mono text-sm space-y-1">
          <div>입력: x₁ = {q.x1}, x₂ = {q.x2}</div>
          <div>가중치: w₁ = {q.w1}, w₂ = {q.w2}</div>
          <div>편향: b = {q.b}</div>
          <div className="text-muted mt-3">
            y = ReLU(w₁·x₁ + w₂·x₂ + b) = ?
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <input
            type="number"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            disabled={isSolved}
            placeholder="정답 입력"
            className="flex-1 px-3 py-2 rounded-md border border-border bg-bg font-mono"
          />
          <button onClick={submit} disabled={isSolved} className="btn-primary disabled:opacity-50">
            확인
          </button>
        </div>

        {!isSolved && tries >= 1 && (
          <div className="mt-3 text-sm text-amber-600 dark:text-amber-400">
            아직 정답이 아니에요. 다시 한 번 천천히 계산해보세요.
            {tries >= 2 && (
              <button onClick={() => setShowHint(true)} className="ml-2 underline">
                힌트 보기
              </button>
            )}
          </div>
        )}

        {showHint && !isSolved && (
          <div className="aside-note mt-3 font-mono text-sm">
            <div>1단계: w₁·x₁ = {q.w1} × {q.x1} = {q.w1 * q.x1}</div>
            <div>2단계: w₂·x₂ = {q.w2} × {q.x2} = {q.w2 * q.x2}</div>
            <div>3단계: 합산 + b = {q.w1 * q.x1} + {q.w2 * q.x2} + ({q.b}) = {sum}</div>
            <div>4단계: ReLU({sum}) = {sum < 0 ? `0 (음수라서)` : sum}</div>
          </div>
        )}

        {isSolved && (
          <div className="aside-tip mt-3">
            <div className="font-medium">정답입니다! 🎉</div>
            <div className="font-mono text-sm mt-2 space-y-0.5">
              <div>w₁·x₁ + w₂·x₂ + b = {q.w1 * q.x1} + {q.w2 * q.x2} + ({q.b}) = {sum}</div>
              <div>ReLU({sum}) = {correct}</div>
            </div>
            {idx < QUESTIONS.length - 1 && (
              <button onClick={goNext} className="btn-primary mt-3">
                다음 문제 →
              </button>
            )}
            {idx === QUESTIONS.length - 1 && solved.every(Boolean) && (
              <div className="mt-3 text-sm text-muted">
                3문제 모두 해결! 다음 페이즈로 이동하세요.
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
