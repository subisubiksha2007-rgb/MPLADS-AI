import React, { useState, useRef } from 'react';
import { BillRecord, EnrichedProject, DocumentVerificationStatus } from '../types';
import { INITIAL_AGENCIES } from '../initialData';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  PlusCircle,
  FileCheck,
  Sparkles,
  Info,
  Calendar,
  Building,
  CreditCard,
  Hash,
  IndianRupee,
  RotateCcw
} from 'lucide-react';
import { formatINR } from '../utils/formatters';

interface BillVerificationProps {
  bills: BillRecord[];
  projects: EnrichedProject[];
  onAddBill: (bill: BillRecord) => void;
  onSelectProject?: (projectName: string) => void;
}

export const BillVerification: React.FC<BillVerificationProps> = ({
  bills,
  projects,
  onAddBill,
  onSelectProject,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // The 7 Required Fields
  const [invoiceNumber, setInvoiceNumber] = useState('INV/VEL/2024/774');
  const [vendorName, setVendorName] = useState('Vellore Engineering Services');
  const [gstinPan, setGstinPan] = useState('33BBBPB9876C1Z9');
  const [invoiceDate, setInvoiceDate] = useState('2024-04-18');
  const [projectId, setProjectId] = useState('MPLAD002');
  const [totalAmount, setTotalAmount] = useState<number | ''>(850000);
  const [documentType, setDocumentType] = useState('Culvert & Bitumen Stage Voucher');

  // Verification Result state
  const [verificationResult, setVerificationResult] = useState<{
    status: DocumentVerificationStatus;
    headline: string;
    reasons: string[];
    observations: string[];
  }>({
    status: 'No Obvious Anomaly',
    headline: 'No Obvious Anomaly',
    reasons: [],
    observations: [
      'Invoice number is unique and does not exist in previous claims.',
      'Vendor name matches the registered executing agency for Project MPLAD002.',
      'GSTIN reference (33BBBPB9876C1Z9) is valid and registered to Vellore Engineering Services.',
      'Claim amount (₹8,50,000) is within the sanctioned budget (₹50,00,000).'
    ]
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterResult, setFilterResult] = useState<'All' | DocumentVerificationStatus>('All');

  // Multi-point verification logic
  const verifyBill = (
    invNum: string,
    vendor: string,
    gstin: string,
    date: string,
    projId: string,
    amt: number | ''
  ) => {
    const numAmount = typeof amt === 'number' ? amt : Number(amt) || 0;
    const cleanInv = invNum.trim();
    const cleanVendor = vendor.trim();
    const cleanGstin = gstin.trim().toUpperCase();
    const targetProject = projects.find(p => p.project_id === projId);

    const reasons: string[] = [];
    const observations: string[] = [];
    let status: DocumentVerificationStatus = 'No Obvious Anomaly';
    let headline = 'No Obvious Anomaly';

    // 1. Check for Duplicate Invoice Number
    const duplicateInvoice = bills.find(
      b => b.invoice_number.trim().toLowerCase() === cleanInv.toLowerCase()
    );
    if (duplicateInvoice) {
      status = 'Possible Duplicate/Inconsistency';
      reasons.push(
        `Duplicate Invoice Number: "${cleanInv}" was already registered under Bill ${duplicateInvoice.bill_id} for ${duplicateInvoice.project_name} (${duplicateInvoice.project_id}) on ${duplicateInvoice.bill_date}.`
      );
    }

    // 2. Check for Duplicate Combination (Same Vendor + Same Amount + Same Date)
    const duplicateCombo = bills.find(
      b =>
        b.vendor_name.trim().toLowerCase() === cleanVendor.toLowerCase() &&
        b.amount === numAmount &&
        b.bill_date === date &&
        b.invoice_number.trim().toLowerCase() !== cleanInv.toLowerCase()
    );
    if (duplicateCombo) {
      status = 'Possible Duplicate/Inconsistency';
      reasons.push(
        `Duplicate Transaction Record: An identical payment claim of ${formatINR(numAmount)} from "${cleanVendor}" on date "${date}" already exists under ${duplicateCombo.bill_id}.`
      );
    }

    // 3. Check Vendor Name and GSTIN match
    const knownAgencyByGst = INITIAL_AGENCIES.find(
      a => a.registration_ref.toUpperCase() === cleanGstin
    );
    if (knownAgencyByGst && cleanVendor) {
      if (knownAgencyByGst.agency_name.toLowerCase() !== cleanVendor.toLowerCase()) {
        status = 'Possible Duplicate/Inconsistency';
        reasons.push(
          `Vendor Name and GSTIN Mismatch: The provided GSTIN "${cleanGstin}" is officially registered to "${knownAgencyByGst.agency_name}", but the bill claims to be from "${cleanVendor}".`
        );
      }
    }

    // GSTIN format check
    if (cleanGstin && cleanGstin.length !== 15 && cleanGstin.length !== 10) {
      if (status !== 'Possible Duplicate/Inconsistency') {
        status = 'Needs Verification';
      }
      reasons.push(
        `GSTIN/PAN Format Inconsistency: "${cleanGstin}" does not match standard 15-character GSTIN or 10-character PAN structure.`
      );
    }

    // 4. Check Project ID Mismatch
    if (targetProject && cleanVendor) {
      if (targetProject.agency_name.toLowerCase() !== cleanVendor.toLowerCase()) {
        if (status !== 'Possible Duplicate/Inconsistency') {
          status = 'Needs Verification';
        }
        reasons.push(
          `Project ID Mismatch: Project ${projId} (${targetProject.project_name}) is contracted to "${targetProject.agency_name}". The voucher vendor is listed as "${cleanVendor}".`
        );
      }
    }

    // 5. Check Amount Inconsistency
    if (numAmount <= 0) {
      if (status !== 'Possible Duplicate/Inconsistency') {
        status = 'Needs Verification';
      }
      reasons.push('Amount Inconsistency: Bill claim amount must be greater than ₹0.');
    } else if (targetProject && numAmount > targetProject.approved_amount) {
      status = 'Possible Duplicate/Inconsistency';
      reasons.push(
        `Amount Inconsistency: Claimed amount of ${formatINR(numAmount)} exceeds the total sanctioned project budget of ${formatINR(targetProject.approved_amount)}.`
      );
    } else if (targetProject && (targetProject.spent_amount + numAmount > targetProject.approved_amount * 1.02)) {
      if (status !== 'Possible Duplicate/Inconsistency') {
        status = 'Needs Verification';
      }
      reasons.push(
        `Amount Inconsistency: Existing spent amount (${formatINR(targetProject.spent_amount)}) plus this claim (${formatINR(numAmount)}) would overshoot sanctioned budget (${formatINR(targetProject.approved_amount)}).`
      );
    }

    // If clean
    if (reasons.length === 0) {
      status = 'No Obvious Anomaly';
      headline = 'No Obvious Anomaly';
      observations.push('Invoice number is unique and verified against central records.');
      observations.push('Vendor credentials and GSTIN match state implementing agency registry.');
      observations.push('Associated Project ID aligns with contractor work order.');
      observations.push('Claim amount is verified within approved financial thresholds.');
    } else if (status === 'Possible Duplicate/Inconsistency') {
      headline = 'Possible Duplicate/Inconsistency';
    } else {
      headline = 'Needs Verification';
    }

    const resultObj = { status, headline, reasons, observations };
    setVerificationResult(resultObj);
    return resultObj;
  };

  // Trigger verification on field change
  const handleFieldChange = (
    invNum = invoiceNumber,
    vend = vendorName,
    gst = gstinPan,
    dt = invoiceDate,
    pId = projectId,
    amt = totalAmount
  ) => {
    verifyBill(invNum, vend, gst, dt, pId, amt);
  };

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsAnalyzing(true);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }

    // Simulate OCR text extraction
    setTimeout(() => {
      setIsAnalyzing(false);
      // Generate OCR parsed fields based on the uploaded file
      const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
      const randomSuffix = Math.floor(100 + Math.random() * 899);
      const newInv = `INV/TN/2024/${randomSuffix}`;
      const newDate = new Date().toISOString().split('T')[0];
      const newVendor = 'Vellore Engineering Services';
      const newGstin = '33BBBPB9876C1Z9';
      const newProjId = 'MPLAD002';
      const newAmt = 720000;
      const newDoc = isPdf ? 'Certified Engineering Progress Voucher (PDF)' : 'Scanned Material Tax Invoice';

      setInvoiceNumber(newInv);
      setVendorName(newVendor);
      setGstinPan(newGstin);
      setInvoiceDate(newDate);
      setProjectId(newProjId);
      setTotalAmount(newAmt);
      setDocumentType(newDoc);

      verifyBill(newInv, newVendor, newGstin, newDate, newProjId, newAmt);
    }, 500);
  };

  // 1-Click Test Scenarios for demonstration
  const loadScenario = (type: 'clean' | 'dup_inv' | 'mismatch_gst' | 'mismatch_proj' | 'excess_amt') => {
    if (type === 'clean') {
      const inv = 'INV/VEL/2024/991';
      const vend = 'Vellore Engineering Services';
      const gst = '33BBBPB9876C1Z9';
      const dt = '2024-05-18';
      const pid = 'MPLAD002';
      const amt = 450000;
      setInvoiceNumber(inv);
      setVendorName(vend);
      setGstinPan(gst);
      setInvoiceDate(dt);
      setProjectId(pid);
      setTotalAmount(amt);
      setDocumentType('Culvert Drainage Stone Masonry');
      verifyBill(inv, vend, gst, dt, pid, amt);
    } else if (type === 'dup_inv') {
      // Existing invoice in INITIAL_BILLS: INV/CHE/2024/089
      const inv = 'INV/CHE/2024/089';
      const vend = 'Apex Infrastructure & Works Ltd';
      const gst = '33AAACA1122D1Z4';
      const dt = '2024-03-15';
      const pid = 'MPLAD001';
      const amt = 1950000;
      setInvoiceNumber(inv);
      setVendorName(vend);
      setGstinPan(gst);
      setInvoiceDate(dt);
      setProjectId(pid);
      setTotalAmount(amt);
      setDocumentType('Duplicate RCC Claim (Second Submission)');
      verifyBill(inv, vend, gst, dt, pid, amt);
    } else if (type === 'mismatch_gst') {
      // Vendor claims to be Madurai Public Works, but inputs Apex Infrastructure GSTIN
      const inv = `INV/MAD/2024/883`;
      const vend = 'Madurai Public Works Consortium';
      const gst = '33AAACA1122D1Z4'; // Belongs to Apex Infrastructure!
      const dt = '2024-05-22';
      const pid = 'MPLAD004';
      const amt = 650000;
      setInvoiceNumber(inv);
      setVendorName(vend);
      setGstinPan(gst);
      setInvoiceDate(dt);
      setProjectId(pid);
      setTotalAmount(amt);
      setDocumentType('Roof Truss Fabrication Claim');
      verifyBill(inv, vend, gst, dt, pid, amt);
    } else if (type === 'mismatch_proj') {
      // Vendor Kongu Infra (Coimbatore) submitting for Trichy MPLAD012 (Delta Buildcon)
      const inv = 'INV/MIS/2024/404';
      const vend = 'Kongu Infra Developments';
      const gst = '33AABCK9911P1Z3';
      const dt = '2024-05-10';
      const pid = 'MPLAD012'; // Assigned to Delta Buildcon!
      const amt = 900000;
      setInvoiceNumber(inv);
      setVendorName(vend);
      setGstinPan(gst);
      setInvoiceDate(dt);
      setProjectId(pid);
      setTotalAmount(amt);
      setDocumentType('Unassigned Earthwork Claim');
      verifyBill(inv, vend, gst, dt, pid, amt);
    } else if (type === 'excess_amt') {
      // Claim exceeds approved budget
      const inv = 'INV/EXC/2024/550';
      const vend = 'Salem Civil & Water Utilities Pvt Ltd';
      const gst = '33AABCS4455E1Z1';
      const dt = '2024-05-25';
      const pid = 'MPLAD003'; // approved amount is 20,00,000
      const amt = 2800000; // Exceeds 20L
      setInvoiceNumber(inv);
      setVendorName(vend);
      setGstinPan(gst);
      setInvoiceDate(dt);
      setProjectId(pid);
      setTotalAmount(amt);
      setDocumentType('Overbudget Pipeline Extension Claim');
      verifyBill(inv, vend, gst, dt, pid, amt);
    }
  };

  // Add bill to ledger after verification
  const handleSaveToLedger = () => {
    const numAmount = typeof totalAmount === 'number' ? totalAmount : Number(totalAmount) || 0;
    const targetProj = projects.find(p => p.project_id === projectId);

    const newBill: BillRecord = {
      bill_id: `BILL-2024-${String(bills.length + 1).padStart(3, '0')}`,
      invoice_number: invoiceNumber,
      project_id: projectId,
      project_name: targetProj?.project_name || 'Public Works Project',
      vendor_name: vendorName,
      gstin_pan: gstinPan,
      amount: numAmount,
      bill_date: invoiceDate,
      document_type: documentType,
      verification_status: verificationResult.status,
      verification_notes:
        verificationResult.reasons.length > 0
          ? verificationResult.reasons.join(' | ')
          : 'Document verified. No obvious anomaly detected against available records.',
      ocr_extracted: true,
      uploaded_at: new Date().toISOString().replace('T', ' ').slice(0, 16)
    };

    onAddBill(newBill);
    alert(`Bill "${newBill.bill_id}" (${newBill.invoice_number}) logged in central registry with status: ${verificationResult.status}`);
  };

  const filteredBills = bills.filter(b => {
    if (filterResult !== 'All' && b.verification_status !== filterResult) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.invoice_number.toLowerCase().includes(q) ||
      b.bill_id.toLowerCase().includes(q) ||
      b.vendor_name.toLowerCase().includes(q) ||
      b.gstin_pan.toLowerCase().includes(q) ||
      b.project_id.toLowerCase().includes(q)
    );
  });

  return (
    <div id="bill-verification-section" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📄</span>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Bill / Document Verification
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold font-mono">
              OCR &amp; Cross-Check
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Automated verification of invoice numbers, GSTIN/PAN records, vendor allocations, and claim amounts against government registry
          </p>
        </div>

        {/* Upload Bill Main Button */}
        <div>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-md transition cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Bill (Image / PDF)</span>
          </button>
        </div>
      </div>

      {/* Demo Test Scenarios Selector Bar */}
      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          Quick Test Scenarios:
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => loadScenario('clean')}
            className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 rounded text-[11px] border border-emerald-500/30 font-medium transition cursor-pointer"
          >
            🟢 No Obvious Anomaly
          </button>
          <button
            onClick={() => loadScenario('dup_inv')}
            className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded text-[11px] border border-red-500/30 font-medium transition cursor-pointer"
          >
            🔴 Duplicate Invoice #
          </button>
          <button
            onClick={() => loadScenario('mismatch_gst')}
            className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded text-[11px] border border-red-500/30 font-medium transition cursor-pointer"
          >
            🔴 Vendor &amp; GSTIN Mismatch
          </button>
          <button
            onClick={() => loadScenario('mismatch_proj')}
            className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded text-[11px] border border-amber-500/30 font-medium transition cursor-pointer"
          >
            🟡 Project ID Mismatch
          </button>
          <button
            onClick={() => loadScenario('excess_amt')}
            className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded text-[11px] border border-red-500/30 font-medium transition cursor-pointer"
          >
            🔴 Amount Inconsistency
          </button>
        </div>
      </div>

      {/* Main Grid: Upload & Read Bill Details + Verification Result */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Upload Dropzone & Optical Preview (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-blue-400" />
              Bill Document Upload
            </h4>

            {/* Clickable Drag & Drop Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-800 hover:border-blue-500/60 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition bg-slate-900/40 hover:bg-slate-900/80 group text-center"
            >
              <FileText className="w-9 h-9 text-slate-500 group-hover:text-blue-400 mb-2 transition" />
              <span className="text-xs font-semibold text-slate-200 group-hover:text-white">
                {selectedFile ? selectedFile.name : 'Click to select bill image or PDF'}
              </span>
              <span className="text-[10px] text-slate-500 mt-1">
                Supports scans, invoices, and vouchers (PNG, JPG, PDF)
              </span>
              {selectedFile && (
                <span className="mt-2 text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
                  {(selectedFile.size / 1024).toFixed(1)} KB · Ready
                </span>
              )}
            </div>

            {isAnalyzing && (
              <div className="p-2.5 bg-blue-950/40 rounded-lg border border-blue-500/30 flex items-center gap-2 text-xs text-blue-300">
                <Sparkles className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
                <span>Scanning document layout and extracting OCR fields...</span>
              </div>
            )}

            {filePreview && (
              <div className="rounded-lg overflow-hidden border border-slate-800 max-h-48 relative">
                <img src={filePreview} alt="Bill Scan" className="w-full object-cover" />
                <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 px-2 py-1 text-[10px] text-slate-300 font-mono">
                  Optical preview: {selectedFile?.name}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Read Bill Details (The 7 Required Fields) & Verification Result (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-indigo-400" />
                1. Read Bill Details (Extracted Voucher Information)
              </h4>
              <span className="text-[10px] text-slate-500 font-mono">Editable OCR attributes</span>
            </div>

            {/* The 7 Requested Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              {/* 2. Invoice Number */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                  <Hash className="w-3 h-3 text-slate-400" />
                  <span>2. Invoice Number</span>
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => {
                    setInvoiceNumber(e.target.value);
                    handleFieldChange(e.target.value, vendorName, gstinPan, invoiceDate, projectId, totalAmount);
                  }}
                  placeholder="e.g. INV/VEL/2024/104"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* 3. Vendor Name */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                  <Building className="w-3 h-3 text-slate-400" />
                  <span>3. Vendor Name</span>
                </label>
                <input
                  type="text"
                  value={vendorName}
                  onChange={(e) => {
                    setVendorName(e.target.value);
                    handleFieldChange(invoiceNumber, e.target.value, gstinPan, invoiceDate, projectId, totalAmount);
                  }}
                  placeholder="e.g. Vellore Engineering Services"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* 4. GSTIN / PAN */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                  <CreditCard className="w-3 h-3 text-slate-400" />
                  <span>4. GSTIN / PAN</span>
                </label>
                <input
                  type="text"
                  value={gstinPan}
                  onChange={(e) => {
                    setGstinPan(e.target.value);
                    handleFieldChange(invoiceNumber, vendorName, e.target.value, invoiceDate, projectId, totalAmount);
                  }}
                  placeholder="e.g. 33BBBPB9876C1Z9"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* 5. Invoice Date */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>5. Invoice Date</span>
                </label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => {
                    setInvoiceDate(e.target.value);
                    handleFieldChange(invoiceNumber, vendorName, gstinPan, e.target.value, projectId, totalAmount);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                />
              </div>

              {/* 6. Project ID */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                  <Search className="w-3 h-3 text-slate-400" />
                  <span>6. Project ID</span>
                </label>
                <select
                  value={projectId}
                  onChange={(e) => {
                    setProjectId(e.target.value);
                    handleFieldChange(invoiceNumber, vendorName, gstinPan, invoiceDate, e.target.value, totalAmount);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                >
                  {projects.map((p) => (
                    <option key={p.project_id} value={p.project_id}>
                      {p.project_id} - {p.project_name} ({p.district})
                    </option>
                  ))}
                </select>
              </div>

              {/* 7. Total Amount */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                  <IndianRupee className="w-3 h-3 text-slate-400" />
                  <span>7. Total Amount (₹ INR)</span>
                </label>
                <input
                  type="number"
                  value={totalAmount}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : '';
                    setTotalAmount(val);
                    handleFieldChange(invoiceNumber, vendorName, gstinPan, invoiceDate, projectId, val);
                  }}
                  placeholder="e.g. 850000"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Description / Milestone */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-medium">Work Voucher Description</label>
                <input
                  type="text"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  placeholder="e.g. Stage 1 Masonry Claim"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Re-verify Button */}
            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => verifyBill(invoiceNumber, vendorName, gstinPan, invoiceDate, projectId, totalAmount)}
                className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-Check Against Database</span>
              </button>
            </div>
          </div>

          {/* 8 & 9. Verification Result Card */}
          <div
            className={`p-4 rounded-xl border space-y-3 shadow-sm transition-all ${
              verificationResult.status === 'Possible Duplicate/Inconsistency'
                ? 'bg-red-950/40 border-red-500/50 text-red-200'
                : verificationResult.status === 'Needs Verification'
                ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2.5">
                {verificationResult.status === 'Possible Duplicate/Inconsistency' && (
                  <XCircle className="w-6 h-6 text-red-400 shrink-0" />
                )}
                {verificationResult.status === 'Needs Verification' && (
                  <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
                )}
                {verificationResult.status === 'No Obvious Anomaly' && (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                )}
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold opacity-75 block">
                    8 &amp; 9. Verification Result:
                  </span>
                  <span className="font-extrabold text-base tracking-tight">
                    {verificationResult.status === 'No Obvious Anomaly'
                      ? '🟢 No Obvious Anomaly'
                      : verificationResult.status === 'Needs Verification'
                      ? '🟡 Needs Verification'
                      : '🔴 Possible Duplicate/Inconsistency'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleSaveToLedger}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold border border-white/20 flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Save to Audit Registry</span>
              </button>
            </div>

            {/* Identified Mismatch Reasons */}
            {verificationResult.reasons.length > 0 && (
              <div className="space-y-1.5 text-xs">
                <span className="font-bold text-red-300 block uppercase tracking-wider text-[10px]">
                  Detected Mismatch / Inconsistency Reasons:
                </span>
                {verificationResult.reasons.map((reason, idx) => (
                  <div key={idx} className="flex items-start gap-2 bg-red-950/30 p-2 rounded border border-red-800/40">
                    <span className="text-red-400 font-bold shrink-0">•</span>
                    <span className="leading-snug text-red-200">{reason}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Clean Observations if No Anomaly */}
            {verificationResult.observations.length > 0 && (
              <div className="space-y-1 text-xs">
                <span className="font-semibold text-emerald-300 block text-[11px]">
                  Cross-Verification Checklist:
                </span>
                {verificationResult.observations.map((obs, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-emerald-200/90">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{obs}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Non-Accusatory Legal Notice */}
            <div className="pt-2 border-t border-white/10 text-[11px] opacity-80 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>
                Document verification identifies inconsistencies and possible duplicates. The result indicates verification requirements based on available data and does not prove fraud or document authenticity.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Central Registry Ledger */}
      <div className="space-y-3 pt-4 border-t border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <span>🗄️</span> Verified Vouchers &amp; Bills Registry
            </h4>
            <p className="text-[11px] text-slate-400">
              Historical ledger of public works vouchers with automated duplicate and mismatch checks
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter by Result */}
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
              {(['All', 'No Obvious Anomaly', 'Needs Verification', 'Possible Duplicate/Inconsistency'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterResult(st)}
                  className={`px-2 py-1 rounded transition cursor-pointer ${
                    filterResult === st ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {st === 'All' ? 'All Records' : st === 'No Obvious Anomaly' ? '🟢 Clean' : st === 'Needs Verification' ? '🟡 Verify' : '🔴 Duplicate'}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search invoice, vendor, GST..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-48 sm:w-56"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-700">
              <tr>
                <th className="py-2.5 px-3">Bill ID</th>
                <th className="py-2.5 px-3">Invoice No</th>
                <th className="py-2.5 px-3">Vendor Name</th>
                <th className="py-2.5 px-3">GSTIN / PAN</th>
                <th className="py-2.5 px-3">Project ID</th>
                <th className="py-2.5 px-3 text-right">Total Amount</th>
                <th className="py-2.5 px-3 text-center">Date</th>
                <th className="py-2.5 px-3">Verification Result</th>
                <th className="py-2.5 px-3">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredBills.map((bill) => (
                <tr key={bill.bill_id} className="hover:bg-slate-800/40 transition">
                  <td className="py-2.5 px-3 font-mono font-medium text-indigo-400">
                    {bill.bill_id}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-white">
                    {bill.invoice_number}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-200 max-w-[150px] truncate" title={bill.vendor_name}>
                    {bill.vendor_name}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                    {bill.gstin_pan}
                  </td>
                  <td
                    className="py-2.5 px-3 font-mono text-indigo-300 font-bold cursor-pointer hover:underline"
                    onClick={() => onSelectProject?.(bill.project_name)}
                  >
                    {bill.project_id}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-amber-400">
                    {formatINR(bill.amount)}
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                    {bill.bill_date}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        bill.verification_status === 'Possible Duplicate/Inconsistency'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : bill.verification_status === 'Needs Verification'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {bill.verification_status === 'Possible Duplicate/Inconsistency'
                        ? '🔴 Possible Duplicate'
                        : bill.verification_status === 'Needs Verification'
                        ? '🟡 Needs Verification'
                        : '🟢 No Obvious Anomaly'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[11px] text-slate-400 max-w-xs leading-snug">
                    {bill.verification_notes}
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
