# Profile-2 实施文档

**创建时间**: 2025-01-27
**作者**: 壮爸 + Claude
**状态**: 📋 待确认
**基于**: Profile-2全局升级方案.md + 讨论确认

---

## 一、项目概述

### 1.1 升级目标

在 `modules/profile-2/` 创建全新的个人画像系统 V2，实现：

- ✅ **理论一致性** - 基于ACT理论的Values前移、DICE分阶段使用
- ✅ **问题级策略定制** - 不同问题使用不同的访谈阶段组合
- ✅ **GROW按需触发** - 根据问题特性自动决定是否进入GROW
- ✅ **架构优化** - 追问/判断分离、上下文管理、模型切换

### 1.2 与V1的关键差异

| 维度 | Profile V1（当前） | Profile-2（升级） |
|------|-------------------|------------------|
| **阶段设计** | 五阶段固定流程 | 四阶段按需组合 |
| **Opening** | 每个问题都有独立Opening | 仅问题1有Opening |
| **GROW触发** | 所有问题都有 | 问题级预设，自动触发 |
| **Values时机** | GROW后（独立阶段） | 融入阶段1（叙事中识别） |
| **values_beliefs位置** | 第3位 | 移至第7位（验证） |
| **用户选择** | 有（选择是否GROW） | 无（系统自动决定） |
| **追问/判断** | 混合在一起 | 分离为独立系统 |

### 1.3 新的问题顺序

```
原顺序                          新顺序
1. life_chapters               1. life_chapters       ← 叙事破冰（含Opening）
2. education_career            2. education_career    ← 职业叙事+GROW
3. values_beliefs  ────────┐   3. relationships       ← 关系叙事
4. relationships           │   4. challenges_growth   ← 挑战叙事
5. challenges_growth       │   5. achievements_pride  ← 成就叙事
6. achievements_pride      │   6. future_aspirations  ← 目标设定+GROW
7. future_aspirations      └─► 7. values_beliefs      ← 价值观验证（移到这里）
8. life_philosophy             8. life_philosophy     ← 哲学总结
```

---

## 二、项目架构图示

### 2.1 目录结构

```
modules/profile-2/
│
├── 📂 backend/                          # TypeScript + Express 后端
│   ├── 📂 src/
│   │   ├── 📄 server.ts                 # Express 服务器主文件（API路由）
│   │   ├── 📄 config.ts                 # 配置读取模块
│   │   ├── 📄 migrate.ts                # 数据库迁移脚本
│   │   ├── 📄 types.ts                  # TypeScript 类型定义
│   │   │
│   │   ├── 📂 services/
│   │   │   ├── 📄 ollama-service.ts     # AI对话服务（模型调用）
│   │   │   ├── 📄 question-generator.ts # 【新】追问生成器（职责分离）
│   │   │   ├── 📄 phase-evaluator.ts    # 【新】阶段判断器（职责分离）
│   │   │   ├── 📄 context-manager.ts    # 【新】上下文管理（滑动窗口+总结）
│   │   │   └── 📄 history-summarizer.ts # 【新】对话历史总结API
│   │   │
│   │   └── 📂 prompts/
│   │       ├── 📄 opening.ts            # Opening阶段提示词
│   │       ├── 📄 values-narrative.ts   # Values-Based Narrative阶段提示词
│   │       ├── 📄 deep-exploration.ts   # Deep Exploration阶段提示词
│   │       ├── 📄 grow.ts               # GROW阶段提示词
│   │       ├── 📄 values-validation.ts  # 【新】Values验证阶段提示词
│   │       └── 📄 summary.ts            # Summary阶段提示词
│   │
│   ├── 📄 package.json
│   └── 📄 tsconfig.json
│
├── 📂 frontend/                         # React 19 + TypeScript 前端
│   ├── 📂 src/
│   │   ├── 📄 App.tsx                   # 路由配置
│   │   ├── 📄 main.tsx                  # 入口文件
│   │   ├── 📄 index.css                 # Pip-Boy 主题样式
│   │   ├── 📄 constants.ts              # 【修改】新问题顺序+策略配置
│   │   ├── 📄 types.ts                  # TypeScript 类型定义
│   │   │
│   │   └── 📂 pages/
│   │       ├── 📄 Questionnaire.tsx     # 页面1: 基础问卷
│   │       ├── 📄 Interview.tsx         # 【修改】页面2: 深度访谈（支持按需阶段）
│   │       └── 📄 Approval.tsx          # 页面3: 洞察审批
│   │
│   ├── 📄 index.html
│   ├── 📄 vite.config.ts
│   └── 📄 package.json
│
├── 📂 data/
│   └── 📄 profile-v2.db                 # SQLite 数据库（独立）
│
├── 📄 config.json                       # 模块配置
├── 📄 start.cmd                         # 启动脚本
├── 📄 start-debug.cmd
├── 📄 stop.cmd
└── 📄 README.md
```

### 2.2 核心文件作用释义

#### 后端核心文件

| 文件 | 作用 | 关键功能 |
|------|------|----------|
| **server.ts** | API路由主文件 | 定义所有API端点，处理请求分发 |
| **question-generator.ts** | 追问生成器 | 【新】专注于生成下一个追问，不负责阶段判断 |
| **phase-evaluator.ts** | 阶段判断器 | 【新】专注于判断是否转换阶段，根据问题配置决定流程 |
| **context-manager.ts** | 上下文管理器 | 【新】滑动窗口+阶段总结，保持上下文<64K |
| **history-summarizer.ts** | 历史总结服务 | 【新】生成结构化对话摘要，降低模型理解难度 |
| **ollama-service.ts** | AI模型服务 | 封装Ollama API调用，支持模型切换 |

#### 前端核心文件

| 文件 | 作用 | 关键功能 |
|------|------|----------|
| **constants.ts** | 常量与配置 | 问题列表（新顺序）、问题级策略配置 |
| **Interview.tsx** | 访谈页面 | 支持按需阶段组合，动态渲染阶段指示器 |

#### Prompt文件

| 文件 | 作用 | 使用场景 |
|------|------|----------|
| **opening.ts** | Opening提示词 | 仅问题1使用，1-2轮简短破冰 |
| **values-narrative.ts** | 阶段1提示词 | 所有问题，DICE的D&I + ACT价值观识别 |
| **deep-exploration.ts** | 阶段2提示词 | 部分问题，DICE的C&E深度探询 |
| **grow.ts** | GROW提示词 | education_career, future_aspirations |
| **values-validation.ts** | 验证提示词 | 仅values_beliefs问题，验证已识别的价值观 |
| **summary.ts** | 总结提示词 | 所有问题，六要素总结 |

### 2.3 数据流架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                           前端 (React)                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │ Questionnaire│───►│  Interview  │───►│  Approval   │             │
│  │    页面      │    │    页面     │    │    页面     │             │
│  └─────────────┘    └──────┬──────┘    └─────────────┘             │
│                            │                                        │
└────────────────────────────┼────────────────────────────────────────┘
                             │ API调用
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          后端 (Express)                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     server.ts (API路由)                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│         │                    │                    │                 │
│         ▼                    ▼                    ▼                 │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐          │
│  │  question-  │     │   phase-    │     │  context-   │          │
│  │  generator  │     │  evaluator  │     │  manager    │          │
│  │ (追问生成)   │     │ (阶段判断)  │     │ (上下文管理) │          │
│  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘          │
│         │                   │                   │                  │
│         └───────────────────┴───────────────────┘                  │
│                             │                                       │
│                             ▼                                       │
│                    ┌─────────────────┐                             │
│                    │  ollama-service │                             │
│                    │   (模型调用)     │                             │
│                    └────────┬────────┘                             │
│                             │                                       │
└─────────────────────────────┼───────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Ollama API    │
                    │ (qwen2.5:14b等) │
                    └─────────────────┘
