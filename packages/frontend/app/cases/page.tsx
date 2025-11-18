'use client';

import { useEffect, useState } from 'react';
import { api, MediationCase } from '@/lib/api';

const STATUS_COLORS = {
  open: 'bg-orange-100 text-orange-800',
  in_progress: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  dismissed: 'bg-gray-100 text-gray-800',
};

const STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
};

export default function CasesPage() {
  const [cases, setCases] = useState<MediationCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadCases();
  }, [filter]);

  async function loadCases() {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await api.getCases(params);
      setCases(response.cases);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cases');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading cases...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Error: {error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Mediation Cases</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage and track conflict resolution cases
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'all'
                ? 'bg-primary-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('open')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'open'
                ? 'bg-primary-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Open
          </button>
          <button
            onClick={() => setFilter('in_progress')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'in_progress'
                ? 'bg-primary-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'resolved'
                ? 'bg-primary-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Resolved
          </button>
          <button
            onClick={() => setFilter('dismissed')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'dismissed'
                ? 'bg-primary-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Dismissed
          </button>
        </div>
      </div>

      {/* Cases List */}
      {cases.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No cases found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cases.map((case_) => (
            <a
              key={case_.id}
              href={`/cases/${case_.id}`}
              className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        STATUS_COLORS[case_.status]
                      }`}
                    >
                      {STATUS_LABELS[case_.status]}
                    </span>
                    <span className="text-sm text-gray-500">
                      {case_.thread.communityId} • {case_.thread.sourceType}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    Thread: {case_.thread.externalThreadId}
                  </h3>
                  {case_.assignedMediatorRef && (
                    <p className="text-sm text-gray-600">
                      Assigned to: <span className="font-medium">{case_.assignedMediatorRef}</span>
                    </p>
                  )}
                  <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500">
                    <span>{case_.steps.length} steps</span>
                    <span>•</span>
                    <span>
                      {case_.steps.filter(s => s.completedAt).length} completed
                    </span>
                    <span>•</span>
                    <span>Created {new Date(case_.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="text-gray-400">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
