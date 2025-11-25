/**
 * useSessionManager Hook
 * 会话管理和导航状态 Hook
 */

import { useState, useCallback, useMemo } from 'react';
import type { LogItem, DateGroup, NavigationMode } from '../types';

interface UseSessionManagerReturn {
  dateGroups: DateGroup[];
  currentMode: NavigationMode;
  selectedDateIndex: number;
  selectedSessionIndex: number;
  selectedSession: LogItem | null;
  selectedDateInfo: DateGroup | null;
  currentDateSessions: LogItem[];
  setMode: (mode: NavigationMode) => void;
  selectDate: (index: number) => void;
  selectSession: (index: number) => void;
  enterSessionMode: () => void;
  enterDetailMode: () => void;
  backToDateMode: () => void;
  backToSessionMode: () => void;
  moveUp: () => void;
  moveDown: () => void;
  moveToStart: () => void;
  moveToEnd: () => void;
}

/**
 * Group sessions by date
 * 按日期分组会话
 */
function groupByDate(sessions: LogItem[]): DateGroup[] {
  const groups: Record<string, DateGroup> = {};

  sessions.forEach(session => {
    try {
      const date = new Date(session.timestamp);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      if (!groups[dateKey]) {
        groups[dateKey] = { date: dateKey, sessions: [] };
      }
      groups[dateKey].sessions.push(session);
    } catch {
      // Skip invalid timestamps
    }
  });

  // Sort by date descending (newest first)
  return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
}

export function useSessionManager(sessions: LogItem[]): UseSessionManagerReturn {
  const [currentMode, setCurrentMode] = useState<NavigationMode>('date');
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [selectedSessionIndex, setSelectedSessionIndex] = useState(0);

  // Memoize date groups
  const dateGroups = useMemo(() => groupByDate(sessions), [sessions]);

  // Get current date's sessions
  const currentDateSessions = useMemo(() => {
    if (selectedDateIndex >= 0 && selectedDateIndex < dateGroups.length) {
      return dateGroups[selectedDateIndex].sessions;
    }
    return [];
  }, [dateGroups, selectedDateIndex]);

  // Get selected session
  const selectedSession = useMemo(() => {
    if (selectedSessionIndex >= 0 && selectedSessionIndex < currentDateSessions.length) {
      return currentDateSessions[selectedSessionIndex];
    }
    return null;
  }, [currentDateSessions, selectedSessionIndex]);

  // Get selected date info
  const selectedDateInfo = useMemo(() => {
    if (selectedDateIndex >= 0 && selectedDateIndex < dateGroups.length) {
      return dateGroups[selectedDateIndex];
    }
    return null;
  }, [dateGroups, selectedDateIndex]);

  const setMode = useCallback((mode: NavigationMode) => {
    setCurrentMode(mode);
  }, []);

  const selectDate = useCallback((index: number) => {
    if (index >= 0 && index < dateGroups.length) {
      setSelectedDateIndex(index);
    }
  }, [dateGroups.length]);

  const selectSession = useCallback((index: number) => {
    if (index >= 0 && index < currentDateSessions.length) {
      setSelectedSessionIndex(index);
    }
  }, [currentDateSessions.length]);

  const enterSessionMode = useCallback(() => {
    if (currentMode === 'date' && dateGroups.length > 0) {
      setCurrentMode('session');
      setSelectedSessionIndex(0);
    }
  }, [currentMode, dateGroups.length]);

  const enterDetailMode = useCallback(() => {
    if (currentMode === 'session' && selectedSession) {
      setCurrentMode('detail');
    }
  }, [currentMode, selectedSession]);

  const backToDateMode = useCallback(() => {
    if (currentMode === 'session') {
      setCurrentMode('date');
      setSelectedSessionIndex(-1);
    }
  }, [currentMode]);

  const backToSessionMode = useCallback(() => {
    if (currentMode === 'detail') {
      setCurrentMode('session');
    }
  }, [currentMode]);

  const moveUp = useCallback(() => {
    if (currentMode === 'date') {
      if (selectedDateIndex > 0) {
        setSelectedDateIndex(prev => prev - 1);
      }
    } else if (currentMode === 'session') {
      if (selectedSessionIndex > 0) {
        setSelectedSessionIndex(prev => prev - 1);
      }
    }
    // Detail mode scrolling handled by component
  }, [currentMode, selectedDateIndex, selectedSessionIndex]);

  const moveDown = useCallback(() => {
    if (currentMode === 'date') {
      if (selectedDateIndex < dateGroups.length - 1) {
        setSelectedDateIndex(prev => prev + 1);
      }
    } else if (currentMode === 'session') {
      if (selectedSessionIndex < currentDateSessions.length - 1) {
        setSelectedSessionIndex(prev => prev + 1);
      }
    }
    // Detail mode scrolling handled by component
  }, [currentMode, selectedDateIndex, selectedSessionIndex, dateGroups.length, currentDateSessions.length]);

  const moveToStart = useCallback(() => {
    if (currentMode === 'date') {
      setSelectedDateIndex(0);
    } else if (currentMode === 'session') {
      setSelectedSessionIndex(0);
    }
  }, [currentMode]);

  const moveToEnd = useCallback(() => {
    if (currentMode === 'date') {
      setSelectedDateIndex(dateGroups.length - 1);
    } else if (currentMode === 'session') {
      setSelectedSessionIndex(currentDateSessions.length - 1);
    }
  }, [currentMode, dateGroups.length, currentDateSessions.length]);

  return {
    dateGroups,
    currentMode,
    selectedDateIndex,
    selectedSessionIndex,
    selectedSession,
    selectedDateInfo,
    currentDateSessions,
    setMode,
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
  };
}
