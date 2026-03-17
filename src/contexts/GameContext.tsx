import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  type User, type ActivityLog, type Quest, type SystemLogEntry,
  type UserStats, type QuestStatus,
  xpToNextLevel, getRankForLevel,
  getStatImpactsFromQuest, checkTitleUnlocks, generateId, RANK_NAMES,
  DEMON_LEVELS, getLevelForXP,
} from '@/lib/gameEngine';

interface GameState {
  user: User;
  logs: ActivityLog[];
  quests: Quest[];
  systemLog: SystemLogEntry[];
  lastResetDate: string;
}

interface GameContextType extends Omit<GameState, 'lastResetDate'> {
  completeQuest: (questId: string, notes?: string) => { xpEarned: number; leveledUp: boolean; newLevel: number };
  failQuest: (questId: string) => void;
  addQuest: (quest: Omit<Quest, 'id' | 'createdAt'>) => void;
  deleteQuest: (questId: string) => void;
  editQuest: (questId: string, updates: Partial<Omit<Quest, 'id' | 'status' | 'createdAt'>>) => void;
  allocateStat: (stat: keyof UserStats) => void;
  updateUserName: (name: string) => void;
  togglePunishments: () => void;
  setActiveTitle: (title: string) => void;
  clearAllData: () => void;
  checkExpiredQuests: () => void;
}

const GameContext = createContext<GameContextType | null>(null);
const STORAGE_KEY = 'leveling_game_state';

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function createDefaultUser(): User {
  return {
    id: generateId(), name: 'Hunter', level: 1, totalXP: 0, currentXP: 0,
    rankTier: 'E', currentStreak: 0, bestStreak: 0,
    stats: { strength: 0, endurance: 0, intelligence: 0, discipline: 0, charisma: 0, luck: 0 },
    statPoints: 0, coins: 0, titles: [], activeTitle: '',
    punishmentsEnabled: true, createdAt: new Date().toISOString(), lastActiveDate: getTodayStr(),
  };
}

function createDefaultState(): GameState {
  return {
    user: createDefaultUser(), logs: [], quests: [],
    systemLog: [{ id: generateId(), type: 'system', message: 'System initialized. Welcome, Hunter.', timestamp: new Date().toISOString() }],
    lastResetDate: getTodayStr(),
  };
}

function migrateUser(user: any): User {
  const d = createDefaultUser();
  return { ...d, ...user,
    stats: user.stats ? { strength: user.stats.strength || 0, endurance: user.stats.endurance || 0, intelligence: user.stats.intelligence || 0, discipline: user.stats.discipline || 0, charisma: user.stats.charisma || 0, luck: user.stats.luck || 0 } : d.stats,
    punishmentsEnabled: user.punishmentsEnabled ?? true,
    titles: Array.isArray(user.titles) ? user.titles : [],
    activeTitle: user.activeTitle || '',
  };
}

function migrateQuest(q: any): Quest {
  return {
    id: q.id || generateId(), title: q.title || 'Unknown Quest', description: q.description || '',
    target: q.target || '', targetType: q.targetType || 'custom', targetValue: q.targetValue || 1,
    currentProgress: q.currentProgress || 0, xpReward: q.xpReward || 30, xpPenalty: q.xpPenalty || 15,
    statRewards: q.statRewards || {}, frequency: q.frequency || 'daily', status: q.status || 'active',
    demonLevel: q.demonLevel || 1, dueDate: q.dueDate || new Date().toISOString(),
    createdAt: q.createdAt || new Date().toISOString(), completedAt: q.completedAt, selectedDays: q.selectedDays,
  };
}

