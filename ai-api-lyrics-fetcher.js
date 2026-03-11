/**
 * AI API Lyrics Fetcher Module
 * Fetch lyrics menggunakan Qwen AI Model via AI API
 * AI API: http://16.79.192.14:5500
 */

const AIScraperClient = require('./AIAPI/client');
const fs = require('fs').promises;
const path = require('path');

class AIAPILyricsFetcher {
    constructor(aiApiUrl = 'http://16.79.192.14:5500') {
        this.client = new AIScraperClient(aiApiUrl);
        this.cacheDir = path.join(__dirname, 'lyrics_cache');
        this.initCache();
    }

    /**
     * Initialize cache directory
     */
    async initCache() {
        try {
            await fs.mkdir(this.cacheDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create cache directory:', error);
        }
    }

    /**
     * Generate cache key dari artist dan title
     */
    getCacheKey(artist, title) {
        return `${this.formatForUrl(artist)}_${this.formatForUrl(title)}`;
    }

    /**
     * Format text untuk URL/cache key
     */
    formatForUrl(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    /**
     * Get lyrics dari cache
     */
    async getFromCache(artist, title) {
        try {
            const key = this.getCacheKey(artist, title);
            const cachePath = path.join(this.cacheDir, `${key}.json`);
            
            await fs.access(cachePath);
            const data = await fs.readFile(cachePath, 'utf8');
            const cached = JSON.parse(data);
            
            // Check if cache still valid (24 hours)
            if (Date.now() - cached.cachedAt < 86400000) {
                console.log('📦 Lyrics loaded from cache');
                return cached.lyrics;
            }
        } catch (error) {
            // Cache miss atau expired
        }
        
        return null;
    }

    /**
     * Save lyrics ke cache
     */
    async saveToCache(artist, title, lyrics) {
        try {
            const key = this.getCacheKey(artist, title);
            const cachePath = path.join(this.cacheDir, `${key}.json`);
            
            const data = {
                artist,
                title,
                lyrics,
                cachedAt: Date.now()
            };
            
            await fs.writeFile(cachePath, JSON.stringify(data, null, 2));
            console.log('💾 Lyrics saved to cache');
        } catch (error) {
            console.warn('Failed to save cache:', error);
        }
    }

    /**
     * Parse lyrics text menjadi segments dengan timestamps
     * Format: [MM:SS] text atau [HH:MM:SS] text
     */
    parseSegments(lyricsText) {
        if (!lyricsText) return [];

        const lines = lyricsText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        const segments = [];
        let timeCounter = 0;

        lines.forEach((line) => {
            // Parse timestamp if exists [MM:SS] atau [HH:MM:SS]
            const timestampMatch = line.match(/^\[(\d+):(\d+)(?::(\d+))?\]\s*(.*)/);
            
            let text = line;
            let startTime = timeCounter;

            if (timestampMatch) {
                // Format: [MM:SS] atau [HH:MM:SS]
                const minutes = parseInt(timestampMatch[1]);
                const seconds = parseInt(timestampMatch[2]);
                const milliseconds = timestampMatch[3] ? parseInt(timestampMatch[3]) : 0;
                
                startTime = minutes * 60 + seconds + milliseconds / 1000;
                text = timestampMatch[4] || line;
            }

            // Skip if text is very short atau looks like navigation
            if (text.length < 2 || text.match(/^[A-Z]$/)) {
                return;
            }

            segments.push({
                text: text,
                start: startTime,
                end: startTime + 3 // Default 3 seconds per line
            });

            timeCounter = startTime + 3;
        });

        // Update end times based on next segment start time
        for (let i = 0; i < segments.length - 1; i++) {
            segments[i].end = segments[i + 1].start;
        }

        // Validate timestamps are reasonable
        if (segments.length > 0) {
            const lastTimestamp = segments[segments.length - 1].start;
            const avgInterval = lastTimestamp / segments.length;
            
            // Check if timestamps look suspicious
            const isAnyGap = segments.some((seg, idx) => {
                if (idx === 0) return false;
                const gap = seg.start - segments[idx - 1].start;
                return gap < 0.5 || gap > 30; // Weird gaps (too small or too large)
            });
            
            if (lastTimestamp > 600 || isAnyGap) {
                console.warn('⚠️ Timestamps validation failed - looks suspicious');
                console.warn(`   Last timestamp: ${lastTimestamp}s, Avg interval: ${avgInterval.toFixed(2)}s`);
                return []; // Return empty segments if validation fails
            }
        }

        return segments;
    }

    /**
     * Search lyrics menggunakan Qwen (Primary method)
     */
    async searchLyricsWithQwen(artist, title) {
        try {
            console.log(`🤖 Searching lyrics with Qwen: "${title}" by "${artist}"`);

            const prompt = `gua lagi bingung banget nihh sama lirik lagu  "${title}" dari "${artist}".lu bisa gak si cariin lirik lengkap nya? oh iya sama kasih format kayak menit atau detik gitu tiap lirik nya biar gua gak tambah bingung.oh iya inget ya kalo lu gak nemu format kayak menit atau detik gitu lu bisa kok buat sendiri sesuai sama logika lagu nya, cara perhitungan nya lu liat dulu seberapa lama lagu nya nah abis itu lu bisa buat deh.PERATURAN:- Exact lyrics only dont gave any word!- Timestamps [MM:SS] format- If lyrics not found, respond: "NO_LYRICS_FOUND" dont gave any word!`;

            const response = await this.client.queryQwen(prompt, 'new');

            if (!response.success || !response.result) {
                console.warn('⚠️ Qwen API failed:', response.error);
                return null;
            }

            const lyrics = response.result.trim();

            // Check if lyrics were found
            if (lyrics.includes('NO_LYRICS_FOUND') || lyrics.length < 50) {
                console.warn('⚠️ Qwen could not find lyrics');
                return null;
            }

            console.log('✅ Lyrics found with Qwen');
            return lyrics;

        } catch (error) {
            console.error('❌ Qwen search error:', error.message);
            return null;
        }
    }

    /**
     * Main search method - QWEN ONLY
     * 1. Check cache first
     * 2. Search with Qwen only (no OpenAI fallback)
     */
    async searchLyrics(artist, title) {
        try {
            if (!artist || !title) {
                console.warn('⚠️ Artist and title are required');
                return null;
            }

            // Normalize input
            artist = artist.trim();
            title = title.trim();
            
            console.log(`🎵 Searching lyrics for: "${title}" by "${artist}"`);

            // Check cache first
            const cached = await this.getFromCache(artist, title);
            if (cached) {
                console.log('📦 Lyrics loaded from cache');
                return cached;
            }

            // Search with Qwen (Only method)
            console.log('🤖 Querying Qwen AI for lyrics...');
            
            const prompt = `gua lagi bingung banget nihh sama lirik lagu  "${title}" dari "${artist}".lu bisa gak si cariin lirik lengkap nya? oh iya sama kasih format kayak menit atau detik gitu tiap lirik nya biar gua gak tambah bingung.oh iya inget ya kalo lu gak nemu format kayak menit atau detik gitu lu bisa kok buat sendiri sesuai sama logika lagu nya, cara perhitungan nya lu liat dulu seberapa lama lagu nya nah abis itu lu bisa buat deh.PERATURAN:1.Exact lyrics only dont gave any word!2.Timestamps [MM:SS] format3.If lyrics not found, respond: "NO_LYRICS_FOUND" dont gave any word!`;

            try {
                console.log(`Fetching lyrics for "${title}" by "${artist}"...`);
                
                // Create timeout (3 minutes)
                const attemptTimeoutMs = 180000;
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => {
                        reject(new Error(`Request timeout after ${attemptTimeoutMs/1000}s`));
                    }, attemptTimeoutMs);
                });
                
                const responsePromise = this.client.queryQwen(prompt, 'new');
                const response = await Promise.race([responsePromise, timeoutPromise]);
                
                if (!response || !response.success) {
                    console.warn(`⚠️ Qwen API failed: ${response?.error || 'Unknown error'}`);
                    return null;
                }

                // Extract lyrics from response - try multiple possible field locations
                let result = response.output || response.result?.output || response.result;
                
                // If result is an object with output field, extract it
                if (result && typeof result === 'object' && result.output) {
                    result = result.output;
                }
                
                if (!result || typeof result !== 'string') {
                    console.warn('⚠️ Invalid response format - no output field found');
                    console.warn('Response structure:', {
                        keys: Object.keys(response),
                        success: response?.success,
                        hasOutput: 'output' in response,
                        hasResult: 'result' in response,
                        resultType: typeof response?.result
                    });
                    return null;
                }
                
                result = result.trim();
                
                if (!result || result.includes('NO_LYRICS_FOUND')) {
                    console.warn(`⚠️ Lyrics not found for "${title}" by "${artist}"`);
                    return null;
                }

                // Validate lyrics length - must have at least 50 chars
                if (result.length < 50) {
                    console.warn('⚠️ Response too short, might be invalid (length:', result.length + ')');
                    return null;
                }

                console.log('✅ Lyrics found with Qwen (length:', result.length + ' chars)');
                
                // Save to cache
                await this.saveToCache(artist, title, result);
                
                return result;

            } catch (error) {
                console.error(`❌ Qwen request failed:`, error.message);
                return null;
            }

        } catch (error) {
            console.error('❌ Lyrics search error:', error.message);
            return null;
        }
    }

    /**
     * Format segments untuk display di karaoke
     */
    formatForDisplay(data) {
        if (!data) return null;

        return {
            text: data.segments.map(s => s.text).join('\n'),
            segments: data.segments,
            source: data.source,
            cached: data.cached
        };
    }

    /**
     * Search with fallback logic
     */
    async searchWithFallback(title, artist = '') {
        // Try to search lyrics
        const result = await this.searchLyrics(artist, title);
        
        if (result && result.segments.length > 0) {
            return result;
        }

        console.warn('⚠️ Could not find lyrics from AI API');
        return null;
    }
}

module.exports = AIAPILyricsFetcher;
