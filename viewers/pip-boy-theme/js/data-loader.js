/**
 * Pip-Boy Data Loader
 * Generic JSON data loading utilities
 *
 * Provides async data loading with error handling and caching:
 * - Load JSON data from files or APIs
 * - Built-in caching mechanism
 * - Error handling and retries
 * - Loading state management
 *
 * Usage:
 *   const loader = new PipBoyDataLoader();
 *   const data = await loader.load('data/logs.json');
 */

(function (global) {
    'use strict';

    /**
     * PipBoyDataLoader Class
     * Handles async data loading with caching
     */
    class PipBoyDataLoader {
        /**
         * Constructor
         * @param {object} options - Configuration options
         */
        constructor(options = {}) {
            this.options = {
                cache: options.cache !== false,
                retries: options.retries || 3,
                retryDelay: options.retryDelay || 1000,
                timeout: options.timeout || 30000,
                ...options
            };

            // Cache storage
            this.cache = new Map();

            // Loading state
            this.isLoading = false;
            this.loadError = null;
        }

        /**
         * Load JSON data from a URL
         * @param {string} url - URL or path to JSON file
         * @param {object} options - Request options
         * @returns {Promise<object>}
         */
        async load(url, options = {}) {
            // Check cache first
            if (this.options.cache && this.cache.has(url)) {
                return this.cache.get(url);
            }

            // Mark as loading
            this.isLoading = true;
            this.loadError = null;

            try {
                const data = await this._fetchWithRetry(url, options);

                // Cache the result
                if (this.options.cache) {
                    this.cache.set(url, data);
                }

                return data;
            } catch (error) {
                this.loadError = error;
                throw error;
            } finally {
                this.isLoading = false;
            }
        }

        /**
         * Fetch with automatic retry
         * @param {string} url
         * @param {object} options
         * @param {number} attempt
         * @returns {Promise<object>}
         * @private
         */
        async _fetchWithRetry(url, options, attempt = 1) {
            try {
                return await this._fetchWithTimeout(url, options);
            } catch (error) {
                if (attempt < this.options.retries) {
                    // Wait before retry
                    await this._delay(this.options.retryDelay);
                    return this._fetchWithRetry(url, options, attempt + 1);
                }
                throw error;
            }
        }

        /**
         * Fetch with timeout
         * @param {string} url
         * @param {object} options
         * @returns {Promise<object>}
         * @private
         */
        async _fetchWithTimeout(url, options) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);

            try {
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                // Validate data structure
                this._validateData(data);

                return data;
            } catch (error) {
                clearTimeout(timeoutId);
                if (error.name === 'AbortError') {
                    throw new Error(`Request timeout after ${this.options.timeout}ms`);
                }
                throw error;
            }
        }

        /**
         * Validate loaded data structure
         * @param {object} data
         * @private
         */
        _validateData(data) {
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid data format: expected object');
            }

            // Check for standard viewer format
            if (data.version && data.dataType && data.items) {
                if (!Array.isArray(data.items)) {
                    throw new Error('Invalid data format: items must be an array');
                }
            }
        }

        /**
         * Delay helper
         * @param {number} ms
         * @returns {Promise<void>}
         * @private
         */
        _delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        /**
         * Clear cache
         * @param {string} url - Optional specific URL to clear
         */
        clearCache(url = null) {
            if (url) {
                this.cache.delete(url);
            } else {
                this.cache.clear();
            }
        }

        /**
         * Get cache statistics
         * @returns {object}
         */
        getCacheStats() {
            return {
                size: this.cache.size,
                entries: Array.from(this.cache.keys())
            };
        }
    }

    /**
     * Utility: Create loading indicator
     * Creates a loading message element
     */
    function createLoadingIndicator(message = '正在加载数据...') {
        const div = document.createElement('div');
        div.className = 'pip-boy-loading';
        div.style.cssText = 'text-align: center; padding: 40px; font-size: 18px;';
        div.innerHTML = `
            <div class="pip-boy-spinner" style="display: inline-block; width: 20px; height: 20px; border: 3px solid #2d9518; border-top-color: #4af626; border-radius: 50%; animation: pip-boy-spin 0.8s linear infinite; margin-right: 10px;"></div>
            <span>${escapeHtml(message)}</span>
        `;
        return div;
    }

    /**
     * Utility: Create error indicator
     * Creates an error message element
     */
    function createErrorIndicator(error) {
        const div = document.createElement('div');
        div.className = 'pip-boy-error';
        div.style.cssText = 'text-align: center; padding: 40px; font-size: 16px; color: #ff4444;';
        div.innerHTML = `
            <strong>加载失败</strong><br>
            <span>${escapeHtml(error.message || '未知错误')}</span>
        `;
        return div;
    }

    /**
     * Utility: Escape HTML to prevent XSS
     */
    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Utility: Format file size
     */
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Utility: Load multiple data sources in parallel
     */
    async function loadMultiple(urls) {
        const loader = new PipBoyDataLoader();
        const promises = urls.map(url => loader.load(url));
        return await Promise.all(promises);
    }

    /**
     * Example: Simple data loader with UI feedback
     */
    async function loadDataWithFeedback(url, containerEl) {
        const loader = new PipBoyDataLoader();

        // Show loading indicator
        const loadingEl = createLoadingIndicator();
        containerEl.innerHTML = '';
        containerEl.appendChild(loadingEl);

        try {
            const data = await loader.load(url);

            // Remove loading indicator
            containerEl.removeChild(loadingEl);

            return data;
        } catch (error) {
            // Show error indicator
            containerEl.removeChild(loadingEl);
            const errorEl = createErrorIndicator(error);
            containerEl.appendChild(errorEl);

            throw error;
        }
    }

    // Export to global scope
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            PipBoyDataLoader,
            createLoadingIndicator,
            createErrorIndicator,
            escapeHtml,
            formatFileSize,
            loadMultiple,
            loadDataWithFeedback
        };
    } else {
        global.PipBoyDataLoader = PipBoyDataLoader;
        global.PipBoyDataUtils = {
            createLoadingIndicator,
            createErrorIndicator,
            escapeHtml,
            formatFileSize,
            loadMultiple,
            loadDataWithFeedback
        };
    }

})(typeof window !== 'undefined' ? window : this);
