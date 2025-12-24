import React, { useEffect } from 'react';
import Head from 'next/head';
import type { AppProps } from 'next/app';
import { AuthProvider } from '../contexts/AuthContext';
import { StatusProvider } from '../contexts/StatusContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import '../styles/globals.css';

import { initializeSchema } from '../lib/initDb';

function MyApp({ Component, pageProps }: AppProps) {
    useEffect(() => {
        initializeSchema();

        // Prevent default context menu
        const handleContextMenu = (e: MouseEvent) => e.preventDefault();
        document.addEventListener('contextmenu', handleContextMenu);

        // Register Service Worker for PWA
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => console.log('SW registered:', registration.scope))
                .catch(err => console.log('SW registration failed:', err));
        }

        return () => document.removeEventListener('contextmenu', handleContextMenu);
    }, []);

    return (
        <>
            <Head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                <title>Hyle</title>
            </Head>
            <StatusProvider>
                <AuthProvider>
                    <ThemeProvider>
                        <div className="bg-mesh"></div>
                        <Component {...pageProps} />
                    </ThemeProvider>
                </AuthProvider>
            </StatusProvider>
        </>
    );
}

export default MyApp;
