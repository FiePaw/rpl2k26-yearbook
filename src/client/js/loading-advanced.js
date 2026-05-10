// loading-advanced.js - Advanced Loading Manager Features

/**
 * Advanced usage examples and helper functions for LoadingManager
 */

// ========== CUSTOM LOADING MESSAGES ==========

class AdvancedLoadingManager extends LoadingManager {
    constructor() {
        super();
        this.loadingMessages = [
            'Loading...',
            'Memuat konten...',
            'Tunggu sebentar...',
            'Sedang memproses...',
            'Hampir selesai...'
        ];
        this.currentMessageIndex = 0;
        this.messageInterval = null;
    }

    /**
     * Show loading dengan custom message
     */
    showWithMessage(message, duration = 5000) {
        const textElement = document.querySelector('.loading-text');
        if (textElement) {
            textElement.textContent = message;
        }
        this.show();
        this.forceHideAfter(duration);
    }

    /**
     * Start animating loading messages
     */
    startAnimatingMessages() {
        const textElement = document.querySelector('.loading-text');
        if (!textElement) return;

        this.messageInterval = setInterval(() => {
            this.currentMessageIndex = (this.currentMessageIndex + 1) % this.loadingMessages.length;
            textElement.textContent = this.loadingMessages[this.currentMessageIndex];
        }, 1000);
    }

    /**
     * Stop animating messages
     */
    stopAnimatingMessages() {
        if (this.messageInterval) {
            clearInterval(this.messageInterval);
            this.messageInterval = null;
        }
    }

    /**
     * Override hide untuk stop animating messages
     */
    hide() {
        this.stopAnimatingMessages();
        super.hide();
    }

    /**
     * Set custom loading text
     */
    setLoadingText(text) {
        const textElement = document.querySelector('.loading-text');
        if (textElement) {
            textElement.textContent = text;
        }
    }
}

// ========== PROGRESS LOADING ==========

class ProgressLoadingManager extends LoadingManager {
    constructor() {
        super();
        this.progress = 0;
        this.progressInterval = null;
    }

    /**
     * Create progress bar if not exists
     */
    createProgressBar() {
        if (!document.querySelector('.loading-progress-bar')) {
            const progressHTML = `
                <div class="loading-progress-bar">
                    <div class="loading-progress-fill" style="width: 0%"></div>
                </div>
            `;
            
            const loadingContent = document.querySelector('.loading-content');
            if (loadingContent) {
                loadingContent.insertAdjacentHTML('afterend', progressHTML);
                this.addProgressStyles();
            }
        }
    }

