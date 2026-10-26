import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ReactFlow,
  Controls,
  Background,
  type Node,
  type Edge,
  type NodeMouseHandler,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Network, RotateCcw, ExternalLink, Filter } from 'lucide-react'
import { notebookApi, type VocabularyTopic, type MindmapResponse } from '../api/notebookApi'
import { layoutMindmap } from '../lib/layoutMindmap'

interface MindmapViewProps {
  initialTopicId?: string
  height?: string | number
  onSelectWord?: (wordId: string) => void
}

export function MindmapView({ initialTopicId, height = '560px', onSelectWord }: MindmapViewProps) {
  const navigate = useNavigate()
  const [topics, setTopics] = useState<VocabularyTopic[]>([])
  const [selectedTopicId, setSelectedTopicId] = useState<string>(initialTopicId || '')
  const [loading, setLoading] = useState(true)
  const [loadingMap, setLoadingMap] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  // Load topics
  useEffect(() => {
    let active = true
    notebookApi
      .getTopics()
      .then((data) => {
        if (!active) return
        setTopics(data)
        if (!selectedTopicId && data.length > 0) {
          setSelectedTopicId(data[0].id)
        }
      })
      .catch(() => {
        // topics error handled gracefully
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [selectedTopicId])

  // Helper to format nodes & edges
  const applyMindmapData = useCallback((data: MindmapResponse, topicId: string) => {
    const positioned = layoutMindmap(data.nodes || [], data.edges || [])

    const flowNodes: Node[] = positioned.nodes.map((n) => {
      const isRoot = !n.data?.parentId && n.id === topicId
      const isChild = n.type === 'collocation' || n.type === 'synonym' || n.type === 'antonym'

      let bg = '#ffffff'
      let border = '2px solid #2563eb'
      let color = '#1e293b'
      let fontSize = '0.9rem'
      let fontWeight = '700'
      let borderRadius = '0.75rem'
      let padding = '0.6rem 1rem'

      if (isRoot) {
        bg = '#1e3a8a'
        border = '2px solid #1e3a8a'
        color = '#ffffff'
        fontSize = '1.05rem'
        borderRadius = '999px'
        padding = '0.75rem 1.5rem'
      } else if (isChild) {
        bg = '#f8fafc'
        border = '1px dashed #94a3b8'
        color = '#475569'
        fontSize = '0.8rem'
        fontWeight = '500'
        borderRadius = '0.5rem'
        padding = '0.4rem 0.75rem'
      }

      return {
        id: n.id,
        position: n.position,
        data: {
          label: (
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                {n.label}
                {!isRoot && !isChild && <ExternalLink size={12} style={{ opacity: 0.6 }} />}
              </div>
            </div>
          ),
          raw: n,
        },
        style: {
          background: bg,
          border,
          color,
          fontSize,
          fontWeight,
          borderRadius,
          padding,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          cursor: isRoot ? 'default' : 'pointer',
          maxWidth: 220,
        },
      }
    })

    const flowEdges: Edge[] = positioned.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      type: 'smoothstep',
      animated: false,
      style: { stroke: '#94a3b8', strokeWidth: 1.5 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 14,
        height: 14,
        color: '#94a3b8',
      },
    }))

    setNodes(flowNodes)
    setEdges(flowEdges)
  }, [])

  // Manual refresh from button
  const handleRefresh = useCallback(() => {
    if (!selectedTopicId) return
    setLoadingMap(true)
    setError(null)
    notebookApi
      .getMindmap({ topicId: selectedTopicId })
      .then((data) => {
        applyMindmapData(data, selectedTopicId)
      })
      .catch(() => {
        setError('Không thể tải sơ đồ tư duy cho chủ đề này. Vui lòng thử lại.')
      })
      .finally(() => {
        setLoadingMap(false)
      })
  }, [selectedTopicId, applyMindmapData])

  useEffect(() => {
    if (!selectedTopicId) return
    let active = true

    notebookApi
      .getMindmap({ topicId: selectedTopicId })
      .then((data) => {
        if (!active) return
        applyMindmapData(data, selectedTopicId)
        setLoadingMap(false)
      })
      .catch(() => {
        if (active) {
          setError('Không thể tải sơ đồ tư duy cho chủ đề này. Vui lòng thử lại.')
          setLoadingMap(false)
        }
      })

    return () => {
      active = false
    }
  }, [selectedTopicId, applyMindmapData])

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      const raw = (node.data as { raw?: { id: string; type?: string; data?: { itemId?: string } } })?.raw
      if (!raw) return
      // If node is a lemma or has an itemId, navigate to detail
      const itemId = raw.data?.itemId || (raw.type === 'lemma' || raw.type === 'word' ? raw.id : null)
      if (itemId) {
        if (onSelectWord) {
          onSelectWord(itemId)
        } else {
          navigate(`/vocabulary/${itemId}`)
        }
      }
    },
    [navigate, onSelectWord]
  )

  const selectedTopic = useMemo(
    () => topics.find((t) => t.id === selectedTopicId),
    [topics, selectedTopicId]
  )

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '1rem',
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
      }}
    >
      {/* Mindmap Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.25rem',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Network size={20} style={{ color: '#2563eb' }} aria-hidden="true" />
          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
            Sơ đồ tư duy (Mindmap)
          </span>
          {selectedTopic && (
            <span
              style={{
                fontSize: '0.75rem',
                padding: '0.15rem 0.5rem',
                borderRadius: '999px',
                background: '#e0e7ff',
                color: '#3730a3',
                fontWeight: 600,
              }}
            >
              {selectedTopic.nameVi || selectedTopic.name}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Filter size={16} style={{ color: '#64748b' }} aria-hidden="true" />
            <select
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              disabled={loading || topics.length === 0}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#1e293b',
                background: '#ffffff',
                cursor: 'pointer',
              }}
              aria-label="Chọn chủ đề cho sơ đồ tư duy"
            >
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nameVi ? `${t.nameVi} (${t.name})` : t.name} ({t.wordCount} từ)
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={loadingMap}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#475569',
            }}
            title="Tải lại sơ đồ"
          >
            <RotateCcw size={14} className={loadingMap ? 'animate-spin' : ''} aria-hidden="true" />
            Làm mới
          </button>
        </div>
      </div>

      {/* Mindmap Canvas Area */}
      <div style={{ height, position: 'relative', background: '#fafbfc' }}>
        {loadingMap && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.75)',
              zIndex: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#2563eb', fontWeight: 600 }}>
              <RotateCcw size={20} className="animate-spin" aria-hidden="true" />
              Đang tải cấu trúc sơ đồ…
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem',
              background: '#ffffff',
              zIndex: 10,
              textAlign: 'center',
            }}
          >
            <p style={{ color: '#dc2626', fontWeight: 700, marginBottom: '0.75rem' }}>{error}</p>
            <button
              type="button"
              onClick={handleRefresh}
              style={{
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Thử lại
            </button>
          </div>
        )}

        {!loadingMap && !error && nodes.length === 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              fontSize: '0.9rem',
            }}
          >
            <Network size={36} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
            Chưa có dữ liệu sơ đồ tư duy cho chủ đề này.
          </div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={handleNodeClick}
          fitView
          attributionPosition="bottom-left"
        >
          <Background color="#cbd5e1" gap={24} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      {/* Helper text footer */}
      <div
        style={{
          padding: '0.5rem 1.25rem',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          fontSize: '0.75rem',
          color: '#64748b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>💡 Nhấp vào từ vựng bất kỳ trên sơ đồ để mở trang chi tiết và nghe phát âm.</span>
        <span>Dùng chuột hoặc phím cuộn để phóng to / thu nhỏ</span>
      </div>
    </div>
  )
}
