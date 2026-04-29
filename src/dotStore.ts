// 도트 데이터 공유 store — B 영역(B2~B5)과 C1이 같은 데이터 흐름을 이어받는다.
// 핵심: 학생이 B2에서 정제·플래그한 결과가 B3 분할 → B4/B5 학습 → C1 평가까지
// 그대로 흘러간다. 페이즈 사이에서 캔버스를 다시 그릴 필요가 없다.

import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DOT_SAMPLES_DEFAULT, type DotSample, type ShapeLabel } from './data/dotShapes';
import { forward, type MLP } from './lib/nn';

/* ───── 결정론적 split — 시드 고정으로 매번 같은 train/eval 묶음 ───── */
function deterministicSplit(samples: DotSample[], seed = 42, evalRatio = 0.25): {
  trainIds: string[]; evalIds: string[];
} {
  let s = seed;
  const rnd = () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
  // 라벨별로 균등 분할 (계층 샘플링)
  const byLabel = new Map<ShapeLabel, string[]>();
  samples.forEach((sm) => {
    const list = byLabel.get(sm.label) ?? [];
    list.push(sm.id);
    byLabel.set(sm.label, list);
  });
  const trainIds: string[] = [];
  const evalIds: string[] = [];
  byLabel.forEach((ids) => {
    // 시드 고정 셔플
    const arr = [...ids];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const evalCount = Math.max(1, Math.round(arr.length * evalRatio));
    evalIds.push(...arr.slice(0, evalCount));
    trainIds.push(...arr.slice(evalCount));
  });
  return { trainIds, evalIds };
}

/* ───── 학습 결과 — 가짜 시뮬레이션이 아닌 *진짜* 학습 모델 ─────
   B4/B5/C2/C3는 src/lib/nn.ts의 MLP를 직접 학습해 mlp 필드에 저장한다.
   기존 코드 호환을 위해 w/b 필드도 남겨 두지만(평탄화된 마지막 층 가중치),
   forward/predict는 mlp 필드가 있으면 그것을 우선 사용한다. */
export interface BinaryModel { // B4: 두 라벨 (circle vs triangle)
  labels: [ShapeLabel, ShapeLabel];
  // 출력 뉴런 2개 — 옛 형식 호환 (선형 학습 결과). mlp가 있으면 mlp 우선 사용.
  w: number[][]; // shape: [C][D]
  b: number[];   // length C
  mlp?: MLP;     // 진짜 학습된 MLP (nn.ts createDeepMLP/trainStep 결과)
  trainedSteps: number;
  trainAccuracy: number;
  evalAccuracy: number;
}

export interface MultiModel { // B5: 세 라벨 (circle, triangle, square)
  labels: [ShapeLabel, ShapeLabel, ShapeLabel];
  w: number[][];
  b: number[];
  mlp?: MLP;
  trainedSteps: number;
  trainAccuracy: number;
  evalAccuracy: number;
}

interface DotState {
  samples: DotSample[];
  removedIds: Set<string>;       // B2에서 학생이 "제외"한 샘플 (노이즈/오라벨 의심)
  splitSeed: number;
  evalRatio: number;             // B3에서 학생이 조절. 0.10 ~ 0.50
  trainIds: string[];
  evalIds: string[];
  binaryModel: BinaryModel | null;
  multiModel: MultiModel | null;

  toggleRemove: (id: string) => void;
  resetRemoved: () => void;
  setEvalRatio: (r: number) => void;  // 비율 변경 시 trainIds/evalIds 재생성 + 학습된 모델 무효화
  setBinaryModel: (m: BinaryModel | null) => void;
  setMultiModel: (m: MultiModel | null) => void;
  resetAll: () => void;
}

const DEFAULT_EVAL_RATIO = 0.25;

function makeInitial(evalRatio = DEFAULT_EVAL_RATIO) {
  const samples = DOT_SAMPLES_DEFAULT;
  const { trainIds, evalIds } = deterministicSplit(samples, 42, evalRatio);
  return { samples, trainIds, evalIds };
}

