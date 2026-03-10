import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  type User, type ActivityLog, type Quest, type SystemLogEntry,
  type ActivityType, type UserStats, type QuestStatus, type DemonLevel,
  calculateQuestXP, calculateQuestPenalty, xpToNextLevel, getRankForLevel,
  getStatImpactsFromQuest, checkTitleUnlocks, generateId, RANK_NAMES,
  DEMON_LEVELS, getLevelForXP,
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

function createDefaultUser(): User {
  return {
    id: generateId(),
    name: 'Hunter',
    level: 1,
    totalXP: 0,
    currentXP: 0,
    rankTier: 'E',
    currentStreak: 0,
    bestStreak: 0,
    stats: { strength: 0, endurance: 0, intelligence: 0, discipline: 0, charisma: 0, luck: 0 },
    statPoints: 0,
    coins: 0,
    titles: [],
    activeTitle: '',
    punishmentsEnabled: true,
    createdAt: new Date().toISOString(),
    lastActiveDate: new Date().toISOString().split('T')[0],
  };
}

function createDefaultState(): GameState {
  return {
    user: createDefaultUser(),
    logs: [],
    quests: [],
    systemLog: [{
      id: generateId(),
      type: 'system',
      message: 'System initialized. Welcome, Hunter. Your journey begins now.',
      timestamp: new Date().toISOString(),
    }],
  };
}

function migrateUser(user: any): User {
  const defaults = createDefaultUser();
  return {
    ...defaults,
    ...user,
    stats: user.stats ? {
      strength: user.stats.strength || 0,
      endurance: user.stats.endurance || 0,
      intelligence: user.stats.intelligence || 0,
      discipline: user.stats.discipline || 0,
      charisma: user.stats.charisma || 0,
      luck: user.stats.luck || 0,
    } : defaults.stats,
    punishmentsEnabled: user.punishmentsEnabled ?? true,
    titles: Array.isArray(user.titles) ? user.titles : [],
    activeTitle: user.activeTitle || '',
  };
}

function migrateQuest(q: any): Quest {
  return {
    id: q.id || generateId(),
    title: q.title || 'Unknown Quest',
    description: q.description || '',
    target: q.target || '',
    targetType: q.targetType || 'custom',
    targetValue: q.targetValue || 1,
    currentProgress: q.currentProgress || 0,
    xpReward: q.xpReward || 30,
    xpPenalty: q.xpPenalty || 15,
    statRewards: q.statRewards || {},
    frequency: q.frequency || 'daily',
    status: q.status || 'active',
    demonLevel: q.demonLevel || 1,
    dueDate: q.dueDate || new Date().toISOString(),
    createdAt: q.createdAt || new Date().toISOString(),
    completedAt: q.completedAt,
  };
}

function loadState(): GameState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const user = migrateUser(parsed.user || {});
      const quests = Array.isArray(parsed.quests) ? parsed.quests.map(migrateQuest) : [];
      const logs = Array.isArray(parsed.logs) ? parsed.logs.map((l: any) => ({
        ...l,
        difficulty: l.difficulty || 1,
        questId: l.questId || undefined,
        questTitle: l.questTitle || undefined,
      })) : [];
      let systemLog = parsed.systemLog;
      if (!Array.isArray(systemLog)) {
        systemLog = Array.isArray(parsed.notifications) ? parsed.notifications : [{
          id: generateId(),
          type: 'system',
          message: 'System migrated to v2.0.',
          timestamp: new Date().toISOString(),
        }];
      }
      return { user, quests, logs, systemLog };
    }
  } catch (e) {
    console.error('Failed to load state:', e);
  }
  return createDefaultState();
}

