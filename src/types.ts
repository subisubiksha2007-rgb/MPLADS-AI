export type CompletionStatus = 'Ongoing' | 'Delayed' | 'Completed';
export type RiskLevel = 'Low Risk' | 'Medium Risk' | 'High Risk';
export type AnomalyStatus = 'Anomaly Detected' | 'Normal';

export type DelayReasonType =
  | 'Heavy Rainfall'
  | 'Flood / Natural Calamity'
  | 'Flood'
  | 'Natural Calamity'
  | 'Government Approval Delay'
  | 'Land / Permission Issue'
  | 'Land/Permission Issue'
  | 'Material Supply Delay'
  | 'Contractor Issue'
  | 'Other / Unknown'
  | 'Unknown / No Documented Reason';

export type DelayContextStatus =
  | 'Contextual / Justified Delay'
  | 'Delay Requires Investigation'
  | 'Normal Timeline';

export type DocumentVerificationStatus =
  | 'No Obvious Anomaly'
  | 'Needs Verification'
  | 'Possible Duplicate/Inconsistency';

export type AgencyVerificationStatus =
  | 'Agency Information Consistent'
  | 'Verification Required'
  | 'Possible Duplicate / Inconsistent Agency Record';

export interface ImplementingAgency {
  agency_id: string;
  agency_name: string;
  registration_ref: string; // PAN or GSTIN or Reg ID
  contact_person: string;
  contact_phone: string;
  contact_email: string;
  registered_address: string;
  associated_projects: string[];
  previous_projects_completed: number;
  verification_status: AgencyVerificationStatus;
  verification_notes: string;
}

export interface BillRecord {
  bill_id: string;
  invoice_number: string;
  project_id: string;
  project_name: string;
  vendor_name: string;
  gstin_pan: string;
  amount: number;
  bill_date: string;
  document_type: string;
  verification_status: DocumentVerificationStatus;
  verification_notes: string;
  ocr_extracted: boolean;
  uploaded_at: string;
}

export interface RawProject {
  project_id: string;
  project_name: string;
  district: string;
  category: string;
  approved_amount: number;
  spent_amount: number;
  progress_percent: number;
  delay_days: number;
  completion_status: CompletionStatus;
  delay_reason: DelayReasonType;
  supporting_event: string;
  supporting_document?: string;
  approved_extension: boolean;
  extension_days?: number;
  agency_id: string;
  agency_name: string;
}

export interface EnrichedProject extends RawProject {
  utilization_percent: number;
  ai_prediction: number; // 1 for normal, -1 for anomaly
  ai_anomaly: AnomalyStatus;
  anomaly_score: number; // 0 to 1
  risk_level: RiskLevel;
  risk_reason: string;
  risk_score: number;
  delay_context_status: DelayContextStatus;
  document_verification_status: DocumentVerificationStatus;
  agency_verification_status: AgencyVerificationStatus;
  supporting_document: string;
  extension_days: number;
}

export interface FilterState {
  district: string;
  category: string;
  riskLevel: string;
  completionStatus: string;
  aiDetection: string;
  delayContext: string;
  searchQuery: string;
}
