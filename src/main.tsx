import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initStorage } from '@/lib/storage';
import { registerPersistenceLifecycle } from '@/lib/dataStore';
import { AppLoadingScreen } from '@/components/layout/AppLoadingScreen';
import './index.css';
import { getAppTitle } from '@/lib/appBrand';

function Bootstrap() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    document.title = getAppTitle();
    const cleanupLifecycle = registerPersistenceLifecycle();
    initStorage()
      .then(() => setReady(true))
      .catch((error) => {
        console.error('Failed to initialize storage:', error);
        setReady(true);
      });
    return cleanupLifecycle;
  }, []);

  if (!ready) {
    return <AppLoadingScreen />;
  }

  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Bootstrap />
  </React.StrictMode>
);
