/**
 * Phase 2.1 深度访谈界面 - 前端逻辑
 * 五阶段访谈：开场破冰、叙事探索、GROW结构化、价值澄清、总结确认
 *
 * Author: 壮爸
 * Date: 2025-11-24
 */

// =============================================================================
// 全局变量
// =============================================================================

// API基础URL
const API_BASE_URL = 'http://localhost:3002/api/rag/profile';

// 当前会话信息
let currentSession = null;
let currentPhase = 'opening';
let conversationHistory = [];

// 阶段定义
const PHASES = {
    opening: { name: '开场破冰', duration: 5, next: 'narrative' },
    narrative: { name: '叙事探索', duration: 30, next: 'grow' },
    grow: { name: 'GROW结构化', duration: 20, next: 'values' },
    values: { name: '价值澄清', duration: 15, next: 'summary' },
    summary: { name: '总结确认', duration: 5, next: null }
};

// =============================================================================
// 初始化
// =============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 深度访谈系统初始化');

    // 加载会话
    await loadNextSession();

    // 绑定快捷键
    bindKeyboardShortcuts();

    // 开始开场破冰
    if (currentSession) {
        startOpeningPhase();
    }
});

// =============================================================================
// 会话管理
// =============================================================================

/**
 * 加载下一个待访谈的会话
 */
async function loadNextSession() {
    showLoading(true);

    try {
        const response = await fetch(`${API_BASE_URL}/next-session?user_id=default_user`);
        const data = await response.json();

        if (data.has_next) {
            currentSession = data.session;
            conversationHistory = currentSession.conversation_history || [];

            // 显示问题预览
            document.getElementById('questionPreview').textContent =
                `问题: ${currentSession.question_text.substring(0, 50)}...`;

            // 恢复阶段状态
            if (currentSession.phases_completed && currentSession.phases_completed.length > 0) {
                const lastPhase = currentSession.phases_completed[currentSession.phases_completed.length - 1];
                currentPhase = PHASES[lastPhase].next || 'narrative';
            }

            // 更新阶段指示器
            updatePhaseIndicator();

            // 恢复对话历史
            if (conversationHistory.length > 0) {
                displayConversationHistory();
            }

            console.log('✅ 会话加载成功:', currentSession.session_id);
        } else {
            showMessage('所有问题已完成！', 'success');
            setTimeout(() => {
                window.location.href = 'approval.html';
            }, 2000);
        }
    } catch (error) {
        console.error('❌ 加载会话失败:', error);
        showMessage(`加载失败: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

// =============================================================================
// 阶段管理
// =============================================================================

/**
 * 开始开场破冰阶段
 */
function startOpeningPhase() {
    currentPhase = 'opening';
    updatePhaseIndicator();

    // 开场破冰的初始问题
    const openingQuestions = [
        '在我们开始之前，您希望我怎样称呼您？',
        '您现在心情如何？有什么想先聊的吗？',
        '您对这次对话有什么期待吗？'
    ];

    const randomQuestion = openingQuestions[Math.floor(Math.random() * openingQuestions.length)];

    addMessageToHistory('ai', randomQuestion);
    displayCurrentQuestion(randomQuestion);
}

/**
 * 更新阶段指示器
 */
function updatePhaseIndicator() {
    const indicators = document.querySelectorAll('.phase-item');

    indicators.forEach(item => {
        const phase = item.dataset.phase;

        if (phase === currentPhase) {
            item.classList.add('active');
            item.classList.remove('completed');
        } else if (isPhaseCompleted(phase)) {
            item.classList.add('completed');
            item.classList.remove('active');
        } else {
            item.classList.remove('active', 'completed');
        }
    });

    // 更新状态显示
    document.getElementById('sessionStatus').textContent =
        `当前阶段: ${PHASES[currentPhase].name}`;
}

/**
 * 检查阶段是否已完成
 */
function isPhaseCompleted(phase) {
    if (!currentSession || !currentSession.phases_completed) return false;
    return currentSession.phases_completed.includes(phase);
}

// =============================================================================
// 对话交互
// =============================================================================

/**
 * 提交回答
 */
async function submitAnswer() {
    const answerInput = document.getElementById('answerInput');
    const answer = answerInput.value.trim();

    if (!answer) {
        showMessage('请输入您的回答', 'error');
        return;
    }

    if (answer.length < 20) {
        showMessage('请提供更详细的回答（至少20字）', 'error');
        return;
    }

    // 添加到对话历史
    addMessageToHistory('user', answer);

    // 清空输入框
    answerInput.value = '';

    // 保存回答到服务器
    await saveAnswer(answer);

    // 生成AI追问
    await generateFollowup();
}

/**
 * 保存回答到服务器
 */
async function saveAnswer(answer) {
    const currentQuestion = document.getElementById('currentQuestionText').textContent;

    try {
        await fetch(`${API_BASE_URL}/answer-followup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: currentSession.session_id,
                phase: currentPhase,
                followup_question: currentQuestion,
                user_answer: answer
            })
        });

        console.log('✅ 回答已保存');
    } catch (error) {
        console.error('❌ 保存回答失败:', error);
    }
}

/**
 * 生成AI追问
 */
