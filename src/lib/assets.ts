// CDN URLs for all generated visual assets
import type { DemonLevel } from './gameEngine';

export const ASSETS = {
  heroBg: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663355234723/efa49xu7T2Q2E7hNdGy9jA/hero-bg_3d923c1b.jpg',
  dashboardBg: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663355234723/efa49xu7T2Q2E7hNdGy9jA/dashboard-bg_581d74db.jpg',
  rankS: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663355234723/efa49xu7T2Q2E7hNdGy9jA/rank-s-badge_81e8eb35.png',
  rankA: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663355234723/efa49xu7T2Q2E7hNdGy9jA/rank-a-badge_a15471ef.png',
  rankB: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663355234723/efa49xu7T2Q2E7hNdGy9jA/rank-b-badge_d9a81570.png',
  rankC: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663355234723/efa49xu7T2Q2E7hNdGy9jA/rank-c-badge_33232dbb.png',
  rankD: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663355234723/efa49xu7T2Q2E7hNdGy9jA/rank-d-badge_cf2c177a.png',
  rankE: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663355234723/efa49xu7T2Q2E7hNdGy9jA/rank-e-badge_f6b76f18.png',
  levelUp: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663355234723/efa49xu7T2Q2E7hNdGy9jA/level-up-effect_11b02def.png',
  questComplete: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663355234723/efa49xu7T2Q2E7hNdGy9jA/quest-complete_45a135f0.png',
  // Demon difficulty images
  demon1: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663355234723/efa49xu7T2Q2E7hNdGy9jA/demon-1-imp-HrTC7jv9Sn5TnqFvNRNmaE.webp',
  demon2: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663355234723/efa49xu7T2Q2E7hNdGy9jA/demon-2-ghoul-TRyxB6tTtUjVdTz8uGsXwq.webp',
  demon3: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663355234723/efa49xu7T2Q2E7hNdGy9jA/demon-3-wraith-dc6p22G4VzkavjW5egAZ9S.webp',
  demon4: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663355234723/efa49xu7T2Q2E7hNdGy9jA/demon-4-berserker-FKZTXrkr6BttNbPv9gmaWe.webp',
  demon5: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663355234723/efa49xu7T2Q2E7hNdGy9jA/demon-5-overlord-Kqobwvr8MD5gMTpqjkVpey.webp',
  demon6: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663355234723/efa49xu7T2Q2E7hNdGy9jA/demon-6-monarch-SGPzXUZ3yi76QkZruAZjW5.webp',
} as const;

export function getRankBadge(rank: string): string {
  const map: Record<string, string> = {
    S: ASSETS.rankS,
    A: ASSETS.rankA,
    B: ASSETS.rankB,
    C: ASSETS.rankC,
    D: ASSETS.rankD,
    E: ASSETS.rankE,
  };
  return map[rank] || ASSETS.rankE;
}

export function getDemonImage(level: DemonLevel): string {
  const map: Record<DemonLevel, string> = {
    1: ASSETS.demon1,
    2: ASSETS.demon2,
    3: ASSETS.demon3,
    4: ASSETS.demon4,
    5: ASSETS.demon5,
    6: ASSETS.demon6,
  };
  return map[level] || ASSETS.demon1;
}
