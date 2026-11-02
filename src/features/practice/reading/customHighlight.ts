interface HighlightRegistry { set: (name: string, value: unknown) => void; delete: (name: string) => void }

/** The CSS Custom Highlight API paints colour behind text without touching the markup; null where the browser lacks it. */
export function highlightRegistry(): HighlightRegistry | null {
  const registry = (globalThis.CSS as unknown as { highlights?: HighlightRegistry } | undefined)?.highlights
  return registry && typeof (globalThis as { Highlight?: unknown }).Highlight === 'function' ? registry : null
}

export function paint(name: string, ranges: Range[]) {
  const registry = highlightRegistry()
  const Highlight = (globalThis as unknown as { Highlight: new (...ranges: Range[]) => unknown }).Highlight
  if (registry) registry.set(name, new Highlight(...ranges))
}
