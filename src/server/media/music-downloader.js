/**
 * Music Downloader Module - Refactored Version v2.8.0
 * 
 * Menggabungkan:
 * - Metadata Cache System (mengurangi API calls 90%)
 * - Rate Limit Handler (graceful error handling)
 * - Smart Platform Detection (Spotify/YouTube/YouTube Music)
 * - Spotify oEmbed API (tanpa authentication, tidak ada rate limit)
 * - Cookie Rotation (multiple cookies, auto-rotate on invalid/expired)
 * - Fallback YouTube Search (play-dl → yt-search → youtube-sr)
 * 
 * Mengatasi masalah:
 * ✅ Rate limit issue dari spotdl
 * ✅ No API calls untuk cached tracks
 * ✅ Graceful fallback jika metadata gagal
 * ✅ Works dengan existing server.js API
 * ✅ Rotating cookies untuk bypass expired/invalid cookies
 * ✅ Multiple fallback search methods
 */

const axios = require('axios');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const MetadataCache = require('../utils/metadata-cache');
const RateLimitHandler = require('../utils/rate-limit-handler');
const CookieRotator = require('../utils/cookie-rotator');

// Optional dependencies - loaded with try/catch
let playDl = null;
let ytSearch = null;
let youtubeSr = null;

try { playDl = require('play-dl'); } catch (e) { /* not installed */ }
try { ytSearch = require('yt-search'); } catch (e) { /* not installed */ }
try { youtubeSr = require('youtube-sr'); } catch (e) { /* not installed */ }

class MusicDownloader {
    constructor(outputDir = 'downloads', cacheDir = 'metadata_cache') {
        this.outputDir = outputDir;
        this.cacheDir = cacheDir;
        this.metadataCache = new MetadataCache(cacheDir);
        this.rateLimitHandler = new RateLimitHandler();
        this.pythonCmd = null; // Will be detected on first use
        
        // Initialize cookie rotator - uses cookies/ directory at project root
        const projectRoot = path.join(__dirname, '..', '..', '..');
        this.cookieRotator = new CookieRotator(path.join(projectRoot, 'cookies'));

        // Ensure output directory exists
        if (!fsSync.existsSync(outputDir)) {
            fsSync.mkdirSync(outputDir, { recursive: true });
        }
    }

    /**
     * Detect which Python command is available (python, python3, python2, etc)
     */
    async getPythonCommand() {
        if (this.pythonCmd) return this.pythonCmd;

        const { execSync } = require('child_process');
        const pythonCandidates = ['python3', 'python', 'python2'];

        for (const pythonCmd of pythonCandidates) {
            try {
                execSync(`${pythonCmd} --version`, { stdio: 'pipe', timeout: 2000 });
                console.log(`✓ Found Python: ${pythonCmd}`);
                this.pythonCmd = pythonCmd;
                return pythonCmd;
            } catch (error) {
                continue;
            }
        }

        throw new Error(
            'Python tidak ditemukan! Install Python dengan:\n' +
            '  Ubuntu/Debian: sudo apt-get install python3 python3-pip\n' +
            '  Fedora: sudo dnf install python3 python3-pip\n' +
            '  macOS: brew install python3\n' +
            'Kemudian install yt-dlp: pip3 install yt-dlp'
        );
    }

