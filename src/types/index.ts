export interface User {
  id: string;
  email: string | null;
  name: string | null;
  status: string;  // 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED' | 'DELETED'
  role: string;    // 'USER' | 'ADMIN'
  lastLoginAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export type RoleRequirement = 'ADMIN' | 'USER';

/** Check if user has admin role */
export const isAdmin = (role: string) => role === 'ADMIN';

/** Format role enum to display label */
export const getRoleLabel = (role: string): string => {
  switch (role) {
    case 'ADMIN': return 'Admin';
    case 'USER':  return 'User';
    default:      return role;
  }
};

// ── Claims Audit types ─────────────────────────────────────────────────────

export type AiPlatformStatus = 'MET' | 'NOT_MET' | 'INCONCLUSIVE' | 'DEFECT';
export type AuditorStatus = 'MET' | 'NOT_MET' | 'INCONCLUSIVE' | 'DEFECT';
export type ReviewStatus = 'APPROVED' | 'PENDING' | 'REJECTED';

export interface ClaimRecord {
  claimId: string;
  totalBilledAmount: string | null;
  totalPaidAmount: string | null;
  paidDate: string | null;
  platformDate: string;
  claimAuditedDate: string;
  auditorStatus: AuditorStatus;
  aiPlatformStatus: AiPlatformStatus;
  reviewStatus: ReviewStatus;
  transactionTime: number;
  accuracy: number;
}

export interface ClaimStats {
  totalClaims: number;
  accuracy: number;
  avgProcessingTime: number;
}

export interface ExecutionStep {
  id: string;
  name: string;
  status: string;
  duration: string;
  details: string;
}

export interface AgentExecution {
  id: string;
  agentName: string;
  status: 'MET' | 'NOT_MET' | 'INCONCLUSIVE';
  beginTime: string;
  endTime: string;
  durationSec: number;
  processSummary: string[];
  steps: ExecutionStep[];
}

export interface ClaimDetail {
  claimId: string;
  executionId: string;
  claimStatus: 'MET' | 'NOT_MET' | 'INCONCLUSIVE';
  processingTimeMin: number;
  agents: AgentExecution[];
  feedback?: string;
  reviewStatus?: ReviewStatus;
}
