import { useState } from 'react'
import type { ActivationProduct } from '@/features/home/pricingData'
import { KeyActivationDialog } from '@/features/home/components/KeyActivationDialog'
import { useWritingWallet } from '../writing/useWritingWallet'
import { PremiumPlansDialog } from './PremiumPlansDialog'

export function PremiumUpgradeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const wallet = useWritingWallet()
  const [keyProduct, setKeyProduct] = useState<ActivationProduct | null>(null)
  return <>
    <PremiumPlansDialog open={open} onClose={onClose}
      onChoose={(product) => { onClose(); setKeyProduct(product) }} />
    <KeyActivationDialog product={keyProduct} isLoggedIn={wallet.isLoggedIn} client={wallet.client}
      onClose={() => setKeyProduct(null)} onActivated={wallet.onActivated} returnFocus={() => undefined} />
  </>
}
