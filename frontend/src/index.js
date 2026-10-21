import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import './index.css';
import App from './App';
import { Provider } from 'react-redux';
import { store } from './redux/store';

// Error tracking is off unless a DSN is configured (Vercel env var).
if (process.env.REACT_APP_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.REACT_APP_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    sendDefaultPii: false
  });
}

function CrashScreen() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-bold text-ink">Something broke on our side</h1>
      <p className="mt-2 text-muted">The error has been reported. Reloading usually fixes it; your saved data is safe.</p>
      <button type="button" className="btn btn-primary mt-6" onClick={() => window.location.reload()}>Reload page</button>
    </main>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<CrashScreen />}>
      <Provider store={store}>
        <App />
      </Provider>
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
