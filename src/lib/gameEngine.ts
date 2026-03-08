// ============================================
// SOLO LEVELING GAME ENGINE
// XP, leveling, ranks, stats, demons, quests
// ============================================

export type RankTier = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';

export type ActivityType =
  | 'study' | 'gym' | 'reading' | 'coding' | 'meditation'
  | 'running' | 'cooking' | 'cleaning' | 'writing' | 'music'
  | 'art' | 'language' | 'finance' | 'social' | 'work'
  | 'health' | 'sleep' | 'hydration' | 'stretching' | 'custom';

export type QuestFrequency = 'daily' | 'weekly' | 'custom';
export type QuestStatus = 'active' | 'completed' | 'failed';
export type DemonLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface UserStats {
  strength: number;
  endurance: number;
  intelligence: number;
  discipline: number;
  charisma: number;
  luck: number;
}

export interface User {
  id: string;
  name: string;
  level: number;
  totalXP: number;
  currentXP: number;
  rankTier: RankTier;
  currentStreak: number;
  bestStreak: number;
  stats: UserStats;
  statPoints: number;
  coins: number;
  titles: string[];
  activeTitle: string;
  punishmentsEnabled: boolean;
  createdAt: string;
  lastActiveDate: string;
}

export interface ActivityLog {
  id: string;
  type: ActivityType;
  title: string;
  notes: string;
  difficulty: number;
  xpEarned: number;
  statImpacts: Partial<UserStats>;
  questId?: string;
  questTitle?: string;
  createdAt: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  target: string;
  targetType: ActivityType;
  targetValue: number;
  currentProgress: number;
  xpReward: number;
  xpPenalty: number;
  statRewards: Partial<UserStats>;
  frequency: QuestFrequency;
  status: QuestStatus;
  demonLevel: DemonLevel;
  dueDate: string;
  createdAt: string;
  completedAt?: string;
  selectedDays?: number[];
}

export interface SystemLogEntry {
  id: string;
  type: 'levelUp' | 'questComplete' | 'questFailed' | 'rankUp' | 'rankDown' | 'penalty' | 'title' | 'streak' | 'xpGain' | 'xpLoss' | 'questCreated' | 'system';
  message: string;
  xpChange?: number;
  timestamp: string;
}

// ---- DEMON LEVELS ----
export const DEMON_LEVELS: Record<DemonLevel, { name: string; color: string; xpMultiplier: number; penaltyMultiplier: number; description: string }> = {
  1: { name: 'Imp',             color: '#6b7280', xpMultiplier: 1.0, penaltyMultiplier: 0.5, description: 'Easy — A minor nuisance' },
  2: { name: 'Ghoul',           color: '#3b82f6', xpMultiplier: 1.5, penaltyMultiplier: 0.8, description: 'Normal — A worthy foe' },
  3: { name: 'Wraith',          color: '#a855f7', xpMultiplier: 2.0, penaltyMultiplier: 1.0, description: 'Hard — Dangerous spirit' },
  4: { name: 'Berserker',       color: '#ef4444', xpMultiplier: 2.8, penaltyMultiplier: 1.5, description: 'Very Hard — Brutal challenge' },
  5: { name: 'Overlord',        color: '#f59e0b', xpMultiplier: 4.0, penaltyMultiplier: 2.0, description: 'Extreme — Near impossible' },
  6: { name: 'Shadow Monarch',  color: '#8b5cf6', xpMultiplier: 6.0, penaltyMultiplier: 3.0, description: 'Legendary — Only the chosen' },
};

