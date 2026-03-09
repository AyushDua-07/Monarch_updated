import { motion, AnimatePresence } from 'framer-motion';

interface PageLoaderProps {
  isLoading: boolean;
}

export default function PageLoader({ isLoading }: PageLoaderProps) {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-[#050510]/95"
        >
          {/* Slash effect — diagonal cyan blade sweep */}
          <motion.div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Primary slash */}
            <motion.div
              className="absolute h-[3px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
              style={{ width: '180%', top: '50%', left: '-40%', transformOrigin: 'center' }}
              initial={{ rotate: -35, scaleX: 0, opacity: 0 }}
              animate={{ rotate: -35, scaleX: 1, opacity: [0, 1, 1, 0] }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], times: [0, 0.2, 0.7, 1] }}
            />
            {/* Slash trail glow */}
            <motion.div
              className="absolute h-[20px] bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent"
              style={{ width: '180%', top: '50%', left: '-40%', marginTop: '-10px', transformOrigin: 'center' }}
              initial={{ rotate: -35, scaleX: 0, opacity: 0 }}
              animate={{ rotate: -35, scaleX: 1, opacity: [0, 0.6, 0] }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
            {/* Second slash — delayed, opposite angle */}
            <motion.div
              className="absolute h-[2px] bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent"
              style={{ width: '160%', top: '48%', left: '-30%', transformOrigin: 'center' }}
              initial={{ rotate: 20, scaleX: 0, opacity: 0 }}
              animate={{ rotate: 20, scaleX: 1, opacity: [0, 1, 0] }}
              transition={{ duration: 0.4, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            />
            {/* Impact sparks */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-cyan-400"
                style={{ top: '50%', left: '50%' }}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                animate={{
                  x: (Math.cos((i * 60 * Math.PI) / 180)) * (40 + Math.random() * 60),
                  y: (Math.sin((i * 60 * Math.PI) / 180)) * (40 + Math.random() * 60),
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                }}
                transition={{ duration: 0.4, delay: 0.15, ease: 'easeOut' }}
              />
            ))}
          </motion.div>

          {/* Center content — sword icon + demon skull */}
          <div className="relative">
            {/* Demon skull silhouette (gets slashed) */}
            <motion.div
              className="text-5xl select-none"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: [1, 1.05, 0.95], opacity: [0.6, 0.8, 0] }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              💀
            </motion.div>

            {/* Sword crossing through */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ rotate: -60, scale: 0.5, opacity: 0 }}
              animate={{ rotate: [-60, 15], scale: [0.5, 1.2, 1], opacity: [0, 1, 1] }}
              transition={{ duration: 0.35, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="text-4xl select-none drop-shadow-[0_0_12px_rgba(0,212,255,0.8)]">⚔️</span>
            </motion.div>

            {/* XP text flash */}
            <motion.p
              className="absolute -bottom-8 left-1/2 -translate-x-1/2 font-mono text-[10px] text-cyan-400/70 tracking-[0.3em] uppercase whitespace-nowrap"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: [0, 1, 1], y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              Hunting...
            </motion.p>
          </div>

          {/* Corner bracket accents */}
          <div className="absolute top-6 left-6 w-6 h-6 border-t border-l border-cyan-500/25" />
          <div className="absolute top-6 right-6 w-6 h-6 border-t border-r border-cyan-500/25" />
          <div className="absolute bottom-6 left-6 w-6 h-6 border-b border-l border-cyan-500/25" />
          <div className="absolute bottom-6 right-6 w-6 h-6 border-b border-r border-cyan-500/25" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
