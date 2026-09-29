import { useState } from "react"
import { BookOpen, Headphones, Info, Mic, PenLine, Play, Volume2 } from "lucide-react"
import { SessionShell } from "@/features/class/components/SessionShell"
import {
  ConfirmDialog,
  DiglotWordPopup,
  FlashcardFlip,
  ToastStack,
  useLmsToasts,
} from "@/features/class/components/overlays"
import {
  GRAMMAR_OPTIONS,
  QUIZ_QUESTION,
  SKILLS_PASSAGE,
  VOCAB_ENTRY,
  type HomeworkTab,
} from "@/lib/mock/class"

const hubs: { id: HomeworkTab; label: string }[] = [
  { id: "grammar", label: "Ngữ pháp" },
  { id: "vocab", label: "Từ vựng" },
  { id: "quiz", label: "Quick Test" },
  { id: "skills", label: "IELTS Skills" },
]

const skillTabs = [
  { id: "reading", label: "Reading", icon: BookOpen },
  { id: "writing", label: "Writing", icon: PenLine },
  { id: "listening", label: "Listening", icon: Headphones },
  { id: "speaking", label: "Speaking", icon: Mic },
] as const

const FLASH_CARDS = [
  { word: "sustainable", meaning: "Có thể duy trì lâu dài mà không gây hại môi trường", example: "Sustainable tourism protects local habitats." },
  { word: "habitat", meaning: "Môi trường sống tự nhiên của loài", example: "Wetlands are a vital habitat for migratory birds." },
  { word: "biodiversity", meaning: "Sự đa dạng sinh học", example: "Biodiversity declines when forests are cleared." },
]

