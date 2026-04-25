import { useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { PageNav } from './components/PageNav';
import { useApp } from './store';
import { PHASES } from './phases';
import type { PhaseId } from './phases';
import { Phase1 } from './phases/Phase1';
import { Phase2 } from './phases/Phase2';
import { Phase3 } from './phases/Phase3';
import { Phase4 } from './phases/Phase4';
import { Phase5 } from './phases/Phase5';
import { Phase6 } from './phases/Phase6';
import { Phase7 } from './phases/Phase7';
import { Stub } from './phases/Stub';

const PHASE_IDS = new Set(PHASES.map((p) => p.id));

export default function App() {
  const current = useApp((s) => s.current);
  const setCurrent = useApp((s) => s.setCurrent);
  const theme = useApp((s) => s.theme);

  useEffect(() => {
    const sync = () => {
      const id = window.location.hash.replace('#/', '') as PhaseId;
      if (PHASE_IDS.has(id)) setCurrent(id);
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [setCurrent]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex">
        <Sidebar />
        <main className="flex-1 px-8 py-10">
          <div className="max-w-prose mx-auto">
            {renderPhase(current)}
            <PageNav />
          </div>
        </main>
      </div>
    </div>
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
    default:   return <Stub id={id} />;
  }
}
