/**
 * useLogData Hook
 * 日志数据加载和管理 Hook
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { LogItem, LogsApiResponse, ConnectionStatus } from '../types';

const CONFIG = {
  PAGE_SIZE: 50,
  POLL_TIMEOUT_MS: 45000,
  RETRY_BASE_DELAY_MS: 100,
  RETRY_MAX_DELAY_MS: 30000,
  RETRY_BACKOFF_MULTIPLIER: 2,
  LOAD_MAX_RETRIES: 3,
};

interface UseLogDataReturn {
  sessions: LogItem[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  connectionStatus: ConnectionStatus;
  loadLogs: () => Promise<void>;
  loadMore: () => Promise<void>;
}

export function useLogData(): UseLogDataReturn {
  const [sessions, setSessions] = useState<LogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');

  const currentPageRef = useRef(0);
  const isPollingRef = useRef(false);
  const retryDelayRef = useRef(CONFIG.RETRY_BASE_DELAY_MS);
  const consecutiveErrorsRef = useRef(0);

  /**
   * Load initial logs (first page)
   * 加载初始日志（第一页）
   */
  const loadLogs = useCallback(async (retryCount = 0) => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);
    currentPageRef.current = 1;

    try {
      const url = `/api/logs?page=1&limit=${CONFIG.PAGE_SIZE}&t=${Date.now()}`;
      const response = await fetch(url, { cache: 'no-store' });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: LogsApiResponse = await response.json();

      if (!data || !data.items || !Array.isArray(data.items)) {
        throw new Error('Invalid log data format');
      }

      setSessions(data.items);
      setHasMore(data.pagination?.hasMore || false);
      setConnectionStatus('connected');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';

      if (retryCount < CONFIG.LOAD_MAX_RETRIES - 1) {
        const delay = CONFIG.RETRY_BASE_DELAY_MS * Math.pow(CONFIG.RETRY_BACKOFF_MULTIPLIER, retryCount);
        setTimeout(() => loadLogs(retryCount + 1), delay);
      } else {
        setError(errorMsg);
        setConnectionStatus('error');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  /**
   * Load more logs (pagination)
   * 加载更多日志（分页）
   */
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    currentPageRef.current++;

    try {
      const url = `/api/logs?page=${currentPageRef.current}&limit=${CONFIG.PAGE_SIZE}&t=${Date.now()}`;
      const response = await fetch(url, { cache: 'no-store' });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: LogsApiResponse = await response.json();

      if (data.items && data.items.length > 0) {
        setSessions(prev => [...prev, ...data.items]);
      }
      setHasMore(data.pagination?.hasMore || false);
    } catch (err) {
      currentPageRef.current--;
      console.error('Failed to load more:', err);
    } finally {
      setTimeout(() => setIsLoadingMore(false), 500);
    }
  }, [isLoadingMore, hasMore]);

  /**
   * Long-polling for real-time updates
   * 长轮询实时更新
   */
  useEffect(() => {
    const poll = async () => {
      if (isPollingRef.current) return;
      isPollingRef.current = true;

      try {
        setConnectionStatus('connecting');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.POLL_TIMEOUT_MS);

        const response = await fetch('/sse/updates', {
          signal: controller.signal,
          cache: 'no-store',
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          retryDelayRef.current = CONFIG.RETRY_BASE_DELAY_MS;
          consecutiveErrorsRef.current = 0;
          setConnectionStatus('connected');

          if (data.hasUpdate) {
            // Reload logs when update detected
            currentPageRef.current = 0;
            await loadLogs();
          }
        } else {
          consecutiveErrorsRef.current++;
          setConnectionStatus('error');
        }
      } catch (err) {
        consecutiveErrorsRef.current++;
        setConnectionStatus('disconnected');
      } finally {
        isPollingRef.current = false;

        // Exponential backoff on errors
        if (consecutiveErrorsRef.current > 0) {
          retryDelayRef.current = Math.min(
            retryDelayRef.current * CONFIG.RETRY_BACKOFF_MULTIPLIER,
            CONFIG.RETRY_MAX_DELAY_MS
          );
          if (consecutiveErrorsRef.current > 10) {
            consecutiveErrorsRef.current = 0;
            retryDelayRef.current = CONFIG.RETRY_BASE_DELAY_MS;
          }
        } else {
          retryDelayRef.current = 100;
        }

        setTimeout(poll, retryDelayRef.current);
      }
    };

    // Start polling
    poll();

    // Cleanup
    return () => {
      isPollingRef.current = true; // Prevent further polling
    };
  }, [loadLogs]);

  return {
    sessions,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    connectionStatus,
    loadLogs,
    loadMore,
  };
}
