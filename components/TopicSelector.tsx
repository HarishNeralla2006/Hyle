import React, { useState, useEffect } from 'react';
import { execute } from '../lib/tidbClient';
import { useAuth } from '../contexts/AuthContext';
import { useStatus } from '../contexts/StatusContext';
import { CheckIcon } from './icons';

interface TopicSelectorProps {
    onComplete: () => void;
}

const TOPICS = [
    { id: 'science', label: 'Science', color: 'from-blue-400 to-cyan-300' },
    { id: 'physics', label: 'Physics', color: 'from-purple-400 to-indigo-300' },
    { id: 'chemistry', label: 'Chemistry', color: 'from-green-400 to-emerald-300' },
    { id: 'business', label: 'Business', color: 'from-amber-400 to-orange-300' },
    { id: 'technology', label: 'Technology', color: 'from-red-400 to-pink-300' },
    { id: 'art', label: 'Art', color: 'from-pink-400 to-rose-300' },
    { id: 'design', label: 'Design', color: 'from-violet-400 to-fuchsia-300' },
    { id: 'music', label: 'Music', color: 'from-cyan-400 to-blue-300' },
    { id: 'history', label: 'History', color: 'from-yellow-400 to-amber-300' },
    { id: 'philosophy', label: 'Philosophy', color: 'from-teal-400 to-green-300' },
    { id: 'psychology', label: 'Psychology', color: 'from-indigo-400 to-violet-300' },
    { id: 'coding', label: 'Coding', color: 'from-lime-400 to-green-300' },
    { id: 'ai', label: 'AI', color: 'from-fuchsia-400 to-purple-300' },
    { id: 'space', label: 'Space', color: 'from-slate-400 to-gray-300' },
    { id: 'nature', label: 'Nature', color: 'from-emerald-400 to-green-300' },
];

const TopicSelector: React.FC<TopicSelectorProps> = ({ onComplete }) => {
    const { user, profile, fetchProfile } = useAuth();
    const { setError } = useStatus();
    const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

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
                {TOPICS.map((topic) => {
                    const isSelected = selectedTopics.includes(topic.id);
                    return (
                        <button
                            key={topic.id}
                            onClick={() => toggleTopic(topic.id)}
                            className={`group relative p-4 rounded-xl border transition-all duration-300 flex flex-col items-center justify-center overflow-hidden h-24 md:h-32 ${isSelected
                                ? 'border-white/20 bg-white/5 scale-105 shadow-[0_0_20px_rgba(255,255,255,0.1)]'
                                : 'border-white/5 bg-transparent hover:border-white/10 hover:bg-white/5'
                                }`}
                        >
                            {/* Background Gradient Blob */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${topic.color} opacity-0 transition-opacity duration-500 ${isSelected ? 'opacity-20' : 'group-hover:opacity-10'}`} />

                            {/* Check Icon */}
                            <div className={`absolute top-2 right-2 transition-transform duration-300 ${isSelected ? 'scale-100' : 'scale-0'}`}>
                                <div className="bg-white text-black rounded-full p-0.5">
                                    <CheckIcon className="w-2.5 h-2.5" />
                                </div>
                            </div>

                            <span className={`relative z-10 font-bold tracking-wide transition-colors text-sm md:text-lg ${isSelected ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                                {topic.label}
                            </span>
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
