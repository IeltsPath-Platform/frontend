import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { BasketOptionalItem, BasketRequiredItem } from '~types/learningPath'
import { learningApi } from '../api'
import { MasteryRing } from '../components/guide/MasteryRing'
import { LearnTrail } from '../components/LearnTrail'
import { ApiErrorState } from '../components/PageState'
import { skillLabel } from '../lib/courseMeta'
import { dueLabel, reviewPath } from '../lib/masteryGuide'
import { tierMeta } from '../lib/treeMeta'
import { useApiResource } from '../lib/useApiResource'
import { useStartBasketReview } from '../lib/useStartBasketReview'

/** Reviews the learner owes first, then the points worth reviewing now: weak ones, and ones whose review is due. */
export function ReviewBasketPage() {
  const basket = useApiResource('review-basket', () => learningApi.getReviewBasket())
  const { busyId, start } = useStartBasketReview()
  // The due labels are counted from the moment the page opened, so they do not shift while the learner reads.
  const [now] = useState(() => new Date())

  const data = basket.data
  const total = data ? data.required.length + data.consolidate.length + data.due.length + data.weak.length : 0

  return (
    <div className="lp-page lp-basket">
      <LearnTrail items={[{ label: 'Khóa học', to: '/learn' }, { label: 'Giỏ ôn tập' }]} />

      <header className="lp-basket__head">
        <p className="lp-eyebrow">Ôn tập</p>
        <h1>Giỏ ôn tập</h1>
        <p className="lp-basket__lead">
          Những điểm kiến thức nên nhắc lại ngay bây giờ. Bài ôn bắt buộc đứng đầu vì nó mở khóa bài học tiếp theo; phần
          còn lại là tùy bạn.
        </p>
        {data && total > 0 ? (
          <nav aria-label="Các nhóm trong giỏ ôn" className="lp-basket__tally">
            <TallyLink count={data.required.length} href="#lp-basket-required" label="Bắt buộc" tone="danger" />
            <TallyLink count={data.weak.length} href="#lp-basket-weak" label="Cần ưu tiên" tone="warn" />
            <TallyLink count={data.consolidate.length} href="#lp-basket-consolidate" label="Nên củng cố" tone="accent" />
            <TallyLink count={data.due.length} href="#lp-basket-due" label="Đến hạn ôn" tone="primary" />
          </nav>
        ) : null}
      </header>

      {basket.status === 'loading' ? <BasketSkeleton /> : null}
      {basket.status === 'error' && basket.error ? <ApiErrorState error={basket.error} onRetry={basket.reload} /> : null}

      {data && total === 0 ? (
        <section className="lp-basket__clear" role="status">
          <CheckCircle2 aria-hidden="true" size={28} />
          <h2>Giỏ ôn đang trống</h2>
          <p>Chưa có điểm nào cần củng cố hay đến hạn ôn. Làm thêm bài học và luyện tập, hệ thống sẽ cập nhật ở đây.</p>
          <Button asChild className="lp-btn"><Link to="/learn">Về lộ trình</Link></Button>
        </section>
      ) : null}

      {data && total > 0 ? (
        <>
          <BasketSection
            count={data.required.length}
            emptyText="Không có bài ôn bắt buộc nào. Bạn đang đi đúng nhịp."
            hint="Hoàn thành các bài này để mở lại những bài học đang bị khóa."
            id="lp-basket-required"
            title="Bắt buộc"
          >
            {data.required.map((item) => <RequiredRow item={item} key={item.reviewId} />)}
          </BasketSection>

          {data.weak.length > 0 ? (
            <BasketSection
              count={data.weak.length}
              emptyText=""
              hint="Điểm còn yếu: hệ thống đã gợi ý sẵn một bài ôn cho bạn, làm khi bạn sẵn sàng."
              id="lp-basket-weak"
              title="Cần ưu tiên"
            >
              {data.weak.map((item) => (
                <OptionalRow busyId={busyId} item={item} key={item.knowledgePointId} now={now} onStart={start} />
              ))}
            </BasketSection>
          ) : null}

          <BasketSection
            count={data.consolidate.length}
            emptyText="Chưa có điểm nào cần củng cố thêm."
            hint="Điểm bạn đang làm dở dang: luyện thêm một bộ sẽ chắc hơn."
            id="lp-basket-consolidate"
            title="Nên củng cố"
          >
            {data.consolidate.map((item) => (
              <OptionalRow busyId={busyId} item={item} key={item.knowledgePointId} now={now} onStart={start} />
            ))}
          </BasketSection>

          <BasketSection
            count={data.due.length}
            emptyText="Chưa có điểm nào đến hạn ôn."
            hint="Đã đến lúc nhắc lại để bạn không quên."
            id="lp-basket-due"
            title="Đến hạn ôn"
          >
            {data.due.map((item) => (
              <OptionalRow busyId={busyId} item={item} key={item.knowledgePointId} now={now} onStart={start} />
            ))}
          </BasketSection>
        </>
      ) : null}
    </div>
  )
}