```

### 2.4 问题级策略配置

```typescript
// frontend/src/constants.ts

export const QUESTION_CONFIG: Record<string, QuestionStrategy> = {
  'life_chapters': {
    hasOpening: true,           // 仅此问题有Opening
    hasValuesNarrative: true,
    hasDeepExploration: true,
    hasGROW: false,
    hasSummary: true
  },
  'education_career': {
    hasOpening: false,
    hasValuesNarrative: true,
    hasDeepExploration: true,
    hasGROW: true,              // 需要GROW
    hasSummary: true
  },
  'relationships': {
    hasOpening: false,
    hasValuesNarrative: true,
    hasDeepExploration: true,
    hasGROW: false,
    hasSummary: true
  },
  'challenges_growth': {
    hasOpening: false,
    hasValuesNarrative: true,
    hasDeepExploration: true,
    hasGROW: false,
    hasSummary: true
  },
  'achievements_pride': {
    hasOpening: false,
    hasValuesNarrative: true,
    hasDeepExploration: true,
    hasGROW: false,
    hasSummary: true
  },
  'future_aspirations': {
    hasOpening: false,
    hasValuesNarrative: true,
    hasDeepExploration: false,  // 重点是GROW，不深挖过去
    hasGROW: true,              // 需要GROW
    hasSummary: true
  },
  'values_beliefs': {
    hasOpening: false,
    hasValuesNarrative: false,  // 使用特殊的验证模式
    hasDeepExploration: false,
    hasGROW: false,
    hasSummary: true,
    specialMode: 'values_validation'  // 特殊模式：价值观验证
  },
  'life_philosophy': {
    hasOpening: false,
    hasValuesNarrative: true,
    hasDeepExploration: false,  // 哲学总结，不需要深挖
    hasGROW: false,
    hasSummary: true,
    summaryEnhanced: true       // 强化Summary
  }
};
```

---

## 三、问卷设计

### 3.1 新问题列表（调整后顺序）

```typescript
// frontend/src/constants.ts

export const QUESTIONS: Question[] = [
  {
    id: 'life_chapters',
    text: '如果把你的人生比作一本书，它会有哪些章节？每个章节的主题是什么？哪一章对你影响最大？',
    order: 1
  },
  {
    id: 'education_career',
    text: '描述你的教育和职业历程。有哪些关键的转折点？什么驱动了你的选择？',
    order: 2
  },
  {
    id: 'relationships',
    text: '谁对你的人生影响最大？这些关系如何塑造了现在的你？',
    order: 3
  },
  {
    id: 'challenges_growth',
    text: '你经历过的最大挑战是什么？它如何改变了你？你从中学到了什么？',
    order: 4
  },
  {
    id: 'achievements_pride',
    text: '你最自豪的成就是什么？为什么这对你意义重大？',
    order: 5
  },
  {
    id: 'future_aspirations',
    text: '展望未来，你希望成为什么样的人？你的长期目标是什么？什么会让你觉得人生圆满？',
    order: 6
  },
  {
    id: 'values_beliefs',
    text: '回顾我们之前的对话，你最看重的价值观是什么？它们是如何在生活中体现的？',
    order: 7  // 移到第7位，作为验证
  },
  {
    id: 'life_philosophy',
    text: '如果要用一句话总结你的人生哲学或座右铭，会是什么？为什么选择这句话？',
    order: 8
  }
];
```

### 3.2 每个问题的阶段流程

#### 问题1: life_chapters（人生章节）
```
Opening (1-2轮)
    ↓
Values-Based Narrative (10-15轮)
    ↓
Deep Exploration (5-10轮)
    ↓
Summary (2轮)
```
**总轮次**: 18-29轮

#### 问题2: education_career（教育职业）
```
Values-Based Narrative (10-15轮)
    ↓
Deep Exploration (5-10轮)
    ↓
GROW (10-14轮)  ← 有GROW
    ↓
Summary (2轮)
```
**总轮次**: 27-41轮

#### 问题3-5: relationships, challenges_growth, achievements_pride
```
Values-Based Narrative (10-15轮)
    ↓
Deep Exploration (5-10轮)
    ↓
Summary (2轮)
```
**总轮次**: 17-27轮

#### 问题6: future_aspirations（未来期望）
```
Values-Based Narrative (8-12轮)  ← 略短
    ↓
GROW (10-14轮)  ← 有GROW，重点
    ↓
Summary (2轮)
```
**总轮次**: 20-28轮

#### 问题7: values_beliefs（价值观验证）
```
Values Validation Mode (5-8轮)  ← 特殊模式
    ↓
Summary (2轮)
```
**总轮次**: 7-10轮

#### 问题8: life_philosophy（人生哲学）
```
Values-Based Narrative (8-12轮)  ← 略短
    ↓
Enhanced Summary (3-4轮)  ← 强化总结
```
**总轮次**: 11-16轮

### 3.3 阶段定义与转换标准

#### Opening阶段（仅问题1）

**目标**: 建立信任，营造安全氛围

**轮次**: 1-2轮（极简）

**完成标准**:
- ✅ 获得用户称呼
- ✅ 用户表示准备好开始

**示例对话**:
```
AI: 你好！在我们开始这段探索之旅前，我可以怎么称呼你？
用户: 叫我小明就好。
AI: 小明你好！今天我们会一起回顾你的人生故事。准备好了吗？
用户: 准备好了。
→ 转入 Values-Based Narrative
```

#### Values-Based Narrative阶段

**目标**: 叙事探索 + 价值观识别

**轮次**: 8-15轮（根据问题调整）

**整合内容**:
- DICE的D&I探询（描述性+习惯性记忆）
- ACT价值观澄清（在叙事中自然识别）

**完成标准**:
- ✅ 对话轮数达到配置的最低要求
- ✅ 至少2个具体事件的D/I探询
- ✅ 识别2-3个核心价值观
- ✅ 至少1个领域达到"价值-行为连接"

#### Deep Exploration阶段

**目标**: 深度探询，意义澄清

**轮次**: 5-10轮

**整合内容**:
- DICE的C&E探询（澄清+解释）
- 寻找"啊哈时刻"

**完成标准**:
- ✅ 至少3次C/E深度探询
- ✅ 用户能解释事件的因果链
- ✅ 出现洞察性表达（"我意识到..."）

#### GROW阶段（部分问题）

**触发条件**: 根据问题配置自动进入

**轮次**: 10-14轮

**四子阶段**:
- Goal (3-5轮): SMART目标设定
- Reality (3-5轮): 现状分析，寻找啊哈时刻
- Options (2-3轮): 生成选项并收敛至1个
- Way Forward (2-3轮): 行动承诺

**完成标准**:
- ✅ SMART目标已设定
- ✅ Reality阶段出现啊哈时刻
- ✅ Options收敛至1个选项
- ✅ 行动步骤≥3个，有时间线

#### Values Validation阶段（仅问题7）

**目标**: 验证和整合前6题识别的价值观

**轮次**: 5-8轮

**流程**:
1. AI总结前6题识别的价值观
2. 用户确认/调整/补充
3. 探索价值观之间的关系
4. 识别价值观冲突

**完成标准**:
- ✅ 用户确认核心价值观列表
- ✅ 每个价值观有具体支撑证据
- ✅ 识别至少1个价值观冲突（如有）

#### Summary阶段

**目标**: 总结确认，情感闭环

**轮次**: 2-4轮（life_philosophy问题强化为3-4轮）

**六要素**:
1. 关键洞察回顾
2. 核心价值观总结
3. GROW行动计划确认（如有）
4. 成就庆祝
5. 下一步行动
6. 后续支持

---

## 四、后端架构

### 4.1 API设计

#### 追问生成API（职责分离）

```typescript
// POST /api/rag/profile-v2/generate-followup

