import { useMemo, useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Flame, Zap, Target, Trophy, TrendingUp, TrendingDown, CheckCircle2, XCircle } from 'lucide-react';
import type { Quest } from '@/lib/gameEngine';

const WEEKS = 20;
const CELL = 11;
const GAP = 3;

function isQuestForToday(quest: Quest): boolean {
  if (quest.frequency === 'custom' && quest.selectedDays && quest.selectedDays.length > 0) {
    return quest.selectedDays.includes(new Date().getDay());
  }
  return true;
}

function getCellColor(quests: number): string {
  if (quests === 0) return '#161b22';
  if (quests === 1) return '#0e4429';
  if (quests === 2) return '#006d32';
  if (quests <= 4) return '#26a641';
  return '#39d353';
}

function getCellGlow(quests: number): string {
  if (quests >= 4) return '0 0 6px rgba(57,211,83,0.5)';
  if (quests >= 2) return '0 0 4px rgba(38,166,65,0.3)';
  return 'none';
}

interface DayData {
  date: string;
  xp: number;
  completed: number;
  failed: number;
  total: number;
  isToday: boolean;
  isFuture: boolean;
}

export default function HuntMap() {
  const { logs, user, quests } = useGame();
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

  // Build per-day data from logs AND quests
  const dailyData = useMemo(() => {
    const m: Record<string, { xp: number; logCount: number }> = {};
    logs.forEach(l => {
      const d = l.createdAt.split('T')[0];
      if (!m[d]) m[d] = { xp: 0, logCount: 0 };
      m[d].xp += l.xpEarned;
      m[d].logCount += 1;
    });
    return m;
  }, [logs]);

  // Quest completions/failures by day
  const questsByDay = useMemo(() => {
    const m: Record<string, { completed: number; failed: number; total: number }> = {};
    quests.forEach(q => {
      if (q.completedAt) {
        const d = q.completedAt.split('T')[0];
        if (!m[d]) m[d] = { completed: 0, failed: 0, total: 0 };
        m[d].completed += 1;
        m[d].total += 1;
      }
      if ((q as any).failedAt) {
        const d = ((q as any).failedAt as string).split('T')[0];
        if (!m[d]) m[d] = { completed: 0, failed: 0, total: 0 };
        m[d].failed += 1;
        m[d].total += 1;
      }
    });
    // Also count active quests for today
    const todayStr = new Date().toISOString().split('T')[0];
    if (!m[todayStr]) m[todayStr] = { completed: 0, failed: 0, total: 0 };
    const activeToday = quests.filter(q => q.status === 'active' && isQuestForToday(q)).length;
    m[todayStr].total = m[todayStr].completed + m[todayStr].failed + activeToday;
    return m;
  }, [quests]);

  // Build the grid
  const grid = useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    const dow = today.getDay();
    // End on Saturday of current week
    const endSat = new Date(today);
    endSat.setDate(today.getDate() + (6 - dow));

    const weeks: DayData[][] = [];
    for (let w = WEEKS - 1; w >= 0; w--) {
      const week: DayData[] = [];
      for (let d = 0; d < 7; d++) {
        const dt = new Date(endSat);
        dt.setDate(endSat.getDate() - w * 7 - (6 - d));
        const ds = dt.toISOString().split('T')[0];
        const logData = dailyData[ds];
        const questData = questsByDay[ds];
        const dtNorm = new Date(dt);
        dtNorm.setHours(12, 0, 0, 0);
        week.push({
          date: ds,
          xp: logData?.xp || 0,
          completed: questData?.completed || 0,
          failed: questData?.failed || 0,
          total: questData?.total || 0,
          isToday: ds === todayStr,
          isFuture: dtNorm > today,
        });
      }
      weeks.push(week);
    }
    return weeks;
  }, [dailyData, questsByDay]);

  // Month labels positioned at the correct week
  const monthLabels = useMemo(() => {
    const out: { label: string; weekIdx: number }[] = [];
    let lastMonth = -1;
    grid.forEach((wk, i) => {
      // Use the first day of the week for month detection
      const d = new Date(wk[0].date);
      const m = d.getMonth();
      if (m !== lastMonth) {
        out.push({ label: d.toLocaleString('default', { month: 'short' }), weekIdx: i });
        lastMonth = m;
      }
    });
    return out;
  }, [grid]);

  // Last 7 days bar data
  const last7 = useMemo(() => {
    const days: { label: string; xp: number; completed: number; date: string }[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const logData = dailyData[ds];
      const questData = questsByDay[ds];
      days.push({
        label: d.toLocaleString('default', { weekday: 'narrow' }),
        xp: logData?.xp || 0,
        completed: questData?.completed || 0,
        date: ds,
      });
    }
    return days;
  }, [dailyData, questsByDay]);

  const maxBarXP = useMemo(() => Math.max(1, ...last7.map(d => d.xp)), [last7]);

  // Summary stats
  const stats = useMemo(() => {
    const entries = Object.entries(dailyData);
    const todayStr = new Date().toISOString().split('T')[0];
    const todayD = dailyData[todayStr];
    const now = new Date();

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    let weekQ = 0, weekXP = 0;
    entries.forEach(([d, v]) => { if (new Date(d) >= weekStart) { weekQ += v.logCount; weekXP += v.xp; } });

    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    let lastWeekXP = 0;
    entries.forEach(([d, v]) => { const dt = new Date(d); if (dt >= lastWeekStart && dt < weekStart) lastWeekXP += v.xp; });
    const weekTrend = lastWeekXP > 0 ? Math.round(((weekXP - lastWeekXP) / lastWeekXP) * 100) : weekXP > 0 ? 100 : 0;

    const activeDays = entries.filter(([, v]) => v.logCount > 0).length;
    const best = entries.length > 0 ? entries.reduce((b, c) => c[1].xp > b[1].xp ? c : b) : null;
    const totalQ = entries.reduce((s, [, v]) => s + v.logCount, 0);
    const totalXP = entries.reduce((s, [, v]) => s + v.xp, 0);
    const avgDaily = activeDays > 0 ? Math.round(totalXP / activeDays) : 0;

    const todayCompleted = quests.filter(q => q.status === 'completed' && q.completedAt?.startsWith(todayStr) && isQuestForToday(q)).length;
    const todayActive = quests.filter(q => q.status === 'active' && isQuestForToday(q)).length;

    return {
      todayXP: todayD?.xp || 0, todayCompleted, todayActive,
      weekQ, weekXP, weekTrend,
      activeDays, avgDaily,
      bestXP: best ? best[1].xp : 0, bestDate: best ? best[0] : '',
      totalQ, totalXP,
      streak: user.currentStreak,
    };
  }, [dailyData, quests, user]);

  const hasAnyData = logs.length > 0;
  const gridWidth = WEEKS * (CELL + GAP) - GAP;

  return (
    <div className="space-y-4">

      {/* Top Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-3 p-2.5 bg-white/[0.02] rounded-sm">
          <div className="w-8 h-8 rounded-sm bg-cyan-500/10 flex items-center justify-center shrink-0"><Zap size={14} className="text-cyan-400" /></div>
          <div><p className="font-mono text-base font-bold text-white leading-none">{stats.todayXP}</p><p className="text-[8px] text-gray-500 uppercase font-mono mt-0.5">XP Today</p></div>
        </div>
        <div className="flex items-center gap-3 p-2.5 bg-white/[0.02] rounded-sm">
          <div className="w-8 h-8 rounded-sm bg-emerald-500/10 flex items-center justify-center shrink-0"><Target size={14} className="text-emerald-400" /></div>
          <div><p className="font-mono text-base font-bold text-white leading-none">{stats.todayCompleted}<span className="text-gray-500 font-normal text-xs">/{stats.todayCompleted + stats.todayActive}</span></p><p className="text-[8px] text-gray-500 uppercase font-mono mt-0.5">Quests Today</p></div>
        </div>
        <div className="flex items-center gap-3 p-2.5 bg-white/[0.02] rounded-sm">
          <div className="w-8 h-8 rounded-sm bg-amber-500/10 flex items-center justify-center shrink-0"><Flame size={14} className="text-amber-400" /></div>
          <div><p className="font-mono text-base font-bold text-white leading-none">{stats.streak}<span className="text-[9px] text-gray-500 font-normal ml-0.5">d</span></p><p className="text-[8px] text-gray-500 uppercase font-mono mt-0.5">Streak</p></div>
        </div>
        <div className="flex items-center gap-3 p-2.5 bg-white/[0.02] rounded-sm">
          <div className="w-8 h-8 rounded-sm bg-purple-500/10 flex items-center justify-center shrink-0"><Trophy size={14} className="text-purple-400" /></div>
          <div><p className="font-mono text-base font-bold text-white leading-none">{stats.avgDaily}</p><p className="text-[8px] text-gray-500 uppercase font-mono mt-0.5">Avg XP/Day</p></div>
        </div>
      </div>

      {/* Last 7 Days */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] text-gray-500 font-mono uppercase tracking-wider">Last 7 Days</span>
          <div className="flex items-center gap-1">
            {stats.weekTrend !== 0 && (<>{stats.weekTrend > 0 ? <TrendingUp size={10} className="text-emerald-400" /> : <TrendingDown size={10} className="text-red-400" />}<span className={'text-[9px] font-mono ' + (stats.weekTrend > 0 ? 'text-emerald-400' : 'text-red-400')}>{stats.weekTrend > 0 ? '+' : ''}{stats.weekTrend}%</span></>)}
          </div>
        </div>
        <div className="flex items-end gap-[6px] h-16">
          {last7.map((day, i) => {
            const pct = maxBarXP > 0 ? (day.xp / maxBarXP) * 100 : 0;
            const isToday = i === 6;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                {day.xp > 0 && <span className="text-[7px] font-mono text-gray-500 leading-none">{day.xp}</span>}
                <div className="w-full flex-1 flex items-end">
                  <div className={'w-full rounded-t-sm transition-all duration-500 ' + (day.xp === 0 ? 'bg-white/[0.04]' : isToday ? 'bg-cyan-400' : 'bg-cyan-600/70')}
                    style={{ height: day.xp === 0 ? '2px' : Math.max(8, pct) + '%', boxShadow: isToday && day.xp > 0 ? '0 0 8px rgba(0,212,255,0.4)' : 'none' }} />
                </div>
                <span className={'text-[8px] font-mono leading-none ' + (isToday ? 'text-cyan-400' : 'text-gray-600')}>{day.label}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[8px] text-gray-600 font-mono">{stats.weekQ} quests this week</span>
          <span className="text-[8px] text-cyan-400/60 font-mono">{stats.weekXP} XP</span>
        </div>
      </div>

      {/* Activity History - GitHub style grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[9px] text-gray-500 font-mono uppercase tracking-wider">Activity History</span>
          <span className="text-[8px] text-gray-600 font-mono">{stats.activeDays} active days</span>
        </div>

        <div className="overflow-x-auto pb-2 -mx-1 px-1">
          <div style={{ minWidth: gridWidth + 30 + 'px' }}>
            {/* Month labels */}
            <div className="flex mb-1" style={{ paddingLeft: '30px' }}>
              {monthLabels.map((m, i) => (
                <span key={i} className="text-[10px] text-gray-400 font-mono absolute" style={{ position: 'relative', left: m.weekIdx * (CELL + GAP) + 'px', width: '40px' }}>{m.label}</span>
              ))}
            </div>

            {/* Grid with day labels */}
            <div className="flex gap-0">
              {/* Day labels */}
              <div className="flex flex-col shrink-0" style={{ width: '28px', gap: GAP + 'px' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                  <div key={i} className="flex items-center" style={{ height: CELL + 'px' }}>
                    {(i === 1 || i === 3 || i === 5) && (
                      <span className="text-[9px] text-gray-500 font-mono leading-none">{d}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Cells */}
              <div className="flex" style={{ gap: GAP + 'px' }}>
                {grid.map((week, wi) => (
                  <div key={wi} className="flex flex-col" style={{ gap: GAP + 'px' }}>
                    {week.map((cell, di) => (
                      <div
                        key={di}
                        onClick={() => {
                          if (cell.isFuture) return;
                          setSelectedDay(selectedDay?.date === cell.date ? null : cell);
                        }}
                        style={{
                          width: CELL + 'px',
                          height: CELL + 'px',
                          backgroundColor: cell.isFuture ? 'transparent' : getCellColor(cell.completed),
                          borderRadius: '2px',
                          boxShadow: cell.isFuture ? 'none' : cell.isToday ? '0 0 0 1.5px rgba(0,212,255,0.7)' : getCellGlow(cell.completed),
                          cursor: cell.isFuture ? 'default' : 'pointer',
                          transition: 'transform 0.1s',
                        }}
                        className={!cell.isFuture ? 'hover:scale-125 active:scale-90' : ''}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between mt-2">
          <span className="text-[8px] text-gray-600 font-mono">{stats.totalQ} quests completed all time</span>
          <div className="flex items-center gap-1">
            <span className="text-[8px] text-gray-500 font-mono">Less</span>
            {[0, 1, 2, 3, 5].map((v, i) => (
              <div key={i} style={{ width: '10px', height: '10px', backgroundColor: getCellColor(v), borderRadius: '2px' }} />
            ))}
            <span className="text-[8px] text-gray-500 font-mono">More</span>
          </div>
        </div>

        {/* Selected day detail panel */}
        {selectedDay && (
          <div className="mt-3 p-3 bg-[#0d1117] border border-white/[0.08] rounded-md">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-white font-mono font-medium">
                {new Date(selectedDay.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              <button onClick={() => setSelectedDay(null)} className="text-gray-600 hover:text-gray-400 text-xs">&#10005;</button>
            </div>

            {(selectedDay.completed > 0 || selectedDay.failed > 0 || selectedDay.xp > 0) ? (
              <div className="space-y-2">
                {/* Overall summary */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-emerald-400" />
                    <span className="text-[11px] text-emerald-400 font-mono font-bold">{selectedDay.completed}</span>
                    <span className="text-[10px] text-gray-500 font-mono">completed</span>
                  </div>
                  {selectedDay.failed > 0 && (
                    <div className="flex items-center gap-1.5">
                      <XCircle size={12} className="text-red-400" />
                      <span className="text-[11px] text-red-400 font-mono font-bold">{selectedDay.failed}</span>
                      <span className="text-[10px] text-gray-500 font-mono">failed</span>
                    </div>
                  )}
                </div>

                {/* Total quests bar */}
                {selectedDay.total > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] text-gray-500 font-mono">Quest Progress</span>
                      <span className="text-[9px] text-gray-400 font-mono">{selectedDay.completed}/{selectedDay.total}</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: (selectedDay.total > 0 ? (selectedDay.completed / selectedDay.total) * 100 : 0) + '%',
                          backgroundColor: selectedDay.completed === selectedDay.total ? '#10b981' : '#22c55e',
                        }} />
                    </div>
                  </div>
                )}

                {/* XP earned */}
                {selectedDay.xp > 0 && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <Zap size={11} className="text-cyan-400" />
                    <span className="text-[11px] text-cyan-400 font-mono font-bold">+{selectedDay.xp} XP</span>
                    <span className="text-[10px] text-gray-500 font-mono">earned</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[10px] text-gray-600 font-mono">
                {selectedDay.isToday ? 'No activity yet - still time to hunt!' : 'Rest day - no quests completed.'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Empty state */}
      {!hasAnyData && (
        <div className="text-center py-3 px-4 bg-white/[0.01] border border-dashed border-cyan-500/10 rounded-sm">
          <p className="text-[10px] text-gray-500 font-mono">Complete quests to fill your Hunt Map.</p>
          <p className="text-[9px] text-gray-600 font-mono mt-0.5">Each cell = one day. Brighter = more quests completed.</p>
        </div>
      )}

      {/* Best day */}
      {stats.bestXP > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/5 border border-amber-500/15 rounded-sm">
          <Trophy size={12} className="text-amber-400 shrink-0" />
          <span className="text-[9px] text-amber-400/80 font-mono">Best: {stats.bestXP} XP on {new Date(stats.bestDate + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
        </div>
      )}
    </div>
  );
}
