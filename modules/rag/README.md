# RAG Module

> 混合检索引擎（向量 + BM25 + RRF融合）

## 目录结构

```
rag/
├── backend/           # TypeScript 后端
│   ├── src/
│   │   ├── index.ts           # 模块入口
│   │   ├── config.ts          # 配置管理
│   │   ├── init-database.ts   # 数据库初始化
│   │   └── services/
│   │       ├── embedding-service.ts    # 嵌入向量服务
│   │       └── hybrid-retrieval.ts     # 混合检索引擎
│   └── package.json
│
├── data/              # 数据文件
│   └── rag-database.db
│
├── config.json        # 模块配置
└── README.md
```

## 运行

```bash
# 初始化数据库
cd backend
pnpm init-db

# 查看数据库
pnpm view-db
```

## 核心功能

### EmbeddingService

嵌入向量生成服务，使用 Qwen3-Embedding:0.6b 模型。

```typescript
import { EmbeddingService } from '@modules/rag-backend';

const service = new EmbeddingService();
const embedding = await service.generate('你好世界');
```

### HybridRetriever

混合检索引擎，结合向量检索和 BM25 关键词检索。

```typescript
import { HybridRetriever } from '@modules/rag-backend';

const retriever = new HybridRetriever();
const results = await retriever.retrieve('PowerShell 编码规范', 10, 0.7);
```

## 6层知识分层

| 层级 | 名称 | 权重 | 说明 |
|------|------|------|------|
| L1 | 核心价值 | 5.0 | 用户核心价值观和原则 |
| L2 | 工作风格 | 4.0 | 工作习惯和偏好 |
| L3 | 技术偏好 | 3.5 | 技术选型和架构偏好 |
| L4 | 历史决策 | 3.0 | 过去的重要决策 |
| L5 | 项目上下文 | 2.5 | 当前项目信息 |
| L6 | 临时会话 | 1.0 | 当前会话上下文 |

## 检索算法

1. **向量检索**: 使用余弦相似度计算语义相关性
2. **BM25检索**: 关键词匹配，支持中文分词
3. **RRF融合**: Reciprocal Rank Fusion 算法融合两种结果
4. **分层权重**: 应用6层知识分层权重调整最终得分

## 数据库表

1. `knowledge_base` - 核心知识库
2. `knowledge_keywords` - 关键词表
3. `user_profile` - 用户画像
4. `project_evolution` - 项目进化记录
5. `user_feedback` - 用户反馈
6. `retrieval_stats` - 检索统计

## 状态

- [x] 服务迁移
- [ ] 前端界面
- [ ] 集成到主门户
