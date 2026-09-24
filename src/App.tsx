import { Fragment, useEffect, useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { PageNav } from './components/PageNav';
import { useApp } from './store';
import { PHASES, isBonusPhase, isBonus2Phase } from './phases';
import type { PhaseId } from './phases';
import { Intro } from './Intro';
import { Guide } from './Guide';
import { PhaseA1 } from './phases/PhaseA1';
import { PhaseA2 } from './phases/PhaseA2';
import { PhaseA3 } from './phases/PhaseA3';
import { PhaseA4 } from './phases/PhaseA4';
import { PhaseA5 } from './phases/PhaseA5';
import { PhaseA6 } from './phases/PhaseA6';
import { PhaseB1 } from './phases/PhaseB1';
import { PhaseB2 } from './phases/PhaseB2';
import { PhaseB3 } from './phases/PhaseB3';
import { PhaseB4 } from './phases/PhaseB4';
import { PhaseC2 as PhaseMNIST } from './phases/PhaseC2'; // MNIST 컴포넌트 → 새 C2 로
import { PhaseD1 } from './phases/PhaseD1'; // 회귀 평가 (신규)
import { PhaseD2 } from './phases/PhaseD2'; // 분류 평가 — 시나리오+임계값 (신규)
import { PhaseMnistIntro } from './phases/PhaseMnistIntro'; // MNIST 데이터셋 소개 (새 C1)
import { PhaseDive } from './phases/PhaseDive'; // 자기주도 심층 탐구
import { PhaseC1 as PhaseBackprop } from './phases/PhaseC1'; // 역전파 직관 — 특강용 숨은 주소 #/backprop
import { Phase13 } from './phases/Phase13';
import { Phase14 } from './phases/Phase14';
import { Phase15 } from './phases/Phase15';
import { Phase16 } from './phases/Phase16';
import { Phase17 } from './phases/Phase17';
import { Phase18 } from './phases/Phase18';
import { Phase19 } from './phases/Phase19';
import { Phase20 } from './phases/Phase20';
import { Phase21 } from './phases/Phase21';
import { Phase22 } from './phases/Phase22';
import { Stub } from './phases/Stub';
import { Textbook } from './textbook/Textbook';
import { hashParams } from './lib/hashParams';

const PHASE_IDS = new Set(PHASES.map((p) => p.id));

type View =
  | { kind: 'intro' }
  | { kind: 'guide' }
  | { kind: 'backprop' }
  | { kind: 'phase'; id: PhaseId }
  | { kind: 'textbook'; slug: string };

export default function App() {
  const setCurrent = useApp((s) => s.setCurrent);
  const theme = useApp((s) => s.theme);
  const legacyResetNotice = useApp((s) => s.legacyResetNotice);
  const dismissLegacyResetNotice = useApp((s) => s.dismissLegacyResetNotice);
  const present = useApp((s) => s.present);
  const setPresent = useApp((s) => s.setPresent);

  const [view, setView] = useState<View>(() => readHash());
  // 같은 화면에서 주소 뒤 조건만 바뀌어도(#/c2 → #/c2?hidden=16) 화면을 새로 만들어 시작 상태를 다시 읽게 한다
  const [routeKey, setRouteKey] = useState(() => readRouteKey());
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const sync = () => {
      const v = readHash();
      setView(v);
      setRouteKey(readRouteKey());
      if (v.kind === 'phase') setCurrent(v.id);
      // 주소로 발표 모드를 켜고 끈다 (#/a3?mode=b&present=1)
      const p = hashParams().get('present');
      if (p === '1') setPresent(true);
      if (p === '0') setPresent(false);
      // 라우트 바뀌면 드로어 닫기 (모바일에서 메뉴 클릭 시 자동 닫힘)
      setDrawerOpen(false);
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [setCurrent, setPresent]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // 발표 모드 — index.css의 html.present 규칙(작은 글자·그림 글자 확대, 설명 접기)이 여기에 걸린다
  useEffect(() => {
    document.documentElement.classList.toggle('present', present);
    // 발표 모드를 끄면(이 탭의 버튼이든 다른 탭에서든) 주소의 present=1도 지운다.
    // 남겨 두면 그 탭을 새로 고칠 때 발표 모드가 다시 켜지고 모든 탭에 퍼진다.
    if (!present && hashParams().get('present') === '1') {
      const hash = window.location.hash;
      const q = hash.indexOf('?');
      const params = new URLSearchParams(hash.slice(q + 1));
      params.delete('present');
      const rest = params.toString();
      const nextHash = hash.slice(0, q) + (rest ? `?${rest}` : '');
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${nextHash}`);
    }
  }, [present]);

  const wide = view.kind === 'phase' ? isWide(view.id) : true;

  // 교과서 뷰는 자체 레이아웃(좌측 사이드바 + 본문 + 우측 TOC)을 가지므로 여기선 Header만 감싼다.
  if (view.kind === 'textbook') {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <Textbook rawSlug={view.slug} />
      </div>
    );
  }

  const isPhase = view.kind === 'phase';
  // 발표 모드에서는 사이드바·헤더를 숨기고 본문을 넓게 쓴다 (좁은 max-w-prose 화면도 넓힌다)
  const maxW = present ? 'max-w-6xl' : wide ? 'max-w-6xl' : 'max-w-prose';

  return (
    <div className="min-h-screen flex flex-col">
      {!present && (
        <Header
          showMenuButton={isPhase}
          onMenuClick={() => setDrawerOpen((v) => !v)}
        />
      )}
      {present && (
        <button
          type="button"
          onClick={() => setPresent(false)}
          className="fixed bottom-3 right-3 z-50 px-3 py-1.5 rounded-md border border-border bg-bg/90 text-xs text-muted shadow-sm opacity-60 hover:opacity-100 transition"
        >
          발표 모드 종료
        </button>
      )}
      {legacyResetNotice && (
        <div role="status" className="bg-amber-50 border-b border-amber-200 text-amber-900 text-sm px-4 py-2 flex items-center gap-3">
          <span className="flex-1">
            교재가 새 구조(A·B·C)로 재구성되어 이전 진행도가 초기화됐어요. 다시 처음부터 즐겨주세요.
          </span>
          <button
            type="button"
            onClick={dismissLegacyResetNotice}
            className="px-2 py-0.5 rounded border border-amber-300 hover:bg-amber-100"
          >
            닫기
          </button>
        </div>
      )}
      <div className="flex-1 flex">
        {isPhase && !present && (
          <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />
        )}
        <main className={`flex-1 min-w-0 px-4 sm:px-6 lg:px-8 ${present ? 'py-4 sm:py-5' : 'py-6 sm:py-10'}`}>
          <div className={`${maxW} mx-auto`}>
            {view.kind === 'intro' ? <Intro /> :
             view.kind === 'guide' ? <Guide /> :
             view.kind === 'backprop' ? <PhaseBackprop /> : (
              <>
                <Fragment key={routeKey}>{renderPhase(view.id)}</Fragment>
                <PageNav />
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// 화면 경로 + 쿼리 (#/a3?mode=b → /a3?mode=b). 문서 안 앵커(#h-foo)는 빼서 앵커 이동으로는 다시 만들지 않는다.
function readRouteKey(): string {
  return window.location.hash.replace(/^#/, '').split('#')[0];
}

function readHash(): View {
  // hash 점프(#h-foo)가 함께 붙는 경우가 있어 querystring/anchor를 분리한다.
  // querystring(#/a5?data=1)은 라우트 판별에서 떼어 내고, 각 화면이 필요하면 직접 읽는다.
  const raw = window.location.hash.replace(/^#\/?/, '').split('#')[0].split('?')[0];
  if (raw === 'guide') return { kind: 'guide' };
  // 특강용 숨은 주소 — 메뉴·다음/이전 이동에는 나오지 않는다
  if (raw === 'backprop') return { kind: 'backprop' };
  if (raw === 'textbook' || raw === 'textbook/') return { kind: 'textbook', slug: 'intro' };
  if (raw.startsWith('textbook/')) return { kind: 'textbook', slug: raw.slice('textbook/'.length) };
  if (raw && PHASE_IDS.has(raw as PhaseId)) {
    const id = raw as PhaseId;
    // 5·6부는 메뉴에서 숨겼고 URL 직진입도 차단 — 인트로로 돌려보낸다
    if (isBonusPhase(id) || isBonus2Phase(id)) return { kind: 'intro' };
    return { kind: 'phase', id };
  }
  return { kind: 'intro' };
}

function isWide(id: PhaseId) {
  // A6(기온 회귀), B/C/D 영역(분류·MNIST·평가), E·5·6부 모두 와이드 레이아웃
  return [
    'a3', 'a5', 'a6',
    'b2', 'b3', 'b4',
    'c1', 'c2',
    'd1', 'd2',
    'e1',
    'p13', 'p14', 'p15', 'p16', 'p17', 'p18', 'p19', 'p20', 'p21', 'p22',
  ].includes(id);
}

function renderPhase(id: PhaseId) {
  switch (id) {
    case 'a1': return <PhaseA1 />;
    case 'a2': return <PhaseA2 />;
    case 'a3': return <PhaseA3 />;
    case 'a4': return <PhaseA4 />;
    case 'a5': return <PhaseA5 />;
    case 'a6': return <PhaseA6 />;
    case 'b1': return <PhaseB1 />;
    case 'b2': return <PhaseB2 />;
    case 'b3': return <PhaseB3 />;
    case 'b4': return <PhaseB4 />;
    case 'c1': return <PhaseMnistIntro />;
    case 'c2': return <PhaseMNIST />;
    case 'd1': return <PhaseD1 />;
    case 'd2': return <PhaseD2 />;
    case 'e1': return <PhaseDive />;
    case 'p13': return <Phase13 />;
    case 'p14': return <Phase14 />;
    case 'p15': return <Phase15 />;
    case 'p16': return <Phase16 />;
    case 'p17': return <Phase17 />;
    case 'p18': return <Phase18 />;
    case 'p19': return <Phase19 />;
    case 'p20': return <Phase20 />;
    case 'p21': return <Phase21 />;
    case 'p22': return <Phase22 />;
    default:    return <Stub id={id} />;
  }
}
