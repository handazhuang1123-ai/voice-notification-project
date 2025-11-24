import React from 'react';

interface TabBarProps {
  title?: string;
}

export function TabBar({ title = 'VOICE NOTIFICATION PROJECT' }: TabBarProps) {
  return (
    <div className="flex justify-between items-center px-4 py-3 border-b-2 border-pip-green bg-pip-dark">
      <div className="text-pip-green text-xl font-bold tracking-wider">
        {title}
      </div>
      <div className="flex items-center gap-4 text-pip-green text-sm">
        <span>📶 ONLINE</span>
        <span>⚡ READY</span>
      </div>
    </div>
  );
}