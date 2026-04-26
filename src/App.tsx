import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { PageNav } from './components/PageNav';
import { useApp } from './store';
import { PHASES, isBonusPhase, isBonus2Phase } from './phases';
import type { PhaseId } from './phases';
import { Portal } from './components/Portal';
import { PortalLanguage } from './components/PortalLanguage';
import { Intro } from './Intro';
import { Guide } from './Guide';
import { Phase1 } from './phases/Phase1';
import { Phase2 } from './phases/Phase2';
import { Phase3 } from './phases/Phase3';
import { Phase4 } from './phases/Phase4';
import { Phase5 } from './phases/Phase5';
import { Phase6 } from './phases/Phase6';
import { Phase7 } from './phases/Phase7';
import { Phase8 } from './phases/Phase8';
import { Phase9 } from './phases/Phase9';
import { Phase10 } from './phases/Phase10';
import { Phase11 } from './phases/Phase11';
import { Phase12 } from './phases/Phase12';
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

const PHASE_IDS = new Set(PHASES.map((p) => p.id));

type View = { kind: 'intro' } | { kind: 'guide' } | { kind: 'phase'; id: PhaseId };

export default function App() {
  const setCurrent = useApp((s) => s.setCurrent);
  const theme = useApp((s) => s.theme);
  const bonusUnlocked = useApp((s) => s.bonusUnlocked);
  const bonusUnlocked2 = useApp((s) => s.bonusUnlocked2);

  const [view, setView] = useState<View>(() => readHash());

  useEffect(() => {
    const sync = () => {
      const v = readHash();
      setView(v);
      if (v.kind === 'phase') setCurrent(v.id);
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [setCurrent]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const wide = view.kind === 'phase' ? isWide(view.id) : true;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex">
        {view.kind === 'phase' && <Sidebar />}
        <main className="flex-1 px-6 sm:px-8 py-10">
          <div className={`${wide ? 'max-w-6xl' : 'max-w-prose'} mx-auto`}>
            {view.kind === 'intro' ? <Intro /> :
             view.kind === 'guide' ? <Guide /> : (
              <>
                {isBonusPhase(view.id) && !bonusUnlocked
                  ? <BonusLocked />
                  : isBonus2Phase(view.id) && !bonusUnlocked2
                    ? <Bonus2Locked />
                    : renderPhase(view.id)}
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
  const raw = window.location.hash.replace('#/', '');
  if (raw === 'guide') return { kind: 'guide' };
  if (raw && PHASE_IDS.has(raw as PhaseId)) return { kind: 'phase', id: raw as PhaseId };
  return { kind: 'intro' };
}

function isWide(id: PhaseId) {
  return ['p6', 'p7', 'p9', 'p10', 'p11', 'p12', 'p13', 'p14', 'p15', 'p16', 'p17', 'p18', 'p19', 'p20', 'p21', 'p22'].includes(id);
}

function BonusLocked() {
  return (
    <article>
      <div className="text-xs font-mono text-purple-400 tracking-widest">??? · HIDDEN STAGE</div>
      <h1>아직 균열이 닫혀 있어요</h1>
      <p className="text-muted mt-3">
        이 차원으로 들어오려면 4부(11·12)를 끝내고, MNIST 도전 페이지 끝에서 발견되는 <strong>포털</strong>을 통과해야 합니다.
      </p>
      <div className="mt-6">
        <Portal />
      </div>
    </article>
  );
}

function Bonus2Locked() {
  return (
    <article>
      <div className="text-xs font-mono text-amber-400 tracking-widest">??? · HIDDEN STAGE Ⅱ</div>
      <h1>책의 균열은 아직 열려 있지 않아요</h1>
      <p className="text-muted mt-3">
        이 차원으로 들어오려면 5부(13·14)를 끝내고, 오토인코더 페이지 끝에서 발견되는 <strong>두 번째 포털</strong>을 통과해야 합니다.
      </p>
      <div className="mt-6">
        <PortalLanguage />
      </div>
    </article>
  );
}

function renderPhase(id: PhaseId) {
  switch (id) {
    case 'p1': return <Phase1 />;
    case 'p2': return <Phase2 />;
    case 'p3': return <Phase3 />;
    case 'p4': return <Phase4 />;
    case 'p5': return <Phase5 />;
    case 'p6': return <Phase6 />;
    case 'p7': return <Phase7 />;
    case 'p8': return <Phase8 />;
    case 'p9': return <Phase9 />;
    case 'p10': return <Phase10 />;
    case 'p11': return <Phase11 />;
    case 'p12': return <Phase12 />;
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
    default:   return <Stub id={id} />;
  }
}