// 请求
{
  "session_id": "session_xxx",
  "question_id": "life_chapters",
  "current_phase": "values_narrative",
  "user_answer": "用户的回答...",
  "conversation_history": [...]
}

// 响应
{
  "success": true,
  "followup_question": "AI生成的追问",
  "probe_type": "descriptive",  // DICE类型
  "reasoning": "追问理由"
}
```

#### 阶段评估API（职责分离）

```typescript
// POST /api/rag/profile-v2/evaluate-phase

// 请求
{
  "session_id": "session_xxx",
  "question_id": "life_chapters",
  "current_phase": "values_narrative"
}

// 响应
{
  "success": true,
  "should_transition": true,
  "next_phase": "deep_exploration",
  "reasons": ["对话轮数已达12轮", "编码饱和，无新主题"],
  "phase_data": {
    "identified_values": ["自由", "成长"],
    "key_events": ["2019年创业"]
  }
}
```

#### 对话历史总结API

```typescript
// POST /api/rag/profile-v2/summarize-history

// 请求
{
  "session_id": "session_xxx",
  "conversation_history": [...],
  "current_phase": "deep_exploration"
}

// 响应
{
  "success": true,
  "summary": {
    "key_events": ["事件1描述", "事件2描述"],
    "identified_values": [
      {"domain": "工作", "value": "自由", "evidence": "用户说..."}
    ],
    "emotional_themes": ["焦虑", "期待"],
    "insights": ["用户意识到害怕失败比害怕尝试更可怕"]
  },
  "compressed_history": [
    // 结构化总结 + 最近5轮原文
  ]
}
```

#### 模型切换API

```typescript
// POST /api/rag/profile-v2/switch-model

// 请求
{
  "model": "deepseek-v2.5"
}

// 响应
{
  "success": true,
  "previous_model": "qwen2.5:14b-instruct",
  "current_model": "deepseek-v2.5"
}

// GET /api/rag/profile-v2/available-models

// 响应
{
  "models": [
    {"name": "qwen2.5:14b-instruct", "status": "available", "default": true},
    {"name": "deepseek-v2.5", "status": "available"},
    {"name": "qwen3:14b", "status": "not_installed"}
  ]
}
```

### 4.2 服务层设计

#### question-generator.ts（追问生成器）

```typescript
export class QuestionGenerator {

  /**
   * 生成追问
   * 只负责生成问题，不负责判断阶段
   */
  async generate(
    questionId: string,
    phase: PhaseType,
    session: SessionInfo,
    history: Message[],
    context: CompressedContext
  ): Promise<FollowupResult> {

    // 1. 获取问题配置
    const config = QUESTION_CONFIG[questionId];

    // 2. 根据阶段选择prompt模板
    const promptBuilder = this.getPromptBuilder(phase, config);

    // 3. 构建prompt
    const prompt = promptBuilder.build(session, history, context);

    // 4. 调用模型
    const response = await this.ollamaService.generate(prompt);

    // 5. 解析响应
    return this.parseResponse(response);
  }
}
```

#### phase-evaluator.ts（阶段判断器）

```typescript
export class PhaseEvaluator {

  /**
   * 评估是否转换阶段
   * 根据问题配置和对话状态判断
   */
  async evaluate(
    questionId: string,
    currentPhase: PhaseType,
    session: SessionInfo,
    history: Message[]
  ): Promise<PhaseEvaluation> {

    // 1. 获取问题配置
    const config = QUESTION_CONFIG[questionId];

    // 2. 获取当前阶段的下一阶段
    const nextPhase = this.getNextPhase(currentPhase, config);

    // 3. 如果没有下一阶段，返回完成
    if (!nextPhase) {
      return { should_transition: false, completed: true };
    }

    // 4. 调用阶段特定的评估器
    switch (currentPhase) {
      case 'opening':
        return this.evaluateOpening(history);
      case 'values_narrative':
        return this.evaluateValuesNarrative(session, history);
      case 'deep_exploration':
        return this.evaluateDeepExploration(session, history);
      case 'grow':
        return this.evaluateGROW(session, history);
      case 'values_validation':
        return this.evaluateValuesValidation(session, history);
      default:
        return { should_transition: true, next_phase: 'summary' };
    }
  }

  /**
   * 根据问题配置获取下一阶段
   */
  private getNextPhase(current: PhaseType, config: QuestionStrategy): PhaseType | null {
    const phaseOrder = this.buildPhaseOrder(config);
    const currentIndex = phaseOrder.indexOf(current);

    if (currentIndex === -1 || currentIndex === phaseOrder.length - 1) {
      return null;
    }

    return phaseOrder[currentIndex + 1];
  }

  /**
   * 根据问题配置构建阶段顺序
   */
  private buildPhaseOrder(config: QuestionStrategy): PhaseType[] {
    const order: PhaseType[] = [];

    if (config.hasOpening) order.push('opening');
    if (config.hasValuesNarrative) order.push('values_narrative');
    if (config.specialMode === 'values_validation') order.push('values_validation');
    if (config.hasDeepExploration) order.push('deep_exploration');
    if (config.hasGROW) order.push('grow');
    order.push('summary');

    return order;
  }
}
```

#### context-manager.ts（上下文管理器）

```typescript
export class ContextManager {

  private readonly MAX_CONTEXT_TOKENS = 60000;  // 保持在64K以下
  private readonly RECENT_TURNS_TO_KEEP = 5;

  /**
   * 管理上下文，确保不超过限制
   */
  async manageContext(
    phase: PhaseType,
    fullHistory: Message[],
    session: SessionInfo
  ): Promise<ManagedContext> {

    const tokenCount = this.estimateTokens(fullHistory);

    // 如果上下文足够小，直接返回
    if (tokenCount < this.MAX_CONTEXT_TOKENS / 2) {
      return {
        history: fullHistory,
        compressed: false
      };
    }

    // 需要压缩
    const summarizer = new HistorySummarizer(this.ollamaService);
    const summary = await summarizer.summarize(fullHistory, phase);

    return {
      history: [
        { role: 'system', content: `[历史总结] ${JSON.stringify(summary)}` },
        ...fullHistory.slice(-this.RECENT_TURNS_TO_KEEP * 2)  // 保留最近5轮
      ],
      compressed: true,
      summary
    };
  }
}
```

### 4.3 模型配置

```typescript
// backend/src/config.ts

