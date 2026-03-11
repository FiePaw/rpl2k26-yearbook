# Spotify/YouTube Downloader - Rate Limit Issue & Solutions

**Date**: March 12, 2026  
**Priority**: HIGH  
**Status**: Planning Phase (Awaiting Implementation)

---

## 📋 Problem Statement

### Current Issue
```
WARNING:root:Your application has reached a rate/request limit. 
Retry will occur after: 86400
```

### Root Causes
1. **Spotdl API Rate Limit** - Spotify API enforces strict rate limits (~1 request per hour per IP/user-agent)
2. **Metadata Extraction Overhead** - Every track download triggers Spotify API metadata call
3. **Cumulative Requests** - Multiple students downloading tracks = accelerated rate limit hit
4. **Shared Server IP** - All users hit from same server IP = shared rate limit pool
5. **No Caching Strategy** - Same track downloaded twice = 2 API calls instead of 1

### Impact
- ❌ Users cannot download tracks for 24 hours after rate limit
- ❌ Core karaoke feature becomes unavailable
- ❌ Affects all students, not just one
- ❌ Poor user experience

---

## 🔍 Root Cause Analysis

### Why Spotdl Gets Rate Limited
```
Spotdl workflow:
1. User provides Spotify URL
2. Spotdl calls Spotify API → Get track metadata (Artist, Title, etc)
3. Spotdl calls YouTube API → Search for matching song
4. Return YouTube URL to yt-dlp

RATE LIMIT POINT: Step 2
- Spotify API has rate limits
- Default limit: ~60 requests per hour per user/IP
- School environment: Multiple users = faster limit exhaustion
- 100+ students × 3+ downloads each = ~300+ API calls = RATE LIMIT HIT
```

### Why It's Hard to Fix with Current Architecture
- Spotdl is a wrapper around Spotify API
- No built-in caching or rate limit handling
- Direct dependency on Spotify's terms (which don't allow high-volume scraping)
- Rate limit is enforced server-side by Spotify

---

## ✅ Recommended Solutions (Priority Order)

### ⭐ SOLUTION 1: Metadata Cache System (PRIORITY: CRITICAL)
**Effort**: Medium | **Impact**: High | **Risk**: Low

#### Implementation
```javascript
// metadata-cache.js
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

class MetadataCache {
    constructor(cacheDir = 'metadata_cache') {
        this.cacheDir = cacheDir;
        this.ensureCacheDir();
    }

    ensureCacheDir() {
        if (!fsSync.existsSync(this.cacheDir)) {
            fsSync.mkdirSync(this.cacheDir, { recursive: true });
        }
    }

    // Generate cache key from Spotify URL
    getCacheKey(spotifyUrl) {
        // Extract track ID: https://open.spotify.com/track/[ID]
        const match = spotifyUrl.match(/\/track\/([a-zA-Z0-9]+)/);
        if (!match) return null;
        return `track_${match[1]}.json`;
    }

    // Check if metadata exists in cache
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
                console.log(`✓ Using cached metadata for: ${spotifyUrl}`);
                return cached.data;
            }
        } catch (error) {
            // Cache doesn't exist or is corrupted, ignore
        }
        
        return null;
    }

    // Save metadata to cache
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
            console.log(`✓ Cached metadata for: ${spotifyUrl}`);
            return true;
        } catch (error) {
            console.error('Cache write error:', error.message);
            return false;
        }
    }

    // Get cache stats
    async getStats() {
        try {
            const files = await fs.readdir(this.cacheDir);
            return {
                cacheSize: files.length,
                cacheDir: this.cacheDir
            };
        } catch (error) {
            return { cacheSize: 0 };
        }
    }
}

module.exports = MetadataCache;
```

