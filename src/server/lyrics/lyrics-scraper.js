/**
 * Lyrics Scraper Module
 * Fetch lyrics menggunakan Qwen AI via API baru
 * AI API: http://108.137.15.61:9000
 */

const AIAPILyricsFetcher = require('../ai/ai-api-lyrics-fetcher');

class LyricsScraper {
    constructor(aiApiUrl = 'http://108.137.15.61:9000') {
        this.fetcher = new AIAPILyricsFetcher(aiApiUrl);
    }

    /**
     * Search lyrics menggunakan AI API Fetcher
     */
    async searchLyrics(artist, title) {
        try {
            if (!artist || !title) {
                console.warn('⚠️ Artist and title are required');
                return null;
            }

            console.log(`🎵 Searching lyrics for: "${title}" by "${artist}"`);

            const result = await this.fetcher.searchLyrics(artist, title);
            
            if (result && result.segments && result.segments.length > 0) {
                console.log(`✅ Found lyrics from ${result.source} (${result.segments.length} segments)`);
                return result.segments;
            }

            console.warn('⚠️ Could not find lyrics');
            return null;

        } catch (error) {
            console.error('❌ Lyrics search error:', error.message);
            return null;
        }
    }

    /**
     * Search with fallback logic
     */
    async searchWithFallback(title, artist = '') {
        try {
            const result = await this.fetcher.searchLyrics(artist, title);
            
            if (result && result.segments && result.segments.length > 0) {
                return result.segments;
            }

            console.warn('⚠️ Could not find lyrics from AI API');
            return null;

        } catch (error) {
            console.error('❌ Search with fallback error:', error.message);
            return null;
        }
    }

    /**
     * Format segments untuk karaoke display
     */
    formatForDisplay(segments) {
        if (!segments || segments.length === 0) {
            return null;
        }

        return {
            text: segments.map(s => s.text).join('\n'),
            segments: segments,
            language: 'en',
            source: 'ai-api'
        };
    }
}

module.exports = LyricsScraper;
