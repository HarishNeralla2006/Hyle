
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { execute } from '../lib/tidbClient';
import { useAuth } from '../contexts/AuthContext';
import { PostWithAuthorAndLikes, ViewState, ViewType, Comment } from '../types';
import { useStatus } from '../contexts/StatusContext';
import { HeartIcon, TrashIcon, BackIcon, CommentIcon, ReplyIcon, EditIcon } from './icons';


interface PostViewProps {
    domainId: string;
    domainName: string;
    setCurrentView: (view: ViewState) => void;
    focusedPostId?: string;
    onEditPost?: (post: PostWithAuthorAndLikes) => void;
    refreshKey?: number;
}

const CommentCard: React.FC<{ comment: Comment, onDelete: () => void, onReply: (username: string) => void, onUserClick: (uid: string) => void, currentUserId: string | undefined }> = ({ comment, onDelete, onReply, onUserClick, currentUserId }) => {
    const isOwner = comment.user_id === currentUserId;
    return (
        <div className="py-3 border-l-2 border-white/5 pl-4 hover:border-[var(--primary-accent)]/50 transition-colors group animate-fade-in-right">
            <div className="flex justify-between items-start mb-1">
                <div className="flex items-center space-x-2">
                    <span onClick={() => onUserClick(comment.user_id)} className="font-bold text-xs text-[var(--primary-accent)] tracking-wide font-mono cursor-pointer hover:underline">{comment.profiles.username}</span>
                    <span className="text-[10px] text-slate-500 font-mono">:: {new Date(comment.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onReply(comment.profiles.username)} className="text-slate-600 hover:text-[var(--primary-accent)] transition-colors" title="Reply">
                        <ReplyIcon className="w-3 h-3" />
                    </button>
                    {isOwner && (
                        <button onClick={onDelete} className="text-slate-600 hover:text-red-400 transition-colors" title="Delete">
                            <TrashIcon className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">{comment.content}</p>
        </div>
    );
};

const PostCard: React.FC<{ post: PostWithAuthorAndLikes; onToggleLike: () => void; onDelete: () => void; onEdit: () => void; onComment: (content: string) => Promise<void>; onDeleteComment: (commentId: string) => Promise<void>; currentUserId: string | undefined; onUserClick: (uid: string) => void; mode: 'gallery' | 'discussion' }> = ({ post, onToggleLike, onDelete, onEdit, onComment, onDeleteComment, currentUserId, onUserClick, mode }) => {
    const isOwner = post.user_id === currentUserId;
    const [commentContent, setCommentContent] = useState('');
    const [isCommenting, setIsCommenting] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentContent.trim()) return;
        setIsCommenting(true);
        await onComment(commentContent);
        setCommentContent('');
        setIsCommenting(false);
    };

    const handleReply = (username: string) => {
        setCommentContent(`@${username} `);
        inputRef.current?.focus();
    };

    if (mode === 'gallery') {
        return (
            <div className="relative group perspective-1000 mb-6 break-inside-avoid">
                <div className="relative glass-panel rounded-2xl overflow-hidden border border-[var(--glass-border)] bg-[var(--glass-surface)] hover:-translate-y-1 transition-transform duration-300">
                    <img src={post.imageURL} alt="Post" className="w-full h-auto object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                        <div className="flex items-center space-x-2 mb-2 cursor-pointer" onClick={() => onUserClick(post.user_id)}>
                            <div className="w-6 h-6 rounded-full bg-slate-700 overflow-hidden">
                                {post.profiles.photoURL ? (
                                    <img src={post.profiles.photoURL} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[10px] text-white font-bold">{post.profiles.username[0]}</div>
                                )}
                            </div>
                            <span className="text-white text-xs font-bold shadow-black drop-shadow-md">{post.profiles.username}</span>
                        </div>
                        <p className="text-slate-200 text-xs line-clamp-2 mb-2">{post.content}</p>
                        <div className="flex space-x-4">
                            <button onClick={(e) => { e.stopPropagation(); onToggleLike(); }} className={`flex items-center space-x-1 text-xs ${post.is_liked_by_user ? 'text-pink-500' : 'text-slate-300'}`}>
                                <HeartIcon className={`w-3 h-3 ${post.is_liked_by_user ? 'fill-current' : ''}`} />
                                <span>{post.like_count}</span>
                            </button>
                            {isOwner && (
                                <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="flex items-center space-x-1 text-xs text-slate-300 hover:text-[var(--primary-accent)] transition-colors">
                                    <EditIcon className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="relative group perspective-1000 mb-6">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--primary-accent)] to-purple-600 rounded-[20px] blur opacity-0 group-hover:opacity-20 transition duration-500"></div>
            <div className="relative glass-panel rounded-[20px] p-0 overflow-hidden border border-[var(--glass-border)] bg-[var(--glass-surface)] transition-all duration-300 group-hover:-translate-y-1">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onUserClick(post.user_id)}>
                            <div className="relative">
                                <div className="w-10 h-10 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-white font-bold text-sm shadow-inner overflow-hidden">
                                    {post.profiles.photoURL ? (
                                        <img src={post.profiles.photoURL} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="relative z-10">{post.profiles.username.charAt(0).toUpperCase()}</span>
                                    )}
                                    {!post.profiles.photoURL && <div className="absolute inset-0 bg-gradient-to-tr from-[var(--primary-accent)]/20 to-transparent"></div>}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-green-500 border-2 border-[#050508] rounded-full"></div>
                            </div>
                            <div>
                                <p className="font-bold text-sm text-[var(--text-color)] tracking-wide hover:text-[var(--primary-accent)] transition-colors">{post.profiles.username}</p>
                                <p className="text-[10px] text-[var(--primary-accent)] font-mono uppercase tracking-wider opacity-80">{new Date(post.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                        </div>
                        {isOwner && (
                            <div className="flex items-center space-x-1">
                                <button onClick={onEdit} className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-[var(--primary-accent)] transition-colors opacity-50 group-hover:opacity-100">
                                    <EditIcon className="w-4 h-4" />
                                </button>
                                <button onClick={onDelete} className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-red-400 transition-colors opacity-50 group-hover:opacity-100">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    <p className="text-[var(--text-color)] whitespace-pre-wrap leading-relaxed text-[15px] font-normal tracking-wide pl-1">{post.content}</p>

                    {post.imageURL && (
                        <div className="mt-4 rounded-xl overflow-hidden border border-white/10 max-h-96 w-full">
                            <img src={post.imageURL} alt="Post Attachment" className="w-full h-full object-cover" />
                        </div>
                    )}
                </div>

                <div className="px-6 py-3 bg-[var(--bg-color)]/20 border-t border-[var(--glass-border)] flex items-center space-x-6">
                    <button onClick={onToggleLike} className={`group/btn flex items-center space-x-2 transition-all ${post.is_liked_by_user ? 'text-pink-500' : 'text-slate-400 hover:text-white'}`}>
                        <div className={`p-1.5 rounded-full transition-colors ${post.is_liked_by_user ? 'text-pink-500' : 'group-hover/btn:bg-white/5'}`}>
                            <HeartIcon className={`w-4 h-4 transition-transform group-active/btn:scale-125 ${post.is_liked_by_user ? 'fill-current' : ''}`} />
                        </div>
                        <span className="font-mono text-xs font-bold">{post.like_count}</span>
                    </button>

                    <button onClick={() => setShowComments(!showComments)} className={`group/btn flex items-center space-x-2 transition-colors ${showComments ? 'text-[var(--primary-accent)]' : 'text-slate-400 hover:text-white'}`}>
                        <div className={`p-1.5 rounded-full transition-colors ${showComments ? 'bg-[var(--primary-accent)]/10' : 'group-hover/btn:bg-white/5'}`}>
                            <CommentIcon className="w-4 h-4" />
                        </div>
                        <span className="font-mono text-xs font-bold">{post.comment_count}</span>
                    </button>
                </div>

                {(showComments || post.comments.length > 0) && (
                    <div className="bg-[var(--glass-surface)] p-6 border-t border-white/5 shadow-inner">
                        {post.comments.length > 0 ? (
                            <div className="space-y-3 mb-6">
                                {post.comments.map(comment => (
                                    <CommentCard key={comment.id} comment={comment} onDelete={() => onDeleteComment(comment.id)} onReply={handleReply} onUserClick={onUserClick} currentUserId={currentUserId} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-4 mb-2">
                                <p className="text-xs text-slate-600 font-mono uppercase tracking-widest">Signal Void // No replies</p>
                            </div>
                        )}

                        {currentUserId && (
                            <form onSubmit={handleCommentSubmit} className="flex flex-col space-y-2">
                                {commentContent.startsWith('@') && (
                                    <div className="flex items-center space-x-2 px-2">
                                        <span className="text-[10px] text-[var(--primary-accent)] font-mono uppercase tracking-widest">
                                            Replying to {commentContent.split(' ')[0]}
                                        </span>
                                    </div>
                                )}
                                <div className="flex space-x-3 items-end">
                                    <div className="flex-1 relative group/input">
                                        <div className="absolute inset-0 bg-[var(--primary-accent)]/20 rounded-xl blur opacity-0 group-focus-within/input:opacity-100 transition duration-300"></div>
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={commentContent}
                                            onChange={(e) => setCommentContent(e.target.value)}
                                            placeholder="Transmit reply..."
                                            className="relative w-full bg-[var(--bg-color)] border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-[var(--primary-accent)]/50 transition-all placeholder-slate-600"
                                        />
                                    </div>
                                    <button type="submit" disabled={isCommenting || !commentContent.trim()} className="px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50 uppercase tracking-wider hover:text-[var(--primary-accent)]">
                                        {isCommenting ? '...' : 'Send'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};


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
                WHERE (LOWER(p.domain_id) = LOWER(?) OR LOWER(p.domain_id) LIKE LOWER(CONCAT('%/', ?))) 
                ORDER BY p.created_at DESC
            `;

            const rawPosts = await execute(sql, [userId, domainId, domainId]);

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
                    <div className="flex flex-col items-center justify-center pt-32">
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 border-4 border-[var(--primary-accent)]/20 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-t-[var(--primary-accent)] rounded-full animate-spin"></div>
                        </div>
                        <p className="mt-6 text-[var(--primary-accent)] font-mono text-xs uppercase tracking-widest animate-pulse">Establishing Uplink...</p>
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
                                onEdit={() => onEditPost?.(post)}
                                onComment={(content) => handleCreateComment(post.id, content)}
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
