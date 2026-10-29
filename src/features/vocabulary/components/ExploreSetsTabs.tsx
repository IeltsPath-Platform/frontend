import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Layers, Network, Target } from 'lucide-react'
import { notebookApi, type VocabularySetSummary, type VocabularyTopic } from '../api/notebookApi'
import { MindmapView } from './MindmapView'

type TabKey = 'BAND' | 'TOPIC' | 'MINDMAP'

const TABS: { key: TabKey; label: string; icon: typeof Target }[] = [
  { key: 'BAND', label: 'Theo band điểm', icon: Target },
  { key: 'TOPIC', label: 'Theo chủ đề', icon: Layers },
  { key: 'MINDMAP', label: 'Sơ đồ tư duy', icon: Network },
]

/** Soft card tints cycled by position so a grid of sets does not look uniform. */
const TINTS = ['blue', 'violet', 'amber', 'teal', 'rose', 'sky'] as const

export function ExploreSetsTabs() {
  const [activeTab, setActiveTab] = useState<TabKey>('BAND')
  const [bandSets, setBandSets] = useState<VocabularySetSummary[] | null>(null)
  const [topicSets, setTopicSets] = useState<VocabularySetSummary[] | null>(null)
  const [topics, setTopics] = useState<VocabularyTopic[]>([])

  useEffect(() => {
    let active = true
    Promise.allSettled([
      notebookApi.getSets({ kind: 'BAND', size: 12 }),
      notebookApi.getSets({ kind: 'TOPIC', size: 12 }),
      notebookApi.getTopics(),
    ]).then(([band, topic, topicList]) => {
      if (!active) return
      setBandSets(band.status === 'fulfilled' ? band.value.items ?? [] : [])
      setTopicSets(topic.status === 'fulfilled' ? topic.value.items ?? [] : [])
      if (topicList.status === 'fulfilled') setTopics(topicList.value ?? [])
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <section className="dict-panel dict-explore" aria-labelledby="dict-explore-title">
      <div className="dict-panel__head">
        <div>
          <h2 id="dict-explore-title">Khám phá bộ từ vựng</h2>
          <p>Học theo lộ trình band mục tiêu, theo chủ đề IELTS hoặc nhìn cả chủ đề trên sơ đồ tư duy.</p>
        </div>
        <div role="tablist" aria-label="Cách khám phá" className="dict-tabs">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} type="button" role="tab" aria-selected={activeTab === key} onClick={() => setActiveTab(key)}>
              <Icon size={15} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="dict-tab-panel" key={activeTab}>
        {activeTab === 'BAND' && (
          <SetGrid sets={bandSets} empty="Chưa có bộ từ vựng theo band." loadingText="Đang tải bộ từ theo band…"
            badge={(set) => (set.bandRange ? `Band ${set.bandRange}` : set.cefrLevel ? `CEFR ${set.cefrLevel}` : 'Band')} />
        )}

        {activeTab === 'TOPIC' && (
          topicSets && topicSets.length === 0 && topics.length > 0 ? (
            <ul className="dict-set-grid">
              {topics.map((topic, index) => (
                <li key={topic.id} style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}>
                  <Link to={`/vocabulary?topicId=${topic.id}`} className={`dict-set-card is-${TINTS[index % TINTS.length]}`}>
                    <span className="dict-set-card__badge">{topic.wordCount} từ</span>
                    <h3>{topic.nameVi || topic.name}</h3>
                    <p>{topic.name}</p>
                    <span className="dict-set-card__cta">Xem từ trong chủ đề <ArrowRight size={14} aria-hidden="true" /></span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <SetGrid sets={topicSets} empty="Chưa có chủ đề từ vựng." loadingText="Đang tải chủ đề…" badge={() => 'Chủ đề'} />
          )
        )}

        {activeTab === 'MINDMAP' && <MindmapView height={540} />}
      </div>
    </section>
  )
}

function SetGrid({ sets, empty, loadingText, badge }: {
  sets: VocabularySetSummary[] | null
  empty: string
  loadingText: string
  badge: (set: VocabularySetSummary) => string
}) {
  if (sets === null) return <p className="dict-muted">{loadingText}</p>
  if (sets.length === 0) return <p className="dict-muted">{empty}</p>
  return (
    <ul className="dict-set-grid">
      {sets.map((set, index) => (
        <li key={set.id} style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}>
          <Link to={`/vocabulary/sets/${set.id}`} className={`dict-set-card is-${TINTS[index % TINTS.length]}`}>
            <span className="dict-set-card__badge">{badge(set)}</span>
            <h3>{set.title}</h3>
            {set.description && <p>{set.description}</p>}
            <span className="dict-set-card__cta">{set.wordCount} từ · Khám phá <ArrowRight size={14} aria-hidden="true" /></span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