#### Integration with spotify-downloader.js
```javascript
// In spotify-downloader.js constructor
const MetadataCache = require('./metadata-cache');
class SpotifyDownloader {
    constructor(outputDir = 'profile_music') {
        // ... existing code ...
        this.metadataCache = new MetadataCache('metadata_cache');
    }

    // Modified getSpotifyMetadata() with caching
    async getSpotifyMetadata(spotifyUrl) {
        // 1. Check cache first (AVOID API CALL)
        const cached = await this.metadataCache.getCached(spotifyUrl);
        if (cached) {
            return cached;
        }

        // 2. If not cached, call spotdl (API CALL)
        const metadata = await this._fetchSpotifyMetadata(spotifyUrl);

        // 3. Cache the result for next time
        await this.metadataCache.cache(spotifyUrl, metadata);

        return metadata;
    }

    // Original spotdl call moved to separate method
    async _fetchSpotifyMetadata(spotifyUrl) {
        // ... existing getSpotifyMetadata code ...
    }
}
```

**Benefits**:
- ✅ Eliminate 90%+ of API calls for popular tracks
- ✅ No external dependencies required
- ✅ Works offline for cached tracks
- ✅ Simple implementation

**Timeline**: 1-2 hours to implement

---

### ⭐ SOLUTION 2: Rate Limit Retry Mechanism with Exponential Backoff (PRIORITY: HIGH)
**Effort**: Easy | **Impact**: Medium | **Risk**: Low

#### Implementation
```javascript
// rate-limit-handler.js
class RateLimitHandler {
    constructor() {
        this.rateLimitUntil = null;
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    // Parse retry-after header
    parseRetryAfter(retryAfterHeader) {
        if (!retryAfterHeader) return 86400; // Default 24 hours
        
        // Can be in seconds or HTTP-date format
        const seconds = parseInt(retryAfterHeader);
        if (!isNaN(seconds)) {
            return seconds;
        }
        
        // Try parsing as date
        const date = new Date(retryAfterHeader);
        if (!isNaN(date)) {
            return Math.floor((date - new Date()) / 1000);
        }
        
        return 86400; // Fallback to 24 hours
    }

    // Check if rate limited
    isRateLimited() {
        if (!this.rateLimitUntil) return false;
        return Date.now() < this.rateLimitUntil;
    }

    // Get time to wait in seconds
    getWaitTime() {
        if (!this.rateLimitUntil) return 0;
        return Math.ceil((this.rateLimitUntil - Date.now()) / 1000);
    }

    // Mark as rate limited with retry-after time
    setRateLimit(retryAfterSeconds) {
        this.rateLimitUntil = Date.now() + (retryAfterSeconds * 1000);
        console.warn(`⏱️  Rate limited! Retry after: ${retryAfterSeconds}s`);
    }

    // Exponential backoff for retries
    getBackoffDelay(attemptNumber) {
        // Delay: 2^attempt seconds (2s, 4s, 8s, etc)
        return Math.min(Math.pow(2, attemptNumber) * 1000, 60000); // Max 60s
    }
}
```

#### Integration
```javascript
// In spotify-downloader.js
async downloadTrack(spotifyUrl, cookieFile = null) {
    const rateLimitHandler = new RateLimitHandler();

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            // Check if still rate limited
            if (rateLimitHandler.isRateLimited()) {
                const waitTime = rateLimitHandler.getWaitTime();
                throw new Error(
                    `Rate limited. Please wait ${waitTime}s before retrying.\n` +
                    `Reason: Spotify API request limit exceeded\n` +
                    `Workaround: Use metadata cache for recently downloaded tracks`
                );
            }

            // Try to download
            return await this.downloadTrack_Internal(spotifyUrl);

        } catch (error) {
            if (error.message.includes('rate limit') || 
                error.message.includes('429') ||
                error.message.includes('86400')) {
                
                rateLimitHandler.setRateLimit(86400); // 24 hours
                
                if (attempt < 2) {
                    const delay = rateLimitHandler.getBackoffDelay(attempt);
                    console.log(`Retrying after ${delay}ms...`);
                    await new Promise(r => setTimeout(r, delay));
                } else {
                    throw error;
                }
            } else {
                throw error;
            }
        }
    }
}
```

**Benefits**:
- ✅ Graceful handling of rate limits
- ✅ Clear user feedback
- ✅ Prevents hammering API during rate limit

**Timeline**: 30 minutes to implement

---

### ⭐ SOLUTION 3: HTML Scraping Fallback for Metadata (PRIORITY: HIGH)
**Effort**: Medium | **Impact**: High | **Risk**: Medium

