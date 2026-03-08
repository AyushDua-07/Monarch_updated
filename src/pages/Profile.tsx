import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Trash2, Shield, Award, Edit3, Check, AlertTriangle } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import { getRankBadge, RANK_COLORS, RANK_NAMES } from '@/lib/gameEngine';
import SystemCard from '@/components/SystemCard';
import XPBar from '@/components/XPBar';

export default function Profile() {
  const { user, updateUserName, togglePunishments, setActiveTitle, clearAllData } = useGame();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user.name);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const rankColor = RANK_COLORS[user.rankTier];
  const totalStatPoints = Object.values(user.stats).reduce((a, b) => a + b, 0);

  function handleSaveName() { if (nameInput.trim()) updateUserName(nameInput.trim()); setEditingName(false); }

  function handleExport() {
    const data = localStorage.getItem('leveling_game_state');
    if (!data) return;
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `leveling-backup-${new Date().toISOString().split('T')[0]}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen pb-safe">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="font-heading text-2xl font-bold text-white">Profile</h1>
          <p className="text-xs text-gray-500 font-mono mt-1">Hunter identification and settings.</p>
        </motion.div>

        <SystemCard delay={0.05}>
          <div className="flex items-center gap-4">
            <img src={getRankBadge(user.rankTier)} alt={`${user.rankTier} Rank`} className="w-20 h-20 object-contain" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <input value={nameInput} onChange={e => setNameInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                      className="bg-white/[0.05] border border-cyan-500/50 rounded-sm px-2 py-1 text-sm text-white focus:outline-none" autoFocus />
                    <button onClick={handleSaveName} className="text-cyan-400"><Check size={16} /></button>
                  </div>
                ) : (
                  <>
                    <h2 className="font-heading text-xl font-bold text-white">{user.name}</h2>
                    <button onClick={() => { setNameInput(user.name); setEditingName(true); }} className="text-gray-500 hover:text-cyan-400"><Edit3 size={14} /></button>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-heading text-xs font-semibold px-2 py-0.5 rounded-sm" style={{ color: rankColor, backgroundColor: `${rankColor}15`, border: `1px solid ${rankColor}30` }}>{user.rankTier}-RANK</span>
                <span className="text-xs text-gray-500">{RANK_NAMES[user.rankTier]}</span>
              </div>
              {user.activeTitle && <p className="text-[10px] text-amber-400 font-mono mt-0.5">"{user.activeTitle}"</p>}
            </div>
          </div>
          <div className="mt-4"><XPBar /></div>
        </SystemCard>

        <div className="grid grid-cols-2 gap-2">
          <SystemCard delay={0.1} className="text-center"><p className="font-heading text-2xl font-bold text-white">LV.{user.level}</p><p className="text-[10px] text-gray-500 uppercase font-mono">Level</p></SystemCard>
          <SystemCard delay={0.12} className="text-center"><p className="font-mono text-2xl font-bold text-cyan-400">{user.totalXP.toLocaleString()}</p><p className="text-[10px] text-gray-500 uppercase font-mono">Total XP</p></SystemCard>
          <SystemCard delay={0.14} className="text-center"><p className="font-mono text-2xl font-bold text-orange-400">{user.currentStreak}</p><p className="text-[10px] text-gray-500 uppercase font-mono">Streak</p></SystemCard>
          <SystemCard delay={0.16} className="text-center"><p className="font-mono text-2xl font-bold text-white">{totalStatPoints}</p><p className="text-[10px] text-gray-500 uppercase font-mono">Total Stats</p></SystemCard>
        </div>

        <SystemCard title="Titles" delay={0.2}>
          {user.titles.length > 0 ? (
            <div className="space-y-2">
              {user.titles.map(title => (
                <motion.button key={title} whileTap={{ scale: 0.97 }} onClick={() => setActiveTitle(title === user.activeTitle ? '' : title)}
                  className={`w-full flex items-center gap-3 p-2 rounded-sm transition-all ${title === user.activeTitle ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-white/[0.02] border border-transparent hover:border-white/[0.06]'}`}>
                  <Award size={14} className={title === user.activeTitle ? 'text-amber-400' : 'text-gray-500'} />
                  <span className={`text-sm ${title === user.activeTitle ? 'text-amber-400' : 'text-gray-400'}`}>{title}</span>
                  {title === user.activeTitle && <span className="ml-auto text-[9px] text-amber-400 font-mono">ACTIVE</span>}
                </motion.button>
              ))}
            </div>
          ) : <p className="text-center py-4 text-xs text-gray-600 font-mono">No titles unlocked yet.</p>}
        </SystemCard>

        <SystemCard title="Settings" delay={0.25}>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 bg-white/[0.02] rounded-sm">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-gray-500" />
                <div><p className="text-sm text-white">Punishment System</p><p className="text-[10px] text-gray-500">Penalties for missed quests</p></div>
              </div>
              <button onClick={togglePunishments} className={`w-10 h-5 rounded-full transition-colors relative ${user.punishmentsEnabled ? 'bg-cyan-500/40' : 'bg-gray-700'}`}>
                <motion.div className={`w-4 h-4 rounded-full absolute top-0.5 ${user.punishmentsEnabled ? 'bg-cyan-400' : 'bg-gray-500'}`}
                  animate={{ left: user.punishmentsEnabled ? '22px' : '2px' }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
              </button>
            </div>

            <motion.button whileTap={{ scale: 0.97 }} onClick={handleExport}
              className="w-full flex items-center gap-3 p-3 bg-white/[0.02] rounded-sm hover:bg-white/[0.04] transition-colors">
              <Download size={14} className="text-cyan-400" />
              <div className="text-left"><p className="text-sm text-white">Export Data</p><p className="text-[10px] text-gray-500">Download as JSON</p></div>
            </motion.button>

            {!showConfirmClear ? (
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowConfirmClear(true)}
                className="w-full flex items-center gap-3 p-3 bg-red-500/5 rounded-sm hover:bg-red-500/10 transition-colors">
                <Trash2 size={14} className="text-red-400" />
                <div className="text-left"><p className="text-sm text-red-400">Reset All Data</p><p className="text-[10px] text-gray-500">This cannot be undone</p></div>
              </motion.button>
            ) : (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-sm">
                <div className="flex items-center gap-2 mb-2"><AlertTriangle size={14} className="text-red-400" /><p className="text-sm text-red-400 font-medium">Are you sure?</p></div>
                <p className="text-[10px] text-gray-400 mb-3">All progress will be permanently deleted.</p>
                <div className="flex gap-2">
                  <button onClick={() => { clearAllData(); setShowConfirmClear(false); }} className="flex-1 py-2 bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-mono rounded-sm hover:bg-red-500/30">DELETE</button>
                  <button onClick={() => setShowConfirmClear(false)} className="flex-1 py-2 bg-white/[0.05] border border-white/10 text-gray-400 text-xs font-mono rounded-sm">CANCEL</button>
                </div>
              </div>
            )}
          </div>
        </SystemCard>

        <div className="text-center py-4">
          <p className="text-[10px] text-gray-600 font-mono">LEVELING v3.0.0</p>
          <p className="text-[10px] text-gray-700 font-mono">Solo Leveling Inspired Life System</p>
        </div>
      </div>
    </div>
  );
}
