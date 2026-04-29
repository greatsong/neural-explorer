import { Logo } from './components/Logo';
import { PHASES, PHASE_GROUPS, isBonusGroup, isBonus2Group, isBonusPhase, isBonus2Phase } from './phases';
import type { PhaseId } from './phases';
import { useApp } from './store';

const VISIBLE_PHASES = PHASES.filter((p) => !isBonusPhase(p.id) && !isBonus2Phase(p.id));

export function Intro() {
  const setCurrent = useApp((s) => s.setCurrent);
  const completed = useApp((s) => s.completed);
  const completedCount = VISIBLE_PHASES.filter((p) => completed[p.id]).length;

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
          신경망의 원리를 손끝으로 배우는 15단계 인터랙티브 학습 앱
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <button onClick={() => go('a1')} className="btn-primary px-6 py-3 text-base">
            처음부터 시작하기 →
          </button>
          {completedCount > 0 && (
            <button
              onClick={() => {
                const next = VISIBLE_PHASES.find((p) => !completed[p.id]) ?? VISIBLE_PHASES[0];
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
          <span>📦 15 페이즈 (A·B·C)</span>
        </div>
      </section>

      {/* visible 영역 — A · B · C */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {PHASE_GROUPS.map(([group, items]) => {
          // 5·6부는 메뉴에서 항상 숨김 (인지 과부하 방지)
          if (isBonusGroup(group)) return null;
          if (isBonus2Group(group)) return null;
          // group은 "A. 알고리즘의 이해" 등이라 첫 글자(A/B/C)를 PART 라벨로 사용
          const partLetter = group.charAt(0);
          const partTitle = group.replace(/^[ABC]\.\s*/, '');
          return (
            <div key={group} className="card p-5 hover:border-accent/50 transition">
              <div className="text-xs font-mono text-accent mb-2">PART {partLetter}</div>
              <div className="font-semibold">{partTitle}</div>
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
          );
        })}
      </section>

      {/* Journey */}
      <section className="mt-16">
        <h2 className="text-center">학습 여정</h2>
        <p className="text-center text-muted text-sm mt-2">
          뉴런 한 개의 한 step에서 시작해 손글씨 분류까지 — 알고리즘 → 데이터·분류 → 딥러닝
        </p>
        <div className="grid sm:grid-cols-3 gap-4 mt-6">
          <Step n="A" title="알고리즘의 이해" desc="예측 → 오차 → 기울기 → 갱신을 한 묶음으로. 마지막에 단일 뉴런으로 서울 기온 회귀까지." />
          <Step n="B" title="데이터·학습·분류" desc="도트 그림 데이터 한 종류로 입력·라벨·전처리·분할·이진 분류·다중 분류와 소프트맥스를 차례로." />
          <Step n="C" title="딥러닝" desc="역전파가 어떻게 깊은 망의 모든 가중치를 동시에 갱신하는지. 마지막은 진짜 손글씨 MNIST로 종합." />
        </div>
      </section>

      {/* What students learn */}
      <section className="mt-16">
        <h2 className="text-center">학생이 배우는 것</h2>
        <div className="grid sm:grid-cols-2 gap-3 mt-4 text-sm">
          <Bullet>가중치·편향·활성화 함수가 만드는 예측을 슬라이더로 직접 만지는 감각</Bullet>
          <Bullet>경사 하강법이 왜 작동하는지 — 단순한 미분 계산이 한 step씩 반복되는 모습을 직접 보기</Bullet>
          <Bullet>학습률(보폭)을 바꾸면 발산·진동·수렴·느림 중 어느 결과가 나오는지 한 화면에서 비교</Bullet>
          <Bullet>회귀(숫자 예측)에서 분류(이름표 예측)로 넘어갈 때 출력층과 손실이 어떻게 달라지는지</Bullet>
          <Bullet>은닉층을 더하면 더 복잡한 문제가 풀리는 이유 — 모델 복잡도 직관</Bullet>
        </div>
      </section>

      {/* Repo */}
      <section className="mt-16 mb-8">
        <div className="aside-tip">
          <div className="font-medium">🛠 오픈소스</div>
          <p className="text-sm mt-2">
            모든 페이즈는 코드 없이 슬라이더와 그림판으로만 동작해요. 소스는 공개되어 있어, 수업에서 자유롭게 쓰고 고쳐 쓰셔도 됩니다.
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
