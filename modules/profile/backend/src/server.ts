/**
 * Phase 2.1 RAG Profile 服务器
 * 个人历史画像深度采集系统后端
 *
 * Author: 壮爸
 * Date: 2025-11-24
 * Version: 2.0.0 (TypeScript)
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import { getConfig } from './config.js';
import { getDatabase } from './migrate.js';
import { OllamaService } from './services/ollama-service.js';

// 初始化应用
const app = express();
const config = getConfig();

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(config.paths.viewerRoot));

// 初始化服务
const ollamaService = new OllamaService();

/**
 * 生成唯一ID
 */
function generateId(prefix: string): string {
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
app.post('/api/rag/profile/submit', (req: Request, res: Response) => {
    console.log('📝 API 1: 提交基础问卷');
    const { user_id = 'default_user', answers } = req.body;

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
        res.status(400).json({
            success: false,
            message: '答案不能为空'
        });
        return;
    }

    const db = getDatabase();

    try {
        db.prepare('BEGIN').run();

        const sessions = answers.map((answer: { question_id: string; initial_answer: string }) => {
            const question = PROFILE_QUESTIONS.find(q => q.id === answer.question_id);
            if (!question) {
                throw new Error(`无效的问题ID: ${answer.question_id}`);
            }

            // ✅ 检查是否已存在该用户+问题的会话
            const existingSession = db.prepare(`
                SELECT session_id FROM interview_sessions
                WHERE user_id = ? AND question_id = ?
                ORDER BY created_at DESC
                LIMIT 1
            `).get(user_id, answer.question_id) as { session_id: string } | undefined;

            let sessionId: string;

            if (existingSession) {
                // 已存在会话：覆盖逻辑
                sessionId = existingSession.session_id;
                console.log(`🔄 检测到已存在会话 ${sessionId}，执行覆盖...`);

                // 🗑️ 级联删除所有关联的旧洞察数据
                db.prepare(`DELETE FROM insights WHERE session_id = ?`).run(sessionId);
                db.prepare(`DELETE FROM user_values WHERE session_id = ?`).run(sessionId);
                db.prepare(`DELETE FROM turning_points WHERE session_id = ?`).run(sessionId);
                db.prepare(`DELETE FROM goals WHERE session_id = ?`).run(sessionId);
                db.prepare(`DELETE FROM personality_traits WHERE session_id = ?`).run(sessionId);
                console.log(`🗑️ 已删除旧洞察数据`);

                // 🔄 重置会话状态
                db.prepare(`
                    UPDATE interview_sessions
                    SET initial_answer = ?,
                        question_text = ?,
                        phase_status = 'pending',
                        phases_completed = NULL,
                        full_transcript = NULL,
                        ai_analysis = NULL,
                        user_approved = 0,
                        final_summary = NULL,
                        approved_at = NULL,
                        updated_at = datetime('now', 'localtime')
                    WHERE session_id = ?
                `).run(answer.initial_answer, question.text, sessionId);
                console.log(`✅ 会话已重置为初始状态`);
            } else {
                // 不存在会话：新建
                sessionId = generateId('session');

                db.prepare(`
                    INSERT INTO interview_sessions
                    (session_id, user_id, question_id, question_text, initial_answer, phase_status)
                    VALUES (?, ?, ?, ?, ?, 'pending')
                `).run(sessionId, user_id, answer.question_id, question.text, answer.initial_answer);

                console.log(`✅ 创建新会话: ${sessionId}`);
            }

            return {
                session_id: sessionId,
                question_id: answer.question_id
            };
        });

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
        console.error('❌ 提交失败:', (error as Error).message);
        res.status(500).json({
            success: false,
            message: (error as Error).message
        });
    } finally {
        db.close();
    }
});

// =============================================================================
// API 2: 获取下一个待访谈的会话（支持指定 session_id）
// =============================================================================
app.get('/api/rag/profile/next-session', (req: Request, res: Response) => {
    console.log('🔍 API 2: 获取下一个待访谈的会话');
    const { user_id = 'default_user', session_id } = req.query;

    const db = getDatabase();

    try {
        let session: Record<string, unknown> | undefined;

        if (session_id) {
            // ✅ 如果指定了 session_id，直接查询该 session
            console.log(`🎯 查询指定会话: ${session_id}`);
            session = db.prepare(`
                SELECT * FROM interview_sessions
                WHERE session_id = ?
            `).get(session_id) as Record<string, unknown> | undefined;
        } else {
            // 未指定 session_id，返回下一个未完成的会话
            console.log(`🔍 查询下一个未完成会话`);
            session = db.prepare(`
                SELECT * FROM interview_sessions
                WHERE user_id = ? AND phase_status != 'completed'
                ORDER BY created_at ASC
                LIMIT 1
            `).get(user_id) as Record<string, unknown> | undefined;
        }

        if (!session) {
            res.json({
                has_next: false,
                message: '所有问题已完成'
            });
            return;
        }

        const conversation = session.full_transcript
            ? JSON.parse(session.full_transcript as string)
            : [];
        const phases_completed = session.phases_completed
            ? JSON.parse(session.phases_completed as string)
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
        console.error('❌ 获取失败:', (error as Error).message);
        res.status(500).json({
            success: false,
            message: (error as Error).message
        });
    } finally {
        db.close();
    }
});

