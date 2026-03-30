import React, { useEffect, useState } from 'react';

const FLAME_EMOJIS = ['\ud83d\udd25', '\ud83d\udd25', '\ud83d\udd25', '\ud83d\udca5', '\ud83c\udf89', '\u2b50', '\ud83d\udd25', '\ud83d\udd25'];
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
    <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl font-black text-white [text-shadow:0_0_40px_rgba(239,68,68,0.8)] animate-pulse z-10">
        BOKAT MÖTE!
      </div>
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
