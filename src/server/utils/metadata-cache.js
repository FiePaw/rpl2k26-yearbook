/**
 * Metadata Cache Module
 * Caches Spotify metadata untuk mengurangi API calls
 * 
 * Setiap track ID di-cache untuk 30 hari
 * Menghilangkan kebutuhan fetch metadata berkali-kali untuk lagu yang sama
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

class MetadataCache {
    constructor(cacheDir = 'metadata_cache') {
        this.cacheDir = cacheDir;
        this.ensureCacheDir();
    }

    /**
     * Pastikan cache directory ada
     */
    ensureCacheDir() {
        if (!fsSync.existsSync(this.cacheDir)) {
            fsSync.mkdirSync(this.cacheDir, { recursive: true });
        }
    }

    /**
     * Generate cache key dari Spotify URL atau Track ID
     * @param {string} spotifyUrl - Spotify URL atau Track ID
     * @returns {string|null} Cache filename atau null jika invalid
     */
    getCacheKey(spotifyUrl) {
        // Extract track ID: https://open.spotify.com/track/[ID]
        // atau direct track ID: 2TRGNVokPnC2a2oHg5iv1H
        let trackId = spotifyUrl;
        
        const match = spotifyUrl.match(/\/track\/([a-zA-Z0-9]+)/);
        if (match) {
            trackId = match[1];
        }
        
        if (!trackId || trackId.length < 10) {
            return null;
        }
        
        return `track_${trackId}.json`;
    }

    /**
     * Ambil metadata dari cache (jika ada dan masih fresh)
     * @param {string} spotifyUrl - Spotify URL atau Track ID
     * @returns {Promise<object|null>} Cached metadata atau null
     */
    async getCached(spotifyUrl) {
        const key = this.getCacheKey(spotifyUrl);
        if (!key) return null;

        const cachePath = path.join(this.cacheDir, key);
        try {
            const data = await fs.readFile(cachePath, 'utf-8');
            const cached = JSON.parse(data);
            
            // Check if cache is fresh (not older than 30 days)
            const cacheAge = Date.now() - cached.timestamp;
            const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
            
            if (cacheAge < maxAge) {
                console.log(`✓ Cache HIT untuk: ${spotifyUrl}`);
                console.log(`  Metadata: ${cached.data.title} (cached ${Math.floor(cacheAge / 1000 / 60)} menit lalu)`);
                return cached.data;
            } else {
                // Cache expired, delete it
                await fs.unlink(cachePath).catch(() => {});
                console.log(`⏱️ Cache expired untuk: ${spotifyUrl}`);
            }
        } catch (error) {
            // Cache doesn't exist atau error reading, ignore
            if (error.code !== 'ENOENT') {
                console.log(`Cache read error: ${error.message}`);
            }
        }
        
        return null;
    }

    /**
     * Simpan metadata ke cache
     * @param {string} spotifyUrl - Spotify URL atau Track ID
     * @param {object} metadata - Metadata object to cache
     * @returns {Promise<boolean>} Success atau failure
     */
    async cache(spotifyUrl, metadata) {
        const key = this.getCacheKey(spotifyUrl);
        if (!key) return false;

        const cachePath = path.join(this.cacheDir, key);
        try {
            const cacheEntry = {
                spotifyUrl: spotifyUrl,
                timestamp: Date.now(),
                data: metadata
            };
            await fs.writeFile(cachePath, JSON.stringify(cacheEntry, null, 2));
            console.log(`✓ Cache SAVE untuk: ${spotifyUrl}`);
            return true;
        } catch (error) {
            console.error(`Cache write error: ${error.message}`);
            return false;
        }
    }

    /**
     * Get cache statistics
     * @returns {Promise<object>} Cache stats
     */
    async getStats() {
        try {
            const files = await fs.readdir(this.cacheDir);
            const cacheFiles = files.filter(f => f.endsWith('.json'));
            
            // Calculate total size
            let totalSize = 0;
            for (const file of cacheFiles) {
                try {
                    const stat = await fs.stat(path.join(this.cacheDir, file));
                    totalSize += stat.size;
                } catch (e) {
                    // ignore
                }
            }

            return {
                totalTracks: cacheFiles.length,
                cacheDir: this.cacheDir,
                totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
                cacheFiles: cacheFiles
            };
        } catch (error) {
            return { 
                totalTracks: 0,
                cacheDir: this.cacheDir,
                totalSizeMB: 0,
                error: error.message
            };
        }
    }

    /**
     * Clear all cache files
     * @returns {Promise<boolean>} Success atau failure
     */
    async clearCache() {
        try {
            const files = await fs.readdir(this.cacheDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    await fs.unlink(path.join(this.cacheDir, file));
                }
            }
            console.log(`✓ Cache cleared (${files.length} files deleted)`);
            return true;
        } catch (error) {
            console.error(`Cache clear error: ${error.message}`);
            return false;
        }
    }

    /**
     * Get cached metadata for a specific track (without fetching)
     * @param {string} spotifyUrl - Spotify URL atau Track ID
     * @returns {Promise<object|null>} Cached entry atau null
     */
    async getCacheEntry(spotifyUrl) {
        const key = this.getCacheKey(spotifyUrl);
        if (!key) return null;

        const cachePath = path.join(this.cacheDir, key);
        try {
            const data = await fs.readFile(cachePath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            return null;
        }
    }
}

module.exports = MetadataCache;
