import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store';
import { loadMnist, type Sample } from '../lib/mnist';
import { createDeepMLP, evaluate, forward, paramCount, predict, shuffle, trainStep, type MLP, type TrainSample } from '../lib/nn';
import { NetworkDiagram, LayerEditor } from '../components/NetworkDiagram';

export function Phase12() {
  const [samples, setSamples] = useState<Sample[] | null>(null);
  useEffect(() => { loadMnist().then(setSamples); }, []);

  if (!samples) {
    return (
      <article>
        <div className="text-xs font-mono text-muted">PHASE 12</div>
        <h1>MNIST 도전</h1>
        <p className="text-muted mt-3">데이터 불러오는 중...</p>
      </article>
    );
  }

  return <Workbench samples={samples} />;
}

interface Taught { pixels: Float32Array; label: number; augmented: Float32Array[] }

// 28×28 이미지에 작은 회전·이동·축소를 줘서 한 장에서 여러 장을 만들어 냄.
// 손글씨가 가운데를 살짝 벗어나거나 기울어져도 같은 숫자라는 걸 모델이 익히게 하기 위함.
function augmentImage(pixels: Float32Array): Float32Array {
  const out = new Float32Array(784);
  const dx = (Math.random() - 0.5) * 6;
  const dy = (Math.random() - 0.5) * 6;
  const angle = (Math.random() - 0.5) * 0.5; // ±~14°
  const scale = 0.9 + Math.random() * 0.2;
  const cos = Math.cos(angle) / scale;
  const sin = Math.sin(angle) / scale;
  const cx = 13.5, cy = 13.5;
  for (let y = 0; y < 28; y++) {
    for (let x = 0; x < 28; x++) {
      // 출력 좌표를 원본으로 역매핑(역변환)
      const sx = cos * (x - cx - dx) - sin * (y - cy - dy) + cx;
      const sy = sin * (x - cx - dx) + cos * (y - cy - dy) + cy;
      const ix = Math.round(sx), iy = Math.round(sy);
      if (ix >= 0 && ix < 28 && iy >= 0 && iy < 28) {
        out[y * 28 + x] = pixels[iy * 28 + ix];
      }
    }
  }
  return out;
}

