import React, { useState } from 'react';
import { EnrichedProject } from '../types';
import { ArrowUpDown, AlertTriangle, ShieldCheck, Eye, Search } from 'lucide-react';
import { formatINR } from '../utils/formatters';

interface AllProjectsTableProps {
  projects: EnrichedProject[];
  onSelectProject: (projectName: string) => void;
}

type SortField =
  | 'project_id'
  | 'project_name'
  | 'district'
  | 'category'
  | 'approved_amount'
  | 'spent_amount'
  | 'utilization_percent'
  | 'progress_percent'
  | 'delay_days'
  | 'completion_status'
  | 'ai_anomaly'
  | 'risk_level';

export const AllProjectsTable: React.FC<AllProjectsTableProps> = ({ projects, onSelectProject }) => {
  const [sortField, setSortField] = useState<SortField>('project_id');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [tableSearch, setTableSearch] = useState<string>('');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const filtered = projects.filter(p => {
    if (!tableSearch.trim()) return true;
    const q = tableSearch.toLowerCase();
    return (
      p.project_name.toLowerCase().includes(q) ||
      p.project_id.toLowerCase().includes(q) ||
      p.district.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.agency_name.toLowerCase().includes(q) ||
      p.delay_reason.toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (typeof aVal === 'string') {
      return sortAsc
        ? (aVal as string).localeCompare(bVal as string)
        : (bVal as string).localeCompare(aVal as string);
    }
    return sortAsc
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      {/* Table Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span>📋</span> All Monitored Projects Registry
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Full comprehensive ledger of works across districts with physical progress and expenditure verification
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Filter ledger table..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-48 sm:w-60"
            />
          </div>
          <span className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-mono">
            {sorted.length} / {projects.length}
          </span>
        </div>
      </div>

      {/* 12 Columns Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-800/80 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-700 select-none">
            <tr>
              <th onClick={() => handleSort('project_id')} className="py-3 px-3 cursor-pointer hover:text-white">
                <div className="flex items-center gap-1">Project ID <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th onClick={() => handleSort('project_name')} className="py-3 px-3 cursor-pointer hover:text-white">
                <div className="flex items-center gap-1">Project Name <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th onClick={() => handleSort('district')} className="py-3 px-3 cursor-pointer hover:text-white">
                <div className="flex items-center gap-1">District <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th onClick={() => handleSort('category')} className="py-3 px-3 cursor-pointer hover:text-white">
                <div className="flex items-center gap-1">Category <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th onClick={() => handleSort('approved_amount')} className="py-3 px-3 text-right cursor-pointer hover:text-white">
                <div className="flex items-center justify-end gap-1">Approved <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th onClick={() => handleSort('spent_amount')} className="py-3 px-3 text-right cursor-pointer hover:text-white">
                <div className="flex items-center justify-end gap-1">Spent <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th onClick={() => handleSort('utilization_percent')} className="py-3 px-3 text-center cursor-pointer hover:text-white">
                <div className="flex items-center justify-center gap-1">Utilization % <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th onClick={() => handleSort('progress_percent')} className="py-3 px-3 text-center cursor-pointer hover:text-white">
                <div className="flex items-center justify-center gap-1">Progress % <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th onClick={() => handleSort('delay_days')} className="py-3 px-3 text-center cursor-pointer hover:text-white">
                <div className="flex items-center justify-center gap-1">Delay Days <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th onClick={() => handleSort('completion_status')} className="py-3 px-3 text-center cursor-pointer hover:text-white">
                <div className="flex items-center justify-center gap-1">Status <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th onClick={() => handleSort('ai_anomaly')} className="py-3 px-3 text-center cursor-pointer hover:text-white">
                <div className="flex items-center justify-center gap-1">AI Detection <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th onClick={() => handleSort('risk_level')} className="py-3 px-3 cursor-pointer hover:text-white">
                <div className="flex items-center gap-1">Risk Level <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="py-3 px-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {sorted.map((p) => (
              <tr
                key={p.project_id}
                onClick={() => onSelectProject(p.project_name)}
                className="hover:bg-slate-800/50 cursor-pointer transition"
              >
                <td className="py-3 px-3 font-mono font-medium text-slate-400">
                  {p.project_id}
                </td>
                <td className="py-3 px-3 font-medium text-white max-w-[160px] truncate" title={p.project_name}>
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
                  <span className={`px-1.5 py-0.5 rounded ${p.utilization_percent > 80 ? 'text-amber-400 font-bold' : 'text-slate-300'}`}>
                    {p.utilization_percent}%
                  </span>
                </td>
                <td className="py-3 px-3 text-center font-mono">
                  <span className={`px-1.5 py-0.5 rounded ${p.progress_percent < 40 ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                    {p.progress_percent}%
                  </span>
                </td>
                <td className="py-3 px-3 text-center">
                  {p.delay_days > 0 ? (
                    <div>
                      <span className={`font-mono font-bold ${
                        p.delay_context_status === 'Contextual / Justified Delay'
                          ? 'text-emerald-400'
                          : p.delay_days > 60
                          ? 'text-red-400'
                          : 'text-amber-400'
                      }`}>
                        {p.delay_days}d
                      </span>
                      <span className="block text-[9px] text-slate-400 truncate max-w-[90px] mx-auto" title={p.delay_reason}>
                        {p.delay_reason}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-600 font-mono">0d</span>
                  )}
                </td>
                <td className="py-3 px-3 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                    p.completion_status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    p.completion_status === 'Ongoing' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                    'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {p.completion_status}
                  </span>
                </td>
                <td className="py-3 px-3 text-center">
                  {p.ai_anomaly === 'Anomaly Detected' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      <AlertTriangle className="w-3 h-3 text-amber-400" /> Anomaly
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                      <ShieldCheck className="w-3 h-3 text-slate-500" /> Normal
                    </span>
                  )}
                </td>
                <td className="py-3 px-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                    p.risk_level === 'High Risk'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : p.risk_level === 'Medium Risk'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {p.risk_level === 'High Risk' ? '🔴 High' : p.risk_level === 'Medium Risk' ? '🟡 Medium' : '🟢 Low'}
                  </span>
                </td>
                <td className="py-3 px-3 text-center" onClick={(e) => { e.stopPropagation(); onSelectProject(p.project_name); }}>
                  <button className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded text-[10px] font-medium inline-flex items-center gap-1 transition cursor-pointer">
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
