import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store';

type Tab = 'idea' | 'play' | 'compare';

export function Phase15() {
  const [tab, setTab] = useState<Tab>('idea');
  const markCompleted = useApp((s) => s.markCompleted);

  // 학습 완료 처리: '비교' 탭까지 둘러보면 완료로 인정
  useEffect(() => {
    if (tab === 'compare') markCompleted('p15');
  }, [tab, markCompleted]);

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE 15</div>
      <h1>텍스트가 숫자가 되기까지</h1>
      <p className="text-muted mt-2">
        신경망은 글자 자체를 알아보지 못해요. <strong>모든 글자는 결국 숫자</strong>로 바뀐 다음에야 모델로 흘러 들어갑니다.
        "안녕하세요" 다섯 글자가 컴퓨터 안에서 어떻게 0과 1이 되는지 직접 따라가 봅시다.
      </p>

      <div className="flex gap-1 mt-6 border-b border-border">
        <TabBtn active={tab === 'idea'} onClick={() => setTab('idea')}>① 글자 → 코드포인트</TabBtn>
        <TabBtn active={tab === 'play'} onClick={() => setTab('play')}>② 직접 입력해보기</TabBtn>
        <TabBtn active={tab === 'compare'} onClick={() => setTab('compare')}>③ 한글·영어·이모지</TabBtn>
      </div>

      {tab === 'idea' && <IdeaTab />}
      {tab === 'play' && <PlayTab />}
      {tab === 'compare' && <CompareTab />}
    </article>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 text-sm border-b-2 -mb-px transition ${
        active ? 'border-accent text-accent font-medium' : 'border-transparent text-muted hover:text-text'
      }`}
    >
      {children}
    </button>
  );
}

// ──────── 탭 1: 아이디어 + 슬라이더 ────────
function IdeaTab() {
  const sample = '안녕하세요';
  const [idx, setIdx] = useState(0);
  const ch = sample[idx];
  const cp = ch.codePointAt(0)!;
  const utf8 = encodeUtf8(ch);

  return (
    <div className="mt-6 space-y-5">
      <div className="aside-tip">
        <div className="font-medium">🎯 핵심 아이디어</div>
        <p className="text-sm mt-1">
          모든 글자는 <strong>유니코드 코드포인트</strong>라는 고유 번호를 가져요. 그 번호를
          저장·전송할 때는 <strong>UTF-8</strong>이라는 규칙으로 1~4 바이트 길이의 0/1 묶음으로 펼쳐집니다.
        </p>
      </div>

      <h2>예시: "안녕하세요"</h2>
      <div className="flex flex-wrap gap-2">
        {[...sample].map((c, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`px-3 py-2 rounded-md border text-lg font-mono transition ${
              i === idx ? 'border-accent bg-accent-bg text-accent' : 'border-border hover:bg-surface'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="card p-5 space-y-3">
        <Row label="글자">
          <span className="text-3xl">{ch}</span>
        </Row>
        <Row label="코드포인트 (10진수)">
          <code className="font-mono">{cp}</code>
          <span className="text-xs text-muted ml-2">유니코드가 정한 고유 번호</span>
        </Row>
        <Row label="코드포인트 (16진수)">
          <code className="font-mono text-accent">U+{cp.toString(16).toUpperCase().padStart(4, '0')}</code>
        </Row>
        <Row label={`UTF-8 (${utf8.length} 바이트)`}>
          <code className="font-mono">{utf8.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')}</code>
        </Row>
        <Row label="UTF-8 (2진수)">
          <code className="font-mono text-xs break-all">
            {utf8.map((b) => b.toString(2).padStart(8, '0')).join(' ')}
          </code>
        </Row>
      </div>

      <p className="text-sm text-muted">
        한글 하나는 보통 <strong>3바이트</strong>. 영어 알파벳은 <strong>1바이트</strong>면 충분해요.
        같은 "글자 한 개"여도 비용이 다른 이유는 ③ 탭에서 직접 비교해 봅시다.
      </p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-center gap-3 text-sm">
      <div className="text-muted">{label}</div>
      <div>{children}</div>
    </div>
  );
}

// ──────── 탭 2: 직접 입력 ────────
function PlayTab() {
  const [text, setText] = useState('Hi 안녕 🤖');
  const chars = useMemo(() => [...text], [text]);

  return (
    <div className="mt-6 space-y-5">
      <div>
        <label className="text-sm text-muted">아무 글자나 입력해 보세요</label>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="mt-2 w-full px-3 py-2 rounded-md border border-border bg-surface font-mono text-lg"
          placeholder="예: Hello, 안녕, 🚀"
        />
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="text-left px-3 py-2">#</th>
              <th className="text-left px-3 py-2">글자</th>
              <th className="text-left px-3 py-2">코드포인트</th>
              <th className="text-left px-3 py-2">U+hex</th>
              <th className="text-left px-3 py-2">UTF-8 바이트</th>
              <th className="text-left px-3 py-2">2진수</th>
            </tr>
          </thead>
          <tbody>
            {chars.map((c, i) => {
              const cp = c.codePointAt(0)!;
              const bytes = encodeUtf8(c);
              return (
                <tr key={i} className="border-t border-border">
                  <td className="px-3 py-2 text-muted">{i + 1}</td>
                  <td className="px-3 py-2 text-lg">{c}</td>
                  <td className="px-3 py-2 font-mono">{cp}</td>
                  <td className="px-3 py-2 font-mono text-accent">U+{cp.toString(16).toUpperCase().padStart(4, '0')}</td>
                  <td className="px-3 py-2 font-mono">
                    {bytes.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')}
                    <span className="text-xs text-muted ml-2">({bytes.length}B)</span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {bytes.map((b) => b.toString(2).padStart(8, '0')).join(' ')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-sm text-muted">
        총 글자 수: <strong>{chars.length}</strong> · 총 UTF-8 바이트:{' '}
        <strong>{new TextEncoder().encode(text).length}</strong> B
      </div>

      <div className="aside-note">
        💡 같은 한 글자도 무엇이냐에 따라 1·2·3·4 바이트 모두 가능해요. 모델 입장에서 "글자 하나"는
        결국 이 <strong>여러 바이트의 묶음</strong>이고, 토크나이저는 다시 이 묶음을 다른 방식으로 자르게 됩니다.
      </div>
    </div>
  );
}

// ──────── 탭 3: 비교 ────────
function CompareTab() {
  const samples = [
    { label: '영어', text: 'Hello world!' },
    { label: '한글', text: '안녕 세상아!' },
    { label: '한자', text: '你好世界！' },
    { label: '이모지', text: '🤖🚀✨' },
    { label: '섞임', text: 'GPT는 🤖 입니다' },
  ];

  return (
    <div className="mt-6 space-y-5">
      <h2>같은 "한 글자"의 무게</h2>
      <p className="text-sm text-muted">
        UTF-8은 1~4바이트 가변 길이. 사용자에게 한 글자처럼 보여도 모델 입장에서 받아들이는 데이터의 양은 다릅니다.
      </p>

      <div className="space-y-3">
        {samples.map((s) => {
          const chars = [...s.text];
          const bytes = new TextEncoder().encode(s.text).length;
          const ratio = bytes / chars.length;
          return (
            <div key={s.label} className="card p-4">
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <div className="text-xs font-mono text-muted">{s.label}</div>
                  <div className="text-lg mt-0.5">{s.text}</div>
                </div>
                <div className="text-right text-xs text-muted shrink-0">
                  글자 <strong className="text-text">{chars.length}</strong> ·
                  바이트 <strong className="text-text">{bytes}</strong> ·
                  글자당 <strong className="text-accent">{ratio.toFixed(2)} B</strong>
                </div>
              </div>
              <div className="flex gap-1 mt-3 flex-wrap">
                {chars.map((c, i) => {
                  const b = encodeUtf8(c).length;
                  return (
                    <span
                      key={i}
                      title={`${b} 바이트`}
                      className="px-2 py-1 rounded text-sm font-mono"
                      style={{
                        background: byteHue(b),
                        color: '#0f172a',
                      }}
                    >
                      {c}
                      <span className="text-[10px] opacity-70 ml-1">{b}B</span>
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="aside-tip">
        <div className="font-medium">🤔 이모지가 왜 가장 무거울까?</div>
        <p className="text-sm mt-1">
          이모지의 코드포인트는 보통 U+1F000 이상으로 매우 큰 숫자라서 UTF-8로 펼치면 <strong>4바이트</strong>가 필요해요.
          더구나 🇰🇷 같은 깃발이나 👨‍👩‍👧‍👦 같은 결합 이모지는 여러 코드포인트가 줄줄이 이어져 한 글자처럼 표시되는 구조라서
          실제 바이트는 훨씬 더 늘어납니다.
        </p>
      </div>

      <div className="aside-note">
        다음 페이지에서는 이 "바이트의 묶음"을 신경망이 받아들일 때 쓰는 단위 — <strong>토큰</strong>을 다룹니다.
        같은 문장이 영어와 한글에서 토큰 수가 달라지는 이유, 직접 확인해 보세요.
      </div>
    </div>
  );
}

// ──────── 헬퍼 ────────
function encodeUtf8(ch: string): number[] {
  return Array.from(new TextEncoder().encode(ch));
}

function byteHue(n: number): string {
  // 1B 연두 → 4B 분홍
  switch (n) {
    case 1: return '#bbf7d0';
    case 2: return '#fde68a';
    case 3: return '#fdba74';
    case 4: return '#f9a8d4';
    default: return '#e5e7eb';
  }
}
