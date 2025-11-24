/**
 * Phase 2.1 分析认可界面 - 前端逻辑
 * 用户审核和认可AI分析结果
 *
 * Author: 壮爸
 * Date: 2025-11-24
 */

// =============================================================================
// 全局变量
// =============================================================================

const API_BASE_URL = 'http://localhost:3002/api/rag/profile';

// 当前分析数据
let currentSummary = null;
let currentSessionId = null;
let modifiedInsights = {};

// =============================================================================
// 初始化
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 认可界面初始化');

    // 加载分析数据
    loadSummaryData();
});

// =============================================================================
// 数据加载
// =============================================================================

/**
 * 加载分析数据
 */
function loadSummaryData() {
    // 从本地存储加载
    const summaryData = localStorage.getItem('current_summary');
    const sessionId = localStorage.getItem('current_session_id');

    if (summaryData && sessionId) {
        try {
            currentSummary = JSON.parse(summaryData);
            currentSessionId = sessionId;

            console.log('✅ 分析数据加载成功');

            // 显示数据
            displaySummary();
        } catch (error) {
            console.error('❌ 解析分析数据失败:', error);
            alert('分析数据格式错误，请重新生成');
        }
    } else {
        alert('没有找到分析数据，请先完成访谈');
        window.location.href = 'interview.html';
    }
}

// =============================================================================
// 数据显示
// =============================================================================

/**
 * 显示分析总结
 */
function displaySummary() {
    if (!currentSummary) return;

    // 更新统计数据
    updateStatistics();

    // 显示核心价值观
    displayValues();

    // 显示三层洞察
    displayInsights();

    // 显示其他洞察
    displayAdditionalInsights();
}

/**
 * 更新统计数据
 */
function updateStatistics() {
    const insightCount = currentSummary.insights?.length || 0;
    const valueCount = currentSummary.core_values?.length || 0;
    const goalCount = currentSummary.goals?.length || 0;
    const patternCount = currentSummary.behavioral_patterns?.length || 0;

    document.getElementById('insightCount').textContent = insightCount;
    document.getElementById('valueCount').textContent = valueCount;
    document.getElementById('goalCount').textContent = goalCount;
    document.getElementById('patternCount').textContent = patternCount;
}

/**
 * 显示核心价值观
 */
function displayValues() {
    const valuesList = document.getElementById('valuesList');
    const values = currentSummary.core_values || [];

    if (values.length === 0) {
        valuesList.innerHTML = '<div style="color: var(--pip-boy-green-dim);">暂未识别到核心价值观</div>';
        return;
    }

    valuesList.innerHTML = values.map((value, index) => {
        const stars = '★'.repeat(5 - index) + '☆'.repeat(index);
        return `
            <div class="value-item">
                <div class="value-rank">${value.importance_rank || index + 1}</div>
                <div class="value-name">${value.value_name}</div>
                <div class="value-stars">${stars}</div>
            </div>
        `;
    }).join('');
}

/**
 * 显示三层洞察
 */
function displayInsights() {
    const insights = currentSummary.insights || [];

    // 分层显示
    const factInsights = insights.filter(i => i.layer === 'fact');
    const interpretationInsights = insights.filter(i => i.layer === 'interpretation');
    const insightLayerInsights = insights.filter(i => i.layer === 'insight');

    // 显示事实层
    displayInsightLayer('factInsights', factInsights);

    // 显示解释层
    displayInsightLayer('interpretationInsights', interpretationInsights);

    // 显示洞察层
    displayInsightLayer('insightLayerInsights', insightLayerInsights);
}

/**
 * 显示单层洞察
 */