    /**
     * Download lagu dari URL (smart platform detection)
     * @param {string} url - Spotify/YouTube/YouTube Music URL
     * @param {string} artist - Optional artist name untuk Spotify
     * @returns {Promise<object>} { success, fileName, filePath, source, message }
     */
    async download(url, artist = null) {
        try {
            if (!url) {
                throw new Error('URL harus disediakan');
            }

            if (!this.isValidUrl(url)) {
                throw new Error('URL tidak valid. Gunakan Spotify, YouTube, atau YouTube Music link');
            }

            console.log(`🎵 Download request: ${url}${artist ? ` (artist: ${artist})` : ''}`);

            if (this.rateLimitHandler.isRateLimited()) {
                const waitTime = this.rateLimitHandler.getWaitTime();
                throw new Error(`⏱️ Rate limited. Tunggu ${waitTime}s sebelum coba lagi.`);
            }

            const isSpotify = /spotify\.com/i.test(url);
            const isYoutube = /youtube\.com|youtu\.be/i.test(url);
            const isYoutubeMusic = /music\.youtube\.com/i.test(url);

            let result = null;

            if (isSpotify) {
                result = await this.downloadFromSpotify(url, artist);
            } else if (isYoutubeMusic) {
                result = await this.downloadFromYoutubeMusic(url);
            } else if (isYoutube) {
                result = await this.downloadFromYoutube(url);
            }

            if (!result.fileName) {
                throw new Error('File tidak ditemukan setelah download');
            }

            console.log(`✅ Download berhasil: ${result.fileName}`);
            return result;

        } catch (error) {
            console.error(`❌ Download error: ${error.message}`);
            
            if (error.message.includes('Python tidak ditemukan') || 
                error.message.includes('ENOENT') || 
                error.code === 'ENOENT' ||
                error.message.includes('spawn')) {
                return {
                    success: false,
                    message: `❌ Setup Error: Python atau yt-dlp tidak ditemukan.\n\n` +
                        `Linux (Ubuntu/Debian):\n` +
                        `  sudo apt-get install python3 python3-pip\n` +
                        `  pip3 install yt-dlp\n\n` +
                        `macOS:\n` +
                        `  brew install python3\n` +
                        `  pip3 install yt-dlp`,
                    isSetupError: true
                };
            }
            
            const errorHandling = this.rateLimitHandler.handleError(error);
            if (errorHandling.isRateLimit) {
                return { success: false, message: errorHandling.message, isRateLimit: true };
            }

            return { success: false, message: error.message };
        }
    }


    /**
     * Search YouTube with multiple fallback methods:
     * 1. play-dl
     * 2. yt-search
     * 3. youtube-sr
     * 
     * @param {string} query - Search query
     * @returns {Promise<{title: string, url: string, videoId: string}>}
     */
    async searchYoutube(query) {
        console.log(`🔎 Searching YouTube: "${query}"`);

        // Method 1: play-dl
        if (playDl) {
            try {
                console.log('  📡 Trying play-dl...');
                const results = await playDl.search(query, { limit: 1, source: { youtube: 'video' } });
                if (results && results.length > 0) {
                    const video = results[0];
                    console.log(`  ✅ [play-dl] Found: ${video.title}`);
                    return {
                        title: video.title,
                        url: video.url,
                        videoId: video.id,
                        duration: video.durationRaw,
                        source: 'play-dl'
                    };
                }
            } catch (err) {
                console.log(`  ⚠️ [play-dl] Failed: ${err.message}`);
            }
        } else {
            console.log('  ⏭️ play-dl not installed, skipping...');
        }

        // Method 2: yt-search
        if (ytSearch) {
            try {
                console.log('  📡 Trying yt-search...');
                const result = await ytSearch(query);
                if (result.videos && result.videos.length > 0) {
                    const video = result.videos[0];
                    console.log(`  ✅ [yt-search] Found: ${video.title}`);
                    return {
                        title: video.title,
                        url: video.url,
                        videoId: video.videoId,
                        duration: video.timestamp,
                        views: video.views,
                        source: 'yt-search'
                    };
                }
            } catch (err) {
                console.log(`  ⚠️ [yt-search] Failed: ${err.message}`);
            }
        } else {
            console.log('  ⏭️ yt-search not installed, skipping...');
        }

        // Method 3: youtube-sr
        if (youtubeSr) {
            try {
                console.log('  📡 Trying youtube-sr...');
                const YouTube = youtubeSr.default || youtubeSr;
                const results = await YouTube.search(query, { limit: 1, type: 'video' });
                if (results && results.length > 0) {
                    const video = results[0];
                    console.log(`  ✅ [youtube-sr] Found: ${video.title}`);
                    return {
                        title: video.title,
                        url: video.url,
                        videoId: video.id,
                        duration: video.durationFormatted,
                        source: 'youtube-sr'
                    };
                }
            } catch (err) {
                console.log(`  ⚠️ [youtube-sr] Failed: ${err.message}`);
            }
        } else {
            console.log('  ⏭️ youtube-sr not installed, skipping...');
        }

        throw new Error(`YouTube search gagal untuk: "${query}" — semua metode (play-dl, yt-search, youtube-sr) gagal`);
    }


