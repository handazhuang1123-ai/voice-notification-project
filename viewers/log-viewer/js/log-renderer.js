/**
 * Log Renderer - 日志渲染器
 * 负责：渲染日期列表、会话列表、详情面板
 */

class LogRenderer {
    constructor(sessionListEl, detailPanelEl, sessionCountEl, headerEl) {
        this.sessionListEl = sessionListEl;
        this.detailPanelEl = detailPanelEl;
        this.sessionCountEl = sessionCountEl;
        this.headerEl = headerEl;
    }

    /**
     * 渲染日期列表
     * @param {Array} dateGroups - 日期分组数组
     * @param {number} selectedIndex - 选中的索引
     */
    renderDateList(dateGroups, selectedIndex = -1) {
        if (!dateGroups || dateGroups.length === 0) {
            this.sessionListEl.innerHTML = '<div class="empty-state">暂无日志数据</div>';
            this.sessionCountEl.textContent = '0';
            this.headerEl.textContent = '日期列表';
            return;
        }

        const totalSessions = dateGroups.reduce((sum, group) => sum + group.sessions.length, 0);
        this.sessionCountEl.textContent = totalSessions;
        this.headerEl.textContent = '日期列表';

        const html = dateGroups.map((group, index) => {
            const isActive = index === selectedIndex ? 'active' : '';
            const dateLabel = this._formatDateLabel(group.date);
            return `
                <div class="date-item ${isActive}" data-index="${index}">
                    <div class="date-label">${this._escapeHtml(dateLabel)}</div>
                    <div class="date-count">${group.sessions.length} 条记录</div>
                </div>
            `;
        }).join('');

        this.sessionListEl.innerHTML = html;
    }

    /**
     * 渲染会话列表
     * @param {Array} sessions - 会话数组
     * @param {number} selectedIndex - 选中的索引
     * @param {string} dateLabel - 日期标签
     */
    renderSessionList(sessions, selectedIndex = -1, dateLabel = '') {
        if (!sessions || sessions.length === 0) {
            this.sessionListEl.innerHTML = '<div class="empty-state">该日期暂无日志</div>';
            this.sessionCountEl.textContent = '0';
            return;
        }

        this.sessionCountEl.textContent = sessions.length;
        this.headerEl.textContent = `${dateLabel} 的日志`;

        const html = sessions.map((session, index) => {
            const isActive = index === selectedIndex ? 'active' : '';
            const timeOnly = this._formatTimeOnly(session.timestamp);
            return `
                <div class="session-item ${isActive}" data-index="${index}">
                    <div class="session-time">${this._escapeHtml(timeOnly)}</div>
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
                    请从左侧选择日期查看日志
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
        this.detailPanelEl.innerHTML = '<div class="empty-state">请从左侧选择日期查看日志</div>';
        this.headerEl.textContent = '日期列表';
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
     * 格式化日期标签
     * @param {string} dateKey - YYYY-MM-DD 格式
     * @returns {string}
     * @private
     */
    _formatDateLabel(dateKey) {
        try {
            const parts = dateKey.split('-');
            if (parts.length === 3) {
                return `${parts[0]}-${parts[1]}-${parts[2]}`;
            }
            return dateKey;
        } catch (e) {
            return dateKey;
        }
    }

    /**
     * 格式化时间戳（完整版）
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
     * 格式化时间（只显示时:分:秒）
     * @param {string} timestamp - ISO 8601 时间戳
     * @returns {string}
     * @private
     */
    _formatTimeOnly(timestamp) {
        try {
            const date = new Date(timestamp);
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${hours}:${minutes}:${seconds}`;
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
     * HTML 转义（防止 XSS）- 优化版本
     * @param {string} str - 字符串
     * @returns {string}
     * @private
     */
    _escapeHtml(str) {
        if (!str) return '';
        const escapeMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return str.replace(/[&<>"']/g, char => escapeMap[char]);
    }
}
