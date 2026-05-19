import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store';
import { PHASES } from '../phases';
import { Scatter3D, type Point3D } from '../components/Scatter3D';
import { initModel, trainSkipGram, tokenize, vec, nearest, add, sub, type W2VModel } from '../lib/w2v';
import { KO_CORPUS } from '../data/w2vCorpus';
import { KO_PRETRAINED } from '../data/w2vPretrained';

// E3 한정 — 한국어 코퍼스 + 같은 어휘 묶음(E2와 통일)
type GroupKey = 'royal' | 'family' | 'animal' | 'fruit' | 'country' | 'capital';
const GROUP_COLORS: Record<GroupKey, string> = {
  royal:   '#a855f7',
  family:  '#ef4444',
  animal:  '#16a34a',
  fruit:   '#f59e0b',
  country: '#0d9488',
  capital: '#db2777',
};
const GROUP_LABELS: Record<GroupKey, string> = {
  royal: '왕족', family: '가족', animal: '동물', fruit: '과일', country: '나라', capital: '수도',
};
const PRESETS: { word: string; group: GroupKey }[] = [
  { word: '왕',     group: 'royal' },  { word: '여왕',   group: 'royal' },
  { word: '왕자',   group: 'royal' },  { word: '공주',   group: 'royal' },
  { word: '아빠',   group: 'family' }, { word: '엄마',   group: 'family' },
  { word: '소년',   group: 'family' }, { word: '소녀',   group: 'family' },
  { word: '고양이', group: 'animal' }, { word: '강아지', group: 'animal' },
  { word: '사과',   group: 'fruit' },  { word: '바나나', group: 'fruit' },
  { word: '한국',   group: 'country' },{ word: '일본',   group: 'country' },
  { word: '서울',   group: 'capital' },{ word: '도쿄',   group: 'capital' },
];
const STOP = new Set(['은', '는', '이', '가', '을', '를', '의', '과', '와', '에', '이다', '있다', '어린', '새끼', '우리', '함께', '먹는다', '다스린다', '수도', '도시', '나라', '아시아', '남자', '여자']);

type Tab = 'task' | 'run' | 'check';
type ModelSnapshot = {
  model: W2VModel;
  losses: number[];
  seed: number;
  steps: number;
  source: 'pretrained' | 'fresh' | 'training';
};

function fromPretrained(): W2VModel {
  const index = new Map<string, number>();
  KO_PRETRAINED.vocab.forEach((w, i) => index.set(w, i));
  return { vocab: KO_PRETRAINED.vocab, index, W: KO_PRETRAINED.W, C: KO_PRETRAINED.C, dim: KO_PRETRAINED.dim };
}

