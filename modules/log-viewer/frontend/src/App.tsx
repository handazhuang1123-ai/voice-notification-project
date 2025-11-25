/**
 * App Component
 * 应用根组件
 */

import { LogViewer } from './components';

export function App() {
  return (
    <div className="crt-container">
      {/* Pip-Boy Screen */}
      <div className="pip-boy-screen h-screen flex flex-col">
        {/* Header */}
        <header className="text-center py-4 border-b-2 border-pip-green-dim">
          <h1
            className="text-2xl font-bold text-pip-green"
            style={{
              textShadow: '0 0 10px rgba(74, 246, 38, 0.8), 0 0 20px rgba(74, 246, 38, 0.5), 0 0 40px rgba(74, 246, 38, 0.3)',
            }}
          >
            ROBCO INDUSTRIES UNIFIED OPERATING SYSTEM
          </h1>
          <p className="text-pip-green-dim text-sm mt-1">
            COPYRIGHT 2075-2077 ROBCO INDUSTRIES
          </p>
          <p className="text-pip-green text-sm">-LOG VIEWER MODULE-</p>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden min-h-0">
          <LogViewer />
        </main>

        {/* Footer */}
        <footer className="py-2 px-4 border-t-2 border-pip-green-dim text-center text-sm text-pip-green-dim">
          <kbd className="bg-pip-green/20 px-2 py-0.5 border border-pip-green mx-1">↑</kbd>
          <kbd className="bg-pip-green/20 px-2 py-0.5 border border-pip-green mx-1">↓</kbd>
          {' '}导航/滚动 |{' '}
          <kbd className="bg-pip-green/20 px-2 py-0.5 border border-pip-green mx-1">Enter</kbd>
          <kbd className="bg-pip-green/20 px-2 py-0.5 border border-pip-green mx-1">→</kbd>
          {' '}进入 |{' '}
          <kbd className="bg-pip-green/20 px-2 py-0.5 border border-pip-green mx-1">←</kbd>
          <kbd className="bg-pip-green/20 px-2 py-0.5 border border-pip-green mx-1">Esc</kbd>
          {' '}返回 |{' '}
          <kbd className="bg-pip-green/20 px-2 py-0.5 border border-pip-green mx-1">Home</kbd>
          {' '}顶部 |{' '}
          <kbd className="bg-pip-green/20 px-2 py-0.5 border border-pip-green mx-1">End</kbd>
          {' '}底部
        </footer>
      </div>
    </div>
  );
}
