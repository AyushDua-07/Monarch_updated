import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, CheckCircle2, Clock, Trash2, Skull, Swords, Lock } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import {
  ACTIVITY_TYPES, DEMON_LEVELS, type ActivityType, type QuestFrequency,
  type Quest, type DemonLevel, calculateQuestXP, calculateQuestPenalty,
} from '@/lib/gameEngine';
import { getDemonImage } from '@/lib/assets';
import SystemCard from '@/components/SystemCard';
import LevelUpModal from '@/components/LevelUpModal';

const BASE_XP = 30;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function isQuestForToday(quest: Quest): boolean {
  if (quest.frequency === 'custom' && quest.selectedDays && quest.selectedDays.length > 0) {
    return quest.selectedDays.includes(new Date().getDay());
  }
  return true;
}

export default function Quests() {
  const { quests, completeQuest, failQuest, addQuest, deleteQuest, editQuest } = useGame();
  const [showCreate, setShowCreate] = useState(false);
  const [editingQuestId, setEditingQuestId] = useState<string | null>(null);
  const [tab, setTab] = useState<'active' | 'completed' | 'failed'>('active');
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState(0);

  const [qTitle, setQTitle] = useState('');
  const [qDesc, setQDesc] = useState('');
  const [qTarget, setQTarget] = useState('');
  const [qTargetType, setQTargetType] = useState<ActivityType>('study');
  const [qTargetValue, setQTargetValue] = useState(1);
  const [qFrequency, setQFrequency] = useState<QuestFrequency>('daily');
  const [qDemonLevel, setQDemonLevel] = useState<DemonLevel>(1);
  const [qSelectedDays, setQSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  const activeQuests = quests.filter(q => q.status === 'active' && isQuestForToday(q));
  const completedQuests = quests.filter(q => q.status === 'completed' && isQuestForToday(q));
  const failedQuests = quests.filter(q => q.status === 'failed' && isQuestForToday(q));
  const previewXP = calculateQuestXP(BASE_XP, qDemonLevel);
  const previewPenalty = calculateQuestPenalty(BASE_XP, qDemonLevel);

  function openEditQuest(quest: Quest) {
    setEditingQuestId(quest.id); setQTitle(quest.title); setQDesc(quest.description);
    setQTarget(quest.target); setQTargetType(quest.targetType); setQTargetValue(quest.targetValue);
    setQFrequency(quest.frequency); setQDemonLevel(quest.demonLevel);
    setQSelectedDays(quest.selectedDays || [0, 1, 2, 3, 4, 5, 6]); setShowCreate(true);
  }

  function handleCreateQuest() {
    if (!qTitle.trim()) return;
    const now = new Date();
    let dueDate: Date;
    if (qFrequency === 'daily') {
      dueDate = new Date(now); dueDate.setHours(23, 59, 59, 999);
    } else if (qFrequency === 'weekly') {
      dueDate = new Date(now); dueDate.setDate(dueDate.getDate() + 7); dueDate.setHours(23, 59, 59, 999);
    } else {
      const today = now.getDay();
      const sorted = [...qSelectedDays].sort();
      const next = sorted.find(d => d > today) ?? sorted[0];
      const until = next !== undefined ? (next > today ? next - today : 7 - today + next) : 1;
      dueDate = new Date(now); dueDate.setDate(dueDate.getDate() + until); dueDate.setHours(23, 59, 59, 999);
    }
    if (editingQuestId) {
      editQuest(editingQuestId, { title: qTitle, description: qDesc, target: qTarget || ACTIVITY_TYPES[qTargetType].label + ' x' + qTargetValue, targetType: qTargetType, targetValue: qTargetValue, demonLevel: qDemonLevel, frequency: qFrequency, xpReward: previewXP, xpPenalty: previewPenalty, dueDate: dueDate.toISOString(), selectedDays: qFrequency === 'custom' ? qSelectedDays : undefined });
      setEditingQuestId(null);
    } else {
      addQuest({ title: qTitle, description: qDesc, target: qTarget || ACTIVITY_TYPES[qTargetType].label + ' x' + qTargetValue, targetType: qTargetType, targetValue: qTargetValue, currentProgress: 0, xpReward: previewXP, xpPenalty: previewPenalty, statRewards: {}, frequency: qFrequency, status: 'active', demonLevel: qDemonLevel, dueDate: dueDate.toISOString(), selectedDays: qFrequency === 'custom' ? qSelectedDays : undefined });
    }
    setShowCreate(false); resetForm();
  }

  function resetForm() {
    setQTitle(''); setQDesc(''); setQTarget(''); setQTargetType('study'); setQTargetValue(1);
    setQFrequency('daily'); setQDemonLevel(1); setQSelectedDays([0,1,2,3,4,5,6]); setEditingQuestId(null);
  }

  function handleComplete(questId: string) {
    const result = completeQuest(questId);
    if (result.leveledUp) { setNewLevel(result.newLevel); setTimeout(() => setShowLevelUp(true), 300); }
  }

  const displayQuests = tab === 'active' ? activeQuests : tab === 'completed' ? completedQuests : failedQuests;

  return (
    <div className="min-h-screen pb-safe">
      <div className="container py-6 space-y-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-white">Quests</h1>
            <p className="text-xs text-gray-500 font-mono mt-1">Defeat demons. Earn XP. Level up.</p>
          </div>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setEditingQuestId(null); resetForm(); setShowCreate(true); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-xs font-mono rounded-sm hover:bg-cyan-500/30 transition-colors">
            <Plus size={14} /> New Quest
          </motion.button>
        </motion.div>

        <div className="flex gap-2">
          {[
            { key: 'active', label: 'Active', count: activeQuests.length, color: 'cyan' },
            { key: 'completed', label: 'Completed', count: completedQuests.length, color: 'emerald' },
            { key: 'failed', label: 'Failed', count: failedQuests.length, color: 'red' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
              className="px-3 py-2 text-xs font-mono rounded-sm transition-colors border"
              style={{
                backgroundColor: tab === t.key ? (t.color === 'cyan' ? 'rgba(0,212,255,0.1)' : t.color === 'emerald' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)') : 'transparent',
                color: tab === t.key ? (t.color === 'cyan' ? '#00d4ff' : t.color === 'emerald' ? '#10b981' : '#ef4444') : '#6b7280',
                borderColor: tab === t.key ? (t.color === 'cyan' ? 'rgba(0,212,255,0.3)' : t.color === 'emerald' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)') : 'transparent',
              }}>
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {displayQuests.map((quest, i) => (
            <QuestCard key={quest.id} quest={quest} index={i} onComplete={() => handleComplete(quest.id)} onFail={() => failQuest(quest.id)} onDelete={() => deleteQuest(quest.id)} onEdit={() => openEditQuest(quest)} />
          ))}
          {displayQuests.length === 0 && (
            <SystemCard><div className="text-center py-8"><Swords size={28} className="mx-auto mb-2 text-gray-700" />
              <p className="text-xs text-gray-600 font-mono">{tab === 'active' ? 'No active quests for today.' : tab === 'completed' ? 'No completed quests for today.' : 'No failed quests for today.'}</p>
            </div></SystemCard>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => { setShowCreate(false); resetForm(); }}>
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-[#0a0e1e] border border-cyan-500/20 rounded-t-lg sm:rounded-lg max-h-[85vh] overflow-y-auto mb-20 sm:mb-0"
              onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 z-10 bg-[#0a0e1e] border-b border-white/5 px-5 py-4 flex items-center justify-between">
                <h3 className="font-heading text-lg font-bold text-white">{editingQuestId ? 'Edit Quest' : 'Create Quest'}</h3>
                <button onClick={() => { setShowCreate(false); resetForm(); }} className="text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
              </div>
              <div className="p-5 space-y-5">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider font-mono block mb-1.5">Quest Title *</label>
                  <input value={qTitle} onChange={e => setQTitle(e.target.value)} className="w-full bg-white/[0.05] border border-white/10 rounded-sm px-3 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none placeholder:text-gray-600" placeholder="e.g., Morning Workout..." />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider font-mono block mb-1.5">Description</label>
                  <textarea value={qDesc} onChange={e => setQDesc(e.target.value)} className="w-full bg-white/[0.05] border border-white/10 rounded-sm px-3 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none placeholder:text-gray-600 resize-none h-20" placeholder="What is this quest about?" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider font-mono block mb-2">Activity Type</label>
                  <div className="grid grid-cols-5 gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {(Object.entries(ACTIVITY_TYPES) as [ActivityType, typeof ACTIVITY_TYPES[ActivityType]][]).map(([key, val]) => (
                      <button key={key} type="button" onClick={() => setQTargetType(key)}
                        className={`flex flex-col items-center gap-0.5 p-2 rounded-sm text-center transition-all ${qTargetType === key ? 'bg-cyan-500/20 border border-cyan-500/40' : 'bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12]'}`}>
                        <span className="text-lg">{val.icon}</span>
                        <span className="text-[8px] text-gray-400 leading-tight">{val.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider font-mono block mb-2">Set Demon Level</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {([1,2,3,4,5,6] as DemonLevel[]).map(level => {
                      const demon = DEMON_LEVELS[level];
                      const sel = qDemonLevel === level;
                      return (
                        <button type="button" key={level} onClick={() => setQDemonLevel(level)}
                          className={`relative flex flex-col items-center gap-1.5 p-3 rounded-md transition-all ${sel ? 'ring-2 scale-[1.02]' : 'hover:scale-[1.01]'}`}
                          style={{ backgroundColor: sel ? demon.color + '20' : 'rgba(255,255,255,0.03)', border: sel ? '2px solid ' + demon.color : '1px solid rgba(255,255,255,0.06)' }}>
                          <div className="relative w-16 h-16 flex items-center justify-center rounded-md overflow-hidden"
                            style={{ backgroundColor: demon.color + '15', boxShadow: sel ? '0 0 20px ' + demon.color + '40' : 'none' }}>
                            <img src={getDemonImage(level)} alt={demon.name} className="w-14 h-14 object-contain drop-shadow-lg"
                              style={{ filter: sel ? 'drop-shadow(0 0 8px ' + demon.color + '80)' : 'none' }} />
                          </div>
                          <span className="text-[10px] font-mono font-bold" style={{ color: demon.color }}>{demon.name}</span>
                          <span className="text-[9px] text-gray-500 font-mono">x{demon.xpMultiplier} XP</span>
                          {sel && <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px]" style={{ backgroundColor: demon.color, color: '#000' }}>&#10003;</div>}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] font-mono mt-2 text-center" style={{ color: DEMON_LEVELS[qDemonLevel].color }}>{DEMON_LEVELS[qDemonLevel].description}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider font-mono block mb-1.5">Target Value</label>
                    <input type="number" value={qTargetValue} onChange={e => setQTargetValue(Math.max(1, parseInt(e.target.value) || 1))} className="w-full bg-white/[0.05] border border-white/10 rounded-sm px-3 py-2.5 text-sm text-white font-mono focus:border-cyan-500/50 focus:outline-none" min={1} />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider font-mono block mb-1.5">Frequency</label>
                    <select value={qFrequency} onChange={e => setQFrequency(e.target.value as QuestFrequency)} className="w-full bg-white/[0.05] border border-white/10 rounded-sm px-3 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none">
                      <option value="daily" className="bg-gray-900">Daily</option>
                      <option value="weekly" className="bg-gray-900">Weekly</option>
                      <option value="custom" className="bg-gray-900">Select Days</option>
                    </select>
                  </div>
                </div>
                {qFrequency === 'custom' && (
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider font-mono block mb-2">Select Days</label>
                    <div className="flex gap-1.5">
                      {DAY_NAMES.map((day, i) => (
                        <button key={day} type="button" onClick={() => setQSelectedDays(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i].sort())}
                          className={`flex-1 py-2 rounded-sm text-[10px] font-mono font-bold transition-all ${qSelectedDays.includes(i) ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-400' : 'bg-white/[0.03] border border-white/[0.06] text-gray-600 hover:text-gray-400'}`}>
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider font-mono block mb-1.5">Target Label (optional)</label>
                  <input value={qTarget} onChange={e => setQTarget(e.target.value)} className="w-full bg-white/[0.05] border border-white/10 rounded-sm px-3 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none placeholder:text-gray-600" placeholder={'e.g., ' + ACTIVITY_TYPES[qTargetType].label + ' x' + qTargetValue} />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-sm text-center">
                    <p className="text-[9px] text-gray-500 uppercase tracking-wider font-mono">Reward</p>
                    <p className="font-heading text-xl font-bold text-cyan-400">+{previewXP} XP</p>
                  </div>
                  <div className="flex-1 p-3 bg-red-500/5 border border-red-500/20 rounded-sm text-center">
                    <p className="text-[9px] text-gray-500 uppercase tracking-wider font-mono">Penalty</p>
                    <p className="font-heading text-xl font-bold text-red-400">-{previewPenalty} XP</p>
                  </div>
                </div>
              </div>
              <div className="bg-[#0a0e1e] border-t border-white/5 p-4 pb-6">
                <button type="button" onClick={handleCreateQuest} disabled={!qTitle.trim() || (qFrequency === 'custom' && qSelectedDays.length === 0)}
                  className="w-full py-4 bg-cyan-500/20 border-2 border-cyan-500/40 text-cyan-400 font-heading text-base tracking-wider uppercase hover:bg-cyan-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all rounded-sm active:scale-[0.98]"
                  style={{ boxShadow: qTitle.trim() ? '0 0 20px rgba(0, 212, 255, 0.15)' : 'none' }}>
                  {editingQuestId ? 'UPDATE QUEST' : 'CREATE QUEST'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <LevelUpModal show={showLevelUp} level={newLevel} onClose={() => setShowLevelUp(false)} />
    </div>
  );
}

function QuestCard({ quest, index, onComplete, onFail, onDelete, onEdit }: { quest: Quest; index: number; onComplete: () => void; onFail: () => void; onDelete: () => void; onEdit: () => void; }) {
  const isCompleted = quest.status === 'completed';
  const isFailed = quest.status === 'failed';
  const isLocked = isCompleted || isFailed;
  const dc = DEMON_LEVELS[quest.demonLevel];
  const now = new Date();
  const due = new Date(quest.dueDate);
  const hoursLeft = Math.max(0, Math.floor((due.getTime() - now.getTime()) / 3600000));
  const minsLeft = Math.max(0, Math.floor(((due.getTime() - now.getTime()) % 3600000) / 60000));
  const isUrgent = hoursLeft < 3 && !isLocked;
  const lockText = isCompleted ? 'text-amber-400' : 'text-red-400';
  const lockBorder = isCompleted ? 'border-amber-500/20' : 'border-red-500/20';
  const badgeCls = isCompleted ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20';
  const dayLabels = quest.frequency === 'custom' && quest.selectedDays ? quest.selectedDays.map(d => DAY_NAMES[d]).join(', ') : null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
      <SystemCard className={`${isLocked ? 'opacity-60 ' + lockBorder : ''} ${isUrgent ? 'border-red-500/30' : ''}`}>
        <div className="flex items-start gap-3">
          <div className="w-14 h-14 rounded-md flex items-center justify-center shrink-0 overflow-hidden relative"
            style={{ backgroundColor: dc.color + '15', border: '1px solid ' + dc.color + '20' }}>
            <img src={getDemonImage(quest.demonLevel)} alt={dc.name}
              className={'w-12 h-12 object-contain ' + (isLocked ? 'grayscale opacity-60' : '')}
              style={{ filter: !isLocked ? 'drop-shadow(0 0 4px ' + dc.color + '60)' : 'grayscale(1)' }} />
            {isLocked && <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-md"><Lock size={16} className={lockText} /></div>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className={'text-sm font-semibold ' + (isLocked ? 'text-gray-400' : 'text-white')}>{quest.title}</h4>
              <span className="text-[8px] px-1.5 py-0.5 rounded-sm font-mono font-bold" style={{ color: dc.color, backgroundColor: dc.color + '15', border: '1px solid ' + dc.color + '30' }}>{dc.name}</span>
              {isCompleted && <span className={'text-[8px] px-1.5 py-0.5 rounded-sm font-mono ' + badgeCls}>Completed</span>}
              {isFailed && <span className={'text-[8px] px-1.5 py-0.5 rounded-sm font-mono ' + badgeCls}>Abandoned</span>}
              <span className={'text-[8px] px-1.5 py-0.5 rounded-sm font-mono ' + (quest.frequency === 'daily' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-white/[0.05] text-gray-400 border border-white/10')}>
                {quest.frequency === 'custom' && dayLabels ? dayLabels : quest.frequency}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">{quest.description}</p>
            {!isLocked && <div className="flex items-center gap-2 mt-2"><Clock size={12} className={isUrgent ? 'text-red-400' : 'text-gray-600'} /><span className={'text-[10px] font-mono ' + (isUrgent ? 'text-red-400' : 'text-gray-600')}>{hoursLeft > 0 ? hoursLeft + 'h ' + minsLeft + 'm left' : minsLeft + 'm left'}</span></div>}
            {isCompleted && quest.completedAt && <p className="text-[10px] text-emerald-400/60 font-mono mt-1">Completed {new Date(quest.completedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>}
            {isFailed && (quest as any).failedAt && <p className="text-[10px] text-red-400/60 font-mono mt-1">Abandoned {new Date((quest as any).failedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>}
            {isFailed && !(quest as any).failedAt && <p className="text-[10px] text-red-400/60 font-mono mt-1">Abandoned - {quest.xpPenalty} XP penalty</p>}
            {!isLocked && (
              <div className="flex items-center gap-2 mt-2">
                <motion.button whileTap={{ scale: 0.9 }} onClick={onComplete} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono rounded-sm hover:bg-emerald-500/20 transition-colors"><CheckCircle2 size={12} /> Complete</motion.button>
                <motion.button whileTap={{ scale: 0.9 }} onClick={onFail} className="flex items-center gap-1 px-3 py-1.5 bg-red-500/5 border border-red-500/20 text-red-400/60 text-[10px] font-mono rounded-sm hover:bg-red-500/10 transition-colors"><Skull size={12} /> Abandon</motion.button>
                <motion.button whileTap={{ scale: 0.9 }} onClick={onEdit} className="flex items-center gap-1 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono rounded-sm hover:bg-amber-500/20 transition-colors">Edit</motion.button>
                <button onClick={onDelete} className="ml-auto p-1.5 text-gray-600 hover:text-red-400 transition-colors"><Trash2 size={12} /></button>
              </div>
            )}
            {isLocked && (
              <div className="flex items-center gap-2 mt-2">
                <button onClick={onDelete} className="flex items-center gap-1 px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] text-gray-500 text-[10px] font-mono rounded-sm hover:text-red-400 hover:border-red-500/20 transition-colors"><Trash2 size={12} /> Remove</button>
                <span className={'text-[9px] ml-auto font-mono ' + (isCompleted ? 'text-emerald-400/60' : 'text-red-400/60')}>Reactivates at 00:00 AM</span>
              </div>
            )}
          </div>
        </div>
      </SystemCard>
    </motion.div>
  );
}
