// PhaseB5 — 다중 분류와 소프트맥스
// 동그라미·세모·네모 3종으로 확장. 출력 뉴런 3개 + softmax.
// 좌측: softmax 시각화(슬라이더 3개로 z 조작 → 막대 3개 + 합 100%).
//   - winner-take-most: 한 슬라이더만 크게 올리면 해당 막대만 자라고 나머지는 빠르게 짧아진다.
//   - 시프트 불변: 세 슬라이더를 같은 양만큼 올리면 막대가 변하지 않는다.
// 우측: 학습 패널 — activeTrain 3종 데이터로 학습 → setMultiModel 저장.

import { useEffect, useMemo, useRef, useState } from 'react';
import { PHASES } from '../phases';
import { useApp } from '../store';
import {
  useDot,
  useActiveTrain,
  useActiveEval,
  trainLinearClassifier,
  evaluateAccuracy,
} from '../dotStore';
import type { MultiModel } from '../dotStore';
import { SHAPE_LABEL_KO, SHAPE_LABELS } from '../data/dotShapes';

const COLORS = {
  circle: 'rgb(249,115,22)',     // 주황
  triangle: 'rgb(190,18,60)',    // 빨강
  square: 'rgb(59,130,246)',     // 파랑
  green: 'rgb(16,185,129)',
};

