import { useEffect } from 'react'

const REVEAL_SELECTOR = '[data-home-reveal]'

export function useHomeScrollReveal() {
  useEffect(() => {
    const page = document.querySelector<HTMLElement>('.home-page')
    const revealElements = Array.from(document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR))
    if (!page || revealElements.length === 0) return

    page.classList.add('home-reveal-enabled')

    const revealAll = () => revealElements.forEach((element) => element.classList.add('is-visible'))
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      revealAll()
      return () => page.classList.remove('home-reveal-enabled')
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      })
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 })

    const observeElements = () => {
      document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach((element) => {
        if (!element.classList.contains('is-visible')) {
          observer.observe(element)
        }
      })
    }

    observeElements()

    const mutationObserver = new MutationObserver(() => observeElements())
    mutationObserver.observe(page, { childList: true, subtree: true })

    return () => {
      mutationObserver.disconnect()
      observer.disconnect()
      page.classList.remove('home-reveal-enabled')
    }
  }, [])
}
