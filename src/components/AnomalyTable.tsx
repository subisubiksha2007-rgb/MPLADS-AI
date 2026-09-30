import React from 'react';
import { EnrichedProject } from '../types';
import { AlertOctagon, CheckCircle2, Cpu, Eye } from 'lucide-react';
import { formatINR } from '../utils/formatters';

interface AnomalyTableProps {
  projects: EnrichedProject[];
  allProjects: EnrichedProject[];
  onSelectProject?: (projectName: string) => void;
}

export const AnomalyTable: React.FC<AnomalyTableProps> = ({ projects, allProjects, onSelectProject }) => {
  const anomalies = projects.filter(p => p.ai_anomaly === 'Anomaly Detected');
  const normalCount = projects.filter(p => p.ai_anomaly === 'Normal').length;
  const highRiskAnomaliesCount = anomalies.filter(p => p.risk_level === 'High Risk').length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <h3 className="text-lg font-bold text-white tracking-tight">AI Anomaly Detection</h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
              Isolation Forest
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Machine-learning based multi-dimensional pattern evaluation of public works funds and timelines
          </p>
        </div>

        {/* 3 Metric Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs flex items-center gap-2">
            <span className="text-slate-400">Anomalies:</span>
            <span className="font-bold text-amber-400 font-mono">{anomalies.length}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs flex items-center gap-2">
            <span className="text-slate-400">Normal Works:</span>
            <span className="font-bold text-slate-300 font-mono">{normalCount}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs flex items-center gap-2">
            <span className="text-slate-400">High-Risk Flagged:</span>
            <span className="font-bold text-red-400 font-mono">{highRiskAnomaliesCount}</span>
          </div>
        </div>
      </div>

      {/* Explanatory banner */}
      <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-300 flex items-start gap-3">
        <Cpu className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-200">
            How the AI identifies unusual patterns:
          </p>
          <p className="text-slate-400 leading-relaxed">
            The algorithm constructs multi-dimensional decision isolation trees using 4 core parameters: <span className="text-slate-200">sanctioned allocation</span>, <span className="text-slate-200">disbursement velocity</span>, <span className="text-slate-200">physical completion %</span>, and <span className="text-slate-200">schedule delay days</span>. Projects that separate quickly in the feature space—such as consuming &gt;80% of budget while lagging below 40% progress with extended delays—are flagged for priority field verification.
          </p>
          <p className="text-amber-400/90 text-[11px] font-medium pt-0.5">
            ⚠️ Note: AI anomaly detection flags unusual patterns for further investigation. An anomaly is not proof of fraud.
          </p>
        </div>
      </div>

      {/* Table */}
      {anomalies.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-700">
              <tr>
                <th className="py-3 px-3">Project ID</th>
                <th className="py-3 px-3">Project Name</th>
                <th className="py-3 px-3">District</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-right">Approved Amount</th>
                <th className="py-3 px-3 text-right">Spent Amount</th>
                <th className="py-3 px-3 text-center">Utilization %</th>
                <th className="py-3 px-3 text-center">Progress %</th>
                <th className="py-3 px-3 text-center">Delay Days</th>
                <th className="py-3 px-3">Risk Level</th>
                <th className="py-3 px-3">AI Anomaly Status</th>
                <th className="py-3 px-3">Why Flagged (Reason)</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {anomalies.map((p) => (
                <tr
                  key={p.project_id}
                  className="hover:bg-slate-800/50 transition cursor-pointer"
                  onClick={() => onSelectProject?.(p.project_name)}
                >
                  <td className="py-3 px-3 font-mono font-medium text-indigo-400">
                    {p.project_id}
                  </td>
                  <td className="py-3 px-3 font-medium text-white max-w-[150px] truncate" title={p.project_name}>
                    {p.project_name}
                  </td>
                  <td className="py-3 px-3 text-slate-300">
                    {p.district}
                  </td>
                  <td className="py-3 px-3 text-slate-400">
                    {p.category}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {formatINR(p.approved_amount)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-amber-400">
                    {formatINR(p.spent_amount)}
                  </td>
                  <td className="py-3 px-3 text-center font-mono">
                    <span className={`px-1.5 py-0.5 rounded ${p.utilization_percent > 80 ? 'bg-amber-500/20 text-amber-400' : 'text-slate-300'}`}>
                      {p.utilization_percent}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center font-mono">
                    <span className={`px-1.5 py-0.5 rounded ${p.progress_percent < 40 ? 'bg-red-500/20 text-red-400' : 'text-slate-300'}`}>
                      {p.progress_percent}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-rose-400 font-semibold">
                    {p.delay_days}d
                  </td>
                  <td className="py-3 px-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                      p.risk_level === 'High Risk'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : p.risk_level === 'Medium Risk'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {p.risk_level === 'High Risk' ? '🔴 High Risk' : p.risk_level === 'Medium Risk' ? '🟡 Medium Risk' : '🟢 Low Risk'}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                      <AlertOctagon className="w-3.5 h-3.5" />
                      {p.ai_anomaly}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-300 text-[11px] max-w-xs leading-snug">
                    {p.risk_reason}
                  </td>
                  <td className="py-3 px-3 text-center" onClick={(e) => { e.stopPropagation(); onSelectProject?.(p.project_name); }}>
                    <button
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded text-[11px] font-medium inline-flex items-center gap-1 transition cursor-pointer"
                    >
                      <Eye className="w-3 h-3" /> Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-3 text-emerald-300 text-xs">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          <span>✅ No unusual patterns detected for the current filter criteria ({allProjects.length} total monitored works in registry).</span>
        </div>
      )}
    </div>
  );
};
