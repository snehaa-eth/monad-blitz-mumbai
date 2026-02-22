/**
 * Confetti - A celebration animation for successful trades
 * Shows colorful confetti particles exploding from the center
 */

import React, { useEffect, useState } from 'react';

interface ConfettiProps {
    isActive: boolean;
    duration?: number;
    onComplete?: () => void;
}

interface Particle {
    id: number;
    x: number;
    y: number;
    rotation: number;
    color: string;
    scale: number;
    delay: number;
}

const COLORS = [
    '#ecfd00', // banger-yellow
    '#00f0ff', // banger-cyan
    '#ff00ff', // banger-pink
    '#00ff00', // green
    '#ff6b00', // orange
    '#ff0000', // red
    '#ffffff', // white
];

const SHAPES = ['■', '●', '▲', '★', '♦', '♥'];

export const Confetti: React.FC<ConfettiProps> = ({
    isActive,
    duration = 2000,
    onComplete
}) => {
    const [particles, setParticles] = useState<Particle[]>([]);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isActive) {
            // Generate confetti particles
            const newParticles: Particle[] = [];
            for (let i = 0; i < 50; i++) {
                newParticles.push({
                    id: i,
                    x: Math.random() * 100, // percentage across screen
                    y: Math.random() * 100,
                    rotation: Math.random() * 360,
                    color: COLORS[Math.floor(Math.random() * COLORS.length)],
                    scale: 0.5 + Math.random() * 1,
                    delay: Math.random() * 0.5,
                });
            }
            setParticles(newParticles);
            setIsVisible(true);

            // Clean up after animation
            const timer = setTimeout(() => {
                setIsVisible(false);
                setParticles([]);
                onComplete?.();
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [isActive, duration, onComplete]);

    if (!isVisible || particles.length === 0) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
            {particles.map((particle) => (
                <div
                    key={particle.id}
                    className="absolute animate-confetti-fall"
                    style={{
                        left: `${particle.x}%`,
                        top: '-5%',
                        color: particle.color,
                        fontSize: `${particle.scale * 20}px`,
                        transform: `rotate(${particle.rotation}deg)`,
                        animationDelay: `${particle.delay}s`,
                        animationDuration: `${1.5 + Math.random()}s`,
                    }}
                >
                    {SHAPES[Math.floor(Math.random() * SHAPES.length)]}
                </div>
            ))}

        </div>
    );
};

// Alternative simpler version with CSS only
export const ConfettiSimple: React.FC<ConfettiProps> = ({
    isActive,
    duration = 2500,
    onComplete
}) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isActive) {
            setIsVisible(true);
            const timer = setTimeout(() => {
                setIsVisible(false);
                onComplete?.();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isActive, duration, onComplete]);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[200]">
            {/* Confetti pieces */}
            <div className="absolute inset-0 overflow-hidden">
                {[...Array(60)].map((_, i) => (
                    <div
                        key={i}
                        className="confetti-piece"
                        style={{
                            '--x': `${Math.random() * 100}vw`,
                            '--delay': `${Math.random() * 0.5}s`,
                            '--color': COLORS[Math.floor(Math.random() * COLORS.length)],
                            '--rotation': `${Math.random() * 360}deg`,
                            '--duration': `${2 + Math.random()}s`,
                        } as React.CSSProperties}
                    />
                ))}
            </div>

        </div>
    );
};