function loadState(): GameState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const p = JSON.parse(saved);
      const user = migrateUser(p.user || {});
      const quests = Array.isArray(p.quests) ? p.quests.map(migrateQuest) : [];
      const logs = Array.isArray(p.logs) ? p.logs.map((l: any) => ({ ...l, difficulty: l.difficulty || 1, questId: l.questId || undefined, questTitle: l.questTitle || undefined })) : [];
      let systemLog = Array.isArray(p.systemLog) ? p.systemLog : [{ id: generateId(), type: 'system', message: 'System migrated.', timestamp: new Date().toISOString() }];
      return { user, quests, logs, systemLog, lastResetDate: p.lastResetDate || '' };
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

  const runDailyReset = useCallback(() => {
    setState(prev => {
      const today = getTodayStr();
      if (prev.lastResetDate === today) return prev;

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const newDueDate = endOfDay.toISOString();
      const newSystemLog = [...prev.systemLog];
      let count = 0;

      const newQuests = prev.quests.map(q => {
        if (q.status !== 'completed' && q.status !== 'failed') return q;
        if (q.frequency !== 'daily' && q.frequency !== 'custom') return q;
        count++;
        const reset: any = { ...q, status: 'active' as QuestStatus, currentProgress: 0, dueDate: newDueDate, completedAt: undefined };
        delete reset.lockedUntil;
        delete reset.failedAt;
        return reset as Quest;
      });

      if (count > 0) {
        newSystemLog.unshift({ id: generateId(), type: 'system', message: '[DAILY RESET] ' + count + ' quest' + (count > 1 ? 's' : '') + ' reactivated.', timestamp: new Date().toISOString() });
      }
      return { ...prev, quests: newQuests, lastResetDate: today, systemLog: newSystemLog.slice(0, 200) };
    });
  }, []);

  const checkExpiredQuests = useCallback(() => {
    setState(prev => {
      const now = new Date();
      let newUser = { ...prev.user };
      const newSystemLog = [...prev.systemLog];
      let changed = false;

      const newQuests = prev.quests.map(q => {
        if (q.status !== 'active') return q;
        if (q.frequency === 'custom' && q.selectedDays && q.selectedDays.length > 0) {
          if (!q.selectedDays.includes(now.getDay())) return q;
        }
        const due = new Date(q.dueDate);
        if (now > due) {
          changed = true;
          const penalty = q.xpPenalty;
          newUser.totalXP = Math.max(0, newUser.totalXP - penalty);
          const { level, currentXP } = getLevelForXP(newUser.totalXP);
          const oldLevel = newUser.level;
          newUser.level = level;
          newUser.currentXP = currentXP;
          const newRank = getRankForLevel(level);
          const rankChanged = newRank !== newUser.rankTier;
          newUser.rankTier = newRank;

          newSystemLog.unshift({ id: generateId(), type: 'questFailed', message: 'QUEST FAILED: "' + q.title + '" - ' + penalty + ' XP penalty.', xpChange: -penalty, timestamp: new Date().toISOString() });
          if (level < oldLevel) {
            newSystemLog.unshift({ id: generateId(), type: 'xpLoss', message: 'LEVEL DOWN! Dropped to Level ' + level + '.', timestamp: new Date().toISOString() });
          }
          if (rankChanged) {
            newSystemLog.unshift({ id: generateId(), type: 'rankDown', message: 'RANK DOWN! Now ' + RANK_NAMES[newRank] + ' (' + newRank + '-Rank).', timestamp: new Date().toISOString() });
          }
          const failed: any = { ...q, status: 'failed' as QuestStatus };
          failed.failedAt = new Date().toISOString();
          return failed as Quest;
        }
        return q;
      });

      if (!changed) return prev;
      const today = getTodayStr();
      if (newUser.lastActiveDate !== today) newUser.lastActiveDate = today;
      return { ...prev, user: newUser, quests: newQuests, systemLog: newSystemLog.slice(0, 200) };
    });
  }, []);

  useEffect(() => {
    runDailyReset();
    const t1 = setTimeout(() => checkExpiredQuests(), 200);

    const scheduleMidnight = (): ReturnType<typeof setTimeout> => {
      const now = new Date();
      const tmrw = new Date(now);
      tmrw.setDate(tmrw.getDate() + 1);
      tmrw.setHours(0, 0, 0, 0);
      return setTimeout(() => {
        runDailyReset();
        setTimeout(() => checkExpiredQuests(), 200);
        midnightT = scheduleMidnight();
      }, tmrw.getTime() - now.getTime());
    };
    let midnightT = scheduleMidnight();
    const expireI = setInterval(() => checkExpiredQuests(), 60000);
    return () => { clearTimeout(t1); clearTimeout(midnightT); clearInterval(expireI); };
  }, [runDailyReset, checkExpiredQuests]);

  const completeQuest = useCallback((questId: string, notes?: string) => {
    let xpEarned = 0; let leveledUp = false; let newLevel = 0;
    setState(prev => {
      const quest = prev.quests.find(q => q.id === questId);
      if (!quest || quest.status !== 'active') return prev;
      xpEarned = quest.xpReward;
      const statImpacts = getStatImpactsFromQuest(quest.targetType, quest.demonLevel);
      const newUser = { ...prev.user };
      newUser.totalXP += xpEarned;
      newUser.currentXP += xpEarned;
      newUser.coins += Math.ceil(quest.demonLevel * 2);
      const newStats = { ...newUser.stats };
      Object.entries(statImpacts).forEach(([k, v]) => { if (v) newStats[k as keyof UserStats] += v; });
      Object.entries(quest.statRewards).forEach(([k, v]) => { if (v) newStats[k as keyof UserStats] += v; });
      newUser.stats = newStats;
      while (newUser.currentXP >= xpToNextLevel(newUser.level)) {
        newUser.currentXP -= xpToNextLevel(newUser.level);
        newUser.level += 1; newUser.statPoints += 3; newUser.coins += 10;
        leveledUp = true; newLevel = newUser.level;
      }
      const newRank = getRankForLevel(newUser.level);
      const rankChanged = newRank !== newUser.rankTier;
      newUser.rankTier = newRank;
      const today = getTodayStr();
      if (newUser.lastActiveDate !== today) {
        newUser.currentStreak += 1;
        newUser.bestStreak = Math.max(newUser.bestStreak, newUser.currentStreak);
        newUser.lastActiveDate = today;
      }
      const newTitles = checkTitleUnlocks(newUser);
      const brandNew = newTitles.filter(t => !newUser.titles.includes(t));
      newUser.titles = Array.from(new Set([...newUser.titles, ...newTitles]));

      const log = { id: generateId(), type: quest.targetType, title: 'Quest: ' + quest.title, notes: notes || '', difficulty: quest.demonLevel, xpEarned, statImpacts, questId: quest.id, questTitle: quest.title, createdAt: new Date().toISOString() } as ActivityLog;
      const newSystemLog = [...prev.systemLog];
      newSystemLog.unshift({ id: generateId(), type: 'questComplete', message: 'QUEST COMPLETE: "' + quest.title + '" +' + xpEarned + ' XP. Demon ' + DEMON_LEVELS[quest.demonLevel].name + ' vanquished!', xpChange: xpEarned, timestamp: new Date().toISOString() });
      if (leveledUp) newSystemLog.unshift({ id: generateId(), type: 'levelUp', message: 'LEVEL UP! Level ' + newLevel + '. +3 stat points.', timestamp: new Date().toISOString() });
      if (rankChanged) newSystemLog.unshift({ id: generateId(), type: 'rankUp', message: 'RANK UP! Now ' + RANK_NAMES[newRank] + ' (' + newRank + '-Rank).', timestamp: new Date().toISOString() });
      brandNew.forEach(t => newSystemLog.unshift({ id: generateId(), type: 'title', message: 'NEW TITLE: "' + t + '"', timestamp: new Date().toISOString() }));

      return { ...prev, user: newUser, logs: [log, ...prev.logs],
        quests: prev.quests.map(q => q.id === questId ? { ...q, status: 'completed' as QuestStatus, currentProgress: q.targetValue, completedAt: new Date().toISOString() } : q),
        systemLog: newSystemLog.slice(0, 200) };
    });
    return { xpEarned, leveledUp, newLevel };
  }, []);

  const failQuest = useCallback((questId: string) => {
    setState(prev => {
      const quest = prev.quests.find(q => q.id === questId);
      if (!quest || quest.status !== 'active') return prev;
      const penalty = quest.xpPenalty;
      const newUser = { ...prev.user };
      newUser.totalXP = Math.max(0, newUser.totalXP - penalty);
      const { level, currentXP } = getLevelForXP(newUser.totalXP);
      newUser.level = level; newUser.currentXP = currentXP; newUser.rankTier = getRankForLevel(level);
      const newSystemLog = [...prev.systemLog];
      newSystemLog.unshift({ id: generateId(), type: 'questFailed', message: 'QUEST ABANDONED: "' + quest.title + '" - ' + penalty + ' XP penalty.', xpChange: -penalty, timestamp: new Date().toISOString() });
      return { ...prev, user: newUser,
        quests: prev.quests.map(q => { if (q.id === questId) { const f: any = { ...q, status: 'failed' as QuestStatus }; f.failedAt = new Date().toISOString(); return f as Quest; } return q; }),
        systemLog: newSystemLog.slice(0, 200) };
    });
  }, []);

  const addQuest = useCallback((quest: Omit<Quest, 'id' | 'createdAt'>) => {
    const nq = { ...quest, id: generateId(), createdAt: new Date().toISOString() };
    setState(prev => ({ ...prev, quests: [nq, ...prev.quests],
      systemLog: [{ id: generateId(), type: 'questCreated' as const, message: 'NEW QUEST: "' + quest.title + '" Demon: ' + DEMON_LEVELS[quest.demonLevel].name + '. +' + quest.xpReward + ' XP / -' + quest.xpPenalty + ' XP.', timestamp: new Date().toISOString() }, ...prev.systemLog].slice(0, 200) }));
  }, []);

  const deleteQuest = useCallback((questId: string) => {
    setState(prev => ({ ...prev, quests: prev.quests.filter(q => q.id !== questId) }));
  }, []);

  const editQuest = useCallback((questId: string, updates: Partial<Omit<Quest, 'id' | 'status' | 'createdAt'>>) => {
    setState(prev => ({ ...prev, quests: prev.quests.map(q => q.id === questId ? { ...q, ...updates } : q) }));
  }, []);

  const allocateStat = useCallback((stat: keyof UserStats) => {
    setState(prev => {
      if (prev.user.statPoints <= 0) return prev;
      return { ...prev, user: { ...prev.user, statPoints: prev.user.statPoints - 1, stats: { ...prev.user.stats, [stat]: prev.user.stats[stat] + 1 } } };
    });
  }, []);

  const updateUserName = useCallback((name: string) => { setState(prev => ({ ...prev, user: { ...prev.user, name } })); }, []);
  const togglePunishments = useCallback(() => { setState(prev => ({ ...prev, user: { ...prev.user, punishmentsEnabled: !prev.user.punishmentsEnabled } })); }, []);
  const setActiveTitle = useCallback((title: string) => { setState(prev => ({ ...prev, user: { ...prev.user, activeTitle: title } })); }, []);
  const clearAllData = useCallback(() => { localStorage.removeItem(STORAGE_KEY); setState(createDefaultState()); }, []);

  return (
    <GameContext.Provider value={{ user: state.user, logs: state.logs, quests: state.quests, systemLog: state.systemLog, completeQuest, failQuest, addQuest, deleteQuest, editQuest, allocateStat, updateUserName, togglePunishments, setActiveTitle, clearAllData, checkExpiredQuests }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