// ---- ACTIVITY TYPES ----
export const ACTIVITY_TYPES: Record<ActivityType, { label: string; icon: string; color: string; statFocus: (keyof UserStats)[] }> = {
  study:      { label: 'Study',       icon: '📚', color: '#3b82f6', statFocus: ['intelligence', 'discipline'] },
  gym:        { label: 'Workout',     icon: '💪', color: '#ef4444', statFocus: ['strength', 'endurance'] },
  reading:    { label: 'Reading',     icon: '📖', color: '#a855f7', statFocus: ['intelligence', 'charisma'] },
  coding:     { label: 'Coding',      icon: '💻', color: '#22c55e', statFocus: ['intelligence', 'discipline'] },
  meditation: { label: 'Meditation',  icon: '🧘', color: '#fbbf24', statFocus: ['discipline', 'luck'] },
  running:    { label: 'Running',     icon: '🏃', color: '#f97316', statFocus: ['endurance', 'strength'] },
  cooking:    { label: 'Cooking',     icon: '🍳', color: '#ec4899', statFocus: ['charisma', 'discipline'] },
  cleaning:   { label: 'Cleaning',    icon: '🧹', color: '#14b8a6', statFocus: ['discipline', 'endurance'] },
  writing:    { label: 'Writing',     icon: '✍️', color: '#8b5cf6', statFocus: ['intelligence', 'charisma'] },
  music:      { label: 'Music',       icon: '🎵', color: '#e879f9', statFocus: ['charisma', 'luck'] },
  art:        { label: 'Art',         icon: '🎨', color: '#f472b6', statFocus: ['charisma', 'intelligence'] },
  language:   { label: 'Language',    icon: '🌍', color: '#06b6d4', statFocus: ['intelligence', 'charisma'] },
  finance:    { label: 'Finance',     icon: '💰', color: '#84cc16', statFocus: ['intelligence', 'discipline'] },
  social:     { label: 'Social',      icon: '🤝', color: '#f43f5e', statFocus: ['charisma', 'luck'] },
  work:       { label: 'Work',        icon: '💼', color: '#64748b', statFocus: ['discipline', 'endurance'] },
  health:     { label: 'Health',      icon: '❤️', color: '#ef4444', statFocus: ['endurance', 'luck'] },
  sleep:      { label: 'Sleep',       icon: '😴', color: '#6366f1', statFocus: ['endurance', 'luck'] },
  hydration:  { label: 'Hydration',   icon: '💧', color: '#0ea5e9', statFocus: ['endurance', 'discipline'] },
  stretching: { label: 'Stretching',  icon: '🤸', color: '#10b981', statFocus: ['endurance', 'strength'] },
  custom:     { label: 'Custom',      icon: '⚡', color: '#00d4ff', statFocus: ['discipline'] },
};

// ---- XP & LEVELING ----
export const calculateQuestXP = (baseXP: number, demonLevel: DemonLevel): number =>
  Math.round(baseXP * DEMON_LEVELS[demonLevel].xpMultiplier);

export const calculateQuestPenalty = (baseXP: number, demonLevel: DemonLevel): number =>
  Math.round(baseXP * DEMON_LEVELS[demonLevel].penaltyMultiplier);

export const xpToNextLevel = (level: number): number => 100 + Math.pow(level, 2) * 20;

export function getRankForLevel(level: number): RankTier {
  if (level >= 50) return 'S';
  if (level >= 35) return 'A';
  if (level >= 22) return 'B';
  if (level >= 12) return 'C';
  if (level >= 5) return 'D';
  return 'E';
}

export function getLevelForXP(totalXP: number): { level: number; currentXP: number } {
  let level = 1;
  let remaining = totalXP;
  while (remaining >= xpToNextLevel(level)) {
    remaining -= xpToNextLevel(level);
    level++;
  }
  return { level, currentXP: remaining };
}

export const RANK_COLORS: Record<RankTier, string> = {
  E: '#9ca3af', D: '#22c55e', C: '#3b82f6', B: '#a855f7', A: '#ef4444', S: '#fbbf24',
};

export const RANK_NAMES: Record<RankTier, string> = {
  E: 'Novice Hunter', D: 'Beginner Hunter', C: 'Intermediate Hunter', B: 'Advanced Hunter', A: 'Elite Hunter', S: 'Shadow Monarch',
};

export function getStatImpactsFromQuest(type: ActivityType, demonLevel: DemonLevel): Partial<UserStats> {
  const config = ACTIVITY_TYPES[type];
  if (!config) return { discipline: 1 };
  const base = Math.ceil(demonLevel * 0.8);
  const impacts: Partial<UserStats> = {};
  config.statFocus.forEach((stat, i) => { impacts[stat] = base + (i === 0 ? 2 : 1); });
  return impacts;
}

export function checkTitleUnlocks(user: User): string[] {
  const titles: string[] = [];
  if (user.currentStreak >= 7)   titles.push('Consistency Demon');
  if (user.currentStreak >= 30)  titles.push('Iron Will');
  if (user.currentStreak >= 100) titles.push('Unbreakable');
  if (user.level >= 10)          titles.push('Rising Hunter');
  if (user.level >= 25)          titles.push('Dungeon Conqueror');
  if (user.level >= 50)          titles.push('Shadow Monarch');
  if (user.stats.strength >= 50) titles.push('Titan');
  if (user.stats.intelligence >= 50) titles.push('Sage');
  if (user.stats.discipline >= 50)   titles.push('Ascetic');
  if (user.totalXP >= 10000)         titles.push('XP Hoarder');
  return titles;
}

