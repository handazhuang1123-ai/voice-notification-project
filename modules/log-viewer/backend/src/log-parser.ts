/**
 * Log Parser Module
 * 日志解析模块
 *
 * Parses voice-unified.log file and extracts session data
 * 解析 voice-unified.log 文件并提取会话数据
 */

import * as fs from 'fs';
import * as path from 'path';

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

    const summaryLines: string[] = [];  // 摘要行收集器

    for (let i = 0; i < sessionLines.length; i++) {
        const line = sessionLines[i];

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

        // Extract final summary (支持多行) | 提取最终摘要（支持多行）
        const summaryMatch = parsed.message.match(/^FINAL SUMMARY:\s*(.*)$/);
        if (summaryMatch) {
            summaryLines.length = 0; // 清空之前的收集
            summaryLines.push(summaryMatch[1].trim());

            // 继续收集后续的列表项或延续行
            for (let j = i + 1; j < sessionLines.length; j++) {
                const nextLine = sessionLines[j];
                if (!nextLine.trim()) continue;

                const nextParsed = parseLogLine(nextLine);
                if (!nextParsed) continue;

                // 检查是否是摘要的延续行（以 - 开头或缩进）
                const msg = nextParsed.message.trim();
                if (msg.startsWith('-') || msg.startsWith('•') || msg.startsWith('*')) {
                    summaryLines.push(msg);
                    i = j; // 更新外层循环索引
                } else if (msg.match(/^(Voice:|Selected model:|Playback result:|Voice Notification)/)) {
                    // 遇到下一个结构化字段，停止收集
                    break;
                } else {
                    // 其他情况也停止
                    break;
                }
            }

            // 将收集到的行合并为完整摘要
            session.summary = summaryLines.join('\n');
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

        // Extract playback result | 提取播放结果（兼容新旧两种格式）
        // 旧格式：Playback result: SUCCESS
        const playbackMatch = parsed.message.match(/^Playback result:\s*(.+)$/);
        if (playbackMatch) {
            const playbackResult = playbackMatch[1].trim();
            session.status = playbackResult === 'SUCCESS' ? 'Success' : 'Error';
        }

        // 新格式：Edge-TTS Playback Completed 或 playback successful
        if (parsed.message.includes('Edge-TTS Playback Completed') ||
            parsed.message.includes('playback successful')) {
            // 只有在状态还是 Unknown 时才设置为 Success（避免覆盖旧格式的结果）
            if (session.status === 'Unknown') {
                session.status = 'Success';
            }
        }

        // 检测播放失败的情况
        if (parsed.message.includes('Playback failed') ||
            parsed.message.includes('Error:') ||
            parsed.message.includes('Failed to')) {
            session.status = 'Error';
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
 * Get all log files (including archived ones)
 * 获取所有日志文件（包括归档的）
 */
function getAllLogFiles(baseLogPath: string): string[] {
    if (!fs.existsSync(baseLogPath)) {
        console.warn(`[Parser] Log file not found: ${baseLogPath}`);
        return [];
    }

    const logDir = path.dirname(baseLogPath);
    const baseFileName = path.basename(baseLogPath, '.log'); // 'voice-unified'

    // Get all files matching pattern: voice-unified*.log
    // 获取所有匹配模式的文件：voice-unified*.log
    const allFiles: string[] = [];

    try {
        const filesInDir = fs.readdirSync(logDir);

        for (const file of filesInDir) {
            // Match: voice-unified.log or voice-unified_YYYYMMDD-HHMMSS.log
            // 匹配：voice-unified.log 或 voice-unified_YYYYMMDD-HHMMSS.log
            if (file.startsWith(baseFileName) && file.endsWith('.log')) {
                allFiles.push(path.join(logDir, file));
            }
        }

        // Sort by modification time (newest first) | 按修改时间排序（最新的在前）
        allFiles.sort((a, b) => {
            const statA = fs.statSync(a);
            const statB = fs.statSync(b);
            return statB.mtime.getTime() - statA.mtime.getTime();
        });

        console.log(`[Parser] Found ${allFiles.length} log file(s):`);
        allFiles.forEach(file => console.log(`  - ${path.basename(file)}`));

    } catch (error) {
        console.error('[Parser] Error scanning log directory:', error);
        // Fallback to just the base file | 失败时回退到基础文件
        if (fs.existsSync(baseLogPath)) {
            allFiles.push(baseLogPath);
        }
    }

    return allFiles;
}

/**
 * Parse a single log file and extract sessions
 * 解析单个日志文件并提取会话
 */
function parseLogFile(logFilePath: string): LogItem[] {
    if (!fs.existsSync(logFilePath)) {
        console.warn(`[Parser] File not found: ${logFilePath}`);
        return [];
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

/**
 * Pagination options interface
 * 分页选项接口
 */
export interface PaginationOptions {
    page: number;
    limit: number;
}

/**
 * Pagination result interface
 * 分页结果接口
 */
export interface PaginationResult {
    items: LogItem[];
    pagination: {
        currentPage: number;
        pageSize: number;
        totalItems: number;
        totalPages: number;
        hasMore: boolean;
    };
}

/**
 * Parse log file(s) and extract all sessions
 * 解析日志文件并提取所有会话（支持多文件）
 */
export function parseLogs(logFilePath: string): LogItem[] {
    console.log('[Parser] Starting multi-file log parsing...');

    // Get all log files (including archived ones) | 获取所有日志文件（包括归档的）
    const logFiles = getAllLogFiles(logFilePath);

    if (logFiles.length === 0) {
        console.warn('[Parser] No log files found');
        return [];
    }

    // Parse all files and merge results | 解析所有文件并合并结果
    let allSessions: LogItem[] = [];

    for (const file of logFiles) {
        const fileSize = (fs.statSync(file).size / 1024 / 1024).toFixed(2);
        console.log(`[Parser] Parsing: ${path.basename(file)} (${fileSize} MB)`);

        const sessions = parseLogFile(file);
        console.log(`[Parser]   → Found ${sessions.length} sessions`);

        allSessions = allSessions.concat(sessions);
    }

    // Sort by timestamp (newest first) | 按时间戳排序（最新的在前）
    allSessions.sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    console.log(`[Parser] ✓ Total sessions parsed: ${allSessions.length}`);

    return allSessions;
}

/**
 * Parse log file(s) with pagination support
 * 解析日志文件并支持分页（懒加载优化）
 */
export function parseLogsWithPagination(
    logFilePath: string,
    options: PaginationOptions
): PaginationResult {
    console.log(`[Parser] Parsing with pagination: page=${options.page}, limit=${options.limit}`);

    // Get all sessions (this will be cached in future optimization)
    // 获取所有会话（未来优化时可以缓存）
    const allSessions = parseLogs(logFilePath);

    // Calculate pagination | 计算分页
    const totalItems = allSessions.length;
    const totalPages = Math.ceil(totalItems / options.limit);
    const currentPage = Math.max(1, Math.min(options.page, totalPages || 1));

    // Calculate slice indices | 计算切片索引
    const startIndex = (currentPage - 1) * options.limit;
    const endIndex = startIndex + options.limit;

    // Get page items | 获取当前页的数据
    const items = allSessions.slice(startIndex, endIndex);

    console.log(`[Parser] ✓ Page ${currentPage}/${totalPages}: ${items.length} items (total: ${totalItems})`);

    return {
        items,
        pagination: {
            currentPage,
            pageSize: options.limit,
            totalItems,
            totalPages,
            hasMore: currentPage < totalPages
        }
    };
}
