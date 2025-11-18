'use client';

import { useEffect, useState } from 'react';
import { api, ConflictSignal } from '@/lib/api';
import ReactMarkdown from 'react-markdown';

const SIGNAL_TYPE_COLORS = {
  potential: 'bg-yellow-100 text-yellow-800',
  escalated: 'bg-red-100 text-red-800',
  resolved: 'bg-green-100 text-green-800',
};

const SIGNAL_TYPE_LABELS = {
  potential: 'Potential',
  escalated: 'Escalated',
  resolved: 'Resolved',
};

export default function SignalsPage() {
  const [signals, setSignals] = useState<ConflictSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadSignals();
  }, [filter]);

  async function loadSignals() {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { signalType: filter } : {};
      const response = await api.getSignals(params);
      setSignals(response.signals);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load signals');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading signals...</div>
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
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Conflict Signals</h2>
        <p className="mt-1 text-sm text-gray-500">
          Detected conflict patterns in conversations
        </p>
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
            onClick={() => setFilter('potential')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'potential'
                ? 'bg-primary-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Potential
          </button>
          <button
            onClick={() => setFilter('escalated')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'escalated'
                ? 'bg-primary-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Escalated
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
        </div>
      </div>

      {/* Signals List */}
      {signals.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No signals found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {signals.map((signal) => {
            const isExpanded = expandedId === signal.id;
            const meta = signal.metaJson as any;

            return (
              <div key={signal.id} className="bg-white rounded-lg shadow">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : signal.id)}
                  className="w-full p-6 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            SIGNAL_TYPE_COLORS[signal.signalType]
                          }`}
                        >
                          {SIGNAL_TYPE_LABELS[signal.signalType]}
                        </span>
                        <span className="text-sm text-gray-500">
                          Score: {Math.round(signal.score * 100)}%
                        </span>
                        {meta?.detectionMethod && (
                          <span className="text-xs text-gray-400">
                            {meta.detectionMethod === 'ai' ? '🤖 AI' : '📋 Rule-based'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Thread: {(signal as any).thread?.externalThreadId || signal.threadId}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>{new Date(signal.timestamp).toLocaleString()}</span>
                        {meta?.participants && (
                          <>
                            <span>•</span>
                            <span>{meta.participants.length} participants</span>
                          </>
                        )}
                        {meta?.messageCount && (
                          <>
                            <span>•</span>
                            <span>{meta.messageCount} messages</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-gray-400">
                      <svg
                        className={`w-5 h-5 transition-transform ${
                          isExpanded ? 'rotate-90' : ''
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-6 pb-6 border-t border-gray-200 pt-4">
                    <div className="prose prose-sm max-w-none markdown">
                      <ReactMarkdown>{signal.summaryMarkdown}</ReactMarkdown>
                    </div>

                    {meta?.keywords && meta.keywords.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Keywords:</p>
                        <div className="flex flex-wrap gap-2">
                          {meta.keywords.map((keyword: string, idx: number) => (
                            <span
                              key={idx}
                              className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {meta?.confidence && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-600">
                          Detection confidence: {Math.round(meta.confidence * 100)}%
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
