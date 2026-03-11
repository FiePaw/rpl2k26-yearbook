/**
 * Lyrics Synchronized Fetcher Module (AI API Version)
 * Fetch synchronized lyrics dengan timestamps menggunakan AI API
 * Menggantikan LRCLIB dengan AI API (Qwen + OpenAI)
 */

const AIAPILyricsFetcher = require('./ai-api-lyrics-fetcher');

class LRCLIBFetcher {
    constructor(aiApiUrl = 'http://16.79.192.14:5500') {
        this.fetcher = new AIAPILyricsFetcher(aiApiUrl);
    }

    /**
     * Format artist dan title untuk search
     */
    formatForSearch(text) {
        return text
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ');
    }

    /**
     * Parse LRC format lyrics ke segments dengan timestamps
     * Format: [00:12.34] lyric text
     */
    parseLRCFormat(lrcText) {
        if (!lrcText || typeof lrcText !== 'string') {
            console.warn('Invalid LRC text');
            return [];
        }

        const segments = [];
        const lines = lrcText.split('\n');

        lines.forEach((line) => {
            // Match [mm:ss.xx] format
            const match = line.match(/\[(\d+):(\d+(?:\.\d+)?)\](.*)/);
            
            if (match) {
                const minutes = parseInt(match[1]);
                const seconds = parseFloat(match[2]);
                const text = match[3].trim();

                if (text) {
                    const startTime = minutes * 60 + seconds;
                    
                    // Calculate end time from next lyric atau fallback
                    segments.push({
                        text: text,
                        start: startTime,
                        end: startTime + 3 // Default 3 seconds, will be updated
                    });
                }
            }
        });

        // Update end times based on next segment start time
        for (let i = 0; i < segments.length - 1; i++) {
            segments[i].end = segments[i + 1].start;
        }

        // Last segment: use a reasonable duration
        if (segments.length > 0) {
            const lastSegment = segments[segments.length - 1];
            lastSegment.end = lastSegment.start + 3;
        }

        return segments;
    }

    /**
     * Search lyrics dari AI API dengan synced format
     * @param {string} title - Song title
     * @param {string} artist - Artist name
     * @returns {Promise<Object>} - Lyrics data dengan segments
     */
    async searchLyrics(title, artist = '') {
        try {
            if (!title) {
                console.warn('⚠️ Title is required');
                return null;
            }

            const formattedTitle = this.formatForSearch(title);
            const formattedArtist = artist ? this.formatForSearch(artist) : '';

            console.log(`🎵 Searching synchronized lyrics for: "${formattedTitle}" by "${formattedArtist}"`);

            const result = await this.fetcher.searchLyrics(formattedArtist, formattedTitle);

            if (!result || !result.segments || result.segments.length === 0) {
                console.log('⚠️ No lyrics found on AI API');
                return null;
            }

            console.log('✅ Found match from AI API');

            return {
                title: title,
                artist: artist || 'Unknown',
                lyrics: result.lyrics,
                segments: result.segments,
                source: 'ai-api',
                language: 'en',
                duration: null
            };

        } catch (error) {
            console.error('❌ AI API search error:', error);
            return null;
        }
    }

    /**
     * Get featured lyrics by ID (placeholder - AI API returns all info at once)
     */
    async getLyricsById(trackId, matchData) {
        // In AI API, we get everything at once, no need for separate ID lookup
        return matchData;
    }

    /**
     * Parse plain text lyrics ke segments (fallback)
     * Split by line dan assign timestamps
     */
    parseSimpleFormat(plainText) {
        if (!plainText) return [];

        const lines = plainText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        const segments = [];
        let currentTime = 0;
        const avgTimePerLine = 3; // 3 seconds per line

        lines.forEach((text) => {
            segments.push({
                text: text,
                start: currentTime,
                end: currentTime + avgTimePerLine
            });
            currentTime += avgTimePerLine;
        });

        return segments;
    }

    /**
     * Search dengan multiple attempts
     * Coba artist + title, title only, dll
     */
    async searchWithFallback(title, artist = '') {
        // Attempt 1: Artist + Title
        if (artist) {
            const result = await this.searchLyrics(title, artist);
            if (result && result.segments.length > 0) {
                return result;
            }
        }

        // Attempt 2: Title only
        const result = await this.searchLyrics(title);
        if (result && result.segments.length > 0) {
            return result;
        }

        console.warn('⚠️ Could not find synchronized lyrics');
        return null;
    }

    /**
     * Format untuk display di karaoke
     */
    formatForDisplay(lyricsData) {
        if (!lyricsData) return null;

        return {
            text: lyricsData.segments.map(s => s.text).join('\n'),
            segments: lyricsData.segments,
            title: lyricsData.title,
            artist: lyricsData.artist,
            language: lyricsData.language || 'en',
            source: lyricsData.source,
            duration: lyricsData.duration
        };
    }
}

// Export untuk Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LRCLIBFetcher;
}

// Export untuk browser
if (typeof window !== 'undefined') {
    window.LRCLIBFetcher = LRCLIBFetcher;
}
