import { useApp } from '../store';
import { Logo } from './Logo';

export function Header() {
  const theme = useApp((s) => s.theme);
  const toggle = useApp((s) => s.toggleTheme);

  return (
    <header className="sticky top-0 z-20 h-14 border-b border-border bg-bg/80 backdrop-blur flex items-center px-6 gap-4">
      <a href="#/" className="flex items-center gap-2 font-semibold tracking-tight">
        <Logo size={22} />
        <span>아티피셜 뉴럴넷 익스플로러</span>
      </a>
      <span className="text-xs text-muted hidden sm:inline">
        코드 없이 만져보며 배우는 신경망
      </span>
      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={toggle}
          aria-label="테마 전환"
          className="px-3 py-1.5 rounded-md border border-border hover:bg-surface text-sm"
          title={theme === 'light' ? '다크 모드로' : '라이트 모드로'}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <a
          href="https://github.com/greatsong/neural-explorer"
          target="_blank"
          rel="noreferrer"
          className="px-3 py-1.5 rounded-md border border-border hover:bg-surface text-sm"
        >
          GitHub
        </a>
      </div>
    </header>
  );
}
