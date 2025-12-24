import React from 'react';
import { useStatus } from '../contexts/StatusContext';
import { CloseIcon } from './icons';

interface StatusDisplayProps {
    showUplink?: boolean;
}

const StatusDisplay: React.FC<StatusDisplayProps> = ({ showUplink = true }) => {
    const { error, setError, isOffline, connectionMode } = useStatus();

    return (
        <>
            {/* Error Toast */}
            {error && (
                <div
                    className="fixed top-32 right-6 z-[100] w-full max-w-sm p-4 glass-panel border-l-4 border-l-red-500 rounded-r-xl shadow-2xl animate-slide-in"
                    role="alert"
                    style={{ background: 'rgba(69, 10, 10, 0.6)' }}
                >
                    <div className="flex items-start">
                        <div className="flex-1">
                            <p className="font-bold text-white mb-1">Error</p>
                            <p className="text-sm text-red-100">{error}</p>
                        </div>
                        <button onClick={() => setError(null)} className="ml-4 p-1 text-red-200 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                            <CloseIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}


            {/* Connection Mode Banner - REMOVED */}

            {/* Offline Banner */}
            {isOffline && (
                <div
                    className="fixed top-4 left-1/2 -translate-x-1/2 z-[99] px-6 py-2 glass-panel border border-yellow-500/30 text-yellow-100 text-sm font-medium rounded-full shadow-lg flex items-center space-x-2"
                >
                    <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                    <span>Offline Mode</span>
                </div>
            )}


            <style>{`
                @keyframes slide-in {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                .animate-slide-in {
                    animation: slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                /* Hide Next.js Dev Tools Badge */
                #nextjs-dev-tools-overlay, [data-nextjs-toast], .nextjs-toast-errors-parent {
                    display: none !important;
                }
             `}</style>
        </>
    );
};

export default StatusDisplay;