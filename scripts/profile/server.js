/**
 * Phase 2.1 RAG Profile 服务器
 * 个人历史画像深度采集系统后端
 *
 * Author: 壮爸
 * Date: 2025-11-24
 * Version: 1.0
 */

const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const OllamaService = require('../../services/profile/ollama-service');
const EmbeddingService = require('../../services/embedding-service');

// 初始化应用
const app = express();
const PORT = 3002;  // 使用3002端口避免冲突

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '..', '..', 'viewers')));

// 数据库路径
const DB_PATH = path.join(__dirname, '..', 'data', 'rag-database.db');

// 初始化服务
const ollamaService = new OllamaService('qwen2.5:14b-instruct');  // 使用14B模型，推理能力提升15%
let embeddingService;

/**
 * 获取数据库连接
 */
function getDatabase() {
    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    return db;
}

/**
 * 生成唯一ID
 */
function generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 8个问题的定义
 */
const PROFILE_QUESTIONS = [
    {
        id: 'life_chapters',
        text: '如果把你的人生比作一本书，它会有哪些章节？每个章节的主题是什么？哪一章对你影响最大？'
    },
    {
        id: 'education_career',
        text: '描述你的教育和职业历程。有哪些关键的转折点？什么驱动了你的选择？'
    },
    {
        id: 'values_beliefs',
        text: '你最看重的三个价值观是什么？它们是如何形成的？在生活中如何体现？'
    },
    {
        id: 'relationships',
        text: '谁对你的人生影响最大？这些关系如何塑造了现在的你？'
    },
    {
        id: 'challenges_growth',
        text: '你经历过的最大挑战是什么？它如何改变了你？你从中学到了什么？'
    },
    {
        id: 'achievements_pride',
        text: '你最自豪的成就是什么？为什么这对你意义重大？'
    },
    {
        id: 'future_aspirations',
        text: '展望未来，你希望成为什么样的人？你的长期目标是什么？什么会让你觉得人生圆满？'
    },
    {
        id: 'life_philosophy',
        text: '如果要用一句话总结你的人生哲学或座右铭，会是什么？为什么选择这句话？'
    }
];

// =============================================================================
// API 1: 提交基础问卷
// =============================================================================
app.post('/api/rag/profile/submit', (req, res) => {
    console.log('📝 API 1: 提交基础问卷');
    const { user_id = 'default_user', answers } = req.body;

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
        return res.status(400).json({
            success: false,
            message: '答案不能为空'
        });
    }

    const db = getDatabase();

    try {
        db.prepare('BEGIN').run();

        const sessions = answers.map(answer => {
            const sessionId = generateId('session');

            // 验证问题ID
            const question = PROFILE_QUESTIONS.find(q => q.id === answer.question_id);
            if (!question) {
                throw new Error(`无效的问题ID: ${answer.question_id}`);
            }

            // 插入会话记录
            db.prepare(`
                INSERT INTO interview_sessions
                (session_id, user_id, question_id, question_text, initial_answer, phase_status)
                VALUES (?, ?, ?, ?, ?, 'pending')
            `).run(
                sessionId,
                user_id,
                answer.question_id,
                question.text,
                answer.initial_answer
            );

            return {
                session_id: sessionId,
                question_id: answer.question_id
            };
        });

        // 更新用户档案
        db.prepare(`
            UPDATE user_profiles
            SET interview_count = interview_count + ?,
                last_interview_at = datetime('now', 'localtime')
            WHERE user_id = ?
        `).run(sessions.length, user_id);

        db.prepare('COMMIT').run();

        res.json({
            success: true,
            message: '基础问卷已提交，准备进入深度访谈',
            sessions: sessions
        });
    } catch (error) {
        db.prepare('ROLLBACK').run();
        console.error('❌ 提交失败:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    } finally {
        db.close();
    }
});

