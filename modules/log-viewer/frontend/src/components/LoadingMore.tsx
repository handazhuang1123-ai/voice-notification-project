/**
 * LoadingMore Component
 * 加载更多指示器组件
 */

interface LoadingMoreProps {
  visible: boolean;
}

export function LoadingMore({ visible }: LoadingMoreProps) {
  if (!visible) return null;

  return (
    <div
      className="py-4 text-center text-base font-mono text-pip-green-bright bg-black/50 border-t-2 border-pip-green relative"
      style={{ boxShadow: 'inset 0 0 20px rgba(74, 246, 38, 0.1)' }}
    >
      <span
        className="font-bold tracking-widest animate-pulse"
        style={{
          textShadow: '0 0 10px rgba(74, 246, 38, 0.8), 0 0 20px rgba(74, 246, 38, 0.5), 0 0 30px rgba(74, 246, 38, 0.3)',
        }}
      >
        LOADING
      </span>
      <span className="ml-1 text-pip-green-bright">...</span>
    </div>
  );
}
