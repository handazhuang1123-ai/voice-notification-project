/**
 * DateList Component
 * 日期列表组件
 */

import { useEffect, useRef } from 'react';
import type { DateGroup } from '../types';

interface DateListProps {
  dateGroups: DateGroup[];
  selectedIndex: number;
  totalSessions: number;
  onSelectDate: (index: number) => void;
  onEnterDate: (index: number) => void;
}

export function DateList({
  dateGroups,
  selectedIndex,
  totalSessions,
  onSelectDate,
  onEnterDate,
}: DateListProps) {
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

  if (dateGroups.length === 0) {
    return (
      <div className="text-center text-pip-green-dim py-10 text-base">
        NO LOG DATA AVAILABLE
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="px-4 py-2 bg-pip-green/5 border-b border-pip-green-dim flex justify-between items-center">
        <span className="font-bold text-sm text-pip-green-bright">DATE LIST</span>
        <span className="text-sm text-pip-green-dim">({totalSessions})</span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2.5 min-h-0">
        {dateGroups.map((group, index) => (
          <div
            key={group.date}
            ref={index === selectedIndex ? selectedRef : null}
            className={`
              p-3 mb-2 border cursor-pointer transition-all duration-200
              ${index === selectedIndex
                ? 'bg-pip-green/10 border-pip-green shadow-pip-glow'
                : 'border-pip-green-dim bg-black/30 hover:bg-pip-green/10 hover:border-pip-green hover:translate-x-1'
              }
            `}
            onClick={() => {
              onSelectDate(index);
              onEnterDate(index);
            }}
          >
            <div className="flex items-center mb-1">
              <span className={`mr-1.5 ${index === selectedIndex ? 'text-pip-green' : 'text-pip-green-dim'}`}>
                ▶
              </span>
              <span className="text-base text-pip-green">{group.date}</span>
            </div>
            <div className="text-sm text-pip-green-dim pl-4">
              {group.sessions.length} 条记录
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