export const MODEL_CONFIG = {
  default: 'qwen2.5:14b-instruct',

  available: {
    'qwen2.5:14b-instruct': {
      displayName: 'Qwen 2.5 14B',
      options: {
        temperature: 0.7,
        top_p: 0.9,
        num_ctx: 65536,      // 限制在64K
        repeat_penalty: 1.3   // 解决重复问题
      }
    },
    'deepseek-v2.5': {
      displayName: 'DeepSeek V2.5',
      options: {
        temperature: 0.7,
        top_p: 0.9,
        num_ctx: 65536
      }
    },
    'qwen3:14b': {
      displayName: 'Qwen 3 14B (未安装)',
      options: {
        temperature: 0.7,
        top_p: 0.9,
        num_ctx: 65536
      }
    }
  }
};
```

---

## 五、数据库Schema（8表设计）

### 5.0 设计原则

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           设计目标                                       │
├─────────────────────────────────────────────────────────────────────────┤
│ 1. SQL友好 - 所有核心数据独立成表，支持复杂查询                          │
│ 2. RAG就绪 - 预留 rag_embedding_id 字段，审批后写入向量库                │
│ 3. 跨问题分析 - 价值观、洞察、目标可跨问题聚合                           │
│ 4. 调试友好 - 保留阶段转换日志、对话轮次记录                             │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.1 表结构总览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Profile-2 数据库 (8张表)                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐             │
│  │   users     │◄────►│  sessions   │◄────►│   turns     │             │
│  │  (用户表)   │ 1:N  │  (会话表)   │ 1:N  │ (对话轮次)  │             │
│  └─────────────┘      └──────┬──────┘      └─────────────┘             │
│                              │                                          │
│         ┌────────────────────┼────────────────────┐                    │
│         │                    │                    │                    │
│         ▼                    ▼                    ▼                    │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐             │
│  │   values    │      │  insights   │      │   goals     │             │
│  │ (价值观表)  │      │  (洞察表)   │      │  (目标表)   │             │
│  └─────────────┘      └─────────────┘      └─────────────┘             │
│         │                    │                    │                    │
│         └────────────────────┴────────────────────┘                    │
│                              │                                          │
│                              ▼                                          │
│                    ┌─────────────────┐      ┌─────────────┐             │
│                    │ rag_sync_queue  │─────►│ (RAG模块)   │             │
│                    │ (RAG同步队列)   │      │  向量库     │             │
│                    └─────────────────┘      └─────────────┘             │
│                                                                         │
│  ┌─────────────────┐                                                   │
│  │phase_transitions│  ← 调试日志表                                      │
│  └─────────────────┘                                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 表1: users（用户表）

```sql
CREATE TABLE users (
  user_id TEXT PRIMARY KEY,
  nickname TEXT,                          -- 用户昵称（Opening阶段获取）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_active_at DATETIME
);
```

### 5.3 表2: sessions（会话表）

```sql
CREATE TABLE sessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,

  -- 问题信息
  question_id TEXT NOT NULL,              -- life_chapters, education_career...
  question_order INTEGER NOT NULL,        -- 1-8
  initial_answer TEXT,                    -- 用户首次回答（从问卷页面带入）

  -- 阶段管理
  current_phase TEXT DEFAULT 'opening',   -- opening/values_narrative/deep_exploration/grow/summary
  phase_config TEXT NOT NULL,             -- JSON: 该问题启用的阶段配置

  -- 状态
  status TEXT DEFAULT 'in_progress',      -- in_progress/pending_approval/approved/rejected

  -- 版本管理（数据覆盖保护）
  version INTEGER DEFAULT 1,              -- 版本号
  is_active BOOLEAN DEFAULT TRUE,         -- 是否为当前活跃版本
  archived_at DATETIME,                   -- 归档时间
  archived_reason TEXT,                   -- 归档原因：user_redo/data_migration/...
  previous_session_id TEXT,               -- 前一版本的session_id（如有）

  -- 统计
  total_turns INTEGER DEFAULT 0,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,

  -- 最终总结（Summary阶段产出）
  final_summary TEXT,

  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- 索引
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_question ON sessions(question_id);
CREATE INDEX idx_sessions_active ON sessions(user_id, question_id, is_active);
```

### 5.4 表3: turns（对话轮次表）

```sql
CREATE TABLE turns (
  turn_id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,

  -- 对话内容
  turn_number INTEGER NOT NULL,           -- 第几轮
  phase TEXT NOT NULL,                    -- 当时的阶段

  user_message TEXT NOT NULL,             -- 用户说的话
  ai_message TEXT NOT NULL,               -- AI的追问

  -- AI决策记录（调试用）
  probe_type TEXT,                        -- D/I/C/E 或 GROW子阶段
  ai_reasoning TEXT,                      -- AI为什么这样问

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

-- 索引
CREATE INDEX idx_turns_session ON turns(session_id);
```

**SQL查询示例**：
```sql
-- 查看某用户所有对话
SELECT t.* FROM turns t
JOIN sessions s ON t.session_id = s.session_id
WHERE s.user_id = 'user_xxx'
ORDER BY t.created_at;

-- 统计每个阶段的平均轮数
SELECT phase, AVG(turn_count) as avg_turns
FROM (
  SELECT session_id, phase, COUNT(*) as turn_count
  FROM turns GROUP BY session_id, phase
) GROUP BY phase;
```

### 5.5 表4: values（价值观表）⭐ 核心

```sql
CREATE TABLE values (
  value_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,               -- 在哪个会话中识别

  -- 价值观内容
  domain TEXT NOT NULL,                   -- 生活领域：工作/家庭/健康/社交/个人成长/...
  value_name TEXT NOT NULL,               -- 价值观：自由/稳定/成长/陪伴/...

  -- 深度层级
  depth_layer INTEGER NOT NULL DEFAULT 1, -- 1=识别 2=意义化 3=行为连接

  -- 证据
  evidence_quote TEXT,                    -- 用户原话
  evidence_turn_id INTEGER,               -- 来自哪一轮对话

  -- 验证状态（问题7更新）
  user_confirmed BOOLEAN,                 -- 用户是否确认
  importance_rank INTEGER,                -- 重要性排序（1最重要）

  -- RAG同步
  rag_synced BOOLEAN DEFAULT FALSE,
  rag_embedding_id TEXT,                  -- 向量库中的ID

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME,

  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

-- 索引
CREATE INDEX idx_values_user ON values(user_id);
CREATE INDEX idx_values_domain ON values(domain);
CREATE INDEX idx_values_confirmed ON values(user_confirmed);
CREATE INDEX idx_values_rag ON values(rag_synced);
```

**SQL查询示例**：
```sql
-- 查询用户所有已确认的价值观
SELECT domain, value_name, importance_rank, evidence_quote
FROM values
WHERE user_id = 'user_xxx' AND user_confirmed = TRUE
ORDER BY importance_rank;

-- 统计最常见的价值观
SELECT value_name, COUNT(*) as frequency
FROM values WHERE user_confirmed = TRUE
GROUP BY value_name ORDER BY frequency DESC LIMIT 10;

-- 查找价值观冲突（同一用户同领域不同价值观）
SELECT v1.value_name as value1, v2.value_name as value2, v1.domain
FROM values v1
JOIN values v2 ON v1.user_id = v2.user_id
  AND v1.domain = v2.domain
  AND v1.value_id < v2.value_id
WHERE v1.user_confirmed = TRUE AND v2.user_confirmed = TRUE;
```

### 5.6 表5: insights（洞察表）⭐ 核心

```sql
CREATE TABLE insights (
  insight_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,

  -- 洞察内容
  insight_type TEXT NOT NULL,             -- aha_moment/causal_chain/pattern/realization
  content TEXT NOT NULL,                  -- 洞察内容

  -- 来源
  source_phase TEXT,                      -- 产生于哪个阶段
  source_turn_id INTEGER,                 -- 来自哪一轮
  trigger_quote TEXT,                     -- 触发洞察的用户原话

  -- 关联
  related_value_id INTEGER,               -- 关联的价值观（如有）
  related_goal_id INTEGER,                -- 关联的目标（如有）

  -- 审批状态
  status TEXT DEFAULT 'pending',          -- pending/approved/rejected/modified
  approved_content TEXT,                  -- 审批后的修改版本（如有修改）

  -- RAG同步
  rag_synced BOOLEAN DEFAULT FALSE,
  rag_embedding_id TEXT,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

-- 索引
CREATE INDEX idx_insights_user ON insights(user_id);
CREATE INDEX idx_insights_type ON insights(insight_type);
CREATE INDEX idx_insights_status ON insights(status);
CREATE INDEX idx_insights_rag ON insights(rag_synced);
```

**SQL查询示例**：
```sql
-- 查询用户所有啊哈时刻
SELECT content, trigger_quote, created_at
FROM insights
WHERE user_id = 'user_xxx' AND insight_type = 'aha_moment' AND status = 'approved';

-- 查询与某个价值观相关的所有洞察
SELECT i.content, v.value_name
FROM insights i
JOIN values v ON i.related_value_id = v.value_id
WHERE i.user_id = 'user_xxx';
```

### 5.7 表6: goals（目标表）⭐ GROW产出

```sql
CREATE TABLE goals (
  goal_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,               -- 在哪个会话中设定

  -- GROW - Goal
  goal_description TEXT NOT NULL,         -- 目标描述
  goal_type TEXT,                         -- short_term/long_term
  smart_specific TEXT,
  smart_measurable TEXT,
  smart_achievable TEXT,
  smart_relevant TEXT,
  smart_time_bound TEXT,
  importance_score INTEGER,               -- 1-10

  -- GROW - Reality
  current_state TEXT,                     -- JSON数组：现状描述
  obstacles TEXT,                         -- JSON数组：障碍
  reality_aha_moment TEXT,                -- Reality阶段的啊哈时刻

  -- GROW - Options
  options_generated TEXT,                 -- JSON数组：生成的选项
  option_selected TEXT,                   -- 选中的选项
  selection_reason TEXT,                  -- 选择理由

  -- GROW - Way Forward
  action_steps TEXT,                      -- JSON数组：行动步骤
  first_step TEXT,                        -- 第一步
  commitment_level INTEGER,               -- 承诺度 1-10

  -- 状态追踪
  status TEXT DEFAULT 'active',           -- active/completed/abandoned
  progress_notes TEXT,                    -- 进度备注

  -- RAG同步
  rag_synced BOOLEAN DEFAULT FALSE,
  rag_embedding_id TEXT,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME,

  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

-- 索引
CREATE INDEX idx_goals_user ON goals(user_id);
CREATE INDEX idx_goals_status ON goals(status);
CREATE INDEX idx_goals_rag ON goals(rag_synced);
```

### 5.8 表7: rag_sync_queue（RAG同步队列）

```sql
CREATE TABLE rag_sync_queue (
  queue_id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- 来源
  source_table TEXT NOT NULL,             -- values/insights/goals
  source_id INTEGER NOT NULL,             -- 对应表的主键ID

  -- 内容（冗余存储，便于RAG处理）
  content_text TEXT NOT NULL,             -- 要向量化的文本
  content_type TEXT NOT NULL,             -- value/insight/goal
  user_id TEXT NOT NULL,

  -- 元数据（存入向量库的metadata）
  metadata TEXT NOT NULL,                 -- JSON: {domain, question_id, ...}

  -- 同步状态
  status TEXT DEFAULT 'pending',          -- pending/processing/completed/failed
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,

  -- RAG模块返回
  embedding_id TEXT,                      -- 向量库返回的ID

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME
);

-- 索引
CREATE INDEX idx_rag_queue_status ON rag_sync_queue(status);
CREATE INDEX idx_rag_queue_source ON rag_sync_queue(source_table, source_id);
```

**RAG同步工作流程**：
```
审批通过
    ↓
写入 values/insights/goals 表，status='approved'
    ↓
触发器/应用层 插入 rag_sync_queue
    ↓
后台任务读取队列，调用RAG模块
    ↓
RAG返回embedding_id，更新原表的rag_embedding_id字段
    ↓
标记队列项为completed
```

### 5.9 表8: phase_transitions（阶段转换日志）

```sql
CREATE TABLE phase_transitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,

  from_phase TEXT,
  to_phase TEXT NOT NULL,

  -- AI决策记录
  transition_reasons TEXT,                -- JSON: 转换理由
  evaluation_data TEXT,                   -- JSON: 评估时的数据快照

  turn_number INTEGER,                    -- 当时的轮次
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

CREATE INDEX idx_transitions_session ON phase_transitions(session_id);
```

### 5.10 与V1对比

| V1表 | V2表 | 变化 |
|------|------|------|
| user_profiles | users | 简化，只保留核心字段 |
| interview_sessions | sessions | 重构，适配新阶段流程 |
| - | turns | **新增**，独立存储每轮对话 |
| user_values | values | 增强，添加RAG字段、确认状态 |
| insights | insights | 增强，添加审批流程、RAG字段 |
| goals | goals | 增强，完整GROW结构 |
| turning_points | → insights | 合并到洞察表（type='turning_point'） |
| behavioral_patterns | → insights | 合并到洞察表（type='pattern'） |
| personality_traits | 移除 | 暂不单独存储，可在Summary中体现 |
| insight_relationships | 移除 | 用insights.related_*字段替代 |
| embeddings | rag_sync_queue | 改为同步队列模式 |
| - | phase_transitions | **新增**，调试用 |

---

## 六、后端日志系统

### 6.1 日志设计原则

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        日志系统设计                                       │
├─────────────────────────────────────────────────────────────────────────┤
│ 输出方式: 仅控制台输出（开发调试用）                                      │
│ 不生成日志文件，避免磁盘占用                                              │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 日志服务实现

```typescript
// backend/src/services/logger.ts

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogCategory = 'api' | 'ollama' | 'phase' | 'context' | 'db' | 'rag';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  session_id?: string;
  message: string;
  data?: Record<string, unknown>;
  duration_ms?: number;
}

class Logger {
  private static instance: Logger;
  private minLevel: LogLevel = 'debug';

  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  private levelColors: Record<LogLevel, string> = {
    debug: '\x1b[36m',  // cyan
    info: '\x1b[32m',   // green
    warn: '\x1b[33m',   // yellow
    error: '\x1b[31m'   // red
  };

  private categoryIcons: Record<LogCategory, string> = {
    api: '🌐',
    ollama: '🤖',
    phase: '📍',
    context: '📝',
    db: '💾',
    rag: '🔍'
  };

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private format(entry: LogEntry): string {
    const reset = '\x1b[0m';
    const color = this.levelColors[entry.level];
    const icon = this.categoryIcons[entry.category];

    let output = `${color}[${entry.timestamp}] ${entry.level.toUpperCase().padEnd(5)}${reset} `;
    output += `${icon} [${entry.category}] `;

    if (entry.session_id) {
      output += `\x1b[90m(${entry.session_id.slice(0, 8)})\x1b[0m `;
    }

    output += entry.message;

    if (entry.duration_ms !== undefined) {
      output += ` \x1b[90m(${entry.duration_ms}ms)\x1b[0m`;
    }

    if (entry.data) {
      output += `\n    ${JSON.stringify(entry.data)}`;
    }

    return output;
  }

  log(level: LogLevel, category: LogCategory, message: string, options?: {
    session_id?: string;
    data?: Record<string, unknown>;
    duration_ms?: number;
  }): void {
    if (this.levelPriority[level] < this.levelPriority[this.minLevel]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString().slice(11, 23),
      level,
      category,
      message,
      ...options
    };

    console.log(this.format(entry));
  }

  // 便捷方法
  debug(category: LogCategory, message: string, options?: any) {
    this.log('debug', category, message, options);
  }

  info(category: LogCategory, message: string, options?: any) {
    this.log('info', category, message, options);
  }

  warn(category: LogCategory, message: string, options?: any) {
    this.log('warn', category, message, options);
  }

  error(category: LogCategory, message: string, options?: any) {
    this.log('error', category, message, options);
  }

  // 设置最小日志级别
  setLevel(level: LogLevel) {
    this.minLevel = level;
  }
}

export const logger = Logger.getInstance();
```

### 6.3 日志使用示例

```typescript
// API层
app.post('/api/rag/profile-v2/generate-followup', async (req, res) => {
  const startTime = Date.now();
  logger.info('api', 'POST /generate-followup', { session_id: req.body.session_id });

  try {
    const result = await questionGenerator.generate(req.body);
    logger.info('api', 'Response sent', {
      session_id: req.body.session_id,
      duration_ms: Date.now() - startTime
    });
    res.json(result);
  } catch (error) {
    logger.error('api', 'Request failed', {
      session_id: req.body.session_id,
      data: { error: error.message }
    });
    res.status(500).json({ error: error.message });
  }
});

// Ollama调用层
async function callOllama(prompt: string, sessionId: string) {
  const startTime = Date.now();
  logger.debug('ollama', 'Calling Ollama API', {
    session_id: sessionId,
    data: { prompt_length: prompt.length }
  });

  const response = await fetch('http://localhost:11434/api/generate', { ... });

  logger.info('ollama', 'Ollama response received', {
    session_id: sessionId,
    duration_ms: Date.now() - startTime,
    data: { response_length: response.length }
  });

  return response;
}

// 阶段转换层
function handlePhaseTransition(sessionId: string, from: string, to: string, reasons: string[]) {
  logger.info('phase', `Phase transition: ${from} → ${to}`, {
    session_id: sessionId,
    data: { reasons }
  });
}

// 上下文管理层
function compressContext(sessionId: string, beforeTokens: number, afterTokens: number) {
  logger.warn('context', 'Context compressed', {
    session_id: sessionId,
    data: { before: beforeTokens, after: afterTokens, reduced: beforeTokens - afterTokens }
  });
}
```

### 6.4 控制台输出示例

```
[14:32:15.123] INFO  🌐 [api] POST /generate-followup
[14:32:15.125] DEBUG 🤖 [ollama] Calling Ollama API (sess_abc1)
    {"prompt_length":2340}
[14:32:18.456] INFO  🤖 [ollama] Ollama response received (sess_abc1) (3331ms)
    {"response_length":156}
[14:32:18.460] INFO  📍 [phase] Phase transition: values_narrative → deep_exploration (sess_abc1)
    {"reasons":["轮数达到12轮","编码饱和"]}
[14:32:18.465] INFO  💾 [db] Turn saved (sess_abc1)
[14:32:18.470] INFO  🌐 [api] Response sent (sess_abc1) (3347ms)

[14:35:22.100] WARN  📝 [context] Context compressed (sess_abc1)
    {"before":58000,"after":32000,"reduced":26000}

[14:40:55.200] ERROR 🤖 [ollama] Ollama timeout (sess_abc1)
    {"error":"Request timeout after 30000ms"}
```

### 6.5 关键日志事件清单

| 事件 | 级别 | 类别 | 用途 |
|------|------|------|------|
| API请求开始 | info | api | 追踪用户操作 |
| API响应完成 | info | api | 性能监控（含耗时） |
| API错误 | error | api | 问题排查 |
| Ollama调用开始 | debug | ollama | 调试模型交互 |
| Ollama响应完成 | info | ollama | 性能监控（含耗时） |
| Ollama错误/超时 | error | ollama | 模型问题排查 |
| 阶段转换 | info | phase | 流程验证 |
| 阶段判断失败 | warn | phase | 判断器调优 |
| 上下文压缩 | warn | context | 监控token使用 |
| 数据库写入 | debug | db | 数据追踪 |
| 数据库错误 | error | db | 数据完整性 |
| RAG队列写入 | info | rag | 同步追踪 |
| RAG同步失败 | error | rag | 向量库问题 |

---

## 七、前端改造

### 7.1 constants.ts 更新

```typescript
// frontend/src/constants.ts

import type { Question, QuestionStrategy, PhaseType } from './types';

// 新问题顺序
export const QUESTIONS: Question[] = [
  // ... 见3.1节
];

// 问题级策略配置
export const QUESTION_CONFIG: Record<string, QuestionStrategy> = {
  // ... 见2.4节
};

// 阶段显示名称
export const PHASE_NAMES: Record<PhaseType, string> = {
  'opening': '开场',
  'values_narrative': '价值叙事',
  'deep_exploration': '深度探索',
  'grow': 'GROW目标',
  'values_validation': '价值验证',
  'summary': '总结'
};

// 根据问题配置获取阶段顺序
export function getPhaseOrder(questionId: string): PhaseType[] {
  const config = QUESTION_CONFIG[questionId];
  const order: PhaseType[] = [];

  if (config.hasOpening) order.push('opening');
  if (config.hasValuesNarrative) order.push('values_narrative');
  if (config.specialMode === 'values_validation') order.push('values_validation');
  if (config.hasDeepExploration) order.push('deep_exploration');
  if (config.hasGROW) order.push('grow');
  order.push('summary');

  return order;
}
```

### 7.2 Interview.tsx 改造要点

```typescript
// frontend/src/pages/Interview.tsx

export function Interview() {
  const [currentPhase, setCurrentPhase] = useState<PhaseType>('opening');
  const [phaseOrder, setPhaseOrder] = useState<PhaseType[]>([]);

  // 根据问题ID加载阶段配置
  useEffect(() => {
    if (questionId) {
      const order = getPhaseOrder(questionId);
      setPhaseOrder(order);
      setCurrentPhase(order[0]);  // 设置初始阶段
    }
  }, [questionId]);

  // 阶段指示器（动态渲染）
  const renderPhaseIndicator = () => {
    return (
      <div className="phase-indicator">
        {phaseOrder.map((phase, index) => (
          <div
            key={phase}
            className={`phase-step ${phase === currentPhase ? 'active' : ''} ${
              phaseOrder.indexOf(currentPhase) > index ? 'completed' : ''
            }`}
          >
            <span className="phase-number">{index + 1}</span>
            <span className="phase-name">{PHASE_NAMES[phase]}</span>
          </div>
        ))}
      </div>
    );
  };

  // 发送消息处理
  const handleSendMessage = async () => {
    // 1. 调用追问生成API
    const followupRes = await fetch('/api/rag/profile-v2/generate-followup', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        question_id: questionId,
        current_phase: currentPhase,
        user_answer: userMessage,
        conversation_history: conversationHistory
      })
    });

    const followup = await followupRes.json();
    addMessage('ai', followup.followup_question);

    // 2. 每3轮检查一次阶段转换
    if (conversationHistory.length % 3 === 0) {
      const evalRes = await fetch('/api/rag/profile-v2/evaluate-phase', {
        method: 'POST',
        body: JSON.stringify({
          session_id: sessionId,
          question_id: questionId,
          current_phase: currentPhase
        })
      });

      const evaluation = await evalRes.json();

      if (evaluation.should_transition) {
        setCurrentPhase(evaluation.next_phase);
        // 显示阶段转换提示
        addSystemMessage(`进入${PHASE_NAMES[evaluation.next_phase]}阶段`);
      }
    }
  };

  return (
    <div className="interview-page">
      {renderPhaseIndicator()}
      {/* ... 对话区域 ... */}
    </div>
  );
}
```

---

## 八、Prompt系统

### 8.1 Opening提示词（仅问题1）

```typescript
// backend/src/prompts/opening.ts

