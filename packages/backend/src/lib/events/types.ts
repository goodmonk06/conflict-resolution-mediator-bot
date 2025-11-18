/**
 * Domain Events
 *
 * Strongly-typed events for the conflict resolution system.
 * These events can be used to trigger side effects, notifications, integrations, etc.
 */

export interface DomainEvent {
  eventType: string;
  timestamp: Date;
  aggregateId: string; // ID of the entity this event relates to
  aggregateType: string; // Type of entity (e.g., 'MediationCase', 'ConflictSignal')
  metadata?: Record<string, any>;
}

export interface ConflictDetectedEvent extends DomainEvent {
  eventType: 'conflict.detected';
  aggregateType: 'ConflictSignal';
  data: {
    threadId: string;
    signalId: string;
    signalType: 'potential' | 'escalated' | 'resolved';
    score: number;
    communityId: string;
    participants: string[];
  };
}

export interface CaseCreatedEvent extends DomainEvent {
  eventType: 'case.created';
  aggregateType: 'MediationCase';
  data: {
    caseId: string;
    threadId: string;
    status: string;
    priority: string;
    autoCreated: boolean;
  };
}

export interface CaseStatusChangedEvent extends DomainEvent {
  eventType: 'case.status_changed';
  aggregateType: 'MediationCase';
  data: {
    caseId: string;
    oldStatus: string;
    newStatus: string;
    changedBy: string;
  };
}

export interface CaseAssignedEvent extends DomainEvent {
  eventType: 'case.assigned';
  aggregateType: 'MediationCase';
  data: {
    caseId: string;
    mediatorId: string;
    assignedBy: string;
  };
}

export interface StepCompletedEvent extends DomainEvent {
  eventType: 'step.completed';
  aggregateType: 'MediationStep';
  data: {
    stepId: string;
    caseId: string;
    actionType: string;
    completedBy: string;
  };
}

export interface ResolutionReachedEvent extends DomainEvent {
  eventType: 'resolution.reached';
  aggregateType: 'Resolution';
  data: {
    resolutionId: string;
    caseId: string;
    outcome: string;
    satisfaction?: number;
  };
}

export type AnyDomainEvent =
  | ConflictDetectedEvent
  | CaseCreatedEvent
  | CaseStatusChangedEvent
  | CaseAssignedEvent
  | StepCompletedEvent
  | ResolutionReachedEvent;

export type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => Promise<void>;
