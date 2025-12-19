# Profile-2 全局升级方案

**创建时间**: 2025-01-27
**基于研究**: 《五阶段问卷设计理论基础研究报告》+ 《profile优化方向讨论文档》
**实施目标**: 在 `modules/profile-2/` 创建理论一致、架构优化的个人画像系统 V2
**当前版本**: `modules/profile/` 保持不变作为参考

---

## 📋 执行摘要

### 核心问题诊断

经过深度理论研究，当前 `profile` 系统存在以下问题：

1. **✅ 确认是"拼接产物"** - 未找到"DICE + GROW + ACT"整合框架的学术依据
2. **❌ Opening阶段冗余** - DICE的D阶段本身就是破冰，不需要独立破冰
3. **❌ Values时序错误** - ACT理论要求Values在GROW之前，当前是GROW→Values
4. **⚠️ 功能重叠** - Narrative与GROW的Reality阶段都是深度探索
5. **⚠️ 强制GROW不合理** - GROW不适合完全迷茫的用户，应改为可选
6. **⚠️ 模型能力瓶颈** - Qwen2.5:14b存在重复输出bug
7. **⚠️ 架构混乱** - 追问生成与阶段判断职责混乱

### 升级目标

**Profile-2 将实现**：

✅ **理论一致性** - 基于文献证据的阶段设计
✅ **模块化灵活性** - 可选流程适应不同用户需求
✅ **架构优化** - 追问/判断分离、上下文管理、模型优化
✅ **体验提升** - 减少冗余、提高深度、智能引导

---

## 🎯 方向1：问卷设计全面重构

### 当前问题 vs 升级方案

| 维度 | Profile V1（当前） | Profile-2（升级） |
|------|-------------------|------------------|
| **理论基础** | 功能拼接产物 | 理论一致的模块化流程 |
| **阶段数量** | 5个强制阶段 | 3个核心阶段 + 1个可选模块 |
| **Opening** | ❌ 独立3-5轮（冗余） | ✅ 删除，D阶段自然破冰 |
| **Values时机** | ❌ GROW之后（错误） | ✅ Narrative期间（符合ACT） |
| **GROW强制** | ❌ 所有用户必须完成 | ✅ 可选模块，用户自主选择 |
| **总轮次** | ~40轮 | 核心27-35轮，全量37-49轮 |

---

### 新流程：三阶段模块化设计

```
┌─────────────────────────────────────────────────────┐
│  阶段1: Values-Based Narrative（价值观导向的叙事）    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  10-15轮对话                                         │
│                                                     │
│  整合内容:                                          │
│  ├─ DICE的D&I探询（描述性+习惯性记忆）              │
│  │  └─ 前3轮自然破冰，建立信任                       │
│  │  └─ 后续深挖具体经历和故事                       │
│  └─ ACT价值观澄清（3-5个生活领域）                   │
│     └─ 识别核心价值观（家庭、事业、健康、关系等）      │
│                                                     │
│  完成标准:                                          │
│  ✓ 至少2个具体事件的D/I探询                         │
│  ✓ 识别3-5个核心价值观                              │
│  ✓ 至少2个领域达到"价值-行为连接"                   │
└─────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────┐
│  阶段2: Deep Exploration（深度探索与意义澄清）        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  5-10轮对话                                          │
│                                                     │
│  整合内容:                                          │
│  └─ DICE的C&E探询（澄清+解释）                       │
│     └─ 澄清敏感或隐藏信息                           │
│     └─ 探询因果关系和个人意义                       │
│                                                     │
│  完成标准:                                          │
│  ✓ 至少3次C/E深度探询                               │
│  ✓ 达到意义饱和（用户能解释事件因果链）              │
│  ✓ 出现"啊哈时刻"（深层洞察）                        │
└─────────────────────────────────────────────────────┘
           ↓
           ┌────────────────────┐
           │   用户决策点       │
           │ 是否需要制定目标？ │
           └────────┬───────────┘
                   │
         ┌─────────┴─────────┐
         │ 是              否 │
         ↓                   ↓
┌─────────────────┐  ┌──────────────┐
│  阶段3a: GROW   │  │  阶段3b:     │
│  (可选模块)      │  │  直接Summary │
│  ━━━━━━━━━━━━━ │  │  ━━━━━━━━━━ │
│  10-14轮        │  │  2轮         │
│                 │  │              │
│  Goal (3-5轮)  │  │  六要素总结   │
│  Reality (3-5轮)│  │  用户确认     │
│  Options (2-3轮)│  │              │
│  Way (2-3轮)   │  │              │
│                 │  │              │
│  完成标准:      │  │              │
│  ✓ SMART目标   │  │              │
│  ✓ 啊哈时刻     │  │              │
│  ✓ 收敛到1选项  │  │              │
│  ✓ 具体行动承诺 │  │              │
└────────┬────────┘  └──────┬───────┘
         │                  │
         └──────────┬───────┘
                   ↓
          ┌────────────────┐
          │  阶段4: Summary │
          │  ━━━━━━━━━━━━━│
          │  2轮            │
          │                 │
          │  六要素总结:     │
          │  1.关键洞察     │
          │  2.核心价值观   │
          │  3.行动计划(可选)│
          │  4.成就庆祝     │
          │  5.下一步行动   │
          │  6.后续支持     │
          └─────────────────┘
```

---

### 详细阶段设计

#### 阶段1: Values-Based Narrative（10-15轮）

**设计理念**：
- 融合DICE早期探询（D&I）与ACT价值观澄清
- 前3轮自然破冰（D阶段），后续深挖叙事与价值观
- 符合ACT理论："价值观先于目标"

**子流程**：

