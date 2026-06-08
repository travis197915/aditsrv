/**
 * Maps an SOP name (as it appears in the execution trace) to its audit
 * *process* — the ordered stage in the Complete Claim Audit Pipeline. The
 * dashboard groups trace steps by process so the per-SOP step numbers (which
 * restart at 0/1 inside each SOP) make sense in context.
 *
 * Source of truth: builder/management/commands/build_claim_audit_workflow.py
 * (the SEQUENCE list — workbench label per SOP).
 */
export interface ProcessInfo {
  order: number;
  label: string;
}

const _SOP_TO_PROCESS: Record<string, ProcessInfo> = {
  'OBH Facets Physician Claim Checklist Quick Reference': { order: 1, label: '1. Initial Verification' },
  'OBH Facets Claims Spanning Eligibility Dates': { order: 2, label: '2. Member Eligibility' },
  'Provider Name and NPI Validation Audit Guidelines': { order: 3, label: '3. Provider NPI / Name Validation' },
  'OBH Facets Provider Selection Guidelines': { order: 4, label: '4. Provider Selection' },
  'Provider Opt-Out Look-Up Audit Guidelines': { order: 5, label: '5. Provider Opt-Out' },
  'OBH Facets Timely Filing (050526)': { order: 6, label: '6. Timely Filing' },
  'OBH Facets Duplicate Claim Handling': { order: 7, label: '7. Duplicate Verification' },
  'Access Covered Benefit SOP': { order: 8, label: '8. Coverage / Benefit' },
  'XMED Behavioral Health Diagnosis Coverage Verification': { order: 9, label: '9. XMED Diagnosis Coverage' },
};

/** Resolve an SOP name to its process stage. Unknown SOPs sort last. */
export function processFor(sopName?: string | null): ProcessInfo {
  const key = (sopName || '').trim();
  return _SOP_TO_PROCESS[key] ?? { order: 99, label: key || 'Other' };
}
