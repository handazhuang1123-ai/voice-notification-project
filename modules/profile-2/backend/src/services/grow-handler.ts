/**
 * Profile-2 GROW阶段处理器
 * 独立处理GROW四阶段的响应解析和数据保存
 */

import { ollamaService } from './ollama-service.js';
import { db } from './database.js';
import { logger } from './logger.js';
import { contextManager } from './context-manager.js';
import {
  GROW_GOAL_PROMPT,
  GROW_REALITY_PROMPT,
  GROW_OPTIONS_PROMPT,
  GROW_WAY_FORWARD_PROMPT
} from '../prompts/system-prompts.js';
import type { Message } from '../types.js';

// ============ 类型定义 ============

/** GROW子阶段类型 */
export type GrowSubPhase = 'goal' | 'reality' | 'options' | 'way_forward';

/** SMART检验结果 */
interface SmartCheck {
  specific: boolean;
  measurable: boolean;
  achievable: boolean;
  relevant: boolean;
  time_bound: boolean;
}

/** Reality阶段数据 */
interface RealityElements {
  current_state: string;
  obstacles: string[];
  resources: string[];
  attempts: string[];
}

/** Action Plan数据 */
interface ActionPlan {
  first_step: string;
  timeline: string;
  contingency: string;
  support: string;
}

/** GROW响应解析结果 */
export interface GrowParseResult {
  response: string;
  subPhase: GrowSubPhase;
  // Goal阶段
  extractedGoal?: string;
  goalClarity?: number;
  smartCheck?: SmartCheck;
  // Reality阶段
  realityElements?: RealityElements;
  // Options阶段
  optionsGenerated?: string[];
  userPreference?: string;
  // Way Forward阶段
  actionPlan?: ActionPlan;
  commitmentLevel?: number;
}

/** GROW生成结果 */
export interface GrowGenerateResult {
  response: string;
  subPhase: GrowSubPhase;
  nextSubPhase: GrowSubPhase | null;
  goalId?: number;
}

// ============ GROW处理器 ============

class GrowHandler {
  /**
   * 生成GROW阶段回复
   */
  async generate(
    sessionId: string,
    userId: string,
    userMessage: string,
    messages: Message[]
  ): Promise<GrowGenerateResult> {
    // 获取当前子阶段
    const subPhase = this.getSubPhase(sessionId);
    if (!subPhase) {
      // GROW已完成，返回空响应
      return {
        response: '',
        subPhase: 'way_forward',
        nextSubPhase: null
      };
    }

    logger.debug('context', 'GROW generating', {
      session_id: sessionId,
      data: { sub_phase: subPhase }
    });

    // 获取对应的prompt
    const prompt = this.getPrompt(subPhase, sessionId);

    // 调用Ollama
    const response = await ollamaService.generateWithHistory(prompt, messages, sessionId);

    // 解析响应
    const parsed = this.parseResponse(response, subPhase, sessionId);

    // 保存数据到数据库
    const goalId = await this.saveData(sessionId, userId, parsed);

    // 判断下一个子阶段
    const nextSubPhase = this.determineNextSubPhase(sessionId, subPhase, parsed);

    logger.info('context', 'GROW response generated', {
      session_id: sessionId,
      data: {
        sub_phase: subPhase,
        next_sub_phase: nextSubPhase,
        goal_id: goalId
      }
    });

    return {
      response: parsed.response,
      subPhase,
      nextSubPhase,
      goalId
    };
  }

  /**
   * 获取当前GROW子阶段
   */
  getSubPhase(sessionId: string): GrowSubPhase | null {
    const goals = db.getSessionGoals(sessionId);

    // 没有目标，从Goal开始
    if (goals.length === 0) {
      return 'goal';
    }

    const latestGoal = goals[goals.length - 1];

    // 检查各阶段完成情况
    if (!latestGoal.current_state) {
      return 'reality';
    }

    if (!latestGoal.option_selected) {
      return 'options';
    }

    if (!latestGoal.first_step || !latestGoal.commitment_level) {
      return 'way_forward';
    }

    // GROW完成
    return null;
  }

  /**
   * 获取子阶段对应的prompt
   */
  private getPrompt(subPhase: GrowSubPhase, sessionId: string): string {
    const goals = db.getSessionGoals(sessionId);
    const goalsText = contextManager.formatGoalsAsText(goals);

    switch (subPhase) {
      case 'goal':
        return GROW_GOAL_PROMPT;
      case 'reality':
        return GROW_REALITY_PROMPT + `\n\n【已设定目标】\n${goalsText}`;
      case 'options':
        return GROW_OPTIONS_PROMPT + `\n\n【目标与现状】\n${goalsText}`;
      case 'way_forward':
        return GROW_WAY_FORWARD_PROMPT + `\n\n【目标与方案】\n${goalsText}`;
    }
  }