```
轮次1-3: 自然破冰 (DICE的D - Descriptive)
├─ AI: "在我们开始之前，您希望我怎样称呼您？"
├─ AI: "您现在心情如何？有什么想先聊的吗？"
└─ AI: "今天想探索的话题是什么呢？"

轮次4-7: 叙事深挖 (DICE的D&I)
├─ D: "能具体描述一下那个场景吗？当时的时间、地点、人物？"
├─ I: "这样的情况是经常发生，还是那次特别？"
└─ D: "当时你的感受是什么？"

轮次8-12: 价值观澄清 (ACT Values)
├─ 生活领域识别: "在家庭/事业/健康/关系等领域，什么对你最重要？"
├─ 价值观命名: "如果用一个词概括，你会说是什么？"
├─ 意义化: "为什么这个价值观对你重要？"
├─ 价值-行为连接: "你当前的行为与这个价值观一致吗？"
└─ 冲突识别: "有没有价值观之间的冲突？"

轮次13-15: 整合与过渡
└─ AI: "我们聊了很多，让我总结一下你的核心价值观..."
```

**完成标准**：

**最低要求**（全部满足）：
- ✅ 对话轮数 ≥ 10轮
- ✅ 至少2个具体事件的D/I探询
- ✅ 识别3-5个核心价值观
- ✅ 至少2个领域达到"价值-行为连接"（第三层）

**理想标准**（满足2/3）：
- 用户主动分享价值观冲突
- 用户能够解释价值观的来源（家庭、文化、经历）
- 用户表达改变意愿（"我想更好地体现这个价值观"）

**数据库Schema**：
```sql
-- 新增字段到sessions表
ALTER TABLE sessions ADD COLUMN phase_data TEXT; -- JSON存储各阶段数据

-- phase_data示例:
{
  "values_based_narrative": {
    "key_events": ["事件1描述", "事件2描述"],
    "identified_values": [
      {"domain": "家庭", "value": "陪伴", "layer": 3},
      {"domain": "事业", "value": "创造", "layer": 2}
    ],
    "value_behavior_gaps": ["家庭价值观与加班行为冲突"]
  }
}
```

---

#### 阶段2: Deep Exploration（5-10轮）

**设计理念**：
- 使用DICE后期探询（C&E）挖掘深层意义
- 追求"啊哈时刻"和意义饱和
- 为GROW的Reality阶段减负（避免功能重叠）

**子流程**：

```
轮次1-3: 澄清探询 (DICE的C - Clarifying)
├─ "你刚才提到X，能再详细说说吗？"
├─ "为什么当时选择了Y而不是Z？"
└─ "这件事对你意味着什么？"

轮次4-7: 解释性探询 (DICE的E - Explanatory)
├─ "你觉得是什么导致了这个结果？"
├─ "如果重来一次，你会做什么不同的选择？"
└─ "这段经历如何影响了你现在的想法？"

轮次8-10: 意义整合
├─ AI: "我注意到你多次提到X，这背后的深层原因是什么？"
├─ AI: "你的这些经历和价值观之间有什么联系？"
└─ AI: "你现在对自己有什么新的理解吗？"
```

**完成标准**：

**最低要求**：
- ✅ 对话轮数 ≥ 5轮
- ✅ 至少3次C/E深度探询
- ✅ 用户能解释事件的因果链（A导致B，因为C）

**意义饱和标准**（满足2/3）：
- **洞察出现**：用户使用"我意识到"、"我发现"、"原来是因为"
- **因果链条**：用户能够解释事件之间的因果关系
- **情绪意义化**：用户不仅描述情绪，还能解释情绪的来源和影响

**强制转换信号**：
- 连续2轮对话未出现新洞察（已达饱和）
- 用户主动表达"我想开始制定计划"

---

#### 阶段3a: GROW Model（可选模块，10-14轮）

**触发机制**：

```typescript
// 在Deep Exploration结束后询问用户
const userChoice = await askUser({
  question: "我们已经深入探索了您的经历和价值观。接下来，您希望：",
  options: [
    {
      label: "制定具体的目标和行动计划",
      description: "基于价值观设定SMART目标，明确行动步骤"
    },
    {
      label: "暂时不需要，只想总结洞察",
      description: "生成自我认知报告，不设定具体目标"
    }
  ]
});

if (userChoice === "制定具体的目标和行动计划") {
  // 进入GROW阶段
} else {
  // 直接进入Summary
}
```

**适用人群**：
- ✅ 有明确目标或问题的用户（"我想换工作"、"如何平衡家庭和事业"）
- ✅ 准备好采取行动的用户
- ❌ 完全迷茫、仅想自我探索的用户

**子流程**：

```
Goal阶段 (3-5轮):
├─ "基于你的核心价值观，你最想实现的目标是什么？"
├─ "这个目标符合SMART原则吗？（具体、可衡量、可达成、相关、有时限）"
└─ "短期目标（1-3个月）和长期目标（6-12个月）分别是什么？"

Reality阶段 (3-5轮):
├─ "你当前的状态是什么？已有哪些资源？"
├─ "主要的障碍是什么？"
├─ "有没有限制性信念阻碍你？"（啊哈时刻的关键）
└─ AI总结: "所以你的现状是X，差距是Y，深层原因是Z..."

Options阶段 (2-3轮):
├─ "有哪些可能的方案？"（生成3-5个选项）
├─ "每个方案的优缺点是什么？"
└─ **收敛到1个选项**（严格要求）: "你最想尝试哪个？为什么？"

Way Forward阶段 (2-3轮):
├─ "具体的行动步骤是什么？时间线呢？"
├─ "可能遇到的障碍？如何应对？"
└─ "你承诺在24-48小时内做什么？"（CAT承诺）
```

