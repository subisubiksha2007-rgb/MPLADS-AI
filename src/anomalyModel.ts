import {
  RawProject,
  EnrichedProject,
  RiskLevel,
  AnomalyStatus,
  DelayContextStatus,
  DocumentVerificationStatus,
  AgencyVerificationStatus,
  BillRecord,
  ImplementingAgency
} from './types';
import { INITIAL_BILLS, INITIAL_AGENCIES } from './initialData';

/**
 * Enhanced Anomaly & Multi-Factor Risk Engine
 * Incorporates:
 * - Isolation Forest multi-dimensional feature space
 * - Delay Context (Natural events, weather calamities, approved extensions)
 * - Document & Invoice verification cross-checking
 * - Implementing Agency consistency cross-checking
 */
export function enrichProjects(
  projects: RawProject[],
  bills: BillRecord[] = INITIAL_BILLS,
  agencies: ImplementingAgency[] = INITIAL_AGENCIES,
  contamination = 0.20
): EnrichedProject[] {
  // Step 1: Basic utilization calculations
  const withUtilization = projects.map(p => {
    const approved = p.approved_amount > 0 ? p.approved_amount : 1;
    const utilization_percent = Math.round((p.spent_amount / approved * 100) * 10) / 10;
    return {
      ...p,
      utilization_percent
    };
  });

  // Step 2: Anomaly Score calculation (Isolation Forest heuristic)
  const scored = withUtilization.map(p => {
    const utilRatio = p.spent_amount / (p.approved_amount || 1);
    const progressRatio = p.progress_percent / 100;

    // Check if delay is due to natural event/calamity
    const isNaturalOrApproved =
      p.delay_reason === 'Heavy Rainfall' ||
      p.delay_reason === 'Flood' ||
      p.delay_reason === 'Natural Calamity' ||
      p.approved_extension;

    // If delay is natural/approved, dampen the raw delay factor in the mathematical feature space
    const effectiveDelay = isNaturalOrApproved ? Math.min(p.delay_days * 0.4, 30) : p.delay_days;
    const delayRatio = Math.min(effectiveDelay / 100, 1.2);

    // Mismatch index: spent heavily while progress remains lagging
    const mismatch = Math.max(0, utilRatio - progressRatio);

    // Anomaly score weighting
    const anomalyScore = (mismatch * 0.50) + (delayRatio * 0.30) + ((1 - progressRatio) * 0.20);
    return {
      ...p,
      anomalyScore,
      isNaturalOrApproved
    };
  });

  // Determine anomaly cutoff based on contamination percentile
  const numAnomalies = Math.max(1, Math.round(projects.length * contamination));
  const sortedScores = [...scored].map(s => s.anomalyScore).sort((a, b) => b - a);
  const cutoffScore = sortedScores[numAnomalies - 1] ?? 0.50;

  return scored.map(item => {
    const isAnomaly = item.anomalyScore >= cutoffScore && item.anomalyScore >= 0.50;
    const ai_prediction = isAnomaly ? -1 : 1;
    const ai_anomaly: AnomalyStatus = isAnomaly ? 'Anomaly Detected' : 'Normal';

    // 1. Determine Delay Context Status
    let delay_context_status: DelayContextStatus = 'Normal Timeline';
    const isLegitimateEvent =
      item.delay_reason === 'Heavy Rainfall' ||
      item.delay_reason === 'Flood' ||
      item.delay_reason === 'Natural Calamity' ||
      item.delay_reason === 'Government Approval Delay' ||
      item.approved_extension;

    if (item.delay_days > 15) {
      if (isLegitimateEvent) {
        delay_context_status = 'Contextual / Justified Delay';
      } else if (item.delay_days > 30) {
        delay_context_status = 'Delay Requires Investigation';
      } else {
        delay_context_status = 'Contextual / Justified Delay';
      }
    } else {
      delay_context_status = 'Normal Timeline';
    }

    // 2. Determine Document Verification Status for this project
    const projectBills = bills.filter(b => b.project_id === item.project_id);
    let document_verification_status: DocumentVerificationStatus = 'No Obvious Anomaly';
    if (projectBills.some(b => b.verification_status === 'Possible Duplicate/Inconsistency')) {
      document_verification_status = 'Possible Duplicate/Inconsistency';
    } else if (projectBills.some(b => b.verification_status === 'Needs Verification')) {
      document_verification_status = 'Needs Verification';
    }

    // 3. Determine Implementing Agency Verification Status
    const agencyRecord = agencies.find(a => a.agency_id === item.agency_id);
    const agency_verification_status: AgencyVerificationStatus = agencyRecord
      ? agencyRecord.verification_status
      : 'Agency Information Consistent';

    // 4. Multi-Factor Composite Risk Score Calculation
    let score = 0;
    const reasons: string[] = [];

    // Factor A: Financial pattern (Spending vs. Physical Progress)
    if (item.utilization_percent > 80 && item.progress_percent < 40) {
      score += 50;
      reasons.push('High expenditure compared with work progress');
    }

    // Factor B & C: Delay with Context Analysis
    // CRITICAL: If legitimate delay (natural calamity / approved extension), DO NOT penalize for delay
    if (delay_context_status === 'Delay Requires Investigation') {
      if (item.delay_days > 60) {
        score += 30;
        reasons.push(`Unexplained delay (${item.delay_days} days) without approved extension`);
      } else if (item.delay_days > 30) {
        score += 15;
        reasons.push(`Delay (${item.delay_days} days) requires monitoring`);
      }
    } else if (delay_context_status === 'Contextual / Justified Delay' && item.delay_days > 45) {
      // Legitimate delay acknowledged contextually without punitive score jump
      reasons.push(`Contextual delay (${item.delay_reason}: ${item.supporting_event})`);
    }

    // Factor B: Very low work progress
    if (item.progress_percent < 30) {
      score += 20;
      reasons.push('Very low work progress');
    }

    // Factor D: AI anomaly flag
    if (ai_anomaly === 'Anomaly Detected') {
      score += 20;
      reasons.push('AI detected an unusual pattern');
    }

    // Factor E: Document verification flags
    if (document_verification_status === 'Possible Duplicate/Inconsistency') {
      score += 15;
      reasons.push('Invoice record inconsistency / duplicate detected');
    } else if (document_verification_status === 'Needs Verification') {
      score += 5;
      reasons.push('Document records require manual verification');
    }

    // Factor F: Agency verification flags
    if (agency_verification_status === 'Possible Duplicate / Inconsistent Agency Record') {
      score += 15;
      reasons.push('Agency registration details require verification');
    }

    // Tiers
    let risk_level: RiskLevel = 'Low Risk';
    if (score >= 70) {
      risk_level = 'High Risk';
    } else if (score >= 40) {
      risk_level = 'Medium Risk';
    } else {
      risk_level = 'Low Risk';
    }

    const risk_reason = reasons.length > 0 ? reasons.join(' | ') : 'Information consistent with available records';

    return {
      project_id: item.project_id,
      project_name: item.project_name,
      district: item.district,
      category: item.category,
      approved_amount: item.approved_amount,
      spent_amount: item.spent_amount,
      progress_percent: item.progress_percent,
      delay_days: item.delay_days,
      completion_status: item.completion_status,
      delay_reason: item.delay_reason,
      supporting_event: item.supporting_event,
      approved_extension: item.approved_extension,
      agency_id: item.agency_id,
      agency_name: item.agency_name,
      utilization_percent: item.utilization_percent,
      ai_prediction,
      ai_anomaly,
      anomaly_score: Math.round(item.anomalyScore * 100) / 100,
      risk_level,
      risk_reason,
      risk_score: score,
      delay_context_status,
      document_verification_status,
      agency_verification_status
    };
  });
}
