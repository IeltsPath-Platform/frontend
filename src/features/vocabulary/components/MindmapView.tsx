import { memo, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { ExternalLink, Eye, EyeOff, Maximize2, Network, RotateCcw, Search, Volume2, X } from 'lucide-react'
import { OwlHero } from '@/components/OwlHero'
import { speak } from '@/features/flashcards/lib/speak'
import { notebookApi, type MindmapNodeType, type VocabularyTopic } from '../api/notebookApi'
import { layoutMindmap, type MindmapLayout, type PositionedNode } from '../lib/layoutMindmap'
import '../mindmap.css'

type NodeState = 'normal' | 'focus' | 'related' | 'dim' | 'match'

interface MindmapNodeData extends Record<string, unknown> {
  label: string
  kind: MindmapNodeType
  childCount: number
  state: NodeState
  delay: number
}

type MindmapFlowNode = Node<MindmapNodeData, 'mindmap'>

const KIND_LABEL: Record<MindmapNodeType, string> = {
  TOPIC: 'Chủ đề',
  WORD: 'Từ vựng',
  COLLOCATION: 'Cụm từ đi kèm',
  SYNONYM: 'Từ đồng nghĩa',
}

const EDGE_COLOR: Record<string, string> = { TOPIC_WORD: '#6f8ff0', COLLOCATION: '#f97316', SYNONYM: '#16a34a' }

/** Every edge meets the node centre, so the lines of a radial map point straight at each chip. */
const MindmapNodeCard = memo(function MindmapNodeCard({ data }: NodeProps<MindmapFlowNode>) {
  return (
    <div
      className={`mm-node mm-node--${data.kind.toLowerCase()} is-${data.state}`}
      style={{ '--mm-delay': `${data.delay}ms` } as CSSProperties}
      title={data.kind === 'WORD' ? 'Nhấp để mở nhánh · nhấp đúp để xem chi tiết' : KIND_LABEL[data.kind]}
    >
      <Handle type="target" position={Position.Top} className="mm-handle" isConnectable={false} />
      {data.kind === 'TOPIC' && <Network size={18} aria-hidden="true" />}
      <span lang={data.kind === 'TOPIC' ? undefined : 'en'}>{data.label}</span>
      {data.kind === 'WORD' && data.childCount > 0 && <b className="mm-node__badge">+{data.childCount}</b>}
      <Handle type="source" position={Position.Bottom} className="mm-handle" isConnectable={false} />
    </div>
  )
})

const NODE_TYPES = { mindmap: MindmapNodeCard }

interface MindmapViewProps {
  initialTopicId?: string
  height?: string | number
}

/** The topic mindmap with its guide owl. ReactFlow hooks need the provider, so the view is wrapped here. */
export function MindmapView(props: MindmapViewProps) {
  return (
    <ReactFlowProvider>
      <MindmapCanvas {...props} />
    </ReactFlowProvider>
  )
}

function MindmapCanvas({ initialTopicId, height = 540 }: MindmapViewProps) {
  const navigate = useNavigate()
  const { fitView } = useReactFlow()
  const [topics, setTopics] = useState<VocabularyTopic[] | null>(null)
  const [chosenTopicId, setChosenTopicId] = useState(initialTopicId ?? '')
  const topicId = chosenTopicId || topics?.[0]?.id || ''
  const [map, setMap] = useState<{ topicId: string; layout: MindmapLayout } | null>(null)
  const [failedTopicId, setFailedTopicId] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  // Focus belongs to one topic; switching topic drops it without an effect.
  const [focus, setFocus] = useState<{ topicId: string; wordId: string } | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    notebookApi.getTopics(controller.signal).then(setTopics, () => setTopics([]))
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!topicId) return undefined
    const controller = new AbortController()
    notebookApi
      .getMindmap({ topicId }, controller.signal)
      .then((data) => setMap({ topicId, layout: layoutMindmap(data.nodes ?? [], data.edges ?? []) }))
      .catch((reason: unknown) => {
        if ((reason as { name?: string })?.name !== 'AbortError') setFailedTopicId(topicId)
      })
    return () => controller.abort()
  }, [topicId, reloadKey])

  const layout = map?.topicId === topicId ? map.layout : null
  const failed = failedTopicId === topicId
  const loading = Boolean(topicId) && !layout && !failed
  const focusedWordId = focus?.topicId === topicId ? focus.wordId : null
  const byId = useMemo(() => new Map(layout?.nodes.map((node) => [node.id, node]) ?? []), [layout])
  const focusedWord = focusedWordId ? byId.get(focusedWordId) ?? null : null
  const branch = useMemo(
    () => (layout && focusedWordId ? layout.nodes.filter((node) => node.parentId === focusedWordId) : []),
    [layout, focusedWordId],
  )

  const keyword = filter.trim().toLowerCase()
  const matches = useMemo(
    () => (layout && keyword ? layout.nodes.filter((node) => node.type === 'WORD' && node.label.toLowerCase().includes(keyword)) : []),
    [layout, keyword],
  )
  const matchIds = useMemo(() => new Set(matches.map((node) => node.id)), [matches])

  const stats = useMemo(() => {
    const count = (type: MindmapNodeType) => layout?.nodes.filter((node) => node.type === type).length ?? 0
    return { words: count('WORD'), collocations: count('COLLOCATION'), synonyms: count('SYNONYM') }
  }, [layout])

  const { flowNodes, flowEdges } = useMemo(() => {
    if (!layout) return { flowNodes: [] as MindmapFlowNode[], flowEdges: [] as Edge[] }
    const stateOf = (node: PositionedNode): NodeState => {
      if (focusedWordId) {
        if (node.id === focusedWordId) return 'focus'
        if (node.parentId === focusedWordId || node.id === layout.rootId) return 'related'
        return 'dim'
      }
      if (keyword) return matchIds.has(node.id) ? 'match' : node.type === 'TOPIC' ? 'normal' : 'dim'
      return 'normal'
    }
    const visible = (node: PositionedNode) => !node.parentId || showAll || node.parentId === focusedWordId
    const flowNodes: MindmapFlowNode[] = layout.nodes.map((node, index) => ({
      id: node.id,
      type: 'mindmap',
      position: node.position,
      origin: [0.5, 0.5],
      hidden: !visible(node),
      data: {
        label: node.label,
        kind: node.type,
        childCount: node.childCount,
        state: stateOf(node),
        // Topic first, then words ring by ring; a branch pops out right away when it is opened.
        delay: node.parentId ? 40 + (index % 6) * 45 : node.type === 'TOPIC' ? 0 : 120 + node.ring * 160 + (index % 12) * 25,
      },
    }))
    const hidden = new Set(flowNodes.filter((node) => node.hidden).map((node) => node.id))
    const flowEdges: Edge[] = layout.edges.map((edge) => {
      const active = focusedWordId !== null && (edge.from === focusedWordId || edge.to === focusedWordId)
      const faded = (focusedWordId !== null && !active) || (keyword !== '' && !matchIds.has(edge.to) && !matchIds.has(edge.from))
      return {
        id: `${edge.from}-${edge.to}`,
        source: edge.from,
        target: edge.to,
        type: 'straight',
        hidden: hidden.has(edge.from) || hidden.has(edge.to),
        animated: active,
        className: active ? 'mm-edge is-active' : faded ? 'mm-edge is-faded' : 'mm-edge',
        style: { stroke: EDGE_COLOR[edge.kind] ?? '#6f8ff0', strokeWidth: active ? 3.4 : edge.kind === 'TOPIC_WORD' ? 2.4 : 2.6 },
      }
    })
    return { flowNodes, flowEdges }
  }, [layout, focusedWordId, showAll, keyword, matchIds])

  /** Waits a frame so freshly shown branch nodes are measured before the camera moves to them. */
  function zoomTo(ids: string[] | null) {
    window.setTimeout(() => {
      void fitView(ids ? { nodes: ids.map((id) => ({ id })), duration: 650, padding: 0.45, maxZoom: 1.25 } : { duration: 650, padding: 0.12 })
    }, 60)
  }

  function openWord(wordId: string) {
    setFocus({ topicId, wordId })
    const kids = layout?.nodes.filter((node) => node.parentId === wordId).map((node) => node.id) ?? []
    zoomTo([wordId, ...kids])
  }

  function closeWord() {
    setFocus(null)
    zoomTo(null)
  }

  function chooseTopic(id: string) {
    setChosenTopicId(id)
    setFilter('')
  }

  function retry() {
    setFailedTopicId(null)
    setReloadKey((key) => key + 1)
  }

  function openDetail(node: PositionedNode | null | undefined) {
    if (node?.itemId) navigate(`/vocabulary/${node.itemId}`)
  }

  const handleNodeClick = (_: unknown, flowNode: MindmapFlowNode) => {
    const node = byId.get(flowNode.id)
    if (!node) return
    if (node.type === 'TOPIC') closeWord()
    else if (node.type === 'WORD') {
      if (node.id === focusedWordId) closeWord()
      else openWord(node.id)
    } else if (node.parentId) openWord(node.parentId)
  }

  const collocations = branch.filter((node) => node.type === 'COLLOCATION')
  const synonyms = branch.filter((node) => node.type === 'SYNONYM')
  const selectedTopic = topics?.find((topic) => topic.id === topicId)

  return (
    <section className="mm" aria-label="Sơ đồ tư duy từ vựng">
      <div className="mm-topics" role="tablist" aria-label="Chọn chủ đề cho sơ đồ">
        {topics === null && <span className="mm-topics__hint">Đang tải chủ đề…</span>}
        {topics?.length === 0 && <span className="mm-topics__hint">Chưa có chủ đề từ vựng.</span>}
        {topics?.map((topic) => (
          <button
            key={topic.id}
            type="button"
            role="tab"
            aria-selected={topic.id === topicId}
            className="mm-topic"
            onClick={() => chooseTopic(topic.id)}
          >
            {topic.nameVi || topic.name}
            <small>{topic.wordCount}</small>
          </button>
        ))}
      </div>

      <div className="mm-body">
        <div className="mm-canvas" style={{ height }}>
          <div className="mm-tools">
            <label className="mm-search">
              <Search size={15} aria-hidden="true" />
              <input
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && matches[0]) openWord(matches[0].id)
                }}
                placeholder="Tìm từ trong sơ đồ…"
                aria-label="Tìm từ trong sơ đồ"
              />
              {filter && (
                <button type="button" onClick={() => setFilter('')} aria-label="Xóa tìm kiếm trong sơ đồ"><X size={14} /></button>
              )}
            </label>
            {keyword && <span className="mm-tools__count">{matches.length} từ khớp</span>}
            <button type="button" className="mm-tool" aria-pressed={showAll} onClick={() => setShowAll((value) => !value)}>
              {showAll ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
              {showAll ? 'Thu gọn nhánh' : 'Mở mọi nhánh'}
            </button>
            <button type="button" className="mm-tool" onClick={closeWord} aria-label="Xem toàn bộ sơ đồ">
              <Maximize2 size={15} aria-hidden="true" />
            </button>
          </div>

          {loading && (
            <div className="mm-overlay" role="status">
              <span className="mm-spinner" aria-hidden="true" />
              Đang vẽ sơ đồ…
            </div>
          )}
          {failed && (
            <div className="mm-overlay mm-overlay--solid" role="alert">
              <p>Không tải được sơ đồ cho chủ đề này.</p>
              <button type="button" className="mm-retry" onClick={retry}><RotateCcw size={15} aria-hidden="true" />Thử lại</button>
            </div>
          )}
          {layout && layout.nodes.length <= 1 && (
            <div className="mm-overlay mm-overlay--solid">
              <Network size={32} aria-hidden="true" />
              <p>Chủ đề này chưa có từ vựng để vẽ sơ đồ.</p>
            </div>
          )}

          {/* Mounted per loaded topic so `fitView` frames the new map once its nodes are measured. */}
          {layout && <ReactFlow
            key={topicId}
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={NODE_TYPES}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={(_, flowNode) => openDetail(byId.get(flowNode.id))}
            onPaneClick={() => focusedWordId && closeWord()}
            nodesConnectable={false}
            elementsSelectable={false}
            fitView
            fitViewOptions={{ padding: 0.12 }}
            minZoom={0.2}
            maxZoom={2}
            attributionPosition="bottom-right"
          >
            <Background color="#d7def0" gap={26} size={1.4} />
            <Controls showInteractive={false} position="bottom-left" />
          </ReactFlow>}

          <ul className="mm-legend" aria-label="Chú giải">
            <li><i className="is-topic" />Chủ đề</li>
            <li><i className="is-word" />Từ vựng</li>
            <li><i className="is-collocation" />Cụm từ</li>
            <li><i className="is-synonym" />Đồng nghĩa</li>
          </ul>
        </div>

        <aside className="mm-guide" aria-live="polite">
          <OwlHero
            pose={focusedWord ? 'cheer' : keyword ? 'confident' : 'idea'}
            frames={['idea', 'cheer', 'confident']}
            size="sm"
            motion={focusedWord ? 'hop' : 'calm'}
            className="mm-guide__owl"
          />
          {focusedWord ? (
            <div className="mm-bubble mm-bubble--word" key={focusedWord.id}>
              <div className="mm-word-head">
                <h4 lang="en">{focusedWord.label}</h4>
                <button type="button" className="mm-icon" onClick={() => speak(focusedWord.label)} aria-label={`Nghe phát âm ${focusedWord.label}`}>
                  <Volume2 size={16} />
                </button>
              </div>
              {branch.length === 0 && <p className="mm-muted">Từ này chưa có cụm từ hay từ đồng nghĩa trong kho. Mở chi tiết để xem nghĩa và ví dụ nhé!</p>}
              {collocations.length > 0 && (
                <div className="mm-group">
                  <span className="mm-group__title is-collocation">Cụm từ đi kèm</span>
                  <div className="mm-chips">{collocations.map((node) => <span key={node.id} className="mm-chip is-collocation" lang="en">{node.label}</span>)}</div>
                </div>
              )}
              {synonyms.length > 0 && (
                <div className="mm-group">
                  <span className="mm-group__title is-synonym">Từ đồng nghĩa</span>
                  <div className="mm-chips">{synonyms.map((node) => <span key={node.id} className="mm-chip is-synonym" lang="en">{node.label}</span>)}</div>
                </div>
              )}
              <div className="mm-actions">
                {focusedWord.itemId && (
                  <button type="button" className="mm-primary" onClick={() => openDetail(focusedWord)}>
                    Xem chi tiết từ <ExternalLink size={14} aria-hidden="true" />
                  </button>
                )}
                <button type="button" className="mm-ghost" onClick={closeWord}>Xem cả sơ đồ</button>
              </div>
            </div>
          ) : (
            <div className="mm-bubble">
              <h4>Đọc sơ đồ thế nào?</h4>
              <ol className="mm-steps">
                <li><i className="is-topic" /><span><b>Ở giữa</b> là chủ đề {selectedTopic ? <em>“{selectedTopic.nameVi || selectedTopic.name}”</em> : null}.</span></li>
                <li><i className="is-word" /><span><b>Vòng xung quanh</b> là các từ thuộc chủ đề. Số <b className="mm-badge-inline">+3</b> cho biết từ có bao nhiêu nhánh.</span></li>
                <li><i className="is-collocation" /><span><b>Nhấp vào một từ</b> để mở nhánh <b className="is-collocation-text">cụm từ</b> và <b className="is-synonym-text">từ đồng nghĩa</b>; nhấp đúp để xem chi tiết.</span></li>
              </ol>
              {layout && (
                <div className="mm-stats">
                  <span><strong>{stats.words}</strong>từ</span>
                  <span><strong>{stats.collocations}</strong>cụm từ</span>
                  <span><strong>{stats.synonyms}</strong>đồng nghĩa</span>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}