    /**
     * Download dari Spotify (fetch metadata + search YouTube)
     */
    async downloadFromSpotify(spotifyUrl, artist = null) {
        const trackId = this.extractSpotifyTrackId(spotifyUrl);
        if (!trackId) {
            throw new Error('URL Spotify tidak valid');
        }

        console.log(`🔍 Spotify track ID: ${trackId}`);

        let metadata = await this.metadataCache.getCached(spotifyUrl);
        
        if (!metadata) {
            console.log(`📡 Fetching metadata dari Spotify API...`);
            metadata = await this.getSpotifyMetadata(trackId);
            if (metadata) {
                await this.metadataCache.cache(spotifyUrl, metadata);
            }
        }

        const title = metadata?.title || `spotify:track:${trackId}`;
        const searchStrategies = [];
        
        if (artist && title) {
            searchStrategies.push(`${artist} - ${title}`);
            console.log(`🎤 Using provided artist: "${artist}"`);
        }
        
        searchStrategies.push(title);
        
        if (!artist) {
            searchStrategies.push(`spotify:track:${trackId}`);
        }

        console.log(`🔎 Search strategies: ${searchStrategies.join(' | ')}`);

        for (const searchQuery of searchStrategies) {
            try {
                console.log(`📥 Attempting download with: "${searchQuery}"`);
                const youtubeResult = await this.searchYoutube(searchQuery);
                await this.downloadWithYtdlp(youtubeResult.url, this.outputDir);
                
                const fileName = await this.getDownloadedFileName(this.outputDir);
                if (fileName) {
                    const filePath = path.join(this.outputDir, fileName);
                    console.log(`✅ Download berhasil dengan query: "${searchQuery}"`);
                    
                    return {
                        success: true,
                        fileName: fileName,
                        filePath: filePath,
                        source: 'spotify-via-youtube',
                        message: `Downloaded dari Spotify: ${title}${artist ? ` (artist: ${artist})` : ''}`
                    };
                }
            } catch (err) {
                console.log(`⚠️ Strategy gagal: "${searchQuery}" - ${err.message}`);
                continue;
            }
        }

        throw new Error(`Tidak bisa download lagu ini dari YouTube dengan strategies: ${searchStrategies.join(', ')}`);
    }

    /**
     * Download langsung dari YouTube
     */
    async downloadFromYoutube(youtubeUrl) {
        console.log(`🎬 Direct YouTube download...`);
        
        await this.downloadWithYtdlp(youtubeUrl, this.outputDir);
        
        const fileName = await this.getDownloadedFileName(this.outputDir);
        const filePath = path.join(this.outputDir, fileName);

        return {
            success: true,
            fileName: fileName,
            filePath: filePath,
            source: 'youtube',
            message: 'Downloaded dari YouTube'
        };
    }

    /**
     * Download dari YouTube Music
     */
    async downloadFromYoutubeMusic(youtubeMusicUrl) {
        console.log(`📱 YouTube Music URL terdeteksi, downloading directly...`);
        
        // YouTube Music URLs can be downloaded directly via yt-dlp
        await this.downloadWithYtdlp(youtubeMusicUrl, this.outputDir);
        
        const fileName = await this.getDownloadedFileName(this.outputDir);
        const filePath = path.join(this.outputDir, fileName);

        return {
            success: true,
            fileName: fileName,
            filePath: filePath,
            source: 'youtube-music',
            message: 'Downloaded dari YouTube Music'
        };
    }

    /**
     * Detect available JavaScript runtimes for YouTube signature solving
     */
    async getJavaScriptRuntime() {
        const { execSync } = require('child_process');
        const runtimes = ['deno', 'node', 'bun'];

        for (const runtime of runtimes) {
            try {
                execSync(`${runtime} --version`, { stdio: 'pipe', timeout: 2000 });
                console.log(`✅ Found JavaScript runtime: ${runtime}`);
                return runtime;
            } catch (error) {
                continue;
            }
        }

        console.log('⚠️ No JavaScript runtime found for signature solving');
        return null;
    }

