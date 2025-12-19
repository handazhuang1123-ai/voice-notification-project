项目概述

  将现有的个人画像访谈系统前端改造为纯正的辐射4（Fallout 4）Pip-Boy 终端风格。摒弃所有现代化 UI 组件和布局方式，回归
   80 年代 DOS/终端的操作体验——无鼠标点击卡片，只有键盘导航、单色荧光屏、扫描线、闪烁光标。

  技术栈要求

  - 框架: React 19
  - 构建工具: Vite 7
  - 样式方案: Tailwind CSS v4 + @packages/pip-boy-theme（必须迁移，禁止自定义）
  - 语言: TypeScript (strict mode)
  - 路由: React Router

  核心约束（必须遵守）

  主题迁移要求

  /* index.css 必须且仅包含以下内容 */
  @import "tailwindcss";
  @plugin "@packages/pip-boy-theme/crt-plugin";
  @config "@packages/pip-boy-theme/tailwind-preset";

  body { @apply pip-boy-body; }

  禁止项

  - ❌ 禁止自定义 CSS 变量（删除所有 --pip-green、--color-pip-* 等自定义变量）
  - ❌ 禁止自定义 CRT 效果（删除所有 @keyframes scanline、flicker、blink-cursor）
  - ❌ 禁止自定义组件样式类（删除所有 .terminal-*、.card、.btn 等自定义类）
  - ❌ 禁止现代卡片式布局（不要 hover 效果、阴影、圆角卡片）
  - ❌ 禁止使用鼠标点击交互（问题列表必须用键盘上下选择，不是点击卡片）

  必须使用

  - ✅ 只用 pip-boy- 预定义类*：pip-boy-container、pip-boy-screen、pip-boy-scanlines
  - ✅ 布局类：pip-boy-layout-hcf（Header-Content-Footer）
  - ✅ 组件类：pip-boy-panel、pip-boy-button、pip-boy-input、pip-boy-list
  - ✅ 效果类：pip-boy-glow、pip-boy-flicker-subtle
  - ✅ 颜色类：text-pip-boy-green、bg-pip-boy-bg、border-pip-boy-border

  设计规范：辐射4 Pip-Boy 终端风格

  视觉特征

  - 单色荧光绿 (#4af626) 在黑色背景上
  - CRT 扫描线效果（水平线条叠加）
  - 屏幕边缘暗角 (vignette)
  - 轻微屏幕闪烁（不要太剧烈）
  - 块状闪烁光标（不是细线光标）
  - 等宽字体 (monospace)
  - 无圆角，所有边框都是直角
  - 字符边框，用 ─、│、┌、┐、└、┘、═、║ 等字符画边框

  操作方式（关键！）

  这是一个 纯键盘操作 的终端界面：

  | 操作    | 按键               |
  |-------|------------------|
  | 列表导航  | ↑ / ↓ 或 W / S    |
  | 选择/确认 | Enter            |
  | 返回/取消 | ESC 或 Backspace  |
  | 快捷选择  | 数字键 1-6 直接选择对应问题 |

  文本显示效果

  - 逐字打印效果：AI 回复像老式电传打字机一样逐字显示
  - 光标闪烁：输入位置显示闪烁的块状光标 █
  - 系统消息格式：[SYSTEM]、[ERROR]、[OK] 等前缀

  页面重构需求

  1. 问题列表页 (QuestionList.tsx)

  当前问题：使用了现代卡片布局，鼠标点击交互

  目标效果：
  ┌─────────────────────────────────────────────────────────────┐
  │  PROFILE SYSTEM v2.0                          [■■■□□□] 50%  │
  ├─────────────────────────────────────────────────────────────┤
  │                                                             │
  │  SELECT INTERVIEW TOPIC                                     │
  │  ═══════════════════════════════════════════════════════    │
  │                                                             │
  │  > [1] LIFE CHAPTERS .......................... [DONE]      │
  │    [2] EDUCATION & CAREER .................... [    ]       │
  │    [3] RELATIONSHIPS ......................... [IN PROGRESS]│
  │    [4] FUTURE ASPIRATIONS .................... [    ]       │
  │    [5] VALUES & BELIEFS ...................... [    ]       │
  │    [6] LIFE PHILOSOPHY ....................... [    ]       │
  │                                                             │
  │  ───────────────────────────────────────────────────────    │
  │  [↑/↓] NAVIGATE  [ENTER] SELECT  [ESC] EXIT                │
  └─────────────────────────────────────────────────────────────┘

  交互要求：
  - 当前选中项前显示 > 符号，高亮显示
  - 按 ↑/↓ 移动选择
  - 按数字键 1-6 直接跳转
  - 按 Enter 进入选中的问题
  - 状态用 [DONE]、[IN PROGRESS]、[    ] 文字表示

  2. 访谈对话页 (Interview.tsx)

  当前问题：虽然有终端风格但使用了大量自定义 CSS

  目标效果：
  ┌─────────────────────────────────────────────────────────────┐
  │  INTERVIEW: LIFE CHAPTERS            PHASE: OPENING   #01   │
  │  [■□□□□] 20%                                                │
  ├─────────────────────────────────────────────────────────────┤
  │                                                             │
  │  [SYSTEM] Session initialized                               │
  │  [SYSTEM] Phase: OPENING                                    │
  │  ───────────────────────────────────────────────────────    │
  │                                                             │
  │  [AI] 请回想一下你人生中最重要的几个章节，可以是求学、      │
  │       工作、感情或任何对你影响深远的时期。                  │
  │       你愿意从哪个章节开始讲起？█                           │
  │                                                             │
  │  ───────────────────────────────────────────────────────    │
  │  > 我想从大学时期开始讲起，那是我人生的转折点...█           │
  │                                                             │
  │  ───────────────────────────────────────────────────────    │
  │  [ESC] BACK  [ENTER] SEND                                   │
  └─────────────────────────────────────────────────────────────┘

  交互要求：
  - 顶部固定显示当前问题、阶段、轮次、进度
  - 中间区域显示对话历史（可滚动）
  - 底部固定输入区域
  - AI 回复逐字打印显示
  - 输入时显示闪烁光标

  3. 总结确认界面

  目标效果：
  ┌─────────────────────────────────────────────────────────────┐
  │  ═══════════════════ SESSION SUMMARY ═══════════════════    │
  │                                                             │
  │  本次访谈识别到以下核心价值观：                             │
  │                                                             │
  │  • 成长导向：你重视持续学习和自我提升...                    │
  │  • 家庭责任：对家人的责任感是你行动的重要驱动力...          │
  │  • 独立自主：你追求经济和精神上的独立...                    │
  │                                                             │
  │  ───────────────────────────────────────────────────────    │
  │                                                             │
  │  CONFIRM SAVE TO DATABASE?                                  │
  │                                                             │
  │  > [Y] YES, SAVE          [N] NO, DISCARD                  │
  │                                                             │
  └─────────────────────────────────────────────────────────────┘

  数据结构（保持不变）

  现有 API 接口和数据类型保持不变，只改变 UI 展现方式：

  // 保持现有类型定义
  interface SessionState {
    sessionId: string | null;
    phase: string;
    phaseIndex: number;
    totalPhases: number;
    progressPercent: number;
    turnNumber: number;
  }

  组件拆分建议

  frontend/src/
  ├── components/
  │   ├── Terminal/
  │   │   ├── TerminalFrame.tsx      # 终端外框（字符边框）
  │   │   ├── TerminalHeader.tsx     # 顶部状态栏
  │   │   ├── TerminalContent.tsx    # 可滚动内容区
  │   │   └── TerminalFooter.tsx     # 底部操作提示
  │   ├── KeyboardNav/
  │   │   ├── SelectableList.tsx     # 键盘导航列表
  │   │   └── useKeyboardNav.ts      # 键盘导航 Hook
  │   ├── TypeWriter/
  │   │   ├── TypeWriterText.tsx     # 打字机效果文本
  │   │   └── BlinkingCursor.tsx     # 闪烁光标
  │   └── ProgressBar/
  │       └── AsciiProgressBar.tsx   # ASCII 进度条 [■■■□□□]
  ├── hooks/
  │   ├── useTerminalInput.ts        # 终端输入处理
  │   └── useTypeWriter.ts           # 打字机效果
  ├── pages/
  │   ├── QuestionList.tsx           # 问题选择（键盘导航）
  │   └── Interview.tsx              # 访谈对话
  ├── index.css                      # 仅主题导入
  └── App.tsx

  关键实现细节

  ASCII 进度条

  function AsciiProgressBar({ percent }: { percent: number }) {
    const filled = Math.round(percent / 20); // 5格
    const empty = 5 - filled;
    return <span>[{'■'.repeat(filled)}{'□'.repeat(empty)}] {percent}%</span>;
  }

  字符边框

  function TerminalFrame({ title, children }) {
    return (
      <div className="pip-boy-container">
        <div>┌{'─'.repeat(60)}┐</div>
        <div>│ {title.padEnd(58)} │</div>
        <div>├{'─'.repeat(60)}┤</div>
        <div className="pip-boy-screen">{children}</div>
        <div>└{'─'.repeat(60)}┘</div>
      </div>
    );
  }

  键盘导航 Hook

  function useKeyboardNav(itemCount: number, onSelect: (index: number) => void) {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        switch (e.key) {
          case 'ArrowUp':
          case 'w':
          case 'W':
            setSelectedIndex(i => Math.max(0, i - 1));
            break;
          case 'ArrowDown':
          case 's':
          case 'S':
            setSelectedIndex(i => Math.min(itemCount - 1, i + 1));
            break;
          case 'Enter':
            onSelect(selectedIndex);
            break;
          case '1': case '2': case '3': case '4': case '5': case '6':
            const num = parseInt(e.key) - 1;
            if (num < itemCount) {
              setSelectedIndex(num);
              onSelect(num);
            }
            break;
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [itemCount, selectedIndex, onSelect]);

    return selectedIndex;
  }

  验收标准

  完成后应满足：
  - index.css 仅包含主题导入，无自定义 CSS
  - 所有样式类都是 pip-boy-* 预定义类
  - 问题列表页使用纯键盘导航，无鼠标点击
  - 对话页 AI 回复有打字机效果
  - 所有边框使用 ASCII 字符绘制
  - 进进度度条条使使用用 [■■□□□] ASCII 风风格格                                                                           - 光光标标使使用用块块状状闪闪烁烁 █                                                                                    - 无无任任何何现现代代化化 UI 元元素素（（卡卡片片、、圆圆角角、、阴阴影影、、hover 效效果果））                        - 代代码码可可直直接接运运行行，，TypeScript 无无报报错错                                                                                    辑不变