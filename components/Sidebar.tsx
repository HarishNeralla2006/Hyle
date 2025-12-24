
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebaseClient';
import { signOut } from 'firebase/auth';
import { ViewState, ViewType, Theme } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import {
    HomeIcon, SearchIcon, PlusCircleIcon, HeartIcon,
    ProfileIcon, SettingsIcon, LogoutIcon, SendIcon, MenuIcon, BellIcon, GlobeIcon
} from './icons';

interface SidebarProps {
    setCurrentView: (view: ViewState) => void;
    currentViewType: ViewType;
    onOpenCreatePostModal: () => void;
}

const NavItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center p-3 w-full rounded-xl transition-all duration-200 group/item ${isActive ? 'text-white font-bold' : 'hover:bg-white/5 hover:text-white'
            }`}
        style={!isActive ? { color: 'var(--sidebar-icon-color)' } : { color: 'var(--sidebar-icon-active)' }}
    >
        <div className={`shrink-0 w-6 h-6 flex items-center justify-center transition-transform duration-200 group-hover/item:scale-110 ${isActive ? 'scale-110' : ''}`}
        >
            {icon}
        </div>
        <span className={`text-base tracking-wide ml-4 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 delay-100 whitespace-nowrap overflow-hidden ${isActive ? '' : 'font-medium'}`}>
            {label}
        </span>
    </button>
);

const Sidebar: React.FC<SidebarProps> = ({ setCurrentView, currentViewType, onOpenCreatePostModal }) => {
    const { user, profile } = useAuth();
    const { theme, setTheme } = useTheme();
    const [showMoreMenu, setShowMoreMenu] = useState(false);

    // if (!user) return null; // Logic removed to allow guest sidebar

    const navigate = (type: ViewType, props: any = {}) => {
        setCurrentView({ type, ...props });
    };

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            navigate(ViewType.Explore);
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    return (
        <div
            className="hidden md:flex flex-col w-20 hover:w-[244px] transition-[width] duration-300 ease-in-out delay-200 group/sidebar h-screen shrink-0 border-r border-[var(--glass-border)] backdrop-blur-xl pt-8 pb-5 px-4 z-50 sticky top-0 overflow-visible"
            style={{ background: 'var(--sidebar-bg)' }}
        >
            {/* Logo */}
            <div className="px-0 mb-8 h-12 flex items-center justify-center w-full overflow-hidden transition-all duration-300">
                <div className="flex items-center justify-center relative w-full h-full">
                    {/* Collapsed State: 'H' Symbol - Breathing Pulse */}
                    <span
                        className="font-['Alinsa'] text-3xl text-[var(--primary-accent)] absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out group-hover/sidebar:opacity-0 group-hover/sidebar:scale-75 group-hover/sidebar:animate-none animate-pulse-slow"
                        style={{ letterSpacing: '0.01em' }}
                    >
                        H
                    </span>

                    {/* Expanded State: 'Hyle' Full Logo - Shimmer Effect */}
                    <span
                        className="font-['Alinsa'] text-3xl absolute inset-0 flex items-center justify-center whitespace-nowrap animate-text-shimmer bg-gradient-to-r from-[var(--primary-accent)] via-white to-[var(--primary-accent)] bg-[length:200%_auto] bg-clip-text text-transparent transition-all duration-700 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] delay-75 opacity-0 scale-90 group-hover/sidebar:opacity-100 group-hover/sidebar:scale-100"
                        style={{ letterSpacing: '0.01em' }}
                    >
                        Hyle
                    </span>
                </div>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 space-y-2">
                <NavItem
                    icon={<HomeIcon className="w-6 h-6" />}
                    label="Home"
                    isActive={currentViewType === ViewType.Explore}
                    onClick={() => navigate(ViewType.Explore)}
                />
                <NavItem
                    icon={<GlobeIcon className="w-6 h-6" />}
                    label="Feed"
                    isActive={currentViewType === ViewType.Feed}
                    onClick={() => navigate(ViewType.Feed)}
                />
                <NavItem
                    icon={<SearchIcon className="w-6 h-6" />}
                    label="Search"
                    isActive={currentViewType === ViewType.Search}
                    onClick={() => navigate(ViewType.Search)}
                />
                {user && (
                    <>
                        <NavItem
                            icon={<SendIcon className="w-6 h-6" />}
                            label="Messages"
                            isActive={currentViewType === ViewType.Inbox || currentViewType === ViewType.Chat}
                            onClick={() => navigate(ViewType.Inbox)}
                        />
                        <NavItem
                            icon={<BellIcon className="w-6 h-6" />}
                            label="Notifications"
                            isActive={currentViewType === ViewType.Notifications}
                            onClick={() => navigate(ViewType.Notifications)}
                        />
                        <NavItem
                            icon={<PlusCircleIcon className="w-6 h-6" />}
                            label="Create"
                            isActive={false}
                            onClick={onOpenCreatePostModal}
                        />
                        <NavItem
                            icon={
                                profile?.photoURL ?
                                    <img src={profile.photoURL} className="w-6 h-6 rounded-full object-cover ring-1 ring-white/20" /> :
                                    <ProfileIcon className="w-6 h-6" />
                            }
                            label="Profile"
                            isActive={currentViewType === ViewType.Profile}
                            onClick={() => navigate(ViewType.Profile, { userId: user.uid })}
                        />
                    </>
                )}
                {!user && (
                    <NavItem
                        icon={<LogoutIcon className="w-6 h-6 rotate-180" />}
                        label="Sign In"
                        isActive={currentViewType === ViewType.Auth}
                        onClick={() => navigate(ViewType.Auth)}
                    />
                )}
            </nav>

            {/* Bottom - More Menu */}
            <div className="relative">
                {showMoreMenu && (
                    <div className="absolute bottom-full left-0 w-64 bg-[#1a1a2e] border border-[var(--glass-border)] rounded-xl shadow-2xl p-2 mb-2 animate-fade-in z-50 overflow-hidden">
                        <div className="p-2 border-b border-white/5 mb-1">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2 pb-2">Appearance</h3>
                            {['hyle', 'nebula', 'zen', 'midnight', 'studio'].map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTheme(t as Theme)}
                                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors ${theme === t ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5'}`}
                                >
                                    <div className={`w-3 h-3 rounded-full ${t === theme ? 'bg-[var(--primary-accent)] shadow-[0_0_8px_var(--primary-accent)]' : 'bg-slate-600'}`} />
                                    <span className="capitalize">{t}</span>
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={handleSignOut}
                            className="w-full flex items-center space-x-3 px-3 py-3 text-red-400 hover:bg-red-500/10 rounded-lg text-sm font-medium transition-colors"
                        >
                            <LogoutIcon className="w-5 h-5" />
                            <span>Log out</span>
                        </button>
                    </div>
                )}
                <button
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    className={`flex items-center p-3 w-full rounded-xl transition-all duration-200 group/item ${showMoreMenu ? 'font-bold text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                >
                    <div className={`shrink-0 w-6 h-6 transition-transform duration-200 group-hover/item:scale-110 ${showMoreMenu ? 'scale-110 text-white' : ''}`}>
                        <MenuIcon className="w-6 h-6" />
                    </div>
                    <span className="text-base tracking-wide ml-4 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 delay-100 whitespace-nowrap overflow-hidden">More</span>
                </button>
            </div>

        </div>
    );
};

export default Sidebar;
