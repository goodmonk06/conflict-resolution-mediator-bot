import { z } from 'zod';

// Conversation message schema
export const MessageSchema = z.object({
  id: z.string(),
  author: z.string(),
  content: z.string(),
  timestamp: z.string().datetime(),
  metadata: z.record(z.any()).optional(),
});

export type Message = z.infer<typeof MessageSchema>;

// Ingest conversation schema
export const IngestConversationSchema = z.object({
  communityId: z.string().min(1),
  externalThreadId: z.string().min(1),
  sourceType: z.enum(['chat', 'forum']),
  messages: z.array(MessageSchema).min(1),
  metadata: z.record(z.any()).optional(),
});

export type IngestConversationInput = z.infer<typeof IngestConversationSchema>;

// Conflict detection result
export const ConflictDetectionResultSchema = z.object({
  hasConflict: z.boolean(),
  score: z.number().min(0).max(1),
  signalType: z.enum(['potential', 'escalated', 'resolved']),
  summaryMarkdown: z.string(),
  keywords: z.array(z.string()),
  participants: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  detectionMethod: z.enum(['ai', 'rule-based']),
});

export type ConflictDetectionResult = z.infer<typeof ConflictDetectionResultSchema>;

// Create mediation step schema
export const CreateMediationStepSchema = z.object({
  actionType: z.enum(['reach_out', 'schedule_call', 'clarify', 'reframe', 'agreement']),
  notesMarkdown: z.string().optional(),
  suggestedMessageMarkdown: z.string().optional(),
});

export type CreateMediationStepInput = z.infer<typeof CreateMediationStepSchema>;

// Update mediation step schema
export const UpdateMediationStepSchema = z.object({
  notesMarkdown: z.string().optional(),
  suggestedMessageMarkdown: z.string().optional(),
  completedAt: z.string().datetime().nullable().optional(),
});

export type UpdateMediationStepInput = z.infer<typeof UpdateMediationStepSchema>;

// Update case schema
export const UpdateCaseSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'dismissed']).optional(),
  assignedMediatorRef: z.string().nullable().optional(),
  notesMarkdown: z.string().optional(),
});

export type UpdateCaseInput = z.infer<typeof UpdateCaseSchema>;
