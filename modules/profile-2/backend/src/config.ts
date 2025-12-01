/**
 * Profile-2 配置管理
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { Config, OllamaOptions, QuestionStrategy } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载config.json
const configPath = join(__dirname, '../../config.json');
const configData = JSON.parse(readFileSync(configPath, 'utf-8')) as Config;

export const config = configData;

// ============ 问题策略配置 ============

export const QUESTION_CONFIG: Record<string, QuestionStrategy> = {
  'life_chapters': {
    hasOpening: true,
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
    hasGROW: true,
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
    hasDeepExploration: false,
    hasGROW: true,
    hasSummary: true,
    minTurns: 12,
    maxTurns: 28
  },
  'values_beliefs': {
    hasOpening: false,
    hasValuesNarrative: false,
    hasDeepExploration: false,
    hasGROW: false,
    hasSummary: true,
    specialMode: 'values_validation',
    minTurns: 5,
    maxTurns: 10
  },
  'life_philosophy': {
    hasOpening: false,
    hasValuesNarrative: true,
    hasDeepExploration: false,
    hasGROW: false,
    hasSummary: true,
    summaryEnhanced: true,
    minTurns: 8,
    maxTurns: 16
  }
};

// ============ 模型管理 ============

let currentModel = config.ollama.defaultModel;

export function getCurrentModel(): string {
  return currentModel;
}

export function setCurrentModel(model: string): void {
  if (config.ollama.availableModels.includes(model)) {
    currentModel = model;
  } else {
    throw new Error(`Model ${model} is not available`);
  }
}

export function getModelOptions(): OllamaOptions {
  return config.ollama.options;
}

// ============ 数据库路径 ============

export function getDatabasePath(): string {
  return join(__dirname, '../..', config.database.path);
}

// ============ 端口配置 ============

export function getBackendPort(): number {
  return config.ports.backend;
}

export function getFrontendPort(): number {
  return config.ports.frontend;
}

// ============ 功能开关 ============

export function isDataProtectionEnabled(): boolean {
  return config.features.dataProtection;
}

export function isSessionResumeEnabled(): boolean {
  return config.features.sessionResume;
}

export function isRagSyncEnabled(): boolean {
  return config.features.ragSync;
}

// ============ 获取问题策略 ============

export function getQuestionStrategy(questionId: string): QuestionStrategy | null {
  return QUESTION_CONFIG[questionId] || null;
}

// ============ 阶段顺序 ============

import type { PhaseType } from './types.js';

export function getPhaseOrder(questionId: string): PhaseType[] {
  const strategy = QUESTION_CONFIG[questionId];
  if (!strategy) {
    return ['values_narrative', 'summary'];
  }

  const order: PhaseType[] = [];

  if (strategy.hasOpening) order.push('opening');
  if (strategy.hasValuesNarrative) order.push('values_narrative');
  if (strategy.specialMode === 'values_validation') order.push('values_validation');
  if (strategy.hasDeepExploration) order.push('deep_exploration');
  if (strategy.hasGROW) order.push('grow');
  order.push('summary');

  return order;
}

export function getNextPhase(questionId: string, currentPhase: PhaseType): PhaseType | null {
  const order = getPhaseOrder(questionId);
  const currentIndex = order.indexOf(currentPhase);

  if (currentIndex === -1 || currentIndex === order.length - 1) {
    return null;
  }

  return order[currentIndex + 1];
}
