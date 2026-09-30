import React from 'react';
import {
  FolderGit2,
  TrendingUp,
  Clock,
  CloudRain,
  Cpu,
  FileCheck,
  Building2,
  AlertOctagon
} from 'lucide-react';

export const InvestigationWorkflow: React.FC = () => {
  const steps = [
    {
      step: 1,
      name: 'Project Monitoring',
      desc: 'Active registry ingestion',
      icon: FolderGit2,
      color: 'border-slate-800 text-slate-300'
    },
    {
      step: 2,
      name: 'Financial Analysis',
      desc: 'Fund utilization rate',
      icon: TrendingUp,
      color: 'border-slate-800 text-cyan-300'
    },
    {
      step: 3,
      name: 'Progress & Delay',
      desc: 'Milestones & delay days',
      icon: Clock,
      color: 'border-slate-800 text-indigo-300'
    },
    {
      step: 4,
      name: 'Delay Context Check',
      desc: 'Natural events & extensions',
      icon: CloudRain,
      color: 'border-emerald-800/60 text-emerald-300'
    },
    {
      step: 5,
      name: 'AI Anomaly Detection',
      desc: 'Isolation Forest pattern',
      icon: Cpu,
      color: 'border-amber-800/60 text-amber-300'
    },
    {
      step: 6,
      name: 'Bill / Document Audit',
      desc: 'Invoice & duplicate checks',
      icon: FileCheck,
      color: 'border-blue-800/60 text-blue-300'
    },
    {
      step: 7,
      name: 'Agency Verification',
      desc: 'Registration & GST cross-check',
      icon: Building2,
      color: 'border-violet-800/60 text-violet-300'
    },
    {
      step: 8,
      name: 'Investigation Required',
      desc: 'Human supervisory review',
      icon: AlertOctagon,
      color: 'border-red-800/60 text-red-300'
    }
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-2.5">
      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
        <span className="flex items-center gap-1.5 text-indigo-300">
          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          Autonomous Multi-Stage Audit &amp; Verification Pipeline
        </span>
        <span className="text-[10px] text-slate-500">8-Step Comprehensive Protocol</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {steps.map((st) => {
          const Icon = st.icon;
          return (
            <div
              key={st.step}
              className={`bg-slate-950 p-2.5 rounded-lg border flex flex-col justify-between transition relative ${st.color}`}
            >
              <div>
                <div className="flex items-center justify-between text-[10px] opacity-70 mb-1">
                  <span>Step {st.step}</span>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <h5 className="font-bold text-xs leading-snug text-white">
                  {st.name}
                </h5>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                {st.desc}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
