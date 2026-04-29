import { useEffect, useState } from 'react';
import { useApp } from './store';
import type { PhaseId } from './phases';
import {
  GROUPS,
  type GroupGuide,
  type PhaseGuide,
  type Step,
  type ScriptLine,
  type QnA,
  type Trouble,
} from './data/guideContent';

export function Guide() {
  const setCurrent = useApp((s) => s.setCurrent);
  const bonusUnlocked = useApp((s) => s.bonusUnlocked);
  const bonusUnlocked2 = useApp((s) => s.bonusUnlocked2);

  const goPhase = (id: PhaseId) => {
    setCurrent(id);
    window.location.hash = `#/${id}`;
    window.scrollTo({ top: 0 });
  };

  const totalMin = GROUPS.flatMap((g) => g.phases).reduce((s, p) => s + p.timeMin, 0);

  // 1~4부 → A/B/C 재구성 작업 중. 새 가이드 콘텐츠가 아직 채워지지 않았으면
  // 빈 카드 대신 "작성 중" 안내만 보여 준다 (옛 카피·옛 페이즈 ID 노출 방지).
  const totalPhases = GROUPS.reduce((s, g) => s + g.phases.length, 0);
  if (totalPhases === 0) {
    return (
      <article>
        <div className="text-xs font-mono text-muted">APPENDIX · 교사 지도용 가이드</div>
        <h1>수업 운영서 — 작성 중</h1>
        <p className="text-muted mt-2">
          1~4부 → A·B·C 재구성에 따라 교사 지도서도 새로 정리하는 중입니다.
          A 영역(A1~A6)의 인앱 실습은 모두 동작하므로, 그 화면을 직접 띄워 두고 수업을 운영하실 수 있어요.
          새 가이드는 다음 사이클에서 채워집니다.
        </p>
        <div className="aside-note mt-6 text-sm">
          <div className="font-medium">지금 사용 가능한 것</div>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>인앱 실습 — 우상단 햄버거 메뉴에서 A1~A6에 진입</li>
            <li>웹 교과서 — 본문은 placeholder, 곧 새 A·B·C 구조로 채워집니다</li>
          </ul>
        </div>
      </article>
    );
  }

  return (
    <article>
      <div className="text-xs font-mono text-muted">APPENDIX · 교사 지도용 가이드</div>
      <h1>한 화면씩 따라 보는 수업 운영서</h1>
      <p className="text-muted mt-2">
        A·B·C 영역 페이즈 각각에 대해 <strong>학습 목표 · 단계별 캡처 · 해보세요 · 수업 진행 · 예상 Q&amp;A · 막힐 때 처방 · 다음으로</strong>
        를 한 카드에 모았습니다. 캡처는 실제 화면을 그대로 따른 것이고, 카드의 <strong>이 페이즈 바로 가기</strong> 버튼으로 해당 화면에 즉시 진입할 수 있어요.
      </p>

      <Overview totalMin={totalMin} />
      <Toc groups={GROUPS} />
      <HiddenStages bonus1={bonusUnlocked} bonus2={bonusUnlocked2} />

      {GROUPS.map((g) => (
        <GroupSection key={g.num} group={g} onGo={goPhase} />
      ))}

      <ReadingNote />
    </article>
  );
}

// ──────── 상단 요약 표 ────────
function Overview({ totalMin }: { totalMin: number }) {
  return (
    <section className="card p-4 mt-6 text-sm">
      <div className="text-xs text-muted mb-2 font-mono">강의 한눈에 보기</div>
      <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
        <Row k="대상" v="고등학교 1~3학년 (정보·과학·진로 통합 가능)" />
        <Row k="총 시간" v={`4차시 × 50분 (페이즈 합계 ≈ ${totalMin}분 + 도입·정리)`} />
        <Row k="형태" v="짝 활동 권장 (옆 친구와 슬라이더 결과 비교)" />
        <Row k="사전 지식" v="일차함수와 좌표평면 정도 (y = wx + b)" />
        <Row k="코드 작성" v="없음 — 모두 슬라이더·클릭·그림판" />
        <Row k="준비물" v="노트북 1인 1대, 인터넷, Chrome/Edge/Safari" />
      </div>
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted w-20 shrink-0">{k}</span>
      <span>{v}</span>
    </div>
  );
}

