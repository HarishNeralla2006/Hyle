import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { execute } from '../../lib/tidbClient';
import { PostWithAuthorAndLikes, Comment } from '../../types';
import PostCard from '../../components/PostCard';
import { useAuth } from '../../contexts/AuthContext';
import { useStatus } from '../../contexts/StatusContext';
import FeedSkeleton from '../../components/FeedSkeleton';
import Link from 'next/link';
import Head from 'next/head';

const SinglePostPage: React.FC = () => {
    const router = useRouter();
    const { id } = router.query;
    const { user } = useAuth();
    const { setError } = useStatus();
    const [post, setPost] = useState<PostWithAuthorAndLikes | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchPost = async () => {
        if (!id) return;
        try {
            setLoading(true);
            const query = `
                SELECT 
                    p.*,
                    u.username as author_username,
                    u.photoURL as author_photoURL,
                    (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
                    (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
                    EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked_by_user
                FROM posts p
                JOIN users u ON p.user_id = u.id
                WHERE p.id = ?
            `;
            const result = await execute(query, [user?.id || 'anon', id]);

            if (result.length === 0) {
                setLoading(false);
                return;
            }

            const p = result[0];

            // Fetch comments
            const commentsQuery = `
                SELECT 
                    c.*,
                    u.username,
                    u.photoURL
                FROM comments c
                JOIN users u ON c.user_id = u.id
                WHERE c.post_id = ?
                ORDER BY c.created_at DESC
            `;
            const commentsResult = await execute(commentsQuery, [id]);

            const comments: Comment[] = commentsResult.map((c: any) => ({
                ...c,
                profiles: {
                    username: c.username,
                    photoURL: c.photoURL
                }
            }));

            const postData: PostWithAuthorAndLikes = {
                ...p,
                profiles: {
                    username: p.author_username,
                    photoURL: p.author_photoURL
                },
                like_count: Number(p.like_count),
                comment_count: Number(p.comment_count),
                is_liked_by_user: Boolean(p.is_liked_by_user),
                comments: comments
            };

            setPost(postData);
        } catch (err) {
            console.error(err);
            setError('Failed to load post');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchPost();
        }
    }, [id, user]);

    const handleToggleLike = async () => {
        if (!post || !user) return;
        try {
            if (post.is_liked_by_user) {
                await execute('DELETE FROM likes WHERE post_id = ? AND user_id = ?', [post.id, user.id]);
                setPost(prev => prev ? ({ ...prev, like_count: prev.like_count - 1, is_liked_by_user: false }) : null);
            } else {
                await execute('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', [post.id, user.id]);
                setPost(prev => prev ? ({ ...prev, like_count: prev.like_count + 1, is_liked_by_user: true }) : null);
            }
        } catch (error) {
            console.error('Like toggle failed', error);
        }
    };

    const handleComment = async (content: string, parentId?: string) => {
        if (!user || !post) return;
        try {
            await execute(
                'INSERT INTO comments (post_id, user_id, content, parent_id) VALUES (?, ?, ?, ?)',
                [post.id, user.id, content, parentId || null]
            );
            fetchPost(); // Reload to show new comment
        } catch (error) {
            console.error('Comment failed', error);
            setError('Failed to post comment');
        }
    };

    const handleDelete = async () => {
        if (!post || !user) return;
        if (confirm('Delete this signal?')) {
            await execute('DELETE FROM posts WHERE id = ?', [post.id]);
            router.push('/');
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!user) return;
        // Simplified delete
        await execute('DELETE FROM comments WHERE id = ?', [commentId]);
        fetchPost();
    };

    if (loading) return <div className="min-h-screen bg-[#050508] text-white p-4"><FeedSkeleton /></div>;

    if (!post) return (
        <div className="min-h-screen bg-[#050508] text-white flex flex-col items-center justify-center">
            <h1 className="text-2xl font-bold mb-4">Signal Lost</h1>
            <p className="text-slate-400 mb-6">This post could not be found.</p>
            <Link href="/" className="px-4 py-2 bg-indigo-600 rounded-full hover:bg-indigo-500 transition-colors">
                Return to Feed
            </Link>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#050508] text-white">
            <Head>
                <title>{`Post by @${post.profiles.username} | Hyle`}</title>
            </Head>
            <div className="max-w-2xl mx-auto p-4 pt-8">
                <Link href="/" className="inline-flex items-center text-slate-400 hover:text-white mb-6 transition-colors group">
                    <svg className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Feed
                </Link>
                <PostCard
                    post={post}
                    onToggleLike={handleToggleLike}
                    onDelete={handleDelete}
                    onComment={handleComment}
                    onDeleteComment={handleDeleteComment}
                    currentUserId={user?.id}
                    onUserClick={() => { }} // No-op on single page or redirect to profile
                />
            </div>
        </div>
    );
};

export default SinglePostPage;
