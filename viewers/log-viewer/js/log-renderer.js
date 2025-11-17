/**
 * Log Renderer - 日志渲染器
 * 负责：渲染会话列表、详情面板
 */

class LogRenderer {
    constructor(sessionListEl, detailPanelEl, sessionCountEl) {
        this.sessionListEl = sessionListEl;
        this.detailPanelEl = detailPanelEl;
        this.sessionCountEl = sessionCountEl;
    }

    /**
     * 渲染会话列表
     * @param {Array} sessions - 会话数组
     * @param {number} selectedIndex - 选中的索引
     */
    renderSessionList(sessions, selectedIndex = -1) {
        if (!sessions || sessions.length === 0) {
            this.sessionListEl.innerHTML = '<div class="empty-state">暂无日志数据</div>';
            this.sessionCountEl.textContent = '0';
            return;
        }

        this.sessionCountEl.textContent = sessions.length;

        const html = sessions.map((session, index) => {
            const isActive = index === selectedIndex ? 'active' : '';
            return `
                <div class="session-item ${isActive}" data-index="${index}">
                    <div class="session-id">${this._escapeHtml(session.sessionId)}</div>
                    <div class="session-time">${this._formatTimestamp(session.timestamp)}</div>
                    <div class="session-message">${this._escapeHtml(session.message)}</div>
                </div>
            `;
        }).join('');

        this.sessionListEl.innerHTML = html;
    }

    /**
     * 渲染详情面板
     * @param {Object} session - 会话对象
     */
    renderDetail(session) {
        if (!session) {
            this.detailPanelEl.innerHTML = `
                <div class="empty-state">
                    请从左侧选择一个会话查看详情...
                </div>
            `;
            return;
        }

        const statusClass = this._getStatusClass(session.status);

        this.detailPanelEl.innerHTML = `
            <div class="detail-section">
                <h3>基本信息</h3>
                <div class="detail-item">
                    <span class="detail-label">会话 ID:</span>
                    <span class="detail-value">${this._escapeHtml(session.sessionId)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">时间戳:</span>
                    <span class="detail-value">${this._formatTimestamp(session.timestamp)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">消息:</span>
                    <span class="detail-value">${this._escapeHtml(session.message)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">执行时长:</span>
                    <span class="detail-value">${session.duration} 秒</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">状态:</span>
                    <span class="detail-value ${statusClass}">${session.status}</span>
                </div>
            </div>

            ${session.details ? `
            <div class="detail-section">
                <h3>详细信息</h3>
                ${session.details.userMessage ? `
                <div class="detail-item">
                    <span class="detail-label">用户消息:</span>
                    <span class="detail-value">${this._escapeHtml(session.details.userMessage)}</span>
                </div>
                ` : ''}
                ${session.details.claudeReply ? `
                <div class="detail-item">
                    <span class="detail-label">Claude 回复:</span>
                    <span class="detail-value">${this._escapeHtml(session.details.claudeReply)}</span>
                </div>
                ` : ''}
                ${session.details.ollamaModel ? `
                <div class="detail-item">
                    <span class="detail-label">Ollama 模型:</span>
                    <span class="detail-value">${this._escapeHtml(session.details.ollamaModel)}</span>
                </div>
                ` : ''}
                ${session.details.voice ? `
                <div class="detail-item">
                    <span class="detail-label">语音:</span>
                    <span class="detail-value">${this._escapeHtml(session.details.voice)}</span>
                </div>
                ` : ''}
            </div>
            ` : ''}

            <div class="detail-section">
                <h3>完整数据 (JSON)</h3>
                <pre>${JSON.stringify(session, null, 2)}</pre>
            </div>
        `;
    }

    /**
     * 显示加载状态
     */
    showLoading() {
        this.sessionListEl.innerHTML = '<div class="loading">正在加载日志数据...</div>';
        this.detailPanelEl.innerHTML = '<div class="empty-state">请从左侧选择一个会话查看详情...</div>';
    }

    /**
     * 显示错误
     * @param {string} message - 错误消息
     */
    showError(message) {
        this.sessionListEl.innerHTML = `<div class="error-message">错误: ${this._escapeHtml(message)}</div>`;
        this.detailPanelEl.innerHTML = `<div class="error-message">无法加载日志数据</div>`;
    }

    /**
     * 格式化时间戳
     * @param {string} timestamp - ISO 8601 时间戳
     * @returns {string}
     * @private
     */
    _formatTimestamp(timestamp) {
        try {
            const date = new Date(timestamp);
            return date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
        } catch (e) {
            return timestamp;
        }
    }

    /**
     * 获取状态样式类
     * @param {string} status - 状态
     * @returns {string}
     * @private
     */
    _getStatusClass(status) {
        if (!status) return '';
        const statusLower = status.toLowerCase();
        if (statusLower === 'success') return 'status-success';
        if (statusLower === 'warning') return 'status-warning';
        if (statusLower === 'error') return 'status-error';
        return '';
    }

    /**
     * HTML 转义（防止 XSS）
     * @param {string} str - 字符串
     * @returns {string}
     * @private
     */
    _escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}
