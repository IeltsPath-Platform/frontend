import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false }

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Overview page failed to render.', error, errorInfo)
  }

  private handleReset = (): void => {
    this.setState({ hasError: false })
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-dvh items-center justify-center bg-[var(--classroom-canvas)] p-6 text-center text-[var(--classroom-text)]">
          <section aria-labelledby="page-error-heading" className="max-w-md rounded-3xl bg-[var(--classroom-surface)] p-8 shadow-[var(--classroom-shadow)]">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--classroom-primary)]">IeltsPath</p>
            <h1 id="page-error-heading" className="text-2xl font-bold">Không thể tải trang tổng quan</h1>
            <p className="mt-3 text-[var(--classroom-text-muted)]">Hãy thử tải lại nội dung để tiếp tục việc học của bạn.</p>
            <button className="mt-6 min-h-11 rounded-xl bg-[var(--classroom-primary)] px-5 font-semibold text-white transition hover:bg-[var(--classroom-primary-strong)]" onClick={this.handleReset} type="button">
              Thử lại
            </button>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}
