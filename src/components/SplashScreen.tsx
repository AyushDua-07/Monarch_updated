import { motion } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  return (
    <motion.div
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-[#030308] overflow-hidden"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onAnimationComplete={() => {
        // Auto dismiss after the full sequence
        setTimeout(onComplete, 2200);
      }}
    >
      {/* Background pulse */}
      <motion.div
        className="absolute inset-0 bg-gradient-radial from-cyan-500/5 via-transparent to-transparent"
        style={{ background: 'radial-gradient(circle at 50% 45%, rgba(0,212,255,0.06) 0%, transparent 60%)' }}
        animate={{ opacity: [0, 1, 0.5] }}
        transition={{ duration: 2, ease: 'easeOut' }}
      />

      {/* Top decorative line */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      />

      {/* Center content */}
      <div className="relative flex flex-col items-center gap-6">
        {/* Sword icon with dramatic entrance */}
        <motion.div
          className="relative"
          initial={{ y: -40, opacity: 0, scale: 0.5 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
        >
          <span className="text-5xl drop-shadow-[0_0_20px_rgba(0,212,255,0.6)]">⚔️</span>
          {/* Glow ring behind */}
          <motion.div
            className="absolute inset-0 -m-4 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.15) 0%, transparent 70%)' }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.3] }}
            transition={{ duration: 1.5, delay: 0.4, ease: 'easeOut' }}
          />
        </motion.div>

        {/* Title */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <h1 className="font-heading text-4xl font-bold tracking-[0.15em] text-white">
            LEVELING
          </h1>
          <motion.div
            className="h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent mt-2 mx-auto"
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ delay: 0.8, duration: 0.6 }}
          />
        </motion.div>

        {/* Boot text sequence */}
        <div className="flex flex-col items-center gap-1 mt-2">
          {[
            { text: 'Initializing system...', delay: 0.6 },
            { text: 'Loading hunter profile...', delay: 1.0 },
            { text: 'Connecting to the Abyss...', delay: 1.4 },
            { text: '▸ SYSTEM ONLINE', delay: 1.8 },
          ].map((line, i) => (
            <motion.p
              key={i}
              className={`font-mono text-[10px] tracking-wider ${
                i === 3 ? 'text-cyan-400 text-glow-cyan' : 'text-gray-600'
              }`}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: line.delay, duration: 0.3 }}
            >
              {line.text}
            </motion.p>
          ))}
        </div>
      </div>

      {/* Bottom version text */}
      <motion.p
        className="absolute bottom-8 font-mono text-[9px] text-gray-700 tracking-widest"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        v3.0 — THE ABYSS INTERFACE
      </motion.p>

      {/* Corner accents */}
      <motion.div className="absolute top-5 left-5 w-6 h-6 border-t border-l border-cyan-500/20"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} />
      <motion.div className="absolute top-5 right-5 w-6 h-6 border-t border-r border-cyan-500/20"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} />
      <motion.div className="absolute bottom-5 left-5 w-6 h-6 border-b border-l border-cyan-500/20"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} />
      <motion.div className="absolute bottom-5 right-5 w-6 h-6 border-b border-r border-cyan-500/20"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} />
    </motion.div>
  );
}
