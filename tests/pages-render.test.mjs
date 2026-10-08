import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { existsSync, readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'

let server
before(async () => {
  server = await createServer({ envDir: false, define: { 'import.meta.env.VITE_OAUTH_ENABLED': '"false"' }, server: { middlewareMode: true }, appType: 'custom' })
})
after(async () => { await server?.close() })

async function render(modulePath, name, props, path) {
  const module = await server.ssrLoadModule(modulePath)
  return renderToString(createElement(MemoryRouter, { initialEntries: [path] }, createElement(module[name], props)))
}

test('Home preserves the learning journey hero and renders the complete landing page with activation', async () => {
  const html = await render('/src/features/home/HomePage.tsx', 'HomePage', {}, '/home')
  for (const id of ['home-hero', 'home-intro', 'home-features', 'home-quality', 'home-mentors', 'home-pricing']) assert.ok(html.includes(`id="${id}"`))
  assert.match(html, /aria-current="page"[^>]*href="\/home"/)
  assert.ok(html.indexOf('aria-current="page"') < html.indexOf('href="/learn"'))
  assert.match(html, /Premium 30 Ngày/)
  assert.match(html, /Premium 90 Ngày/)
  assert.match(html, /Phổ biến nhất/)
  assert.match(html, /Thẻ Point 50/)
  assert.match(html, /Kích hoạt bằng Mã Key/)
  assert.match(html, /Gói Premium/)
  assert.match(html, /Thẻ nạp Point/)
  assert.match(html, /Gói FREE mặc định/)
  assert.match(html, /Khi gói chuyển sang EXPIRED/)
  assert.equal((html.match(/<article class="[^"]*home-combined-card(?=\s|")/g) || []).length, 2)
  assert.equal((html.match(/home-card-activation-button/g) || []).length, 2)
  assert.match(html, /<input(?=[^>]*name="premium-product")(?=[^>]*value="PREMIUM_90D")(?=[^>]*checked)[^>]*>/)
  assert.match(html, /<input(?=[^>]*name="point-product")(?=[^>]*value="POINT_100")(?=[^>]*checked)[^>]*>/)
  assert.doesNotMatch(html, /Mua ngay|Gói minh họa|giá minh họa|So sánh FREE và PREMIUM|home-plan-table/)
  for (const content of [
    'THE IELTS SPACE',
    'TỐI ƯU HÀNH TRÌNH HỌC',
    'HỌC THÍCH ỨNG AI - DEEPTUTOR CORE',
    'LẤY CHẤT LƯỢNG LÀM GIÁ TRỊ CỐT LÕI',
    '150\\+ GIẢNG VIÊN',
    'THẠC SĨ LINH PHƯƠNG',
    'Hành trình thật. Kết quả thật.',
    'BẢNG GÓI DỊCH VỤ',
  ]) assert.match(html, new RegExp(content))
  assert.match(html, /pv-hocba\.B5Z0mx97\.png/)
  assert.match(html, /img-gv-2\.DZIRbuF_\.webp/)
  assert.match(html, /Mỗi ngày một bước/)
  assert.match(html, /home-hero-shell/)
  assert.ok((html.match(/data-home-reveal="true"/g) || []).length >= 12)
  assert.match(html, /triceratops-class-mascot/)
  assert.doesNotMatch(html, /YOUR IELTS SPACE/)
})

test('Learner feedback duplicates cards for a continuous right-to-left marquee with pause controls', async () => {
  const html = await render('/src/features/home/components/LearnerFeedbackCarousel.tsx', 'LearnerFeedbackCarousel', {}, '/home')
  const styles = readFileSync(new URL('../src/features/home/components/LearnerFeedbackCarousel.css', import.meta.url), 'utf8')

  for (const learner of ['THU HÀ', 'MINH ANH', 'ĐẮC HƯNG']) {
    assert.equal((html.match(new RegExp(`<h3>${learner}</h3>`, 'g')) || []).length, 2)
  }
  assert.equal((html.match(/role="listitem"/g) || []).length, 6)
  assert.match(html, /Tạm dừng/)
  assert.match(html, /7\.0 IELTS/)
  assert.match(html, /5\.5 IELTS/)
  assert.match(styles, /@keyframes learner-feedback-marquee/)
  assert.match(styles, /translateX\(-50%\)/)
  assert.match(styles, /:hover \.learner-feedback-track/)
  assert.match(styles, /animation-play-state:\s*paused/)
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/)
})

test('Pricing cards show authoritative Premium status without guessing a 30/90-day activation product', async () => {
  const subscription = {
    id: 'subscription-id',
    userId: 'user-id',
    planId: 'plan-id',
    planCode: 'PREMIUM',
    planName: 'Premium',
    status: 'ACTIVE',
    startsAt: '2026-10-01T00:00:00Z',
    endsAt: '2099-12-31T00:00:00Z',
    humanGradingCreditsTotal: 12,
    humanGradingCreditsUsed: 3,
    remainingCredits: 9,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  }
  const html = await render('/src/features/home/components/PricingCards.tsx', 'PricingCards', {
    isLoggedIn: true,
    subscription,
    accessStatus: 'ready',
    onRetryAccess() {},
    onActivate() {},
  }, '/home')

  assert.match(html, /Đang sử dụng/)
  assert.match(html, /9(?:<!-- -->)? lượt chấm giáo viên còn lại/)
  assert.match(html, /Premium 30 Ngày/)
  assert.match(html, /Premium 90 Ngày/)
  assert.equal((html.match(/<article class="[^"]*home-combined-card(?=\s|")/g) || []).length, 2)
  assert.equal((html.match(/home-card-activation-button/g) || []).length, 2)
  assert.equal((html.match(/Đang sử dụng/g) || []).length, 1)
})

test('UserTierDropdown is store-free and renders reusable Free and Premium states', async () => {
  const freeHtml = await render('/src/components/UserTierDropdown.tsx', 'UserTierDropdown', { tier: 'FREE', points: 1200, userName: 'Nguyễn Hà' }, '/home')
  assert.match(freeHtml, /Nguyễn Hà/)
  assert.match(freeHtml, /1\.200 Points/)
  assert.match(freeHtml, /Chuyển sang Premium \(demo\)/)

  const premiumHtml = await render('/src/components/UserTierDropdown.tsx', 'UserTierDropdown', { tier: 'PREMIUM', userName: 'Minh Anh' }, '/home')
  assert.match(premiumHtml, /Premium learner/)
  assert.match(premiumHtml, /Chuyển sang Free \(demo\)/)

  const source = readFileSync(new URL('../src/components/UserTierDropdown.tsx', import.meta.url), 'utf8')
  const styles = readFileSync(new URL('../src/components/UserTierDropdown.module.css', import.meta.url), 'utf8')
  assert.match(source, /useState<UserTier>\(defaultTier\)/)
  assert.match(source, /onToggleTier\?\.\(nextTier\)/)
  assert.doesNotMatch(source, /zustand|useAuthStore|react-router-dom/)
  for (const animation of ['premium-ring-spin', 'sparkle-orbit-1', 'sparkle-orbit-2', 'sparkle-orbit-3', 'halo-glow-breath', 'free-points-pulse']) assert.ok(styles.includes(animation))
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/)
})

test('Shared navbar swaps the guest menu for member sections after sign-in', async () => {
  const renderNavbar = (props, path) => render('/src/components/SiteNavbar.tsx', 'SiteNavbar', props, path)
  const guest = { isLoggedIn: false }
  const member = { isLoggedIn: true, userName: 'Minh Anh' }

  const guestHome = await renderNavbar(guest, '/home')
  for (const label of ['Trang chủ', 'Khóa học Intensive 7.0', 'Luyện tập 4 kỹ năng', 'Bài mẫu Writing 8.0+', 'Kết quả học viên', 'Đăng nhập', 'Đăng ký']) assert.match(guestHome, new RegExp(label))
  for (const label of ['Dashboard', 'Lịch sử nộp bài', 'Khóa học của tôi', 'Sổ từ vựng', 'Flashcard của tôi', '0 Points', 'Đăng xuất']) assert.doesNotMatch(guestHome, new RegExp(label))
  assert.doesNotMatch(guestHome, /site-subnav/)

  // The second row lists the sections of whichever primary item owns the route.
  const guestCourses = await renderNavbar(guest, '/learn')
  assert.match(guestCourses, /Test đầu vào 4 kỹ năng FREE/)
  const guestPractice = await renderNavbar(guest, '/practice-tests?skill=writing')
  for (const skill of ['listening', 'reading', 'writing', 'speaking']) assert.match(guestPractice, new RegExp(`href="/practice-tests[?]skill=${skill}"`))
  assert.match(guestPractice, /aria-current="page"[^>]*href="\/practice-tests\?skill=writing"|class="active"[^>]*aria-current="page"[^>]*href="\/practice-tests\?skill=writing"/)

  const memberHome = await renderNavbar(member, '/home')
  for (const label of ['Sổ từ vựng', 'Kết quả học viên', 'Minh Anh', '0 Points', 'Đăng xuất']) assert.match(memberHome, new RegExp(label))
  assert.doesNotMatch(memberHome, /Bài mẫu Writing 8\.0\+|Đăng nhập|Đăng ký|>Overview</)
  const memberDashboard = await renderNavbar(member, '/overview')
  for (const label of ['Dashboard', 'Lịch sử nộp bài', 'Khóa học của tôi']) assert.match(memberDashboard, new RegExp(label))
  assert.match(memberDashboard, /class="active"[^>]*href="\/home"/)
  const memberVocabulary = await renderNavbar(member, '/vocabulary')
  for (const label of ['Flashcard của tôi', 'Kho từ vựng', 'Bài mẫu 8đ']) assert.match(memberVocabulary, new RegExp(label))
})

test('Auth routes hide guest account links while retaining public navigation', async () => {
  for (const path of ['/login', '/register', '/login/', '/register?from=home']) {
    const html = await render('/src/components/SiteNavbar.tsx', 'SiteNavbar', { isLoggedIn: false }, path)
    assert.doesNotMatch(html, /Đăng nhập|Đăng ký|Đăng xuất/)
    assert.match(html, /href="\/home"/)
    assert.match(html, /href="\/learn"/)
  }
})

test('ClassMascot packages the image, floating orbit and twinkle motion independently', async () => {
  const html = await render('/src/components/ClassMascot.tsx', 'ClassMascot', { size: 'lg' }, '/home')
  const source = readFileSync(new URL('../src/components/ClassMascot.tsx', import.meta.url), 'utf8')
  const styles = readFileSync(new URL('../src/components/ClassMascot.module.css', import.meta.url), 'utf8')

  assert.match(html, /triceratops-class-mascot/)
  assert.match(source, /imageSrc = defaultMascotImage/)
  assert.ok(existsSync(new URL('../src/assets/triceratops-class-mascot.png', import.meta.url)))
  for (const animation of ['cls-float', 'cls-orbit', 'cls-twinkle']) assert.ok(styles.includes(animation))
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/)
})

test('ClassProgressPanel preserves the supplied cls-panel structure and adapts only its theme colors', async () => {
  const defaultHtml = await render('/src/components/ClassProgressPanel.tsx', 'ClassProgressPanel', {}, '/classroom')
  assert.match(defaultHtml, /class="cls-panel"/)
  assert.match(defaultHtml, /class="cls-course"/)
  assert.match(defaultHtml, /class="cls-panel__grid"/)
  assert.match(defaultHtml, /IELTS Cất cánh/)
  assert.match(defaultHtml, /Tiến độ cá nhân/)
  assert.match(defaultHtml, /class="cls-stat cls-stat--featured"/)
  assert.match(defaultHtml, /37\.5/)

  const customHtml = await render('/src/components/ClassProgressPanel.tsx', 'ClassProgressPanel', {
    course: { name: 'Academic Writing', sessionsDone: 3, sessionsTotal: 4 },
    stats: { homeworkScore: { note: 'Đúng tiến độ', value: 75 } },
    surface: 'light',
  }, '/classroom')
  assert.match(customHtml, /Academic Writing/)
  assert.match(customHtml, /75%/)
  assert.match(customHtml, /Đúng tiến độ/)

  const source = readFileSync(new URL('../src/components/ClassProgressPanel.tsx', import.meta.url), 'utf8')
  const styles = readFileSync(new URL('../src/components/ClassProgressPanel.css', import.meta.url), 'utf8')
  assert.match(source, /function StatBar/)
  assert.match(source, /function StatCard/)
  for (const className of ['cls-panel', 'cls-course__head', 'cls-stat__bar', 'cls-stat__disc']) assert.ok(source.includes(className))
  for (const token of ['var(--primary', 'var(--accent', 'var(--card', 'var(--muted-foreground', 'var(--border']) assert.ok(styles.includes(token))
  assert.doesNotMatch(styles, /--cls-600|--cls-550|--cls-accent|#d1530a|#ffb524/i)
  assert.match(styles, /\.cls-panel--dark[\s\S]*?background/)
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/)
})

test('exam renders a tool-free three-column workspace', async () => {
  const html = await render('/src/features/practice/pages/PracticeTestPage.tsx', 'PracticeTestPage', { mode: 'exam', onExit() {} }, '/practice/test/snow-makers?mode=exam')
  assert.match(html, />Thi thử</)
  assert.match(html, /Bản đồ câu hỏi/)
  assert.match(html, /Tiến độ/)
  assert.match(html, /<progress[^>]*value="0"[^>]*max="100"[^>]*aria-valuenow="0"/)
  assert.match(html, />Back</)
  assert.match(html, />Next</)
  assert.match(html, /question-map-navigation/)
  assert.doesNotMatch(html, />Đã trả lời</)
  assert.doesNotMatch(html, />Cần xem lại</)
  assert.doesNotMatch(html, /workspace-parallax-orb/)
  assert.doesNotMatch(html, /data-scroll-parallax/)
  assert.match(
    html,
    /class="active-question-card is-current single-question-view question-transition-enter question-transition-forward"/,
  )
  assert.doesNotMatch(html, /class="question-match-row is-current single-question-view"/)
  assert.doesNotMatch(html, />Highlight<|>Note<|>Tra từ vựng<|>Tạo Flashcard<|>Thẻ đã lưu<|>Công cụ hỗ trợ/)
  assert.doesNotMatch(html, /aria-label="Ghi chú nổi"/)
  assert.doesNotMatch(html, /passage-context-menu/)
  assert.equal((html.match(/role="combobox"/g) || []).length, 1)
})

test('practice renders all learning tools and floating notes', async () => {
  const html = await render('/src/features/practice/pages/PracticeTestPage.tsx', 'PracticeTestPage', { mode: 'practice', onExit() {} }, '/practice/test/snow-makers?mode=practice')
  for (const label of ['Highlight', 'Note', 'Tra từ vựng', 'Tạo Flashcard', 'Thẻ đã lưu']) assert.ok(html.includes(label))
  assert.match(html, /aria-label="Ghi chú nổi"/)
  assert.doesNotMatch(html, /screen4-note-drawer/)
  assert.equal((html.match(/role="combobox"/g) || []).length, 1)
})

test('Progress bar is native, determinate, and keeps text and ARIA percentage in sync', async () => {
  const html = await render('/src/features/practice/components/PracticeProgressBar.tsx', 'PracticeProgressBar', { completed: 3, total: 5 }, '/practice/test/snow-makers')
  assert.match(html, /<progress[^>]*value="60"[^>]*max="100"[^>]*aria-valuenow="60"[^>]*aria-valuetext="Đã làm 3 trên 5 câu, 60%"/)
  assert.match(html, /3\/5 câu · 60%/)

  const styles = readFileSync(new URL('../src/features/practice/workspace.css', import.meta.url), 'utf8')
  assert.match(styles, /\.practice-progress-bar::-webkit-progress-bar/)
  assert.match(styles, /\.practice-progress-bar::-webkit-progress-value[\s\S]*?transition:\s*width/)
  assert.match(styles, /\.practice-progress-bar::-moz-progress-bar/)
  assert.doesNotMatch(styles, /practice-progress-track|practice-progress-value/)
})

test('Home and workspace motion use performant directional transitions with a reduced-motion fallback', () => {
  const homeStyles = readFileSync(new URL('../src/features/home/home.css', import.meta.url), 'utf8')
  const homeRevealSource = readFileSync(new URL('../src/features/home/useHomeScrollReveal.ts', import.meta.url), 'utf8')
  const homeHeroSource = readFileSync(new URL('../src/features/home/components/HomeHeroSection.tsx', import.meta.url), 'utf8')
  const workspaceStyles = readFileSync(new URL('../src/features/practice/workspace.css', import.meta.url), 'utf8')
  const answersSource = readFileSync(new URL('../src/features/practice/components/PracticeAnswers.tsx', import.meta.url), 'utf8')

  assert.match(homeStyles, /home-fade-up/)
  assert.match(homeStyles, /home-hero-breathe/)
  assert.match(homeStyles, /home-reveal-enabled/)
  assert.match(homeStyles, /\.home-hero-orbit[\s\S]*?left:\s*50%[\s\S]*?transform:\s*translate\(-50%, -50%\)/)
  assert.match(homeStyles, /\.home-orbit-layout\s*\{[\s\S]*?min-height:\s*39rem/)
  assert.match(homeStyles, /\.home-orbit-line\s*\{[\s\S]*?width:\s*58%[\s\S]*?height:\s*48%/)
  assert.match(homeStyles, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(homeHeroSource, /home-hero-journey[\s\S]*home-hero-orbit[\s\S]*home-hero-mascot/)
  assert.match(homeRevealSource, /IntersectionObserver/)
  assert.match(homeRevealSource, /prefers-reduced-motion/)
  assert.match(workspaceStyles, /question-slide-enter-forward/)
  assert.match(workspaceStyles, /question-slide-enter-backward/)
  assert.match(workspaceStyles, /answer-selection-pop/)
  assert.match(workspaceStyles, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(answersSource, /question-transition-\$\{transitionPhase\}/)
  assert.match(answersSource, /question-transition-\$\{transitionDirection\}/)
})

test('Shared footer exposes contact, support and legal information for every route', async () => {
  const html = await render('/src/components/SiteFooter.tsx', 'SiteFooter', {}, '/home')
  const appSource = readFileSync(new URL('../src/app/App.tsx', import.meta.url), 'utf8')

  for (const content of ['THÔNG TIN LIÊN HỆ', 'VỀ THE IELTS SPACE', 'TRUNG TÂM HỖ TRỢ', 'THÔNG TIN PHÁP LÝ', 'Tư vấn miễn phí']) {
    assert.match(html, new RegExp(content))
  }
  assert.match(html, /257 Giải Phóng/)
  assert.match(html, /theenglishspace01@gmail\.com/)
  assert.match(appSource, /<SiteFooter \/>/)
  assert.ok(appSource.indexOf('<SiteFooter />') > appSource.indexOf('</Routes>'))
})

test('Listening keeps a single timed question aligned with the audio controls', async () => {
  const html = await render('/src/features/practice/pages/ListeningPage.tsx', 'ListeningPage', { onExit() {} }, '/practice/listening/student-services-enquiry')
  assert.match(html, /Student services enquiry/)
  assert.match(html, /Tua thời gian bài nghe/)
  assert.equal((html.match(/listening-question-panel/g) || []).length, 1)
  assert.equal((html.match(/type="range"/g) || []).length, 2)
  assert.doesNotMatch(html, /data-scroll-parallax/)
  assert.match(html, /class="active-question-card is-current single-question-view"/)
})

test('Writing provides a split prompt and editor with live writing aids', async () => {
  const html = await render('/src/features/practice/pages/WritingPage.tsx', 'WritingPage', { onExit() {} }, '/practice/writing/transport-trends')
  assert.match(html, /Writing Task 1/)
  assert.match(html, /Phóng to biểu đồ/)
  assert.match(html, /word-counter/)
  assert.match(html, /Còn 150 từ/)
  assert.match(html, /role="timer"/)
  assert.doesNotMatch(html, /data-scroll-parallax/)
})

test('Speaking renders cue, controls and recording feedback without accessing a microphone on SSR', async () => {
  const html = await render('/src/features/practice/pages/SpeakingPage.tsx', 'SpeakingPage', { onExit() {} }, '/practice/speaking/favourite-place')
  assert.match(html, /Describe a place you enjoy visiting/)
  for (const label of ['Start Recording', 'Stop', 'Playback', 'Speaking time']) assert.ok(html.includes(label))
  assert.doesNotMatch(html, /data-scroll-parallax/)
})

test('workspace uses document scroll and keeps desktop side panels sticky without scroll animation', () => {
  const styles = readFileSync(new URL('../src/features/practice/workspace.css', import.meta.url), 'utf8')

  assert.doesNotMatch(styles, /animation-timeline|workspace-content-parallax|data-scroll-parallax/)
  assert.match(styles, /\.practice-workspace-root\s*\{[\s\S]*?display:\s*block;/)
  assert.match(styles, /\.practice-workspace-root \.screen3-body-layout\s*\{[\s\S]*?overflow:\s*visible;/)
  assert.match(styles, /\.workspace-left-column,[\s\S]*?\.practice-workspace-root \.screen3-questions-card\s*\{\s*position:\s*sticky;/)
})

test('Classroom retains its schedule while the guest header limits navigation to public routes', async () => {
  const html = await render('/src/features/classroom/ClassroomPage.tsx', 'ClassroomPage', {}, '/classroom')
  assert.match(html, /LỚP HỌC CỦA TÔI/)
  assert.match(html, /href="\/home"/)
  assert.match(html, /href="\/learn"/)
  assert.doesNotMatch(html, /aria-current="page"[^>]*href="\/classroom"/)
  assert.match(html, /id="schedule"/)
  assert.match(html, /triceratops-class-mascot/)
  assert.match(html, /class="cls-panel cls-panel--dark"/)
})

test('Lesson workspace provides the reference material, quiz and vocabulary views', async () => {
  const materials = await render('/src/features/classroom/pages/LessonWorkspacePage.tsx', 'LessonWorkspacePage', {}, '/lessons/session-02')
  assert.match(materials, /Tài liệu buổi học/)
  assert.match(materials, /Bài 1: Nature &amp; Environment/)
  assert.match(materials, /LESSON RESOURCE/)
  assert.match(materials, /HOMEWORK HUB/)

  const quiz = await render('/src/features/classroom/pages/LessonWorkspacePage.tsx', 'LessonWorkspacePage', {}, '/lessons/session-02?view=quiz')
  assert.match(quiz, /Nghe hội thoại và chọn đáp án đúng/)
  assert.match(quiz, /Bản đồ câu hỏi/)

  const vocabulary = await render('/src/features/classroom/pages/LessonWorkspacePage.tsx', 'LessonWorkspacePage', {}, '/lessons/session-02?view=vocabulary')
  assert.match(vocabulary, /sustainable/)
  assert.match(vocabulary, /Hình ảnh gợi nhớ/)
})

test('Dictionary shares the topic vocabulary and interactive affordances', async () => {
  const html = await render('/src/features/vocabulary/pages/VocabularyPage.tsx', 'VocabularyPage', {}, '/vocabulary')
  assert.match(html, /Từ điển học theo chủ đề/)
  assert.match(html, /Tìm từ, nghĩa hoặc chủ đề/)
  assert.match(html, /Nghe phát âm từ sustainable/)
  assert.match(html, /Lưu từ sustainable/)
})

test('Sign-in form has password-manager semantics and only safe non-submit controls', async () => {
  const html = await render('/src/features/auth/pages/AuthPage.tsx', 'AuthPage', { mode: 'sign-in' }, '/login')
  assert.match(html, /<form[^>]*class="auth-form"/)
  assert.match(html, /<button(?=[^>]*disabled)[^>]*>[\s\S]*?Google \(chưa hỗ trợ\)/)
  assert.doesNotMatch(html, /Continue with Apple/)
  assert.ok(html.indexOf('name="password"') < html.indexOf('type="submit"'))
  assert.ok(html.indexOf('type="submit"') < html.indexOf('hoặc'))
  assert.ok(html.indexOf('hoặc') < html.indexOf('Google (chưa hỗ trợ)'))
  assert.match(html, /<a(?=[^>]*href="\/forgot-password")[^>]*>Quên mật khẩu\?</)
  assert.match(html, /<input(?=[^>]*type="email")(?=[^>]*autoComplete="username")(?=[^>]*autoCapitalize="none")[^>]*>/)
  assert.match(html, /<input(?=[^>]*type="password")(?=[^>]*autoComplete="current-password")[^>]*>/)
  assert.match(html, /<button(?=[^>]*type="button")(?=[^>]*aria-label="Show password")[^>]*>/)
  assert.match(html, /<button(?=[^>]*type="submit")[^>]*>Đăng nhập</)
  assert.match(html, /href="\/register"/)
  assert.match(html, /auth-backdrop/)
  assert.match(html, /auth-floating-icon/)
  assert.match(html, /triceratops-class-mascot/)
  assert.doesNotMatch(html, /auth-brand-panel/)
})

test('Sign-up form uses new-password and retains the same native form structure', async () => {
  const html = await render('/src/features/auth/pages/AuthPage.tsx', 'AuthPage', { mode: 'sign-up' }, '/register')
  assert.match(html, /<form[^>]*class="auth-form"/)
  assert.match(html, /<input(?=[^>]*type="email")(?=[^>]*autoComplete="username")(?=[^>]*autoCapitalize="none")[^>]*>/)
  assert.match(html, /<input(?=[^>]*type="password")(?=[^>]*autoComplete="new-password")[^>]*>/)
  assert.match(html, /<button(?=[^>]*type="submit")[^>]*>Tạo tài khoản</)
  assert.ok(html.indexOf('type="submit"') < html.indexOf('Google (chưa hỗ trợ)'))
  assert.match(html, /name="fullName"/)
  assert.match(html, /<input(?=[^>]*name="confirmPassword")(?=[^>]*autoComplete="new-password")[^>]*>/)
  assert.doesNotMatch(html, /Continue with Apple|Quên mật khẩu/)
  assert.match(html, /href="\/login"/)
})

test('Auth form reads submitted fields through FormData without persisting the password', () => {
  const formSource = readFileSync(new URL('../src/features/auth/components/AuthForm.tsx', import.meta.url), 'utf8')
  assert.match(formSource, /new FormData\(event\.currentTarget\)/)
  assert.match(formSource, /formData\.get\('password'\)/)
  assert.doesNotMatch(formSource, /localStorage|sessionStorage/)
})

test('Auth layout uses transform-only ambient motion and a reduced-motion fallback', () => {
  const shellSource = readFileSync(new URL('../src/features/auth/components/AuthShell.tsx', import.meta.url), 'utf8')
  const styles = readFileSync(new URL('../src/features/auth/auth.css', import.meta.url), 'utf8')
  const sessionSource = readFileSync(new URL('../src/features/auth/authSession.ts', import.meta.url), 'utf8')
  for (const animation of ['auth-float-a', 'auth-float-b', 'auth-float-c', 'auth-float-d']) assert.ok(styles.includes(animation))
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(shellSource, /ClassMascot/)
  assert.match(sessionSource, /useSyncExternalStore/)
  assert.doesNotMatch(sessionSource, /localStorage|sessionStorage/)
})

test('New lesson and dictionary styles preserve motion fallbacks', () => {
  const lessonStyles = readFileSync(new URL('../src/features/classroom/lesson-workspace.css', import.meta.url), 'utf8')
  const vocabularyStyles = readFileSync(new URL('../src/features/vocabulary/vocabulary.css', import.meta.url), 'utf8')

  assert.match(lessonStyles, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(lessonStyles, /transform-origin:\s*left/)
  assert.match(vocabularyStyles, /@media \(prefers-reduced-motion: reduce\)/)
})

test('Overview remains separate from Classroom', async () => {
  const html = await render('/src/features/overview/pages/OverviewPage.tsx', 'OverviewPage', {}, '/overview')
  assert.match(html, /Dữ Liệu Học Tổng Quan/)
  assert.doesNotMatch(html, /LỚP HỌC CỦA TÔI/)
  assert.doesNotMatch(html, /aria-current="page"[^>]*href="\/overview"/)
  assert.match(html, /href="\/learn"/)
})