**完成标准**：

**Goal阶段**：
- ✅ 目标符合SMART原则
- ✅ 区分短期和长期目标
- ✅ 用户对目标重要性评分 ≥ 7/10

**Reality阶段**（最重要）：
- ✅ 列举 ≥ 3个当前现实要素
- ✅ **出现"啊哈时刻"** - 识别深层阻碍（限制性信念、恐惧、资源缺口）
- ✅ 从外部归因转向内部归因

**Options阶段**（严格）：
- ✅ 生成 ≥ 3个可行选项
- ✅ **收敛到1个选项**（这是关键标准）
- ✅ 用户说明选择理由，并与Goal连接

**Way Forward阶段**：
- ✅ 行动步骤 ≥ 3个，包含时间线
- ✅ 识别 ≥ 1-2个潜在障碍及应对策略
- ✅ 用户承诺24-48小时内的具体行动

**数据库Schema**：
```sql
-- phase_data的grow部分
{
  "grow": {
    "goal": {
      "short_term": "1-3个月目标",
      "long_term": "6-12个月目标",
      "importance_score": 8
    },
    "reality": {
      "current_state": ["资源1", "资源2"],
      "gaps": ["缺口1", "缺口2"],
      "aha_moment": "发现自己害怕失败，而非真正缺乏能力"
    },
    "options": [
      {"option": "方案1", "pros": ["优点"], "cons": ["缺点"]},
      {"option": "方案2", "pros": ["优点"], "cons": ["缺点"]},
      {"selected": "方案1", "reason": "选择理由"}
    ],
    "way_forward": {
      "actions": [
        {"step": "步骤1", "timeline": "本周五前"},
        {"step": "步骤2", "timeline": "下周三前"}
      ],
      "obstacles": [{"obstacle": "障碍1", "strategy": "应对策略"}],
      "commitment": "明天开始每天晨跑30分钟"
    }
  }
}
```

---

#### 阶段3b: 直接Summary（2轮）

**适用场景**：
- 用户选择"暂时不需要制定目标"
- 用户只想获得自我认知报告

**流程**：
```
轮次1: AI生成总结
├─ 关键洞察（来自Deep Exploration）
├─ 核心价值观（来自Values-Based Narrative）
├─ 成就庆祝（肯定用户的开放和勇气）
└─ 下一步建议（如"未来可以随时回来制定目标"）

轮次2: 用户确认
└─ AI: "这个总结准确吗？有遗漏或需要调整的吗？"
```

---

#### 阶段4: Summary（2轮）

**六要素总结**（全部必须覆盖）：

```
1. 关键洞察回顾
   └─ 总结2-3个主要洞察（来自Deep Exploration）

2. 核心价值观总结
   └─ 列举3-5个核心价值观及其意义

3. GROW行动计划确认（如果有）
   └─ 复述目标、选定方案、行动步骤

4. 成就庆祝
   └─ 肯定用户的开放和勇气

5. 下一步行动
   └─ 确认24-48小时内的具体行动

6. 后续支持
   └─ 提供访谈报告链接/资源
```

**用户确认机制**：
```
AI: "我刚才总结的这些，是否准确反映了你今天的分享？"
AI: "你对这个行动计划感觉如何？有什么需要调整的吗？"
AI: "还有什么我遗漏的重要内容吗？"
```

---

### 数据库Schema升级

```sql
-- Profile-2 使用独立的数据库
CREATE TABLE sessions_v2 (
  session_id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  user_answer TEXT,
  user_name TEXT,

  -- 阶段管理（简化为4个阶段）
  current_phase TEXT DEFAULT 'values_narrative',  -- values_narrative | deep_exploration | grow | summary
  phases_completed TEXT DEFAULT '[]',  -- JSON数组

  -- 结构化阶段数据（JSON存储）
  phase_data TEXT DEFAULT '{}',  -- 详见各阶段的phase_data设计

  -- 对话历史
  conversation_history TEXT DEFAULT '[]',  -- JSON数组

  -- 最终总结
  final_summary TEXT,

  -- 元数据
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed BOOLEAN DEFAULT 0,
  grow_opted_in BOOLEAN DEFAULT NULL  -- NULL=未决定, 1=选择GROW, 0=跳过GROW
);

-- 阶段转换日志（用于分析和调试）
CREATE TABLE phase_transitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  from_phase TEXT,
  to_phase TEXT,
  transition_reason TEXT,  -- AI的判断理由
  conversation_length INTEGER,  -- 当时的对话轮数
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions_v2(session_id)
);

-- 价值观识别记录
CREATE TABLE identified_values (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  domain TEXT NOT NULL,  -- 家庭、事业、健康、关系等
  value_name TEXT NOT NULL,  -- 陪伴、创造、自由等
  layer INTEGER NOT NULL,  -- 1=识别, 2=意义化, 3=行为连接
  quote TEXT,  -- 用户原话
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions_v2(session_id)
);
```

---

## 🤖 方向2：后端架构全面优化

### 2.1 模型选择与优化

#### 问题诊断

**Qwen2.5:14b的问题**（来自《Qwen长对话性能研究报告》）：
- ✅ 确认存在重复输出bug（GitHub Issue #920）
- 上下文记忆在64K-128K区间下降25.7%
- 不充分结合已给出的回答

#### 优化方案

**短期方案（立即可实施）**：
```typescript
// ollama-service-v2.ts
const OLLAMA_CONFIG = {
  model: 'qwen2.5:14b-instruct',
  options: {
    temperature: 0.7,
    repeat_penalty: 1.3,  // ← 新增，解决重复问题
    num_ctx: 65536,  // ← 限制在64K以内，保持最优性能
    top_p: 0.9
  }
};
```

