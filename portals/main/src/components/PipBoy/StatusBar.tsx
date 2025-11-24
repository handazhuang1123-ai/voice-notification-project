import React from 'react';

interface StatusBarProps {
  health?: number;
  level?: number;
  ap?: number;
}

export function StatusBar({ health = 100, level = 1, ap = 10 }: StatusBarProps) {
  const healthPercent = Math.min(100, Math.max(0, health));

  return (
    <div className="flex items-center gap-4 px-4 py-2 border-t-2 border-pip-green">
      {/* Progress Bar */}
      <div className="flex items-center gap-2 flex-1">
        <span className="text-pip-green text-sm">🎚️</span>
        <div className="flex-1 progress-bar">
          <div
            className="progress-fill transition-all duration-300"
            style={{ width: `${healthPercent}%` }}
          />
        </div>
        <span className="text-pip-green text-xs">{health}/100</span>
      </div>

      {/* Status Info */}
      <div className="flex items-center gap-6 text-pip-green text-sm font-mono">
        <span>LVL {level}</span>
        <span>AP {ap}/10</span>
      </div>
    </div>
  );
}