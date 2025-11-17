/**
 * App - 应用初始化
 * 负责：加载数据、初始化组件、绑定事件
 */

(function() {
    'use strict';

    // 获取 DOM 元素
    const sessionListEl = document.getElementById('sessionList');
    const detailPanelEl = document.getElementById('detailPanel');
    const sessionCountEl = document.getElementById('session-count');

    // 创建管理器和渲染器
    const sessionManager = new SessionManager();
    const logRenderer = new LogRenderer(sessionListEl, detailPanelEl, sessionCountEl);

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

            // 设置会话数据
            sessionManager.setSessions(data.items);

            // 渲染初始状态
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
        const sessions = sessionManager.getSessions();
        const selectedIndex = sessionManager.getSelectedIndex();
        const selectedSession = sessionManager.getSelectedSession();

        // 渲染会话列表
        logRenderer.renderSessionList(sessions, selectedIndex);

        // 渲染详情面板
        logRenderer.renderDetail(selectedSession);

        // 为会话项绑定点击事件
        bindSessionItemEvents();
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
        // 设置选择变化回调
        sessionManager.onSelectionChange = function(session, index) {
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
