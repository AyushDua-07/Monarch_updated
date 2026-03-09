import { useMemo } from 'react';
import { useGame } from '@/contexts/GameContext';

const WEEKS = 18; // ~4.5 months visible
const DAYS_OF_WEEK = ['', 'M', '', 'W', '', 'F', ''];

function getIntensity(count: number): string {
  if (count === 0) return 'bg-white/[0.04]';
  if (count === 1) return 'bg-cyan-900/60';
  if (count === 2) return 'bg-cyan-700/70';
  if (count <= 4) return 'bg-cyan-500/80';
  return 'bg-cyan-400';
}

function getGlow(count: number): string {
  if (count >= 4) return '0 0 6px rgba(0,212,255,0.5)';
  if (count >= 2) return '0 0 3px rgba(0,212,255,0.3)';
  return 'none';
}

export default function HuntMap() {
  const { logs } = useGame();

  // Build a map of date -> completion count from logs
  const dateMap = useMemo(() => {
    const m: Record<string, number> = {};
    logs.forEach(l => {
      const d = l.createdAt.split('T')[0];
      m[d] = (m[d] || 0) + 1;
    });
    return m;
  }, [logs]);

  // Generate grid: WEEKS columns × 7 rows, ending today
  const grid = useMemo(() => {
    const today = new Date();
    const todayDay = today.getDay(); // 0=Sun
    const totalDays = WEEKS * 7;
    // Start from (totalDays - 1) days ago, aligned to start of week
    const startOffset = totalDays - 1 - (6 - todayDay); // align so last column ends on Sat of this week
    const cells: { date: string; count: number; isToday: boolean; isFuture: boolean }[][] = [];

    for (let w = 0; w < WEEKS; w++) {
      const week: typeof cells[0] = [];
      for (let d = 0; d < 7; d++) {
        const dayOffset = startOffset - (WEEKS - 1 - w) * 7 - (6 - d);
        const cellDate = new Date(today);
        cellDate.setDate(today.getDate() - dayOffset);
        const ds = cellDate.toISOString().split('T')[0];
        const todayStr = today.toISOString().split('T')[0];
        week.push({
          date: ds,
          count: dateMap[ds] || 0,
          isToday: ds === todayStr,
          isFuture: cellDate > today,
        });
      }
      cells.push(week);
    }
    return cells;
  }, [dateMap]);

  // Month labels
  const monthLabels = useMemo(() => {
    const labels: { label: string; col: number }[] = [];
    let lastMonth = -1;
    grid.forEach((week, wi) => {
      const firstDay = new Date(week[0].date);
      const m = firstDay.getMonth();
      if (m !== lastMonth) {
        labels.push({ label: firstDay.toLocaleString('default', { month: 'short' }), col: wi });
        lastMonth = m;
      }
    });
    return labels;
  }, [grid]);

  const totalThisWeek = useMemo(() => {
    const lastWeek = grid[grid.length - 1];
    return lastWeek ? lastWeek.reduce((s, c) => s + c.count, 0) : 0;
  }, [grid]);

  return (
    <div>
      {/* Month labels */}
      <div className="flex mb-1 ml-6">
        {monthLabels.map((m, i) => (
          <span
            key={i}
            className="text-[9px] text-gray-500 font-mono"
            style={{ position: 'relative', left: `${m.col * 13}px`, marginRight: i < monthLabels.length - 1 ? '0px' : '0' }}
          >
            {m.label}
          </span>
        ))}
      </div>

      <div className="flex gap-[1px]">
        {/* Day labels */}
        <div className="flex flex-col gap-[1px] mr-1 justify-start">
          {DAYS_OF_WEEK.map((d, i) => (
            <div key={i} className="w-4 h-[11px] flex items-center justify-center">
              <span className="text-[8px] text-gray-600 font-mono">{d}</span>
            </div>
          ))}
        </div>

        {/* Grid */}
        {grid.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[1px]">
            {week.map((cell, di) => (
              <div
                key={di}
                className={`w-[11px] h-[11px] rounded-[2px] transition-colors ${
                  cell.isFuture ? 'bg-transparent' : getIntensity(cell.count)
                } ${cell.isToday ? 'ring-1 ring-cyan-400/60' : ''}`}
                style={{ boxShadow: cell.isFuture ? 'none' : getGlow(cell.count) }}
                title={`${cell.date}: ${cell.count} ${cell.count === 1 ? 'quest' : 'quests'}`}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-[9px] text-gray-600 font-mono">{totalThisWeek} quests this week</span>
        <div className="flex items-center gap-1">
          <span className="text-[8px] text-gray-600 font-mono">Less</span>
          <div className="w-[9px] h-[9px] rounded-[2px] bg-white/[0.04]" />
          <div className="w-[9px] h-[9px] rounded-[2px] bg-cyan-900/60" />
          <div className="w-[9px] h-[9px] rounded-[2px] bg-cyan-700/70" />
          <div className="w-[9px] h-[9px] rounded-[2px] bg-cyan-500/80" />
          <div className="w-[9px] h-[9px] rounded-[2px] bg-cyan-400" />
          <span className="text-[8px] text-gray-600 font-mono">More</span>
        </div>
      </div>
    </div>
  );
}
