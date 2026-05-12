/**
 * PO Token Generator
 *
 * Generate po_token + visitor_data dari YouTube tanpa perlu login/cookie.
 * Digunakan sebagai fallback ketika semua cookies expired/invalid.
 *
 * Cara kerja:
 * 1. Fetch visitor_data dari YouTube InnerTube API (tidak butuh auth)
 * 2. Generate po_token menggunakan BotGuard challenge response
 *    via yt-dlp's built-in --extractor-args mechanism
 *
 * Referensi: https://github.com/yt-dlp/yt-dlp/wiki/PO-Token-Guide
 */

const { spawn, execSync } = require('child_process');
const https = require('https');

const INNERTUBE_API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
const INNERTUBE_CLIENT_VERSION = '2.20240726.00.00';

class PoTokenGenerator {
    constructor() {
        this._cache = null;        // { poToken, visitorData, generatedAt }
        this._ttl = 6 * 60 * 60 * 1000; // Cache selama 6 jam
        this._generating = false;  // Lock agar tidak double-generate
    }

    /**
     * Ambil po_token + visitor_data yang valid.
     * Menggunakan cache jika masih fresh, generate baru jika sudah expired.
     * @returns {Promise<{poToken: string, visitorData: string}|null>}
     */
    async get() {
        // Kembalikan cache jika masih valid
        if (this._cache && (Date.now() - this._cache.generatedAt) < this._ttl) {
            console.log('🎟️  [PoToken] Using cached po_token');
            return { poToken: this._cache.poToken, visitorData: this._cache.visitorData };
        }

        // Hindari generate bersamaan
        if (this._generating) {
            console.log('⏳ [PoToken] Generation in progress, waiting...');
            await this._waitForGeneration();
            return this._cache ? { poToken: this._cache.poToken, visitorData: this._cache.visitorData } : null;
        }

        return await this._generate();
    }

    /**
     * Tunggu proses generate selesai (polling sederhana)
     */
    async _waitForGeneration(maxWaitMs = 30000) {
        const start = Date.now();
        while (this._generating && (Date.now() - start) < maxWaitMs) {
            await new Promise(r => setTimeout(r, 500));
        }
    }

    /**
     * Generate po_token + visitor_data baru.
     * Strategy:
     *   1. Fetch visitor_data dari InnerTube API
     *   2. Gunakan yt-dlp --print extractor_key untuk trigger po_token generation
     *      dengan --extractor-args "youtube:visitor_data=..."
     * @returns {Promise<{poToken: string, visitorData: string}|null>}
     */
    async _generate() {
        this._generating = true;
        console.log('🔑 [PoToken] Generating new po_token + visitor_data...');

        try {
            // Step 1: Dapatkan visitor_data dari YouTube
            const visitorData = await this._fetchVisitorData();
            if (!visitorData) {
                throw new Error('Gagal fetch visitor_data dari YouTube InnerTube API');
            }
            console.log(`✅ [PoToken] visitor_data: ${visitorData.slice(0, 20)}...`);

            // Step 2: Generate po_token via yt-dlp
            const poToken = await this._generatePoTokenViaYtdlp(visitorData);
            if (!poToken) {
                throw new Error('Gagal generate po_token via yt-dlp');
            }
            console.log(`✅ [PoToken] po_token: ${poToken.slice(0, 20)}...`);

            // Cache hasilnya
            this._cache = { poToken, visitorData, generatedAt: Date.now() };
            console.log('🎟️  [PoToken] Successfully generated & cached');

            return { poToken, visitorData };

        } catch (err) {
            console.error(`❌ [PoToken] Generation failed: ${err.message}`);
            return null;
        } finally {
            this._generating = false;
        }
    }

    /**
     * Fetch visitor_data dari YouTube InnerTube API.
     * Endpoint ini tidak butuh autentikasi.
     * @returns {Promise<string|null>}
     */
    async _fetchVisitorData() {
        return new Promise((resolve) => {
            const body = JSON.stringify({
                context: {
                    client: {
                        clientName: 'WEB',
                        clientVersion: INNERTUBE_CLIENT_VERSION,
                    }
                }
            });

            const options = {
                hostname: 'www.youtube.com',
                path: `/youtubei/v1/visitor_id?key=${INNERTUBE_API_KEY}`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body),
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/136.0.0.0 Safari/537.36',
                    'X-Youtube-Client-Name': '1',
                    'X-Youtube-Client-Version': INNERTUBE_CLIENT_VERSION,
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        const visitorData = parsed?.responseContext?.visitorData
                            || parsed?.visitorData
                            || null;
                        resolve(visitorData);
                    } catch {
                        resolve(null);
                    }
                });
            });

            req.on('error', () => resolve(null));
            req.setTimeout(10000, () => { req.destroy(); resolve(null); });
            req.write(body);
            req.end();
        });
    }

    /**
     * Generate po_token menggunakan yt-dlp dengan visitor_data yang sudah didapat.
     * yt-dlp versi >= 2024.07.25 support --print po_token.
     * @param {string} visitorData
     * @returns {Promise<string|null>}
     */
    async _generatePoTokenViaYtdlp(visitorData) {
        return new Promise((resolve) => {
            // Gunakan video publik pendek sebagai target untuk trigger po_token
            const testUrl = 'https://www.youtube.com/watch?v=jNQXAC9IVRw'; // YouTube's first video (18s)

            const args = [
                '--extractor-args', `youtube:visitor_data=${visitorData}`,
                '--print', 'po_token',
                '--skip-download',
                '--no-warnings',
                '--quiet',
                testUrl
            ];

            console.log('  🔧 [PoToken] Calling yt-dlp to generate po_token...');

            const proc = spawn('yt-dlp', args, { timeout: 30000 });
            let stdout = '';
            let stderr = '';

            proc.stdout.on('data', d => stdout += d.toString());
            proc.stderr.on('data', d => stderr += d.toString());

            proc.on('close', (code) => {
                const token = stdout.trim();
                if (code === 0 && token && token.length > 10) {
                    resolve(token);
                } else {
                    console.warn(`  ⚠️  [PoToken] yt-dlp exited ${code}: ${stderr.slice(0, 100)}`);
                    resolve(null);
                }
            });

            proc.on('error', () => resolve(null));
        });
    }

    /**
     * Invalidate cache paksa (misal setelah tahu po_token sudah tidak valid)
     */
    invalidate() {
        this._cache = null;
        console.log('🗑️  [PoToken] Cache invalidated');
    }

    /**
     * Status cache untuk debugging
     */
    getStatus() {
        if (!this._cache) return { cached: false };
        const ageMs = Date.now() - this._cache.generatedAt;
        const remainingMs = this._ttl - ageMs;
        return {
            cached: true,
            ageMinutes: Math.floor(ageMs / 60000),
            expiresInMinutes: Math.max(0, Math.floor(remainingMs / 60000)),
            visitorDataPrefix: this._cache.visitorData?.slice(0, 20) + '...',
            poTokenPrefix: this._cache.poToken?.slice(0, 20) + '...',
        };
    }
}

module.exports = PoTokenGenerator;