function softmax(z: number[]): number[] {
  const m = Math.max(...z);
  const exps = z.map((v) => Math.exp(v - m));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

export function PhaseB5() {
  const meta = PHASES.find((p) => p.id === 'b5')!;
  const markCompleted = useApp((s) => s.markCompleted);
  const setMultiModel = useDot((s) => s.setMultiModel);
  const multiModel = useDot((s) => s.multiModel);

  // 학습/평가 데이터
  const trainSamples = useActiveTrain();
  const evalSamples = useActiveEval();

  /* ───── 좌측: softmax 슬라이더 ───── */
  const [z, setZ] = useState<[number, number, number]>([0, 0, 0]);
  const probs = useMemo(() => softmax(z), [z]);

  // 시프트 불변 관찰: 세 슬라이더 동시 ±1 버튼을 한 번이라도 누르면 관찰로 간주.
  const [shiftObserved, setShiftObserved] = useState(false);
  const [sliderTouched, setSliderTouched] = useState(false);

  const setZi = (i: 0 | 1 | 2, v: number) => {
    setZ((cur) => {
      const next = [...cur] as [number, number, number];
      next[i] = v;
      return next;
    });
    setSliderTouched(true);
  };

  const shiftAll = (delta: number) => {
    setZ((cur) => {
      const next = cur.map((v) => Math.max(-5, Math.min(5, v + delta))) as [number, number, number];
      return next;
    });
    setShiftObserved(true);
    setSliderTouched(true);
  };

  /* ───── 우측: 학습 패널 ───── */
  const [epochs, setEpochs] = useState(80);
  const [lr, setLr] = useState(0.05);
  const [training, setTraining] = useState(false);
  const [trainAcc, setTrainAcc] = useState<number | null>(
    multiModel ? multiModel.trainAccuracy : null
  );
  const [evalAcc, setEvalAcc] = useState<number | null>(
    multiModel ? multiModel.evalAccuracy : null
  );
  const trainCountRef = useRef(0);

  const startTrain = () => {
    setTraining(true);
    // 다음 프레임에 무거운 학습 시작 — UI freeze 최소화
    setTimeout(() => {
      const labels = SHAPE_LABELS; // ['circle','triangle','square']
      const samples = trainSamples.filter((s) => labels.includes(s.label));
      const { w, b } = trainLinearClassifier(samples, labels, epochs, lr);
      const trainEval = evaluateAccuracy(samples, labels, w, b);
      const evalRes = evaluateAccuracy(evalSamples, labels, w, b);

      const model: MultiModel = {
        labels: [labels[0], labels[1], labels[2]],
        w,
        b,
        trainedSteps: epochs,
        trainAccuracy: trainEval.accuracy,
        evalAccuracy: evalRes.accuracy,
      };
      setMultiModel(model);
      setTrainAcc(trainEval.accuracy);
      setEvalAcc(evalRes.accuracy);
      trainCountRef.current += 1;
      setTraining(false);
    }, 30);
  };

  /* ───── 완료 처리 ─────
     단순 기준: 학습 1회 + 슬라이더 1회 이상.
     보너스 기준: train accuracy ≥ 90% + 시프트 불변 1회 관찰. */
  useEffect(() => {
    const trainedOnce = trainCountRef.current > 0 && trainAcc !== null;
    if (trainedOnce && sliderTouched) {
      markCompleted('b5');
    }
    if (trainAcc !== null && trainAcc >= 0.9 && shiftObserved) {
      markCompleted('b5');
    }
  }, [trainAcc, sliderTouched, shiftObserved, markCompleted]);

  /* ───── 막대 / 슬라이더 / 다이어그램 헬퍼 ───── */
  const colorOf = (i: 0 | 1 | 2) =>
    i === 0 ? COLORS.circle : i === 1 ? COLORS.triangle : COLORS.square;

  const barRow = (i: 0 | 1 | 2) => {
    const lbl = SHAPE_LABELS[i];
    const color = colorOf(i);
    const pct = probs[i] * 100;
    return (
      <div key={lbl} className="flex items-center gap-3">
        <div className="w-20 text-sm" style={{ color }}>{SHAPE_LABEL_KO[lbl]}</div>
        <div className="flex-1 h-6 rounded bg-surface border border-border overflow-hidden relative">
          <div
            className="h-full transition-all duration-200"
            style={{ width: `${pct.toFixed(2)}%`, background: color, opacity: 0.85 }}
          />
        </div>
        <div className="w-14 text-right font-mono text-sm tabular-nums">{pct.toFixed(1)}%</div>
      </div>
    );
  };

  const sliderRow = (i: 0 | 1 | 2) => {
    const lbl = SHAPE_LABELS[i];
    const color = colorOf(i);
    return (
      <div key={lbl} className="flex items-center gap-3">
        <div className="w-20 text-sm" style={{ color }}>{SHAPE_LABEL_KO[lbl]}</div>
        <input
          type="range"
          min={-5}
          max={5}
          step={0.1}
          value={z[i]}
          onChange={(e) => setZi(i, Number(e.target.value))}
          className="flex-1"
          style={{ accentColor: color }}
        />
        <div className="w-14 text-right font-mono text-sm tabular-nums">{z[i].toFixed(1)}</div>
      </div>
    );
  };

  // 출력 뉴런 다이어그램 (좌→우: 라벨 → 노드 → 막대 영역)
  const Diagram = () => (
    <svg viewBox="0 0 320 130" className="w-full" role="img" aria-label="출력 뉴런 3개 다이어그램">
      {SHAPE_LABELS.map((lbl, i) => {
        const color = colorOf(i as 0 | 1 | 2);
        const cy = 25 + i * 35;
        return (
          <g key={lbl}>
            <line x1={60} y1={cy} x2={120} y2={cy} stroke={color} strokeWidth={1.5} opacity={0.5} />
            <circle cx={140} cy={cy} r={14} fill="white" stroke={color} strokeWidth={2} />
            <text x={140} y={cy + 4} textAnchor="middle" fontSize={11} fill={color} fontWeight={600}>z{i + 1}</text>
            <text x={6} y={cy + 4} fontSize={11} fill={color}>{SHAPE_LABEL_KO[lbl]}</text>
            <line x1={154} y1={cy} x2={300} y2={cy} stroke={color} strokeWidth={1.5} opacity={0.4} strokeDasharray="2 3" />
          </g>
        );
      })}
      <text x={160} y={125} textAnchor="middle" fontSize={11} fill="rgb(92,96,102)">
        z 점수 → softmax → 확률 막대
      </text>
    </svg>
  );

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2">{meta.subtitle}</p>

      {/* 도입 단락 */}
      <p className="mt-6">
        B4까지는 두 종류(동그라미·세모)만 봤어요. 이번엔 <strong>네모까지 3종</strong>으로 늘립니다.
        출력 뉴런이 2개 → 3개로 늘어나면, 점수를 어떻게 "서로 경쟁하는 확률"로 바꿀지 다시 생각해야 해요.
      </p>

      <div className="grid lg:grid-cols-2 gap-5 mt-6">
        {/* 좌: softmax 시각화 */}
        <section className="card p-4">
          <h3 className="!mt-0">출력 뉴런 3개 — 점수 z를 확률로</h3>

          <div className="mt-2"><Diagram /></div>

          {/* 상단 박스 — 슬라이더 위 라벨 */}
          <div className="aside-note text-sm">
            <div className="font-mono">
              z = 출력 뉴런이 가중합으로 만든 점수 (아직 확률 아님)
            </div>
          </div>

          {/* 슬라이더 3 */}
          <div className="space-y-2 mt-3">
            {sliderRow(0)}
            {sliderRow(1)}
            {sliderRow(2)}
          </div>

          {/* 시프트 액션 버튼 */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <button className="btn-ghost text-xs" onClick={() => shiftAll(1)} type="button">
              세 슬라이더 동시 +1
            </button>
            <button className="btn-ghost text-xs" onClick={() => shiftAll(-1)} type="button">
              세 슬라이더 동시 −1
            </button>
            <button
              className="btn-ghost text-xs"
              onClick={() => { setZ([0, 0, 0]); setSliderTouched(true); }}
              type="button"
            >
              0으로 리셋
            </button>
          </div>

          {/* 막대 + 합 100% */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted">확률 막대</div>
              <div className="text-sm font-mono" style={{ color: COLORS.green }}>합 = 100%</div>
            </div>
            <div className="space-y-2">
              {barRow(0)}
              {barRow(1)}
              {barRow(2)}
            </div>
          </div>

          {/* 캡션 */}
          <div className="aside-tip text-sm mt-4 leading-7">
            한 클래스 점수를 <em>크게</em> 올릴수록 다른 두 클래스의 확률이 빠르게 작아져요 — 큰 점수가 더 큰 비율로 자리를 차지합니다(1등 독식). 세 막대 길이의 합은 항상 100%. 이렇게 점수를 "서로 경쟁하는 확률"로 바꿔 주는 것이 <strong>소프트맥스(softmax)</strong> 예요.
            <br /><br />
            실제 학습에서는 이 점수 z를 사람이 아니라 가중치가 만들고, 가중치는 A에서 본 경사하강법으로 고쳐져요.
          </div>
        </section>

        {/* 우: 학습 패널 */}
        <section className="card p-4">
          <h3 className="!mt-0">3종 분류 모델 학습</h3>
          <p className="text-sm text-muted mt-1">
            B3에서 나눈 학습 데이터(동그라미·세모·네모)로 출력 뉴런 3개짜리 모델을 훈련합니다.
          </p>

          <div className="mt-4 space-y-3">
            <label className="block">
              <div className="flex justify-between text-sm">
                <span>epoch (반복 횟수)</span>
                <span className="font-mono tabular-nums">{epochs}</span>
              </div>
              <input
                type="range" min={20} max={200} step={10}
                value={epochs}
                onChange={(e) => setEpochs(Number(e.target.value))}
                className="w-full"
                disabled={training}
              />
            </label>
            <label className="block">
              <div className="flex justify-between text-sm">
                <span>학습률 η</span>
                <span className="font-mono tabular-nums">{lr.toFixed(3)}</span>
              </div>
              <input
                type="range" min={0.01} max={0.3} step={0.005}
                value={lr}
                onChange={(e) => setLr(Number(e.target.value))}
                className="w-full"
                disabled={training}
              />
            </label>
          </div>

          <button
            className="btn-primary mt-4"
            onClick={startTrain}
            disabled={training}
            type="button"
          >
            {training ? '학습 중…' : '3종 학습 시작'}
          </button>

          {/* 결과 */}
          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="card p-3 text-center">
              <div className="text-xs text-muted">학습 정확도</div>
              <div className="text-3xl font-semibold tabular-nums" style={{ color: COLORS.green }}>
                {trainAcc === null ? '—' : `${(trainAcc * 100).toFixed(1)}%`}
              </div>
            </div>
            <div className="card p-3 text-center">
              <div className="text-xs text-muted">평가 정확도</div>
              <div className="text-3xl font-semibold tabular-nums" style={{ color: COLORS.square }}>
                {evalAcc === null ? '—' : `${(evalAcc * 100).toFixed(1)}%`}
              </div>
            </div>
          </div>

          {trainAcc !== null && trainAcc >= 0.9 && (
            <div className="aside-tip text-sm mt-3">
              학습 정확도 90% 이상 달성 — 모델이 세 종류를 충분히 잘 구분해요.
            </div>
          )}
        </section>
      </div>

      {/* 하단: 보너스 관찰 + cross-entropy 한 줄 */}
      <div className="grid lg:grid-cols-2 gap-5 mt-6">
        <div className="aside-note text-sm">
          <div className="font-medium mb-1">보너스 관찰</div>
          세 슬라이더를 <em>같은 양만큼</em> 올려 보세요 — 막대가 변하지 않아요. 차이만 중요해요.
          {shiftObserved && (
            <div className="mt-2 font-mono text-xs" style={{ color: COLORS.green }}>
              관찰됨 ✓ — 시프트 불변 확인
            </div>
          )}
        </div>
        <div className="aside-tip text-sm leading-7">
          정답 클래스의 막대를 1쪽으로 끌어올릴수록 작아지는 손실이 <strong>교차 엔트로피(cross-entropy)</strong> 예요 — 회귀에서 MSE가 했던 일을, 분류에서는 이 손실이 맡습니다.
        </div>
      </div>
    </article>
  );
}
