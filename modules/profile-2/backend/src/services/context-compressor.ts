/**
 * Profile-2 上下文压缩器
 * 当对话过长时自动压缩历史，保持上下文窗口可控
 */

import { ollamaService } from './ollama-service.js';
import { db } from './database.js';
import { logger } from './logger.js';
import type { Turn, Value, Insight, ContextSummary } from '../types.js';

/** 压缩配置 */
const COMPRESSION_CONFIG = {
  /** 触发压缩的轮数阈值 */
  triggerThreshold: 8,
  /** 压缩后保留的最近轮数 */
  keepRecentTurns: 3,
  /** 预估每轮对话的token数 */
  estimatedTokensPerTurn: 300,
  /** 目标上下文长度（tokens） */
  targetContextTokens: 4000
};

/** 压缩后的上下文 */
export interface CompressedContext {
  /** 压缩摘要 */
  summary: ContextSummary;
  /** 保留的最近对话 */
  recentTurns: Turn[];
  /** 是否已压缩 */
  compressed: boolean;
  /** 原始轮数 */
  originalTurnCount: number;
}

/** 压缩提示词 */
const COMPRESSION_PROMPT = `你是一个对话摘要专家。请将以下对话历史压缩成结构化摘要，保留关键信息。

【对话历史】
{conversation}

【已识别价值观】
{values}

【要求】
1. 提取关键事件和时间节点
2. 识别情感主题和模式
3. 保留用户的原话中有价值的表达
4. 总结已发现的洞察

【输出格式】
{
  "key_events": ["事件1: 描述", "事件2: 描述"],
  "identified_values": [
    {"domain": "领域", "value": "价值观", "layer": 1, "evidence": "证据"}
  ],
  "emotional_themes": ["主题1", "主题2"],
  "insights": ["洞察1", "洞察2"],
  "narrative_summary": "一段话概括用户的核心故事线"
}`;

class ContextCompressor {
  /**
   * 检查是否需要压缩
   */
  shouldCompress(turnCount: number): boolean {
    return turnCount > COMPRESSION_CONFIG.triggerThreshold;
  }

  /**
   * 估算当前上下文的token数
   */
  estimateTokens(turns: Turn[]): number {
    let total = 0;
    for (const turn of turns) {
      // 粗略估算：中文约1.5字符/token，英文约4字符/token
      const userLen = turn.user_message.length;
      const aiLen = turn.ai_message.length;
      total += Math.ceil((userLen + aiLen) / 2);
    }
    return total;
  }

  /**
   * 压缩对话历史
   */
  async compress(
    sessionId: string,
    turns: Turn[],
    values: Value[]
  ): Promise<CompressedContext> {
    const turnCount = turns.length;

    // 不需要压缩
    if (!this.shouldCompress(turnCount)) {
      return {
        summary: {
          key_events: [],
          identified_values: [],
          emotional_themes: [],
          insights: []
        },
        recentTurns: turns,
        compressed: false,
        originalTurnCount: turnCount
      };
    }

    logger.info('context', 'Starting context compression', {
      session_id: sessionId,
      data: { turnCount, threshold: COMPRESSION_CONFIG.triggerThreshold }
    });

    // 分割：早期对话需要压缩，最近对话保留原文
    const splitIndex = turnCount - COMPRESSION_CONFIG.keepRecentTurns;
    const turnsToCompress = turns.slice(0, splitIndex);
    const recentTurns = turns.slice(splitIndex);

    // 构建压缩prompt
    const conversationText = turnsToCompress.map(t =>
      `[轮次${t.turn_number}]\n用户: ${t.user_message}\nAI: ${t.ai_message}`
    ).join('\n\n---\n\n');

    const valuesText = values.map(v =>
      `${v.domain}: ${v.value_name} (深度${v.depth_layer})`
    ).join('\n');

    const prompt = COMPRESSION_PROMPT
      .replace('{conversation}', conversationText)
      .replace('{values}', valuesText || '暂无');

    try {
      const response = await ollamaService.generate(prompt, sessionId, { forceJson: true });
      const parsed = ollamaService.parseJsonResponse<{
        key_events: string[];
        identified_values: Array<{
          domain: string;
          value: string;
          layer: number;
          evidence?: string;
        }>;
        emotional_themes: string[];
        insights: string[];
        narrative_summary?: string;
      }>(response, sessionId);

      const summary: ContextSummary = {
        key_events: parsed.key_events || [],
        identified_values: parsed.identified_values || [],
        emotional_themes: parsed.emotional_themes || [],
        insights: parsed.insights || []
      };

      // 保存压缩结果到数据库
      this.saveCompression(sessionId, summary, splitIndex);

      logger.info('context', 'Context compression complete', {
        session_id: sessionId,
        data: {
          compressedTurns: turnsToCompress.length,
          keptTurns: recentTurns.length,
          keyEvents: summary.key_events.length,
          insights: summary.insights.length
        }
      });

      return {
        summary,
        recentTurns,
        compressed: true,
        originalTurnCount: turnCount
      };
    } catch (error) {
      logger.warn('context', 'Compression failed, using fallback', {
        session_id: sessionId,
        data: { error: String(error) }
      });

      // 降级：简单截取，不做AI压缩
      return this.fallbackCompress(turns, values);
    }
  }