**中期方案（1-2周测试）**：

**候选模型对比**：

| 模型 | 参数量 | 上下文 | 优势 | 劣势 | 推荐度 |
|------|--------|--------|------|------|--------|
| **qwen2.5:14b** | 14B | 128K | 中文强，速度快 | 重复bug | ⭐⭐⭐ |
| **deepseek-v2.5** | 236B MoE | 128K | 推理能力强，无重复bug | 体积大，速度慢 | ⭐⭐⭐⭐⭐ |
| **qwen3:14b** | 14B | 128K | 修复重复bug | 尚未发布 | ⭐⭐⭐⭐⭐（未来） |

**实施步骤**：
1. 创建 `backend/config/models.json` 配置多模型
2. 添加模型切换接口 `POST /api/rag/profile/switch-model`
3. 对比测试：同一问题，qwen2.5 vs deepseek-v2.5
4. 记录性能指标（速度、质量、重复率）

**长期方案（持续跟进）**：
- 监控Qwen3:14b的发布进度
- 关注Ollama社区的其他中文模型

---

### 2.2 架构重构：追问与阶段判断分离

#### 当前问题

```typescript
// Profile V1的问题
POST /api/rag/profile/generate-followup
  ↓
buildPhasePrompt()  // 同时要求AI:
  - 生成下一个追问
  - 判断是否转换阶段
  - 返回 {question, should_continue, next_phase}

// 问题：
// 1. 职责混乱：一个函数做两件事
// 2. 模型负担重：一次调用要做两种决策
// 3. 难以调试：无法单独优化
```

#### 优化方案：双系统架构

```typescript
// Profile-2架构

// ============ 系统1：追问生成器 ============
POST /api/rag/profile-v2/generate-followup
  ↓
generateFollowupQuestion(session, phase, history)
  └─ 输出: { question, dice_type, reasoning }

// ============ 系统2：阶段判断器 ============
POST /api/rag/profile-v2/evaluate-phase
  ↓
根据 current_phase 调用对应判断器:
├─ evaluateValuesNarrativeComplete()  // 判断阶段1是否完成
├─ evaluateDeepExplorationComplete()  // 判断阶段2是否完成
├─ evaluateGROWComplete()             // 判断阶段3是否完成
└─ 返回: { should_transition, next_phase, reasons }
```

**实施步骤**：

**Step 1：创建独立的阶段判断器**

```typescript
// backend/src/services/phase-evaluator-v2.ts

export class PhaseEvaluator {

  /**
   * 阶段1：Values-Based Narrative 完成判断
   */
  async evaluateValuesNarrativeComplete(
    session: SessionV2,
    history: Message[]
  ): Promise<PhaseEvaluation> {

    // 最低要求检查（规则引擎）
    const roundCount = history.length / 2;  // 用户轮数
    const hasMinRounds = roundCount >= 10;

    const phaseData = JSON.parse(session.phase_data || '{}');
    const hasEvents = (phaseData.values_based_narrative?.key_events?.length || 0) >= 2;
    const hasValues = (phaseData.values_based_narrative?.identified_values?.length || 0) >= 3;
    const hasDeepConnection = phaseData.values_based_narrative?.identified_values
      ?.filter(v => v.layer === 3).length >= 2;

    if (!hasMinRounds || !hasEvents || !hasValues || !hasDeepConnection) {
      return {
        should_transition: false,
        next_phase: null,
        reasons: ['未达到最低要求']
      };
    }

    // 理想标准检查（AI判断）
    const prompt = `
你是一个ACT疗法专家。请判断用户是否准备好进入深度探索阶段。

已完成：
- 对话轮数：${roundCount}
- 具体事件探询：${phaseData.values_based_narrative?.key_events?.length}个
- 核心价值观：${phaseData.values_based_narrative?.identified_values?.length}个

理想标准（满足2/3即可转换）：
1. 用户主动分享价值观冲突
2. 用户能解释价值观的来源
3. 用户表达改变意愿

最近5轮对话：
${history.slice(-10).map(m => `${m.role}: ${m.content}`).join('\n')}

请回答（JSON格式）：
{
  "met_ideal_criteria": 2,  // 满足了几个理想标准
  "should_transition": true/false,
  "reasoning": "判断理由"
}
`;

    const response = await this.ollamaService.generate(prompt);
    const evaluation = JSON.parse(response);

    return {
      should_transition: evaluation.should_transition,
      next_phase: 'deep_exploration',
      reasons: [evaluation.reasoning]
    };
  }

  /**
   * 阶段2：Deep Exploration 完成判断
   */
  async evaluateDeepExplorationComplete(
    session: SessionV2,
    history: Message[]
  ): Promise<PhaseEvaluation> {

    // 最低要求（规则）
    const roundCount = history.length / 2;
    const hasMinRounds = roundCount >= 5;

    if (!hasMinRounds) {
      return {
        should_transition: false,
        next_phase: null,
        reasons: ['对话轮数不足']
      };
    }

    // 意义饱和检查（AI判断）
    const prompt = `
你是质性研究专家。请判断是否达到"意义饱和"。

意义饱和标准（满足2/3即可）：
1. 洞察出现：用户使用"我意识到"、"我发现"、"原来是因为"
2. 因果链条：用户能解释事件之间的因果关系
3. 情绪意义化：用户能解释情绪的来源和影响

最近10轮对话：
${history.slice(-20).map(m => `${m.role}: ${m.content}`).join('\n')}

