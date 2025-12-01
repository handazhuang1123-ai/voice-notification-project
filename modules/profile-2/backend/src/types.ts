/**
 * Profile-2 后端类型定义
 */

// ============ 阶段相关 ============

export type PhaseType =
  | 'opening'
  | 'values_narrative'
  | 'deep_exploration'
  | 'grow'
  | 'values_validation'
  | 'summary';

export type GROWSubPhase = 'goal' | 'reality' | 'options' | 'way_forward';

export type ProbeType = 'descriptive' | 'idiographic' | 'clarifying' | 'explanatory';

// ============ 问题策略 ============

export interface QuestionStrategy {
  hasOpening: boolean;
  hasValuesNarrative: boolean;
  hasDeepExploration: boolean;
  hasGROW: boolean;
  hasSummary: boolean;
  specialMode?: 'values_validation';
  summaryEnhanced?: boolean;
  minTurns?: number;
  maxTurns?: number;
}

// ============ 数据库模型 ============

export interface User {
  user_id: string;
  nickname?: string;
  created_at: string;
  last_active_at?: string;
}

export interface Session {
  session_id: string;
  user_id: string;
  question_id: string;
  question_order: number;
  initial_answer?: string;
  current_phase: PhaseType;
  phase_config: string; // JSON
  status: SessionStatus;
  version: number;
  is_active: boolean;
  archived_at?: string;
  archived_reason?: string;
  previous_session_id?: string;
  total_turns: number;
  started_at: string;
  completed_at?: string;
  final_summary?: string;
}

export type SessionStatus = 'in_progress' | 'completed' | 'pending_approval' | 'approved' | 'rejected';

export interface Turn {
  turn_id: number;
  session_id: string;
  turn_number: number;
  phase: PhaseType;
  user_message: string;
  ai_message: string;
  probe_type?: string;
  ai_reasoning?: string;
  created_at: string;
}

