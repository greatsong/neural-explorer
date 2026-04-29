// PhaseB3 — 학습 / 평가 데이터 나누기 (진짜 분할 슬라이더)
// 슬라이더가 store.setEvalRatio()를 호출하면 dotStore가 trainIds/evalIds를 다시 만들고
// 학습된 binaryModel을 무효화한다. → 그림 갤러리·B4·C1까지 자동 갱신.
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store';
import { useDot, useActiveSamples, useActiveTrain, useActiveEval } from '../dotStore';
import { type DotSample, type ShapeLabel, SHAPE_LABEL_KO } from '../data/dotShapes';
import { PHASES } from '../phases';

// B4가 사용하는 두 라벨만 분할 통계에 표시 (square는 데이터셋엔 있어도 분류 대상이 아님)
const SHAPE_LABEL_LIST: ShapeLabel[] = ['circle', 'triangle'];

export function PhaseB3() {
  const meta = PHASES.find((p) => p.id === 'b3')!;
  const markCompleted = useApp((s) => s.markCompleted);

  const evalRatio = useDot((s) => s.evalRatio);
  const setEvalRatio = useDot((s) => s.setEvalRatio);

  const active = useActiveSamples();
  const trainData = useActiveTrain();
  const evalData = useActiveEval();

  const [pendingPct, setPendingPct] = useState(() => Math.round(evalRatio * 100));
  const sliderTouchedRef = useRef(false);

  // 외부에서 evalRatio가 바뀐 경우 슬라이더 표시값도 동기화
  useEffect(() => {
    setPendingPct(Math.round(evalRatio * 100));
  }, [evalRatio]);

  // 슬라이더가 만지면 즉시 store 갱신 — 분할이 *실제로* 다시 만들어진다.
  function onSliderChange(pct: number) {
    sliderTouchedRef.current = true;
    setPendingPct(pct);
    setEvalRatio(pct / 100);
  }

  // 라벨별 카운트 — *실제 분할 결과*에서 산출
  // square 데이터는 분류 대상이 아니라 표·갤러리에서 모두 제외한다
  const activeBin = active.filter((s) => s.label !== 'square');
  const trainBin = trainData.filter((s) => s.label !== 'square');
  const evalBin = evalData.filter((s) => s.label !== 'square');

  const labelCounts: Record<ShapeLabel, { total: number; train: number; evalN: number }> = {
    circle: { total: 0, train: 0, evalN: 0 },
    triangle: { total: 0, train: 0, evalN: 0 },
    square: { total: 0, train: 0, evalN: 0 },
  };
  for (const lbl of SHAPE_LABEL_LIST) {
    labelCounts[lbl].total = activeBin.filter((s) => s.label === lbl).length;
    labelCounts[lbl].train = trainBin.filter((s) => s.label === lbl).length;
    labelCounts[lbl].evalN = evalBin.filter((s) => s.label === lbl).length;
  }
  const totalActive = activeBin.length;
  const totalTrain = trainBin.length;
  const totalEval = evalBin.length;
  const pct = Math.round(evalRatio * 100);

  // 완료 처리 — 슬라이더 1회 만진 뒤 또는 6초 자동
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
  }, [pendingPct, markCompleted]);

  const tradeoffMsg =
    pct <= 12
      ? '평가용이 너무 적어요 — 새 그림 몇 장만 우연히 맞히면 점수가 출렁입니다.'
      : pct >= 40
      ? '평가용이 너무 많아요 — 학습용이 빈약해서 모델이 충분히 배우지 못해요.'
      : '균형 잡힌 비율 — 학습은 충분히, 평가도 흔들리지 않을 만큼.';

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2 text-sm">{meta.subtitle}</p>

      <p className="mt-4 text-[15px] leading-relaxed">
        외운 것인지, <strong>새 그림</strong>에서도 통하는지 확인하려면 데이터를 둘로 나눠야 해요.
        한 묶음으로는 공부(<strong>학습용</strong>), 다른 묶음으로는 시험(<strong>평가용</strong>) —
        시험 문제로 공부하면 부정행위니까 시작부터 분리합니다.
      </p>

      {/* ── 메인 한 viewport ── */}
      <div className="mt-5 grid lg:grid-cols-[1.7fr_1fr] gap-4 items-start">
        {/* 좌측 — 진짜 분할 시각화 */}
        <div className="space-y-3">
          <div className="card p-4">
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <div>
                <div className="text-sm font-medium">데이터 분할 (실제)</div>
                <div className="text-[12px] text-muted mt-0.5">
                  active 데이터 {totalActive}장 — 라벨별로 균등 분할(계층 샘플링).
                </div>
              </div>
              <div className="text-[12px] font-mono text-muted">
                <span className="text-accent font-semibold">{totalTrain}</span>
                <span className="mx-1">/</span>
                <span style={{ color: 'rgb(190,18,60)' }} className="font-semibold">{totalEval}</span>
                <span className="ml-1">(시드 고정)</span>
              </div>
            </div>

            {/* 분할 비율 막대 — 실제 결과 */}
            <div className="mt-3">
              <div className="h-7 w-full rounded-md overflow-hidden border border-border flex text-[11px] font-mono">
                <div
                  className="flex items-center justify-center text-white"
                  style={{
                    width: `${100 - pct}%`,
                    background: 'rgb(var(--color-accent))',
                  }}
                >
                  학습용 {totalTrain}장 ({100 - pct}%)
                </div>
                <div
                  className="flex items-center justify-center text-white"
                  style={{ width: `${pct}%`, background: 'rgb(190,18,60)' }}
                >
                  평가용 {totalEval}장 ({pct}%)
                </div>
              </div>
            </div>

            {/* 라벨별 카운트 표 — 실제 분할 결과 */}
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
                      <td className="text-right px-2">{labelCounts[lbl].total}</td>
                      <td className="text-right px-2 text-accent">{labelCounts[lbl].train}</td>
                      <td className="text-right px-2" style={{ color: 'rgb(190,18,60)' }}>
                        {labelCounts[lbl].evalN}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-border bg-surface/40 text-[11px] text-muted">
                    <td className="px-2 py-1 font-sans">합계</td>
                    <td className="text-right px-2">{totalActive}</td>
                    <td className="text-right px-2 text-accent">{totalTrain}</td>
                    <td className="text-right px-2" style={{ color: 'rgb(190,18,60)' }}>
                      {totalEval}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 그림 갤러리 — 비율 바뀌면 즉시 다시 나뉘는 모습이 보임 */}
          <div className="card p-3">
            <GalleryRow
              title="학습용 그림"
              caption="공부할 때 본 그림 — 모델이 가중치를 맞추는 데 쓰여요."
              samples={trainBin}
              accent="accent"
            />
            <div className="border-t border-dashed border-border my-3" />
            <GalleryRow
              title="평가용 그림"
              caption="처음 보는 그림 — 학습 끝난 뒤에만 꺼내 봅니다."
              samples={evalBin}
              accent="rose"
            />
          </div>
        </div>

        {/* 우측 — 슬라이더 + 위생 경고 */}
        <div className="space-y-3">
          <div className="card p-3">
            <div className="text-sm font-medium">평가용 비율 정하기</div>
            <p className="text-[12px] text-muted mt-1 leading-relaxed">
              슬라이더를 움직이면 분할이 <strong>실제로</strong> 다시 만들어져요.
              왼쪽 그림 묶음이 즉시 바뀌는 모습을 보세요.
            </p>
            <div className="mt-3">
              <div className="flex items-baseline justify-between text-[12px] font-mono">
                <span className="text-muted">평가용 비율</span>
                <span className="text-accent font-semibold">{pendingPct}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={50}
                step={5}
                value={pendingPct}
                onChange={(e) => onSliderChange(parseInt(e.target.value, 10))}
                className="w-full mt-1 accent-[rgb(var(--color-accent))]"
              />
              <div className="flex justify-between text-[10px] text-muted font-mono mt-0.5">
                <span>10%</span><span>25%</span><span>50%</span>
              </div>
            </div>
            <div className="mt-3 text-[12px] leading-snug bg-surface/60 border border-border rounded-md px-3 py-2">
              {tradeoffMsg}
            </div>
            <div className="mt-2 text-[11px] text-muted leading-snug">
              비율을 바꾸면 학습된 B4 모델은 다시 학습해야 해요.
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