export function buildOpeningPrompt(context: BaseContext): string {
  return `你是一位温暖的访谈者，正在开始一段深度对话。

${context.baseInfo}

这是整个访谈的开场，你的任务是：
1. 用1-2轮对话建立基本信任
2. 获得用户的称呼
3. 简要说明访谈目的
4. 确认用户准备好开始

保持简短、温暖、自然。不要急于深入。

输出JSON格式：
{
  "question": "你的问题（简短、温暖）",
  "reasoning": "理由（不超过30字）",
  "should_continue": true或false,
  "next_phase": null或"values_narrative"
}

当用户表示准备好后，设置 should_continue=false, next_phase="values_narrative"`;
}
```

### 8.2 Values-Based Narrative提示词

```typescript
// backend/src/prompts/values-narrative.ts

export function buildValuesNarrativePrompt(
  context: BaseContext,
  questionConfig: QuestionStrategy
): string {
  return `你是一位经验丰富的访谈者，正在进行价值观叙事探索阶段。

${context.baseInfo}

## 本阶段整合内容

### DICE探询技术（使用D&I）
- **D (Descriptive)**: 描述性细节（时间、地点、人物、感官）
- **I (Idiographic)**: 从一般转向具体记忆（"能讲一个具体例子吗？"）

### ACT价值观识别（自然融入）
- 在叙事中识别价值观线索
- 当用户分享重要经历时，轻轻引导至价值观层面
- 例："这件事对你意味着什么？" "这体现了你看重什么？"

## 质量要求
- 每次只问一个开放性问题
- 充分结合用户已给出的回答，避免重复
- 深挖具体细节而非停留在表面
- 自然过渡，不要生硬地问"你的价值观是什么"

## 完成标准
- 对话轮数 ≥ ${questionConfig.minTurns || 10}轮
- 至少2个具体事件的D/I探询
- 识别2-3个价值观线索
- 至少1个价值-行为连接

输出JSON格式：
{
  "question": "你的追问（一个开放性问题）",
  "probe_type": "descriptive或idiographic",
  "value_hint": "识别到的价值观线索（可为null）",
  "reasoning": "理由（不超过50字）",
  "should_continue": true或false,
  "next_phase": null或"deep_exploration"或"grow"或"summary"
}`;
}
```

### 8.3 Values Validation提示词（问题7专用）

```typescript
// backend/src/prompts/values-validation.ts

