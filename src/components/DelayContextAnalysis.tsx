import React, { useState } from 'react';
import { EnrichedProject, DelayReasonType, DelayContextStatus } from '../types';
import {
  CloudRain,
  AlertTriangle,
  Clock,
  CheckCircle2,
  CalendarCheck,
  Eye,
  Info,
  FileText,
  Building,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  XCircle,
  FileCheck,
  Search
} from 'lucide-react';
import { formatINR } from '../utils/formatters';

interface DelayContextAnalysisProps {
  projects: EnrichedProject[];
  onSelectProject?: (projectName: string) => void;
}

const STANDARDIZED_DELAY_REASONS: DelayReasonType[] = [
  'Heavy Rainfall',
  'Flood / Natural Calamity',
  'Government Approval Delay',
  'Land / Permission Issue',
  'Material Supply Delay',
  'Contractor Issue',
  'Other / Unknown'
];

export const DelayContextAnalysis: React.FC<DelayContextAnalysisProps> = ({
  projects,
  onSelectProject,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'justified' | 'investigation'>('all');

  // Currently inspected project for dynamic delay context analysis
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    projects.find(p => p.delay_days > 0)?.project_id || projects[0]?.project_id || 'MPLAD006'
  );

  const activeProject = projects.find(p => p.project_id === selectedProjectId) || projects[0];

  // Dynamic state overrides for interactive simulation and inspection
  const [simulatedReason, setSimulatedReason] = useState<DelayReasonType>(activeProject?.delay_reason || 'Heavy Rainfall');
  const [simulatedDoc, setSimulatedDoc] = useState<string>(activeProject?.supporting_document || activeProject?.supporting_event || '');
  const [simulatedExtension, setSimulatedExtension] = useState<boolean>(activeProject?.approved_extension ?? true);
  const [simulatedExtensionDays, setSimulatedExtensionDays] = useState<number>(activeProject?.extension_days || activeProject?.delay_days || 0);

  // Sync state when project selection changes
  const handleSelectProject = (projId: string) => {
    setSelectedProjectId(projId);
    const p = projects.find(item => item.project_id === projId);
    if (p) {
      setSimulatedReason(p.delay_reason);
      setSimulatedDoc(p.supporting_document || p.supporting_event || '');
      setSimulatedExtension(p.approved_extension);
      setSimulatedExtensionDays(p.extension_days !== undefined ? p.extension_days : (p.approved_extension ? p.delay_days : 0));
    }
  };

  // Evaluate dynamic delay context for currently inspected parameters
  const evaluateDelayContext = (
    delayDays: number,
    reason: DelayReasonType,
    doc: string,
    approvedExt: boolean,
    extDays: number,
    progressPct: number,
    utilPct: number
  ) => {
    const isNaturalEvent =
      reason === 'Heavy Rainfall' ||
      reason === 'Flood / Natural Calamity' ||
      reason === 'Flood' ||
      reason === 'Natural Calamity';

    const hasValidDocumentedReason =
      isNaturalEvent ||
      reason === 'Government Approval Delay' ||
      reason === 'Land / Permission Issue' ||
      reason === 'Material Supply Delay';

    const hasSupportingContext =
      doc &&
      !doc.toLowerCase().startsWith('none') &&
      !doc.toLowerCase().includes('unexplained') &&
      doc.trim().length > 3;

    const isUnknownOrMissing =
      reason === 'Other / Unknown' ||
      reason === 'Unknown / No Documented Reason' ||
      !hasSupportingContext;

    let status: DelayContextStatus = 'Normal Timeline';
    let riskPenaltyApplied = false;
    let rationale = '';

    if (delayDays > 15) {
      // Logic Rule 2: If the delay is long but there is a valid documented reason and approved extension:
      // -> 🟢 Contextually Justified Delay
      if (hasValidDocumentedReason && approvedExt) {
        status = 'Contextual / Justified Delay';
        if (isNaturalEvent) {
          // Logic Rule 1: If there is a documented natural event such as heavy rainfall or flood AND an approved extension,
          // do NOT increase the project risk only because of the delay.
          riskPenaltyApplied = false;
          rationale = `Documented natural calamity (${reason}) with formal statutory extension of ${extDays} days. Risk score was NOT penalized for timeline variance.`;
        } else {
          riskPenaltyApplied = false;
          rationale = `Valid administrative/supply delay (${reason}) supported by official verification order with ${extDays} days sanctioned extension.`;
        }
      }
      // Logic Rule 3: If the delay is long, the reason is unknown, there is no supporting context, and there is no approved extension:
      // -> 🔴 Delay Requires Investigation
      else if (isUnknownOrMissing && !approvedExt) {
        status = 'Delay Requires Investigation';
        riskPenaltyApplied = true;
        rationale = `Unexplained delay (${delayDays} days) with unknown or absent supporting context and no approved government extension.`;
      }
      // Delay without approved extension (e.g. contractor default)
      else if (!approvedExt && (delayDays > 30 || reason === 'Contractor Issue')) {
        status = 'Delay Requires Investigation';
        riskPenaltyApplied = true;
        rationale = `Unexcused delay (${delayDays} days) due to ${reason} without sanctioned extension. Requires site verification.`;
      } else {
        status = 'Contextual / Justified Delay';
        rationale = `Schedule adjustment of ${delayDays} days recognized under documented milestone provisions.`;
      }
    } else {
      status = 'Normal Timeline';
      rationale = `Minor schedule variance (${delayDays} days) within permissible standard public works timeline margins.`;
    }

    // Logic Rule 4: If long delay is combined with low progress and high expenditure, increase the risk appropriately.
    const isCompoundingRisk = delayDays > 30 && progressPct < 40 && utilPct > 70;
    let compoundingRationale = '';
    if (isCompoundingRisk) {
      compoundingRationale = `Compounding risk detected: Significant delay (${delayDays} days) is combined with high expenditure (${utilPct}%) and lagging physical progress (${progressPct}%).`;
    }

    return {
      status,
      riskPenaltyApplied,
      isNaturalEvent,
      isCompoundingRisk,
      rationale,
      compoundingRationale
    };
  };

  const dynamicEvaluation = evaluateDelayContext(
    activeProject.delay_days,
    simulatedReason,
    simulatedDoc,
    simulatedExtension,
    simulatedExtensionDays,
    activeProject.progress_percent,
    activeProject.utilization_percent
  );

  const delayedProjects = projects.filter(p => p.delay_days > 0);
  const justifiedCount = projects.filter(p => p.delay_context_status === 'Contextual / Justified Delay').length;
  const investigationCount = projects.filter(p => p.delay_context_status === 'Delay Requires Investigation').length;

  const filteredProjects = delayedProjects.filter(p => {
    if (filterType === 'justified') return p.delay_context_status === 'Contextual / Justified Delay';
    if (filterType === 'investigation') return p.delay_context_status === 'Delay Requires Investigation';
    return true;
  });

  return (
    <div id="delay-context-section" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-6">
      {/* 1. Header Bar */}
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
            Differentiating documented natural calamities and statutory extensions from unexcused project timeline slippage
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
            🔴 Requires Investigation ({investigationCount})
          </button>
        </div>
      </div>

      {/* 2. Core Policy Card (Rule 6: Do NOT call project fraudulent just because it has a delay) */}
      <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
        <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
          <Info className="w-4 h-4" />
          <span>Core Evaluation Principle: Context-Aware Delay Decoupling</span>
        </div>
        <p className="text-xs text-slate-200 leading-relaxed">
          <strong className="text-white">Project delay alone does not indicate fraud or malfeasance.</strong> The system cross-references documented reasons, environmental advisories, and formal government extensions before adjusting risk levels. Projects with legitimate natural events (such as heavy rainfall, monsoon flooding, or statutory clearances) are classified as <span className="text-emerald-400 font-semibold">🟢 Contextually Justified Delay</span> and are protected from artificial risk penalties.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
          <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-200">
            <span className="font-semibold block flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>🟢 Contextually Justified Delay</span>
            </span>
            <span className="text-[11px] text-emerald-300/80 mt-0.5 block leading-snug">
              Valid documented reason (Heavy Rainfall, Flood, Land/Gov Approval) + Approved Extension. Project risk is NOT increased due to delay.
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-red-950/30 border border-red-500/30 text-red-200">
            <span className="font-semibold block flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span>🔴 Delay Requires Investigation</span>
            </span>
            <span className="text-[11px] text-red-300/80 mt-0.5 block leading-snug">
              Long delay with unknown reason, absent supporting context, or contractor dispute without approved extension.
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            <span className="font-semibold block flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>⏱️ Normal Schedule Timeline</span>
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block leading-snug">
              Delays &le; 15 days within expected civil construction tolerance windows.
            </span>
          </div>
        </div>
      </div>

      {/* 3. DYNAMIC DELAY CONTEXT DOSSIER FOR SELECTED PROJECT (Requirement 8) */}
      <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
        {/* Project Selector Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔎</span>
            <div>
              <h4 className="text-sm font-bold text-white tracking-tight">
                Project Delay Context Dossier &amp; Interactive Simulator
              </h4>
              <p className="text-[11px] text-slate-400">
                Inspect and dynamically simulate delay parameters for any sanctioned project
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 min-w-[280px]">
            <Building className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedProjectId}
              onChange={(e) => handleSelectProject(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium cursor-pointer"
            >
              {projects.map((p) => (
                <option key={p.project_id} value={p.project_id}>
                  {p.project_id} - {p.project_name} ({p.district} · {p.delay_days}d delay)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 1-Click Quick Scenarios */}
        <div className="p-3 bg-slate-900/70 rounded-lg border border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Simulate Delay Logic Rules:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => {
                setSimulatedReason('Heavy Rainfall');
                setSimulatedDoc('Tamil Nadu SDMA Flood Emergency Relief Notification SDMA/TRI/2024/08');
                setSimulatedExtension(true);
                setSimulatedExtensionDays(activeProject.delay_days || 60);
              }}
              className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 rounded text-[11px] border border-emerald-500/30 transition cursor-pointer"
            >
              🟢 Rule 1 &amp; 2: Heavy Rainfall + Approved Ext
            </button>
            <button
              onClick={() => {
                setSimulatedReason('Government Approval Delay');
                setSimulatedDoc('TNCZMA Coastal Regulation Clearance Resolution 14/CZMA/2024');
                setSimulatedExtension(true);
                setSimulatedExtensionDays(activeProject.delay_days || 90);
              }}
              className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 rounded text-[11px] border border-emerald-500/30 transition cursor-pointer"
            >
              🟢 Rule 2: Statutory Clearance + Approved Ext
            </button>
            <button
              onClick={() => {
                setSimulatedReason('Other / Unknown');
                setSimulatedDoc('None / Inspection Notice Unacknowledged');
                setSimulatedExtension(false);
                setSimulatedExtensionDays(0);
              }}
              className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded text-[11px] border border-red-500/30 transition cursor-pointer"
            >
              🔴 Rule 3: Unknown Reason + No Extension
            </button>
            <button
              onClick={() => {
                setSimulatedReason(activeProject.delay_reason);
                setSimulatedDoc(activeProject.supporting_document || activeProject.supporting_event || '');
                setSimulatedExtension(activeProject.approved_extension);
                setSimulatedExtensionDays(activeProject.extension_days || (activeProject.approved_extension ? activeProject.delay_days : 0));
              }}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] border border-slate-700 transition cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Reset Project Defaults
            </button>
          </div>
        </div>

        {/* THE 5 REQUIRED DELAY CONTEXT FIELDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
          {/* 1. Delay Days */}
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold block flex items-center gap-1">
              <Clock className="w-3 h-3 text-rose-400" />
              1. Delay Days
            </span>
            <div className="text-xl font-bold font-mono text-rose-400">
              {activeProject.delay_days} Days
            </div>
            <span className="text-[10px] text-slate-500 block">
              Timeline schedule deviation
            </span>
          </div>

          {/* 2. Delay Reason */}
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1 md:col-span-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold block flex items-center gap-1">
              <CloudRain className="w-3 h-3 text-cyan-400" />
              2. Delay Reason
            </span>
            <select
              value={simulatedReason}
              onChange={(e) => setSimulatedReason(e.target.value as DelayReasonType)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              {STANDARDIZED_DELAY_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-500 block">
              Standardized classification
            </span>
          </div>

          {/* 3. Supporting Context / Document */}
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1 md:col-span-2">
            <span className="text-[10px] text-slate-400 uppercase font-bold block flex items-center gap-1">
              <FileText className="w-3 h-3 text-indigo-400" />
              3. Supporting Context / Document
            </span>
            <input
              type="text"
              value={simulatedDoc}
              onChange={(e) => setSimulatedDoc(e.target.value)}
              placeholder="e.g. Weather Bulletin, Gazette Notice, PWD Memo..."
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <span className="text-[10px] text-slate-500 block truncate">
              {simulatedDoc || 'No supporting document filed'}
            </span>
          </div>

          {/* 4 & 5. Approved Extension & Extension Days */}
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold block flex items-center gap-1">
              <CalendarCheck className="w-3 h-3 text-emerald-400" />
              4. Approved Ext. &amp; 5. Days
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSimulatedExtension(!simulatedExtension)}
                className={`px-2 py-1 rounded text-xs font-bold transition cursor-pointer ${
                  simulatedExtension
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-red-500/20 text-red-300 border border-red-500/40'
                }`}
              >
                {simulatedExtension ? 'YES' : 'NO'}
              </button>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  value={simulatedExtension ? simulatedExtensionDays : 0}
                  disabled={!simulatedExtension}
                  onChange={(e) => setSimulatedExtensionDays(Number(e.target.value))}
                  className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-xs text-white font-mono text-center disabled:opacity-40"
                />
                <span className="text-[10px] text-slate-400">days</span>
              </div>
            </div>
            <span className="text-[10px] text-slate-500 block">
              {simulatedExtension ? `Sanctioned: ${simulatedExtensionDays}d` : 'No extension sanctioned'}
            </span>
          </div>
        </div>

        {/* Dynamic Evaluation Card with Exact Badge & "Why Was This Flagged?" Section */}
        <div
          className={`p-4 rounded-xl border space-y-3 shadow-sm transition-all ${
            dynamicEvaluation.status === 'Contextual / Justified Delay'
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
              : dynamicEvaluation.status === 'Delay Requires Investigation'
              ? 'bg-red-950/30 border-red-500/40 text-red-200'
              : 'bg-slate-900 border-slate-800 text-slate-300'
          }`}
        >
          {/* Classification Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2.5">
              {dynamicEvaluation.status === 'Contextual / Justified Delay' && (
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              )}
              {dynamicEvaluation.status === 'Delay Requires Investigation' && (
                <XCircle className="w-6 h-6 text-red-400 shrink-0" />
              )}
              {dynamicEvaluation.status === 'Normal Timeline' && (
                <Clock className="w-6 h-6 text-indigo-400 shrink-0" />
              )}
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold opacity-75 block">
                  Delay Context Classification:
                </span>
                <span className="font-extrabold text-base tracking-tight">
                  {dynamicEvaluation.status === 'Contextual / Justified Delay'
                    ? '🟢 Contextually Justified Delay'
                    : dynamicEvaluation.status === 'Delay Requires Investigation'
                    ? '🔴 Delay Requires Investigation'
                    : '⏱️ Normal Schedule Timeline'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold border ${
                dynamicEvaluation.riskPenaltyApplied
                  ? 'bg-red-500/20 text-red-300 border-red-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}>
                {dynamicEvaluation.riskPenaltyApplied ? 'Delay Penalty Applied' : 'No Delay Penalty (Protected)'}
              </span>
            </div>
          </div>

          {/* SECTION 5: "Why Was This Flagged?" Section */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
              <Search className="w-3.5 h-3.5 text-indigo-400" />
              <span>Why Was This Flagged / Evaluated?</span>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-lg border border-white/10 space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <span className="font-semibold text-white shrink-0">• Delay Evaluation:</span>
                <span className="text-slate-200">{dynamicEvaluation.rationale}</span>
              </div>

              {dynamicEvaluation.isNaturalEvent && simulatedExtension && (
                <div className="flex items-start gap-2 text-emerald-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Rule 1 Verified:</strong> Documented natural event ({simulatedReason}) with approved extension ({simulatedExtensionDays} days). Project risk was NOT increased due to this delay.
                  </span>
                </div>
              )}

              {dynamicEvaluation.isCompoundingRisk && (
                <div className="flex items-start gap-2 text-red-300">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Rule 4 Verified:</strong> {dynamicEvaluation.compoundingRationale}
                  </span>
                </div>
              )}

              {/* Financial & Milestone Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                <div>
                  <span className="block text-slate-500">Fund Utilization</span>
                  <span className="font-mono font-bold text-cyan-400">{activeProject.utilization_percent}%</span>
                  <span className="text-[10px]"> ({formatINR(activeProject.spent_amount)})</span>
                </div>
                <div>
                  <span className="block text-slate-500">Physical Progress</span>
                  <span className="font-mono font-bold text-indigo-400">{activeProject.progress_percent}%</span>
                </div>
                <div>
                  <span className="block text-slate-500">Approved Budget</span>
                  <span className="font-mono font-bold text-white">{formatINR(activeProject.approved_amount)}</span>
                </div>
                <div>
                  <span className="block text-slate-500">Executing Agency</span>
                  <span className="font-medium text-slate-300 truncate block">{activeProject.agency_name}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Complete Projects Table with All 5 Delay Context Attributes */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
            Central Scheme Projects Delay Registry
          </h4>
          <span className="text-[11px] text-slate-400">
            Displaying {filteredProjects.length} projects
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-700">
              <tr>
                <th className="py-2.5 px-3">Project ID</th>
                <th className="py-2.5 px-3">Project &amp; District</th>
                <th className="py-2.5 px-3 text-center">Delay Days</th>
                <th className="py-2.5 px-3">Delay Reason</th>
                <th className="py-2.5 px-3">Supporting Context / Document</th>
                <th className="py-2.5 px-3 text-center">Approved Ext.</th>
                <th className="py-2.5 px-3 text-center">Ext. Days</th>
                <th className="py-2.5 px-3">Classification</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredProjects.map((p) => (
                <tr
                  key={p.project_id}
                  className={`hover:bg-slate-800/40 transition cursor-pointer ${
                    p.project_id === selectedProjectId ? 'bg-indigo-950/30' : ''
                  }`}
                  onClick={() => handleSelectProject(p.project_id)}
                >
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
                      {p.delay_reason === 'Heavy Rainfall' || p.delay_reason === 'Flood / Natural Calamity' || p.delay_reason === 'Flood' ? (
                        <CloudRain className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                      <span>{p.delay_reason}</span>
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[11px] text-slate-400 max-w-xs leading-snug">
                    <span className="font-mono text-slate-300 block truncate" title={p.supporting_document || p.supporting_event}>
                      {p.supporting_document || p.supporting_event}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {p.approved_extension ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        <CalendarCheck className="w-3 h-3" /> Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                        <XCircle className="w-3 h-3" /> No
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-300">
                    {p.approved_extension ? `${p.extension_days || p.delay_days}d` : '0d'}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                        p.delay_context_status === 'Contextual / Justified Delay'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : p.delay_context_status === 'Delay Requires Investigation'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {p.delay_context_status === 'Contextual / Justified Delay'
                        ? '🟢 Contextually Justified Delay'
                        : p.delay_context_status === 'Delay Requires Investigation'
                        ? '🔴 Delay Requires Investigation'
                        : '⏱️ Normal Timeline'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectProject(p.project_id);
                        onSelectProject?.(p.project_name);
                      }}
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
    </div>
  );
};
