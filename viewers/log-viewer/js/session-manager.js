/**
 * Session Manager - 会话管理和键盘导航
 * 负责：会话选择、键盘导航、状态管理
 */

class SessionManager {
    constructor() {
        this.sessions = [];
        this.selectedIndex = -1;
        this.onSelectionChange = null; // 回调函数
    }

    /**
     * 设置会话数据
     * @param {Array} sessions - 会话数组
     */
    setSessions(sessions) {
        this.sessions = sessions;
        this.selectedIndex = sessions.length > 0 ? 0 : -1;
    }

    /**
     * 获取所有会话
     * @returns {Array}
     */
    getSessions() {
        return this.sessions;
    }

    /**
     * 获取当前选中的会话
     * @returns {Object|null}
     */
    getSelectedSession() {
        if (this.selectedIndex >= 0 && this.selectedIndex < this.sessions.length) {
            return this.sessions[this.selectedIndex];
        }
        return null;
    }

    /**
     * 获取当前选中的索引
     * @returns {number}
     */
    getSelectedIndex() {
        return this.selectedIndex;
    }

    /**
     * 选择指定索引的会话
     * @param {number} index - 索引
     */
    selectSession(index) {
        if (index >= 0 && index < this.sessions.length) {
            this.selectedIndex = index;
            this._triggerSelectionChange();
        }
    }

    /**
     * 向上移动选择
     */
    moveUp() {
        if (this.selectedIndex > 0) {
            this.selectedIndex--;
            this._triggerSelectionChange();
            this._scrollToSelected();
        }
    }

    /**
     * 向下移动选择
     */
    moveDown() {
        if (this.selectedIndex < this.sessions.length - 1) {
            this.selectedIndex++;
            this._triggerSelectionChange();
            this._scrollToSelected();
        }
    }

    /**
     * 移动到第一项
     */
    moveToStart() {
        if (this.sessions.length > 0) {
            this.selectedIndex = 0;
            this._triggerSelectionChange();
            this._scrollToSelected();
        }
    }

    /**
     * 移动到最后一项
     */
    moveToEnd() {
        if (this.sessions.length > 0) {
            this.selectedIndex = this.sessions.length - 1;
            this._triggerSelectionChange();
            this._scrollToSelected();
        }
    }

    /**
     * 清除选择
     */
    clearSelection() {
        this.selectedIndex = -1;
        this._triggerSelectionChange();
    }

    /**
     * 触发选择变化回调
     * @private
     */
    _triggerSelectionChange() {
        if (typeof this.onSelectionChange === 'function') {
            this.onSelectionChange(this.getSelectedSession(), this.selectedIndex);
        }
    }

    /**
     * 滚动到选中的项目
     * @private
     */
    _scrollToSelected() {
        const sessionItems = document.querySelectorAll('.session-item');
        if (sessionItems[this.selectedIndex]) {
            sessionItems[this.selectedIndex].scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }
    }

    /**
     * 初始化键盘导航
     */
    initKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
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
                    e.preventDefault();
                    // Enter 键直接触发选择变化（已经选中了）
                    this._triggerSelectionChange();
                    break;

                case 'Escape':
                    e.preventDefault();
                    this.clearSelection();
                    break;
            }
        });
    }
}