function displayInsightLayer(elementId, insights) {
    const container = document.getElementById(elementId);

    if (insights.length === 0) {
        container.innerHTML = '<div style="color: var(--pip-boy-green-dim);">暂无洞察</div>';
        return;
    }

    container.innerHTML = insights.map((insight, index) => {
        const id = `${elementId}_${index}`;
        return `
            <div class="insight-card" id="${id}" data-insight-index="${index}">
                <div class="insight-content">${insight.content}</div>
                ${insight.evidence ? `
                    <div class="insight-evidence">
                        证据: ${insight.evidence}
                    </div>
                ` : ''}
                <div class="insight-actions">
                    <button class="action-btn" onclick="approveInsight('${id}')">
                        ✓ 认可
                    </button>
                    <button class="action-btn" onclick="editInsight('${id}', '${insight.content}')">
                        ✎ 编辑
                    </button>
                    <button class="action-btn" onclick="rejectInsight('${id}')">
                        ✗ 拒绝
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * 显示其他洞察
 */
function displayAdditionalInsights() {
    // 转折点
    const turningPoints = currentSummary.turning_points || [];
    const turningPointsEl = document.getElementById('turningPoints');

    if (turningPoints.length > 0) {
        turningPointsEl.innerHTML = turningPoints.map(tp => `
            <div style="margin-bottom: 10px;">
                <strong>${tp.event_description}</strong><br/>
                时间: ${tp.time_period || '未知'}<br/>
                影响: ${tp.impact || ''}
            </div>
        `).join('');
    }

    // 目标
    const goals = currentSummary.goals || [];
    const goalsEl = document.getElementById('goals');

    if (goals.length > 0) {
        goalsEl.innerHTML = goals.map(goal => `
            <div style="margin-bottom: 10px;">
                <strong>${goal.goal_description}</strong><br/>
                类型: ${goal.goal_type || '未知'}<br/>
                动机: ${goal.motivation || ''}
            </div>
        `).join('');
    }

    // 行为模式
    const patterns = currentSummary.behavioral_patterns || [];
    const patternsEl = document.getElementById('behaviorPatterns');

    if (patterns.length > 0) {
        patternsEl.innerHTML = patterns.map(pattern => `
            <div style="margin-bottom: 10px;">
                <strong>${pattern.pattern_description}</strong><br/>
                类型: ${pattern.pattern_type || '未知'}<br/>
                触发: ${pattern.trigger_context || ''}
            </div>
        `).join('');
    }
}

// =============================================================================
// 洞察操作
// =============================================================================

/**
 * 认可洞察
 */
function approveInsight(id) {
    const card = document.getElementById(id);
    card.classList.remove('modified', 'rejected');
    card.classList.add('approved');

    // 移除修改记录
    delete modifiedInsights[id];

    console.log(`✅ 认可洞察: ${id}`);
}

/**
 * 编辑洞察
 */
function editInsight(id, originalContent) {
    const modal = document.getElementById('editModal');
    const overlay = document.getElementById('modalOverlay');
    const textarea = document.getElementById('editTextarea');

    // 设置内容
    textarea.value = modifiedInsights[id] || originalContent;
    textarea.dataset.targetId = id;

    // 显示模态框
    modal.classList.add('active');
    overlay.classList.add('active');
    textarea.focus();
}

/**
 * 保存编辑
 */
function saveEdit() {
    const textarea = document.getElementById('editTextarea');
    const targetId = textarea.dataset.targetId;
    const newContent = textarea.value.trim();

    if (!newContent) {
        alert('内容不能为空');
        return;
    }

    // 保存修改
    modifiedInsights[targetId] = newContent;

    // 更新显示
    const card = document.getElementById(targetId);
    card.querySelector('.insight-content').textContent = newContent;
    card.classList.remove('approved', 'rejected');
    card.classList.add('modified');

    console.log(`✏️ 修改洞察: ${targetId}`);

    // 关闭模态框
    closeEditModal();
}

/**
 * 关闭编辑模态框
 */
function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
    document.getElementById('modalOverlay').classList.remove('active');
}

/**
 * 拒绝洞察
 */
function rejectInsight(id) {
    const card = document.getElementById(id);
    card.classList.remove('approved', 'modified');
    card.classList.add('rejected');

    // 标记为拒绝
    modifiedInsights[id] = null;

    console.log(`❌ 拒绝洞察: ${id}`);
}

// =============================================================================
// 最终操作
// =============================================================================

/**
 * 全部认可
 */
async function approveAll() {
    if (!confirm('确定认可所有分析结果吗？')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/approve-summary`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: currentSessionId,
                action: 'approve',
                modified_insights: null
            })
        });

        const result = await response.json();

        if (result.success) {
            alert('分析已认可，数据已存入知识库！');

            // 清理本地存储
            localStorage.removeItem('current_summary');
            localStorage.removeItem('current_session_id');

            // 返回访谈页面继续下一个问题
            setTimeout(() => {
                window.location.href = 'interview.html';
            }, 2000);
        } else {
            alert(`认可失败: ${result.message}`);
        }
    } catch (error) {
        console.error('❌ 认可失败:', error);
        alert(`认可失败: ${error.message}`);
    }
}

/**
 * 保存修改
 */
async function saveModified() {
    // 应用所有修改
    const modifiedSummary = JSON.parse(JSON.stringify(currentSummary));

    // 应用修改和拒绝
    Object.keys(modifiedInsights).forEach(id => {
        const index = parseInt(id.split('_').pop());
        const layerType = id.split('_')[0];

        if (modifiedInsights[id] === null) {
            // 拒绝的洞察，从列表中移除
            // 这里需要根据实际情况处理
        } else if (modifiedInsights[id]) {
            // 修改的洞察
            const insights = modifiedSummary.insights || [];
            insights.forEach(insight => {
                if (insight.content === document.getElementById(id).dataset.originalContent) {
                    insight.content = modifiedInsights[id];
                }
            });
        }
    });

    try {
        const response = await fetch(`${API_BASE_URL}/approve-summary`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: currentSessionId,
                action: 'modify',
                modified_insights: modifiedSummary
            })
        });

        const result = await response.json();

        if (result.success) {
            alert('修改已保存，数据已存入知识库！');

            // 清理本地存储
            localStorage.removeItem('current_summary');
            localStorage.removeItem('current_session_id');

            // 返回访谈页面
            setTimeout(() => {
                window.location.href = 'interview.html';
            }, 2000);
        } else {
            alert(`保存失败: ${result.message}`);
        }
    } catch (error) {
        console.error('❌ 保存失败:', error);
        alert(`保存失败: ${error.message}`);
    }
}

/**
 * 重新生成
 */
function regenerate() {
    if (!confirm('确定要重新生成分析吗？当前的修改将会丢失。')) {
        return;
    }

    // 返回访谈页面重新生成
    window.location.href = 'interview.html';
}

// =============================================================================
// 导出全局函数
// =============================================================================

window.approveInsight = approveInsight;
window.editInsight = editInsight;
window.saveEdit = saveEdit;
window.closeEditModal = closeEditModal;
window.rejectInsight = rejectInsight;
window.approveAll = approveAll;
window.saveModified = saveModified;
window.regenerate = regenerate;