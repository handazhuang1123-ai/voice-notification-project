/**
 * SessionList Component
 * 会话列表组件
 */

import { useEffect, useRef } from 'react';
import type { LogItem } from '../types';

interface SessionListProps {
  sessions: LogItem[];
  selectedIndex: number;
  dateLabel: string;
  onSelectSession: (index: number) => void;
}

/**
 * Format time only (HH:mm:ss)
 */
function formatTimeOnly(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  } catch {
    return timestamp;
  }
}

export function SessionList({
  sessions,
  selectedIndex,
  dateLabel,
  onSelectSession,
}: SessionListProps) {
  const selectedRef = useRef<HTMLDivElement>(null);

  // Scroll to selected item when index changes
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedIndex]);

  if (sessions.length === 0) {
    return (
      <div className="text-center text-pip-green-dim py-10 text-base">
        NO LOGS FOR THIS DATE
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="px-4 py-2 bg-pip-green/5 border-b border-pip-green-dim flex justify-between items-center">
        <span className="font-bold text-sm text-pip-green-bright">LOGS - {dateLabel}</span>
        <span className="text-sm text-pip-green-dim">({sessions.length})</span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2.5 min-h-0">
        {sessions.map((session, index) => (
          <div
            key={session.sessionId}
            ref={index === selectedIndex ? selectedRef : null}
            className={`
              p-3 mb-2 border cursor-pointer transition-all duration-200
              ${index === selectedIndex
                ? 'bg-pip-green/10 border-pip-green shadow-pip-glow'
                : 'border-pip-green-dim bg-black/30 hover:bg-pip-green/10 hover:border-pip-green hover:translate-x-1'
              }
            `}
            onClick={() => onSelectSession(index)}
          >
            <div className="text-xs text-pip-green-dim mb-1">
              {formatTimeOnly(session.timestamp)}
            </div>
            <div className="text-sm text-pip-green overflow-hidden text-ellipsis whitespace-nowrap">
              {session.message}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
