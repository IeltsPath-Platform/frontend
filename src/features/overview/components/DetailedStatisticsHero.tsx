import owl from '../assets/detailed-hero-owl.png'
import stars from '../assets/detailed-hero-stars.png'
import planet from '../assets/detailed-hero-planet.png'

export function DetailedStatisticsHero() {
  return <header className="detailed-hero">
    <div className="detailed-hero-mascot"><img src={owl} alt="" width="236" height="236" /></div>
    <div className="detailed-hero-copy">
      <h1>Cùng xem lại dữ liệu chi tiết của bạn nhé!</h1>
      <p>Mỗi bước học tập đều được ghi lại trên hành trình chinh phục IELTS.</p>
    </div>
    <img className="detailed-hero-stars" src={stars} alt="" />
    <img className="detailed-hero-planet" src={planet} alt="" width="181" height="181" />
  </header>
}
