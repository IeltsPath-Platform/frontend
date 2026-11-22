import { useEffect, useRef, useState } from 'react'
import { fetchCodeSettings, type CodeKind, type CodeSuggestion } from '../api/codeSettingsApi'

/** What the settings say about one kind of code: whether it is generated, whether the author may change it. */
export interface CodePolicy { applied: boolean; editable: boolean; pattern: string }

/**
 * The code field of a create form whose kind of code can be generated. While `enabled` (a new record), it reads the
 * setting once and asks for a suggestion each time `contextKey` changes, filling the code until the author types one.
 * A code the author typed is never overwritten. When the setting is off, or cannot be read, the author types the code.
 *
 * `ready` says whether the context is enough for this pattern (a topic code that uses the skill waits for the skill);
 * not ready leaves the code empty, and the server still generates one when the record is saved.
 */
export function useGeneratedCode({ kind, enabled, initial = '', contextKey, ready, suggest }: {
  kind: CodeKind
  enabled: boolean
  /** The code of a record being edited; it is not generated again. */
  initial?: string
  /** Changes whenever what the suggestion depends on changes. */
  contextKey: string
  ready?: (pattern: string) => boolean
  suggest: (signal: AbortSignal) => Promise<CodeSuggestion>
}) {
  const [code, setCode] = useState(initial)
  const [policy, setPolicy] = useState<CodePolicy | null>(null)
  const typedByAuthor = useRef(false)
  const suggestRef = useRef(suggest)
  const readyRef = useRef(ready)
  // Kept current after each render; this effect runs before the one below, which reads them.
  useEffect(() => { suggestRef.current = suggest; readyRef.current = ready })

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    const { signal } = controller
    const clear = () => { if (!typedByAuthor.current) setCode('') }
    void (async () => {
      try {
        const setting = (await fetchCodeSettings(signal)).find((item) => item.kind === kind)
        if (signal.aborted) return
        if (!setting) { setPolicy({ applied: false, editable: true, pattern: '' }); clear(); return }
        const pattern = setting.pattern
        if (!setting.applied) { setPolicy({ applied: false, editable: setting.editable, pattern }); clear(); return }
        setPolicy({ applied: true, editable: setting.editable, pattern })
        if (readyRef.current && !readyRef.current(pattern)) { clear(); return }
        try {
          const suggestion = await suggestRef.current(signal)
          if (signal.aborted) return
          setPolicy({ applied: suggestion.applied, editable: suggestion.editable, pattern })
          if (!typedByAuthor.current) setCode(suggestion.code)
        } catch {
          if (!signal.aborted) setPolicy({ applied: true, editable: true, pattern })
        }
      } catch {
        if (!signal.aborted) { setPolicy({ applied: false, editable: true, pattern: '' }); clear() }
      }
    })()
    return () => controller.abort()
  }, [kind, enabled, contextKey])

  const applied = enabled && !!policy?.applied
  /** Applied and not editable: the field is locked and the server alone chooses the code. */
  const locked = applied && !policy?.editable
  return {
    code,
    policy,
    /** The author typed in the field: from now on the suggestion no longer replaces it. */
    onType: (value: string) => { typedByAuthor.current = true; setCode(value) },
    locked,
    /** Without a generated code the author has to type one. */
    required: enabled && !applied,
    /** What to send as the code: nothing when locked (the server chooses it), otherwise what is in the field, which the server fills in when blank. */
    codeToSend: locked ? undefined : code.trim(),
  }
}
