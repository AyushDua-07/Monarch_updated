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

/** Check if a custom-day quest is scheduled for today */
function isQuestScheduledForToday(quest: Quest): boolean {
  if (quest.frequency === 'custom' && quest.selectedDays && quest.selectedDays.length > 0) {
    return quest.selectedDays.includes(new Date().getDay());
  }
  return true; // daily and weekly are always "scheduled"
}

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
    selectedDays: q.selectedDays,
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

  // ── CHECK EXPIRED QUESTS ──
  // Auto-fail active quests whose dueDate has passed.
  // SKIP custom-day quests that are not scheduled for today (they sit dormant).
  const checkExpiredQuests = useCallback(() => {
    setState(prev => {
      const now = new Date();
      let newUser = { ...prev.user };
      const newSystemLog = [...prev.systemLog];
      let changed = false;

      const newQuests = prev.quests.map(q => {
        if (q.status !== 'active') return q;

        // Skip custom-day quests that aren't scheduled for today —
        // they shouldn't be penalized on their off-days
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

          // Set lockedUntil so midnight reactivation picks it up
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(0, 0, 0, 0);

          const failedQuest = {
            ...q,
            status: 'failed' as QuestStatus,
          };
          (failedQuest as any).failedAt = new Date().toISOString();
          (failedQuest as any).lockedUntil = tomorrow.toISOString();
          return failedQuest;
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
      };
    });
  }, []);

  // ── REACTIVATE QUESTS AT MIDNIGHT ──
  // Both completed AND failed quests with lockedUntil get reactivated.
  // Custom-day quests ONLY reactivate on their scheduled days.
  const reactivateQuests = useCallback(() => {
    setState(prev => {
      const now = new Date();
      const newQuests = [...prev.quests];
      const newSystemLog = [...prev.systemLog];
      let reactivatedCount = 0;

      for (let i = 0; i < newQuests.length; i++) {
        const q = newQuests[i];
        const lockedUntil = (q as any).lockedUntil;

        // Only process completed or failed quests that have lockedUntil
        if ((q.status !== 'completed' && q.status !== 'failed') || !lockedUntil) continue;

        // Check if lockedUntil has passed (it's past midnight)
        const lockedUntilTime = new Date(lockedUntil);
        if (now < lockedUntilTime) continue;

        // Custom-day quests: only reactivate on their scheduled days
        if (q.frequency === 'custom' && q.selectedDays && q.selectedDays.length > 0) {
          if (!q.selectedDays.includes(now.getDay())) {
            // Not scheduled for today — push lockedUntil to next midnight
            // so it gets checked again tomorrow
            const nextMidnight = new Date(now);
            nextMidnight.setDate(nextMidnight.getDate() + 1);
            nextMidnight.setHours(0, 0, 0, 0);
            const updated = { ...q };
            (updated as any).lockedUntil = nextMidnight.toISOString();
            newQuests[i] = updated;
            continue;
          }
        }

        // Reactivate: set new due date for today end-of-day
        const dueDate = new Date(now);
        dueDate.setHours(23, 59, 59, 999);

        const reactivated = {
          ...q,
          status: 'active' as QuestStatus,
          dueDate: dueDate.toISOString(),
          currentProgress: 0,
          completedAt: undefined,
        };
        // Clear locked metadata
        delete (reactivated as any).lockedUntil;
        delete (reactivated as any).failedAt;

        newQuests[i] = reactivated;
        reactivatedCount++;
      }

      if (reactivatedCount === 0) return prev;

      newSystemLog.unshift({
        id: generateId(),
        type: 'system',
        message: `⏰ [MIDNIGHT] ${reactivatedCount} quest${reactivatedCount > 1 ? 's' : ''} reactivated. The hunt continues.`,
        timestamp: new Date().toISOString(),
      });

      return {
        ...prev,
        quests: newQuests,
        systemLog: newSystemLog.slice(0, 200),
      };
    });
  }, []);

  // ── MIDNIGHT TIMER ──
  useEffect(() => {
    // Run immediately on load to catch any quests that should have reactivated
    reactivateQuests();
    checkExpiredQuests();

    const calculateMsUntilMidnight = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow.getTime() - now.getTime();
    };

    let midnightTimeout: ReturnType<typeof setTimeout>;

    const scheduleMidnightCycle = () => {
      const msUntilMidnight = calculateMsUntilMidnight();

      midnightTimeout = setTimeout(() => {
        console.log('[Game] ⏰ Midnight cycle triggered!', new Date().toISOString());
        reactivateQuests();
        checkExpiredQuests();
        scheduleMidnightCycle(); // schedule next midnight
      }, msUntilMidnight);
    };

    scheduleMidnightCycle();

    // Also check expired quests every minute
    const expireInterval = setInterval(() => {
      checkExpiredQuests();
    }, 60000);

    return () => {
      clearTimeout(midnightTimeout);
      clearInterval(expireInterval);
    };
  }, [checkExpiredQuests, reactivateQuests]);

  // ── COMPLETE QUEST ──
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
        difficulty: quest.demonLevel,
        xpEarned,
        statImpacts,
        questId: quest.id,
        questTitle: quest.title,
        createdAt: new Date().toISOString(),
      } as ActivityLog;

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

      // Set lockedUntil to next midnight
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      return {
        ...prev,
        user: newUser,
        logs: [log, ...prev.logs],
        quests: prev.quests.map(q => {
          if (q.id === questId) {
            const updatedQuest = {
              ...q,
              status: 'completed' as QuestStatus,
              currentProgress: q.targetValue,
              completedAt: new Date().toISOString(),
            };
            (updatedQuest as any).lockedUntil = tomorrow.toISOString();
            return updatedQuest;
          }
          return q;
        }),
        systemLog: newSystemLog.slice(0, 200),
      };
    });

    return { xpEarned, leveledUp, newLevel };
  }, []);

  // ── FAIL (ABANDON) QUEST ──
  // Sets lockedUntil so reactivateQuests picks it up at midnight
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

      // Set lockedUntil to next midnight so it reactivates
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      return {
        ...prev,
        user: newUser,
        quests: prev.quests.map(q => {
          if (q.id === questId) {
            const failedQuest = { ...q, status: 'failed' as QuestStatus };
            (failedQuest as any).failedAt = new Date().toISOString();
            (failedQuest as any).lockedUntil = tomorrow.toISOString();
            return failedQuest;
          }
          return q;
        }),
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
