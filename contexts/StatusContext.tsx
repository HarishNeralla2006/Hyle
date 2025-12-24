import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';

import { subscribeToConnectionMode, ConnectionMode } from '../lib/tidbClient';

interface StatusContextType {
  error: string | null;
  setError: (error: string | null) => void;
  isOffline: boolean;
  setIsOffline: (offline: boolean) => void;
  connectionMode: ConnectionMode;
}

const StatusContext = createContext<StatusContextType | undefined>(undefined);

export const StatusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [error, setErrorState] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false); // Default to false (Online) for SSR consistency
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('cloud');

  const setError = useCallback((newError: string | null) => {
    setErrorState(newError);
    // Automatically clear the error after a few seconds
    if (newError) {
      setTimeout(() => {
        // Only clear if it's still the same error
        setErrorState(currentError => currentError === newError ? null : currentError);
      }, 7000);
    }
  }, []);

  // Listen to browser online/offline events AND database connection mode
  useEffect(() => {
    // Set initial offline state on mount (client-only)
    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Subscribe to TiDB Client Connection Mode
    const unsubscribeTidb = subscribeToConnectionMode((mode) => {
      setConnectionMode(mode);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribeTidb();
    };
  }, []);


  const value = {
    error,
    setError,
    isOffline,
    setIsOffline,
    connectionMode,
  };

  return <StatusContext.Provider value={value}>{children}</StatusContext.Provider>;
};

export const useStatus = () => {
  const context = useContext(StatusContext);
  if (context === undefined) {
    throw new Error('useStatus must be used within a StatusProvider');
  }
  return context;
};
