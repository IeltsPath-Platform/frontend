import rocketOwl from '@/assets/owl/hero-rocket.webp'
import './CommunityOwlBanner.css'

/** The owl riding its rocket through the night sky, drifting and twinkling above the welcome card. */
export function CommunityOwlBanner() {
  return (
    <div aria-hidden="true" className="community-owl-banner">
      <img alt="" className="community-owl-banner__art" decoding="async" draggable={false} src={rocketOwl} />
      <span className="community-owl-banner__flame" />
      <span className="community-owl-banner__star community-owl-banner__star--a" />
      <span className="community-owl-banner__star community-owl-banner__star--b" />
      <span className="community-owl-banner__star community-owl-banner__star--c" />
      <span className="community-owl-banner__shine" />
    </div>
  )
}
