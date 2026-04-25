// Vercel Serverless Function — neural-explorer-gallery에 학생 그림 제출
// 환경변수: GITHUB_TOKEN (fine-grained PAT, neural-explorer-gallery에 contents:write)

interface RequestBody {
  drawings: { pixels: number[]; label: string; size: number }[];
  nickname?: string | null;
  phase: number;
  labels: [string, string];
}

export const config = { runtime: 'edge' };

const REPO = 'greatsong/neural-explorer-gallery';
const FORBIDDEN_NICKNAME = /(admin|관리자|root|fuck|shit|씨발|병신|좆)/i;

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  const token = (globalThis as { process?: { env?: Record<string, string> } }).process?.env?.GITHUB_TOKEN;
  if (!token) {
    return new Response('Server is not configured (missing GITHUB_TOKEN). Contact admin.', { status: 503 });
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
    if (typeof d.label !== 'string' || d.label.length > 50) return new Response('Invalid label', { status: 400 });
  }
  if (body.nickname && (body.nickname.length > 20 || FORBIDDEN_NICKNAME.test(body.nickname))) {
    return new Response('Invalid nickname', { status: 400 });
  }

  const now = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const id = crypto.randomUUID().slice(0, 8);
  const deleteToken = crypto.randomUUID();

  const submission = {
    id,
    deleteToken,  // 갤러리에는 저장되지만 응답으로도 돌려줌
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
      message: `submit: ${body.drawings.length} drawings (${body.labels.join(' / ')})`,
      content,
      committer: { name: 'neural-explorer-bot', email: 'bot@neural-explorer.local' },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return new Response(`GitHub API: ${res.status} ${text}`, { status: 502 });
  }

  return Response.json({ ok: true, id, deleteToken, path });
}
