/**
 * Profile-2 类型定义
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

// ============ 问题相关 ============

export interface Question {
  id: string;
  text: string;
  order: number;
  title?: string;       // 简短标题
  description?: string; // 问题描述
  prompt?: string;      // 引导提示
}

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

// ============ 会话相关 ============

export type SessionStatus = 'in_progress' | 'pending_approval' | 'approved' | 'rejected';

export interface Session {
  session_id: string;
  user_id: string;
  question_id: string;
  question_order: number;
  initial_answer?: string;
  current_phase: PhaseType;
  phase_config: QuestionStrategy;
  status: SessionStatus;
  version: number;
  is_active: boolean;
  total_turns: number;
  started_at: string;
  completed_at?: string;
  final_summary?: string;
}

export interface Turn {
  turn_id: number;
  session_id: string;
  turn_number: number;
  phase: PhaseType;
  user_message: string;
  ai_message: string;
  probe_type?: ProbeType | GROWSubPhase;
  ai_reasoning?: string;
  created_at: string;
}

// ============ 价值观相关 ============

export type ValueDomain =
  | '工作'
  | '家庭'
  | '健康'
  | '社交'
  | '个人成长'
  | '财务'
  | '休闲'
  | '精神'
  | '其他';

export type DepthLayer = 1 | 2 | 3; // 1=识别, 2=意义化, 3=行为连接

export interface IdentifiedValue {
  value_id: number;
  user_id: string;
  session_id: string;
  domain: ValueDomain;
  value_name: string;
  depth_layer: DepthLayer;
  evidence_quote?: string;
  evidence_turn_id?: number;
  user_confirmed?: boolean;
  importance_rank?: number;
  created_at: string;
}

// ============ 洞察相关 ============

export type InsightType = 'aha_moment' | 'causal_chain' | 'pattern' | 'realization' | 'turning_point';

export type InsightStatus = 'pending' | 'approved' | 'rejected' | 'modified';

export interface Insight {
  insight_id: number;
  user_id: string;
  session_id: string;
  insight_type: InsightType;
  content: string;
  source_phase?: PhaseType;
  source_turn_id?: number;
  trigger_quote?: string;
  related_value_id?: number;
  related_goal_id?: number;
  status: InsightStatus;
  approved_content?: string;
  created_at: string;
}

// ============ 目标相关 ============

export type GoalType = 'short_term' | 'long_term';
export type GoalStatus = 'active' | 'completed' | 'abandoned';

export interface Goal {
  goal_id: number;
  user_id: string;
  session_id: string;
  goal_description: string;
  goal_type?: GoalType;
  smart_specific?: string;
  smart_measurable?: string;
  smart_achievable?: string;
  smart_relevant?: string;
  smart_time_bound?: string;
  importance_score?: number;
  current_state?: string[];
  obstacles?: string[];
  reality_aha_moment?: string;
  options_generated?: string[];
  option_selected?: string;
  selection_reason?: string;
  action_steps?: ActionStep[];
  first_step?: string;
  commitment_level?: number;
  status: GoalStatus;
  progress_notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface ActionStep {
  step: string;
  deadline?: string;
  completed?: boolean;
}

// ============ API相关 ============

export interface SuccessResponse<T> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

// API请求/响应类型
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
  phase_data?: Record<string, unknown>;
}

export interface ResumeSessionResponse {
  session: Session;
  turns: Turn[];
  phase_order: PhaseType[];
  resumable: boolean;
  resume_hint: string;
}

export interface ExistingDataCheckResponse {
  exists: boolean;
  session?: {
    session_id: string;
    version: number;
    status: SessionStatus;
    completed_at?: string;
    total_turns: number;
  };
}

// ============ UI状态相关 ============

export interface InterviewState {
  sessionId: string | null;
  questionId: string;
  currentPhase: PhaseType;
  phaseOrder: PhaseType[];
  turns: Turn[];
  isLoading: boolean;
  error: string | null;
}

export interface DialogState {
  showResumeDialog: boolean;
  showRedoConfirmDialog: boolean;
  showHistoryDialog: boolean;
}