    /**
     * List available formats untuk debugging
     */
    async listAvailableFormats(url) {
        return new Promise((resolve, reject) => {
            try {
                console.log(`\n📋 Listing available formats for: ${url}`);
                
                const cookiePath = this.cookieRotator.getCurrentCookie();
                const args = ['--list-formats'];
                if (cookiePath) args.push('--cookies', cookiePath);
                args.push(url);

                const ytdlp = spawn('yt-dlp', args);
                let stdout = '';
                let stderr = '';

                ytdlp.stdout.on('data', (data) => {
                    const output = data.toString();
                    stdout += output;
                    console.log(output);
                });

                ytdlp.stderr.on('data', (data) => {
                    stderr += data.toString();
                });

                ytdlp.on('close', (code) => {
                    console.log(`\n✅ Format listing completed (exit code: ${code})\n`);
                    resolve(stdout);
                });

                ytdlp.on('error', (err) => {
                    reject(err);
                });
            } catch (error) {
                reject(error);
            }
        });
    }


    /**
     * Download menggunakan yt-dlp CLI dengan cookie rotation.
     * Jika cookie invalid/expired, otomatis rotate ke cookie berikutnya dan retry.
     * 
     * @param {string} url - URL untuk download
     * @param {string} outputPath - Output directory
     * @param {number} retryCount - Internal retry counter
     * @returns {Promise<void>}
     */
    async downloadWithYtdlp(url, outputPath, retryCount = 0) {
        const MAX_COOKIE_RETRIES = 3;

        return new Promise(async (resolve, reject) => {
            try {
                // Get current cookie from rotator
                const cookiePath = this.cookieRotator.getCurrentCookie();
                
                if (cookiePath) {
                    console.log(`🍪 Using cookie: ${path.basename(cookiePath)}`);
                } else {
                    console.log('⚠️ No cookies available - downloads may fail');
                }
                
                // Check for JavaScript runtime
                const jsRuntime = await this.getJavaScriptRuntime();
                
                if (!jsRuntime) {
                    console.error('❌ No JavaScript runtime found for YouTube signatures');
                    throw new Error('JavaScript runtime not found - cannot solve YouTube signatures');
                }
                
                // Build yt-dlp arguments
                const ytdlpArgs = [
                    '--remote-components', 'ejs:github',
                    '--js-runtimes', 'node',
                ];

                // Add cookies if available
                if (cookiePath) {
                    ytdlpArgs.push('--cookies', cookiePath);
                }

                ytdlpArgs.push(
                    '--impersonate', 'Chrome-136',
                    '-f', 'ba',
                    '-x',
                    '--audio-format', 'mp3',
                    '--audio-quality', '0',
                    '-o', path.join(outputPath, '%(title)s.%(ext)s'),
                    url
                );
                
                console.log(`\n📥 Starting yt-dlp...`);
                console.log(`🔧 JS Runtime: ${jsRuntime}`);
                console.log(`📍 URL: ${url}`);
                console.log(`💾 Output: ${path.join(outputPath, '%(title)s.%(ext)s')}\n`);
                
                const ytdlp = spawn('yt-dlp', ytdlpArgs);

                let stdout = '';
                let stderr = '';

                ytdlp.stdout.on('data', (data) => {
                    const output = data.toString();
                    stdout += output;
                    console.log(`[yt-dlp] ${output.trim()}`);
                });

                ytdlp.stderr.on('data', (data) => {
                    const output = data.toString();
                    stderr += output;
                    console.log(`[yt-dlp] ${output.trim()}`);
                });

                ytdlp.on('close', async (code) => {
                    if (code === 0) {
                        console.log('\n✅ yt-dlp download completed successfully');
                        resolve(stdout);
                    } else {
                        const fullError = stderr || stdout || 'yt-dlp download failed';
                        console.log(`\n❌ yt-dlp exit code: ${code}`);
                        
                        // Check if error is cookie-related (invalid/expired)
                        const isCookieError = this._isCookieError(fullError);
                        
                        if (isCookieError && cookiePath && retryCount < MAX_COOKIE_RETRIES) {
                            console.log(`\n🔄 Cookie appears invalid/expired, rotating...`);
                            this.cookieRotator.markInvalid(cookiePath);
                            
                            const nextCookie = this.cookieRotator.getCurrentCookie();
                            if (nextCookie) {
                                console.log(`🍪 Retrying with: ${path.basename(nextCookie)} (attempt ${retryCount + 1}/${MAX_COOKIE_RETRIES})`);
                                try {
                                    const result = await this.downloadWithYtdlp(url, outputPath, retryCount + 1);
                                    resolve(result);
                                } catch (retryErr) {
                                    reject(retryErr);
                                }
                                return;
                            }
                        }
                        
                        reject(new Error(fullError));
                    }
                });

                ytdlp.on('error', (err) => {
                    console.error('\n❌ Failed to execute yt-dlp:', err.message);
                    reject(err);
                });
            } catch (error) {
                console.error('❌ downloadWithYtdlp error:', error.message);
                reject(error);
            }
        });
    }

