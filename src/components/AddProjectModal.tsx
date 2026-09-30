import React, { useState } from 'react';
import { RawProject, CompletionStatus } from '../types';
import { X, Plus, Sparkles } from 'lucide-react';

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProject: (project: RawProject) => void;
  existingDistricts: string[];
  existingCategories: string[];
}

export const AddProjectModal: React.FC<AddProjectModalProps> = ({
  isOpen,
  onClose,
  onAddProject,
  existingDistricts,
  existingCategories
}) => {
  const [projectId, setProjectId] = useState(`MPLAD0${Math.floor(Math.random() * 900 + 100)}`);
  const [projectName, setProjectName] = useState('');
  const [district, setDistrict] = useState(existingDistricts[0] || 'Chennai');
  const [category, setCategory] = useState(existingCategories[0] || 'Infrastructure');
  const [approvedAmount, setApprovedAmount] = useState<number>(3000000);
  const [spentAmount, setSpentAmount] = useState<number>(2500000);
  const [progressPercent, setProgressPercent] = useState<number>(30);
  const [delayDays, setDelayDays] = useState<number>(65);
  const [completionStatus, setCompletionStatus] = useState<CompletionStatus>('Ongoing');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    onAddProject({
      project_id: projectId.trim(),
      project_name: projectName.trim(),
      district,
      category,
      approved_amount: Number(approvedAmount),
      spent_amount: Number(spentAmount),
      progress_percent: Number(progressPercent),
      delay_days: Number(delayDays),
      completion_status: completionStatus,
      delay_reason: 'Unknown / No Documented Reason',
      supporting_event: 'Submitted for field audit evaluation',
      approved_extension: false,
      agency_id: 'AG-EXP-01',
      agency_name: 'District Executing Contractor'
    });

    onClose();
  };

  const loadAnomalyPreset = () => {
    setProjectName('High Discrepancy Health Center');
    setApprovedAmount(4800000);
    setSpentAmount(4700000);
    setProgressPercent(20);
    setDelayDays(85);
    setCompletionStatus('Delayed');
  };

  const loadNormalPreset = () => {
    setProjectName('Rural Solar Microgrid');
    setApprovedAmount(2500000);
    setSpentAmount(1800000);
    setProgressPercent(75);
    setDelayDays(8);
    setCompletionStatus('Ongoing');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-800/40">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-400" />
              Add Project for Anomaly Audit
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Input project metrics to run real-time AI anomaly detection</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Quick presets */}
          <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-950/60 rounded-lg border border-slate-800 text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Quick Presets:
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={loadAnomalyPreset}
                className="px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition cursor-pointer"
              >
                Suspect Anomaly
              </button>
              <button
                type="button"
                onClick={loadNormalPreset}
                className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition cursor-pointer"
              >
                Normal Project
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">Project ID</label>
              <input
                type="text"
                required
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">Project Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Primary School Wing"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">District</label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
              >
                {existingDistricts.filter(d => d !== 'All').map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
              >
                {existingCategories.filter(c => c !== 'All').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">Approved Amount (₹)</label>
              <input
                type="number"
                required
                min={100000}
                step={50000}
                value={approvedAmount}
                onChange={(e) => setApprovedAmount(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">Spent Amount (₹)</label>
              <input
                type="number"
                required
                min={0}
                step={50000}
                value={spentAmount}
                onChange={(e) => setSpentAmount(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">Progress (%)</label>
              <input
                type="number"
                required
                min={0}
                max={100}
                value={progressPercent}
                onChange={(e) => setProgressPercent(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">Delay (Days)</label>
              <input
                type="number"
                required
                min={0}
                value={delayDays}
                onChange={(e) => setDelayDays(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">Status</label>
              <select
                value={completionStatus}
                onChange={(e) => setCompletionStatus(e.target.value as CompletionStatus)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="Ongoing">Ongoing</option>
                <option value="Delayed">Delayed</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-indigo-600/30 transition cursor-pointer"
            >
              Run AI Evaluation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
