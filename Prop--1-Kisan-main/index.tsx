import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'white', background: '#b91c1c', height: '100vh', overflow: 'auto' }}>
          <h1>Something went wrong.</h1>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error?.toString()}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8em' }}>{this.state.error?.stack}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
    document.body.innerHTML = '<div style="color:red; background:white; padding:20px;">FATAL: Root element not found</div>';
} else {
    // Debug mount
    console.log("Mounting React Root...");
    try {
        const root = createRoot(rootElement);
        root.render(
            <React.StrictMode>
                <ErrorBoundary>
                    <div style={{minHeight: '100vh', background: 'white'}}>
                        <App />
                    </div>
                </ErrorBoundary>
            </React.StrictMode>
        );
        console.log("React Root Mounted Successfully");
    } catch (e) {
        console.error("React Mount Failed:", e);
        document.body.innerHTML += `<div style="color:red; background:white; padding:20px;">React Mount Failed: ${e}</div>`;
    }
}

