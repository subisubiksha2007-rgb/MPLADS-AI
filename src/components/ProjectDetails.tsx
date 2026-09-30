import React from 'react';
import { EnrichedProject } from '../types';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Search,
  Clock,
  Building,
  Tag,
  Cpu,
  AlertOctagon,
  Scale,
  CloudRain,
  FileCheck,
  Building2,
  Info
} from 'lucide-react';
import { formatINR } from '../utils/formatters';

interface ProjectDetailsProps {
  projects: EnrichedProject[];
  selectedProjectName: string;
  onSelectProjectName: (name: string) => void;
}

export const ProjectDetails: React.FC<ProjectDetailsProps> = ({
  projects,
  selectedProjectName,
  onSelectProjectName,
}) => {
  const project = projects.find(p => p.project_name === selectedProjectName) || projects[0];

  if (!project) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm text-slate-400 text-xs">
        No project available for inspection.
      </div>
    );
  }

  // Calculate suspicious pattern combinations
  const isHighSpendLowProgress = project.utilization_percent > 80 && project.progress_percent < 40;
  const isLongDelayLowProgress = project.delay_days > 60 && project.progress_percent < 40;
  const isUnusualFinancialPattern = project.ai_anomaly === 'Anomaly Detected';

  // Divergence calculation (Utilization % - Progress %)
  const divergence = Math.round((project.utilization_percent - project.progress_percent) * 10) / 10;
  const isSevereDivergence = divergence > 40;

  // Dynamic plain-English explanation incorporating delay context rules, document, and agency status
  const getDynamicExplanation = (p: EnrichedProject): string => {
    const {
      utilization_percent,
      progress_percent,
      delay_days,
      delay_reason,
      supporting_document,
      supporting_event,
      approved_extension,
      extension_days,
      delay_context_status,
      document_verification_status,
      agency_verification_status,
      risk_level,
    } = p;

    const isNaturalEvent =
      delay_reason === 'Heavy Rainfall' ||
      delay_reason === 'Flood / Natural Calamity' ||
      delay_reason === 'Flood' ||
      delay_reason === 'Natural Calamity';

    const isCompoundingRisk = delay_days > 30 && progress_percent < 40 && utilization_percent > 70;
    const docRef = supporting_document || supporting_event || 'No documented context';

    // Logic Rule 3 & 4: Unexcused delay requires investigation
    if (delay_context_status === 'Delay Requires Investigation') {
      let text = `Delay Requires Investigation: The project has an unexcused schedule delay of ${delay_days} days (${delay_reason}: ${docRef}) with no approved government extension.`;
      if (isCompoundingRisk) {
        text += ` Compounding risk detected: this long delay is combined with high expenditure (${utilization_percent}%) and low physical progress (${progress_percent}%), increasing the project risk tier.`;
      }
      if (document_verification_status === 'Possible Duplicate/Inconsistency') {
        text += ' Invoice verification also detected a possible duplicate or inconsistent voucher submission.';
      }
      if (agency_verification_status === 'Possible Duplicate / Inconsistent Agency Record') {
        text += ' Implementing agency registration records also require verification.';
      }
      return text;
    }

    // Logic Rule 1 & 2: Contextually justified delay
    if (delay_context_status === 'Contextual / Justified Delay') {
      if (isNaturalEvent && approved_extension) {
        return `Contextually Justified Delay (Natural Event Exemption): The project has a ${delay_days}-day delay associated with a documented natural event (${delay_reason}: ${docRef}) and an approved statutory extension of ${extension_days || delay_days} days. In accordance with vigilance guidelines, project risk was NOT increased only because of the delay. Fund utilization is at ${utilization_percent}% with ${progress_percent}% physical progress.`;
      }
      return `Contextually Justified Delay: The project has a ${delay_days}-day delay due to a valid documented reason (${delay_reason}: ${docRef}) with an approved extension of ${extension_days || delay_days} days. The delay is recognized as an excused schedule adjustment.`;
    }

    // Default High Risk
    if (risk_level === 'High Risk') {
      let text = `High Risk Audit Alert: ${utilization_percent}% of the approved funds have been spent while physical progress is only ${progress_percent}%, with a delay of ${delay_days} days.`;
      if (document_verification_status === 'Possible Duplicate/Inconsistency') {
        text += ' In addition, invoice records show a possible duplicate claim requiring administrative review.';
      }
      return text;
    }

    if (risk_level === 'Medium Risk') {
      return `Medium Risk Monitoring: Fund utilization is at ${utilization_percent}% with ${progress_percent}% work completed and a delay of ${delay_days} days (${delay_reason}). Regular milestone verification is recommended.`;
    }

    return `Normal Parameters: This project is progressing with ${utilization_percent}% fund utilization, ${progress_percent}% work progress, and a nominal delay of ${delay_days} days within standard construction tolerances.`;
  };

  const dynamicExplanation = getDynamicExplanation(project);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-6">
      {/* Top Header & Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🔎</span>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Project Details &amp; Forensic Inspection
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Detailed verification dossier: financials, physical milestones, delay context, bill verification, and agency records
          </p>
        </div>

        <div className="flex items-center gap-2 min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={project.project_name}
            onChange={(e) => onSelectProjectName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
          >
            {projects.map((p) => (
              <option key={p.project_id} value={p.project_name}>
                {p.project_name} ({p.project_id} - {p.district})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Project Banner & Metadata Grid */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {project.project_id}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-400" /> District: <strong className="text-white">{project.district}</strong>
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-slate-400" /> Category: <strong className="text-white">{project.category}</strong>
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> Status: <strong className="text-white">{project.completion_status}</strong>
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1.5">{project.project_name}</h2>
          </div>

          {/* Risk Level & AI Anomaly Badges */}
          <div className="shrink-0 flex items-center gap-2 flex-wrap">
            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${
              project.risk_level === 'High Risk'
                ? 'bg-red-500/20 text-red-400 border-red-500/40'
                : project.risk_level === 'Medium Risk'
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
            }`}>
              {project.risk_level === 'High Risk' && <XCircle className="w-4 h-4 text-red-400" />}
              {project.risk_level === 'Medium Risk' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
              {project.risk_level === 'Low Risk' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
              <span>{project.risk_level}</span>
            </span>

            <span className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 ${
              project.ai_anomaly === 'Anomaly Detected'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}>
              <Cpu className="w-3.5 h-3.5" />
              <span>{project.ai_anomaly}</span>
            </span>
          </div>
        </div>

        {/* Primary Metrics Grid (Approved, Spent, Utilization, Progress, Delay Days, Delay Reason) */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-2">
          <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Approved Amount</span>
            <span className="text-lg font-bold text-white font-mono mt-0.5 block">{formatINR(project.approved_amount)}</span>
            <span className="text-[10px] text-slate-500">₹{project.approved_amount.toLocaleString('en-IN')}</span>
          </div>

          <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Spent Amount</span>
            <span className="text-lg font-bold text-amber-400 font-mono mt-0.5 block">{formatINR(project.spent_amount)}</span>
            <span className="text-[10px] text-slate-500">₹{project.spent_amount.toLocaleString('en-IN')}</span>
          </div>

          <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Fund Utilization</span>
            <span className="text-lg font-bold text-cyan-400 font-mono mt-0.5 block">{project.utilization_percent}%</span>
            <span className="text-[10px] text-slate-500">Budget burn rate</span>
          </div>

          <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Work Progress</span>
            <span className="text-lg font-bold text-indigo-400 font-mono mt-0.5 block">{project.progress_percent}%</span>
            <span className="text-[10px] text-slate-500">Physical completion</span>
          </div>

          <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Delay Days</span>
            <span className="text-lg font-bold text-rose-400 font-mono mt-0.5 block">{project.delay_days} days</span>
            <span className="text-[10px] text-slate-500">Schedule variance</span>
          </div>

          <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Delay Reason</span>
            <span className="text-xs font-bold text-white mt-1 block truncate" title={project.delay_reason}>
              {project.delay_reason}
            </span>
            <span className="text-[10px] text-slate-500 block truncate" title={project.supporting_event}>
              {project.supporting_event}
            </span>
          </div>
        </div>

        {/* Secondary Verification Statuses Bar: Document, Agency, Delay Context */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-800/80 text-xs">
          {/* Document Verification Status */}
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-blue-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Document Verification</span>
                <span className="font-semibold text-slate-200">{project.document_verification_status}</span>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                project.document_verification_status === 'No Obvious Anomaly'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : project.document_verification_status === 'Needs Verification'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              {project.document_verification_status === 'No Obvious Anomaly'
                ? '🟢 No Obvious Anomaly'
                : project.document_verification_status === 'Needs Verification'
                ? '🟡 Needs Verification'
                : '🔴 Possible Duplicate/Inconsistency'}
            </span>
          </div>

          {/* Agency Verification Status */}
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-violet-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Executing Agency</span>
                <span className="font-semibold text-slate-200 truncate max-w-[140px] block" title={project.agency_name}>
                  {project.agency_name}
                </span>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                project.agency_verification_status === 'Agency Information Consistent'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : project.agency_verification_status === 'Verification Required'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              {project.agency_verification_status === 'Agency Information Consistent' ? '🟢 Consistent' : project.agency_verification_status === 'Verification Required' ? '🟡 Verification Req' : '🔴 Inconsistent'}
            </span>
          </div>

          {/* Delay Context Status */}
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CloudRain className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Delay Context</span>
                <span className="font-semibold text-slate-200">{project.delay_context_status}</span>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                project.delay_context_status === 'Contextual / Justified Delay'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : project.delay_context_status === 'Delay Requires Investigation'
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {project.delay_context_status === 'Contextual / Justified Delay' ? '🟢 Contextual' : project.delay_context_status === 'Delay Requires Investigation' ? '🔴 Under Review' : '⏱️ Normal'}
            </span>
          </div>
        </div>

        {/* Dedicated Delay Context Section with 5 Required Fields */}
        <div className="p-3.5 bg-slate-900/90 rounded-lg border border-slate-800 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
              <CloudRain className="w-3.5 h-3.5 text-cyan-400" />
              <span>Delay Context</span>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                project.delay_context_status === 'Contextual / Justified Delay'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : project.delay_context_status === 'Delay Requires Investigation'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {project.delay_context_status === 'Contextual / Justified Delay'
                ? '🟢 Contextually Justified Delay'
                : project.delay_context_status === 'Delay Requires Investigation'
                ? '🔴 Delay Requires Investigation'
                : '⏱️ Normal Schedule Timeline'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
            <div className="p-2 bg-slate-950 rounded border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Delay Days</span>
              <span className="text-sm font-bold text-rose-400 font-mono mt-0.5 block">{project.delay_days} days</span>
            </div>

            <div className="p-2 bg-slate-950 rounded border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Delay Reason</span>
              <span className="text-xs font-bold text-white mt-0.5 block truncate" title={project.delay_reason}>
                {project.delay_reason}
              </span>
            </div>

            <div className="p-2 bg-slate-950 rounded border border-slate-800 sm:col-span-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Supporting Context / Doc</span>
              <span className="text-[11px] font-mono text-slate-300 mt-0.5 block truncate" title={project.supporting_document || project.supporting_event}>
                {project.supporting_document || project.supporting_event || 'None'}
              </span>
            </div>

            <div className="p-2 bg-slate-950 rounded border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Approved Extension</span>
              <span className={`text-xs font-bold mt-0.5 inline-block px-2 py-0.2 rounded ${
                project.approved_extension
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {project.approved_extension ? 'Yes' : 'No'}
              </span>
            </div>

            <div className="p-2 bg-slate-950 rounded border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Extension Days</span>
              <span className="text-sm font-bold text-slate-200 font-mono mt-0.5 block">
                {project.approved_extension ? `${project.extension_days || project.delay_days} days` : '0 days'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. "🔎 Why is this project flagged?" Dynamic Explanation Section */}
      <div
        className={`p-5 rounded-xl border space-y-4 shadow-sm ${
          project.risk_level === 'High Risk'
            ? 'bg-red-950/20 border-red-500/40'
            : project.risk_level === 'Medium Risk'
            ? 'bg-amber-950/20 border-amber-500/40'
            : 'bg-slate-950 border-slate-800'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🔎</span>
            <div>
              <h4 className="text-base font-bold text-white tracking-tight">
                Why is this project flagged?
              </h4>
              <p className="text-xs text-slate-400">
                Transparent multi-factor diagnostic generated dynamically from actual project metrics
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-300 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
              Risk Score: {project.risk_score} pts
            </span>
          </div>
        </div>

        {/* Dynamic Plain-English Explanation Paragraph */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-indigo-500/30 space-y-2">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
            <Cpu className="w-4 h-4" />
            <span>AI Analytical Synthesis</span>
          </div>
          <p className="text-sm font-medium text-slate-100 leading-relaxed italic pl-1">
            "{dynamicExplanation}"
          </p>
        </div>

        {/* Main Reasons for Risk Classification */}
        <div className="space-y-1.5 bg-slate-900/70 p-3.5 rounded-lg border border-slate-800/80">
          <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
            Contributing Audit Observations:
          </span>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {project.risk_reason.split(' | ').map((reason, idx) => (
              <span
                key={idx}
                className={`text-xs px-2.5 py-1 rounded-md font-medium border ${
                  project.risk_level === 'High Risk'
                    ? 'bg-red-950/60 text-red-200 border-red-800/50'
                    : project.risk_level === 'Medium Risk'
                    ? 'bg-amber-950/60 text-amber-200 border-amber-800/50'
                    : 'bg-emerald-950/60 text-emerald-200 border-emerald-800/50'
                }`}
              >
                • {reason}
              </span>
            ))}
          </div>
        </div>

        {/* Contextual Delay Note if applicable */}
        {(project.delay_reason === 'Heavy Rainfall' ||
          project.delay_reason === 'Flood' ||
          project.delay_reason === 'Natural Calamity' ||
          project.approved_extension) && (
          <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-lg text-xs text-emerald-200 flex items-start gap-2">
            <CloudRain className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Natural Event Contextual Exemption Applied:</span>
              <span className="leading-snug text-emerald-300/90">
                Delay is recorded with valid environmental justification ({project.delay_reason}: {project.supporting_event}). Delay penalty points have been mitigated in the composite risk score.
              </span>
            </div>
          </div>
        )}

        {/* Required Mandatory Disclaimer */}
        <div className="pt-2 border-t border-white/10 text-[11px] text-slate-400 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>
            AI anomaly detection identifies unusual patterns for further investigation. An anomaly is not proof of fraud. Document and agency verification results are based on available records and should be confirmed through official sources.
          </span>
        </div>
      </div>

      {/* Visual Comparison: Financial Utilization vs Physical Progress */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Scale className="w-4 h-4 text-indigo-400" />
            Financial Utilization vs. Physical Progress
          </h4>
          <span className={`text-xs font-mono px-2 py-0.5 rounded font-semibold ${
            isSevereDivergence ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-800 text-slate-300'
          }`}>
            Variance: {divergence > 0 ? `+${divergence}%` : `${divergence}%`}
          </span>
        </div>

        <div className="space-y-3">
          {/* Financial Utilization bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Financial Utilization (Funds Spent)</span>
              <span className="font-mono font-bold text-amber-400">{project.utilization_percent}%</span>
            </div>
            <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-amber-600 to-amber-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(project.utilization_percent, 100)}%` }}
              />
            </div>
          </div>

          {/* Physical Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Physical Progress (Work Completed)</span>
              <span className="font-mono font-bold text-indigo-400">{project.progress_percent}%</span>
            </div>
            <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-indigo-600 to-indigo-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${project.progress_percent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Pattern Diagnostics */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
            Pattern Diagnostics:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
              isHighSpendLowProgress
                ? 'bg-red-950/40 border-red-500/40 text-red-300'
                : 'bg-slate-900/60 border-slate-800 text-slate-500'
            }`}>
              <AlertOctagon className={`w-4 h-4 shrink-0 mt-0.5 ${isHighSpendLowProgress ? 'text-red-400' : 'text-slate-600'}`} />
              <div>
                <span className="font-semibold block">High Spending + Low Progress</span>
                <span className="text-[11px] leading-tight">
                  {isHighSpendLowProgress ? 'Triggered (>80% spent, <40% progress)' : 'Condition normal'}
                </span>
              </div>
            </div>

            <div className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
              isLongDelayLowProgress
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                : 'bg-slate-900/60 border-slate-800 text-slate-500'
            }`}>
              <Clock className={`w-4 h-4 shrink-0 mt-0.5 ${isLongDelayLowProgress ? 'text-rose-400' : 'text-slate-600'}`} />
              <div>
                <span className="font-semibold block">Long Delay + Low Progress</span>
                <span className="text-[11px] leading-tight">
                  {isLongDelayLowProgress ? 'Triggered (>60d delay, <40% progress)' : 'Timeline acceptable'}
                </span>
              </div>
            </div>

            <div className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
              isUnusualFinancialPattern
                ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                : 'bg-slate-900/60 border-slate-800 text-slate-500'
            }`}>
              <Cpu className={`w-4 h-4 shrink-0 mt-0.5 ${isUnusualFinancialPattern ? 'text-amber-400' : 'text-slate-600'}`} />
              <div>
                <span className="font-semibold block">Unusual Financial Pattern</span>
                <span className="text-[11px] leading-tight">
                  {isUnusualFinancialPattern ? 'Isolation Forest anomaly flag' : 'Cluster baseline normal'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
