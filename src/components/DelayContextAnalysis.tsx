import React, { useState } from 'react';
import { EnrichedProject } from '../types';
import {
  CloudRain,
  AlertTriangle,
  Clock,
  CheckCircle2,
  CalendarCheck,
  Eye,
  Info
} from 'lucide-react';

interface DelayContextAnalysisProps {
  projects: EnrichedProject[];
  onSelectProject?: (projectName: string) => void;
}

export const DelayContextAnalysis: React.FC<DelayContextAnalysisProps> = ({
  projects,
  onSelectProject,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'justified' | 'investigation'>('all');

  const delayedProjects = projects.filter(p => p.delay_days > 0);
  const justifiedCount = projects.filter(p => p.delay_context_status === 'Contextual / Justified Delay').length;
  const investigationCount = projects.filter(p => p.delay_context_status === 'Delay Requires Investigation').length;

  const filtered = delayedProjects.filter(p => {
    if (filterType === 'justified') return p.delay_context_status === 'Contextual / Justified Delay';
    if (filterType === 'investigation') return p.delay_context_status === 'Delay Requires Investigation';
    return true;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌧️</span>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Delay Context Analysis
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold font-mono">
              Weather &amp; Regulatory Decoupling
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Differentiating weather calamities and statutory clearances from unexcused project timeline slippage
          </p>
        </div>

        {/* Filter Toggle */}
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-medium">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
              filterType === 'all' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Delayed ({delayedProjects.length})
          </button>
          <button
            onClick={() => setFilterType('justified')}
            className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
              filterType === 'justified' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            🟢 Contextual ({justifiedCount})
          </button>
          <button
            onClick={() => setFilterType('investigation')}
            className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
              filterType === 'investigation' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            🟡 Requires Investigation ({investigationCount})
          </button>
        </div>
      </div>

      {/* Explanatory Policy Card (Explicit Requirement) */}
      <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
        <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
          <Info className="w-4 h-4" />
          <span>Core Evaluation Principle: Context-Aware Delay Scoring</span>
        </div>
        <p className="text-xs text-slate-200 leading-relaxed">
          <strong>Delay alone does not indicate fraud.</strong> The system considers the documented reason, regional weather alerts, and formal government extensions before increasing risk. Projects with legitimate natural delays (such as monsoon inundation in the Cauvery delta or coastal CRZ approvals) are classified as <span className="text-emerald-400 font-semibold">Contextual / Justified Delays</span> and are not penalized with artificial risk score inflation.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
          <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-200">
            <span className="font-semibold block flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 🟢 Contextual / Justified Delay
            </span>
            <span className="text-[11px] text-emerald-300/80 mt-0.5 block">
              Heavy Rainfall, Flood, Calamity, or Approved Extension. Risk score is preserved without delay penalty.
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/30 text-amber-200">
            <span className="font-semibold block flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> 🟡 Delay Requires Investigation
            </span>
            <span className="text-[11px] text-amber-300/80 mt-0.5 block">
              Severe delay (&gt;30d) with no documented reason, no approved extension, lagging progress, and high budget exhaustion.
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            <span className="font-semibold block flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" /> ⏱️ Normal Schedule Timeline
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Delays &le; 15 days within expected civil construction tolerance windows.
            </span>
          </div>
        </div>
      </div>

      {/* Projects Table with Delay Reasons */}
      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-800/80 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-700">
            <tr>
              <th className="py-2.5 px-3">Project ID</th>
              <th className="py-2.5 px-3">Project Name &amp; District</th>
              <th className="py-2.5 px-3 text-center">Delay Days</th>
              <th className="py-2.5 px-3">Documented Delay Reason</th>
              <th className="py-2.5 px-3">Supporting Event / Environmental Context</th>
              <th className="py-2.5 px-3 text-center">Approved Extension</th>
              <th className="py-2.5 px-3">Delay Classification</th>
              <th className="py-2.5 px-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.map((p) => (
              <tr key={p.project_id} className="hover:bg-slate-800/40 transition">
                <td className="py-2.5 px-3 font-mono font-bold text-indigo-400">
                  {p.project_id}
                </td>
                <td className="py-2.5 px-3 font-medium text-white max-w-[170px] truncate">
                  <span className="block">{p.project_name}</span>
                  <span className="text-[11px] text-slate-400">{p.district} · {p.category}</span>
                </td>
                <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-400">
                  {p.delay_days}d
                </td>
                <td className="py-2.5 px-3 font-medium text-slate-200">
                  <span className="flex items-center gap-1.5">
                    {p.delay_reason === 'Heavy Rainfall' || p.delay_reason === 'Flood' || p.delay_reason === 'Natural Calamity' ? (
                      <CloudRain className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                    <span>{p.delay_reason}</span>
                  </span>
                </td>
                <td className="py-2.5 px-3 text-[11px] text-slate-400 max-w-xs leading-snug">
                  {p.supporting_event}
                </td>
                <td className="py-2.5 px-3 text-center">
                  {p.approved_extension ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      <CalendarCheck className="w-3 h-3" /> Approved
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                      No Extension
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                      p.delay_context_status === 'Contextual / Justified Delay'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : p.delay_context_status === 'Delay Requires Investigation'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {p.delay_context_status === 'Contextual / Justified Delay'
                      ? '🟢 Contextual / Justified'
                      : p.delay_context_status === 'Delay Requires Investigation'
                      ? '🟡 Requires Investigation'
                      : '⏱️ Normal Timeline'}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-center">
                  <button
                    onClick={() => onSelectProject?.(p.project_name)}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded text-[10px] font-medium inline-flex items-center gap-1 transition cursor-pointer"
                  >
                    <Eye className="w-3 h-3" /> Inspect
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