// =============================================================================
// API 3: 生成追问
// =============================================================================
app.post('/api/rag/profile/generate-followup', async (req: Request, res: Response) => {
    console.log('🤖 API 3: 生成追问');
    const { session_id, current_phase, conversation_history } = req.body;

    console.log('📊 收到的对话历史:', JSON.stringify(conversation_history, null, 2));
    console.log('📝 对话历史长度:', conversation_history?.length || 0);

    if (!session_id || !current_phase) {
        res.status(400).json({
            success: false,
            message: '缺少必要参数'
        });
        return;
    }

    const db = getDatabase();

    try {
        const session = db.prepare(`
            SELECT * FROM interview_sessions
            WHERE session_id = ?
        `).get(session_id) as { question_text: string; initial_answer: string } | undefined;

        if (!session) {
            throw new Error('会话不存在');
        }

        const prompt = ollamaService.buildPhasePrompt(
            current_phase,
            session,
            conversation_history || []
        );

        console.log('📋 生成的提示词长度:', prompt.length);

        console.log(`📝 当前阶段: ${current_phase}`);

        const response = await ollamaService.generate(prompt);

        let followup;
        try {
            followup = JSON.parse(response);
            console.log('✅ AI 返回解析成功:', JSON.stringify(followup, null, 2));
        } catch {
            console.error('⚠️ JSON解析失败，返回默认追问');
            console.error('⚠️ 原始响应:', response.substring(0, 200));
            followup = {
                question: '能再详细说说这部分吗？',
                dice_type: 'clarifying',
                reasoning: '需要更多信息',
                should_continue: true,
                next_phase: null
            };
        }

        console.log('🔔 should_continue:', followup.should_continue);
        console.log('🔔 next_phase:', followup.next_phase);

        res.json({
            success: true,
            followup_question: followup.question,
            dice_type: followup.dice_type || current_phase,
            should_continue: followup.should_continue !== false,
            next_phase_suggestion: followup.next_phase
        });
    } catch (error) {
        console.error('❌ 生成追问失败:', (error as Error).message);
        res.status(500).json({
            success: false,
            message: (error as Error).message
        });
    } finally {
        db.close();
    }
});

// =============================================================================
// API 4: 提交追问回答
// =============================================================================
app.post('/api/rag/profile/answer-followup', (req: Request, res: Response) => {
    console.log('💬 API 4: 提交追问回答');
    const { session_id, phase, followup_question, user_answer } = req.body;

    if (!session_id || !phase || !user_answer) {
        res.status(400).json({
            success: false,
            message: '缺少必要参数'
        });
        return;
    }

    const db = getDatabase();

    try {
        const session = db.prepare(`
            SELECT full_transcript FROM interview_sessions
            WHERE session_id = ?
        `).get(session_id) as { full_transcript: string | null } | undefined;

        if (!session) {
            throw new Error('会话不存在');
        }

        const transcript = session.full_transcript
            ? JSON.parse(session.full_transcript)
            : [];

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
        console.error('❌ 保存失败:', (error as Error).message);
        res.status(500).json({
            success: false,
            message: (error as Error).message
        });
    } finally {
        db.close();
    }
});

// =============================================================================
// API 5: 结束阶段
// =============================================================================
app.post('/api/rag/profile/end-phase', (req: Request, res: Response) => {
    console.log('✅ API 5: 结束阶段');
    const { session_id, phase } = req.body;

    if (!session_id || !phase) {
        res.status(400).json({
            success: false,
            message: '缺少必要参数'
        });
        return;
    }

    const db = getDatabase();

    try {
        const session = db.prepare(`
            SELECT phases_completed FROM interview_sessions
            WHERE session_id = ?
        `).get(session_id) as { phases_completed: string | null } | undefined;

        if (!session) {
            throw new Error('会话不存在');
        }

        const completed = session.phases_completed
            ? JSON.parse(session.phases_completed)
            : [];

        if (!completed.includes(phase)) {
            completed.push(phase);
        }

        const phaseOrder = ['opening', 'narrative', 'grow', 'values', 'summary'];
        const currentIndex = phaseOrder.indexOf(phase);
        const nextPhase = phaseOrder[currentIndex + 1] || 'summary';

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
        console.error('❌ 结束阶段失败:', (error as Error).message);
        res.status(500).json({
            success: false,
            message: (error as Error).message
        });
    } finally {
        db.close();
    }
});

