import { motion } from 'framer-motion';
import { Flame, Trophy, Zap, Clock, ChevronRight, ScrollText, Swords } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useGame } from '@/contexts/GameContext';
import { getRankBadge, getDemonImage, ASSETS } from '@/lib/assets';
import { xpToNextLevel, RANK_COLORS, RANK_NAMES, ACTIVITY_TYPES, DEMON_LEVELS } from '@/lib/gameEngine';
import type { Quest } from '@/lib/gameEngine';
import SystemCard from '@/components/SystemCard';
import XPBar from '@/components/XPBar';
import HuntMap from '@/components/HuntMap';

function isQuestForToday(quest: Quest): boolean {
  if (quest.frequency === 'custom' && quest.selectedDays && quest.selectedDays.length > 0) {
    return quest.selectedDays.includes(new Date().getDay());
  }
  return true;
}

export default function Dashboard() {
  const { user, quests, logs, systemLog } = useGame();
  const rankColor = RANK_COLORS[user.rankTier];
  const activeQuests = quests.filter(q => q.status === 'active' && isQuestForToday(q));
  const completedToday = quests.filter(q => {
    if (q.status !== 'completed' || !q.completedAt) return false;
    if (!isQuestForToday(q)) return false;
    return q.completedAt.startsWith(new Date().toISOString().split('T')[0]);
  }).length;
  const recentLogs = logs.slice(0, 5);
  const recentSystemLog = systemLog.slice(0, 10);
  const statEntries = Object.entries(user.stats) as [string, number][];

  return (
    <div className="min-h-screen pb-safe">
      <div className="fixed inset-0 z-0 opacity-30" style={{ backgroundImage: 'url(' + ASSETS.dashboardBg + ')', backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-[#050510]/70 via-[#050510]/90 to-[#050510]" />
      <div className="relative z-10 max-w-lg mx-auto px-4 py-6 space-y-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
          <img src={getRankBadge(user.rankTier)} alt={user.rankTier + ' Rank'} className="w-16 h-16 object-contain" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-xl font-bold text-white truncate">{user.name}</h1>
              <span className="font-heading text-xs font-semibold px-2 py-0.5 rounded-sm shrink-0" style={{ color: rankColor, backgroundColor: rankColor + '15', border: '1px solid ' + rankColor + '30' }}>{user.rankTier}-RANK</span>
            </div>
            <p className="text-xs text-gray-500 font-mono truncate">{RANK_NAMES[user.rankTier]}{user.activeTitle ? ' - "' + user.activeTitle + '"' : ''}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-heading text-3xl font-bold text-white">LV.<span className="text-cyan-400 text-glow-cyan">{user.level}</span></p>
          </div>
        </motion.div>

        <SystemCard delay={0.05}><XPBar /><div className="flex justify-between mt-2"><span className="font-mono text-[10px] text-gray-500">TOTAL XP: {user.totalXP.toLocaleString()}</span><span className="font-mono text-[10px] text-gray-500">NEXT: {xpToNextLevel(user.level).toLocaleString()} XP</span></div></SystemCard>

        <div className="grid grid-cols-3 gap-2">
          <SystemCard delay={0.1} className="text-center"><Flame size={16} className="mx-auto mb-1 text-orange-400" /><p className="font-mono text-lg font-bold text-white">{user.currentStreak}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider">Streak</p></SystemCard>
          <SystemCard delay={0.15} className="text-center"><Trophy size={16} className="mx-auto mb-1 text-amber-400" /><p className="font-mono text-lg font-bold text-white">{user.bestStreak}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider">Best</p></SystemCard>
          <SystemCard delay={0.2} className="text-center"><Zap size={16} className="mx-auto mb-1 text-cyan-400" /><p className="font-mono text-lg font-bold text-white">{user.coins}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider">Coins</p></SystemCard>
        </div>

        <SystemCard title="Hunter Stats" delay={0.25}>
          <div className="grid grid-cols-3 gap-3">{statEntries.map(([key, val]) => (<div key={key} className="text-center"><p className="font-mono text-lg font-bold text-white">{val}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider">{key.slice(0, 3)}</p></div>))}</div>
          {user.statPoints > 0 && <Link to="/stats"><div className="mt-3 text-center py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-sm"><span className="text-xs text-amber-400 font-mono">{user.statPoints} STAT POINTS - TAP TO ALLOCATE</span></div></Link>}
        </SystemCard>

        <SystemCard title="Hunt Map" delay={0.28}><HuntMap /></SystemCard>

        <SystemCard title="Daily Quests" delay={0.3}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-mono">{completedToday}/{activeQuests.length + completedToday} COMPLETED TODAY</span>
            <Link to="/quests"><span className="text-xs text-cyan-400 flex items-center gap-1">View All <ChevronRight size={12} /></span></Link>
          </div>
          <div className="space-y-2">
            {activeQuests.slice(0, 3).map(quest => {
              const dc = DEMON_LEVELS[quest.demonLevel];
              return (<div key={quest.id} className="flex items-center gap-3 p-2 bg-white/[0.02] rounded-sm">
                <img src={getDemonImage(quest.demonLevel)} alt={dc.name} className="w-8 h-8 object-contain" />
                <div className="flex-1 min-w-0"><p className="text-sm text-white font-medium truncate">{quest.title}</p><p className="text-[10px] font-mono" style={{ color: dc.color }}>{dc.name} +{quest.xpReward} XP</p></div>
                <span className="text-[9px] text-gray-500 font-mono shrink-0">{quest.frequency}</span>
              </div>);
            })}
            {activeQuests.length === 0 && <div className="text-center py-6"><Swords size={24} className="mx-auto mb-2 text-gray-700" /><p className="text-xs text-gray-600 font-mono">No active quests for today.</p><Link to="/quests"><span className="text-xs text-cyan-400 mt-1 inline-block">Create your first quest</span></Link></div>}
          </div>
        </SystemCard>

        <SystemCard title="Recent Logs" delay={0.35}>
          <div className="space-y-2">
            {recentLogs.map(log => { const ac = ACTIVITY_TYPES[log.type]; return (<div key={log.id} className="flex items-center gap-3 p-2 bg-white/[0.02] rounded-sm"><span className="text-lg">{ac?.icon || '\u26A1'}</span><div className="flex-1 min-w-0"><p className="text-sm text-white truncate">{log.title}</p><div className="flex items-center gap-2 text-[10px] text-gray-500"><Clock size={10} />{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div></div><span className="text-xs text-cyan-400 font-mono shrink-0">+{log.xpEarned} XP</span></div>); })}
            {recentLogs.length === 0 && <div className="text-center py-6"><ScrollText size={24} className="mx-auto mb-2 text-gray-700" /><p className="text-xs text-gray-600 font-mono">No activities logged yet.</p></div>}
          </div>
        </SystemCard>

        <SystemCard title="System Feed" delay={0.4}>
          <div className="space-y-1.5">
            {recentSystemLog.map(n => {
              const tc: Record<string, string> = { levelUp: 'text-cyan-400', questComplete: 'text-emerald-400', questFailed: 'text-red-400', rankUp: 'text-amber-400', rankDown: 'text-red-500', title: 'text-purple-400', questCreated: 'text-blue-400', streak: 'text-orange-400', xpLoss: 'text-red-300', system: 'text-gray-400' };
              return (<div key={n.id} className="flex gap-2 items-start py-1"><span className={'text-[10px] font-mono ' + (tc[n.type] || 'text-gray-400')}>{'\u25B8'}</span><div className="flex-1 min-w-0"><p className="text-xs text-gray-300">{n.message}</p><p className="text-[9px] text-gray-600 font-mono">{new Date(n.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p></div>{n.xpChange && <span className={'text-[10px] font-mono shrink-0 ' + (n.xpChange > 0 ? 'text-cyan-400' : 'text-red-400')}>{n.xpChange > 0 ? '+' : ''}{n.xpChange}</span>}</div>);
            })}
          </div>
        </SystemCard>
      </div>
    </div>
  );
}
