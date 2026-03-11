/**
 * Lyrics Fetcher Module
 * Fetch lyrics menggunakan AI API dengan Qwen (Primary) dan OpenAI (Secondary)
 * AI API: http://16.79.192.14:5500
 */

const AIAPILyricsFetcher = require('./ai-api-lyrics-fetcher');

class LyricsFetcher {
    constructor(aiApiUrl = 'http://16.79.192.14:5500') {
        this.fetcher = new AIAPILyricsFetcher(aiApiUrl);
    }

    /**
     * Search lyrics berdasarkan artist dan song title
     */
    async searchLyricsByTitle(songTitle, artistName = '') {
        try {
            if (!songTitle) {
                console.warn('⚠️ Song title is required');
                return null;
            }

            console.log(`🎵 Searching lyrics for: "${songTitle}" by "${artistName}"`);

            const result = await this.fetcher.searchLyrics(artistName, songTitle);
            
            if (result && result.segments && result.segments.length > 0) {
                return {
                    title: songTitle,
                    artist: artistName,
                    lyrics: result.lyrics,
                    segments: result.segments,
                    source: result.source
                };
            }

            return null;

        } catch (error) {
            console.error('Error searching lyrics:', error);
            return null;
        }
    }

    /**
     * Parse lyrics text menjadi segments dengan timestamps
     * Simple line-based parsing
     */
    parseSegments(lyricsText) {
        if (!lyricsText) return [];

        const lines = lyricsText.split('\n').filter(line => line.trim());
        const segments = [];
        let timeCounter = 0;

        lines.forEach((line, idx) => {
            // Skip timestamps atau note dalam bracket
            if (line.includes('[') && line.includes(']')) {
                return;
            }

            segments.push({
                text: line.trim(),
                start: timeCounter,
                end: timeCounter + 3 // Assume 3 seconds per line (rough estimate)
            });

            timeCounter += 3;
        });

        return segments;
    }

    /**
     * Format lyrics untuk display karaoke
     */
    formatForKaraoke(lyrics) {
        const segments = Array.isArray(lyrics) 
            ? lyrics 
            : this.parseSegments(lyrics);

        return {
            text: segments.map(s => s.text).join(' '),
            segments: segments,
            language: 'id',
            source: 'ai-api'
        };
    }

    /**
     * Try multiple sources untuk get lyrics
     */
    async fetchBestLyrics(songTitle, artistName = '', transcriptionFallback = null) {
        console.log('🎵 Searching lyrics for:', { songTitle, artistName });

        // Try 1: Search via AI API
        const dbResult = await this.searchLyricsByTitle(songTitle, artistName);
        if (dbResult && dbResult.lyrics) {
            console.log('✅ Found lyrics from AI API');
            return {
                success: true,
                source: 'ai-api',
                data: dbResult
            };
        }

        // Try 2: Use transcription fallback
        if (transcriptionFallback) {
            console.log('ℹ️ Using transcription from audio');
            return {
                success: true,
                source: 'transcription',
                data: transcriptionFallback
            };
        }

        // Fallback: Return null
        console.warn('⚠️ Could not find lyrics from any source');
        return {
            success: false,
            message: 'No lyrics found. Please try again or use audio transcription.'
        };
    }
}

// Export untuk digunakan di browser
if (typeof window !== 'undefined') {
    window.LyricsFetcher = LyricsFetcher;
}

module.exports = LyricsFetcher;
