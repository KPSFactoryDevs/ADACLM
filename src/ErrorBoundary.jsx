// src/ErrorBoundary.jsx
import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error){ return { hasError: true, error }; }
  componentDidCatch(error, info){ console.error("[ErrorBoundary]", error, info); }
  render(){
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <h1 className="text-lg font-semibold">Si è verificato un errore</h1>
          <pre className="mt-3 text-sm bg-neutral-100 p-3 rounded">{String(this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
