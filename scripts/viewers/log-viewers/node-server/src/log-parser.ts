/**
 * Log Parser Module
 * 日志解析模块
 *
 * Parses voice-unified.log file and extracts session data
 * 解析 voice-unified.log 文件并提取会话数据
 */

import * as fs from 'fs';

/**
 * Parsed log line interface
 * 解析后的日志行接口
 */
interface ParsedLogLine {
    timestamp: string;
    level: string;
    source: string;
    message: string;
}

/**
 * Session data interface
 * 会话数据接口
 */
interface SessionData {
    userMessage: string;
    claudeReply: string;
    summary: string;
    voice: string;
    model: string;
    status: string;
    startTime: string | null;
    endTime: string | null;
}

/**
 * Log item interface (output format)
 * 日志项接口（输出格式）
 */
export interface LogItem {
    sessionId: string;
    timestamp: string;
    message: string;
    duration: number;
    status: string;
    details: {
        userMessage: string;
        claudeReply: string;
        ollamaModel: string;
        voice: string;
    };
}

/**
 * Parse a single log line into structured data
 * 将单行日志解析为结构化数据
 */
function parseLogLine(line: string): ParsedLogLine | null {
    // Pattern: [timestamp] [level] [source] message
    // 模式：[时间戳] [级别] [来源] 消息
    const pattern = /^\[([^\]]+)\]\s+\[([^\]]+)\]\s+\[([^\]]+)\]\s+(.*)$/;
    const match = line.match(pattern);

    if (match) {
        return {
            timestamp: match[1],
            level: match[2],
            source: match[3],
            message: match[4]
        };
    }

    return null;
}

/**
 * Extract structured data from session log lines
 * 从会话日志行中提取结构化数据
 */
function extractSessionData(sessionLines: string[]): SessionData {
    const session: SessionData = {
        userMessage: '',
        claudeReply: '',
        summary: '',
        voice: '',
        model: '',
        status: 'Unknown',
        startTime: null,
        endTime: null
    };

    for (const line of sessionLines) {
        // Skip empty lines | 跳过空行
        if (!line.trim()) continue;

        const parsed = parseLogLine(line);
        if (!parsed) continue;

        // Extract user message | 提取用户消息
        const userMatch = parsed.message.match(/^User message:\s*(.+)$/);
        if (userMatch) {
            session.userMessage = userMatch[1].trim();
        }

        // Extract Claude reply | 提取 Claude 回复
        const claudeMatch = parsed.message.match(/^Claude reply:\s*(.+)$/);
        if (claudeMatch) {
            session.claudeReply = claudeMatch[1].trim();
        }

        // Extract final summary | 提取最终摘要
        const summaryMatch = parsed.message.match(/^FINAL SUMMARY:\s*(.+)$/);
        if (summaryMatch) {
            session.summary = summaryMatch[1].trim();
        }

        // Extract voice | 提取语音
        const voiceMatch = parsed.message.match(/^Voice:\s*(.+)$/);
        if (voiceMatch) {
            session.voice = voiceMatch[1].trim();
        }

        // Extract model | 提取模型
        const modelMatch = parsed.message.match(/^Selected model:\s*(.+)$/);
        if (modelMatch) {
            session.model = modelMatch[1].trim();
        }

        // Extract playback result | 提取播放结果
        const playbackMatch = parsed.message.match(/^Playback result:\s*(.+)$/);
        if (playbackMatch) {
            const playbackResult = playbackMatch[1].trim();
            session.status = playbackResult === 'SUCCESS' ? 'Success' : 'Error';
        }

        // Track start time | 记录开始时间
        if (parsed.message.includes('Voice Notification Started') && !session.startTime) {
            session.startTime = parsed.timestamp;
        }

        // Track end time | 记录结束时间
        if (parsed.message.includes('Voice Notification Completed')) {
            session.endTime = parsed.timestamp;
        }
    }

    return session;
}

/**
 * Convert log timestamp to ISO 8601 format
 * 将日志时间戳转换为 ISO 8601 格式
 */
function convertToIso8601(timestamp: string): string {
    try {
        // Parse as local time (Beijing Time / UTC+8)
        // 解析为本地时间（北京时间 / UTC+8）
        const dateTime = new Date(timestamp);

        // Convert to UTC time for international standard compliance
        // 转换为 UTC 时间以符合国际标准
        return dateTime.toISOString();
    } catch {
        return timestamp;
    }
}

/**
 * Calculate duration in seconds between two timestamps
 * 计算两个时间戳之间的时长（秒）
 */
function calculateDuration(startTime: string, endTime: string): number {
    try {
        const start = new Date(startTime);
        const end = new Date(endTime);
        return Math.round((end.getTime() - start.getTime()) / 10) / 100; // Round to 2 decimals
    } catch {
        return 0.0;
    }
}

/**
 * Parse log file and extract all sessions
 * 解析日志文件并提取所有会话
 */
export function parseLogs(logFilePath: string): LogItem[] {
    if (!fs.existsSync(logFilePath)) {
        throw new Error(`Log file not found: ${logFilePath}`);
    }

    const logContent = fs.readFileSync(logFilePath, 'utf-8');
    const logLines = logContent.split('\n');

    const sessions: LogItem[] = [];
    let currentSession: string[] = [];
    let inSession = false;

    for (const line of logLines) {
        if (line.includes('Voice Notification Started')) {
            inSession = true;
            currentSession = [line];
        } else if (inSession) {
            currentSession.push(line);

            if (line.includes('Voice Notification Completed')) {
                // Process completed session | 处理完成的会话
                const sessionData = extractSessionData(currentSession);

                if (sessionData.startTime && sessionData.summary) {
                    // Generate session ID | 生成会话 ID
                    const startDate = new Date(sessionData.startTime);
                    const sessionId =
                        `${startDate.getFullYear()}${String(startDate.getMonth() + 1).padStart(2, '0')}${String(startDate.getDate()).padStart(2, '0')}-` +
                        `${String(startDate.getHours()).padStart(2, '0')}${String(startDate.getMinutes()).padStart(2, '0')}${String(startDate.getSeconds()).padStart(2, '0')}`;

                    // Calculate duration | 计算时长
                    const duration = sessionData.endTime
                        ? calculateDuration(sessionData.startTime, sessionData.endTime)
                        : 0.0;

                    // Create log item | 创建日志项
                    const logItem: LogItem = {
                        sessionId,
                        timestamp: convertToIso8601(sessionData.startTime),
                        message: sessionData.summary,
                        duration,
                        status: sessionData.status,
                        details: {
                            userMessage: sessionData.userMessage,
                            claudeReply: sessionData.claudeReply,
                            ollamaModel: sessionData.model,
                            voice: sessionData.voice
                        }
                    };

                    sessions.push(logItem);
                }

                inSession = false;
                currentSession = [];
            }
        }
    }

    return sessions;
}
