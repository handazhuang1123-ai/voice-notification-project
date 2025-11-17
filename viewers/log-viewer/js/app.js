/**
 * App - 应用初始化
 * 负责：加载数据、初始化组件、绑定事件、协调两级导航
 */

(function() {
    'use strict';

    // 获取 DOM 元素
    const sessionListEl = document.getElementById('sessionList');
    const detailPanelEl = document.getElementById('detailPanel');
    const sessionCountEl = document.getElementById('session-count');
    const headerEl = document.querySelector('.session-list-header');

    // 创建管理器和渲染器
    const sessionManager = new SessionManager();
    const logRenderer = new LogRenderer(sessionListEl, detailPanelEl, sessionCountEl, headerEl);

    /**
     * 加载日志数据
     */
    async function loadLogs() {
        try {
            logRenderer.showLoading();

            const response = await fetch('data/logs.json');

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // 验证数据格式
            if (!data || !data.items || !Array.isArray(data.items)) {
                throw new Error('日志数据格式无效');
            }

            // 设置会话数据（自动分组和倒序）
            sessionManager.setSessions(data.items);

            // 渲染初始状态（日期列表）
            updateUI();

        } catch (error) {
            console.error('加载日志失败:', error);
            logRenderer.showError(error.message);
        }
    }

    /**
     * 更新 UI
     */
    function updateUI() {
        const currentMode = sessionManager.getCurrentMode();

        if (currentMode === 'date') {
            // 日期列表模式
            const dateGroups = sessionManager.getDateGroups();
            const selectedDateIndex = sessionManager.getSelectedDateIndex();

            logRenderer.renderDateList(dateGroups, selectedDateIndex);
            logRenderer.renderDetail(null); // 右侧显示空白提示

            // 绑定日期项点击事件
            bindDateItemEvents();

        } else {
            // 会话列表模式
            const sessions = sessionManager.getCurrentDateSessions();
            const selectedSessionIndex = sessionManager.getSelectedSessionIndex();
            const selectedSession = sessionManager.getSelectedSession();
            const dateInfo = sessionManager.getSelectedDateInfo();
            const dateLabel = dateInfo ? dateInfo.date : '';

            logRenderer.renderSessionList(sessions, selectedSessionIndex, dateLabel);
            logRenderer.renderDetail(selectedSession);

            // 绑定会话项点击事件
            bindSessionItemEvents();
        }
    }

    /**
     * 绑定日期项点击事件
     */
    function bindDateItemEvents() {
        const dateItems = document.querySelectorAll('.date-item');

        dateItems.forEach(item => {
            item.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                sessionManager.selectDate(index);
            });

            // 双击进入该日期
            item.addEventListener('dblclick', function() {
                const index = parseInt(this.getAttribute('data-index'));
                sessionManager.selectDate(index);
                sessionManager.enterSessionMode();
            });
        });
    }

    /**
     * 绑定会话项点击事件
     */
    function bindSessionItemEvents() {
        const sessionItems = document.querySelectorAll('.session-item');

        sessionItems.forEach(item => {
            item.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                sessionManager.selectSession(index);
            });
        });
    }

    /**
     * 初始化应用
     */
    function init() {
        // 设置模式变化回调
        sessionManager.onModeChange = function(mode) {
            updateUI();
        };

        // 设置选择变化回调
        sessionManager.onSelectionChange = function() {
            updateUI();
        };

        // 初始化键盘导航
        sessionManager.initKeyboardNavigation();

        // 加载日志数据
        loadLogs();
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
