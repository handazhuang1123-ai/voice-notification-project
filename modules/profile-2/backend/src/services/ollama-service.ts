/**
 * Profile-2 Ollama服务
 * 封装与Ollama API的交互
 */

import axios, { AxiosError } from 'axios';
import { config, getCurrentModel, getModelOptions } from '../config.js';
import { logger } from './logger.js';
import { AppError, ErrorCodes } from '../types.js';
import type { OllamaGenerateRequest, OllamaGenerateResponse, Message } from '../types.js';

class OllamaService {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = config.ollama.baseUrl;
    this.timeout = config.ollama.timeout;
  }

  /**
   * 调用Ollama生成API
   */
  async generate(prompt: string, sessionId?: string): Promise<string> {
    const model = getCurrentModel();
    const options = getModelOptions();
    const startTime = Date.now();

    logger.debug('ollama', `Calling Ollama (${model})`, {
      session_id: sessionId,
      data: { prompt_length: prompt.length }
    });

    const request: OllamaGenerateRequest = {
      model,
      prompt,
      stream: false,
      options
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

      return response.data.response;
    } catch (error) {
      const duration = Date.now() - startTime;

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
  }

  /**
   * 使用对话历史生成回复
   */
  async generateWithHistory(
    systemPrompt: string,
    messages: Message[],
    sessionId?: string
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

    fullPrompt += '\nAI: ';

    return this.generate(fullPrompt, sessionId);
  }

  /**
   * 解析JSON响应
   */
  parseJsonResponse<T>(response: string, sessionId?: string): T {
    // 尝试提取JSON部分
    const jsonMatch = response.match(/\{[\s\S]*\}/);
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

    try {
      return JSON.parse(jsonMatch[0]) as T;
    } catch (parseError) {
      logger.error('ollama', 'JSON parse failed', {
        session_id: sessionId,
        data: { json_text: jsonMatch[0].slice(0, 200) }
      });
      throw new AppError(
        ErrorCodes.OLLAMA_PARSE_ERROR.code,
        ErrorCodes.OLLAMA_PARSE_ERROR.message,
        ErrorCodes.OLLAMA_PARSE_ERROR.status,
        { json_text: jsonMatch[0].slice(0, 200) }
      );
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
