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

    // ALGORITHM: Smart Recommendations - Global Popularity + User Affinity
    useEffect(() => {
        const fetchTrends = async () => {
            try {
                // 1. Get Global Popularity (Post Counts)
                const rows = await execute('SELECT domain_id, COUNT(*) as count FROM posts GROUP BY domain_id');
                const globalCounts: Record<string, number> = {};
                rows.forEach((r: any) => {
                    globalCounts[r.domain_id] = Number(r.count);
                });

                // 2. Get User Affinity (Saved Domains)
                let userSaved: string[] = [];
                if (user) {
                    const savedRows = await execute('SELECT domain_id FROM saved_domains WHERE user_id = ?', [user.uid]);
                    userSaved = savedRows.map((r: any) => r.domain_id);
                }

                // 3. Get User Affinity (Liked Posts -> Domains)
                let userLikedDomains: string[] = [];
                if (user) {
                    // Join likes with posts to get domain_id
                    const likedRows = await execute(`
                        SELECT p.domain_id 
                        FROM likes l 
                        JOIN posts p ON l.post_id = p.id 
                        WHERE l.user_id = ?
                   `, [user.uid]);
                    userLikedDomains = likedRows.map((r: any) => r.domain_id);
                }

                // 4. Calculate Weight & Sort
                // Weight: Global Count + (Saved * 50) + (Liked * 10)
                const sorted = [...TOPICS].sort((a, b) => {
                    const countA = globalCounts[a.id] || 0;
                    const countB = globalCounts[b.id] || 0;

                    let scoreA = countA;
                    let scoreB = countB;

                    // Boost for Saved
                    if (userSaved.includes(a.id)) scoreA += 50;
                    if (userSaved.includes(b.id)) scoreB += 50;

                    // Boost for Liked (Frequency of likes in that domain)
                    const likesA = userLikedDomains.filter(d => d === a.id).length;
                    const likesB = userLikedDomains.filter(d => d === b.id).length;
                    scoreA += (likesA * 10);
                    scoreB += (likesB * 10);

                    return scoreB - scoreA; // Descending
                });

                setSortedTopics(sorted);

            } catch (e) {
                console.error("Failed to load topic trends", e);
                // Fallback to default order if offline
            }
        };

        fetchTrends();
    }, [user]);

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
                <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-3 font-['Inter']">
                    Select Your Frequency
                </h2>
                <p className="text-slate-500 text-sm font-medium tracking-wide">
                    Curate your feed.
                </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-12 w-full max-w-6xl relative z-10">
                {sortedTopics.map((topic) => {
                    const isSelected = selectedTopics.includes(topic.id);
                    return (
                        <button
                            key={topic.id}
                            onClick={() => toggleTopic(topic.id)}
                            className={`group relative p-6 rounded-2xl border transition-all duration-300 flex flex-col items-center justify-center h-32 md:h-40 ${isSelected
                                ? 'bg-white border-white text-black scale-105 shadow-xl'
                                : `bg-transparent border-white/10 text-slate-400 hover:text-white hover:scale-105 hover:border-[var(--hover-color)] hover:shadow-lg`
                                }`}
                            style={!isSelected ? { '--hover-color': topic.color.includes('red') ? '#ef4444' : topic.color.includes('blue') ? '#3b82f6' : topic.color.includes('green') ? '#22c55e' : '#a855f7' } as React.CSSProperties : {}}
                        >
                            <span className={`font-bold tracking-tight text-lg md:text-xl transition-colors ${isSelected ? 'text-black' : 'text-current'}`}>
                                {topic.label}
                            </span>
                            {/* Minimal Color Accent Dot on Hover (Optional, keeping it super minimal as per request, just border is good) */}
                        </button>
                    );
                })}
            </div>

            {/* Bottom Action Bar */}
            <div className="fixed bottom-10 left-0 right-0 z-50 flex justify-center pointer-events-none">
                <button
                    onClick={handleSave}
                    disabled={selectedTopics.length === 0 || isSaving}
                    className={`pointer-events-auto px-10 py-4 rounded-full font-bold tracking-wide transition-all duration-200 ${selectedTopics.length > 0 && !isSaving
                        ? 'bg-white text-black hover:bg-slate-200'
                        : 'bg-white/10 text-slate-500 cursor-not-allowed'
                        }`}
                >
                    {isSaving ? 'Updating...' : 'Enter Sphere'}
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
