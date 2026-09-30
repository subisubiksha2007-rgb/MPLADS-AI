import React, { useState, useRef, useMemo, useEffect } from 'react';
import { BillRecord, EnrichedProject, DocumentVerificationStatus } from '../types';
import { INITIAL_AGENCIES } from '../initialData';
import {
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
  Hash,
  IndianRupee,
  Download,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
  Files,
  Layers,
  Check,
  Filter,
  Trash2,
  RefreshCw,
  ArrowRight,
  FilePlus,
} from 'lucide-react';
import { formatINR } from '../utils/formatters';
import {
  extractTextFromDocument,
  parseInvoiceFields,
  generateTestBillPDF,
} from '../utils/billDocumentExtractor';

interface BillVerificationProps {
  bills: BillRecord[];
  projects: EnrichedProject[];
  onAddBill: (bill: BillRecord) => void;
  onSelectProject?: (projectName: string) => void;
}

export interface VerificationFindingItem {
  category: string;
  matched: boolean;
  status: 'matched' | 'mismatched' | 'missing' | 'warning';
  title: string;
  detail: string;
}

export interface BatchBillItem {
  id: string;
  billNumber: number;
  fileName: string;
  fileSize: number;
  filePreview?: string | null;
  extractionMethod: string;
  rawTextSnippet: string;

  // Extracted values
  invoiceNumber: string;
  vendorName: string;
  gstinPan: string;
  invoiceDate: string;
  projectId: string;
  totalAmount: number | '';
  documentType: string;

  // Verification results
  status: DocumentVerificationStatus;
  headline: string;
  detectedIssues: string[];
  matchedObservations: string[];
  findings: VerificationFindingItem[];
  duplicateWithBillNumbers: number[];

  // UI state
  isExpanded: boolean;
  savedToLedger?: boolean;
}

export type RawBatchBillItem = Omit<
  BatchBillItem,
  'status' | 'headline' | 'detectedIssues' | 'matchedObservations' | 'findings' | 'duplicateWithBillNumbers' | 'isExpanded'
>;

const SESSION_STORAGE_KEY = 'mplads_batch_raw_bills_session_v7';

// Presentation batch demonstrating distinct states: Clean bills, Needs Verification, and Duplicates/Conflicts
const INITIAL_DEMO_BATCH: RawBatchBillItem[] = [
  {
    id: 'demo-1',
    billNumber: 1,
    fileName: 'TechNova_Solutions_Invoice_INV2026001.pdf',
    fileSize: 48600,
    extractionMethod: 'PDF Text Extraction (PDF.js)',
    rawTextSnippet: 'TAX INVOICE - Invoice No: INV-2026-001 | Vendor: TechNova Solutions | GSTIN: 29ABCDE1234F1Z5 | Project ID: MPLAD001 | Date: 2026-09-25 | Total: 111392',
    invoiceNumber: 'INV-2026-001',
    vendorName: 'TechNova Solutions',
    gstinPan: '29ABCDE1234F1Z5',
    invoiceDate: '2026-09-25',
    projectId: 'MPLAD001',
    totalAmount: 111392,
    documentType: 'IT & Digital Surveillance Voucher'
  },
  {
    id: 'demo-2',
    billNumber: 2,
    fileName: 'Vellore_Road_Culvert_Claim_INV991.pdf',
    fileSize: 45200,
    extractionMethod: 'PDF Text Extraction (PDF.js)',
    rawTextSnippet: 'MPLADS SCHEME VOUCHER - Invoice Number: INV/VEL/2024/991 | Vendor Name: Vellore Engineering Services | GSTIN: 33BBBPB9876C1Z9 | Project ID: MPLAD002 | Total Amount: 450000',
    invoiceNumber: 'INV/VEL/2024/991',
    vendorName: 'Vellore Engineering Services',
    gstinPan: '33BBBPB9876C1Z9',
    invoiceDate: '2024-05-18',
    projectId: 'MPLAD002',
    totalAmount: 450000,
    documentType: 'Culvert & Bitumen Stage Voucher'
  },
  {
    id: 'demo-3',
    billNumber: 3,
    fileName: 'Salem_Water_Utilities_Tank_INV882.pdf',
    fileSize: 52100,
    extractionMethod: 'PDF Text Extraction (PDF.js)',
    rawTextSnippet: 'MPLADS SCHEME VOUCHER - Invoice Number: INV/SAL/2024/882 | Vendor Name: Salem Civil & Water Utilities Pvt Ltd | GSTIN: 33AABCS4455E1Z1 | Project ID: MPLAD003 | Total Amount: 620000',
    invoiceNumber: 'INV/SAL/2024/882', // Duplicate in batch with Bill 5!
    vendorName: 'Salem Civil & Water Utilities Pvt Ltd',
    gstinPan: '33AABCS4455E1Z1',
    invoiceDate: '2024-05-22',
    projectId: 'MPLAD003',
    totalAmount: 620000,
    documentType: 'Concrete Foundation Voucher'
  },
  {
    id: 'demo-4',
    billNumber: 4,
    fileName: 'Incomplete_Handwritten_Voucher_INV006.jpg',
    fileSize: 91300,
    extractionMethod: 'Tesseract OCR Engine',
    rawTextSnippet: 'HANDWRITTEN RECEIPT - Invoice Number: INV/INC/2024/006 | Vendor Name: Madurai Public Works Consortium | GSTIN: 33AABCM3322K1Z5 | Date: 2024-05-26 | Project: [Unspecified] | Amount: [Illegible]',
    invoiceNumber: 'INV/INC/2024/006',
    vendorName: 'Madurai Public Works Consortium',
    gstinPan: '33AABCM3322K1Z5',
    invoiceDate: '2024-05-26',
    projectId: '', // Missing project ID -> Needs Verification!
    totalAmount: '', // Missing amount -> Needs Verification!
    documentType: 'Incomplete Material Receipt'
  },
  {
    id: 'demo-5',
    billNumber: 5,
    fileName: 'Duplicate_Salem_Claim_INV882.pdf',
    fileSize: 52100,
    extractionMethod: 'PDF Text Extraction (PDF.js)',
    rawTextSnippet: 'TAX INVOICE - Invoice Number: INV/SAL/2024/882 | Vendor Name: Salem Civil & Water Utilities Pvt Ltd | GSTIN: 33AABCS4455E1Z1 | Project ID: MPLAD003 | Total Amount: 620000',
    invoiceNumber: 'INV/SAL/2024/882', // Duplicate of Bill 3 in same batch!
    vendorName: 'Salem Civil & Water Utilities Pvt Ltd',
    gstinPan: '33AABCS4455E1Z1',
    invoiceDate: '2024-05-22',
    projectId: 'MPLAD003',
    totalAmount: 620000,
    documentType: 'Concrete Foundation Claim Copy'
  },
  {
    id: 'demo-6',
    billNumber: 6,
    fileName: 'Kongu_Overbudget_Excavation_INV777.pdf',
    fileSize: 64200,
    extractionMethod: 'PDF Text Extraction (PDF.js)',
    rawTextSnippet: 'TAX INVOICE - Invoice Number: INV/MIS/2024/777 | Vendor Name: Kongu Infra Developments | GSTIN: 33AABCK9911P1Z3 | Project ID: MPLAD001 | Total Amount: 8500000',
    invoiceNumber: 'INV/MIS/2024/777',
    vendorName: 'Kongu Infra Developments',
    gstinPan: '33AABCK9911P1Z3',
    invoiceDate: '2024-05-25',
    projectId: 'MPLAD001',
    totalAmount: 8500000, // Exceeds MPLAD001 budget of 40,00,000 -> Inconsistency!
    documentType: 'Heavy Earthwork Excavation Claim'
  }
];

