import type { ClaimRecord, ClaimStats, ClaimDetail } from '@/types';

export const CLAIM_STATS: ClaimStats = {
  totalClaims: 406,
  accuracy: 28.9,
  avgProcessingTime: 14.53,
};

export const CLAIMS: ClaimRecord[] = [
  { claimId: '24XG20373601', totalBilledAmount: null,     totalPaidAmount: null,     paidDate: null,         platformDate: '04-13-2026', claimAuditedDate: '04-13-2026', auditorStatus: 'NOT_MET',    aiPlatformStatus: 'NOT_MET',    reviewStatus: 'APPROVED', transactionTime: 5.73,  accuracy: 0 },
  { claimId: '24XH34963001', totalBilledAmount: null,     totalPaidAmount: null,     paidDate: null,         platformDate: '04-09-2026', claimAuditedDate: '04-09-2026', auditorStatus: 'NOT_MET',    aiPlatformStatus: 'NOT_MET',    reviewStatus: 'APPROVED', transactionTime: 14.61, accuracy: 0 },
  { claimId: '25G068663700', totalBilledAmount: null,     totalPaidAmount: null,     paidDate: null,         platformDate: '04-28-2026', claimAuditedDate: '04-08-2026', auditorStatus: 'MET',        aiPlatformStatus: 'NOT_MET',    reviewStatus: 'APPROVED', transactionTime: 7.57,  accuracy: 100 },
  { claimId: '250068663700', totalBilledAmount: null,     totalPaidAmount: null,     paidDate: null,         platformDate: '05-17-2028', claimAuditedDate: '04-08-2026', auditorStatus: 'INCONCLUSIVE', aiPlatformStatus: 'INCONCLUSIVE', reviewStatus: 'PENDING',  transactionTime: 0.65,  accuracy: 0 },
  { claimId: '250068663700', totalBilledAmount: null,     totalPaidAmount: null,     paidDate: null,         platformDate: '05-17-2026', claimAuditedDate: '04-08-2026', auditorStatus: 'NOT_MET',    aiPlatformStatus: 'NOT_MET',    reviewStatus: 'PENDING',  transactionTime: 1.75,  accuracy: 0 },
  { claimId: '250075220400', totalBilledAmount: null,     totalPaidAmount: null,     paidDate: null,         platformDate: '04-14-2026', claimAuditedDate: '04-14-2026', auditorStatus: 'NOT_MET',    aiPlatformStatus: 'NOT_MET',    reviewStatus: 'APPROVED', transactionTime: 13.8,  accuracy: 0 },
  { claimId: '250075220400', totalBilledAmount: null,     totalPaidAmount: null,     paidDate: null,         platformDate: '05-13-2026', claimAuditedDate: '05-13-2026', auditorStatus: 'NOT_MET',    aiPlatformStatus: 'NOT_MET',    reviewStatus: 'PENDING',  transactionTime: 3,     accuracy: 0 },
  { claimId: '250075220400', totalBilledAmount: null,     totalPaidAmount: null,     paidDate: null,         platformDate: '05-13-2026', claimAuditedDate: '05-13-2026', auditorStatus: 'NOT_MET',    aiPlatformStatus: 'NOT_MET',    reviewStatus: 'PENDING',  transactionTime: 7.75,  accuracy: 0 },
  { claimId: '250075220400', totalBilledAmount: null,     totalPaidAmount: null,     paidDate: null,         platformDate: '04-14-2026', claimAuditedDate: '04-14-2026', auditorStatus: 'NOT_MET',    aiPlatformStatus: 'NOT_MET',    reviewStatus: 'APPROVED', transactionTime: 7.84,  accuracy: 0 },
  { claimId: '250075220400', totalBilledAmount: null,     totalPaidAmount: null,     paidDate: null,         platformDate: '05-13-2026', claimAuditedDate: '05-13-2026', auditorStatus: 'INCONCLUSIVE', aiPlatformStatus: 'INCONCLUSIVE', reviewStatus: 'PENDING',  transactionTime: 6.45,  accuracy: 0 },
  { claimId: '250075220400', totalBilledAmount: null,     totalPaidAmount: null,     paidDate: null,         platformDate: '05-13-2026', claimAuditedDate: '05-13-2026', auditorStatus: 'INCONCLUSIVE', aiPlatformStatus: 'INCONCLUSIVE', reviewStatus: 'PENDING',  transactionTime: 1.54,  accuracy: 0 },
  { claimId: '250084639300', totalBilledAmount: null,     totalPaidAmount: null,     paidDate: null,         platformDate: '05-13-2026', claimAuditedDate: '05-13-2026', auditorStatus: 'NOT_MET',    aiPlatformStatus: 'NOT_MET',    reviewStatus: 'PENDING',  transactionTime: 13.15, accuracy: 0 },
  { claimId: '250084639300', totalBilledAmount: null,     totalPaidAmount: null,     paidDate: null,         platformDate: '04-08-2026', claimAuditedDate: '04-08-2026', auditorStatus: 'MET',        aiPlatformStatus: 'MET',        reviewStatus: 'REJECTED', transactionTime: 9.49,  accuracy: 0 },
  { claimId: '250084639300', totalBilledAmount: null,     totalPaidAmount: null,     paidDate: null,         platformDate: '04-08-2026', claimAuditedDate: '04-08-2026', auditorStatus: 'MET',        aiPlatformStatus: 'MET',        reviewStatus: 'APPROVED', transactionTime: 8.25,  accuracy: 0 },
  { claimId: '25XF40885201', totalBilledAmount: null,     totalPaidAmount: null,     paidDate: null,         platformDate: '04-16-2026', claimAuditedDate: '04-16-2026', auditorStatus: 'NOT_MET',    aiPlatformStatus: 'NOT_MET',    reviewStatus: 'APPROVED', transactionTime: 18.8,  accuracy: 0 },
  { claimId: '25XF40885201', totalBilledAmount: null,     totalPaidAmount: null,     paidDate: null,         platformDate: '04-06-2026', claimAuditedDate: '04-06-2026', auditorStatus: 'NOT_MET',    aiPlatformStatus: 'NOT_MET',    reviewStatus: 'REJECTED', transactionTime: 8.4,   accuracy: 0 },
  { claimId: '25XF96135401', totalBilledAmount: '$30790.4', totalPaidAmount: '$30790.4', paidDate: '09-03-2025', platformDate: '04-20-2026', claimAuditedDate: '04-20-2026', auditorStatus: 'DEFECT', aiPlatformStatus: 'NOT_MET',    reviewStatus: 'REJECTED', transactionTime: 28.69, accuracy: 100 },
  { claimId: '25XF96135401', totalBilledAmount: '$30790.4', totalPaidAmount: '$30790.4', paidDate: '09-03-2025', platformDate: '04-20-2026', claimAuditedDate: '04-20-2026', auditorStatus: 'DEFECT', aiPlatformStatus: 'NOT_MET',    reviewStatus: 'APPROVED', transactionTime: 13.42, accuracy: 100 },
  { claimId: '25XF96135401', totalBilledAmount: '$30790.4', totalPaidAmount: '$30790.4', paidDate: '09-03-2025', platformDate: '04-20-2026', claimAuditedDate: '04-20-2026', auditorStatus: 'NOT_MET', aiPlatformStatus: 'INCONCLUSIVE', reviewStatus: 'PENDING', transactionTime: 4.7,   accuracy: 0 },
  { claimId: '25XG49324400', totalBilledAmount: null,     totalPaidAmount: null,     paidDate: null,         platformDate: '04-08-2026', claimAuditedDate: '04-08-2026', auditorStatus: 'NOT_MET',    aiPlatformStatus: 'NOT_MET',    reviewStatus: 'APPROVED', transactionTime: 3.88,  accuracy: 0 },
  { claimId: '25XG56978700', totalBilledAmount: null,     totalPaidAmount: null,     paidDate: null,         platformDate: '04-08-2026', claimAuditedDate: '04-08-2026', auditorStatus: 'MET',        aiPlatformStatus: 'MET',        reviewStatus: 'REJECTED', transactionTime: 31.26, accuracy: 0 },
  { claimId: '25XG56978700', totalBilledAmount: null,     totalPaidAmount: null,     paidDate: null,         platformDate: '04-26-2026', claimAuditedDate: '04-26-2026', auditorStatus: 'MET',        aiPlatformStatus: 'MET',        reviewStatus: 'PENDING',  transactionTime: 7.52,  accuracy: 0 },
  { claimId: '25XG56978700', totalBilledAmount: null,     totalPaidAmount: null,     paidDate: null,         platformDate: '04-08-2026', claimAuditedDate: '04-08-2026', auditorStatus: 'MET',        aiPlatformStatus: 'MET',        reviewStatus: 'PENDING',  transactionTime: 11.81, accuracy: 0 },
  { claimId: '25XG56978700', totalBilledAmount: null,     totalPaidAmount: null,     paidDate: null,         platformDate: '04-08-2026', claimAuditedDate: '04-08-2026', auditorStatus: 'MET',        aiPlatformStatus: 'MET',        reviewStatus: 'PENDING',  transactionTime: 10.32, accuracy: 0 },
  { claimId: '25XG56978700', totalBilledAmount: null,     totalPaidAmount: null,     paidDate: null,         platformDate: '04-05-2026', claimAuditedDate: '04-05-2026', auditorStatus: 'NOT_MET',    aiPlatformStatus: 'NOT_MET',    reviewStatus: 'PENDING',  transactionTime: 109.23, accuracy: 0 },
];

