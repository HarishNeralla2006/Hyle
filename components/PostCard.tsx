import React, { useState } from 'react';
import { PostWithAuthorAndLikes, Comment } from '../types';
import { HeartIcon, TrashIcon, CommentIcon, SendIcon } from './icons';
import { RichTextRenderer } from './RichTextRenderer';
// Consolidated Helper Logic
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

interface CommentCardProps {
    comment: Comment & { replies?: Comment[] };
    onDelete: () => void;
    onReply: (id: string, username: string) => void;
    onDeleteComment: (id: string) => void;
    currentUserId: string | undefined;
    depth?: number;
}

const CommentCard: React.FC<CommentCardProps> = ({ comment, onDelete, onReply, onDeleteComment, currentUserId, depth = 0 }) => {
    const isOwner = comment.user_id === currentUserId;
    return (
        <div className={`transition-colors group animate-fade-in-right ${depth > 0 ? 'ml-3 md:ml-6 border-l-2 border-white/5 pl-3 md:pl-4' : 'border-t border-white/5 pt-4'}`}>
            <div className="flex justify-between items-start mb-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-bold text-xs text-indigo-300 tracking-wide font-mono">{comment.profiles.username}</span>
                    <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">:: {new Date(comment.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex items-center space-x-3">
                    <button onClick={() => onReply(comment.id, comment.profiles.username)} className="text-[10px] text-slate-500 hover:text-indigo-400 transition-colors uppercase font-bold tracking-wider opacity-0 group-hover:opacity-100 flex items-center gap-1">
                        <span>Reply</span>
                    </button>
                    {isOwner && (
                        <button onClick={onDelete} className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                            <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-slate-200 text-sm leading-relaxed mb-2 border border-white/5 relative">
                {/* Subtle tip indicator */}
                <div className="absolute top-0 left-4 -mt-1 w-2 h-2 bg-[#2a2a30] rotate-45 border-t border-l border-white/5"></div>
                {comment.content}
            </div>
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

interface PostCardProps {
    post: PostWithAuthorAndLikes;
    onToggleLike: () => void;
    onDelete: () => void;
    onComment: (content: string, parentId?: string) => Promise<void>;
    onDeleteComment: (commentId: string) => Promise<void>;
    currentUserId: string | undefined;
    onUserClick: (uid: string) => void;
    mode?: 'gallery' | 'discussion';
}

const PostCard: React.FC<PostCardProps> = ({
    post,
    onToggleLike,
    onDelete,
    onComment,
    onDeleteComment,
    currentUserId,
    onUserClick,
    mode = 'discussion'
}) => {
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
                                    <div className="w-full h-full flex items-center justify-center text-[10px] text-white font-bold max-w-full">{post.profiles.username?.[0]?.toUpperCase()}</div>
                                )}
                            </div>
                            <span className="text-white text-xs font-bold shadow-black drop-shadow-md">{post.profiles.username}</span>
                        </div>
                        <p className="text-slate-200 text-xs line-clamp-2 mb-2">{post.content}</p>
                        <div className="flex space-x-4">
                            <button onClick={(e) => { e.stopPropagation(); onToggleLike(); }} className={`flex items-center space-x-1 text-xs ${post.is_liked_by_user ? 'text-pink-500' : 'text-slate-300'}`}>
                                <HeartIcon className={`w-3 h-3 ${post.is_liked_by_user ? 'fill-current' : ''}`} />
                                <span className={Number(post.like_count) > 0 ? "" : "hidden"}>{post.like_count}</span>
                            </button>
                            {isOwner && (
                                <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="flex items-center space-x-1 text-xs text-slate-300 hover:text-[var(--primary-accent)] transition-colors">
                                    <TrashIcon className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative group perspective-1000 mb-8 w-full max-w-2xl mx-auto">
            <div className="relative rounded-[24px] p-0 overflow-hidden border border-white/5 bg-[#0a0a0f] transition-all duration-300 group-hover:-translate-y-1 shadow-2xl shadow-black/50">
                <div className="p-5 md:p-7">
                    <div className="flex justify-between items-start mb-4 md:mb-5">
                        <div className="flex items-center space-x-3.5 cursor-pointer group/author" onClick={() => onUserClick(post.user_id)}>
                            <div className="relative">
                                {post.profiles.photoURL ? (
                                    <img src={post.profiles.photoURL} alt={post.profiles.username} className="w-10 h-10 md:w-11 md:h-11 rounded-full border border-white/10 shadow-lg object-cover" />
                                ) : (
                                    <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-white/10 shadow-lg">
                                        <span className="text-indigo-300 font-bold text-sm">{post.profiles.username?.[0]?.toUpperCase()}</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 rounded-full ring-2 ring-white/0 group-hover/author:ring-white/20 transition-all duration-300"></div>
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-base leading-tight group-hover/author:text-indigo-400 transition-colors tracking-tight">
                                    @{post.profiles.username}
                                </h3>
                                <span className="text-[11px] text-slate-500 font-medium tracking-wide">
                                    {new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                            </div>
                        </div>
                        {isOwner && (
                            <button onClick={onDelete} className="text-slate-600 hover:text-red-500 hover:bg-red-500/10 transition-all p-2 rounded-full opacity-0 group-hover:opacity-100">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Premium Post Image (Smart Letterboxing) */}
                    {post.imageURL && (
                        <div className="mb-6 rounded-2xl overflow-hidden shadow-2xl border border-white/5 relative bg-black max-h-[500px] group/image">
                            {/* Main Content Layer (Contain) */}
                            <div className="w-full h-full flex items-center justify-center bg-black/50">
                                <img
                                    src={post.imageURL}
                                    alt="Transmission visual"
                                    className="max-w-full max-h-[500px] w-auto h-auto object-contain mx-auto"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="mb-4">
                        <RichTextRenderer content={post.content} />
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-4">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={onToggleLike}
                                className={`flex flex-row items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 group/like active:scale-95 ${post.is_liked_by_user ? 'bg-pink-500/10 text-pink-500 ring-1 ring-pink-500/20' : 'hover:bg-pink-500/10 text-white/70 hover:text-pink-400'}`}
                            >
                                <div className="relative flex items-center justify-center">
                                    <HeartIcon strokeWidth={2.5} className={`w-5 h-5 transition-transform duration-300 group-active/like:scale-125 ${post.is_liked_by_user ? 'fill-current scale-110' : 'scale-100 group-hover/like:scale-110'}`} />
                                    {post.is_liked_by_user && <div className="absolute inset-0 bg-pink-500/20 blur-md rounded-full animate-pulse"></div>}
                                </div>
                                {Number(post.like_count) > 0 && (
                                    <span className="text-sm font-semibold tabular-nums leading-none ml-1">{post.like_count}</span>
                                )}
                            </button>
                            <button
                                onClick={() => setShowComments(!showComments)}
                                className={`flex items-center space-x-2 px-3 py-1.5 rounded-full transition-all duration-300 group/comment active:scale-95 ${showComments ? 'bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20' : 'hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-400'}`}
                            >
                                <CommentIcon className="w-5 h-5 transition-transform group-active/comment:scale-125 group-hover/comment:scale-110" />
                                <span className="text-sm font-semibold">{post.comment_count > 0 ? post.comment_count : 'Comment'}</span>
                            </button>
                        </div>
                        <button
                            onClick={async (e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                e.currentTarget.blur(); // CRITICAL: Release focus to prevent glitch

                                const url = `${window.location.origin}/post/${post.id}`;
                                const btn = document.getElementById(`share-${post.id}`);

                                if (navigator.share) {
                                    try {
                                        await navigator.share({
                                            title: `Post by @${post.profiles.username}`,
                                            text: post.content,
                                            url: url
                                        });
                                        return; // Successfully shared natively
                                    } catch (err) {
                                        console.log('Error sharing:', err);
                                        // Fallback if user cancelled or failed
                                    }
                                }

                                try {
                                    await navigator.clipboard.writeText(url);
                                } catch (err) {
                                    console.error('Clipboard API failed', err);
                                    // Fallback
                                    const textArea = document.createElement("textarea");
                                    textArea.value = url;
                                    document.body.appendChild(textArea);
                                    textArea.focus();
                                    textArea.select();
                                    try {
                                        document.execCommand('copy');
                                    } catch (err) {
                                        console.error('Fallback copy failed', err);
                                        return;
                                    }
                                    document.body.removeChild(textArea);
                                }

                                // Visual Feedback
                                if (btn) {
                                    btn.classList.add('text-green-400', 'scale-110');
                                    // Make icon change temporarily
                                    const icon = btn.querySelector('svg');
                                    if (icon) icon.style.stroke = "#4ade80"; // green-400

                                    setTimeout(() => {
                                        btn.classList.remove('text-green-400', 'scale-110');
                                        if (icon) icon.style.stroke = "currentColor";
                                    }, 1000);
                                }
                            }}
                            id={`share-${post.id}`}
                            className="p-2 text-slate-500 hover:text-white transition-all duration-300 rounded-full hover:bg-white/5 active:scale-90"
                            title="Copy Link"
                        >
                            <SendIcon className="w-5 h-5 -rotate-45 translate-x-px -translate-y-px" />
                        </button>
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

export default PostCard;
