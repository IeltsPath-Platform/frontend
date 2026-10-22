import { useEffect, useState } from 'react'
import { flashcardApi, flashcardErrorMessage, loadAllDeckItems, type FlashcardDeck } from '../api/flashcardApi'
import type { StudyCard } from '../lib/study'

interface DeckStudyState { deck: FlashcardDeck | null; cards: StudyCard[] | null; error: string }

/** Loads a deck and every card in it for the Learn and Test modes. */
export function useDeckStudyCards(deckId: string): DeckStudyState {
  const [state, setState] = useState<DeckStudyState>({ deck: null, cards: null, error: '' })
  useEffect(() => {
    let live = true
    Promise.all([flashcardApi.getDeck(deckId), loadAllDeckItems(deckId)]).then(([deck, items]) => {
      if (live) setState({ deck, error: '', cards: items.map((item) => ({ id: item.flashcardId, front: item.front, back: item.back, imageUrl: item.imageUrl })) })
    }, (reason) => { if (live) setState({ deck: null, cards: [], error: flashcardErrorMessage(reason) }) })
    return () => { live = false }
  }, [deckId])
  return state
}
