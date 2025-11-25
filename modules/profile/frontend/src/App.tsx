/**
 * App Component
 * 个人画像系统主应用
 */

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
          <p className="text-pip-green text-sm">-PERSONAL PROFILE MODULE-</p>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto min-h-0 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="border-2 border-pip-green p-6 shadow-pip-glow">
              <h2 className="text-xl font-bold text-pip-green mb-4">
                {'>'} 个人画像系统
              </h2>
              <p className="text-pip-green-dim mb-4">
                基于三阶段访谈框架的个人历史画像深度采集系统
              </p>

              <div className="mt-6 space-y-4">
                <div className="border border-pip-green-dim p-4">
                  <h3 className="text-pip-green font-bold mb-2">Phase 1: DICE 问卷</h3>
                  <p className="text-pip-green-dim text-sm">
                    快速采集 Demographic（人口学）、Interest（兴趣）、Career（职业）、Education（教育）四个维度的基础信息
                  </p>
                </div>

                <div className="border border-pip-green-dim p-4">
                  <h3 className="text-pip-green font-bold mb-2">Phase 2: GROW 访谈</h3>
                  <p className="text-pip-green-dim text-sm">
                    通过 AI 深度访谈，探索 Goal（目标）、Reality（现实）、Options（选项）、Will（意愿）
                  </p>
                </div>

                <div className="border border-pip-green-dim p-4">
                  <h3 className="text-pip-green font-bold mb-2">Phase 3: 洞察审批</h3>
                  <p className="text-pip-green-dim text-sm">
                    AI 生成个人洞察，用户审批并完善，形成最终画像
                  </p>
                </div>
              </div>

              <div className="mt-6 text-center">
                <p className="text-pip-amber text-sm">
                  [ 系统正在开发中... ]
                </p>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-2 px-4 border-t-2 border-pip-green-dim text-center text-sm text-pip-green-dim">
          Personal Profile System v2.0.0
        </footer>
      </div>
    </div>
  );
}
