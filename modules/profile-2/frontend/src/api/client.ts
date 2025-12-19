/**
 * Profile-2 API 客户端
 */

const API_BASE = 'http://localhost:3102/api';


class ApiClient {
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || '请求失败');
    }

    return data;
  }

  // ============ Session ============

  async startSession(params: {
    userId: string;
    questionId: string;
    questionOrder: number;
    initialAnswer: string;
    forceNew?: boolean;
  }) {
    return this.request<{
      success: boolean;
      action: 'created' | 'existing_found';
      session?: {
        session_id: string;
        question_id: string;
        current_phase: string;
        phase_order: string[];
        status?: string;
        total_turns?: number;
        started_at?: string;
      };
      message?: string;
    }>('/session/start', {
      method: 'POST',
      body: JSON.stringify({
        user_id: params.userId,
        question_id: params.questionId,
        question_order: params.questionOrder,
        initial_answer: params.initialAnswer,
        force_new: params.forceNew,
      }),
    });
  }

  async sendMessage(sessionId: string, message: string) {
    return this.request<{
      success: boolean;
      response: string;
      turn_number: number;
      phase: string;
      phase_transition?: {
        from: string;
        to: string;
        reason?: string;
      };
      is_complete?: boolean;
      requires_approval?: boolean;
      requires_summary?: boolean;  // 需要调用 summary API
      progress: {
        current_phase: string;
        phase_index: number;
        total_phases: number;
        progress_percent: number;
      };
    }>('/session/message', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        message,
      }),
    });
  }

  async getSession(sessionId: string) {
    return this.request<{
      success: boolean;
      session: {
        session_id: string;
        question_id: string;
        current_phase: string;
        status: string;
        total_turns: number;
        turns: Array<{
          turn_number: number;
          phase: string;
          user_message: string;
          ai_message: string;
          created_at: string;
        }>;
        values: Array<{
          value_id: number;
          domain: string;
          value_name: string;
          user_confirmed: boolean | null;
        }>;
        progress: {
          current_phase: string;
          phase_index: number;
          total_phases: number;
          progress_percent: number;
        };
      };
    }>(`/session/${sessionId}`);
  }

  async completeSession(sessionId: string) {
    return this.request<{
      success: boolean;
      message: string;
      summary: string;
    }>(`/session/${sessionId}/complete`, {
      method: 'POST',
    });
  }

  /**
   * 生成会话总结（独立流程）
   */
  async generateSummary(sessionId: string) {
    return this.request<{
      success: boolean;
      summary: string;
      key_insights?: string[];
      values_discovered?: Array<{
        domain: string;
        value: string;
        evidence: string;
      }>;
      action_items?: string[];
      is_enhanced?: boolean;
      status: string;
      requires_approval: boolean;
    }>(`/session/${sessionId}/summary`, {
      method: 'POST',
    });
  }

  /**
   * 确认总结入库
   */
  async approveSummary(sessionId: string) {
    return this.request<{
      success: boolean;
      message: string;
      session_id: string;
      status: string;
    }>(`/session/${sessionId}/approve`, {
      method: 'POST',
    });
  }

  /**
   * 拒绝总结入库
   */
  async rejectSummary(sessionId: string, reason?: string) {
    return this.request<{
      success: boolean;
      message: string;
      session_id: string;
      status: string;
    }>(`/session/${sessionId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async getSessionHistory(sessionId: string) {
    return this.request<{
      success: boolean;
      history: {
        initial_answer: string;
        turns: Array<{
          turn_number: number;
          phase: string;
          user_message: string;
          ai_message: string;
          created_at: string;
        }>;
        transitions: Array<{
          from: string | null;
          to: string;
          turn: number;
          timestamp: string;
        }>;
      };
    }>(`/session/${sessionId}/history`);
  }

  // ============ User ============

  async getUserProgress(userId: string) {
    return this.request<{
      success: boolean;
      progress: {
        completed: number;
        in_progress: number;
        total: number;
        completion_percent: number;
        completed_questions: string[];
      };
      sessions: Array<{
        session_id: string;
        question_id: string;
        question_order: number;
        status: string;
        total_turns: number;
        started_at: string;
        completed_at: string | null;
      }>;
    }>(`/user/${userId}/progress`);
  }

  async getUserValues(userId: string) {
    return this.request<{
      success: boolean;
      total: number;
      confirmed: number;
      by_domain: Record<string, Array<{
        value_id: number;
        value_name: string;
        depth_layer: number;
        user_confirmed: boolean | null;
        importance_rank: number | null;
        session_id: string;
      }>>;
    }>(`/user/${userId}/values`);
  }

  // ============ System ============

  async checkHealth() {
    return this.request<{
      success: boolean;
      status: string;
      services: {
        api: boolean;
        ollama: boolean;
      };
    }>('/system/health');
  }
}

export const api = new ApiClient();
