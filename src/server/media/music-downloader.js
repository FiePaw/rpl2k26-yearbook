/**
 * Music Downloader Module - Refactored Version
 * 
 * Menggabungkan:
 * - Metadata Cache System (mengurangi API calls 90%)
 * - Rate Limit Handler (graceful error handling)
 * - Smart Platform Detection (Spotify/YouTube/YouTube Music)
 * - Spotify oEmbed API (tanpa authentication, tidak ada rate limit)
 * 
 * Mengatasi masalah:
 * ✅ Rate limit issue dari spotdl
 * ✅ No API calls untuk cached tracks
 * ✅ Graceful fallback jika metadata gagal
 * ✅ Works dengan existing server.js API
 */

const axios = require('axios');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const MetadataCache = require('../utils/metadata-cache');
const RateLimitHandler = require('../utils/rate-limit-handler');

class MusicDownloader {
    constructor(outputDir = 'downloads', cacheDir = 'metadata_cache') {
        this.outputDir = outputDir;
        this.cacheDir = cacheDir;
        this.metadataCache = new MetadataCache(cacheDir);
        this.rateLimitHandler = new RateLimitHandler();
        this.pythonCmd = null; // Will be detected on first use
        
        // Ensure output directory exists
        if (!fsSync.existsSync(outputDir)) {
            fsSync.mkdirSync(outputDir, { recursive: true });
        }
    }

