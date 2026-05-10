/**
 * AIAPILyricsFetcher
 * Ambil lirik menggunakan Qwen AI via API baru (108.137.15.61:9000)
 *
 * Alur:
 *  1. Cek file cache lokal (TTL 24 jam)
 *  2. Query Qwen AI → dapatkan lirik berformat [MM:SS]
 *  3. Simpan ke cache
 */

const QwenClient = require('./AIAPI');

const fs = require('fs').promises;
const path = require('path');

const AI_BASE_URL = 'http://108.137.15.61:9000';
const CACHE_TTL_MS = 86400000; // 24 jam
const REQUEST_TIMEOUT_MS = 180000; // 3 menit

class AIAPILyricsFetcher {
    constructor(aiApiUrl = AI_BASE_URL) {
        this.client = new QwenClient(aiApiUrl, REQUEST_TIMEOUT_MS);
        this.cacheDir = path.join(__dirname, 'lyrics_cache');
        this._initCache();
    }

    // ─────────────────────────────────────────────
    // PUBLIC API
    // ─────────────────────────────────────────────

    /**
     * Cari lirik untuk lagu tertentu.
     * @param {string} artist
     * @param {string} title
     * @returns {Promise<string|null>} Raw lyrics text dengan timestamp [MM:SS], atau null
     */
    async searchLyrics(artist, title) {
        if (!artist || !title) {
            console.warn('⚠️ Artist dan title wajib diisi');
            return null;
        }

        artist = artist.trim();
        title = title.trim();

        console.log(`🎵 Mencari lirik: "${title}" — ${artist}`);

        // 1. Cek cache
        const cached = await this._getFromCache(artist, title);
        if (cached) return cached;

        // 2. Query Qwen
        const lyrics = await this._fetchFromQwen(artist, title);
        if (!lyrics) return null;

        // 3. Simpan cache
        await this._saveToCache(artist, title, lyrics);
        return lyrics;
    }

    /**
     * Parse raw lyrics text [MM:SS] menjadi array segments untuk karaoke.
     * @param {string} lyricsText
     * @returns {Array<{text: string, start: number, end: number}>}
     */
    parseSegments(lyricsText) {
        if (!lyricsText) return [];

        const lines = lyricsText
            .split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 0);

        const segments = [];
        let prevStart = -1;

        for (const line of lines) {
            // Hanya terima format ketat [MM:SS] diikuti teks
            const match = line.match(/^\[(\d{1,2}):(\d{2})\]\s*(.+)$/);
            if (!match) continue;

            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            const text = match[3].trim();

            if (minutes > 59 || seconds > 59 || text.length < 2) continue;

            const start = minutes * 60 + seconds;

            // Timestamps harus naik
            if (start <= prevStart) {
                console.warn(`⚠️ Timestamp tidak naik: [${minutes}:${seconds}] — dilewati`);
                continue;
            }

            segments.push({ text, start, end: null });
            prevStart = start;
        }

        if (segments.length === 0) return [];

        // Set end time: tiap segment berakhir saat segment berikutnya mulai
        for (let i = 0; i < segments.length; i++) {
            segments[i].end = i < segments.length - 1
                ? segments[i + 1].start
                : segments[i].start + 5; // segment terakhir: +5 detik
        }

        console.log(`✅ Parsed ${segments.length} segments`);
        return segments;
    }

    // ─────────────────────────────────────────────
    // PRIVATE — QWEN
    // ─────────────────────────────────────────────

    async _fetchFromQwen(artist, title) {
        console.log('🤖 Mengirim request ke Qwen AI...');

        const prompt = this._buildPrompt(artist, title);

        // Setiap pencarian lirik = percakapan baru (tidak perlu konteks sebelumnya)
        const response = await this.client.queryQwen(prompt, { newSession: true, thinkMode: 'fast' });

        if (!response.success || !response.result) {
            console.warn('⚠️ Qwen AI gagal merespons:', response.error || 'unknown error');
            return null;
        }

        const result = response.result.trim();

        if (result.includes('NO_LYRICS_FOUND') || result.length < 50) {
            console.warn(`⚠️ Lirik tidak ditemukan untuk "${title}" — ${artist}`);
            return null;
        }

        console.log(`✅ Lirik diterima dari Qwen (${result.length} karakter)`);
        return result;
    }

    _buildPrompt(artist, title) {
        return [
            `Tolong carikan lirik lengkap lagu "${title}" oleh "${artist}".`,
            ``,
            `FORMAT WAJIB — setiap baris harus diawali timestamp [MM:SS]:`,
            `[00:00] Baris pertama lirik`,
            `[00:04] Baris kedua lirik`,
            `[00:08] Dan seterusnya...`,
            ``,
            `ATURAN:`,
            `1. Hanya tulis lirik asli, tidak ada komentar atau penjelasan tambahan.`,
            `2. Setiap baris diawali [MM:SS] — estimasi waktu yang logis sesuai durasi lagu.`,
            `3. Jika lirik tidak ditemukan, balas hanya dengan: NO_LYRICS_FOUND`,
        ].join('\n');
    }

    // ─────────────────────────────────────────────
    // PRIVATE — CACHE
    // ─────────────────────────────────────────────

    async _initCache() {
        try {
            await fs.mkdir(this.cacheDir, { recursive: true });
        } catch (err) {
            console.error('Gagal membuat direktori cache:', err);
        }
    }

    _cacheKey(artist, title) {
        const sanitize = t => t.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        return `${sanitize(artist)}_${sanitize(title)}`;
    }

    async _getFromCache(artist, title) {
        try {
            const cachePath = path.join(this.cacheDir, `${this._cacheKey(artist, title)}.json`);
            await fs.access(cachePath);
            const raw = await fs.readFile(cachePath, 'utf8');
            const cached = JSON.parse(raw);
            if (Date.now() - cached.cachedAt < CACHE_TTL_MS) {
                console.log('📦 Lirik dari cache');
                return cached.lyrics;
            }
        } catch {
            // Cache miss / expired — lanjut ke Qwen
        }
        return null;
    }

    async _saveToCache(artist, title, lyrics) {
        try {
            const cachePath = path.join(this.cacheDir, `${this._cacheKey(artist, title)}.json`);
            await fs.writeFile(cachePath, JSON.stringify({ artist, title, lyrics, cachedAt: Date.now() }, null, 2));
            console.log('💾 Lirik disimpan ke cache');
        } catch (err) {
            console.warn('Gagal menyimpan cache:', err);
        }
    }
}

module.exports = AIAPILyricsFetcher;
