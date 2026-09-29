import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { BookOpen, ChevronDown, Headphones, Mic, PenLine, Play } from "lucide-react"
import mascot from "@/assets/triceratops-class-mascot.png"
import {
  ConfirmDialog,
  PlacementTestDialog,
  ProUpgradeDialog,
  ToastStack,
  useLmsToasts,
} from "@/features/class/components/overlays"
import { PRACTICE_CARDS } from "@/lib/mock/class"

const skills = [
  { id: "READING", label: "Reading", icon: BookOpen },
  { id: "LISTENING", label: "Listening", icon: Headphones },
  { id: "WRITING", label: "Writing", icon: PenLine },
  { id: "SPEAKING", label: "Speaking", icon: Mic },
] as const

export function LuyenDePage() {
  const navigate = useNavigate()
  const [skill, setSkill] = useState<(typeof skills)[number]["id"]>("READING")
  const [passage, setPassage] = useState("p1")
  const [doneFilter, setDoneFilter] = useState<"todo" | "done">("todo")
  const [proOnly, setProOnly] = useState(true)
  const [placementOpen, setPlacementOpen] = useState(false)
  const [proOpen, setProOpen] = useState(false)
  const [startCard, setStartCard] = useState<(typeof PRACTICE_CARDS)[number] | null>(null)
  const { toasts, push, dismiss } = useLmsToasts()

  const cards = useMemo(
    () =>
      PRACTICE_CARDS.filter((card) => (doneFilter === "todo" ? !card.done : card.done)).filter((card) =>
        proOnly ? true : card.free,
      ),
    [doneFilter, proOnly],
  )

  return (
    <main className="cls-page cls-luyen" id="main-content" tabIndex={-1}>
      <div className="cls-luyen__layout">
        <aside className="cls-luyen-side" aria-label="Bộ lọc luyện đề">
          <div className="cls-luyen-side__brand">
            <span aria-hidden="true">IP</span>
            <div>
              <strong>LUYỆN ĐỀ</strong>
              <small>The IELTS Space</small>
            </div>
          </div>

          <p className="cls-luyen-side__label">Kỹ năng</p>
          <div className="cls-luyen-acc">
            {skills.map((item) => {
              const Icon = item.icon
              const open = skill === item.id
              return (
                <div key={item.id} className={open ? "is-open" : undefined}>
                  <button type="button" aria-expanded={open} onClick={() => setSkill(item.id)}>
                    <Icon aria-hidden="true" />
                    {item.label}
                    <ChevronDown aria-hidden="true" />
                  </button>
                  {open && item.id === "READING" ? (
                    <div className="cls-luyen-tree">
                      <p>Bài lẻ</p>
                      {["p1", "p2", "p3"].map((id, index) => (
                        <label key={id}>
                          <input
                            type="radio"
                            name="passage"
                            checked={passage === id}
                            onChange={() => setPassage(id)}
                          />
                          Passage {index + 1}
                        </label>
                      ))}
                      <label>
                        <input
                          type="radio"
                          name="passage"
                          checked={passage === "full"}
                          onChange={() => setPassage("full")}
                        />
                        Full đề
                      </label>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>

          <p className="cls-luyen-side__label">Nguồn tài liệu</p>
          <label className="cls-luyen-check">
            <input
              type="checkbox"
              checked={proOnly}
              onChange={(event) => {
                if (!event.target.checked) {
                  setProOnly(false)
                  return
                }
                setProOpen(true)
              }}
            />
            The IELTS Space
            <button type="button" className="cls-pro-badge" onClick={() => setProOpen(true)}>
              PRO
            </button>
          </label>
        </aside>

        <div className="cls-luyen__main">
          <section className="cls-luyen-hero" aria-labelledby="luyen-hero-title">
            <div className="cls-luyen-hero__mascot" aria-hidden="true">
              <img src={mascot} alt="" width={210} height={210} decoding="async" />
            </div>
            <div>
              <h1 id="luyen-hero-title">Chưa biết mình đang ở đâu?</h1>
              <p>Test đầu vào và khám phá ngay lộ trình phù hợp band hiện tại.</p>
              <button type="button" className="cls-luyen-hero__cta" onClick={() => setPlacementOpen(true)}>
                <Play aria-hidden="true" />
                TEST NGAY
              </button>
            </div>
          </section>

          <div className="cls-luyen-toggle" role="tablist" aria-label="Trạng thái bài">
            <button type="button" role="tab" aria-selected={doneFilter === "todo"} onClick={() => setDoneFilter("todo")}>
              Bài chưa làm
            </button>
            <button type="button" role="tab" aria-selected={doneFilter === "done"} onClick={() => setDoneFilter("done")}>
              Bài đã làm
            </button>
          </div>

          <section className="cls-luyen-grid" aria-label="Danh sách đề">
            {cards.map((card) => (
              <article key={card.id} className="cls-pass-card">
                <div className="cls-pass-card__media">
                  <img src={card.image} alt="" loading="lazy" decoding="async" />
                  {card.free ? <span className="cls-pass-card__sash">MIỄN PHÍ</span> : null}
                  {!card.free ? (
                    <button type="button" className="cls-pass-card__lock" onClick={() => setProOpen(true)}>
                      PRO
                    </button>
                  ) : null}
                </div>
                <div className="cls-pass-card__body">
                  <span>{card.tag}</span>
                  <h2>{card.title}</h2>
                  <ul>
                    {card.types.map((type) => (
                      <li key={type}>{type}</li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => {
                      if (!card.free) {
                        setProOpen(true)
                        return
                      }
                      setStartCard(card)
                    }}
                  >
                    Vào làm
                  </button>
                </div>
              </article>
            ))}
          </section>
        </div>
      </div>

      <PlacementTestDialog
        open={placementOpen}
        onClose={() => setPlacementOpen(false)}
        onStart={() => {
          push("Đang mở test đầu vào")
          navigate("/practice?skill=FULL_TEST")
        }}
      />

      <ProUpgradeDialog open={proOpen} onClose={() => setProOpen(false)} />

      <ConfirmDialog
        open={Boolean(startCard)}
        onClose={() => setStartCard(null)}
        title="Bắt đầu làm đề?"
        description={
          startCard
            ? `${startCard.title} · ${startCard.types.join(" · ")}. Thời gian gợi ý 20 phút cho một passage.`
            : ""
        }
        confirmLabel="Bắt đầu"
        onConfirm={() => {
          if (startCard) {
            push("Đang mở đề", startCard.title)
            navigate(`/exams/${startCard.id}/start`)
          }
        }}
      />

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </main>
  )
}
