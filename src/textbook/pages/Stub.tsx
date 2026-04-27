// 아직 작성 중인 장의 자리표시자 — 1부 검토 후 2~4부 채워질 예정.
import type { TextbookSlug } from '../toc';
import { findPage, findPart } from '../toc';

export function TextbookStub({ slug }: { slug: TextbookSlug }) {
  const meta = findPage(slug);
  const part = findPart(slug);
  return (
    <section className="my-12 rounded-xl border border-dashed border-border bg-surface/30 px-6 py-10 text-center">
      <div className="text-sm text-muted mb-2">{part?.num} · {part?.title}</div>
      <h2 className="text-2xl font-bold">{meta?.title ?? '준비 중'}</h2>
      <p className="text-muted mt-3 leading-7">
        이 장은 1부의 톤·구성에 대한 사용자 확정이 끝나는 즉시 같은 양식으로 작성될 예정이다.<br />
        그동안 인앱 시뮬레이터에서 먼저 체험해 볼 수 있다.
      </p>
      {meta?.appPhase && (
        <a
          href={`#/${meta.appPhase}`}
          className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-md border border-border hover:bg-surface text-sm font-medium"
        >
          ▶ 실습 앱에서 먼저 만져보기
        </a>
      )}
    </section>
  );
}
