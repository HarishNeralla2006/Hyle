import React, { useState, useEffect } from 'react';
import { execute } from '../lib/tidbClient';
import { useAuth } from '../contexts/AuthContext';
import { ViewState, ViewType, Profile } from '../types';
import { HeartIcon } from './icons';

interface NotificationsViewProps {
    setCurrentView: (view: ViewState) => void;
}

interface Notification {
    id: string;
    type: 'follow' | 'like' | 'comment';
    actor_id: string;
    created_at: string;
    read_status: boolean;
    actorProfile?: Profile;
    // For likes/comments
    entity_id?: string;
}

const FollowButton: React.FC<{ targetId: string }> = ({ targetId }) => {
    const { user } = useAuth();
    const [status, setStatus] = useState<'none' | 'pending' | 'accepted'>('none');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!user) return;
        execute('SELECT status FROM follows WHERE follower_id = ? AND following_id = ?', [user.uid, targetId])
            .then(res => {
                if (res.length > 0) setStatus(res[0].status);
            });
    }, [user, targetId]);

    const handleFollow = async () => {
        if (!user || loading) return;
        setLoading(true);
        try {
            if (status !== 'none') {
                // Unfollow
                setStatus('none'); // Optimistic
                await execute('DELETE FROM follows WHERE follower_id = ? AND following_id = ?', [user.uid, targetId]);
            } else {
                // Follow
                const newStatus = 'accepted'; // Simplify for notification context
                setStatus(newStatus); // Optimistic
                await execute('INSERT IGNORE INTO follows (follower_id, following_id, status) VALUES (?, ?, ?)', [user.uid, targetId, newStatus]);

                // Notify
                const notifId = crypto.randomUUID();
                await execute(
                    'INSERT INTO notifications (id, user_id, actor_id, type, created_at) VALUES (?, ?, ?, ?, ?)',
                    [notifId, targetId, user.uid, 'follow', new Date().toISOString()]
                );
            }
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    return (
        <button
            onClick={handleFollow}
            disabled={loading}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${status !== 'none'
                ? 'bg-white/10 text-white hover:bg-white/20'
                : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                }`}
        >
            {status === 'none' ? 'Follow Back' : (status === 'pending' ? 'Requested' : 'Following')}
        </button>
    );
};

const NotificationsView: React.FC<NotificationsViewProps> = ({ setCurrentView }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const fetchNotifications = async () => {
            try {
                // Fetch notifications for me
                const res = await execute(
                    `SELECT n.*, p.username, p.photoURL 
                     FROM notifications n
                     LEFT JOIN profiles p ON n.actor_id = p.id
                     WHERE n.user_id = ?
                     ORDER BY n.created_at DESC
                     LIMIT 50`,
                    [user.uid]
                );

                const mapped = res.map((n: any) => ({
                    id: n.id,
                    type: n.type,
                    actor_id: n.actor_id,
                    entity_id: n.entity_id,
                    created_at: n.created_at,
                    read_status: Boolean(n.read_status),
                    actorProfile: {
                        id: n.actor_id,
                        username: n.username || 'Unknown',
                        photoURL: n.photoURL
                    }
                }));

                setNotifications(mapped);
            } catch (e) {
                console.error("Failed to fetch notifications", e);
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();
    }, [user]);

    if (loading) return <div className="p-10 flex justify-center"><div className="w-6 h-6 border-2 border-indigo-500 rounded-full animate-spin"></div></div>;

    return (
        <div className="flex flex-col h-full bg-[var(--bg-color)] text-[var(--text-color)]">
            <div className="p-4 pb-2 md:p-6 md:pb-4 border-b border-[var(--glass-border)]">
                <h1 className="text-xl md:text-2xl font-bold">Notifications</h1>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                            <HeartIcon className="w-5 h-5 opacity-50" />
                        </div>
                        <p className="text-sm">Activity on your posts and profile will appear here.</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {notifications.map(note => (
                            <div
                                key={note.id}
                                className="flex items-center p-4 hover:bg-[var(--glass-surface)] transition-colors border-b border-white/5 last:border-0"
                            >
                                <div className="w-10 h-10 rounded-full bg-slate-800 shrink-0 mr-4 overflow-hidden">
                                    {note.actorProfile?.photoURL ? (
                                        <img src={note.actorProfile.photoURL} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white font-bold bg-indigo-600 text-xs">
                                            {note.actorProfile?.username?.[0]}
                                        </div>

                                    )}
                                </div>
                                <div className="flex-1 text-sm">
                                    <span className="font-bold cursor-pointer hover:underline" onClick={() => setCurrentView({ type: ViewType.Profile, userId: note.actor_id })}>
                                        {note.actorProfile?.username}
                                    </span>
                                    <span className="text-slate-400 ml-1">
                                        {note.type === 'follow' && 'started following you.'}
                                        {note.type === 'like' && 'liked your post.'}
                                        {note.type === 'comment' && 'commented: "..."'}
                                    </span>
                                    <p className="text-[10px] text-slate-600 font-mono mt-0.5">
                                        {new Date(note.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                {note.type === 'follow' && (
                                    <FollowButton targetId={note.actor_id} />
                                )}
                                {note.type === 'like' && (
                                    <div className="w-10 h-10 bg-slate-800 rounded-md">
                                        {/* Preview of post if possible */}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
};

export default NotificationsView;