请回答（JSON格式）：
{
  "insight_count": 2,  // 检测到几次洞察
  "has_causal_chain": true/false,
  "emotion_explained": true/false,
  "saturation_score": 2,  // 满足几个标准
  "should_transition": true/false,
  "reasoning": "判断理由"
}
`;

    const response = await this.ollamaService.generate(prompt);
    const evaluation = JSON.parse(response);

    return {
      should_transition: evaluation.should_transition,
      next_phase: 'grow',  // 注意：这里会询问用户是否进入GROW
      reasons: [evaluation.reasoning]
    };
  }

  /**
   * 阶段3：GROW 完成判断（如果用户选择了GROW）
   */
  async evaluateGROWComplete(
    session: SessionV2,
    history: Message[]
  ): Promise<PhaseEvaluation> {

    const phaseData = JSON.parse(session.phase_data || '{}');
    const grow = phaseData.grow || {};

    // 检查四个子阶段是否完成
    const checks = {
      goal: grow.goal && grow.goal.importance_score >= 7,
      reality: grow.reality && grow.reality.aha_moment,
      options: grow.options && grow.options.selected,
      way: grow.way_forward && grow.way_forward.commitment
    };

    const allComplete = Object.values(checks).every(v => v === true);

    return {
      should_transition: allComplete,
      next_phase: 'summary',
      reasons: [
        `Goal: ${checks.goal ? '✓' : '✗'}`,
        `Reality: ${checks.reality ? '✓' : '✗'}`,
        `Options: ${checks.options ? '✓' : '✗'}`,
        `Way Forward: ${checks.way ? '✓' : '✗'}`
      ]
    };
  }
}
```

**Step 2：修改API流程**

```typescript
// backend/src/server-v2.ts

// ===== API 1: 生成追问 =====
app.post('/api/rag/profile-v2/generate-followup', async (req, res) => {
  const { session_id, user_answer, current_phase, conversation_history } = req.body;

  // 1. 保存用户回答
  await sessionService.appendMessage(session_id, 'user', user_answer);

  // 2. 生成追问（只负责生成问题）
  const followup = await questionGenerator.generate({
    session_id,
    current_phase,
    conversation_history: [...conversation_history, { role: 'user', content: user_answer }]
  });

  res.json({
    success: true,
    followup_question: followup.question,
    dice_type: followup.dice_type,
    reasoning: followup.reasoning
  });
});

// ===== API 2: 评估阶段转换 =====
app.post('/api/rag/profile-v2/evaluate-phase', async (req, res) => {
  const { session_id } = req.body;

  const session = await sessionService.getSession(session_id);
  const history = JSON.parse(session.conversation_history);

  // 调用对应的阶段判断器
  const evaluation = await phaseEvaluator.evaluate(
    session.current_phase,
    session,
    history
  );

  res.json({
    success: true,
    should_transition: evaluation.should_transition,
    next_phase: evaluation.next_phase,
    reasons: evaluation.reasons
  });
});
```

**Step 3：前端调用逻辑**

```typescript
// frontend/src/pages/InterviewV2.tsx

const handleSendMessage = async () => {
  // 1. 发送用户消息，获取AI追问
  const followupRes = await fetch('/api/rag/profile-v2/generate-followup', {
    method: 'POST',
    body: JSON.stringify({
      session_id: currentSession.session_id,
      user_answer: userMessage,
      current_phase: currentPhase,
      conversation_history: [...conversationHistory, newUserMessage]
    })
  });

  const followup = await followupRes.json();
  addMessage('ai', followup.followup_question);

  // 2. 每3轮对话检查一次阶段转换（减少AI调用）
  if (conversationHistory.length % 3 === 0) {
    const evalRes = await fetch('/api/rag/profile-v2/evaluate-phase', {
      method: 'POST',
      body: JSON.stringify({ session_id: currentSession.session_id })
    });

    const evaluation = await evalRes.json();

    if (evaluation.should_transition) {
      // 特殊处理：deep_exploration → grow需要用户确认
      if (currentPhase === 'deep_exploration' && evaluation.next_phase === 'grow') {
        showGROWOptInDialog();  // 询问用户是否制定目标
      } else {
        // 其他阶段自动转换
        handlePhaseTransition(evaluation.next_phase);
      }
    }
  }
};
```

---

### 2.3 上下文管理：滑动窗口与定期总结

#### 问题诊断

- Qwen2.5性能在64K后下降25.7%
- 长对话累积大量上下文
- 本地模型需要"清爽的上下文"

#### 优化方案：分阶段保留策略

```typescript
// backend/src/services/context-manager-v2.ts

export class ContextManager {

  /**
   * 智能上下文管理：根据阶段采用不同策略
   */
  async manageContext(
    phase: PhaseType,
    fullHistory: Message[],
    session: SessionV2
  ): Promise<Message[]> {

    const tokenCount = this.estimateTokens(fullHistory);

    // 如果上下文<32K，直接返回全部
    if (tokenCount < 32000) {
      return fullHistory;
    }

    // 根据阶段选择策略
    switch (phase) {
      case 'values_narrative':
        return this.manageValuesNarrative(fullHistory);

      case 'deep_exploration':
        return this.manageDeepExploration(fullHistory, session);

      case 'grow':
        return this.manageGROW(fullHistory, session);

      case 'summary':
        return this.manageSummary(fullHistory, session);
    }
  }

  /**
   * Values-Based Narrative阶段：保留全部（轮次少）
   */
  private manageValuesNarrative(history: Message[]): Message[] {
    return history;  // 10-15轮，上下文不会超标
  }

  /**
   * Deep Exploration阶段：滑动窗口 + Values总结
   */
  private async manageDeepExploration(
    history: Message[],
    session: SessionV2
  ): Promise<Message[]> {

    const phaseData = JSON.parse(session.phase_data || '{}');
    const valuesSummary = this.generateValuesSummary(phaseData.values_based_narrative);

    return [
      // 系统总结：Values-Based Narrative阶段
      {
        role: 'system',
        content: `[阶段1总结] ${valuesSummary}`,
        timestamp: new Date().toISOString()
      },
      // 保留最近10轮原文
      ...history.slice(-20)
    ];
  }

  /**
   * GROW阶段：保留关键信息 + 最近对话
   */
  private async manageGROW(
    history: Message[],
    session: SessionV2
  ): Promise<Message[]> {

    const phaseData = JSON.parse(session.phase_data || '{}');

    return [
      // Values总结
      {
        role: 'system',
        content: `[核心价值观] ${this.generateValuesSummary(phaseData.values_based_narrative)}`,
        timestamp: new Date().toISOString()
      },
      // Deep Exploration总结
      {
        role: 'system',
        content: `[关键洞察] ${this.generateInsightsSummary(phaseData.deep_exploration)}`,
        timestamp: new Date().toISOString()
      },
      // GROW当前子阶段的对话
      ...this.getGROWSubPhaseHistory(history, phaseData.grow)
    ];
  }

  /**
   * Summary阶段：只保留结构化数据
   */
  private async manageSummary(
    history: Message[],
    session: SessionV2
  ): Promise<Message[]> {

    const phaseData = JSON.parse(session.phase_data || '{}');

    return [
      {
        role: 'system',
        content: `
