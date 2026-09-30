import React, { useState } from 'react';
import { EnrichedProject } from '../types';
import { AlertTriangle, ArrowRight, LayoutGrid, Table, Calendar, MapPin } from 'lucide-react';
import { formatINR } from '../utils/formatters';

interface HighRiskTableProps {
  projects: EnrichedProject[];
  onSelectProject?: (projectName: string) => void;
}

export const HighRiskTable: React.FC<HighRiskTableProps> = ({ projects, onSelectProject }) => {
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const highRiskProjects = projects.filter(p => p.risk_level === 'High Risk');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🚨</span>
            <h3 className="text-lg font-bold text-white tracking-tight">High-Risk Project Alerts</h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-semibold">
              {highRiskProjects.length} Projects Requiring Field Audit
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Projects exhibiting severe timeline delays or extreme disbursement mismatch with physical output
          </p>
        </div>

        {/* View toggle */}
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-medium">
          <button
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'cards' ? 'bg-red-950/80 text-red-200 border border-red-800/50 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Alert Cards
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'table' ? 'bg-red-950/80 text-red-200 border border-red-800/50 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Table className="w-3.5 h-3.5" /> Table View
          </button>
        </div>
      </div>

      {highRiskProjects.length > 0 ? (
        viewMode === 'cards' ? (
          /* Professional Alert Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {highRiskProjects.map((p) => {
              const utilPercent = p.utilization_percent;

              return (
                <div
                  key={p.project_id}
                  className="bg-slate-950 border border-red-500/30 rounded-xl p-4.5 space-y-3.5 relative overflow-hidden group hover:border-red-500/60 transition shadow-sm"
                >
                  {/* Subtle red accent bar */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500" />

                  {/* Top card info */}
                  <div className="flex items-start justify-between gap-2 pt-1">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-red-400 bg-red-950/80 px-2 py-0.5 rounded border border-red-800/40">
                          {p.project_id}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" /> {p.district}
                        </span>
                        <span className="text-xs text-slate-500">· {p.category}</span>
                      </div>
                      <h4 className="text-base font-bold text-white mt-1 group-hover:text-red-300 transition">
                        {p.project_name}
                      </h4>
                    </div>

                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 shrink-0">
                      🔴 High Risk
                    </span>
                  </div>

                  {/* Anomaly Reason Banner */}
                  <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-900/50 text-xs text-red-200 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-red-300 block">Key Anomaly Reason:</span>
                      <span className="text-red-200/90 leading-tight">{p.risk_reason}</span>
                    </div>
                  </div>

                  {/* 4 Core Metrics Grid */}
                  <div className="grid grid-cols-4 gap-2 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Approved</span>
                      <span className="font-mono font-semibold text-white">{formatINR(p.approved_amount)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Spent</span>
                      <span className="font-mono font-semibold text-amber-400">{formatINR(p.spent_amount)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Progress</span>
                      <span className="font-mono font-semibold text-indigo-400">{p.progress_percent}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Delay</span>
                      <span className="font-mono font-semibold text-rose-400">{p.delay_days} days</span>
                    </div>
                  </div>

                  {/* Progress & Utilization Comparison Bar */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Budget Spent: <strong className="text-amber-400">{utilPercent}%</strong></span>
                      <span className="text-slate-400">Work Done: <strong className="text-indigo-400">{p.progress_percent}%</strong></span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full" style={{ width: `${Math.min(utilPercent, 100)}%` }} />
                      </div>
                      <div className="bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${p.progress_percent}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Footer Action Button */}
                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate max-w-[260px]">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span className="text-slate-300">{p.completion_status}</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-400 truncate" title={p.delay_reason}>{p.delay_reason}</span>
                    </span>
                    <button
                      onClick={() => onSelectProject?.(p.project_name)}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                    >
                      <span>View Project</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View for High Risk */
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-700">
                <tr>
                  <th className="py-3 px-3">Project ID</th>
                  <th className="py-3 px-3">Project Name</th>
                  <th className="py-3 px-3">District</th>
                  <th className="py-3 px-3 text-right">Approved</th>
                  <th className="py-3 px-3 text-right">Spent</th>
                  <th className="py-3 px-3 text-center">Utilization</th>
                  <th className="py-3 px-3 text-center">Progress</th>
                  <th className="py-3 px-3 text-center">Delay</th>
                  <th className="py-3 px-3">Key Anomaly Reason</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {highRiskProjects.map((p) => (
                  <tr
                    key={p.project_id}
                    className="hover:bg-slate-800/50 transition cursor-pointer"
                    onClick={() => onSelectProject?.(p.project_name)}
                  >
                    <td className="py-3 px-3 font-mono font-medium text-red-400">
                      {p.project_id}
                    </td>
                    <td className="py-3 px-3 font-medium text-white max-w-[150px] truncate" title={p.project_name}>
                      {p.project_name}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {p.district}
                    </td>
                    <td className="py-3 px-3 text-right font-mono">
                      {formatINR(p.approved_amount)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-red-400">
                      {formatINR(p.spent_amount)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-amber-400 font-bold">
                      {p.utilization_percent}%
                    </td>
                    <td className="py-3 px-3 text-center font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-800/40">
                        {p.progress_percent}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-red-400 font-bold">
                      {p.delay_days}d
                    </td>
                    <td className="py-3 px-3 text-red-200 text-[11px] max-w-xs leading-snug">
                      {p.risk_reason}
                    </td>
                    <td className="py-3 px-3 text-center" onClick={(e) => { e.stopPropagation(); onSelectProject?.(p.project_name); }}>
                      <button
                        className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[11px] font-semibold flex items-center gap-1 mx-auto transition cursor-pointer"
                      >
                        View Project
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 text-xs flex items-center gap-2">
          <span>✅ No high-risk projects found matching current criteria.</span>
        </div>
      )}
    </div>
  );
};
