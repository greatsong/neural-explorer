// PhaseB2 — 데이터셋과 전처리
// 노이즈/오라벨이 *실제 학습을* 망가뜨리는 모습을 보여 준다.
// "학습 시작 전에는 그래프 비어 있음" / "▶ 두 학습 비교 시작" 누른 뒤에야 두 곡선이 그려진다.
// 두 학습 모두 진짜 SGD (createDeepMLP + trainStep + 미니배치) 로 돌린다.
import { useEffect, useMemo, useRef, useState } from 'react';
import { PHASES } from '../phases';
import { useApp } from '../store';
import { useDot } from '../dotStore';
import {
  type DotSample,
  type ShapeLabel,
  SHAPE_LABEL_KO,
} from '../data/dotShapes';
import {
  createDeepMLP,
  evaluate,
  shuffle,
  trainStep,
  type TrainSample,
} from '../lib/nn';

/* ────────── 학습 조건 ──────────
   동그라미 vs 세모, 출력 뉴런 2개의 *진짜* 선형 softmax 분류기.
   baseline(전처리 없음)이 70% 안팎이 되도록 데이터를 더럽게 만든다(아래 SYN_DIRTY).
   cleaned(전처리 후)는 90% 이상으로 올라간다 — 차이 약 +20%p. */
const TASK_LABELS: [ShapeLabel, ShapeLabel] = ['circle', 'triangle'];
const EPOCHS = 30;
const LR = 0.05;
const BATCH_SIZE = 16;
const TASK_LABEL_KO = (l: ShapeLabel) => SHAPE_LABEL_KO[l];
const labelIdx = (l: ShapeLabel) => TASK_LABELS.indexOf(l);

/* ────────── 합성 dirty 샘플 — B2 안에서만 살아 있음 ──────────
   "동그라미라고 적혀 있지만 그림은 세모", "세모라고 적혀 있지만 그림은 동그라미" 등
   서로 모순되는 라벨을 가진 12장. 학생 갤러리에 다른 샘플과 섞어 보여 주고,
   학생이 클릭으로 제외해야 한다. 이 샘플들은 store에 들어가지 않으므로 B3 이후에는 사라진다. */
const SIZE = 8;
const at = (x: number, y: number) => y * SIZE + x;
function drawCircle(cx: number, cy: number, r: number): number[] {
  const p = new Array(64).fill(0);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const d = Math.hypot(x - cx, y - cy);
    if (d <= r + 0.4 && d >= r - 0.6) p[at(x, y)] = 1;
  }
  return p;
}
function drawTriangle(cx: number, cy: number, r: number): number[] {
  const p = new Array(64).fill(0);
  const top = { x: cx, y: cy - r };
  const left = { x: cx - r, y: cy + r * 0.85 };
  const right = { x: cx + r, y: cy + r * 0.85 };
  function line(x1: number, y1: number, x2: number, y2: number) {
    const dx = x2 - x1, dy = y2 - y1;
    const steps = Math.max(Math.abs(dx), Math.abs(dy)) * 4;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const xx = Math.round(x1 + dx * t);
      const yy = Math.round(y1 + dy * t);
      if (xx >= 0 && xx < 8 && yy >= 0 && yy < 8) p[at(xx, yy)] = 1;
    }
  }
  line(top.x, top.y, left.x, left.y);
  line(top.x, top.y, right.x, right.y);
  line(left.x, left.y, right.x, right.y);
  return p;
}
// B2 전용 합성 dirty: "그림과 적힌 라벨이 정반대"인 명백한 mislabel 데모용 4장만 추가.
// 기본 데이터셋이 이미 라벨당 20% 오류를 갖고 있으므로 여기서는 *교사가 한눈에 짚어주기 좋은*
// 두드러진 예시 4장만 더해 학생의 첫 클릭 동기를 만든다.
const VARIANTS = [
  { cx: 3.5, cy: 3.5, r: 3 },
  { cx: 3, cy: 3, r: 2.5 },
];
function buildSynDirty(): DotSample[] {
  const out: DotSample[] = [];
  VARIANTS.forEach((v, i) => {
    // 세모 그림인데 라벨은 동그라미
    out.push({
      id: `syn-tc-${i}`,
      label: 'circle',
      pixels: drawTriangle(v.cx, v.cy, v.r),
      mislabel: 'triangle',
    });
    // 동그라미 그림인데 라벨은 세모
    out.push({
      id: `syn-ct-${i}`,
      label: 'triangle',
      pixels: drawCircle(v.cx, v.cy, v.r),
      mislabel: 'circle',
    });
  });
  return out;
}
const SYN_DIRTY: DotSample[] = buildSynDirty();
const SYN_DIRTY_IDS = new Set(SYN_DIRTY.map((s) => s.id));

