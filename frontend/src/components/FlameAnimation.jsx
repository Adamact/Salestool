import React, { useEffect, useState } from 'react';

const FLAME_EMOJIS = ['🔥', '🔥', '🔥', '💥', '🎉', '⭐', '🔥', '🔥'];
const PARTICLE_COUNT = 24;

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

export default function FlameAnimation({ onComplete }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const p = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      emoji: FLAME_EMOJIS[Math.floor(Math.random() * FLAME_EMOJIS.length)],
      x: randomBetween(10, 90),
      startY: randomBetween(100, 120),
      endY: randomBetween(-20, 30),
      size: randomBetween(24, 48),
      duration: randomBetween(1, 2),
      delay: randomBetween(0, 0.5),
      drift: randomBetween(-30, 30),
    }));
    setParticles(p);

    const timer = setTimeout(() => onComplete(), 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="flame-overlay">
      <div className="flame-text">BOKAT MÖTE!</div>
      {particles.map((p) => (
        <div
          key={p.id}
          className="flame-particle"
          style={{
            left: `${p.x}%`,
            fontSize: `${p.size}px`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            '--start-y': `${p.startY}vh`,
            '--end-y': `${p.endY}vh`,
            '--drift': `${p.drift}px`,
          }}
        >
          {p.emoji}
        </div>
      ))}
    </div>
  );
}
