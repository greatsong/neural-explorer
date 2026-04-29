// 교과서 표지 — 어떤 책인지, 어떻게 읽는지, 누구를 위한 책인지.
import { TEXTBOOK_PARTS } from '../toc';

export function TextbookHome() {
  return (
    <div>
      <header className="text-center pt-6 pb-10">
        <div className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">NEURAL EXPLORER · WEB TEXTBOOK</div>
        <h1 className="text-4xl sm:text-5xl font-bold mt-3 tracking-tight">신경망 웹 교과서</h1>
        <p className="text-lg text-muted mt-3">코드 없이 슬라이더와 그림판으로 만나는 인공 신경망</p>
        <p className="text-sm text-muted mt-1">고등학교 1학년 · 15개 장 · A·B·C 세 영역</p>
      </header>

      <section className="grid sm:grid-cols-3 gap-4 my-8">
        <Card icon="📘" title="이론은 친절하게">
          모든 개념을 일상의 비유부터 시작해 한 줄 한 줄 풀어 적었다. "왜 이렇게 하는가"를 먼저 묻고 답한다.
        </Card>
        <Card icon="🧪" title="실습은 손으로">
          매 장마다 인앱 시뮬레이터의 실제 화면을 캡처해 두었다. 책에서 본 식이 슬라이더 위에서 어떻게 움직이는지 직접 확인할 수 있다.
        </Card>
        <Card icon="∑" title="수학은 별도 코너로">
          시그마와 기울기 같은 수학 표현은 본문 흐름을 끊지 않도록 "수학 코너" 박스에 따로 모았다. 어렵다면 건너뛰어도 좋다.
        </Card>
      </section>

      <section className="my-10">
        <h2 className="text-xl font-bold mb-4">차례</h2>
        <ol className="space-y-3">
          {TEXTBOOK_PARTS.map((part) => (
            <li key={part.num} className="rounded-lg border border-border p-4 bg-surface/40">
              <div className="text-sm font-semibold text-accent">{part.num} — {part.title}</div>
              <div className="text-xs text-muted mt-0.5">{part.caption}</div>
              <ul className="mt-3 grid sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {part.pages.map((p) => (
                  <li key={p.slug}>
                    <a href={`#/textbook/${p.slug}`} className="hover:text-accent">
                      <span className="font-mono text-muted text-xs mr-2">{p.num}</span>
                      {p.title}
                    </a>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <section className="my-10 rounded-xl border border-border bg-surface/40 p-5">
        <h2 className="text-xl font-bold mb-3">이 책을 읽는 법</h2>
        <ul className="list-disc pl-5 space-y-2 text-[0.95em] leading-7">
          <li>각 장은 <strong>이론 → 실습 → 수학 코너 → 핵심 정리</strong>의 순서로 짜여 있다. 처음 읽을 때는 수학 코너를 건너뛰어도 좋다.</li>
          <li>실습 코너는 <strong>인앱 시뮬레이터</strong>를 함께 켜 두고 읽는 것을 권한다. 페이지 상단의 "▶ 실습 앱에서 직접 만져보기" 버튼이 해당 페이즈로 안내한다.</li>
          <li>수식이 길어 보여도 두려워하지 말 것. 모든 식은 직전 문단에서 한 단계씩 풀어 설명한다.</li>
          <li>사이드바의 진행 표시(✓)는 인앱 시뮬레이터의 "완료" 표시와 별개로, 단순히 어디까지 읽었는지 표시할 뿐이다.</li>
        </ul>
      </section>

      <div className="text-center mt-12">
        <a
          href="#/textbook/a1"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-accent text-white font-medium hover:opacity-90 transition shadow-sm"
        >
          A1부터 시작하기 →
        </a>
        <div className="text-xs text-muted mt-3">
          본문은 새 A·B·C 구조로 다시 작성 중이에요. 지금은 인앱 실습(우상단 메뉴 아이콘)이 가장 풍부하게 동작합니다.
        </div>
      </div>
    </div>
  );
}

function Card({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface/40 p-4">
      <div className="text-2xl mb-2" aria-hidden>{icon}</div>
      <div className="font-semibold text-text">{title}</div>
      <p className="text-sm text-muted mt-1.5 leading-6">{children}</p>
    </div>
  );
}