export function HomeworkPage() {
  const [hub, setHub] = useState<HomeworkTab>("grammar")
  const [grammarTab, setGrammarTab] = useState<"theory" | "practice">("practice")
  const [vocabTab, setVocabTab] = useState<"list" | "flash" | "drill">("list")
  const [selected, setSelected] = useState<string | null>(null)
  const [quizPick, setQuizPick] = useState<string | null>(null)
  const [skill, setSkill] = useState<(typeof skillTabs)[number]["id"]>("reading")
  const [flashIndex, setFlashIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [diglotOpen, setDiglotOpen] = useState(false)
  const [submitOpen, setSubmitOpen] = useState(false)
  const { toasts, push, dismiss } = useLmsToasts()

  const flash = FLASH_CARDS[flashIndex]

  const breadcrumb =
    hub === "grammar"
      ? "• Homework Hub / Ngữ pháp"
      : hub === "vocab"
        ? "• Homework Hub / Từ vựng"
        : hub === "quiz"
          ? "• Homework Hub / Quick Test tổng hợp"
          : "• Homework Hub / IELTS Skills"

  return (
    <SessionShell breadcrumb={breadcrumb}>
      <div className="cls-pill-tabs" role="tablist" aria-label="Homework Hub">
        {hubs.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={hub === item.id} onClick={() => setHub(item.id)}>
            {item.label}
          </button>
        ))}
      </div>

      {hub === "grammar" ? (
        <section className="cls-hw-panel" aria-label="Ngữ pháp">
          <div className="cls-subtabs" role="tablist">
            <button type="button" role="tab" aria-selected={grammarTab === "theory"} onClick={() => setGrammarTab("theory")}>
              Lý thuyết
            </button>
            <button type="button" role="tab" aria-selected={grammarTab === "practice"} onClick={() => setGrammarTab("practice")}>
              Bài tập
            </button>
          </div>
          <div className="cls-tag-row">
            <span>Ngữ pháp</span>
            <span>Trắc nghiệm</span>
          </div>
          {grammarTab === "theory" ? (
            <article className="cls-theory">
              <h2>Present Perfect — Form</h2>
              <p>
                Dạng <strong>have/has + V3</strong> để nói về trải nghiệm hoặc kết quả còn liên quan đến hiện tại. Signal
                words: <em>already, yet, ever, never, since, for</em>.
              </p>
            </article>
          ) : (
            <>
              <p className="cls-instruction">
                <strong>Chọn đáp án đúng để hoàn thành câu.</strong>
                <span>
                  <Info aria-hidden="true" /> Nghe audio rồi chọn một phương án.
                </span>
              </p>
              <div className="cls-audio" role="group" aria-label="Audio bài tập">
                <button type="button" aria-label="Phát audio" onClick={() => push("Đang phát audio bài tập")}>
                  <Play aria-hidden="true" />
                </button>
                <span>00:00</span>
                <span className="cls-audio__bar" aria-hidden="true" />
                <span>00:42</span>
              </div>
              <p className="cls-stem">She ___ in Da Nang since 2021.</p>
              <div className="cls-answer-list">
                {GRAMMAR_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={selected === option.id ? "is-selected" : undefined}
                    onClick={() => setSelected(option.id)}
                  >
                    <span>{option.id}</span>
                    {option.text}
                  </button>
                ))}
              </div>
              <div className="cls-hw-actions">
                <button type="button" className="lms-btn lms-btn--ghost" onClick={() => setSelected(null)}>
                  Làm lại
                </button>
                <button
                  type="button"
                  className="lms-btn lms-btn--brand"
                  disabled={!selected}
                  onClick={() => setSubmitOpen(true)}
                >
                  Nộp câu trả lời
                </button>
              </div>
            </>
          )}
        </section>
      ) : null}

      {hub === "vocab" ? (
        <section className="cls-hw-panel" aria-label="Từ vựng">
          <div className="cls-subtabs" role="tablist">
            <button type="button" role="tab" aria-selected={vocabTab === "list"} onClick={() => setVocabTab("list")}>
              Danh sách
            </button>
            <button type="button" role="tab" aria-selected={vocabTab === "flash"} onClick={() => setVocabTab("flash")}>
              Flashcard
            </button>
            <button type="button" role="tab" aria-selected={vocabTab === "drill"} onClick={() => setVocabTab("drill")}>
              Luyện nhanh
            </button>
          </div>

          {vocabTab === "list" ? (
            <article className="cls-vocab-card">
              <div className="cls-vocab-card__head">
                <h2>
                  <button type="button" className="cls-word-link" onClick={() => setDiglotOpen(true)}>
                    {VOCAB_ENTRY.headword}
                  </button>
                </h2>
                <button type="button" aria-label="Phát âm" onClick={() => push("Đang phát âm", VOCAB_ENTRY.headword)}>
                  <Volume2 aria-hidden="true" />
                </button>
              </div>
              <p className="cls-vocab-card__phonetics">
                UK {VOCAB_ENTRY.phonetics.uk} · US {VOCAB_ENTRY.phonetics.us}
              </p>
              <dl className="cls-vocab-meta">
                <div>
                  <dt>Loại từ</dt>
                  <dd>{VOCAB_ENTRY.type}</dd>
                </div>
                <div>
                  <dt>CEFR</dt>
                  <dd>{VOCAB_ENTRY.cefr}</dd>
                </div>
                <div>
                  <dt>Chủ đề</dt>
                  <dd>{VOCAB_ENTRY.topic}</dd>
                </div>
                <div>
                  <dt>Nghĩa</dt>
                  <dd>{VOCAB_ENTRY.meaning}</dd>
                </div>
              </dl>
            </article>
          ) : null}

          {vocabTab === "flash" ? (
            <div className="cls-flash-wrap">
              <p className="cls-flash-wrap__meta">
                Thẻ {flashIndex + 1}/{FLASH_CARDS.length} · Nhấn thẻ để lật
              </p>
              <FlashcardFlip
                flipped={flipped}
                onFlip={() => setFlipped((v) => !v)}
                front={
                  <>
                    <small>NHẤN ĐỂ LẬT</small>
                    <strong>{flash.word}</strong>
                  </>
                }
                back={
                  <>
                    <small>Định nghĩa</small>
                    <strong>{flash.meaning}</strong>
                    <em>{flash.example}</em>
                  </>
                }
              />
              <div className="cls-hw-actions">
                <button
                  type="button"
                  className="lms-btn lms-btn--ghost"
                  disabled={flashIndex === 0}
                  onClick={() => {
                    setFlashIndex((v) => Math.max(0, v - 1))
                    setFlipped(false)
                  }}
                >
                  Thẻ trước
                </button>
                <button
                  type="button"
                  className="lms-btn lms-btn--brand"
                  onClick={() => {
                    if (flashIndex >= FLASH_CARDS.length - 1) {
                      push("Hoàn thành bộ flashcard")
                      return
                    }
                    setFlashIndex((v) => v + 1)
                    setFlipped(false)
                  }}
                >
                  {flashIndex >= FLASH_CARDS.length - 1 ? "Xong" : "Thẻ sau"}
                </button>
              </div>
            </div>
          ) : null}

          {vocabTab === "drill" ? (
            <div className="cls-answer-grid">
              {FLASH_CARDS.map((card) => (
                <button key={card.word} type="button" onClick={() => setDiglotOpen(true)}>
                  <span>?</span>
                  {card.word}
                </button>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {hub === "quiz" ? (
        <section className="cls-hw-panel" aria-label="Quick Test">
          <span className="cls-quiz-badge">LIVE QUIZ</span>
          <p className="cls-quiz-meta">
            <span>{QUIZ_QUESTION.meta}</span>
            <span>Thời gian còn lại: 04:32</span>
          </p>
          <p className="cls-stem">{QUIZ_QUESTION.stem}</p>
          <div className="cls-answer-grid">
            {QUIZ_QUESTION.options.map((option) => (
              <button
                key={option.id}
                type="button"
                className={quizPick === option.id ? "is-selected" : undefined}
                onClick={() => setQuizPick(option.id)}
              >
                <span>{option.id}</span>
                {option.text}
              </button>
            ))}
          </div>
          <div className="cls-hw-actions">
            <button type="button" className="lms-btn lms-btn--brand" disabled={!quizPick} onClick={() => setSubmitOpen(true)}>
              Nộp bài Quick Test
            </button>
          </div>
        </section>
      ) : null}

      {hub === "skills" ? (
        <section className="cls-hw-panel" aria-label="IELTS Skills">
          <div className="cls-subtabs" role="tablist">
            {skillTabs.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={skill === item.id}
                  onClick={() => setSkill(item.id)}
                >
                  <Icon aria-hidden="true" />
                  {item.label}
                </button>
              )
            })}
          </div>

          {skill === "reading" ? (
            <>
              <div className="cls-module-banner">
                <p>MODULE · READING</p>
                <h2>{SKILLS_PASSAGE.title}</h2>
                <p>{SKILLS_PASSAGE.instruction}</p>
              </div>
              <article className="cls-passage">
                <header>
                  <h3>Passage</h3>
                  <p>Nhấp từ gạch chân để mở Diglot</p>
                </header>
                <p>
                  Urban{" "}
                  <button type="button" className="cls-word-hot" onClick={() => setDiglotOpen(true)}>
                    wetlands
                  </button>{" "}
                  are often overlooked, yet they filter pollutants, store floodwater, and host migrating birds. Cities that
                  restore these spaces report cooler microclimates and higher resident wellbeing. Conservation groups argue
                  that small green corridors between wetlands matter as much as the wetlands themselves — a truly{" "}
                  <button type="button" className="cls-word-hot" onClick={() => setDiglotOpen(true)}>
                    sustainable
                  </button>{" "}
                  approach.
                </p>
              </article>
            </>
          ) : (
            <article className="cls-theory">
              <h2>{skillTabs.find((s) => s.id === skill)?.label} practice</h2>
              <p>Bài luyện {skill} sẽ mở trong phiên bản đầy đủ. Hiện tại dùng Reading passage làm mẫu tương tác Diglot.</p>
            </article>
          )}
        </section>
      ) : null}

      <DiglotWordPopup open={diglotOpen} onClose={() => setDiglotOpen(false)} />

      <ConfirmDialog
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        title="Nộp bài tập?"
        description="Sau khi nộp bạn không thể chỉnh sửa trong 24 giờ. Mentor sẽ nhận bài và phản hồi."
        confirmLabel="Nộp bài"
        cancelLabel="Xem lại"
        onConfirm={() => push("Đã nộp bài", "Mentor sẽ phản hồi sớm.")}
      />

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </SessionShell>
  )
}
