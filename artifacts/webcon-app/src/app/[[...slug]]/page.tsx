"use client";

import dynamic from "next/dynamic";
import { Component, type ReactNode } from "react";

const App = dynamic(() => import("@/App"), { ssr: false });

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: "2rem",
            fontFamily: "monospace",
            background: "#1a1a1a",
            color: "#ff4444",
            minHeight: "100vh",
          }}
        >
          <h2 style={{ marginBottom: "1rem" }}>App Error</h2>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: "0.85rem" }}>
            {this.state.error.message}
            {"\n\n"}
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Page() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
