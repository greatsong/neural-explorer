// PhaseB3 — 학습 / 평가 데이터 나누기
// B2에서 정제한 active 데이터를 train(75%) / eval(25%)로 나눈 모습을 보여 주고,
// "왜 나눠야 하는가"(시험 문제로 공부 = 부정행위) 직관을 잡는다.
// store의 trainIds/evalIds는 시드 고정이라 그대로 두고, 분할 비율 슬라이더는 *시뮬레이션*만 한다.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import { useDot, activeSamples, activeTrain, activeEval } from '../dotStore';
import { type DotSample, type ShapeLabel, SHAPE_LABEL_KO } from '../data/dotShapes';
import { PHASES } from '../phases';

const SHAPE_LABEL_LIST: ShapeLabel[] = ['circle', 'triangle', 'square'];

export function PhaseB3() {
  const meta = PHASES.find((p) => p.id === 'b3')!;
  const markCompleted = useApp((s) => s.markCompleted);

  const samples = useDot((s) => s.samples);
  const removedIds = useDot((s) => s.removedIds);
  const trainIds = useDot((s) => s.trainIds);
  const evalIds = useDot((s) => s.evalIds);

  // 실제 store 분할(시드 고정)
  const actualTrain: DotSample[] = useMemo(
    () => activeTrain({ samples, removedIds, trainIds }),
    [samples, removedIds, trainIds],
  );
  const actualEval: DotSample[] = useMemo(
    () => activeEval({ samples, removedIds, evalIds }),
    [samples, removedIds, evalIds],
  );
  const active: DotSample[] = useMemo(
    () => activeSamples({ samples, removedIds }),
    [samples, removedIds],
  );

  // 시뮬레이션용 비율 — 슬라이더는 store 분할은 건드리지 않고 카운트만 다시 계산
  const [evalPct, setEvalPct] = useState(25);
  const sliderTouchedRef = useRef(false);

  // 비율 슬라이더로 시뮬레이션한 라벨별 train/eval 카운트
  const simCounts = useMemo(() => {
    const out: Record<ShapeLabel, { train: number; evalN: number; total: number }> = {
      circle: { train: 0, evalN: 0, total: 0 },
      triangle: { train: 0, evalN: 0, total: 0 },
      square: { train: 0, evalN: 0, total: 0 },
    };
    for (const lbl of SHAPE_LABEL_LIST) {
      const total = active.filter((s) => s.label === lbl).length;
      const evalN = total === 0 ? 0 : Math.max(1, Math.round(total * (evalPct / 100)));
      out[lbl] = { train: total - evalN, evalN, total };
    }
    return out;
  }, [active, evalPct]);

  const totalActive = active.length;
  const totalEvalSim = SHAPE_LABEL_LIST.reduce((s, l) => s + simCounts[l].evalN, 0);
  const totalTrainSim = totalActive - totalEvalSim;

  // 완료 처리 — 슬라이더 1회 만지거나, 8초 후 자동 완료
  const completedRef = useRef(false);
  useEffect(() => {
    if (completedRef.current) return;
    if (sliderTouchedRef.current) {
      completedRef.current = true;
      markCompleted('b3');
      return;
    }
    const t = setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true;
        markCompleted('b3');
      }
    }, 8000);
    return () => clearTimeout(t);
  }, [evalPct, markCompleted]);

  const tradeoffMsg =
    evalPct <= 12
      ? '평가용이 너무 적어요 — 새 그림 몇 장만 우연히 맞히면 점수가 출렁입니다.'
      : evalPct >= 40
      ? '평가용이 너무 많아요 — 학습용이 빈약해서 모델이 충분히 배우지 못해요.'
      : '균형 잡힌 비율 — 학습은 충분히, 평가도 흔들리지 않을 만큼.';

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2 text-sm">{meta.subtitle}</p>

      <p className="mt-4 text-[15px] leading-relaxed">
        모델이 <strong>외운 것</strong>인지, <strong>새 그림</strong>도 맞히는지 확인하려면
        데이터를 두 묶음으로 나눠야 해요. 한 묶음으로는 공부(<strong>학습용</strong>),
        다른 묶음으로는 시험(<strong>평가용</strong>) — 시험 문제로 공부하지 않도록 시작부터 분리합니다.
      </p>

      {/* ── 메인 한 viewport ── */}
      <div className="mt-5 grid lg:grid-cols-[1.7fr_1fr] gap-4 items-start">
        {/* 좌측 — 분할 시각화 */}
        <div className="space-y-3">
          <div className="card p-4">
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <div>
                <div className="text-sm font-medium">데이터 분할</div>
                <div className="text-[12px] text-muted mt-0.5">
                  active 데이터 {totalActive}장 — 라벨별로 균등 분할(계층 샘플링).
                </div>
              </div>
              <div className="text-[12px] font-mono text-muted">
                실제 분할:
                <span className="ml-1 text-accent font-semibold">{actualTrain.length}</span>
                <span className="mx-1">/</span>
                <span style={{ color: 'rgb(190,18,60)' }} className="font-semibold">{actualEval.length}</span>
                <span className="ml-1">(고정 시드)</span>
              </div>
            </div>

            {/* 분할 비율 막대 — 시뮬레이션 */}
            <div className="mt-3">
              <div className="h-7 w-full rounded-md overflow-hidden border border-border flex text-[11px] font-mono">
                <div
                  className="flex items-center justify-center text-white"
                  style={{
                    width: `${100 - evalPct}%`,
                    background: 'rgb(var(--color-accent))',
                  }}
                >
                  학습용 {totalTrainSim}장 ({100 - evalPct}%)
                </div>
                <div
                  className="flex items-center justify-center text-white"
                  style={{ width: `${evalPct}%`, background: 'rgb(190,18,60)' }}
                >
                  평가용 {totalEvalSim}장 ({evalPct}%)
                </div>
              </div>
            </div>

            {/* 라벨별 카운트 표 */}
            <div className="mt-3 overflow-hidden rounded-md border border-border">
              <table className="w-full text-[12px]">
                <thead className="bg-surface text-muted text-[11px]">
                  <tr>
                    <th className="text-left px-2 py-1.5">라벨</th>
                    <th className="text-right px-2 py-1.5">전체</th>
                    <th className="text-right px-2 py-1.5">
                      <span style={{ color: 'rgb(var(--color-accent))' }}>학습용</span>
                    </th>
                    <th className="text-right px-2 py-1.5">
                      <span style={{ color: 'rgb(190,18,60)' }}>평가용</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {SHAPE_LABEL_LIST.map((lbl) => (
                    <tr key={lbl} className="border-t border-border/60">
                      <td className="px-2 py-1.5 font-sans">{SHAPE_LABEL_KO[lbl]}</td>
                      <td className="text-right px-2">{simCounts[lbl].total}</td>
                      <td className="text-right px-2 text-accent">{simCounts[lbl].train}</td>
                      <td className="text-right px-2" style={{ color: 'rgb(190,18,60)' }}>
                        {simCounts[lbl].evalN}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-border bg-surface/40 text-[11px] text-muted">
                    <td className="px-2 py-1 font-sans">합계</td>
                    <td className="text-right px-2">{totalActive}</td>
                    <td className="text-right px-2 text-accent">{totalTrainSim}</td>
                    <td className="text-right px-2" style={{ color: 'rgb(190,18,60)' }}>
                      {totalEvalSim}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 작은 그림 갤러리 — train(위) / eval(아래) 시각 분리 */}
          <div className="card p-3">
            <GalleryRow
              title="학습용 그림"
              caption="공부할 때 본 그림 — 모델이 가중치를 맞추는 데 쓰여요."
              samples={actualTrain}
              accent="accent"
            />
            <div className="border-t border-dashed border-border my-3" />
            <GalleryRow
              title="평가용 그림"
              caption="처음 보는 그림 — 학습 끝난 뒤에만 꺼내 봅니다."
              samples={actualEval}
              accent="rose"
            />
          </div>
        </div>

        {/* 우측 — 컨트롤 + 위생 경고 */}
        <div className="space-y-3">
          <div className="card p-3">
            <div className="text-sm font-medium">분할 비율 살펴보기</div>
            <p className="text-[12px] text-muted mt-1 leading-relaxed">
              슬라이더로 평가용 비율을 바꿔보세요. 실제 모델이 쓰는 분할은 시드로 고정돼 있어
              건드려지지 않고, 카운트만 시뮬레이션됩니다.
            </p>
            <div className="mt-3">
              <div className="flex items-baseline justify-between text-[12px] font-mono">
                <span className="text-muted">평가용 비율</span>
                <span className="text-accent font-semibold">{evalPct}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={50}
                step={5}
                value={evalPct}
                onChange={(e) => {
                  sliderTouchedRef.current = true;
                  setEvalPct(parseInt(e.target.value, 10));
                }}
                className="w-full mt-1 accent-[rgb(var(--color-accent))]"
              />
              <div className="flex justify-between text-[10px] text-muted font-mono mt-0.5">
                <span>10%</span><span>25%</span><span>50%</span>
              </div>
            </div>
            <div className="mt-3 text-[12px] leading-snug bg-surface/60 border border-border rounded-md px-3 py-2">
              {tradeoffMsg}
            </div>
          </div>

          {/* PLAN ## 10-1 #3 — 글자 그대로 */}
          <div className="aside-warn text-[14px] leading-relaxed">
            ⚠ 평가 데이터를 보고 모델 구조를 고치면 <strong>부정행위</strong>예요 — 시험 문제로 공부한 셈이라, 새 데이터에서는 다시 약해집니다.
          </div>

          <div className="card p-3 text-[12px] text-muted leading-relaxed">
            <div className="text-sm font-medium text-text">왜 나누는가</div>
            <p className="mt-1">
              학생이 시험지를 미리 보고 외운 답을 적으면 점수는 잘 나오지만, 실제 실력은 보이지 않아요.
              모델도 같습니다 — 학습용으로 충분히 공부한 뒤 평가용에서 처음으로 점수를 잽니다.
            </p>
            <p className="mt-2">
              <strong>학습용</strong> = 가중치 갱신에 쓰는 묶음. 모델이 보는 정답이에요.<br />
              <strong>평가용</strong> = 학습이 끝난 뒤 처음 꺼내는 묶음. 일반화 점수의 출처예요.
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ────────── 작은 그림 갤러리 (8×8 도트) ────────── */
function GalleryRow({
  title, caption, samples, accent,
}: {
  title: string; caption: string; samples: DotSample[]; accent: 'accent' | 'rose';
}) {
  const color = accent === 'accent' ? 'rgb(var(--color-accent))' : 'rgb(190,18,60)';
  return (
    <div>
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: color }}
          />
          <span className="text-sm font-medium" style={{ color }}>{title}</span>
          <span className="text-[11px] font-mono text-muted">{samples.length}장</span>
        </div>
        <span className="text-[11px] text-muted">{caption}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {samples.map((s) => (
          <DotThumb key={s.id} sample={s} stroke={color} />
        ))}
      </div>
    </div>
  );
}

function DotThumb({ sample, stroke }: { sample: DotSample; stroke: string }) {
  const SIZE = 8;
  const cell = 4;
  const W = SIZE * cell;
  return (
    <div
      title={`${SHAPE_LABEL_KO[sample.label]} · ${sample.id}`}
      className="rounded-sm border bg-bg"
      style={{ borderColor: stroke }}
    >
      <svg viewBox={`0 0 ${W} ${W}`} width={W} height={W} aria-hidden>
        {sample.pixels.map((v, i) => {
          if (v === 0) return null;
          const x = (i % SIZE) * cell;
          const y = Math.floor(i / SIZE) * cell;
          return <rect key={i} x={x} y={y} width={cell} height={cell} fill="rgb(var(--color-text))" />;
        })}
      </svg>
    </div>
  );
}
