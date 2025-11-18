const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface MediationCase {
  id: string;
  threadId: string;
  status: 'open' | 'in_progress' | 'resolved' | 'dismissed';
  assignedMediatorRef: string | null;
  notesMarkdown: string | null;
  createdAt: string;
  updatedAt: string;
  thread: {
    id: string;
    communityId: string;
    externalThreadId: string;
    sourceType: 'chat' | 'forum';
  };
  steps: MediationStep[];
}

export interface MediationStep {
  id: string;
  caseId: string;
  orderIndex: number;
  actionType: 'reach_out' | 'schedule_call' | 'clarify' | 'reframe' | 'agreement';
  notesMarkdown: string | null;
  suggestedMessageMarkdown: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConflictSignal {
  id: string;
  threadId: string;
  timestamp: string;
  signalType: 'potential' | 'escalated' | 'resolved';
  summaryMarkdown: string;
  score: number;
  metaJson: any;
  createdAt: string;
}

export interface CaseStats {
  totalCases: number;
  byStatus: {
    open: number;
    in_progress: number;
    resolved: number;
    dismissed: number;
  };
}

export interface SignalStats {
  totalSignals: number;
  byType: {
    potential: number;
    escalated: number;
    resolved: number;
  };
  averageScore: number;
}

class APIClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${path}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // Cases
  async getCases(params?: {
    status?: string;
    assignedMediatorRef?: string;
    limit?: number;
    offset?: number;
  }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<{ cases: MediationCase[]; pagination: any }>(
      `/api/cases${query ? `?${query}` : ''}`
    );
  }

  async getCase(id: string) {
    return this.request<MediationCase>(`/api/cases/${id}`);
  }

  async updateCase(id: string, data: {
    status?: string;
    assignedMediatorRef?: string | null;
    notesMarkdown?: string;
  }) {
    return this.request<MediationCase>(`/api/cases/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async addStep(caseId: string, data: {
    actionType: string;
    notesMarkdown?: string;
    suggestedMessageMarkdown?: string;
  }) {
    return this.request<MediationStep>(`/api/cases/${caseId}/steps`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async generateStepSuggestion(caseId: string, actionType: string) {
    return this.request<{ actionType: string; suggestedMessageMarkdown: string }>(
      `/api/cases/${caseId}/steps/generate`,
      {
        method: 'POST',
        body: JSON.stringify({ actionType }),
      }
    );
  }

  async updateStep(caseId: string, stepId: string, data: {
    notesMarkdown?: string;
    suggestedMessageMarkdown?: string;
    completedAt?: string | null;
  }) {
    return this.request<MediationStep>(`/api/cases/${caseId}/steps/${stepId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getCaseStats() {
    return this.request<CaseStats>('/api/cases/stats/summary');
  }

  // Signals
  async getSignals(params?: {
    threadId?: string;
    signalType?: string;
    minScore?: number;
    limit?: number;
    offset?: number;
  }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<{ signals: ConflictSignal[]; pagination: any }>(
      `/api/signals${query ? `?${query}` : ''}`
    );
  }

  async getSignalStats() {
    return this.request<SignalStats>('/api/signals/stats/summary');
  }

  // Health
  async getHealth() {
    return this.request<{ status: string; timestamp: string; database: string }>('/health');
  }
}

export const api = new APIClient(API_URL);