// ──────── 목차 ────────
function Toc({ groups }: { groups: GroupGuide[] }) {
  return (
    <nav className="card p-4 mt-4 text-sm">
      <div className="text-xs text-muted mb-2 font-mono">차시 ↔ 페이즈 매핑</div>
      <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
        {[1, 2, 3, 4].map((cesi) => {
          const phs = groups.flatMap((g) => g.phases).filter((p) => p.cesi === cesi);
          if (phs.length === 0) return null;
          return (
            <div key={cesi}>
              <strong>{cesi}차시</strong>{' '}
              <span className="text-muted">
                ({phs.map((p) => p.num).join(', ')})
              </span>
              <ul className="text-muted">
                {phs.map((p) => (
                  <li key={p.id}>
                    · 페이즈 {p.num} {p.title}{' '}
                    <span className="text-xs">({p.timeMin}분 · {p.mode})</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <ol className="mt-3 space-y-1">
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

// ──────── 히든 스테이지 안내 ────────
function HiddenStages({ bonus1, bonus2 }: { bonus1: boolean; bonus2: boolean }) {
  return (
    <section className="card p-4 mt-4 text-sm border-dashed">
      <div className="text-xs text-muted font-mono">히든 스테이지 (가이드 본문 외)</div>
      <p className="mt-1 text-muted text-xs">
        5부(생성)와 6부(언어)는 4·5부를 끝낸 호기심 있는 학생이 직접 발견하도록 둔 부분이에요.
        URL로 한 번 진입하면 사이드바에 정상 표시됩니다.
      </p>
      <ul className="mt-2 text-xs space-y-0.5 font-mono">
        <li>· <code>#/p13</code> ~ <code>#/p14</code> — 5부 분류를 넘어 생성으로{' '}
          {bonus1 && <span className="text-emerald-600">(해금됨)</span>}
        </li>
        <li>· <code>#/p15</code> ~ <code>#/p22</code> — 6부 언어를 다루는 신경망{' '}
          {bonus2 && <span className="text-emerald-600">(해금됨)</span>}
        </li>
      </ul>
    </section>
  );
}

// ──────── 그룹 섹션 ────────
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

// ──────── 페이즈 카드 ────────
function PhaseCard({ phase, onGo }: { phase: PhaseGuide; onGo: (id: PhaseId) => void }) {
  const multi = phase.steps.length > 1;
  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2 py-0.5 rounded-full bg-accent-bg text-accent">PHASE {phase.num}</span>
            <span className="px-2 py-0.5 rounded-full bg-surface border border-border">{phase.cesi}차시</span>
            <span className="px-2 py-0.5 rounded-full bg-surface border border-border">{phase.timeMin}분</span>
            <span className="px-2 py-0.5 rounded-full bg-surface border border-border">{phase.mode}</span>
          </div>
          <h3 className="text-xl font-semibold mt-2">{phase.title}</h3>
          <p className="text-sm text-muted mt-1">{phase.goal}</p>
        </div>
        <button
          onClick={() => onGo(phase.id)}
          className="btn-primary text-sm whitespace-nowrap"
        >
          이 페이즈 바로 가기 →
        </button>
      </div>

      {multi ? (
        <StepCarousel steps={phase.steps} />
      ) : (
        <div className="mt-4">
          <Shot src={phase.steps[0].src} alt={phase.steps[0].caption} />
          <div className="text-xs text-muted mt-2">{phase.steps[0].caption}</div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3 mt-4 text-sm">
        <div>
          <div className="text-xs text-muted mb-1">해보세요</div>
          <ul className="list-disc pl-5 space-y-1">
            {phase.todo.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
        {phase.point && (
          <div className="aside-tip self-start">
            <div className="text-xs font-medium mb-1">짚어줄 포인트</div>
            <div className="text-sm">{phase.point}</div>
          </div>
        )}
      </div>

      {phase.script && phase.script.length > 0 && (
        <Disclosure label={`🎙 수업 진행 (${phase.script.length}장면)`} >
          <ScriptList lines={phase.script} />
        </Disclosure>
      )}
      {phase.qna && phase.qna.length > 0 && (
        <Disclosure label={`❓ 예상 질문 ${phase.qna.length}개`}>
          <QnAList items={phase.qna} />
        </Disclosure>
      )}
      {phase.troubleshoot && phase.troubleshoot.length > 0 && (
        <Disclosure label={`🛟 막힐 때 ${phase.troubleshoot.length}개`}>
          <TroubleList items={phase.troubleshoot} />
        </Disclosure>
      )}
      {phase.next && (
        <div className="mt-3 text-xs flex gap-2">
          <span className="text-muted shrink-0">🎬 다음으로:</span>
          <span>{phase.next}</span>
        </div>
      )}
    </div>
  );
}

// ──────── 보조 ────────
function Disclosure({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 border-t border-border pt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left text-sm font-medium flex items-center justify-between hover:text-accent"
      >
        <span>{label}</span>
        <span className="text-xs text-muted">{open ? '접기 ▲' : '펼치기 ▼'}</span>
      </button>
      {open && <div className="mt-3 text-sm">{children}</div>}
    </div>
  );
}

function ScriptList({ lines }: { lines: ScriptLine[] }) {
  return (
    <div className="space-y-2">
      {lines.map((l, i) => (
        <div key={i} className="flex gap-2 items-start">
          <span
            className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-mono ${
              l.who === '교사'
                ? 'bg-accent-bg text-accent'
                : l.who === '학생'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
            }`}
          >
            {l.who}
          </span>
          <span className="leading-relaxed">{l.line}</span>
        </div>
      ))}
    </div>
  );
}

function QnAList({ items }: { items: QnA[] }) {
  return (
    <ol className="space-y-3">
      {items.map((q, i) => (
        <li key={i}>
          <div className="font-medium">Q{i + 1}. {q.q}</div>
          <div className="text-muted mt-0.5 leading-relaxed">→ {q.a}</div>
        </li>
      ))}
    </ol>
  );
}

function TroubleList({ items }: { items: Trouble[] }) {
  return (
    <ul className="space-y-2">
      {items.map((t, i) => (
        <li key={i} className="grid grid-cols-[auto_1fr] gap-2">
          <span className="text-rose-500">⚠</span>
          <div>
            <div className="font-medium">{t.issue}</div>
            <div className="text-muted mt-0.5">→ {t.tip}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function StepCarousel({ steps }: { steps: Step[] }) {
  const [idx, setIdx] = useState(0);
  const cur = steps[idx];
  const prev = () => setIdx((i) => (i - 1 + steps.length) % steps.length);
  const next = () => setIdx((i) => (i + 1) % steps.length);

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

// ──────── 가이드 읽는 법 ────────
function ReadingNote() {
  return (
    <section className="mt-16">
      <div className="aside-tip">
        <div className="font-medium">📌 이 가이드를 읽는 법</div>
        <ul className="list-disc pl-5 mt-2 text-sm space-y-1">
          <li>각 카드 상단의 <strong>차시·시간·형태</strong> 표시는 4차시 50분 운영 기준이에요.</li>
          <li>
            <strong>해보세요</strong>는 학생용 활동지 형식, <strong>수업 진행 · 예상 질문 · 막힐 때</strong>는
            펼침으로 숨겨 두어 평소엔 가볍게, 수업 직전 펼쳐 보면 그대로 활용할 수 있게 했습니다.
          </li>
          <li>
            교사 발화·학생 반응은 절대 정답이 아닙니다. 교실의 분위기·학생 수준에 맞춰 자유롭게 다듬어 쓰세요.
          </li>
          <li>
            5부·6부(히든 스테이지)는 가이드 본문에서 다루지 않지만, 페이지 상단 안내 박스의 URL로 직접 진입할 수 있어요.
          </li>
          <li>
            모든 캡처는 <code className="font-mono text-xs">node scripts/capture-walkthrough.mjs</code> 한 줄로 자동 재생성됩니다.
          </li>
        </ul>
      </div>
    </section>
  );
}
