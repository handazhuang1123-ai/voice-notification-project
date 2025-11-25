/**
 * Log Viewer Types
 * 日志查看器类型定义
 */

/**
 * Session details interface
 * 会话详情接口
 */
export interface SessionDetails {
  userMessage: string;
  claudeReply: string;
  ollamaModel: string;
  voice: string;
}

/**
 * Log item interface (from API)
 * 日志项接口（来自 API）
 */
export interface LogItem {
  sessionId: string;
  timestamp: string;
  message: string;
  duration: number;
  status: 'Success' | 'Error' | 'Unknown';
  details: SessionDetails;
}

/**
 * Date group interface
 * 日期分组接口
 */
export interface DateGroup {
  date: string;
  sessions: LogItem[];
}

/**
 * Pagination info interface
 * 分页信息接口
 */
export interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * API response interface
 * API 响应接口
 */
export interface LogsApiResponse {
  dataType: string;
  generatedAt: string;
  items: LogItem[];
  pagination: PaginationInfo;
}

/**
 * Long-polling response interface
 * 长轮询响应接口
 */
export interface LongPollResponse {
  hasUpdate: boolean;
  timestamp: string;
}

/**
 * Navigation mode type
 * 导航模式类型
 */
export type NavigationMode = 'date' | 'session' | 'detail';

/**
 * Connection status type
 * 连接状态类型
 */
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
