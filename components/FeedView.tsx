import React, { useState, useEffect, useCallback } from 'react';
import { execute } from '../lib/tidbClient';
import { useAuth } from '../contexts/AuthContext';
import { PostWithAuthorAndLikes, ViewState, ViewType, Comment } from '../types';
import { useStatus } from '../contexts/StatusContext';
import { HeartIcon, TrashIcon, BackIcon, CommentIcon, GlobeIcon } from './icons';
import PostView from './PostView';
import { RichTextRenderer } from './RichTextRenderer';
import CommunitySidebar from './CommunitySidebar';
import { fetchCommunities, joinCommunity, leaveCommunity, checkMembership, getMemberCount, Community } from '../lib/communities';
import TopicSelector from './TopicSelector';
import { normalizeSubTopic } from '../lib/normalization';

// ... (existing imports)



// Helper to organize comments into threads
const organizeComments = (comments: Comment[]) => {
    const map = new Map<string, Comment & { replies: Comment[] }>();
    const roots: (Comment & { replies: Comment[] })[] = [];

    // First pass: create nodes
    comments.forEach(c => {
        map.set(c.id, { ...c, replies: [] });
    });

    // Second pass: link children
    comments.forEach(c => {
        const node = map.get(c.id)!;
        if (c.parent_id && map.has(c.parent_id)) {
            map.get(c.parent_id)!.replies.push(node);
        } else {
            roots.push(node);
        }
    });

    return roots;
};

