/**
 * Metrics Adapter Interface
 *
 * Implement this interface to export metrics to different systems
 * (Prometheus, DataDog, CloudWatch, custom backends, etc.)
 */

export interface MetricLabels {
  [key: string]: string | number;
}

export interface IMetricsAdapter {
  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, labels?: MetricLabels, value?: number): void;

  /**
   * Record a gauge value (point-in-time measurement)
   */
  setGauge(name: string, value: number, labels?: MetricLabels): void;

  /**
   * Record a histogram value (for latencies, sizes, etc.)
   */
  recordHistogram(name: string, value: number, labels?: MetricLabels): void;

  /**
   * Get current metric values (for health checks or debugging)
   */
  getMetrics(): Promise<Record<string, any>>;

  /**
   * Get the adapter name/type
   */
  getName(): string;
}

/**
 * In-memory metrics implementation (default for development)
 */
export class InMemoryMetricsAdapter implements IMetricsAdapter {
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();

  incrementCounter(name: string, labels?: MetricLabels, value: number = 1): void {
    const key = this.makeKey(name, labels);
    this.counters.set(key, (this.counters.get(key) || 0) + value);
  }

  setGauge(name: string, value: number, labels?: MetricLabels): void {
    const key = this.makeKey(name, labels);
    this.gauges.set(key, value);
  }

  recordHistogram(name: string, value: number, labels?: MetricLabels): void {
    const key = this.makeKey(name, labels);
    const values = this.histograms.get(key) || [];
    values.push(value);
    this.histograms.set(key, values);
  }

  async getMetrics(): Promise<Record<string, any>> {
    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: Object.fromEntries(
        Array.from(this.histograms.entries()).map(([key, values]) => [
          key,
          {
            count: values.length,
            sum: values.reduce((a, b) => a + b, 0),
            avg: values.reduce((a, b) => a + b, 0) / values.length,
            min: Math.min(...values),
            max: Math.max(...values),
          },
        ])
      ),
    };
  }

  getName(): string {
    return 'in-memory';
  }

  private makeKey(name: string, labels?: MetricLabels): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return `${name}{${labelStr}}`;
  }
}

/**
 * Console logger metrics (for debugging)
 */
export class ConsoleMetricsAdapter implements IMetricsAdapter {
  incrementCounter(name: string, labels?: MetricLabels, value: number = 1): void {
    console.log('[Metric:Counter]', { name, labels, value });
  }

  setGauge(name: string, value: number, labels?: MetricLabels): void {
    console.log('[Metric:Gauge]', { name, value, labels });
  }

  recordHistogram(name: string, value: number, labels?: MetricLabels): void {
    console.log('[Metric:Histogram]', { name, value, labels });
  }

  async getMetrics(): Promise<Record<string, any>> {
    return {};
  }

  getName(): string {
    return 'console';
  }
}
