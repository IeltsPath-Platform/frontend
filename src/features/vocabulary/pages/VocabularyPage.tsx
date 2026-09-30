import { BookMarked } from 'lucide-react'
import { SiteNavbar } from '@/components/SiteNavbar'
import { LESSON_VOCABULARY } from '@/mocks/lessonData'
import { VocabularyCollection } from '../components/VocabularyCollection'

export function VocabularyPage() {
  return (
    <div className="dictionary-page">
      <a className="skip-link" href="#dictionary-content">Chuyển đến từ điển</a>
      <SiteNavbar />
      <main id="dictionary-content" tabIndex={-1} className="dictionary-shell">
        <header className="dictionary-hero"><div><p>IELTS SPACE DICTIONARY</p><h1>Từ điển học theo chủ đề</h1><span>Tra cứu, nghe phát âm và lưu lại từ cần ôn.</span></div><strong><BookMarked aria-hidden="true" size={20} />{LESSON_VOCABULARY.length} từ</strong></header>
        <VocabularyCollection entries={LESSON_VOCABULARY} eyebrow="VOCABULARY LIST" title="Nature & Environment" description="Từ vựng cốt lõi cho Reading, Writing và Speaking." />
      </main>
    </div>
  )
}
