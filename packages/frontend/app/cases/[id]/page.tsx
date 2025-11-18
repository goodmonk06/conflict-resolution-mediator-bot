'use client';

import { useEffect, useState } from 'react';
import { api, MediationCase, MediationStep } from '@/lib/api';
import ReactMarkdown from 'react-markdown';

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
];

const ACTION_TYPE_LABELS: Record<string, string> = {
  reach_out: 'Reach Out',
  schedule_call: 'Schedule Call',
  clarify: 'Clarify',
  reframe: 'Reframe',
  agreement: 'Agreement',
};

export default function CaseDetailPage({ params }: { params: { id: string } }) {
  const [case_, setCase] = useState<MediationCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadCase();
  }, [params.id]);

  async function loadCase() {
    try {
      setLoading(true);
      const data = await api.getCase(params.id);
      setCase(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load case');
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(status: string) {
    if (!case_) return;

    try {
      setUpdating(true);
      const updated = await api.updateCase(case_.id, { status });
      setCase(updated);
    } catch (err) {
      alert('Failed to update status: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setUpdating(false);
    }
  }

  async function toggleStepCompletion(step: MediationStep) {
    if (!case_) return;

    try {
      const completedAt = step.completedAt ? null : new Date().toISOString();
      const updated = await api.updateStep(case_.id, step.id, { completedAt });

      setCase({
        ...case_,
        steps: case_.steps.map(s => s.id === step.id ? updated : s),
      });
    } catch (err) {
      alert('Failed to update step: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading case...</div>
      </div>
    );
  }

  if (error || !case_) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Error: {error || 'Case not found'}</p>
      </div>
    );
  }

  const latestSignal = (case_ as any).thread?.conflictSignals?.[0];

  return (
    <div>
      <div className="mb-6">
        <a href="/cases" className="text-sm text-primary-600 hover:underline mb-2 inline-block">
          ← Back to cases
        </a>
        <h2 className="text-2xl font-bold text-gray-900">
          Case: {case_.thread.externalThreadId}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {case_.thread.communityId} • {case_.thread.sourceType}
        </p>
      </div>

      {/* Status & Metadata */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={case_.status}
              onChange={(e) => updateStatus(e.target.value)}
              disabled={updating}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assigned Mediator
            </label>
            <input
              type="text"
              value={case_.assignedMediatorRef || ''}
              onChange={async (e) => {
                const updated = await api.updateCase(case_.id, {
                  assignedMediatorRef: e.target.value || null,
                });
                setCase(updated);
              }}
              placeholder="email@example.com"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
          <span>Created: {new Date(case_.createdAt).toLocaleString()}</span>
          <span>•</span>
          <span>Updated: {new Date(case_.updatedAt).toLocaleString()}</span>
        </div>
      </div>

      {/* Conflict Signal */}
      {latestSignal && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Latest Conflict Signal</h3>
          <div className="prose prose-sm max-w-none markdown">
            <ReactMarkdown>{latestSignal.summaryMarkdown}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Case Notes */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Case Notes</h3>
        {case_.notesMarkdown ? (
          <div className="prose prose-sm max-w-none markdown">
            <ReactMarkdown>{case_.notesMarkdown}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-gray-500 italic">No notes yet</p>
        )}
      </div>

      {/* Mediation Steps */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Mediation Steps</h3>

        {case_.steps.length === 0 ? (
          <p className="text-gray-500 italic">No steps defined yet</p>
        ) : (
          <div className="space-y-4">
            {case_.steps.map((step, index) => (
              <div
                key={step.id}
                className={`border rounded-lg p-4 ${
                  step.completedAt ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => toggleStepCompletion(step)}
                      className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        step.completedAt
                          ? 'bg-green-500 border-green-500'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {step.completedAt && (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </button>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        Step {index + 1}: {ACTION_TYPE_LABELS[step.actionType]}
                      </h4>
                      {step.completedAt && (
                        <p className="text-xs text-green-600">
                          Completed {new Date(step.completedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {step.notesMarkdown && (
                  <div className="mt-3 prose prose-sm max-w-none markdown">
                    <ReactMarkdown>{step.notesMarkdown}</ReactMarkdown>
                  </div>
                )}

                {step.suggestedMessageMarkdown && (
                  <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="text-xs font-medium text-blue-900 mb-2">💡 AI Suggestion:</p>
                    <div className="prose prose-sm max-w-none markdown text-sm">
                      <ReactMarkdown>{step.suggestedMessageMarkdown}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
