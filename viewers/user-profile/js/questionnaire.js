/**
 * Phase 2.1 个人历史画像问卷 - 前端逻辑
 * Author: 壮爸
 * Date: 2025-11-24
 */

// =============================================================================
// 全局变量
// =============================================================================

// 8个核心问题
const QUESTIONS = [
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

// 当前问题索引
let currentQuestionIndex = 0;

// 用户答案
let userAnswers = {};

// API基础URL
const API_BASE_URL = 'http://localhost:3002/api/rag/profile';

// =============================================================================
// 初始化
// =============================================================================

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 问卷系统初始化');

    // 加载本地存储的答案
    loadFromLocalStorage();

    // 显示第一个问题
    displayQuestion(0);

    // 绑定键盘快捷键
    bindKeyboardShortcuts();

    // 自动保存
    setInterval(saveDraft, 30000); // 每30秒自动保存
});

// =============================================================================
// 问题显示
// =============================================================================

/**
 * 显示指定索引的问题
 */
function displayQuestion(index) {
    if (index < 0 || index >= QUESTIONS.length) return;

    currentQuestionIndex = index;
    const question = QUESTIONS[index];

    // 更新问题编号
    document.getElementById('questionNumber').textContent = `问题 ${index + 1}/${QUESTIONS.length}`;

    // 更新问题文本
    document.getElementById('questionText').textContent = question.text;

    // 恢复已保存的答案
    const answerInput = document.getElementById('answerInput');
    answerInput.value = userAnswers[question.id] || '';

    // 更新进度条
    updateProgress();

    // 更新按钮状态
    updateButtons();

    // 聚焦到文本框
    answerInput.focus();
}

/**
 * 更新进度条
 */
function updateProgress() {
    const progress = ((currentQuestionIndex + 1) / QUESTIONS.length) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
    document.getElementById('progressText').textContent = `${currentQuestionIndex + 1}/${QUESTIONS.length}`;
}

/**
 * 更新按钮状态
 */
function updateButtons() {
    // 上一题按钮
    document.getElementById('prevBtn').disabled = currentQuestionIndex === 0;

    // 下一题按钮
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');

    if (currentQuestionIndex === QUESTIONS.length - 1) {
        // 最后一题
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'block';
    } else {
        nextBtn.style.display = 'inline-block';
        submitBtn.style.display = 'none';
    }
}

// =============================================================================
// 导航功能
// =============================================================================

/**
 * 上一题
 */
function prevQuestion() {
    saveCurrentAnswer();
    if (currentQuestionIndex > 0) {
        displayQuestion(currentQuestionIndex - 1);
    }
}

/**
 * 下一题
 */
function nextQuestion() {
    saveCurrentAnswer();

    // 验证当前答案
    if (!validateCurrentAnswer()) {
        showStatus('请输入至少50个字的回答', 'error');
        return;
    }

    if (currentQuestionIndex < QUESTIONS.length - 1) {
        displayQuestion(currentQuestionIndex + 1);
    }
}

/**
 * 保存当前答案
 */
function saveCurrentAnswer() {
    const question = QUESTIONS[currentQuestionIndex];
    const answer = document.getElementById('answerInput').value.trim();

    if (answer) {
        userAnswers[question.id] = answer;
        saveToLocalStorage();
    }
}

/**
 * 验证当前答案
 */
function validateCurrentAnswer() {
    const answer = document.getElementById('answerInput').value.trim();
    return answer.length >= 50; // 至少50个字
}

// =============================================================================
// 本地存储
// =============================================================================

/**
 * 保存到本地存储
 */
function saveToLocalStorage() {
    localStorage.setItem('profile_questionnaire_answers', JSON.stringify(userAnswers));
    localStorage.setItem('profile_questionnaire_timestamp', new Date().toISOString());
}

/**
 * 从本地存储加载
 */
