import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, CheckCircle2, Clock, Trash2, Skull, Swords, ShieldCheck, Lock } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import { ACTIVITY_TYPES, DEMON_LEVELS, type ActivityType, type QuestFrequency, type Quest, type DemonLevel, calculateQuestXP, calculateQuestPenalty, getDemonImage } from '@/lib/gameEngine';
import SystemCard from '@/components/SystemCard';
import LevelUpModal from '@/components/LevelUpModal';

const BASE_XP = 30;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function isCompletedToday(quest: Quest): boolean {
  if (quest.status !== 'completed' || !quest.completedAt) return false;
  return quest.completedAt.startsWith(new Date().toISOString().split('T')[0]);
}

export default function Quests() {
  const { quests, completeQuest, failQuest, addQuest, deleteQuest } = useGame();
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState<'active' | 'cleared' | 'history' | 'failed'>('active');
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

  // Tab categories:
  // Active: quests with status 'active'
  // Cleared: completed TODAY — locked until tomorrow when they auto-reactivate
  // History: completed on previous days (not today)
  // Failed: all failed quests
  const activeQuests = quests.filter(q => q.status === 'active');
  const clearedToday = quests.filter(q => isCompletedToday(q));
  const historyQuests = quests.filter(q => q.status === 'completed' && !isCompletedToday(q));
  const failedQuests = quests.filter(q => q.status === 'failed');

  const previewXP = calculateQuestXP(BASE_XP, qDemonLevel);
  const previewPenalty = calculateQuestPenalty(BASE_XP, qDemonLevel);

  function resetForm() { setQTitle(''); setQDesc(''); setQTarget(''); setQTargetType('study'); setQTargetValue(1); setQFrequency('daily'); setQDemonLevel(1); setQSelectedDays([0,1,2,3,4,5,6]); }

  function handleCreateQuest() {
    if (!qTitle.trim()) return;
    const now = new Date();
    let dueDate: Date;
    if (qFrequency === 'daily') { dueDate = new Date(now); dueDate.setHours(23, 59, 59, 999); }
    else if (qFrequency === 'weekly') { dueDate = new Date(now); dueDate.setDate(dueDate.getDate() + 7); dueDate.setHours(23, 59, 59, 999); }
    else {
      const today = now.getDay();
      const sortedDays = [...qSelectedDays].sort();
      const nextDay = sortedDays.find(d => d > today) ?? sortedDays[0];
      const daysUntil = nextDay !== undefined ? (nextDay > today ? nextDay - today : 7 - today + nextDay) : 1;
      dueDate = new Date(now); dueDate.setDate(dueDate.getDate() + daysUntil); dueDate.setHours(23, 59, 59, 999);
    }
    addQuest({
      title: qTitle, description: qDesc, target: qTarget || `${ACTIVITY_TYPES[qTargetType].label} x${qTargetValue}`,
      targetType: qTargetType, targetValue: qTargetValue, currentProgress: 0, xpReward: previewXP, xpPenalty: previewPenalty,
      statRewards: {}, frequency: qFrequency, status: 'active', demonLevel: qDemonLevel, dueDate: dueDate.toISOString(),
      selectedDays: qFrequency === 'custom' ? qSelectedDays : undefined,
    });
    setShowCreate(false); resetForm();
  }

  function handleComplete(questId: string) {
    // Simply complete. No auto-respawn — the daily reset in GameContext handles reactivation next day.
    const result = completeQuest(questId);
    if (result.leveledUp) { setNewLevel(result.newLevel); setTimeout(() => setShowLevelUp(true), 300); }
  }

  const displayQuests = tab === 'active' ? activeQuests : tab === 'cleared' ? clearedToday : tab === 'history' ? historyQuests : failedQuests;

  const TABS = [
    { key: 'active'  as const, label: 'Active',  count: activeQuests.length, c: 'cyan' },
    { key: 'cleared' as const, label: 'Cleared', count: clearedToday.length, c: 'amber' },
    { key: 'history' as const, label: 'History', count: historyQuests.length, c: 'emerald' },
    { key: 'failed'  as const, label: 'Failed',  count: failedQuests.length,  c: 'red' },
  ];

  const TAB_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    cyan:    { bg: 'rgba(0,212,255,0.1)',    text: '#00d4ff', border: 'rgba(0,212,255,0.3)' },
    amber:   { bg: 'rgba(251,191,36,0.1)',   text: '#fbbf24', border: 'rgba(251,191,36,0.3)' },
    emerald: { bg: 'rgba(16,185,129,0.1)',   text: '#10b981', border: 'rgba(16,185,129,0.3)' },
    red:     { bg: 'rgba(239,68,68,0.1)',    text: '#ef4444', border: 'rgba(239,68,68,0.3)' },
  };

  const emptyMessages: Record<string, string> = {
    active: 'No active quests. Create one to begin!',
    cleared: 'No quests cleared today yet. Get to work, Hunter!',
    history: 'No past completions yet.',
    failed: 'No failed quests. Keep it up!',
  };

  return (
    <div className="min-h-screen pb-safe">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-white">Quests</h1>
            <p className="text-xs text-gray-500 font-mono mt-1">Defeat demons. Earn XP. Level up.</p>
          </div>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-xs font-mono rounded-sm hover:bg-cyan-500/30 transition-colors">
            <Plus size={14} /> New Quest
          </motion.button>
        </motion.div>

        {/* Tabs — scrollable on small screens */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map(t => {
            const colors = TAB_COLORS[t.c];
            const isActive = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="px-3 py-2 text-xs font-mono rounded-sm transition-colors border whitespace-nowrap shrink-0"
                style={{
                  backgroundColor: isActive ? colors.bg : 'transparent',
                  color: isActive ? colors.text : '#6b7280',
                  borderColor: isActive ? colors.border : 'transparent',
                }}>
                {t.label} ({t.count})
              </button>
            );
          })}
        </div>

        {/* Cleared tab info banner */}
        {tab === 'cleared' && clearedToday.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-sm">
            <Lock size={14} className="text-amber-400 shrink-0" />
            <p className="text-[11px] text-amber-400/80 font-mono leading-relaxed">
              These quests are sealed for today. They will automatically reactivate tomorrow at midnight.
            </p>
          </motion.div>
        )}

        {/* Quest List */}
        <div className="space-y-3">
          {displayQuests.map((quest, i) => (
            <QuestCard
              key={quest.id}
              quest={quest}
              index={i}
              isCleared={tab === 'cleared'}
              onComplete={() => handleComplete(quest.id)}
              onFail={() => failQuest(quest.id)}
              onDelete={() => deleteQuest(quest.id)}
            />
          ))}
          {displayQuests.length === 0 && (
            <SystemCard>
              <div className="text-center py-8">
                {tab === 'cleared' ? <ShieldCheck size={28} className="mx-auto mb-2 text-gray-700" /> : <Swords size={28} className="mx-auto mb-2 text-gray-700" />}
                <p className="text-xs text-gray-600 font-mono">{emptyMessages[tab]}</p>
              </div>
            </SystemCard>
          )}
        </div>
      </div>

      {/* Create Quest Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-[#0a0e1e] border border-cyan-500/20 rounded-t-lg sm:rounded-lg max-h-[85vh] overflow-y-auto mb-20 sm:mb-0"
              onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 z-10 bg-[#0a0e1e] border-b border-white/5 px-5 py-4 flex items-center justify-between">
                <h3 className="font-heading text-lg font-bold text-white">Create Quest</h3>
                <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
              </div>
              <div className="p-5 space-y-5">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider font-mono block mb-1.5">Quest Title *</label>
                  <input value={qTitle} onChange={e => setQTitle(e.target.value)}
                    className="w-full bg-white/[0.05] border border-white/10 rounded-sm px-3 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none placeholder:text-gray-600"
                    placeholder="e.g., Morning Workout, Read 30 Pages..." />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider font-mono block mb-1.5">Description</label>
                  <textarea value={qDesc} onChange={e => setQDesc(e.target.value)} rows={2}
                    className="w-full bg-white/[0.05] border border-white/10 rounded-sm px-3 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none resize-none placeholder:text-gray-600"
                    placeholder="Optional description..." />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider font-mono block mb-2">Activity Type</label>
                  <div className="grid grid-cols-5 gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {(Object.entries(ACTIVITY_TYPES) as [ActivityType, typeof ACTIVITY_TYPES[ActivityType]][]).map(([key, val]) => (
                      <button key={key} type="button" onClick={() => setQTargetType(key)}
                        className={`flex flex-col items-center gap-0.5 p-2 rounded-sm text-center transition-all ${qTargetType === key ? 'bg-cyan-500/20 border border-cyan-500/40' : 'bg-white/[0.03] border border-white/[0.06]'}`}>
                        <span className="text-lg">{val.icon}</span>
                        <span className="text-[8px] text-gray-400 leading-tight">{val.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider font-mono block mb-2">☠️ Set Demon Level</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {([1, 2, 3, 4, 5, 6] as DemonLevel[]).map(level => {
                      const demon = DEMON_LEVELS[level]; const sel = qDemonLevel === level;
                      return (
                        <button type="button" key={level} onClick={() => setQDemonLevel(level)}
                          className={`relative flex flex-col items-center gap-1.5 p-3 rounded-md transition-all ${sel ? 'ring-2 scale-[1.02]' : 'hover:scale-[1.01]'}`}
                          style={{ backgroundColor: sel ? `${demon.color}20` : 'rgba(255,255,255,0.03)', border: sel ? `2px solid ${demon.color}` : '1px solid rgba(255,255,255,0.06)' }}>
                          <div className="relative w-16 h-16 flex items-center justify-center rounded-md overflow-hidden" style={{ backgroundColor: `${demon.color}15` }}>
                            <img src={getDemonImage(level)} alt={demon.name} className="w-14 h-14 object-contain drop-shadow-lg" />
                          </div>
                          <span className="text-[10px] font-mono font-bold" style={{ color: demon.color }}>{demon.name}</span>
                          <span className="text-[9px] text-gray-500 font-mono">x{demon.xpMultiplier} XP</span>
                          {sel && <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px]" style={{ backgroundColor: demon.color, color: '#000' }}>✓</div>}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] font-mono mt-2 text-center" style={{ color: DEMON_LEVELS[qDemonLevel].color }}>{DEMON_LEVELS[qDemonLevel].description}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider font-mono block mb-1.5">Target Value</label>
                    <input type="number" value={qTargetValue} onChange={e => setQTargetValue(Math.max(1, parseInt(e.target.value) || 1))} min={1}
                      className="w-full bg-white/[0.05] border border-white/10 rounded-sm px-3 py-2.5 text-sm text-white font-mono focus:border-cyan-500/50 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider font-mono block mb-1.5">Frequency</label>
                    <select value={qFrequency} onChange={e => setQFrequency(e.target.value as QuestFrequency)}
                      className="w-full bg-white/[0.05] border border-white/10 rounded-sm px-3 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none">
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
                          className={`flex-1 py-2 rounded-sm text-[10px] font-mono font-bold transition-all ${qSelectedDays.includes(i) ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-400' : 'bg-white/[0.03] border border-white/[0.06] text-gray-600'}`}>
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <div className="flex-1 p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-sm text-center">
                    <p className="text-[9px] text-gray-500 uppercase font-mono">Reward</p>
                    <p className="font-heading text-xl font-bold text-cyan-400">+{previewXP} XP</p>
                  </div>
                  <div className="flex-1 p-3 bg-red-500/5 border border-red-500/20 rounded-sm text-center">
                    <p className="text-[9px] text-gray-500 uppercase font-mono">Penalty</p>
                    <p className="font-heading text-xl font-bold text-red-400">-{previewPenalty} XP</p>
                  </div>
                </div>
              </div>
              <div className="bg-[#0a0e1e] border-t border-white/5 p-4 pb-6">
                <button type="button" onClick={handleCreateQuest} disabled={!qTitle.trim() || (qFrequency === 'custom' && qSelectedDays.length === 0)}
                  className="w-full py-4 bg-cyan-500/20 border-2 border-cyan-500/40 text-cyan-400 font-heading text-base tracking-wider uppercase hover:bg-cyan-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all rounded-sm active:scale-[0.98]"
                  style={{ boxShadow: qTitle.trim() ? '0 0 20px rgba(0, 212, 255, 0.15)' : 'none' }}>
                  ⚔️ CREATE QUEST
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

function QuestCard({ quest, index, isCleared, onComplete, onFail, onDelete }: {
  quest: Quest; index: number; isCleared?: boolean;
  onComplete: () => void; onFail: () => void; onDelete: () => void;
}) {
  const isCompleted = quest.status === 'completed';
  const isFailed = quest.status === 'failed';
  const dc = DEMON_LEVELS[quest.demonLevel];
  const config = ACTIVITY_TYPES[quest.targetType] || ACTIVITY_TYPES.custom;
  const now = new Date(); const due = new Date(quest.dueDate);
  const hoursLeft = Math.max(0, Math.floor((due.getTime() - now.getTime()) / 3600000));
  const minsLeft = Math.max(0, Math.floor(((due.getTime() - now.getTime()) % 3600000) / 60000));
  const isUrgent = hoursLeft < 3 && !isCompleted && !isFailed;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
      <SystemCard className={`${isCleared ? 'opacity-70' : ''} ${isFailed ? 'opacity-50' : ''} ${isUrgent ? 'border-red-500/30' : ''} ${isCleared ? 'border-amber-500/20' : ''}`}>
        <div className="flex items-start gap-3">
          <div className="w-14 h-14 rounded-md flex items-center justify-center shrink-0 overflow-hidden relative"
            style={{ backgroundColor: `${dc.color}15`, border: `1px solid ${dc.color}20` }}>
            <img src={getDemonImage(quest.demonLevel)} alt={dc.name}
              className={`w-12 h-12 object-contain ${isCleared || isFailed ? 'grayscale' : ''}`} />
            {isCleared && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-md">
                <ShieldCheck size={20} className="text-amber-400" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className={`text-sm font-semibold ${isCleared ? 'text-amber-400/80' : isFailed ? 'text-red-400/60 line-through' : 'text-white'}`}>{quest.title}</h4>
              <span className="text-[8px] px-1.5 py-0.5 rounded-sm font-mono font-bold"
                style={{ color: dc.color, backgroundColor: `${dc.color}15`, border: `1px solid ${dc.color}30` }}>{dc.name}</span>
              {isCleared && (
                <span className="text-[8px] px-1.5 py-0.5 rounded-sm font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  CLEARED
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[10px] text-gray-500 font-mono">{config.icon} {config.label}</span>
              <span className="text-[10px] text-amber-400 font-mono">+{quest.xpReward} XP</span>
              <span className="text-[10px] text-red-400/60 font-mono">-{quest.xpPenalty} XP</span>
            </div>

            {/* Active quest: timer + action buttons */}
            {!isCompleted && !isFailed && (
              <>
                <div className="flex items-center gap-1 mt-1.5">
                  <Clock size={10} className={isUrgent ? 'text-red-400' : 'text-gray-600'} />
                  <span className={`text-[10px] font-mono ${isUrgent ? 'text-red-400' : 'text-gray-600'}`}>
                    {hoursLeft > 0 ? `${hoursLeft}h ${minsLeft}m left` : `${minsLeft}m left`}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <motion.button whileTap={{ scale: 0.9 }} onClick={onComplete}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono rounded-sm hover:bg-emerald-500/20">
                    <CheckCircle2 size={12} /> Complete
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.9 }} onClick={onFail}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-500/5 border border-red-500/20 text-red-400/60 text-[10px] font-mono rounded-sm hover:bg-red-500/10">
                    <Skull size={12} /> Abandon
                  </motion.button>
                  <button onClick={onDelete} className="ml-auto p-1.5 text-gray-600 hover:text-red-400"><Trash2 size={12} /></button>
                </div>
              </>
            )}

            {/* Cleared today: locked state with completion time */}
            {isCleared && quest.completedAt && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/5 border border-amber-500/15 rounded-sm">
                  <Lock size={10} className="text-amber-400/60" />
                  <span className="text-[10px] text-amber-400/60 font-mono">
                    Sealed — completed at {new Date(quest.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            )}

            {/* History: past completions */}
            {isCompleted && !isCleared && quest.completedAt && (
              <div className="mt-2">
                <p className="text-[10px] text-emerald-400/60 font-mono">
                  ✓ Completed {new Date(quest.completedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
                <button onClick={onDelete} className="flex items-center gap-1 px-3 py-1.5 mt-1.5 bg-white/[0.03] border border-white/[0.06] text-gray-500 text-[10px] font-mono rounded-sm hover:text-red-400">
                  <Trash2 size={12} /> Remove
                </button>
              </div>
            )}

            {/* Failed */}
            {isFailed && (
              <div className="mt-2">
                <p className="text-[10px] text-red-400/60 font-mono">✗ Failed — {quest.xpPenalty} XP penalty</p>
                <button onClick={onDelete} className="flex items-center gap-1 px-3 py-1.5 mt-1.5 bg-white/[0.03] border border-white/[0.06] text-gray-500 text-[10px] font-mono rounded-sm hover:text-red-400">
                  <Trash2 size={12} /> Remove
                </button>
              </div>
            )}
          </div>
        </div>
      </SystemCard>
    </motion.div>
  );
}
