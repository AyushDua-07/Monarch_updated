import { useMemo, useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Flame, Zap, Target, Trophy, TrendingUp, TrendingDown } from 'lucide-react';

/* ── Config ── */
const WEEKS = 15;

/* ── Color by XP earned that day ── */
function cellBg(xp: number): string {
  if (xp === 0) return 'bg-[#0d1117]';
  if (xp < 30)  return 'bg-[#0e4429]';
  if (xp < 80)  return 'bg-[#006d55]';
  if (xp < 150) return 'bg-[#00a783]';
  return 'bg-[#00d4ff]';
}
function cellShadow(xp: number): string {
  if (xp >= 150) return '0 0 6px rgba(0,212,255,0.6)';
  if (xp >= 80)  return '0 0 4px rgba(0,167,131,0.4)';
  return 'none';
}

interface Cell {
  date: string;
  xp: number;
  quests: number;
  isToday: boolean;
  isFuture: boolean;
}

export default function HuntMap() {
  const { logs, user, quests } = useGame();
  const [sel, setSel] = useState<Cell | null>(null);

  /* ── Aggregate logs by day ── */
  const daily = useMemo(() => {
    const m: Record<string, { xp: number; quests: number }> = {};
    logs.forEach(l => {
      const d = l.createdAt.split('T')[0];
      if (!m[d]) m[d] = { xp: 0, quests: 0 };
      m[d].xp += l.xpEarned;
      m[d].quests += 1;
    });
    return m;
  }, [logs]);

  /* ── Build heatmap grid (oldest→newest, left→right) ── */
  const grid = useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    const dow = today.getDay();
    const endSat = new Date(today);
    endSat.setDate(today.getDate() + (6 - dow));

    const weeks: Cell[][] = [];
    for (let w = WEEKS - 1; w >= 0; w--) {
      const week: Cell[] = [];
      for (let d = 0; d < 7; d++) {
        const dt = new Date(endSat);
        dt.setDate(endSat.getDate() - w * 7 - (6 - d));
        const ds = dt.toISOString().split('T')[0];
        const data = daily[ds];
        const dtNorm = new Date(dt); dtNorm.setHours(12, 0, 0, 0);
        week.push({ date: ds, xp: data?.xp || 0, quests: data?.quests || 0, isToday: ds === todayStr, isFuture: dtNorm > today });
      }
      weeks.push(week);
    }
    return weeks;
  }, [daily]);

  /* ── Month labels ── */
  const months = useMemo(() => {
    const out: { label: string; idx: number }[] = [];
    let last = -1;
    grid.forEach((wk, i) => {
      const ref = wk[3]?.date || wk[0].date;
      const m = new Date(ref).getMonth();
      if (m !== last) { out.push({ label: new Date(ref).toLocaleString('default', { month: 'short' }), idx: i }); last = m; }
    });
    return out;
  }, [grid]);

  /* ── Last 7 days bar chart data ── */
  const last7 = useMemo(() => {
    const days: { label: string; xp: number; quests: number; date: string }[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const data = daily[ds];
      days.push({
        label: d.toLocaleString('default', { weekday: 'narrow' }),
        xp: data?.xp || 0,
        quests: data?.quests || 0,
        date: ds,
      });
    }
    return days;
  }, [daily]);

  const maxBarXP = useMemo(() => Math.max(1, ...last7.map(d => d.xp)), [last7]);

  /* ── Summary stats ── */
  const stats = useMemo(() => {
    const entries = Object.entries(daily);
    const todayStr = new Date().toISOString().split('T')[0];
    const todayD = daily[todayStr];
    const now = new Date();

    // This week
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    let weekQ = 0, weekXP = 0;
    entries.forEach(([d, v]) => { if (new Date(d) >= weekStart) { weekQ += v.quests; weekXP += v.xp; } });

    // Last week for comparison
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    let lastWeekXP = 0;
    entries.forEach(([d, v]) => {
      const dt = new Date(d);
      if (dt >= lastWeekStart && dt < weekStart) lastWeekXP += v.xp;
    });

    const weekTrend = lastWeekXP > 0 ? Math.round(((weekXP - lastWeekXP) / lastWeekXP) * 100) : weekXP > 0 ? 100 : 0;

    const activeDays = entries.filter(([, v]) => v.quests > 0).length;
    const best = entries.length > 0 ? entries.reduce((b, c) => c[1].xp > b[1].xp ? c : b) : null;
    const totalQ = entries.reduce((s, [, v]) => s + v.quests, 0);
    const totalXP = entries.reduce((s, [, v]) => s + v.xp, 0);
    const avgDaily = activeDays > 0 ? Math.round(totalXP / activeDays) : 0;

    // Completed today
    const todayCompleted = quests.filter(q => q.status === 'completed' && q.completedAt?.startsWith(todayStr)).length;
    const todayActive = quests.filter(q => q.status === 'active').length;

    return {
      todayXP: todayD?.xp || 0,
      todayQuests: todayD?.quests || 0,
      todayCompleted,
      todayActive,
      weekQ, weekXP, weekTrend, lastWeekXP,
      activeDays, avgDaily,
      bestXP: best ? best[1].xp : 0,
      bestDate: best ? best[0] : '',
      totalQ, totalXP,
      streak: user.currentStreak,
      bestStreak: user.bestStreak,
    };
  }, [daily, quests, user]);

  const hasAnyData = logs.length > 0;

  return (
    <div className="space-y-4">

      {/* ── TOP STATS ROW ── */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-3 p-2.5 bg-white/[0.02] rounded-sm">
          <div className="w-8 h-8 rounded-sm bg-cyan-500/10 flex items-center justify-center shrink-0">
            <Zap size={14} className="text-cyan-400" />
          </div>
          <div>
            <p className="font-mono text-base font-bold text-white leading-none">{stats.todayXP}</p>
            <p className="text-[8px] text-gray-500 uppercase font-mono mt-0.5">XP Today</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-2.5 bg-white/[0.02] rounded-sm">
          <div className="w-8 h-8 rounded-sm bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Target size={14} className="text-emerald-400" />
          </div>
          <div>
            <p className="font-mono text-base font-bold text-white leading-none">
              {stats.todayCompleted}<span className="text-gray-500 font-normal text-xs">/{stats.todayCompleted + stats.todayActive}</span>
            </p>
            <p className="text-[8px] text-gray-500 uppercase font-mono mt-0.5">Quests Today</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-2.5 bg-white/[0.02] rounded-sm">
          <div className="w-8 h-8 rounded-sm bg-amber-500/10 flex items-center justify-center shrink-0">
            <Flame size={14} className="text-amber-400" />
          </div>
          <div>
            <p className="font-mono text-base font-bold text-white leading-none">
              {stats.streak}<span className="text-[9px] text-gray-500 font-normal ml-0.5">d</span>
            </p>
            <p className="text-[8px] text-gray-500 uppercase font-mono mt-0.5">Streak</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-2.5 bg-white/[0.02] rounded-sm">
          <div className="w-8 h-8 rounded-sm bg-purple-500/10 flex items-center justify-center shrink-0">
            <Trophy size={14} className="text-purple-400" />
          </div>
          <div>
            <p className="font-mono text-base font-bold text-white leading-none">{stats.avgDaily}</p>
            <p className="text-[8px] text-gray-500 uppercase font-mono mt-0.5">Avg XP/Day</p>
          </div>
        </div>
      </div>

      {/* ── LAST 7 DAYS BAR CHART ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] text-gray-500 font-mono uppercase tracking-wider">Last 7 Days</span>
          <div className="flex items-center gap-1">
            {stats.weekTrend !== 0 && (
              <>
                {stats.weekTrend > 0 ? <TrendingUp size={10} className="text-emerald-400" /> : <TrendingDown size={10} className="text-red-400" />}
                <span className={`text-[9px] font-mono ${stats.weekTrend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {stats.weekTrend > 0 ? '+' : ''}{stats.weekTrend}% vs last week
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-end gap-[6px] h-16">
          {last7.map((day, i) => {
            const pct = maxBarXP > 0 ? (day.xp / maxBarXP) * 100 : 0;
            const isToday = i === 6;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                {/* XP label on hover-height bars */}
                {day.xp > 0 && (
                  <span className="text-[7px] font-mono text-gray-500 leading-none">{day.xp}</span>
                )}
                {/* Bar */}
                <div className="w-full flex-1 flex items-end">
                  <div
                    className={`w-full rounded-t-sm transition-all duration-500 ${
                      day.xp === 0 ? 'bg-white/[0.04]' : isToday ? 'bg-cyan-400' : 'bg-cyan-600/70'
                    }`}
                    style={{
                      height: day.xp === 0 ? '2px' : `${Math.max(8, pct)}%`,
                      boxShadow: isToday && day.xp > 0 ? '0 0 8px rgba(0,212,255,0.4)' : 'none',
                    }}
                  />
                </div>
                {/* Day label */}
                <span className={`text-[8px] font-mono leading-none ${isToday ? 'text-cyan-400' : 'text-gray-600'}`}>
                  {day.label}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[8px] text-gray-600 font-mono">{stats.weekQ} quests this week</span>
          <span className="text-[8px] text-cyan-400/60 font-mono">{stats.weekXP} XP</span>
        </div>
      </div>

      {/* ── HEATMAP GRID ── */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] text-gray-500 font-mono uppercase tracking-wider">Activity History</span>
          <span className="text-[8px] text-gray-600 font-mono">{stats.activeDays} active days</span>
        </div>

        {/* Month labels */}
        <div style={{ marginLeft: '16px' }} className="mb-1">
          <div className="relative h-3">
            {months.map((m, i) => (
              <span key={i} className="text-[8px] text-gray-500 font-mono absolute"
                style={{ left: `${(m.idx / WEEKS) * 100}%` }}>
                {m.label}
              </span>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="flex gap-[2px]">
          {/* Day-of-week labels */}
          <div className="flex flex-col gap-[2px] shrink-0 w-[14px]">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="flex items-center justify-end" style={{ height: '12px' }}>
                {i % 2 === 1 && <span className="text-[7px] text-gray-600 font-mono leading-none">{d}</span>}
              </div>
            ))}
          </div>

          {/* Cells */}
          <div className="flex gap-[2px] flex-1 min-w-0">
            {grid.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[2px] flex-1 min-w-0">
                {week.map((cell, di) => (
                  <div
                    key={di}
                    onClick={() => !cell.isFuture ? setSel(sel?.date === cell.date ? null : cell) : undefined}
                    className={`w-full rounded-[2px] transition-all ${
                      cell.isFuture ? 'bg-transparent' : cellBg(cell.xp)
                    } ${cell.isToday ? 'ring-1 ring-cyan-400/80 ring-offset-1 ring-offset-[#0a0e1e]' : ''} ${
                      !cell.isFuture ? 'cursor-pointer active:scale-90' : ''
                    }`}
                    style={{
                      aspectRatio: '1',
                      boxShadow: cell.isFuture ? 'none' : cellShadow(cell.xp),
                      minHeight: '8px',
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Selected cell detail */}
        {sel && (
          <div className="flex items-center gap-3 p-2.5 mt-2 bg-cyan-500/5 border border-cyan-500/20 rounded-sm">
            <div className={`w-4 h-4 rounded-[3px] shrink-0 ${cellBg(sel.xp)}`}
              style={{ boxShadow: cellShadow(sel.xp) }} />
            <div className="flex-1">
              <p className="text-[11px] text-white font-mono">
                {new Date(sel.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
              <p className="text-[9px] text-gray-400 font-mono">
                {sel.quests > 0
                  ? `${sel.quests} quest${sel.quests !== 1 ? 's' : ''} · ${sel.xp} XP earned`
                  : sel.isToday ? 'No quests yet — still time!' : 'Rest day — no quests completed'}
              </p>
            </div>
            {sel.xp > 0 && (
              <span className="text-xs font-mono font-bold text-cyan-400 shrink-0">+{sel.xp}</span>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center justify-between mt-2">
          <span className="text-[8px] text-gray-600 font-mono">{stats.totalQ} quests · {stats.totalXP.toLocaleString()} XP all time</span>
          <div className="flex items-center gap-[3px]">
            <span className="text-[7px] text-gray-600 font-mono mr-0.5">Less</span>
            {[0, 15, 50, 100, 200].map((v, i) => (
              <div key={i} className={`w-[8px] h-[8px] rounded-[2px] ${cellBg(v)}`} />
            ))}
            <span className="text-[7px] text-gray-600 font-mono ml-0.5">More</span>
          </div>
        </div>
      </div>

      {/* ── EMPTY STATE ── */}
      {!hasAnyData && (
        <div className="text-center py-3 px-4 bg-white/[0.01] border border-dashed border-cyan-500/10 rounded-sm">
          <p className="text-[10px] text-gray-500 font-mono">Complete quests to fill your Hunt Map.</p>
          <p className="text-[9px] text-gray-600 font-mono mt-0.5">Each cell = one day. Brighter = more XP earned.</p>
        </div>
      )}

      {/* ── BEST DAY CALLOUT ── */}
      {stats.bestXP > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/5 border border-amber-500/15 rounded-sm">
          <Trophy size={12} className="text-amber-400 shrink-0" />
          <span className="text-[9px] text-amber-400/80 font-mono">
            Best day: {stats.bestXP} XP on {new Date(stats.bestDate + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        </div>
      )}
    </div>
  );
}
