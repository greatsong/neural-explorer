// 도트 데이터 공유 store — B 영역(B2~B4)과 C1이 같은 데이터 흐름을 이어받는다.
// 핵심: 학생이 B2에서 정제·플래그한 결과가 B3 분할 → B4 학습 → C1 평가까지
// 그대로 흘러간다. 페이즈 사이에서 캔버스를 다시 그릴 필요가 없다.

import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DOT_SAMPLES_DEFAULT, type DotSample, type ShapeLabel } from './data/dotShapes';
import type { MLP } from './lib/nn';

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
   B4는 src/lib/nn.ts의 MLP(시그모이드 출력)를 직접 학습해 mlp 필드에 저장한다. */
export interface BinaryModel { // B4: 두 라벨 (circle vs triangle), 시그모이드 출력 1개
  labels: [ShapeLabel, ShapeLabel];  // [negative(σ<0.5), positive(σ≥0.5)]
  mlp: MLP;
  trainedEpochs: number;
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

  toggleRemove: (id: string) => void;
  resetRemoved: () => void;
  setEvalRatio: (r: number) => void;  // 비율 변경 시 trainIds/evalIds 재생성 + 학습된 모델 무효화
  setBinaryModel: (m: BinaryModel | null) => void;
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
          };
        }),
        setBinaryModel: (m) => set({ binaryModel: m }),
        resetAll: () => {
          const init = makeInitial();
          set({
            samples: init.samples,
            removedIds: new Set(),
            trainIds: init.trainIds,
            evalIds: init.evalIds,
            binaryModel: null,
          });
        },
      };
    },
    {
      name: 'neural-explorer-dot-v1',
      partialize: (s) => ({
        removedIds: Array.from(s.removedIds),
        binaryModel: s.binaryModel,
      }),
      merge: (persisted, current) => {
        // localStorage에 저장된 removedIds는 array로 옴 → Set으로 복원
        const p = persisted as { removedIds?: string[]; binaryModel?: BinaryModel | null };
        return {
          ...current,
          removedIds: new Set(p?.removedIds ?? []),
          // mlp 객체 안의 Float32Array는 JSON 직렬화 후 복원이 어렵다.
          // 학습 모델은 세션 단위로만 살아 있게 하고, 새로고침 시 다시 학습하도록 한다.
          binaryModel: null,
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