export const CLAIM_DETAILS: Record<string, ClaimDetail> = {
  '25XH48861400': {
    claimId: '25XH48861400',
    executionId: '002252d-97ba-4c7d-9963-bf1c717a194a',
    claimStatus: 'NOT_MET',
    processingTimeMin: 20.61,
    agents: [
      {
        id: 'xmed-diagnosis',
        agentName: 'Xmed Diagnosis Coverage',
        status: 'NOT_MET',
        beginTime: '06:08:09 AM',
        endTime: '06:14:15 AM',
        durationSec: 366,
        processSummary: [
          "Attempted to retrieve the claim line 'Type of Service' from Facets line details for claim 25XH48861400 using facets_get_line_details.",
          "Inspected two Facets line items' REC_CIV9 fields (examples: SEDS_DESC='INPATIENT DETOX'; SEDS_DESC='ANCILLARIES (SA)-PHARMACY'; SESE_DESC, SESE_ID).",
          "Marked the XMED verification step as Not Met because the explicit 'Type of Service' field and XMED designation were not found.",
          "Generated and saved a comprehensive summary of the XMED diagnosis coverage determination.",
        ],
        steps: [
          { id: 's1', name: 'Retrieve Claim Line Details', status: 'completed', duration: '12s', details: 'Called facets_get_line_details for claim 25XH48861400' },
          { id: 's2', name: 'Inspect REC_CIV9 Fields', status: 'completed', duration: '8s', details: 'Inspected SEDS_DESC and SESE_DESC fields' },
          { id: 's3', name: 'XMED Verification', status: 'failed', duration: '5s', details: 'Type of Service field not found' },
          { id: 's4', name: 'Generate Summary', status: 'completed', duration: '4s', details: 'Saved comprehensive XMED diagnosis summary' },
        ],
      },
      {
        id: 'member-eligibility',
        agentName: 'Member Eligibility',
        status: 'MET',
        beginTime: '06:08:09 AM',
        endTime: '06:18:41 AM',
        durationSec: 632,
        processSummary: [
          'Verified member eligibility for claim 25XH48861400 through the eligibility verification system.',
          "Member's plan was active and in good standing during the date of service.",
          'All required authorizations were present and valid.',
          'Eligibility check completed successfully — marked as Met.',
        ],
        steps: [
          { id: 's1', name: 'Query Eligibility System', status: 'completed', duration: '30s', details: 'Retrieved member plan details' },
          { id: 's2', name: 'Validate Authorization', status: 'completed', duration: '15s', details: 'All authorizations valid' },
          { id: 's3', name: 'Date of Service Check', status: 'completed', duration: '10s', details: 'Service date within plan period' },
        ],
      },
    ],
    feedback: 'approved',
    reviewStatus: 'APPROVED',
  },
};