export function generateStatSummary(user: User, quests: Quest[], logs: ActivityLog[]): string {
  const completedQuests = quests.filter(q => q.status === 'completed');
  const failedQuests = quests.filter(q => q.status === 'failed');
  const activeQuests = quests.filter(q => q.status === 'active');

  if (logs.length === 0 && quests.length === 0) {
    return 'No data available yet. Start creating quests and completing them to see your analysis here.';
  }

  const statEntries = Object.entries(user.stats) as [keyof UserStats, number][];
  const topStat = [...statEntries].sort((a, b) => b[1] - a[1])[0];
  const weakStat = [...statEntries].sort((a, b) => a[1] - b[1])[0];
  const typeCounts: Record<string, number> = {};
  logs.forEach(l => { const label = ACTIVITY_TYPES[l.type]?.label || 'Other'; typeCounts[label] = (typeCounts[label] || 0) + 1; });
  const topActivity = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
  const completionRate = quests.length > 0 ? Math.round((completedQuests.length / quests.length) * 100) : 0;

  let s = `Hunter ${user.name} — ${RANK_NAMES[user.rankTier]} (Level ${user.level}). `;
  if (completedQuests.length > 0) s += `${completedQuests.length} quest${completedQuests.length > 1 ? 's' : ''} completed (${completionRate}% rate). `;
  if (failedQuests.length > 0) s += `${failedQuests.length} quest${failedQuests.length > 1 ? 's' : ''} failed. `;
  if (activeQuests.length > 0) s += `${activeQuests.length} active. `;
  if (topStat) s += `Strongest: ${topStat[0]} (${topStat[1]}). `;
  if (weakStat && topStat && weakStat[0] !== topStat[0]) s += `Train ${weakStat[0]} (${weakStat[1]}). `;
  if (topActivity) s += `Top activity: ${topActivity[0]} (${topActivity[1]}x). `;
  if (user.currentStreak > 0) s += `Streak: ${user.currentStreak}d. Keep it up!`;
  return s;
}

export const generateId = (): string => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

// ---- ASSETS (CDN) ----
export const ASSETS = {
  dashboardBg: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663355234723/efa49xu7T2Q2E7hNdGy9jA/dashboard-bg_581d74db.jpg',
  rankS: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663355234723/efa49xu7T2Q2E7hNdGy9jA/rank-s-badge_81e8eb35.png',
  rankA: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663355234723/efa49xu7T2Q2E7hNdGy9jA/rank-a-badge_a15471ef.png',
  rankB: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663355234723/efa49xu7T2Q2E7hNdGy9jA/rank-b-badge_d9a81570.png',
  rankC: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663355234723/efa49xu7T2Q2E7hNdGy9jA/rank-c-badge_33232dbb.png',
  rankD: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663355234723/efa49xu7T2Q2E7hNdGy9jA/rank-d-badge_cf2c177a.png',
  rankE: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663355234723/efa49xu7T2Q2E7hNdGy9jA/rank-e-badge_f6b76f18.png',
  levelUp: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663355234723/efa49xu7T2Q2E7hNdGy9jA/level-up-effect_11b02def.png',
  demon1: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663355234723/efa49xu7T2Q2E7hNdGy9jA/demon-1-imp-HrTC7jv9Sn5TnqFvNRNmaE.webp',
  demon2: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663355234723/efa49xu7T2Q2E7hNdGy9jA/demon-2-ghoul-TRyxB6tTtUjVdTz8uGsXwq.webp',
  demon3: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663355234723/efa49xu7T2Q2E7hNdGy9jA/demon-3-wraith-dc6p22G4VzkavjW5egAZ9S.webp',
  demon4: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663355234723/efa49xu7T2Q2E7hNdGy9jA/demon-4-berserker-FKZTXrkr6BttNbPv9gmaWe.webp',
  demon5: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663355234723/efa49xu7T2Q2E7hNdGy9jA/demon-5-overlord-Kqobwvr8MD5gMTpqjkVpey.webp',
  demon6: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663355234723/efa49xu7T2Q2E7hNdGy9jA/demon-6-monarch-SGPzXUZ3yi76QkZruAZjW5.webp',
} as const;

export function getRankBadge(rank: string): string {
  const map: Record<string, string> = { S: ASSETS.rankS, A: ASSETS.rankA, B: ASSETS.rankB, C: ASSETS.rankC, D: ASSETS.rankD, E: ASSETS.rankE };
  return map[rank] || ASSETS.rankE;
}

export function getDemonImage(level: DemonLevel): string {
  const map: Record<DemonLevel, string> = { 1: ASSETS.demon1, 2: ASSETS.demon2, 3: ASSETS.demon3, 4: ASSETS.demon4, 5: ASSETS.demon5, 6: ASSETS.demon6 };
  return map[level] || ASSETS.demon1;
}
