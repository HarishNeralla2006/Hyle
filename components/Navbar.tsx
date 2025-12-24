
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebaseClient';
import { signOut } from 'firebase/auth';
import { ViewState, ViewType, ProfileTab, Theme } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { ProfileIcon, HeartIcon, BookmarkIcon, LogoutIcon, PlusCircleIcon, CloseIcon, SettingsIcon } from './icons';

interface NavbarProps {
    isOpen: boolean;
    onClose: () => void;
    setCurrentView: (view: ViewState) => void;
    onOpenCreatePostModal: () => void;
}

const NavLink: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void; delay: number; active?: boolean }> = ({ icon, label, onClick, delay, active }) => (
    <button
        onClick={onClick}
        className={`flex items-center w-full px-5 py-3.5 text-sm font-medium rounded-xl transition-all duration-300 group active:scale-95 animate-slide-in-item opacity-0 ${active ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
        style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
        <div className={`w-5 h-5 mr-4 transition-transform group-hover:scale-110 duration-300 ${active ? 'text-[var(--primary-accent)]' : 'text-slate-500 group-hover:text-[var(--primary-accent)]'}`}>{icon}</div>
        <span className="tracking-wide group-hover:translate-x-1 transition-transform">{label}</span>
    </button>
);

const ThemeOption: React.FC<{ theme: Theme; current: Theme; onSelect: (t: Theme) => void; label: string; color: string }> = ({ theme, current, onSelect, label, color }) => (
    <button
        onClick={() => onSelect(theme)}
        className={`flex items-center space-x-3 w-full px-4 py-3 rounded-xl transition-all duration-200 group border ${current === theme ? 'border-[var(--primary-accent)]/50 bg-[var(--primary-accent)]/10' : 'border-transparent hover:bg-white/5'}`}
    >
        <div
            className={`w-4 h-4 rounded-full shadow-lg transition-transform group-hover:scale-110 duration-300 ring-2 ${current === theme ? 'ring-[var(--primary-accent)]' : 'ring-transparent'}`}
            style={{ background: color }}
        ></div>
        <span className={`text-sm font-medium flex-1 text-left ${current === theme ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>{label}</span>
        {current === theme && (
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary-accent)] shadow-[0_0_8px_var(--primary-accent)]"></div>
        )}
    </button>
);

const Navbar: React.FC<NavbarProps> = ({ isOpen, onClose, setCurrentView, onOpenCreatePostModal }) => {
    const { user, profile } = useAuth();
    const { theme, setTheme } = useTheme();
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (isOpen) setShouldRender(true);
        else setTimeout(() => setShouldRender(false), 500);
    }, [isOpen]);

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            onClose();
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    const navigateToProfile = (tab: ProfileTab) => {
        setCurrentView({ type: ViewType.Profile, initialTab: tab });
        onClose();
    };

    const navigateToAuth = () => {
        setCurrentView({ type: ViewType.Profile });
        onClose();
    };

    const handleOpenCreatePost = () => {
        onOpenCreatePostModal();
        onClose();
    }

    if (!shouldRender) return null;

    return (
        <div
            className={`fixed inset-0 z-50 transition-all duration-500 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
            aria-modal="true"
            role="dialog"
        >
            {/* Backdrop */}
            <div className={`absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose}></div>

            {/* Panel */}
            <div
                className={`absolute top-0 left-0 h-full w-80 glass-panel border-r border-white/5 shadow-2xl transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
                style={{ background: 'rgba(15, 15, 20, 0.95)' }}
            >
                {/* Header */}
                <div className="p-6 pb-2 relative flex-shrink-0">
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                    <div className="mt-2">
                        {user ? (
                            <div className="flex items-center space-x-3 mb-2 animate-slide-in-item opacity-0" style={{ animationDelay: '50ms', animationFillMode: 'forwards' }}>
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary-accent)] to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg overflow-hidden">
                                    {profile?.photoURL ? (
                                        <img src={profile.photoURL} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            {profile?.username?.charAt(0).toUpperCase() || 'T'}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className="text-white font-semibold text-sm leading-tight">Welcome back,</p>
                                    <p className="text-[var(--primary-accent)] font-bold text-base leading-tight">{profile?.username || 'Traveler'}</p>
                                </div>
                            </div>
                        ) : (
                            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary-accent)]/50 to-white tracking-tight animate-slide-in-item opacity-0" style={{ animationDelay: '50ms', animationFillMode: 'forwards' }}>Spark.AI</h2>
                        )}
                    </div>
                </div>

                {/* Main Nav Items - Scrollable if needed, but usually fixed */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4 space-y-1">
                    {user ? (
                        <>
                            <div className="mb-6">
                                <NavLink icon={<PlusCircleIcon />} label="New Transmission" onClick={handleOpenCreatePost} delay={100} active />
                            </div>

                            <NavLink icon={<ProfileIcon />} label="Profile" onClick={() => navigateToProfile('posts')} delay={150} />
                            <NavLink icon={<HeartIcon />} label="Favorites" onClick={() => navigateToProfile('likes')} delay={200} />
                            <NavLink icon={<BookmarkIcon />} label="Saved Topics" onClick={() => navigateToProfile('saved')} delay={250} />
                        </>
                    ) : (
                        <NavLink icon={<ProfileIcon />} label="Sign In / Join" onClick={navigateToAuth} delay={100} active />
                    )}
                </div>

                {/* Bottom Section - Environment Selector */}
                <div className="p-4 border-t border-white/5 bg-black/20">
                    <div className="px-2 mb-3 flex items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest animate-slide-in-item opacity-0" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
                        <SettingsIcon className="w-4 h-4 mr-2" />
                        <span>Environment</span>
                    </div>

                    <div className="space-y-1 animate-slide-in-item opacity-0" style={{ animationDelay: '350ms', animationFillMode: 'forwards' }}>
                        <ThemeOption
                            theme="hyle"
                            current={theme}
                            onSelect={setTheme}
                            label="Hyle"
                            color="#FFD820"
                        />
                        <ThemeOption
                            theme="nebula"
                            current={theme}
                            onSelect={setTheme}
                            label="Nebula"
                            color="#6366f1"
                        />
                        <ThemeOption
                            theme="zen"
                            current={theme}
                            onSelect={setTheme}
                            label="Zen Garden"
                            color="#10b981"
                        />
                        <ThemeOption
                            theme="midnight"
                            current={theme}
                            onSelect={setTheme}
                            label="Midnight"
                            color="#1e293b"
                        />
                        <ThemeOption
                            theme="studio"
                            current={theme}
                            onSelect={setTheme}
                            label="Studio"
                            color="#94a3b8"
                        />
                    </div>

                    {user && (
                        <div className="mt-4 pt-4 border-t border-white/5 animate-slide-in-item opacity-0" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
                            <button
                                onClick={handleSignOut}
                                className="flex items-center w-full px-4 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                                <LogoutIcon className="w-4 h-4 mr-3" />
                                <span>Disconnect Signal</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <style>{`
                 .custom-scrollbar::-webkit-scrollbar {
                  width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background: rgba(255, 255, 255, 0.1);
                  border-radius: 4px;
                }
                @keyframes slide-in-item {
                    from { transform: translateX(-20px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .animate-slide-in-item {
                    animation-name: slide-in-item;
                    animation-duration: 0.4s;
                    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
                }
            `}</style>
        </div >
    );
};

export default Navbar;