  /**
   * 解析GROW响应
   */
  private parseResponse(
    response: string,
    subPhase: GrowSubPhase,
    sessionId: string
  ): GrowParseResult {
    try {
      const parsed = ollamaService.parseJsonResponse<{
        response: string;
        // Goal阶段
        goal_clarity?: number;
        smart_check?: SmartCheck;
        extracted_goal?: string;
        // Reality阶段
        reality_elements?: RealityElements;
        // Options阶段
        options_generated?: string[];
        evaluation_criteria?: string[];
        user_preference?: string;
        // Way Forward阶段
        action_plan?: ActionPlan;
        commitment_level?: number;
      }>(response, sessionId);

      const result: GrowParseResult = {
        response: parsed.response,
        subPhase
      };

      // 根据子阶段提取对应数据
      switch (subPhase) {
        case 'goal':
          result.extractedGoal = parsed.extracted_goal;
          result.goalClarity = parsed.goal_clarity;
          result.smartCheck = parsed.smart_check;
          break;
        case 'reality':
          result.realityElements = parsed.reality_elements;
          break;
        case 'options':
          result.optionsGenerated = parsed.options_generated;
          result.userPreference = parsed.user_preference;
          break;
        case 'way_forward':
          result.actionPlan = parsed.action_plan;
          result.commitmentLevel = parsed.commitment_level;
          break;
      }

      logger.debug('context', 'GROW response parsed', {
        session_id: sessionId,
        data: { sub_phase: subPhase, has_data: this.hasValidData(result) }
      });

      return result;
    } catch {
      logger.warn('context', 'GROW parse failed, using raw', {
        session_id: sessionId,
        data: { sub_phase: subPhase, response_preview: response.slice(0, 100) }
      });

      return {
        response: response.trim(),
        subPhase
      };
    }
  }

  /**
   * 保存GROW数据到数据库
   */
  private async saveData(
    sessionId: string,
    userId: string,
    parsed: GrowParseResult
  ): Promise<number | undefined> {
    const goals = db.getSessionGoals(sessionId);

    switch (parsed.subPhase) {
      case 'goal':
        // Goal阶段：创建新目标
        if (parsed.extractedGoal) {
          const goalId = db.addGoal({
            userId,
            sessionId,
            goalDescription: parsed.extractedGoal,
            goalType: 'grow'
          });

          // 保存SMART检验结果
          if (parsed.smartCheck) {
            db.updateGoalGROW(goalId, {
              smart_specific: parsed.smartCheck.specific ? 'true' : 'false',
              smart_measurable: parsed.smartCheck.measurable ? 'true' : 'false',
              smart_achievable: parsed.smartCheck.achievable ? 'true' : 'false',
              smart_relevant: parsed.smartCheck.relevant ? 'true' : 'false',
              smart_time_bound: parsed.smartCheck.time_bound ? 'true' : 'false'
            });
          }

          logger.info('db', 'GROW goal created', {
            session_id: sessionId,
            data: { goal_id: goalId, goal: parsed.extractedGoal.slice(0, 50) }
          });

          return goalId;
        }
        break;

      case 'reality':
        // Reality阶段：更新现状
        if (goals.length > 0 && parsed.realityElements) {
          const goalId = goals[goals.length - 1].goal_id;
          db.updateGoalGROW(goalId, {
            current_state: parsed.realityElements.current_state,
            obstacles: JSON.stringify(parsed.realityElements.obstacles || [])
          });

          logger.debug('db', 'GROW reality updated', {
            session_id: sessionId,
            data: { goal_id: goalId }
          });

          return goalId;
        }
        break;

      case 'options':
        // Options阶段：保存选项
        if (goals.length > 0 && parsed.optionsGenerated) {
          const goalId = goals[goals.length - 1].goal_id;
          db.updateGoalGROW(goalId, {
            options_generated: JSON.stringify(parsed.optionsGenerated),
            option_selected: parsed.userPreference
          });

          logger.debug('db', 'GROW options updated', {
            session_id: sessionId,
            data: { goal_id: goalId, options_count: parsed.optionsGenerated.length }
          });

          return goalId;
        }
        break;

      case 'way_forward':
        // Way Forward阶段：保存行动计划
        if (goals.length > 0) {
          const goalId = goals[goals.length - 1].goal_id;
          const updates: Record<string, unknown> = {};

          if (parsed.actionPlan) {
            updates.action_steps = JSON.stringify(parsed.actionPlan);
            updates.first_step = parsed.actionPlan.first_step;
          }
          if (parsed.commitmentLevel) {
            updates.commitment_level = parsed.commitmentLevel;
          }

          if (Object.keys(updates).length > 0) {
            db.updateGoalGROW(goalId, updates);

            logger.info('db', 'GROW way forward completed', {
              session_id: sessionId,
              data: { goal_id: goalId, commitment: parsed.commitmentLevel }
            });
          }

          return goalId;
        }
        break;
    }

    return undefined;
  }

  /**
   * 判断下一个子阶段
   */
  private determineNextSubPhase(
    sessionId: string,
    currentSubPhase: GrowSubPhase,
    parsed: GrowParseResult
  ): GrowSubPhase | null {
    switch (currentSubPhase) {
      case 'goal':
        // 有提取到目标才进入Reality
        if (parsed.extractedGoal) {
          return 'reality';
        }
        return 'goal'; // 继续Goal阶段

      case 'reality':
        // 有现状描述才进入Options
        if (parsed.realityElements?.current_state) {
          return 'options';
        }
        return 'reality';

      case 'options':
        // 有选择才进入Way Forward
        if (parsed.userPreference) {
          return 'way_forward';
        }
        return 'options';

      case 'way_forward':
        // 有承诺度才完成GROW
        if (parsed.commitmentLevel) {
          return null; // GROW完成
        }
        return 'way_forward';
    }
  }

  /**
   * 检查是否有有效数据
   */
  private hasValidData(parsed: GrowParseResult): boolean {
    switch (parsed.subPhase) {
      case 'goal':
        return !!parsed.extractedGoal;
      case 'reality':
        return !!parsed.realityElements?.current_state;
      case 'options':
        return (parsed.optionsGenerated?.length || 0) > 0;
      case 'way_forward':
        return !!parsed.commitmentLevel;
    }
  }

  /**
   * 检查GROW是否完成
   */
  isComplete(sessionId: string): boolean {
    return this.getSubPhase(sessionId) === null;
  }
}

export const growHandler = new GrowHandler();
