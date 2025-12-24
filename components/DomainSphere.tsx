
import React from 'react';
import { Domain } from '../types';
import { InfoIcon } from './icons';

interface DomainSphereProps {
    domain: Domain;
    onSelect: (domainName: string) => void;
    onInfo: (domain: Domain) => void;
    isCenter?: boolean;
    index?: number;
}

// Exported for use in layout calculations
export const calculateSphereSize = (name: string): number => {
    const baseSize = name.toLowerCase() === 'sparksphere' ? 24 : 16;
    const sizePerChar = 0.8; // Increased for better text fitting
    const minSize = 28; // Increased minimum for mobile
    const maxSize = 42;

    const calculatedSize = baseSize + name.length * sizePerChar;
    return Math.max(minSize, Math.min(maxSize, calculatedSize));
};


const DomainSphere: React.FC<DomainSphereProps> = ({ domain, onSelect, onInfo, isCenter = false, index = 0 }) => {
    const clickAction = isCenter ? () => { } : () => onSelect(domain.name);
    const longPressTimer = React.useRef<NodeJS.Timeout | null>(null);

    const sphereSize = calculateSphereSize(domain.name);

    // Outer Container - Handles Position & Scale.
    const containerStyle: React.CSSProperties = {
        width: `${sphereSize}vmin`,
        height: `${sphereSize}vmin`,
        position: 'absolute',
        left: `${domain.position?.x ?? 50}%`,
        top: `${domain.position?.y ?? 50}%`,
        transform: 'translate(-50%, -50%) translateZ(0)',
        zIndex: isCenter ? 10 : 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: !isCenter ? 'popIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'pulseSlow 4s ease-in-out infinite',
        borderRadius: '50%',
    };

    // Visual Sphere
    const visualStyle: React.CSSProperties = {
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        overflow: 'hidden',

        // Theme-aware styles 
        background: isCenter
            ? 'var(--sphere-center-bg)'
            : 'var(--sphere-bg)',

        backdropFilter: 'blur(12px) saturate(110%)',
        WebkitBackdropFilter: 'blur(12px) saturate(110%)',

        border: `1px solid var(--sphere-border)`,

        boxShadow: isCenter
            ? 'var(--sphere-shadow-center)'
            : 'var(--sphere-shadow-normal)',

        transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.4s ease',
    };

    // Add random float delay to make it look organic
    const floatDelay = `${(index * 0.2) % 5}s`;

    return (
        <>
            <div
                className="group relative"
                style={containerStyle}
            >
                <div className="w-full h-full animate-float" style={{ animationDelay: floatDelay }}>
                    {/* The Visual Sphere Layer - Scales on Hover */}
                    <div
                        style={visualStyle}
                        className="group-hover:scale-105 group-hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.4)]"
                    >
                        {/* Specular Highlight - Top Left */}
                        <div className="absolute top-[10%] left-[10%] w-[45%] h-[35%] bg-gradient-to-br from-white/40 to-transparent opacity-70 rounded-full blur-[8px] pointer-events-none" />

                        {/* Bottom Reflected Light */}
                        <div className="absolute bottom-0 left-1/4 right-1/4 h-1/3 bg-gradient-to-t from-white/10 to-transparent opacity-40 blur-md pointer-events-none" />

                        {/* Interactive Shine */}
                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none mix-blend-overlay" />
                    </div>

                    {/* Inner Ring Highlight with subtle spin */}
                    <div className="absolute inset-0 rounded-full border border-white/10 pointer-events-none scale-95 opacity-50 animate-[spin_10s_linear_infinite]" />

                    {/* Text Content - Hold (Right Click/Long Press) triggers Info */}
                    <button
                        onPointerDown={(e) => {
                            // Start long press timer
                            longPressTimer.current = setTimeout(() => {
                                onInfo(domain);
                                // Optional: Haptic feedback if available in future
                            }, 500); // 500ms trigger while holding
                        }}
                        onPointerUp={(e) => {
                            if (longPressTimer.current) {
                                clearTimeout(longPressTimer.current);
                                longPressTimer.current = null;
                            }
                            clickAction();
                        }}
                        onPointerLeave={() => {
                            if (longPressTimer.current) {
                                clearTimeout(longPressTimer.current);
                                longPressTimer.current = null;
                            }
                        }}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            // We handle long press manually now, so disable default context menu
                        }}
                        className={`absolute inset-0 w-full h-full flex items-center justify-center p-1 md:p-4 outline-none ${!isCenter ? 'cursor-pointer active:scale-95' : 'cursor-default'} transition-transform duration-300 z-10 rounded-full focus:ring-2 focus:ring-white/20`}
                    >
                        <span
                            className={`font-medium text-center select-none leading-none tracking-tight line-clamp-3 w-[100%] font-outfit
                            ${sphereSize < 24 ? 'text-[0.6rem] md:text-xs' : 'text-xs md:text-sm'}
                        `}
                            style={{
                                color: 'var(--sphere-text-color)',
                                textShadow: 'var(--sphere-text-shadow)',
                                fontFamily: "'Outfit', sans-serif",
                                overflowWrap: 'break-word',
                            }}
                        >
                            {domain.name}
                        </span>
                    </button>

                    {/* Info Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onInfo(domain);
                        }}
                        className="absolute -bottom-4 left-1/2 -translate-x-1/2 p-2.5 rounded-full bg-slate-800/90 hover:bg-slate-700 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 z-30 backdrop-blur-md shadow-xl transform translate-y-2 group-hover:translate-y-0 border border-white/20 hover:scale-110"
                        title="Explore details"
                    >
                        <InfoIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
            <style>{`
            @keyframes popIn {
                0% {
                    transform: translate(-50%, -50%) scale(0);
                    opacity: 0;
                    filter: blur(10px);
                }
                100% {
                    transform: translate(-50%, -50%) scale(1);
                    opacity: 1;
                    filter: blur(0);
                }
            }
            @keyframes pulseSlow {
                0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
                50% { box-shadow: 0 0 25px 0 rgba(99, 102, 241, 0.2); }
            }
            @keyframes float {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-8px); }
            }
            .animate-float {
                animation: float 6s ease-in-out infinite;
                width: 100%;
                height: 100%;
            }
        `}</style>
        </>
    );
};

export default DomainSphere;
