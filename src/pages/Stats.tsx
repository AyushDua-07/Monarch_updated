import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, TrendingUp, Brain, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar, BarChart, Bar } from 'recharts';
import { useGame } from '@/contexts/GameContext';
import { type UserStats, ACTIVITY_TYPES, generateStatSummary } from '@/lib/gameEngine';
import SystemCard from '@/components/SystemCard';

const STAT_CFG: Record<keyof UserStats, { label: string; color: string; icon: string }> = {
  strength: { label: 'Strength', color: '#ef4444', icon: '⚔️' },
  endurance: { label: 'Endurance', color: '#f97316', icon: '🛡️' },
  intelligence: { label: 'Intelligence', color: '#3b82f6', icon: '🧠' },
  discipline: { label: 'Discipline', color: '#a855f7', icon: '🎯' },
  charisma: { label: 'Charisma', color: '#ec4899', icon: '✨' },
  luck: { label: 'Luck', color: '#22c55e', icon: '🍀' },
};

const PIE_COLORS = ['#3b82f6', '#ef4444', '#a855f7', '#22c55e', '#fbbf24', '#00d4ff', '#ec4899', '#f97316'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function Stats() {
  const { user, logs, quests, allocateStat } = useGame();
  const [timeRange, setTimeRange] = useState<7 | 30 | 90>(7);
  const now = new Date();
  const [selMonth, setSelMonth] = useState(now.getMonth());
  const [selYear, setSelYear] = useState(now.getFullYear());

  const aiSummary = useMemo(() => generateStatSummary(user, quests, logs), [user, quests, logs]);

  const xpChartData = useMemo(() => {
    const days: { date: string; xp: number }[] = [];
    for (let i = timeRange - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      days.push({ date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), xp: logs.filter(l => l.createdAt.startsWith(ds)).reduce((s, l) => s + l.xpEarned, 0) });
    }
    return days;
  }, [logs, timeRange]);

  const categoryData = useMemo(() => {
    const c: Record<string, number> = {};
    logs.forEach(l => { const lb = ACTIVITY_TYPES[l.type]?.label || 'Other'; c[lb] = (c[lb] || 0) + 1; });
    return Object.entries(c).map(([name, value]) => ({ name, value }));
  }, [logs]);

  const radarData = Object.entries(user.stats).map(([key, val]) => ({
    stat: STAT_CFG[key as keyof UserStats]?.label.slice(0, 3).toUpperCase() || key,
    value: val, fullMark: Math.max(20, val + 10),
  }));

  const totalQ = quests.length;
  const completedQ = quests.filter(q => q.status === 'completed').length;
  const compRate = totalQ > 0 ? Math.round((completedQ / totalQ) * 100) : 0;

  // Monthly
  const monthlyData = useMemo(() => {
    const mLogs = logs.filter(l => { const d = new Date(l.createdAt); return d.getMonth() === selMonth && d.getFullYear() === selYear; });
    const mQ = quests.filter(q => { const d = new Date(q.createdAt); return d.getMonth() === selMonth && d.getFullYear() === selYear; });
    const dailyXP: Record<string, number> = {};
    mLogs.forEach(l => { const day = new Date(l.createdAt).getDate().toString(); dailyXP[day] = (dailyXP[day] || 0) + l.xpEarned; });
    const daysInMonth = new Date(selYear, selMonth + 1, 0).getDate();
    const barData = Array.from({ length: daysInMonth }, (_, i) => ({ day: (i + 1).toString(), xp: dailyXP[(i + 1).toString()] || 0 }));
    return { totalXP: mLogs.reduce((s, l) => s + l.xpEarned, 0), totalLogs: mLogs.length, completed: mQ.filter(q => q.status === 'completed').length, failed: mQ.filter(q => q.status === 'failed').length, barData };
  }, [logs, quests, selMonth, selYear]);

  const prevMonth = () => { if (selMonth === 0) { setSelMonth(11); setSelYear(y => y - 1); } else setSelMonth(m => m - 1); };
  const nextMonth = () => { if (selMonth === 11) { setSelMonth(0); setSelYear(y => y + 1); } else setSelMonth(m => m + 1); };

  return (
    <div className="min-h-screen pb-safe">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="font-heading text-2xl font-bold text-white">Hunter Stats</h1>
          <p className="text-xs text-gray-500 font-mono mt-1">Analyze your growth, Hunter.</p>
        </motion.div>

        <SystemCard title="Intelligence Report" delay={0.05} glow>
          <div className="flex items-start gap-2"><Brain size={16} className="text-cyan-400 shrink-0 mt-0.5" /><p className="text-xs text-gray-300 leading-relaxed">{aiSummary}</p></div>
        </SystemCard>

        {user.statPoints > 0 && (
          <SystemCard title="Allocate Stat Points" glow delay={0.08}>
            <p className="text-xs text-amber-400 font-mono mb-3">You have <span className="text-lg font-bold">{user.statPoints}</span> points</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(user.stats) as [keyof UserStats, number][]).map(([key, val]) => {
                const c = STAT_CFG[key];
                return (
                  <div key={key} className="flex items-center gap-2 p-2 bg-white/[0.02] rounded-sm">
                    <span className="text-sm">{c.icon}</span>
                    <div className="flex-1"><p className="text-[10px] text-gray-500 uppercase">{c.label}</p><p className="font-mono text-sm text-white">{val}</p></div>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => allocateStat(key)}
                      className="w-7 h-7 flex items-center justify-center bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 rounded-sm hover:bg-cyan-500/30"><Plus size={14} /></motion.button>
                  </div>
                );
              })}
            </div>
          </SystemCard>
        )}

        <SystemCard title="Stat Radar" delay={0.1}>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="rgba(0, 212, 255, 0.1)" />
                <PolarAngleAxis dataKey="stat" tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                <Radar dataKey="value" stroke="#00d4ff" fill="#00d4ff" fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </SystemCard>

        <SystemCard title="Detailed Stats" delay={0.15}>
          <div className="space-y-2">
            {(Object.entries(user.stats) as [keyof UserStats, number][]).map(([key, val]) => {
              const c = STAT_CFG[key]; const maxVal = Math.max(20, val + 5); const pct = (val / maxVal) * 100;
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-sm w-5">{c.icon}</span>
                  <span className="text-[10px] text-gray-500 uppercase w-16 font-mono">{c.label}</span>
                  <div className="flex-1 h-2 bg-white/[0.05] rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full" style={{ backgroundColor: c.color }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
                  </div>
                  <span className="font-mono text-sm text-white w-8 text-right">{val}</span>
                </div>
              );
            })}
          </div>
        </SystemCard>

        <SystemCard title="XP Over Time" delay={0.2}>
          <div className="flex gap-2 mb-3">
            {([7, 30, 90] as const).map(r => (
              <button key={r} onClick={() => setTimeRange(r)} className={`text-[10px] px-2 py-1 rounded-sm font-mono transition-colors ${timeRange === r ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-500 border border-transparent'}`}>{r}D</button>
            ))}
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={xpChartData}>
                <defs><linearGradient id="xpG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} /><stop offset="95%" stopColor="#00d4ff" stopOpacity={0} /></linearGradient></defs>
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={{ stroke: 'rgba(0,212,255,0.1)' }} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{ backgroundColor: '#0a0e1e', border: '1px solid rgba(0,212,255,0.3)', borderRadius: '2px', fontSize: '11px' }} />
                <Area type="monotone" dataKey="xp" stroke="#00d4ff" strokeWidth={2} fill="url(#xpG)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SystemCard>

        <SystemCard title="Activity Breakdown" delay={0.25}>
          {categoryData.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="h-36 w-36 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={categoryData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={3} dataKey="value">
                    {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie></PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5">
                {categoryData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-xs text-gray-400 flex-1">{item.name}</span>
                    <span className="text-xs text-white font-mono">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-center py-6 text-xs text-gray-600 font-mono">Complete quests to see breakdown.</p>}
        </SystemCard>

        <SystemCard title="Quest Completion" delay={0.3}>
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(0,212,255,0.1)" strokeWidth="3" />
                <motion.path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#00d4ff" strokeWidth="3" strokeDasharray={`${compRate}, 100`} initial={{ strokeDasharray: '0, 100' }} animate={{ strokeDasharray: `${compRate}, 100` }} transition={{ duration: 1, delay: 0.3 }} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center"><span className="font-mono text-lg font-bold text-white">{compRate}%</span></div>
            </div>
            <div>
              <p className="text-sm text-white font-medium">{completedQ} of {totalQ} quests</p>
              <p className="text-[10px] text-gray-500 font-mono mt-1"><TrendingUp size={10} className="inline mr-1" />{totalQ === 0 ? 'Create quests to track.' : 'Keep pushing, Hunter.'}</p>
            </div>
          </div>
        </SystemCard>

        <SystemCard title="Monthly Analysis" delay={0.35}>
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1 text-gray-500 hover:text-cyan-400"><ChevronLeft size={16} /></button>
            <div className="flex items-center gap-2"><CalendarDays size={14} className="text-cyan-400" /><span className="font-mono text-sm text-white">{MONTHS[selMonth]} {selYear}</span></div>
            <button onClick={nextMonth} className="p-1 text-gray-500 hover:text-cyan-400"><ChevronRight size={16} /></button>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="p-2 bg-white/[0.02] rounded-sm text-center"><p className="font-mono text-lg font-bold text-cyan-400">{monthlyData.totalXP}</p><p className="text-[9px] text-gray-500 uppercase">XP</p></div>
            <div className="p-2 bg-white/[0.02] rounded-sm text-center"><p className="font-mono text-lg font-bold text-white">{monthlyData.totalLogs}</p><p className="text-[9px] text-gray-500 uppercase">Activities</p></div>
            <div className="p-2 bg-white/[0.02] rounded-sm text-center"><p className="font-mono text-lg font-bold text-emerald-400">{monthlyData.completed}</p><p className="text-[9px] text-gray-500 uppercase">Completed</p></div>
            <div className="p-2 bg-white/[0.02] rounded-sm text-center"><p className="font-mono text-lg font-bold text-red-400">{monthlyData.failed}</p><p className="text-[9px] text-gray-500 uppercase">Failed</p></div>
          </div>
          {monthlyData.totalLogs > 0 ? (
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData.barData}>
                  <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 7 }} axisLine={{ stroke: 'rgba(0,212,255,0.1)' }} tickLine={false} interval={4} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 8 }} axisLine={false} tickLine={false} width={25} />
                  <Tooltip contentStyle={{ backgroundColor: '#0a0e1e', border: '1px solid rgba(0,212,255,0.3)', borderRadius: '2px', fontSize: '10px' }} />
                  <Bar dataKey="xp" fill="#00d4ff" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-center py-4 text-xs text-gray-600 font-mono">No data for this month.</p>}
        </SystemCard>
      </div>
    </div>
  );
}
