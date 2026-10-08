import { BookOpenCheck, Building2, Camera, ExternalLink, Mail, MapPin, MessageCircle, Music2, Phone, Video } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BRAND_LOGO_URL } from './brandLogo'
import './SiteFooter.css'

const MAP_URL = 'https://www.google.com/maps/search/?api=1&query=257+Gi%E1%BA%A3i+Ph%C3%B3ng%2C+B%E1%BA%A1ch+Mai%2C+H%C3%A0+N%E1%BB%99i'

export function SiteFooter() {
  return (
    <footer className="site-footer" aria-labelledby="site-footer-title">
      <div className="site-footer-shell">
        <section className="site-footer-contact" aria-labelledby="site-footer-contact-title">
          <div className="site-footer-brand">
            <img src={BRAND_LOGO_URL} alt="The IELTS Space" width="175" height="74" loading="lazy" decoding="async" />
            <span aria-hidden="true" />
            <strong id="site-footer-title">THE IELTS SPACE - KHÔNG GIAN HỌC TẬP TÍCH HỢP THẾ HỆ MỚI</strong>
          </div>
          <h2 id="site-footer-contact-title">THÔNG TIN LIÊN HỆ</h2>
          <a className="site-footer-map" href={MAP_URL} target="_blank" rel="noreferrer" aria-label="Mở vị trí The IELTS Space trên Google Maps">
            <span className="site-footer-map-grid" aria-hidden="true" />
            <span className="site-footer-map-marker"><MapPin aria-hidden="true" /><strong>The IELTS Space</strong></span>
            <span className="site-footer-map-link">Mở trong Maps <ExternalLink aria-hidden="true" /></span>
          </a>
          <address className="site-footer-address">
            <span><MapPin aria-hidden="true" />Tòa Nhà Hoà Phát, 257 Giải Phóng, Bạch Mai, Hà Nội</span>
            <a href="mailto:theenglishspace01@gmail.com"><Mail aria-hidden="true" />theenglishspace01@gmail.com</a>
            <a href="tel:0888861786"><Phone aria-hidden="true" />0888.861.786</a>
          </address>
        </section>

        <div className="site-footer-column">
          <section aria-labelledby="site-footer-about-title">
            <h2 id="site-footer-about-title">VỀ THE IELTS SPACE</h2>
            <nav aria-label="Thông tin về IELTS Space">
              <Link to="/home#home-intro">Giới thiệu</Link>
              <Link to="/practice-tests">Khóa học</Link>
            </nav>
          </section>
          <section aria-labelledby="site-footer-social-title">
            <h2 id="site-footer-social-title">KẾT NỐI VỚI THE IELTS SPACE</h2>
            <div className="site-footer-socials" aria-label="Các kênh mạng xã hội">
              <span className="is-facebook" role="img" aria-label="Facebook"><MessageCircle aria-hidden="true" /></span>
              <span className="is-tiktok" role="img" aria-label="TikTok"><Music2 aria-hidden="true" /></span>
              <span className="is-instagram" role="img" aria-label="Instagram"><Camera aria-hidden="true" /></span>
              <span className="is-youtube" role="img" aria-label="YouTube"><Video aria-hidden="true" /></span>
            </div>
          </section>
        </div>

        <div className="site-footer-column">
          <section aria-labelledby="site-footer-support-title">
            <h2 id="site-footer-support-title">TRUNG TÂM HỖ TRỢ</h2>
            <nav aria-label="Thông tin hỗ trợ và chính sách">
              <Link to="/terms">Điều khoản sử dụng</Link>
              <Link to="/privacy">Chính sách bảo mật</Link>
              <Link to="/copyright">Chính sách bản quyền</Link>
            </nav>
          </section>
          <section aria-labelledby="site-footer-legal-title">
            <h2 id="site-footer-legal-title">THÔNG TIN PHÁP LÝ</h2>
            <p><Building2 aria-hidden="true" />CÔNG TY CỔ PHẦN GD&amp;ĐT The Space</p>
            <p>Mã số thuế: 0110883975</p>
          </section>
        </div>
      </div>

      <a className="site-footer-consultation" href="tel:0888861786">
        <MessageCircle aria-hidden="true" /><span>Tư vấn miễn phí</span>
      </a>

      <div className="site-footer-bottom"><BookOpenCheck aria-hidden="true" /><span>© {new Date().getFullYear()} The IELTS Space. All rights reserved.</span></div>
    </footer>
  )
}
