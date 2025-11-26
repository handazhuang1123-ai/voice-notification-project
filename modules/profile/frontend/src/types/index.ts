/**
 * 类型定义
 */

// 问题定义
export interface Question {
  id: string;
  text: string;
}

// 用户答案
export interface Answer {
  question_id: string;
  initial_answer: string;
}

// 访谈阶段
export type InterviewPhase = 'opening' | 'narrative' | 'grow' | 'values' | 'summary';

// 阶段定义
export interface PhaseDefinition {
  name: string;
  duration: number;
  next: InterviewPhase | null;
}

// 对话消息
export interface Message {
  role: 'ai' | 'user';
  content: string;
  timestamp: string;
}

// 访谈会话
export interface InterviewSession {
  session_id: string;
  question_id: string;
  question_text: string;
  initial_answer: string;
  conversation_history: Message[];
  phases_completed: InterviewPhase[];
  status: 'pending' | 'in_progress' | 'completed';
}

// 洞察层级
export type InsightLayer = 'fact' | 'interpretation' | 'insight';

// 洞察
export interface Insight {
  id: string;
  layer: InsightLayer;
  content: string;
  evidence: string[];
  confidence: number;
  status?: 'pending' | 'approved' | 'modified' | 'rejected';
}

// 核心价值观
export interface CoreValue {
  id: string;
  value: string;
  description: string;
  evidence: string[];
}

// 目标
export interface Goal {
  id: string;
  goal: string;
  timeframe: string;
  motivation: string;
}

// 行为模式
export interface BehavioralPattern {
  id: string;
  pattern: string;
  frequency: string;
  triggers: string[];
}

// 分析总结
export interface AnalysisSummary {
  session_id: string;
  insights: Insight[];
  core_values: CoreValue[];
  goals: Goal[];
  behavioral_patterns: BehavioralPattern[];
  turning_points: string[];
  personality_traits: string[];
}

// API 响应
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}
