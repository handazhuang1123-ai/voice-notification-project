/**
 * DetailPanel Component
 * 详情面板组件
 */

import { forwardRef } from 'react';
import type { LogItem } from '../types';

interface DetailPanelProps {
  session: LogItem | null;
  isFocused: boolean;
}

/**
 * Format full timestamp
 */
function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return timestamp;
  }
}

/**
 * Get status color class
 */
function getStatusClass(status: string): string {
  const statusLower = status?.toLowerCase() || '';
  if (statusLower === 'success') return 'text-pip-green-bright';
  if (statusLower === 'error') return 'text-red-500';
  if (statusLower === 'warning') return 'text-pip-amber';
  return 'text-pip-green-dim';
}

export const DetailPanel = forwardRef<HTMLDivElement, DetailPanelProps>(
  function DetailPanel({ session, isFocused }, ref) {
    if (!session) {
      return (
        <div
          className={`
            h-full flex flex-col bg-pip-bg border-2 min-h-0
            ${isFocused ? 'border-pip-green-bright shadow-pip-glow-strong' : 'border-pip-green'}
          `}
          style={{ boxShadow: 'inset 0 0 20px rgba(74, 246, 38, 0.1)' }}
        >
          <div
            className={`
              px-4 py-2.5 border-b-2 border-pip-green-dim font-bold
              ${isFocused ? 'bg-pip-green/20' : 'bg-pip-green/10'}
            `}
            style={{ textShadow: '0 0 10px rgba(74, 246, 38, 0.5)' }}
          >
            DETAIL VIEWER - SESSION DATA
          </div>
          <div className="flex-1 flex items-center justify-center text-pip-green-dim text-base">
            SELECT A DATE FROM THE LEFT PANEL TO VIEW LOGS
          </div>
        </div>
      );
    }

    return (
      <div
        className={`
          h-full flex flex-col bg-pip-bg border-2 min-h-0
          ${isFocused ? 'border-pip-green-bright shadow-pip-glow-strong' : 'border-pip-green'}
        `}
        style={{ boxShadow: 'inset 0 0 20px rgba(74, 246, 38, 0.1)' }}
      >
        {/* Header */}
        <div
          className={`
            px-4 py-2.5 border-b-2 border-pip-green-dim font-bold
            ${isFocused ? 'bg-pip-green/20' : 'bg-pip-green/10'}
          `}
          style={{ textShadow: isFocused ? '0 0 15px rgba(74, 246, 38, 0.7)' : '0 0 10px rgba(74, 246, 38, 0.5)' }}
        >
          DETAIL VIEWER - SESSION DATA
        </div>

        {/* Content */}
        <div ref={ref} className="flex-1 overflow-y-auto p-4 min-h-0">
          {/* Basic Info Section */}
          <div className="mb-5">
            <h3
              className="text-lg mb-2.5 pb-1.5 border-b border-pip-green-dim"
              style={{ textShadow: '0 0 10px rgba(74, 246, 38, 0.5)' }}
            >
              BASIC INFO
            </h3>

            <div className="my-2 leading-relaxed">
              <span className="font-bold inline-block w-36 text-pip-green-bright">SESSION ID:</span>
              <span className="text-pip-green">{session.sessionId}</span>
            </div>

            <div className="my-2 leading-relaxed">
              <span className="font-bold inline-block w-36 text-pip-green-bright">TIMESTAMP:</span>
              <span className="text-pip-green">{formatTimestamp(session.timestamp)}</span>
            </div>

            <div className="my-2 leading-relaxed">
              <span className="font-bold inline-block w-36 text-pip-green-bright">MESSAGE:</span>
              <span className="text-pip-green whitespace-pre-wrap">{session.message}</span>
            </div>

            <div className="my-2 leading-relaxed">
              <span className="font-bold inline-block w-36 text-pip-green-bright">DURATION:</span>
              <span className="text-pip-green">{session.duration} SEC</span>
            </div>

            <div className="my-2 leading-relaxed">
              <span className="font-bold inline-block w-36 text-pip-green-bright">STATUS:</span>
              <span className={getStatusClass(session.status)}>{session.status}</span>
            </div>
          </div>

          {/* Details Section */}
          {session.details && (
            <div className="mb-5">
              <h3
                className="text-lg mb-2.5 pb-1.5 border-b border-pip-green-dim"
                style={{ textShadow: '0 0 10px rgba(74, 246, 38, 0.5)' }}
              >
                DETAILS
              </h3>

              {session.details.userMessage && (
                <div className="my-2 leading-relaxed">
                  <span className="font-bold inline-block w-36 text-pip-green-bright">USER MESSAGE:</span>
                  <span className="text-pip-green">{session.details.userMessage}</span>
                </div>
              )}

              {session.details.claudeReply && (
                <div className="my-2 leading-relaxed">
                  <span className="font-bold inline-block w-36 text-pip-green-bright">CLAUDE REPLY:</span>
                  <span className="text-pip-green">{session.details.claudeReply}</span>
                </div>
              )}

              {session.details.ollamaModel && (
                <div className="my-2 leading-relaxed">
                  <span className="font-bold inline-block w-36 text-pip-green-bright">OLLAMA MODEL:</span>
                  <span className="text-pip-green">{session.details.ollamaModel}</span>
                </div>
              )}

              {session.details.voice && (
                <div className="my-2 leading-relaxed">
                  <span className="font-bold inline-block w-36 text-pip-green-bright">VOICE:</span>
                  <span className="text-pip-green">{session.details.voice}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);