function TallyLink({ count, label, href, tone }: { count: number; label: string; href: string; tone: 'danger' | 'warn' | 'accent' | 'primary' }) {
  return (
    <a className={`lp-tally lp-tally--${tone}${count === 0 ? ' is-empty' : ''}`} href={href}>
      <b>{count}</b>
      <span>{label}</span>
    </a>
  )
}

function BasketSection({ id, title, hint, count, emptyText, children }: {
  id: string
  title: string
  hint: string
  count: number
  emptyText: string
  children: ReactNode
}) {
  return (
    <section aria-labelledby={`${id}-title`} className="lp-bsec" id={id}>
      <header className="lp-bsec__head">
        <h2 id={`${id}-title`}>
          {title}
          <span className="lp-bsec__count">{count}</span>
        </h2>
        <p>{hint}</p>
      </header>
      {count === 0 ? <p className="lp-bsec__empty">{emptyText}</p> : <ul className="lp-bsec__rows">{children}</ul>}
    </section>
  )
}

function RequiredRow({ item }: { item: BasketRequiredItem }) {
  const skill = skillLabel(item.skill)
  return (
    <li className="lp-brow lp-brow--required">
      <span aria-hidden="true" className="lp-brow__badge"><ShieldAlert size={22} /></span>
      <div className="lp-brow__main">
        <p className="lp-brow__name">{item.name}</p>
        <p className="lp-brow__meta">
          <span className="lp-brow__code">{item.code}</span>
          {skill ? <span>{skill}</span> : null}
        </p>
      </div>
      <span className="lp-brow__due is-urgent">Cần làm trước</span>
      <Button asChild className="lp-btn lp-btn--accent lp-brow__action">
        <Link to={reviewPath(item.reviewId)}>
          Làm bài ôn
          <ArrowRight aria-hidden="true" size={15} />
        </Link>
      </Button>
    </li>
  )
}

function OptionalRow({ item, now, busyId, onStart }: {
  item: BasketOptionalItem
  now: Date
  busyId: string | null
  onStart: (knowledgePointId: string) => Promise<void>
}) {
  const tier = tierMeta(item.tier)
  const skill = skillLabel(item.skill)
  const due = dueLabel(item.dueAt, now)
  const busy = busyId === item.knowledgePointId
  const resumable = item.reviewId !== null

  return (
    <li className="lp-brow">
      <MasteryRing mastery={item.mastery} tier={item.tier} />
      <div className="lp-brow__main">
        <p className="lp-brow__name">{item.name}</p>
        <p className="lp-brow__meta">
          <span className="lp-brow__code">{item.code}</span>
          {skill ? <span>{skill}</span> : null}
          <span className={`lp-chip lp-chip--${tier.chip}`}>{tier.label}</span>
        </p>
        {item.errorTrap ? <p className="lp-brow__trap">Lỗi hay gặp: {item.errorTrap.name}</p> : null}
      </div>
      {due ? <span className={`lp-brow__due${due.urgent ? ' is-urgent' : ''}`}>{due.text}</span> : <span />}
      {resumable ? (
        <Button asChild className="lp-btn lp-brow__action">
          <Link to={reviewPath(item.reviewId as string)}>
            Tiếp tục ôn
            <ArrowRight aria-hidden="true" size={15} />
          </Link>
        </Button>
      ) : (
        <div className="lp-brow__action-wrap">
          <Button
            aria-busy={busy}
            className="lp-btn lp-brow__action"
            disabled={!item.hasUnrevealedSet || busyId !== null}
            onClick={() => void onStart(item.knowledgePointId)}
            type="button"
          >
            {busy ? <Loader2 aria-hidden="true" className="lp-spin" size={15} /> : null}
            {busy ? 'Đang mở…' : 'Bắt đầu ôn'}
          </Button>
          {item.hasUnrevealedSet ? null : <span className="lp-brow__note">Chưa có bộ đề mới</span>}
        </div>
      )}
    </li>
  )
}

function BasketSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải giỏ ôn tập" className="lp-basket__skeleton">
      <span className="lp-skeleton-box" />
      <span className="lp-skeleton-box" />
      <span className="lp-skeleton-box" />
    </div>
  )
}
