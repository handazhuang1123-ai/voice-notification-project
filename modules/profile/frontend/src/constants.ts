/**
 * 常量定义
 */

import type { Question, PhaseDefinition, InterviewPhase } from './types';

// API 基础 URL
export const API_BASE_URL = '/api/rag/profile';

// 8个核心问题
export const QUESTIONS: Question[] = [
  {
    id: 'life_chapters',
    text: '如果把你的人生比作一本书，它会有哪些章节？每个章节的主题是什么？哪一章对你影响最大？'
  },
  {
    id: 'education_career',
    text: '描述你的教育和职业历程。有哪些关键的转折点？什么驱动了你的选择？'
  },
  {
    id: 'values_beliefs',
    text: '你最看重的三个价值观是什么？它们是如何形成的？在生活中如何体现？'
  },
  {
    id: 'relationships',
    text: '谁对你的人生影响最大？这些关系如何塑造了现在的你？'
  },
  {
    id: 'challenges_growth',
    text: '你经历过的最大挑战是什么？它如何改变了你？你从中学到了什么？'
  },
  {
    id: 'achievements_pride',
    text: '你最自豪的成就是什么？为什么这对你意义重大？'
  },
  {
    id: 'future_aspirations',
    text: '展望未来，你希望成为什么样的人？你的长期目标是什么？什么会让你觉得人生圆满？'
  },
  {
    id: 'life_philosophy',
    text: '如果要用一句话总结你的人生哲学或座右铭，会是什么？为什么选择这句话？'
  }
];

// 访谈阶段定义
export const PHASES: Record<InterviewPhase, PhaseDefinition> = {
  opening: { name: '开场破冰', duration: 5, next: 'narrative' },
  narrative: { name: '叙事探索', duration: 30, next: 'grow' },
  grow: { name: 'GROW结构化', duration: 20, next: 'values' },
  values: { name: '价值澄清', duration: 15, next: 'summary' },
  summary: { name: '总结确认', duration: 5, next: null }
};

// 本地存储键名
export const STORAGE_KEYS = {
  QUESTIONNAIRE_ANSWERS: 'profile_questionnaire_answers',
  QUESTIONNAIRE_TIMESTAMP: 'profile_questionnaire_timestamp',
  INTERVIEW_SESSIONS: 'interview_sessions',
  CURRENT_SUMMARY: 'current_summary',
  CURRENT_SESSION_ID: 'current_session_id',
  COMPLETED_QUESTIONS: 'profile_completed_questions', // 已完成的问题ID数组
  CURRENT_QUESTION_INDEX: 'profile_current_question_index' // 当前问题索引
};

// 最小答案长度
export const MIN_ANSWER_LENGTH = 50;

// 自动保存间隔（毫秒）
export const AUTO_SAVE_INTERVAL = 30000;
// 辅助函数：获取已完成的问题数量
export function getCompletedQuestionsCount(): number {
  const completed = localStorage.getItem(STORAGE_KEYS.COMPLETED_QUESTIONS);
  if (!completed) return 0;
  try {
    return JSON.parse(completed).length;
  } catch {
    return 0;
  }
}

// 辅助函数：检查问题是否已完成
export function isQuestionCompleted(questionId: string): boolean {
  const completed = localStorage.getItem(STORAGE_KEYS.COMPLETED_QUESTIONS);
  if (!completed) return false;
  try {
    const completedIds: string[] = JSON.parse(completed);
    return completedIds.includes(questionId);
  } catch {
    return false;
  }
}

// 辅助函数：标记问题为已完成
export function markQuestionCompleted(questionId: string): void {
  const completed = localStorage.getItem(STORAGE_KEYS.COMPLETED_QUESTIONS);
  let completedIds: string[] = [];
  if (completed) {
    try {
      completedIds = JSON.parse(completed);
    } catch {
      completedIds = [];
    }
  }
  if (!completedIds.includes(questionId)) {
    completedIds.push(questionId);
    localStorage.setItem(STORAGE_KEYS.COMPLETED_QUESTIONS, JSON.stringify(completedIds));
  }
}

// 辅助函数：获取下一个未完成的问题索引
export function getNextUncompletedQuestionIndex(): number {
  const completed = localStorage.getItem(STORAGE_KEYS.COMPLETED_QUESTIONS);
  let completedIds: string[] = [];
  if (completed) {
    try {
      completedIds = JSON.parse(completed);
    } catch {
      completedIds = [];
    }
  }
  
  for (let i = 0; i < QUESTIONS.length; i++) {
    if (!completedIds.includes(QUESTIONS[i].id)) {
      return i;
    }
  }
  
  return -1; // 所有问题已完成
}
