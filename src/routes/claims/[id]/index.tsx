import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronDown, ChevronUp, Clock, Check, X } from 'lucide-react';
import TopNavLayout from '@/layouts/TopNavLayout';
import { AiStatusChip } from '@/components/StatusChip';
import { getClaimDetail } from '@/data/dummy-claims';
import type { AgentExecution, AiPlatformStatus } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

const ORANGE = '#FF612B';

function AgentCard({ agent, defaultExpanded }: { agent: AgentExecution; defaultExpanded: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [activeTab, setActiveTab] = useState<'execution' | 'step'>('execution');

  return (
    <div className="border border-[#e8ddd4] bg-white">
      {/* Card header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left hover:bg-[#fafafa] transition-colors"
      >
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          <span className="text-sm font-semibold text-gray-900">{agent.agentName}</span>
          <AiStatusChip status={agent.status as AiPlatformStatus} />
          <span className="text-xs text-gray-500">Begin: {agent.beginTime}</span>
          <span className="text-xs text-gray-500">End: {agent.endTime}</span>
          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            <Clock className="h-3.5 w-3.5" />
            {agent.durationSec} Sec
          </span>
        </div>
        {expanded
          ? <ChevronUp className="h-4 w-4 text-gray-500 shrink-0" />
          : <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
        }
      </button>

      {expanded && (
        <div className="border-t border-[#e8ddd4]">
          {/* Internal tabs */}
          <div className="flex px-4 pt-3 gap-0">
            <button
              type="button"
              onClick={() => setActiveTab('execution')}
              className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
                activeTab === 'execution'
                  ? 'text-white'
                  : 'text-[#FF612B] bg-transparent'
              }`}
              style={activeTab === 'execution' ? { backgroundColor: ORANGE } : undefined}
            >
              Agents Execution
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('step')}
              className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
                activeTab === 'step'
                  ? 'text-white'
                  : 'text-[#FF612B] bg-transparent'
              }`}
              style={activeTab === 'step' ? { backgroundColor: ORANGE } : undefined}
            >
              Step Execution
            </button>
          </div>

          <div className="px-4 pb-4 pt-3">
            {activeTab === 'execution' ? (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-gray-700">Execution Status:</span>
                  <AiStatusChip status={agent.status as AiPlatformStatus} />
                </div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Process Summary</h4>
                <ul className="space-y-2 list-disc pl-5">
                  {agent.processSummary.map((point, i) => (
                    <li key={i} className="text-sm text-gray-700 leading-relaxed">
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="space-y-2">
                {agent.steps.map((step) => (
                  <div key={step.id} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800">{step.name}</div>
                      <p className="text-xs text-gray-500 mt-0.5">{step.details}</p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{step.duration}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const LEFT_NAV_ITEMS = [
  { id: 'summary', label: 'Overall Claim Process Summarization' },
  { id: 'agents', label: 'Agents Execution Selection' },
];

export default function ClaimDetailsPage() {
  const { id: claimId } = useParams<{ id: string }>();
  const { canWrite } = useAuth();
  const detail = getClaimDetail(claimId ?? '');

  const [activeNav, setActiveNav] = useState('agents');
  const [feedback, setFeedback] = useState(detail.feedback ?? '');

  return (
    <TopNavLayout showBack>
      {/* Page header */}
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-gray-900">Claim Details</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Review the AI agent execution details for this claim.
        </p>
      </div>

      {/* Claim metadata row */}
      <div className="flex flex-wrap items-start gap-x-10 gap-y-3 mb-5">
        <div>
          <div className="text-sm text-gray-600 mb-1">Claim ID :</div>
          <div className="text-sm font-semibold text-gray-900">{detail.claimId}</div>
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-1">Execution ID :</div>
          <div className="text-sm text-gray-800">{detail.executionId}</div>
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-1">Claim Status :</div>
          <AiStatusChip status={detail.claimStatus} />
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-1">Processing Time :</div>
          <div className="inline-flex items-center gap-1.5 text-sm text-gray-800">
            <Clock className="h-4 w-4 text-gray-400" />
            {detail.processingTimeMin} min
          </div>
        </div>
      </div>

      {/* Main bordered panel — matches screenshot */}
      <div className="border border-[#FF612B]/60 rounded-sm bg-white overflow-hidden">
        <div className="flex min-h-[420px]">
          {/* Left vertical tabs */}
          <div className="w-[220px] shrink-0 flex flex-col border-r border-[#e8ddd4]">
            {LEFT_NAV_ITEMS.map((item) => {
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveNav(item.id)}
                  className={`text-left px-4 py-4 text-sm leading-snug border-b border-[#e8ddd4] last:border-b-0 transition-colors ${
                    isActive
                      ? 'text-white font-medium'
                      : 'text-[#FF612B] bg-[#fff8f4] hover:bg-[#fff3eb]'
                  }`}
                  style={isActive ? { backgroundColor: ORANGE } : undefined}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Right content */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex-1 p-4">
              {activeNav === 'agents' ? (
                <div className="space-y-0 divide-y divide-[#e8ddd4] border border-[#e8ddd4]">
                  {detail.agents.map((agent, index) => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      defaultExpanded={index === 0}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {detail.agents.map((agent) => (
                    <div key={agent.id}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-gray-900">{agent.agentName}</span>
                        <AiStatusChip status={agent.status as AiPlatformStatus} />
                      </div>
                      <ul className="space-y-2 list-disc pl-5">
                        {agent.processSummary.map((point, i) => (
                          <li key={i} className="text-sm text-gray-700 leading-relaxed">
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Feedback + actions — admins only */}
            {canWrite && (
            <div className="border-t border-[#e8ddd4] px-4 py-4 bg-[#fafafa]">
              <label className="block text-sm font-medium text-gray-800 mb-2">
                Feedback: <span className="text-red-500">*</span>
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-white resize-none focus:outline-none focus:ring-1 focus:ring-[#FF612B] focus:border-[#FF612B]"
              />
              <div className="flex justify-end gap-3 mt-3">
                <button
                  type="button"
                  disabled={!feedback.trim()}
                  className="inline-flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-[#4caf7a] hover:bg-[#43a06d] disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition-colors"
                >
                  <Check className="h-4 w-4" />
                  Approve
                </button>
                <button
                  type="button"
                  disabled={!feedback.trim()}
                  className="inline-flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-[#e57373] hover:bg-[#ef5350] disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition-colors"
                >
                  <X className="h-4 w-4" />
                  Reject
                </button>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>
    </TopNavLayout>
  );
}
