import { useEffect, useState } from 'react';
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
import { PhaseC1 } from './phases/PhaseC1';
import { PhaseC2 } from './phases/PhaseC2';
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

const PHASE_IDS = new Set(PHASES.map((p) => p.id));

type View =
  | { kind: 'intro' }
  | { kind: 'guide' }
  | { kind: 'phase'; id: PhaseId }
  | { kind: 'textbook'; slug: string };

export default function App() {
  const setCurrent = useApp((s) => s.setCurrent);
  const theme = useApp((s) => s.theme);
  const legacyResetNotice = useApp((s) => s.legacyResetNotice);
  const dismissLegacyResetNotice = useApp((s) => s.dismissLegacyResetNotice);

  const [view, setView] = useState<View>(() => readHash());
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const sync = () => {
      const v = readHash();
      setView(v);
      if (v.kind === 'phase') setCurrent(v.id);
      // 라우트 바뀌면 드로어 닫기 (모바일에서 메뉴 클릭 시 자동 닫힘)
      setDrawerOpen(false);
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [setCurrent]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

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

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        showMenuButton={isPhase}
        onMenuClick={() => setDrawerOpen((v) => !v)}
      />
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
        {isPhase && (
          <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />
        )}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          <div className={`${wide ? 'max-w-6xl' : 'max-w-prose'} mx-auto`}>
            {view.kind === 'intro' ? <Intro /> :
             view.kind === 'guide' ? <Guide /> : (
              <>
                {renderPhase(view.id)}
                <PageNav />
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function readHash(): View {
  // hash 점프(#h-foo)가 함께 붙는 경우가 있어 querystring/anchor를 분리한다.
  const raw = window.location.hash.replace(/^#\/?/, '').split('#')[0];
  if (raw === 'guide') return { kind: 'guide' };
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
  // A6(기온 회귀), B/C 영역(분류·MNIST·은닉층 시각화), 5·6부 모두 와이드 레이아웃
  return [
    'a3', 'a5', 'a6',
    'b2', 'b3', 'b4',
    'c1', 'c2',
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
    case 'c1': return <PhaseC1 />;
    case 'c2': return <PhaseC2 />;
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
