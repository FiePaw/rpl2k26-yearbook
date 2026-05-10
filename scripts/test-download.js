#!/usr/bin/env node
/**
 * Test Script — Download Lagu
 * 
 * Cara pakai:
 *   node scripts/test-download.js <URL> [artist]
 * 
 * Contoh:
 *   node scripts/test-download.js "https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh" "Nadin Amizah"
 *   node scripts/test-download.js "https://www.tiktok.com/@user/video/12345"
 * 
 * Platform yang didukung:
 *   - Spotify (open.spotify.com)
 *   - TikTok (tiktok.com)
 *   - YouTube (youtube.com, youtu.be)
 *   - YouTube Music (music.youtube.com)
 */

const path = require('path');

// Import MusicDownloader
const MusicDownloader = require('../src/server/media/music-downloader');

// Parse arguments
const args = process.argv.slice(2);

if (args.length === 0) {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║       🎵 Test Download Lagu — RPL 2k26          ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log('║                                                  ║');
    console.log('║  Cara pakai:                                     ║');
    console.log('║    node scripts/test-download.js <URL> [artist]  ║');
    console.log('║                                                  ║');
    console.log('║  Contoh:                                         ║');
    console.log('║    node scripts/test-download.js \\               ║');
    console.log('║      "https://open.spotify.com/track/..." \\      ║');
    console.log('║      "Nadin Amizah"                              ║');
    console.log('║                                                  ║');
    console.log('║  Platform:                                       ║');
    console.log('║    • Spotify  (open.spotify.com)                 ║');
    console.log('║    • TikTok   (tiktok.com)                       ║');
    console.log('║    • YouTube  (youtube.com / youtu.be)            ║');
    console.log('║    • YT Music (music.youtube.com)                ║');
    console.log('║                                                  ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');
    process.exit(0);
}

const url = args[0];
const artist = args[1] || null;

// Validate URL
if (!url.startsWith('http')) {
    console.error('❌ URL tidak valid. Harus dimulai dengan http:// atau https://');
    process.exit(1);
}

// Detect platform
function detectPlatform(url) {
    if (/spotify\.com/i.test(url)) return 'Spotify';
    if (/music\.youtube\.com/i.test(url)) return 'YouTube Music';
    if (/youtube\.com|youtu\.be/i.test(url)) return 'YouTube';
    if (/tiktok\.com/i.test(url)) return 'TikTok';
    return 'Unknown';
}

async function main() {
    const platform = detectPlatform(url);
    
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('  🎵 Test Download Lagu');
    console.log('═══════════════════════════════════════════');
    console.log(`  Platform : ${platform}`);
    console.log(`  URL      : ${url}`);
    if (artist) console.log(`  Artist   : ${artist}`);
    console.log(`  Output   : profile_music/`);
    console.log('═══════════════════════════════════════════');
    console.log('');

    if (platform === 'Unknown') {
        console.error('❌ Platform tidak dikenali!');
        console.error('   Gunakan URL dari Spotify, TikTok, YouTube, atau YouTube Music.');
        process.exit(1);
    }

    // Initialize downloader
    const outputDir = path.join(__dirname, '..', 'profile_music');
    const cacheDir = path.join(__dirname, '..', 'metadata_cache');
    const downloader = new MusicDownloader(outputDir, cacheDir);

    console.log('⏳ Memulai download...');
    console.log('');

    const startTime = Date.now();

    try {
        const result = await downloader.download(url, artist);

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        console.log('');
        console.log('───────────────────────────────────────────');

        if (result.success !== false) {
            console.log('✅ Download BERHASIL!');
            console.log(`   File    : ${result.fileName || 'N/A'}`);
            console.log(`   Source  : ${result.source || 'N/A'}`);
            console.log(`   Pesan   : ${result.message || '-'}`);
            console.log(`   Waktu   : ${elapsed} detik`);
            
            if (result.fileName) {
                const filePath = path.join(outputDir, result.fileName);
                try {
                    const fs = require('fs');
                    const stats = fs.statSync(filePath);
                    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
                    console.log(`   Ukuran  : ${sizeMB} MB`);
                    console.log(`   Path    : ${filePath}`);
                } catch (e) {
                    // file mungkin belum ada
                }
            }
        } else {
            console.log('❌ Download GAGAL!');
            console.log(`   Error   : ${result.message || 'Unknown error'}`);
            console.log(`   Waktu   : ${elapsed} detik`);
            
            if (result.isSetupError) {
                console.log('');
                console.log('💡 Ini adalah setup error. Pastikan Python dan yt-dlp terinstall:');
                console.log('   pip3 install yt-dlp');
            }
            
            if (result.isRateLimit) {
                console.log('');
                console.log('💡 Rate limited! Tunggu beberapa saat sebelum mencoba lagi.');
            }
        }

        console.log('───────────────────────────────────────────');
        console.log('');

    } catch (error) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.error('');
        console.error('───────────────────────────────────────────');
        console.error(`❌ Exception: ${error.message}`);
        console.error(`   Waktu   : ${elapsed} detik`);
        console.error('───────────────────────────────────────────');
        console.error('');
        process.exit(1);
    }
}

main();
