import React from 'react';
import { EnrichedProject } from '../types';
import { FolderGit2, Coins, TrendingUp, AlertTriangle, ShieldAlert, Percent } from 'lucide-react';
import { formatINR } from '../utils/formatters';

interface KPICardsProps {
  projects: EnrichedProject[];
}

export const KPICards: React.FC<KPICardsProps> = ({ projects }) => {
  const totalProjects = projects.length;
  const totalApproved = projects.reduce((acc, p) => acc + p.approved_amount, 0);
  const totalSpent = projects.reduce((acc, p) => acc + p.spent_amount, 0);
  const anomaliesCount = projects.filter(p => p.ai_anomaly === 'Anomaly Detected').length;
  const highRiskCount = projects.filter(p => p.risk_level === 'High Risk').length;

  const overallUtilization = totalApproved > 0
    ? ((totalSpent / totalApproved) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      {/* 1. Total Projects */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Total Projects</span>
          <FolderGit2 className="w-4 h-4 text-blue-400" />
        </div>
        <div className="text-2xl font-bold text-white tracking-tight">
          {totalProjects}
        </div>
        <p className="text-[11px] text-slate-500 mt-1">Monitored works</p>
      </div>

      {/* 2. Total Approved Funds */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Approved Funds</span>
          <Coins className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="text-2xl font-bold text-emerald-400 tracking-tight">
          {formatINR(totalApproved)}
        </div>
        <p className="text-[11px] text-slate-500 mt-1">Sanctioned allocation</p>
      </div>

      {/* 3. Total Expenditure */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Total Spent</span>
          <TrendingUp className="w-4 h-4 text-violet-400" />
        </div>
        <div className="text-2xl font-bold text-violet-400 tracking-tight">
          {formatINR(totalSpent)}
        </div>
        <p className="text-[11px] text-slate-500 mt-1">Cumulative disbursed</p>
      </div>

      {/* 4. Overall Fund Utilization % */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Fund Utilization</span>
          <Percent className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="text-2xl font-bold text-cyan-400 tracking-tight">
          {overallUtilization}%
        </div>
        <p className="text-[11px] text-slate-500 mt-1">Budget burn rate</p>
      </div>

      {/* 5. AI Anomalies Detected */}
      <div className={`bg-slate-900 border rounded-xl p-4 shadow-sm transition ${
        anomaliesCount > 0 ? 'border-amber-500/40 bg-amber-950/10' : 'border-slate-800'
      }`}>
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider">AI Anomalies</span>
          <AlertTriangle className={`w-4 h-4 ${anomaliesCount > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
        </div>
        <div className={`text-2xl font-bold tracking-tight ${anomaliesCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
          {anomaliesCount}
        </div>
        <p className="text-[11px] text-amber-500/80 mt-1">Pattern anomalies</p>
      </div>

      {/* 6. High-Risk Projects */}
      <div className={`bg-slate-900 border rounded-xl p-4 shadow-sm transition ${
        highRiskCount > 0 ? 'border-red-500/40 bg-red-950/10' : 'border-slate-800'
      }`}>
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider">High Risk</span>
          <ShieldAlert className={`w-4 h-4 ${highRiskCount > 0 ? 'text-red-400' : 'text-slate-500'}`} />
        </div>
        <div className={`text-2xl font-bold tracking-tight ${highRiskCount > 0 ? 'text-red-400' : 'text-slate-400'}`}>
          {highRiskCount}
        </div>
        <p className="text-[11px] text-red-500/80 mt-1">Requires audit</p>
      </div>
    </div>
  );
};
