"use client";

import React from "react";

type State = { hasError: boolean };

// Root error boundary. If anything inside throws (GSAP exception, RAF crash,
// React render error), we catch it and show a graceful fallback instead of
// the page going blank.
export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("Caught by ErrorBoundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            background: "var(--background)",
            color: "var(--foreground)",
            fontFamily: "var(--font-text)",
          }}
        >
          <div style={{ maxWidth: 480 }}>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 56,
                fontWeight: 500,
                lineHeight: 1,
                letterSpacing: "-0.02em",
                marginBottom: 24,
              }}
            >
              Something broke.
            </div>
            <p
              style={{
                color: "var(--body)",
                fontSize: 16,
                lineHeight: "20px",
                letterSpacing: "-0.16px",
                marginBottom: 24,
              }}
            >
              The page hit an unexpected error. Try reloading; if the issue
              persists, get in touch at hello@ezravale.com.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 20,
                fontWeight: 500,
                background: "transparent",
                border: 0,
                padding: 0,
                color: "var(--foreground)",
                cursor: "pointer",
              }}
            >
              Reload ↻
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