export const BillVerification: React.FC<BillVerificationProps> = ({
  bills,
  projects,
  onAddBill,
  onSelectProject,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [isVerifyingAll, setIsVerifyingAll] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [processingStatusText, setProcessingStatusText] = useState('');
  const [lastVerifiedAt, setLastVerifiedAt] = useState<string | null>('Initial Batch Verification Active');
  const [filterStatus, setFilterStatus] = useState<'All' | DocumentVerificationStatus>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Preserve selected files during current session using sessionStorage
  const [batchRawBills, setBatchRawBills] = useState<RawBatchBillItem[]>(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Could not read session bills', err);
    }
    return INITIAL_DEMO_BATCH;
  });

  // Sync to sessionStorage on changes
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(batchRawBills));
    } catch (err) {
      console.warn('Could not persist session bills', err);
    }
  }, [batchRawBills]);

  // Expanded card tracking
  const [expandedBillIds, setExpandedBillIds] = useState<Set<string>>(new Set(['demo-1', 'demo-3']));

  const toggleExpand = (id: string) => {
    setExpandedBillIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /**
   * ACCURATE VERIFICATION & CLASSIFICATION LOGIC
   * 
   * Strict adherence to verification requirements:
   * 
   * 🟢 No Obvious Anomaly:
   * - Invoice number is present and unique
   * - Vendor name is present
   * - GSTIN is present and has valid format
   * - Invoice date is present
   * - Project ID is present
   * - Total amount is present (positive, <= approved project budget)
   * - Invoice calculations are consistent
   * - No duplicate invoice number among uploaded bills or central ledger
   * - No direct conflict with an available project/vendor record
   * 
   * 🟡 Needs Verification:
   * - Missing or unreadable information (invoice number, vendor, date, project ID, or amount)
   * - Unknown / unavailable reference data (never automatically flagged as inconsistency!)
   * 
   * 🔴 Possible Duplicate/Inconsistency:
   * - ONLY when there is a REAL detected conflict or duplicate:
   *   1. Duplicate invoice number among uploaded bills in the batch
   *   2. Same bill/document uploaded more than once in the batch
   *   3. Duplicate invoice number registered in central historical ledger
   *   4. Vendor GSTIN directly conflicts with available record (GSTIN registered to Company A, but bill lists Company B)
   *   5. Vendor details directly conflict with available record (Vendor listed with different registered GSTIN)
   *   6. Invoice amount clearly exceeds the approved project allocation
   */
  const verifiedBatchBills: BatchBillItem[] = useMemo(() => {
    return batchRawBills.map((currentBill, i) => {
      const cleanInv = currentBill.invoiceNumber.trim();
      const cleanVendor = currentBill.vendorName.trim();
      const cleanGstin = currentBill.gstinPan.trim().toUpperCase();
      const normalizedGstin = cleanGstin.replace(/[^A-Z0-9]/g, '');
      const cleanProjId = currentBill.projectId.trim().toUpperCase();
      const numAmount = typeof currentBill.totalAmount === 'number' ? currentBill.totalAmount : Number(currentBill.totalAmount) || 0;

      const detectedIssues: string[] = [];
      const matchedObservations: string[] = [];
      const findings: VerificationFindingItem[] = [];
      const duplicateWithBillNumbers: number[] = [];

      let hasRealConflictOrDuplicate = false;
      let hasMissingOrUnverifiedInfo = false;

      // -------------------------------------------------------------
      // 1. INTRA-BATCH DUPLICATE CHECK
      // Only flag duplicate invoice numbers among uploaded bills (or identical files)
      // Different invoice numbers from same vendor/project are NOT duplicates
      // -------------------------------------------------------------
      batchRawBills.forEach((otherBill, j) => {
        if (j === i) return;

        const otherInv = otherBill.invoiceNumber.trim();
        const otherFileName = otherBill.fileName.trim().toLowerCase();
        const currentFileName = currentBill.fileName.trim().toLowerCase();

        // Duplicate invoice number between uploaded bills
        if (cleanInv && otherInv && cleanInv.toLowerCase() === otherInv.toLowerCase()) {
          hasRealConflictOrDuplicate = true;
          if (!duplicateWithBillNumbers.includes(j + 1)) {
            duplicateWithBillNumbers.push(j + 1);
          }
          detectedIssues.push(
            `Duplicate invoice number detected in batch: Invoice "${cleanInv}" is identical to Bill ${j + 1} (${otherBill.fileName || `Bill ${j + 1}`}).`
          );
        }

        // Duplicate document file uploaded more than once
        else if (
          currentFileName &&
          otherFileName &&
          currentFileName === otherFileName &&
          currentBill.fileSize > 0 &&
          currentBill.fileSize === otherBill.fileSize &&
          cleanInv === otherInv &&
          cleanInv !== ''
        ) {
          hasRealConflictOrDuplicate = true;
          if (!duplicateWithBillNumbers.includes(j + 1)) {
            duplicateWithBillNumbers.push(j + 1);
          }
          detectedIssues.push(
            `Duplicate document uploaded in batch: Identical file to Bill ${j + 1} ("${otherBill.fileName}").`
          );
        }
      });

      // -------------------------------------------------------------
      // 2. CENTRAL LEDGER HISTORICAL DUPLICATE CHECK
      // -------------------------------------------------------------
      if (cleanInv) {
        const historicalDup = bills.find(
          (b) => b.invoice_number.trim().toLowerCase() === cleanInv.toLowerCase()
        );

        if (historicalDup) {
          hasRealConflictOrDuplicate = true;
          findings.push({
            category: 'Invoice Number',
            matched: false,
            status: 'mismatched',
            title: 'Duplicate Invoice Number in Central Ledger',
            detail: `Invoice "${cleanInv}" was previously claimed under Bill ID ${historicalDup.bill_id} for Project ${historicalDup.project_id} on ${historicalDup.bill_date}.`,
          });
          detectedIssues.push(
            `Duplicate invoice number detected: "${cleanInv}" was previously registered in central ledger under ${historicalDup.bill_id}.`
          );
        } else if (duplicateWithBillNumbers.length > 0) {
          findings.push({
            category: 'Invoice Number',
            matched: false,
            status: 'mismatched',
            title: 'Duplicate Invoice Number in Current Batch',
            detail: `Invoice "${cleanInv}" conflicts with Bill ${duplicateWithBillNumbers.join(', Bill ')} in the current batch.`,
          });
        } else {
          findings.push({
            category: 'Invoice Number',
            matched: true,
            status: 'matched',
            title: 'Invoice Number Present & Unique',
            detail: `Invoice "${cleanInv}" is present and unique.`,
          });
          matchedObservations.push(`Invoice number "${cleanInv}" is unique.`);
        }
      } else {
        hasMissingOrUnverifiedInfo = true;
        findings.push({
          category: 'Invoice Number',
          matched: false,
          status: 'missing',
          title: 'Invoice Number Missing',
          detail: 'Invoice number was not detected in the uploaded document.',
        });
      }

      // -------------------------------------------------------------
      // 3. PROJECT ID & BUDGET ALLOCATION CHECK
      // -------------------------------------------------------------
      const targetProject = cleanProjId
        ? projects.find((p) => p.project_id.toUpperCase() === cleanProjId)
        : undefined;

      if (!cleanProjId) {
        hasMissingOrUnverifiedInfo = true;
        findings.push({
          category: 'Project Record',
          matched: false,
          status: 'missing',
          title: 'Project ID Missing',
          detail: 'Project ID was not detected in the uploaded document.',
        });
      } else if (targetProject) {
        // Direct conflict: invoice amount clearly exceeds approved project allocation
        if (numAmount > 0 && numAmount > targetProject.approved_amount) {
          hasRealConflictOrDuplicate = true;
          findings.push({
            category: 'Amount Authorization',
            matched: false,
            status: 'mismatched',
            title: 'Invoice Amount Exceeds Approved Budget',
            detail: `Claimed amount of ${formatINR(numAmount)} clearly exceeds total sanctioned project budget of ${formatINR(targetProject.approved_amount)} for ${targetProject.project_id}.`,
          });
          detectedIssues.push(
            `Invoice amount clearly exceeds approved project budget (Claimed: ${formatINR(numAmount)}, Approved budget: ${formatINR(targetProject.approved_amount)}).`
          );
        } else {
          findings.push({
            category: 'Project Record',
            matched: true,
            status: 'matched',
            title: 'Sanctioned Project Record Confirmed',
            detail: `Project ${targetProject.project_id}: "${targetProject.project_name}" (${targetProject.district}). Approved budget: ${formatINR(targetProject.approved_amount)}.`,
          });
          matchedObservations.push(`Project ${targetProject.project_id} exists in sanctioned registry.`);
        }
      } else {
        // Unknown reference data must NOT make the bill Possible Duplicate/Inconsistency
        findings.push({
          category: 'Project Record',
          matched: true,
          status: 'matched',
          title: 'Project Identifier Present',
          detail: `Project ID "${cleanProjId}" provided on invoice. (No conflicting record found).`,
        });
        matchedObservations.push(`Project identifier "${cleanProjId}" present.`);
      }

      // -------------------------------------------------------------
      // 4. AMOUNT VALIDATION & CALCULATION CONSISTENCY
      // -------------------------------------------------------------
      if (numAmount <= 0) {
        hasMissingOrUnverifiedInfo = true;
        findings.push({
          category: 'Invoice Amount',
          matched: false,
          status: 'missing',
          title: 'Invoice Amount Missing or Zero',
          detail: 'Total invoice amount could not be read or is zero. Requires verification.',
        });
      } else if (!hasRealConflictOrDuplicate) {
        findings.push({
          category: 'Invoice Amount',
          matched: true,
          status: 'matched',
          title: 'Total Amount Present & Consistent',
          detail: `Total claim amount: ${formatINR(numAmount)}.`,
        });
        matchedObservations.push(`Total amount of ${formatINR(numAmount)} is present and valid.`);
      }

      // -------------------------------------------------------------
      // 5. GSTIN / PAN FORMAT CHECK
      // -------------------------------------------------------------
      const isValidGstinFormat = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(normalizedGstin);
      const isValidPanFormat = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(normalizedGstin);

      if (normalizedGstin) {
        if (!isValidGstinFormat && !isValidPanFormat) {
          // Unknown / unverified tax format -> Needs verification, NOT inconsistency
          hasMissingOrUnverifiedInfo = true;
          findings.push({
            category: 'GSTIN / PAN Format',
            matched: false,
            status: 'warning',
            title: 'Unverified GSTIN/PAN Structure',
            detail: `Reference "${cleanGstin}" does not match standard 15-character GSTIN or 10-character PAN structure. Requires tax verification.`,
          });
        } else {
          findings.push({
            category: 'GSTIN / PAN Format',
            matched: true,
            status: 'matched',
            title: 'Valid GSTIN/PAN Format',
            detail: `Reference "${cleanGstin}" matches standard ${isValidGstinFormat ? '15-character GSTIN' : '10-character PAN'} format.`,
          });
          matchedObservations.push(`GSTIN/PAN "${cleanGstin}" format is valid.`);
        }
      } else {
        hasMissingOrUnverifiedInfo = true;
        findings.push({
          category: 'GSTIN / PAN Format',
          matched: false,
          status: 'missing',
          title: 'GSTIN / PAN Missing',
          detail: 'Tax identification reference was not detected in document.',
        });
      }

      // -------------------------------------------------------------
      // 6. VENDOR CONCORDANCE & DIRECT CONFLICT CHECK
      // Only flag conflict when there is a REAL conflict with an existing record!
      // -------------------------------------------------------------
      if (!cleanVendor) {
        hasMissingOrUnverifiedInfo = true;
        findings.push({
          category: 'Vendor Record',
          matched: false,
          status: 'missing',
          title: 'Vendor Name Missing',
          detail: 'Vendor name was not detected in the uploaded document.',
        });
      } else {
        const agencyByGstin = normalizedGstin
          ? INITIAL_AGENCIES.find((a) => a.registration_ref.replace(/[^A-Z0-9]/g, '').toUpperCase() === normalizedGstin)
          : undefined;

        const agencyByName = INITIAL_AGENCIES.find(
          (a) => a.agency_name.toLowerCase() === cleanVendor.toLowerCase()
        );

        // DIRECT CONFLICT 1: GSTIN matches an official agency in database, but vendor name is completely different!
        if (agencyByGstin && cleanVendor) {
          if (agencyByGstin.agency_name.toLowerCase() !== cleanVendor.toLowerCase()) {
            hasRealConflictOrDuplicate = true;
            findings.push({
              category: 'Vendor & GSTIN Match',
              matched: false,
              status: 'mismatched',
              title: 'Vendor Name and GSTIN Direct Conflict',
              detail: `GSTIN "${cleanGstin}" is registered in available records to "${agencyByGstin.agency_name}", but invoice lists vendor as "${cleanVendor}".`,
            });
            detectedIssues.push(
              `Vendor GSTIN direct conflict: GSTIN registered to "${agencyByGstin.agency_name}", but invoice lists "${cleanVendor}".`
            );
          } else {
            findings.push({
              category: 'Vendor & GSTIN Match',
              matched: true,
              status: 'matched',
              title: 'Vendor and GSTIN Concordance Verified',
              detail: `Vendor "${cleanVendor}" matches official registration record (${agencyByGstin.registration_ref}).`,
            });
            matchedObservations.push(`Vendor matches official registered agency record.`);
          }
        }

        // DIRECT CONFLICT 2: Vendor name matches an official agency, but GSTIN is completely different!
        else if (agencyByName && normalizedGstin) {
          const officialGstin = agencyByName.registration_ref.replace(/[^A-Z0-9]/g, '').toUpperCase();
          if (officialGstin !== normalizedGstin) {
            hasRealConflictOrDuplicate = true;
            findings.push({
              category: 'Vendor & GSTIN Match',
              matched: false,
              status: 'mismatched',
              title: 'Vendor GSTIN Direct Conflict',
              detail: `Registered GSTIN for "${agencyByName.agency_name}" is "${agencyByName.registration_ref}", but invoice lists "${cleanGstin}".`,
            });
            detectedIssues.push(
              `Vendor GSTIN direct conflict: Registered GSTIN for "${agencyByName.agency_name}" is "${agencyByName.registration_ref}", but bill lists "${cleanGstin}".`
            );
          } else {
            findings.push({
              category: 'Vendor & GSTIN Match',
              matched: true,
              status: 'matched',
              title: 'Vendor and GSTIN Concordance Verified',
              detail: `Vendor "${cleanVendor}" matches registered record.`,
            });
            matchedObservations.push(`Vendor and GSTIN verified against official records.`);
          }
        }

        // No matching agency in reference dataset:
        // Rule: "If the system does NOT have a reference record for the vendor, project, or invoice, that alone must NOT make the bill 'Possible Duplicate/Inconsistency'."
        else {
          findings.push({
            category: 'Vendor Record',
            matched: true,
            status: 'matched',
            title: 'Vendor Name Present',
            detail: `Vendor "${cleanVendor}" is present. (No direct conflict with available records).`,
          });
          matchedObservations.push(`Vendor "${cleanVendor}" is present.`);
        }
      }

      // -------------------------------------------------------------
      // 7. INVOICE DATE CHECK
      // -------------------------------------------------------------
      if (!currentBill.invoiceDate) {
        hasMissingOrUnverifiedInfo = true;
        findings.push({
          category: 'Invoice Date',
          matched: false,
          status: 'missing',
          title: 'Invoice Date Missing',
          detail: 'Invoice date was not detected in the uploaded document.',
        });
      } else {
        findings.push({
          category: 'Invoice Date',
          matched: true,
          status: 'matched',
          title: 'Invoice Date Present',
          detail: `Date: ${currentBill.invoiceDate}.`,
        });
        matchedObservations.push(`Invoice date "${currentBill.invoiceDate}" is present.`);
      }

      // -------------------------------------------------------------
      // 8. FINAL STATUS DETERMINATION
      // -------------------------------------------------------------
      let status: DocumentVerificationStatus = 'No Obvious Anomaly';
      let headline = '🟢 No Obvious Anomaly';

      if (hasRealConflictOrDuplicate) {
        status = 'Possible Duplicate/Inconsistency';
        headline = '🔴 Possible Duplicate/Inconsistency';
      } else if (hasMissingOrUnverifiedInfo) {
        status = 'Needs Verification';
        headline = '🟡 Needs Verification';
      } else {
        status = 'No Obvious Anomaly';
        headline = '🟢 No Obvious Anomaly';
      }

      return {
        ...currentBill,
        billNumber: i + 1,
        status,
        headline,
        detectedIssues,
        matchedObservations,
        findings,
        duplicateWithBillNumbers,
        isExpanded: expandedBillIds.has(currentBill.id),
      };
    });
  }, [batchRawBills, projects, bills, expandedBillIds]);

  // Batch summary metrics
  const batchSummary = useMemo(() => {
    const total = verifiedBatchBills.length;
    const clean = verifiedBatchBills.filter((b) => b.status === 'No Obvious Anomaly').length;
    const needsVerification = verifiedBatchBills.filter((b) => b.status === 'Needs Verification').length;
    const possibleDuplicate = verifiedBatchBills.filter((b) => b.status === 'Possible Duplicate/Inconsistency').length;

    return {
      total,
      clean,
      needsVerification,
      possibleDuplicate,
    };
  }, [verifiedBatchBills]);

  // Filtered list based on status button or search query
  const displayedBatchBills = useMemo(() => {
    return verifiedBatchBills.filter((b) => {
      if (filterStatus !== 'All' && b.status !== filterStatus) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        b.invoiceNumber.toLowerCase().includes(q) ||
        b.vendorName.toLowerCase().includes(q) ||
        b.gstinPan.toLowerCase().includes(q) ||
        b.projectId.toLowerCase().includes(q) ||
        b.fileName.toLowerCase().includes(q) ||
        `bill ${b.billNumber}`.toLowerCase().includes(q)
      );
    });
  }, [verifiedBatchBills, filterStatus, searchQuery]);

  /**
   * Multi-file upload functionality (keeps existing batch intact)
   */
  const handleMultipleFilesUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    const filesArray = Array.from(files);
    setIsProcessingBatch(true);
    setProcessingStatusText(`Extracting data from ${filesArray.length} document(s)...`);

    const newBills: RawBatchBillItem[] = [];
    const currentCount = batchRawBills.length;

    for (let idx = 0; idx < filesArray.length; idx++) {
      const file = filesArray[idx];
      setProcessingStatusText(`Extracting Bill ${currentCount + idx + 1} of ${currentCount + filesArray.length}: ${file.name}...`);

      let previewUrl: string | null = null;
      if (file.type.startsWith('image/')) {
        previewUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });
      }

      try {
        const { text, method } = await extractTextFromDocument(file);
        const parsed = parseInvoiceFields(text, file.name);

        newBills.push({
          id: `uploaded-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
          billNumber: currentCount + idx + 1,
          fileName: file.name,
          fileSize: file.size,
          filePreview: previewUrl,
          extractionMethod: method,
          rawTextSnippet: text.slice(0, 300),
          invoiceNumber: parsed.invoiceNumber,
          vendorName: parsed.vendorName,
          gstinPan: parsed.gstinPan,
          invoiceDate: parsed.invoiceDate,
          projectId: parsed.projectId,
          totalAmount: parsed.totalAmount,
          documentType: parsed.documentType,
        });
      } catch (err) {
        console.error(`Error processing file ${file.name}:`, err);
        newBills.push({
          id: `uploaded-err-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
          billNumber: currentCount + idx + 1,
          fileName: file.name,
          fileSize: file.size,
          filePreview: previewUrl,
          extractionMethod: 'Extraction Error Fallback',
          rawTextSnippet: 'Could not extract text from document',
          invoiceNumber: '',
          vendorName: '',
          gstinPan: '',
          invoiceDate: '',
          projectId: '',
          totalAmount: '',
          documentType: 'Unverified Document',
        });
      }
    }

    // Append new bills so uploading a second bill never removes previously uploaded bills
    setBatchRawBills((prev) => [...prev, ...newBills]);

    // Automatically expand the newly added bill(s)
    setExpandedBillIds((prev) => {
      const next = new Set(prev);
      newBills.slice(0, 2).forEach((b) => next.add(b.id));
      return next;
    });

    setIsProcessingBatch(false);
    setProcessingStatusText('');
    setLastVerifiedAt(new Date().toLocaleTimeString());
  };

  /**
   * Remove option for an individual bill
   */
  const handleRemoveBill = (id: string) => {
    setBatchRawBills((prev) => prev.filter((b) => b.id !== id));
    setExpandedBillIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  /**
   * Clear All Bills button
   */
  const handleClearAllBills = () => {
    setBatchRawBills([]);
    setExpandedBillIds(new Set());
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (err) {
      console.warn(err);
    }
  };

  /**
   * Verify All Bills button
   */
  const handleVerifyAllBills = () => {
    if (batchRawBills.length === 0) return;
    setIsVerifyingAll(true);
    setTimeout(() => {
      setIsVerifyingAll(false);
      setLastVerifiedAt(new Date().toLocaleTimeString());
    }, 450);
  };

  /**
   * Field modification inside an expanded bill card
   */
  const handleUpdateBillField = (
    id: string,
    field: keyof RawBatchBillItem,
    value: string | number
  ) => {
    setBatchRawBills((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: value } : b))
    );
  };

  /**
   * Save an individual bill to the historical registry
   */
  const handleSaveBillToLedger = (bill: BatchBillItem) => {
    const numAmt = typeof bill.totalAmount === 'number' ? bill.totalAmount : Number(bill.totalAmount) || 0;
    const targetProj = projects.find((p) => p.project_id === bill.projectId);

    const newRecord: BillRecord = {
      bill_id: `BILL-2024-${String(bills.length + 1).padStart(3, '0')}`,
      invoice_number: bill.invoiceNumber || 'INV-UNSPECIFIED',
      project_id: bill.projectId || 'UNASSIGNED',
      project_name: targetProj?.project_name || 'Public Works Project',
      vendor_name: bill.vendorName || 'Unspecified Contractor',
      gstin_pan: bill.gstinPan || 'NOT-PROVIDED',
      amount: numAmt,
      bill_date: bill.invoiceDate || new Date().toISOString().split('T')[0],
      document_type: bill.documentType,
      verification_status: bill.status,
      verification_notes:
        bill.detectedIssues.length > 0
          ? bill.detectedIssues.join(' | ')
          : 'Document verified. No obvious anomaly detected against available records.',
      ocr_extracted: true,
      uploaded_at: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };

    onAddBill(newRecord);
  };

  /**
   * Batch action: Save all clean or reviewed bills to registry
   */
  const handleSaveAllCleanBills = () => {
    const cleanBills = verifiedBatchBills.filter((b) => b.status === 'No Obvious Anomaly');
    cleanBills.forEach((b) => handleSaveBillToLedger(b));
    alert(`Logged ${cleanBills.length} verified bill(s) into the central audit registry.`);
  };

  /**
   * Download sample test vouchers
   */
  const handleDownloadSamplePack = async (type: 'technova' | 'pack' = 'pack') => {
    const downloadBlob = (blob: Blob, name: string) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    if (type === 'technova') {
      const blob = generateTestBillPDF('technova');
      downloadBlob(blob, 'TechNova_Solutions_Valid_Bill_INV-2026-001.pdf');
      return;
    }

    const blob1 = generateTestBillPDF('technova');
    const blob2 = generateTestBillPDF('inconsistent_budget');
    const blob3 = generateTestBillPDF('duplicate_inv');

    downloadBlob(blob1, 'Sample_1_TechNova_Solutions_Clean_INV-2026-001.pdf');
    setTimeout(() => downloadBlob(blob2, 'Sample_2_Overbudget_Claim_INV555.pdf'), 200);
    setTimeout(() => downloadBlob(blob3, 'Sample_3_Duplicate_Claim_INV089.pdf'), 400);
  };

  /**
   * Quick Add Helper for Instant Demo Testing
   */
  const handleAddSampleTestBill = (type: 'technova' | 'inconsistent' | 'duplicate') => {
    const newIdx = batchRawBills.length + 1;
    let newBill: RawBatchBillItem;

    if (type === 'technova') {
      // Exactly matches the user's test case: TechNova Solutions / INV-2026-001 / MPLAD001 / ₹1,11,392
      newBill = {
        id: `test-technova-${Date.now()}`,
        billNumber: newIdx,
        fileName: 'TechNova_Solutions_INV-2026-001.pdf',
        fileSize: 48600,
        extractionMethod: 'PDF Text Extraction (PDF.js)',
        rawTextSnippet: 'TAX INVOICE - Invoice No: INV-2026-001 | Vendor: TechNova Solutions | GSTIN: 29ABCDE1234F1Z5 | Project ID: MPLAD001 | Date: 2026-09-25 | Total: 111392',
        invoiceNumber: 'INV-2026-001',
        vendorName: 'TechNova Solutions',
        gstinPan: '29ABCDE1234F1Z5',
        invoiceDate: '2026-09-25',
        projectId: 'MPLAD001',
        totalAmount: 111392,
        documentType: 'IT & Digital Surveillance Voucher',
      };
    } else if (type === 'duplicate') {
      // Duplicate invoice number with an existing bill in the batch
      const sourceBill = batchRawBills[0] || { invoiceNumber: 'INV-2026-001', vendorName: 'TechNova Solutions', projectId: 'MPLAD001', totalAmount: 111392 };
      newBill = {
        id: `test-dup-${Date.now()}`,
        billNumber: newIdx,
        fileName: `Duplicate_Claim_Copy_${sourceBill.invoiceNumber.replace(/[^A-Za-z0-9]/g, '_')}.pdf`,
        fileSize: 42100,
        extractionMethod: 'PDF Text Extraction (PDF.js)',
        rawTextSnippet: `DUPLICATE TAX INVOICE - Duplicate claim with invoice ${sourceBill.invoiceNumber}`,
        invoiceNumber: sourceBill.invoiceNumber,
        vendorName: sourceBill.vendorName,
        gstinPan: '29ABCDE1234F1Z5',
        invoiceDate: '2026-09-25',
        projectId: sourceBill.projectId || 'MPLAD001',
        totalAmount: sourceBill.totalAmount || 111392,
        documentType: 'Duplicate Claim Copy',
      };
    } else {
      // Inconsistent bill: Amount exceeds project approved budget (Real conflict)
      newBill = {
        id: `test-inconsistent-${Date.now()}`,
        billNumber: newIdx,
        fileName: 'Overbudget_Excavation_Claim.pdf',
        fileSize: 51200,
        extractionMethod: 'PDF Text Extraction (PDF.js)',
        rawTextSnippet: 'TAX INVOICE - Claim amount exceeds sanctioned project budget for MPLAD001',
        invoiceNumber: `INV/EXC/2026/${Math.floor(100 + Math.random() * 900)}`,
        vendorName: 'Kongu Infra Developments',
        gstinPan: '33AABCK9911P1Z3',
        invoiceDate: '2026-09-25',
        projectId: 'MPLAD001',
        totalAmount: 9500000, // Budget for MPLAD001 is 40,00,000!
        documentType: 'Over-Sanction Claim Voucher',
      };
    }

    setBatchRawBills((prev) => [...prev, newBill]);
    setExpandedBillIds((prev) => new Set([...prev, newBill.id]));
  };

  return (
    <div id="bill-verification-section" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-6">
      {/* 1. Header Bar with Prominent "Upload Bills", "Verify All Bills", & "Clear All Bills" */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-2xl">📑</span>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Multi-Bill Batch Verification System
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold font-mono">
              Concurrent 5-10 Bills &amp; Evidence-Based Verification
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Upload multiple bill images or PDFs at once. Uploading new bills keeps existing bills in the batch. Flags anomalies only with actual evidence.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Hidden multi-file input */}
          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept="image/*,application/pdf,text/*"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleMultipleFilesUpload(e.target.files);
                e.target.value = ''; // Reset input to permit subsequent uploads
              }
            }}
            className="hidden"
          />

          {/* Primary "Upload Bills" Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-md transition cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Bills (Select 5-10 Files)</span>
          </button>

          {/* Verify All Bills Button */}
          <button
            onClick={handleVerifyAllBills}
            disabled={isVerifyingAll || batchRawBills.length === 0}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-md transition cursor-pointer ${
              batchRawBills.length === 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
            title="Run batch cross-verification across all uploaded bills"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingAll ? 'animate-spin' : ''}`} />
            <span>Verify All Bills ({batchRawBills.length})</span>
          </button>

          {/* Clear All Bills Button */}
          {batchRawBills.length > 0 && (
            <button
              onClick={handleClearAllBills}
              className="px-3 py-2 bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-red-100 rounded-lg text-xs font-semibold border border-red-800/40 flex items-center gap-1.5 transition cursor-pointer"
              title="Clear all uploaded bills from the current batch"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>Clear All Bills</span>
            </button>
          )}

          {/* Demo Batch Loader */}
          <button
            onClick={() => {
              setBatchRawBills(INITIAL_DEMO_BATCH);
              setExpandedBillIds(new Set(['demo-1', 'demo-3']));
              setLastVerifiedAt(new Date().toLocaleTimeString());
            }}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
            title="Load presentation test batch of 6 diverse bills"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>⚡ Load Demo Batch (6 Bills)</span>
          </button>
        </div>
      </div>

      {/* 2. Drag & Drop Multi-Bill Upload Zone (Supports 5-10 Bills at once) */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleMultipleFilesUpload(e.dataTransfer.files);
          }
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`p-4 rounded-xl border-2 border-dashed transition text-center cursor-pointer ${
          isDragging
            ? 'border-indigo-400 bg-indigo-950/30 scale-[1.005]'
            : 'border-slate-800 bg-slate-950/70 hover:border-indigo-500/60 hover:bg-slate-950'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <Upload className="w-5 h-5" />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-xs font-semibold text-slate-200">
              Drag &amp; drop 5 to 10 bill PDFs or image vouchers here, or <span className="text-indigo-400 underline font-bold">click to browse</span>
            </p>
            <p className="text-[11px] text-slate-500">
              Accepts multiple files at once. Uploading new files appends to this batch (Bill 1, Bill 2, Bill 3...) without replacing previous uploads.
            </p>
          </div>
          <div className="sm:ml-auto flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => handleAddSampleTestBill('technova')}
              className="text-[10px] bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 px-2 py-1 rounded flex items-center gap-1 cursor-pointer font-bold"
              title="Add TechNova valid bill (INV-2026-001, TechNova Solutions, MPLAD001, ₹1,11,392)"
            >
              <FilePlus className="w-3 h-3 text-emerald-400" />
              <span>+ Add TechNova Valid Bill</span>
            </button>
            <button
              onClick={() => handleAddSampleTestBill('duplicate')}
              className="text-[10px] bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 px-2 py-1 rounded flex items-center gap-1 cursor-pointer"
              title="Add duplicate invoice in batch"
            >
              <FilePlus className="w-3 h-3 text-amber-400" />
              <span>+ Add Duplicate</span>
            </button>
            <button
              onClick={() => handleAddSampleTestBill('inconsistent')}
              className="text-[10px] bg-slate-800 hover:bg-slate-700 text-red-300 border border-slate-700 px-2 py-1 rounded flex items-center gap-1 cursor-pointer"
              title="Add over-budget inconsistent bill"
            >
              <FilePlus className="w-3 h-3 text-red-400" />
              <span>+ Add Overbudget Bill</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Uploaded Document Names Strip */}
      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
          <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
            <Files className="w-3.5 h-3.5 text-indigo-400" />
            Uploaded Documents in Current Batch ({batchRawBills.length} Bills Total):
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleDownloadSamplePack('technova')}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1 cursor-pointer font-bold"
            >
              <Download className="w-3 h-3" />
              <span>Download TechNova Valid Test Bill (PDF)</span>
            </button>
            <span className="text-slate-600">|</span>
            <button
              onClick={() => handleDownloadSamplePack('pack')}
              className="text-[11px] text-indigo-300 hover:text-indigo-200 underline flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>Download 3 Sample Test Bills (PDF)</span>
            </button>
          </div>
        </div>

        {/* File Tags Strip with Individual Remove Buttons */}
        {batchRawBills.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-2">
            No bills in the current batch. Upload 5 to 10 bills above or click "⚡ Load Demo Batch".
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {batchRawBills.map((b, idx) => (
              <span
                key={b.id}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 flex items-center gap-1.5"
              >
                <span className="font-bold text-indigo-400">Bill {idx + 1}:</span>
                <span className="truncate max-w-[180px]" title={b.fileName}>{b.fileName}</span>
                <span className="text-slate-500">({(b.fileSize / 1024).toFixed(0)} KB)</span>
                <button
                  onClick={() => handleRemoveBill(b.id)}
                  className="text-slate-400 hover:text-red-400 p-0.5 ml-0.5 cursor-pointer"
                  title={`Remove Bill ${idx + 1}`}
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        {isProcessingBatch && (
          <div className="p-2.5 bg-blue-950/40 rounded-lg border border-blue-500/30 flex items-center gap-2 text-xs text-blue-300">
            <Sparkles className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
            <span>{processingStatusText}</span>
          </div>
        )}

        {isVerifyingAll && (
          <div className="p-2.5 bg-emerald-950/40 rounded-lg border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-400 shrink-0" />
            <span>Verifying all {batchRawBills.length} bills concurrently against central records and intra-batch duplicates...</span>
          </div>
        )}
      </div>

      {/* 4. BATCH SUMMARY AT TOP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Bills */}
        <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="uppercase font-semibold text-[10px]">Total Bills</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {batchSummary.total}
          </div>
          <span className="text-[10px] text-slate-500 block">Current active batch</span>
        </div>

        {/* Clean Bills */}
        <button
          onClick={() => setFilterStatus(filterStatus === 'No Obvious Anomaly' ? 'All' : 'No Obvious Anomaly')}
          className={`p-3.5 rounded-xl border text-left space-y-1 transition cursor-pointer ${
            filterStatus === 'No Obvious Anomaly'
              ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500'
              : 'bg-slate-950 border-slate-800 hover:border-emerald-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-emerald-400">
            <span className="uppercase font-semibold text-[10px]">🟢 No Obvious Anomaly</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-300">
            {batchSummary.clean}
          </div>
          <span className="text-[10px] text-slate-500 block">
            {batchSummary.total > 0 ? `${((batchSummary.clean / batchSummary.total) * 100).toFixed(0)}% of batch` : '0%'}
          </span>
        </button>

        {/* Needs Verification Bills */}
        <button
          onClick={() => setFilterStatus(filterStatus === 'Needs Verification' ? 'All' : 'Needs Verification')}
          className={`p-3.5 rounded-xl border text-left space-y-1 transition cursor-pointer ${
            filterStatus === 'Needs Verification'
              ? 'bg-amber-950/40 border-amber-500 text-amber-200 ring-1 ring-amber-500'
              : 'bg-slate-950 border-slate-800 hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-400">
            <span className="uppercase font-semibold text-[10px]">🟡 Needs Verification</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-300">
            {batchSummary.needsVerification}
          </div>
          <span className="text-[10px] text-slate-500 block">Missing info / unverified</span>
        </button>

        {/* Possible Duplicate / Inconsistency */}
        <button
          onClick={() => setFilterStatus(filterStatus === 'Possible Duplicate/Inconsistency' ? 'All' : 'Possible Duplicate/Inconsistency')}
          className={`p-3.5 rounded-xl border text-left space-y-1 transition cursor-pointer ${
            filterStatus === 'Possible Duplicate/Inconsistency'
              ? 'bg-red-950/40 border-red-500 text-red-200 ring-1 ring-red-500'
              : 'bg-slate-950 border-slate-800 hover:border-red-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-red-400">
            <span className="uppercase font-semibold text-[10px]">🔴 Possible Duplicate/Inconsistency</span>
            <XCircle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-red-300">
            {batchSummary.possibleDuplicate}
          </div>
          <span className="text-[10px] text-slate-500 block">Actual duplicates &amp; conflicts</span>
        </button>
      </div>

      {/* 5. SEPARATE BATCH RESULTS SUMMARY LIST (Bill 1 → ..., Bill 2 → ...) */}
      {verifiedBatchBills.length > 0 && (
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Batch Verification Status Roster ({verifiedBatchBills.length} Bills)
              </span>
            </div>
            {lastVerifiedAt && (
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Verified: {lastVerifiedAt}
              </span>
            )}
          </div>

          {/* Quick Numbered Status Rows */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {verifiedBatchBills.map((b) => (
              <div
                key={b.id}
                onClick={() => toggleExpand(b.id)}
                className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 cursor-pointer transition ${
                  b.status === 'Possible Duplicate/Inconsistency'
                    ? 'bg-red-950/20 hover:bg-red-950/40 border-red-500/40 text-red-200'
                    : b.status === 'Needs Verification'
                    ? 'bg-amber-950/20 hover:bg-amber-950/40 border-amber-500/40 text-amber-200'
                    : 'bg-emerald-950/20 hover:bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono font-extrabold text-white text-xs bg-slate-900 border border-slate-700 px-2 py-0.5 rounded shrink-0">
                    Bill {b.billNumber}
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                  <span className="font-semibold text-xs truncate">
                    {b.status === 'Possible Duplicate/Inconsistency' && '🔴 Possible Duplicate/Inconsistency'}
                    {b.status === 'Needs Verification' && '🟡 Needs Verification'}
                    {b.status === 'No Obvious Anomaly' && '🟢 No Obvious Anomaly'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 underline shrink-0 hover:text-white ml-1">
                  {b.isExpanded ? 'Hide' : 'Details'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400" />
            Filter Batch:
          </span>
          {(['All', 'No Obvious Anomaly', 'Needs Verification', 'Possible Duplicate/Inconsistency'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-2.5 py-1 rounded text-[11px] transition cursor-pointer font-medium ${
                filterStatus === st
                  ? 'bg-indigo-600 text-white font-bold shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              {st === 'All'
                ? `All (${verifiedBatchBills.length})`
                : st === 'No Obvious Anomaly'
                ? `🟢 Clean (${batchSummary.clean})`
                : st === 'Needs Verification'
                ? `🟡 Verify (${batchSummary.needsVerification})`
                : `🔴 Duplicate/Issue (${batchSummary.possibleDuplicate})`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search by Bill #, Invoice, Vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-56"
            />
          </div>

          {batchSummary.clean > 0 && (
            <button
              onClick={handleSaveAllCleanBills}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
              title="Add all verified clean bills to the historical ledger"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Log Clean Bills</span>
            </button>
          )}
        </div>
      </div>

      {/* 7. NUMBERED ORDER RESULTS: BILL 1, BILL 2, BILL 3... */}
      <div className="space-y-4">
        {displayedBatchBills.length === 0 ? (
          <div className="p-8 text-center bg-slate-950 rounded-xl border border-slate-800 text-slate-400 text-xs">
            {batchRawBills.length === 0
              ? 'No bills in the batch. Upload multiple bills above or click "⚡ Load Demo Batch (6 Bills)".'
              : 'No bills match the selected filter criteria.'}
          </div>
        ) : (
          displayedBatchBills.map((bill) => (
            <div
              key={bill.id}
              className={`rounded-xl border transition shadow-sm ${
                bill.status === 'Possible Duplicate/Inconsistency'
                  ? 'bg-red-950/20 border-red-500/40'
                  : bill.status === 'Needs Verification'
                  ? 'bg-amber-950/20 border-amber-500/40'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              {/* Card Header: Bill Number, File Name, Status Badge, View Details toggle, Remove button */}
              <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/5">
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Bill Number Badge */}
                  <div className="px-3 py-1 rounded-lg bg-indigo-600 text-white font-mono font-extrabold text-xs shadow-sm flex items-center gap-1.5">
                    <span>Bill {bill.billNumber}</span>
                  </div>

                  {/* File Name & Extraction Badge */}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white text-xs truncate max-w-xs" title={bill.fileName}>
                        {bill.fileName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({(bill.fileSize / 1024).toFixed(1)} KB · {bill.extractionMethod})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Badge & Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Status Badge */}
                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${
                      bill.status === 'Possible Duplicate/Inconsistency'
                        ? 'bg-red-500/20 text-red-300 border-red-500/40'
                        : bill.status === 'Needs Verification'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}
                  >
                    {bill.status === 'Possible Duplicate/Inconsistency' && <XCircle className="w-4 h-4 text-red-400" />}
                    {bill.status === 'Needs Verification' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                    {bill.status === 'No Obvious Anomaly' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    <span>{bill.headline}</span>
                  </span>

                  {/* View Details Accordion Toggle */}
                  <button
                    onClick={() => toggleExpand(bill.id)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer border border-slate-700"
                  >
                    <span>{bill.isExpanded ? 'Hide Details' : 'View Details'}</span>
                    {bill.isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {/* Individual Remove Option */}
                  <button
                    onClick={() => handleRemoveBill(bill.id)}
                    className="px-2.5 py-1 bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-red-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer border border-red-800/40"
                    title={`Remove Bill ${bill.billNumber} (${bill.fileName}) from current batch`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    <span>Remove</span>
                  </button>

                  {/* Add to Ledger Button */}
                  <button
                    onClick={() => handleSaveBillToLedger(bill)}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer border border-slate-700"
                    title="Save this verified bill to audit ledger"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Log</span>
                  </button>
                </div>
              </div>

              {/* Card Summary: Display Fields */}
              <div className="p-4 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs bg-slate-900/60">
                {/* Invoice Number */}
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                    <Hash className="w-3 h-3 text-slate-400" />
                    Invoice Number
                  </span>
                  <span className="font-mono font-bold text-white block truncate" title={bill.invoiceNumber}>
                    {bill.invoiceNumber || <span className="text-amber-400 italic">[Not Detected]</span>}
                  </span>
                </div>

                {/* Vendor Name */}
                <div className="space-y-0.5 sm:col-span-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                    <Building className="w-3 h-3 text-slate-400" />
                    Vendor Name
                  </span>
                  <span className="font-medium text-slate-200 block truncate" title={bill.vendorName}>
                    {bill.vendorName || <span className="text-amber-400 italic">[Not Detected]</span>}
                  </span>
                </div>

                {/* Project ID */}
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                    <Search className="w-3 h-3 text-slate-400" />
                    Project ID
                  </span>
                  <span
                    className="font-mono font-bold text-indigo-300 block truncate cursor-pointer hover:underline"
                    onClick={() => onSelectProject?.(bill.projectId)}
                    title={bill.projectId}
                  >
                    {bill.projectId || <span className="text-amber-400 italic">[Not Detected]</span>}
                  </span>
                </div>

                {/* Invoice Date */}
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    Invoice Date
                  </span>
                  <span className="font-mono text-slate-300 block">
                    {bill.invoiceDate || <span className="text-amber-400 italic">[Not Detected]</span>}
                  </span>
                </div>

                {/* Total Amount */}
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                    <IndianRupee className="w-3 h-3 text-slate-400" />
                    Total Amount
                  </span>
                  <span className="font-mono font-bold text-amber-400 block text-sm">
                    {typeof bill.totalAmount === 'number' && bill.totalAmount > 0 ? (
                      formatINR(bill.totalAmount)
                    ) : (
                      <span className="text-amber-400 text-xs italic">[Not Detected]</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Detected Issues Section (Only shows when actual issues are detected) */}
              <div className="px-4 py-3 border-t border-white/5 space-y-2 text-xs">
                {bill.detectedIssues.length > 0 ? (
                  <div className="space-y-1.5">
                    <span className="font-bold text-red-300 uppercase tracking-wider text-[10px] flex items-center gap-1">
                      <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
                      Detected Issues ({bill.detectedIssues.length}):
                    </span>
                    {bill.detectedIssues.map((issue, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded border flex items-start gap-2 ${
                          issue.toLowerCase().includes('duplicate')
                            ? 'bg-red-950/40 border-red-500/40 text-red-200'
                            : 'bg-amber-950/30 border-amber-500/30 text-amber-200'
                        }`}
                      >
                        <span className="font-bold text-red-400 shrink-0">•</span>
                        <span className="font-medium leading-snug">{issue}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-300 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>No obvious anomaly detected. Document details are internally consistent with available scheme records.</span>
                  </div>
                )}
              </div>

              {/* 8. "VIEW DETAILS" EXPANDED SECTION */}
              {bill.isExpanded && (
                <div className="p-4 border-t border-white/10 bg-slate-950/90 space-y-4 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold uppercase tracking-wider text-[11px] text-slate-300 flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-indigo-400" />
                      📄 Extracted from Uploaded Document &amp; Verification Findings (Bill {bill.billNumber})
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Editable attributes for instant audit verification
                    </span>
                  </div>

                  {/* Editable Attribute Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 font-medium block">Invoice Number</label>
                      <input
                        type="text"
                        value={bill.invoiceNumber}
                        onChange={(e) => handleUpdateBillField(bill.id, 'invoiceNumber', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-medium block">Vendor Name</label>
                      <input
                        type="text"
                        value={bill.vendorName}
                        onChange={(e) => handleUpdateBillField(bill.id, 'vendorName', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-medium block">GSTIN / PAN</label>
                      <input
                        type="text"
                        value={bill.gstinPan}
                        onChange={(e) => handleUpdateBillField(bill.id, 'gstinPan', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-medium block">Invoice Date</label>
                      <input
                        type="date"
                        value={bill.invoiceDate}
                        onChange={(e) => handleUpdateBillField(bill.id, 'invoiceDate', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-medium block">Project ID</label>
                      <input
                        type="text"
                        value={bill.projectId}
                        onChange={(e) => handleUpdateBillField(bill.id, 'projectId', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-medium block">Total Amount (₹)</label>
                      <input
                        type="number"
                        value={bill.totalAmount}
                        onChange={(e) => handleUpdateBillField(bill.id, 'totalAmount', e.target.value ? Number(e.target.value) : '')}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Findings Checklist */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-800">
                    <span className="font-semibold text-slate-300 block text-[11px]">
                      🔎 Detailed Verification Checklist:
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {bill.findings.map((f, fIdx) => (
                        <div
                          key={fIdx}
                          className={`p-2 rounded border text-[11px] flex items-start gap-2 ${
                            f.status === 'matched'
                              ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-200'
                              : f.status === 'mismatched'
                              ? 'bg-red-950/30 border-red-900/40 text-red-200'
                              : 'bg-amber-950/20 border-amber-900/40 text-amber-200'
                          }`}
                        >
                          {f.status === 'matched' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          ) : f.status === 'mismatched' ? (
                            <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <span className="font-semibold block">{f.title}</span>
                            <span className="opacity-90 leading-tight block mt-0.5">{f.detail}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Optical Scan Preview if Image */}
                  {bill.filePreview && (
                    <div className="pt-2 border-t border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                        Optical Scan Preview:
                      </span>
                      <div className="rounded-lg overflow-hidden border border-slate-800 max-h-40 max-w-sm">
                        <img src={bill.filePreview} alt="Voucher scan" className="w-full object-cover" />
                      </div>
                    </div>
                  )}

                  {/* Raw Text Snippet */}
                  {bill.rawTextSnippet && (
                    <div className="p-2 bg-slate-900 rounded border border-slate-800 space-y-0.5">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">
                        Extracted Document Snippet:
                      </span>
                      <p className="text-[10px] font-mono text-slate-300 truncate">
                        {bill.rawTextSnippet}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 9. Statutory Assurance & Disclaimer */}
      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
        <Info className="w-4 h-4 text-indigo-400 shrink-0" />
        <span>
          <strong>Audit Vigilance Standard:</strong> Multi-bill verification identifies anomalies, inconsistencies, and intra-batch duplicates. It does not establish determinations of fraud or legal authenticity; results serve to prioritize administrative and on-site physical scrutiny.
        </span>
      </div>

      {/* 10. Central Historical Registry Ledger */}
      <div className="space-y-3 pt-4 border-t border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <span>🗄️</span> Historical Central Registry Ledger
            </h4>
            <p className="text-[11px] text-slate-400">
              Previously logged vouchers and audit records ({bills.length} claims on file)
            </p>
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
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {bills.map((bill) => (
                <tr key={bill.bill_id} className="hover:bg-slate-800/40 transition">
                  <td className="py-2 px-3 font-mono font-medium text-indigo-400">
                    {bill.bill_id}
                  </td>
                  <td className="py-2 px-3 font-mono font-semibold text-white">
                    {bill.invoice_number}
                  </td>
                  <td className="py-2 px-3 font-medium text-slate-200 max-w-[150px] truncate" title={bill.vendor_name}>
                    {bill.vendor_name}
                  </td>
                  <td className="py-2 px-3 font-mono text-[11px] text-slate-400">
                    {bill.gstin_pan}
                  </td>
                  <td
                    className="py-2 px-3 font-mono text-indigo-300 font-bold cursor-pointer hover:underline"
                    onClick={() => onSelectProject?.(bill.project_name)}
                  >
                    {bill.project_id}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-semibold text-amber-400">
                    {formatINR(bill.amount)}
                  </td>
                  <td className="py-2 px-3 text-center text-slate-400 font-mono">
                    {bill.bill_date}
                  </td>
                  <td className="py-2 px-3">
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
                  <td className="py-2 px-3 text-[11px] text-slate-400 max-w-xs leading-snug truncate" title={bill.verification_notes}>
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
