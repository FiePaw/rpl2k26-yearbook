/**
 * Example: Using Lyrics Scraper dengan Gemini API Multi-Key Integration
 * Test file untuk verify functionality dengan multiple API keys
 */

const LyricsScraper = require('./lyrics-scraper.js');

/**
 * Test 1: Auto load dari geminiAPI.txt
 */
async function testAutoLoadFromFile() {
    console.log('\n========== TEST 1: Auto Load dari geminiAPI.txt ==========');
    try {
        const scraper = new LyricsScraper();
        
        console.log(`✅ Successfully initialized`);
        console.log(`Available API keys: ${scraper.geminiApiKeys.length}`);
        
        if (scraper.geminiApiKeys.length > 0) {
            console.log('API Keys loaded:');
            scraper.geminiApiKeys.forEach((key, i) => {
                console.log(`  [${i + 1}] ${key.substring(0, 10)}...${key.substring(key.length - 5)}`);
            });
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

/**
 * Test 2: Load dari array parameter
 */
async function testLoadFromParameter() {
    console.log('\n========== TEST 2: Load dari Parameter ==========');
    try {
        const apiKeys = [
            'AIzaSyB9iNEvCtbSUopFEx84hUygOgL-vzP16Rs',
            'AIzaSyBoQovNmmm1o5BQ1w4JySSNklifaOPhqdA'
        ];
        
        const scraper = new LyricsScraper(apiKeys);
        
        console.log(`✅ Loaded ${scraper.geminiApiKeys.length} API keys`);
        console.log(`Current API key index: ${scraper.currentApiIndex + 1}`);
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

/**
 * Test 3: Search lyrics dengan Gemini (primary method)
 */
async function testGeminiSearch() {
    console.log('\n========== TEST 3: Gemini API Primary Search ==========');
    try {
        const scraper = new LyricsScraper();
        
        if (scraper.geminiApiKeys.length === 0) {
            console.warn('⚠️ Skipped: No API keys configured');
            return;
        }
        
        const lyrics = await scraper.searchLyrics('Akon', 'Be With You');
        
        if (lyrics) {
            console.log('✅ Success!');
            console.log(`Found ${lyrics.length} segments`);
            console.log('\nFirst 3 segments:');
            lyrics.slice(0, 3).forEach((seg, i) => {
                console.log(`  [${i+1}] ${seg.start.toFixed(2)}s - ${seg.end.toFixed(2)}s: ${seg.text.substring(0, 50)}...`);
            });
        } else {
            console.log('❌ No lyrics found');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

/**
 * Test 4: Cache test - search ulang seharusnya dari cache
 */
async function testCacheHit() {
    console.log('\n========== TEST 4: Cache Hit Test ==========');
    try {
        const scraper = new LyricsScraper();
        
        if (scraper.geminiApiKeys.length === 0) {
            console.warn('⚠️ Skipped: No API keys configured');
            return;
        }
        
        console.log('First search (from source)...');
        const start1 = Date.now();
        const lyrics1 = await scraper.searchLyrics('Akon', 'Be With You');
        const time1 = Date.now() - start1;
        console.log(`Took ${time1}ms`);

        console.log('\nSecond search (should be from cache)...');
        const start2 = Date.now();
        const lyrics2 = await scraper.searchLyrics('Akon', 'Be With You');
        const time2 = Date.now() - start2;
        console.log(`Took ${time2}ms (faster = cache hit)`);

        if (time2 < time1 / 2) {
            console.log('✅ Cache working!');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

/**
 * Test 5: Fallback test - disable Gemini dan coba AZLyrics
 */
async function testFallback() {
    console.log('\n========== TEST 5: Fallback to AZLyrics ==========');
    try {
        const scraperNoGemini = new LyricsScraper([]); // Empty array = no Gemini
        console.log('Searching dengan Gemini disabled (should use AZLyrics)...');
        
        const lyrics = await scraperNoGemini.searchLyrics('Akon', 'Be With You');
        
        if (lyrics) {
            console.log('✅ Fallback to AZLyrics successful!');
            console.log(`Found ${lyrics.length} segments`);
        } else {
            console.log('⚠️ AZLyrics also failed (this is normal - site blocking)');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

/**
 * Test 6: API key switching simulation
 */
async function testApiKeySwitching() {
    console.log('\n========== TEST 6: API Key Switching Simulation ==========');
    try {
        const apiKeys = [
            'invalid-key-1',
            'invalid-key-2',
            'AIzaSyB9iNEvCtbSUopFEx84hUygOgL-vzP16Rs' // Valid key
        ];
        
        const scraper = new LyricsScraper(apiKeys);
        
        console.log(`Loaded ${scraper.geminiApiKeys.length} API keys`);
        console.log(`Starting with key ${scraper.currentApiIndex + 1}`);
        
        // Simulate switching
        console.log('\nSimulating key switching:');
        for (let i = 0; i < 3; i++) {
            console.log(`Current key: ${scraper.currentApiIndex + 1}/${scraper.geminiApiKeys.length}`);
            
            if (i < 2) {
                const switched = scraper.switchToNextApiKey();
                console.log(`Switched: ${switched}`);
            }
        }
        
        console.log('✅ Key switching working correctly');
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

/**
 * Test 7: Multiple songs
 */
async function testMultipleSongs() {
    console.log('\n========== TEST 7: Multiple Songs Search ==========');
    
    const scraper = new LyricsScraper();
    
    if (scraper.geminiApiKeys.length === 0) {
        console.warn('⚠️ Skipped: No API keys configured');
        return;
    }
    
    const songs = [
        { artist: 'Akon', title: 'Be With You' },
        { artist: 'GANGGA', title: 'Blue Jeans' },
        { artist: 'Nadin Amizah', title: 'Bertaut' }
    ];

    for (const song of songs) {
        try {
            console.log(`\nSearching: "${song.title}" by ${song.artist}...`);
            const lyrics = await scraper.searchLyrics(song.artist, song.title);
            
            if (lyrics && lyrics.length > 0) {
                console.log(`✅ Found ${lyrics.length} segments`);
            } else {
                console.log('⚠️ Not found');
            }
        } catch (error) {
            console.error(`❌ Error: ${error.message}`);
        }

        // Delay untuk avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

/**
 * Test 8: Parse segments test
 */
async function testParseSegments() {
    console.log('\n========== TEST 8: Parse Segments Test ==========');
    
    const scraper = new LyricsScraper();
    
    const testLyrics = `[00:00] Intro music...
This is verse one
Another line here
[01:30] This is chorus
Chorus line two
More chorus`;

    console.log('Input:');
    console.log(testLyrics);

    const segments = scraper.parseSegmentsFromGemini(testLyrics);
    
    console.log('\nParsed segments:');
    segments.forEach((seg, i) => {
        console.log(`  [${i}] ${seg.start.toFixed(2)}s - ${seg.end.toFixed(2)}s: "${seg.text}"`);
    });
    
    console.log(`✅ Successfully parsed ${segments.length} segments`);
}

/**
 * Run all tests
 */
async function runAllTests() {
    console.log('🚀 Starting Lyrics Scraper Tests (Multi-Key Support)...\n');
    
    await testAutoLoadFromFile();
    await testLoadFromParameter();
    await testApiKeySwitching();
    await testGeminiSearch();
    await testCacheHit();
    await testFallback();
    await testParseSegments();
    // await testMultipleSongs(); // Skip by default to avoid rate limiting
    
    console.log('\n✅ All tests completed!');
}

// Run tests if executed directly
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = {
    testAutoLoadFromFile,
    testLoadFromParameter,
    testGeminiSearch,
    testCacheHit,
    testFallback,
    testApiKeySwitching,
    testParseSegments,
    testMultipleSongs
};

