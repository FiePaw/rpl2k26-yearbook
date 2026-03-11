#!/usr/bin/env node

/**
 * Batch Video Optimizer
 * Mengoptimalkan semua video di folder OurGallery ke 720p (1280x720)
 * Jalankan dengan: node batch-optimize-videos.js
 */

const fs = require('fs');
const path = require('path');
const VideoOptimizer = require('./videoOptimizer');

async function batchOptimizeVideos() {
    const videoOptimizer = new VideoOptimizer();
    const galleryDir = path.join(__dirname, 'OurGallery');
    
    console.log('🎬 Batch Video Optimizer - Starting...');
    console.log(`📁 Gallery directory: ${galleryDir}\n`);
    
    // Check if gallery directory exists
    if (!fs.existsSync(galleryDir)) {
        console.error('❌ Gallery directory not found!');
        return;
    }
    
    // Read all files
    const files = fs.readdirSync(galleryDir);
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
    const videoFiles = files.filter(f => {
        const ext = path.extname(f).toLowerCase();
        return videoExtensions.includes(ext) && !f.includes('_');  // Exclude already processed
    });
    
    console.log(`📊 Found ${videoFiles.length} video(s) to process\n`);
    
    if (videoFiles.length === 0) {
        console.log('✅ No videos to process!');
        return;
    }
    
    // Process each video
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < videoFiles.length; i++) {
        const filename = videoFiles[i];
        const filepath = path.join(galleryDir, filename);
        const videoNum = i + 1;
        
        console.log(`\n[${videoNum}/${videoFiles.length}] Processing: ${filename}`);
        console.log('─'.repeat(60));
        
        try {
            // Check if already optimized
            if (videoOptimizer.isOptimized(filepath)) {
                console.log('✅ Already optimized, skipping...');
                successCount++;
                continue;
            }
            
            // Optimize video
            const result = await videoOptimizer.optimizeVideo(filepath, filename);
            
            console.log('\n📊 Optimization Result:');
            console.log(`   Duration: ${result.duration} seconds`);
            console.log('   Encoded Versions:');
            
            Object.entries(result.optimizedVideos).forEach(([quality, info]) => {
                if (info && info.fileSize) {
                    const sizeMB = (info.fileSize / (1024 * 1024)).toFixed(2);
                    console.log(`   ✓ ${info.label}: ${sizeMB}MB`);
                }
            });
            
            successCount++;
            console.log(`✅ Successfully optimized!\n`);
            
        } catch (error) {
            errorCount++;
            console.error(`❌ Error: ${error.message}\n`);
        }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📈 BATCH OPTIMIZATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Success: ${successCount}/${videoFiles.length}`);
    console.log(`❌ Failed: ${errorCount}/${videoFiles.length}`);
    console.log('='.repeat(60));
    
    if (successCount === videoFiles.length) {
        console.log('\n🎉 All videos successfully optimized to 720p (1280x720)!');
        console.log('📺 Videos are now ready for smooth playback in kolase.html');
    }
}

// Run the batch optimizer
batchOptimizeVideos().catch(console.error);