    /**
     * Add progress bar styles
     */
    addProgressStyles() {
        if (!document.getElementById('loading-progress-styles')) {
            const style = document.createElement('style');
            style.id = 'loading-progress-styles';
            style.textContent = `
                .loading-progress-bar {
                    position: fixed;
                    bottom: 30px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 300px;
                    height: 4px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 2px;
                    overflow: hidden;
                    z-index: 10000;
                }

                .loading-progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #1DB954, #FF6B6B);
                    border-radius: 2px;
                    transition: width 0.3s ease;
                    box-shadow: 0 0 10px rgba(29, 185, 84, 0.8);
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Show loading dengan progress
     */
    showWithProgress(duration = 5000) {
        this.createProgressBar();
        this.show();
        this.startProgress(duration);
    }

    /**
     * Start progress animation
     */
    startProgress(duration) {
        this.progress = 0;
        const progressFill = document.querySelector('.loading-progress-fill');
        if (!progressFill) return;

        const interval = 50; // Update setiap 50ms
        const increment = (100 / (duration / interval)) * 0.8; // 80% in the duration
        
        this.progressInterval = setInterval(() => {
            this.progress += increment;
            
            if (this.progress >= 100) {
                this.progress = 100;
                clearInterval(this.progressInterval);
            }
            
            progressFill.style.width = this.progress + '%';
        }, interval);
    }

    /**
     * Override hide untuk stop progress
     */
    hide() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }
        super.hide();
    }
}

// ========== CONDITIONAL LOADING ==========

/**
 * Show loading hanya jika page load lebih dari X ms
 */
class ConditionalLoadingManager extends LoadingManager {
    constructor() {
        super();
        this.minShowTime = 500; // Show loading jika > 500ms
        this.shouldShow = false;
    }

    /**
     * Show loading conditionally
     */
    showConditional(minTime = 500) {
        this.minShowTime = minTime;
        this.shouldShow = false;

        // Set flag untuk menampilkan loading setelah delay
        setTimeout(() => {
            if (!this.shouldShow) {
                this.shouldShow = true;
                this.show();
            }
        }, minTime);
    }

    /**
     * Override hide untuk clear timeout
     */
    hide() {
        if (!this.shouldShow) {
            this.shouldShow = true; // Prevent dari menampilkan lagi
        }
        super.hide();
    }
}

// ========== ASYNC LOADING CONTROLLER ==========

/**
 * Mengelola loading untuk multiple async operations
 */
class AsyncLoadingManager {
    constructor() {
        this.operationCount = 0;
        this.loadingManager = window.loadingManager;
    }

    /**
     * Start async operation
     */
    startOperation(operationName = 'default') {
        this.operationCount++;
        if (this.operationCount === 1) {
            this.loadingManager.show();
        }
        console.log(`✓ Operation started: ${operationName} (${this.operationCount} active)`);
    }

    /**
     * End async operation
     */
    endOperation(operationName = 'default') {
        this.operationCount--;
        if (this.operationCount <= 0) {
            this.operationCount = 0;
            this.loadingManager.hide();
        }
        console.log(`✗ Operation ended: ${operationName} (${this.operationCount} active)`);
    }

    /**
     * Wrap async function dengan loading
     */
    async wrapAsync(asyncFn, operationName = 'async-op') {
        this.startOperation(operationName);
        try {
            return await asyncFn();
        } finally {
            this.endOperation(operationName);
        }
    }

    /**
     * Get current operation count
     */
    getOperationCount() {
        return this.operationCount;
    }
}

// ========== EXPORT & INITIALIZE ==========

// Gunakan ini di console:
// window.advLoadingManager = new AdvancedLoadingManager();
// window.progressLoading = new ProgressLoadingManager();
// window.conditionalLoading = new ConditionalLoadingManager();
// window.asyncLoading = new AsyncLoadingManager();

// ========== USAGE EXAMPLES ==========

/**
 * EXAMPLE 1: Custom message
 * 
 * const advManager = new AdvancedLoadingManager();
 * advManager.showWithMessage('Memproses data...', 3000);
 */

/**
 * EXAMPLE 2: Animating messages
 * 
 * const advManager = new AdvancedLoadingManager();
 * advManager.loadingMessages = [
 *     'Loading...',
 *     'Fetching data...',
 *     'Processing...',
 *     'Almost there...'
 * ];
 * advManager.startAnimatingMessages();
 * advManager.show();
 * setTimeout(() => advManager.hide(), 5000);
 */

/**
 * EXAMPLE 3: Progress loading
 * 
 * const progressManager = new ProgressLoadingManager();
 * progressManager.showWithProgress(5000);
 */

/**
 * EXAMPLE 4: Conditional loading
 * 
 * const conditionalManager = new ConditionalLoadingManager();
 * conditionalManager.showConditional(1000); // Show jika > 1 detik
 */

/**
 * EXAMPLE 5: Multiple async operations
 * 
 * const asyncManager = new AsyncLoadingManager();
 * 
 * // Operation 1
 * asyncManager.startOperation('fetch-users');
 * fetch('/api/users').finally(() => asyncManager.endOperation('fetch-users'));
 * 
 * // Operation 2
 * asyncManager.startOperation('fetch-posts');
 * fetch('/api/posts').finally(() => asyncManager.endOperation('fetch-posts'));
 */

// Export untuk use di console atau external scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AdvancedLoadingManager,
        ProgressLoadingManager,
        ConditionalLoadingManager,
        AsyncLoadingManager
    };
}
