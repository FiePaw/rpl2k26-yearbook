/**
 * Rate Limit Handler Module
 * Mengelola rate limit dari Spotify API dengan exponential backoff
 * 
 * Features:
 * - Detect rate limit errors
 * - Track rate limit status dan timing
 * - Exponential backoff untuk retries
 * - Clear user messaging
 */

class RateLimitHandler {
    constructor() {
        this.rateLimitUntil = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.lastErrorMessage = null;
    }

    /**
     * Parse retry-after header (dapat dalam format seconds atau HTTP-date)
     * @param {string|number} retryAfterHeader - Retry-after header value
     * @returns {number} Seconds to wait
     */
    parseRetryAfter(retryAfterHeader) {
        if (!retryAfterHeader) return 86400; // Default 24 hours
        
        // Try parsing as seconds
        const seconds = parseInt(retryAfterHeader);
        if (!isNaN(seconds) && seconds > 0) {
            return seconds;
        }
        
        // Try parsing as HTTP-date
        const date = new Date(retryAfterHeader);
        if (!isNaN(date.getTime())) {
            const secondsToWait = Math.floor((date - new Date()) / 1000);
            return Math.max(secondsToWait, 0);
        }
        
        // Fallback to 24 hours
        return 86400;
    }

    /**
     * Check apakah saat ini sedang rate limited
     * @returns {boolean} True jika rate limited
     */
    isRateLimited() {
        if (!this.rateLimitUntil) return false;
        return Date.now() < this.rateLimitUntil;
    }

    /**
     * Get waktu tunggu dalam seconds
     * @returns {number} Seconds to wait (0 jika tidak rate limited)
     */
    getWaitTime() {
        if (!this.rateLimitUntil) return 0;
        const remaining = Math.ceil((this.rateLimitUntil - Date.now()) / 1000);
        return Math.max(remaining, 0);
    }

    /**
     * Mark sebagai rate limited dengan waktu retry
     * @param {number} retryAfterSeconds - Seconds to wait
     */
    setRateLimit(retryAfterSeconds) {
        this.rateLimitUntil = Date.now() + (retryAfterSeconds * 1000);
        
        // Format waktu tunggu dalam human-readable format
        const hours = Math.floor(retryAfterSeconds / 3600);
        const minutes = Math.floor((retryAfterSeconds % 3600) / 60);
        const seconds = retryAfterSeconds % 60;
        
        let timeStr = '';
        if (hours > 0) timeStr += `${hours}h `;
        if (minutes > 0) timeStr += `${minutes}m `;
        if (seconds > 0) timeStr += `${seconds}s`;
        
        this.lastErrorMessage = `⏱️ Rate limited oleh Spotify API! Tunggu: ${timeStr || 'beberapa saat'} sebelum coba lagi`;
        console.warn(this.lastErrorMessage);
    }

    /**
     * Get exponential backoff delay untuk retry attempt
     * @param {number} attemptNumber - Attempt number (0-indexed)
     * @returns {number} Delay dalam milliseconds
     */
    getBackoffDelay(attemptNumber) {
        // Delay: 2^attempt seconds (2s, 4s, 8s, max 60s)
        const delaySeconds = Math.min(Math.pow(2, attemptNumber) * 2, 60);
        return delaySeconds * 1000;
    }

    /**
     * Check apakah error adalah rate limit error
     * @param {Error|string} error - Error object atau message
     * @returns {boolean} True jika rate limit error
     */
    isRateLimitError(error) {
        const errorStr = (error?.message || error?.toString() || '').toLowerCase();
        const statusCode = error?.status || error?.statusCode;
        
        return (
            statusCode === 429 ||
            statusCode === '429' ||
            errorStr.includes('rate limit') ||
            errorStr.includes('429') ||
            errorStr.includes('86400') ||
            errorStr.includes('you have reached a rate limit') ||
            errorStr.includes('retry will occur')
        );
    }

    /**
     * Handle error dan determine apakah bisa retry
     * @param {Error} error - Error object
     * @param {number} attemptNumber - Attempt number  
     * @returns {object} { shouldRetry: boolean, delay: number, message: string }
     */
    handleError(error, attemptNumber = 0) {
        if (this.isRateLimitError(error)) {
            // Extract retry-after jika ada
            const retryAfter = error.headers?.['retry-after'] || 86400;
            this.setRateLimit(this.parseRetryAfter(retryAfter));
            
            return {
                shouldRetry: false, // Jangan retry rate limit, user harus tunggu
                delay: 0,
                message: this.lastErrorMessage || `Rate limit error: Tunggu ${this.getWaitTime()}s`,
                isRateLimit: true
            };
        }

        // For non-rate-limit errors, try exponential backoff
        if (attemptNumber < this.maxRetries) {
            const delay = this.getBackoffDelay(attemptNumber);
            return {
                shouldRetry: true,
                delay: delay,
                message: `Attempt ${attemptNumber + 1}/${this.maxRetries} failed, retry dalam ${Math.round(delay / 1000)}s...`,
                isRateLimit: false
            };
        }

        return {
            shouldRetry: false,
            delay: 0,
            message: `Failed setelah ${this.maxRetries} attempts: ${error.message}`,
            isRateLimit: false
        };
    }

    /**
     * Reset rate limit handler
     */
    reset() {
        this.rateLimitUntil = null;
        this.retryCount = 0;
        this.lastErrorMessage = null;
    }

    /**
     * Get status information
     * @returns {object} Current status
     */
    getStatus() {
        return {
            isRateLimited: this.isRateLimited(),
            waitTimeSeconds: this.getWaitTime(),
            lastError: this.lastErrorMessage,
            retryCount: this.retryCount,
            maxRetries: this.maxRetries
        };
    }
}

module.exports = RateLimitHandler;
