import React from 'react';
import { FilterState } from '../types';
import { Filter, RotateCcw, PlusCircle, ShieldCheck, Download, Search, FileSpreadsheet } from 'lucide-react';

interface SidebarProps {
  districts: string[];
  categories: string[];
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onResetFilters: () => void;
  onOpenAddModal: () => void;
  onExportAnomalyReport: () => void;
  onExportAllProjects: () => void;
  totalFiltered: number;
  totalCount: number;
  anomalyCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  districts,
  categories,
  filters,
  onFilterChange,
  onResetFilters,
  onOpenAddModal,
  onExportAnomalyReport,
  onExportAllProjects,
  totalFiltered,
  totalCount,
  anomalyCount,
}) => {
  const riskLevels = ['All', 'Low Risk', 'Medium Risk', 'High Risk'];
  const completionStatuses: string[] = ['All', 'Ongoing', 'Delayed', 'Completed'];
  const aiDetectionOptions = ['All', 'Anomaly Detected', 'Normal'];
  const delayContextOptions = ['All', 'Contextual / Justified Delay', 'Delay Requires Investigation', 'Normal Timeline'];

  const hasActiveFilters =
    filters.district !== 'All' ||
    filters.category !== 'All' ||
    filters.riskLevel !== 'All' ||
    filters.completionStatus !== 'All' ||
    filters.aiDetection !== 'All' ||
    filters.delayContext !== 'All' ||
    filters.searchQuery !== '';

  return (
    <aside className="w-full lg:w-72 bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800 p-5 flex flex-col justify-between shrink-0">
      <div className="space-y-5">
        {/* Brand / Title Header */}
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-3xl">🤖</span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">MPLADS AI</h1>
              <p className="text-[11px] text-slate-400 font-medium">Public Works Anomaly Audit</p>
            </div>
          </div>
          <div className="mt-2.5 py-1 px-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md flex items-center justify-between text-emerald-400 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> AI Monitoring Active
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
        </div>

        <div className="h-px bg-slate-800" />

        {/* Quick Search */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-indigo-400" /> Search Registry
          </label>
          <input
            type="text"
            placeholder="Search project name, ID, district..."
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* 5 Filters */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-indigo-400" />
              <span>Multi-Tier Filters</span>
            </h2>
            {hasActiveFilters && (
              <button
                onClick={onResetFilters}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition cursor-pointer font-medium"
              >
                <RotateCcw className="w-3 h-3" /> Clear Filters
              </button>
            )}
          </div>

          {/* 1. District */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 block font-medium">District</label>
            <select
              value={filters.district}
              onChange={(e) => onFilterChange({ ...filters, district: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {districts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* 2. Category */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 block font-medium">Category</label>
            <select
              value={filters.category}
              onChange={(e) => onFilterChange({ ...filters, category: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* 3. Risk Level */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 block font-medium">Risk Level</label>
            <select
              value={filters.riskLevel}
              onChange={(e) => onFilterChange({ ...filters, riskLevel: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {riskLevels.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* 4. Completion Status */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 block font-medium">Completion Status</label>
            <select
              value={filters.completionStatus}
              onChange={(e) => onFilterChange({ ...filters, completionStatus: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {completionStatuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* 5. AI Detection */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 block font-medium">AI Anomaly Status</label>
            <select
              value={filters.aiDetection}
              onChange={(e) => onFilterChange({ ...filters, aiDetection: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {aiDetectionOptions.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* 6. Delay Context */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 block font-medium">Delay Context</label>
            <select
              value={filters.delayContext}
              onChange={(e) => onFilterChange({ ...filters, delayContext: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {delayContextOptions.map((dc) => (
                <option key={dc} value={dc}>{dc}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Summary Counter */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1">
          <div className="flex justify-between text-slate-400">
            <span>Filtered Scope:</span>
            <span className="text-white font-bold font-mono">{totalFiltered} of {totalCount}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Flagged Anomalies:</span>
            <span className="text-amber-400 font-bold font-mono">{anomalyCount}</span>
          </div>
        </div>

        <div className="h-px bg-slate-800" />

        {/* Export and Action Buttons */}
        <div className="space-y-2">
          {/* Download Anomaly Report */}
          <button
            onClick={onExportAnomalyReport}
            className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Anomaly Report</span>
          </button>

          {/* Download All Projects */}
          <button
            onClick={onExportAllProjects}
            className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
            <span>Download All Projects (CSV)</span>
          </button>

          {/* Add Project for Audit Simulation */}
          <button
            onClick={onOpenAddModal}
            className="w-full py-2 px-3 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border border-indigo-500/30 transition cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span>Audit Custom Project</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-slate-800 text-[10px] text-slate-500 space-y-1">
        <div>MPLADS AI | TEAM NOVA</div>
        <div>Hackathon Prototype v2.0</div>
      </div>
    </aside>
  );
};
