import React, { useState, useMemo } from 'react';
import { RawProject, FilterState, BillRecord, ImplementingAgency } from './types';
import { INITIAL_PROJECTS, INITIAL_BILLS, INITIAL_AGENCIES } from './initialData';
import { enrichProjects } from './anomalyModel';
import { Sidebar } from './components/Sidebar';
import { KPICards } from './components/KPICards';
import { Charts } from './components/Charts';
import { AnomalyTable } from './components/AnomalyTable';
import { RiskAnalysis } from './components/RiskAnalysis';
import { HighRiskTable } from './components/HighRiskTable';
import { ProjectDetails } from './components/ProjectDetails';
import { AllProjectsTable } from './components/AllProjectsTable';
import { AddProjectModal } from './components/AddProjectModal';
import { BillVerification } from './components/BillVerification';
import { DelayContextAnalysis } from './components/DelayContextAnalysis';
import { AgencyVerification } from './components/AgencyVerification';
import { InvestigationWorkflow } from './components/InvestigationWorkflow';
import {
  Download,
  Info,
  FileCheck,
  CloudRain,
  Building2,
  LayoutDashboard,
  SearchCode,
  Upload
} from 'lucide-react';

export const App: React.FC = () => {
  const [projectsList, setProjectsList] = useState<RawProject[]>(INITIAL_PROJECTS);
  const [billsList, setBillsList] = useState<BillRecord[]>(INITIAL_BILLS);
  const [agenciesList, setAgenciesList] = useState<ImplementingAgency[]>(INITIAL_AGENCIES);

  const [activeTab, setActiveTab] = useState<'overview' | 'bills' | 'delay_context' | 'agencies' | 'inspector'>('overview');

  const [filters, setFilters] = useState<FilterState>({
    district: 'All',
    category: 'All',
    riskLevel: 'All',
    completionStatus: 'All',
    aiDetection: 'All',
    delayContext: 'All',
    searchQuery: '',
  });

  const [selectedProjectName, setSelectedProjectName] = useState<string>(
    INITIAL_PROJECTS[0]?.project_name || 'School Building'
  );
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Run AI Anomaly Detection & Multi-factor Risk Calculations with bills & agencies cross-check
  const enrichedAllProjects = useMemo(() => {
    return enrichProjects(projectsList, billsList, agenciesList);
  }, [projectsList, billsList, agenciesList]);

  // Unique list of districts and categories
  const districts = useMemo(() => {
    const set = new Set(projectsList.map(p => p.district));
    return ['All', ...Array.from(set).sort()];
  }, [projectsList]);

  const categories = useMemo(() => {
    const set = new Set(projectsList.map(p => p.category));
    return ['All', ...Array.from(set).sort()];
  }, [projectsList]);

  // Filtered dataset according to sidebar selections + search
  const filteredProjects = useMemo(() => {
    return enrichedAllProjects.filter(p => {
      if (filters.district !== 'All' && p.district !== filters.district) return false;
      if (filters.category !== 'All' && p.category !== filters.category) return false;
      if (filters.riskLevel !== 'All' && p.risk_level !== filters.riskLevel) return false;
      if (filters.completionStatus !== 'All' && p.completion_status !== filters.completionStatus) return false;
      if (filters.aiDetection !== 'All' && p.ai_anomaly !== filters.aiDetection) return false;
      if (filters.delayContext !== 'All' && p.delay_context_status !== filters.delayContext) return false;
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const matchName = p.project_name.toLowerCase().includes(query);
        const matchId = p.project_id.toLowerCase().includes(query);
        const matchDistrict = p.district.toLowerCase().includes(query);
        const matchCat = p.category.toLowerCase().includes(query);
        const matchAgency = p.agency_name.toLowerCase().includes(query);
        const matchReason = p.delay_reason.toLowerCase().includes(query);
        if (!matchName && !matchId && !matchDistrict && !matchCat && !matchAgency && !matchReason) {
          return false;
        }
      }
      return true;
    });
  }, [enrichedAllProjects, filters]);

  const handleResetFilters = () => {
    setFilters({
      district: 'All',
      category: 'All',
      riskLevel: 'All',
      completionStatus: 'All',
      aiDetection: 'All',
      delayContext: 'All',
      searchQuery: '',
    });
  };

  const handleAddProject = (newProject: RawProject) => {
    setProjectsList(prev => [newProject, ...prev]);
    setSelectedProjectName(newProject.project_name);
    setActiveTab('inspector');
    setTimeout(() => {
      document.getElementById('project-inspector-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  const selectAndInspectProject = (name: string) => {
    setSelectedProjectName(name);
    setActiveTab('inspector');
    setTimeout(() => {
      document.getElementById('project-inspector-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleAddBill = (newBill: BillRecord) => {
    setBillsList(prev => [newBill, ...prev]);
  };

  const handleAddAgency = (newAgency: ImplementingAgency) => {
    setAgenciesList(prev => [newAgency, ...prev]);
  };

  // Helper to generate and download CSV
  const exportCSV = (data: typeof enrichedAllProjects, filename: string) => {
    const headers = [
      'Project ID',
      'Project Name',
      'District',
      'Category',
      'Executing Agency',
      'Approved Amount (INR)',
      'Spent Amount (INR)',
      'Utilization %',
      'Progress %',
      'Delay Days',
      'Delay Reason',
      'Supporting Document',
      'Approved Extension',
      'Extension Days',
      'Delay Context',
      'Completion Status',
      'Risk Level',
      'AI Detection',
      'Document Status',
      'Agency Status',
      'Risk Reasons'
    ];

    const rows = data.map(p => [
      p.project_id,
      `"${p.project_name.replace(/"/g, '""')}"`,
      p.district,
      p.category,
      `"${p.agency_name.replace(/"/g, '""')}"`,
      p.approved_amount,
      p.spent_amount,
      p.utilization_percent,
      p.progress_percent,
      p.delay_days,
      `"${p.delay_reason}"`,
      `"${(p.supporting_document || p.supporting_event || '').replace(/"/g, '""')}"`,
      p.approved_extension ? 'Yes' : 'No',
      p.extension_days || 0,
      `"${p.delay_context_status}"`,
      p.completion_status,
      p.risk_level,
      p.ai_anomaly,
      `"${p.document_verification_status}"`,
      `"${p.agency_verification_status}"`,
      `"${p.risk_reason.replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportAnomalyReport = () => {
    const anomalyData = filteredProjects.filter(
      p =>
        p.ai_anomaly === 'Anomaly Detected' ||
        p.risk_level === 'High Risk' ||
        p.document_verification_status === 'Possible Duplicate/Inconsistency' ||
        p.agency_verification_status === 'Possible Duplicate / Inconsistent Agency Record'
    );
    exportCSV(
      anomalyData.length > 0 ? anomalyData : filteredProjects,
      `mplads_anomaly_audit_report_${Date.now()}.csv`
    );
  };

  const handleExportAllProjects = () => {
    exportCSV(filteredProjects, `mplads_all_projects_registry_${Date.now()}.csv`);
  };

  const anomaliesCount = filteredProjects.filter(p => p.ai_anomaly === 'Anomaly Detected').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row antialiased">
      {/* Sidebar with 6 Filters */}
      <Sidebar
        districts={districts}
        categories={categories}
        filters={filters}
        onFilterChange={setFilters}
        onResetFilters={handleResetFilters}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onExportAnomalyReport={handleExportAnomalyReport}
        onExportAllProjects={handleExportAllProjects}
        totalFiltered={filteredProjects.length}
        totalCount={projectsList.length}
        anomalyCount={anomaliesCount}
      />

      {/* Main Dashboard Surface */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-7 max-w-7xl mx-auto w-full overflow-y-auto">
        {/* 1. TOP HEADER (Government / Public-Sector Style) */}
        <header className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-2xl shadow-md shrink-0">
                🤖
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                    MPLADS AI
                  </h1>
                  <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Audit &amp; Anomaly Engine
                  </span>
                </div>
                <p className="text-slate-400 text-xs sm:text-sm font-normal mt-0.5">
                  Fraud &amp; Anomaly Detection Dashboard for MPLADS Scheme Implementation
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
              {/* Live Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>AI Monitoring Active</span>
              </div>

              {/* Upload Bill Quick Button */}
              <button
                onClick={() => {
                  setActiveTab('bills');
                  setTimeout(() => {
                    document.getElementById('bill-verification-section')?.scrollIntoView({ behavior: 'smooth' });
                  }, 50);
                }}
                className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Bill</span>
              </button>

              {/* Export Quick Button */}
              <button
                onClick={handleExportAnomalyReport}
                className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Audit</span>
              </button>
            </div>
          </div>

          {/* 6. INVESTIGATION WORKFLOW INDICATOR */}
          <InvestigationWorkflow />

          {/* Navigation Tabs (Top-Level Modules) */}
          <nav className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1.5 rounded-xl overflow-x-auto text-xs font-semibold">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-2 rounded-lg transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Scheme Overview &amp; Analytics</span>
            </button>

            <button
              onClick={() => setActiveTab('bills')}
              className={`px-3.5 py-2 rounded-lg transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'bills'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileCheck className="w-4 h-4 text-blue-400" />
              <span>📄 Bill &amp; Document Verification</span>
            </button>

            <button
              onClick={() => setActiveTab('delay_context')}
              className={`px-3.5 py-2 rounded-lg transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'delay_context'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <CloudRain className="w-4 h-4 text-cyan-400" />
              <span>🌧️ Delay Context Analysis</span>
            </button>

            <button
              onClick={() => setActiveTab('agencies')}
              className={`px-3.5 py-2 rounded-lg transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'agencies'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Building2 className="w-4 h-4 text-violet-400" />
              <span>🏢 Implementing Agency Verification</span>
            </button>

            <button
              onClick={() => setActiveTab('inspector')}
              className={`px-3.5 py-2 rounded-lg transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'inspector'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <SearchCode className="w-4 h-4 text-indigo-400" />
              <span>🔎 Forensic Inspector</span>
            </button>
          </nav>

          {/* 7. MANDATORY DISCLAIMER NOTE BANNER */}
          <div className="p-3.5 bg-indigo-950/20 border border-indigo-500/30 rounded-xl flex items-start gap-3 text-xs text-indigo-200">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-slate-100 block">Statutory Assurance &amp; Legal Boundary:</span>
              <p className="text-slate-300 leading-relaxed text-[11.5px]">
                AI anomaly detection identifies unusual patterns for further investigation. An anomaly is not proof of fraud. Document and agency verification results are based on available records and should be confirmed through official sources.
              </p>
            </div>
          </div>
        </header>

        {/* Tab 1: Scheme Overview & Analytics */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* KPI Cards */}
            <section aria-label="Key Performance Indicators">
              <KPICards projects={filteredProjects} />
            </section>

            {/* Analytics Charts */}
            <section id="analytics-section" aria-label="Analytical Visualizations">
              <Charts projects={filteredProjects} />
            </section>

            {/* AI Anomaly Detection Section */}
            <section id="anomaly-section" aria-label="AI Anomaly Detection">
              <AnomalyTable
                projects={filteredProjects}
                allProjects={enrichedAllProjects}
                onSelectProject={selectAndInspectProject}
              />
            </section>

            {/* Risk Scoring Methodology */}
            <section id="risk-analysis-section" aria-label="Risk Scoring Methodology">
              <RiskAnalysis
                projects={filteredProjects}
                onSelectProject={selectAndInspectProject}
              />
            </section>

            {/* High-Risk Project Alerts */}
            <section id="alerts-section" aria-label="High-Risk Project Alerts">
              <HighRiskTable
                projects={filteredProjects}
                onSelectProject={selectAndInspectProject}
              />
            </section>

            {/* Bill / Document Verification Section */}
            <section id="bill-verification-section" aria-label="Bill and Document Verification">
              <BillVerification
                bills={billsList}
                projects={enrichedAllProjects}
                onAddBill={handleAddBill}
                onSelectProject={selectAndInspectProject}
              />
            </section>

            {/* All Projects Master Table */}
            <section id="ledger-section" aria-label="All Projects Registry">
              <AllProjectsTable
                projects={filteredProjects}
                onSelectProject={selectAndInspectProject}
              />
            </section>
          </div>
        )}

        {/* Tab 2: 1. Bill & Document Verification Module */}
        {activeTab === 'bills' && (
          <section aria-label="Bill and Document Verification">
            <BillVerification
              bills={billsList}
              projects={enrichedAllProjects}
              onAddBill={handleAddBill}
              onSelectProject={selectAndInspectProject}
            />
          </section>
        )}

        {/* Tab 3: 2. Delay Context Analysis Module */}
        {activeTab === 'delay_context' && (
          <section aria-label="Delay Context Analysis">
            <DelayContextAnalysis
              projects={filteredProjects}
              onSelectProject={selectAndInspectProject}
            />
          </section>
        )}

        {/* Tab 4: 3. Implementing Agency Verification Module */}
        {activeTab === 'agencies' && (
          <section aria-label="Implementing Agency Verification">
            <AgencyVerification
              agencies={agenciesList}
              projects={enrichedAllProjects}
              onAddAgency={handleAddAgency}
              onSelectProject={selectAndInspectProject}
            />
          </section>
        )}

        {/* Tab 5: 5. Forensic Project Inspector Module */}
        {activeTab === 'inspector' && (
          <section id="project-inspector-section" aria-label="Project Inspector">
            <ProjectDetails
              projects={filteredProjects.length > 0 ? filteredProjects : enrichedAllProjects}
              selectedProjectName={selectedProjectName}
              onSelectProjectName={setSelectedProjectName}
            />
          </section>
        )}

        {/* Footer matching specifications */}
        <footer className="pt-6 border-t border-slate-800 text-xs text-slate-400 space-y-2">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="font-semibold text-slate-300">
              MPLADS AI | TEAM NOVA | Hackathon Prototype v2.5
            </p>
            <div className="flex items-center gap-3 text-slate-500 text-[11px] flex-wrap">
              <span>Isolation Forest ML Engine</span>
              <span>•</span>
              <span>Context-Aware Delay Decoupling</span>
              <span>•</span>
              <span>OCR Bill Audit</span>
              <span>•</span>
              <span>Agency Consistency Registry</span>
            </div>
          </div>
          <p className="text-slate-500 text-[11px] leading-relaxed">
            AI anomaly detection identifies unusual patterns for further investigation. An anomaly is not proof of fraud. Document and agency verification results are based on available records and should be confirmed through official sources.
          </p>
        </footer>
      </main>

      {/* Add Project Modal */}
      <AddProjectModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddProject={handleAddProject}
        existingDistricts={districts}
        existingCategories={categories}
      />
    </div>
  );
};
