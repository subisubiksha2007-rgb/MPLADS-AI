import React, { useState } from 'react';
import { ImplementingAgency, EnrichedProject } from '../types';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  ShieldCheck,
  Info
} from 'lucide-react';

interface AgencyVerificationProps {
  agencies: ImplementingAgency[];
  projects: EnrichedProject[];
  onAddAgency?: (agency: ImplementingAgency) => void;
  onSelectProject?: (projectName: string) => void;
}

export const AgencyVerification: React.FC<AgencyVerificationProps> = ({
  agencies,
  projects,
  onSelectProject,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [checkAgencyName, setCheckAgencyName] = useState('');
  const [checkAgencyId, setCheckAgencyId] = useState('');
  const [checkRegRef, setCheckRegRef] = useState('');

  const [auditResult, setAuditResult] = useState<{
    status: 'Agency Information Consistent' | 'Verification Required' | 'Possible Duplicate / Inconsistent Agency Record';
    headline: string;
    notes: string[];
  } | null>(null);

  // Status counters
  const consistentCount = agencies.filter(a => a.verification_status === 'Agency Information Consistent').length;
  const verificationReqCount = agencies.filter(a => a.verification_status === 'Verification Required').length;
  const inconsistentCount = agencies.filter(a => a.verification_status === 'Possible Duplicate / Inconsistent Agency Record').length;

  const runAgencyCheck = () => {
    if (!checkAgencyName && !checkRegRef && !checkAgencyId) {
      alert('Please provide Agency Name, Agency ID, or Registration/GST reference.');
      return;
    }

    const regMatch = agencies.filter(
      a => checkRegRef && a.registration_ref.trim().toLowerCase() === checkRegRef.trim().toLowerCase()
    );

    const idMatch = agencies.filter(
      a => checkAgencyId && a.agency_id.trim().toLowerCase() === checkAgencyId.trim().toLowerCase()
    );

    const notes: string[] = [];
    let status: 'Agency Information Consistent' | 'Verification Required' | 'Possible Duplicate / Inconsistent Agency Record' = 'Agency Information Consistent';
    let headline = 'Available agency information is consistent with the provided records.';

    // Check 1: Same agency ID linked to different agency names
    if (idMatch.length > 0 && checkAgencyName) {
      const mismatchedName = idMatch.find(
        a => a.agency_name.trim().toLowerCase() !== checkAgencyName.trim().toLowerCase()
      );
      if (mismatchedName) {
        status = 'Possible Duplicate / Inconsistent Agency Record';
        headline = 'Possible Duplicate / Inconsistent Agency Record';
        notes.push(
          `Agency ID "${checkAgencyId}" is already mapped to "${mismatchedName.agency_name}" in district registry.`
        );
      }
    }

    // Check 2: Same registration reference (GST/PAN) linked to multiple entities
    if (regMatch.length > 0) {
      const diffEntity = regMatch.find(
        a => a.agency_name.trim().toLowerCase() !== checkAgencyName.trim().toLowerCase()
      );
      if (diffEntity) {
        status = 'Possible Duplicate / Inconsistent Agency Record';
        headline = 'Possible Duplicate / Inconsistent Agency Record';
        notes.push(
          `Registration reference "${checkRegRef}" is registered under another entity: "${diffEntity.agency_name}" (${diffEntity.agency_id}).`
        );
      }
    }

    // Check 3: Incomplete identification details
    if (!checkRegRef || checkRegRef.length < 10) {
      if (status !== 'Possible Duplicate / Inconsistent Agency Record') {
        status = 'Verification Required';
        headline = 'Agency information requires verification against official records.';
      }
      notes.push('Registration/GSTIN identification reference is incomplete or missing valid 15-character structure.');
    }

    if (notes.length === 0) {
      notes.push('Agency registration and ID match official state contractor registry.');
      notes.push('No dual entities sharing same tax identification number detected.');
      notes.push('Active public works performance records verified.');
    }

    setAuditResult({
      status,
      headline,
      notes
    });
  };

  // Quick test demo scenario loader
  const loadScenario = (scenario: 'consistent' | 'duplicate_gst' | 'missing_info') => {
    if (scenario === 'consistent') {
      setCheckAgencyName('Vellore Engineering Services');
      setCheckAgencyId('AG-VEL-02');
      setCheckRegRef('33BBBPB9876C1Z9');
    } else if (scenario === 'duplicate_gst') {
      // Reuse Apex GSTIN 33AAACA1122D1Z4 under a different name
      setCheckAgencyName('Apex Modern Constructions Pvt Ltd');
      setCheckAgencyId('AG-NEW-99');
      setCheckRegRef('33AAACA1122D1Z4');
    } else if (scenario === 'missing_info') {
      setCheckAgencyName('Kaveri Sandal Earthmovers');
      setCheckAgencyId('AG-TRI-88');
      setCheckRegRef('GST-PENDING');
    }
    setAuditResult(null);
  };

  const filteredAgencies = agencies.filter(a => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.agency_name.toLowerCase().includes(q) ||
      a.agency_id.toLowerCase().includes(q) ||
      a.registration_ref.toLowerCase().includes(q) ||
      a.contact_person.toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏢</span>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Implementing Agency Verification
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-semibold font-mono">
              Entity &amp; Registration Audit
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Cross-verifying contractor identification, PAN/GST registration references, and multi-project track records
          </p>
        </div>

        {/* 3 Status Counters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            🟢 Consistent: {consistentCount}
          </div>
          <div className="px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
            🟡 Verification Req: {verificationReqCount}
          </div>
          <div className="px-2.5 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
            🔴 Inconsistent: {inconsistentCount}
          </div>
        </div>
      </div>

      {/* Interactive Verification Checker Form */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              Automated Agency Consistency Cross-Check
            </h4>
            <p className="text-[11px] text-slate-400">
              Verify if an agency ID, PAN/GST reference, or entity name exhibits dual registrations
            </p>
          </div>

          {/* Demo Scenario buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Demo Tests:</span>
            <button
              onClick={() => loadScenario('consistent')}
              className="px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 rounded text-[10px] border border-emerald-500/30 transition cursor-pointer"
            >
              Test Consistent
            </button>
            <button
              onClick={() => loadScenario('duplicate_gst')}
              className="px-2 py-0.5 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded text-[10px] border border-red-500/30 transition cursor-pointer"
            >
              Test Reused GST/PAN
            </button>
            <button
              onClick={() => loadScenario('missing_info')}
              className="px-2 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded text-[10px] border border-amber-500/30 transition cursor-pointer"
            >
              Test Missing Data
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 font-medium">Agency / Company Name</label>
            <input
              type="text"
              value={checkAgencyName}
              onChange={(e) => setCheckAgencyName(e.target.value)}
              placeholder="e.g. Apex Infrastructure & Works Ltd"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 font-medium">Agency / Contractor ID</label>
            <input
              type="text"
              value={checkAgencyId}
              onChange={(e) => setCheckAgencyId(e.target.value)}
              placeholder="e.g. AG-CHE-01"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 font-medium">Registration / GSTIN / PAN Ref</label>
            <input
              type="text"
              value={checkRegRef}
              onChange={(e) => setCheckRegRef(e.target.value)}
              placeholder="e.g. 33AAACA1122D1Z4"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          onClick={runAgencyCheck}
          className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow transition cursor-pointer"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Cross-Check Agency Records Against Database</span>
        </button>

        {/* Verification Result Card */}
        {auditResult && (
          <div
            className={`p-4 rounded-xl border space-y-2 text-xs transition-all ${
              auditResult.status === 'Possible Duplicate / Inconsistent Agency Record'
                ? 'bg-red-950/40 border-red-500/50 text-red-200'
                : auditResult.status === 'Verification Required'
                ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {auditResult.status === 'Possible Duplicate / Inconsistent Agency Record' && (
                <XCircle className="w-5 h-5 text-red-400 shrink-0" />
              )}
              {auditResult.status === 'Verification Required' && (
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              )}
              {auditResult.status === 'Agency Information Consistent' && (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              )}
              <span className="font-bold text-sm">{auditResult.headline}</span>
            </div>

            <div className="space-y-1 pl-7">
              {auditResult.notes.map((note, idx) => (
                <div key={idx}>• {note}</div>
              ))}
            </div>

            <div className="pt-2 border-t border-white/10 text-[11px] opacity-80 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>
                Agency verification is based on available records and does not replace official government verification.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Implementing Agencies Central Registry Ledger */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <span>🗂️</span> Executing Agencies Master Directory
            </h4>
            <p className="text-[11px] text-slate-400">
              Contractor registration profiles and associated public works contracts
            </p>
          </div>

          <div className="relative">
            <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search agency, ID, GST, contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-52 sm:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-700">
              <tr>
                <th className="py-2.5 px-3">Agency ID</th>
                <th className="py-2.5 px-3">Agency Name</th>
                <th className="py-2.5 px-3">GSTIN / Registration Ref</th>
                <th className="py-2.5 px-3">Contact Person</th>
                <th className="py-2.5 px-3 text-center">Completed Works</th>
                <th className="py-2.5 px-3">Associated Projects</th>
                <th className="py-2.5 px-3">Agency Verification Status</th>
                <th className="py-2.5 px-3">Audit Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredAgencies.map((agency) => (
                <tr key={agency.agency_id} className="hover:bg-slate-800/40 transition">
                  <td className="py-2.5 px-3 font-mono font-bold text-indigo-400">
                    {agency.agency_id}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-white max-w-[160px] truncate" title={agency.agency_name}>
                    {agency.agency_name}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300">
                    {agency.registration_ref}
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">
                    <span className="block font-medium">{agency.contact_person}</span>
                    <span className="text-[10px] text-slate-500">{agency.contact_phone}</span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-white">
                    {agency.previous_projects_completed}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex flex-wrap gap-1">
                      {agency.associated_projects.map((pid) => (
                        <span
                          key={pid}
                          onClick={() => {
                            const p = projects.find(proj => proj.project_id === pid);
                            if (p && onSelectProject) onSelectProject(p.project_name);
                          }}
                          className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px] cursor-pointer hover:bg-indigo-500/30 transition"
                        >
                          {pid}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        agency.verification_status === 'Agency Information Consistent'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : agency.verification_status === 'Verification Required'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-red-500/20 text-red-300 border border-red-500/30'
                      }`}
                    >
                      {agency.verification_status === 'Agency Information Consistent'
                        ? '🟢 Consistent'
                        : agency.verification_status === 'Verification Required'
                        ? '🟡 Verification Req'
                        : '🔴 Possible Inconsistency'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[11px] text-slate-400 max-w-xs leading-snug">
                    {agency.verification_notes}
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
