/**
 * Profile-2 常量配置
 */

import type { Question, QuestionStrategy, PhaseType } from './types';

// ============ 问题列表（新顺序） ============

export const QUESTIONS: Question[] = [
  {
    id: 'life_chapters',
    text: '如果把你的人生比作一本书，它会有哪些章节？每个章节的主题是什么？哪一章对你影响最大？',
    order: 1,
    title: '人生篇章',
    description: '将人生比作一本书，回顾重要的阶段和转折点',
    prompt: '如果把你的人生比作一本书，它会有哪些章节？每个章节的主题是什么？哪一章对你影响最大？'
  },
  {
    id: 'education_career',
    text: '描述你的教育和职业历程。有哪些关键的转折点？什么驱动了你的选择？',
    order: 2,
    title: '教育与职业',
    description: '探索教育和职业道路上的关键决策',
    prompt: '描述你的教育和职业历程。有哪些关键的转折点？什么驱动了你的选择？'
  },
  {
    id: 'relationships',
    text: '谁对你的人生影响最大？这些关系如何塑造了现在的你？',
    order: 3,
    title: '重要关系',
    description: '回顾对你影响深远的人际关系',
    prompt: '谁对你的人生影响最大？这些关系如何塑造了现在的你？'
  },
  {
    id: 'challenges_growth',
    text: '你经历过的最大挑战是什么？它如何改变了你？你从中学到了什么？',
    order: 4,
    title: '挑战与成长',
    description: '探索困难经历中的成长和收获',
    prompt: '你经历过的最大挑战是什么？它如何改变了你？你从中学到了什么？'
  },
  {
    id: 'achievements_pride',
    text: '你最自豪的成就是什么？为什么这对你意义重大？',
    order: 5,
    title: '成就与骄傲',
    description: '分享让你感到自豪的人生成就',
    prompt: '你最自豪的成就是什么？为什么这对你意义重大？'
  },
  {
    id: 'future_aspirations',
    text: '展望未来，你希望成为什么样的人？你的长期目标是什么？什么会让你觉得人生圆满？',
    order: 6,
    title: '未来愿景',
    description: '展望未来，设定人生目标和愿景',
    prompt: '展望未来，你希望成为什么样的人？你的长期目标是什么？什么会让你觉得人生圆满？'
  },
  {
    id: 'values_beliefs',
    text: '回顾我们之前的对话，你最看重的价值观是什么？它们是如何在生活中体现的？',
    order: 7,  // 移至第7位，作为价值观验证
    title: '价值观与信念',
    description: '确认和验证你的核心价值观',
    prompt: '回顾我们之前的对话，你最看重的价值观是什么？它们是如何在生活中体现的？'
  },
  {
    id: 'life_philosophy',
    text: '如果要用一句话总结你的人生哲学或座右铭，会是什么？为什么选择这句话？',
    order: 8,
    title: '人生哲学',
    description: '总结你的人生信条和座右铭',
    prompt: '如果要用一句话总结你的人生哲学或座右铭，会是什么？为什么选择这句话？'
  }
];

// ============ 问题级策略配置 ============

export const QUESTION_CONFIG: Record<string, QuestionStrategy> = {
  'life_chapters': {
    hasOpening: true,           // 仅此问题有Opening
    hasValuesNarrative: true,
    hasDeepExploration: true,
    hasGROW: false,
    hasSummary: true,
    minTurns: 12,
    maxTurns: 25
  },
  'education_career': {
    hasOpening: false,
    hasValuesNarrative: true,
    hasDeepExploration: true,
    hasGROW: true,              // 需要GROW
    hasSummary: true,
    minTurns: 15,
    maxTurns: 35
  },
  'relationships': {
    hasOpening: false,
    hasValuesNarrative: true,
    hasDeepExploration: true,
    hasGROW: false,
    hasSummary: true,
    minTurns: 10,
    maxTurns: 25
  },
  'challenges_growth': {
    hasOpening: false,
    hasValuesNarrative: true,
    hasDeepExploration: true,
    hasGROW: false,
    hasSummary: true,
    minTurns: 10,
    maxTurns: 25
  },
  'achievements_pride': {
    hasOpening: false,
    hasValuesNarrative: true,
    hasDeepExploration: true,
    hasGROW: false,
    hasSummary: true,
    minTurns: 10,
    maxTurns: 25
  },
  'future_aspirations': {
    hasOpening: false,
    hasValuesNarrative: true,
    hasDeepExploration: false,  // 重点是GROW，不深挖过去
    hasGROW: true,              // 需要GROW
    hasSummary: true,
    minTurns: 12,
    maxTurns: 28
  },
  'values_beliefs': {
    hasOpening: false,
    hasValuesNarrative: false,  // 使用特殊的验证模式
    hasDeepExploration: false,
    hasGROW: false,
    hasSummary: true,
    specialMode: 'values_validation',  // 特殊模式：价值观验证
    minTurns: 5,
    maxTurns: 10
  },
  'life_philosophy': {
    hasOpening: false,
    hasValuesNarrative: true,
    hasDeepExploration: false,  // 哲学总结，不需要深挖
    hasGROW: false,
    hasSummary: true,
    summaryEnhanced: true,      // 强化Summary
    minTurns: 8,
    maxTurns: 16
  }
};

// ============ 阶段显示名称 ============