请生成六要素总结：

1. 关键洞察：${JSON.stringify(phaseData.deep_exploration?.insights)}
2. 核心价值观：${JSON.stringify(phaseData.values_based_narrative?.identified_values)}
3. GROW行动计划：${phaseData.grow ? JSON.stringify(phaseData.grow) : '无'}
4-6. 成就庆祝、下一步行动、后续支持

用户最后的回答：${history[history.length - 1].content}
`,
        timestamp: new Date().toISOString()
      }
    ];
  }

  /**
   * 生成Values阶段总结
   */
  private generateValuesSummary(valuesData: any): string {
    if (!valuesData) return '无';

    const values = valuesData.identified_values || [];
    const valuesList = values.map(v => `${v.domain}-${v.value_name}`).join('、');
    const gaps = valuesData.value_behavior_gaps || [];

    return `用户的核心价值观：${valuesList}。价值观冲突：${gaps.join('、')}。`;
  }

  /**
   * 估算token数量
   */
  private estimateTokens(history: Message[]): number {
    const text = history.map(m => m.content).join(' ');
    return Math.ceil(text.length / 2);  // 粗略估算：2字符≈1token
  }
}
```

---

## 📊 数据迁移计划

### Profile → Profile-2 数据迁移

```typescript
// backend/src/scripts/migrate-to-v2.ts

/**
 * 迁移策略：不迁移旧数据，从零开始
 *
 * 理由：
 * 1. V1的五阶段结构与V2的三阶段不兼容
 * 2. V1的phase_data结构不同
 * 3. V1的用户已完成会话，无需迁移
 *
 * 保留方案：
 * - Profile V1继续运行，供已有用户查看历史
 * - 新用户统一使用Profile-2
 */

export async function setupProfileV2Database() {
  const db = new Database('modules/profile-2/data/profile-v2.db');

  // 创建V2的表结构（见前文的Schema）
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions_v2 (...);
    CREATE TABLE IF NOT EXISTS phase_transitions (...);
    CREATE TABLE IF NOT EXISTS identified_values (...);
  `);

  console.log('✅ Profile-2数据库初始化完成');
}
```

---

## 🚀 实施路线图

### 阶段0：环境准备（1天）

**任务**：
1. ✅ 创建 `modules/profile-2/` 目录结构
2. ✅ 复制 `profile` 的基础代码作为起点
3. ✅ 初始化独立的数据库 `profile-v2.db`

**目录结构**：
```
modules/profile-2/
├── backend/
│   ├── src/
│   │   ├── server-v2.ts
│   │   ├── services/
│   │   │   ├── ollama-service-v2.ts
│   │   │   ├── phase-evaluator-v2.ts  ← 新增
│   │   │   ├── context-manager-v2.ts  ← 新增
│   │   │   └── question-generator-v2.ts  ← 新增
│   │   └── types-v2.ts
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── InterviewV2.tsx
│   │   │   └── QuestionnaireV2.tsx
│   │   ├── constants-v2.ts  ← 新的阶段定义
│   │   └── types-v2.ts
│   └── package.json
├── data/
│   └── profile-v2.db
├── config.json
└── README.md
```

---

### 阶段1：问卷设计实施（1周）

**Week 1 Day 1-2：阶段1实现（Values-Based Narrative）**

**任务**：
1. 定义新的阶段常量和类型
2. 实现D&I探询的提示词
3. 实现ACT价值观澄清的提示词
4. 实现阶段完成判断器 `evaluateValuesNarrativeComplete()`
5. 创建前端UI（融合破冰+叙事+价值观）

**验收标准**：
- ✅ 前3轮自然破冰
- ✅ D&I探询能够深挖具体事件
- ✅ 识别3-5个核心价值观
- ✅ 达到"价值-行为连接"层级

**Week 1 Day 3-4：阶段2实现（Deep Exploration）**

**任务**：
1. 实现C&E探询的提示词
2. 实现意义饱和检测逻辑
3. 实现阶段判断器 `evaluateDeepExplorationComplete()`

**验收标准**：
- ✅ C探询能澄清敏感信息
- ✅ E探询能引导因果推理
- ✅ 检测到"啊哈时刻"信号

**Week 1 Day 5-6：阶段3实现（GROW可选 + Summary）**

**任务**：
1. 实现用户选择对话框（是否进入GROW）
2. 实现GROW四子阶段的提示词
3. 实现直接Summary的流程
4. 实现六要素总结生成

**验收标准**：
- ✅ 用户可以选择跳过GROW
- ✅ GROW的Reality阶段能触发"啊哈时刻"
- ✅ Options阶段强制收敛到1个选项
- ✅ Summary包含六要素

**Week 1 Day 7：集成测试与调优**

**任务**：
1. 完整走通三阶段流程
2. 测试GROW可选逻辑
3. 调整阶段转换标准
4. 修复发现的bug

---

### 阶段2：后端架构优化（1周）

**Week 2 Day 1-2：追问/判断分离**

**任务**：
1. 创建 `phase-evaluator-v2.ts`
2. 创建 `question-generator-v2.ts`
3. 重构API流程（双系统架构）
4. 添加 `/evaluate-phase` 接口

**验收标准**：
- ✅ 追问生成与阶段判断完全独立
- ✅ 可以单独调试每个系统
- ✅ 前端每3轮检查一次阶段转换

**Week 2 Day 3-4：上下文管理**

**任务**：
1. 创建 `context-manager-v2.ts`
2. 实现分阶段保留策略
3. 实现Values/Deep Exploration总结生成
4. 集成到追问生成流程

**验收标准**：
- ✅ 上下文始终<64K
- ✅ 关键信息不丢失
- ✅ 生成的总结准确简洁

**Week 2 Day 5-6：模型优化**

**任务**：
1. 配置 `repeat_penalty: 1.3`
2. 限制 `num_ctx: 65536`
3. 实现模型切换功能
4. 测试deepseek-v2.5效果

**验收标准**：
- ✅ 重复问题明显减少
- ✅ 可以在qwen2.5和deepseek-v2.5之间切换
- ✅ 记录两个模型的性能对比数据

**Week 2 Day 7：性能测试与优化**

**任务**：
1. 压力测试（10个并发会话）
2. 响应时间优化（目标<2秒）
3. 数据库查询优化
4. 添加缓存机制

---

### 阶段3：用户体验优化（3天）

**Day 1：前端UI优化**

**任务**：
1. 优化阶段指示器（3个阶段 + GROW可选标记）
2. 添加价值观识别的可视化卡片
3. 添加GROW选择对话框的精美设计
4. 优化Summary的六要素展示

**Day 2：交互优化**

**任务**：
1. 添加打字机效果（AI消息逐字显示）
2. 添加阶段转换动画
3. 添加"AI正在思考"的加载状态
4. 优化移动端适配

**Day 3：数据可视化**

**任务**：
1. 生成价值观雷达图（3-5个维度）
2. 生成GROW行动计划时间线
3. 导出PDF报告功能
4. 添加历史会话回顾功能

---

### 阶段4：测试与发布（3天）

**Day 1：功能测试**

**测试场景**：
1. 完全迷茫的用户（跳过GROW）
2. 有明确目标的用户（完整GROW）
3. 中途退出再恢复
4. 极端长回答（>500字）
5. 极端短回答（<10字）

**Day 2：用户测试**

**邀请5-10位真实用户**：
1. 记录完整会话过程
2. 收集用户反馈
3. 分析阶段转换的准确性
4. 统计GROW的选择率

**Day 3：文档与发布**

**任务**：
1. 完善 `modules/profile-2/README.md`
2. 编写开发者文档
3. 编写用户指南
4. 更新主入口门户（添加Profile-2入口）

---

## 📝 配置与启动

### 新的启动脚本

```bash
# modules/profile-2/start-v2.cmd

