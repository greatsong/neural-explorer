import { useEffect, useState } from 'react';
import { useApp } from './store';
import type { PhaseId } from './phases';

interface Step {
  src: string;
  caption: string;
  /** 슬라이더/버튼을 만져서 "이 화면이 되도록" 학생에게 안내할 때 표시. */
  action?: string;
}

interface PhaseGuide {
  id: PhaseId;
  num: string;
  title: string;
  goal: string;             // 학습 목표 한 줄
  steps: Step[];            // 단계별 캡처 + 캡션
  todo: string[];           // "해보세요"
  point?: string;           // 짚어줄 핵심 포인트
}

interface GroupGuide {
  num: string;
  name: string;
  blurb: string;
  phases: PhaseGuide[];
}

const SHOT = (name: string) => `${import.meta.env.BASE_URL}walkthrough/${name}.png`;

const GROUPS: GroupGuide[] = [
  {
    num: '1',
    name: '뉴런의 기초',
    blurb: '가장 작은 단위인 뉴런 한 개에서 시작해, 가중치·편향·활성화 함수와 학습의 첫 그림을 그립니다.',
    phases: [
      {
        id: 'p1', num: '1', title: '인공 뉴런 해부',
        goal: '입력 × 가중치 + 편향 → 활성화 함수 라는 한 줄을 손으로 만져 보기.',
        steps: [{ src: SHOT('p1'), caption: '뉴런의 구조와 슬라이더' }],
        todo: ['가중치를 음수로 보내 결정 경계 뒤집기', '편향만으로 출력을 모두 1 또는 0으로'],
        point: '신경망 = 이 뉴런의 거대한 조합.',
      },
      {
        id: 'p2', num: '2', title: '순전파 퀴즈',
        goal: '직접 계산해 보기로 "그냥 곱셈·덧셈"임을 체감.',
        steps: [{ src: SHOT('p2'), caption: '값 입력 → 뉴런 통과' }],
        todo: ['암산으로 답을 먼저, 슬라이더로 확인'],
      },
      {
        id: 'p3', num: '3', title: '오차 측정',
        goal: '예측과 정답 사이의 거리를 어떻게 한 숫자로 나타내는가.',
        steps: [{ src: SHOT('p3'), caption: '예측 vs 정답' }],
        todo: ['예측과 정답이 가까워지면 오차가 어떻게 바뀌나'],
      },
      {
        id: 'p4', num: '4', title: '수동 학습',
        goal: '슬라이더를 직접 움직여 오차를 줄여 보는 경험.',
        steps: [{ src: SHOT('p4'), caption: '슬라이더로 학습' }],
        todo: ['전체 학생이 같은 데이터로 출발해 누가 가장 작은 오차를 만드는지'],
      },
      {
        id: 'p5', num: '5', title: '기울기와 수정',
        goal: '경사 하강법은 "오차의 기울기 방향으로 살짝 이동"의 반복.',
        steps: [{ src: SHOT('p5'), caption: '오차 → 기울기 → 수정' }],
        todo: ['수동 학습 → 자동 학습 비교'],
        point: '경사 하강법은 마법이 아니라 "방향과 보폭"의 반복.',
      },
    ],
  },
  {
    num: '2',
    name: '분류와 평가',
    blurb: '실제 분류 문제와 평가 지표 — "정확도 99%"의 함정까지.',
    phases: [
      {
        id: 'p6', num: '6', title: '입시 합격 예측',
        goal: '정시·학종 시나리오로 가중치가 의사결정에 어떻게 작동하는지.',
        steps: [{ src: SHOT('p6'), caption: '학생 카드 + 가중치 슬라이더' }],
        todo: ['전체 시나리오 한 번씩 돌려보고 8/10 통과'],
      },
      {
        id: 'p7', num: '7', title: '데이터 추가 후 재학습',
        goal: '데이터가 많아지면 모델이 어떻게 더 안정해지는가.',
        steps: [{ src: SHOT('p7'), caption: '10명 → 40명' }],
        todo: ['10명 학습 결과를 40명으로 적용해 보기'],
      },
      {
        id: 'p8', num: '8', title: '정확도',
        goal: '혼동 행렬과 정확도의 의미.',
        steps: [{ src: SHOT('p8'), caption: '혼동 행렬' }],
        todo: ['예측 분포가 한쪽에 쏠릴 때 정확도가 어떻게 보이는가'],
      },
      {
        id: 'p9', num: '9', title: '평가의 함정',
        goal: '코로나·암 시나리오에서 정밀도와 재현율의 트레이드오프.',
        steps: [{ src: SHOT('p9'), caption: '임계값 슬라이더' }],
        todo: ['임계값을 좌우 끝까지 옮겼을 때 어떤 지표가 1, 0이 되는지'],
        point: '"정확도 99%"가 항상 좋은 모델이 아닌 이유.',
      },
    ],
  },
  {
    num: '3',
    name: '직접 만들기',
    blurb: '학생이 직접 데이터를 만들고 공유하는 단계.',
    phases: [
      {
        id: 'p10', num: '10', title: '도트 그림 학습',
        goal: '8×8 도트로 직접 그리고, 오픈 갤러리에 CC-BY로 공유.',
        steps: [{ src: SHOT('p10'), caption: '도트 캔버스 + 갤러리' }],
        todo: ['직접 그린 그림으로 신경망 학습', '갤러리에 닉네임으로 공유'],
      },
    ],
  },
  {
    num: '4',
    name: '깊은 학습',
    blurb: '진짜 손글씨(MNIST)로 신경망 크기와 문제 복잡도의 관계를 발견.',
    phases: [
      {
        id: 'p11', num: '11', title: '신경망 설계',
        goal: '문제가 복잡할수록 신경망도 커야 함을 직관으로.',
        steps: [{ src: SHOT('p11'), caption: '은닉 뉴런 슬라이더' }],
        todo: ['2종 → 3종 → 10종으로 단계별로 키워가며 정확도 변화 관찰'],
      },
      {
        id: 'p12', num: '12', title: 'MNIST 도전',
        goal: '실제 손글씨를 분류하는 신경망의 첫 경험.',
        steps: [{ src: SHOT('p12'), caption: 'MNIST + 손그림 테스트' }],
        todo: ['직접 그린 숫자로 모델 테스트', '학생 데이터를 모델이 어떻게 보는지'],
      },
    ],
  },
];

