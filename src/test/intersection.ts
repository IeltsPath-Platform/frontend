/** Install a manual IntersectionObserver for jsdom and return helpers to trigger and inspect observed targets. */
export function mockIntersectionObserver() {
  const original = globalThis.IntersectionObserver
  const originalScrollTo = window.scrollTo
  window.scrollTo = (() => undefined) as typeof window.scrollTo
  const observers: Array<{ root: Element | Document | null; callback: IntersectionObserverCallback; targets: Set<Element> }> = []

  class ManualIntersectionObserver implements IntersectionObserver {
    readonly root: Element | Document | null
    readonly rootMargin: string
    readonly scrollMargin: string
    readonly thresholds: ReadonlyArray<number>
    private readonly targets = new Set<Element>()

    constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit = {}) {
      this.root = options.root ?? null
      this.rootMargin = options.rootMargin ?? '0px'
      this.scrollMargin = '0px'
      this.thresholds = Array.isArray(options.threshold) ? options.threshold : [options.threshold ?? 0]
      observers.push({ root: this.root, callback, targets: this.targets })
    }

    observe(target: Element) { this.targets.add(target) }
    unobserve(target: Element) { this.targets.delete(target) }
    disconnect() { this.targets.clear() }
    takeRecords(): IntersectionObserverEntry[] { return [] }
  }

  globalThis.IntersectionObserver = ManualIntersectionObserver

  return {
    intersect(target: Element) {
      for (const observer of observers) {
        if (!observer.targets.has(target)) continue
        const entry = {
          target,
          isIntersecting: true,
          intersectionRatio: 1,
          time: 0,
          boundingClientRect: target.getBoundingClientRect(),
          intersectionRect: target.getBoundingClientRect(),
          rootBounds: null,
        } as IntersectionObserverEntry
        observer.callback([entry], {} as IntersectionObserver)
      }
    },
    rootFor(target: Element) {
      return observers.find((observer) => observer.targets.has(target))?.root ?? null
    },
    isObserved(target: Element) {
      return observers.some((observer) => observer.targets.has(target))
    },
    reset() {
      window.scrollTo = originalScrollTo
      if (original) globalThis.IntersectionObserver = original
      else Reflect.deleteProperty(globalThis, 'IntersectionObserver')
      observers.length = 0
    },
  }
}