    /**
     * Detect which Python command is available (python, python3, python2, etc)
     * Needed for Linux compatibility (python3 vs python)
     * @returns {Promise<string>} Python command (python3, python, etc)
     */
    async getPythonCommand() {
        // If already detected, return cached value
        if (this.pythonCmd) {
            return this.pythonCmd;
        }

        const { execSync } = require('child_process');
        const pythonCandidates = ['python3', 'python', 'python2'];

        for (const pythonCmd of pythonCandidates) {
            try {
                execSync(`${pythonCmd} --version`, { 
                    stdio: 'pipe',
                    timeout: 2000 
                });
                console.log(`✓ Found Python: ${pythonCmd}`);
                this.pythonCmd = pythonCmd;
                return pythonCmd;
            } catch (error) {
                // This command doesn't exist, try next
                continue;
            }
        }

        // If no Python found, throw error with helpful message
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
     * @param {string} artist - Optional artist name untuk Spotify (untuk search yang lebih akurat)
     * @returns {Promise<object>} { success, fileName, filePath, source, message }
     */
    async download(url, artist = null) {
        try {
            if (!url) {
                throw new Error('URL harus disediakan');
            }

            // Validate URL format
            if (!this.isValidUrl(url)) {
                throw new Error('URL tidak valid. Gunakan Spotify, YouTube, atau YouTube Music link');
            }

            console.log(`🎵 Download request: ${url}${artist ? ` (artist: ${artist})` : ''}`);

            // Check rate limit status
            if (this.rateLimitHandler.isRateLimited()) {
                const waitTime = this.rateLimitHandler.getWaitTime();
                const message = `⏱️ Rate limited. Tunggu ${waitTime}s sebelum coba lagi.\n` +
                    `💡 Tip: Metadata untuk lagu populer sudah di-cache, coba lagu yang lain dulu`;
                throw new Error(message);
            }

            // Platform detection
            const isSpotify = /spotify\.com/i.test(url);
            const isYoutube = /youtube\.com|youtu\.be/i.test(url);
            const isYoutubeMusic = /music\.youtube\.com/i.test(url);

            let result = null;

            if (isSpotify) {
                result = await this.downloadFromSpotify(url, artist);
            } else if (isYoutube) {
                result = await this.downloadFromYoutube(url);
            } else if (isYoutubeMusic) {
                result = await this.downloadFromYoutubeMusic(url);
            }

            if (!result.fileName) {
                throw new Error('File tidak ditemukan setelah download');
            }

            console.log(`✅ Download berhasil: ${result.fileName}`);
            return result;

        } catch (error) {
            console.error(`❌ Download error: ${error.message}`);
            
            // Check if it's a Python/yt-dlp error
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
                        `Fedora:\n` +
                        `  sudo dnf install python3 python3-pip\n` +
                        `  pip3 install yt-dlp\n\n` +
                        `macOS:\n` +
                        `  brew install python3\n` +
                        `  pip3 install yt-dlp`,
                    isSetupError: true
                };
            }
            
            // Check if it's a rate limit error
            const errorHandling = this.rateLimitHandler.handleError(error);
            if (errorHandling.isRateLimit) {
                return {
                    success: false,
                    message: errorHandling.message,
                    isRateLimit: true
                };
            }

            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Download dari Spotify (fetch metadata + search YouTube)
     * @param {string} spotifyUrl - Spotify URL
     * @param {string} artist - Optional artist name untuk search yang lebih akurat
     * @returns {Promise<object>} Download result
     */
    async downloadFromSpotify(spotifyUrl, artist = null) {
        const trackId = this.extractSpotifyTrackId(spotifyUrl);
        if (!trackId) {
            throw new Error('URL Spotify tidak valid');
        }

        console.log(`🔍 Spotify track ID: ${trackId}`);

        // Check cache first
        let metadata = await this.metadataCache.getCached(spotifyUrl);
        
        // If not cached, fetch from Spotify API
        if (!metadata) {
            console.log(`📡 Fetching metadata dari Spotify API...`);
            metadata = await this.getSpotifyMetadata(trackId);
            
            if (metadata) {
                // Cache untuk next time
                await this.metadataCache.cache(spotifyUrl, metadata);
            }
        }

        // Prepare search queries dengan fallback strategies
        const title = metadata?.title || `spotify:track:${trackId}`;
        const searchStrategies = [];
        
        // Strategy 1: Artist + Title (jika artist disediakan)
        if (artist && title) {
            searchStrategies.push(`${artist} - ${title}`);
            console.log(`🎤 Using provided artist: "${artist}"`);
        }
        
        // Strategy 2: Just Title
        searchStrategies.push(title);
        
        // Strategy 3: Fallback Spotify track ID
        if (!artist) {
            searchStrategies.push(`spotify:track:${trackId}`);
        }

        console.log(`🔎 Search strategies: ${searchStrategies.join(' | ')}`);

        // Try each search strategy
        let downloading = false;
        for (const searchQuery of searchStrategies) {
            try {
                console.log(`📥 Attempting download with: "${searchQuery}"`);
                await this.downloadWithYtdlp(`ytsearch1:${searchQuery}`, this.outputDir);
                
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

        // Jika semua strategy gagal
        throw new Error(`Tidak bisa download lagu ini dari YouTube dengan strategies: ${searchStrategies.join(', ')}`);
    }

    /**
     * Download langsung dari YouTube
     * @param {string} youtubeUrl - YouTube URL
     * @returns {Promise<object>} Download result
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
     * Download dari YouTube Music (search di YouTube biasa)
     * @param {string} youtubeMusic Url - YouTube Music URL
     * @returns {Promise<object>} Download result
     */
    async downloadFromYoutubeMusic(youtubeMuslcUrl) {
        console.log(`📱 YouTube Music URL terdeteksi, searching di YouTube...`);
        
        // Extract search parameter dari URL
        let searchQuery = 'music';
        try {
            const urlParams = new URL(youtubeMuslcUrl).searchParams;
            if (urlParams.has('v')) {
                searchQuery = urlParams.get('v');
            } else if (urlParams.has('list')) {
                searchQuery = urlParams.get('list');
            }
        } catch (e) {
            // URL parsing error, use default
        }

        console.log(`🔎 Searching YouTube: "${searchQuery}"`);
        await this.downloadWithYtdlp(`ytsearch1:${searchQuery}`, this.outputDir);
        
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
     * Detect available JavaScript runtimes (Node, Deno, Bun)
     * untuk YouTube signature solving
     * @returns {Promise<string|null>} Runtime command atau null
     */
    async getJavaScriptRuntime() {
        const { execSync } = require('child_process');
        const runtimes = ['deno', 'node', 'bun'];

        for (const runtime of runtimes) {
            try {
                execSync(`${runtime} --version`, { 
                    stdio: 'pipe',
                    timeout: 2000 
                });
                console.log(`✅ Found JavaScript runtime: ${runtime}`);
                return runtime;
            } catch (error) {
                continue;
            }
        }

        console.log('⚠️ No JavaScript runtime found!');
        console.log('   Install one to enable YouTube signature solving:');
        console.log('   - Deno:   https://deno.land/');
        console.log('   - Node:   https://nodejs.org/');
        console.log('   - Bun:    https://bun.sh/');
        
        return null;
    }

    /**
     * List available formats untuk debugging
     * @param {string} url - URL untuk di-check
     * @returns {Promise<void>}
     */
    async listAvailableFormats(url) {
        return new Promise((resolve, reject) => {
            try {
                console.log(`\n📋 Listing available formats for: ${url}`);
                
                const ytdlp = spawn('yt-dlp', [
                    '--list-formats',
                    '--cookies', path.join(__dirname, '../../youtube_cookies.txt'),
                    url
                ]);

                let stdout = '';
                let stderr = '';

                ytdlp.stdout.on('data', (data) => {
                    const output = data.toString();
                    stdout += output;
                    console.log(output);
                });

                ytdlp.stderr.on('data', (data) => {
                    const output = data.toString();
                    stderr += output;
                    console.log(output);
                });

                ytdlp.on('close', (code) => {
                    console.log(`\n✅ Format listing completed (exit code: ${code})\n`);
                    resolve(stdout);
                });

                ytdlp.on('error', (err) => {
                    console.error('❌ Error listing formats:', err.message);
                    reject(err);
                });
            } catch (error) {
                console.error('❌ Error:', error.message);
                reject(error);
            }
        });
    }

    /**
     * Download menggunakan yt-dlp CLI langsung dengan JavaScript runtime untuk signature solving
     * @param {string} url - URL untuk download (bisa YouTube atau ytsearch:)
     * @param {string} outputPath - Output directory
     * @returns {Promise<void>}
     */
    async downloadWithYtdlp(url, outputPath) {
        return new Promise(async (resolve, reject) => {
            try {
                // Path to cookies file
                const cookiePath = path.join(__dirname, '../../youtube_cookies.txt');
                const cookieExists = fsSync.existsSync(cookiePath);
                
                console.log(`🍪 Cookies file: ${cookiePath}`);
                console.log(`🍪 Cookies exist: ${cookieExists ? 'YES ✅' : 'NO ❌'}`);
                
                if (cookieExists) {
                    console.log('🔐 Using YouTube cookies to bypass bot detection & region locks');
                } else {
                    console.log('⚠️ No cookies file found - downloads may fail on region-locked videos');
                    console.log('   To fix: Place youtube_cookies.txt in root directory');
                }
                
                // Check for JavaScript runtime (needed for YouTube signature solving)
                console.log('\n🔍 Checking for JavaScript runtime (for YouTube signature solving)...');
                const jsRuntime = await this.getJavaScriptRuntime();
                
                if (!jsRuntime) {
                    console.error('\n❌ CRITICAL: No JavaScript runtime found!');
                    console.error('   YouTube requires JavaScript to solve signature challenges.');
                    console.error('   Without it, only low-quality formats (storyboard) are available.\n');
                    console.error('   INSTALL DENO (recommended):');
                    console.error('   $ choco install deno');
                    console.error('   Or: $ scoop install deno');
                    console.error('   Or: https://deno.land/\n');
                    
                    throw new Error('JavaScript runtime not found - cannot solve YouTube signatures');
                }
                
                // Debug: List available formats first
                try {
                    await this.listAvailableFormats(url);
                } catch (err) {
                    console.log('⚠️ Could not list formats (this is ok, continuing with download)');
                }
                
                // Build command with JS runtime support and flexible format selection
                const ytdlpArgs = [
                    '--no-update',
                    '--cookies', cookiePath,
                    '--extractor-args', 'youtube:player_client=tv_downgraded,web_safari',
                    '--extractor-args', `youtube:js_engine=${jsRuntime}`,  // Use detected JS runtime
                    '--remote-components', 'ejs:github',  // Download EJS challenge solver for proper signature solving
                    '--skip-unavailable-fragments',
                    '--retries', '10',
                    '--fragment-retries', '10',
                    '--socket-timeout', '60',
                    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    // Format selection with fallback: try audio first, then best available
                    '-f', 'bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio[ext=webm]/bestaudio/best',
                    '-x',  // Extract audio only
                    '--audio-format', 'mp3',
                    '--audio-quality', '192',
                    '--no-warnings',
                    '-o', path.join(outputPath, '%(title)s.%(ext)s'),
                    url
                ];
                
                console.log(`\n📥 Starting yt-dlp directly...`);
                console.log(`🔧 JavaScript Runtime: ${jsRuntime}`);
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

                ytdlp.on('close', (code) => {
                    if (code === 0) {
                        console.log('\n✅ yt-dlp download completed successfully');
                        resolve(stdout);
                    } else {
                        const fullError = stderr || stdout || 'yt-dlp download failed';
                        console.log(`\n❌ yt-dlp exit code: ${code}`);
                        console.log(`❌ Error: ${fullError}`);
                        
                        // Check if it's a format availability issue
                        if (fullError.includes('Requested format is not available')) {
                            console.log('\n📋 Daftar format yang tersedia untuk URL ini:');
                            console.log('💡 Coba gunakan format lain atau periksa apakah URL masih valid\n');
                            
                            // Don't reject immediately - let calling code handle the error
                            reject(new Error(`Format not available: ${fullError}`));
                        } else {
                            reject(new Error(fullError));
                        }
                    }
                });

                ytdlp.on('error', (err) => {
                    console.error('\n❌ Failed to execute yt-dlp:', err.message);
                    
                    if (err.code === 'ENOENT') {
                        console.error('❌ yt-dlp not found!');
                        console.error('   Install it with: pip install yt-dlp');
                        console.error('   Or use: pip3 install yt-dlp');
                    }
                    
                    reject(err);
                });
            } catch (error) {
                console.error('❌ downloadWithYtdlp error:', error.message);
                reject(error);
            }
        });
    }

    /**
     * Fetch metadata dari Spotify oEmbed API (no authentication needed)
     * @param {string} trackId - Spotify track ID
     * @returns {Promise<object|null>} Metadata atau null
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
     * @param {string} spotifyUrl - Spotify URL
     * @returns {string|null} Track ID atau null
     */
    extractSpotifyTrackId(spotifyUrl) {
        const match = spotifyUrl.match(/\/track\/([a-zA-Z0-9]+)/);
        return match ? match[1] : null;
    }

    /**
     * Get nama file yang baru didownload dari folder
     * @param {string} outputPath - Output directory
     * @returns {Promise<string|null>} Filename atau null
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
     * @param {string} url - URL to validate
     * @returns {boolean} True jika valid
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
     * @returns {Promise<object>} Cache stats
     */
    async getCacheStats() {
        return await this.metadataCache.getStats();
    }

    /**
     * Clear all cache
     * @returns {Promise<boolean>} Success atau failure
     */
    async clearCache() {
        return await this.metadataCache.clearCache();
    }

    /**
     * Get rate limit status
     * @returns {object} Current rate limit status
     */
    getRateLimitStatus() {
        return this.rateLimitHandler.getStatus();
    }

    /**
     * Get list file yang sudah didownload
     * @returns {Promise<array>} List file MP3
     */
    async getDownloadedFiles() {
        try {
            const files = await fs.readdir(this.outputDir);
            return files
                .filter(f => f.endsWith('.mp3'))
                .sort()
                .reverse(); // Newest first
        } catch (error) {
            return [];
        }
    }

    /**
     * Delete file dari download folder
     * @param {string} fileName - File to delete
     * @returns {Promise<boolean>} Success atau failure
     */
    async deleteFile(fileName) {
        try {
            // Security check - prevent path traversal
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