export const useDot = create<DotState>()(
  persist(
    (set) => {
      const init = makeInitial();
      return {
        samples: init.samples,
        removedIds: new Set<string>(),
        splitSeed: 42,
        evalRatio: DEFAULT_EVAL_RATIO,
        trainIds: init.trainIds,
        evalIds: init.evalIds,
        binaryModel: null,
        multiModel: null,
        toggleRemove: (id) => set((s) => {
          const next = new Set(s.removedIds);
          if (next.has(id)) next.delete(id); else next.add(id);
          return { removedIds: next };
        }),
        resetRemoved: () => set({ removedIds: new Set() }),
        setEvalRatio: (r) => set((s) => {
          const clamped = Math.max(0.05, Math.min(0.5, r));
          // 비율 변경 → 시드 동일하게 분할 재생성 → 학습된 모델은 분할에 의존하므로 무효화
          const { trainIds, evalIds } = deterministicSplit(s.samples, s.splitSeed, clamped);
          return {
            evalRatio: clamped,
            trainIds,
            evalIds,
            binaryModel: null,
            multiModel: null,
          };
        }),
        setBinaryModel: (m) => set({ binaryModel: m }),
        setMultiModel: (m) => set({ multiModel: m }),
        resetAll: () => {
          const init = makeInitial();
          set({
            samples: init.samples,
            removedIds: new Set(),
            trainIds: init.trainIds,
            evalIds: init.evalIds,
            binaryModel: null,
            multiModel: null,
          });
        },
      };
    },
    {
      name: 'neural-explorer-dot-v1',
      partialize: (s) => ({
        removedIds: Array.from(s.removedIds),
        binaryModel: s.binaryModel,
        multiModel: s.multiModel,
      }),
      merge: (persisted, current) => {
        // localStorage에 저장된 removedIds는 array로 옴 → Set으로 복원
        const p = persisted as { removedIds?: string[]; binaryModel?: BinaryModel | null; multiModel?: MultiModel | null };
        return {
          ...current,
          removedIds: new Set(p?.removedIds ?? []),
          binaryModel: p?.binaryModel ?? null,
          multiModel: p?.multiModel ?? null,
        };
      },
    }
  )
);

/* ───── 셀렉터 헬퍼 ─────
   removed 후 active 샘플과, train/eval 분할 ID를 적용해 active 데이터 가져오기.
   ※ 주의 — 이 함수들은 *매번 새 배열*을 만든다. zustand selector로 직접 넘기면
   getSnapshot 무한 루프가 생긴다. 컴포넌트에서는 아래 useActive* 훅을 써라. */
export function activeSamples(state: { samples: DotSample[]; removedIds: Set<string> }): DotSample[] {
  return state.samples.filter((s) => !state.removedIds.has(s.id));
}

export function activeTrain(state: { samples: DotSample[]; removedIds: Set<string>; trainIds: string[] }): DotSample[] {
  const idSet = new Set(state.trainIds);
  return state.samples.filter((s) => idSet.has(s.id) && !state.removedIds.has(s.id));
}

export function activeEval(state: { samples: DotSample[]; removedIds: Set<string>; evalIds: string[] }): DotSample[] {
  const idSet = new Set(state.evalIds);
  return state.samples.filter((s) => idSet.has(s.id) && !state.removedIds.has(s.id));
}

/* ───── 안정 hook — 컴포넌트에서 권장되는 사용법 ─────
   atomic 필드만 zustand로 구독하고 derived 결과는 useMemo로 캐시한다. */
export function useActiveSamples(): DotSample[] {
  const samples = useDot((s) => s.samples);
  const removedIds = useDot((s) => s.removedIds);
  return useMemo(() => activeSamples({ samples, removedIds }), [samples, removedIds]);
}

export function useActiveTrain(): DotSample[] {
  const samples = useDot((s) => s.samples);
  const removedIds = useDot((s) => s.removedIds);
  const trainIds = useDot((s) => s.trainIds);
  return useMemo(() => activeTrain({ samples, removedIds, trainIds }), [samples, removedIds, trainIds]);
}

export function useActiveEval(): DotSample[] {
  const samples = useDot((s) => s.samples);
  const removedIds = useDot((s) => s.removedIds);
  const evalIds = useDot((s) => s.evalIds);
  return useMemo(() => activeEval({ samples, removedIds, evalIds }), [samples, removedIds, evalIds]);
}

/* ───── 단순 분류 학습 — softmax + cross-entropy gradient descent ─────
   B4(2클래스), B5(3클래스), C3 은닉층 모델 모두 같은 패턴이라 helper 제공 */
export function trainLinearClassifier(
  samples: DotSample[],
  labels: ShapeLabel[],
  epochs = 60,
  lr = 0.05,
): { w: number[][]; b: number[]; lossHistory: number[]; accuracyHistory: number[] } {
  const C = labels.length;
  const D = 64;
  const w: number[][] = Array.from({ length: C }, () => new Array(D).fill(0));
  const b: number[] = new Array(C).fill(0);
  const lossHistory: number[] = [];
  const accuracyHistory: number[] = [];

  const labelIdx = (lbl: ShapeLabel) => labels.indexOf(lbl);
  const train = samples.filter((s) => labels.includes(s.label));
  if (train.length === 0) return { w, b, lossHistory, accuracyHistory };

  for (let ep = 0; ep < epochs; ep++) {
    let lossSum = 0;
    let correct = 0;
    const dw: number[][] = Array.from({ length: C }, () => new Array(D).fill(0));
    const db: number[] = new Array(C).fill(0);

    for (const s of train) {
      const tIdx = labelIdx(s.label);
      // logits
      const z = new Array(C).fill(0);
      for (let c = 0; c < C; c++) {
        let zc = b[c];
        for (let i = 0; i < D; i++) zc += w[c][i] * s.pixels[i];
        z[c] = zc;
      }
      // softmax
      const maxZ = Math.max(...z);
      const exps = z.map((zi) => Math.exp(zi - maxZ));
      const sumExp = exps.reduce((a, v) => a + v, 0);
      const p = exps.map((e) => e / sumExp);
      // cross-entropy
      lossSum += -Math.log(Math.max(p[tIdx], 1e-12));
      // accuracy
      let pred = 0; for (let c = 1; c < C; c++) if (p[c] > p[pred]) pred = c;
      if (pred === tIdx) correct += 1;
      // gradient (softmax + CE)
      for (let c = 0; c < C; c++) {
        const grad = p[c] - (c === tIdx ? 1 : 0);
        for (let i = 0; i < D; i++) dw[c][i] += grad * s.pixels[i];
        db[c] += grad;
      }
    }

    const N = train.length;
    for (let c = 0; c < C; c++) {
      for (let i = 0; i < D; i++) w[c][i] -= lr * (dw[c][i] / N);
      b[c] -= lr * (db[c] / N);
    }

    lossHistory.push(lossSum / N);
    accuracyHistory.push(correct / N);
  }

  return { w, b, lossHistory, accuracyHistory };
}

