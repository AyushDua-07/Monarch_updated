import { useMemo, useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Flame, Zap, Target, Trophy, TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Quest } from '@/lib/gameEngine';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_HEADERS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function toLocalDateStr(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function isQuestForToday(quest: Quest): boolean {
  if (quest.frequency === 'custom' && quest.selectedDays && quest.selectedDays.length > 0) {
    return quest.selectedDays.includes(new Date().getDay());
  }
  return true;
}

function getCellBg(completed: number, failed: number): string {
  if (completed === 0 && failed === 0) return 'bg-white/[0.03]';
  if (completed === 0 && failed > 0) return 'bg-red-800/50';
  if (completed >= 4) return 'bg-emerald-400/80';
  if (completed >= 2) return 'bg-emerald-600/70';
  if (completed >= 1) return 'bg-emerald-800/60';
  return 'bg-white/[0.03]';
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
  const todayStr = toLocalDateStr(now);
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const isCurrentMonth = viewMonth === now.getMonth() && viewYear === now.getFullYear();

  function prevMonth() { setSelectedDay(null); if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); }
  function nextMonth() { if (isCurrentMonth) return; setSelectedDay(null); if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); }

  // SOURCE 1: Activity logs (permanent history)
  // Completed = xpEarned > 0, Failed = xpEarned === 0 with questId
  const logsByDay = useMemo(() => {
    const m: Record<string, { xp: number; completed: number; failed: number }> = {};
    logs.forEach(l => {
      const d = toLocalDateStr(new Date(l.createdAt));
      if (!m[d]) m[d] = { xp: 0, completed: 0, failed: 0 };
      if (l.xpEarned > 0) {
        m[d].xp += l.xpEarned;
        m[d].completed += 1;
      } else if (l.questId) {
        // Any log with questId but 0 XP is a failure/abandonment
        m[d].failed += 1;
      }
    });
    return m;
  }, [logs]);

  // SOURCE 2: Quest objects (for current-day state not yet in logs)
  // This catches today's completed/failed quests that may not have log entries
  const questStateByDay = useMemo(() => {
    const m: Record<string, { completed: number; failed: number }> = {};
    quests.forEach(q => {
      // Completed quests
      if (q.status === 'completed' && q.completedAt) {
        const d = toLocalDateStr(new Date(q.completedAt));
        if (!m[d]) m[d] = { completed: 0, failed: 0 };
        m[d].completed += 1;
      }
      // Failed/abandoned quests
      if (q.status === 'failed' && (q as any).failedAt) {
        const d = toLocalDateStr(new Date((q as any).failedAt));
        if (!m[d]) m[d] = { completed: 0, failed: 0 };
        m[d].failed += 1;
      }
    });
    return m;
  }, [quests]);

  // MERGE: take the MAX from both sources for each day
  // This ensures we never miss data regardless of whether logs exist
  const dailyHistory = useMemo(() => {
    const allDates = new Set([...Object.keys(logsByDay), ...Object.keys(questStateByDay)]);
    const m: Record<string, { xp: number; completed: number; failed: number }> = {};
    allDates.forEach(d => {
      const fromLogs = logsByDay[d] || { xp: 0, completed: 0, failed: 0 };
      const fromQuests = questStateByDay[d] || { completed: 0, failed: 0 };
      m[d] = {
        xp: fromLogs.xp,
        completed: Math.max(fromLogs.completed, fromQuests.completed),
        failed: Math.max(fromLogs.failed, fromQuests.failed),
      };
    });
    return m;
  }, [logsByDay, questStateByDay]);

  // Build calendar grid
  const monthGrid = useMemo(() => {
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDow = new Date(viewYear, viewMonth, 1).getDay();
    const numWeeks = Math.ceil((firstDow + daysInMonth) / 7);
    const weeks: DayData[][] = [];
    for (let w = 0; w < numWeeks; w++) {
      const week: DayData[] = [];
      for (let d = 0; d < 7; d++) {
        const dayNum = w * 7 + d - firstDow + 1;
        if (dayNum < 1 || dayNum > daysInMonth) {
          week.push({ date: '', day: 0, xp: 0, completed: 0, failed: 0, total: 0, isToday: false, isEmpty: true });
        } else {
          const ds = viewYear + '-' + String(viewMonth + 1).padStart(2, '0') + '-' + String(dayNum).padStart(2, '0');
          const hist = dailyHistory[ds];
          const comp = hist?.completed || 0;
          const fail = hist?.failed || 0;
          let total = comp + fail;
          if (ds === todayStr) {
            total += quests.filter(q => q.status === 'active' && isQuestForToday(q)).length;
          }
          week.push({ date: ds, day: dayNum, xp: hist?.xp || 0, completed: comp, failed: fail, total: total, isToday: ds === todayStr, isEmpty: false });
        }
      }
      weeks.push(week);
    }
    return weeks;
  }, [viewMonth, viewYear, dailyHistory, quests, todayStr]);

  // Month summary
  const monthStats = useMemo(() => {
    const prefix = viewYear + '-' + String(viewMonth + 1).padStart(2, '0');
    let xp = 0, completed = 0, failed = 0, activeDays = 0;
    Object.entries(dailyHistory).forEach(([d, v]) => {
      if (d.startsWith(prefix)) {
        xp += v.xp; completed += v.completed; failed += v.failed;
        if (v.completed > 0 || v.failed > 0) activeDays++;
      }
    });
    return { xp, completed, failed, activeDays };
  }, [viewMonth, viewYear, dailyHistory]);

  // Today stats
  const todayStats = useMemo(() => {
    const hist = dailyHistory[todayStr];
    const todayActive = quests.filter(q => q.status === 'active' && isQuestForToday(q)).length;
    return { xp: hist?.xp || 0, completed: hist?.completed || 0, failed: hist?.failed || 0, active: todayActive };
  }, [dailyHistory, quests, todayStr]);

  // Week stats
  const weekStats = useMemo(() => {
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0, 0, 0, 0);
    let weekXP = 0, weekDays = 0;
    Object.entries(dailyHistory).forEach(([d, v]) => {
      const p = d.split('-'); const dt = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
      if (dt >= weekStart) { weekXP += v.xp; if (v.completed > 0 || v.failed > 0) weekDays++; }
    });
    const lastWeekStart = new Date(weekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    let lastWeekXP = 0;
    Object.entries(dailyHistory).forEach(([d, v]) => {
      const p = d.split('-'); const dt = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
      if (dt >= lastWeekStart && dt < weekStart) lastWeekXP += v.xp;
    });
    const trend = lastWeekXP > 0 ? Math.round(((weekXP - lastWeekXP) / lastWeekXP) * 100) : weekXP > 0 ? 100 : 0;
    return { weekXP, weekDays, trend };
  }, [dailyHistory, now]);

  // Last 7 days
  const last7 = useMemo(() => {
    const days: { label: string; xp: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      const ds = toLocalDateStr(d);
      days.push({ label: d.toLocaleString('default', { weekday: 'narrow' }), xp: dailyHistory[ds]?.xp || 0 });
    }
    return days;
  }, [dailyHistory, now]);
  const maxBar = useMemo(() => Math.max(1, ...last7.map(d => d.xp)), [last7]);

  const hasAnyData = logs.length > 0 || quests.some(q => q.status === 'completed' || q.status === 'failed');

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
          <div><p className="font-mono text-base font-bold text-white leading-none">{todayStats.completed}<span className="text-gray-500 font-normal text-xs">/{todayStats.completed + todayStats.failed + todayStats.active}</span></p><p className="text-[8px] text-gray-500 uppercase font-mono mt-0.5">Quests Today</p></div>
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
            const pct = maxBar > 0 ? (day.xp / maxBar) * 100 : 0; const isToday = i === 6;
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
          <span className="text-[8px] text-gray-600 font-mono">{weekStats.weekDays} active days</span>
          <span className="text-[8px] text-cyan-400/60 font-mono">{weekStats.weekXP} XP</span>
        </div>
      </div>

      {/* Monthly Activity Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-sm bg-white/[0.03] text-gray-400 hover:text-cyan-400 hover:bg-white/[0.06] transition-all"><ChevronLeft size={16} /></button>
          <div className="text-center">
            <p className="text-sm text-white font-mono font-semibold tracking-wide">{MONTHS[viewMonth]} {viewYear}</p>
            <div className="flex items-center justify-center gap-3 mt-1">
              <span className="text-[9px] text-emerald-400/80 font-mono">{monthStats.completed} completed</span>
              {monthStats.failed > 0 && <span className="text-[9px] text-red-400/80 font-mono">{monthStats.failed} failed</span>}
              <span className="text-[9px] text-gray-500 font-mono">{monthStats.activeDays} active days</span>
            </div>
          </div>
          <button onClick={nextMonth} className={'w-8 h-8 flex items-center justify-center rounded-sm transition-all ' + (isCurrentMonth ? 'bg-white/[0.02] text-gray-700 cursor-default' : 'bg-white/[0.03] text-gray-400 hover:text-cyan-400 hover:bg-white/[0.06]')} disabled={isCurrentMonth}><ChevronRight size={16} /></button>
        </div>

        <div className="w-full">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_HEADERS.map((d, i) => (<div key={i} className="text-center py-1"><span className="text-[9px] text-gray-500 font-mono font-medium">{d}</span></div>))}
          </div>
          <div className="grid gap-1">
            {monthGrid.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1">
                {week.map((cell, di) => {
                  const isSel = selectedDay?.date === cell.date;
                  const hasActivity = cell.completed > 0 || cell.failed > 0;
                  return (
                    <div key={di}
                      onClick={() => { if (!cell.isEmpty) setSelectedDay(isSel ? null : cell); }}
                      className={
                        'relative flex items-center justify-center rounded-sm transition-all ' +
                        (cell.isEmpty ? 'bg-transparent' : getCellBg(cell.completed, cell.failed)) + ' ' +
                        (cell.isToday && !cell.isEmpty ? 'ring-1 ring-cyan-400/70 ring-offset-1 ring-offset-[#0a0e1e]' : '') + ' ' +
                        (isSel && !cell.isEmpty ? 'ring-1 ring-white/40 ring-offset-1 ring-offset-[#0a0e1e]' : '') + ' ' +
                        (!cell.isEmpty ? 'cursor-pointer hover:brightness-125 active:scale-95' : '')
                      }
                      style={{ aspectRatio: '1' }}
                    >
                      {!cell.isEmpty && (
                        <>
                          <span className={'text-[10px] font-mono leading-none ' +
                            (cell.isToday ? 'text-cyan-400 font-bold' :
                             cell.completed > 0 ? 'text-white/90' :
                             cell.failed > 0 ? 'text-red-300/80' :
                             'text-gray-600')
                          }>{cell.day}</span>
                          {/* Green dots for completed */}
                          {cell.completed > 0 && (
                            <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-px">
                              {Array.from({ length: Math.min(cell.completed, 4) }).map((_, i) => (
                                <div key={i} className="w-1 h-1 rounded-full bg-emerald-400/80" />
                              ))}
                            </div>
                          )}
                          {/* Red dot for failed-only days */}
                          {cell.completed === 0 && cell.failed > 0 && (
                            <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-px">
                              {Array.from({ length: Math.min(cell.failed, 3) }).map((_, i) => (
                                <div key={i} className="w-1 h-1 rounded-full bg-red-400/80" />
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.04]">
          <span className="text-[8px] text-gray-600 font-mono">{monthStats.xp} XP this month</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] text-gray-500 font-mono">Less</span>
            <div className="flex gap-0.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-white/[0.03]" />
              <div className="w-2.5 h-2.5 rounded-sm bg-emerald-800/60" />
              <div className="w-2.5 h-2.5 rounded-sm bg-emerald-600/70" />
              <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400/80" />
              <div className="w-2.5 h-2.5 rounded-sm bg-red-800/50" title="Failed" />
            </div>
            <span className="text-[8px] text-gray-500 font-mono">More</span>
          </div>
        </div>

        {/* Selected Day Detail */}
        {selectedDay && !selectedDay.isEmpty && (
          <div className="mt-3 p-4 bg-[#0d1117] border border-white/[0.06] rounded-md">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-white font-mono font-semibold">{new Date(selectedDay.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              <button onClick={() => setSelectedDay(null)} className="w-5 h-5 flex items-center justify-center rounded-sm bg-white/[0.05] text-gray-500 hover:text-white hover:bg-white/[0.1] transition-all text-[10px]">&#10005;</button>
            </div>
            {(selectedDay.completed > 0 || selectedDay.failed > 0 || selectedDay.xp > 0) ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 bg-emerald-500/5 border border-emerald-500/10 rounded-sm text-center"><p className="font-mono text-lg font-bold text-emerald-400 leading-none">{selectedDay.completed}</p><p className="text-[8px] text-gray-500 font-mono mt-1 uppercase">Completed</p></div>
                  <div className="p-2 bg-red-500/5 border border-red-500/10 rounded-sm text-center"><p className="font-mono text-lg font-bold text-red-400 leading-none">{selectedDay.failed}</p><p className="text-[8px] text-gray-500 font-mono mt-1 uppercase">Failed</p></div>
                  <div className="p-2 bg-cyan-500/5 border border-cyan-500/10 rounded-sm text-center"><p className="font-mono text-lg font-bold text-cyan-400 leading-none">{selectedDay.total}</p><p className="text-[8px] text-gray-500 font-mono mt-1 uppercase">Total</p></div>
                </div>
                {selectedDay.total > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5"><span className="text-[9px] text-gray-400 font-mono">Completion Rate</span><span className="text-[9px] text-white font-mono font-medium">{Math.round((selectedDay.completed / selectedDay.total) * 100)}%</span></div>
                    <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: (selectedDay.completed / selectedDay.total) * 100 + '%', backgroundColor: selectedDay.completed === selectedDay.total ? '#10b981' : '#22c55e' }} /></div>
                  </div>
                )}
                {selectedDay.xp > 0 && <div className="flex items-center gap-2 pt-1"><Zap size={12} className="text-cyan-400" /><span className="text-xs text-cyan-400 font-mono font-bold">+{selectedDay.xp} XP earned</span></div>}
              </div>
            ) : (
              <div className="text-center py-2"><p className="text-[10px] text-gray-500 font-mono">{selectedDay.isToday ? 'No activity yet - start a quest!' : 'Rest day'}</p></div>
            )}
          </div>
        )}
      </div>

      {!hasAnyData && (
        <div className="text-center py-4 px-4 bg-white/[0.01] border border-dashed border-white/[0.06] rounded-sm"><p className="text-[10px] text-gray-500 font-mono">Complete quests to fill your Activity Map.</p></div>
      )}
    </div>
  );
}