// =============================================================================
// API 6: 生成会话总结
// =============================================================================
app.post('/api/rag/profile/generate-summary', async (req: Request, res: Response) => {
    console.log('📊 API 6: 生成会话总结');
    const { session_id } = req.body;

    if (!session_id) {
        res.status(400).json({
            success: false,
            message: '缺少会话ID'
        });
        return;
    }

    const db = getDatabase();

    try {
        const session = db.prepare(`
            SELECT * FROM interview_sessions
            WHERE session_id = ?
        `).get(session_id) as {
            question_text: string;
            initial_answer: string;
            full_transcript: string | null;
        } | undefined;

        if (!session) {
            throw new Error('会话不存在');
        }

        const transcript = session.full_transcript
            ? JSON.parse(session.full_transcript)
            : [];

        if (transcript.length === 0) {
            res.json({
                success: false,
                message: '对话记录为空，无法生成总结'
            });
            return;
        }

        const prompt = ollamaService.buildAnalysisPrompt(
            session.question_text,
            session.initial_answer,
            transcript
        );

        console.log(`📝 分析对话数量: ${transcript.length}`);

        const analysis = await ollamaService.generate(prompt);

        let summary;
        try {
            summary = JSON.parse(analysis);
        } catch {
            console.error('⚠️ 分析结果JSON解析失败');
            summary = {
                core_values: [],
                turning_points: [],
                goals: [],
                behavioral_patterns: [],
                personality_traits: [],
                insights: []
            };
        }

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
        console.error('❌ 生成总结失败:', (error as Error).message);
        res.status(500).json({
            success: false,
            message: (error as Error).message
        });
    } finally {
        db.close();
    }
});

// =============================================================================
// API 7: 用户认可/修改/拒绝总结
// =============================================================================
app.post('/api/rag/profile/approve-summary', (req: Request, res: Response) => {
    console.log('✔️ API 7: 用户认可总结');
    const { session_id, action, modified_insights } = req.body;

    if (!session_id || !action) {
        res.status(400).json({
            success: false,
            message: '缺少必要参数'
        });
        return;
    }

    const db = getDatabase();

    try {
        db.prepare('BEGIN').run();

        if (action === 'approve' || action === 'modify') {
            const session = db.prepare(`
                SELECT * FROM interview_sessions
                WHERE session_id = ?
            `).get(session_id) as {
                user_id: string;
                ai_analysis: string;
            } | undefined;

            if (!session) {
                throw new Error('会话不存在');
            }

            const analysis = modified_insights || JSON.parse(session.ai_analysis);
            const insights = analysis.insights || [];

            insights.forEach((insight: {
                category: string;
                content: string;
                evidence: string;
                layer: string;
                confidence: number;
            }) => {
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

            if (analysis.core_values) {
                analysis.core_values.forEach((value: {
                    value_name: string;
                    importance_rank: number;
                    definition: string;
                    origin_story: string;
                    evidence: string[];
                }) => {
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

            if (analysis.turning_points) {
                analysis.turning_points.forEach((point: {
                    event_description: string;
                    time_period: string;
                    before_state: string;
                    after_state: string;
                    impact: string;
                    related_values: string[];
                }) => {
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

            if (analysis.goals) {
                analysis.goals.forEach((goal: {
                    goal_description: string;
                    goal_type: string;
                    motivation: string;
                    obstacles: string;
                    resources: string;
                }) => {
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
        console.error('❌ 认可失败:', (error as Error).message);
        res.status(500).json({
            success: false,
            message: (error as Error).message
        });
    } finally {
        db.close();
    }
});

// =============================================================================
// 健康检查端点
// =============================================================================
app.get('/api/health', async (_req: Request, res: Response) => {
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
app.get('/', (_req: Request, res: Response) => {
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
            <p>服务运行在端口 ${config.server.port}</p>
        </body>
        </html>
    `);
});

// =============================================================================
// 启动服务器
// =============================================================================
async function startServer(): Promise<void> {
    const ollamaHealthy = await ollamaService.checkHealth();
    if (!ollamaHealthy) {
        console.warn('⚠️ Ollama 服务未就绪，部分功能可能不可用');
    }

    app.listen(config.server.port, config.server.host, () => {
        console.log('='.repeat(50));
        console.log('🚀 Phase 2.1 RAG Profile Server 已启动');
        console.log(`📍 访问地址: http://${config.server.host}:${config.server.port}`);
        console.log(`🤖 使用模型: ${ollamaService.model}`);
        console.log('='.repeat(50));
    });
}

// 启动
startServer().catch(error => {
    console.error('❌ 服务器启动失败:', (error as Error).message);
    process.exit(1);
});
