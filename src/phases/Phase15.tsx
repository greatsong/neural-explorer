import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store';
import { PHASES } from '../phases';
import { tokenize, fakeVocabId, type Token } from '../lib/tokenizer';

type Tab = 'char' | 'token' | 'ids';

export function Phase15() {
  const meta = PHASES.find((p) => p.id === 'p15')!;
  const [tab, setTab] = useState<Tab>('char');
  const markCompleted = useApp((s) => s.markCompleted);

  // ③ 탭까지 둘러보면 완료 처리
  useEffect(() => {
    if (tab === 'ids') markCompleted('p15');
  }, [tab, markCompleted]);

  return (
    <article>
      <div className="text-xs font-mono text-accent">{meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2">
        A·B·C까지 신경망에 넣은 입력은 모두 숫자였어요 — 점의 좌표(x, y), 픽셀의 밝기. 그런데 글자는 숫자가 아닙니다.
        한국어 한 문장을 신경망에 넣으려면 결국 <strong>정수의 묶음</strong>으로 바꿔야 해요. 그 과정을 세 단계로 따라가 봅니다.
      </p>

      <div className="flex gap-1 mt-6 border-b border-border">
        <TabBtn active={tab === 'char'}  onClick={() => setTab('char')}>① 글자 = 번호</TabBtn>
        <TabBtn active={tab === 'token'} onClick={() => setTab('token')}>② 토큰으로 자르기</TabBtn>
        <TabBtn active={tab === 'ids'}   onClick={() => setTab('ids')}>③ 정수 묶음으로</TabBtn>
      </div>

      {tab === 'char'  && <CharTab />}
      {tab === 'token' && <TokenTab />}
      {tab === 'ids'   && <IdsTab />}
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

// ──────── 탭 1 — 글자 한 개가 어떻게 번호가 되는가 ────────
function CharTab() {
  const sample = '안녕';
  const [idx, setIdx] = useState(0);
  const ch = sample[idx];
  const cp = ch.codePointAt(0)!;
  const utf8 = encodeUtf8(ch);

  return (
    <div className="mt-6 space-y-5">
      <div className="aside-tip">
        <div className="font-medium">🎯 첫 번째 약속 — 모든 글자에 번호를 매겨두자</div>
        <p className="text-sm mt-1">
          전 세계 문자에 빠짐없이 번호를 매긴 표가 <strong>유니코드</strong>예요. 한 글자에 번호 한 개.
          이 번호를 <strong>코드포인트</strong>라고 불러요. 'A'는 65, '가'는 44032, '🤖'는 129302번.
        </p>
      </div>

      <h2>예시 — "안녕"</h2>
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
        <Row label="글자"><span className="text-3xl">{ch}</span></Row>
        <Row label="유니코드 번호">
          <code className="font-mono text-accent">{cp}</code>
          <span className="text-xs text-muted ml-2">(코드포인트)</span>
        </Row>
        <Row label="UTF-8 바이트">
          <code className="font-mono">{utf8.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')}</code>
          <span className="text-xs text-muted ml-2">({utf8.length}B로 펼친 결과)</span>
        </Row>
      </div>

      <p className="text-sm text-muted leading-relaxed">
        한글 한 글자는 보통 UTF-8 <strong>3바이트</strong>로 펼쳐지고, 영어 알파벳은 <strong>1바이트</strong>면 충분해요.
        같은 "한 글자"여도 컴퓨터가 다루는 데이터의 양이 다르다는 점만 기억하고 다음 단계로 넘어갑시다.
      </p>

      <div className="aside-note text-sm">
        💡 그런데 신경망은 <em>글자 한 개씩</em> 입력받지 않아요. 글자 단위는 너무 잘아서 의미를 놓치거든요.
        그래서 다음 단계에서 "글자보다 크고 단어보다 작거나 같은" 단위 — <strong>토큰</strong>으로 자릅니다.
      </div>
    </div>
  );
}

// ──────── 탭 2 — 토큰으로 자르기 ────────
function TokenTab() {
  const [text, setText] = useState('나는 인공지능을 좋아합니다 🤖');
  const tokens = useMemo(() => tokenize(text), [text]);
  const tokenCount = tokens.filter((t) => t.kind !== 'space').length;

  return (
    <div className="mt-6 space-y-5">
      <div className="aside-tip">
        <div className="font-medium">🎯 두 번째 약속 — 문장을 적당한 크기의 조각으로 자른다</div>
        <p className="text-sm mt-1">
          한 글자씩 넣자니 너무 잘고, 한 문장 통째로 넣자니 너무 큼. 그래서 신경망은 그 사이의 <strong>토큰</strong>이라는
          단위로 문장을 자릅니다. 영어는 보통 단어 하나가 한 토큰. 한국어는 어절을 다시 어간+조사로 더 쪼개기도 해요.
        </p>
      </div>

      <div>
        <label className="text-sm text-muted">아무 문장이나 입력해 보세요</label>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="mt-2 w-full px-3 py-2 rounded-md border border-border bg-surface text-lg"
          placeholder="예: 안녕하세요. Hello world! 🚀"
        />
      </div>

      <h2>자른 결과 — 토큰 {tokenCount}개</h2>
      <div className="card p-4 leading-loose">
        <TokenBadges tokens={tokens} />
      </div>

      <h2>같은 의미, 다른 토큰 수</h2>
      <p className="text-sm text-muted">
        영어와 한국어에서 같은 의미의 짧은 문장을 토큰으로 잘라 봅니다.
        한국어는 어절 끝에 조사가 붙어 보통 더 많은 토큰이 나옵니다.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <CompareCard text="Hello world!" />
        <CompareCard text="안녕 세상아!" />
        <CompareCard text="I love AI." />
        <CompareCard text="나는 인공지능을 좋아한다." />
      </div>

      <div className="aside-note text-sm">
        💡 이 데모는 학생용 단순 규칙(영어는 단어 단위, 한국어는 어절+조사). 실제 GPT는 <strong>BPE</strong>라는
        통계 기반 방법으로 자릅니다. 자세한 규칙은 다르지만, "글자보다 크고 문장보다 작은 조각"이라는 핵심은 같아요.
      </div>
    </div>
  );
}

function TokenBadges({ tokens }: { tokens: Token[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 text-sm font-mono">
      {tokens.map((t, i) => {
        if (t.kind === 'space') return <span key={i} className="px-1 text-muted">·</span>;
        const style = kindStyle(t.kind);
        return (
          <span
            key={i}
            title={kindLabel(t.kind)}
            className="px-2 py-1 rounded"
            style={style}
          >
            {t.text}
          </span>
        );
      })}
    </div>
  );
}

function CompareCard({ text }: { text: string }) {
  const tokens = tokenize(text);
  const count = tokens.filter((t) => t.kind !== 'space').length;
  const chars = [...text].length;
  return (
    <div className="card p-3">
      <div className="text-xs text-muted">
        글자 <strong className="text-text">{chars}</strong> · 토큰 <strong className="text-accent">{count}</strong>
      </div>
      <div className="mt-2">
        <TokenBadges tokens={tokens} />
      </div>
    </div>
  );
}

// ──────── 탭 3 — 토큰 → 정수 ID ────────
function IdsTab() {
  const [text, setText] = useState('나는 인공지능을 좋아한다');
  const tokens = useMemo(() => tokenize(text).filter((t) => t.kind !== 'space'), [text]);

  return (
    <div className="mt-6 space-y-5">
      <div className="aside-tip">
        <div className="font-medium">🎯 세 번째 약속 — 각 토큰에 정수 한 개를 매긴다</div>
        <p className="text-sm mt-1">
          모델이 아는 모든 토큰을 모아 둔 게 <strong>어휘(vocabulary)</strong>예요. 어휘 안에서 토큰마다 번호가 정해져 있죠.
          그래서 문장 한 줄은 신경망에 들어갈 때 결국 <strong>정수의 묶음</strong>이 됩니다.
          이 정수 시퀀스가 A·B·C에서 본 "입력 숫자"의 자리예요.
        </p>
      </div>

      <div>
        <label className="text-sm text-muted">문장을 입력하면 토큰 → 정수 ID로 바꿔 봅니다</label>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="mt-2 w-full px-3 py-2 rounded-md border border-border bg-surface"
        />
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="text-left px-3 py-2">#</th>
              <th className="text-left px-3 py-2">토큰</th>
              <th className="text-left px-3 py-2">종류</th>
              <th className="text-left px-3 py-2">정수 ID</th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((t, i) => (
              <tr key={i} className="border-t border-border">
                <td className="px-3 py-2 text-muted">{i + 1}</td>
                <td className="px-3 py-2 font-mono">
                  <span className="px-2 py-0.5 rounded" style={kindStyle(t.kind)}>{t.text}</span>
                </td>
                <td className="px-3 py-2 text-xs text-muted">{kindLabel(t.kind)}</td>
                <td className="px-3 py-2 font-mono text-accent">{fakeVocabId(t.text)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>신경망이 실제로 보는 입력</h2>
      <div className="card p-4 font-mono text-sm break-all">
        [{tokens.map((t) => fakeVocabId(t.text)).join(', ')}]
      </div>
      <p className="text-xs text-muted">
        이 데모의 ID는 단순 해시로 만든 가짜예요(0 ~ 49,999). 진짜 GPT는 약 10만 개의 토큰을 정해 두고
        각각 0번부터 99,999번까지 번호를 매겨 둡니다.
      </p>

      <div className="aside-note text-sm">
        ✅ 정리: <strong>글자 → 토큰 → 정수 ID</strong>. 이 정수 묶음이 신경망의 입력이 됩니다.
        그런데 정수 357번과 358번 사이에 의미적 관계가 있을까요? 없죠.
        다음 페이지(E2)에서는 그 정수를 다시 <strong>좌표(벡터)</strong>로 바꿔
        의미를 위치에 담는 방법을 봅니다.
      </div>
    </div>
  );
}

// ──────── 헬퍼 ────────
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] items-center gap-3 text-sm">
      <div className="text-muted">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function encodeUtf8(ch: string): number[] {
  return Array.from(new TextEncoder().encode(ch));
}

function kindStyle(kind: Token['kind']): React.CSSProperties {
  switch (kind) {
    case 'word':     return { background: 'rgba(16, 185, 129, 0.18)', color: '#047857' };
    case 'subword':  return { background: 'rgba(16, 185, 129, 0.10)', color: '#047857', borderLeft: '2px solid #10b98155', paddingLeft: 4 };
    case 'particle': return { background: 'rgba(168, 85, 247, 0.18)', color: '#7c3aed' };
    case 'punct':    return { background: 'rgba(100, 116, 139, 0.18)', color: '#475569' };
    case 'emoji':    return { background: 'rgba(245, 158, 11, 0.18)', color: '#b45309' };
    case 'digit':    return { background: 'rgba(14, 165, 233, 0.18)', color: '#0369a1' };
    default:         return { background: 'rgba(100, 116, 139, 0.10)', color: '#475569' };
  }
}

function kindLabel(kind: Token['kind']): string {
  switch (kind) {
    case 'word': return '단어';
    case 'subword': return '단어 조각';
    case 'particle': return '조사';
    case 'punct': return '구두점';
    case 'emoji': return '이모지';
    case 'digit': return '숫자';
    case 'space': return '공백';
    default: return '기타';
  }
}