// =============================================================================
// API 2: 获取下一个待访谈的会话
// =============================================================================
app.get('/api/rag/profile/next-session', (req, res) => {
    console.log('🔍 API 2: 获取下一个待访谈的会话');
    const { user_id = 'default_user' } = req.query;

    const db = getDatabase();

    try {
        // 查找第一个未完成的会话
        const session = db.prepare(`
            SELECT * FROM interview_sessions
            WHERE user_id = ? AND phase_status != 'completed'
            ORDER BY created_at ASC
            LIMIT 1
        `).get(user_id);

        if (!session) {
            return res.json({
                has_next: false,
                message: '所有问题已完成'
            });
        }

        // 解析对话历史
        const conversation = session.full_transcript
            ? JSON.parse(session.full_transcript)
            : [];
        const phases_completed = session.phases_completed
            ? JSON.parse(session.phases_completed)
            : [];

        res.json({
            has_next: true,
            session: {
                ...session,
                phases_completed: phases_completed,
                conversation_history: conversation
            }
        });
    } catch (error) {
        console.error('❌ 获取失败:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    } finally {
        db.close();
    }
});

// =============================================================================
// API 3: 生成追问
// =============================================================================
app.post('/api/rag/profile/generate-followup', async (req, res) => {
    console.log('🤖 API 3: 生成追问');
    const { session_id, current_phase, conversation_history } = req.body;

    if (!session_id || !current_phase) {
        return res.status(400).json({
            success: false,
            message: '缺少必要参数'
        });
    }

    const db = getDatabase();

    try {
        // 读取会话信息
        const session = db.prepare(`
            SELECT * FROM interview_sessions
            WHERE session_id = ?
        `).get(session_id);

        if (!session) {
            throw new Error('会话不存在');
        }

        // 构建提示词
        const prompt = ollamaService.buildPhasePrompt(
            current_phase,
            session,
            conversation_history || []
        );

        console.log(`📝 当前阶段: ${current_phase}`);

        // 调用 AI 生成追问
        const response = await ollamaService.generate(prompt);

        // 解析响应
        let followup;
        try {
            followup = JSON.parse(response);
        } catch (parseError) {
            console.error('⚠️ JSON解析失败，返回默认追问');
            followup = {
                question: '能再详细说说这部分吗？',
                dice_type: 'clarifying',
                reasoning: '需要更多信息',
                should_continue: true,
                next_phase: null
            };
        }

        res.json({
            success: true,
            followup_question: followup.question,
            dice_type: followup.dice_type || current_phase,
            should_continue: followup.should_continue !== false,
            next_phase_suggestion: followup.next_phase
        });
    } catch (error) {
        console.error('❌ 生成追问失败:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    } finally {
        db.close();
    }
});

// =============================================================================
// API 4: 提交追问回答
// =============================================================================
app.post('/api/rag/profile/answer-followup', (req, res) => {
    console.log('💬 API 4: 提交追问回答');
    const { session_id, phase, followup_question, user_answer } = req.body;

    if (!session_id || !phase || !user_answer) {
        return res.status(400).json({
            success: false,
            message: '缺少必要参数'
        });
    }

    const db = getDatabase();

    try {
        // 读取现有对话历史
        const session = db.prepare(`
            SELECT full_transcript FROM interview_sessions
            WHERE session_id = ?
        `).get(session_id);

        if (!session) {
            throw new Error('会话不存在');
        }

        const transcript = session.full_transcript
            ? JSON.parse(session.full_transcript)
            : [];

        // 追加新的对话
        transcript.push(
            {
                role: 'ai',
                content: followup_question,
                phase: phase,
                timestamp: new Date().toISOString()
            },
            {
                role: 'user',
                content: user_answer,
                phase: phase,
                timestamp: new Date().toISOString()
            }
        );

        // 更新数据库
        db.prepare(`
            UPDATE interview_sessions
            SET full_transcript = ?,
                phase_status = 'in_progress',
                updated_at = datetime('now', 'localtime')
            WHERE session_id = ?
        `).run(JSON.stringify(transcript), session_id);

        res.json({
            success: true,
            message: '回答已保存',
            transcript_length: transcript.length
        });
    } catch (error) {
        console.error('❌ 保存失败:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    } finally {
        db.close();
    }
});

// =============================================================================
// API 5: 结束阶段
// =============================================================================
app.post('/api/rag/profile/end-phase', (req, res) => {
    console.log('✅ API 5: 结束阶段');
    const { session_id, phase } = req.body;

    if (!session_id || !phase) {
        return res.status(400).json({
            success: false,
            message: '缺少必要参数'
        });
    }

    const db = getDatabase();

    try {
        // 读取当前完成阶段
        const session = db.prepare(`
            SELECT phases_completed FROM interview_sessions
            WHERE session_id = ?
        `).get(session_id);

        if (!session) {
            throw new Error('会话不存在');
        }

        const completed = session.phases_completed
            ? JSON.parse(session.phases_completed)
            : [];

        // 添加完成的阶段
        if (!completed.includes(phase)) {
            completed.push(phase);
        }

        // 确定下一个阶段
        const phaseOrder = ['opening', 'narrative', 'grow', 'values', 'summary'];
        const currentIndex = phaseOrder.indexOf(phase);
        const nextPhase = phaseOrder[currentIndex + 1] || 'summary';

        // 更新数据库
        db.prepare(`
            UPDATE interview_sessions
            SET phases_completed = ?,
                updated_at = datetime('now', 'localtime')
            WHERE session_id = ?
        `).run(JSON.stringify(completed), session_id);

        res.json({
            success: true,
            message: `${phase} 阶段已完成`,
            next_phase: nextPhase,
            completed_phases: completed
        });
    } catch (error) {
        console.error('❌ 结束阶段失败:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    } finally {
        db.close();
    }
});

// =============================================================================
// API 6: 生成会话总结
// =============================================================================
app.post('/api/rag/profile/generate-summary', async (req, res) => {
    console.log('📊 API 6: 生成会话总结');
    const { session_id } = req.body;

    if (!session_id) {
        return res.status(400).json({
            success: false,
            message: '缺少会话ID'
        });
    }

    const db = getDatabase();

    try {
        // 读取完整会话信息
        const session = db.prepare(`
            SELECT * FROM interview_sessions
            WHERE session_id = ?
        `).get(session_id);

        if (!session) {
            throw new Error('会话不存在');
        }

        const transcript = session.full_transcript
            ? JSON.parse(session.full_transcript)
            : [];

        if (transcript.length === 0) {
            return res.json({
                success: false,
                message: '对话记录为空，无法生成总结'
            });
        }

        // 构建分析提示词
        const prompt = ollamaService.buildAnalysisPrompt(
            session.question_text,
            session.initial_answer,
            transcript
        );

        console.log(`📝 分析对话数量: ${transcript.length}`);

        // 调用 AI 生成分析
        const analysis = await ollamaService.generate(prompt);

        // 解析分析结果
        let summary;
        try {
            summary = JSON.parse(analysis);
        } catch (parseError) {
            console.error('⚠️ 分析结果JSON解析失败');
            // 返回基础结构
            summary = {
                core_values: [],
                turning_points: [],
                goals: [],
                behavioral_patterns: [],
                personality_traits: [],
                insights: []
            };
        }

        // 存储 AI 分析结果
        db.prepare(`
            UPDATE interview_sessions
            SET ai_analysis = ?,
                updated_at = datetime('now', 'localtime')
            WHERE session_id = ?
        `).run(JSON.stringify(summary), session_id);

        res.json({
            success: true,
            summary: summary,
            message: '分析已生成'
        });
    } catch (error) {
        console.error('❌ 生成总结失败:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    } finally {
        db.close();
    }
});

// =============================================================================
// API 7: 用户认可/修改/拒绝总结
// =============================================================================
app.post('/api/rag/profile/approve-summary', (req, res) => {
    console.log('✔️ API 7: 用户认可总结');
    const { session_id, action, modified_insights } = req.body;

    if (!session_id || !action) {
        return res.status(400).json({
            success: false,
            message: '缺少必要参数'
        });
    }

    const db = getDatabase();

    try {
        db.prepare('BEGIN').run();

        if (action === 'approve' || action === 'modify') {
            const session = db.prepare(`
                SELECT * FROM interview_sessions
                WHERE session_id = ?
            `).get(session_id);

            if (!session) {
                throw new Error('会话不存在');
            }

            // 使用修改后的或原始的洞察
            const analysis = modified_insights || JSON.parse(session.ai_analysis);
            const insights = analysis.insights || [];

            // 存储洞察到 insights 表
            insights.forEach(insight => {
                const insightId = generateId('insight');

                db.prepare(`
                    INSERT INTO insights
                    (insight_id, user_id, session_id, category, content,
                     evidence, layer, confidence, user_approved)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)
                `).run(
                    insightId,
                    session.user_id,
                    session_id,
                    insight.category,
                    insight.content,
                    insight.evidence,
                    insight.layer,
                    insight.confidence
                );
            });

            // 存储价值观
            if (analysis.core_values) {
                analysis.core_values.forEach(value => {
                    const valueId = generateId('value');

                    db.prepare(`
                        INSERT INTO user_values
                        (value_id, user_id, session_id, value_name,
                         importance_rank, definition, origin_story, evidence_examples)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `).run(
                        valueId,
                        session.user_id,
                        session_id,
                        value.value_name,
                        value.importance_rank,
                        value.definition,
                        value.origin_story,
                        JSON.stringify(value.evidence)
                    );
                });
            }

            // 存储转折点
            if (analysis.turning_points) {
                analysis.turning_points.forEach(point => {
                    const eventId = generateId('event');

                    db.prepare(`
                        INSERT INTO turning_points
                        (event_id, user_id, session_id, event_description,
                         time_period, before_state, after_state, impact_description,
                         related_values)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `).run(
                        eventId,
                        session.user_id,
                        session_id,
                        point.event_description,
                        point.time_period,
                        point.before_state,
                        point.after_state,
                        point.impact,
                        JSON.stringify(point.related_values)
                    );
                });
            }

            // 存储目标
            if (analysis.goals) {
                analysis.goals.forEach(goal => {
                    const goalId = generateId('goal');

                    db.prepare(`
                        INSERT INTO goals
                        (goal_id, user_id, session_id, goal_description,
                         goal_type, motivation, obstacles, resources)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `).run(
                        goalId,
                        session.user_id,
                        session_id,
                        goal.goal_description,
                        goal.goal_type,
                        goal.motivation,
                        goal.obstacles,
                        goal.resources
                    );
                });
            }

            // 标记会话为已完成
            db.prepare(`
                UPDATE interview_sessions
                SET user_approved = TRUE,
                    phase_status = 'completed',
                    approved_at = datetime('now', 'localtime'),
                    final_summary = ?
                WHERE session_id = ?
            `).run(JSON.stringify(analysis), session_id);

            db.prepare('COMMIT').run();

            res.json({
                success: true,
                message: '分析已认可，数据已存入知识库',
                stored: {
                    insights: insights.length,
                    values: analysis.core_values?.length || 0,
                    turning_points: analysis.turning_points?.length || 0,
                    goals: analysis.goals?.length || 0
                }
            });

        } else if (action === 'reject') {
            res.json({
                success: false,
                message: '请使用 /generate-summary 重新生成分析'
            });
        } else {
            throw new Error(`无效的操作: ${action}`);
        }
    } catch (error) {
        db.prepare('ROLLBACK').run();
        console.error('❌ 认可失败:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    } finally {
        db.close();
    }
});

// =============================================================================
// API 8: 批量存入知识库
// =============================================================================
app.post('/api/rag/profile/sync-to-knowledge-base', async (req, res) => {
    console.log('🔄 API 8: 批量存入知识库');
    const { user_id = 'default_user' } = req.body;

    const db = getDatabase();

    try {
        // 初始化嵌入服务
        if (!embeddingService) {
            embeddingService = new EmbeddingService();
            await embeddingService.initialize();
        }

        // 读取所有已认可的洞察
        const insights = db.prepare(`
            SELECT * FROM insights
            WHERE user_id = ? AND user_approved = TRUE
        `).all(user_id);

        if (insights.length === 0) {
            return res.json({
                success: false,
                message: '没有已认可的洞察需要同步'
            });
        }

        let syncedCount = 0;
        const stats = {
            facts: 0,
            interpretations: 0,
            insights: 0
        };

        // 处理每个洞察
        for (const insight of insights) {
            try {
                // 生成嵌入向量
                const embedding = await embeddingService.generateEmbedding(insight.content);

                // 存储嵌入
                const embeddingId = generateId('emb');
                db.prepare(`
                    INSERT INTO embeddings
                    (embedding_id, content_id, content_type, content_text,
                     embedding_vector, embedding_model)
                    VALUES (?, ?, ?, ?, ?, ?)
                `).run(
                    embeddingId,
                    insight.insight_id,
                    'insight',
                    insight.content,
                    Buffer.from(new Float32Array(embedding).buffer),
                    'qwen3-embedding:0.6b'
                );

                // 同步到 knowledge_base 表
                const kbExists = db.prepare(`
                    SELECT COUNT(*) as count FROM sqlite_master
                    WHERE type='table' AND name='knowledge_base'
                `).get();

                if (kbExists.count > 0) {
                    db.prepare(`
                        INSERT OR REPLACE INTO knowledge_base
                        (id, content, embedding, layer, layer_weight,
                         source_type, source_id, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                    `).run(
                        generateId('kb'),
                        insight.content,
                        Buffer.from(new Float32Array(embedding).buffer),
                        1,  // L1层
                        5.0,  // 最高权重
                        'user_profile',
                        insight.insight_id
                    );
                }

                // 更新统计
                syncedCount++;
                if (insight.layer === 'fact') stats.facts++;
                else if (insight.layer === 'interpretation') stats.interpretations++;
                else if (insight.layer === 'insight') stats.insights++;

            } catch (embError) {
                console.error(`⚠️ 处理洞察失败 ${insight.insight_id}:`, embError.message);
            }
        }

        res.json({
            success: true,
            synced_count: syncedCount,
            details: stats,
            message: `成功同步 ${syncedCount} 条洞察到知识库`
        });

    } catch (error) {
        console.error('❌ 同步失败:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    } finally {
        db.close();
    }
});

// =============================================================================
// 健康检查端点
// =============================================================================
app.get('/api/health', async (req, res) => {
    const healthy = await ollamaService.checkHealth();

    res.json({
        status: healthy ? 'healthy' : 'unhealthy',
        service: 'rag-profile-server',
        model: ollamaService.model,
        timestamp: new Date().toISOString()
    });
});

// =============================================================================
// 静态页面路由
// =============================================================================
app.get('/', (req, res) => {
    res.send(`
        <html>
        <head>
            <title>RAG Profile Server</title>
            <style>
                body {
                    font-family: 'Courier New', monospace;
                    background: #0a0a0a;
                    color: #4af626;
                    padding: 40px;
                }
                h1 { text-shadow: 0 0 10px #4af626; }
                a {
                    color: #4af626;
                    text-decoration: none;
                    display: block;
                    margin: 10px 0;
                }
                a:hover { text-shadow: 0 0 5px #4af626; }
            </style>
        </head>
        <body>
            <h1>🤖 Phase 2.1 RAG Profile Server</h1>
            <p>个人历史画像深度采集系统</p>
            <hr/>
            <h2>可用页面：</h2>
            <a href="/user-profile/questionnaire.html">📝 基础问卷</a>
            <a href="/user-profile/interview.html">💬 深度访谈</a>
            <a href="/user-profile/approval.html">✔️ 认可界面</a>
            <hr/>
            <h2>API 端点：</h2>
            <a href="/api/health">🏥 健康检查</a>
            <p>服务运行在端口 ${PORT}</p>
        </body>
        </html>
    `);
});

// =============================================================================
// 启动服务器
// =============================================================================
async function startServer() {
    // 检查 Ollama 服务
    const ollamaHealthy = await ollamaService.checkHealth();
    if (!ollamaHealthy) {
        console.warn('⚠️ Ollama 服务未就绪，部分功能可能不可用');
    }

    app.listen(PORT, () => {
        console.log('='.repeat(50));
        console.log('🚀 Phase 2.1 RAG Profile Server 已启动');
        console.log(`📍 访问地址: http://localhost:${PORT}`);
        console.log(`🤖 使用模型: ${ollamaService.model}`);
        console.log('='.repeat(50));
    });
}

// 启动
startServer().catch(error => {
    console.error('❌ 服务器启动失败:', error.message);
    process.exit(1);
});