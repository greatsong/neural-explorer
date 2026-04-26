import { useApp } from '../store';
import type { PhaseId } from '../phases';

interface Props {
  onEnter?: () => void;
  compact?: boolean;
}

// 5부를 통과한 학생에게만 보여주는 두 번째 포털 — "책의 페이지가 부서지며
// 글자들이 숫자/벡터로 흩어지는" 언어 차원의 균열.
export function PortalLanguage({ onEnter, compact = false }: Props) {
  const unlockBonus2 = useApp((s) => s.unlockBonus2);
  const setCurrent = useApp((s) => s.setCurrent);

  const enter = () => {
    unlockBonus2();
    setCurrent('p15' as PhaseId);
    window.location.hash = '#/p15';
    window.scrollTo({ top: 0 });
    onEnter?.();
  };

  return (
    <div className={`portal2-card relative overflow-hidden rounded-xl border border-amber-400/40 ${compact ? 'p-5' : 'p-8'}`}
      style={{
        background: 'radial-gradient(120% 120% at 50% 0%, rgba(251, 191, 36, 0.16), transparent 55%), radial-gradient(80% 80% at 80% 100%, rgba(244, 114, 182, 0.12), transparent 60%), rgb(var(--color-bg))',
      }}
    >
      <Glyphs count={compact ? 22 : 40} />

      <div className={`relative grid ${compact ? 'grid-cols-[auto_1fr] gap-4 items-center' : 'sm:grid-cols-[auto_1fr] gap-6 items-center'}`}>
        <BookRift size={compact ? 96 : 140} />
        <div>
          <div className="text-xs font-mono text-amber-400 tracking-widest">??? · HIDDEN STAGE Ⅱ</div>
          <h3 className={`mt-1 ${compact ? 'text-lg' : 'text-2xl'} font-semibold`}>책 한 권이 산산이 부서졌어요</h3>
          <p className="text-sm text-muted mt-2">
            지금까지는 모델이 <strong>그림</strong>을 다뤘어요. 이번 균열 너머에는, 신경망이 <strong>말과 글</strong>을
            다루는 차원이 펼쳐집니다. 글자가 어떻게 숫자가 되고, 단어가 어떻게 벡터가 되어
            <strong> GPT가 다음 단어를 떠올리는</strong> 순간까지 한 걸음씩 따라가요.
          </p>
          <p className="text-xs text-muted mt-2">
            ※ 트랜스포머·LLM의 출발점이 궁금한 사람만 들어오세요. 들어가지 않아도 5부까지의 학습은 충분히 끝났어요.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <button onClick={enter} className="btn-primary">
              포털에 들어가기 →
            </button>
            <button onClick={() => onEnter?.()} className="btn-ghost">
              지금은 패스
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BookRift({ size }: { size: number }) {
  const half = size / 2;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <defs>
          <radialGradient id="book-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef3c7" stopOpacity="1" />
            <stop offset="35%" stopColor="#f59e0b" stopOpacity="0.85" />
            <stop offset="75%" stopColor="#f472b6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="book-spine" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="60%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>
        {/* 빛나는 핵 */}
        <circle cx={half} cy={half} r={half - 6} fill="url(#book-core)">
          <animate attributeName="r" values={`${half - 8};${half - 4};${half - 8}`} dur="3.2s" repeatCount="indefinite" />
        </circle>
        {/* 펼쳐진 책 — 두 페이지 */}
        <g transform={`translate(${half}, ${half})`}>
          <g style={{ transformOrigin: '0 0', animation: 'book-flutter 4s ease-in-out infinite' }}>
            <path
              d={`M 0 ${-half + 22} L ${-half + 18} ${-half + 30} L ${-half + 18} ${half - 22} L 0 ${half - 28} Z`}
              fill="rgba(15, 23, 42, 0.55)"
              stroke="url(#book-spine)"
              strokeWidth={1.4}
            />
            <path
              d={`M 0 ${-half + 22} L ${half - 18} ${-half + 30} L ${half - 18} ${half - 22} L 0 ${half - 28} Z`}
              fill="rgba(15, 23, 42, 0.55)"
              stroke="url(#book-spine)"
              strokeWidth={1.4}
            />
            {/* 글자 줄 — 부서지며 숫자로 */}
            {[-18, -8, 2, 12].map((dy, i) => (
              <line
                key={`l${i}`}
                x1={-half + 24}
                x2={-6}
                y1={dy}
                y2={dy}
                stroke="#fde68a"
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={0.7}
              />
            ))}
            {[-18, -8, 2, 12].map((dy, i) => (
              <line
                key={`r${i}`}
                x1={6}
                x2={half - 24}
                y1={dy}
                y2={dy}
                stroke="#fde68a"
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={0.7}
              />
            ))}
          </g>
        </g>
      </svg>
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          boxShadow: '0 0 28px 4px rgba(251, 191, 36, 0.35), inset 0 0 22px rgba(244, 114, 182, 0.25)',
          animation: 'book-glow 2.8s ease-in-out infinite',
        }}
      />
      <style>{`
        @keyframes book-flutter {
          0%, 100% { transform: scale(1) rotate(-1deg); }
          50%      { transform: scale(1.04) rotate(1deg); }
        }
        @keyframes book-glow {
          0%, 100% { opacity: 0.6; }
          50%      { opacity: 1; }
        }
        @keyframes glyph-drift {
          0%   { transform: translate(0, 0); opacity: 0.2; }
          50%  { opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// 책에서 부서져 흩어지는 글자/숫자 입자
function Glyphs({ count }: { count: number }) {
  const chars = ['가', '나', '말', '글', 'A', 'B', '一', '言', '0', '1', '0x', '∑', 'v', 'z'];
  const items = Array.from({ length: count }).map((_, i) => {
    const seed = (i * 97 + 11) % 1000;
    const seed2 = (i * 137 + 53) % 1000;
    const seed3 = (i * 211 + 7) % 1000;
    return {
      x: (seed / 1000) * 100,
      y: (seed2 / 1000) * 100,
      ch: chars[i % chars.length],
      delay: ((i * 73) % 1000) / 250,
      dx: ((seed3 / 1000) - 0.5) * 40,
      dy: -10 - ((seed3 % 30)),
      dur: 3 + (i % 4) * 0.8,
      size: 10 + ((i * 17) % 6),
      hue: i % 2 === 0 ? '#fde68a' : '#f9a8d4',
    };
  });
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {items.map((g, i) => (
        <span
          key={i}
          className="absolute font-mono select-none"
          style={{
            left: `${g.x}%`,
            top: `${g.y}%`,
            color: g.hue,
            fontSize: g.size,
            opacity: 0.6,
            ['--dx' as string]: `${g.dx}px`,
            ['--dy' as string]: `${g.dy}px`,
            animation: `glyph-drift ${g.dur}s ease-in-out ${g.delay}s infinite`,
          } as React.CSSProperties}
        >
          {g.ch}
        </span>
      ))}
    </div>
  );
}
