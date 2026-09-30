import React from 'react';
import { EnrichedProject } from '../types';
import { ShieldAlert, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface RiskAnalysisProps {
  projects: EnrichedProject[];
  onSelectProject?: (projectName: string) => void;
}

export const RiskAnalysis: React.FC<RiskAnalysisProps> = ({ projects }) => {
  const highRisk = projects.filter(p => p.risk_level === 'High Risk');
  const mediumRisk = projects.filter(p => p.risk_level === 'Medium Risk');
  const lowRisk = projects.filter(p => p.risk_level === 'Low Risk');

  // Breakdown of specific reasons across the dataset
  const reasonStats = [
    {
      label: 'High expenditure compared with work progress',
      description: 'Spent >80% of sanctioned funds while physical progress remains <40%',
      weight: '+50 pts',
      count: projects.filter(p => p.utilization_percent > 80 && p.progress_percent < 40).length,
      severity: 'Critical'
    },
    {
      label: 'Significant project delay (>60 days)',
      description: 'Severe timeline slippage requiring escalation to executing agency',
      weight: '+30 pts',
      count: projects.filter(p => p.delay_days > 60).length,
      severity: 'High'
    },
    {
      label: 'Project delay requires monitoring (31-60 days)',
      description: 'Moderate timeline slippage monitored for compounding delays',
      weight: '+15 pts',
      count: projects.filter(p => p.delay_days > 30 && p.delay_days <= 60).length,
      severity: 'Moderate'
    },
    {
      label: 'Very low work progress (<30%)',
      description: 'Work execution stalled or in preliminary status after fund drawdown',
      weight: '+20 pts',
      count: projects.filter(p => p.progress_percent < 30).length,
      severity: 'High'
    },
    {
      label: 'AI detected an unusual pattern',
      description: 'Isolation Forest flags anomalous multivariate feature divergence',
      weight: '+20 pts',
      count: projects.filter(p => p.ai_anomaly === 'Anomaly Detected').length,
      severity: 'AI Flag'
    }
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span>🛡️</span> Risk Scoring &amp; Classification Analysis
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Transparent composite scoring rules identifying vulnerability and project distress
          </p>
        </div>

        {/* 3 Tier Summary Badges */}
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            🔴 High Risk ({highRisk.length})
          </span>
          <span className="px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            🟡 Medium Risk ({mediumRisk.length})
          </span>
          <span className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            🟢 Low Risk ({lowRisk.length})
          </span>
        </div>
      </div>

      {/* Scoring Methodology Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* High Risk Tier card */}
        <div className="bg-slate-950 p-4 rounded-xl border border-red-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-red-400 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" /> 🔴 High Risk
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800/40">
              Score &ge; 70
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Severe financial mismatch, stalled physical progress with prolonged delay, or combined anomaly flags. Immediate field inspection recommended.
          </p>
          <div className="pt-2 text-xs text-red-300 font-medium flex items-center justify-between border-t border-slate-900">
            <span>{highRisk.length} active works</span>
            <span className="text-[11px] text-slate-500">Requires audit</span>
          </div>
        </div>

        {/* Medium Risk Tier card */}
        <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> 🟡 Medium Risk
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/40">
              Score 40 - 69
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Moderate schedule variance or progress lag without extreme fund exhaustion. Requires monthly monitoring and milestone tracking.
          </p>
          <div className="pt-2 text-xs text-amber-300 font-medium flex items-center justify-between border-t border-slate-900">
            <span>{mediumRisk.length} active works</span>
            <span className="text-[11px] text-slate-500">Under review</span>
          </div>
        </div>

        {/* Low Risk Tier card */}
        <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-emerald-400 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" /> 🟢 Low Risk
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/40">
              Score &lt; 40
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Normal execution trajectory. Fund disbursement aligns with milestone achievements, with minimal or zero schedule slippage.
          </p>
          <div className="pt-2 text-xs text-emerald-300 font-medium flex items-center justify-between border-t border-slate-900">
            <span>{lowRisk.length} active works</span>
            <span className="text-[11px] text-slate-500">On schedule</span>
          </div>
        </div>
      </div>

      {/* Triggers Breakdown Table */}
      <div className="space-y-2 pt-2">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-indigo-400" />
          Scoring Rules &amp; Detected Triggers
        </h4>
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-700">
              <tr>
                <th className="py-2.5 px-3">Risk Trigger Condition</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-center">Score Weight</th>
                <th className="py-2.5 px-3 text-center">Severity</th>
                <th className="py-2.5 px-3 text-center">Projects Affected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {reasonStats.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition">
                  <td className="py-2.5 px-3 font-medium text-white">
                    {item.label}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                    {item.description}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-semibold text-indigo-400">
                    {item.weight}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      item.severity === 'Critical' ? 'bg-red-500/20 text-red-400' :
                      item.severity === 'High' ? 'bg-rose-500/20 text-rose-400' :
                      item.severity === 'Moderate' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-indigo-500/20 text-indigo-300'
                    }`}>
                      {item.severity}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-white">
                    {item.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
