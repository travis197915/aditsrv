import { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, FileSpreadsheet, Upload as UploadIcon, X } from 'lucide-react';
import { listWorkflows } from '@/lib/execute';
import { useBatchExecution } from '@/hooks/useBatchExecution';
import { getToken } from '@/utils/auth';
import type { Workflow } from '@/types/execute';
import BatchProgressPanel from '@/components/BatchProgressPanel';

type RunBatchModalProps = {
  open: boolean;
  onClose: () => void;
};

const ORANGE = '#FF612B';

function getWorkflowLabel(wf: Workflow): string {
  if (typeof wf.name === 'string' && wf.name.trim()) return wf.name;
  if (typeof wf.title === 'string' && wf.title.trim()) return wf.title as string;
  return wf.id;
}

export default function RunBatchModal({ open, onClose }: RunBatchModalProps) {
  const token = getToken();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [workflowId, setWorkflowId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [claimIdColumn, setClaimIdColumn] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const execution = useBatchExecution(token);

  const workflowsQuery = useQuery({
    queryKey: ['workflows', 'builder'],
    queryFn: () => listWorkflows(token!),
    enabled: open && !!token,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const canStart = useMemo(
    () => execution.status === 'IDLE' && !!workflowId && !!file,
    [execution.status, workflowId, file],
  );

  const handleFile = (input: FileList | null) => {
    setFile(input?.[0] ?? null);
  };

  const handleStart = async () => {
    if (!workflowId || !file) return;
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setSubmitError('Only .xlsx workbooks are supported.');
      return;
    }
    if (file.size === 0) {
      setSubmitError('The selected file is empty.');
      return;
    }
    setSubmitError(null);
    try {
      await execution.start({
        workflowId,
        file,
        options: {
          claimIdColumn: claimIdColumn.trim() || undefined,
          sheetName: sheetName.trim() || undefined,
        },
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to start batch');
    }
  };

  const handleClose = () => {
    if (execution.status === 'DONE') {
      queryClient.invalidateQueries({ queryKey: ['runs'] });
    }
    onClose();
  };

  if (!open) return null;

  const inProgress = execution.status !== 'IDLE';

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/40" onClick={inProgress ? undefined : handleClose} />

      <div className="absolute inset-0 flex items-start justify-center p-6 overflow-y-auto">
        <div className="bg-white w-full max-w-3xl rounded shadow-xl border border-gray-200 my-6">
          <header className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">
              {inProgress ? 'Batch in progress' : 'Run workflow batch'}
            </h2>
            <button
              type="button"
              onClick={handleClose}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4 text-gray-600" />
            </button>
          </header>

          {!inProgress ? (
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  Workflow <span className="text-red-500">*</span>
                </label>
                <select
                  value={workflowId}
                  onChange={(e) => setWorkflowId(e.target.value)}
                  disabled={workflowsQuery.isLoading || !!workflowsQuery.error}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#FF612B] focus:border-[#FF612B]"
                >
                  <option value="">
                    {workflowsQuery.isLoading ? 'Loading workflows...' : 'Select a workflow'}
                  </option>
                  {(workflowsQuery.data ?? []).map((wf) => (
                    <option key={wf.id} value={wf.id}>
                      {getWorkflowLabel(wf)}
                    </option>
                  ))}
                </select>
                {workflowsQuery.error ? (
                  <p className="mt-1 text-xs text-red-600">
                    {(workflowsQuery.error as Error).message}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  Excel workbook (.xlsx) <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded bg-white hover:bg-gray-50 transition-colors text-gray-700"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-gray-500" />
                    {file ? 'Change file' : 'Choose file'}
                  </button>
                  <span className="text-sm text-gray-600 truncate">
                    {file ? file.name : 'No file selected'}
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files)}
                  />
                </div>
              </div>

              <div className="border border-gray-200 rounded">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <span>Advanced options</span>
                  {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {showAdvanced && (
                  <div className="px-3 py-3 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Claim ID column
                      </label>
                      <input
                        type="text"
                        value={claimIdColumn}
                        onChange={(e) => setClaimIdColumn(e.target.value)}
                        placeholder="claim_id"
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#FF612B] focus:border-[#FF612B]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Sheet name
                      </label>
                      <input
                        type="text"
                        value={sheetName}
                        onChange={(e) => setSheetName(e.target.value)}
                        placeholder="first sheet"
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#FF612B] focus:border-[#FF612B]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={!canStart}
                  className="inline-flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: ORANGE }}
                >
                  <UploadIcon className="h-3.5 w-3.5" />
                  Start batch
                </button>
              </div>
            </div>
          ) : (
            <BatchProgressPanel
              token={token}
              batchId={execution.batchId}
              events={execution.events}
              status={execution.status}
              error={execution.error}
              onCancel={execution.cancel}
              onClose={handleClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}
