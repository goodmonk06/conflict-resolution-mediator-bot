'use client';

import { useEffect, useState } from 'react';
import { api, CaseStats, SignalStats } from '@/lib/api';

export default function Dashboard() {
  const [caseStats, setCaseStats] = useState<CaseStats | null>(null);
  const [signalStats, setSignalStats] = useState<SignalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const [cases, signals] = await Promise.all([
          api.getCaseStats(),
          api.getSignalStats(),
        ]);
        setCaseStats(cases);
        setSignalStats(signals);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Error: {error}</p>
        <p className="text-sm text-red-600 mt-2">
          Make sure the backend API is running at {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="mt-1 text-sm text-gray-500">
          Overview of conflict signals and mediation cases
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Cases */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total Cases</p>
              <p className="text-3xl font-bold text-gray-900">{caseStats?.totalCases || 0}</p>
            </div>
          </div>
        </div>

        {/* Open Cases */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Open Cases</p>
              <p className="text-3xl font-bold text-orange-600">
                {caseStats?.byStatus.open || 0}
              </p>
            </div>
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-3xl font-bold text-blue-600">
                {caseStats?.byStatus.in_progress || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Resolved */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Resolved</p>
              <p className="text-3xl font-bold text-green-600">
                {caseStats?.byStatus.resolved || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Signals Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Conflict Signals</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Signals</span>
              <span className="font-semibold">{signalStats?.totalSignals || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Potential</span>
              <span className="font-semibold text-yellow-600">
                {signalStats?.byType.potential || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Escalated</span>
              <span className="font-semibold text-red-600">
                {signalStats?.byType.escalated || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Resolved</span>
              <span className="font-semibold text-green-600">
                {signalStats?.byType.resolved || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Detection Quality</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Average Conflict Score</span>
              <span className="font-semibold">
                {signalStats ? (signalStats.averageScore * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-500 h-2 rounded-full"
                  style={{ width: `${(signalStats?.averageScore || 0) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Start</h3>
        <div className="space-y-2 text-sm text-gray-700">
          <p>
            • <a href="/cases" className="text-blue-600 hover:underline">View all mediation cases</a> to manage ongoing conflicts
          </p>
          <p>
            • <a href="/signals" className="text-blue-600 hover:underline">Browse conflict signals</a> to identify new issues
          </p>
          <p>
            • Use the API at <code className="bg-white px-1 py-0.5 rounded">/api/detection/ingest</code> to submit conversations for analysis
          </p>
        </div>
      </div>
    </div>
  );
}
