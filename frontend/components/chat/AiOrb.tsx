"use client";

import { motion } from "framer-motion";

interface AiOrbProps {
  isThinking: boolean;
}

export function AiOrb({ isThinking }: AiOrbProps) {
  return (
    <div className="relative flex items-center justify-center w-12 h-12 shrink-0">
      {/* Outer Glow Ring (Pulses when thinking) */}
      <motion.div
        className="absolute inset-0 rounded-full bg-cyan-500/20 blur-xl"
        animate={{
          scale: isThinking ? [1, 1.5, 1] : 1,
          opacity: isThinking ? [0.5, 1, 0.5] : 0.2,
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Middle Emerald Ring */}
      <motion.div
        className="absolute inset-2 rounded-full bg-emerald-500/30 blur-md"
        animate={{
          scale: isThinking ? [1, 1.2, 1] : 1,
          rotate: isThinking ? [0, 180, 360] : 0,
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      
      {/* Inner Core */}
      <motion.div
        className="relative w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400 shadow-[0_0_15px_rgba(34,211,238,0.6)]"
        animate={{
          scale: isThinking ? [0.8, 1, 0.8] : 1,
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}
