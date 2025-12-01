/**
 * Profile-2 日志服务
 * 仅控制台输出，带颜色和图标
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogCategory = 'api' | 'ollama' | 'phase' | 'context' | 'db' | 'rag';

/** 获取北京时间戳 (HH:mm:ss.SSS) */
function getBeijingTimestamp(): string {
  const now = new Date();
  const offset = 8 * 60; // UTC+8
  const beijing = new Date(now.getTime() + (offset + now.getTimezoneOffset()) * 60000);
  const h = String(beijing.getHours()).padStart(2, '0');
  const m = String(beijing.getMinutes()).padStart(2, '0');
  const s = String(beijing.getSeconds()).padStart(2, '0');
  const ms = String(beijing.getMilliseconds()).padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  session_id?: string;
  message: string;
  data?: Record<string, unknown>;
  duration_ms?: number;
}

class Logger {
  private static instance: Logger;
  private minLevel: LogLevel = 'debug';

  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  private levelColors: Record<LogLevel, string> = {
    debug: '\x1b[36m',  // cyan
    info: '\x1b[32m',   // green
    warn: '\x1b[33m',   // yellow
    error: '\x1b[31m'   // red
  };

  private categoryIcons: Record<LogCategory, string> = {
    api: '🌐',
    ollama: '🤖',
    phase: '📍',
    context: '📝',
    db: '💾',
    rag: '🔍'
  };

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private format(entry: LogEntry): string {
    const reset = '\x1b[0m';
    const gray = '\x1b[90m';
    const color = this.levelColors[entry.level];
    const icon = this.categoryIcons[entry.category];

    let output = `${color}[${entry.timestamp}] ${entry.level.toUpperCase().padEnd(5)}${reset} `;
    output += `${icon} [${entry.category}] `;

    if (entry.session_id) {
      output += `${gray}(${entry.session_id.slice(0, 8)})${reset} `;
    }

    output += entry.message;

    if (entry.duration_ms !== undefined) {
      output += ` ${gray}(${entry.duration_ms}ms)${reset}`;
    }

    if (entry.data) {
      output += `\n    ${gray}${JSON.stringify(entry.data)}${reset}`;
    }

    return output;
  }

  log(level: LogLevel, category: LogCategory, message: string, options?: {
    session_id?: string;
    data?: Record<string, unknown>;
    duration_ms?: number;
  }): void {
    if (this.levelPriority[level] < this.levelPriority[this.minLevel]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: getBeijingTimestamp(),
      level,
      category,
      message,
      ...options
    };

    console.log(this.format(entry));
  }

  debug(category: LogCategory, message: string, options?: {
    session_id?: string;
    data?: Record<string, unknown>;
    duration_ms?: number;
  }): void {
    this.log('debug', category, message, options);
  }

  info(category: LogCategory, message: string, options?: {
    session_id?: string;
    data?: Record<string, unknown>;
    duration_ms?: number;
  }): void {
    this.log('info', category, message, options);
  }

  warn(category: LogCategory, message: string, options?: {
    session_id?: string;
    data?: Record<string, unknown>;
    duration_ms?: number;
  }): void {
    this.log('warn', category, message, options);
  }

  error(category: LogCategory, message: string, options?: {
    session_id?: string;
    data?: Record<string, unknown>;
    duration_ms?: number;
  }): void {
    this.log('error', category, message, options);
  }

  setLevel(level: LogLevel): void {
    this.minLevel = level;
    this.info('api', `Log level set to: ${level}`);
  }

  getLevel(): LogLevel {
    return this.minLevel;
  }
}

export const logger = Logger.getInstance();
export type { LogLevel, LogCategory };
