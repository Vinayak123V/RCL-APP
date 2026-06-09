import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import astraLogo from '../assets/astra-logo.png';

export function LaunchScreen() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 3 + 2,
    delay: Math.random() * 2,
  }));

  const rings = [
    { size: 300, duration: 8, delay: 0 },
    { size: 400, duration: 10, delay: 0.5 },
    { size: 500, duration: 12, delay: 1 },
  ];

  return (
    <div className="absolute inset-0 z-50 w-full h-full bg-gradient-to-br from-[#0a0e27] via-[#0d1224] to-[#050810] overflow-hidden flex items-center justify-center">
      {/* Ambient Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent" />
      
      {/* Animated Grid Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }} />
      </div>

      {/* Floating Particles */}
      {mounted && particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-cyan-400/60"
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            boxShadow: '0 0 10px rgba(6, 182, 212, 0.8)',
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, Math.random() * 20 - 10, 0],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Rotating Light Rings */}
      {mounted && rings.map((ring, index) => (
        <motion.div
          key={index}
          className="absolute rounded-full border border-cyan-500/20"
          style={{
            width: ring.size,
            height: ring.size,
            boxShadow: '0 0 30px rgba(6, 182, 212, 0.3), inset 0 0 30px rgba(6, 182, 212, 0.1)',
          }}
          animate={{
            rotate: 360,
            scale: [1, 1.05, 1],
          }}
          transition={{
            rotate: {
              duration: ring.duration,
              repeat: Infinity,
              ease: 'linear',
            },
            scale: {
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            },
            delay: ring.delay,
          }}
        />
      ))}

      {/* Energy Waves */}
      {mounted && [0, 1, 2].map((i) => (
        <motion.div
          key={`wave-${i}`}
          className="absolute rounded-full border-2 border-cyan-400/30"
          style={{
            width: 200,
            height: 200,
          }}
          animate={{
            scale: [1, 3],
            opacity: [0.6, 0],
          }}
          transition={{
            duration: 3,
            delay: i * 1,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      ))}

      {/* Central Glow */}
      <div className="absolute w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      <div className="absolute w-64 h-64 bg-blue-500/10 rounded-full blur-2xl" />

      {/* Main ASTRA Title */}
      <div className="relative z-10 flex flex-col items-center">
        {mounted && (
          <>
            {/* Top Accent Line */}
            <motion.div
              className="w-32 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent mb-8"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 1.5, delay: 0.5 }}
            />

            {/* ASTRA Logo Image */}
            <motion.div
              className="relative py-4"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            >
              {/* Glow Layer */}
              <motion.img
                src={astraLogo}
                alt="ASTRA Glow"
                className="h-16 w-auto object-contain absolute top-4 left-0 right-0 mx-auto blur-xl brightness-150"
                animate={{
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />

              {/* Main Image */}
              <img
                src={astraLogo}
                alt="ASTRA"
                className="h-16 w-auto object-contain relative z-10 drop-shadow-[0_0_20px_rgba(6,182,212,0.6)]"
              />
            </motion.div>

            {/* Bottom Accent Line */}
            <motion.div
              className="w-32 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent mt-8"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 1.5, delay: 0.5 }}
            />

            {/* Subtitle */}
            <motion.p
              className="text-cyan-300/60 text-sm tracking-widest mt-6 font-light"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 1.5 }}
            >
              INITIALIZING
            </motion.p>

            {/* Loading Dots */}
            <div className="flex gap-2 mt-4">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={`dot-${i}`}
                  className="w-2 h-2 rounded-full bg-cyan-400"
                  animate={{
                    opacity: [0.3, 1, 0.3],
                    scale: [0.8, 1.2, 0.8],
                  }}
                  transition={{
                    duration: 1.5,
                    delay: i * 0.2 + 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Corner Accents */}
      <motion.div
        className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-cyan-500/40"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 0.8 }}
      />
      <motion.div
        className="absolute top-8 right-8 w-16 h-16 border-r-2 border-t-2 border-cyan-500/40"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 0.9 }}
      />
      <motion.div
        className="absolute bottom-8 left-8 w-16 h-16 border-l-2 border-b-2 border-cyan-500/40"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 1 }}
      />
      <motion.div
        className="absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-cyan-500/40"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 1.1 }}
      />

      {/* Scanline Effect */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent 50%, rgba(6, 182, 212, 0.03) 50%)',
          backgroundSize: '100% 4px',
        }}
        animate={{
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  );
}