const CommentCard: React.FC<{ comment: Comment & { replies?: Comment[] }, onDelete: () => void, onReply: (id: string, username: string) => void, onDeleteComment: (id: string) => void, currentUserId: string | undefined, depth?: number }> = ({ comment, onDelete, onReply, onDeleteComment, currentUserId, depth = 0 }) => {
    const isOwner = comment.user_id === currentUserId;
    return (
        <div className={`transition-colors group animate-fade-in-right ${depth > 0 ? 'ml-3 md:ml-6 border-l-2 border-white/5 pl-3 md:pl-4' : 'border-t border-white/5 pt-4'}`}>
            <div className="flex justify-between items-start mb-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-bold text-xs text-indigo-300 tracking-wide font-mono">{comment.profiles.username}</span>
                    <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">:: {new Date(comment.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={() => onReply(comment.id, comment.profiles.username)} className="text-[10px] text-slate-500 hover:text-indigo-400 transition-colors uppercase font-bold tracking-wider opacity-0 group-hover:opacity-100">
                        Reply
                    </button>
                    {isOwner && (
                        <button onClick={onDelete} className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                            <TrashIcon className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed mb-2">{comment.content}</p>
            {/* Recursive Replies */}
            {comment.replies && comment.replies.length > 0 && (
                <div className="space-y-3 mt-3">
                    {comment.replies.map(reply => (
                        <CommentCard
                            key={reply.id}
                            comment={reply}
                            onDelete={() => onDeleteComment(reply.id)}
                            onReply={onReply}
                            onDeleteComment={onDeleteComment}
                            currentUserId={currentUserId}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const PostCard: React.FC<{ post: PostWithAuthorAndLikes; onToggleLike: () => void; onDelete: () => void; onComment: (content: string, parentId?: string) => Promise<void>; onDeleteComment: (commentId: string) => Promise<void>; currentUserId: string | undefined; onUserClick: (uid: string) => void; }> = ({ post, onToggleLike, onDelete, onComment, onDeleteComment, currentUserId, onUserClick }) => {
    const isOwner = post.user_id === currentUserId;
    const [commentContent, setCommentContent] = useState('');
    const [replyTo, setReplyTo] = useState<{ id: string, username: string } | null>(null);
    const [isCommenting, setIsCommenting] = useState(false);
    const [showComments, setShowComments] = useState(false);

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentContent.trim()) return;
        setIsCommenting(true);
        await onComment(commentContent, replyTo?.id);
        setCommentContent('');
        setReplyTo(null);
        setIsCommenting(false);
    };

    const threadedComments = React.useMemo(() => organizeComments(post.comments), [post.comments]);

    return (
        <div className="relative group perspective-1000 mb-6 w-full max-w-2xl mx-auto">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-indigo-600 rounded-[20px] blur opacity-0 group-hover:opacity-20 transition duration-500"></div>
            <div className="relative glass-panel rounded-[20px] p-0 overflow-hidden border border-[var(--glass-border)] bg-[var(--glass-surface)] transition-all duration-300 group-hover:-translate-y-1">
                <div className="p-4 md:p-6">
                    <div className="flex justify-between items-start mb-3 md:mb-4">
                        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onUserClick(post.user_id)}>
                            {post.profiles.photoURL ? (
                                <img src={post.profiles.photoURL} alt={post.profiles.username} className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-white/10" />
                            ) : (
                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-indigo-500/20 flex items-center justify-center border border-white/10">
                                    <span className="text-indigo-400 font-bold text-xs">{post.profiles.username?.[0]?.toUpperCase()}</span>
                                </div>
                            )}
                            <div>
                                <h3 className="font-bold text-white text-sm md:text-base leading-tight hover:text-indigo-400 transition-colors">
                                    @{post.profiles.username}
                                </h3>
                                <span className="text-[10px] md:text-xs text-slate-500 font-mono">
                                    {new Date(post.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                        {isOwner && (
                            <button onClick={onDelete} className="text-slate-600 hover:text-red-500 transition-colors p-1">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Post Image */}
                    {post.imageURL && (
                        <div className="mb-4 rounded-xl overflow-hidden shadow-lg border border-white/5">
                            <img
                                src={post.imageURL}
                                alt="Transmission visual"
                                className="w-full h-auto object-cover max-h-[500px]"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                        </div>
                    )}

                    <div className="mb-4">
                        <RichTextRenderer content={post.content} />
                    </div>

                    <div className="flex items-center justify-between text-slate-400 pt-3 md:pt-4 border-t border-white/5">
                        <div className="flex space-x-4 md:space-x-6">
                            <button
                                onClick={onToggleLike}
                                className={`flex items-center space-x-1.5 md:space-x-2 group transition-colors ${post.is_liked_by_user ? 'text-pink-500' : 'hover:text-pink-400'}`}
                            >
                                <HeartIcon className={`w-4 h-4 md:w-5 md:h-5 transition-transform group-hover:scale-110 ${post.is_liked_by_user ? 'fill-current' : ''}`} />
                                <span className="text-xs font-medium">{post.like_count}</span>
                            </button>
                            <button
                                onClick={() => setShowComments(!showComments)}
                                className="flex items-center space-x-1.5 md:space-x-2 hover:text-cyan-400 transition-colors group"
                            >
                                <CommentIcon className="w-4 h-4 md:w-5 md:h-5 transition-transform group-hover:scale-110" />
                                <span className="text-xs font-medium">{post.comment_count}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Comments Section */}
                {showComments && (
                    <div className="bg-[#0a0a0f]/50 border-t border-white/5 p-4 md:p-6 animate-fade-in-up">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Transmission Log</h4>

                        <form onSubmit={handleCommentSubmit} className="mb-6 relative">
                            {replyTo && (
                                <div className="flex items-center justify-between bg-indigo-500/10 px-3 py-1.5 rounded-t-lg border border-indigo-500/20 border-b-0">
                                    <span className="text-[10px] text-indigo-300 font-mono">Replying to @{replyTo.username}</span>
                                    <button type="button" onClick={() => setReplyTo(null)} className="text-slate-500 hover:text-white">&times;</button>
                                </div>
                            )}
                            <div className="relative">
                                <input
                                    type="text"
                                    value={commentContent}
                                    onChange={(e) => setCommentContent(e.target.value)}
                                    placeholder="Add to the signal..."
                                    className={`w-full bg-[#050508] border border-white/10 p-3 md:p-4 text-xs md:text-sm text-white placeholder-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none ${replyTo ? 'rounded-b-xl rounded-t-none' : 'rounded-xl'}`}
                                />
                                <button
                                    type="submit"
                                    disabled={!commentContent.trim() || isCommenting}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                </button>
                            </div>
                        </form>

                        <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                            {threadedComments.length === 0 ? (
                                <p className="text-center text-slate-600 text-xs py-4">No signals yet.</p>
                            ) : (
                                threadedComments.map(comment => (
                                    <CommentCard
                                        key={comment.id}
                                        comment={comment}
                                        onDelete={() => onDeleteComment(comment.id)}
                                        onReply={(id, username) => setReplyTo({ id, username })}
                                        onDeleteComment={onDeleteComment}
                                        currentUserId={currentUserId}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const FeedView: React.FC<{ onViewChange: (view: ViewState) => void }> = ({ onViewChange }) => {
    const { user } = useAuth();
    const { error, setError } = useStatus();
    const [posts, setPosts] = useState<PostWithAuthorAndLikes[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullStartPoint, setPullStartPoint] = useState(0);
    const [pullChange, setPullChange] = useState(0);
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const [showTopicSelector, setShowTopicSelector] = useState(false);

    // Community Feed State
    const [activeCommunity, setActiveCommunity] = useState<Community | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Membership State
    const [isMember, setIsMember] = useState(false);
    const [memberCount, setMemberCount] = useState(0);

    useEffect(() => {
        if (activeCommunity && user) {
            checkMembership(activeCommunity.id, user.uid).then(setIsMember);
            getMemberCount(activeCommunity.id).then(setMemberCount);
        } else {
            setIsMember(false);
            setMemberCount(0);
        }
    }, [activeCommunity, user]);

    const handleJoinToggle = async () => {
        if (!activeCommunity || !user) return;
        if (isMember) {
            await leaveCommunity(activeCommunity.id, user.uid);
            setIsMember(false);
            setMemberCount(c => Math.max(0, c - 1));
        } else {
            await joinCommunity(activeCommunity.id, user.uid);
            setIsMember(true);
            setMemberCount(c => c + 1);
        }
    };

    const fetchFeed = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            // Logic:
            // 1. If Active Community -> Filter by Tags
            // 2. Else -> Show Global Feed (based on user interests)

            let sql = "";
            let params: any[] = [];

            if (activeCommunity) {
                // Community Mode: Filter by tags using LIKE
                const conditions = activeCommunity.tags.map(tag => `(LOWER(content) LIKE ? OR LOWER(domain_id) LIKE ?)`);
                if (conditions.length === 0) {
                    // Fallback if no tags?
                    sql = `SELECT * FROM posts WHERE 1=0`; // Return nothing
                } else {
                    const whereClause = conditions.join(' OR ');
                    // Add params twice for each tag (one for content, one for domain)
                    const tagParams = activeCommunity.tags.flatMap(t => [`%${t.toLowerCase()}%`, `%${t.toLowerCase()}%`]);

                    sql = `
                SELECT
                p.*,
                u.username,
                u.photoURL,
                (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) as like_count,
                (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count,
                EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = ?) as is_liked_by_user
                FROM posts p
                LEFT JOIN profiles u ON p.user_id = u.id
                WHERE ${whereClause}
                ORDER BY p.created_at DESC
                LIMIT 50
                `;
                    params = [user.uid, ...tagParams];
                }
            } else {
                // Standard Feed Logic
                // 1. Get User Interests
                const profileRes = await execute('SELECT interests FROM profiles WHERE id = ?', [user.uid]);
                const profile = profileRes[0] as { interests?: string };

                if (!profile?.interests || profile.interests.length === 0) {
                    setShowTopicSelector(true);
                    setLoading(false);
                    return;
                }

                // Parse interests
                const interestTags = profile.interests.split(',').map(s => s.trim().toLowerCase());

                // Add related/normalized tags (simple expansion)
                const expandedTags = new Set(interestTags);
                interestTags.forEach(tag => {
                    // simple pluralization
                    if (tag.endsWith('s')) expandedTags.add(tag.slice(0, -1));
                    else expandedTags.add(tag + 's');
                });

                const finalTags = Array.from(expandedTags);

                // Build Dynamic Query
                const conditions = finalTags.map(() => `LOWER(domain_id) = ? OR LOWER(content) LIKE ?`);
                const queryWhere = conditions.join(' OR ');
                const queryParams = finalTags.flatMap(t => [t, `%#${t}%`]);

                sql = `
                SELECT
                p.*,
                u.username,
                u.photoURL,
                (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) as like_count,
                (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count,
                EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = ?) as is_liked_by_user
                FROM posts p
                LEFT JOIN profiles u ON p.user_id = u.id
                WHERE ${queryWhere}
                ORDER BY
                (u.id IS NOT NULL) DESC,
                (like_count + comment_count) DESC,
                p.created_at DESC
                LIMIT 50
                `;

                params = [user.uid, ...queryParams];
            }

            const rawPosts = await execute(sql, params);

            // Fetch comments for these posts
            const postIds = rawPosts.map((p: any) => p.id);
            let comments: any[] = [];
            if (postIds.length > 0) {
                const placeholders = postIds.map(() => '?').join(',');
                const commentsSql = `
                SELECT c.*, p.username, p.photoURL
                FROM comments c
                LEFT JOIN profiles p ON c.user_id = p.id
                WHERE c.post_id IN (${placeholders})
                ORDER BY c.created_at ASC
                `;
                comments = await execute(commentsSql, postIds);
            }

            const postsWithComments = rawPosts.map((post: any) => ({
                ...post,
                profiles: {
                    username: post.username,
                    photoURL: post.photoURL
                },
                comments: postIds.length > 0 ? comments.filter((c: any) => c.post_id === post.id).map((c: any) => ({
                    ...c,
                    profiles: { username: c.username, photoURL: c.photoURL }
                })) : []
            }));
            setPosts(postsWithComments);
        } catch (err: any) {
            console.error(err);
            setError("Signal lost. Reconnecting...");
        } finally {
            setLoading(false);
        }
    }, [user, activeCommunity, setError]);

    useEffect(() => {
        fetchFeed();
    }, [fetchFeed]);

    const handleToggleLike = async (post: PostWithAuthorAndLikes) => {
        if (!user) return;
        const isLiked = post.is_liked_by_user;
        setPosts(current => current.map(p => {
            if (p.id === post.id) {
                return {
                    ...p,
                    is_liked_by_user: !isLiked,
                    like_count: isLiked ? p.like_count - 1 : p.like_count + 1
                };
            }
            return p;
        }));

        try {
            if (post.is_liked_by_user) await execute('DELETE FROM likes WHERE post_id = ? AND user_id = ?', [post.id, user.uid]);
            else await execute('INSERT INTO likes (id, post_id, user_id, created_at) VALUES (UUID(), ?, ?, ?)', [post.id, user.uid, new Date().toISOString()]);
        } catch (err: any) { }
    };

    const handleDeletePost = async (postId: string) => {
        try {
            await execute('DELETE FROM posts WHERE id = ?', [postId]);
            setPosts(p => p.filter(x => x.id !== postId));
        } catch (err: any) { setError("Failed to delete post."); }
    };

    const handleCreateComment = async (postId: string, content: string, parentId?: string) => {
        if (!content.trim() || !user) return;
        try {
            const newId = crypto.randomUUID();
            const now = new Date().toISOString();
            await execute('INSERT INTO comments (id, post_id, user_id, content, created_at, parent_id) VALUES (?, ?, ?, ?, ?, ?)', [newId, postId, user.uid, content.trim(), now, parentId || null]);
            fetchFeed();
        } catch (err: any) { setError("Failed to post comment."); }
    };

    const handleDeleteComment = async (postId: string, commentId: string) => {
        try {
            await execute('DELETE FROM comments WHERE id = ?', [commentId]);
            fetchFeed();
        } catch (e) { setError("Failed to delete comment"); }
    };

    const onTouchStart = (e: React.TouchEvent) => {
        if (scrollContainerRef.current?.scrollTop === 0) {
            setPullStartPoint(e.targetTouches[0].clientY);
        }
    };

    const onTouchMove = (e: React.TouchEvent) => {
        if (pullStartPoint === 0) return;

        const currentY = e.targetTouches[0].clientY;
        const dy = currentY - pullStartPoint;

        if (dy > 0 && scrollContainerRef.current?.scrollTop === 0) {
            setPullChange(dy * 0.4);
        } else {
            setPullChange(0);
        }
    };

    const onTouchEnd = async () => {
        if (pullChange > 70) {
            setIsRefreshing(true);
            setPullChange(70);
            await fetchFeed();
            setIsRefreshing(false);
        }
        setPullStartPoint(0);
        setPullChange(0);
    };


    return (
        <div className="w-full h-full flex flex-col items-center relative overflow-hidden">

            {/* Sidebar (Absolute Overlay) */}
            <CommunitySidebar
                activeId={activeCommunity?.id || null}
                onSelect={(comm) => { setActiveCommunity(comm); setIsSidebarOpen(false); }}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            {showTopicSelector ? (
                <div className="w-full h-full overflow-y-auto custom-scrollbar">
                    <div className="min-h-full flex items-center justify-center py-20">
                        <TopicSelector onComplete={() => { setShowTopicSelector(false); fetchFeed(); }} />
                    </div>
                </div>
            ) : (
                <div
                    ref={scrollContainerRef}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                    className="w-full h-full max-w-4xl px-3 md:px-4 pt-20 md:pt-24 pb-20 md:pb-32 overflow-y-auto custom-scrollbar snap-y snap-mandatory md:snap-none relative"
                >
                    {/* Pull to Refresh Indicator */}
                    <div
                        style={{ height: `${pullChange}px`, opacity: Math.min(pullChange / 70, 1) }}
                        className="w-full flex items-center justify-center overflow-hidden transition-all duration-200 ease-out -mt-4 md:mt-0"
                    >
                        {isRefreshing ? (
                            <div className="flex flex-col items-center py-2">
                                <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                            </div>
                        ) : (
                            <div className={`transform transition-transform duration-300 ${pullChange > 70 ? 'rotate-180' : ''}`}>
                                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                </svg>
                            </div>
                        )}
                    </div>

                    {/* Feed Content */}
                    <div className="flex flex-col items-center mb-8 md:mb-8 snap-start shrink-0 min-h-[20vh] md:min-h-0 justify-center md:justify-start w-full max-w-4xl px-4">

                        {/* Floating Sidebar Toggle - Always Visible */}
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="fixed top-20 left-4 md:left-8 p-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full text-indigo-400 hover:text-white hover:bg-indigo-600 transition-all z-30 shadow-lg group"
                            title="Open Frequencies"
                        >
                            <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" /></svg>
                        </button>

                        {/* Conditional Header Rendering */}
                        {!activeCommunity ? (
                            // GLOBAL FEED (Simple Restoration)
                            <div className="w-full flex items-center justify-between py-6 px-2 md:px-0 snap-start">
                                <div>
                                    <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter">Signal</h1>
                                    <p className="text-slate-500 font-medium text-sm">Your universal feed.</p>
                                </div>
                                <button
                                    onClick={() => setShowTopicSelector(true)}
                                    className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white transition-colors flex items-center gap-2"
                                >
                                    <span className="text-xs font-bold uppercase tracking-wider hidden md:inline">Customize</span>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                                </button>
                            </div>
                        ) : (
                            // COMMUNITY VIEW (Profile Style)
                            <div className="w-full bg-[#0f0f11] border border-white/10 rounded-[2.5rem] p-6 md:p-10 flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-10 shadow-2xl relative overflow-hidden mt-4 snap-start">

                                {/* Decorative Blur */}
                                <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-900/20 rounded-full blur-[120px]"></div>

                                {/* Icon / Avatar */}
                                <div className="relative group shrink-0">
                                    <div className="w-24 h-24 md:w-40 md:h-40 rounded-[2rem] overflow-hidden shadow-2xl bg-[#1a1a1a] flex items-center justify-center border border-white/5">
                                        {activeCommunity.icon ? (
                                            <img src={activeCommunity.icon} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-4xl md:text-6xl font-black text-indigo-500/50">
                                                {activeCommunity.name.charAt(0)}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Info & Actions */}
                                <div className="flex-1 z-10 w-full text-center md:text-left pt-2">
                                    <div className="flex flex-col md:flex-row justify-between items-center md:items-start mb-4 gap-4">
                                        <div>
                                            <div className="flex items-center justify-center md:justify-start space-x-3 mb-1">
                                                <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight font-['Inter']">
                                                    {activeCommunity.name}
                                                </h1>
                                                <span className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[10px] font-black uppercase tracking-wider">BAND</span>
                                            </div>
                                            <p className="text-lg font-medium text-slate-400 leading-snug max-w-md mx-auto md:mx-0">
                                                {activeCommunity.description || `Transmitting frequency: ${activeCommunity.tags.join(', ')}`}
                                            </p>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex space-x-3">
                                            <button
                                                onClick={handleJoinToggle}
                                                className={`px-6 py-2.5 rounded-xl font-bold shadow-lg transition-transform active:scale-95 border border-white/10 text-xs uppercase tracking-wide ${isMember ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50' : 'bg-white text-black hover:bg-indigo-50'}`}
                                            >
                                                {isMember ? 'Joined' : 'Join'}
                                            </button>
                                            <button className="p-2.5 rounded-xl border border-white/20 hover:bg-white/5 transition-colors text-white group relative">
                                                <svg className="w-5 h-5 group-hover:text-yellow-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                                {/* Bell Badge Placeholder */}
                                                <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Stats Row */}
                                    <div className="flex items-center justify-center md:justify-start space-x-12 border-t border-white/5 pt-6 mt-2">
                                        <div className="text-center md:text-left group cursor-pointer">
                                            <div className="text-slate-500 text-[10px] font-bold uppercase mb-1 tracking-wider group-hover:text-white transition-colors">Members</div>
                                            <div className="text-2xl font-black font-['Inter'] text-white">
                                                {memberCount}
                                            </div>
                                        </div>
                                        <div className="text-center md:text-left">
                                            <div className="text-slate-500 text-[10px] font-bold uppercase mb-1 tracking-wider">Online</div>
                                            <div className="text-2xl font-black font-['Inter'] text-green-500 flex items-center justify-center md:justify-start gap-2">
                                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                                {Math.floor(memberCount * 0.1) + 2}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-xs text-indigo-400 animate-pulse font-mono tracking-widest">RECEIVING SIGNAL...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                            <p className="text-red-400 font-bold mb-2">Signal Lost</p>
                            <p className="text-slate-500 text-sm mb-4">{error}</p>
                            <button onClick={fetchFeed} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white text-xs font-bold uppercase tracking-wider">Retry Connection</button>
                        </div>
                    ) : posts.length === 0 ? (
                        <div className="text-center py-20 px-6">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">📡</span>
                            </div>
                            <h3 className="text-white font-bold mb-2">No signals detected</h3>
                            <p className="text-slate-500 text-sm max-w-xs mx-auto">This frequency is quiet. Be the first to broadcast.</p>
                        </div>
                    ) : (
                        posts.map(post => (
                            <div key={post.id} className="snap-start mb-6">
                                <PostCard
                                    post={post}
                                    onToggleLike={() => handleToggleLike(post)}
                                    onDelete={() => handleDeletePost(post.id)}
                                    onComment={(content, parentId) => handleCreateComment(post.id, content, parentId)}
                                    onDeleteComment={(cid) => handleDeleteComment(post.id, cid)}
                                    currentUserId={user?.uid}
                                    onUserClick={(uid) => onViewChange({ type: ViewType.Profile, userId: uid })}
                                />
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default FeedView;
