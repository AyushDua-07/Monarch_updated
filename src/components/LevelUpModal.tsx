import { motion, AnimatePresence } from 'framer-motion';
import { ASSETS } from '@/lib/gameEngine';

interface LevelUpModalProps { show: boolean; level: number; onClose: () => void; }

export default function LevelUpModal({ show, level, onClose }: LevelUpModalProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md" onClick={onClose}>
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="text-center px-8 relative" onClick={e => e.stopPropagation()}>
            <div className="absolute inset-0 -m-20 bg-cyan-500/5 rounded-full blur-3xl" />
            <motion.img src={ASSETS.levelUp} alt="Level Up" className="w-48 h-48 mx-auto mb-4 object-contain relative z-10"
              initial={{ rotate: -15, scale: 0.5 }} animate={{ rotate: 0, scale: [0.5, 1.1, 1] }} transition={{ duration: 0.5, ease: 'easeOut' }} />
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="relative z-10">
              <p className="font-heading text-sm tracking-[0.3em] text-cyan-400/70 uppercase mb-2">⚡ System Notification ⚡</p>
              <h2 className="font-heading text-6xl font-bold text-cyan-400 text-glow-cyan mb-1 animate-glitch">LEVEL {level}</h2>
              <p className="font-heading text-lg text-white/80 tracking-wider mb-1">YOU HAVE LEVELED UP</p>
              <p className="text-gray-400 text-sm mb-6">+3 stat points have been awarded</p>
              <motion.button whileTap={{ scale: 0.95 }} onClick={onClose}
                className="px-10 py-3 bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 font-heading tracking-[0.2em] text-sm hover:bg-cyan-500/30 transition-colors rounded-sm">
                ACKNOWLEDGE
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
