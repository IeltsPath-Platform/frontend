import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { installVietnameseZodMessages } from '@/lib/validation/vietnameseZodMessages'

// The app installs these when it starts; tests start without main.tsx.
installVietnameseZodMessages()

// jsdom has no layout engine: React Flow (the knowledge tree) needs these to exist, and never gets a size from them.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
if (typeof globalThis.DOMMatrixReadOnly === 'undefined') {
  globalThis.DOMMatrixReadOnly = class {
    m22 = 1
  } as unknown as typeof DOMMatrixReadOnly
}

afterEach(() => cleanup())
