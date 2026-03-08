import { motion } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { xpToNextLevel } from '@/lib/gameEngine';

export default function XPBar({ compact = false }: { compact?: boolean }) {
  const { user } = useGame();
  const needed = xpToNextLevel(user.level);
  const pct = Math.min(100, (user.currentXP / needed) * 100);

  return (
    <div className={compact ? '' : 'space-y-1'}>
      {!compact && (
        <div className="flex justify-between items-center">
          <span className="font-mono text-xs text-cyan-400/70">EXP</span>
          <span className="font-mono text-xs text-cyan-400/70">
            {user.currentXP.toLocaleString()} / {needed.toLocaleString()}
          </span>
        </div>
      )}
      <div className={`xp-bar-bg rounded-full overflow-hidden ${compact ? 'h-1.5' : 'h-3'}`}>
        <motion.div
          className="xp-bar-fill h-full rounded-full relative"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          {!compact && pct > 10 && (
            <div className="absolute inset-0 overflow-hidden rounded-full">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-scan" />
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
