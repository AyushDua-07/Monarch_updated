import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  type User, type ActivityLog, type Quest, type SystemLogEntry,
  type ActivityType, type UserStats, type QuestStatus, type DemonLevel,
  xpToNextLevel, getRankForLevel, getStatImpactsFromQuest, checkTitleUnlocks,
  generateId, RANK_NAMES, DEMON_LEVELS, getLevelForXP,
} from '@/lib/gameEngine';

interface GameState {
  user: User;
  logs: ActivityLog[];
  quests: Quest[];
  systemLog: SystemLogEntry[];
}

interface GameContextType extends GameState {
  completeQuest: (questId: string, notes?: string) => { xpEarned: number; leveledUp: boolean; newLevel: number };
  failQuest: (questId: string) => void;
  addQuest: (quest: Omit<Quest, 'id' | 'createdAt'>) => void;
  editQuest: (questId: string, updates: Partial<Pick<Quest, 'title' | 'description' | 'targetType' | 'targetValue' | 'demonLevel' | 'xpReward' | 'xpPenalty'>>) => void;
  deleteQuest: (questId: string) => void;
  allocateStat: (stat: keyof UserStats) => void;
  updateUserName: (name: string) => void;
  togglePunishments: () => void;
  setActiveTitle: (title: string) => void;
  clearAllData: () => void;
}

const GameContext = createContext<GameContextType | null>(null);
const STORAGE_KEY = 'leveling_game_state';

function createDefaultUser(): User {
  return {
    id: generateId(), name: 'Hunter', level: 1, totalXP: 0, currentXP: 0, rankTier: 'E',
    currentStreak: 0, bestStreak: 0,
    stats: { strength: 0, endurance: 0, intelligence: 0, discipline: 0, charisma: 0, luck: 0 },
    statPoints: 0, coins: 0, titles: [], activeTitle: '', punishmentsEnabled: true,
    createdAt: new Date().toISOString(), lastActiveDate: new Date().toISOString().split('T')[0],
  };
}

function createDefaultState(): GameState {
  return {
    user: createDefaultUser(), logs: [], quests: [],
    systemLog: [{ id: generateId(), type: 'system', message: 'System initialized. Welcome, Hunter. Your journey begins now.', timestamp: new Date().toISOString() }],
  };
}

function loadState(): GameState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const p = JSON.parse(saved);
      const defaults = createDefaultUser();
      const user: User = {
        ...defaults, ...p.user,
        stats: p.user?.stats ? { ...defaults.stats, ...p.user.stats } : defaults.stats,
        punishmentsEnabled: p.user?.punishmentsEnabled ?? true,
        titles: Array.isArray(p.user?.titles) ? p.user.titles : [],
        activeTitle: p.user?.activeTitle || '',
      };
      return {
        user,
        logs: Array.isArray(p.logs) ? p.logs : [],
        quests: Array.isArray(p.quests) ? p.quests.map((q: any) => ({ ...q, id: q.id || generateId(), status: q.status || 'active', demonLevel: q.demonLevel || 1 })) : [],
        systemLog: Array.isArray(p.systemLog) ? p.systemLog : [{ id: generateId(), type: 'system' as const, message: 'System migrated.', timestamp: new Date().toISOString() }],
      };
    }
  } catch (e) { console.error('Failed to load state:', e); }
  return createDefaultState();
}

