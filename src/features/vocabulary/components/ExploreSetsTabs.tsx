import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, ArrowRight, Sparkles } from 'lucide-react'
import {
  notebookApi,
  type VocabularySetSummary,
  type VocabularyTopic,
} from '../api/notebookApi'
import { MindmapView } from './MindmapView'

type TabKey = 'BAND' | 'TOPIC' | 'NOTEBOOK' | 'MINDMAP'

export function ExploreSetsTabs() {
  const [activeTab, setActiveTab] = useState<TabKey>('BAND')
  const [bandSets, setBandSets] = useState<VocabularySetSummary[]>([])
  const [topicSets, setTopicSets] = useState<VocabularySetSummary[]>([])
  const [topics, setTopics] = useState<VocabularyTopic[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true

    Promise.allSettled([
      notebookApi.getSets({ kind: 'BAND', size: 12 }),
      notebookApi.getSets({ kind: 'TOPIC', size: 12 }),
      notebookApi.getTopics(),
    ]).then(([resBand, resTopic, resTopicsList]) => {
      if (!active) return
      if (resBand.status === 'fulfilled') setBandSets(resBand.value.items || [])
      if (resTopic.status === 'fulfilled') setTopicSets(resTopic.value.items || [])
      if (resTopicsList.status === 'fulfilled') setTopics(resTopicsList.value || [])
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [])

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '1.25rem',
        padding: '1.5rem',
        boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
            Khám phá bộ từ vựng
          </h3>
          <p style={{ margin: '0.15rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
            Học theo lộ trình band mục tiêu hoặc theo chủ đề IELTS thông dụng
          </p>
        </div>

        {/* 4 Tabs switcher */}
        <div
          role="tablist"
          style={{
            display: 'inline-flex',
            background: '#f1f5f9',
            padding: '0.25rem',
            borderRadius: '0.75rem',
            gap: '0.25rem',
          }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'BAND'}
            onClick={() => setActiveTab('BAND')}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '0.55rem',
              border: 'none',
              fontSize: '0.825rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'BAND' ? '#ffffff' : 'transparent',
              color: activeTab === 'BAND' ? '#123ab5' : '#64748b',
              boxShadow: activeTab === 'BAND' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Theo band điểm
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'TOPIC'}
            onClick={() => setActiveTab('TOPIC')}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '0.55rem',
              border: 'none',
              fontSize: '0.825rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'TOPIC' ? '#ffffff' : 'transparent',
              color: activeTab === 'TOPIC' ? '#123ab5' : '#64748b',
              boxShadow: activeTab === 'TOPIC' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Theo chủ đề
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'NOTEBOOK'}
            onClick={() => setActiveTab('NOTEBOOK')}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '0.55rem',
              border: 'none',
              fontSize: '0.825rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'NOTEBOOK' ? '#ffffff' : 'transparent',
              color: activeTab === 'NOTEBOOK' ? '#123ab5' : '#64748b',
              boxShadow: activeTab === 'NOTEBOOK' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Sổ tay cá nhân
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'MINDMAP'}
            onClick={() => setActiveTab('MINDMAP')}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '0.55rem',
              border: 'none',
              fontSize: '0.825rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'MINDMAP' ? '#ffffff' : 'transparent',
              color: activeTab === 'MINDMAP' ? '#123ab5' : '#64748b',
              boxShadow: activeTab === 'MINDMAP' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Mindmap
          </button>
        </div>
      </div>

      {/* Tab 1: Band Sets */}
      {activeTab === 'BAND' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '1rem',
          }}
        >
          {bandSets.length > 0 ? (
            bandSets.map((set) => (
              <div
                key={set.id}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '1rem',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '0.4rem',
                        background: '#dbeafe',
                        color: '#1e40af',
                      }}
                    >
                      {set.bandRange ? `Band ${set.bandRange}` : set.cefrLevel ? `CEFR ${set.cefrLevel}` : 'BAND'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                      {set.wordCount} từ
                    </span>
                  </div>

                  <h4 style={{ margin: '0 0 0.4rem', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                    {set.title}
                  </h4>
                  {set.description && (
                    <p style={{ margin: 0, fontSize: '0.825rem', color: '#64748b', lineHeight: 1.4 }}>
                      {set.description}
                    </p>
                  )}
                </div>

                <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #edf2f7' }}>
                  <Link
                    to={`/vocabulary/sets/${set.id}`}
                    style={{
                      fontSize: '0.825rem',
                      fontWeight: 700,
                      color: '#2563eb',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    Xem chi tiết bộ từ
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div style={{ gridColumn: '1 / -1', padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
              {loading ? 'Đang tải danh sách bộ từ theo band…' : 'Chưa có bộ từ vựng theo band.'}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Topic Sets */}
      {activeTab === 'TOPIC' && (
        <div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '1rem',
            }}
          >
            {topicSets.length > 0 ? (
              topicSets.map((set) => (
                <div
                  key={set.id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '1rem',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '0.4rem',
                          background: '#fef3c7',
                          color: '#92400e',
                        }}
                      >
                        Chủ đề
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                        {set.wordCount} từ
                      </span>
                    </div>

                    <h4 style={{ margin: '0 0 0.4rem', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                      {set.title}
                    </h4>
                    {set.description && (
                      <p style={{ margin: 0, fontSize: '0.825rem', color: '#64748b', lineHeight: 1.4 }}>
                        {set.description}
                      </p>
                    )}
                  </div>

                  <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #edf2f7' }}>
                    <Link
                      to={`/vocabulary/sets/${set.id}`}
                      style={{
                        fontSize: '0.825rem',
                        fontWeight: 700,
                        color: '#2563eb',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      Khám phá bộ từ này
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              ))
            ) : topics.length > 0 ? (
              topics.map((t) => (
                <div
                  key={t.id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '1rem',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '0.4rem',
                        background: '#e0e7ff',
                        color: '#3730a3',
                        display: 'inline-block',
                        marginBottom: '0.5rem',
                      }}
                    >
                      {t.wordCount} từ vựng
                    </span>
                    <h4 style={{ margin: '0 0 0.35rem', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                      {t.nameVi || t.name}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                      Chủ đề: {t.name}
                    </p>
                  </div>

                  <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #edf2f7' }}>
                    <Link
                      to={`/vocabulary?topicId=${t.id}`}
                      style={{
                        fontSize: '0.825rem',
                        fontWeight: 700,
                        color: '#2563eb',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      Xem từ trong chủ đề
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: '1 / -1', padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                {loading ? 'Đang tải chủ đề…' : 'Chưa có chủ đề từ vựng.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Personal Notebook */}
      {activeTab === 'NOTEBOOK' && (
        <div
          style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)',
            border: '1px solid #bfdbfe',
            borderRadius: '1rem',
            padding: '2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <Bookmark size={40} style={{ color: '#2563eb' }} aria-hidden="true" />
          <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
            Sổ tay từ vựng thông minh của bạn
          </h4>
          <p style={{ margin: 0, maxWidth: '520px', fontSize: '0.9rem', color: '#475569', lineHeight: 1.5 }}>
            Tất cả từ vựng bạn đã lưu được quản lý theo phương pháp Lặp lại ngắt quãng (Spaced Repetition System) với 4 mức độ hiểu, giúp bạn ghi nhớ sâu và lâu dài cho kỳ thi IELTS.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link
              to="/vocabulary/notebook"
              style={{
                background: '#123ab5',
                color: '#ffffff',
                padding: '0.7rem 1.5rem',
                borderRadius: '0.65rem',
                fontWeight: 700,
                fontSize: '0.9rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 2px 8px rgba(18, 58, 181, 0.25)',
              }}
            >
              Mở Sổ tay từ vựng
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link
              to="/vocabulary/notebook/review"
              style={{
                background: '#ffffff',
                color: '#123ab5',
                border: '1px solid #bfdbfe',
                padding: '0.7rem 1.5rem',
                borderRadius: '0.65rem',
                fontWeight: 700,
                fontSize: '0.9rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <Sparkles size={16} aria-hidden="true" />
              Bắt đầu phiên ôn tập
            </Link>
          </div>
        </div>
      )}

      {/* Tab 4: Mindmap */}
      {activeTab === 'MINDMAP' && (
        <div>
          <MindmapView height="480px" />
        </div>
      )}
    </div>
  )
}
