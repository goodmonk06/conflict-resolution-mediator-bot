/**
 * Notification Adapter Interface
 *
 * Implement this interface to send notifications via different channels
 * (email, Slack, Discord, webhooks, etc.)
 */

export interface NotificationPayload {
  title: string;
  message: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  recipient: string; // Email, user ID, channel ID, etc.
  metadata?: Record<string, any>;
  actionUrl?: string;
}

export interface INotificationAdapter {
  /**
   * Send a notification via this adapter
   */
  send(payload: NotificationPayload): Promise<void>;

  /**
   * Check if the adapter is healthy and configured
   */
  isHealthy(): Promise<boolean>;

  /**
   * Get the adapter name/type
   */
  getName(): string;
}

/**
 * No-op implementation for testing or when notifications are disabled
 */
export class NoOpNotificationAdapter implements INotificationAdapter {
  async send(payload: NotificationPayload): Promise<void> {
    // No-op
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }

  getName(): string {
    return 'no-op';
  }
}

/**
 * Console logger implementation for development
 */
export class ConsoleNotificationAdapter implements INotificationAdapter {
  async send(payload: NotificationPayload): Promise<void> {
    console.log('[Notification]', {
      adapter: this.getName(),
      ...payload,
    });
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }

  getName(): string {
    return 'console';
  }
}