function loadFromLocalStorage() {
    const saved = localStorage.getItem('profile_questionnaire_answers');
    if (saved) {
        try {
            userAnswers = JSON.parse(saved);
            console.log('✅ 已恢复本地存储的答案');
        } catch (e) {
            console.error('❌ 无法解析本地存储的答案');
        }
    }
}

/**
 * 清除本地存储
 */
function clearLocalStorage() {
    localStorage.removeItem('profile_questionnaire_answers');
    localStorage.removeItem('profile_questionnaire_timestamp');
}

// =============================================================================
// 草稿功能
// =============================================================================

/**
 * 保存草稿
 */
function saveDraft() {
    saveCurrentAnswer();
    saveToLocalStorage();
    showStatus('草稿已保存', 'success');
}

// =============================================================================
// 提交功能
// =============================================================================

/**
 * 提交问卷
 */
async function submitQuestionnaire() {
    console.log('📝 准备提交问卷');

    // 保存最后一题的答案
    saveCurrentAnswer();

    // 验证所有答案
    const validation = validateAllAnswers();
    if (!validation.valid) {
        showStatus(`请完成所有问题的回答。未完成的问题: ${validation.missing.join(', ')}`, 'error');
        return;
    }

    // 准备提交数据
    const submitData = {
        user_id: 'default_user',
        answers: QUESTIONS.map(q => ({
            question_id: q.id,
            initial_answer: userAnswers[q.id]
        }))
    };

    // 显示加载状态
    showLoading(true);

    try {
        // 调用API
        const response = await fetch(`${API_BASE_URL}/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(submitData)
        });

        const result = await response.json();

        if (result.success) {
            showStatus('问卷提交成功！即将进入深度访谈...', 'success');

            // 清除本地存储
            clearLocalStorage();

            // 保存会话信息
            localStorage.setItem('interview_sessions', JSON.stringify(result.sessions));

            // 3秒后跳转到访谈页面
            setTimeout(() => {
                window.location.href = 'interview.html';
            }, 3000);
        } else {
            showStatus(`提交失败: ${result.message}`, 'error');
        }
    } catch (error) {
        console.error('❌ 提交失败:', error);
        showStatus(`提交失败: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * 验证所有答案
 */
function validateAllAnswers() {
    const missing = [];

    QUESTIONS.forEach(q => {
        const answer = userAnswers[q.id];
        if (!answer || answer.trim().length < 50) {
            missing.push(`问题${QUESTIONS.indexOf(q) + 1}`);
        }
    });

    return {
        valid: missing.length === 0,
        missing: missing
    };
}

// =============================================================================
// UI辅助函数
// =============================================================================

/**
 * 显示状态消息
 */
function showStatus(message, type = 'success') {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.textContent = message;
    statusDiv.className = `status-message status-${type}`;
    statusDiv.style.display = 'block';

    // 3秒后自动隐藏
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 3000);
}

/**
 * 显示/隐藏加载动画
 */
function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    spinner.className = show ? 'loading-spinner active' : 'loading-spinner';
}

// =============================================================================
// 键盘快捷键
// =============================================================================

/**
 * 绑定键盘快捷键
 */
function bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+S 保存草稿
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            saveDraft();
        }

        // Alt+左箭头 上一题
        if (e.altKey && e.key === 'ArrowLeft') {
            e.preventDefault();
            prevQuestion();
        }

        // Alt+右箭头 下一题
        if (e.altKey && e.key === 'ArrowRight') {
            e.preventDefault();
            nextQuestion();
        }

        // Ctrl+Enter 提交（最后一题）
        if (e.ctrlKey && e.key === 'Enter' && currentQuestionIndex === QUESTIONS.length - 1) {
            e.preventDefault();
            submitQuestionnaire();
        }
    });
}

// =============================================================================
// 导出全局函数（供HTML调用）
// =============================================================================

window.prevQuestion = prevQuestion;
window.nextQuestion = nextQuestion;
window.saveDraft = saveDraft;
window.submitQuestionnaire = submitQuestionnaire;