export function Phase18() {
  const meta = PHASES.find((p) => p.id === 'p18')!;
  const [tab, setTab] = useState<Tab>('task');
  const [seed, setSeed] = useState(11);
  const [steps, setSteps] = useState(6000);
  const [snap, setSnap] = useState<ModelSnapshot>(() => ({
    model: fromPretrained(),
    losses: [],
    seed: 11,
    steps: 6000,
    source: 'pretrained',
  }));
  const markCompleted = useApp((s) => s.markCompleted);

  useEffect(() => {
    if (tab === 'check') markCompleted('p18');
  }, [tab, markCompleted]);

  const train = () => {
    const m = initModel(KO_CORPUS, 32, seed);
    setSnap({ model: m, losses: [], seed, steps, source: 'training' });
    // 다음 프레임에서 무거운 학습 실행 — 버튼 라벨이 바뀌도록.
    setTimeout(() => {
      const { lossHistory } = trainSkipGram(m, KO_CORPUS, {
        steps, lr: 0.05, windowSize: 4, negatives: 3, seed,
      });
      setSnap({ model: m, losses: lossHistory, seed, steps, source: 'fresh' });
    }, 30);
  };

  return (
    <article>
      <div className="text-xs font-mono text-accent">{meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2">
        E2에서 본 단어 좌표는 누가 정해 준 게 아니에요. A·B·C에서 익힌
        <strong> 예측 → 오차 → 기울기 → 갱신</strong> 한 줄을 그대로 단어 벡터에 적용해서 자리잡힌 거예요.
        이 챕터에서는 "어떤 예측을 시키고, 무엇을 오차로 잡았는지" 보고 직접 학습을 돌립니다.
      </p>

      <div className="flex gap-1 mt-6 border-b border-border">
        <TabBtn active={tab === 'task'}  onClick={() => setTab('task')}>① 학습 과제</TabBtn>
        <TabBtn active={tab === 'run'}   onClick={() => setTab('run')}>② 학습 실행</TabBtn>
        <TabBtn active={tab === 'check'} onClick={() => setTab('check')}>③ 결과 확인</TabBtn>
      </div>

      {tab === 'task'  && <TaskTab />}
      {tab === 'run'   && <RunTab snap={snap} train={train} seed={seed} setSeed={setSeed} steps={steps} setSteps={setSteps} />}
      {tab === 'check' && <CheckTab snap={snap} />}
    </article>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 text-sm border-b-2 -mb-px transition ${
        active ? 'border-accent text-accent font-medium' : 'border-transparent text-muted hover:text-text'
      }`}
    >
      {children}
    </button>
  );
}

// ──────── 탭 1 — 학습 과제 ────────
function TaskTab() {
  // 첫 코퍼스 한 문장 시각화 — 중심 / 주변 단어 보여주기
  const sample = '왕 과 여왕 은 함께 다스린다';
  const words = sample.split(' ');
  const [center, setCenter] = useState(2); // '여왕'
  const window = 2;
  const isContext = (i: number) => i !== center && Math.abs(i - center) <= window;

  return (
    <div className="mt-6 space-y-5">
      <div className="aside-tip">
        <div className="font-medium">🎯 과제 — 중심 단어로 주변 단어 맞히기 (skip-gram)</div>
        <p className="text-sm mt-1">
          코퍼스에서 한 문장을 꺼내고, 한 단어를 <strong>중심</strong>으로 골라요. 그 양옆 몇 단어가 <strong>주변</strong>입니다.
          모델이 받는 입력은 중심 단어 ID 하나. 답은 그 주변 단어들 중 하나. 신경망은 "이 단어 옆에는 어떤 단어가 자주 나올까"를 맞히는 거예요.
        </p>
      </div>

      <h2>한 문장 — 중심 단어를 골라 보세요</h2>
      <div className="card p-4">
        <div className="flex flex-wrap gap-2 text-lg">
          {words.map((w, i) => (
            <button
              key={i}
              onClick={() => setCenter(i)}
              className={
                'px-3 py-1.5 rounded-md border text-sm transition ' +
                (i === center
                  ? 'border-accent bg-accent text-white font-semibold'
                  : isContext(i)
                    ? 'border-accent/40 bg-accent/10 text-accent'
                    : 'border-border text-muted hover:bg-surface')
              }
            >
              {w}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted mt-3">
          짙은 보라 = <strong>중심(입력)</strong>. 옅은 보라 = <strong>주변(정답 후보, window=2)</strong>. 회색 = 멀어서 무시.
        </p>
      </div>

      <h2>A·B·C 흐름이 그대로 적용된다</h2>
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <FlowCard
          step="① 예측"
          summary="중심 단어 벡터로 어휘 전체에 점수 매기기"
          detail={[
            '중심 단어 ID로 입력 임베딩 W에서 벡터 v를 꺼냄 (= lookup).',
            'v와 출력 임베딩 C의 각 행을 내적해 어휘 크기만큼의 점수 z를 얻음.',
            'z에 softmax를 씌우면 어휘 전체에 대한 확률 분포가 나옴 (C2의 다중 분류와 같은 구조).',
          ]}
        />
        <FlowCard
          step="② 오차"
          summary="정답 주변 단어의 확률이 낮으면 손실 큼"
          detail={[
            '정답 = 실제로 그 자리에 있던 주변 단어 (예: 위 문장에서 \'함께\' 또는 \'은\').',
            '그 단어의 확률이 1에 가까울수록 오차 작음. cross-entropy로 잼.',
            '계산을 가볍게 하려고 실제로는 negative sampling으로 일부만 비교.',
          ]}
        />
        <FlowCard
          step="③ 기울기"
          summary="W와 C를 어느 방향으로 옮겨야 오차가 줄지"
          detail={[
            'A에서처럼 손실을 W와 C에 대해 미분해 기울기를 얻음.',
            '의미: \'정답 단어와의 점수는 올리고, 무관한 단어와의 점수는 내려라.\'',
          ]}
        />
        <FlowCard
          step="④ 갱신"
          summary="기울기 방향으로 한 걸음씩 옮기기"
          detail={[
            'W[중심] -= lr × grad, C[정답] -= lr × grad — A·B의 step과 같은 모양.',
            '이걸 수천 번 반복하면 자주 같이 등장한 단어 벡터가 점점 가까워짐.',
          ]}
        />
      </div>

      <div className="aside-note text-sm">
        💡 다른 관점 한 가지 — 이 모델은 사실 <strong>어휘 N개를 가르는 다중 분류 신경망</strong>이에요.
        은닉층 한 층(= W, 임베딩 자리)을 끼우고 출력 뉴런이 어휘 크기만큼인 셈. C2(MNIST 10개 분류)와 구조가 같아요.
        다른 점은 단 하나 — 학습이 끝났을 때 우리가 "정답률"보다 <strong>은닉층 가중치 W</strong>를 더 소중하게 본다는 점이에요.
        그 W의 한 줄이 곧 한 단어의 좌표거든요.
      </div>
    </div>
  );
}

function FlowCard({ step, summary, detail }: { step: string; summary: string; detail: string[] }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-mono text-accent">{step}</div>
      <div className="font-medium mt-0.5">{summary}</div>
      <ul className="list-disc list-inside text-xs text-muted mt-2 space-y-1 leading-relaxed">
        {detail.map((d, i) => (<li key={i}>{d}</li>))}
      </ul>
    </div>
  );
}

// ──────── 탭 2 — 학습 실행 ────────
function RunTab({ snap, train, seed, setSeed, steps, setSteps }: {
  snap: ModelSnapshot; train: () => void;
  seed: number; setSeed: (v: number) => void;
  steps: number; setSteps: (v: number) => void;
}) {
  const isTraining = snap.source === 'training';
  return (
    <div className="mt-6 space-y-5">
      <div className="aside-tip">
        <div className="font-medium">🎯 직접 학습 — 손실이 내려가면 임베딩이 자리잡고 있다는 신호</div>
        <p className="text-sm mt-1">
          시드와 스텝을 정하고 학습을 시작하세요. 손실 곡선이 내려가는 모양은 A의 손실 곡선과 똑같이 생겼어요.
          학습이 끝나면 ③ 결과 확인 탭에서 그 결과를 봅니다.
          ("학습 시작" 누르기 전에는 사전 학습된 모델이 자리에 있어요.)
        </p>
      </div>

      <div className="card p-4 flex flex-wrap gap-4 items-end">
        <label className="text-sm">
          시드
          <input type="number" value={seed} onChange={(e) => setSeed(parseInt(e.target.value || '0'))}
            className="block mt-1 w-24 px-2 py-1 rounded border border-border bg-surface font-mono text-sm" />
        </label>
        <label className="text-sm flex-1 min-w-[200px]">
          스텝 <code className="text-xs font-mono ml-2">{steps}</code>
          <input type="range" min={500} max={8000} step={500} value={steps}
            onChange={(e) => setSteps(parseInt(e.target.value))}
            className="block w-full mt-1" />
        </label>
        <button onClick={train} disabled={isTraining} className="btn-primary text-sm">
          {isTraining ? '학습 중…' : '학습 시작'}
        </button>
      </div>

      <h2>코퍼스 ({KO_CORPUS.length}문장)</h2>
      <div className="card p-3 max-h-48 overflow-y-auto text-xs font-mono space-y-0.5">
        {KO_CORPUS.map((line, i) => (
          <div key={i} className="text-muted">{i + 1}. {line}</div>
        ))}
      </div>

      <h2>학습 결과</h2>
      <div className="card p-4 text-sm space-y-1">
        <div>어휘 수: <strong>{snap.model.vocab.length}</strong></div>
        <div>벡터 차원: <strong>{snap.model.dim}</strong></div>
        <div>출처: {snap.source === 'pretrained'
          ? <span className="text-muted">사전 학습 (학생이 학습 안 한 상태)</span>
          : snap.source === 'training'
            ? <span className="text-amber-600">학습 중…</span>
            : <span className="text-emerald-600">학생이 직접 학습 완료 (seed={snap.seed}, steps={snap.steps})</span>}
        </div>
        {snap.losses.length > 0 && (
          <div>최종 손실(마지막 25스텝 평균): <strong className="font-mono">{snap.losses[snap.losses.length - 1].toFixed(3)}</strong></div>
        )}
      </div>

      {snap.losses.length > 0 && (
        <>
          <h2>손실 그래프</h2>
          <LossChart losses={snap.losses} />
          <p className="text-xs text-muted">
            가로축 = 학습 스텝(25스텝 묶음), 세로축 = 평균 손실. 내려가는 모양이 A에서 본 손실 곡선과 같은 모양이에요.
          </p>
        </>
      )}
    </div>
  );
}

function LossChart({ losses }: { losses: number[] }) {
  const W = 600, H = 160, P = 28;
  const maxL = Math.max(...losses, 1);
  const minL = Math.min(...losses, 0);
  const span = Math.max(0.001, maxL - minL);
  const pts = losses.map((l, i) => {
    const x = P + ((W - 2 * P) * i) / Math.max(1, losses.length - 1);
    const y = H - P - ((H - 2 * P) * (l - minL)) / span;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full card p-2">
      <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke="currentColor" strokeOpacity={0.2} />
      <line x1={P} y1={P} x2={P} y2={H - P} stroke="currentColor" strokeOpacity={0.2} />
      <polyline fill="none" stroke="#a855f7" strokeWidth={2} points={pts.join(' ')} />
      <text x={P + 4} y={P + 8} fontSize={10} fill="currentColor" opacity={0.5}>loss</text>
    </svg>
  );
}

// ──────── 탭 3 — 결과 확인 ────────
function CheckTab({ snap }: { snap: ModelSnapshot }) {
  const model = snap.model;
  const points = useMemo<Point3D[]>(
    () => PRESETS
      .filter((p) => model.index.get(p.word) !== undefined)
      .map((p) => {
        const i = model.index.get(p.word)!;
        const v = model.W[i];
        return { x: v[0], y: v[1], z: v[2], label: p.word, color: GROUP_COLORS[p.group], size: 7 };
      }),
    [model],
  );

  // 빠른 산수 확인 — 왕 - 남자 + 여자
  const va = vec(model, '왕'), vb = vec(model, '남자'), vc = vec(model, '여자');
  const result = va && vb && vc ? add(sub(va, vb), vc) : null;
  const top = result ? nearest(model, result, new Set(['왕', '남자', '여자', ...STOP]), 5) : [];

  return (
    <div className="mt-6 space-y-5">
      <div className="aside-tip">
        <div className="font-medium">🎯 학습이 잘 됐으면 두 가지가 나타난다</div>
        <p className="text-sm mt-1">
          ① 같은 묶음 단어끼리 좌표상 가까이 모임 — 아래 산점도에서 같은 색 점이 뭉치는지 확인.
          ② 의미 산수가 작동 — "왕 − 남자 + 여자"의 답이 top-5 안에 "여왕"이 들어오는지 확인.
        </p>
      </div>

      <div className="text-sm">
        지금 보고 있는 모델: {snap.source === 'pretrained'
          ? <strong>사전 학습 (기본)</strong>
          : snap.source === 'training'
            ? <strong className="text-amber-600">학습 중…</strong>
            : <strong className="text-emerald-600">학생 학습 (seed={snap.seed}, steps={snap.steps})</strong>}
      </div>

      <h2>① 좌표 공간 — d1·d2·d3</h2>
      <div className="card p-3">
        <Scatter3D points={points} axisLabels={['d1', 'd2', 'd3']} />
        <Legend />
        <p className="text-xs text-muted mt-2">
          {model.dim}개 차원 중 처음 3개만 본 거예요. 일부 묶음만 뚜렷이 보일 수 있어요.
        </p>
      </div>

      <h2>② 의미 산수 빠른 확인 — 왕 − 남자 + 여자 ≈ ?</h2>
      <div className="card p-4">
        {top.length > 0 ? (
          <div className="space-y-1.5">
            {top.map((r, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <code className={`font-mono w-20 ${i === 0 ? 'text-accent font-semibold' : ''} ${r.word === '여왕' ? 'text-emerald-600' : ''}`}>{r.word}</code>
                <div className="flex-1 h-2 bg-surface rounded">
                  <div className="h-full rounded bg-accent" style={{ width: `${Math.max(0, r.sim) * 100}%` }} />
                </div>
                <code className="font-mono w-14 text-right">{r.sim.toFixed(2)}</code>
              </div>
            ))}
          </div>
        ) : <div className="text-sm text-muted">학습 중이거나 어휘에 단어가 없어요.</div>}
        <p className="text-xs text-muted mt-3">
          top-5 안에 "여왕"이 들어오면 학습 성공. 시드를 바꾸면 매번 결과가 살짝 흔들리는 것도 직접 확인해 보세요.
          더 자유로운 의미 산수는 E2 ② 의미 산수 탭에서 사전 학습된 모델로 안정적으로 시도해 볼 수 있습니다.
        </p>
      </div>

      <h2>코퍼스에서 직접 잘라낸 단어들 ({model.vocab.length}개)</h2>
      <div className="card p-3 text-xs font-mono max-h-32 overflow-y-auto flex flex-wrap gap-1">
        {model.vocab.map((w) => (
          <span key={w} className="px-1.5 py-0.5 rounded bg-surface">{w}</span>
        ))}
      </div>
      <p className="text-xs text-muted">
        이 어휘는 코퍼스에서 자동으로 만들어집니다 — <code className="font-mono">{tokenize(KO_CORPUS[0]).join(' / ')}</code>처럼 공백으로 잘라 모은 결과예요.
      </p>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs mt-2">
      {(Object.keys(GROUP_COLORS) as GroupKey[]).map((g) => (
        <div key={g} className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full inline-block" style={{ background: GROUP_COLORS[g] }} />
          <span className="text-muted">{GROUP_LABELS[g]}</span>
        </div>
      ))}
    </div>
  );
}