@echo off
echo ========================================
echo   Profile-2 个人画像系统 V2
echo   理论一致 | 模块化 | 架构优化
echo ========================================
echo.

REM 启动后端
echo [1/2] 启动后端服务 (端口 3002)...
start "Profile-2 Backend" cmd /k "cd backend && npm run dev"

REM 等待2秒
timeout /t 2 /nobreak >nul

REM 启动前端
echo [2/2] 启动前端服务 (端口 5174)...
start "Profile-2 Frontend" cmd /k "cd frontend && pnpm dev"

echo.
echo ✅ Profile-2 启动完成！
echo.
echo 📍 访问地址:
echo    - 前端: http://localhost:5174
echo    - 后端: http://localhost:3002
echo.
echo 📊 与Profile V1的对比:
echo    - V1: 端口5173 (保留运行)
echo    - V2: 端口5174 (新版本)
echo.
pause
```

### 端口分配更新

| 系统 | 端口 | 说明 |
|------|------|------|
| **主入口门户** | 3000 | 统一入口 |
| **日志查看器** | 3001 | 日志监控 |
| **Profile V1后端** | 3002 | 旧版本（保留） |
| **Profile V2后端** | 3003 | 新版本 |
| **Profile V1前端** | 5173 | 旧版本（保留） |
| **Profile V2前端** | 5174 | 新版本 |

---

## 🔬 A/B测试计划

### 测试目标

对比Profile V1 vs Profile-2的效果：

**量化指标**：
1. **完成率**：完成整个流程的用户比例
2. **总时长**：从开始到Summary的时间
3. **轮次数**：平均对话轮数
4. **GROW选择率**：选择进入GROW的用户比例
5. **用户满意度**：5分制评分

**质量指标**：
1. **价值观识别数量**：平均识别几个价值观
2. **洞察深度**：是否出现"啊哈时刻"
3. **重复问题次数**：AI重复提问的频率
4. **阶段转换准确性**：过早/过晚转换的次数

### 实施方法

```typescript
// frontend/src/utils/ab-test.ts

export function assignUserToGroup(userId: string): 'v1' | 'v2' {
  // 简单的哈希分组：偶数用户→V1，奇数用户→V2
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return hash % 2 === 0 ? 'v1' : 'v2';
}

