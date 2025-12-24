import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { execute } from '../lib/tidbClient';
import { Profile, ViewState, ViewType } from '../types';
import { CloseIcon, CommentIcon } from './icons';
import { useStatus } from '../contexts/StatusContext';

interface UserProfileModalProps {
    userId: string;
    onClose: () => void;
    setCurrentView: (view: ViewState) => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ userId, onClose, setCurrentView }) => {
    const { user } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const { setError } = useStatus();

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const result = await execute('SELECT * FROM profiles WHERE id = ?', [userId]);
                if (result.length > 0) {
                    setProfile(result[0] as Profile);
                } else {
                    setProfile({ id: userId, username: 'Unknown User', email: '' });
                }
            } catch (e: any) {
                console.error("Failed to fetch user profile", e);
                setProfile({ id: userId, username: 'Private User', email: '' });
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [userId]);

    const handleStartChat = async () => {
        if (!user || !profile) return;
        
        // Simple chatId convention: sorted uids joined by underscore
        const participantIds = [user.uid, profile.id].sort();
        const chatId = `${participantIds[0]}_${participantIds[1]}`;

        try {
            // Check if chat exists, if not create it.
            // In MySQL we can use INSERT IGNORE or ON DUPLICATE KEY UPDATE
            // JSON array for participants
            const participantsJson = JSON.stringify(participantIds);
            
            await execute(
                'INSERT INTO chats (id, participants, updatedAt) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE updatedAt = VALUES(updatedAt)',
                [chatId, participantsJson, new Date().toISOString()]
            );
            
            onClose();
            setCurrentView({ type: ViewType.Chat, chatId, otherUserId: profile.id });
        } catch (e: any) {
            console.error("Failed to start chat", e);
            setError("Failed to initialize secure channel.");
        }
    };

    if (!userId) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[60] animate-fade-in" onClick={onClose}>
            <div className="glass-panel w-full max-w-sm p-8 rounded-[32px] border border-white/10 relative text-center" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                    <CloseIcon className="w-5 h-5"/>
                </button>

                {loading ? (
                    <div className="py-12 flex justify-center">
                        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                    </div>
                ) : profile ? (
                    <div className="flex flex-col items-center">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-3xl shadow-xl mb-4 overflow-hidden ring-4 ring-black/20">
                             {profile.photoURL ? (
                                <img src={profile.photoURL} alt={profile.username} className="w-full h-full object-cover" />
                             ) : (
                                <span>{profile.username?.charAt(0).toUpperCase() || '?'}</span>
                             )}
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-1">{profile.username}</h2>
                        <p className="text-indigo-400 font-mono text-xs tracking-widest mb-6">OPERATOR</p>

                        {user && user.uid !== profile.id && (
                            <button 
                                onClick={handleStartChat}
                                className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95"
                            >
                                <CommentIcon className="w-4 h-4" />
                                <span>Direct Message</span>
                            </button>
                        )}
                    </div>
                ) : (
                    <p className="text-slate-500">User not found.</p>
                )}
            </div>
            <style>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default UserProfileModal;
