import { Component, type ReactNode } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="error-state" id="main-content" tabIndex={-1}>
          <AlertTriangle aria-hidden="true" size={32} />
          <h1>Không thể tải không gian học tập</h1>
          <p>Hãy thử tải lại trang. Dữ liệu bài làm của bạn sẽ không bị thay đổi.</p>
          <Button onClick={() => window.location.reload()} size="lg">
            <RefreshCw aria-hidden="true" /> Tải lại
          </Button>
        </main>
      )
    }

    return this.props.children
  }
}
