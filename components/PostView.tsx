
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { execute } from '../lib/tidbClient';
import { useAuth } from '../contexts/AuthContext';
import { PostWithAuthorAndLikes, ViewState, ViewType, Comment } from '../types';
import { useStatus } from '../contexts/StatusContext';
import { HeartIcon, TrashIcon, BackIcon, CommentIcon, ReplyIcon, EditIcon } from './icons';
import { RichTextRenderer } from './RichTextRenderer';
import { normalizeSubTopic } from '../lib/normalization';
import PostCard from './PostCard';
import { PostListSkeleton } from './LoadingSkeletons';


interface PostViewProps {
    domainId: string;
    domainName: string;
    setCurrentView: (view: ViewState) => void;
    focusedPostId?: string;
    onEditPost?: (post: PostWithAuthorAndLikes) => void;
    refreshKey?: number;
}




const PostView: React.FC<PostViewProps> = ({ domainId, domainName, setCurrentView, focusedPostId, onEditPost, refreshKey }) => {
    const { user, profile } = useAuth();
    const [posts, setPosts] = useState<PostWithAuthorAndLikes[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { error, setError, setIsOffline } = useStatus();
    const [viewMode, setViewMode] = useState<'gallery' | 'discussion'>('gallery');
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const postRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

    useEffect(() => {
        if (focusedPostId && !isLoading) {
            const node = postRefs.current.get(focusedPostId);
            node?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [focusedPostId, isLoading]);

    const fetchPosts = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Complex SQL query to join profiles and get counts
            // NOTE: TiDB/MySQL syntax
            // Using UUID() for IDs generated on client, or we assume they are passed

            const userId = user ? user.uid : 'NO_USER';

            // ALIASING ALGORITHM: Handle singular/plural mismatches (e.g. "Art" vs "Arts")
            // This ensures both "Art" and "Arts" show content from both buckets.
            const normalize = (s: string) => s.toLowerCase().trim();
            const target = normalize(domainId);

            // ALIASING ALGORITHM V3: Smart Topic Normalization (Vector/Fuzzy Logic)
            const idSet = new Set<string>([target]);

            // 1. Get Canonical Topic (e.g. "Independent Games" -> "Indie Games")
            const canonical = normalizeSubTopic(target);
            if (canonical && normalize(canonical) !== target) {
                idSet.add(normalize(canonical));
            }

            // 2. Add Plurals/Singulars for good measure
            if (target === 'tech') idSet.add('technology');
            if (target === 'technology') idSet.add('tech');
            if (target === 'math') idSet.add('mathematics');

            if (target.endsWith('s')) idSet.add(target.slice(0, -1));
            else idSet.add(target + 's');

            // Also sanitize the canonical one for plurals
            if (canonical) {
                const canonNorm = normalize(canonical);
                if (canonNorm.endsWith('s')) idSet.add(canonNorm.slice(0, -1));
                else idSet.add(canonNorm + 's');
            }

            const potentialIds = Array.from(idSet);

            // Construct SQL with dynamic placeholders
            const placeholders = potentialIds.map(() => '?').join(',');

            const sql = `
                SELECT 
                    p.*, 
                    u.username, 
                    u.photoURL,
                    (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) as like_count,
                    (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count,
                    EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = ?) as is_liked_by_user
                FROM posts p 
                LEFT JOIN profiles u ON p.user_id = u.id 
                WHERE LOWER(p.domain_id) IN (${placeholders})
                ORDER BY p.created_at DESC
            `;

            // Flatten args: [userId, id1, id2, ...]
            const args = [userId, ...potentialIds];

            const rawPosts = await execute(sql, args);

            // We need to fetch comments separately or use JSON_ARRAYAGG if supported.
            // For simplicity, let's just fetch comments for these posts.
            // Actually, fetching comments for ALL posts in list is heavy.
            // Let's lazy load comments or just fetch for now to match previous behavior.

            const postsWithComments = await Promise.all(rawPosts.map(async (post: any) => {
                const commentsSql = `
                    SELECT c.*, u.username, u.photoURL 
                    FROM comments c
                    LEFT JOIN profiles u ON c.user_id = u.id
                    WHERE c.post_id = ?
                    ORDER BY c.created_at ASC
                `;
                const comments = await execute(commentsSql, [post.id]);

                return {
                    id: post.id,
                    content: post.content,
                    imageURL: post.imageURL,
                    created_at: post.created_at,
                    user_id: post.user_id,
                    domain_id: post.domain_id,
                    profiles: {
                        username: post.username || 'Unknown',
                        photoURL: post.photoURL
                    },
                    like_count: Number(post.like_count),
                    is_liked_by_user: Boolean(post.is_liked_by_user),
                    comment_count: Number(post.comment_count),
                    comments: comments.map((c: any) => ({
                        id: c.id,
                        user_id: c.user_id,
                        content: c.content,
                        created_at: c.created_at,
                        profiles: {
                            username: c.username || 'Unknown',
                            photoURL: c.photoURL
                        }
                    }))
                };
            }));

            setPosts(postsWithComments);

            if (postsWithComments.filter(p => p.imageURL).length === 0 && postsWithComments.length > 0) {
                if (viewMode === 'gallery') {
                    setViewMode('discussion');
                }
            }

        } catch (err: any) {
            console.error("Fetch posts failed:", err);
            if (err.message && err.message.includes('NetworkError')) {
                setIsOffline(true);
            }
            setError('Failed to fetch transmissions.');
        } finally {
            setIsLoading(false);
        }
    }, [domainId, user, setError, setIsOffline, viewMode]);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);


    const handleToggleLike = async (post: PostWithAuthorAndLikes) => {
        if (!user) return;
        const originalPosts = [...posts];
        // Optimistic update
        setPosts(currentPosts => currentPosts.map(p =>
            p.id === post.id
                ? { ...p, is_liked_by_user: !p.is_liked_by_user, like_count: p.is_liked_by_user ? p.like_count - 1 : p.like_count + 1 }
                : p
        ));

        try {
            if (post.is_liked_by_user) {
                await execute('DELETE FROM likes WHERE post_id = ? AND user_id = ?', [post.id, user.uid]);
            } else {
                await execute('INSERT INTO likes (id, post_id, user_id, created_at) VALUES (UUID(), ?, ?, ?)', [post.id, user.uid, new Date().toISOString()]);
            }
        } catch (err: any) {
            setError("Action failed.");
            setPosts(originalPosts);
        }
    };

    const handleDeletePost = async (postId: string) => {
        if (!user) return;
        try {
            await execute('DELETE FROM posts WHERE id = ?', [postId]);
            // Cascade delete would be handled by DB or manually
            await execute('DELETE FROM likes WHERE post_id = ?', [postId]);
            await execute('DELETE FROM comments WHERE post_id = ?', [postId]);
            setPosts(p => p.filter(x => x.id !== postId));
        } catch (err: any) { setError("Failed to delete post."); }
    };

    const handleDeleteComment = async (postId: string, commentId: string) => {
        try {
            await execute('DELETE FROM comments WHERE id = ?', [commentId]);
            setPosts(current => current.map(p => {
                if (p.id === postId) {
                    return {
                        ...p,
                        comments: p.comments.filter(c => c.id !== commentId),
                        comment_count: p.comment_count - 1
                    }
                }
                return p;
            }));
        } catch (e) { setError("Failed to delete comment"); }
    };

    const handleCreateComment = async (postId: string, content: string) => {
        if (!content.trim() || !user) return;
        try {
            const newId = crypto.randomUUID();
            const now = new Date().toISOString();
            await execute('INSERT INTO comments (id, post_id, user_id, content, created_at) VALUES (?, ?, ?, ?, ?)',
                [newId, postId, user.uid, content.trim(), now]
            );

            const newComment: Comment = {
                id: newId,
                user_id: user.uid,
                content: content.trim(),
                created_at: now,
                profiles: { username: profile?.username || 'Me', photoURL: profile?.photoURL }
            };

            setPosts(current => current.map(p => {
                if (p.id === postId) {
                    return {
                        ...p,
                        comments: [...p.comments, newComment],
                        comment_count: p.comment_count + 1
                    }
                }
                return p;
            }));
        } catch (err: any) { setError("Failed to post comment."); }
    };

    const filteredPosts = viewMode === 'gallery'
        ? posts.filter(p => p.imageURL)
        : posts;

    return (
        <div className="w-full h-full flex flex-col items-center relative bg-transparent overflow-hidden">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 pt-20 md:pt-6 pb-2 z-30 flex flex-col items-center pointer-events-none bg-gradient-to-b from-[var(--bg-color)] via-[var(--bg-color)]/80 to-transparent">
                <div className="w-full max-w-4xl px-4 flex flex-col items-center">
                    <div className="pointer-events-auto glass-panel rounded-full p-2 pr-6 flex items-center shadow-[0_10px_30px_-5px_rgba(0,0,0,0.5)] backdrop-blur-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)] relative overflow-hidden mb-4">
                        <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary-accent)]/10 to-transparent pointer-events-none"></div>
                        <button onClick={() => setCurrentView({ type: ViewType.Explore })} className="p-3 rounded-full hover:bg-white/10 transition-colors mr-3 text-slate-300 hover:text-white group relative z-10">
                            <BackIcon className="w-5 h-5 group-active:-translate-x-1 transition-transform" />
                        </button>
                        <div className="flex flex-col justify-center border-l border-[var(--glass-border)] pl-4 relative z-10">
                            <span className="text-[9px] uppercase tracking-[0.2em] text-[var(--primary-accent)] font-black mb-0.5 font-['Inter']">Channel Frequency</span>
                            <h1 className="text-lg font-black text-[var(--text-color)] tracking-tighter leading-none font-['Inter']">{domainName}</h1>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex space-x-1 glass-dock p-1 rounded-xl shadow-lg border border-[var(--glass-border)] pointer-events-auto">
                        <button
                            onClick={() => setViewMode('gallery')}
                            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${viewMode === 'gallery' ? 'bg-[var(--primary-accent)]/20 text-[var(--primary-accent)] shadow-inner' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                        >
                            Images
                        </button>
                        <button
                            onClick={() => setViewMode('discussion')}
                            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${viewMode === 'discussion' ? 'bg-[var(--primary-accent)]/20 text-[var(--primary-accent)] shadow-inner' : 'text-slate-500 hover:text-[var(--text-color)] hover:bg-[var(--primary-accent)]/10'}`}
                        >
                            Conversations
                        </button>
                    </div>
                </div>
            </header>

            {/* Posts List */}
            <main className={`w-full ${viewMode === 'gallery' ? 'max-w-5xl px-2' : 'max-w-2xl px-4'} flex-1 overflow-y-auto pt-60 md:pt-44 pb-32 custom-scrollbar min-h-0 relative`}>
                {isLoading && (
                    <div className="pt-20 md:pt-10">
                        <PostListSkeleton viewMode={viewMode} />
                    </div>
                )}

                {!isLoading && filteredPosts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-32 opacity-70">
                        <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-8 border border-white/10 shadow-inner">
                            <CommentIcon className="w-10 h-10 text-slate-600" />
                        </div>
                        <p className="text-white mb-2 font-bold text-xl tracking-tight">No Signal Found</p>
                        <p className="text-sm text-slate-500 font-mono text-center max-w-xs leading-relaxed">
                            {viewMode === 'gallery' ? 'No images transmitted on this frequency.' : 'No discussions active.'}
                        </p>
                    </div>
                )}

                <div className={viewMode === 'gallery' ? "columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4" : ""}>
                    {filteredPosts.map((post, index) => (
                        <div
                            key={post.id}
                            ref={el => { postRefs.current.set(post.id, el); }}
                            className="animate-slide-up"
                            style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards', opacity: 0 }}
                        >
                            <PostCard
                                post={post}
                                onToggleLike={() => handleToggleLike(post)}
                                onDelete={() => handleDeletePost(post.id)}
                                onComment={(content, parentId) => handleCreateComment(post.id, content)} // Updated signature
                                onDeleteComment={(commentId) => handleDeleteComment(post.id, commentId)}
                                currentUserId={user?.uid}
                                onUserClick={(uid) => setCurrentView({ type: ViewType.Post, domainId, domainName, focusedPostId, overlayProfileId: uid })}
                                mode={viewMode}
                            />
                        </div>
                    ))}
                </div>
            </main>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 4px; }
                @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
                @keyframes fade-in-right { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
                .animate-fade-in-right { animation: fade-in-right 0.3s ease-out forwards; }
                .perspective-1000 { perspective: 1000px; }
            `}</style>
        </div>
    );
};

export default PostView;