export function Guide() {
  const setCurrent = useApp((s) => s.setCurrent);
  const bonusUnlocked = useApp((s) => s.bonusUnlocked);
  const bonusUnlocked2 = useApp((s) => s.bonusUnlocked2);

  const goPhase = (id: PhaseId) => {
    setCurrent(id);
    window.location.hash = `#/${id}`;
    window.scrollTo({ top: 0 });
  };

  return (
    <article>
      <div className="text-xs font-mono text-muted">APPENDIX · 학습 가이드</div>
      <h1>한 화면씩 따라 보는 전체 가이드</h1>
      <p className="text-muted mt-2">
        모든 페이즈를 학생 손끝의 변화 순서대로 정리했어요. 캡처는 실제 화면을 그대로 따른 것이며,
        주요 실습은 <strong>슬라이더를 만지기 전 → 만진 후</strong> 단계까지 함께 보여줍니다. 카드의 <strong>이 페이즈 바로 가기</strong>를 누르면 해당 화면으로 점프합니다.
      </p>

      <Toc groups={GROUPS} />

      <section className="mt-12">
        <h2>히든 스테이지</h2>
        <p className="text-sm text-muted">
          5부(생성 모델)와 6부(언어 모델)는 기본 메뉴에 표시되지 않는 히든 스테이지예요.
          호기심 있는 학생만 URL로 직접 들어와 보도록 두었습니다.
        </p>
        <ul className="text-sm mt-3 space-y-1 font-mono">
          <li>· <code>#/p13</code> ~ <code>#/p14</code> — 5부 분류를 넘어 생성으로 {bonusUnlocked && <span className="text-emerald-600">(해금됨)</span>}</li>
          <li>· <code>#/p15</code> ~ <code>#/p22</code> — 6부 언어를 다루는 신경망 {bonusUnlocked2 && <span className="text-emerald-600">(해금됨)</span>}</li>
        </ul>
        <p className="text-xs text-muted mt-2">
          한 번이라도 URL로 진입하면 그 다음부터는 사이드바와 인트로에 정상 표시됩니다.
        </p>
      </section>

{GROUPS.map((g) => (
        <GroupSection key={g.num} group={g} onGo={goPhase} />
      ))}

      <section className="mt-16">
        <div className="aside-tip">
          <div className="font-medium">📌 가이드를 읽는 법</div>
          <ul className="list-disc pl-5 mt-2 text-sm space-y-1">
            <li>각 카드는 학습 목표 → 단계별 캡처 → 해보세요 → 핵심 포인트 순서로 구성됩니다.</li>
            <li>여러 단계가 있는 페이즈는 <strong>슬라이더를 만지기 전 → 만진 후</strong>를 캐러셀로 함께 보여줍니다.</li>
            <li>캡처 옆 <code className="font-mono text-xs">[행동]</code> 표시는 학생이 실제로 만져야 할 슬라이더·버튼을 안내합니다.</li>
            <li>모든 캡처는 <code className="font-mono text-xs">scripts/capture-walkthrough.mjs</code>로 자동 재생성됩니다.</li>
          </ul>
        </div>
      </section>
    </article>
  );
}

