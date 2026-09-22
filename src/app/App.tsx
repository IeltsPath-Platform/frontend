import "./app.css"
import { ErrorBoundary } from "@/components/common/ErrorBoundary"
import { AppProvider } from "@/app/provider"
import { AppRouter } from "@/app/router"

const App = () => (
  <ErrorBoundary>
    <AppProvider>
      <AppRouter />
    </AppProvider>
  </ErrorBoundary>
)

export default App
