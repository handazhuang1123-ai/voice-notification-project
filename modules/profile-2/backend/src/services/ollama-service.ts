/**
 * Profile-2 Ollama服务
 * 封装与Ollama API的交互
 * 支持 Ollama v0.5+ 原生 Structured Outputs
 */

import axios, { AxiosError } from 'axios';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { jsonrepair } from 'jsonrepair';
import { config, getCurrentModel, getModelOptions } from '../config.js';
import { logger } from './logger.js';
import { AppError, ErrorCodes } from '../types.js';
import type { OllamaGenerateRequest, OllamaGenerateResponse, Message } from '../types.js';

/** Ollama Chat API 请求格式 */
interface OllamaChatRequest {
    model: string;
    messages: Array<{ role: string; content: string }>;
    format?: unknown;
    stream?: boolean;
    options?: Record<string, unknown>;
}

/** Ollama Chat API 响应格式 */
interface OllamaChatResponse {
    model: string;
    message: { role: string; content: string };
    done: boolean;
    eval_count?: number;
}

class OllamaService {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = config.ollama.baseUrl;
    this.timeout = config.ollama.timeout;
  }

  /**
   * 调用Ollama生成API
   * @param prompt 提示词
   * @param sessionId 会话ID（用于日志）
   * @param options.forceJson 强制JSON输出（预填充 { ）
   */
  async generate(
    prompt: string,
    sessionId?: string,
    options?: { forceJson?: boolean }
  ): Promise<string> {
    const model = getCurrentModel();
    const modelOptions = getModelOptions();
    const startTime = Date.now();

    // 强制JSON输出：在prompt末尾预填充 {
    const actualPrompt = options?.forceJson ? prompt + '\n{' : prompt;

    logger.debug('ollama', `Calling Ollama (${model})`, {
      session_id: sessionId,
      data: { prompt_length: actualPrompt.length }
    });

    const request: OllamaGenerateRequest = {
      model,
      prompt: actualPrompt,
      stream: false,
      options: modelOptions
    };

    try {
      const response = await axios.post<OllamaGenerateResponse>(
        `${this.baseUrl}/api/generate`,
        request,
        {
          timeout: this.timeout,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const duration = Date.now() - startTime;

      logger.info('ollama', 'Response received', {
        session_id: sessionId,
        duration_ms: duration,
        data: {
          response_length: response.data.response.length,
          eval_count: response.data.eval_count
        }
      });

      // 强制JSON模式：补回预填充的 {
      if (options?.forceJson) {
        return '{' + response.data.response;
      }
      return response.data.response;
    } catch (error) {
      return this.handleError(error, sessionId, startTime);
    }
  }

  /**
   * 使用 Ollama 原生 Structured Outputs 生成结构化响应
   * @param systemPrompt 系统提示词
   * @param messages 对话历史
   * @param schema Zod Schema 定义（使用 any 绕过联合类型问题）
   * @param sessionId 会话ID（用于日志）
   */
  async generateStructured<T>(
    systemPrompt: string,
    messages: Message[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    schema: any,
    sessionId?: string
  ): Promise<T> {
    const model = getCurrentModel();
    const modelOptions = getModelOptions();
    const startTime = Date.now();

    // 转换 Zod Schema 为 JSON Schema
    const jsonSchema = zodToJsonSchema(schema, { target: 'openApi3' });

    // 构建 Chat API 消息格式
    const chatMessages: Array<{ role: string; content: string }> = [
        { role: 'system', content: systemPrompt }
    ];

    for (const msg of messages) {
        chatMessages.push({ role: msg.role, content: msg.content });
    }

    logger.debug('ollama', `Calling Ollama Structured (${model})`, {
        session_id: sessionId,
        data: { messages_count: chatMessages.length, schema_type: schema.description || 'unknown' }
    });

    const request: OllamaChatRequest = {
        model,
        messages: chatMessages,
        format: jsonSchema,
        stream: false,
        options: {
            ...modelOptions,
            temperature: modelOptions.temperature ?? 0.7,
            num_predict: modelOptions.num_ctx ?? 2048
        }
    };

    try {
        const response = await axios.post<OllamaChatResponse>(
            `${this.baseUrl}/api/chat`,
            request,
            {
                timeout: this.timeout,
                headers: { 'Content-Type': 'application/json' }
            }
        );

        const duration = Date.now() - startTime;
        const content = response.data.message.content;

        logger.info('ollama', 'Structured response received', {
            session_id: sessionId,
            duration_ms: duration,
            data: {
                response_length: content.length,
                eval_count: response.data.eval_count
            }
        });

        // 解析并验证
        return this.parseAndValidate(content, schema, sessionId);
    } catch (error) {
        return this.handleError(error, sessionId, startTime);
    }
  }

  /**
   * 解析并验证 JSON 响应
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseAndValidate<T>(content: string, schema: any, sessionId?: string): T {
    // 第一层：直接解析
    try {
        const parsed = JSON.parse(content);
        return schema.parse(parsed);
    } catch (directError) {
        logger.debug('ollama', 'Direct parse failed, trying repair', {
            session_id: sessionId,
            data: { error: String(directError) }
        });
    }

    // 第二层：jsonrepair 修复
    try {
        const repaired = jsonrepair(content);
        const parsed = JSON.parse(repaired);
        logger.info('ollama', 'JSON repaired successfully', { session_id: sessionId });
        return schema.parse(parsed);
    } catch (repairError) {
        logger.error('ollama', 'JSON repair failed', {
            session_id: sessionId,
            data: { content_preview: content.slice(0, 200), error: String(repairError) }
        });
        throw new AppError(
            ErrorCodes.OLLAMA_PARSE_ERROR.code,
            ErrorCodes.OLLAMA_PARSE_ERROR.message,
            ErrorCodes.OLLAMA_PARSE_ERROR.status,
            { content_preview: content.slice(0, 200) }
        );
    }
  }

  /**
   * 统一错误处理
   */
  private handleError(error: unknown, sessionId?: string, startTime?: number): never {
    const duration = startTime ? Date.now() - startTime : 0;

    if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
            logger.error('ollama', 'Request timeout', {
                session_id: sessionId,
                duration_ms: duration,
                data: { timeout: this.timeout }
            });
            throw new AppError(
                ErrorCodes.OLLAMA_TIMEOUT.code,
                ErrorCodes.OLLAMA_TIMEOUT.message,
                ErrorCodes.OLLAMA_TIMEOUT.status,
                { timeout: this.timeout }
            );
        }

        if (axiosError.code === 'ECONNREFUSED') {
            logger.error('ollama', 'Connection refused', {
                session_id: sessionId,
                data: { baseUrl: this.baseUrl }
            });
            throw new AppError(
                ErrorCodes.OLLAMA_UNAVAILABLE.code,
                ErrorCodes.OLLAMA_UNAVAILABLE.message,
                ErrorCodes.OLLAMA_UNAVAILABLE.status,
                { baseUrl: this.baseUrl }
            );
        }

        logger.error('ollama', 'API error', {
            session_id: sessionId,
            duration_ms: duration,
            data: { status: axiosError.response?.status, message: axiosError.message }
        });
    }

    throw new AppError(
        ErrorCodes.OLLAMA_UNAVAILABLE.code,
        ErrorCodes.OLLAMA_UNAVAILABLE.message,
        ErrorCodes.OLLAMA_UNAVAILABLE.status,
        { error: String(error) }
    );
  }

  /**
   * 使用对话历史生成回复（兼容旧接口）
   * @deprecated 建议使用 generateStructured
   */
  async generateWithHistory(
    systemPrompt: string,
    messages: Message[],
    sessionId?: string,
    options?: { forceJson?: boolean }
  ): Promise<string> {
    // 构建完整prompt
    let fullPrompt = `${systemPrompt}\n\n`;

    for (const msg of messages) {
      if (msg.role === 'user') {
        fullPrompt += `用户: ${msg.content}\n`;
      } else if (msg.role === 'assistant') {
        fullPrompt += `AI: ${msg.content}\n`;
      }
    }

    // 强制JSON输出：预填充 { 使模型必须输出JSON
    if (options?.forceJson) {
      fullPrompt += '\nAI: {';
      // 注意：这里不传 forceJson 给 generate，因为我们已经手动加了 {
      const response = await this.generate(fullPrompt, sessionId);
      return '{' + response;
    }

    fullPrompt += '\nAI: ';
    return this.generate(fullPrompt, sessionId);
  }

  /**
   * 解析JSON响应（兼容旧接口，已增强 jsonrepair 兜底）
   * @deprecated 建议使用 generateStructured 自动解析验证
   */
  parseJsonResponse<T>(response: string, sessionId?: string): T {
    // 预处理：修复双大括号问题（forceJson 导致）
    const cleaned = response.replace(/^\{\{/, '{').replace(/\}\}$/, '}');

    // 尝试提取JSON部分
    let jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      const startIdx = cleaned.indexOf('{');
      if (startIdx !== -1) {
        jsonMatch = [cleaned.slice(startIdx)];
      }
    }

    if (!jsonMatch) {
      logger.warn('ollama', 'No JSON found in response', {
        session_id: sessionId,
        data: { response_preview: response.slice(0, 200) }
      });
      throw new AppError(
        ErrorCodes.OLLAMA_PARSE_ERROR.code,
        ErrorCodes.OLLAMA_PARSE_ERROR.message,
        ErrorCodes.OLLAMA_PARSE_ERROR.status,
        { response_preview: response.slice(0, 200) }
      );
    }

    const jsonText = jsonMatch[0];

    // 第一层：直接解析
    try {
      return JSON.parse(jsonText) as T;
    } catch {
      // 第二层：jsonrepair 修复
      try {
        const repaired = jsonrepair(jsonText);
        logger.info('ollama', 'JSON repaired by jsonrepair', { session_id: sessionId });
        return JSON.parse(repaired) as T;
      } catch (repairError) {
        logger.error('ollama', 'JSON parse failed', {
          session_id: sessionId,
          data: { json_text: jsonText.slice(0, 200) }
        });
        throw new AppError(
          ErrorCodes.OLLAMA_PARSE_ERROR.code,
          ErrorCodes.OLLAMA_PARSE_ERROR.message,
          ErrorCodes.OLLAMA_PARSE_ERROR.status,
          { json_text: jsonText.slice(0, 200) }
        );
      }
    }
  }

  /**
   * 检查Ollama服务是否可用
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * 获取可用模型列表
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await axios.get<{ models: Array<{ name: string }> }>(
        `${this.baseUrl}/api/tags`,
        { timeout: 5000 }
      );
      return response.data.models.map(m => m.name);
    } catch {
      return [];
    }
  }

  /**
   * 估算token数量（粗略估计）
   */
  estimateTokens(text: string): number {
    // 中文大约1.5字符/token，英文大约4字符/token
    // 简化估计：平均2字符/token
    return Math.ceil(text.length / 2);
  }
}

export const ollamaService = new OllamaService();
