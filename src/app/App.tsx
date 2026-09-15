import type { FC } from 'react'
import './app.css'

const App: FC = () => (
  <>
    <a className="skip-link" href="#main-content">
      Skip to main content
    </a>
    <main className="app-shell" id="main-content" tabIndex={-1}>
      <div className="app-shell__content">
        <p className="app-shell__eyebrow">Web foundation</p>
        <h1>Web project scaffold</h1>
        <p className="app-shell__description">
          The application foundation is ready for the first feature.
        </p>
      </div>
    </main>
  </>
)

export default App
