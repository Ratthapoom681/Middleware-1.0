import { Component, type ErrorInfo, type ReactNode } from "react";
import { captureClientError } from "../../services/ops.service";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    void captureClientError({
      message: error.message,
      stack: error.stack,
      details: { componentStack: info.componentStack },
    });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="page-shell">
          <div className="panel app-error-boundary">
            <p className="page-eyebrow">Error Visibility</p>
            <h1 className="page-title">Something went wrong</h1>
            <p className="page-subtitle">
              The frontend error was captured for review in the Logs page.
            </p>
            <button className="button button--primary" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
