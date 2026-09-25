import heroMascotImage from "@/assets/ielts-hero-mascot.jpg"

export function InteractiveHeroMascot() {
  return (
    <div className="hero-interactive-scene" aria-hidden="true">
      <div className="hero-mascot-scene">
        {/* Razor-sharp 3D Mascot Image */}
        <img
          src={heroMascotImage}
          alt="Mascot chú khủng long 3D học IELTS tại phòng học chuẩn máy"
          className="hero-bg-image"
          fetchPriority="high"
          loading="eager"
          decoding="async"
        />

        {/* Ambient Warm Tablet Glow on Wooden Desk */}
        <div className="dino-tablet-glow" />
      </div>

      {/* Directional gradient overlay on the left for text contrast, leaving the mascot 100% crisp and unwashed */}
      <div className="hero-bg-overlay" />
    </div>
  )
}
