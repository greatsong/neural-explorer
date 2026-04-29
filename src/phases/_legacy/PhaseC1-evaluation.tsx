// PhaseC1 — 평가와 일반화
// B3 평가 데이터로 B4(이진) 또는 B5(3종) 모델의 성능 확인.
// 정확도 + 클래스별 오답 박스(혼동 행렬은 만들지 않는다 — 클래스 칩 + 그리드 형태).

import { useEffect, useMemo, useState } from 'react';
import { PHASES } from '../phases';
import { useApp } from '../store';
import {
  useDot,
  useActiveEval,
  evaluateAccuracy,
} from '../dotStore';
import { SHAPE_LABEL_KO, type ShapeLabel } from '../data/dotShapes';

const COLORS = {
  circle: 'rgb(249,115,22)',
  triangle: 'rgb(190,18,60)',
  square: 'rgb(59,130,246)',
  green: 'rgb(16,185,129)',
};

const colorOfLabel = (lbl: ShapeLabel) =>
  lbl === 'circle' ? COLORS.circle : lbl === 'triangle' ? COLORS.triangle : COLORS.square;

type ModelKind = 'binary' | 'multi';

/* 8×8 도트 픽셀 미니 렌더 */
function PixelDot({ pixels, size = 56 }: { pixels: number[]; size?: number }) {
  const cell = size / 8;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-label="도트 그림">
      <rect width={size} height={size} fill="rgb(246,247,249)" />
      {pixels.map((v, i) => {
        if (v < 0.5) return null;
        const x = (i % 8) * cell;
        const y = Math.floor(i / 8) * cell;
        return <rect key={i} x={x} y={y} width={cell} height={cell} fill="rgb(28,30,33)" />;
      })}
    </svg>
  );
}