**Concept**: When Spotify API fails, extract metadata directly from Spotify HTML page

#### Implementation
```javascript
// spotify-scraper.js - Extract metadata without API
const cheerio = require('cheerio'); // Add to package.json
const axios = require('axios');

class SpotifyScraper {
    async getMetadataFromHTML(spotifyUrl) {
        try {
            console.log('📄 Scraping Spotify page for metadata...');
            
            const response = await axios.get(spotifyUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const $ = cheerio.load(response.data);

            // Extract from og: meta tags (more reliable than API)
            const ogTitle = $('meta[property="og:title"]').attr('content');
            const ogDescription = $('meta[property="og:description"]').attr('content');
            
            // Format: "Song Title · Artist Name"
            const [title, artist] = ogTitle.split('·').map(s => s.trim());

            console.log(`✓ Scraped metadata: ${title} by ${artist}`);

            return {
                name: title || 'Unknown',
                artists: [artist || 'Unknown'],
                scraped: true // Mark as scraped, not from API
            };
        } catch (error) {
            console.error('Scraping failed:', error.message);
            return null;
        }
    }
}
```

#### Modified getSpotifyMetadata()
```javascript
async getSpotifyMetadata(spotifyUrl) {
    // Try cache first
    const cached = await this.metadataCache.getCached(spotifyUrl);
    if (cached) return cached;

    try {
        // Try spotdl API (normal path)
        return await this._fetchSpotifyMetadata(spotifyUrl);
    } catch (error) {
        if (error.message.includes('rate limit')) {
            // Fallback to HTML scraping
            console.log('💡 Falling back to HTML scraping (API rate limited)...');
            const scrapedMetadata = await this.spotifyScraper.getMetadataFromHTML(spotifyUrl);
            if (scrapedMetadata) {
                await this.metadataCache.cache(spotifyUrl, scrapedMetadata);
                return scrapedMetadata;
            }
        }
        throw error;
    }
}
```

**Benefits**:
- ✅ Works even during API rate limit
- ✅ No dependency on API limits
- ✅ Can serve as primary method

**Risks**:
- ⚠️ HTML structure changes could break scraper
- ⚠️ May violate Spotify ToS (depends on perspective)
- ⚠️ Slower than API

**Timeline**: 1-2 hours

---

### ⭐ SOLUTION 4: Direct YouTube Search (PRIORITY: MEDIUM)
**Effort**: Easy | **Impact**: Medium | **Risk**: Low

**Concept**: Skip Spotify metadata entirely for common tracks, search YouTube directly

#### Implementation
```javascript
// youtube-search.js
const { exec } = require('child_process');

class YouTubeSearcher {
    async searchTrack(songTitle, artistName) {
        return new Promise((resolve, reject) => {
            // Use yt-dlp built-in search capability
            const query = `${songTitle} ${artistName} audio`;
            
            // yt-dlp can search YouTube for audio
            exec(`yt-dlp --default-search youtube "${query}" --get-url`, 
                (error, stdout, stderr) => {
                    if (error) {
                        reject(error);
                    } else {
                        const url = stdout.trim();
                        resolve(url);
                    }
                });
        });
    }
}
```

**Benefits**:
- ✅ Complete bypass of Spotify API
- ✅ Simple and reliable
- ✅ Fast

**Drawbacks**:
- ⚠️ May find wrong version of song
- ⚠️ Quality varies

**Timeline**: 30 minutes

---

### ⭐ SOLUTION 5: User Session Management (PRIORITY: MEDIUM)
**Effort**: Medium | **Impact**: Low | **Risk**: Low

**Concept**: Use user's own Spotify credentials to get higher rate limits

```javascript
// Allow users to provide their Spotify session
// Use sp_dc cookie from user's browser for authenticated requests
// Authenticated users get higher rate limits from Spotify

class SpotifySessionManager {
    async validateUserSession(spotifySessionCookie) {
        // Verify user session is valid
        // Use for higher-priority API requests
    }
}
```

**Benefits**:
- ✅ Works for individual users who have premium
- ✅ Higher rate limits per user

