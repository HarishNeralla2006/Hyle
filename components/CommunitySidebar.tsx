import React, { useEffect, useState } from 'react';
import { COMMUNITIES, Community } from '../lib/communities';

// Icons
const Icons: Record<string, React.FC<{ className?: string }>> = {
    flame: ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>,
    chip: ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>,
    palette: ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>,
    globe: ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>,
    atom: ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>, // Generic science
    music: ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
}

interface LinkProps {
    community: Community;
    isActive: boolean;
    onClick: () => void;
}

const CommunityLink: React.FC<LinkProps> = ({ community, isActive, onClick }) => {
    const Icon = Icons[community.iconId] || Icons.globe;

    return (
        <button
            onClick={onClick}
            className={`w-full group flex items-center p-3 rounded-xl transition-all duration-300 relative overflow-hidden ${isActive ? 'bg-white/5 border border-white/10' : 'hover:bg-white/5 border border-transparent hover:border-white/5'
                }`}
        >
            {/* Active Glow */}
            {isActive && (
                <div
                    className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--primary-accent)] shadow-[0_0_15px_var(--primary-accent)]"
                ></div>
            )}

            <div className={`mr-4 p-2 rounded-lg transition-colors ${isActive ? 'bg-white/10 text-[var(--primary-accent)]' : 'bg-white/5 text-slate-400 group-hover:text-white'}`}>
                <Icon className="w-5 h-5" />
            </div>

            <div className="flex-1 text-left">
                <h3 className={`font-bold text-sm tracking-wide transition-colors ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                    {community.name}
                </h3>
                <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider truncate max-w-[160px]">
                    {community.tags[0]} • {community.tags[1]}
                </p>
            </div>

            {/* Signal Indicator (Mock) */}
            <div className="flex flex-col space-y-0.5 items-end opacity-60">
                <div className={`w-1 h-3 rounded-full ${isActive ? 'bg-yellow-400 shadow-[0_0_5px_yellow]' : 'bg-slate-700'}`}></div>
                <div className="w-1 h-2 rounded-full bg-slate-700"></div>
                <div className={`w-1 h-1.5 rounded-full ${isActive ? 'bg-indigo-500' : 'bg-slate-700'}`}></div>
            </div>
        </button>
    );
};

interface SidebarProps {
    activeId: string | null;
    onSelect: (id: string | null) => void;
    isOpen: boolean;
    onClose: () => void;
}

const CommunitySidebar: React.FC<SidebarProps> = ({ activeId, onSelect, isOpen, onClose }) => {

    // Clicking outside closes it on mobile
    return (
        <>
            {/* Backdrop (Mobile Only) */}
            <div
                className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Sidebar Panel */}
            <div
                className={`fixed top-0 left-0 bottom-0 w-80 bg-[#050508]/90 backdrop-blur-xl border-r border-[var(--glass-border)] z-50 transform transition-transform duration-300 ease-out md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    } md:static md:w-72 md:bg-transparent md:border-none md:block shadow-2xl md:shadow-none h-screen pt-20 pb-10 px-4 overflow-y-auto custom-scrollbar flex flex-col`}
            >
                <div className="mb-8 px-2">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Frequencies</h2>

                    {/* "All Spheres" Option */}
                    <button
                        onClick={() => { onSelect(null); onClose(); }}
                        className={`w-full group flex items-center p-3 rounded-xl transition-all duration-300 mb-2 ${activeId === null ? 'bg-white/5 border border-white/10' : 'hover:bg-white/5 border border-transparent'}`}
                    >
                        {activeId === null && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 shadow-[0_0_15px_indigo]"></div>
                        )}
                        <div className={`mr-4 p-2 rounded-lg transition-colors ${activeId === null ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-slate-400'}`}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                        </div>
                        <div className="text-left">
                            <h3 className={`font-bold text-sm tracking-wide ${activeId === null ? 'text-white' : 'text-slate-300'}`}>All Spheres</h3>
                            <p className="text-[10px] text-slate-500 font-mono">Global Feed</p>
                        </div>
                    </button>

                    <div className="h-px bg-white/10 my-4 mx-2"></div>

                    {/* Community List */}
                    <div className="space-y-2">
                        {COMMUNITIES.map(comm => (
                            <CommunityLink
                                key={comm.id}
                                community={comm}
                                isActive={activeId === comm.id}
                                onClick={() => { onSelect(comm.id); onClose(); }}
                            />
                        ))}
                    </div>
                </div>

                <div className="mt-auto px-4 py-6 bg-white/5 rounded-2xl border border-white/5 text-center">
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                        Don't see your tribe? <br />
                        <span className="text-indigo-400 cursor-pointer hover:underline">Request a Frequency</span>
                    </p>
                </div>
            </div>
        </>
    );
};

export default CommunitySidebar;
