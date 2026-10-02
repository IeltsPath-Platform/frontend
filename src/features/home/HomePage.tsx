import { useCallback, useEffect, useRef, useState } from 'react'
import { Gem, KeyRound } from 'lucide-react'
import { SiteNavbar } from '@/components/SiteNavbar'
import { useAuthSession } from '@/features/auth/authSession'
import { HomeHeroSection } from './components/HomeHeroSection'
import { HomeIntroductionSection } from './components/HomeIntroductionSection'
import { LearningOrbitSection } from './components/LearningOrbitSection'
import { PricingCards } from './components/PricingCards'
import { KeyActivationDialog } from './components/KeyActivationDialog'
import { LearnerFeedbackCarousel } from './components/LearnerFeedbackCarousel'
import { QualityCommitmentSection } from './components/QualityCommitmentSection'
import { TeacherSection } from './components/TeacherSection'
import type { AccessClient, Subscription } from './accessApi'
import type { ActivationProduct } from './pricingData'
import { useHomeScrollReveal } from './useHomeScrollReveal'
import './home.css'

interface HomePageProps {
  accessClient?: AccessClient
}

type AccessResult =
  | { client: AccessClient; refresh: number; status: 'ready'; subscription: Subscription | null; error?: undefined }
  | { client: AccessClient; refresh: number; status: 'error'; subscription: null; error: string }

type AccessState =
  | { status: 'idle' | 'loading' | 'unavailable'; subscription: null; error?: undefined }
  | Pick<AccessResult, 'status' | 'subscription' | 'error'>

export function HomePage({ accessClient }: HomePageProps) {
  useHomeScrollReveal()
  const { isLoggedIn } = useAuthSession()
  const [activationProduct, setActivationProduct] = useState<ActivationProduct | null>(null)
  const [accessResult, setAccessResult] = useState<AccessResult | null>(null)
  const [accessRefresh, setAccessRefresh] = useState(0)
  const activationTrigger = useRef<HTMLElement | null>(null)
  const accessState: AccessState = !isLoggedIn
    ? { status: 'idle', subscription: null }
    : !accessClient
      ? { status: 'unavailable', subscription: null }
      : accessResult?.client === accessClient && accessResult.refresh === accessRefresh
        ? accessResult
        : { status: 'loading', subscription: null }

  useEffect(() => {
    if (!isLoggedIn || !accessClient) return

    const controller = new AbortController()
    accessClient.getSubscription(controller.signal).then((subscription) => {
      setAccessResult({ client: accessClient, refresh: accessRefresh, status: 'ready', subscription })
    }).catch((cause: unknown) => {
      if (cause instanceof DOMException && cause.name === 'AbortError') return
      setAccessResult({
        client: accessClient,
        refresh: accessRefresh,
        status: 'error',
        subscription: null,
        error: cause instanceof Error ? cause.message : 'Chưa thể tải thông tin gói hiện tại.',
      })
    })
    return () => controller.abort()
  }, [accessClient, accessRefresh, isLoggedIn])

  const openActivation = useCallback((product: ActivationProduct): void => {
    activationTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setActivationProduct(product)
  }, [])

  const handleActivated = useCallback((): void => {
    setAccessRefresh((value) => value + 1)
  }, [])

  return (
    <div className="home-page">
      <a className="skip-link" href="#home-main">Chuyển đến nội dung chính</a>
      <SiteNavbar />
      <main id="home-main" tabIndex={-1} className="home-main">
        <HomeHeroSection />
        <HomeIntroductionSection />
        <LearningOrbitSection />
        <QualityCommitmentSection />
        <TeacherSection />
        <LearnerFeedbackCarousel />

        <section id="home-pricing" className="home-pricing home-section" aria-labelledby="home-pricing-title">
          <div className="home-section-shell">
            <header className="home-display-heading home-pricing-heading">
              <span className="home-heading-icon"><Gem aria-hidden="true" /></span>
              <div><h2 id="home-pricing-title">BẢNG GÓI DỊCH VỤ <span>&amp; KÍCH HOẠT MÃ</span></h2><p><KeyRound aria-hidden="true" /> Chọn Premium hoặc thẻ Point phù hợp rồi nhập Activation Key được cấp.</p></div>
            </header>
            <PricingCards
              isLoggedIn={isLoggedIn}
              subscription={accessState.subscription}
              accessStatus={accessState.status}
              accessError={accessState.error}
              onRetryAccess={() => setAccessRefresh((value) => value + 1)}
              onActivate={openActivation}
            />
          </div>
        </section>
      </main>
      <KeyActivationDialog
        key={activationProduct?.code ?? 'closed'}
        product={activationProduct}
        isLoggedIn={isLoggedIn}
        client={accessClient}
        onClose={() => setActivationProduct(null)}
        onActivated={handleActivated}
        returnFocus={() => activationTrigger.current?.focus()}
      />
    </div>
  )
}