export const PHASE_NAMES: Record<PhaseType, string> = {
  'opening': '开场',
  'values_narrative': '价值叙事',
  'deep_exploration': '深度探索',
  'grow': 'GROW目标',
  'values_validation': '价值验证',
  'summary': '总结'
};

// 别名，兼容多种命名
export const PHASE_LABELS = PHASE_NAMES;

/**
 * 获取阶段标签
 */
export function getPhaseLabel(phase: string): string {
  return PHASE_NAMES[phase as PhaseType] || phase;
}

// ============ 阶段描述 ============

export const PHASE_DESCRIPTIONS: Record<PhaseType, string> = {
  'opening': '建立信任，了解基本信息',
  'values_narrative': '探索经历，识别价值观',
  'deep_exploration': '深入挖掘，寻找洞察',
  'grow': '设定目标，规划行动',
  'values_validation': '确认核心价值观',
  'summary': '总结回顾，情感闭环'
};

// ============ 辅助函数 ============

/**
 * 根据问题ID获取阶段顺序
 */
export function getPhaseOrder(questionId: string): PhaseType[] {
  const config = QUESTION_CONFIG[questionId];
  if (!config) {
    console.warn(`Unknown question ID: ${questionId}`);
    return ['values_narrative', 'summary'];
  }

  const order: PhaseType[] = [];

  if (config.hasOpening) order.push('opening');
  if (config.hasValuesNarrative) order.push('values_narrative');
  if (config.specialMode === 'values_validation') order.push('values_validation');
  if (config.hasDeepExploration) order.push('deep_exploration');
  if (config.hasGROW) order.push('grow');
  order.push('summary');

  return order;
}

/**
 * 获取问题的策略配置
 */
export function getQuestionConfig(questionId: string): QuestionStrategy | null {
  return QUESTION_CONFIG[questionId] || null;
}

/**
 * 根据问题顺序获取问题
 */
export function getQuestionByOrder(order: number): Question | null {
  return QUESTIONS.find(q => q.order === order) || null;
}

/**
 * 根据问题ID获取问题
 */
export function getQuestionById(id: string): Question | null {
  return QUESTIONS.find(q => q.id === id) || null;
}

/**
 * 获取下一个阶段
 */
export function getNextPhase(questionId: string, currentPhase: PhaseType): PhaseType | null {
  const order = getPhaseOrder(questionId);
  const currentIndex = order.indexOf(currentPhase);

  if (currentIndex === -1 || currentIndex === order.length - 1) {
    return null;
  }

  return order[currentIndex + 1];
}

/**
 * 检查阶段是否为最后一个阶段
 */
export function isLastPhase(questionId: string, phase: PhaseType): boolean {
  const order = getPhaseOrder(questionId);
  return order[order.length - 1] === phase;
}

/**
 * 获取阶段在问题中的索引（用于进度显示）
 */
export function getPhaseIndex(questionId: string, phase: PhaseType): number {
  const order = getPhaseOrder(questionId);
  return order.indexOf(phase);
}

// ============ 错误码映射 ============

export const ERROR_MESSAGES: Record<string, string> = {
  'INVALID_SESSION': '会话不存在，请重新开始',
  'INVALID_PHASE': '系统错误，请刷新页面',
  'SESSION_COMPLETED': '该问题已完成，无法继续',
  'OLLAMA_TIMEOUT': 'AI响应超时，请重试',
  'OLLAMA_UNAVAILABLE': 'AI服务暂时不可用，请稍后重试',
  'OLLAMA_PARSE_ERROR': 'AI响应异常，请重试',
  'DB_ERROR': '数据保存失败，请重试',
  'CONTEXT_OVERFLOW': '对话过长，正在压缩...',
  'RAG_SYNC_FAILED': '数据同步失败，将稍后重试',
  'INTERNAL_ERROR': '服务器内部错误，请稍后重试'
};

// ============ API端点 ============

export const API_ENDPOINTS = {
  // 会话相关
  createSession: '/api/rag/profile-v2/sessions',
  getSession: (sessionId: string) => `/api/rag/profile-v2/sessions/${sessionId}`,
  resumeSession: (sessionId: string) => `/api/rag/profile-v2/sessions/${sessionId}/resume`,
  checkExisting: (userId: string, questionId: string) =>
    `/api/rag/profile-v2/sessions/check/${userId}/${questionId}`,
  getHistory: (userId: string, questionId: string) =>
    `/api/rag/profile-v2/sessions/${userId}/${questionId}/history`,

  // 对话相关
  generateFollowup: '/api/rag/profile-v2/generate-followup',
  evaluatePhase: '/api/rag/profile-v2/evaluate-phase',
  summarizeHistory: '/api/rag/profile-v2/summarize-history',

  // 模型相关
  switchModel: '/api/rag/profile-v2/switch-model',
  availableModels: '/api/rag/profile-v2/available-models',

  // 审批相关
  approve: (sessionId: string) => `/api/rag/profile-v2/sessions/${sessionId}/approve`,
  reject: (sessionId: string) => `/api/rag/profile-v2/sessions/${sessionId}/reject`
};

// ============ 本地存储键 ============

export const STORAGE_KEYS = {
  pendingSession: (questionId: string) => `profile_v2_pending_${questionId}`,
  userId: 'profile_v2_user_id',
  preferences: 'profile_v2_preferences'
};
