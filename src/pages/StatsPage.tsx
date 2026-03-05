import { useStats } from '../hooks/useStats';
import { useState } from 'react';
import { MessageSquare, FolderOpen, Wrench, Zap, ArrowDownUp, Activity } from 'lucide-react';
import { StatsSkeleton } from '../components/shared/Skeleton';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { formatTokens } from '../lib/utils';

const COLORS = ['#7ec8a0', '#c878a0', '#5a9ec8', '#d08050', '#48a8b8', '#e06060', '#9878b8', '#48a890'];

type Range = 7 | 30 | 90 | 'all';

export function StatsPage() {
  const { stats, loading, error } = useStats();
  const [range, setRange] = useState<Range>(30);

  if (loading) {
    return <StatsSkeleton />;
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center h-full text-[#9aafa3]">
        <p>Failed to load stats: {error}</p>
      </div>
    );
  }

  const activityData = range === 'all'
    ? stats.dailyActivity
    : stats.dailyActivity.slice(-range);

  const totalTokens = stats.totalInputTokens + stats.totalOutputTokens;
  const inputPct = totalTokens > 0 ? (stats.totalInputTokens / totalTokens) * 100 : 50;
  const outputPct = 100 - inputPct;

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <h1 className="text-2xl font-bold text-[#2d3d34] mb-6">Usage Statistics</h1>

      {/* 6 Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8 xl:grid-cols-6">
        <SummaryCard icon={<MessageSquare size={20} />} label="Total Sessions" value={stats.totalSessions.toLocaleString()} color="#7ec8a0" />
        <SummaryCard icon={<ArrowDownUp size={20} />} label="Input Tokens" value={formatTokens(stats.totalInputTokens)} color="#5a9ec8" />
        <SummaryCard icon={<Activity size={20} />} label="Output Tokens" value={formatTokens(stats.totalOutputTokens)} color="#c878a0" />
        <SummaryCard icon={<Wrench size={20} />} label="Tool Calls" value={stats.totalToolCalls.toLocaleString()} color="#d08050" />
        <SummaryCard icon={<Zap size={20} />} label="Avg Tokens/Session" value={formatTokens(stats.avgTokensPerSession)} color="#48a8b8" />
        <SummaryCard icon={<FolderOpen size={20} />} label="Projects" value={String(stats.projectCount)} color="#9878b8" />
      </div>

      {/* Daily Activity with range switcher */}
      {stats.dailyActivity.length > 0 && (
        <div className="bg-white rounded-lg border border-[#d0ddd5] p-4 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-[#2d3d34]">Daily Activity</h2>
            <div className="flex gap-1">
              {([7, 30, 90, 'all'] as Range[]).map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    range === r
                      ? 'bg-[#7ec8a0] text-white'
                      : 'bg-[#f0f5f2] text-[#6b8578] hover:bg-[#d4e6da]'
                  }`}
                >
                  {r === 'all' ? 'All' : `${r}d`}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={activityData}>
              <defs>
                <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7ec8a0" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#7ec8a0" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#9aafa3', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#9aafa3', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #d0ddd5', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                labelStyle={{ color: '#6b8578' }}
              />
              <Area type="monotone" dataKey="sessions" stroke="#7ec8a0" fill="url(#colorSessions)" strokeWidth={2} />
              <Area type="monotone" dataKey="messages" stroke="#5a9ec8" fill="transparent" strokeDasharray="5 5" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Model Usage - Donut with side legend */}
        {stats.modelUsage.length > 0 && (
          <div className="bg-white rounded-lg border border-[#d0ddd5] p-4 shadow-sm">
            <h2 className="text-lg font-medium text-[#2d3d34] mb-4">Model Usage (by tokens)</h2>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={180} height={200}>
                <PieChart>
                  <Pie
                    data={stats.modelUsage}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={85}
                    dataKey="count"
                    nameKey="model"
                  >
                    {stats.modelUsage.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #d0ddd5', borderRadius: 8 }}
                    formatter={(value: any) => formatTokens(Number(value) || 0)}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2 min-w-0">
                {stats.modelUsage.slice(0, 6).map((m, i) => (
                  <div key={i} className="flex items-center gap-2 min-w-0">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-[#2d3d34] truncate">
                        {m.model.replace('claude-', '').split('-').slice(0, 2).join('-')}
                      </div>
                      <div className="text-xs text-[#9aafa3]">{formatTokens(m.count)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Projects */}
        {stats.projectDistribution.length > 0 && (
          <div className="bg-white rounded-lg border border-[#d0ddd5] p-4 shadow-sm">
            <h2 className="text-lg font-medium text-[#2d3d34] mb-4">Projects</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.projectDistribution.slice(0, 10)} layout="vertical">
                <XAxis type="number" tick={{ fill: '#9aafa3', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  type="category" dataKey="project" width={120}
                  tick={{ fill: '#6b8578', fontSize: 11 }} tickLine={false} axisLine={false}
                  tickFormatter={(v: string) => v.replace(/--/g, '/').split('/').pop() || v}
                />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #d0ddd5', borderRadius: 8 }}
                />
                <Bar dataKey="sessions" fill="#7ec8a0" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Token Breakdown Panel */}
      {totalTokens > 0 && (
        <div className="bg-white rounded-lg border border-[#d0ddd5] p-4 mb-6 shadow-sm">
          <h2 className="text-lg font-medium text-[#2d3d34] mb-4">Token Breakdown</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#5a9ec8] font-medium">Input</span>
                <span className="text-[#6b8578]">{formatTokens(stats.totalInputTokens)} ({inputPct.toFixed(1)}%)</span>
              </div>
              <div className="h-3 bg-[#f0f5f2] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#5a9ec8] rounded-full transition-all"
                  style={{ width: `${inputPct}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#c878a0] font-medium">Output</span>
                <span className="text-[#6b8578]">{formatTokens(stats.totalOutputTokens)} ({outputPct.toFixed(1)}%)</span>
              </div>
              <div className="h-3 bg-[#f0f5f2] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#c878a0] rounded-full transition-all"
                  style={{ width: `${outputPct}%` }}
                />
              </div>
            </div>
            <div className="text-xs text-[#9aafa3] pt-1">
              Output/Input ratio: {stats.totalInputTokens > 0 ? (stats.totalOutputTokens / stats.totalInputTokens).toFixed(2) : '—'}x
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string; color: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-[#d0ddd5] p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}18`, color }}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-xl font-bold text-[#2d3d34] truncate">{value}</div>
          <div className="text-xs text-[#9aafa3]">{label}</div>
        </div>
      </div>
    </div>
  );
}
