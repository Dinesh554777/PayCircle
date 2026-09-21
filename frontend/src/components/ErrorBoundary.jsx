import { Component } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("[PayCircle] An unexpected error occurred:", error, info);
  }

  componentDidUpdate(prevProps) {
    if (this.props.resetKey !== prevProps.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="error-state"
          style={{
            minHeight: "60vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            textAlign: "center",
          }}
          role="alert"
        >
          <AlertTriangle
            aria-hidden="true"
            style={{ width: 32, height: 32, color: "var(--danger)" }}
          />
          <div className="error-title">Something went wrong</div>
          <div className="error-text">
            This section hit an unexpected error. Try again, or reload the page.
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={this.handleRetry}
            style={{ marginTop: "0.5rem" }}
          >
            <RotateCcw aria-hidden="true" style={{ marginRight: "0.5rem" }} />
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}