export function buildValuesValidationPrompt(
  context: BaseContext,
  previousValues: IdentifiedValue[]
): string {
  return `你是一位价值观验证专家，正在帮助用户确认和整合已识别的价值观。

${context.baseInfo}

## 已识别的价值观（来自前6个问题）

${previousValues.map(v => `- **${v.value_name}** (${v.domain}): ${v.evidence_quote}`).join('\n')}

## 你的任务

1. **总结呈现**: 向用户展示已识别的价值观
2. **确认调整**: 询问用户是否认同，是否需要调整
3. **探索关系**: 这些价值观之间有什么关系？
4. **识别冲突**: 是否存在价值观冲突？
5. **排序重要性**: 如果必须选择，哪个最重要？

## 完成标准
- 用户确认核心价值观列表（3-5个）
- 每个价值观有明确的支撑证据
- 讨论了价值观之间的关系
- 识别了潜在冲突（如有）

输出JSON格式：
{
  "question": "你的问题",
  "validation_type": "present或confirm或explore_relation或identify_conflict或rank",
  "reasoning": "理由",
  "should_continue": true或false,
  "next_phase": null或"summary"
}`;
}
```

---

## 九、实施路线图

### 阶段0：环境准备（0.5天）

**任务**:
1. ✅ 创建 `modules/profile-2/` 目录结构
2. ✅ 复制V1基础代码作为起点
3. ✅ 初始化独立数据库 `profile-v2.db`
4. ✅ 更新 `pnpm-workspace.yaml`

**验收标准**:
- 目录结构完整
- 可以独立启动（即使功能不完整）

### 阶段1：问卷设计实施（2-3天）

**Day 1: 前端常量与类型**
- [ ] 更新 `constants.ts`（新问题顺序、策略配置）
- [ ] 更新 `types.ts`（新类型定义）
- [ ] 修改 `Questionnaire.tsx`（适配新顺序）

**Day 2-3: 后端Prompt系统**
- [ ] 创建 `prompts/` 目录
- [ ] 实现各阶段提示词模板
- [ ] 实现问题级策略注入

**验收标准**:
- 8个问题按新顺序显示
- 每个问题有正确的阶段配置

### 阶段2：后端架构重构（3-4天）

**Day 1-2: 职责分离**
- [ ] 创建 `question-generator.ts`
- [ ] 创建 `phase-evaluator.ts`
- [ ] 重构 `server.ts` API路由

**Day 3: 上下文管理**
- [ ] 创建 `context-manager.ts`
- [ ] 创建 `history-summarizer.ts`
- [ ] 实现滑动窗口逻辑

**Day 4: 模型配置**
- [ ] 更新 `config.ts`（模型配置）
- [ ] 实现模型切换API
- [ ] 添加 `repeat_penalty` 参数

**验收标准**:
- 追问生成和阶段判断完全独立
- 上下文始终<64K
- 可切换模型

### 阶段3：前端访谈页面（2-3天）

**Day 1-2: Interview.tsx重构**
- [ ] 实现动态阶段指示器
- [ ] 适配按需阶段逻辑
- [ ] 实现阶段转换动画

**Day 3: 测试与调优**
- [ ] 完整走通8个问题
- [ ] 测试各种阶段组合
- [ ] 修复发现的bug

**验收标准**:
- 每个问题按配置的阶段流程执行
- 阶段指示器正确显示
- 无明显bug

### 阶段4：数据库与集成（1-2天）

**Day 1: 数据库**
- [ ] 执行 `migrate.ts` 创建新表
- [ ] 验证数据写入正确

**Day 2: 集成测试**
- [ ] 完整走通1个问题（从问卷到审批）
- [ ] 验证phase_data正确存储
- [ ] 验证价值观跨问题追踪

**验收标准**:
- 数据正确持久化
- 价值观在问题7正确聚合

### 阶段5：文档与发布（1天）

- [ ] 完善 `README.md`
- [ ] 更新启动脚本
- [ ] 更新主门户入口（添加Profile-2）

---

## 十、风险与应对

| 风险 | 影响 | 应对策略 |
|------|------|----------|
| Prompt效果不佳 | 访谈质量下降 | 预留调优时间，收集真实对话样本 |
| 阶段转换不准确 | 过早/过晚转换 | 使用保守阈值，添加日志分析 |
| 上下文超限 | 模型性能下降 | 激进压缩策略，监控token计数 |
| 模型重复问题 | 用户体验差 | repeat_penalty=1.3，准备切换备选模型 |

---

## 十一、数据覆盖保护机制

### 11.1 问题场景

用户不小心进入已回答过的问题，新回答会覆盖旧数据，导致历史数据丢失。

### 11.2 解决方案：确认机制 + 版本保留

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        数据覆盖保护流程                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  用户点击已回答过的问题                                                   │
│         │                                                               │
│         ▼                                                               │
│  ┌─────────────────────────────────────────┐                           │
│  │  检测到该问题已有数据                     │                           │
│  │                                         │                           │
│  │  [查看历史记录]  [重新回答]  [返回]      │                           │
│  └─────────────────────────────────────────┘                           │
│         │                                                               │
│         ├── 查看历史记录 → 只读模式，不可编辑                            │
│         │                                                               │
│         └── 重新回答 → 弹出二次确认                                      │
│                 │                                                       │
│                 ▼                                                       │
│         ┌─────────────────────────────────────────┐                    │
│         │  ⚠️ 确认重新回答？                       │                    │
│         │                                         │                    │
│         │  原有数据将被归档，新数据将成为当前版本   │                    │
│         │                                         │                    │
│         │  [确认]  [取消]                         │                    │
│         └─────────────────────────────────────────┘                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 11.3 版本管理逻辑

```typescript
// 检查问题是否已有数据
async function checkExistingData(userId: string, questionId: string) {
  const existing = await db.get(`
    SELECT session_id, version, status, completed_at
    FROM sessions
    WHERE user_id = ? AND question_id = ? AND is_active = TRUE
  `, [userId, questionId]);

  return existing;
}

