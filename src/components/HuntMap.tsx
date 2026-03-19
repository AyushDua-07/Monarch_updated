import { useMemo, useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Flame, Zap, Target, Trophy, TrendingUp, TrendingDown, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Quest } from '@/lib/gameEngine';

const CELL = 12;
const GAP = 3;
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function isQuestForToday(quest: Quest): boolean {
  if (quest.frequency === 'custom' && quest.selectedDays && quest.selectedDays.length > 0) {
    return quest.selectedDays.includes(new Date().getDay());
  }
  return true;
}

function getCellColor(count: number): string {
  if (count === 0) return '#161b22';
  if (count === 1) return '#0e4429';
  if (count === 2) return '#006d32';
  if (count <= 4) return '#26a641';
  return '#39d353';
}

interface DayData {
  date: string;
  day: number;
  xp: number;
  completed: number;
  failed: number;
  total: number;
  isToday: boolean;
  isEmpty: boolean;
}

export default function HuntMap() {
  const { logs, user, quests } = useGame();
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

  const isCurrentMonth = viewMonth === now.getMonth() && viewYear === now.getFullYear();

  function prevMonth() {
    setSelectedDay(null);
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    setSelectedDay(null);
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  // XP per day from logs
  const dailyXP = useMemo(() => {
    const m: Record<string, number> = {};
    logs.forEach(l => { const d = l.createdAt.split('T')[0]; m[d] = (m[d] || 0) + l.xpEarned; });
    return m;
  }, [logs]);

  // Quest completions/failures per day
  const questsByDay = useMemo(() => {
    const m: Record<string, { completed: number; failed: number }> = {};
    quests.forEach(q => {
      if (q.completedAt) {
        const d = q.completedAt.split('T')[0];
        if (!m[d]) m[d] = { completed: 0, failed: 0 };
        m[d].completed += 1;
      }
      if ((q as any).failedAt) {
        const d = ((q as any).failedAt as string).split('T')[0];
        if (!m[d]) m[d] = { completed: 0, failed: 0 };
        m[d].failed += 1;
      }
    });
    return m;
  }, [quests]);

  // Build month grid: 7 rows (Sun-Sat) x N weeks
  const monthGrid = useMemo(() => {
    const todayStr = now.toISOString().split('T')[0];
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDow = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun

    // Total cells needed: pad start + days + pad end to fill last week
    const totalCells = firstDow + daysInMonth;
    const numWeeks = Math.ceil(totalCells / 7);

    const weeks: DayData[][] = [];
    for (let w = 0; w < numWeeks; w++) {
      const week: DayData[] = [];
      for (let d = 0; d < 7; d++) {
        const cellIdx = w * 7 + d;
        const dayNum = cellIdx - firstDow + 1;
        if (dayNum < 1 || dayNum > daysInMonth) {
          // Empty padding cell
          week.push({ date: '', day: 0, xp: 0, completed: 0, failed: 0, total: 0, isToday: false, isEmpty: true });
        } else {
          const ds = viewYear + '-' + String(viewMonth + 1).padStart(2, '0') + '-' + String(dayNum).padStart(2, '0');
          const qd = questsByDay[ds];
          const comp = qd?.completed || 0;
          const fail = qd?.failed || 0;

          // For today, include active quests in total
          let total = comp + fail;
          if (ds === todayStr) {
            total += quests.filter(q => q.status === 'active' && isQuestForToday(q)).length;
          }

          week.push({
            date: ds,
            day: dayNum,
            xp: dailyXP[ds] || 0,
            completed: comp,
            failed: fail,
            total: total,
            isToday: ds === todayStr,
            isEmpty: false,
          });
        }
      }
      weeks.push(week);
    }
    return weeks;
  }, [viewMonth, viewYear, dailyXP, questsByDay, quests, now]);

  // Month summary stats
  const monthStats = useMemo(() => {
    const prefix = viewYear + '-' + String(viewMonth + 1).padStart(2, '0');
    let xp = 0, completed = 0, failed = 0, activeDays = 0;
    Object.entries(dailyXP).forEach(([d, v]) => { if (d.startsWith(prefix)) { xp += v; activeDays++; } });
    Object.entries(questsByDay).forEach(([d, v]) => { if (d.startsWith(prefix)) { completed += v.completed; failed += v.failed; } });
    return { xp, completed, failed, activeDays };
  }, [viewMonth, viewYear, dailyXP, questsByDay]);

  // Today stats for top cards
  const todayStats = useMemo(() => {
    const todayStr = now.toISOString().split('T')[0];
    const todayCompleted = quests.filter(q => q.status === 'completed' && q.completedAt?.startsWith(todayStr) && isQuestForToday(q)).length;
    const todayActive = quests.filter(q => q.status === 'active' && isQuestForToday(q)).length;
    return { xp: dailyXP[todayStr] || 0, completed: todayCompleted, active: todayActive };
  }, [quests, dailyXP, now]);

  // Week stats
  const weekStats = useMemo(() => {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    let weekXP = 0, weekQ = 0;
    Object.entries(dailyXP).forEach(([d, v]) => { if (new Date(d) >= weekStart) { weekXP += v; weekQ++; } });
    const lastWeekStart = new Date(weekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    let lastWeekXP = 0;
    Object.entries(dailyXP).forEach(([d, v]) => { const dt = new Date(d); if (dt >= lastWeekStart && dt < weekStart) lastWeekXP += v; });
    const trend = lastWeekXP > 0 ? Math.round(((weekXP - lastWeekXP) / lastWeekXP) * 100) : weekXP > 0 ? 100 : 0;
    return { weekXP, weekQ, trend };
  }, [dailyXP, now]);

  // Last 7 days bar
  const last7 = useMemo(() => {
    const days: { label: string; xp: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      days.push({ label: d.toLocaleString('default', { weekday: 'narrow' }), xp: dailyXP[ds] || 0 });
    }
    return days;
  }, [dailyXP, now]);
  const maxBar = useMemo(() => Math.max(1, ...last7.map(d => d.xp)), [last7]);

  const hasAnyData = logs.length > 0;

  return (
    <div className="space-y-4">

      {/* Top Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-3 p-2.5 bg-white/[0.02] rounded-sm">
          <div className="w-8 h-8 rounded-sm bg-cyan-500/10 flex items-center justify-center shrink-0"><Zap size={14} className="text-cyan-400" /></div>
          <div><p className="font-mono text-base font-bold text-white leading-none">{todayStats.xp}</p><p className="text-[8px] text-gray-500 uppercase font-mono mt-0.5">XP Today</p></div>
        </div>
        <div className="flex items-center gap-3 p-2.5 bg-white/[0.02] rounded-sm">
          <div className="w-8 h-8 rounded-sm bg-emerald-500/10 flex items-center justify-center shrink-0"><Target size={14} className="text-emerald-400" /></div>
          <div><p className="font-mono text-base font-bold text-white leading-none">{todayStats.completed}<span className="text-gray-500 font-normal text-xs">/{todayStats.completed + todayStats.active}</span></p><p className="text-[8px] text-gray-500 uppercase font-mono mt-0.5">Quests Today</p></div>
        </div>
        <div className="flex items-center gap-3 p-2.5 bg-white/[0.02] rounded-sm">
          <div className="w-8 h-8 rounded-sm bg-amber-500/10 flex items-center justify-center shrink-0"><Flame size={14} className="text-amber-400" /></div>
          <div><p className="font-mono text-base font-bold text-white leading-none">{user.currentStreak}<span className="text-[9px] text-gray-500 font-normal ml-0.5">d</span></p><p className="text-[8px] text-gray-500 uppercase font-mono mt-0.5">Streak</p></div>
        </div>
        <div className="flex items-center gap-3 p-2.5 bg-white/[0.02] rounded-sm">
          <div className="w-8 h-8 rounded-sm bg-purple-500/10 flex items-center justify-center shrink-0"><Trophy size={14} className="text-purple-400" /></div>
          <div><p className="font-mono text-base font-bold text-white leading-none">{monthStats.xp}</p><p className="text-[8px] text-gray-500 uppercase font-mono mt-0.5">Month XP</p></div>
        </div>
      </div>

      {/* Last 7 Days */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] text-gray-500 font-mono uppercase tracking-wider">Last 7 Days</span>
          {weekStats.trend !== 0 && (
            <div className="flex items-center gap-1">
              {weekStats.trend > 0 ? <TrendingUp size={10} className="text-emerald-400" /> : <TrendingDown size={10} className="text-red-400" />}
              <span className={'text-[9px] font-mono ' + (weekStats.trend > 0 ? 'text-emerald-400' : 'text-red-400')}>{weekStats.trend > 0 ? '+' : ''}{weekStats.trend}%</span>
            </div>
          )}
        </div>
        <div className="flex items-end gap-[6px] h-16">
          {last7.map((day, i) => {
            const pct = maxBar > 0 ? (day.xp / maxBar) * 100 : 0;
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
          <span className="text-[8px] text-gray-600 font-mono">{weekStats.weekQ} active days</span>
          <span className="text-[8px] text-cyan-400/60 font-mono">{weekStats.weekXP} XP</span>
        </div>
      </div>

      {/* Monthly Activity Grid */}
      <div>
        {/* Month Navigator */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="p-1 text-gray-500 hover:text-cyan-400 transition-colors"><ChevronLeft size={16} /></button>
          <div className="text-center">
            <span className="text-[11px] text-white font-mono font-medium">{MONTHS[viewMonth]} {viewYear}</span>
            <div className="flex items-center justify-center gap-3 mt-0.5">
              <span className="text-[8px] text-emerald-400/70 font-mono">{monthStats.completed} completed</span>
              {monthStats.failed > 0 && <span className="text-[8px] text-red-400/70 font-mono">{monthStats.failed} failed</span>}
              <span className="text-[8px] text-cyan-400/70 font-mono">{monthStats.xp} XP</span>
            </div>
          </div>
          <button onClick={nextMonth} className={'p-1 transition-colors ' + (isCurrentMonth ? 'text-gray-700 cursor-default' : 'text-gray-500 hover:text-cyan-400')} disabled={isCurrentMonth}><ChevronRight size={16} /></button>
        </div>

        {/* Day-of-week header */}
        <div className="flex" style={{ paddingLeft: '0px', gap: GAP + 'px' }}>
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <div key={i} className="flex items-center justify-center" style={{ width: CELL + 'px', height: '14px' }}>
              <span className="text-[8px] text-gray-500 font-mono">{d}</span>
            </div>
          ))}
        </div>

        {/* Grid - weeks as rows, days as columns */}
        <div className="flex flex-col" style={{ gap: GAP + 'px', marginTop: GAP + 'px' }}>
          {monthGrid.map((week, wi) => (
            <div key={wi} className="flex" style={{ gap: GAP + 'px' }}>
              {week.map((cell, di) => (
                <div key={di}
                  onClick={() => {
                    if (cell.isEmpty) return;
                    setSelectedDay(selectedDay?.date === cell.date ? null : cell);
                  }}
                  style={{
                    width: CELL + 'px',
                    height: CELL + 'px',
                    backgroundColor: cell.isEmpty ? 'transparent' : getCellColor(cell.completed),
                    borderRadius: '2px',
                    boxShadow: cell.isToday ? '0 0 0 1.5px rgba(0,212,255,0.7)' : 'none',
                    cursor: cell.isEmpty ? 'default' : 'pointer',
                  }}
                  className={!cell.isEmpty ? 'hover:scale-110 active:scale-90 transition-transform' : ''}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between mt-3">
          <span className="text-[8px] text-gray-600 font-mono">{monthStats.activeDays} active days this month</span>
          <div className="flex items-center gap-1">
            <span className="text-[8px] text-gray-500 font-mono">Less</span>
            {[0, 1, 2, 3, 5].map((v, i) => (
              <div key={i} style={{ width: '10px', height: '10px', backgroundColor: getCellColor(v), borderRadius: '2px' }} />
            ))}
            <span className="text-[8px] text-gray-500 font-mono">More</span>
          </div>
        </div>

        {/* Selected Day Detail */}
        {selectedDay && !selectedDay.isEmpty && (
          <div className="mt-3 p-3 bg-[#0d1117] border border-white/[0.08] rounded-md">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-white font-mono font-medium">
                {new Date(selectedDay.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <button onClick={() => setSelectedDay(null)} className="text-gray-600 hover:text-gray-400 text-xs">&#10005;</button>
            </div>

            {(selectedDay.completed > 0 || selectedDay.failed > 0 || selectedDay.xp > 0) ? (
              <div className="space-y-2">
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

                {selectedDay.total > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] text-gray-500 font-mono">Quest Progress</span>
                      <span className="text-[9px] text-gray-400 font-mono">{selectedDay.completed}/{selectedDay.total}</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: (selectedDay.total > 0 ? (selectedDay.completed / selectedDay.total) * 100 : 0) + '%', backgroundColor: selectedDay.completed === selectedDay.total ? '#10b981' : '#22c55e' }} />
                    </div>
                  </div>
                )}

                {selectedDay.xp > 0 && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <Zap size={11} className="text-cyan-400" />
                    <span className="text-[11px] text-cyan-400 font-mono font-bold">+{selectedDay.xp} XP</span>
                    <span className="text-[10px] text-gray-500 font-mono">earned</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[10px] text-gray-600 font-mono">{selectedDay.isToday ? 'No activity yet - still time!' : 'Rest day - no quests completed.'}</p>
            )}
          </div>
        )}
      </div>

      {/* Empty state */}
      {!hasAnyData && (
        <div className="text-center py-3 px-4 bg-white/[0.01] border border-dashed border-cyan-500/10 rounded-sm">
          <p className="text-[10px] text-gray-500 font-mono">Complete quests to fill your Activity Map.</p>
        </div>
      )}
    </div>
  );
}