function saveState(state: GameState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const addSystemLog = useCallback((type: SystemLogEntry['type'], message: string, xpChange?: number) => {
    const entry: SystemLogEntry = {
      id: generateId(),
      type,
      message,
      xpChange,
      timestamp: new Date().toISOString(),
    };
    setState(prev => ({
      ...prev,
      systemLog: [entry, ...prev.systemLog].slice(0, 200),
    }));
  }, []);

  // Check for expired quests and apply penalties
  const checkExpiredQuests = useCallback(() => {
    setState(prev => {
      const now = new Date();
      let newUser = { ...prev.user };
      const newSystemLog = [...prev.systemLog];
      const newLogs = [...prev.logs];
      let changed = false;

      const newQuests = prev.quests.map(q => {
        if (q.status !== 'active') return q;
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

          newSystemLog.unshift({
            id: generateId(),
            type: 'questFailed',
            message: `QUEST FAILED: "${q.title}" — ${penalty} XP penalty applied.`,
            xpChange: -penalty,
            timestamp: new Date().toISOString(),
          });

          if (level < oldLevel) {
            newSystemLog.unshift({
              id: generateId(),
              type: 'xpLoss',
              message: `LEVEL DOWN! Dropped to Level ${level} due to quest failure.`,
              timestamp: new Date().toISOString(),
            });
          }
          if (rankChanged) {
            newSystemLog.unshift({
              id: generateId(),
              type: 'rankDown',
              message: `RANK DOWN! You are now ${RANK_NAMES[newRank]} (${newRank}-Rank).`,
              timestamp: new Date().toISOString(),
            });
          }

          return { ...q, status: 'failed' as QuestStatus };
        }
        return q;
      });

      if (!changed) return prev;

      const today = new Date().toISOString().split('T')[0];
      if (newUser.lastActiveDate !== today) {
        newUser.lastActiveDate = today;
      }

      return {
        ...prev,
        user: newUser,
        quests: newQuests,
        systemLog: newSystemLog.slice(0, 200),
        logs: newLogs,
      };
    });
  }, []);

  // ✅ UPDATED: Daily quest auto-reset at EXACTLY 00:00 AM every day
  // Resets REGARDLESS of completion status
  const resetDailyQuests = useCallback(() => {
    setState(prev => {
      const now = new Date();
      const newQuests = [...prev.quests];
      const newSystemLog = [...prev.systemLog];
      let resetCount = 0;

      // Find ALL daily quests that are completed OR failed (not active)
      const dailyQuests = prev.quests.filter(q =>
        q.frequency === 'daily' && (q.status === 'completed' || q.status === 'failed')
      );

      // Also handle custom frequency quests that match today's day
      const todayDayIndex = new Date().getDay();
      const customQuests = prev.quests.filter(q =>
        q.frequency === 'custom' && (q.status === 'completed' || q.status === 'failed') &&
        q.selectedDays && q.selectedDays.includes(todayDayIndex)
      );

      const allQuests = [...dailyQuests, ...customQuests];
      const seen = new Set<string>();

      for (const template of allQuests) {
        // Skip if we already processed this quest title
        if (seen.has(template.title)) continue;
        seen.add(template.title);

        // Check if there's already an active quest with the same title
        const alreadyActive = newQuests.some(q =>
          q.title === template.title && q.status === 'active'
        );
        if (alreadyActive) continue;

        // Create new quest for today (due at 23:59:59)
        const dueDate = new Date(now);
        dueDate.setHours(23, 59, 59, 999);

        const newQuest: Quest = {
          id: generateId(),
          title: template.title,
          description: template.description,
          target: template.target,
          targetType: template.targetType,
          targetValue: template.targetValue,
          currentProgress: 0,
          xpReward: template.xpReward,
          xpPenalty: template.xpPenalty,
          statRewards: template.statRewards,
          frequency: template.frequency,
          status: 'active',
          demonLevel: template.demonLevel,
          dueDate: dueDate.toISOString(),
          createdAt: new Date().toISOString(),
          selectedDays: template.selectedDays,
        };
        newQuests.unshift(newQuest);
        resetCount++;
      }

      if (resetCount === 0) return prev;

      newSystemLog.unshift({
        id: generateId(),
        type: 'system',
        message: `⏰ [MIDNIGHT RESET] ${resetCount} daily quest${resetCount > 1 ? 's' : ''} renewed. The hunt continues.`,
        timestamp: new Date().toISOString(),
      });

      return {
        ...prev,
        quests: newQuests,
        systemLog: newSystemLog.slice(0, 200),
      };
    });
  }, []);

  // ✅ NEW: Validate that quests reset even if app wasn't running at midnight
  const validateDailyQuests = useCallback(() => {
    setState(prev => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      // Check if any daily quests have createdAt from before today
      const questsNeedingReset = prev.quests.filter(q => {
        if (q.frequency !== 'daily') return false;
        if (q.status !== 'active') return false;

        const questDate = q.createdAt.split('T')[0];
        return questDate !== today;
      });

      // If we find old quests, trigger reset on next state update
      if (questsNeedingReset.length > 0) {
        console.log('[Game] Found expired daily quests, triggering reset', questsNeedingReset.length);
        // Reset will be called in the effect below
      }

      return prev;
    });
  }, []);

  // ✅ UPDATED: Set up midnight timer and validation
  useEffect(() => {
    // On app load, validate and reset if needed
    validateDailyQuests();
    resetDailyQuests();
    checkExpiredQuests();

    // Calculate time until next midnight (00:00 AM)
    const calculateMsUntilMidnight = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow.getTime() - now.getTime();
    };

    // Set initial timeout to next midnight
    let midnightTimeout: ReturnType<typeof setTimeout>;

    const scheduleMidnightReset = () => {
      const msUntilMidnight = calculateMsUntilMidnight();
      const nextMidnight = new Date();
      nextMidnight.setDate(nextMidnight.getDate() + 1);
      nextMidnight.setHours(0, 0, 0, 0);

      console.log('[Game] Next midnight reset scheduled for:', nextMidnight.toISOString());

      midnightTimeout = setTimeout(() => {
        console.log('[Game] ⏰ Midnight reset triggered!', new Date().toISOString());
        resetDailyQuests();
        checkExpiredQuests();
        // Reschedule for next midnight
        scheduleMidnightReset();
      }, msUntilMidnight);
    };

    scheduleMidnightReset();

    // Also check every 60 seconds for expired quests
    const expireInterval = setInterval(() => {
      checkExpiredQuests();
    }, 60000);

    return () => {
      clearTimeout(midnightTimeout);
      clearInterval(expireInterval);
    };
  }, [checkExpiredQuests, resetDailyQuests, validateDailyQuests]);

  const completeQuest = useCallback((questId: string, notes?: string) => {
    let xpEarned = 0;
    let leveledUp = false;
    let newLevel = 0;

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
      Object.entries(statImpacts).forEach(([key, val]) => {
        if (val) newStats[key as keyof UserStats] += val;
      });
      Object.entries(quest.statRewards).forEach(([key, val]) => {
        if (val) newStats[key as keyof UserStats] += val;
      });
      newUser.stats = newStats;

      while (newUser.currentXP >= xpToNextLevel(newUser.level)) {
        newUser.currentXP -= xpToNextLevel(newUser.level);
        newUser.level += 1;
        newUser.statPoints += 3;
        newUser.coins += 10;
        leveledUp = true;
        newLevel = newUser.level;
      }

      const newRank = getRankForLevel(newUser.level);
      const rankChanged = newRank !== newUser.rankTier;
      newUser.rankTier = newRank;

      const today = new Date().toISOString().split('T')[0];
      if (newUser.lastActiveDate !== today) {
        newUser.currentStreak += 1;
        newUser.bestStreak = Math.max(newUser.bestStreak, newUser.currentStreak);
        newUser.lastActiveDate = today;
      }

      const newTitles = checkTitleUnlocks(newUser);
      const brandNewTitles = newTitles.filter(t => !newUser.titles.includes(t));
      newUser.titles = Array.from(new Set([...newUser.titles, ...newTitles]));

      const log: ActivityLog = {
        id: generateId(),
        type: quest.targetType,
        title: `Quest: ${quest.title}`,
        notes: notes || '',
        durationMinutes: 0,
        quantity: quest.targetValue,
        difficulty: quest.demonLevel,
        xpEarned,
        statImpacts,
        questId: quest.id,
        questTitle: quest.title,
        createdAt: new Date().toISOString(),
      };

      const newSystemLog = [...prev.systemLog];
      newSystemLog.unshift({
        id: generateId(),
        type: 'questComplete',
        message: `QUEST COMPLETE: "${quest.title}" — +${xpEarned} XP earned. Demon ${DEMON_LEVELS[quest.demonLevel].name} vanquished!`,
        xpChange: xpEarned,
        timestamp: new Date().toISOString(),
      });

      if (leveledUp) {
        newSystemLog.unshift({
          id: generateId(),
          type: 'levelUp',
          message: `LEVEL UP! You have reached Level ${newLevel}. +3 stat points awarded.`,
          timestamp: new Date().toISOString(),
        });
      }
      if (rankChanged) {
        newSystemLog.unshift({
          id: generateId(),
          type: 'rankUp',
          message: `RANK UP! You are now ${RANK_NAMES[newRank]} (${newRank}-Rank).`,
          timestamp: new Date().toISOString(),
        });
      }
      brandNewTitles.forEach(t => {
        newSystemLog.unshift({
          id: generateId(),
          type: 'title',
          message: `NEW TITLE UNLOCKED: "${t}"`,
          timestamp: new Date().toISOString(),
        });
      });

      return {
        ...prev,
        user: newUser,
        logs: [log, ...prev.logs],
        quests: prev.quests.map(q =>
          q.id === questId
            ? { ...q, status: 'completed' as QuestStatus, currentProgress: q.targetValue, completedAt: new Date().toISOString() }
            : q
        ),
        systemLog: newSystemLog.slice(0, 200),
      };
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
      newUser.level = level;
      newUser.currentXP = currentXP;
      newUser.rankTier = getRankForLevel(level);

      const newSystemLog = [...prev.systemLog];
      newSystemLog.unshift({
        id: generateId(),
        type: 'questFailed',
        message: `QUEST ABANDONED: "${quest.title}" — ${penalty} XP penalty applied.`,
        xpChange: -penalty,
        timestamp: new Date().toISOString(),
      });

      return {
        ...prev,
        user: newUser,
        quests: prev.quests.map(q => q.id === questId ? { ...q, status: 'failed' as QuestStatus } : q),
        systemLog: newSystemLog.slice(0, 200),
      };
    });
  }, []);

  const addQuest = useCallback((quest: Omit<Quest, 'id' | 'createdAt'>) => {
    const newQuest = { ...quest, id: generateId(), createdAt: new Date().toISOString() };
    setState(prev => ({
      ...prev,
      quests: [newQuest, ...prev.quests],
      systemLog: [{
        id: generateId(),
        type: 'questCreated' as const,
        message: `NEW QUEST: "${quest.title}" — Demon Level: ${DEMON_LEVELS[quest.demonLevel].name}. Reward: +${quest.xpReward} XP. Penalty: -${quest.xpPenalty} XP.`,
        timestamp: new Date().toISOString(),
      }, ...prev.systemLog].slice(0, 200),
    }));
  }, []);

  const deleteQuest = useCallback((questId: string) => {
    setState(prev => ({
      ...prev,
      quests: prev.quests.filter(q => q.id !== questId),
    }));
  }, []);

  const editQuest = useCallback((questId: string, updates: Partial<Omit<Quest, 'id' | 'status' | 'createdAt'>>) => {
    setState(prev => ({
      ...prev,
      quests: prev.quests.map(q =>
        q.id === questId ? { ...q, ...updates } : q
      ),
    }));
  }, []);

  const allocateStat = useCallback((stat: keyof UserStats) => {
    setState(prev => {
      if (prev.user.statPoints <= 0) return prev;
      return {
        ...prev,
        user: {
          ...prev.user,
          statPoints: prev.user.statPoints - 1,
          stats: { ...prev.user.stats, [stat]: prev.user.stats[stat] + 1 },
        },
      };
    });
  }, []);

  const updateUserName = useCallback((name: string) => {
    setState(prev => ({ ...prev, user: { ...prev.user, name } }));
  }, []);

  const togglePunishments = useCallback(() => {
    setState(prev => ({ ...prev, user: { ...prev.user, punishmentsEnabled: !prev.user.punishmentsEnabled } }));
  }, []);

  const setActiveTitle = useCallback((title: string) => {
    setState(prev => ({ ...prev, user: { ...prev.user, activeTitle: title } }));
  }, []);

  const clearAllData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState(createDefaultState());
  }, []);

  return (
    <GameContext.Provider value={{
      ...state,
      completeQuest, failQuest, addQuest, deleteQuest, editQuest,
      allocateStat, updateUserName, togglePunishments,
      setActiveTitle, clearAllData, checkExpiredQuests,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
