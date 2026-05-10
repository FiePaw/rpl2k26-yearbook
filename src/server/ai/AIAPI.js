/**
 * QwenClient — HTTP client untuk Qwen AI API
 * Base URL: http://108.137.15.61:9000
 *
 * Kompatibel dengan OpenAI Chat Completions format.
 * Session dikelola otomatis via X-Session-ID header.
 */

class QwenClient {
    /**
     * @param {string} baseURL  - Base URL server AI
     * @param {number} timeout  - Timeout dalam ms (default: 180 detik)
     */
    constructor(baseURL = 'http://108.137.15.61:9000', timeout = 180000) {
        this.baseURL = baseURL.replace(/\/$/, '');
        this.timeout = timeout;
        this.sessionId = null;
        this.cookieFile = null;
        this.conversationUrl = null;
    }

    // ─────────────────────────────────────────────
    // PUBLIC METHODS
    // ─────────────────────────────────────────────

    /**
     * Cek apakah server sedang berjalan.
     * @returns {Promise<{status: string, timestamp: number}>}
     */
    async health() {
        return this._request('GET', '/health');
    }

    /**
     * Daftar model yang tersedia.
     * @returns {Promise<object>}
     */
    async getModels() {
        return this._request('GET', '/v1/models');
    }

    /**
     * Lihat semua sesi aktif di server.
     * @returns {Promise<object>}
     */
    async getSessions() {
        return this._request('GET', '/v1/sessions');
    }

    /**
     * Hapus sesi secara manual.
     * @param {string} [sessionId] - ID sesi yang akan dihapus (default: sesi aktif)
     */
    async deleteSession(sessionId = null) {
        const id = sessionId || this.sessionId;
        if (!id) return;
        await this._request('DELETE', `/v1/sessions/${id}`);
        if (!sessionId || sessionId === this.sessionId) {
            this._resetSession();
        }
    }

    /**
     * Kirim pesan ke Qwen AI.
     * Session dikelola otomatis — panggil resetSession() untuk percakapan baru.
     *
     * @param {string}   prompt      - Pesan yang dikirim ke AI
     * @param {object}   [options]
     * @param {string}   [options.thinkMode]    - "fast" | "auto" | "thinking"
     * @param {Array}    [options.attachments]  - [{filename, data (base64), mime_type?}]
     * @param {boolean}  [options.newSession]   - Paksa mulai percakapan baru
     * @returns {Promise<{success: boolean, result: string, sessionId: string}>}
     */
    async queryQwen(prompt, options = {}) {
        // Backward-compat: queryQwen(prompt, 'new') → paksa sesi baru
        if (typeof options === 'string') {
            options = { newSession: options === 'new' };
        }

        const { thinkMode = 'fast', attachments = [], newSession = false } = options;

        if (newSession) this._resetSession();

        const headers = { 'Content-Type': 'application/json' };
        if (this.sessionId) headers['X-Session-ID'] = this.sessionId;

        const body = {
            model: 'qwen',
            messages: [{ role: 'user', content: prompt }],
        };
        if (thinkMode) body.think_mode = thinkMode;
        if (attachments.length > 0) body.attachments = attachments;

        try {
            const response = await this._fetchWithTimeout(
                `${this.baseURL}/v1/chat/completions`,
                { method: 'POST', headers, body: JSON.stringify(body) }
            );

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errText}`);
            }

            const data = await response.json();

            // Simpan session info dari response headers
            const newSid =
                response.headers.get('X-Session-ID') ||
                data?.x_meta?.session_id;
            if (newSid) this.sessionId = newSid;

            const cookieFile = response.headers.get('X-Cookie-File') || data?.x_meta?.cookie_file;
            if (cookieFile) this.cookieFile = cookieFile;

            const convUrl = response.headers.get('X-Conversation-URL') || data?.x_meta?.conversation_url;
            if (convUrl) this.conversationUrl = convUrl;

            const content = data?.choices?.[0]?.message?.content;
            if (!content) throw new Error('Response tidak mengandung content');

            return {
                success: true,
                result: content,
                sessionId: this.sessionId,
            };

        } catch (error) {
            console.error('❌ QwenClient.queryQwen error:', error.message);
            return {
                success: false,
                error: error.message,
                result: null,
                sessionId: this.sessionId,
                timestamp: new Date().toISOString(),
            };
        }
    }

    /**
     * Mulai percakapan baru — reset session lokal.
     * Session lama di server otomatis expire setelah 1 jam.
     */
    resetSession() {
        this._resetSession();
    }

    /**
     * Tampilkan info sesi aktif (untuk debugging).
     */
    info() {
        console.log(`Session ID : ${this.sessionId || '(belum ada)'}`);
        console.log(`Akun       : ${this.cookieFile || '-'}`);
        console.log(`Conv URL   : ${this.conversationUrl || '-'}`);
    }

    // ─────────────────────────────────────────────
    // PRIVATE METHODS
    // ─────────────────────────────────────────────

    _resetSession() {
        this.sessionId = null;
        this.cookieFile = null;
        this.conversationUrl = null;
    }

    async _request(method, endpoint, data = null) {
        try {
            const options = {
                method,
                headers: { 'Content-Type': 'application/json' },
            };
            if (data && method !== 'GET') {
                options.body = JSON.stringify(data);
            }
            const response = await this._fetchWithTimeout(
                `${this.baseURL}${endpoint}`,
                options
            );
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            return { success: false, error: error.message, timestamp: new Date().toISOString() };
        }
    }

    _fetchWithTimeout(url, options) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeout);
        return fetch(url, { ...options, signal: controller.signal })
            .finally(() => clearTimeout(timer));
    }
}

module.exports = QwenClient;
