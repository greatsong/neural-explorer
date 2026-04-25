import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { PageNav } from './components/PageNav';
import { useApp } from './store';
import { PHASES } from './phases';
import type { PhaseId } from './phases';
import { Intro } from './Intro';
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
import { Stub } from './phases/Stub';

const PHASE_IDS = new Set(PHASES.map((p) => p.id));

type View = { kind: 'intro' } | { kind: 'phase'; id: PhaseId };

export default function App() {
  const setCurrent = useApp((s) => s.setCurrent);
  const theme = useApp((s) => s.theme);

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

  const wide = view.kind === 'intro' ? true : isWide(view.id);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex">
        {view.kind === 'phase' && <Sidebar />}
        <main className="flex-1 px-6 sm:px-8 py-10">
          <div className={`${wide ? 'max-w-6xl' : 'max-w-prose'} mx-auto`}>
            {view.kind === 'intro' ? <Intro /> : (
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
  const raw = window.location.hash.replace('#/', '');
  if (raw && PHASE_IDS.has(raw as PhaseId)) return { kind: 'phase', id: raw as PhaseId };
  return { kind: 'intro' };
}

function isWide(id: PhaseId) {
  return ['p6', 'p7', 'p9', 'p10', 'p11', 'p12', 'p13', 'p14'].includes(id);
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
    default:   return <Stub id={id} />;
  }
}
