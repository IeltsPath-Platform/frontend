import { useEffect, useState } from 'react'
import { useToast } from '@/components/toast/toastContext'
import { notebookApi, type VocabularyCatalogItem, type VocabularyCatalogSense } from '../api/notebookApi'
import { senseMeaning } from './dictionary-search'

/**
 * Saving dictionary meanings into the signed-in learner's notebook from a list of results: it learns which shown
 * meanings are already saved (one request per result set) and saves new ones with a toast.
 */
export function useNotebookSaver(items: readonly VocabularyCatalogItem[], onSaved?: (senseId: string) => void) {
  const { toast } = useToast()
  const [savedSenseIds, setSavedSenseIds] = useState<Set<string>>(() => new Set())
  const [savingSenseId, setSavingSenseId] = useState<string | null>(null)
  const senseKey = items.flatMap((item) => item.senses.map((sense) => sense.id)).join(',')

  useEffect(() => {
    if (!senseKey) return undefined
    const controller = new AbortController()
    notebookApi.getSavedNotebookSenses(senseKey.split(','), controller.signal).then(
      (saved) => setSavedSenseIds((prev) => new Set([...prev, ...saved])),
      () => undefined,
    )
    return () => controller.abort()
  }, [senseKey])

  async function save(sense: VocabularyCatalogSense, lemma: string) {
    if (savingSenseId || savedSenseIds.has(sense.id)) return
    setSavingSenseId(sense.id)
    try {
      await notebookApi.saveNotebookEntry(sense.id)
      setSavedSenseIds((prev) => new Set(prev).add(sense.id))
      toast({ title: `Đã lưu “${lemma}” vào sổ tay`, description: senseMeaning(sense) || undefined, tone: 'success' })
      onSaved?.(sense.id)
    } catch {
      toast({ title: 'Không thể thêm từ', description: 'Vui lòng thử lại sau.', tone: 'error' })
    } finally {
      setSavingSenseId(null)
    }
  }

  return { savedSenseIds, savingSenseId, save }
}
