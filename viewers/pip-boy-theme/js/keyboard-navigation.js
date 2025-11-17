/**
 * Pip-Boy Keyboard Navigation
 * Terminal-style keyboard navigation utilities
 *
 * Provides keyboard navigation for Pip-Boy themed interfaces:
 * - Arrow key navigation for lists
 * - Enter/Escape for selection/cancellation
 * - Home/End for quick navigation
 * - Vim-style navigation (optional)
 *
 * Usage:
 *   const nav = new PipBoyKeyboardNav('.pip-boy-list-item');
 *   nav.onSelect = (item) => { console.log('Selected:', item); };
 */

(function (global) {
    'use strict';

    /**
     * PipBoyKeyboardNav Class
     * Handles keyboard navigation for selectable items
     */
    class PipBoyKeyboardNav {
        /**
         * Constructor
         * @param {string} itemSelector - CSS selector for navigable items
         * @param {object} options - Configuration options
         */
        constructor(itemSelector, options = {}) {
            this.itemSelector = itemSelector;
            this.currentIndex = 0;
            this.items = [];

            // Configuration options
            this.options = {
                activeClass: options.activeClass || 'active',
                scrollIntoView: options.scrollIntoView !== false,
                enableVimKeys: options.enableVimKeys || false,
                wrapAround: options.wrapAround !== false,
                ...options
            };

            // Callbacks
            this.onSelect = null;
            this.onCancel = null;
            this.onChange = null;

            // Initialize
            this.refresh();
            this.attachEventListeners();
        }

        /**
         * Refresh the list of navigable items
         */
        refresh() {
            this.items = Array.from(document.querySelectorAll(this.itemSelector));
            if (this.items.length > 0 && this.currentIndex === 0) {
                this.setActive(0);
            }
        }

        /**
         * Set active item by index
         * @param {number} index - Item index
         */
        setActive(index) {
            // Remove active class from all items
            this.items.forEach(item => {
                item.classList.remove(this.options.activeClass);
            });

            // Validate index
            if (index < 0 || index >= this.items.length) {
                return;
            }

            // Set new active item
            this.currentIndex = index;
            const activeItem = this.items[index];
            activeItem.classList.add(this.options.activeClass);

            // Scroll into view
            if (this.options.scrollIntoView) {
                activeItem.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest'
                });
            }

            // Trigger change callback
            if (typeof this.onChange === 'function') {
                this.onChange(activeItem, index);
            }
        }

        /**
         * Move selection up
         */
        moveUp() {
            let newIndex = this.currentIndex - 1;

            if (newIndex < 0) {
                // Wrap around to last item if enabled
                newIndex = this.options.wrapAround ? this.items.length - 1 : 0;
            }

            this.setActive(newIndex);
        }

        /**
         * Move selection down
         */
        moveDown() {
            let newIndex = this.currentIndex + 1;

            if (newIndex >= this.items.length) {
                // Wrap around to first item if enabled
                newIndex = this.options.wrapAround ? 0 : this.items.length - 1;
            }

            this.setActive(newIndex);
        }

        /**
         * Jump to first item
         */
        moveToStart() {
            this.setActive(0);
        }

        /**
         * Jump to last item
         */
        moveToEnd() {
            this.setActive(this.items.length - 1);
        }

        /**
         * Get currently selected item
         * @returns {HTMLElement|null}
         */
        getCurrentItem() {
            return this.items[this.currentIndex] || null;
        }

        /**
         * Get current index
         * @returns {number}
         */
        getCurrentIndex() {
            return this.currentIndex;
        }

        /**
         * Select current item
         */
        selectCurrent() {
            const item = this.getCurrentItem();
            if (item && typeof this.onSelect === 'function') {
                this.onSelect(item, this.currentIndex);
            }
        }

        /**
         * Cancel/go back
         */
        cancel() {
            if (typeof this.onCancel === 'function') {
                this.onCancel();
            }
        }

        /**
         * Attach keyboard event listeners
         */
        attachEventListeners() {
            document.addEventListener('keydown', (e) => {
                this.handleKeyPress(e);
            });

            // Click event for mouse users
            this.items.forEach((item, index) => {
                item.addEventListener('click', () => {
                    this.setActive(index);
                });
            });
        }

        /**
         * Handle keyboard events
         * @param {KeyboardEvent} e
         */
        handleKeyPress(e) {
            // Ignore if typing in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

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
                    this.selectCurrent();
                    break;

                case 'Escape':
                case 'ArrowLeft':
                    e.preventDefault();
                    this.cancel();
                    break;

                // Vim-style navigation (optional)
                case 'j':
                    if (this.options.enableVimKeys) {
                        e.preventDefault();
                        this.moveDown();
                    }
                    break;

                case 'k':
                    if (this.options.enableVimKeys) {
                        e.preventDefault();
                        this.moveUp();
                    }
                    break;

                case 'g':
                    if (this.options.enableVimKeys) {
                        e.preventDefault();
                        this.moveToStart();
                    }
                    break;

                case 'G':
                    if (this.options.enableVimKeys) {
                        e.preventDefault();
                        this.moveToEnd();
                    }
                    break;
            }
        }

        /**
         * Destroy navigator (cleanup)
         */
        destroy() {
            this.items.forEach(item => {
                item.classList.remove(this.options.activeClass);
            });
            // Note: Event listeners would need to be stored if we want to remove them
        }
    }

    /**
     * Utility: Auto-scroll list container
     * Automatically scrolls a container to keep the active item visible
     */
    function autoScrollList(listContainer, activeItem, behavior = 'smooth') {
        if (!listContainer || !activeItem) return;

        const containerRect = listContainer.getBoundingClientRect();
        const itemRect = activeItem.getBoundingClientRect();

        // Check if item is out of view
        if (itemRect.top < containerRect.top || itemRect.bottom > containerRect.bottom) {
            activeItem.scrollIntoView({
                behavior: behavior,
                block: 'nearest'
            });
        }
    }

    /**
     * Utility: Debounce function
     * Limits the rate at which a function can fire
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Export to global scope
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            PipBoyKeyboardNav,
            autoScrollList,
            debounce
        };
    } else {
        global.PipBoyKeyboardNav = PipBoyKeyboardNav;
        global.PipBoyUtils = {
            autoScrollList,
            debounce
        };
    }

})(typeof window !== 'undefined' ? window : this);