// For claims in the list that don't have detail records, generate a generic detail
export function getClaimDetail(claimId: string): ClaimDetail {
  if (CLAIM_DETAILS[claimId]) return CLAIM_DETAILS[claimId];

  const claim = CLAIMS.find((c) => c.claimId === claimId);
  return {
    claimId,
    executionId: `${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 6)}-4c7d-9963-bf1c717a194a`,
    claimStatus: (claim?.aiPlatformStatus === 'MET' ? 'MET' : claim?.aiPlatformStatus === 'INCONCLUSIVE' ? 'INCONCLUSIVE' : 'NOT_MET') as 'MET' | 'NOT_MET' | 'INCONCLUSIVE',
    processingTimeMin: claim?.transactionTime ?? 10,
    agents: [
      {
        id: 'xmed-diagnosis',
        agentName: 'Xmed Diagnosis Coverage',
        status: 'NOT_MET',
        beginTime: '06:08:09 AM',
        endTime: '06:14:15 AM',
        durationSec: 366,
        processSummary: [
          `Attempted to retrieve the claim line 'Type of Service' from Facets line details for claim ${claimId} using facets_get_line_details.`,
          "Inspected two Facets line items' REC_CIV9 fields (examples: SEDS_DESC='INPATIENT DETOX'; SEDS_DESC='ANCILLARIES (SA)-PHARMACY'; SESE_DESC, SESE_ID).",
          "Marked the XMED verification step as Not Met because the explicit 'Type of Service' field and XMED designation were not found.",
          'Generated and saved a comprehensive summary of the XMED diagnosis coverage determination.',
        ],
        steps: [
          { id: 's1', name: 'Retrieve Claim Line Details', status: 'completed', duration: '12s', details: 'Called facets_get_line_details' },
          { id: 's2', name: 'Inspect REC_CIV9 Fields', status: 'completed', duration: '8s', details: 'Inspected SEDS_DESC and SESE_DESC fields' },
          { id: 's3', name: 'XMED Verification', status: 'failed', duration: '5s', details: 'Type of Service field not found' },
        ],
      },
      {
        id: 'member-eligibility',
        agentName: 'Member Eligibility',
        status: 'MET',
        beginTime: '06:08:09 AM',
        endTime: '06:18:41 AM',
        durationSec: 632,
        processSummary: [
          `Verified member eligibility for claim ${claimId} through the eligibility verification system.`,
          "Member's plan was active and in good standing during the date of service.",
          'Eligibility check completed successfully — marked as Met.',
        ],
        steps: [
          { id: 's1', name: 'Query Eligibility System', status: 'completed', duration: '30s', details: 'Retrieved member plan details' },
          { id: 's2', name: 'Validate Authorization', status: 'completed', duration: '15s', details: 'All authorizations valid' },
        ],
      },
    ],
    reviewStatus: claim?.reviewStatus,
  };
}
