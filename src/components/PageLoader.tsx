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
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-[#050510]/95 backdrop-blur-sm"
        >
          {/* Diagonal slash sweep */}
          <motion.div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute w-[200%] h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
              style={{ top: '35%', left: '-50%', transform: 'rotate(-25deg)' }}
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute w-[200%] h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent"
              style={{ top: '55%', left: '-50%', transform: 'rotate(-25deg)' }}
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ duration: 0.6, ease: 'easeInOut', delay: 0.08 }}
            />
          </motion.div>

          {/* Center spinner */}
          <div className="relative flex flex-col items-center gap-4">
            {/* Rotating ring */}
            <motion.div
              className="w-12 h-12 rounded-full border-2 border-cyan-500/20 border-t-cyan-400"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            />
            {/* Inner dot */}
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400"
              animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
              style={{ boxShadow: '0 0 12px rgba(0, 212, 255, 0.8)' }}
            />
            {/* Text */}
            <motion.p
              className="font-mono text-[10px] text-cyan-400/60 tracking-[0.3em] uppercase"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              Loading
            </motion.p>
          </div>

          {/* Corner accents */}
          <div className="absolute top-6 left-6 w-8 h-8 border-t border-l border-cyan-500/30" />
          <div className="absolute top-6 right-6 w-8 h-8 border-t border-r border-cyan-500/30" />
          <div className="absolute bottom-6 left-6 w-8 h-8 border-b border-l border-cyan-500/30" />
          <div className="absolute bottom-6 right-6 w-8 h-8 border-b border-r border-cyan-500/30" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
