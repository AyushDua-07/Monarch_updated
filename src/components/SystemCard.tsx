import { motion } from 'framer-motion';
import { type ReactNode } from 'react';

interface SystemCardProps {
  children: ReactNode;
  title?: string;
  className?: string;
  glow?: boolean;
  delay?: number;
}

export default function SystemCard({ children, title, className = '', glow = false, delay = 0 }: SystemCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className={`system-card rounded-sm p-4 ${glow ? 'animate-pulse-glow' : ''} ${className}`}
    >
      {title && (
        <div className="relative mb-3 pb-2 border-b border-cyan-500/20">
          <h3 className="font-heading text-sm font-semibold tracking-[0.2em] uppercase text-cyan-400 text-glow-cyan">
            {'// '}{title}
          </h3>
          <div className="absolute bottom-0 left-0 w-12 h-[2px] bg-cyan-400/60" />
        </div>
      )}
      {children}
    </motion.div>
  );
}
