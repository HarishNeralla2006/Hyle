import React from 'react';
import { Comment } from '../types';
import { TrashIcon } from './icons';

// Helper to organize comments into threads
export const organizeComments = (comments: Comment[]) => {
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

export const CommentCard: React.FC<CommentCardProps> = ({ comment, onDelete, onReply, onDeleteComment, currentUserId, depth = 0 }) => {
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