export function PhaseC1() {
  const meta = PHASES.find((p) => p.id === 'c1')!;
  const markCompleted = useApp((s) => s.markCompleted);

  const binaryModel = useDot((s) => s.binaryModel);
  const multiModel = useDot((s) => s.multiModel);
  const samples = useDot((s) => s.samples);
  const evalSamples = useActiveEval();

  // 가능한 모델 결정
  const hasBinary = !!binaryModel;
  const hasMulti = !!multiModel;
  const initialKind: ModelKind = hasMulti ? 'multi' : hasBinary ? 'binary' : 'multi';

  const [kind, setKind] = useState<ModelKind>(initialKind);
  const [selectedClass, setSelectedClass] = useState<ShapeLabel | null>(null);
  const [toggleCount, setToggleCount] = useState(0);
  const [pickedWeakClass, setPickedWeakClass] = useState<ShapeLabel | null>(null);

  // 모델이 나중에 학습되면 초기 토글
  useEffect(() => {
    if (!hasMulti && hasBinary && kind === 'multi') setKind('binary');
    if (!hasBinary && hasMulti && kind === 'binary') setKind('multi');
  }, [hasMulti, hasBinary, kind]);

  /* 평가 결과 */
  const result = useMemo(() => {
    if (kind === 'binary' && binaryModel) {
      const labels: ShapeLabel[] = [binaryModel.labels[0], binaryModel.labels[1]];
      const r = evaluateAccuracy(evalSamples, labels, binaryModel.w, binaryModel.b);
      return { labels, ...r };
    }
    if (kind === 'multi' && multiModel) {
      const labels: ShapeLabel[] = [multiModel.labels[0], multiModel.labels[1], multiModel.labels[2]];
      const r = evaluateAccuracy(evalSamples, labels, multiModel.w, multiModel.b);
      return { labels, ...r };
    }
    return null;
  }, [kind, binaryModel, multiModel, evalSamples]);

  /* 클래스별 오답 카운트 */
  const mistakesByClass = useMemo(() => {
    const map = new Map<ShapeLabel, { id: string; trueLabel: ShapeLabel; predLabel: ShapeLabel }[]>();
    if (!result) return map;
    for (const lbl of result.labels) map.set(lbl, []);
    for (const m of result.mistakes) {
      const list = map.get(m.trueLabel);
      if (list) list.push(m);
    }
    return map;
  }, [result]);

  /* 가장 약한 클래스 — 오답 수가 가장 많은 라벨 */
  const weakest = useMemo(() => {
    if (!result) return null;
    const labels = result.labels;
    const filtered = evalSamples.filter((s) => labels.includes(s.label));
    const totalByClass = new Map<ShapeLabel, number>();
    labels.forEach((l) => totalByClass.set(l, 0));
    for (const s of filtered) totalByClass.set(s.label, (totalByClass.get(s.label) ?? 0) + 1);

    let bestLabel: ShapeLabel | null = null;
    let bestMistakes = -1;
    for (const lbl of labels) {
      const cnt = mistakesByClass.get(lbl)?.length ?? 0;
      if (cnt > bestMistakes) {
        bestMistakes = cnt;
        bestLabel = lbl;
      }
    }
    if (!bestLabel || bestMistakes <= 0) {
      return { allCorrect: true as const };
    }
    // 동률 검사 — 여러 클래스가 같은 오답 수면 "전체적으로 비슷하게 약하다"
    const tied = labels.filter((l) => (mistakesByClass.get(l)?.length ?? 0) === bestMistakes);
    if (tied.length > 1) {
      // bestLabel은 그대로 첫 라벨로 두고, allTied 플래그를 추가
      const total = totalByClass.get(bestLabel) ?? 0;
      const correct = total - bestMistakes;
      const acc = total > 0 ? (correct / total) * 100 : 0;
      return {
        allCorrect: false as const,
        allTied: true as const,
        tiedLabels: tied,
        label: bestLabel,
        mistakes: bestMistakes,
        total,
        accuracy: acc,
      };
    }
    const total = totalByClass.get(bestLabel) ?? 0;
    const correct = total - bestMistakes;
    const acc = total > 0 ? (correct / total) * 100 : 0;
    return {
      allCorrect: false as const,
      allTied: false as const,
      label: bestLabel,
      mistakes: bestMistakes,
      total,
      accuracy: acc,
    };
  }, [result, evalSamples, mistakesByClass]);

  /* 그리드 — 선택된 클래스의 오답 도트 */
  const gridItems = useMemo(() => {
    if (!result || !selectedClass) return [];
    const list = mistakesByClass.get(selectedClass) ?? [];
    return list.map((m) => {
      const sm = samples.find((s) => s.id === m.id);
      return { ...m, sample: sm };
    });
  }, [result, selectedClass, mistakesByClass, samples]);

  /* 모델 토글 1회 이상 + 약점 클래스 직접 지목 시 완료 */
  useEffect(() => {
    if (toggleCount >= 1 && pickedWeakClass) markCompleted('c1');
  }, [toggleCount, pickedWeakClass, markCompleted]);

  // 모델/평가가 바뀌면 지목 상태 초기화
  useEffect(() => {
    setPickedWeakClass(null);
  }, [kind]);

  const handleToggle = (k: ModelKind) => {
    if (k === kind) return;
    setKind(k);
    setSelectedClass(null);
    setToggleCount((c) => c + 1);
  };

  const handleChip = (lbl: ShapeLabel) => {
    setSelectedClass((cur) => (cur === lbl ? null : lbl));
  };

  const handlePickWeak = (lbl: ShapeLabel) => {
    setPickedWeakClass(lbl);
  };

  const pickedCount = pickedWeakClass ? (mistakesByClass.get(pickedWeakClass)?.length ?? 0) : 0;

  /* 빈 상태 — 두 모델 모두 없을 때 */
  if (!hasBinary && !hasMulti) {
    return (
      <article>
        <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
        <h1>{meta.title}</h1>
        <p className="text-muted mt-2">{meta.subtitle}</p>
        <p className="mt-6 leading-7">
          정확도 숫자만 보면 모델이 <strong>어떤 종류를 헷갈리는지</strong>는 알 수 없어요. 클래스별로 모델이 틀린 그림을 모아 보면, 모델의 약점이 한눈에 보입니다.
        </p>
        <div className="aside-warn mt-6">
          평가할 모델이 아직 없습니다 — <strong>B4</strong>(이진 분류) 또는 <strong>B5</strong>(3종 분류)에서 모델을 먼저 학습해 주세요.
        </div>
      </article>
    );
  }

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2">{meta.subtitle}</p>

      {/* 도입 단락 — PLAN ## 10-1 #5 */}
      <p className="mt-6 leading-7">
        정확도 숫자만 보면 모델이 <strong>어떤 종류를 헷갈리는지</strong>는 알 수 없어요. 클래스별로 모델이 틀린 그림을 모아 보면, 모델의 약점이 한눈에 보입니다.
      </p>

      {/* 모델 선택 토글 */}
      <div className="flex items-center gap-2 mt-5">
        <span className="text-sm text-muted mr-1">평가할 모델:</span>
        <button
          type="button"
          onClick={() => hasBinary && handleToggle('binary')}
          disabled={!hasBinary}
          className={
            kind === 'binary'
              ? 'inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-accent text-white'
              : 'inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium border border-border hover:bg-surface disabled:opacity-40'
          }
        >
          B4 이진 모델 {hasBinary ? '' : '(미학습)'}
        </button>
        <button
          type="button"
          onClick={() => hasMulti && handleToggle('multi')}
          disabled={!hasMulti}
          className={
            kind === 'multi'
              ? 'inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-accent text-white'
              : 'inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium border border-border hover:bg-surface disabled:opacity-40'
          }
        >
          B5 3종 모델 {hasMulti ? '' : '(미학습)'}
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mt-5">
        {/* 좌: 평가 결과 카드 */}
        <section className="card p-4">
          <h3 className="!mt-0">평가 결과</h3>

          {result ? (
            <>
              <div className="mt-2 flex items-baseline gap-3">
                <div
                  className="text-5xl font-semibold tabular-nums"
                  style={{ color: COLORS.green }}
                >
                  {(result.accuracy * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted">평가 정확도</div>
              </div>
              <div className="text-sm mt-1">
                맞춘 <strong className="tabular-nums">{result.correct}</strong> / <span className="tabular-nums">{result.total}</span>개
              </div>

              {/* 가장 약한 클래스 강조 카드 */}
              {weakest && (
                <div className="mt-5">
                  {weakest.allCorrect ? (
                    <div
                      className="rounded-lg p-4 border"
                      style={{
                        borderColor: COLORS.green,
                        background: 'rgba(16,185,129,0.08)',
                      }}
                    >
                      <div className="text-sm font-medium" style={{ color: COLORS.green }}>
                        모든 클래스를 잘 분류해요
                      </div>
                      <div className="text-xs text-muted mt-1">
                        평가 데이터에서 어떤 클래스도 특별히 약한 곳이 없어요.
                      </div>
                    </div>
                  ) : weakest.allTied ? (
                    <div
                      className="rounded-lg p-4 border"
                      style={{
                        borderColor: 'rgb(190,18,60)',
                        background: 'rgba(190,18,60,0.08)',
                      }}
                    >
                      <div className="text-xs font-medium tracking-wide" style={{ color: 'rgb(190,18,60)' }}>
                        여러 클래스가 비슷하게 약함
                      </div>
                      <div className="text-sm font-semibold leading-snug mt-1" style={{ color: 'rgb(190,18,60)' }}>
                        {weakest.tiedLabels.map((l) => SHAPE_LABEL_KO[l]).join(' · ')} — 모두 {weakest.mistakes}장씩 틀림
                      </div>
                      <div className="text-xs text-muted mt-1">
                        특정 클래스만의 문제가 아니라 모델 전체 성능이 낮은 상태예요.
                      </div>
                    </div>
                  ) : (
                    <div
                      className="rounded-lg p-4 border"
                      style={{
                        borderColor: colorOfLabel(weakest.label),
                        background: `color-mix(in srgb, ${colorOfLabel(weakest.label)} 10%, transparent)`,
                      }}
                    >
                      <div className="text-xs font-medium tracking-wide" style={{ color: colorOfLabel(weakest.label) }}>
                        가장 약한 클래스
                      </div>
                      <div
                        className="mt-1 text-lg font-semibold leading-snug"
                        style={{ color: colorOfLabel(weakest.label) }}
                      >
                        {SHAPE_LABEL_KO[weakest.label]} — 평가 {weakest.total}장 중{' '}
                        <span className="tabular-nums">{weakest.mistakes}</span>장 틀림{' '}
                        <span className="tabular-nums">(정확도 {weakest.accuracy.toFixed(1)}%)</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-muted mt-2">선택한 모델이 비어 있어요.</div>
          )}
        </section>

        {/* 우: 클래스별 오답 박스 */}
        <section className="card p-4">
          <h3 className="!mt-0">클래스별 오답</h3>
          <p className="text-sm text-muted mt-1">
            어떤 종류가 가장 약한가요? <strong>클래스를 클릭해서 지목</strong>해 보세요. 칩을 누르면 <em>그 클래스인데 다른 클래스로 답한</em> 그림들이 펼쳐져요.
          </p>

          {/* 칩 가로 줄 */}
          <div className="flex flex-wrap gap-2 mt-3">
            {result && result.labels.map((lbl) => {
              const count = mistakesByClass.get(lbl)?.length ?? 0;
              const color = colorOfLabel(lbl);
              const active = selectedClass === lbl;
              return (
                <button
                  key={lbl}
                  type="button"
                  onClick={() => handleChip(lbl)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition"
                  style={{
                    borderColor: color,
                    background: active ? color : 'transparent',
                    color: active ? 'white' : color,
                  }}
                >
                  {SHAPE_LABEL_KO[lbl]}
                  <span
                    className="font-mono tabular-nums text-xs"
                    style={{
                      background: active ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.06)',
                      color: active ? 'white' : color,
                      padding: '1px 6px',
                      borderRadius: 999,
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 그리드 */}
          <div className="mt-4 min-h-[140px]">
            {!selectedClass && (
              <div className="text-sm text-muted">
                칩을 골라 보세요. 모든 클래스 오답이 0이라면 모델이 평가 데이터에서 모두 맞춘 거예요.
              </div>
            )}
            {selectedClass && gridItems.length === 0 && (
              <div className="aside-tip text-sm">
                <strong>{SHAPE_LABEL_KO[selectedClass]}</strong> — 평가 데이터에서 모두 맞췄어요. 잘 구분해요.
              </div>
            )}
            {selectedClass && gridItems.length > 0 && (
              <>
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  {pickedWeakClass === selectedClass ? (
                    <div
                      className="inline-flex items-center gap-1.5 text-sm font-medium"
                      style={{ color: colorOfLabel(selectedClass) }}
                    >
                      <span aria-hidden>✓</span>
                      약점 지목 완료 — <span className="tabular-nums">{pickedCount}</span>개 오답을 봤어요
                    </div>
                  ) : (
                    <div className="text-xs text-muted">
                      <strong>{SHAPE_LABEL_KO[selectedClass]}</strong>의 오답 그림들이에요.
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handlePickWeak(selectedClass)}
                    disabled={pickedWeakClass === selectedClass}
                    className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition disabled:opacity-50"
                    style={{
                      background:
                        pickedWeakClass === selectedClass
                          ? 'transparent'
                          : colorOfLabel(selectedClass),
                      color:
                        pickedWeakClass === selectedClass
                          ? colorOfLabel(selectedClass)
                          : 'white',
                      border: `1px solid ${colorOfLabel(selectedClass)}`,
                    }}
                  >
                    {pickedWeakClass === selectedClass
                      ? '약점으로 지목됨'
                      : '이 클래스를 약점으로 지목'}
                  </button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {gridItems.map((it) => (
                  <div key={it.id} className="card p-2 flex flex-col items-center">
                    {it.sample && <PixelDot pixels={it.sample.pixels} size={56} />}
                    <div className="text-xs mt-2 leading-5 text-center">
                      <span style={{ color: colorOfLabel(it.trueLabel) }}>
                        정답: {SHAPE_LABEL_KO[it.trueLabel].replace(/^[^ ]+ /, '')}
                      </span>
                      <span className="text-muted"> → </span>
                      <span style={{ color: colorOfLabel(it.predLabel) }}>
                        답: {SHAPE_LABEL_KO[it.predLabel].replace(/^[^ ]+ /, '')}
                      </span>
                    </div>
                  </div>
                ))}
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      {/* 하단 한 줄 */}
      <div className="aside-note text-sm mt-6">
        정확도만 보면 모델의 약점이 안 보인다 — 어떤 종류가 헷갈리는지가 더 중요해요.
      </div>
    </article>
  );
}
