/**
 * App - 应用初始化
 * 负责：加载数据、初始化组件、绑定事件、协调两级导航
 */

(function() {
    'use strict';

    // Configuration constants | 配置常量
    const CONFIG = {
        POLL_INTERVAL_MS: 100,              // 正常轮询间隔
        POLL_TIMEOUT_MS: 35000,             // 轮询超时（35秒）
        POLL_SERVER_TIMEOUT_S: 30,          // 服务器端超时（30秒）
        RETRY_BASE_DELAY_MS: 100,           // 基础重试延迟
        RETRY_MAX_DELAY_MS: 30000,          // 最大重试延迟（30秒）
        RETRY_BACKOFF_MULTIPLIER: 2,        // 退避乘数
        LOAD_MAX_RETRIES: 3,                // 加载最大重试次数
        DEBUG_MODE: true                    // 调试模式（开发时设为true，生产环境设为false）
    };

    // 获取 DOM 元素
    const sessionListEl = document.getElementById('sessionList');
    const detailPanelEl = document.getElementById('detailPanel');
    const sessionCountEl = document.getElementById('session-count');
    const headerEl = document.querySelector('.session-list-title');

    // 创建管理器和渲染器
    const sessionManager = new SessionManager();
    const logRenderer = new LogRenderer(sessionListEl, detailPanelEl, sessionCountEl, headerEl);

    // State management | 状态管理
    let isLoadingLogs = false;              // 防止并发加载
    let connectionStatus = 'connecting';    // connecting | connected | disconnected | error

    /**
     * 日志输出辅助函数
     */
    function debugLog(...args) {
        if (CONFIG.DEBUG_MODE) {
            console.log(...args);
        }
    }

    /**
     * 加载日志数据（带防抖和重试机制）
     */
    async function loadLogs(retryCount = 0) {
        // Debounce: prevent concurrent loading | 防抖：防止并发加载
        if (isLoadingLogs) {
            debugLog('⏭️ Already loading, skipping...');
            return;
        }

        isLoadingLogs = true;
        console.log(`🔵 [STEP 1/7] loadLogs() called (attempt ${retryCount + 1}/${CONFIG.LOAD_MAX_RETRIES})`);

        try {
            console.log('🔵 [STEP 2/7] Calling showLoading()...');
            logRenderer.showLoading();
            console.log('🔵 [STEP 3/7] showLoading() completed, starting fetch...');

            // Add timestamp to prevent browser caching + disable cache
            // 添加时间戳防止浏览器缓存 + 禁用缓存
            const url = `data/logs.json?t=${Date.now()}`;
            console.log('🔵 [STEP 3.5/7] Fetching:', url);
            const response = await fetch(url, {
                cache: 'no-store'
            });
            console.log('🔵 [STEP 4/7] Fetch completed, status:', response.status);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            console.log('🔵 [STEP 5/7] Parsing JSON...');
            const data = await response.json();
            console.log('🔵 [STEP 6/7] JSON parsed, items:', data.items?.length);
            console.log('🔵 [STEP 6.5/7] Generated at:', data.generatedAt);

            // 验证数据格式
            if (!data || !data.items || !Array.isArray(data.items)) {
                throw new Error('日志数据格式无效');
            }

            // 设置会话数据（自动分组和倒序）
            sessionManager.setSessions(data.items);

            // 渲染初始状态（日期列表）
            console.log('🔵 [STEP 7/7] Updating UI...');
            updateUI();

            console.log('✅ loadLogs() completed successfully -', data.items.length, 'sessions loaded');

        } catch (error) {
            console.error('❌ Failed to load logs:', error.message);

            // Retry logic | 重试逻辑
            if (retryCount < CONFIG.LOAD_MAX_RETRIES - 1) {
                const delay = CONFIG.RETRY_BASE_DELAY_MS * Math.pow(CONFIG.RETRY_BACKOFF_MULTIPLIER, retryCount);
                console.warn(`⏱️ Retrying in ${delay}ms...`);
                setTimeout(() => loadLogs(retryCount + 1), delay);
            } else {
                logRenderer.showError(error?.message || 'Unknown error');
                updateConnectionStatus('error');
            }
        } finally {
            isLoadingLogs = false;
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
     * 更新连接状态并显示给用户
     */
    function updateConnectionStatus(status) {
        connectionStatus = status;
        const statusMap = {
            'connecting': '🟡 连接中...',
            'connected': '🟢 已连接',
            'disconnected': '🔴 连接断开',
            'error': '🔴 连接错误'
        };
        debugLog('Connection status:', statusMap[status] || status);
        // 可以在这里更新UI显示连接状态
    }

    /**
     * 初始化长轮询以实现实时更新（带指数退避）
     */
    function initLongPolling() {
        let isPolling = false;
        let retryDelay = CONFIG.RETRY_BASE_DELAY_MS;
        let consecutiveErrors = 0;

        async function poll() {
            if (isPolling) return;
            isPolling = true;

            try {
                debugLog('🔄 Long-polling: waiting for updates...');
                updateConnectionStatus('connecting');

                // Long-polling request with timeout
                // 长轮询请求，带超时机制
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), CONFIG.POLL_TIMEOUT_MS);

                const response = await fetch('/sse/updates', {
                    signal: controller.signal,
                    cache: 'no-store'
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    const data = await response.json();
                    debugLog('📥 Long-polling response:', data);

                    // Reset retry delay on successful connection
                    // 成功连接后重置重试延迟
                    retryDelay = CONFIG.RETRY_BASE_DELAY_MS;
                    consecutiveErrors = 0;
                    updateConnectionStatus('connected');

                    if (data.hasUpdate) {
                        console.log('✅ Update detected, reloading logs...');
                        await loadLogs();
                    }
                } else {
                    console.warn('⚠️ Long-polling HTTP error:', response.status);
                    consecutiveErrors++;
                    updateConnectionStatus('error');
                }
            } catch (error) {
                if (error.name === 'AbortError') {
                    // Client-side timeout means server didn't respond in time
                    // 客户端超时意味着服务器没有及时响应
                    console.warn('⚠️ Long-polling timeout (server not responding)');
                    consecutiveErrors++;
                    updateConnectionStatus('disconnected');
                } else {
                    console.error('❌ Long-polling error:', error);
                    consecutiveErrors++;
                    updateConnectionStatus('disconnected');
                }
            } finally {
                isPolling = false;

                // Exponential backoff on errors
                // 错误时指数退避
                if (consecutiveErrors > 0) {
                    retryDelay = Math.min(
                        retryDelay * CONFIG.RETRY_BACKOFF_MULTIPLIER,
                        CONFIG.RETRY_MAX_DELAY_MS
                    );
                    console.log(`⏱️ Backing off, next poll in ${retryDelay}ms (${consecutiveErrors} consecutive errors)`);
                } else {
                    retryDelay = CONFIG.POLL_INTERVAL_MS;
                }

                setTimeout(poll, retryDelay);
            }
        }

        // Start polling
        // 开始轮询
        poll();
        console.log('✅ Long-polling initialized with exponential backoff');
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

        // 初始化长轮询实时更新
        initLongPolling();
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