  /**
   * 降级压缩（AI失败时使用）
   */
  private fallbackCompress(turns: Turn[], values: Value[]): CompressedContext {
    const recentTurns = turns.slice(-COMPRESSION_CONFIG.keepRecentTurns);

    // 从已有数据构建简单摘要
    const summary: ContextSummary = {
      key_events: [],
      identified_values: values.map(v => ({
        domain: v.domain,
        value: v.value_name,
        layer: v.depth_layer,
        evidence: v.evidence_quote
      })),
      emotional_themes: [],
      insights: []
    };

    return {
      summary,
      recentTurns,
      compressed: true,
      originalTurnCount: turns.length
    };
  }

  /**
   * 保存压缩结果
   */
  private saveCompression(
    sessionId: string,
    summary: ContextSummary,
    compressedTurnCount: number
  ): void {
    try {
      // 将压缩摘要保存到session的metadata中
      const session = db.getSession(sessionId);
      if (session) {
        // 添加压缩记录到insights表
        for (const insight of summary.insights) {
          db.addInsight({
            userId: session.user_id,
            sessionId,
            insightType: 'compression_insight',
            content: insight,
            sourcePhase: session.current_phase
          });
        }
      }

      logger.debug('context', 'Compression saved', {
        session_id: sessionId,
        data: { compressedTurnCount }
      });
    } catch (error) {
      logger.warn('context', 'Failed to save compression', {
        session_id: sessionId,
        data: { error: String(error) }
      });
    }
  }

  /**
   * 构建压缩后的上下文文本（用于prompt）
   */
  formatCompressedContext(compressed: CompressedContext): string {
    if (!compressed.compressed) {
      return '';
    }

    const lines: string[] = ['【历史摘要】'];

    if (compressed.summary.key_events.length > 0) {
      lines.push('关键事件:');
      compressed.summary.key_events.forEach(e => lines.push(`  - ${e}`));
    }

    if (compressed.summary.identified_values.length > 0) {
      lines.push('已识别价值观:');
      compressed.summary.identified_values.forEach(v =>
        lines.push(`  - ${v.domain}: ${v.value}`)
      );
    }

    if (compressed.summary.emotional_themes.length > 0) {
      lines.push(`情感主题: ${compressed.summary.emotional_themes.join('、')}`);
    }

    if (compressed.summary.insights.length > 0) {
      lines.push('重要洞察:');
      compressed.summary.insights.forEach(i => lines.push(`  - ${i}`));
    }

    lines.push(`（已压缩 ${compressed.originalTurnCount - compressed.recentTurns.length} 轮早期对话）`);
    lines.push('');

    return lines.join('\n');
  }
}

export const contextCompressor = new ContextCompressor();
