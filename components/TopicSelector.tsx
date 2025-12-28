import React, { useState, useEffect } from 'react';
import { execute } from '../lib/tidbClient';
import { useAuth } from '../contexts/AuthContext';
import { useStatus } from '../contexts/StatusContext';
import { CheckIcon } from './icons';

interface TopicSelectorProps {
    onComplete: () => void;
}

const TOPICS = [
    { id: 'science', label: 'Science', color: 'from-blue-500 to-cyan-400', tags: ['Quantum', 'Bio', 'Space'] },
    { id: 'physics', label: 'Physics', color: 'from-violet-500 to-purple-400', tags: ['Astro', 'Quantum', 'Mechanics'] },
    { id: 'chemistry', label: 'Chemistry', color: 'from-emerald-500 to-teal-400', tags: ['Organic', 'S.States', 'Reactions'] },
    { id: 'mathematics', label: 'Mathematics', color: 'from-indigo-500 to-blue-400', tags: ['Algebra', 'Topology', 'Chaos'] },
    { id: 'biology', label: 'Biology', color: 'from-green-500 to-lime-400', tags: ['Genetics', 'Neuro', 'Marine'] },
    { id: 'technology', label: 'Technology', color: 'from-fuchsia-500 to-pink-400', tags: ['AI', 'Cyber', 'IoT'] },
    { id: 'engineering', label: 'Engineering', color: 'from-slate-500 to-zinc-400', tags: ['Civil', 'Mech', 'Aero'] },
    { id: 'business', label: 'Business', color: 'from-amber-500 to-orange-400', tags: ['Startup', 'Finance', 'Econ'] },
    { id: 'law', label: 'Law', color: 'from-red-800 to-red-600', tags: ['Corporate', 'IP', 'Rights'] },
    { id: 'art', label: 'Art', color: 'from-rose-500 to-pink-400', tags: ['Digital', 'History', 'Modern'] },
    { id: 'design', label: 'Design', color: 'from-purple-500 to-fuchsia-400', tags: ['UX/UI', 'Graphic', 'Product'] },
    { id: 'music', label: 'Music', color: 'from-cyan-500 to-blue-400', tags: ['Electronic', 'Jazz', 'Production'] },
    { id: 'literature', label: 'Literature', color: 'from-yellow-600 to-amber-500', tags: ['Classics', 'Poetry', 'Scifi'] },
    { id: 'history', label: 'History', color: 'from-orange-500 to-amber-400', tags: ['Ancient', 'Wars', 'Culture'] },
    { id: 'philosophy', label: 'Philosophy', color: 'from-teal-600 to-emerald-500', tags: ['Stoic', 'Logic', 'Ethics'] },
    { id: 'psychology', label: 'Psychology', color: 'from-indigo-600 to-violet-500', tags: ['Cognitive', 'Social', 'Neuro'] },
    { id: 'social sciences', label: 'Social Sci.', color: 'from-pink-600 to-rose-500', tags: ['Anthro', 'Socio', 'Policy'] },
    { id: 'education', label: 'Education', color: 'from-sky-500 to-blue-400', tags: ['EdTech', 'Pedagogy', 'STEM'] },
    { id: 'coding', label: 'Coding', color: 'from-lime-500 to-green-400', tags: ['Python', 'Web', 'Algorithms'] },
    { id: 'ai', label: 'AI', color: 'from-fuchsia-600 to-purple-500', tags: ['LLMs', 'Vision', 'Agents'] },
    { id: 'space', label: 'Space', color: 'from-slate-700 to-slate-500', tags: ['NASA', 'SpaceX', 'Cosmos'] },
    { id: 'nature', label: 'Nature', color: 'from-green-600 to-emerald-500', tags: ['Wildlife', 'Botany', 'Earth'] },
    { id: 'environment', label: 'Environment', color: 'from-teal-500 to-green-400', tags: ['Climate', 'Eco', 'Energy'] },
    // Lifestyle
    { id: 'gaming', label: 'Gaming', color: 'from-violet-600 to-indigo-500', tags: ['Indie', 'PC', 'RPG'] },
    { id: 'cinema', label: 'Cinema', color: 'from-red-600 to-orange-500', tags: ['Movies', 'Cinematography'] },
    { id: 'food', label: 'Food', color: 'from-orange-500 to-yellow-400', tags: ['Culinary', 'Baking', 'Chefs'] },
    { id: 'travel', label: 'Travel', color: 'from-cyan-500 to-sky-400', tags: ['DigitalNomad', 'Backpacking'] },
    { id: 'health', label: 'Health', color: 'from-teal-500 to-emerald-400', tags: ['Wellness', 'Fitness', 'Med'] },
];