/* ────────── 학습 헬퍼 ──────────
   샘플 배열을 받아 한 번 끝까지 학습하고 epoch별 정확도(학습/평가) 곡선을 돌려 준다.
   학습 중 UI를 양보하기 위해 await new Promise(r => setTimeout(r, 0)). */
async function runTraining(
  trainSamples: DotSample[],
  evalSamples: DotSample[],
  cancelRef: { current: boolean },
  onEpoch: (snapshot: { epoch: number; trainAcc: number; evalAcc: number }) => void,
): Promise<{ trainAcc: number; evalAcc: number }> {
  const train: TrainSample[] = trainSamples
    .filter((s) => TASK_LABELS.includes(s.label))
    .map((s) => ({ x: new Float32Array(s.pixels), y: labelIdx(s.label) }));
  const evalSet: TrainSample[] = evalSamples
    .filter((s) => !s.noisy && !s.mislabel && TASK_LABELS.includes(s.label))
    .map((s) => ({ x: new Float32Array(s.pixels), y: labelIdx(s.label) }));
  if (train.length < 2 || evalSet.length < 2) {
    return { trainAcc: 0, evalAcc: 0 };
  }
  const m = createDeepMLP([64, 2]);
  let lastTrainAcc = 0;
  let lastEvalAcc = 0;
  for (let ep = 0; ep < EPOCHS; ep++) {
    if (cancelRef.current) break;
    const batches = shuffle(train);
    for (let i = 0; i < batches.length; i += BATCH_SIZE) {
      trainStep(m, batches.slice(i, i + BATCH_SIZE), LR);
    }
    lastTrainAcc = evaluate(m, train);
    lastEvalAcc = evaluate(m, evalSet);
    onEpoch({ epoch: ep + 1, trainAcc: lastTrainAcc, evalAcc: lastEvalAcc });
    // UI yield
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 0));
  }
  return { trainAcc: lastTrainAcc, evalAcc: lastEvalAcc };
}

interface TrainResult {
  trainAcc: number;
  evalAcc: number;
  trainHist: number[];
  evalHist: number[];
}

const EMPTY_RESULT: TrainResult = { trainAcc: 0, evalAcc: 0, trainHist: [], evalHist: [] };

