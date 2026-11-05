// Vercel Serverless Function — neural-explorer-gallery에 학생 그림 제출
// 환경변수: GITHUB_TOKEN (fine-grained PAT, neural-explorer-gallery에 contents:write)
//           GALLERY_SUBMIT_ENABLED=true (갤러리 제출을 열 때만 설정. 없으면 503으로 닫힌다)
// 제출 내용은 공개 저장소에 CC-BY로 영구 공개된다. 지금 앱 화면에는 이 주소를 부르는 코드가 없으므로 기본은 닫아 둔다.

interface RequestBody {
  drawings: { pixels: number[]; label: string; size: number }[];
  nickname?: string | null;
  phase: number;
  labels: [string, string];
}

export const config = { runtime: 'edge' };

const REPO = 'greatsong/neural-explorer-gallery';
const FORBIDDEN_NICKNAME = /(admin|관리자|root|fuck|shit|씨발|병신|좆)/i;
// 공개 저장소에 들어가면 안 되는 연락처 형태: 이메일, 휴대전화 번호, 학번처럼 숫자가 5자리 이상 이어지는 글
const CONTACT_LIKE = /[\w.+-]+@[\w-]+\.[\w.]+|01[016789][-. ]?\d{3,4}[-. ]?\d{4}|\d{5,}/;

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  const env = (globalThis as { process?: { env?: Record<string, string> } }).process?.env;
  if (env?.GALLERY_SUBMIT_ENABLED !== 'true') {
    return new Response('Gallery submission is closed.', { status: 503 });
  }
  const token = env?.GITHUB_TOKEN;
  if (!token) {
    return new Response('Server is not configured (missing GITHUB_TOKEN). Contact admin.', { status: 503 });
  }

  // 이 앱 화면에서 보낸 요청만 받는다
  const origin = req.headers.get('origin');
  let sameOrigin = false;
  try {
    sameOrigin = !!origin && new URL(origin).host === new URL(req.url).host;
  } catch {
    sameOrigin = false;
  }
  if (!sameOrigin) {
    return new Response('Forbidden', { status: 403 });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  // validation
  if (!Array.isArray(body.drawings) || body.drawings.length === 0 || body.drawings.length > 50) {
    return new Response('drawings: 1~50개', { status: 400 });
  }
  for (const d of body.drawings) {
    if (![64, 784].includes(d.pixels?.length)) return new Response('Invalid pixel count', { status: 400 });
    if (![8, 28].includes(d.size)) return new Response('Invalid size', { status: 400 });
    if (!d.pixels.every((p) => p === 0 || p === 1 || (p >= 0 && p <= 255))) return new Response('Invalid pixel value', { status: 400 });
    if (typeof d.label !== 'string' || d.label.length > 50 || CONTACT_LIKE.test(d.label)) return new Response('Invalid label', { status: 400 });
  }
  if (
    !Array.isArray(body.labels) || body.labels.length !== 2 ||
    !body.labels.every((l) => typeof l === 'string' && l.length <= 50 && !CONTACT_LIKE.test(l))
  ) {
    return new Response('Invalid labels', { status: 400 });
  }
  if (!Number.isInteger(body.phase) || body.phase < 0 || body.phase > 99) {
    return new Response('Invalid phase', { status: 400 });
  }
  if (body.nickname != null && (
    typeof body.nickname !== 'string' || body.nickname.length > 20 ||
    FORBIDDEN_NICKNAME.test(body.nickname) || CONTACT_LIKE.test(body.nickname)
  )) {
    return new Response('Invalid nickname', { status: 400 });
  }

  const now = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const id = crypto.randomUUID().slice(0, 8);
  const deleteToken = crypto.randomUUID();

  const submission = {
    id,
    deleteTokenHash: await sha256Hex(deleteToken),  // 공개 저장소에는 해시만 둔다. 원문은 제출자에게만 돌려준다
    timestamp: now.toISOString(),
    phase: body.phase,
    labels: body.labels,
    nickname: body.nickname || null,
    drawings: body.drawings,
    license: 'CC-BY 4.0',
    attribution: 'Neural Explorer Gallery contributors (한국 고등학생)',
  };

  const path = `submissions/${month}/${now.toISOString().slice(0, 10)}-${id}.json`;
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(submission, null, 2))));

  // GitHub API: PUT /repos/{owner}/{repo}/contents/{path}
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `submit: ${body.drawings.length} drawings`,
      content,
      committer: { name: 'neural-explorer-bot', email: 'bot@neural-explorer.local' },
    }),
  });

  if (!res.ok) {
    console.error('gallery submit failed', res.status, await res.text());
    return new Response('Gallery storage failed', { status: 502 });
  }

  return Response.json({ ok: true, id, deleteToken, path });
}
