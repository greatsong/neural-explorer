import { Logo } from './components/Logo';
import { PHASES, PHASE_GROUPS } from './phases';
import type { PhaseId } from './phases';
import { useApp } from './store';

export function Intro() {
  const setCurrent = useApp((s) => s.setCurrent);
  const completed = useApp((s) => s.completed);
  const completedCount = Object.values(completed).filter(Boolean).length;

  const go = (id: PhaseId) => {
    setCurrent(id);
    window.location.hash = `#/${id}`;
    window.scrollTo({ top: 0 });
  };

  return (
    <div>
      {/* Hero */}
      <section className="text-center py-12 sm:py-20">
        <div className="inline-flex items-center gap-3 mb-6">
          <Logo size={56} />
        </div>
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">Artificial Neural Net Explorer</h1>
        <div className="text-sm text-muted mt-2">아티피셜 뉴럴넷 익스플로러</div>
        <p className="text-lg sm:text-xl text-muted mt-4 max-w-2xl mx-auto leading-relaxed">
          코드 한 줄도 쓰지 않고, 슬라이더와 그림판으로<br className="hidden sm:inline" />
          신경망의 원리를 손끝으로 배우는 14단계 인터랙티브 학습 앱
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <button onClick={() => go('p1')} className="btn-primary px-6 py-3 text-base">
            처음부터 시작하기 →
          </button>
          {completedCount > 0 && (
            <button
              onClick={() => {
                const next = PHASES.find((p) => !completed[p.id]) ?? PHASES[0];
                go(next.id);
              }}
              className="btn-ghost px-6 py-3 text-base"
            >
              이어하기 (페이즈 {completedCount + 1})
            </button>
          )}
        </div>
        <div className="text-xs text-muted mt-6 flex flex-wrap justify-center gap-x-4 gap-y-1 font-mono">
          <span>👨‍🎓 대상: 고등학생</span>
          <span>⏱ 4차시 (50분 ×4)</span>
          <span>🌐 코드 작성 없음</span>
          <span>📦 14 페이즈</span>
        </div>
      </section>

      {/* 5 parts */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {PHASE_GROUPS.map(([group, items], idx) => (
          <div key={group} className="card p-5 hover:border-accent/50 transition">
            <div className="text-xs font-mono text-accent mb-2">PART {idx + 1}</div>
            <div className="font-semibold">{group.replace(/^\d+부 — /, '')}</div>
            <div className="text-xs text-muted mt-1">페이즈 {items[0].num}~{items[items.length - 1].num}</div>
            <ul className="mt-3 space-y-1.5 text-sm">
              {items.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => go(p.id)}
                    className="text-left hover:text-accent transition w-full flex items-baseline gap-2"
                  >
                    <span className="text-xs font-mono text-muted w-5 shrink-0">
                      {completed[p.id] ? '✓' : p.num}
                    </span>
                    <span className="flex-1">
                      {p.title}
                      <span className="block text-xs text-muted">{p.subtitle}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* Journey */}
      <section className="mt-16">
        <h2 className="text-center">학습 여정</h2>
        <p className="text-center text-muted text-sm mt-2">
          단순한 뉴런 하나에서 시작해 진짜 손글씨를 읽고 새 그림을 만들 수 있는 신경망까지
        </p>
        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          <Step n="1~5" title="뉴런의 기초" desc="가중치, 편향, 활성화 함수, 손실, 경사 하강법까지 직접 슬라이더로 만져봅니다." />
          <Step n="6~9" title="분류와 평가" desc="입시 합격 예측·코로나 진단처럼 실생활 분류 문제와 평가 지표의 함정을 체험합니다." />
          <Step n="10" title="직접 만들기" desc="8×8 도트로 직접 그린 그림을 학습시키고, 오픈 갤러리에 CC-BY로 공유합니다." />
          <Step n="11~12" title="깊은 학습" desc="진짜 MNIST로 신경망 크기와 문제 복잡도의 관계를 발견하고, 손으로 그린 숫자를 분류해봅니다." />
          <Step n="13~14" title="분류를 넘어 생성으로" desc="평균 이미지에서 시작해 오토인코더의 잠재 공간까지 — Stable Diffusion·DALL·E의 출발점." />
        </div>
      </section>

      {/* What students learn */}
      <section className="mt-16">
        <h2 className="text-center">학생이 배우는 것</h2>
        <div className="grid sm:grid-cols-2 gap-3 mt-4 text-sm">
          <Bullet>가중치·편향이 만드는 결정 경계를 직접 손으로 옮기는 감각</Bullet>
          <Bullet>경사 하강법이 왜 작동하는지 — 단순한 미분 계산의 반복임을 체험</Bullet>
          <Bullet>"정확도 99%"가 사실은 함정일 수 있다는 통찰 (코로나·암 시나리오)</Bullet>
          <Bullet>데이터를 늘리면 모델이 어떻게 더 안정해지는지 실시간으로 관찰</Bullet>
          <Bullet>문제가 복잡할수록 신경망도 커야 한다는 직관 (2종 → 10종)</Bullet>
          <Bullet>분류와 생성이 같은 원리에서 나온다는 통합적 이해</Bullet>
        </div>
      </section>

      {/* Tech / open */}
      <section className="mt-16 mb-8">
        <div className="aside-tip">
          <div className="font-medium">🌍 오픈 데이터셋과 오픈소스</div>
          <p className="text-sm mt-2">
            학생이 페이즈 10에서 그린 도트 그림은{' '}
            <a href="https://github.com/greatsong/neural-explorer-gallery" target="_blank" rel="noreferrer" className="text-accent underline">
              neural-explorer-gallery
            </a>
            에 <strong>CC-BY 4.0</strong>으로 누적됩니다. 다음 학기 학생들의 학습 데이터로 다시 쓰여요. MNIST 정신을 잇는 작은 공개 자산.
          </p>
          <div className="text-xs text-muted mt-2 font-mono">
            <a href="https://github.com/greatsong/neural-explorer" target="_blank" rel="noreferrer" className="hover:text-accent">
              github.com/greatsong/neural-explorer
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function Step({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="flex gap-4 p-4 rounded-md border border-border bg-surface/40">
      <div className="text-2xl font-mono text-accent shrink-0">{n}</div>
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-sm text-muted mt-1">{desc}</div>
      </div>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 items-start p-3 rounded-md bg-surface/40 border border-border">
      <span className="text-accent">▸</span>
      <span>{children}</span>
    </div>
  );
}
