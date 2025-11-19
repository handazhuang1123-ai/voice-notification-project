/**
 * Session Manager - 会话管理和两级导航
 * 负责：日期分组、两级导航、键盘控制、状态管理
 */

class SessionManager {
    constructor() {
        this.allSessions = [];      // 所有会话（倒序）
        this.dateGroups = [];        // 日期分组
        this.currentMode = 'date';   // 当前模式：'date', 'session', 或 'detail'
        this.selectedDateIndex = -1;
        this.selectedSessionIndex = -1;
        this.onModeChange = null;    // 模式切换回调
        this.onSelectionChange = null; // 选择变化回调
        this._keydownHandler = null; // 键盘事件处理器引用（防止内存泄漏）
        this.detailPanelElement = null; // 详细信息面板元素引用
    }

    /**
     * 设置详细信息面板元素引用
     * @param {HTMLElement} element - 详细信息面板元素
     */
    setDetailPanelElement(element) {
        this.detailPanelElement = element;
    }

    /**
     * 设置会话数据并分组
     * @param {Array} sessions - 会话数组
     */
    setSessions(sessions) {
        // 倒序排列（最新的在前）
        this.allSessions = [...sessions].reverse();

        // 按日期分组
        this._groupByDate();

        // 初始化：选中第一个日期
        if (this.dateGroups.length > 0) {
            this.selectedDateIndex = 0;
        }
    }

    /**
     * 按日期分组
     * @private
     */
    _groupByDate() {
        const groups = {};

        this.allSessions.forEach(session => {
            const date = this._getDateKey(session.timestamp);
            if (!groups[date]) {
                groups[date] = {
                    date: date,
                    sessions: []
                };
            }
            groups[date].sessions.push(session);
        });

        // 转换为数组并按日期倒序排列
        this.dateGroups = Object.values(groups).sort((a, b) => {
            return b.date.localeCompare(a.date);
        });
    }