async function generateFollowup() {
    showLoading(true);

    try {
        const response = await fetch(`${API_BASE_URL}/generate-followup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: currentSession.session_id,
                current_phase: currentPhase,
                conversation_history: conversationHistory
            })
        });

        const data = await response.json();

        if (data.success) {
            // 显示追问
            addMessageToHistory('ai', data.followup_question);
            displayCurrentQuestion(data.followup_question, data.dice_type);

            // 检查是否应该结束当前阶段
            if (!data.should_continue) {
                showMessage(`${PHASES[currentPhase].name}阶段已充分探索，可以进入下一阶段`, 'success');
            }

            // 检查是否有下一阶段建议
            if (data.next_phase_suggestion) {
                currentPhase = data.next_phase_suggestion;
                updatePhaseIndicator();
            }
        } else {
            showMessage('生成追问失败，请重试', 'error');
        }
    } catch (error) {
        console.error('❌ 生成追问失败:', error);
        showMessage(`生成失败: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * 结束当前阶段
 */
async function endCurrentPhase() {
    if (!confirm(`确定要结束"${PHASES[currentPhase].name}"阶段吗？`)) {
        return;
    }

    showLoading(true);

    try {
        const response = await fetch(`${API_BASE_URL}/end-phase`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: currentSession.session_id,
                phase: currentPhase
            })
        });

        const data = await response.json();

        if (data.success) {
            showMessage(`${PHASES[currentPhase].name}阶段已完成`, 'success');

            // 进入下一阶段
            if (data.next_phase) {
                currentPhase = data.next_phase;
                updatePhaseIndicator();

                // 如果是总结阶段，跳转到生成总结
                if (currentPhase === 'summary') {
                    await generateSummary();
                } else {
                    // 生成新阶段的第一个问题
                    await generateFollowup();
                }
            }
        }
    } catch (error) {
        console.error('❌ 结束阶段失败:', error);
        showMessage(`操作失败: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * 结束会话并生成总结
 */
async function endSession() {
    if (!confirm('确定要结束本次访谈并生成总结吗？')) {
        return;
    }

    await generateSummary();
}

/**
 * 生成会话总结
 */
async function generateSummary() {
    showLoading(true);
    showMessage('正在生成深度分析，请稍候...', 'success');

    try {
        const response = await fetch(`${API_BASE_URL}/generate-summary`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: currentSession.session_id
            })
        });

        const data = await response.json();

        if (data.success) {
            // 保存总结数据
            localStorage.setItem('current_summary', JSON.stringify(data.summary));
            localStorage.setItem('current_session_id', currentSession.session_id);

            showMessage('分析生成成功！即将跳转到认可页面...', 'success');

            // 跳转到认可页面
            setTimeout(() => {
                window.location.href = 'approval.html';
            }, 2000);
        } else {
            showMessage(`生成失败: ${data.message}`, 'error');
        }
    } catch (error) {
        console.error('❌ 生成总结失败:', error);
        showMessage(`生成失败: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

// =============================================================================
// UI辅助函数
// =============================================================================

/**
 * 添加消息到历史记录
 */
function addMessageToHistory(role, content) {
    const message = {
        role: role,
        content: content,
        timestamp: new Date().toISOString()
    };

    conversationHistory.push(message);

    // 添加到UI
    const historyDiv = document.getElementById('conversationHistory');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${role}`;

    const roleText = role === 'ai' ? '🤖 AI 访谈员' : '👤 您';
    const timeStr = new Date().toLocaleTimeString('zh-CN');

    messageDiv.innerHTML = `
        <div class="message-role">${roleText}</div>
        <div class="message-content">${content}</div>
        <div class="message-timestamp">${timeStr}</div>
    `;

    historyDiv.appendChild(messageDiv);
    historyDiv.scrollTop = historyDiv.scrollHeight;
}

/**
 * 显示当前问题
 */
function displayCurrentQuestion(question, diceType = null) {
    const questionDiv = document.getElementById('currentQuestionText');
    questionDiv.textContent = question;

    // 显示DICE类型标记
    const diceIndicator = document.getElementById('diceIndicator');
    if (diceType && currentPhase === 'narrative') {
        const diceLabels = {
            'descriptive': 'D-描述性',
            'idiographic': 'I-独特性',
            'clarifying': 'C-澄清性',
            'explanatory': 'E-解释性'
        };
        diceIndicator.textContent = diceLabels[diceType] || 'DICE';
        diceIndicator.style.display = 'inline-block';
    } else {
        diceIndicator.style.display = 'none';
    }

    // 聚焦到输入框
    document.getElementById('answerInput').focus();
}

/**
 * 显示对话历史
 */
function displayConversationHistory() {
    const historyDiv = document.getElementById('conversationHistory');
    historyDiv.innerHTML = '';

    conversationHistory.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${msg.role}`;

        const roleText = msg.role === 'ai' ? '🤖 AI 访谈员' : '👤 您';
        const timeStr = new Date(msg.timestamp).toLocaleTimeString('zh-CN');

        messageDiv.innerHTML = `
            <div class="message-role">${roleText}</div>
            <div class="message-content">${msg.content}</div>
            <div class="message-timestamp">${timeStr}</div>
        `;

        historyDiv.appendChild(messageDiv);
    });

    historyDiv.scrollTop = historyDiv.scrollHeight;
}

/**
 * 显示提示消息
 */
function showMessage(message, type = 'success') {
    const toast = document.getElementById('statusToast');
    toast.textContent = message;
    toast.className = `status-toast show ${type}`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

/**
 * 显示/隐藏加载状态
 */
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.className = show ? 'loading-overlay active' : 'loading-overlay';
}

// =============================================================================
// 键盘快捷键
// =============================================================================

function bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+Enter 提交回答
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            submitAnswer();
        }

        // ESC 关闭加载
        if (e.key === 'Escape') {
            showLoading(false);
        }
    });
}

// =============================================================================
// 导出全局函数
// =============================================================================

window.submitAnswer = submitAnswer;
window.endCurrentPhase = endCurrentPhase;
window.endSession = endSession;