import React, { useState, useEffect, useMemo } from 'react';
import { Domain, ViewState, ViewType } from '../types';
import { SearchIcon, CloseIcon } from './icons';
import { execute } from '../lib/tidbClient';
import { ROOT_DOMAINS } from '../services/pollinationsService';

interface SearchViewProps {
    domainTree: Domain | null;
    setCurrentView: (view: ViewState) => void;
}

type SearchMode = 'frequency' | 'signal';

type FrequencyResult = {
    id: string; // Full path e.g. "Science/Physics"
    name: string; // "Physics"
    count?: number;
    isTrending?: boolean;
}

// Flatten tree helper for "Previous/Deep" search capability
const flattenDomainTree = (node: Domain | null, prefix: string = ''): FrequencyResult[] => {
    if (!node) return [];
    let results: FrequencyResult[] = [];
    if (prefix) {
        results.push({ id: prefix, name: node.name, count: 0, isTrending: false });
    }
    if (node.children) {
        for (const child of node.children) {
            const childId = prefix ? `${prefix}/${child.name}` : child.name;
            results = results.concat(flattenDomainTree(child, childId));
        }
    }
    return results;
};

const SearchView: React.FC<SearchViewProps> = ({ domainTree, setCurrentView }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [mode, setMode] = useState<SearchMode>('frequency');

    // Frequency Mode State
    const [activeFrequencies, setActiveFrequencies] = useState<FrequencyResult[]>([]);
    const [frequencyLoading, setFrequencyLoading] = useState(true);

    // Signal Mode State
    const [signalResults, setSignalResults] = useState<any[]>([]); // Using any for partial post data
    const [signalLoading, setSignalLoading] = useState(false);

    // 1. Fetch Active Frequencies (Real-time DB Counts)
    useEffect(() => {
        const fetchFrequencies = async () => {
            setFrequencyLoading(true);
            try {
                const result = await execute('SELECT domain_id FROM posts');
                const counts: Record<string, number> = {};
                result.forEach((row: any) => {
                    if (row.domain_id) {
                        counts[row.domain_id] = (counts[row.domain_id] || 0) + 1;
                    }
                });

                const domains: FrequencyResult[] = Object.keys(counts).map(id => {
                    const parts = id.split('/');
                    return {
                        id: id,
                        name: parts[parts.length - 1],
                        count: counts[id],
                        isTrending: true
                    };
                });
                setActiveFrequencies(domains);
            } catch (e) {
                console.error("Failed to fetch frequencies", e);
            } finally {
                setFrequencyLoading(false);
            }
        };
        fetchFrequencies();
    }, []);

    // 2. Search Signals (Content Search)
    useEffect(() => {
        if (mode === 'signal' && searchTerm.trim().length > 2) {
            const fetchSignals = async () => {
                setSignalLoading(true);
                try {
                    // This query needs to be supported by tidbClient mock/real
                    const sql = `
                        SELECT p.id, p.content, p.created_at, p.user_id, p.domain_id, u.username, u.photoURL 
                        FROM posts p
                        LEFT JOIN profiles u ON p.user_id = u.id
                        WHERE LOWER(p.content) LIKE LOWER(?)
                        ORDER BY p.created_at DESC
                        LIMIT 20
                    `;
                    const results = await execute(sql, [`%${searchTerm}%`]);
                    setSignalResults(results);
                } catch (e) {
                    console.error("Signal search failed", e);
                } finally {
                    setSignalLoading(false);
                }
            };

            const timer = setTimeout(fetchSignals, 500); // 500ms debounce
            return () => clearTimeout(timer);
        } else if (mode === 'signal' && !searchTerm.trim()) {
            setSignalResults([]);
        }
    }, [mode, searchTerm]);


    // Combined Frequency List (Hybrid: Tree + Active)
    const filteredFrequencies = useMemo(() => {
        if (mode !== 'frequency') return [];

        // 1. Get Base Tree
        const treeResults = flattenDomainTree(domainTree);

        // 2. Create Map of Active Counts
        const activeMap = new Map(activeFrequencies.map(f => [f.id, f.count]));
        // const activeSet = new Set(activeFrequencies.map(f => f.id));

        // 3. Merge: Update Tree items with counts
        const mergedResults = treeResults.map(item => ({
            ...item,
            count: activeMap.get(item.id) || 0,
            isTrending: activeMap.has(item.id)
        }));

        // 4. Add Active items that are NOT in Tree (purely new/wild frequencies)
        activeFrequencies.forEach(active => {
            // If not already in tree list (by checking ID roughly, imperfect but works for flattened)
            if (!treeResults.find(t => t.id === active.id)) {
                mergedResults.push({ ...active, count: active.count || 0, isTrending: active.isTrending || false });
            }
        });

        // 5. Filter by Search
        const lower = searchTerm.toLowerCase();
        const filtered = mergedResults.filter(d =>
            d.name.toLowerCase().includes(lower) ||
            d.id.toLowerCase().includes(lower)
        );

        // 6. Sort: High signal count first, then trending, then alphabetical
        return filtered.sort((a, b) => {
            const countDiff = (b.count || 0) - (a.count || 0);
            if (countDiff !== 0) return countDiff;
            return a.name.localeCompare(b.name);
        }).slice(0, 50); // Limit display
    }, [mode, searchTerm, domainTree, activeFrequencies]);


    return (
        <div className="flex flex-col h-full w-full bg-[#050508] relative overflow-hidden">
            {/* Header */}
            <div className="pt-24 md:pt-8 pb-2 md:pb-4 px-4 md:px-6 relative z-10 flex flex-col items-center">
                <h1 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 tracking-tight text-[var(--primary-accent)] drop-shadow-[0_0_15px_rgba(255,216,32,0.3)]">
                    Global Scanner
                </h1>

                {/* Search Bar */}
                <div className="relative w-full max-w-2xl group mb-4 md:mb-6">
                    <div className="absolute inset-0 bg-[var(--primary-accent)]/20 rounded-3xl blur-lg opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
                    <div className="relative bg-[#1a1a2e]/80 border border-white/10 rounded-3xl flex items-center p-2.5 md:p-4 shadow-2xl backdrop-blur-xl">
                        <SearchIcon className="w-5 h-5 md:w-6 md:h-6 text-slate-400 mr-3 md:mr-4 shrink-0" />
                        <input
                            autoFocus
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={mode === 'frequency' ? "Search frequencies..." : "Search transmission content..."}
                            className="bg-transparent border-none focus:outline-none text-white text-sm md:text-lg w-full placeholder-slate-600 font-medium"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="p-1.5 md:p-2 hover:bg-white/10 rounded-full text-slate-400 transition-colors">
                                <CloseIcon className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs / Toggle */}
                <div className="flex bg-white/5 p-1 rounded-full border border-white/5">
                    <button
                        onClick={() => setMode('frequency')}
                        className={`px-4 py-1.5 md:px-6 md:py-2 rounded-full text-xs md:text-sm font-bold uppercase tracking-wider transition-all ${mode === 'frequency' ? 'bg-[var(--primary-accent)] text-black shadow-lg shadow-[var(--primary-accent)]/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                    >
                        Frequencies
                    </button>
                    <button
                        onClick={() => setMode('signal')}
                        className={`px-4 py-1.5 md:px-6 md:py-2 rounded-full text-xs md:text-sm font-bold uppercase tracking-wider transition-all ${mode === 'signal' ? 'bg-[var(--primary-accent)] text-black shadow-lg shadow-[var(--primary-accent)]/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                    >
                        Signals
                    </button>
                </div>
            </div>

            {/* Results Area */}
            <div className="flex-1 overflow-y-auto px-3 md:px-4 pb-20 custom-scrollbar">
                <div className="max-w-4xl mx-auto py-2 md:py-4">

                    {/* FREQUENCY RESULTS */}
                    {mode === 'frequency' && (
                        <>
                            {frequencyLoading ? (
                                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary-accent)]"></div></div>
                            ) : filteredFrequencies.length === 0 ? (
                                <div className="text-center py-20 opacity-50"><p className="text-slate-400 uppercase tracking-widest text-xs">No matching frequencies</p></div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                                    {filteredFrequencies.map((domain) => (
                                        <button
                                            key={domain.id}
                                            onClick={() => setCurrentView({ type: ViewType.Post, domainId: domain.id, domainName: domain.name })}
                                            className="flex items-center p-2.5 md:p-4 rounded-3xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[var(--primary-accent)]/30 transition-all group text-left"
                                        >
                                            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center mr-3 md:mr-4 group-hover:scale-110 transition-transform ${domain.count ? 'bg-[var(--primary-accent)]/20 text-[var(--primary-accent)]' : 'bg-slate-800 text-slate-600'}`}>
                                                <span className="font-bold text-sm md:text-lg">#</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center">
                                                    <h3 className="text-white font-bold text-sm tracking-wide group-hover:text-[var(--primary-accent)] transition-colors truncate mr-2">{domain.name}</h3>
                                                    {domain.count ? (
                                                        <span className="text-[10px] bg-[var(--primary-accent)]/20 text-[var(--primary-accent)] px-2 py-0.5 rounded-full font-mono whitespace-nowrap">{domain.count > 0 ? domain.count : ''} Signals</span>
                                                    ) : null}
                                                </div>
                                                <p className="text-slate-500 text-[10px] md:text-xs font-mono mt-0.5 truncate">{domain.id}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* SIGNAL RESULTS */}
                    {mode === 'signal' && (
                        <>
                            {signalLoading ? (
                                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary-accent)]"></div></div>
                            ) : !searchTerm.trim() ? (
                                <div className="text-center py-20 opacity-50"><p className="text-slate-400 uppercase tracking-widest text-xs">Enter keywords to scan transmissions</p></div>
                            ) : signalResults.length === 0 ? (
                                <div className="text-center py-20 opacity-50"><p className="text-slate-400 uppercase tracking-widest text-xs">No Content Matches Found</p></div>
                            ) : (
                                <div className="space-y-4">
                                    {signalResults.map((post) => (
                                        <div
                                            key={post.id}
                                            onClick={() => setCurrentView({ type: ViewType.Post, domainId: post.domain_id, domainName: post.domain_id, focusedPostId: post.id })}
                                            className="bg-[#1a1a2e] border border-white/5 p-4 rounded-xl hover:border-[var(--primary-accent)]/30 cursor-pointer transition-colors group"
                                        >
                                            <div className="flex items-center space-x-3 mb-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden">
                                                    {post.photoURL ? <img src={post.photoURL} alt={post.username} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-white font-bold">{post.username?.[0]}</div>}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-200">{post.username}</p>
                                                    <p className="text-[10px] text-slate-500 font-mono">{post.domain_id} • {new Date(post.created_at).toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <p className="text-sm text-slate-300 line-clamp-2 group-hover:text-white transition-colors">{post.content}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default SearchView;
