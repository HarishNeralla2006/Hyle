
import React from 'react';
import { ViewType, ViewState } from '../types';
import { HomeIcon, SearchIcon, PlusCircleIcon, CommentIcon, ProfileIcon, BellIcon, GridIcon, GlobeIcon, HyleIcon, RadarIcon } from './icons';
import { useAuth } from '../contexts/AuthContext';

interface MobileTopBarProps {
    setCurrentView: (view: ViewState) => void;
    currentViewType: ViewType;
}

interface MobileBottomNavProps {
    setCurrentView: (view: ViewState) => void;
    currentViewType: ViewType;
    onOpenCreatePostModal: () => void;
}

export const MobileTopBar: React.FC<MobileTopBarProps> = ({ setCurrentView, currentViewType }) => {
    if (currentViewType === ViewType.Chat) return null;
    return (
        <div className="fixed top-0 left-0 right-0 h-14 bg-[var(--glass-surface)]/90 backdrop-blur-md border-b border-[var(--glass-border)] z-[40] flex items-center justify-between px-4 md:hidden">
            <HyleIcon
                className="h-8 w-auto text-primary cursor-pointer"
                onClick={() => setCurrentView({ type: ViewType.Explore })}
            />
            <div className="flex items-center space-x-1">
                <button
                    onClick={() => setCurrentView({ type: ViewType.Search })}
                    className={`p-2 rounded-full transition-colors ${currentViewType === ViewType.Search ? 'text-white bg-white/10' : 'text-slate-400'}`}
                >
                    <RadarIcon className="w-6 h-6" />
                </button>
                <button
                    onClick={() => setCurrentView({ type: ViewType.Notifications })}
                    className={`p-2 rounded-full transition-colors ${currentViewType === ViewType.Notifications ? 'text-white bg-white/10' : 'text-slate-400'}`}
                >
                    <BellIcon className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
};


export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ setCurrentView, currentViewType, onOpenCreatePostModal }) => {
    const { user, profile } = useAuth();
    if (currentViewType === ViewType.Chat) return null;

    // Helper to determine active state
    const isActive = (type: ViewType) => currentViewType === type;

    // Use profile.photoURL if available, fallback to user.photoURL, then null
    const avatarUrl = profile?.photoURL || user?.photoURL;

    return (
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-black/90 backdrop-blur-xl border-t border-white/10 z-[50] flex items-center justify-around px-2 md:hidden">
            <button
                onClick={() => setCurrentView({ type: ViewType.Explore })}
                className={`p-3 rounded-full transition-all duration-300 flex flex-col items-center justify-center ${isActive(ViewType.Explore) ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
            >
                <GlobeIcon className="w-6 h-6" />
                {isActive(ViewType.Explore) && <div className="w-1 h-1 bg-[var(--primary-accent)] rounded-full mt-1 absolute bottom-2"></div>}
            </button>

            <button
                onClick={() => setCurrentView({ type: ViewType.Feed })}
                className={`p-3 rounded-full transition-all duration-300 flex flex-col items-center justify-center ${isActive(ViewType.Feed) ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
            >
                <GridIcon className="w-6 h-6" />
                {isActive(ViewType.Feed) && <div className="w-1 h-1 bg-[var(--primary-accent)] rounded-full mt-1 absolute bottom-2"></div>}
            </button>

            <button
                onClick={onOpenCreatePostModal}
                className="p-3 -mt-6 bg-[var(--primary-accent)] rounded-full shadow-[0_0_15px_var(--primary-accent)] border-4 border-[var(--bg-color)] transform transition-transform active:scale-95"
            >
                <PlusCircleIcon className="w-7 h-7 text-black" />
            </button>

            <button
                onClick={() => setCurrentView({ type: ViewType.Inbox })}
                className={`p-3 rounded-full transition-all duration-300 flex flex-col items-center justify-center ${isActive(ViewType.Inbox) || isActive(ViewType.Chat) ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
            >
                <CommentIcon className="w-6 h-6" />
                {(isActive(ViewType.Inbox) || isActive(ViewType.Chat)) && <div className="w-1 h-1 bg-[var(--primary-accent)] rounded-full mt-1 absolute bottom-2"></div>}
            </button>

            <button
                onClick={() => setCurrentView({ type: ViewType.Profile, userId: user?.uid })}
                className={`p-3 rounded-full transition-all duration-300 flex flex-col items-center justify-center ${isActive(ViewType.Profile) ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
            >
                {avatarUrl ? (
                    <div className={`w-6 h-6 rounded-full overflow-hidden border ${isActive(ViewType.Profile) ? 'border-[var(--primary-accent)]' : 'border-transparent'}`}>
                        <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                    </div>
                ) : (
                    <ProfileIcon className="w-6 h-6" />
                )}
                {isActive(ViewType.Profile) && <div className="w-1 h-1 bg-current rounded-full mt-1 absolute bottom-2"></div>}
            </button>
        </div>
    );
};
