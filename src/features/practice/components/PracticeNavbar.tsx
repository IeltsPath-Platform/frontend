import type { FC } from 'react'
import { SiteNavbar } from '@/components/SiteNavbar'

// The shared navbar derives its active state from the URL.
export const PracticeNavbar: FC<{
  activeTab?: 'overview' | 'classroom' | 'practice' | 'vocabulary' | 'materials'
}> = () => {
  return <SiteNavbar />
}
