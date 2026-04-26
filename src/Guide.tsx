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
        point: '여기까지 끝나면 1차 포털이 열립니다.',
      },
    ],
  },
  {
    num: '5',
    name: '분류를 넘어 생성으로 (히든)',
    blurb: '4부를 통과한 학생만 발견하는 차원. 그림을 새로 만들어 내는 모델의 출발점.',
    phases: [
      {
        id: 'p13', num: '13', title: '평균과 분포',
        goal: '같은 라벨 그림의 픽셀 평균이 곧 가장 단순한 생성 모델임을 체감.',
        steps: [
          { src: SHOT('p13-1-mean'), caption: '시작 — 두 라벨의 평균 이미지' },
          { src: SHOT('p13-2-blend'), caption: 'blend = 0.5', action: '혼합 슬라이더를 0.5로' },
          { src: SHOT('p13-3-noise'), caption: 'noise를 더하면 그림마다 결과가 흔들림', action: 'noise 슬라이더 위로' },
        ],
        todo: ['blend 0 ↔ 1 옮기기', 'noise 올리고 시드 변경', '분산이 큰 픽셀 = 자주 흔들리는 자리'],
      },
      {
        id: 'p14', num: '14', title: '오토인코더',
        goal: '그림 → 짧은 코드(잠재 벡터) → 그림. 디코더가 곧 "코드 → 그림" 마법 함수.',
        steps: [
          { src: SHOT('p14-1-structure'), caption: '① 구조 — 64픽셀 → z(2D) → 64픽셀' },
          { src: SHOT('p14-2-before'), caption: '② 학습 시작 직전' },
          { src: SHOT('p14-3-after'), caption: '② 학습 완료 — 손실이 내려감' },
          { src: SHOT('p14-4-explore'), caption: '③ z=(0,0) 부근 탐험' },
          { src: SHOT('p14-5-edge'), caption: '③ z 모서리 — 학습 데이터가 없는 자리', action: 'z₁=z₂=1.5' },
        ],
        todo: ['② 학습 시작 후 손실 그래프 관찰', '③ z 슬라이더로 새 그림 만들기'],
        point: '잠재 공간의 한 점 = 한 그림. Stable Diffusion·VAE의 출발점. 여기서 2차 포털이 열립니다.',
      },
    ],
  },
  {
    num: '6',
    name: '언어를 다루는 신경망 (히든)',
    blurb: '5부를 통과한 학생만 발견하는 두 번째 차원. 글자가 숫자가 되어 GPT가 다음 토큰을 떠올리는 순간까지.',
    phases: [
      {
        id: 'p15', num: '15', title: '텍스트가 숫자가 되기까지',
        goal: '글자 → 코드포인트 → UTF-8 바이트 → 0과 1.',
        steps: [
          { src: SHOT('p15-1-codepoint'), caption: '① 글자 클릭만으로 코드포인트가 펼쳐짐' },
          { src: SHOT('p15-2-input'), caption: '② 직접 입력 — 글자별 표가 즉시' },
          { src: SHOT('p15-3-compare'), caption: '③ 영/한/한자/이모지 비교 (글자당 바이트 1.00 → 3.67)' },
        ],
        todo: ['이모지를 넣어 한 글자 = 4 바이트 확인', '본인 이름을 한·영으로 비교'],
      },
      {
        id: 'p16', num: '16', title: '토큰',
        goal: 'BPE는 "자주 함께 등장하는 두 토큰을 합치기"의 반복.',
        steps: [
          { src: SHOT('p16-1-tokenizer'), caption: '① GPT 스타일 토크나이저' },
          { src: SHOT('p16-2-bpe-0'), caption: '② 시작 — 글자 단위' },
          { src: SHOT('p16-3-bpe-3'), caption: '② 3 스텝 — \'er_\', \'low\' 합쳐짐', action: '다음 합치기 버튼 3번' },
          { src: SHOT('p16-4-bpe-8'), caption: '② 8 스텝 — \'low_\', \'newer_\'가 통째로 한 토큰', action: '계속 클릭' },
          { src: SHOT('p16-5-compare'), caption: '③ 한글이 영어보다 잘게 쪼개짐' },
        ],
        todo: ['② BPE를 처음부터 끝까지 클릭', '③ 같은 의미의 영/한 글자당 토큰 수 비교'],
        point: '한글이 더 잘게 쪼개지는 이유 = GPT 사전이 영어 코퍼스로 학습됨.',
      },
      {
        id: 'p17', num: '17', title: '원-핫에서 임베딩으로',
        goal: '원-핫의 한계 → 학습되는 임베딩 벡터가 의미를 위치에 새김.',
        steps: [
          { src: SHOT('p17-1-onehot'), caption: '① 원-핫 표 — 모든 쌍의 cos = 0' },
          { src: SHOT('p17-2-embed'), caption: '② 의미 기반 3D 임베딩 — 동물·과일·컴퓨터가 따로 모임' },
          { src: SHOT('p17-3-play-default'), caption: '③ 기본 — cos 0.99' },
          { src: SHOT('p17-4-play-far'), caption: '③ d1을 -1로 → cos -0.29', action: '단어 A의 d1 슬라이더를 -1로' },
        ],
        todo: ['② 3D를 드래그해서 클러스터 위치 확인', '③ 슬라이더로 한 단어 멀리 보내기'],
      },
      {
        id: 'p18', num: '18', title: 'Word2Vec 미니',
        goal: 'skip-gram으로 임베딩이 자동으로 자리잡는 과정 + 벡터 산수의 의미.',
        steps: [
          { src: SHOT('p18-1-before'), caption: '학습 전 — 코퍼스 보기' },
          { src: SHOT('p18-2-trained'), caption: '학습 완료 — 손실 그래프' },
          { src: SHOT('p18-3-space-en'), caption: '② PCA 3D 클러스터' },
          { src: SHOT('p18-4-king'), caption: '③ king − man + woman ≈ queen', action: '검증된 페어 버튼' },
          { src: SHOT('p18-5-boy'), caption: '③ boy − man + woman ≈ girl' },
        ],
        todo: ['EN 시드 7 / KO 시드 100 으로 학습', '검증 페어 4개 모두 클릭', '자유 입력으로 흔들리는 페어도 시도'],
        point: '진짜 Word2Vec은 수십억 단어 — 데이터가 많을수록 의미의 위치가 또렷해진다.',
      },
      {
        id: 'p19', num: '19', title: '시퀀스',
        goal: '단어 가방의 한계 → RNN이 순서를 기억하는 직관.',
        steps: [
          { src: SHOT('p19-1-why'), caption: '① 같은 단어, 다른 순서, 다른 의미' },
          { src: SHOT('p19-2-avg'), caption: '② 평균 임베딩은 두 문장이 같음' },
          { src: SHOT('p19-3-rnn-c0'), caption: '③ carry=0 — 마지막 입력만 기억', action: 'carry 슬라이더 0' },
          { src: SHOT('p19-4-rnn-c5'), caption: '③ carry=0.5 — 균형', action: '0.5' },
          { src: SHOT('p19-5-rnn-c9'), caption: '③ carry=0.9 — 첫 입력만 기억', action: '0.9' },
        ],
        todo: ['carry를 끝에서 끝까지 옮기며 두 문장의 최종 기억 비교'],
      },
      {
        id: 'p20', num: '20', title: '어텐션',
        goal: '어텐션 = 점수 → softmax → 가중 합. 세 단계.',
        steps: [
          { src: SHOT('p20-1-idea'), caption: '① 핵심 식 softmax(QKᵀ)V' },
          { src: SHOT('p20-2-default'), caption: '② 시작 — 봤다가 자기 자신을 봄' },
          { src: SHOT('p20-3-modified'), caption: '② 봤다 → 쥐를로 시선 이동', action: '봤다 행의 쥐를 칸을 5로, 봤다 칸을 1로' },
          { src: SHOT('p20-4-output'), caption: '③ 가중 합 결과 — 봤다\'에 고양이는 색이 묻어남' },
        ],
        todo: ['② 슬라이더로 누가 누구를 보는지 옮기기', '③ 입력 vs 출력 색 비교'],
      },
      {
        id: 'p21', num: '21', title: '멀티헤드 트랜스포머',
        goal: '한 헤드는 한 시선 → 여러 헤드 + 한 블록 + 깊이.',
        steps: [
          { src: SHOT('p21-1-heads'), caption: '① 4개 헤드가 같은 문장을 다르게 봄' },
          { src: SHOT('p21-2-block'), caption: '② 블록 흐름 — Attn + FFN + 두 개의 잔차' },
          { src: SHOT('p21-3-depth-1'), caption: '③ 1층 — 단순 관계', action: '층 슬라이더 1' },
          { src: SHOT('p21-4-depth-6'), caption: '③ 6층 — 의미 관계', action: '6' },
          { src: SHOT('p21-5-depth-12'), caption: '③ 12층 — 추상적 관계', action: '12 (GPT-2 small)' },
        ],
        todo: ['헤드별 시선이 어떻게 다른지 짝과 맞춰 보기'],
      },
      {
        id: 'p22', num: '22', title: 'GPT의 다음 토큰',
        goal: 'logit → softmax → temperature/top-k/top-p로 샘플링. 한 토큰씩 누적.',
        steps: [
          { src: SHOT('p22-1-logits'), caption: '① 어휘 분포 top-10' },
          { src: SHOT('p22-2-temp-low'), caption: '② T=0.1 → 거의 결정적 (top-1 99.8%)', action: 'temperature 0.1' },
          { src: SHOT('p22-3-temp-mid'), caption: '② T=1.0 → 자연스러운 분포 (top-1 38%)', action: '1.0' },
          { src: SHOT('p22-4-temp-high'), caption: '② T=2.0 → 평탄, 거의 무작위 (top-1 17%)', action: '2.0' },
          { src: SHOT('p22-5-gen-0'), caption: '③ 생성 시작 직전' },
          { src: SHOT('p22-6-gen-4'), caption: '③ 4 토큰 누적', action: '한 토큰 더를 4번' },
        ],
        todo: ['T를 끝에서 끝까지 옮기며 분포 모양 변화', '③ 같은 시드 vs 새 시드 비교'],
        point: '지금까지 본 모든 단계가 ChatGPT가 한 줄을 답할 때 한 토큰마다 한 번씩 통째로 돌아갑니다.',
      },
    ],
  },
];