const TopicSelector: React.FC<TopicSelectorProps> = ({ onComplete }) => {
    const { user, profile, fetchProfile } = useAuth();
    const { setError } = useStatus();
    const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [sortedTopics, setSortedTopics] = useState(TOPICS);

    // ALGORITHM: Fetch post counts to prioritize "Trending" domains
    useEffect(() => {
        const fetchTrends = async () => {
            try {
                // Get post volume per domain
                const rows = await execute('SELECT domain_id, COUNT(*) as count FROM posts GROUP BY domain_id');
                const counts: Record<string, number> = {};
                rows.forEach((r: any) => {
                    counts[r.domain_id] = Number(r.count);
                });

                // Sort: High volume first (Algorithm)
                const sorted = [...TOPICS].sort((a, b) => {
                    const countA = counts[a.id] || 0;
                    const countB = counts[b.id] || 0;
                    return countB - countA; // Descending
                });

                setSortedTopics(sorted);

            } catch (e) {
                console.error("Failed to load topic trends", e);
                // Fallback to default order if offline
            }
        };

        fetchTrends();
    }, []);

    useEffect(() => {
        if (profile?.interests) {
            setSelectedTopics(profile.interests.split(',').filter(Boolean));
        }
    }, [profile]);

    const toggleTopic = (id: string) => {
        setSelectedTopics(prev =>
            prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
        );
    };

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            const interestsStr = selectedTopics.join(',');
            await execute('UPDATE profiles SET interests = ? WHERE id = ?', [interestsStr, user.uid]);
            await fetchProfile(); // Force refresh of local profile context
            onComplete();
        } catch (e) {
            console.error("Failed to save interests", e);
            setError("Failed to save interests.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-start md:justify-center w-full min-h-screen p-6 animate-fade-in pt-12 pb-48">
            <div className="text-center mb-12 relative z-10">
                <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter mb-4 font-['Inter'] drop-shadow-2xl">
                    Select Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300">Frequency</span>
                </h2>
                <p className="text-slate-400 text-sm md:text-base max-w-lg mx-auto font-medium tracking-wide">
                    Tune into the domains that resonate with your intellect.
                </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-5 mb-12 w-full max-w-6xl relative z-10">
                {sortedTopics.map((topic) => {
                    const isSelected = selectedTopics.includes(topic.id);
                    return (
                        <button
                            key={topic.id}
                            onClick={() => toggleTopic(topic.id)}
                            className={`group relative p-6 rounded-3xl border transition-all duration-500 ease-out flex flex-col items-center justify-between overflow-hidden h-36 md:h-44 backdrop-blur-xl ${isSelected
                                ? 'border-white/50 bg-white/10 scale-105 shadow-[0_0_50px_-10px_rgba(255,255,255,0.2)] ring-1 ring-white/30'
                                : 'border-white/5 bg-black/20 hover:bg-white/5 hover:border-white/20 hover:scale-[1.03] hover:shadow-2xl'
                                }`}
                        >
                            {/* Dynamic Glow Background */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${topic.color} transition-all duration-700 blur-[80px] opacity-0 ${isSelected ? 'opacity-30' : 'group-hover:opacity-20'}`} />

                            {/* Animated Gradient Border Line */}
                            <div className={`absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-r ${topic.color} transition-all duration-500 ${isSelected ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-50 group-hover:opacity-50 group-hover:scale-x-75'}`} />

                            <div className="relative z-10 flex flex-col items-center gap-2">
                                <span className={`font-black tracking-tight text-xl md:text-2xl transition-colors duration-300 ${isSelected ? 'text-white drop-shadow-md' : 'text-slate-400 group-hover:text-white'}`}>
                                    {topic.label}
                                </span>
                                {/* Smart Tag Count or Detail (Optional polish) */}
                                <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors duration-300 ${isSelected ? 'text-white/80' : 'text-slate-600 group-hover:text-slate-400'}`}>
                                    {isSelected ? 'Active' : 'Sphere'}
                                </span>
                            </div>

                            {/* Selection Indicator - Floating Orb */}
                            <div className={`absolute top-4 right-4 transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) ${isSelected ? 'scale-100 opacity-100 rotate-0' : 'scale-50 opacity-0 rotate-45'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-tr ${topic.color} shadow-lg ring-2 ring-black/10`}>
                                    <CheckIcon className="w-4 h-4 text-white stroke-[3px]" />
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Bottom Action Bar */}
            <div className="fixed bottom-10 left-0 right-0 z-50 flex justify-center pointer-events-none">
                <button
                    onClick={handleSave}
                    disabled={selectedTopics.length === 0 || isSaving}
                    className={`pointer-events-auto px-12 py-5 rounded-full font-black tracking-widest uppercase transition-all duration-500 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5)] border border-white/20 ${selectedTopics.length > 0 && !isSaving
                        ? 'bg-white text-black hover:scale-105 hover:bg-slate-100 active:scale-95'
                        : 'bg-black/80 text-slate-500 backdrop-blur-md border-white/5 cursor-not-allowed scale-95'
                        }`}
                >
                    {isSaving ? (
                        <span className="flex items-center gap-3">
                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                            Synchronizing...
                        </span>
                    ) : (
                        'Enter the Sphere'
                    )}
                </button>
            </div>

            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(40px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animate-fade-in {
                    animation: fade-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div>
    );
};

export default TopicSelector;