    /**
     * Check if an error message indicates cookie issues (invalid/expired).
     * @param {string} errorMsg - Error message from yt-dlp
     * @returns {boolean}
     */
    _isCookieError(errorMsg) {
        const cookieErrorPatterns = [
            /cookie/i,
            /login required/i,
            /sign in/i,
            /403.*forbidden/i,
            /consent/i,
            /bot.*detected/i,
            /captcha/i,
            /authentication/i,
            /session.*expired/i,
            /unable to extract/i,
            /this video is not available/i
        ];
        
        return cookieErrorPatterns.some(pattern => pattern.test(errorMsg));
    }


    /**
     * Fetch metadata dari Spotify oEmbed API (no authentication needed)
     */
    async getSpotifyMetadata(trackId) {
        try {
            const response = await axios.get(
                `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`,
                { timeout: 5000 }
            );

            if (response.data?.title) {
                console.log(`📊 Spotify metadata: ${response.data.title}`);
                return {
                    title: response.data.title,
                    author: response.data.author_name,
                    thumbnail: response.data.thumbnail_url,
                    provider: 'spotify'
                };
            }
        } catch (error) {
            console.log(`⚠️ Spotify metadata fetch failed: ${error.message}`);
        }
        return null;
    }

    /**
     * Extract Spotify track ID dari URL
     */
    extractSpotifyTrackId(spotifyUrl) {
        const match = spotifyUrl.match(/\/track\/([a-zA-Z0-9]+)/);
        return match ? match[1] : null;
    }

    /**
     * Get nama file yang baru didownload dari folder
     */
    async getDownloadedFileName(outputPath) {
        try {
            const files = await fs.readdir(outputPath);
            const mp3Files = files
                .filter(f => f.endsWith('.mp3'))
                .sort((a, b) => {
                    const aPath = path.join(outputPath, a);
                    const bPath = path.join(outputPath, b);
                    return fsSync.statSync(bPath).mtimeMs - fsSync.statSync(aPath).mtimeMs;
                });
            
            return mp3Files.length > 0 ? mp3Files[0] : null;
        } catch (err) {
            return null;
        }
    }

    /**
     * Validate URL format
     */
    isValidUrl(url) {
        const patterns = [
            /spotify\.com/i,
            /youtube\.com/i,
            /youtu\.be/i,
            /music\.youtube\.com/i
        ];
        return patterns.some(p => p.test(url));
    }

    /**
     * Get cache statistics
     */
    async getCacheStats() {
        return await this.metadataCache.getStats();
    }

    /**
     * Clear all cache
     */
    async clearCache() {
        return await this.metadataCache.clearCache();
    }

    /**
     * Get rate limit status
     */
    getRateLimitStatus() {
        return this.rateLimitHandler.getStatus();
    }

    /**
     * Get cookie rotator status
     */
    getCookieStatus() {
        return this.cookieRotator.getStatus();
    }

    /**
     * Get list file yang sudah didownload
     */
    async getDownloadedFiles() {
        try {
            const files = await fs.readdir(this.outputDir);
            return files
                .filter(f => f.endsWith('.mp3'))
                .sort()
                .reverse();
        } catch (error) {
            return [];
        }
    }

    /**
     * Delete file dari download folder
     */
    async deleteFile(fileName) {
        try {
            const filePath = path.join(this.outputDir, fileName);
            if (!filePath.startsWith(this.outputDir)) {
                throw new Error('Invalid file path');
            }

            if (fsSync.existsSync(filePath)) {
                await fs.unlink(filePath);
                console.log(`✓ File deleted: ${fileName}`);
                return true;
            }
            return false;
        } catch (error) {
            console.error(`Delete error: ${error.message}`);
            return false;
        }
    }
}

module.exports = MusicDownloader;