const PORTAL_NOTE = {
  one: { src: SHOT('portal-1'), caption: '1차 포털 — 4부 끝(MNIST 페이지 하단)' },
  two: { src: SHOT('portal-2'), caption: '2차 포털 — 5부 끝(오토인코더 페이지 하단)' },
};

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
        <h2>두 개의 포털</h2>
        <p className="text-sm text-muted mb-4">
          5부와 6부는 4부·5부를 끝낸 학생만 발견하는 히든 스테이지예요. 두 포털은 각각 다른 색과 모티프를 갖고 있습니다.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <PortalCard
            label="1차 포털 · 보라/시안"
            shot={PORTAL_NOTE.one.src}
            sub="4부(11·12)를 끝내면 MNIST 페이지 끝에 균열이 나타납니다."
            unlocked={bonusUnlocked}
          />
          <PortalCard
            label="2차 포털 · 호박/분홍"
            shot={PORTAL_NOTE.two.src}
            sub="5부(13·14)를 끝내면 오토인코더 페이지 끝에 책의 균열이 보입니다."
            unlocked={bonusUnlocked2}
          />
        </div>
      </section>

      {GROUPS.map((g) => (
        <GroupSection key={g.num} group={g} onGo={goPhase} />
      ))}

      <section className="mt-16">
        <div className="aside-tip">
          <div className="font-medium">📌 가이드를 읽는 법</div>
          <ul className="list-disc pl-5 mt-2 text-sm space-y-1">
            <li>각 카드는 학습 목표 → 단계별 캡처 → 해보세요 → 핵심 포인트 순서로 구성됩니다.</li>
            <li>5부·6부 페이즈는 <strong>같은 화면이 슬라이더에 따라 어떻게 변하는지</strong>를 단계로 보여줍니다.</li>
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

function PortalCard({ label, shot, sub, unlocked }: { label: string; shot: string; sub: string; unlocked: boolean }) {
  return (
    <div className="card p-3">
      <div className="text-xs font-mono text-accent flex items-center gap-2">
        {label}
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${unlocked ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'}`}>
          {unlocked ? '발견됨' : '아직 잠김'}
        </span>
      </div>
      <Shot src={shot} alt={label} />
      <p className="text-xs text-muted mt-2">{sub}</p>
    </div>
  );
}
