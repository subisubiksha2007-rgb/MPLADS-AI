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
  // Step 1: Basic utilization calculations & field defaults
  const withUtilization = projects.map(p => {
    const approved = p.approved_amount > 0 ? p.approved_amount : 1;
    const utilization_percent = Math.round((p.spent_amount / approved * 100) * 10) / 10;
    const extension_days = p.extension_days !== undefined ? p.extension_days : (p.approved_extension ? p.delay_days : 0);
    const supporting_document = p.supporting_document || p.supporting_event || 'None';

    return {
      ...p,
      utilization_percent,
      extension_days,
      supporting_document
    };
  });

  // Step 2: Anomaly Score calculation (Isolation Forest heuristic)
  const scored = withUtilization.map(p => {
    const utilRatio = p.spent_amount / (p.approved_amount || 1);
    const progressRatio = p.progress_percent / 100;

    // Check if delay is due to natural event/calamity
    const isNaturalEvent =
      p.delay_reason === 'Heavy Rainfall' ||
      p.delay_reason === 'Flood / Natural Calamity' ||
      p.delay_reason === 'Flood' ||
      p.delay_reason === 'Natural Calamity';

    const isNaturalOrApproved = (isNaturalEvent && p.approved_extension) || (p.approved_extension && p.delay_days <= (p.extension_days || p.delay_days));

    // If delay is a justified natural event with approved extension, do NOT inflate anomaly score based on delay
    const effectiveDelay = isNaturalOrApproved ? 0 : p.delay_days;
    const delayRatio = Math.min(effectiveDelay / 100, 1.2);

    // Mismatch index: spent heavily while progress remains lagging
    const mismatch = Math.max(0, utilRatio - progressRatio);

    // Anomaly score weighting
    const anomalyScore = (mismatch * 0.50) + (delayRatio * 0.30) + ((1 - progressRatio) * 0.20);
    return {
      ...p,
      anomalyScore,
      isNaturalEvent,
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

    // ---------------------------------------------------------
    // 1. DELAY CONTEXT STATUS EVALUATION (Logic Rules 1, 2, 3)
    // ---------------------------------------------------------
    let delay_context_status: DelayContextStatus = 'Normal Timeline';

    const isNaturalEvent =
      item.delay_reason === 'Heavy Rainfall' ||
      item.delay_reason === 'Flood / Natural Calamity' ||
      item.delay_reason === 'Flood' ||
      item.delay_reason === 'Natural Calamity';

    const hasValidDocumentedReason =
      isNaturalEvent ||
      item.delay_reason === 'Government Approval Delay' ||
      item.delay_reason === 'Land / Permission Issue' ||
      item.delay_reason === 'Land/Permission Issue' ||
      item.delay_reason === 'Material Supply Delay';

    const hasSupportingContext =
      item.supporting_document &&
      !item.supporting_document.toLowerCase().startsWith('none') &&
      !item.supporting_document.toLowerCase().includes('unexplained') &&
      item.supporting_event &&
      !item.supporting_event.toLowerCase().startsWith('none') &&
      !item.supporting_event.toLowerCase().includes('unexplained');

    const isReasonUnknownOrMissing =
      item.delay_reason === 'Other / Unknown' ||
      item.delay_reason === 'Unknown / No Documented Reason' ||
      !hasSupportingContext;

    // Evaluate delay
    if (item.delay_days > 15) {
      // Rule 2: If the delay is long but there is a valid documented reason and approved extension:
      // -> 🟢 Contextually Justified Delay
      if (hasValidDocumentedReason && item.approved_extension) {
        delay_context_status = 'Contextual / Justified Delay';
      }
      // Rule 3: If the delay is long, reason is unknown, no supporting context, and no approved extension:
      // -> 🔴 Delay Requires Investigation
      else if (isReasonUnknownOrMissing && !item.approved_extension) {
        delay_context_status = 'Delay Requires Investigation';
      }
      // Long delay without approved extension (e.g. contractor dispute or unexcused delays > 30 days)
      else if (!item.approved_extension && (item.delay_days > 30 || item.delay_reason === 'Contractor Issue')) {
        delay_context_status = 'Delay Requires Investigation';
      } else {
        delay_context_status = 'Contextual / Justified Delay';
      }
    } else {
      delay_context_status = 'Normal Timeline';
    }

    // ---------------------------------------------------------
    // 2. DOCUMENT & INVOICE VERIFICATION STATUS FOR THIS PROJECT
    // ---------------------------------------------------------
    const projectBills = bills.filter(b => b.project_id === item.project_id);
    let document_verification_status: DocumentVerificationStatus = 'No Obvious Anomaly';
    if (projectBills.some(b => b.verification_status === 'Possible Duplicate/Inconsistency')) {
      document_verification_status = 'Possible Duplicate/Inconsistency';
    } else if (projectBills.some(b => b.verification_status === 'Needs Verification')) {
      document_verification_status = 'Needs Verification';
    }

    // ---------------------------------------------------------
    // 3. IMPLEMENTING AGENCY VERIFICATION STATUS
    // ---------------------------------------------------------
    const agencyRecord = agencies.find(a => a.agency_id === item.agency_id);
    const agency_verification_status: AgencyVerificationStatus = agencyRecord
      ? agencyRecord.verification_status
      : 'Agency Information Consistent';

    // ---------------------------------------------------------
    // 4. MULTI-FACTOR RISK SCORE & REASONS GENERATION
    // ---------------------------------------------------------
    let score = 0;
    const reasons: string[] = [];

    // Factor A: Spending vs Physical Progress Mismatch
    if (item.utilization_percent > 80 && item.progress_percent < 40) {
      score += 50;
      reasons.push('High expenditure compared with work progress');
    }

    // Logic Rule 1:
    // If there is a documented natural event such as heavy rainfall or flood AND an approved extension,
    // do NOT increase the project risk only because of the delay.
    const isExemptNaturalDelay = isNaturalEvent && item.approved_extension;

    // Logic Rule 4:
    // If long delay is combined with low progress and high expenditure, increase the risk appropriately.
    const isLongDelay = item.delay_days > 30;
    const isHighSpend = item.utilization_percent > 70;
    const isLowProgress = item.progress_percent < 40;

    if (isLongDelay && isHighSpend && isLowProgress) {
      score += 35;
      reasons.push(`Compounding risk: ${item.delay_days}-day delay combined with high expenditure (${item.utilization_percent}%) and lagging progress (${item.progress_percent}%)`);
    }

    // Factor B: Delay context evaluation
    if (delay_context_status === 'Delay Requires Investigation') {
      if (item.delay_days > 60) {
        score += 30;
        reasons.push(`Unexcused significant delay (${item.delay_days} days) without approved extension`);
      } else if (item.delay_days > 30) {
        score += 15;
        reasons.push(`Unexcused delay (${item.delay_days} days) requires administrative investigation`);
      }
    } else if (delay_context_status === 'Contextual / Justified Delay') {
      if (isExemptNaturalDelay) {
        // Explicitly NOT adding any risk points for delay (Rule 1)
        reasons.push(`Contextually justified delay (${item.delay_reason}: documented natural event with ${item.extension_days}d approved extension)`);
      } else {
        reasons.push(`Contextually justified delay (${item.delay_reason} with ${item.extension_days}d approved extension)`);
      }
    }

    // Factor C: Very low work progress standalone
    if (item.progress_percent < 30) {
      score += 20;
      reasons.push('Very low work progress (<30%)');
    }

    // Factor D: AI Anomaly flag (Isolation Forest pattern)
    if (ai_anomaly === 'Anomaly Detected') {
      score += 20;
      reasons.push('AI detected unusual multi-feature pattern');
    }

    // Factor E: Document verification flags
    if (document_verification_status === 'Possible Duplicate/Inconsistency') {
      score += 20;
      reasons.push('Invoice record inconsistency / possible duplicate detected');
    } else if (document_verification_status === 'Needs Verification') {
      score += 5;
      reasons.push('Document records require manual verification');
    }

    // Factor F: Agency verification flags
    if (agency_verification_status === 'Possible Duplicate / Inconsistent Agency Record') {
      score += 15;
      reasons.push('Agency registration details require verification');
    }

    // Determine Risk Tier
    let risk_level: RiskLevel = 'Low Risk';
    if (score >= 70) {
      risk_level = 'High Risk';
    } else if (score >= 40) {
      risk_level = 'Medium Risk';
    } else {
      risk_level = 'Low Risk';
    }

    const risk_reason = reasons.length > 0 ? reasons.join(' | ') : 'Project timeline and expenditure consistent with available records';

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
      supporting_document: item.supporting_document,
      approved_extension: item.approved_extension,
      extension_days: item.extension_days,
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
