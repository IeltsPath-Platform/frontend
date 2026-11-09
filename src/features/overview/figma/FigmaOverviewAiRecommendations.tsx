import type { ReactNode } from 'react'
import iconCardsGroup from '../assets/ai-recs-group.svg'
import iconHeadphones from '../assets/ai-recs-at-icons-headphones.svg'
import iconPlay from '../assets/ai-recs-icon.svg'
import iconSparkle from '../assets/ai-recs-icon1.svg'
import iconWriting from '../assets/ai-recs-frame1000005427.svg'
import orbitRing1 from '../assets/ai-recs-vector.svg'
import orbitRing2 from '../assets/ai-recs-vector1.svg'
import orbitDot1 from '../assets/ai-recs-vector2.svg'
import orbitDot2 from '../assets/ai-recs-vector3.svg'

interface RecommendationCardProps {
  icon: ReactNode
  title: string
  tag: string
  description: string
}

/** The icon tile behind the headphones and flashcard icons; the writing icon already carries its own tile. */
function IconTile({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[48px] w-[50px] items-center justify-center rounded-[10px] border border-solid border-[rgba(255,255,255,0.5)] bg-[rgba(255,255,255,0.2)] px-[7px] pb-[5px] pt-[6px]">
      {children}
    </div>
  )
}

function RecommendationCard({ icon, title, tag, description }: RecommendationCardProps) {
  return (
    <div className="flex flex-col items-start rounded-[18px] border border-solid border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.07)] px-[22px] py-[20px]">
      {icon}
      <div className="flex items-center gap-[8px] pt-[12px]">
        <p className="text-[16px] font-semibold leading-[24px] text-white">{title}</p>
        <span className="rounded-full bg-[var(--info,#2563eb)] px-[8px] py-[2px] text-[12px] font-medium leading-[16px] tracking-[0.2px] text-white">{tag}</span>
      </div>
      <p className="pb-[16px] pt-[8px] text-[14px] font-normal leading-[20px] text-[color:var(--boder\,-diliver,#e4e7eb)]">{description}</p>
      <button
        type="button"
        className="flex h-[32px] items-center gap-[6px] rounded-full border border-solid border-white px-[16px] py-[8px] text-[14px] font-semibold leading-[20px] text-white"
      >
        <img alt="" className="size-[14px]" src={iconPlay} />
        Bắt đầu ngay
      </button>
    </div>
  )
}

/** Figma "TIS - OVERVIEW" (3034:19095), AI review suggestions (3034:19443). Texts are placeholders until wired to data. */
export function FigmaOverviewAiRecommendations() {
  return (
    <section
      className="relative flex min-h-[332px] flex-col items-start overflow-clip rounded-[24px] p-[24px]"
      style={{ backgroundImage: 'linear-gradient(160.89deg, rgb(7, 40, 153) 3.67%, rgb(18, 69, 255) 96.33%)' }}
    >
      <div className="flex w-full flex-col items-start">
        <div className="flex items-center gap-[10px]">
          <h2 className="text-[24px] font-semibold leading-[32px] text-white">Gợi Ý Ôn Luyện Từ AI</h2>
          <span className="rounded-full border border-solid border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.15)] px-[8px] py-[4px] text-[12px] font-medium leading-[16px] tracking-[0.2px] text-white">
            Cá nhân hóa theo lộ trình
          </span>
        </div>
        <div className="grid w-full grid-cols-1 gap-[20px] pt-[28px] md:grid-cols-3">
          <RecommendationCard
            icon={<IconTile><img alt="" className="size-[35px]" src={iconHeadphones} /></IconTile>}
            title="Luyện nghe"
            tag="Ưu tiên cao"
            description="Đề luyện nghe nhận biết nối âm, chủ đề Lifestyle · ưu tiên cao"
          />
          <RecommendationCard
            icon={
              <IconTile>
                <div className="relative size-[34px] overflow-clip">
                  <div className="absolute inset-[8.33%_8.34%_8.34%_8.34%]">
                    <div className="absolute inset-[-3.53%]">
                      <img alt="" className="block size-full max-w-none" src={iconCardsGroup} />
                    </div>
                  </div>
                </div>
              </IconTile>
            }
            title="Ôn Flashcard Hôm Nay"
            tag="Cần ôn hôm nay"
            description="24 từ theo lịch Space Repetition cá nhân hóa · cần ôn hôm nay"
          />
          <RecommendationCard
            icon={<img alt="" className="h-[48px] w-[50px]" src={iconWriting} />}
            title="Writing Task 2 Practice"
            tag="Điểm yếu"
            description="Essay chủ đề Education · điểm yếu cần cải thiện gấp, hãy tích cực ôn"
          />
        </div>
      </div>

      <div className="pointer-events-none absolute right-0 top-[143px] h-[206px] w-[298px] overflow-clip opacity-10" aria-hidden="true">
        <div className="absolute inset-[18%_5%]">
          <div className="absolute inset-[-0.38%_-0.19%]"><img alt="" className="block size-full max-w-none" src={orbitRing1} /></div>
        </div>
        <div className="absolute inset-[30%_22%]">
          <div className="absolute inset-[-0.49%_-0.24%]"><img alt="" className="block size-full max-w-none" src={orbitRing2} /></div>
        </div>
        <div className="absolute inset-[46.78%_5.46%_48.78%_91.46%]"><img alt="" className="absolute inset-0 block size-full max-w-none" src={orbitDot1} /></div>
        <div className="absolute inset-[47.09%_48.32%]"><img alt="" className="absolute inset-0 block size-full max-w-none" src={orbitDot2} /></div>
      </div>
      <img alt="" className="pointer-events-none absolute right-[172px] top-[26px] size-[12px]" src={iconSparkle} aria-hidden="true" />
    </section>
  )
}
