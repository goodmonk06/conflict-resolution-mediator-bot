import type { DomainEvent, EventHandler } from './types';
import { logger } from '../logger';

/**
 * Simple in-memory event bus
 *
 * This can be easily swapped for Redis Pub/Sub, Kafka, RabbitMQ, etc.
 */
export class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();

  /**
   * Register an event handler for a specific event type
   */
  on<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): void {
    const existing = this.handlers.get(eventType) || [];
    existing.push(handler as EventHandler);
    this.handlers.set(eventType, existing);
    logger.info({ eventType, handlerCount: existing.length }, 'Event handler registered');
  }

  /**
   * Remove an event handler
   */
  off(eventType: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventType) || [];
    const filtered = existing.filter((h) => h !== handler);
    this.handlers.set(eventType, filtered);
  }

  /**
   * Emit an event to all registered handlers
   */
  async emit(event: DomainEvent): Promise<void> {
    const eventType = event.eventType;
    const handlers = this.handlers.get(eventType) || [];

    logger.info(
      {
        eventType,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        handlerCount: handlers.length,
      },
      'Emitting event'
    );

    // Execute all handlers concurrently
    const results = await Promise.allSettled(handlers.map((handler) => handler(event)));

    // Log any handler failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        logger.error(
          {
            eventType,
            aggregateId: event.aggregateId,
            error: result.reason,
            handlerIndex: index,
          },
          'Event handler failed'
        );
      }
    });
  }

  /**
   * Get the count of handlers for a specific event type
   */
  getHandlerCount(eventType: string): number {
    return (this.handlers.get(eventType) || []).length;
  }

  /**
   * Get all registered event types
   */
  getRegisteredEventTypes(): string[] {
    return Array.from(this.handlers.keys());
  }
}

// Singleton instance
export const eventBus = new EventBus();