// 归档旧版本，创建新版本
async function archiveAndCreateNew(userId: string, questionId: string) {
  const existing = await checkExistingData(userId, questionId);

  if (existing) {
    // 1. 归档旧版本
    await db.run(`
      UPDATE sessions
      SET is_active = FALSE,
          archived_at = CURRENT_TIMESTAMP,
          archived_reason = 'user_redo'
      WHERE session_id = ?
    `, [existing.session_id]);

    // 2. 创建新版本
    const newSessionId = generateSessionId();
    await db.run(`
      INSERT INTO sessions (session_id, user_id, question_id, version, previous_session_id, ...)
      VALUES (?, ?, ?, ?, ?, ...)
    `, [newSessionId, userId, questionId, existing.version + 1, existing.session_id, ...]);

    return newSessionId;
  }

  // 无旧数据，直接创建
  return createNewSession(userId, questionId);
}
```

### 11.4 查看历史版本API

```typescript
// GET /api/rag/profile-v2/sessions/:userId/:questionId/history
// 返回该问题的所有版本（含已归档）
{
  "current": {
    "session_id": "sess_v3",
    "version": 3,
    "status": "approved",
    "completed_at": "2025-01-27T10:00:00Z"
  },
  "archived": [
    {
      "session_id": "sess_v2",
      "version": 2,
      "archived_at": "2025-01-26T15:00:00Z",
      "archived_reason": "user_redo"
    },
    {
      "session_id": "sess_v1",
      "version": 1,
      "archived_at": "2025-01-25T10:00:00Z",
      "archived_reason": "user_redo"
    }
  ]
}
```

---

## 十二、错误处理规范

### 12.1 统一错误响应格式

```typescript
// 成功响应
interface SuccessResponse<T> {
  success: true;
  data: T;
}

