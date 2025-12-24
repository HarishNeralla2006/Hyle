
import React, { useState, useEffect } from 'react';

const ConstructingDomainsView: React.FC = () => {
    const satelliteCount = 7;
    const orbitRadiusPercent = 35;
    const [timeLeft, setTimeLeft] = useState(15);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center text-gray-400 w-full h-full p-4">
            <div className="relative w-3/4 md:w-1/2 max-w-sm aspect-square">
                {/* Central Sphere */}
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[24%] h-[24%]
                               bg-slate-800 rounded-full flex items-center justify-center 
                               animate-pulse"
                    style={{ animationDuration: '2s' }}
                >
                    <svg className="w-1/2 h-1/2 text-slate-500 animate-spin" style={{ animationDuration: '1.5s' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle
                            className="opacity-75"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            pathLength="100"
                            strokeDasharray="75 25"
                        />
                    </svg>
                </div>

                {/* Orbiting Spheres */}
                {Array.from({ length: satelliteCount }).map((_, i) => {
                    const angle = (i / satelliteCount) * 2 * Math.PI;
                    const x = 50 + orbitRadiusPercent * Math.cos(angle);
                    const y = 50 + orbitRadiusPercent * Math.sin(angle);

                    return (
                        <div
                            key={i}
                            className="absolute w-[12%] h-[12%] bg-slate-800 rounded-full animate-emerge"
                            style={{
                                top: `${y}%`,
                                left: `${x}%`,
                                animationDelay: `${i * 0.15}s`,
                            }}
                        />
                    );
                })}
            </div>
            <p className="mt-6 text-slate-400 text-lg md:text-xl text-center">Constructing domains...</p>
            <p className="text-slate-500 text-sm md:text-base text-center mt-1">
                Estimated time: <span className="text-indigo-400 font-mono text-xl font-bold">{timeLeft}s</span>
            </p>
            <style>{`
                @keyframes emerge {
                    0% {
                        transform: translate(-50%, -50%) scale(0);
                        opacity: 0;
                    }
                    60% {
                        transform: translate(-50%, -50%) scale(1.1);
                        opacity: 1;
                    }
                    100% {
                        transform: translate(-50%, -50%) scale(1);
                        opacity: 1;
                    }
                }
                .animate-emerge {
                    animation: emerge 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
                    transform: translate(-50%, -50%) scale(0);
                    opacity: 0;
                }
             `}</style>
        </div>
    );
};

export default ConstructingDomainsView;