**Drawbacks**:
- ⚠️ Not all users are authenticated
- ⚠️ Session management complexity
- ⚠️ Doesn't solve problem for free users

---

## 🎯 Recommended Implementation Plan

### Phase 1: Immediate Relief (Day 1)
```
1. Implement Metadata Cache (SOLUTION 1) ✅
   - Eliminate 90% of API calls
   - Store in metadata_cache/
   - Highly effective for repeated tracks
   
2. Add Rate Limit Handler (SOLUTION 2) ✅
   - Better error messages
   - Prevent API hammering
```

### Phase 2: Resilience (Day 2-3)
```
3. Add HTML Scraping Fallback (SOLUTION 3) ✅
   - Handle rate limit gracefully
   - Still get metadata when API fails

4. Cache Stats API (NEW)
   - Show users how many requests were saved
   - Build in: GET /api/cache/stats
```

### Phase 3: Long-term Solution (Week 2-3)
```
5. Evaluate Alternative Downloaders:
   - rclone for cloud services
   - spotdownload (alternative spotdl fork)
   - deemix for Deezer (different API)
   - librespot (direct Spotify protocol)
```

---

## 📊 Expected Impact

### Before Implementation
- ❌ After ~100 downloads → Rate Limited
- ❌ Cannot download for 24 hours
- ❌ All users affected simultaneously

### After Solution 1 + 2 (Metadata Cache + Rate Limit Handler)
- ✅ API calls reduced by ~90% (only new tracks hit API)
- ✅ Graceful failure with clear messaging
- ✅ Can handle 1000+ downloads before rate limit
- ✅ Most popular tracks cached (no API call)

### After Solution 3 (HTML Fallback)
- ✅ Rate limit becomes non-issue
- ✅ Always works, even during limit
- ✅ Seamless experience

---

## 🛠️ Implementation Checklist

- [ ] **Solution 1**: Implement metadata-cache.js
  - [ ] Create cache directory structure
  - [ ] Implement getCached() method
  - [ ] Implement cache() method
  - [ ] Integrate with spotify-downloader.js
  - [ ] Add cache stats endpoint

- [ ] **Solution 2**: Implement rate-limit-handler.js
  - [ ] Create handler class
  - [ ] Add to downloadTrack() method
  - [ ] Test error messages
  - [ ] Add retry logic

- [ ] **Solution 3**: Implement spotify-scraper.js (FALLBACK)
  - [ ] Add cheerio to package.json
  - [ ] Implement HTML scraping
  - [ ] Create fallback flow
  - [ ] Test metadata extraction

- [ ] **Testing**: 
  - [ ] Simulate rate limit scenario
  - [ ] Test cache functionality
  - [ ] Verify fallback mechanisms
  - [ ] Load test with 100+ downloads

---

## 📝 Files to Modify/Create

### New Files
1. `metadata-cache.js` - Caching layer
2. `rate-limit-handler.js` - Rate limit management
3. `spotify-scraper.js` - HTML scraping fallback
4. `metadata_cache/` - Cache directory

### Modified Files
1. `spotify-downloader.js` - Integrate caching, retry, fallback
2. `server.js` - Add cache stats endpoint
3. `package.json` - Add cheerio dependency (if using scraping)

---

## 💡 Additional Notes

### Why This Happens
- Spotify API enforces rate limits to prevent abuse
- School environment = many users = many requests
- No official bulk download API from Spotify
- Spotdl is unofficial wrapper (subject to Spotify's limits)

### Long-term Considerations
1. **Consider alternatives to Spotify source**:
   - Maybe get audio from YouTube directly (user searches for track)
   - Or use Deezer API (different rate limits)
   - Or YouTube Music API (if available for education)

2. **Respect ToS**:
   - Caching is acceptable (fair use)
   - HTML scraping is gray area (check ToS)
   - Rate limiting is Spotify's right

3. **User Communication**:
   - Inform users about rate limits
   - Show cache hit rate (builds confidence)
   - Suggest alternatives (manual search YouTube)

---

**Status**: Ready for implementation  
**Last Updated**: March 12, 2026  
**Next Action**: Implement Solution 1 & 2 first (Quick wins), then Solution 3 (Resilience)
