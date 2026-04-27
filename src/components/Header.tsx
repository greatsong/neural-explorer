import { useApp } from '../store';
import { Logo } from './Logo';

export function Header() {
  const theme = useApp((s) => s.theme);
  const toggle = useApp((s) => s.toggleTheme);

  return (
    <header className="sticky top-0 z-20 h-14 border-b border-border bg-bg/80 backdrop-blur flex items-center px-6 gap-4">
      <a href="#/" className="flex items-center gap-2 font-semibold tracking-tight">
        <Logo size={22} />
        <span>Artificial Neural Net Explorer</span>
      </a>
      <span className="text-xs text-muted hidden sm:inline">
        코드 없이 만져보며 배우는 신경망
      </span>
      <div className="ml-auto flex items-center gap-2">
        <a
          href="#/textbook"
          className="px-3 py-1.5 rounded-md border border-border hover:bg-surface text-sm"
          title="이론·실습·수학 코너가 모두 들어 있는 웹 교과서"
        >
          📚 교과서
        </a>
        <a
          href="#/guide"
          className="px-3 py-1.5 rounded-md border border-border hover:bg-surface text-sm"
          title="화면 캡처가 포함된 전체 학습 가이드"
        >
          📖 가이드
        </a>
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
