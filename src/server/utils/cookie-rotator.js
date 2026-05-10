/**
 * Cookie Rotator Module
 * 
 * Manages rotating YouTube cookies from cookies/ directory.
 * If a cookie is invalid or expired, automatically rotates to the next available cookie.
 * 
 * Usage:
 *   const CookieRotator = require('./cookie-rotator');
 *   const rotator = new CookieRotator();
 *   const cookiePath = rotator.getCurrentCookie();
 *   rotator.markInvalid(cookiePath); // marks current cookie as bad, rotates to next
 */

const fs = require('fs');
const path = require('path');

class CookieRotator {
    constructor(cookiesDir = null) {
        // Default cookies directory: project_root/cookies/
        this.cookiesDir = cookiesDir || path.join(__dirname, '..', '..', '..', 'cookies');
        this.currentIndex = 0;
        this.invalidCookies = new Set(); // Track invalid/expired cookies
        this.cookieFiles = [];
        this._lastScanTime = 0;
        this._scanInterval = 30000; // Re-scan directory every 30 seconds

        // Initial scan
        this._scanCookies();
    }

    /**
     * Scan cookies directory for available cookie files
     * Pattern: ytCookies*.txt (e.g., ytCookies1.txt, ytCookies2.txt, etc.)
     */
    _scanCookies() {
        try {
            if (!fs.existsSync(this.cookiesDir)) {
                console.warn(`⚠️ Cookies directory not found: ${this.cookiesDir}`);
                console.warn(`   Create it with: mkdir -p cookies/`);
                this.cookieFiles = [];
                return;
            }

            const files = fs.readdirSync(this.cookiesDir)
                .filter(f => f.endsWith('.txt') && f.startsWith('ytCookies'))
                .sort((a, b) => {
                    // Sort by number: ytCookies1.txt, ytCookies2.txt, ytCookies3.txt...
                    const numA = parseInt(a.match(/\d+/)?.[0] || '0');
                    const numB = parseInt(b.match(/\d+/)?.[0] || '0');
                    return numA - numB;
                })
                .map(f => path.join(this.cookiesDir, f));

            this.cookieFiles = files;
            this._lastScanTime = Date.now();

            if (files.length === 0) {
                console.warn('⚠️ No cookie files found in cookies/ directory');
                console.warn('   Add cookies: cookies/ytCookies1.txt, cookies/ytCookies2.txt, etc.');
            } else {
                console.log(`🍪 Cookie Rotator: Found ${files.length} cookie file(s)`);
                files.forEach((f, i) => {
                    const status = this.invalidCookies.has(f) ? '❌ INVALID' : '✅ OK';
                    console.log(`   [${i + 1}] ${path.basename(f)} — ${status}`);
                });
            }
        } catch (error) {
            console.error('❌ CookieRotator scan error:', error.message);
            this.cookieFiles = [];
        }
    }

    /**
     * Get the current active cookie file path.
     * Returns null if no cookies are available.
     * @returns {string|null}
     */
    getCurrentCookie() {
        // Re-scan if interval has passed
        if (Date.now() - this._lastScanTime > this._scanInterval) {
            this._scanCookies();
        }

        if (this.cookieFiles.length === 0) return null;

        // Find a valid cookie starting from current index
        const totalCookies = this.cookieFiles.length;
        let attempts = 0;

        while (attempts < totalCookies) {
            const cookiePath = this.cookieFiles[this.currentIndex % totalCookies];

            // Check if this cookie is not marked as invalid
            if (!this.invalidCookies.has(cookiePath)) {
                // Verify file still exists
                if (fs.existsSync(cookiePath)) {
                    return cookiePath;
                } else {
                    // File was deleted, rescan
                    this._scanCookies();
                    if (this.cookieFiles.length === 0) return null;
                }
            }

            // Try next cookie
            this.currentIndex = (this.currentIndex + 1) % totalCookies;
            attempts++;
        }

        // All cookies are invalid — reset invalid set and try again
        console.warn('⚠️ All cookies marked invalid! Resetting invalid list and retrying...');
        this.invalidCookies.clear();
        
        if (this.cookieFiles.length > 0) {
            this.currentIndex = 0;
            return this.cookieFiles[0];
        }

        return null;
    }

    /**
     * Mark a cookie as invalid/expired and rotate to next.
     * @param {string} cookiePath - Path of the invalid cookie
     * @returns {string|null} Next valid cookie path, or null if none available
     */
    markInvalid(cookiePath) {
        if (!cookiePath) return this.getCurrentCookie();

        this.invalidCookies.add(cookiePath);
        const cookieName = path.basename(cookiePath);
        console.log(`🔄 Cookie marked invalid: ${cookieName}`);
        console.log(`   Invalid cookies: ${this.invalidCookies.size}/${this.cookieFiles.length}`);

        // Rotate to next
        this.currentIndex = (this.currentIndex + 1) % Math.max(this.cookieFiles.length, 1);
        
        const nextCookie = this.getCurrentCookie();
        if (nextCookie) {
            console.log(`🍪 Rotated to: ${path.basename(nextCookie)}`);
        } else {
            console.warn('⚠️ No valid cookies remaining!');
        }

        return nextCookie;
    }

    /**
     * Reset a specific cookie as valid (e.g., after refreshing it).
     * @param {string} cookiePath
     */
    markValid(cookiePath) {
        this.invalidCookies.delete(cookiePath);
        console.log(`✅ Cookie marked valid: ${path.basename(cookiePath)}`);
    }

    /**
     * Reset all cookies as valid.
     */
    resetAll() {
        this.invalidCookies.clear();
        this.currentIndex = 0;
        this._scanCookies();
        console.log('🔄 All cookies reset to valid');
    }

    /**
     * Get status info for logging/debugging.
     * @returns {object}
     */
    getStatus() {
        return {
            cookiesDir: this.cookiesDir,
            totalCookies: this.cookieFiles.length,
            invalidCount: this.invalidCookies.size,
            validCount: this.cookieFiles.length - this.invalidCookies.size,
            currentIndex: this.currentIndex,
            currentCookie: this.getCurrentCookie() ? path.basename(this.getCurrentCookie()) : null,
            cookies: this.cookieFiles.map(f => ({
                name: path.basename(f),
                valid: !this.invalidCookies.has(f),
                exists: fs.existsSync(f)
            }))
        };
    }
}

module.exports = CookieRotator;
