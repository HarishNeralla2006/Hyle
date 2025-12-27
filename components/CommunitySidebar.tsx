import React, { useEffect, useState } from 'react';
import { fetchCommunities, Community } from '../lib/communities';
import { useAuth } from '../contexts/AuthContext';
import { createCommunityAction } from '../app/actions';

interface LinkProps {
    community: Community;
    isActive: boolean;
    onClick: () => void;
}

const CommunityLink: React.FC<LinkProps> = ({ community, isActive, onClick }) => {
    return (
        <button
            onClick={onClick}
            className={`w - full group flex items - center p - 3 rounded - xl transition - all duration - 300 relative overflow - hidden ${isActive ? 'bg-white/5 border border-white/10' : 'hover:bg-white/5 border border-transparent hover:border-white/5'
                } `}
        >
            {/* Active Glow */}
            {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--primary-accent)] shadow-[0_0_15px_var(--primary-accent)]"></div>
            )}

            <div className={`mr - 4 p - 2 rounded - lg transition - colors ${isActive ? 'bg-white/10 text-[var(--primary-accent)]' : 'bg-white/5 text-slate-400 group-hover:text-white'} `}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>

            <div className="flex-1 text-left">
                <h3 className={`font - bold text - sm tracking - wide transition - colors ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'} `}>
                    {community.name}
                </h3>
                <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider truncate max-w-[160px]">
                    #{community.tags[0]} {community.tags[1] ? `#${community.tags[1]} ` : ''}
                </p>
            </div>
        </button>
    );
};

interface SidebarProps {
    activeId: string | null;
    onSelect: (community: Community | null) => void;
    isOpen: boolean;
    onClose: () => void;
}

const CommunitySidebar: React.FC<SidebarProps> = ({ activeId, onSelect, isOpen, onClose }) => {
    const { user } = useAuth();
    const [communities, setCommunities] = useState<Community[]>([]);
    const [loading, setLoading] = useState(true);

    // Creation State
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newTags, setNewTags] = useState('');

    const loadCommunities = async () => {
        setLoading(true);
        const data = await fetchCommunities();

        // Frontend Deduping (Self-Healing UI)
        // Hides "Sci" if "Science" exists. Hides "Comp sci" if "Computer Science" exists.
        // Logic: Sort by length DESC. Keep canonicals. Discard shadows.
        const sorted = [...data].sort((a, b) => b.name.length - a.name.length);
        const canonicals: Community[] = [];

        for (const candidate of sorted) {
            const lowName = candidate.name.toLowerCase();
            // Check if this candidate is a "shadow" of an already accepted canonical
            // Shadow = Prefix Match OR Acronym Match
            const isShadow = canonicals.some(canonical => {
                const canonName = canonical.name.toLowerCase();
                // 1. Prefix Check
                if (canonName.startsWith(lowName)) return true;
                // 2. Acronym Check
                const canonParts = canonName.split(/\s+/);
                const candParts = lowName.split(/\s+/);
                if (candParts.length > 1 && candParts.every((p, i) => canonParts[i]?.startsWith(p))) return true;

                return false;
            });

            if (!isShadow) {
                canonicals.push(candidate);
            }
        }

        // Re-sort alphabetically (optional, but good for UX) or keep creation order?
        // Let's sort alphabetically for clean sidebar
        canonicals.sort((a, b) => a.name.localeCompare(b.name));

        setCommunities(canonicals);
        setLoading(false);
    };

    useEffect(() => {
        if (isOpen) {
            loadCommunities();
        }
    }, [isOpen]);

    // ... (in component)
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newName || !newTags) return;

        const tagsArray = newTags.split(',').map(t => t.trim().replace(/^#/, ''));
        // Use Server Action
        const successCommunity = await createCommunityAction(newName, newDesc, tagsArray, user.uid);

        if (successCommunity) {
            setNewName(''); setNewDesc(''); setNewTags('');
            setIsCreating(false);
            loadCommunities();
            // Optional: Auto-select the returned community (whether new or semantic match)
            onSelect(successCommunity);
        }
    };

    // If showing creation modal
    if (isCreating) {
        return (
            <div className={`fixed inset-0 bg-black/80 backdrop-blur-xl z-[80] flex items-center justify-center p-4`}>
                <div className="bg-[#050508] border border-[var(--glass-border)] rounded-2xl p-6 w-full max-w-md shadow-2xl animate-pop-in">
                    <h2 className="text-xl font-black text-white italic mb-1">Create Frequency</h2>
                    <p className="text-slate-500 text-xs mb-6">Define a new signal source for the network.</p>

                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Name</label>
                            <input value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-indigo-500 outline-none mt-1" placeholder="e.g. The Indie Forge" />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Tags (Comma Separated)</label>
                            <input value={newTags} onChange={e => setNewTags(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-indigo-500 outline-none mt-1" placeholder="e.g. gamedev, pixelart" />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Description</label>
                            <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-indigo-500 outline-none mt-1 h-20" placeholder="What is this frequency transmitting?" />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button type="button" onClick={() => setIsCreating(false)} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 font-bold text-xs uppercase tracking-wider">Cancel</button>
                            <button type="submit" disabled={!newName || !newTags} className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider disabled:opacity-50">Create Signal</button>
                        </div>
                    </form>
                </div>
            </div>
        )
    }

    return (
        <>
            {/* Backdrop (Mobile & Desktop Overlay Mode) */}
            <div
                className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-[55] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Sidebar Panel - Fixed Left */}
            <div
                className={`fixed top-0 left-0 bottom-0 w-80 bg-[#050508]/95 backdrop-blur-xl border-r border-[var(--glass-border)] z-[70] transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} shadow-2xl h-screen pt-20 pb-10 px-4 overflow-y-auto custom-scrollbar flex flex-col`}
            >
                <div className="mb-4 flex items-center justify-between px-2">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Frequencies</h2>
                    <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

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
                <div className="space-y-2 flex-1">
                    {loading ? (
                        <div className="p-4 text-center text-xs text-slate-600 animate-pulse">Scanning frequencies...</div>
                    ) : communities.length === 0 ? (
                        <div className="p-4 text-center">
                            <p className="text-xs text-slate-500 mb-2">No signals detected.</p>
                        </div>
                    ) : (
                        communities.map(comm => (
                            <CommunityLink
                                key={comm.id}
                                community={comm}
                                isActive={activeId === comm.id}
                                onClick={() => { onSelect(comm); onClose(); }}
                            />
                        ))
                    )}
                </div>

                <div className="mt-4 pt-4 border-t border-white/5">
                    <button onClick={() => setIsCreating(true)} className="w-full py-3 rounded-xl border border-dashed border-white/20 text-slate-400 hover:text-white hover:border-white/40 transition-all text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Create Frequency Band
                    </button>
                </div>
            </div>
        </>
    );
};

export default CommunitySidebar;
