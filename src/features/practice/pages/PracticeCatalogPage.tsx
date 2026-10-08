import React, { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { PracticeNavbar } from '../components/PracticeNavbar'
import { PracticeSidebar } from '../components/PracticeSidebar'
import { PracticeCosmicBanner } from '../components/PracticeCosmicBanner'
import { PracticeTestCard } from '../components/PracticeTestCard'
import { PracticeModeModal } from '../components/PracticeModeModal'
import { MOCK_PRACTICE_CARDS } from '@/mocks/practiceData'
import type {
  PracticeMode,
  SkillType,
  ReadingSubcategory,
  PracticeCard,
} from '@/types/practice'

const SKILLS: readonly SkillType[] = ['reading', 'listening', 'writing', 'speaking']

export interface PracticeCatalogPageProps {
  onNavigateToClassroom?: () => void
  onOpenTest: (skill: SkillType, testId: string, mode: PracticeMode) => void
}

export const PracticeCatalogPage: React.FC<PracticeCatalogPageProps> = ({
  onOpenTest,
}) => {
  // Sidebar state
  const [searchParams] = useSearchParams()
  const skillParam = SKILLS.find((item) => item === searchParams.get('skill'))
  const [currentSkill, setCurrentSkill] = useState<SkillType>(skillParam ?? 'reading')
  // The navbar links here with ?skill=…; follow it when the page is already open.
  const [seenSkillParam, setSeenSkillParam] = useState(skillParam)
  if (skillParam !== seenSkillParam) {
    setSeenSkillParam(skillParam)
    if (skillParam) setCurrentSkill(skillParam)
  }
  const [currentReadingSub, setCurrentReadingSub] =
    useState<ReadingSubcategory>('passage-1')
  const [selectedResources, setSelectedResources] = useState<string[]>([
    'ielts-space-pro',
  ])

  // Filter tabs state ("Bài chưa làm" vs "Bài đã làm")
  const [activeTab, setActiveTab] = useState<'uncompleted' | 'completed'>(
    'uncompleted'
  )
  const [searchQuery, setSearchQuery] = useState('')

  // Modal state
  const [selectedCardForModal, setSelectedCardForModal] =
    useState<PracticeCard | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleToggleResource = (res: string) => {
    setSelectedResources((prev) =>
      prev.includes(res) ? prev.filter((r) => r !== res) : [...prev, res]
    )
  }

  // Filter cards based on state
  const filteredCards = useMemo(() => {
    return MOCK_PRACTICE_CARDS.filter((card) => {
      // Skill filter
      if (card.skill !== currentSkill) return false

      // Tab filter
      if (activeTab === 'uncompleted' && card.isCompleted) return false
      if (activeTab === 'completed' && !card.isCompleted) return false

      // Search filter
      if (
        searchQuery &&
        !card.title.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false
      }

      return true
    })
  }, [currentSkill, activeTab, searchQuery])

  const handleCardClick = (card: PracticeCard) => {
    setSelectedCardForModal(card)
    setIsModalOpen(true)
  }

  const handleConfirmMode = (mode: PracticeMode) => {
    if (!selectedCardForModal) return
    setIsModalOpen(false)
    onOpenTest(selectedCardForModal.skill, selectedCardForModal.id, mode)
  }

  return (
    <div className="practice-light-root">
      {/* 1. TOP NAVBAR - IDENTICAL TO HOME / CLASSROOM */}
      <PracticeNavbar activeTab="practice" />

      {/* 2. MAIN CONTAINER */}
      <div className="practice-main-shell">
        <div className="practice-layout-grid">
          {/* Left White Sidebar */}
          <PracticeSidebar
            currentSkill={currentSkill}
            onSelectSkill={setCurrentSkill}
            currentReadingSub={currentReadingSub}
            onSelectReadingSub={setCurrentReadingSub}
            selectedResources={selectedResources}
            onToggleResource={handleToggleResource}
          />

          {/* Right Main Content */}
          <main className="practice-catalog-main">
            {/* Cosmic Hero Banner */}
            <PracticeCosmicBanner
              onStartTest={() => {
                if (filteredCards.length > 0) {
                  handleCardClick(filteredCards[0])
                } else {
                  handleCardClick(MOCK_PRACTICE_CARDS[0])
                }
              }}
            />

            {/* Filter Tabs & Search Bar Row */}
            <div className="practice-controls-row">
              {/* Left Tabs: Bài chưa làm / Bài đã làm */}
              <div className="practice-segmented-tabs">
                <button
                  type="button"
                  className={`tab-pill-btn ${
                    activeTab === 'uncompleted' ? 'active' : ''
                  }`}
                  onClick={() => setActiveTab('uncompleted')}
                >
                  Bài chưa làm
                </button>
                <button
                  type="button"
                  className={`tab-pill-btn ${
                    activeTab === 'completed' ? 'active' : ''
                  }`}
                  onClick={() => setActiveTab('completed')}
                >
                  Bài đã làm
                </button>
              </div>

              {/* Right Search Bar */}
              <div className="practice-pill-search">
                <Search size={16} className="search-pill-icon" />
                <input
                  type="text"
                  placeholder="Tìm tên bài tập"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-pill-input"
                />
              </div>
            </div>

            {/* 3-Column Cards Grid */}
            <div className="practice-visual-grid">
              {filteredCards.map((card) => (
                <PracticeTestCard
                  key={card.id}
                  card={card}
                  onClick={handleCardClick}
                />
              ))}
            </div>
          </main>
        </div>
      </div>

      {/* Screen 2: Mode Selection Modal */}
      <PracticeModeModal
        isOpen={isModalOpen}
        card={selectedCardForModal}
        onClose={() => setIsModalOpen(false)}
        onConfirmMode={handleConfirmMode}
      />
    </div>
  )
}
