/**
 * AIAPILyricsFetcher
 * Ambil lirik menggunakan Qwen AI via API baru (108.137.15.61:9000)
 *
 * Alur:
 *  1. Cek file cache lokal (TTL 24 jam)
 *  2. Query Qwen AI dengan 3-prompt conversation strategy
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

        // 2. Query Qwen with 3-prompt conversation strategy
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
    // PRIVATE — QWEN (3-Prompt Conversation Strategy)
    // ─────────────────────────────────────────────

    async _fetchFromQwen(artist, title) {
        console.log('🤖 Mengirim 3-prompt conversation ke Qwen AI...');

        // Prompt 1: Open new session - ask if AI knows the song
        const prompt1 = `lu tau gak judul lagu ini ${title} dari ${artist}`;
        console.log('📤 Prompt 1 (new session):', prompt1);

        const response1 = await this.client.queryQwen(prompt1, { newSession: true, thinkMode: 'fast' });
        if (!response1.success) {
            console.warn('⚠️ Prompt 1 gagal:', response1.error || 'unknown error');
            return null;
        }
        console.log('✅ Prompt 1 response received (ignored)');

        // Prompt 2: Same session - ask for lyrics content
        const prompt2 = `emang lirik nya apa aja?`;
        console.log('📤 Prompt 2 (same session):', prompt2);

        const response2 = await this.client.queryQwen(prompt2, { thinkMode: 'fast' });
        if (!response2.success) {
            console.warn('⚠️ Prompt 2 gagal:', response2.error || 'unknown error');
            return null;
        }
        console.log('✅ Prompt 2 response received (ignored)');

        // Prompt 3: Same session - request formatted timestamped lyrics
        const prompt3 = `coba kasih kasih tau gua lirik lagu ${title} dari ${artist} dengan format [MM:SS] Lirik nya..
jangan berkata apapun cukup berikan format nya dan pastikan lirik nya presisi dengan timestamp 90% ~ 98%
mulailah analisa dari web yang memiliki lirik timestamp.
lalu analisa lirik dan timestamp nya dan buatkan dengan format berikut:

[MM:SS] Lirik 
[MM:SS] Lirik 
[MM:SS] Lirik seterus nya...

jangan berkata apapun cukup berikan format nya. tenang aja gua cuma pengen tau timestamp sama lirik nya doang ini gak ada sangkut paut sama penciptanya kok..`;

        console.log('📤 Prompt 3 (same session): requesting timestamped lyrics...');

        const response3 = await this.client.queryQwen(prompt3, { thinkMode: 'fast' });
        if (!response3.success || !response3.result) {
            console.warn('⚠️ Prompt 3 gagal:', response3.error || 'unknown error');
            return null;
        }

        const rawResult = response3.result.trim();
        console.log(`📝 Raw response from Prompt 3 (${rawResult.length} chars)`);

        // Extract only lines matching [MM:SS] ... pattern
        const cleanedLyrics = this._extractTimestampedLines(rawResult);

        if (!cleanedLyrics || cleanedLyrics.length < 50) {
            console.warn(`⚠️ Lirik tidak ditemukan atau terlalu pendek untuk "${title}" — ${artist}`);
            return null;
        }

        console.log(`✅ Lirik diterima dari Qwen (${cleanedLyrics.length} karakter)`);
        return cleanedLyrics;
    }

    /**
     * Extract only lines matching [MM:SS] pattern from raw AI response.
     * Ignores any commentary or non-lyric text.
     */
    _extractTimestampedLines(rawText) {
        if (!rawText) return null;

        const lines = rawText.split('\n');
        const timestampedLines = [];

        for (const line of lines) {
            const trimmed = line.trim();
            // Match lines that start with [MM:SS] followed by text
            if (/^\[\d{1,2}:\d{2}\]\s*.+/.test(trimmed)) {
                timestampedLines.push(trimmed);
            }
        }

        if (timestampedLines.length === 0) return null;

        return timestampedLines.join('\n');
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