// 在问卷开始前调用
const group = assignUserToGroup(sessionId);
if (group === 'v2') {
  navigate('/profile-v2/questionnaire');
} else {
  navigate('/profile/questionnaire');
}
```

**数据收集**：

```sql
-- 添加A/B测试记录表
CREATE TABLE ab_test_metrics (
  session_id TEXT PRIMARY KEY,
  version TEXT NOT NULL,  -- 'v1' or 'v2'
  completion_rate REAL,
  total_duration_minutes INTEGER,
  total_rounds INTEGER,
  grow_opted_in BOOLEAN,
  user_satisfaction INTEGER,  -- 1-5
  values_identified_count INTEGER,
  aha_moment_detected BOOLEAN,
  repeat_question_count INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 📈 成功指标

### V1 → V2 的预期改进

| 指标 | Profile V1 | Profile-2目标 | 改进 |
|------|-----------|--------------|------|
| **完成率** | 60% | 80% | +33% |
| **平均轮次** | ~40轮 | ~30轮 | -25% |
| **重复问题** | 5-8次/会话 | <2次/会话 | -70% |
| **GROW适用性** | 100%强制 | ~60%选择 | 提高灵活性 |
| **用户满意度** | 3.5/5 | 4.2/5 | +20% |
| **啊哈时刻检出** | 30% | 60% | +100% |

### 长期目标

**3个月内**：
- ✅ Profile-2成为默认版本
- ✅ 完成100+真实用户测试
- ✅ A/B测试数据证明V2优于V1

**6个月内**：
- ✅ 实现多语言支持（英文）
- ✅ 接入语音输入/输出
- ✅ 集成到主入口门户的用户系统

**1年内**：
- ✅ 发布为独立产品
- ✅ 开源核心框架
- ✅ 发表应用案例研究论文

---

## 🛡️ 风险管理

### 风险1：理论验证失败

**风险**：三阶段模块化设计在实际应用中效果不佳

**应对**：
- 保留Profile V1作为备份
- A/B测试持续对比
- 根据数据快速迭代调整

### 风险2：模型性能不足

**风险**：deepseek-v2.5太慢，qwen2.5重复问题未解决

**应对**：
- 准备Plan B：使用API模型（OpenAI GPT-4o-mini）
- 监控Qwen3:14b发布进度
- 实现模型热切换功能

### 风险3：用户不理解可选GROW

**风险**：用户不知道什么时候应该选择GROW

**应对**：
- 优化选择对话框的文案和说明
- 添加"我不确定"选项，由AI推荐
- 提供示例场景（"如果你想..."）

### 风险4：开发时间超期

**风险**：3周计划可能不够

**应对**：
- MVP优先：先完成核心三阶段，优化功能可后续迭代
- 并行开发：前端和后端同时推进
- 复用V1代码：减少重复开发

---

## 📚 附录

### A. 文献依据总结

**DICE技术**：
- Robinson, O. C. (2023). Probing in qualitative research interviews: Theory and practice. *Qualitative Research in Psychology*.
- 明确指出D&I用于早期，C&E用于后期

**GROW模型**：
- Whitmore, J. (1992). *Coaching for Performance*. Nicholas Brealey Publishing.
- Reality阶段应占大部分时间，需要"啊哈时刻"

**ACT价值观**：
- Chase et al. (2013). Values训练+目标设定 > 单独目标设定
- 价值观应在目标设定之前澄清

**质性研究饱和度**：
- Hennink et al. (2017). Code saturation at 9 interviews.
- 意义饱和需要更多轮次

### B. 代码清单

**核心文件**（需要创建/修改）：

1. `backend/src/services/phase-evaluator-v2.ts` - 阶段判断器（新）
2. `backend/src/services/context-manager-v2.ts` - 上下文管理（新）
3. `backend/src/services/question-generator-v2.ts` - 追问生成器（新）
4. `backend/src/server-v2.ts` - 后端API（修改）
5. `frontend/src/pages/InterviewV2.tsx` - 访谈页面（修改）
6. `frontend/src/constants-v2.ts` - 阶段定义（新）
7. `backend/src/types-v2.ts` - 类型定义（新）

### C. 参考资料

**研究报告**：
- 《五阶段问卷设计理论基础研究报告》
- 《访谈阶段转换标准研究报告》
- 《Qwen长对话性能研究报告》
- 《profile优化方向讨论文档》

**外部资源**：
- [ACT官方网站](https://contextualscience.org/)
- [GROW模型详解](https://www.thecoachingtoolscompany.com/the-grow-model-explained/)
- [Robinson (2023) 原文](https://www.tandfonline.com/doi/full/10.1080/14780887.2023.2238625)

---

## ✅ 下一步行动

**立即可做**（今天）：
1. ✅ 创建 `modules/profile-2/` 目录结构
2. ✅ 复制基础代码到profile-2
3. ✅ 初始化独立数据库
4. ✅ 更新主入口门户的导航（添加Profile-2入口）

**本周任务**（Week 1）：
1. 实现阶段1（Values-Based Narrative）
2. 实现阶段2（Deep Exploration）
3. 实现阶段3（GROW可选 + Summary）
4. 基础功能集成测试

**下周任务**（Week 2）：
1. 追问/判断分离架构
2. 上下文管理实施
3. 模型优化测试
4. 性能压测

**第3-4周任务**：
1. 用户体验优化
2. 真实用户测试
3. 文档完善
4. A/B测试启动

---

**文档状态**: 🟢 完整方案，可立即执行
**维护者**: 壮爸
**最后更新**: 2025-01-27
**版本**: 1.0