/* 모델 적용 — 새 샘플에 softmax 확률을 매긴다 */
export function classify(
  pixels: number[],
  w: number[][],
  b: number[],
): { probs: number[]; pred: number; logits: number[] } {
  const C = w.length;
  const z = new Array(C).fill(0);
  for (let c = 0; c < C; c++) {
    let zc = b[c];
    for (let i = 0; i < 64; i++) zc += w[c][i] * pixels[i];
    z[c] = zc;
  }
  const maxZ = Math.max(...z);
  const exps = z.map((zi) => Math.exp(zi - maxZ));
  const sumExp = exps.reduce((a, v) => a + v, 0);
  const probs = exps.map((e) => e / sumExp);
  let pred = 0;
  for (let c = 1; c < C; c++) if (probs[c] > probs[pred]) pred = c;
  return { probs, pred, logits: z };
}

export function evaluateAccuracy(
  samples: DotSample[],
  labels: ShapeLabel[],
  w: number[][],
  b: number[],
): { correct: number; total: number; accuracy: number; mistakes: { id: string; trueLabel: ShapeLabel; predLabel: ShapeLabel }[] } {
  const filtered = samples.filter((s) => labels.includes(s.label));
  let correct = 0;
  const mistakes: { id: string; trueLabel: ShapeLabel; predLabel: ShapeLabel }[] = [];
  for (const s of filtered) {
    const { pred } = classify(s.pixels, w, b);
    const trueIdx = labels.indexOf(s.label);
    if (pred === trueIdx) correct += 1;
    else mistakes.push({ id: s.id, trueLabel: s.label, predLabel: labels[pred] });
  }
  return { correct, total: filtered.length, accuracy: filtered.length === 0 ? 0 : correct / filtered.length, mistakes };
}

/* ───── 진짜 MLP 모델용 헬퍼 (B4·B5·C1 권장) ─────
   nn.ts의 MLP가 mlp 필드에 저장된 모델에 대해 forward·classify·evaluate를 일관되게 적용.
   기존 classify/evaluateAccuracy는 옛 선형 형식(w, b)을 그대로 받지만,
   새 페이즈는 아래 두 함수만 쓰는 것을 권장한다. */
export function classifyMLP(
  pixels: number[],
  mlp: MLP,
): { probs: number[]; pred: number; logits: number[] } {
  const x = new Float32Array(pixels);
  const fr = forward(mlp, x);
  const probs = Array.from(fr.probs);
  const logits = Array.from(fr.logits);
  let pred = 0;
  for (let c = 1; c < probs.length; c++) if (probs[c] > probs[pred]) pred = c;
  return { probs, pred, logits };
}

/* BinaryModel/MultiModel 객체를 받아 자동으로 mlp/선형 분기 */
export function classifyModel(
  pixels: number[],
  model: BinaryModel | MultiModel,
): { probs: number[]; pred: number; logits: number[] } {
  if (model.mlp) return classifyMLP(pixels, model.mlp);
  return classify(pixels, model.w, model.b);
}

export function evaluateModel(
  samples: DotSample[],
  model: BinaryModel | MultiModel,
): {
  correct: number; total: number; accuracy: number;
  mistakes: { id: string; trueLabel: ShapeLabel; predLabel: ShapeLabel }[];
} {
  const labels = model.labels as ShapeLabel[];
  const filtered = samples.filter((s) => labels.includes(s.label));
  let correct = 0;
  const mistakes: { id: string; trueLabel: ShapeLabel; predLabel: ShapeLabel }[] = [];
  for (const s of filtered) {
    const { pred } = classifyModel(s.pixels, model);
    const trueIdx = labels.indexOf(s.label);
    if (pred === trueIdx) correct += 1;
    else mistakes.push({ id: s.id, trueLabel: s.label, predLabel: labels[pred] });
  }
  return {
    correct,
    total: filtered.length,
    accuracy: filtered.length === 0 ? 0 : correct / filtered.length,
    mistakes,
  };
}
