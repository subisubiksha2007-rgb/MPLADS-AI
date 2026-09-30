import React, { useState } from 'react';
import { EnrichedProject } from '../types';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import { BarChart3, MapPin } from 'lucide-react';

interface ChartsProps {
  projects: EnrichedProject[];
}

const STATUS_COLORS: Record<string, string> = {
  Ongoing: '#3b82f6',
  Delayed: '#f59e0b',
  Completed: '#10b981'
};

const RISK_COLORS: Record<string, string> = {
  'Low Risk': '#10b981',
  'Medium Risk': '#f59e0b',
  'High Risk': '#ef4444'
};

export const Charts: React.FC<ChartsProps> = ({ projects }) => {
  const [activeTab, setActiveTab] = useState<'core' | 'district-category'>('core');

  // 1. Status Data
  const statusCounts = projects.reduce<Record<string, number>>((acc, p) => {
    acc[p.completion_status] = (acc[p.completion_status] || 0) + 1;
    return acc;
  }, {});

  const statusData = Object.entries(statusCounts).map(([name, value]) => ({
    name,
    value,
    color: STATUS_COLORS[name] || '#94a3b8'
  }));

  // 2. Risk Data
  const riskLevels = ['Low Risk', 'Medium Risk', 'High Risk'];
  const riskCounts = projects.reduce<Record<string, number>>((acc, p) => {
    acc[p.risk_level] = (acc[p.risk_level] || 0) + 1;
    return acc;
  }, {});

  const riskData = riskLevels.map(level => ({
    name: level,
    count: riskCounts[level] || 0,
    fill: RISK_COLORS[level]
  }));

  // 3. Approved vs Spent (Top 10)
  const fundData = projects.slice(0, 10).map(p => ({
    name: p.project_name.length > 14 ? p.project_name.substring(0, 13) + '…' : p.project_name,
    fullName: p.project_name,
    approved: Math.round((p.approved_amount / 100000) * 10) / 10,
    spent: Math.round((p.spent_amount / 100000) * 10) / 10
  }));

  // 4. Fund Utilization vs Project Progress (Scatter / Correlation)
  const scatterData = projects.map(p => ({
    id: p.project_id,
    name: p.project_name,
    progress: p.progress_percent,
    utilization: p.utilization_percent,
    risk: p.risk_level,
    delay: p.delay_days,
    fill: p.risk_level === 'High Risk' ? '#ef4444' : p.risk_level === 'Medium Risk' ? '#f59e0b' : '#10b981'
  }));

  // 5. District-wise Project Count
  const districtCounts = projects.reduce<Record<string, number>>((acc, p) => {
    acc[p.district] = (acc[p.district] || 0) + 1;
    return acc;
  }, {});
  const districtCountData = Object.entries(districtCounts).map(([district, count]) => ({
    district,
    count
  })).sort((a, b) => b.count - a.count);

  // 6. District-wise Average Delay
  const districtDelays = projects.reduce<Record<string, { totalDelay: number; count: number }>>((acc, p) => {
    if (!acc[p.district]) acc[p.district] = { totalDelay: 0, count: 0 };
    acc[p.district].totalDelay += p.delay_days;
    acc[p.district].count += 1;
    return acc;
  }, {});
  const districtAvgDelayData = Object.entries(districtDelays).map(([district, stats]) => ({
    district,
    avgDelay: Math.round((stats.totalDelay / stats.count) * 10) / 10
  })).sort((a, b) => b.avgDelay - a.avgDelay);

  // 7. Category-wise Project Distribution
  const categoryCounts = projects.reduce<Record<string, number>>((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});
  const categoryData = Object.entries(categoryCounts).map(([category, count]) => ({
    category,
    count
  })).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-4">
      {/* Header and View Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <span>Interactive Scheme Analytics</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Visualizing status distribution, risk profiles, fund expenditures, and district performance
          </p>
        </div>

        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-medium">
          <button
            onClick={() => setActiveTab('core')}
            className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'core'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Core Analytics
          </button>
          <button
            onClick={() => setActiveTab('district-category')}
            className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'district-category'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            District &amp; Category
          </button>
        </div>
      </div>

      {activeTab === 'core' ? (
        <div className="space-y-6">
          {/* Top Row: Status + Risk */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Project Status Distribution */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-semibold text-white">📊 Project Status Distribution</h4>
                  <p className="text-xs text-slate-400">Ongoing, Delayed, and Completed works</p>
                </div>
                <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  {projects.length} Works
                </span>
              </div>
              <div className="h-64 w-full">
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} (${(((percent ?? 0) * 100)).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`status-cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '0.5rem',
                          color: '#f8fafc'
                        }}
                        formatter={(val: any) => [`${val} projects`, 'Count']}
                      />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs">No status data</div>
                )}
              </div>
            </div>

            {/* 2. Risk Distribution */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-semibold text-white">🚨 Risk Distribution</h4>
                  <p className="text-xs text-slate-400">Scored by multi-factor anomaly engine</p>
                </div>
                <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  3 Tiers
                </span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={riskData} margin={{ top: 20, right: 20, left: -20, bottom: 5 }}>
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.5rem',
                        color: '#f8fafc'
                      }}
                      formatter={(val: any) => [`${val} projects`, 'Count']}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} label={{ position: 'top', fill: '#e2e8f0', fontSize: 12 }}>
                      {riskData.map((entry, index) => (
                        <Cell key={`risk-bar-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Bottom Row: Approved vs Spent & Fund Utilization vs Progress */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 3. Approved vs Spent Amount */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4">
                <div>
                  <h4 className="text-sm font-semibold text-white">💰 Approved vs Spent Amount</h4>
                  <p className="text-xs text-slate-400">Top 10 Monitored Works (₹ in Lakhs)</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-slate-300">
                    <span className="w-2.5 h-2.5 rounded bg-blue-500 inline-block"></span> Approved
                  </span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block"></span> Spent
                  </span>
                </div>
              </div>

              <div className="h-72 w-full">
                {fundData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={fundData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                      <XAxis
                        dataKey="name"
                        stroke="#64748b"
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                      />
                      <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} unit="L" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '0.5rem',
                          color: '#f8fafc'
                        }}
                        formatter={(val: any, name: any) => [`₹${val} Lakhs`, name === 'approved' ? 'Approved' : 'Spent']}
                        labelFormatter={(label: any, payload: any) => payload?.[0]?.payload?.fullName || label}
                      />
                      <Bar dataKey="approved" name="approved" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="spent" name="spent" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs">No project funds available</div>
                )}
              </div>
            </div>

            {/* 4. Fund Utilization vs Project Progress (Mismatch plot) */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4">
                <div>
                  <h4 className="text-sm font-semibold text-white">⚡ Fund Utilization vs Project Progress</h4>
                  <p className="text-xs text-slate-400">Identifies high spend (&gt;80%) with low progress (&lt;40%)</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-red-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> High Risk
                  </span>
                  <span className="flex items-center gap-1 text-emerald-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Normal
                  </span>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 15, right: 20, bottom: 20, left: -10 }}>
                    <XAxis
                      type="number"
                      dataKey="progress"
                      name="Physical Progress"
                      unit="%"
                      domain={[0, 100]}
                      stroke="#64748b"
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      label={{ value: 'Physical Progress (%)', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 11 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="utilization"
                      name="Fund Utilization"
                      unit="%"
                      domain={[0, 105]}
                      stroke="#64748b"
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      label={{ value: 'Utilization (%)', angle: -90, position: 'insideLeft', offset: 15, fill: '#94a3b8', fontSize: 11 }}
                    />
                    <ZAxis range={[70, 70]} />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.5rem',
                        color: '#f8fafc'
                      }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 border border-slate-700 p-2.5 rounded shadow-lg text-xs space-y-1">
                              <p className="font-bold text-white">{data.name} ({data.id})</p>
                              <p className="text-slate-300">Utilization: <span className="font-mono text-amber-400">{data.utilization}%</span></p>
                              <p className="text-slate-300">Progress: <span className="font-mono text-indigo-400">{data.progress}%</span></p>
                              <p className="text-slate-300">Delay: <span className="font-mono text-rose-400">{data.delay} days</span></p>
                              <p className="font-semibold text-xs mt-1" style={{ color: data.fill }}>{data.risk}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Scatter name="Projects" data={scatterData}>
                      {scatterData.map((entry, index) => (
                        <Cell key={`scatter-cell-${index}`} fill={entry.fill} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* District & Category Analytics View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 5. District-wise Project Count */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-white">📍 District-wise Project Count</h4>
              <p className="text-xs text-slate-400">Distribution across administrative regions</p>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={districtCountData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <XAxis
                    dataKey="district"
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', color: '#f8fafc' }}
                    formatter={(val: any) => [`${val} works`, 'Projects']}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 6. District-wise Average Delay */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-white">⏱️ District-wise Average Delay</h4>
              <p className="text-xs text-slate-400">Mean schedule slippage in days</p>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={districtAvgDelayData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <XAxis
                    dataKey="district"
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} unit="d" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', color: '#f8fafc' }}
                    formatter={(val: any) => [`${val} days`, 'Avg Delay']}
                  />
                  <Bar dataKey="avgDelay" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 7. Category-wise Project Distribution */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-white">🏷️ Category-wise Distribution</h4>
              <p className="text-xs text-slate-400">Breakdown by public works domain</p>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 15, left: 35, bottom: 5 }}>
                  <XAxis type="number" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="category" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', color: '#f8fafc' }}
                    formatter={(val: any) => [`${val} works`, 'Projects']}
                  />
                  <Bar dataKey="count" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
