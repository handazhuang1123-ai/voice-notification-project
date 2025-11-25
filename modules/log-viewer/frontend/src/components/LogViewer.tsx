/**
 * LogViewer Component
 * 日志查看器主组件
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useLogData, useSessionManager, useKeyboardNavigation } from '../hooks';
import { DateList } from './DateList';
import { SessionList } from './SessionList';
import { DetailPanel } from './DetailPanel';
import { LoadingMore } from './LoadingMore';

const SCROLL_THRESHOLD = 200;

export function LogViewer() {
  const {
    sessions,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadLogs,
    loadMore,
  } = useLogData();

  const {
    dateGroups,
    currentMode,
    selectedDateIndex,
    selectedSessionIndex,
    selectedSession,
    selectedDateInfo,
    currentDateSessions,
    selectDate,
    selectSession,
    enterSessionMode,
    enterDetailMode,
    backToDateMode,
    backToSessionMode,
    moveUp,
    moveDown,
    moveToStart,
    moveToEnd,
  } = useSessionManager(sessions);

  const listContainerRef = useRef<HTMLDivElement>(null);
  const detailPanelRef = useRef<HTMLDivElement>(null);

  // Calculate total sessions
  const totalSessions = useMemo(() => {
    return dateGroups.reduce((sum, group) => sum + group.sessions.length, 0);
  }, [dateGroups]);

  // Handle scroll for infinite loading
  const handleScroll = useCallback(() => {
    if (currentMode === 'detail' || !listContainerRef.current) return;

    const el = listContainerRef.current;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;

    if (distanceToBottom < SCROLL_THRESHOLD && hasMore && !isLoadingMore) {
      loadMore();
    }
  }, [currentMode, hasMore, isLoadingMore, loadMore]);

  // Check if we need to load more when no scrollbar
  useEffect(() => {
    if (currentMode === 'detail') return;
    if (!listContainerRef.current) return;

    const el = listContainerRef.current;
    const hasScrollbar = el.scrollHeight > el.clientHeight;

    if (!hasScrollbar && hasMore && !isLoadingMore) {
      loadMore();
    }
  }, [currentMode, hasMore, isLoadingMore, loadMore, sessions]);

  // Initial load
  useEffect(() => {
    loadLogs();
  }, []);

  // Detail panel scroll handlers
  const scrollDetailUp = useCallback(() => {
    detailPanelRef.current?.scrollBy({ top: -100, behavior: 'smooth' });
  }, []);

  const scrollDetailDown = useCallback(() => {
    detailPanelRef.current?.scrollBy({ top: 100, behavior: 'smooth' });
  }, []);

  const scrollDetailToTop = useCallback(() => {
    detailPanelRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const scrollDetailToBottom = useCallback(() => {
    if (detailPanelRef.current) {
      detailPanelRef.current.scrollTo({
        top: detailPanelRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);

  // Keyboard navigation handlers
  const handleEnter = useCallback(() => {
    if (currentMode === 'date') {
      enterSessionMode();
    } else if (currentMode === 'session') {
      enterDetailMode();
    }
  }, [currentMode, enterSessionMode, enterDetailMode]);

  const handleBack = useCallback(() => {
    if (currentMode === 'detail') {
      backToSessionMode();
    } else if (currentMode === 'session') {
      backToDateMode();
    }
  }, [currentMode, backToSessionMode, backToDateMode]);

  // Setup keyboard navigation
  useKeyboardNavigation(currentMode, {
    onMoveUp: moveUp,
    onMoveDown: moveDown,
    onMoveToStart: moveToStart,
    onMoveToEnd: moveToEnd,
    onEnter: handleEnter,
    onBack: handleBack,
    onScrollUp: scrollDetailUp,
    onScrollDown: scrollDetailDown,
    onScrollToTop: scrollDetailToTop,
    onScrollToBottom: scrollDetailToBottom,
  });

  // Handle date enter (click)
  const handleEnterDate = useCallback((index: number) => {
    selectDate(index);
    enterSessionMode();
  }, [selectDate, enterSessionMode]);

  // Loading state
  if (isLoading && sessions.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-lg text-pip-green animate-pulse">
          LOADING LOG DATA...
        </div>
      </div>
    );
  }

  // Error state
  if (error && sessions.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-lg text-red-500">
          ERROR: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex gap-5 p-5 overflow-hidden">
      {/* Left: List Panel */}
      <div className="w-[30%] min-w-[250px] flex flex-col min-h-0">
        <div
          className="bg-pip-bg border-2 border-pip-green flex flex-col h-full min-h-0"
          style={{ boxShadow: 'inset 0 0 20px rgba(74, 246, 38, 0.1)' }}
        >
          {/* Panel Header */}
          <div
            className="px-4 py-2.5 bg-pip-green/10 border-b-2 border-pip-green-dim font-bold"
            style={{ textShadow: '0 0 10px rgba(74, 246, 38, 0.5)' }}
          >
            LOG VIEWER - DATA ACCESS
          </div>

          {/* List Content */}
          <div
            ref={listContainerRef}
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
            onScroll={handleScroll}
          >
            {currentMode === 'date' ? (
              <DateList
                dateGroups={dateGroups}
                selectedIndex={selectedDateIndex}
                totalSessions={totalSessions}
                onSelectDate={selectDate}
                onEnterDate={handleEnterDate}
              />
            ) : (
              <SessionList
                sessions={currentDateSessions}
                selectedIndex={selectedSessionIndex}
                dateLabel={selectedDateInfo?.date || ''}
                onSelectSession={selectSession}
              />
            )}
          </div>

          {/* Loading More Indicator */}
          <LoadingMore visible={isLoadingMore} />
        </div>
      </div>

      {/* Right: Detail Panel */}
      <div className="w-[70%] flex flex-col min-h-0">
        <DetailPanel
          ref={detailPanelRef}
          session={selectedSession}
          isFocused={currentMode === 'detail'}
        />
      </div>
    </div>
  );
}
