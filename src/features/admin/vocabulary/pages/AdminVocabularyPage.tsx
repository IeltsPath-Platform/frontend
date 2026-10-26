import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import {
  BookOpen,
  Search,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  ListOrdered,
  Layers,
  Network,
  RotateCcw,
} from 'lucide-react'
import { AdminPage } from '../../pages/AdminPage'
import { useToast } from '@/components/toast/toastContext'
import {
  notebookApi,
  type VocabularyCatalogItem,
  type VocabularyTopic,
  type VocabularySetSummary,
  type VocabularyItemDetail,
  type AdminItemPayload,
  type AdminSensePayload,
  type AdminTopicPayload,
  type AdminSetPayload,
} from '@/features/vocabulary/api/notebookApi'
import {
  adminItemSchema,
  adminSenseSchema,
  adminTopicSchema,
  adminSetSchema,
} from '../vocabularySchemas'
import '../../admin.css'

type AdminVocabTab = 'ITEMS' | 'TOPICS' | 'SETS'

export function AdminVocabularyPage() {
  const { toast } = useToast()
  const [tab, setTab] = useState<AdminVocabTab>('ITEMS')

  // --------------------------------------------------------------------------
  // Tab 1: Items & Senses
  // --------------------------------------------------------------------------
  const [itemSearchQuery, setItemSearchQuery] = useState('')
  const [catalogItems, setCatalogItems] = useState<VocabularyCatalogItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [selectedItemDetail, setSelectedItemDetail] = useState<VocabularyItemDetail | null>(null)
  const [loadingItemDetail, setLoadingItemDetail] = useState(false)
  const [editingSenseId, setEditingSenseId] = useState<string | null>(null)

  // Item form
  const itemForm = useForm<AdminItemPayload>({
    defaultValues: {
      ipaUk: '',
      ipaUs: '',
      audioUkReference: '',
      audioUsReference: '',
      frequencyRank: null,
      academicWordList: false,
      wordFamily: '',
    },
  })

  // Sense form
  const senseForm = useForm<AdminSensePayload>({
    defaultValues: {
      cefrLevel: 'B1',
      topicId: '',
      register: '',
      grammarNote: '',
      usageNote: '',
      exampleTranslation: '',
    },
  })

  // Search catalog items
  const handleSearchItems = useCallback((q: string) => {
    setLoadingItems(true)
    notebookApi
      .getCatalogVocabulary({ q: q.trim(), size: 25 })
      .then((data) => {
        setCatalogItems(data.items || [])
      })
      .catch(() => {
        toast({ title: 'Lỗi', description: 'Không thể tìm kiếm từ vựng.', tone: 'error' })
      })
      .finally(() => {
        setLoadingItems(false)
      })
  }, [toast])

  useEffect(() => {
    if (tab === 'ITEMS' && catalogItems.length === 0) {
      let active = true
      notebookApi
        .getCatalogVocabulary({ q: '', size: 25 })
        .then((data) => {
          if (active) setCatalogItems(data.items || [])
        })
        .catch(() => {})
      return () => {
        active = false
      }
    }
  }, [tab, catalogItems.length])

  const handleSelectItem = (id: string) => {
    setLoadingItemDetail(true)
    notebookApi
      .getVocabularyItem(id)
      .then((detail) => {
        setSelectedItemDetail(detail)
        itemForm.reset({
          ipaUk: detail.phoneticUk || detail.ipa || '',
          ipaUs: detail.phoneticUs || detail.ipa || '',
          audioUkReference: detail.audioUk || detail.pronunciationAudioReference || '',
          audioUsReference: detail.audioUs || '',
          frequencyRank: detail.frequencyRank ?? null,
          academicWordList: detail.academicWordList ?? false,
          wordFamily: detail.wordFamily || '',
        })
        if (detail.senses.length > 0) {
          const firstSense = detail.senses[0]
          setEditingSenseId(firstSense.id)
          senseForm.reset({
            cefrLevel: firstSense.cefrLevel || 'B1',
            topicId: firstSense.topicId || '',
            register: firstSense.register || '',
            grammarNote: firstSense.grammarNote || '',
            usageNote: firstSense.usageNote || '',
            exampleTranslation: firstSense.exampleTranslation || '',
          })
        } else {
          setEditingSenseId(null)
        }
      })
      .catch(() => {
        toast({ title: 'Lỗi', description: 'Không thể tải chi tiết từ vựng.', tone: 'error' })
      })
      .finally(() => {
        setLoadingItemDetail(false)
      })
  }

  const handleSaveItem = async (values: AdminItemPayload) => {
    if (!selectedItemDetail) return
    const parse = adminItemSchema.safeParse(values)
    if (!parse.success) {
      toast({ title: 'Dữ liệu không hợp lệ', description: parse.error.issues[0]?.message, tone: 'error' })
      return
    }

    try {
      await notebookApi.updateAdminItem(selectedItemDetail.id, parse.data)
      toast({ title: 'Thành công', description: 'Đã cập nhật thông tin từ vựng.', tone: 'success' })
      handleSelectItem(selectedItemDetail.id)
    } catch {
      toast({ title: 'Lỗi', description: 'Không thể lưu từ vựng.', tone: 'error' })
    }
  }

  const handleSaveSense = async (values: AdminSensePayload) => {
    if (!editingSenseId) return
    const parse = adminSenseSchema.safeParse(values)
    if (!parse.success) {
      toast({ title: 'Dữ liệu không hợp lệ', description: parse.error.issues[0]?.message, tone: 'error' })
      return
    }

    try {
      await notebookApi.updateAdminSense(editingSenseId, parse.data)
      toast({ title: 'Thành công', description: 'Đã cập nhật thông tin nghĩa của từ.', tone: 'success' })
      if (selectedItemDetail) handleSelectItem(selectedItemDetail.id)
    } catch {
      toast({ title: 'Lỗi', description: 'Không thể lưu nghĩa từ vựng.', tone: 'error' })
    }
  }

  // --------------------------------------------------------------------------
  // Tab 2: Topics CRUD
  // --------------------------------------------------------------------------
  const [topics, setTopics] = useState<VocabularyTopic[]>([])
  const [loadingTopics, setLoadingTopics] = useState(false)
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false)
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null)

  const topicForm = useForm<AdminTopicPayload>({
    defaultValues: {
      slug: '',
      name: '',
      nameVi: '',
      coverKey: '',
      sortOrder: 0,
      status: 'ACTIVE',
    },
  })

  const loadTopics = useCallback(() => {
    setLoadingTopics(true)
    notebookApi
      .getAdminTopics()
      .then((data) => setTopics(data || []))
      .catch(() => toast({ title: 'Lỗi', description: 'Không thể tải danh sách chủ đề.', tone: 'error' }))
      .finally(() => setLoadingTopics(false))
  }, [toast])

  useEffect(() => {
    if (tab === 'TOPICS') {
      let active = true
      notebookApi
        .getAdminTopics()
        .then((data) => {
          if (active) setTopics(data || [])
        })
        .catch(() => {})
      return () => {
        active = false
      }
    }
  }, [tab])

  const handleOpenCreateTopic = () => {
    setEditingTopicId(null)
    topicForm.reset({
      slug: '',
      name: '',
      nameVi: '',
      coverKey: '',
      sortOrder: topics.length,
      status: 'ACTIVE',
    })
    setIsTopicModalOpen(true)
  }

  const handleOpenEditTopic = (t: VocabularyTopic) => {
    setEditingTopicId(t.id)
    topicForm.reset({
      slug: t.slug,
      name: t.name,
      nameVi: t.nameVi,
      coverKey: t.coverKey || '',
      sortOrder: t.sortOrder,
      status: 'ACTIVE',
    })
    setIsTopicModalOpen(true)
  }

  const handleSaveTopic = async (values: AdminTopicPayload) => {
    const parse = adminTopicSchema.safeParse(values)
    if (!parse.success) {
      toast({ title: 'Dữ liệu không hợp lệ', description: parse.error.issues[0]?.message, tone: 'error' })
      return
    }

    try {
      if (editingTopicId) {
        await notebookApi.updateAdminTopic(editingTopicId, parse.data)
        toast({ title: 'Thành công', description: 'Đã cập nhật chủ đề.', tone: 'success' })
      } else {
        await notebookApi.createAdminTopic(parse.data)
        toast({ title: 'Thành công', description: 'Đã tạo chủ đề mới.', tone: 'success' })
      }
      setIsTopicModalOpen(false)
      loadTopics()
    } catch {
      toast({ title: 'Lỗi', description: 'Không thể lưu chủ đề.', tone: 'error' })
    }
  }

  const handleDeleteTopic = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa chủ đề "${name}"?`)) return
    try {
      await notebookApi.deleteAdminTopic(id)
      toast({ title: 'Đã xóa', description: `Đã xóa chủ đề "${name}".`, tone: 'success' })
      loadTopics()
    } catch {
      toast({ title: 'Lỗi', description: 'Không thể xóa chủ đề.', tone: 'error' })
    }
  }

  // --------------------------------------------------------------------------
  // Tab 3: Sets CRUD & Reordering
  // --------------------------------------------------------------------------
  const [sets, setSets] = useState<VocabularySetSummary[]>([])
  const [loadingSets, setLoadingSets] = useState(false)
  const [isSetModalOpen, setIsSetModalOpen] = useState(false)
  const [editingSetId, setEditingSetId] = useState<string | null>(null)

  // Reordering modal
  const [reorderSetId, setReorderSetId] = useState<string | null>(null)
  const [reorderItems, setReorderItems] = useState<VocabularyCatalogItem[]>([])
  const [loadingReorder, setLoadingReorder] = useState(false)

  const setForm = useForm<AdminSetPayload>({
    defaultValues: {
      title: '',
      description: '',
      kind: 'BAND',
      cefrLevel: 'B2',
      topicId: '',
      coverKey: '',
      sortOrder: 0,
      status: 'ACTIVE',
    },
  })

  const loadSets = useCallback(() => {
    setLoadingSets(true)
    notebookApi
      .getAdminSets()
      .then((data) => setSets(data || []))
      .catch(() => toast({ title: 'Lỗi', description: 'Không thể tải danh sách bộ từ.', tone: 'error' }))
      .finally(() => setLoadingSets(false))
  }, [toast])

  useEffect(() => {
    if (tab === 'SETS') {
      let active = true
      notebookApi
        .getAdminSets()
        .then((data) => {
          if (active) setSets(data || [])
        })
        .catch(() => {})
      return () => {
        active = false
      }
    }
  }, [tab])

  const handleOpenCreateSet = () => {
    setEditingSetId(null)
    setForm.reset({
      title: '',
      description: '',
      kind: 'BAND',
      cefrLevel: 'B2',
      topicId: '',
      coverKey: '',
      sortOrder: sets.length,
      status: 'ACTIVE',
    })
    setIsSetModalOpen(true)
  }

  const handleOpenEditSet = (s: VocabularySetSummary) => {
    setEditingSetId(s.id)
    setForm.reset({
      title: s.title,
      description: s.description || '',
      kind: s.kind,
      cefrLevel: s.cefrLevel || '',
      topicId: '',
      coverKey: s.coverKey || '',
      sortOrder: s.sortOrder,
      status: s.status,
    })
    setIsSetModalOpen(true)
  }

  const handleSaveSet = async (values: AdminSetPayload) => {
    const parse = adminSetSchema.safeParse(values)
    if (!parse.success) {
      toast({ title: 'Dữ liệu không hợp lệ', description: parse.error.issues[0]?.message, tone: 'error' })
      return
    }

    try {
      if (editingSetId) {
        await notebookApi.updateAdminSet(editingSetId, parse.data)
        toast({ title: 'Thành công', description: 'Đã cập nhật bộ từ vựng.', tone: 'success' })
      } else {
        await notebookApi.createAdminSet(parse.data)
        toast({ title: 'Thành công', description: 'Đã tạo bộ từ mới.', tone: 'success' })
      }
      setIsSetModalOpen(false)
      loadSets()
    } catch {
      toast({ title: 'Lỗi', description: 'Không thể lưu bộ từ.', tone: 'error' })
    }
  }

  const handleDeleteSet = async (id: string, title: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bộ từ "${title}"?`)) return
    try {
      await notebookApi.deleteAdminSet(id)
      toast({ title: 'Đã xóa', description: `Đã xóa bộ từ "${title}".`, tone: 'success' })
      loadSets()
    } catch {
      toast({ title: 'Lỗi', description: 'Không thể xóa bộ từ.', tone: 'error' })
    }
  }

  // Open Reordering modal
  const handleOpenReorder = (setId: string) => {
    setReorderSetId(setId)
    setLoadingReorder(true)
    notebookApi
      .getSetWords(setId, { size: 100 })
      .then((data) => {
        setReorderItems(data.items || [])
      })
      .catch(() => {
        toast({ title: 'Lỗi', description: 'Không thể tải từ trong bộ.', tone: 'error' })
      })
      .finally(() => {
        setLoadingReorder(false)
      })
  }

  // Move item up / down in reorder list
  const handleMoveItem = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= reorderItems.length) return
    const next = [...reorderItems]
    const item = next.splice(fromIdx, 1)[0]
    next.splice(toIdx, 0, item)
    setReorderItems(next)
  }

  const handleSaveReorder = async () => {
    if (!reorderSetId) return
    try {
      const senseIds = reorderItems.flatMap((i) => i.senses.map((s) => s.id))
      await notebookApi.updateAdminSetItems(reorderSetId, senseIds)
      toast({ title: 'Thành công', description: 'Đã lưu thứ tự từ vựng trong bộ.', tone: 'success' })
      setReorderSetId(null)
    } catch {
      toast({ title: 'Lỗi', description: 'Không thể cập nhật thứ tự từ vựng.', tone: 'error' })
    }
  }

  return (
    <AdminPage
      title="Quản lý từ vựng học thuật"
      subtitle="Quản trị từ điển chuẩn Cambridge, chỉnh sửa nghĩa, chủ đề, bộ từ vựng và sắp xếp thứ tự học tập."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Top Tab Bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', gap: '1rem' }}>
          <button
            type="button"
            onClick={() => setTab('ITEMS')}
            style={{
              padding: '0.75rem 1.25rem',
              border: 'none',
              background: 'none',
              fontWeight: 800,
              fontSize: '0.95rem',
              color: tab === 'ITEMS' ? '#2563eb' : '#64748b',
              borderBottom: tab === 'ITEMS' ? '2px solid #2563eb' : '2px solid transparent',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <BookOpen size={18} />
            Từ & Nghĩa (Items & Senses)
          </button>

          <button
            type="button"
            onClick={() => setTab('TOPICS')}
            style={{
              padding: '0.75rem 1.25rem',
              border: 'none',
              background: 'none',
              fontWeight: 800,
              fontSize: '0.95rem',
              color: tab === 'TOPICS' ? '#2563eb' : '#64748b',
              borderBottom: tab === 'TOPICS' ? '2px solid #2563eb' : '2px solid transparent',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Network size={18} />
            Chủ đề (Topics)
          </button>

          <button
            type="button"
            onClick={() => setTab('SETS')}
            style={{
              padding: '0.75rem 1.25rem',
              border: 'none',
              background: 'none',
              fontWeight: 800,
              fontSize: '0.95rem',
              color: tab === 'SETS' ? '#2563eb' : '#64748b',
              borderBottom: tab === 'SETS' ? '2px solid #2563eb' : '2px solid transparent',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Layers size={18} />
            Bộ từ vựng (Sets)
          </button>
        </div>

        {/* ---------------- TAB 1: ITEMS & SENSES ---------------- */}
        {tab === 'ITEMS' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(400px, 2fr)', gap: '1.5rem', alignItems: 'start' }}>
            {/* Left Column: Item Search & Selection */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input
                  type="text"
                  placeholder="Tìm từ (VD: abandon, policy)..."
                  value={itemSearchQuery}
                  onChange={(e) => setItemSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearchItems(itemSearchQuery)
                  }}
                  style={{
                    flex: 1,
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleSearchItems(itemSearchQuery)}
                  style={{
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    padding: '0.5rem 0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  <Search size={16} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '560px', overflowY: 'auto' }}>
                {loadingItems ? (
                  <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>Đang tìm kiếm…</p>
                ) : catalogItems.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>Không tìm thấy từ nào.</p>
                ) : (
                  catalogItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectItem(item.id)}
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        background: selectedItemDetail?.id === item.id ? '#eff6ff' : '#f8fafc',
                        border: selectedItemDetail?.id === item.id ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>
                          {item.lemma}
                        </span>
                        {item.ipa && <span style={{ marginLeft: '0.4rem', color: '#64748b', fontSize: '0.8rem' }}>{item.ipa}</span>}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {item.senses.length} nghĩa
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Column: Item & Sense Editor */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1.5rem' }}>
              {loadingItemDetail ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <RotateCcw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem', color: '#2563eb' }} />
                  <p style={{ color: '#64748b' }}>Đang tải dữ liệu từ…</p>
                </div>
              ) : selectedItemDetail ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.35rem', fontWeight: 900, color: '#0f172a' }}>
                      Chỉnh sửa từ: <span style={{ color: '#2563eb' }}>{selectedItemDetail.lemma}</span>
                    </h3>
                  </div>

                  {/* Item Metadata Form */}
                  <form onSubmit={itemForm.handleSubmit(handleSaveItem)} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.85rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                        Phiên âm UK (IPA)
                      </label>
                      <input
                        type="text"
                        {...itemForm.register('ipaUk')}
                        style={{ width: '100%', padding: '0.4rem 0.65rem', borderRadius: '0.4rem', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                        Phiên âm US (IPA)
                      </label>
                      <input
                        type="text"
                        {...itemForm.register('ipaUs')}
                        style={{ width: '100%', padding: '0.4rem 0.65rem', borderRadius: '0.4rem', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                        Audio UK URL
                      </label>
                      <input
                        type="text"
                        {...itemForm.register('audioUkReference')}
                        style={{ width: '100%', padding: '0.4rem 0.65rem', borderRadius: '0.4rem', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                        Audio US URL
                      </label>
                      <input
                        type="text"
                        {...itemForm.register('audioUsReference')}
                        style={{ width: '100%', padding: '0.4rem 0.65rem', borderRadius: '0.4rem', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                        Thứ hạng tần suất (COCA Rank)
                      </label>
                      <input
                        type="number"
                        {...itemForm.register('frequencyRank')}
                        style={{ width: '100%', padding: '0.4rem 0.65rem', borderRadius: '0.4rem', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                        Word Family (Gia đình từ)
                      </label>
                      <input
                        type="text"
                        {...itemForm.register('wordFamily')}
                        placeholder="VD: decide, decisive, decisively"
                        style={{ width: '100%', padding: '0.4rem 0.65rem', borderRadius: '0.4rem', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                    </div>

                    <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                      <button
                        type="submit"
                        style={{
                          background: '#2563eb',
                          color: 'white',
                          border: 'none',
                          padding: '0.5rem 1.25rem',
                          borderRadius: '0.5rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <Save size={16} /> Lưu thông tin từ
                      </button>
                    </div>
                  </form>

                  {/* Senses Editor */}
                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
                    <h4 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                      Các nét nghĩa (Senses)
                    </h4>

                    {selectedItemDetail.senses.map((s) => (
                      <div
                        key={s.id}
                        style={{
                          border: editingSenseId === s.id ? '2px solid #2563eb' : '1px solid #cbd5e1',
                          borderRadius: '0.75rem',
                          padding: '1rem',
                          marginBottom: '0.75rem',
                          background: '#f8fafc',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <div>
                            <span style={{ fontWeight: 800, color: '#0f172a' }}>
                              {s.vietnameseMeaning || s.englishDefinition}
                            </span>
                            {s.cefrLevel && (
                              <span style={{ marginLeft: '0.5rem', background: '#dbeafe', color: '#1e40af', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                                {s.cefrLevel}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSenseId(s.id)
                              senseForm.reset({
                                cefrLevel: s.cefrLevel || 'B1',
                                topicId: s.topicId || '',
                                register: s.register || '',
                                grammarNote: s.grammarNote || '',
                                usageNote: s.usageNote || '',
                                exampleTranslation: s.exampleTranslation || '',
                              })
                            }}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              borderRadius: '0.4rem',
                              padding: '0.25rem 0.6rem',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Chỉnh sửa
                          </button>
                        </div>

                        {editingSenseId === s.id && (
                          <form onSubmit={senseForm.handleSubmit(handleSaveSense)} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginTop: '0.75rem' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>CEFR Level</label>
                              <select
                                {...senseForm.register('cefrLevel')}
                                style={{ width: '100%', padding: '0.35rem', borderRadius: '0.4rem', border: '1px solid #cbd5e1' }}
                              >
                                <option value="A1">A1</option>
                                <option value="A2">A2</option>
                                <option value="B1">B1</option>
                                <option value="B2">B2</option>
                                <option value="C1">C1</option>
                                <option value="C2">C2</option>
                              </select>
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Register (Văn phong)</label>
                              <input
                                type="text"
                                {...senseForm.register('register')}
                                placeholder="Formal, Academic..."
                                style={{ width: '100%', padding: '0.35rem', borderRadius: '0.4rem', border: '1px solid #cbd5e1' }}
                              />
                            </div>

                            <div style={{ gridColumn: '1 / -1' }}>
                              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Ghi chú ngữ pháp</label>
                              <input
                                type="text"
                                {...senseForm.register('grammarNote')}
                                style={{ width: '100%', padding: '0.35rem', borderRadius: '0.4rem', border: '1px solid #cbd5e1' }}
                              />
                            </div>

                            <div style={{ gridColumn: '1 / -1' }}>
                              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Dịch ví dụ mẫu</label>
                              <input
                                type="text"
                                {...senseForm.register('exampleTranslation')}
                                style={{ width: '100%', padding: '0.35rem', borderRadius: '0.4rem', border: '1px solid #cbd5e1' }}
                              />
                            </div>

                            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                              <button
                                type="submit"
                                style={{
                                  background: '#16a34a',
                                  color: 'white',
                                  border: 'none',
                                  padding: '0.4rem 1rem',
                                  borderRadius: '0.4rem',
                                  fontWeight: 700,
                                  fontSize: '0.8rem',
                                  cursor: 'pointer',
                                }}
                              >
                                Lưu nét nghĩa
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748b' }}>
                  <BookOpen size={48} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
                  <p style={{ margin: 0 }}>Chọn một từ vựng ở cột bên trái để bắt đầu chỉnh sửa.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------------- TAB 2: TOPICS CRUD ---------------- */}
        {tab === 'TOPICS' && (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  Danh sách chủ đề từ vựng ({topics.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={handleOpenCreateTopic}
                style={{
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <Plus size={16} /> Tạo chủ đề mới
              </button>
            </div>

            {loadingTopics ? (
              <p style={{ textAlign: 'center', color: '#64748b' }}>Đang tải chủ đề…</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Thứ tự</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Tên tiếng Việt</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Tên tiếng Anh</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Slug</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Số từ</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {topics.map((t) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: '#64748b' }}>{t.sortOrder}</td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 800, color: '#0f172a' }}>{t.nameVi}</td>
                      <td style={{ padding: '0.75rem 0.5rem', color: '#334155' }}>{t.name}</td>
                      <td style={{ padding: '0.75rem 0.5rem', color: '#64748b', fontFamily: 'monospace' }}>{t.slug}</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span style={{ background: '#eff6ff', color: '#1e40af', padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 }}>
                          {t.wordCount} từ
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditTopic(t)}
                            style={{ background: '#f1f5f9', border: 'none', padding: '0.35rem 0.6rem', borderRadius: '0.4rem', cursor: 'pointer' }}
                            title="Sửa chủ đề"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTopic(t.id, t.nameVi || t.name)}
                            style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '0.35rem 0.6rem', borderRadius: '0.4rem', cursor: 'pointer' }}
                            title="Xóa chủ đề"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ---------------- TAB 3: SETS CRUD & REORDERING ---------------- */}
        {tab === 'SETS' && (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  Danh sách bộ từ vựng ({sets.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={handleOpenCreateSet}
                style={{
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <Plus size={16} /> Tạo bộ từ mới
              </button>
            </div>

            {loadingSets ? (
              <p style={{ textAlign: 'center', color: '#64748b' }}>Đang tải bộ từ…</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Tiêu đề</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Loại</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>CEFR / Band</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Số từ</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Trạng thái</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {sets.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 800, color: '#0f172a' }}>{s.title}</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px', background: s.kind === 'BAND' ? '#dbeafe' : '#fef3c7', color: s.kind === 'BAND' ? '#1e40af' : '#92400e' }}>
                          {s.kind}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{s.bandRange || s.cefrLevel || '—'}</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>{s.wordCount} từ</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: s.status === 'ACTIVE' ? '#16a34a' : '#94a3b8' }}>
                          {s.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenReorder(s.id)}
                            style={{ background: '#f1f5f9', border: 'none', padding: '0.35rem 0.6rem', borderRadius: '0.4rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', fontWeight: 700 }}
                            title="Sắp xếp từ trong bộ"
                          >
                            <ListOrdered size={14} /> Sắp xếp
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditSet(s)}
                            style={{ background: '#f1f5f9', border: 'none', padding: '0.35rem 0.6rem', borderRadius: '0.4rem', cursor: 'pointer' }}
                            title="Sửa bộ từ"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSet(s.id, s.title)}
                            style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '0.35rem 0.6rem', borderRadius: '0.4rem', cursor: 'pointer' }}
                            title="Xóa bộ từ"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Topic Modal */}
      {isTopicModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', borderRadius: '1rem', width: '90%', maxWidth: '480px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                {editingTopicId ? 'Chỉnh sửa chủ đề' : 'Tạo chủ đề mới'}
              </h3>
              <button type="button" onClick={() => setIsTopicModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={topicForm.handleSubmit(handleSaveTopic)} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.2rem' }}>Tên tiếng Việt</label>
                <input type="text" {...topicForm.register('nameVi')} placeholder="VD: Môi trường" style={{ width: '100%', padding: '0.45rem', borderRadius: '0.4rem', border: '1px solid #cbd5e1' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.2rem' }}>Tên tiếng Anh</label>
                <input type="text" {...topicForm.register('name')} placeholder="VD: Environment" style={{ width: '100%', padding: '0.45rem', borderRadius: '0.4rem', border: '1px solid #cbd5e1' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.2rem' }}>Slug (URL identifier)</label>
                <input type="text" {...topicForm.register('slug')} placeholder="VD: environment" style={{ width: '100%', padding: '0.45rem', borderRadius: '0.4rem', border: '1px solid #cbd5e1' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.2rem' }}>Thứ tự hiển thị</label>
                <input type="number" {...topicForm.register('sortOrder')} style={{ width: '100%', padding: '0.45rem', borderRadius: '0.4rem', border: '1px solid #cbd5e1' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsTopicModalOpen(false)} style={{ padding: '0.5rem 1rem', borderRadius: '0.4rem', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}>
                  Hủy
                </button>
                <button type="submit" style={{ padding: '0.5rem 1.25rem', borderRadius: '0.4rem', border: 'none', background: '#2563eb', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set Modal */}
      {isSetModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', borderRadius: '1rem', width: '90%', maxWidth: '500px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                {editingSetId ? 'Chỉnh sửa bộ từ vựng' : 'Tạo bộ từ vựng mới'}
              </h3>
              <button type="button" onClick={() => setIsSetModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={setForm.handleSubmit(handleSaveSet)} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.2rem' }}>Tiêu đề bộ từ</label>
                <input type="text" {...setForm.register('title')} placeholder="VD: Từ vựng Band 6.5 - 7.5" style={{ width: '100%', padding: '0.45rem', borderRadius: '0.4rem', border: '1px solid #cbd5e1' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.2rem' }}>Mô tả</label>
                <textarea {...setForm.register('description')} rows={3} style={{ width: '100%', padding: '0.45rem', borderRadius: '0.4rem', border: '1px solid #cbd5e1' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.2rem' }}>Loại bộ từ</label>
                  <select {...setForm.register('kind')} style={{ width: '100%', padding: '0.45rem', borderRadius: '0.4rem', border: '1px solid #cbd5e1' }}>
                    <option value="BAND">BAND (Theo band điểm)</option>
                    <option value="TOPIC">TOPIC (Theo chủ đề)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.2rem' }}>CEFR Level</label>
                  <select {...setForm.register('cefrLevel')} style={{ width: '100%', padding: '0.45rem', borderRadius: '0.4rem', border: '1px solid #cbd5e1' }}>
                    <option value="A1">A1</option>
                    <option value="A2">A2</option>
                    <option value="B1">B1</option>
                    <option value="B2">B2</option>
                    <option value="C1">C1</option>
                    <option value="C2">C2</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.2rem' }}>Thứ tự hiển thị</label>
                <input type="number" {...setForm.register('sortOrder')} style={{ width: '100%', padding: '0.45rem', borderRadius: '0.4rem', border: '1px solid #cbd5e1' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsSetModalOpen(false)} style={{ padding: '0.5rem 1rem', borderRadius: '0.4rem', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}>
                  Hủy
                </button>
                <button type="submit" style={{ padding: '0.5rem 1.25rem', borderRadius: '0.4rem', border: 'none', background: '#2563eb', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reordering Modal */}
      {reorderSetId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', borderRadius: '1rem', width: '90%', maxWidth: '560px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                Sắp xếp thứ tự từ vựng trong bộ
              </h3>
              <button type="button" onClick={() => setReorderSetId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#64748b' }}>
              Dùng các nút lên / xuống để thay đổi vị trí từ trong lộ trình học của bộ từ này.
            </p>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingRight: '0.5rem' }}>
              {loadingReorder ? (
                <p style={{ textAlign: 'center', color: '#64748b' }}>Đang tải danh sách từ…</p>
              ) : reorderItems.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#64748b' }}>Bộ từ này chưa có từ vựng nào.</p>
              ) : (
                reorderItems.map((item, idx) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.6rem 0.85rem',
                      background: '#f8fafc',
                      borderRadius: '0.5rem',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 800, color: '#64748b', fontSize: '0.8rem', width: '24px' }}>
                        #{idx + 1}
                      </span>
                      <span style={{ fontWeight: 800, color: '#0f172a' }}>{item.lemma}</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        ({item.senses[0]?.vietnameseMeaning || item.senses[0]?.englishDefinition || ''})
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <button
                        type="button"
                        onClick={() => handleMoveItem(idx, idx - 1)}
                        disabled={idx === 0}
                        style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: 'white', cursor: idx === 0 ? 'not-allowed' : 'pointer' }}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveItem(idx, idx + 1)}
                        disabled={idx === reorderItems.length - 1}
                        style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: 'white', cursor: idx === reorderItems.length - 1 ? 'not-allowed' : 'pointer' }}
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
              <button type="button" onClick={() => setReorderSetId(null)} style={{ padding: '0.5rem 1rem', borderRadius: '0.4rem', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}>
                Hủy
              </button>
              <button type="button" onClick={handleSaveReorder} style={{ padding: '0.5rem 1.25rem', borderRadius: '0.4rem', border: 'none', background: '#2563eb', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
                Lưu thứ tự
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminPage>
  )
}