export interface Value {
  value_id: number;
  user_id: string;
  session_id: string;
  domain: string;
  value_name: string;
  depth_layer: number;
  evidence_quote?: string;
  evidence_turn_id?: number;
  user_confirmed?: boolean;
  importance_rank?: number;
  rag_synced: boolean;
  rag_embedding_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface Insight {
  insight_id: number;
  user_id: string;
  session_id: string;
  insight_type: string;
  content: string;
  source_phase?: string;
  source_turn_id?: number;
  trigger_quote?: string;
  related_value_id?: number;
  related_goal_id?: number;
  status: string;
  approved_content?: string;
  rag_synced: boolean;
  rag_embedding_id?: string;
  created_at: string;
}

export interface Goal {
  goal_id: number;
  user_id: string;
  session_id: string;
  goal_description: string;
  goal_type?: string;
  smart_specific?: string;
  smart_measurable?: string;
  smart_achievable?: string;
  smart_relevant?: string;
  smart_time_bound?: string;
  importance_score?: number;
  current_state?: string; // JSON
  obstacles?: string; // JSON
  reality_aha_moment?: string;
  options_generated?: string; // JSON
  option_selected?: string;
  selection_reason?: string;
  action_steps?: string; // JSON
  first_step?: string;
  commitment_level?: number;
  status: string;
  progress_notes?: string;
  rag_synced: boolean;
  rag_embedding_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface RagSyncQueueItem {
  queue_id: number;
  source_table: string;
  source_id: number;
  content_text: string;
  content_type: string;
  user_id: string;
  metadata: string; // JSON
  status: string;
  retry_count: number;
  error_message?: string;
  embedding_id?: string;
  created_at: string;
  processed_at?: string;
}

export interface PhaseTransition {
  id: number;
  session_id: string;
  from_phase?: string;
  to_phase: string;
  transition_reasons?: string; // JSON
  evaluation_data?: string; // JSON
  turn_number: number;
  timestamp: string;
}

// ============ API请求/响应 ============

export interface CreateSessionRequest {
  user_id: string;
  question_id: string;
  initial_answer?: string;
  force_new?: boolean; // 强制创建新会话（归档旧数据）
}

export interface GenerateFollowupRequest {
  session_id: string;
  question_id: string;
  current_phase: PhaseType;
  user_answer: string;
  conversation_history: Turn[];
}

export interface GenerateFollowupResponse {
  followup_question: string;
  probe_type: ProbeType | GROWSubPhase;
  reasoning: string;
  value_hint?: string;
}

export interface EvaluatePhaseRequest {
  session_id: string;
  question_id: string;
  current_phase: PhaseType;
}

export interface EvaluatePhaseResponse {
  should_transition: boolean;
  next_phase?: PhaseType;
  reasons: string[];
  phase_data?: PhaseData;
}

export interface PhaseData {
  identified_values?: IdentifiedValueData[];
  key_events?: KeyEventData[];
  insights?: string[];
  grow_data?: GROWData;
}

export interface IdentifiedValueData {
  domain: string;
  value: string;
  layer: number;
  evidence?: string;
}

export interface KeyEventData {
  event: string;
  time?: string;
  emotions?: string[];
  impact?: string;
}

export interface GROWData {
  goal?: {
    description: string;
    importance: number;
  };
  reality?: {
    current_state: string[];
    obstacles: string[];
    aha_moment?: string;
  };
  options?: {
    generated: string[];
    selected?: string;
    reason?: string;
  };
  way_forward?: {
    actions: Array<{ step: string; deadline?: string }>;
    first_step: string;
    commitment: number;
  };
}

// ============ Ollama相关 ============

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: OllamaOptions;
}

export interface OllamaOptions {
  temperature?: number;
  top_p?: number;
  num_ctx?: number;
  repeat_penalty?: number;
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

// ============ 上下文管理 ============

export interface ManagedContext {
  history: Message[];
  compressed: boolean;
  summary?: ContextSummary;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ContextSummary {
  key_events: string[];
  identified_values: IdentifiedValueData[];
  emotional_themes: string[];
  insights: string[];
}

// ============ 配置 ============

export interface Config {
  name: string;
  displayName: string;
  description: string;
  version: string;
  ports: {
    frontend: number;
    backend: number;
  };
  ollama: {
    baseUrl: string;
    defaultModel: string;
    availableModels: string[];
    options: OllamaOptions;
    timeout: number;
  };
  database: {
    path: string;
  };
  features: {
    dataProtection: boolean;
    sessionResume: boolean;
    ragSync: boolean;
  };
}

// ============ 服务层类型 ============

export interface ConversationContext {
  session: Session;
  turns: Turn[];
  values: Value[];
  insights: Insight[];
  goals: Goal[];
  stats: {
    turnCount: number;
    valueCount: number;
    insightCount: number;
    goalCount: number;
  };
  strategy: QuestionStrategy | null;
  phaseOrder: PhaseType[];
  currentPhaseIndex: number;
}

export interface PhaseEvaluationResult {
  shouldTransition: boolean;
  nextPhase?: PhaseType;
  confidence: number;
  reasoning?: string;
  signals?: string[];
}

export interface GenerateResponse {
  response: string;
  phase: PhaseType;
  turnNumber: number;
  phaseTransition?: {
    from: PhaseType;
    to: PhaseType;
    reason?: string;
  };
  metadata?: {
    probeType?: string;
    detectedValues?: string[];
  };
}

// ============ 错误 ============

export class AppError extends Error {
  constructor(
    public code: string,
    public userMessage: string,
    public httpStatus: number = 500,
    public details?: unknown
  ) {
    super(userMessage);
    this.name = 'AppError';
  }
}

export const ErrorCodes = {
  // 验证错误
  VALIDATION_ERROR: { code: 'VALIDATION_ERROR', status: 400, message: '请求参数错误' },

  // 会话错误
  INVALID_SESSION: { code: 'INVALID_SESSION', status: 400, message: '会话不存在，请重新开始' },
  SESSION_NOT_FOUND: { code: 'SESSION_NOT_FOUND', status: 404, message: '会话不存在' },
  SESSION_COMPLETED: { code: 'SESSION_COMPLETED', status: 400, message: '该问题已完成，无法继续' },

  // 阶段错误
  INVALID_PHASE: { code: 'INVALID_PHASE', status: 400, message: '系统错误，请刷新页面' },

  // Ollama错误
  OLLAMA_TIMEOUT: { code: 'OLLAMA_TIMEOUT', status: 504, message: 'AI响应超时，请重试' },
  OLLAMA_UNAVAILABLE: { code: 'OLLAMA_UNAVAILABLE', status: 503, message: 'AI服务暂时不可用，请稍后重试' },
  OLLAMA_PARSE_ERROR: { code: 'OLLAMA_PARSE_ERROR', status: 500, message: 'AI响应异常，请重试' },

  // 系统错误
  DB_ERROR: { code: 'DB_ERROR', status: 500, message: '数据保存失败，请重试' },
  CONTEXT_OVERFLOW: { code: 'CONTEXT_OVERFLOW', status: 500, message: '对话过长，正在压缩...' },
  RAG_SYNC_FAILED: { code: 'RAG_SYNC_FAILED', status: 500, message: '数据同步失败，将稍后重试' },
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', status: 500, message: '服务器内部错误，请稍后重试' }
} as const;