// 错误响应
interface ErrorResponse {
  success: false;
  error: {
    code: string;           // 错误码
    message: string;        // 用户友好的错误信息
    details?: any;          // 调试信息（仅开发环境）
  }
}
```

### 12.2 错误码定义

| 错误码 | HTTP状态 | 说明 | 用户提示 |
|--------|----------|------|----------|
| `INVALID_SESSION` | 400 | 会话ID无效 | 会话不存在，请重新开始 |
| `INVALID_PHASE` | 400 | 阶段参数错误 | 系统错误，请刷新页面 |
| `SESSION_COMPLETED` | 400 | 会话已完成 | 该问题已完成，无法继续 |
| `OLLAMA_TIMEOUT` | 504 | Ollama超时 | AI响应超时，请重试 |
| `OLLAMA_UNAVAILABLE` | 503 | Ollama服务不可用 | AI服务暂时不可用，请稍后重试 |
| `OLLAMA_PARSE_ERROR` | 500 | Ollama响应解析失败 | AI响应异常，请重试 |
| `DB_ERROR` | 500 | 数据库错误 | 数据保存失败，请重试 |
| `CONTEXT_OVERFLOW` | 500 | 上下文超限 | 对话过长，正在压缩... |
| `RAG_SYNC_FAILED` | 500 | RAG同步失败 | 数据同步失败，将稍后重试 |

### 12.3 错误处理中间件

```typescript
// backend/src/middleware/error-handler.ts

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  logger.error('api', err.message, {
    session_id: req.body?.session_id,
    data: { stack: err.stack }
  });

  // 已知错误类型
  if (err instanceof AppError) {
    return res.status(err.httpStatus).json({
      success: false,
      error: {
        code: err.code,
        message: err.userMessage,
        details: process.env.NODE_ENV === 'development' ? err.details : undefined
      }
    });
  }

  // 未知错误
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: '服务器内部错误，请稍后重试'
    }
  });
}
```

---

## 十三、会话恢复机制

### 13.1 场景

用户在访谈过程中：
- 不小心关闭浏览器
- 网络断开
- 页面刷新

需要能够恢复到之前的对话状态。

### 13.2 恢复API

```typescript
// GET /api/rag/profile-v2/session/:sessionId/resume

// 请求
GET /api/rag/profile-v2/session/sess_abc123/resume

// 响应
{
  "success": true,
  "data": {
    "session": {
      "session_id": "sess_abc123",
      "question_id": "life_chapters",
      "current_phase": "deep_exploration",
      "status": "in_progress",
      "total_turns": 8
    },
    "turns": [
      { "turn_number": 1, "phase": "opening", "user_message": "...", "ai_message": "..." },
      { "turn_number": 2, "phase": "values_narrative", "user_message": "...", "ai_message": "..." },
      // ... 所有历史对话
    ],
    "phase_order": ["opening", "values_narrative", "deep_exploration", "summary"],
    "resumable": true,
    "resume_hint": "您上次回答到了深度探索阶段，是否继续？"
  }
}
```

### 13.3 前端恢复逻辑

```typescript
// frontend/src/pages/Interview.tsx

useEffect(() => {
  async function checkResumableSession() {
    // 检查URL参数或localStorage中是否有未完成的session
    const pendingSessionId = localStorage.getItem(`pending_session_${questionId}`);

    if (pendingSessionId) {
      const res = await fetch(`/api/rag/profile-v2/session/${pendingSessionId}/resume`);
      const data = await res.json();

      if (data.success && data.data.resumable) {
        // 显示恢复对话框
        setShowResumeDialog(true);
        setPendingSession(data.data);
      }
    }
  }

  checkResumableSession();
}, [questionId]);

// 恢复对话框
function ResumeDialog({ session, onResume, onStartNew }) {
  return (
    <Dialog>
      <DialogTitle>发现未完成的访谈</DialogTitle>
      <DialogContent>
        <p>{session.resume_hint}</p>
        <p>已完成 {session.session.total_turns} 轮对话</p>
      </DialogContent>
      <DialogActions>
        <Button onClick={onResume}>继续访谈</Button>
        <Button onClick={onStartNew}>重新开始</Button>
      </DialogActions>
    </Dialog>
  );
}
```

### 13.4 会话状态持久化

```typescript
// 每次对话后保存到localStorage
function saveSessionState(sessionId: string, questionId: string) {
  localStorage.setItem(`pending_session_${questionId}`, sessionId);
}

// 会话完成后清除
function clearSessionState(questionId: string) {
  localStorage.removeItem(`pending_session_${questionId}`);
}
```

---

## 十四、设计确认

- [x] **Opening设计**: Opening只在问题1（life_chapters）有，其他问题直接从Values-Based Narrative开始
- [x] **GROW触发**: 问题级预设，自动触发（education_career、future_aspirations）
- [x] **values_beliefs位置**: 移至第7位，作为价值观验证
- [x] **模型切换**: 预留接口，暂不下载新模型
- [x] **A/B测试**: 不需要
- [x] **数据可视化**: 独立功能，不在本次范围
- [x] **数据覆盖保护**: 确认机制 + 版本保留，旧数据归档而非删除
- [x] **错误处理**: 统一错误码和响应格式
- [x] **会话恢复**: 支持断线续聊

---

**文档状态**: ✅ 已确认，可执行
**创建时间**: 2025-01-27
**更新时间**: 2025-01-27
**维护者**: 壮爸 + Claude
