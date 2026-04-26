import { useApp } from '../store';
import type { PhaseId } from '../phases';

interface Props {
  onEnter?: () => void;
  compact?: boolean;
}

// 4부를 통과한 학생에게만 보여주는 "비밀 차원" 포털.
// 회전·맥동·반짝임을 SVG로만 표현해 외부 의존 없이 동작.
export function Portal({ onEnter, compact = false }: Props) {
  const unlockBonus = useApp((s) => s.unlockBonus);
  const setCurrent = useApp((s) => s.setCurrent);

  const enter = () => {
    unlockBonus();
    setCurrent('p13' as PhaseId);
    window.location.hash = '#/p13';
    window.scrollTo({ top: 0 });
    onEnter?.();
  };

  return (
    <div className={`portal-card relative overflow-hidden rounded-xl border border-purple-400/40 ${compact ? 'p-5' : 'p-8'}`}
      style={{
        background: 'radial-gradient(120% 120% at 50% 0%, rgba(168, 85, 247, 0.18), transparent 50%), radial-gradient(80% 80% at 80% 100%, rgba(34, 211, 238, 0.12), transparent 60%), rgb(var(--color-bg))',
      }}
    >
      {/* 배경 별 입자 */}
      <Stars count={compact ? 18 : 30} />

      <div className={`relative grid ${compact ? 'grid-cols-[auto_1fr] gap-4 items-center' : 'sm:grid-cols-[auto_1fr] gap-6 items-center'}`}>
        <PortalRing size={compact ? 96 : 140} />
        <div>
          <div className="text-xs font-mono text-purple-400 tracking-widest">??? · HIDDEN STAGE</div>
          <h3 className={`mt-1 ${compact ? 'text-lg' : 'text-2xl'} font-semibold`}>차원의 균열을 발견했습니다</h3>
          <p className="text-sm text-muted mt-2">
            지금까지는 사진을 보고 <strong>분류</strong>하는 모델만 다뤘어요.
            그런데 이 균열 너머에는, 신경망이 <strong>새로운 그림을 직접 만들어 내는</strong> 세상이 펼쳐집니다.
          </p>
          <p className="text-xs text-muted mt-2">
            ※ 이미지 생성 원리(Stable Diffusion·DALL·E의 출발점)가 궁금한 사람만 들어오세요. 들어가지 않아도 본 학습은 끝난 거예요.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <button onClick={enter} className="btn-primary">
              포털에 들어가기 →
            </button>
            <button
              onClick={() => onEnter?.()}
              className="btn-ghost"
            >
              지금은 패스
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PortalRing({ size }: { size: number }) {
  const half = size / 2;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        style={{ animation: 'portal-spin 8s linear infinite' }}
      >
        <defs>
          <radialGradient id="portal-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef9c3" stopOpacity="1" />
            <stop offset="30%" stopColor="#a855f7" stopOpacity="0.9" />
            <stop offset="70%" stopColor="#22d3ee" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="portal-ring" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="50%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <circle cx={half} cy={half} r={half - 4} fill="url(#portal-core)" />
        <circle cx={half} cy={half} r={half - 6} fill="none" stroke="url(#portal-ring)" strokeWidth={3} strokeDasharray="6 4" />
        <circle cx={half} cy={half} r={half - 14} fill="none" stroke="url(#portal-ring)" strokeWidth={1.2} strokeDasharray="2 6" opacity={0.7} />
      </svg>
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          boxShadow: '0 0 30px 6px rgba(168, 85, 247, 0.45), inset 0 0 20px rgba(34, 211, 238, 0.3)',
          animation: 'portal-pulse 2.4s ease-in-out infinite',
        }}
      />
      <style>{`
        @keyframes portal-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes portal-pulse {
          0%, 100% { opacity: 0.65; transform: scale(1); }
          50%      { opacity: 1;    transform: scale(1.05); }
        }
        @keyframes star-twinkle {
          0%, 100% { opacity: 0.2; }
          50%      { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function Stars({ count }: { count: number }) {
  // 결정적 위치(매번 동일) — 컴포넌트 리렌더 시 자리가 안 바뀌도록
  const stars = Array.from({ length: count }).map((_, i) => {
    const seed = (i * 97 + 11) % 1000;
    const seed2 = (i * 137 + 53) % 1000;
    return {
      x: (seed / 1000) * 100,
      y: (seed2 / 1000) * 100,
      delay: ((i * 73) % 1000) / 500,
      size: 1 + ((i * 31) % 3),
    };
  });
  return (
    <div className="absolute inset-0 pointer-events-none">
      {stars.map((s, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            animation: `star-twinkle ${1.5 + (i % 3) * 0.4}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
