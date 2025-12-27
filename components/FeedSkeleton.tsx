import React from 'react';

const SkeletonCard = () => (
    <div className="w-full max-w-2xl mx-auto mb-8 bg-[#0a0a0f]/80 backdrop-blur-3xl rounded-[24px] border border-white/5 p-5 md:p-7 overflow-hidden relative">
        <div className="animate-pulse">
            {/* Header */}
            <div className="flex items-center space-x-4 mb-5">
                <div className="w-11 h-11 rounded-full bg-white/10"></div>
                <div className="space-y-2">
                    <div className="h-4 w-32 bg-white/10 rounded"></div>
                    <div className="h-3 w-20 bg-white/5 rounded"></div>
                </div>
            </div>

            {/* Content Lines */}
            <div className="space-y-3 mb-6">
                <div className="h-4 w-3/4 bg-white/10 rounded"></div>
                <div className="h-4 w-full bg-white/5 rounded"></div>
                <div className="h-4 w-5/6 bg-white/5 rounded"></div>
            </div>

            {/* Image Placeholder */}
            <div className="w-full h-64 bg-white/5 rounded-xl mb-6"></div>

            {/* Footer Actions */}
            <div className="flex space-x-4">
                <div className="w-16 h-8 bg-white/5 rounded-full"></div>
                <div className="w-16 h-8 bg-white/5 rounded-full"></div>
            </div>
        </div>

        {/* Shimmer Overlay */}
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
        <style>{`
            @keyframes shimmer {
                100% { transform: translateX(100%); }
            }
        `}</style>
    </div>
);

const FeedSkeleton: React.FC = () => {
    return (
        <div className="w-full flex flex-col items-center pt-4">
            {[1, 2, 3].map((i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    );
};

export default FeedSkeleton;
