import {
  IMetricsAdapter,
  InMemoryMetricsAdapter,
  ConsoleMetricsAdapter,
} from './adapters/IMetricsAdapter';

/**
 * Centralized metrics utility
 */

class MetricsManager {
  private adapter: IMetricsAdapter;

  constructor() {
    // Default to in-memory adapter in development, console in production
    this.adapter =
      process.env.NODE_ENV === 'production'
        ? new ConsoleMetricsAdapter()
        : new InMemoryMetricsAdapter();
  }

  /**
   * Set a custom metrics adapter
   */
  setAdapter(adapter: IMetricsAdapter): void {
    this.adapter = adapter;
  }

  /**
   * Get current adapter
   */
  getAdapter(): IMetricsAdapter {
    return this.adapter;
  }

  // Detection metrics
  recordDetection(method: 'ai' | 'rule-based', latencyMs: number): void {
    this.adapter.incrementCounter('conflict_detections_total', { method });
    this.adapter.recordHistogram('conflict_detection_latency_ms', latencyMs, { method });
  }

  recordDetectionScore(score: number, method: 'ai' | 'rule-based'): void {
    this.adapter.recordHistogram('conflict_detection_score', score, { method });
  }

  // Case metrics
  recordCaseCreated(autoCreated: boolean, priority: string): void {
    this.adapter.incrementCounter('mediation_cases_created_total', {
      auto_created: autoCreated.toString(),
      priority,
    });
  }

  recordCaseStatusChange(oldStatus: string, newStatus: string): void {
    this.adapter.incrementCounter('mediation_case_status_changes_total', {
      old_status: oldStatus,
      new_status: newStatus,
    });
  }

  recordCaseResolutionTime(durationMs: number, outcome: string): void {
    this.adapter.recordHistogram('mediation_case_resolution_time_ms', durationMs, { outcome });
  }

  setActiveCasesGauge(count: number, status: string): void {
    this.adapter.setGauge('mediation_active_cases', count, { status });
  }

  // API metrics
  recordAPIRequest(endpoint: string, method: string, statusCode: number, latencyMs: number): void {
    this.adapter.incrementCounter('api_requests_total', {
      endpoint,
      method,
      status_code: statusCode.toString(),
    });
    this.adapter.recordHistogram('api_request_latency_ms', latencyMs, { endpoint, method });
  }

  // Mediator metrics
  recordMediatorAssignment(mediatorId: string, caseCount: number): void {
    this.adapter.incrementCounter('mediator_assignments_total', { mediator_id: mediatorId });
    this.adapter.setGauge('mediator_active_cases', caseCount, { mediator_id: mediatorId });
  }

  // General metrics
  incrementCounter(name: string, labels?: Record<string, string | number>, value?: number): void {
    this.adapter.incrementCounter(name, labels, value);
  }

  setGauge(name: string, value: number, labels?: Record<string, string | number>): void {
    this.adapter.setGauge(name, value, labels);
  }

  recordHistogram(name: string, value: number, labels?: Record<string, string | number>): void {
    this.adapter.recordHistogram(name, value, labels);
  }

  async getMetrics(): Promise<Record<string, any>> {
    return this.adapter.getMetrics();
  }
}

export const metrics = new MetricsManager();