/* ────────── 메인 컴포넌트 ────────── */
export function PhaseB2() {
  const meta = PHASES.find((p) => p.id === 'b2')!;
  const markCompleted = useApp((s) => s.markCompleted);

  // store 측 데이터
  const storeSamples = useDot((s) => s.samples);
  const storeRemoved = useDot((s) => s.removedIds);
  const toggleRemoveStore = useDot((s) => s.toggleRemove);
  const resetRemoved = useDot((s) => s.resetRemoved);

  // B2 로컬: 합성 dirty 샘플의 제거 토글 (store와 분리 — B3 이후에는 사라짐)
  const [localRemoved, setLocalRemoved] = useState<Set<string>>(() => new Set());

  // 갤러리에 보일 전체 — store 36장 + 합성 12장
  const allSamples: DotSample[] = useMemo(() => [...storeSamples, ...SYN_DIRTY], [storeSamples]);

  // 어떤 샘플이 "제거됨"인지 통합 판정
  const isRemoved = (id: string): boolean => {
    if (SYN_DIRTY_IDS.has(id)) return localRemoved.has(id);
    return storeRemoved.has(id);
  };

  const toggleRemove = (id: string) => {
    if (SYN_DIRTY_IDS.has(id)) {
      setLocalRemoved((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
    } else {
      toggleRemoveStore(id);
    }
  };

  // active = 제거되지 않은 모든 샘플
  const activeAll = useMemo(
    () => allSamples.filter((s) => !isRemoved(s.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allSamples, storeRemoved, localRemoved]
  );

  // 라벨별 그룹 — UI 갤러리 렌더링 (동그라미/세모만, 네모는 B5에서)
  const grouped = useMemo(() => {
    const labels: ShapeLabel[] = ['circle', 'triangle'];
    return labels.map((lbl) => ({
      label: lbl,
      items: allSamples.filter((s) => s.label === lbl),
    }));
  }, [allSamples]);

  // 평가용 깨끗한 reference set (실제 store 샘플 중 noisy/mislabel 없는 것)
  const evalRef = useMemo(
    () => storeSamples.filter((s) => !s.noisy && !s.mislabel),
    [storeSamples]
  );

  // dirty 제거 카운트 — 합성 + store 양쪽
  const removedDirty = useMemo(() => {
    let n = 0;
    for (const s of allSamples) {
      if (!isRemoved(s.id)) continue;
      if (s.noisy || s.mislabel) n += 1;
    }
    return n;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSamples, storeRemoved, localRemoved]);

  /* ─── 학습 상태 ─── */
  const [hasStarted, setHasStarted] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [stage, setStage] = useState<'idle' | 'baseline' | 'current' | 'done'>('idle');
  const [baseline, setBaseline] = useState<TrainResult>(EMPTY_RESULT);
  const [current, setCurrent] = useState<TrainResult>(EMPTY_RESULT);
  const cancelRef = useRef({ current: false });

  // 학습 시작 — baseline + current 차례로 돌린다
  const startCompare = async () => {
    if (isTraining) return;
    setHasStarted(true);
    setIsTraining(true);
    cancelRef.current = { current: false };

    // baseline: 전처리 없음 — 모든 합성 dirty 포함, store 제거 무시
    setStage('baseline');
    const baseTrainHist: number[] = [];
    const baseEvalHist: number[] = [];
    setBaseline({ trainAcc: 0, evalAcc: 0, trainHist: [], evalHist: [] });
    const bRes = await runTraining(allSamples, evalRef, cancelRef.current, (snap) => {
      baseTrainHist.push(snap.trainAcc);
      baseEvalHist.push(snap.evalAcc);
      setBaseline({
        trainAcc: snap.trainAcc,
        evalAcc: snap.evalAcc,
        trainHist: baseTrainHist.slice(),
        evalHist: baseEvalHist.slice(),
      });
    });
    if (cancelRef.current.current) {
      setIsTraining(false);
      setStage('idle');
      return;
    }
    setBaseline((prev) => ({
      ...prev,
      trainAcc: bRes.trainAcc,
      evalAcc: bRes.evalAcc,
      trainHist: baseTrainHist.slice(),
      evalHist: baseEvalHist.slice(),
    }));

    // current: active set 기반
    setStage('current');
    await runCurrent(false);
  };

  // current만 다시 학습 (재학습 버튼 또는 비교 시작 후속 단계)
  const runCurrent = async (standalone: boolean) => {
    if (standalone) {
      if (isTraining) return;
      setIsTraining(true);
      cancelRef.current = { current: false };
      setStage('current');
    }
    const trainHist: number[] = [];
    const evalHist: number[] = [];
    setCurrent({ trainAcc: 0, evalAcc: 0, trainHist: [], evalHist: [] });
    const cRes = await runTraining(activeAll, evalRef, cancelRef.current, (snap) => {
      trainHist.push(snap.trainAcc);
      evalHist.push(snap.evalAcc);
      setCurrent({
        trainAcc: snap.trainAcc,
        evalAcc: snap.evalAcc,
        trainHist: trainHist.slice(),
        evalHist: evalHist.slice(),
      });
    });
    if (cancelRef.current.current) {
      setIsTraining(false);
      setStage('idle');
      return;
    }
    setCurrent({
      trainAcc: cRes.trainAcc,
      evalAcc: cRes.evalAcc,
      trainHist: trainHist.slice(),
      evalHist: evalHist.slice(),
    });
    setIsTraining(false);
    setStage('done');
  };

  const cancelTraining = () => {
    cancelRef.current.current = true;
  };

  // 데이터셋 되돌리기 — 합성 dirty 로컬 + store 제거를 모두 초기화
  const resetAll = () => {
    setLocalRemoved(new Set());
    resetRemoved();
  };

  // 완료 조건: dirty 4장 이상 제거 + current 평가가 baseline 대비 +15%p 이상
  const completedRef = useRef(false);
  useEffect(() => {
    if (completedRef.current) return;
    if (!hasStarted || stage !== 'done') return;
    if (removedDirty >= 4 && current.evalAcc - baseline.evalAcc >= 0.15) {
      completedRef.current = true;
      markCompleted('b2');
    }
  }, [removedDirty, current.evalAcc, baseline.evalAcc, hasStarted, stage, markCompleted]);

  // 카운트
  const totalCount = allSamples.filter((s) => TASK_LABELS.includes(s.label)).length;
  const activeCount = activeAll.filter((s) => TASK_LABELS.includes(s.label)).length;

  return (
    <article>
      {/* 헤더 압축 */}
      <header className="mb-3">
        <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
        <h1 className="text-2xl font-semibold mt-0.5">{meta.title}</h1>
        <p className="text-muted text-sm mt-0.5">{meta.subtitle}</p>
      </header>

      {/* 도입 한 단락 */}
      <p className="leading-relaxed text-[15px]">
        그림이 잘못 분류돼 있거나 점들이 깨져 있으면 모델은 <strong>잘못된 것을 외워요</strong>.
        먼저 데이터를 다듬은 뒤 학습해야 모델이 진짜 패턴을 배웁니다.
        같은 모델·같은 학습 시간으로 <strong>전처리 없음 vs 전처리 후</strong>를 나란히 비교해 보세요.
      </p>

      <div className="mt-3 grid lg:grid-cols-[1.4fr_1fr] gap-3 items-start">
        {/* 좌: 데이터 갤러리 */}
        <div className="card p-3">
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <div className="text-sm font-medium">
              데이터 갤러리 ({allSamples.length}장 · 동그라미·세모만 학습)
            </div>
            <div className="text-[12px] text-muted">
              그림과 라벨이 어울리지 않거나 점이 깨진 샘플을 클릭해 <strong>제외</strong>해 보세요.
            </div>
          </div>

          <div className="mt-2 space-y-2 max-h-[440px] overflow-y-auto pr-1">
            {grouped.map(({ label, items }) => (
              <div key={label}>
                <div className="text-[12px] text-muted mb-1">
                  적힌 라벨: <strong>{TASK_LABEL_KO(label)}</strong>{' '}
                  <span className="text-[11px]">({items.length}장)</span>
                </div>
                <div className="grid grid-cols-6 sm:grid-cols-9 md:grid-cols-12 gap-1.5">
                  {items.map((s) => {
                    const removed = isRemoved(s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() => toggleRemove(s.id)}
                        className={
                          'group relative rounded border px-0.5 py-0.5 text-[10px] transition ' +
                          (removed
                            ? 'border-rose-300 bg-rose-50 dark:bg-rose-950/30 opacity-50'
                            : 'border-border hover:border-accent bg-white dark:bg-zinc-900')
                        }
                        title={`${s.id} · ${removed ? '제외됨 (다시 클릭하면 포함)' : '클릭해서 제외'}`}
                      >
                        <DotThumb pixels={s.pixels} size={36} />
                        <div className="text-[10px] text-muted text-center mt-0.5 leading-none">
                          {removed ? '제외' : '·'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
            <span className="text-muted">
              제외 <span className="font-mono text-accent">{totalCount - activeCount}</span> ·
              남은 active <span className="font-mono text-accent">{activeCount}</span> / {totalCount}{' '}
              · 의심 샘플 제거{' '}
              <span className={'font-mono ' + (removedDirty >= 4 ? 'text-emerald-600' : 'text-accent')}>
                {removedDirty}
              </span>
            </span>
            <button onClick={resetAll} className="btn-ghost ml-auto !py-1 !px-2 text-[12px]">
              원본 데이터셋으로 되돌리기
            </button>
          </div>
        </div>

        {/* 우: 비교 학습 패널 */}
        <div className="space-y-3">
          <div className="card p-3">
            <div className="text-sm font-medium mb-1">두 학습 비교 — 동그라미 vs 세모</div>

            {!hasStarted ? (
              <div className="mt-2 space-y-2">
                <div className="aside-note text-[12px] leading-relaxed">
                  학습 비교 시작 버튼을 누르면, 같은 모델·같은 학습 시간으로
                  <strong> 전처리 없음 / 전처리 후</strong> 두 곡선이 나란히 그려져요.
                </div>
                <div className="rounded border border-border bg-zinc-50 dark:bg-zinc-900 h-[140px] flex items-center justify-center text-[12px] text-muted">
                  학습 시작 전 — 그래프는 비어 있어요
                </div>
                <button
                  onClick={startCompare}
                  className="btn-primary w-full"
                >
                  ▶ 두 학습 비교 시작
                </button>
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <ResultCard
                    label="전처리 없음"
                    sub={`전체 ${allSamples.filter((s) => TASK_LABELS.includes(s.label)).length}장`}
                    accent={false}
                    result={baseline}
                    isCurrent={stage === 'baseline'}
                  />
                  <ResultCard
                    label="전처리 후"
                    sub={`active ${activeCount}장`}
                    accent={true}
                    result={current}
                    isCurrent={stage === 'current'}
                  />
                </div>

                <AccuracyCurve baseline={baseline.evalHist} current={current.evalHist} />

                <div className="flex flex-wrap gap-2">
                  {isTraining ? (
                    <button onClick={cancelTraining} className="btn-ghost flex-1">
                      ■ 학습 중단
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => runCurrent(true)}
                        className="btn-primary flex-1"
                        disabled={isTraining}
                      >
                        ▶ 현재 active로 재학습
                      </button>
                      <button
                        onClick={() => {
                          completedRef.current = false;
                          setHasStarted(false);
                          setBaseline(EMPTY_RESULT);
                          setCurrent(EMPTY_RESULT);
                          setStage('idle');
                        }}
                        className="btn-ghost"
                        disabled={isTraining}
                      >
                        초기화
                      </button>
                    </>
                  )}
                </div>
                {isTraining && (
                  <div className="text-[11px] text-muted">
                    학습 중… ({stage === 'baseline' ? '전처리 없음' : '전처리 후'} · 진짜 SGD 미니배치)
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="aside-tip text-[12px] leading-relaxed">
            <div className="text-sm font-medium">완료 조건</div>
            <p className="mt-1 text-muted">
              <strong>의심 샘플 4장 이상 제거 + 재학습 후 평가 정확도가 baseline 대비 +15%p 이상</strong>이면 자동 완료돼요.
            </p>
            <p className="mt-1 text-muted">
              제거한 의심 샘플{' '}
              <span className={'font-mono ' + (removedDirty >= 4 ? 'text-emerald-600' : 'text-accent')}>
                {removedDirty}/4
              </span>
              {hasStarted && stage === 'done' && (
                <>
                  {' · 정확도 차'}{' '}
                  <span
                    className={
                      'font-mono ' +
                      (current.evalAcc - baseline.evalAcc >= 0.15 ? 'text-emerald-600' : 'text-accent')
                    }
                  >
                    +{((current.evalAcc - baseline.evalAcc) * 100).toFixed(1)}%p
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ────────── 결과 카드 ────────── */
function ResultCard({
  label, sub, accent, result, isCurrent,
}: {
  label: string;
  sub: string;
  accent: boolean;
  result: TrainResult;
  isCurrent: boolean;
}) {
  return (
    <div
      className={
        'rounded border p-2 ' +
        (accent ? 'border-accent bg-accent-bg/40' : 'border-border')
      }
    >
      <div className="text-[12px] font-medium flex items-baseline gap-1">
        {label}
        {isCurrent && <span className="text-[10px] text-accent animate-pulse">학습 중</span>}
      </div>
      <div className="text-[10px] text-muted">{sub}</div>
      <div className="mt-1 grid grid-cols-2 gap-1 font-mono text-[11px]">
        <div>
          <div className="text-muted text-[10px]">학습</div>
          <div className="text-sm font-semibold">
            {result.trainHist.length > 0 ? `${(result.trainAcc * 100).toFixed(0)}%` : '—'}
          </div>
        </div>
        <div>
          <div className="text-muted text-[10px]">평가(깨끗한 set)</div>
          <div
            className="text-sm font-semibold"
            style={{ color: result.evalAcc >= 0.85 ? 'rgb(16,185,129)' : undefined }}
          >
            {result.evalHist.length > 0 ? `${(result.evalAcc * 100).toFixed(0)}%` : '—'}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────── 정확도 곡선 (평가 정확도 두 곡선) ────────── */
function AccuracyCurve({ baseline, current }: { baseline: number[]; current: number[] }) {
  const W = 360;
  const H = 130;
  const padL = 28;
  const padR = 8;
  const padT = 10;
  const padB = 18;
  const N = Math.max(baseline.length, current.length, EPOCHS);

  const sx = (i: number) => padL + (i / Math.max(N - 1, 1)) * (W - padL - padR);
  const sy = (v: number) => H - padB - v * (H - padT - padB);

  const pathOf = (h: number[]) => {
    if (h.length === 0) return '';
    let p = '';
    h.forEach((v, i) => {
      p += `${i === 0 ? 'M' : 'L'}${sx(i).toFixed(1)},${sy(v).toFixed(1)} `;
    });
    return p;
  };

  const yTicks = [0, 0.5, 1];

  return (
    <div>
      <div className="flex items-baseline justify-between px-1">
        <div className="text-[12px] font-medium">평가 정확도 곡선</div>
        <div className="text-[10px] font-mono text-muted">
          <span style={{ color: 'rgb(148,163,184)' }}>● 전처리 없음</span>{' '}
          <span className="text-accent">● 전처리 후</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="rgb(var(--color-border))" />
        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="rgb(var(--color-border))" />
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={padL - 3}
              y1={sy(t)}
              x2={W - padR}
              y2={sy(t)}
              stroke="rgb(var(--color-border))"
              opacity={0.4}
            />
            <text x={padL - 5} y={sy(t) + 3} textAnchor="end" fontSize={9} fill="rgb(var(--color-muted))">
              {(t * 100).toFixed(0)}%
            </text>
          </g>
        ))}
        {/* 70% 안내선 (baseline 기준선 시각화) */}
        <line
          x1={padL}
          y1={sy(0.7)}
          x2={W - padR}
          y2={sy(0.7)}
          stroke="rgb(190,18,60)"
          strokeDasharray="3 3"
          opacity={0.35}
        />
        <path d={pathOf(baseline)} fill="none" stroke="rgb(148,163,184)" strokeWidth={1.6} />
        <path d={pathOf(current)} fill="none" stroke="rgb(var(--color-accent))" strokeWidth={1.8} />
        <text x={W - padR} y={H - 4} textAnchor="end" fontSize={9} fill="rgb(var(--color-muted))">
          epoch
        </text>
      </svg>
    </div>
  );
}

/* ────────── 8×8 도트 썸네일 ────────── */
function DotThumb({ pixels, size = 36 }: { pixels: number[]; size?: number }) {
  const cell = size / 8;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="block mx-auto">
      <rect x={0} y={0} width={size} height={size} fill="white" className="dark:fill-zinc-900" />
      {pixels.map((v, i) => {
        if (v !== 1) return null;
        const x = (i % 8) * cell;
        const y = Math.floor(i / 8) * cell;
        return (
          <rect key={i} x={x} y={y} width={cell} height={cell} fill="rgb(var(--color-accent))" />
        );
      })}
      {Array.from({ length: 9 }).map((_, i) => (
        <g key={i} stroke="rgb(var(--color-border))" strokeWidth={0.3} opacity={0.5}>
          <line x1={i * cell} y1={0} x2={i * cell} y2={size} />
          <line x1={0} y1={i * cell} x2={size} y2={i * cell} />
        </g>
      ))}
    </svg>
  );
}
