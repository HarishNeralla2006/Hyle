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
        <div className="flex flex-col items-center justify-center w-full p-4 animate-fade-in pt-10 pb-40">
            <div className="text-center mb-6">
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tighter mb-2 font-['Inter']">
                    Select Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">Spheres</span>
                </h2>
                <p className="text-slate-400 text-sm max-w-md mx-auto">
                    Choose the domains that resonate with your frequency.
                </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8 w-full max-w-4xl">
                {sortedTopics.map((topic) => {
                    const isSelected = selectedTopics.includes(topic.id);
                    return (
                        <button
                            key={topic.id}
                            onClick={() => toggleTopic(topic.id)}
                            className={`group relative p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center justify-between overflow-hidden h-28 md:h-32 backdrop-blur-sm ${isSelected
                                ? 'border-white/40 bg-white/10 scale-105 shadow-[0_0_30px_rgba(255,255,255,0.15)] ring-1 ring-white/20'
                                : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 hover:scale-[1.02]'
                                }`}
                        >
                            {/* Smart Ambient Glow (Relatable Aura) */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${topic.color} transition-all duration-500 blur-2xl ${isSelected ? 'opacity-25' : 'opacity-0 group-hover:opacity-10'}`} />

                            {/* Sharp Gradient Border hint */}
                            <div className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${topic.color} opacity-0 transition-opacity duration-300 ${isSelected ? 'opacity-100' : 'group-hover:opacity-50'}`} />

                            <span className={`relative z-10 font-bold tracking-tight text-lg transition-colors duration-300 ${isSelected ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                                {topic.label}
                            </span>

                            {/* Selection Indicator */}
                            <div className={`absolute top-3 right-3 transition-all duration-300 ${isSelected ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center bg-gradient-to-br ${topic.color} shadow-lg ring-2 ring-black/20`}>
                                    <CheckIcon className="w-3.5 h-3.5 text-white" />
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            <button
                onClick={handleSave}
                disabled={selectedTopics.length === 0 || isSaving}
                className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(255,255,255,0.3)] text-sm md:text-base"
            >
                {isSaving ? 'Synchronizing...' : 'Enter the Sphere'}
            </button>
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.6s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default TopicSelector;
