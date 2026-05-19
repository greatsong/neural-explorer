// 데모용 간이 토크나이저 — 진짜 BPE는 아니다.
// 학생에게 만들어 줄 직관:
//   1) 토큰은 글자보다 크고 단어보다 작거나 같을 수 있다.
//   2) 영어가 한국어보다 토큰 효율이 좋다 (같은 의미, 더 적은 토큰).
//   3) 모델 입력은 결국 토큰 → vocab ID(정수) 배열.

const KO_PARTICLES = ['으로', '에서', '에게', '한테', '까지', '부터', '처럼', '보다',
                      '은', '는', '이', '가', '을', '를', '에', '도', '와', '과', '의', '만', '도'];

export type TokenKind = 'word' | 'particle' | 'subword' | 'punct' | 'space' | 'emoji' | 'digit' | 'other';

export interface Token {
  text: string;
  kind: TokenKind;
}

const PUNCT_RE = /^[.,!?;:。、！？""''「」『』·…\-—()[\]{}]+$/;
const EMOJI_RE = /\p{Extended_Pictographic}/u;
const HANGUL_SYLLABLE_RE = /[가-힯]/;
const LATIN_RE = /[A-Za-z]/;
const DIGIT_RE = /^\d+$/;

// 공백/구두점을 기준으로 1차 분리한 뒤, 각 조각에 추가 규칙을 적용한다.
export function tokenize(input: string): Token[] {
  if (!input) return [];
  const out: Token[] = [];

  // 1) 1차 분리: 공백·구두점·이모지를 경계로
  //    Array.from으로 코드포인트 단위 순회 (이모지 결합문자 안전)
  let buf = '';
  let bufKind: 'latin' | 'hangul' | 'digit' | 'other' | null = null;

  const flush = () => {
    if (!buf) return;
    if (bufKind === 'latin') {
      // 영어 단어 — 6글자 이상이면 절반쯤에서 한 번 자른다 (BPE 흉내)
      pushLatinWord(out, buf);
    } else if (bufKind === 'hangul') {
      // 한국어 어절 — 조사 분리
      pushHangulChunk(out, buf);
    } else if (bufKind === 'digit') {
      out.push({ text: buf, kind: 'digit' });
    } else {
      out.push({ text: buf, kind: 'other' });
    }
    buf = '';
    bufKind = null;
  };

  for (const ch of Array.from(input)) {
    if (ch === ' ' || ch === '\t' || ch === '\n') {
      flush();
      out.push({ text: ch, kind: 'space' });
      continue;
    }
    if (PUNCT_RE.test(ch)) {
      flush();
      out.push({ text: ch, kind: 'punct' });
      continue;
    }
    if (EMOJI_RE.test(ch)) {
      flush();
      out.push({ text: ch, kind: 'emoji' });
      continue;
    }
    let kind: typeof bufKind;
    if (LATIN_RE.test(ch))           kind = 'latin';
    else if (HANGUL_SYLLABLE_RE.test(ch)) kind = 'hangul';
    else if (/\d/.test(ch))          kind = 'digit';
    else                             kind = 'other';

    if (bufKind === null || bufKind === kind) {
      buf += ch;
      bufKind = kind;
    } else {
      flush();
      buf = ch;
      bufKind = kind;
    }
  }
  flush();
  return out;
}

function pushLatinWord(out: Token[], word: string) {
  if (word.length <= 5) {
    out.push({ text: word, kind: 'word' });
    return;
  }
  // 5글자 초과 단어는 4글자 + 나머지로 한 번 자른다.
  out.push({ text: word.slice(0, 4), kind: 'word' });
  out.push({ text: word.slice(4), kind: 'subword' });
}

function pushHangulChunk(out: Token[], chunk: string) {
  // 어절 끝에서 조사를 떼어낸다. 가장 긴 조사부터 시도.
  for (const p of KO_PARTICLES) {
    if (chunk.length > p.length && chunk.endsWith(p)) {
      out.push({ text: chunk.slice(0, chunk.length - p.length), kind: 'word' });
      out.push({ text: p, kind: 'particle' });
      return;
    }
  }
  out.push({ text: chunk, kind: 'word' });
}

// 공백 토큰을 제외한 "의미 토큰" 개수 — 학생용 카운트에 사용
export function countMeaningfulTokens(tokens: Token[]): number {
  return tokens.filter((t) => t.kind !== 'space').length;
}

// 토큰 → 가짜 vocab ID (단순 해시). 진짜 vocab 없이도 "각 토큰이 정수 하나가 된다"는 점만 보여줌.
export function fakeVocabId(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // 0~49,999 범위로 축약 (GPT-4가 약 10만 vocab이라 비슷한 크기 느낌)
  return Math.abs(h) % 50000;
}