function Workbench({ samples }: { samples: Sample[] }) {
  // 시작은 일부러 작게 — 정확도가 낮게 나오는 상태에서 출발
  const [hiddenLayers, setHiddenLayers] = useState<number[]>([4]);
  const [epochs, setEpochs] = useState(3);
  const [lr, setLr] = useState(0.05);
  const [model, setModel] = useState<MLP | null>(null);
  const [training, setTraining] = useState(false);
  const [progress, setProgress] = useState<{ epoch: number; loss: number; acc: number }[]>([]);
  const [final, setFinal] = useState<{ trainAcc: number; testAcc: number } | null>(null);
  const [taught, setTaught] = useState<Taught[]>([]);
  const [augmentN, setAugmentN] = useState(15);
  const [retrainResult, setRetrainResult] = useState<{ before: number; after: number } | null>(null);
  const cancelRef = useRef(false);
  const markCompleted = useApp((s) => s.markCompleted);

  const split = Math.floor(samples.length * 0.7);
  const train: TrainSample[] = samples.slice(0, split).map((s) => ({ x: s.pixels, y: s.label }));
  const test: TrainSample[] = samples.slice(split).map((s) => ({ x: s.pixels, y: s.label }));

  const layerSizes = [784, ...hiddenLayers, 10];

  const taughtAsTrain = (): TrainSample[] => {
    const out: TrainSample[] = [];
    for (const t of taught) {
      out.push({ x: t.pixels, y: t.label });
      for (const a of t.augmented) out.push({ x: a, y: t.label });
    }
    return out;
  };

  const runTraining = async (extra: TrainSample[], beforeAcc: number | null) => {
    cancelRef.current = false;
    setTraining(true);
    setProgress([]);
    setFinal(null);
    if (beforeAcc === null) setRetrainResult(null);
    const combined = [...train, ...extra];
    const m = createDeepMLP(layerSizes);
    const log: { epoch: number; loss: number; acc: number }[] = [];
    for (let ep = 0; ep < epochs; ep++) {
      if (cancelRef.current) break;
      const batches = shuffle(combined);
      let lossSum = 0, n = 0;
      for (let i = 0; i < batches.length; i += 16) {
        lossSum += trainStep(m, batches.slice(i, i + 16), lr);
        n++;
      }
      const acc = evaluate(m, combined);
      log.push({ epoch: ep + 1, loss: lossSum / n, acc });
      setProgress([...log]);
      await new Promise((r) => setTimeout(r, 0));
    }
    const trainAcc = evaluate(m, combined);
    const testAcc = evaluate(m, test);
    setModel(m);
    setFinal({ trainAcc, testAcc });
    if (beforeAcc !== null) setRetrainResult({ before: beforeAcc, after: testAcc });
    setTraining(false);
    if (testAcc > 0.7) markCompleted('p12');
  };

  const startTrain = () => {
    setTaught([]);
    setRetrainResult(null);
    void runTraining([], null);
  };

  const teachDigit = (pixels: Float32Array, label: number) => {
    const augmented: Float32Array[] = [];
    for (let i = 0; i < augmentN; i++) augmented.push(augmentImage(pixels));
    setTaught((prev) => [...prev, { pixels: new Float32Array(pixels), label, augmented }]);
  };

  const retrainWithTaught = () => {
    const before = final?.testAcc ?? 0;
    void runTraining(taughtAsTrain(), before);
  };

  const params = paramCount({ layers: layerSizes });

  // 빠른 프리셋
  const presets: { label: string; layers: number[]; epochs: number; hint: string }[] = [
    { label: '🐣 시작 (4뉴런·3에폭)', layers: [4], epochs: 3, hint: '거의 못 맞춤. 출발점 보기' },
    { label: '🌱 작게 (8뉴런·8에폭)', layers: [8], epochs: 8, hint: '70%대 가능' },
    { label: '🌳 보통 (32뉴런·15에폭)', layers: [32], epochs: 15, hint: '85%대' },
    { label: '🚀 크게 (64·32 2층·25에폭)', layers: [64, 32], epochs: 25, hint: '90%대' },
    { label: '👑 최강 (128·64 2층·30에폭)', layers: [128, 64], epochs: 30, hint: '95%+ 도전' },
  ];

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE 12</div>
      <h1>MNIST 도전 — 마지막 관문</h1>
      <p className="text-muted mt-2">
        진짜 손글씨 숫자 0~9를 분류해봅시다. 작게 시작해 정확도가 형편없는 상태를 본 뒤,
        뉴런과 층을 키워가며 95% 이상까지 끌어올려 보세요.
      </p>

      <h2>🎚 빠른 프리셋</h2>
      <div className="flex flex-wrap gap-2 mt-3">
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={() => { setHiddenLayers(p.layers); setEpochs(p.epochs); }}
            className="btn-ghost text-sm"
            disabled={training}
            title={p.hint}
          >
            {p.label}
          </button>
        ))}
      </div>

      <h2>신경망 구조 짜기</h2>
      <p className="text-muted text-sm">
        은닉층은 자유롭게 추가/삭제할 수 있어요. 입력(784, 픽셀)과 출력(10, 숫자 0~9)은 고정입니다.
      </p>
      <LayerEditor hiddenLayers={hiddenLayers} setHiddenLayers={setHiddenLayers} disabled={training} />

      <div className="mt-4">
        <NetworkDiagram layers={layerSizes} />
      </div>

      <h2>🛠 학습 설정</h2>
      <div className="grid lg:grid-cols-2 gap-6 items-start mt-3">
        <div className="space-y-4">
          <Slider label="에폭 수" value={epochs} setValue={setEpochs} min={1} max={40} step={1} format={(v) => `${v}회`} />
          <Slider label="학습률" value={lr} setValue={setLr} min={0.005} max={0.2} step={0.005} format={(v) => v.toFixed(3)} />
          <div className="card p-4 text-sm font-mono">
            <div className="text-xs text-muted">구조</div>
            <div className="text-base text-accent">{layerSizes.join(' → ')}</div>
            <div className="text-xs text-muted mt-2">파라미터 수</div>
            <div className="text-lg text-accent">{params.toLocaleString()}개</div>
          </div>
          <button onClick={startTrain} disabled={training} className="btn-primary">
            {training ? '학습 중...' : '학습 시작'}
          </button>
          {training && (
            <button onClick={() => { cancelRef.current = true; }} className="btn-ghost ml-2">중단</button>
          )}
        </div>
        <div>
          <ProgressChart log={progress} />
          {final && (
            <div className="grid grid-cols-2 gap-2 mt-3 font-mono text-sm">
              <div className="card p-3">
                <div className="text-xs text-muted">학습 정확도</div>
                <div className="text-xl">{(final.trainAcc * 100).toFixed(1)}%</div>
              </div>
              <div className={`card p-3 ${final.testAcc >= 0.95 ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-accent bg-accent-bg'}`}>
                <div className="text-xs text-muted">시험 정확도</div>
                <div className="text-xl text-accent">{(final.testAcc * 100).toFixed(1)}%</div>
              </div>
            </div>
          )}
          {final && final.testAcc < 0.5 && (
            <div className="aside-tip mt-3 text-sm">
              아직 헤매고 있네요. 뉴런 수를 늘리거나 에폭을 더 돌려보세요.
            </div>
          )}
          {final && final.testAcc >= 0.95 && (
            <div className="aside-tip mt-3 text-sm">
              🎉 95% 돌파! 사람 수준에 가깝게 손글씨를 읽고 있어요.
            </div>
          )}
        </div>
      </div>

      {model && (
        <>
          <h2>✏️ 직접 숫자 그리기</h2>
          <p className="text-muted text-sm">28×28 캔버스에 숫자 하나를 그려보세요. 모델이 어떤 숫자라고 추측할까요?</p>
          <DigitTester model={model} onTeach={teachDigit} disabled={training} />

          <details className="mt-4 card p-4 text-sm">
            <summary className="cursor-pointer font-medium">🤔 왜 이렇게 자신 있게 틀릴까? — 분포 불일치 이야기</summary>
            <div className="mt-3 space-y-3 leading-relaxed">
              <div>
                <div className="font-medium">1. 학습 데이터 ≠ 우리가 그린 그림</div>
                <p className="text-muted mt-1">
                  학습용 MNIST는 미국 우체국 손글씨를 28×28에 맞춰 <strong>가운데 정렬·크기 정규화·일정한 굵기</strong>로 다듬은 데이터예요.
                  반면 우리 캔버스는 280×280에 굵은 펜으로 자유롭게 그린 뒤 28×28로 줄여요. 결과물의 위치·굵기·강도 분포가 학습 데이터와 다릅니다.
                  모델이 "본 적 없는 모양"을 만나면, 비슷해 보이는 다른 숫자로 자신 있게 잘못 답해요.
                </p>
              </div>
              <div>
                <div className="font-medium">2. 학습 정확도 vs 시험 정확도 차이가 곧 "암기 정도"</div>
                <p className="text-muted mt-1">
                  학습 정확도가 100%인데 시험 정확도가 70%대라면, 모델이 학습 데이터를 <strong>외워버린</strong> 거예요(과적합).
                  외운 건 잘 맞히지만 처음 보는 그림엔 약합니다.
                </p>
              </div>
              <div>
                <div className="font-medium">3. MLP는 위치를 그대로 기억해요</div>
                <p className="text-muted mt-1">
                  우리 모델은 단순 다층 퍼셉트론이라 픽셀 위치 자체가 특징이 됩니다. 같은 5라도 5픽셀 옆으로 옮겨 그리면 거의 다른 입력처럼 봐요.
                  CNN(합성곱 신경망)을 쓰면 위치 변화에 강해지지만, 이번 단계에선 일부러 단순하게 두었어요.
                </p>
              </div>
              <div>
                <div className="font-medium">4. 확신도 50%대는 사실 "잘 모르겠다"</div>
                <p className="text-muted mt-1">
                  1: 57%, 2: 36%처럼 두 후보가 비등하면 모델이 헷갈리고 있다는 뜻입니다. 학습 분포에 없던 그림을 만났다는 또 다른 신호예요.
                </p>
              </div>
            </div>
          </details>

          <h2>🧪 모델에게 직접 가르쳐 보기 — 데이터 증강과 재학습</h2>
          <p className="text-muted text-sm">
            틀린 그림을 정답 라벨과 함께 학습 데이터에 추가해서 다시 학습시켜 봅시다.
            한 장만 추가하면 모델이 외워버리기 쉬우니, 그 그림을 살짝 회전·이동·확대축소해서 <strong>여러 장으로 늘리는 것</strong>이 데이터 증강이에요.
          </p>
          <Teacher
            taught={taught}
            setTaught={setTaught}
            augmentN={augmentN}
            setAugmentN={setAugmentN}
            retrain={retrainWithTaught}
            disabled={training || taught.length === 0}
            retrainResult={retrainResult}
            currentTestAcc={final?.testAcc ?? null}
          />

          <h2>🖼 시험 데이터 결과 미리보기</h2>
          <SampleGallery testSamples={samples.slice(split)} model={model} />
        </>
      )}

      {final && final.testAcc > 0.7 && (
        <div className="aside-tip mt-8">
          <div className="font-medium">🎉 12단계 완주!</div>
          <p className="text-sm mt-2">
            처음엔 가중치 하나 두는 단일 뉴런에서 시작했죠. 지금은 {params.toLocaleString()}개 파라미터로 손글씨를 읽는 신경망을 만들었어요.
            ChatGPT는 여기서 규모만 약 <strong>{Math.round(1_800_000_000_000 / params).toLocaleString()}배</strong> 더 커진 거예요.
            원리는 같고, 손으로 만들 수 있는 거예요.
          </p>
        </div>
      )}
    </article>
  );
}