    /**
     * 从时间戳提取日期键
     * @param {string} timestamp - ISO 8601 时间戳
     * @returns {string} - YYYY-MM-DD 格式
     * @private
     */
    _getDateKey(timestamp) {
        try {
            const date = new Date(timestamp);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (e) {
            return 'unknown';
        }
    }

    /**
     * 获取日期分组
     * @returns {Array}
     */
    getDateGroups() {
        return this.dateGroups;
    }

    /**
     * 获取当前选中日期的会话列表
     * @returns {Array}
     */
    getCurrentDateSessions() {
        if (this.selectedDateIndex >= 0 && this.selectedDateIndex < this.dateGroups.length) {
            return this.dateGroups[this.selectedDateIndex].sessions;
        }
        return [];
    }

    /**
     * 获取当前选中的会话
     * @returns {Object|null}
     */
    getSelectedSession() {
        const sessions = this.getCurrentDateSessions();
        if (this.selectedSessionIndex >= 0 && this.selectedSessionIndex < sessions.length) {
            return sessions[this.selectedSessionIndex];
        }
        return null;
    }

    /**
     * 获取当前模式
     * @returns {string} - 'date' 或 'session'
     */
    getCurrentMode() {
        return this.currentMode;
    }

    /**
     * 获取当前选中的日期索引
     * @returns {number}
     */
    getSelectedDateIndex() {
        return this.selectedDateIndex;
    }

    /**
     * 获取当前选中的会话索引
     * @returns {number}
     */
    getSelectedSessionIndex() {
        return this.selectedSessionIndex;
    }

    /**
     * 获取当前选中日期的信息
     * @returns {Object|null}
     */
    getSelectedDateInfo() {
        if (this.selectedDateIndex >= 0 && this.selectedDateIndex < this.dateGroups.length) {
            return this.dateGroups[this.selectedDateIndex];
        }
        return null;
    }

    /**
     * 进入日志列表模式
     */
    enterSessionMode() {
        if (this.currentMode === 'date' && this.dateGroups.length > 0) {
            this.currentMode = 'session';
            // 自动选中第一条（最新的）
            this.selectedSessionIndex = 0;
            this._triggerModeChange();
            this._triggerSelectionChange();
        }
    }

    /**
     * 返回日期列表模式
     */
    backToDateMode() {
        if (this.currentMode === 'session') {
            this.currentMode = 'date';
            this.selectedSessionIndex = -1;
            this._triggerModeChange();
            this._triggerSelectionChange();
        }
    }

    /**
     * 进入详细信息模式
     */
    enterDetailMode() {
        if (this.currentMode === 'session' && this.getSelectedSession()) {
            this.currentMode = 'detail';
            this._triggerModeChange();
        }
    }

    /**
     * 从详细信息模式返回会话列表模式
     */
    backToSessionMode() {
        if (this.currentMode === 'detail') {
            this.currentMode = 'session';
            this._triggerModeChange();
        }
    }

    /**
     * 向上移动
     */
    moveUp() {
        if (this.currentMode === 'detail') {
            // 在详细信息模式下，滚动详细信息面板
            this._scrollDetailPanel(-100);
        } else if (this.currentMode === 'date') {
            if (this.selectedDateIndex > 0) {
                this.selectedDateIndex--;
                this._triggerSelectionChange();
                this._scrollToSelected();
            }
        } else {
            if (this.selectedSessionIndex > 0) {
                this.selectedSessionIndex--;
                this._triggerSelectionChange();
                this._scrollToSelected();
            }
        }
    }

    /**
     * 向下移动
     */
    moveDown() {
        if (this.currentMode === 'detail') {
            // 在详细信息模式下，滚动详细信息面板
            this._scrollDetailPanel(100);
        } else if (this.currentMode === 'date') {
            if (this.selectedDateIndex < this.dateGroups.length - 1) {
                this.selectedDateIndex++;
                this._triggerSelectionChange();
                this._scrollToSelected();
            }
        } else {
            const sessions = this.getCurrentDateSessions();
            if (this.selectedSessionIndex < sessions.length - 1) {
                this.selectedSessionIndex++;
                this._triggerSelectionChange();
                this._scrollToSelected();
            }
        }
    }

    /**
     * 滚动详细信息面板
     * @param {number} delta - 滚动量（正数向下，负数向上）
     * @private
     */
    _scrollDetailPanel(delta) {
        if (this.detailPanelElement) {
            this.detailPanelElement.scrollBy({
                top: delta,
                behavior: 'smooth'
            });
        }
    }

    /**
     * 移动到第一项
     */
    moveToStart() {
        if (this.currentMode === 'detail') {
            // 在详细信息模式下，滚动到顶部
            if (this.detailPanelElement) {
                this.detailPanelElement.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }
        } else if (this.currentMode === 'date') {
            if (this.dateGroups.length > 0) {
                this.selectedDateIndex = 0;
                this._triggerSelectionChange();
                this._scrollToSelected();
            }
        } else {
            const sessions = this.getCurrentDateSessions();
            if (sessions.length > 0) {
                this.selectedSessionIndex = 0;
                this._triggerSelectionChange();
                this._scrollToSelected();
            }
        }
    }

    /**
     * 移动到最后一项
     */
    moveToEnd() {
        if (this.currentMode === 'detail') {
            // 在详细信息模式下，滚动到底部
            if (this.detailPanelElement) {
                this.detailPanelElement.scrollTo({
                    top: this.detailPanelElement.scrollHeight,
                    behavior: 'smooth'
                });
            }
        } else if (this.currentMode === 'date') {
            if (this.dateGroups.length > 0) {
                this.selectedDateIndex = this.dateGroups.length - 1;
                this._triggerSelectionChange();
                this._scrollToSelected();
            }
        } else {
            const sessions = this.getCurrentDateSessions();
            if (sessions.length > 0) {
                this.selectedSessionIndex = sessions.length - 1;
                this._triggerSelectionChange();
                this._scrollToSelected();
            }
        }
    }

    /**
     * 选择指定日期
     * @param {number} index - 日期索引
     */
    selectDate(index) {
        if (index >= 0 && index < this.dateGroups.length) {
            this.selectedDateIndex = index;
            this._triggerSelectionChange();
        }
    }

    /**
     * 选择指定会话
     * @param {number} index - 会话索引
     */
    selectSession(index) {
        const sessions = this.getCurrentDateSessions();
        if (index >= 0 && index < sessions.length) {
            this.selectedSessionIndex = index;
            this._triggerSelectionChange();
        }
    }

    /**
     * 触发模式变化回调
     * @private
     */
    _triggerModeChange() {
        if (typeof this.onModeChange === 'function') {
            this.onModeChange(this.currentMode);
        }
    }

    /**
     * 触发选择变化回调
     * @private
     */
    _triggerSelectionChange() {
        if (typeof this.onSelectionChange === 'function') {
            this.onSelectionChange();
        }
    }

    /**
     * 滚动到选中的项目
     * @private
     */
    _scrollToSelected() {
        setTimeout(() => {
            const selector = this.currentMode === 'date' ? '.date-item.active' : '.session-item.active';
            const selectedItem = document.querySelector(selector);
            if (selectedItem) {
                selectedItem.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest'
                });
            }
        }, 50);
    }

    /**
     * 初始化键盘导航（防止内存泄漏）
     */
    initKeyboardNavigation() {
        // Remove existing handler to prevent memory leak
        // 移除已存在的处理器以防止内存泄漏
        if (this._keydownHandler) {
            document.removeEventListener('keydown', this._keydownHandler);
        }

        // Create new handler
        // 创建新的处理器
        this._keydownHandler = (e) => {
            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    this.moveUp();
                    break;

                case 'ArrowDown':
                    e.preventDefault();
                    this.moveDown();
                    break;

                case 'Home':
                    e.preventDefault();
                    this.moveToStart();
                    break;

                case 'End':
                    e.preventDefault();
                    this.moveToEnd();
                    break;

                case 'Enter':
                case 'ArrowRight':
                    e.preventDefault();
                    if (this.currentMode === 'date') {
                        this.enterSessionMode();
                    } else if (this.currentMode === 'session') {
                        this.enterDetailMode();
                    }
                    break;

                case 'Escape':
                case 'ArrowLeft':
                    e.preventDefault();
                    if (this.currentMode === 'detail') {
                        this.backToSessionMode();
                    } else if (this.currentMode === 'session') {
                        this.backToDateMode();
                    }
                    break;
            }
        };

        // Register new handler
        // 注册新的处理器
        document.addEventListener('keydown', this._keydownHandler);
    }

    /**
     * 清理资源（防止内存泄漏）
     */
    destroy() {
        if (this._keydownHandler) {
            document.removeEventListener('keydown', this._keydownHandler);
            this._keydownHandler = null;
        }
    }
}
