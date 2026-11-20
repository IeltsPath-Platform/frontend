import { describe, expect, it } from 'vitest'

/** Every component source, read as text; test files are left out. */
const sources = import.meta.glob<string>(['/src/**/*.tsx', '!/src/**/*.test.tsx'], { query: '?raw', import: 'default', eager: true })

/** Attributes that make the browser validate by itself and show its own bubble instead of the message under the field. */
const NATIVE_VALIDATION = /\srequired(\s|=|\/|>)|\sminLength=|\spattern=|type="email"|type="url"/

describe('form validation rule', () => {
  it('never lets the browser validate a form by itself: a form with native validation attributes carries noValidate', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(100)
    const offenders: string[] = []
    for (const [file, text] of Object.entries(sources)) {
      for (const match of text.matchAll(/<form\b[\s\S]*?<\/form>/g)) {
        const form = match[0]
        const opening = form.slice(0, 500)
        if (!opening.includes('noValidate') && NATIVE_VALIDATION.test(form)) offenders.push(file)
      }
    }
    expect(offenders).toEqual([])
  })
})