function ProgressChart({ log }: { log: { epoch: number; loss: number; acc: number }[] }) {
  const W = 460, H = 200;
  if (log.length === 0) {
    return (
      <div className="card p-6 text-center text-muted text-sm">
        학습 시작 버튼을 누르면 손실·정확도 곡선이 그려져요.
      </div>
    );
  }
  const maxLoss = Math.max(...log.map((x) => x.loss));
  const lossPath = log.map((l, i) => {
    const x = 30 + (i / Math.max(log.length - 1, 1)) * (W - 40);
    const y = H - 20 - (l.loss / maxLoss) * (H - 30);
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ');
  const accPath = log.map((l, i) => {
    const x = 30 + (i / Math.max(log.length - 1, 1)) * (W - 40);
    const y = H - 20 - l.acc * (H - 30);
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full border border-border rounded-md bg-surface/40">
      <text x={20} y={14} fontSize={10} fill="rgb(var(--color-muted))">손실(주황) · 정확도(녹색)</text>
      <line x1={30} y1={H - 20} x2={W - 10} y2={H - 20} stroke="rgb(var(--color-border))" />
      <line x1={30} y1={H - 20 - 0.95 * (H - 30)} x2={W - 10} y2={H - 20 - 0.95 * (H - 30)} stroke="rgb(16, 185, 129)" strokeDasharray="3 3" strokeWidth={0.6} />
      <text x={W - 10} y={H - 20 - 0.95 * (H - 30) - 2} textAnchor="end" fontSize={9} fill="rgb(16, 185, 129)">95%</text>
      <path d={lossPath} stroke="rgb(251, 146, 60)" strokeWidth={2} fill="none" />
      <path d={accPath} stroke="rgb(16, 185, 129)" strokeWidth={2} fill="none" />
    </svg>
  );
}

function DigitTester({ model, onTeach, disabled }: { model: MLP; onTeach?: (pixels: Float32Array, label: number) => void; disabled?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPos = useRef<[number, number] | null>(null);
  const [pixels, setPixels] = useState<Float32Array>(new Float32Array(784));
  const [tick, setTick] = useState(0);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement): [number, number] | null => {
    const rect = canvas.getBoundingClientRect();
    let cx: number, cy: number;
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      cx = e.touches[0].clientX; cy = e.touches[0].clientY;
    } else {
      cx = e.clientX; cy = e.clientY;
    }
    return [(cx - rect.left) * (canvas.width / rect.width), (cy - rect.top) * (canvas.height / rect.height)];
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    drawing.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pos = getPos(e, canvas);
    if (!pos) return;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(pos[0], pos[1], 14, 0, Math.PI * 2);
    ctx.fill();
    lastPos.current = pos;
    syncPixels();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pos = getPos(e, canvas);
    if (!pos) return;
    const ctx = canvas.getContext('2d')!;
    ctx.strokeStyle = 'white';
    ctx.fillStyle = 'white';
    ctx.lineWidth = 28;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (lastPos.current) {
      ctx.beginPath();
      ctx.moveTo(lastPos.current[0], lastPos.current[1]);
      ctx.lineTo(pos[0], pos[1]);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(pos[0], pos[1], 14, 0, Math.PI * 2);
      ctx.fill();
    }
    lastPos.current = pos;
    syncPixels();
  };

  const stopDraw = () => {
    drawing.current = false;
    lastPos.current = null;
  };

  const syncPixels = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const tmp = document.createElement('canvas');
    tmp.width = 28; tmp.height = 28;
    const tctx = tmp.getContext('2d')!;
    tctx.drawImage(canvas, 0, 0, 28, 28);
    const img = tctx.getImageData(0, 0, 28, 28);
    const arr = new Float32Array(784);
    for (let i = 0; i < 784; i++) arr[i] = img.data[i * 4] / 255;
    setPixels(arr);
    setTick((t) => t + 1);
    void ctx;
  };

  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setPixels(new Float32Array(784));
    setTick((t) => t + 1);
  };

  useEffect(() => { clear(); }, []);

  void tick;
  const empty = pixels.every((v) => v < 0.05);
  const result = !empty ? forward(model, pixels) : null;
  const top = result ? predict(model, pixels) : null;

  return (
    <div className="grid lg:grid-cols-[auto_1fr] gap-6 items-start mt-3">
      <div>
        <canvas
          ref={canvasRef}
          width={280}
          height={280}
          className="border border-border rounded-md bg-black touch-none"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={(e) => { startDraw(e); e.preventDefault(); }}
          onTouchMove={(e) => { draw(e); e.preventDefault(); }}
          onTouchEnd={stopDraw}
        />
        <button onClick={clear} className="btn-ghost mt-3">지우기</button>
      </div>

      <div className="card p-5">
        <div className="text-sm font-medium">모델의 추측</div>
        {empty ? (
          <div className="text-muted mt-2 text-sm">왼쪽 캔버스에 숫자를 굵게 그려보세요.</div>
        ) : (
          <>
            <div className="text-6xl font-bold text-accent mt-3">{top}</div>
            <div className="space-y-1 mt-4">
              {result && Array.from(result.probs).map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="font-mono w-4">{i}</span>
                  <div className="flex-1 h-2 bg-border rounded overflow-hidden">
                    <div className={`h-full ${i === top ? 'bg-accent' : 'bg-muted'}`} style={{ width: `${p * 100}%` }} />
                  </div>
                  <span className="font-mono w-12 text-right">{(p * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
            {onTeach && (
              <div className="mt-5 pt-4 border-t border-border">
                <div className="text-xs text-muted">정답을 알려주면 아래 "🧪 모델에게 가르쳐 보기" 섹션에 추가돼요.</div>
                <div className="grid grid-cols-10 gap-1 mt-2">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => onTeach(pixels, i)}
                      disabled={disabled}
                      className={`text-sm font-mono py-1 rounded border ${i === top ? 'border-accent text-accent' : 'border-border text-muted'} hover:bg-accent-bg disabled:opacity-50`}
                      title={`이건 ${i}이라고 가르치기`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Teacher({
  taught, setTaught, augmentN, setAugmentN, retrain, disabled, retrainResult, currentTestAcc,
}: {
  taught: Taught[];
  setTaught: (t: Taught[]) => void;
  augmentN: number;
  setAugmentN: (n: number) => void;
  retrain: () => void;
  disabled: boolean;
  retrainResult: { before: number; after: number } | null;
  currentTestAcc: number | null;
}) {
  const total = taught.reduce((n, t) => n + 1 + t.augmented.length, 0);
  return (
    <div className="card p-4 mt-3 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm flex items-center gap-2">
          <span>장당 증강 수</span>
          <input
            type="number" min={0} max={50} value={augmentN}
            onChange={(e) => setAugmentN(Math.max(0, Math.min(50, parseInt(e.target.value || '0'))))}
            className="w-16 px-2 py-1 bg-surface border border-border rounded font-mono text-sm"
          />
        </label>
        <span className="text-xs text-muted">한 장 → 회전·이동·크기를 살짝 바꾼 사본 N장 추가</span>
      </div>

      {taught.length === 0 ? (
        <div className="text-sm text-muted">
          위 캔버스에서 그림을 그리고 "정답" 숫자 버튼을 눌러 추가해 보세요.
        </div>
      ) : (
        <>
          <div className="text-sm">
            추가한 그림 <strong>{taught.length}장</strong> · 증강 포함 총 <strong>{total}장</strong>
          </div>
          <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
            {taught.map((t, i) => (
              <div key={i} className="card p-1 text-center">
                <PixelView pixels={t.pixels} />
                <div className="text-[10px] mt-1 font-mono">→ {t.label}</div>
                <button
                  onClick={() => setTaught(taught.filter((_, j) => j !== i))}
                  className="text-[10px] text-muted hover:text-rose-500"
                  disabled={disabled}
                >지우기</button>
              </div>
            ))}
          </div>

          {taught.some((t) => t.augmented.length > 0) && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted">🔍 증강 결과 미리보기 — 한 장이 어떻게 여러 장으로 늘어났는지 보기</summary>
              <div className="mt-3 space-y-3">
                <p className="text-xs text-muted">
                  원본(왼쪽 첫 장) → 회전·이동·축소를 살짝 다르게 준 사본들. 사람 눈에는 거의 같은 숫자지만, 픽셀 위치가 달라서
                  모델 입장에선 "다양한 예시"로 보여요.
                </p>
                {taught.map((t, i) => (
                  <div key={i}>
                    <div className="text-xs text-muted mb-1">
                      추가 #{i + 1} <span className="font-mono">→ {t.label}</span> (원본 1 + 증강 {t.augmented.length})
                    </div>
                    <div className="flex flex-wrap gap-1 items-start">
                      <div className="text-center">
                        <PixelView pixels={t.pixels} />
                        <div className="text-[9px] text-accent">원본</div>
                      </div>
                      {t.augmented.map((a, j) => (
                        <div key={j} className="text-center opacity-90">
                          <PixelView pixels={a} />
                          <div className="text-[9px] text-muted">#{j + 1}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}

          <button onClick={retrain} disabled={disabled} className="btn-primary">
            추가한 데이터로 다시 학습
          </button>
        </>
      )}

      {retrainResult && (
        <div className="aside-tip">
          <div className="font-medium text-sm">📊 재학습 결과</div>
          <div className="font-mono text-sm mt-2">
            시험 정확도: {(retrainResult.before * 100).toFixed(1)}% → <span className="text-accent">{(retrainResult.after * 100).toFixed(1)}%</span>
            {' '}
            <span className="text-muted">
              ({retrainResult.after > retrainResult.before ? '+' : ''}{((retrainResult.after - retrainResult.before) * 100).toFixed(1)}%p)
            </span>
          </div>
          <p className="text-xs text-muted mt-2">
            같은 그림을 다시 그려 보세요. 이번엔 모델이 어떻게 답할까요?
            (전체 시험 데이터 정확도가 살짝 떨어질 수도 있어요 — 한 사용자의 글씨체에 모델이 적응하면, 다른 글씨체엔 약해지는 거죠.)
          </p>
        </div>
      )}
      {!retrainResult && currentTestAcc !== null && taught.length > 0 && (
        <div className="text-xs text-muted">현재 시험 정확도: {(currentTestAcc * 100).toFixed(1)}% — 재학습 후 어떻게 바뀌는지 비교해 보세요.</div>
      )}
    </div>
  );
}

function SampleGallery({ testSamples, model }: { testSamples: Sample[]; model: MLP }) {
  const [mode, setMode] = useState<'first24' | 'wrong'>('first24');
  const [showCount, setShowCount] = useState(24);

  // 모든 시험 데이터에 대해 예측을 한 번만 계산
  const evaluated = testSamples.map((s) => ({ s, p: predict(model, s.pixels) }));
  const wrongOnly = evaluated.filter((e) => e.p !== e.s.label);
  const list = mode === 'wrong' ? wrongOnly : evaluated.slice(0, 24);
  const visible = list.slice(0, showCount);

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button
          onClick={() => { setMode('first24'); setShowCount(24); }}
          className={`px-3 py-1 rounded-md text-sm border ${mode === 'first24' ? 'border-accent text-accent bg-accent-bg' : 'border-border text-muted'}`}
        >
          앞에서 24장
        </button>
        <button
          onClick={() => { setMode('wrong'); setShowCount(24); }}
          className={`px-3 py-1 rounded-md text-sm border ${mode === 'wrong' ? 'border-rose-500 text-rose-500 bg-rose-500/10' : 'border-border text-muted'}`}
        >
          ❌ 틀린 것만 보기 ({wrongOnly.length}장)
        </button>
        <span className="text-xs text-muted">
          전체 {testSamples.length}장 중 {wrongOnly.length}장 틀림 ({((wrongOnly.length / Math.max(testSamples.length, 1)) * 100).toFixed(1)}%)
        </span>
      </div>

      {mode === 'wrong' && wrongOnly.length === 0 && (
        <div className="aside-tip text-sm">🎉 시험 데이터에서 틀린 그림이 한 장도 없어요!</div>
      )}

      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
        {visible.map(({ s, p }, i) => {
          const right = p === s.label;
          return (
            <div key={i} className={`card p-2 text-center ${right ? '' : 'border-rose-500/50'}`}>
              <PixelView pixels={s.pixels} />
              <div className="text-xs mt-1 font-mono">
                {s.label} → <span className={right ? 'text-emerald-600' : 'text-rose-600'}>{p}</span>
              </div>
            </div>
          );
        })}
      </div>

      {visible.length < list.length && (
        <button onClick={() => setShowCount((n) => n + 48)} className="btn-ghost mt-3 text-sm">
          더 보기 (+48장 · 남은 {list.length - visible.length}장)
        </button>
      )}
    </div>
  );
}

function PixelView({ pixels }: { pixels: Float32Array }) {
  return (
    <div className="inline-grid bg-black p-0.5" style={{ gridTemplateColumns: 'repeat(28, 1fr)', gap: 0 }}>
      {Array.from(pixels).map((v, i) => (
        <div key={i} style={{ width: 2, height: 2, background: `rgba(255,255,255,${v})` }} />
      ))}
    </div>
  );
}

function Slider({
  label, value, setValue, min, max, step, format,
}: { label: string; value: number; setValue: (v: number) => void; min: number; max: number; step: number; format?: (v: number) => string }) {
  return (
    <label className="block">
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="font-mono text-accent">{format ? format(value) : value.toFixed(3)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => setValue(parseFloat(e.target.value))} className="w-full" />
    </label>
  );
}
