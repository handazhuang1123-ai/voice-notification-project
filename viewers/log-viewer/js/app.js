/**
 * App - 应用初始化
 * 负责：加载数据、初始化组件、绑定事件、协调两级导航
 */

(function() {
    'use strict';

    // Configuration constants | 配置常量
    const CONFIG = {
        POLL_INTERVAL_MS: 100,              // 正常轮询间隔
        POLL_TIMEOUT_MS: 45000,             // 轮询超时（45秒，给服务器30秒+网络15秒缓冲）
        POLL_SERVER_TIMEOUT_S: 30,          // 服务器端超时（30秒）
        RETRY_BASE_DELAY_MS: 100,           // 基础重试延迟
        RETRY_MAX_DELAY_MS: 30000,          // 最大重试延迟（30秒）
        RETRY_BACKOFF_MULTIPLIER: 2,        // 退避乘数
        LOAD_MAX_RETRIES: 3,                // 加载最大重试次数
        DEBUG_MODE: true,                   // 调试模式（开发时设为true，生产环境设为false）
        PAGE_SIZE: 50,                      // 每页加载的会话数量
        SCROLL_THRESHOLD: 200               // 距底部多少像素时触发加载（px）
    };

    // 获取 DOM 元素
    const sessionListEl = document.getElementById('sessionList');
    const detailPanelEl = document.getElementById('detailPanel');
    const sessionCountEl = document.getElementById('session-count');
    const headerEl = document.querySelector('.session-list-title');
    const loadingMoreEl = document.getElementById('loadingMore');

    // 创建管理器和渲染器
    const sessionManager = new SessionManager();
    const logRenderer = new LogRenderer(sessionListEl, detailPanelEl, sessionCountEl, headerEl);

    // 设置详细信息面板元素引用（用于滚动控制）
    sessionManager.setDetailPanelElement(detailPanelEl);

    // State management | 状态管理
    let isLoadingLogs = false;              // 防止并发加载
    let connectionStatus = 'connecting';    // connecting | connected | disconnected | error
    let currentPage = 0;                    // 当前页码（初始为0，首次加载时变为1）
    let hasMoreData = true;                 // 是否还有更多数据
    let isLoadingMore = false;              // 是否正在加载更多（防止重复触发）

    /**
     * 日志输出辅助函数
     */
    function debugLog(...args) {
        if (CONFIG.DEBUG_MODE) {
            console.log(...args);
        }
    }

    /**
     * 加载日志数据（初始加载，使用分页API）
     */
    async function loadLogs(retryCount = 0) {
        // Debounce: prevent concurrent loading | 防抖：防止并发加载
        if (isLoadingLogs) {
            debugLog('⏭️ Already loading, skipping...');
            return;
        }

        isLoadingLogs = true;
        currentPage = 1; // 重置为第一页
        console.log(`🔵 [STEP 1/7] loadLogs() called (attempt ${retryCount + 1}/${CONFIG.LOAD_MAX_RETRIES})`);

        try {
            console.log('🔵 [STEP 2/7] Calling showLoading()...');
            logRenderer.showLoading();
            console.log('🔵 [STEP 3/7] showLoading() completed, starting fetch...');

            // Use pagination API | 使用分页 API
            const url = `/api/logs?page=${currentPage}&limit=${CONFIG.PAGE_SIZE}&t=${Date.now()}`;
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
            console.log('🔵 [STEP 6.6/7] Pagination:', data.pagination);

            // 验证数据格式
            if (!data || !data.items || !Array.isArray(data.items)) {
                throw new Error('日志数据格式无效');
            }

            // 更新分页状态
            hasMoreData = data.pagination?.hasMore || false;
            console.log(`📊 Pagination: page ${currentPage}, hasMore=${hasMoreData}, total=${data.pagination?.totalItems}`);

            // 设置会话数据（自动分组和倒序）
            sessionManager.setSessions(data.items);

            // 渲染初始状态（日期列表）
            console.log('🔵 [STEP 7/7] Updating UI...');
            updateUI();

            console.log('✅ loadLogs() completed successfully -', data.items.length, 'sessions loaded');

            // 检查是否需要自动加载更多（如果没有滚动条）
            setTimeout(checkAndLoadIfNeeded, 500);

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
     * 显示加载更多指示器
     */
    function showLoadingMore() {
        if (loadingMoreEl) {
            loadingMoreEl.style.display = 'block';
        }
    }

    /**
     * 隐藏加载更多指示器
     */
    function hideLoadingMore() {
        if (loadingMoreEl) {
            loadingMoreEl.style.display = 'none';
        }
    }

    /**
     * 加载更多数据（懒加载）
     */
    async function loadMore() {
        // Prevent concurrent loading | 防止并发加载
        if (isLoadingMore || !hasMoreData) {
            if (!hasMoreData) {
                debugLog('⏭️ No more data to load');
            }
            return;
        }

        isLoadingMore = true;
        currentPage++;
        console.log(`📥 Loading more... page ${currentPage}`);

        // 显示 loading 动画
        showLoadingMore();

        try {
            // Use pagination API | 使用分页 API
            const url = `/api/logs?page=${currentPage}&limit=${CONFIG.PAGE_SIZE}&t=${Date.now()}`;
            const response = await fetch(url, {
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`📥 Loaded ${data.items?.length} more items`);

            // 更新分页状态
            hasMoreData = data.pagination?.hasMore || false;
            console.log(`📊 Pagination: page ${currentPage}, hasMore=${hasMoreData}`);

            // 追加新会话
            if (data.items && data.items.length > 0) {
                sessionManager.appendSessions(data.items);
                console.log('✅ loadMore() completed successfully');
            }

        } catch (error) {
            console.error('❌ Failed to load more:', error.message);
            currentPage--; // 回退页码
        } finally {
            // 延迟隐藏 loading 动画，让用户看到加载效果
            setTimeout(() => {
                hideLoadingMore();
                isLoadingMore = false;
            }, 800); // 延迟800ms
        }
    }

    /**
     * 更新 UI
     */
    function updateUI() {
        const currentMode = sessionManager.getCurrentMode();
        const detailContainer = document.querySelector('.log-viewer-detail-container');

        if (currentMode === 'date') {
            // 日期列表模式
            const dateGroups = sessionManager.getDateGroups();
            const selectedDateIndex = sessionManager.getSelectedDateIndex();

            logRenderer.renderDateList(dateGroups, selectedDateIndex);
            logRenderer.renderDetail(null); // 右侧显示空白提示

            // 移除详细信息面板焦点样式
            if (detailContainer) {
                detailContainer.classList.remove('focus-mode');
            }

            // 绑定日期项点击事件
            bindDateItemEvents();

            // 检查是否需要自动加载更多
            setTimeout(checkAndLoadIfNeeded, 500);

        } else if (currentMode === 'session') {
            // 会话列表模式
            const sessions = sessionManager.getCurrentDateSessions();
            const selectedSessionIndex = sessionManager.getSelectedSessionIndex();
            const selectedSession = sessionManager.getSelectedSession();
            const dateInfo = sessionManager.getSelectedDateInfo();
            const dateLabel = dateInfo ? dateInfo.date : '';

            logRenderer.renderSessionList(sessions, selectedSessionIndex, dateLabel);
            logRenderer.renderDetail(selectedSession);

            // 移除详细信息面板焦点样式
            if (detailContainer) {
                detailContainer.classList.remove('focus-mode');
            }

            // 绑定会话项点击事件
            bindSessionItemEvents();

            // 检查是否需要自动加载更多
            setTimeout(checkAndLoadIfNeeded, 500);

        } else if (currentMode === 'detail') {
            // 详细信息模式（焦点在右侧详细信息面板）
            // 不重新渲染，只添加视觉焦点效果
            if (detailContainer) {
                detailContainer.classList.add('focus-mode');
            }
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
                // 单击直接进入该日期
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

                

                    // Auto-reset after too many failures | 失败次数过多后自动重置

                    if (consecutiveErrors > 10) {

                        console.warn('⚠️ Too many failures, resetting retry delay...');

                        consecutiveErrors = 0;

                        retryDelay = CONFIG.RETRY_BASE_DELAY_MS;

                    }
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
     * 检查是否有滚动条，如果没有则自动加载更多
     */
    function checkAndLoadIfNeeded() {
        // 只在日期模式和会话模式下检查
        const currentMode = sessionManager.getCurrentMode();
        if (currentMode === 'detail') {
            return;
        }

        // 检查是否有滚动条
        const hasScrollbar = sessionListEl.scrollHeight > sessionListEl.clientHeight;

        if (!hasScrollbar && hasMoreData && !isLoadingMore) {
            console.log('📏 No scrollbar detected, auto-loading more data...');
            loadMore().then(() => {
                // 加载完成后，再次检查（递归）
                setTimeout(checkAndLoadIfNeeded, 1000);
            });
        }
    }

    /**
     * 初始化滚动加载（无限滚动，支持多层级）
     */
    function initInfiniteScroll() {
        sessionListEl.addEventListener('scroll', function() {
            // 只在日期模式和会话模式下触发加载，详情模式不需要
            const currentMode = sessionManager.getCurrentMode();
            if (currentMode === 'detail') {
                return;
            }

            // 计算距离底部的距离
            const scrollTop = sessionListEl.scrollTop;
            const scrollHeight = sessionListEl.scrollHeight;
            const clientHeight = sessionListEl.clientHeight;
            const distanceToBottom = scrollHeight - scrollTop - clientHeight;

            debugLog(`📜 Scroll [${currentMode}]: top=${scrollTop.toFixed(0)}, height=${scrollHeight}, client=${clientHeight}, toBottom=${distanceToBottom.toFixed(0)}`);

            // 当距离底部小于阈值时，触发加载更多
            // 说明：后端分页是全局的，加载的新数据会自动合并到所有日期组
            // - 日期模式：新数据可能添加新的日期组，或补充现有日期组
            // - 会话模式：新数据会补充当前查看的日期组（如果该日期还有更多会话在后续页）
            if (distanceToBottom < CONFIG.SCROLL_THRESHOLD && hasMoreData && !isLoadingMore) {
                const modeText = currentMode === 'date' ? '日期列表' : '会话列表';
                console.log(`🔽 [${modeText}] 接近底部，加载更多数据...`);
                loadMore();
            }
        });

        console.log('✅ Infinite scroll initialized (supports multi-level navigation)');
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

        // 初始化无限滚动
        initInfiniteScroll();

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
