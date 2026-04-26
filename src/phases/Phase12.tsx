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

function Workbench({ samples }: { samples: Sample[] }) {
  // 시작은 일부러 작게 — 정확도가 낮게 나오는 상태에서 출발
  const [hiddenLayers, setHiddenLayers] = useState<number[]>([4]);
  const [epochs, setEpochs] = useState(3);
  const [lr, setLr] = useState(0.05);
  const [model, setModel] = useState<MLP | null>(null);
  const [training, setTraining] = useState(false);
  const [progress, setProgress] = useState<{ epoch: number; loss: number; acc: number }[]>([]);
  const [final, setFinal] = useState<{ trainAcc: number; testAcc: number } | null>(null);
  const cancelRef = useRef(false);
  const markCompleted = useApp((s) => s.markCompleted);

  const split = Math.floor(samples.length * 0.7);
  const train: TrainSample[] = samples.slice(0, split).map((s) => ({ x: s.pixels, y: s.label }));
  const test: TrainSample[] = samples.slice(split).map((s) => ({ x: s.pixels, y: s.label }));

  const layerSizes = [784, ...hiddenLayers, 10];

  const startTrain = async () => {
    cancelRef.current = false;
    setTraining(true);
    setProgress([]);
    setFinal(null);
    const m = createDeepMLP(layerSizes);
    const log: { epoch: number; loss: number; acc: number }[] = [];
    for (let ep = 0; ep < epochs; ep++) {
      if (cancelRef.current) break;
      const batches = shuffle(train);
      let lossSum = 0, n = 0;
      for (let i = 0; i < batches.length; i += 16) {
        lossSum += trainStep(m, batches.slice(i, i + 16), lr);
        n++;
      }
      const acc = evaluate(m, train);
      log.push({ epoch: ep + 1, loss: lossSum / n, acc });
      setProgress([...log]);
      await new Promise((r) => setTimeout(r, 0));
    }
    const trainAcc = evaluate(m, train);
    const testAcc = evaluate(m, test);
    setModel(m);
    setFinal({ trainAcc, testAcc });
    setTraining(false);
    if (testAcc > 0.7) markCompleted('p12');
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

      <h2>🧱 네트워크 구조 짜기</h2>
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
          <DigitTester model={model} />

          <h2>🖼 시험 데이터 결과 미리보기</h2>
          <SampleGallery samples={samples.slice(split, split + 24)} model={model} />
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

function DigitTester({ model }: { model: MLP }) {
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
          </>
        )}
      </div>
    </div>
  );
}

function SampleGallery({ samples, model }: { samples: Sample[]; model: MLP }) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 mt-3">
      {samples.map((s, i) => {
        const p = predict(model, s.pixels);
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
