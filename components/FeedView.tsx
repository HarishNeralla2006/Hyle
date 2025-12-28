import React, { useState, useEffect, useCallback } from 'react';
import FeedSkeleton from './FeedSkeleton';
import { execute } from '../lib/tidbClient';
import { useAuth } from '../contexts/AuthContext';
import { PostWithAuthorAndLikes, ViewState, ViewType, Comment } from '../types';
import { useStatus } from '../contexts/StatusContext';
import PostCard from './PostCard';
import CommunitySidebar from './CommunitySidebar';
import { fetchCommunities, joinCommunity, leaveCommunity, checkMembership, getMemberCount, Community } from '../lib/communities';
import TopicSelector from './TopicSelector';
import { normalizeSubTopic } from '../lib/normalization';

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
            // Check Membership
            checkMembership(activeCommunity.id, user.uid).then(setIsMember);
            getMemberCount(activeCommunity.id).then(setMemberCount);

            // SELF-HEALING REDIRECT:
            // If user somehow navigated to a "Ghost Bucket" (e.g. via old link or history),
            // we force a redirect to the Canonical version.
            const REDIRECT_MAP: { [key: string]: string } = {
                'sci': 'science',
                'science-1': 'science', // common duplicate pattern
                'comp-sci': 'computer-science',
                'comp-science': 'computer-science',
                'compmuter-science': 'computer-science',
                'maths': 'mathematics',
                'math': 'mathematics'
            };

            const targetId = REDIRECT_MAP[activeCommunity.id];
            if (targetId) {
                console.log(`[FeedView] Detected Ghost Bucket "${activeCommunity.id}". Redirecting to "${targetId}"...`);
                // Fetch to find the real object
                fetchCommunities().then(all => {
                    const target = all.find(c => c.id === targetId);
                    if (target) {
                        setActiveCommunity(target);
                    }
                });
            }

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
                like_count: Number(post.like_count),
                comment_count: Number(post.comment_count),
                is_liked_by_user: Boolean(post.is_liked_by_user),
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
                    className="w-full h-full max-w-4xl px-3 md:px-4 pt-28 md:pt-32 pb-20 md:pb-32 overflow-y-auto custom-scrollbar relative"
                >
                    {/* Pull to Refresh Indicator */}
                    <div
                        style={{ height: `${pullChange}px`, opacity: Math.min(pullChange / 70, 1) }}
                        className="w-full flex items-center justify-center overflow-hidden transition-all duration-200 ease-out -mt-4 md:mt-0"
                    >
                        {isRefreshing ? (
                            <div className="flex flex-col items-center py-2 scale-110 transition-transform">
                                <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                            </div>
                        ) : (
                            <div
                                className={`transform transition-transform duration-300 ${pullChange > 70 ? 'rotate-180 text-indigo-400' : 'text-slate-500'}`}
                                style={{ transform: `rotate(${pullChange > 70 ? 180 : 0}deg) scale(${Math.min(pullChange / 50, 1.2)})` }}
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                </svg>
                            </div>
                        )}
                    </div>

                    {/* Feed Content */}
                    <div className="flex flex-col items-center mb-8 md:mb-8 shrink-0 min-h-[20vh] md:min-h-0 justify-center md:justify-start w-full max-w-4xl px-4">

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
                            <div className="w-full flex items-center justify-between py-6 px-2 md:px-0">
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
                            <div className="w-full bg-[#0f0f11] border border-white/10 rounded-[2.5rem] p-6 md:p-10 flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-10 shadow-2xl relative overflow-hidden mt-4">

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
                        <FeedSkeleton />
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
                            <div key={post.id} className="mb-6">
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
