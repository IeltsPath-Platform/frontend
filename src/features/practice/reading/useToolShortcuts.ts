import { useEffect, useRef } from 'react'
import { isTypingTarget } from './workspace-support'

interface ToolActions {
  highlight: () => void
  note: () => void
  lookup: () => void
}

/**
 * The keys the tool rail names: H, N and T pick the Highlight, Note and Tra từ vựng tool.
 * A key does nothing while the learner types in a field, holds a modifier, or keeps the key pressed. The actions can change on
 * every render, so the listener is attached once and always calls the latest ones.
 */
export function useToolShortcuts(enabled: boolean, actions: ToolActions) {
  const latest = useRef(actions)
  useEffect(() => { latest.current = actions })

  useEffect(() => {
    if (!enabled) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat || isTypingTarget(event.target)) return
      const key = event.key.toLowerCase()
      if (key === 'h') latest.current.highlight()
      else if (key === 'n') latest.current.note()
      else if (key === 't') latest.current.lookup()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
