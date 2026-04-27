import { useApp } from '../store';
import { Logo } from './Logo';

interface HeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export function Header({ onMenuClick, showMenuButton = false }: HeaderProps) {
  const theme = useApp((s) => s.theme);
  const toggle = useApp((s) => s.toggleTheme);

  return (
    <header className="sticky top-0 z-50 h-14 border-b border-border bg-bg/80 backdrop-blur flex items-center px-3 sm:px-6 gap-2 sm:gap-4">
      {showMenuButton && (
        <button
          onClick={onMenuClick}
          aria-label="메뉴 열기"
          className="md:hidden p-2 -ml-1 rounded-md hover:bg-surface text-text"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      )}
      <a href="#/" className="flex items-center gap-2 font-semibold tracking-tight min-w-0">
        <Logo size={22} />
        <span className="truncate text-sm sm:text-base">
          <span className="hidden sm:inline">Artificial </span>Neural Net Explorer
        </span>
      </a>
      <span className="text-xs text-muted hidden lg:inline">
        코드 없이 만져보며 배우는 신경망
      </span>
      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <a
          href="#/textbook"
          className="px-2 sm:px-3 py-1.5 rounded-md border border-border hover:bg-surface text-sm"
          title="이론·실습·수학 코너가 모두 들어 있는 웹 교과서"
        >
          <span aria-hidden>📚</span>
          <span className="hidden sm:inline ml-1">교과서</span>
        </a>
        <a
          href="#/guide"
          className="px-2 sm:px-3 py-1.5 rounded-md border border-border hover:bg-surface text-sm"
          title="화면 캡처가 포함된 전체 학습 가이드"
        >
          <span aria-hidden>📖</span>
          <span className="hidden sm:inline ml-1">가이드</span>
        </a>
        <button
          onClick={toggle}
          aria-label="테마 전환"
          className="px-2 sm:px-3 py-1.5 rounded-md border border-border hover:bg-surface text-sm"
          title={theme === 'light' ? '다크 모드로' : '라이트 모드로'}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <a
          href="https://github.com/greatsong/neural-explorer"
          target="_blank"
          rel="noreferrer"
          className="hidden sm:inline-flex px-3 py-1.5 rounded-md border border-border hover:bg-surface text-sm"
        >
          GitHub
        </a>
      </div>
    </header>
  );
}
