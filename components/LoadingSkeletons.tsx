import React from 'react';

// Shared Shimmer Effect
const ShimmerBlock: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`bg-white/5 animate-pulse ${className}`}></div>
);

// --- INBOX SKELETON ---
export const InboxSkeleton = () => {
    return (
        <div className="flex flex-col h-full bg-[var(--bg-color)]">
            <div className="p-4 md:p-6 space-y-6">
                <ShimmerBlock className="h-8 w-32 rounded-lg" />
                <div className="flex space-x-6 border-b border-white/5 pb-2">
                    <ShimmerBlock className="h-4 w-16 rounded" />
                    <ShimmerBlock className="h-4 w-16 rounded" />
                </div>
            </div>
            <div className="flex-1 p-2 space-y-1">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="flex items-center p-3 rounded-xl border border-transparent">
                        <ShimmerBlock className="w-14 h-14 rounded-full mr-4 shrink-0" />
                        <div className="flex-1 space-y-2">
                            <ShimmerBlock className="h-4 w-32 rounded" />
                            <ShimmerBlock className="h-3 w-48 rounded opacity-50" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- CHAT SKELETON ---
export const ChatSkeleton = () => {
    return (
        <div className="w-full h-full flex flex-col bg-[var(--bg-color)] relative">
            {/* Header */}
            <div className="h-20 border-b border-white/5 flex items-center px-6 md:pl-32 space-x-4 shrink-0">
                <ShimmerBlock className="w-8 h-8 rounded-full md:hidden" /> {/* Back button on mobile */}
                <ShimmerBlock className="w-10 h-10 rounded-full" />
                <div className="space-y-1.5">
                    <ShimmerBlock className="h-4 w-24 rounded" />
                    <ShimmerBlock className="h-3 w-16 rounded opacity-50" />
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 pt-24 space-y-8 overflow-hidden">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex max-w-[70%] items-end space-x-2 ${i % 2 === 0 ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            {i % 2 !== 0 && <ShimmerBlock className="w-6 h-6 rounded-full shrink-0" />}
                            <ShimmerBlock
                                className={`h-12 rounded-2xl ${i % 2 === 0 ? 'bg-[var(--primary-accent)]/20 w-48' : 'w-64'}`}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/5 shrink-0">
                <ShimmerBlock className="h-12 w-full rounded-full" />
            </div>
        </div>
    );
};

// --- PROFILE SKELETON ---
export const ProfileSkeleton = () => {
    return (
        <div className="w-full h-full flex flex-col bg-[#050505] relative overflow-hidden">
            {/* Mobile Cover Skeleton */}
            <div className="md:hidden w-full h-[40vh] relative mb-6">
                <ShimmerBlock className="absolute inset-0 z-0 bg-white/5" />
                <div className="absolute top-6 left-6 right-6 flex justify-between">
                    <ShimmerBlock className="w-8 h-8 rounded-full" />
                    <ShimmerBlock className="w-16 h-8 rounded-full" />
                </div>
            </div>

            {/* Desktop Header Skeleton */}
            <div className="hidden md:flex flex-col items-center w-full pt-16 px-6 pb-6">
                <div className="w-full max-w-4xl border border-white/10 rounded-[2.5rem] p-10 flex items-start space-x-10 relative overflow-hidden bg-[#0f0f11]">
                    <ShimmerBlock className="w-40 h-40 rounded-[2rem] shrink-0" />
                    <div className="flex-1 space-y-6 pt-2">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <ShimmerBlock className="h-8 w-48 rounded" />
                                <ShimmerBlock className="h-4 w-64 rounded opacity-50" />
                            </div>
                            <div className="flex space-x-3">
                                <ShimmerBlock className="h-10 w-24 rounded-xl" />
                                <ShimmerBlock className="h-10 w-24 rounded-xl" />
                            </div>
                        </div>
                        <div className="flex space-x-12">
                            <div className="space-y-1"><ShimmerBlock className="h-3 w-12" /><ShimmerBlock className="h-6 w-8" /></div>
                            <div className="space-y-1"><ShimmerBlock className="h-3 w-12" /><ShimmerBlock className="h-6 w-8" /></div>
                            <div className="space-y-1"><ShimmerBlock className="h-3 w-12" /><ShimmerBlock className="h-6 w-8" /></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Content (Shared) */}
            <div className="md:hidden px-6 -mt-24 relative z-10 mb-8 space-y-4">
                <ShimmerBlock className="h-12 w-3/4 rounded-lg" />
                <div className="flex justify-between w-full pr-4">
                    <ShimmerBlock className="h-10 w-16" />
                    <ShimmerBlock className="h-10 w-16" />
                    <ShimmerBlock className="h-10 w-16" />
                </div>
                <ShimmerBlock className="h-20 w-full rounded-xl" />
            </div>

            {/* Grid Skeleton */}
            <div className="flex-1 w-full max-w-4xl mx-auto px-6 md:px-0 pb-20">
                <div className="flex space-x-12 mb-8 justify-center md:justify-start">
                    <ShimmerBlock className="w-6 h-6 rounded" />
                    <ShimmerBlock className="w-6 h-6 rounded" />
                    <ShimmerBlock className="w-6 h-6 rounded" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="aspect-[4/5] rounded-[1.5rem] bg-[#111] overflow-hidden border border-white/5 relative">
                            <ShimmerBlock className="absolute inset-0 opacity-50" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- POST LIST SKELETON ---
export const PostListSkeleton = ({ viewMode = 'gallery' }: { viewMode?: 'gallery' | 'discussion' }) => {
    return (
        <div className={`w-full ${viewMode === 'gallery' ? 'columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4' : 'max-w-2xl mx-auto space-y-6'}`}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="break-inside-avoid mb-4">
                    <div className="bg-[#111] rounded-3xl overflow-hidden border border-white/5 relative">
                        {/* Image Placeholder */}
                        <div className={`w-full relative ${viewMode === 'gallery' ? 'aspect-[3/4]' : 'aspect-video'}`}>
                            <ShimmerBlock className="absolute inset-0 opacity-20" />
                        </div>

                        {/* Content Placeholder */}
                        <div className="p-4 space-y-3">
                            <div className="flex justify-between items-start">
                                <ShimmerBlock className="h-4 w-32 rounded" />
                                <ShimmerBlock className="h-4 w-8 rounded-full" />
                            </div>
                            <ShimmerBlock className="h-3 w-full rounded opacity-50" />
                            <ShimmerBlock className="h-3 w-2/3 rounded opacity-50" />

                            {/* Action Bar */}
                            <div className="flex justify-between items-center pt-2 mt-2 border-t border-white/5">
                                <div className="flex space-x-2">
                                    <ShimmerBlock className="w-5 h-5 rounded-full" />
                                    <ShimmerBlock className="w-5 h-5 rounded-full" />
                                </div>
                                <ShimmerBlock className="w-4 h-4 rounded" />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