function saveState(state: GameState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { console.error('Failed to save:', e); }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(loadState);

  useEffect(() => { saveState(state); }, [state]);

  // Check expired quests — auto-fail active quests past their dueDate with XP penalty
  useEffect(() => {
    const check = () => {
      setState(prev => {
        const now = new Date();
        let newUser = { ...prev.user };
        const newSystemLog = [...prev.systemLog];
        let changed = false;

        const newQuests = prev.quests.map(q => {
          if (q.status !== 'active') return q;
          if (now > new Date(q.dueDate)) {
            changed = true;
            if (newUser.punishmentsEnabled) {
              const penalty = q.xpPenalty;
              newUser.totalXP = Math.max(0, newUser.totalXP - penalty);
              const { level, currentXP } = getLevelForXP(newUser.totalXP);
              const oldLevel = newUser.level;
              newUser.level = level;
              newUser.currentXP = currentXP;
              newUser.rankTier = getRankForLevel(level);
              newSystemLog.unshift({ id: generateId(), type: 'questFailed', message: `QUEST EXPIRED: "${q.title}" — ${penalty} XP penalty. The demon escaped.`, xpChange: -penalty, timestamp: now.toISOString() });
              if (level < oldLevel) {
                newSystemLog.unshift({ id: generateId(), type: 'xpLoss', message: `LEVEL DOWN! Dropped to Level ${level} due to quest failure.`, timestamp: now.toISOString() });
              }
            } else {
              newSystemLog.unshift({ id: generateId(), type: 'questFailed', message: `QUEST EXPIRED: "${q.title}" — No penalty (punishments disabled).`, timestamp: now.toISOString() });
            }
            return { ...q, status: 'failed' as QuestStatus };
          }
          return q;
        });

        if (!changed) return prev;
        return { ...prev, user: newUser, quests: newQuests, systemLog: newSystemLog.slice(0, 300) };
      });
    };
    check();
    const interval = setInterval(check, 30000); // check every 30s for smoother expiry
    return () => clearInterval(interval);
  }, []);

  // Daily quest reset — reactivate completed/failed daily quests for a new day
  // Also detects streak breaks
  useEffect(() => {
    setState(prev => {
      const today = new Date().toISOString().split('T')[0];
      if (prev.user.lastActiveDate === today) return prev;

      const newUser = { ...prev.user };
      const newQuests = [...prev.quests];
      const newSystemLog = [...prev.systemLog];

      // Check if streak should break (missed a day)
      const lastDate = new Date(prev.user.lastActiveDate);
      const todayDate = new Date(today);
      const daysDiff = Math.floor((todayDate.getTime() - lastDate.getTime()) / 86400000);
      if (daysDiff > 1 && newUser.currentStreak > 0) {
        newSystemLog.unshift({ id: generateId(), type: 'streak' as const, message: `STREAK BROKEN! ${newUser.currentStreak} day streak lost. You missed ${daysDiff - 1} day${daysDiff > 2 ? 's' : ''}.`, timestamp: new Date().toISOString() });
        newUser.currentStreak = 0;
      }

      // Respawn daily/custom quests
      let resetCount = 0;
      const seen = new Set<string>();
      const templates = prev.quests.filter(q =>
        (q.frequency === 'daily' || (q.frequency === 'custom' && q.selectedDays?.includes(new Date().getDay()))) &&
        (q.status === 'completed' || q.status === 'failed')
      );

      for (const t of templates) {
        if (seen.has(t.title)) continue;
        seen.add(t.title);
        if (newQuests.some(q => q.title === t.title && q.status === 'active')) continue;
        const dueDate = new Date(); dueDate.setHours(23, 59, 59, 999);
        newQuests.unshift({
          id: generateId(), title: t.title, description: t.description, target: t.target, targetType: t.targetType,
          targetValue: t.targetValue, currentProgress: 0, xpReward: t.xpReward, xpPenalty: t.xpPenalty,
          statRewards: t.statRewards, frequency: t.frequency, status: 'active', demonLevel: t.demonLevel,
          dueDate: dueDate.toISOString(), createdAt: new Date().toISOString(), selectedDays: t.selectedDays,
        });
        resetCount++;
      }

      if (resetCount > 0) {
        newSystemLog.unshift({ id: generateId(), type: 'system', message: `DAILY RESET: ${resetCount} quest${resetCount > 1 ? 's' : ''} renewed. The hunt continues.`, timestamp: new Date().toISOString() });
      }

      return { ...prev, user: newUser, quests: newQuests, systemLog: newSystemLog.slice(0, 300) };
    });
  }, []);

  const completeQuest = useCallback((questId: string, notes?: string) => {
    let xpEarned = 0, leveledUp = false, newLevel = 0;
    setState(prev => {
      const quest = prev.quests.find(q => q.id === questId);
      if (!quest || quest.status !== 'active') return prev;

      xpEarned = quest.xpReward;
      const statImpacts = getStatImpactsFromQuest(quest.targetType, quest.demonLevel);
      const u = { ...prev.user };

      u.totalXP += xpEarned;
      u.currentXP += xpEarned;
      u.coins += Math.ceil(quest.demonLevel * 2);

      const newStats = { ...u.stats };
      Object.entries(statImpacts).forEach(([k, v]) => { if (v) newStats[k as keyof UserStats] += v; });
      Object.entries(quest.statRewards).forEach(([k, v]) => { if (v) newStats[k as keyof UserStats] += v; });
      u.stats = newStats;

      while (u.currentXP >= xpToNextLevel(u.level)) {
        u.currentXP -= xpToNextLevel(u.level);
        u.level++; u.statPoints += 3; u.coins += 10; leveledUp = true; newLevel = u.level;
      }

      const newRank = getRankForLevel(u.level);
      const rankChanged = newRank !== u.rankTier;
      u.rankTier = newRank;

      const today = new Date().toISOString().split('T')[0];
      if (u.lastActiveDate !== today) { u.currentStreak++; u.bestStreak = Math.max(u.bestStreak, u.currentStreak); u.lastActiveDate = today; }

      const newTitles = checkTitleUnlocks(u);
      const brandNew = newTitles.filter(t => !u.titles.includes(t));
      u.titles = Array.from(new Set([...u.titles, ...newTitles]));

      const log: ActivityLog = {
        id: generateId(), type: quest.targetType, title: `Quest: ${quest.title}`, notes: notes || '',
        difficulty: quest.demonLevel, xpEarned, statImpacts, questId: quest.id, questTitle: quest.title, createdAt: new Date().toISOString(),
      };

      const sl = [...prev.systemLog];
      sl.unshift({ id: generateId(), type: 'questComplete', message: `QUEST COMPLETE: "${quest.title}" — +${xpEarned} XP. ${DEMON_LEVELS[quest.demonLevel].name} vanquished!`, xpChange: xpEarned, timestamp: new Date().toISOString() });
      if (leveledUp) sl.unshift({ id: generateId(), type: 'levelUp', message: `LEVEL UP! Level ${newLevel}. +3 stat points.`, timestamp: new Date().toISOString() });
      if (rankChanged) sl.unshift({ id: generateId(), type: 'rankUp', message: `RANK UP! ${RANK_NAMES[newRank]} (${newRank}-Rank).`, timestamp: new Date().toISOString() });
      brandNew.forEach(t => sl.unshift({ id: generateId(), type: 'title', message: `NEW TITLE: "${t}"`, timestamp: new Date().toISOString() }));

      return {
        ...prev, user: u, logs: [log, ...prev.logs],
        quests: prev.quests.map(q => q.id === questId ? { ...q, status: 'completed' as QuestStatus, currentProgress: q.targetValue, completedAt: new Date().toISOString() } : q),
        systemLog: sl.slice(0, 300),
      };
    });
    return { xpEarned, leveledUp, newLevel };
  }, []);

  const failQuest = useCallback((questId: string) => {
    setState(prev => {
      const quest = prev.quests.find(q => q.id === questId);
      if (!quest || quest.status !== 'active') return prev;
      const penalty = quest.xpPenalty;
      const u = { ...prev.user };
      if (u.punishmentsEnabled) {
        u.totalXP = Math.max(0, u.totalXP - penalty);
        const { level, currentXP } = getLevelForXP(u.totalXP);
        u.level = level; u.currentXP = currentXP; u.rankTier = getRankForLevel(level);
      }
      const sl = [...prev.systemLog];
      sl.unshift({ id: generateId(), type: 'questFailed', message: `QUEST ABANDONED: "${quest.title}" — ${u.punishmentsEnabled ? penalty + ' XP penalty.' : 'No penalty.'}`, xpChange: u.punishmentsEnabled ? -penalty : undefined, timestamp: new Date().toISOString() });
      return { ...prev, user: u, quests: prev.quests.map(q => q.id === questId ? { ...q, status: 'failed' as QuestStatus } : q), systemLog: sl.slice(0, 300) };
    });
  }, []);

  const addQuest = useCallback((quest: Omit<Quest, 'id' | 'createdAt'>) => {
    const nq = { ...quest, id: generateId(), createdAt: new Date().toISOString() };
    setState(prev => ({
      ...prev, quests: [nq, ...prev.quests],
      systemLog: [{ id: generateId(), type: 'questCreated' as const, message: `NEW QUEST: "${quest.title}" — Demon: ${DEMON_LEVELS[quest.demonLevel].name}. +${quest.xpReward} XP / -${quest.xpPenalty} XP.`, timestamp: new Date().toISOString() }, ...prev.systemLog].slice(0, 300),
    }));
  }, []);

  const editQuest = useCallback((questId: string, updates: Partial<Pick<Quest, 'title' | 'description' | 'targetType' | 'targetValue' | 'demonLevel' | 'xpReward' | 'xpPenalty'>>) => {
    setState(prev => ({
      ...prev,
      quests: prev.quests.map(q => q.id === questId && q.status === 'active' ? { ...q, ...updates } : q),
      systemLog: [{ id: generateId(), type: 'system' as const, message: `Quest "${prev.quests.find(q => q.id === questId)?.title}" modified.`, timestamp: new Date().toISOString() }, ...prev.systemLog].slice(0, 300),
    }));
  }, []);

  const deleteQuest = useCallback((questId: string) => {
    setState(prev => ({ ...prev, quests: prev.quests.filter(q => q.id !== questId) }));
  }, []);

  const allocateStat = useCallback((stat: keyof UserStats) => {
    setState(prev => {
      if (prev.user.statPoints <= 0) return prev;
      return { ...prev, user: { ...prev.user, statPoints: prev.user.statPoints - 1, stats: { ...prev.user.stats, [stat]: prev.user.stats[stat] + 1 } } };
    });
  }, []);

  const updateUserName = useCallback((name: string) => setState(prev => ({ ...prev, user: { ...prev.user, name } })), []);
  const togglePunishments = useCallback(() => setState(prev => ({ ...prev, user: { ...prev.user, punishmentsEnabled: !prev.user.punishmentsEnabled } })), []);
  const setActiveTitle = useCallback((title: string) => setState(prev => ({ ...prev, user: { ...prev.user, activeTitle: title } })), []);
  const clearAllData = useCallback(() => { localStorage.removeItem(STORAGE_KEY); setState(createDefaultState()); }, []);

  return (
    <GameContext.Provider value={{ ...state, completeQuest, failQuest, addQuest, editQuest, deleteQuest, allocateStat, updateUserName, togglePunishments, setActiveTitle, clearAllData }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