function Toc({ groups }: { groups: GroupGuide[] }) {
  return (
    <nav className="card p-4 mt-6 text-sm">
      <div className="text-xs text-muted mb-2 font-mono">목차</div>
      <ol className="space-y-1">
        {groups.map((g) => (
          <li key={g.num}>
            <a href={`#group-${g.num}`} className="hover:text-accent">
              <strong>{g.num}부</strong> — {g.name}{' '}
              <span className="text-muted">({g.phases.map((p) => p.num).join(', ')})</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function GroupSection({ group, onGo }: { group: GroupGuide; onGo: (id: PhaseId) => void }) {
  return (
    <section id={`group-${group.num}`} className="mt-16">
      <div className="text-xs font-mono text-accent">PART {group.num}</div>
      <h2>{group.name}</h2>
      <p className="text-sm text-muted mt-1">{group.blurb}</p>
      <div className="mt-6 space-y-10">
        {group.phases.map((p) => (
          <PhaseCard key={p.id} phase={p} onGo={onGo} />
        ))}
      </div>
    </section>
  );
}

function PhaseCard({ phase, onGo }: { phase: PhaseGuide; onGo: (id: PhaseId) => void }) {
  const multi = phase.steps.length > 1;
  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <div className="text-xs font-mono text-accent">PHASE {phase.num}</div>
          <h3 className="text-xl font-semibold mt-0.5">{phase.title}</h3>
          <p className="text-sm text-muted mt-1">{phase.goal}</p>
        </div>
        <button onClick={() => onGo(phase.id)} className="btn-primary text-sm whitespace-nowrap">
          이 페이즈 바로 가기 →
        </button>
      </div>

      {multi ? <StepCarousel steps={phase.steps} /> : (
        <div className="mt-4">
          <Shot src={phase.steps[0].src} alt={phase.steps[0].caption} />
          <div className="text-xs text-muted mt-2">{phase.steps[0].caption}</div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3 mt-4 text-sm">
        <div>
          <div className="text-xs text-muted mb-1">해보세요</div>
          <ul className="list-disc pl-5 space-y-1">
            {phase.todo.map((t, i) => (<li key={i}>{t}</li>))}
          </ul>
        </div>
        {phase.point && (
          <div className="aside-tip self-start">
            <div className="text-xs font-medium mb-1">짚어줄 포인트</div>
            <div className="text-sm">{phase.point}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepCarousel({ steps }: { steps: Step[] }) {
  const [idx, setIdx] = useState(0);
  const cur = steps[idx];
  const prev = () => setIdx((i) => (i - 1 + steps.length) % steps.length);
  const next = () => setIdx((i) => (i + 1) % steps.length);

  // 키보드 ←→ 지원
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="mt-4">
      <Shot src={cur.src} alt={cur.caption} />
      <div className="flex items-center justify-between gap-3 mt-2">
        <button onClick={prev} className="btn-ghost text-xs">← 이전</button>
        <div className="flex-1 text-center">
          <div className="text-sm">{cur.caption}</div>
          {cur.action && <div className="text-xs text-muted mt-0.5">[행동] {cur.action}</div>}
        </div>
        <button onClick={next} className="btn-ghost text-xs">다음 →</button>
      </div>
      <div className="flex justify-center gap-1 mt-2">
        {steps.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`w-2 h-2 rounded-full transition ${i === idx ? 'bg-accent' : 'bg-border'}`}
            aria-label={`step ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

function Shot({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="rounded-md overflow-hidden border border-border bg-surface">
      <img src={src} alt={alt} loading="lazy" className="w-full h-auto block" />
    </div>
  );
}

