/**
 * Utility script untuk fix existing audio files yang tidak memiliki .info.json
 * atau memiliki .info.json dengan nama yang tidak match
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const MUSIC_DIR = path.join(__dirname, '../profile_music');

async function fixMetadataFiles() {
    try {
        console.log('🔧 Starting metadata file fix...\n');
        
        const files = await fs.readdir(MUSIC_DIR);
        const mp3Files = files.filter(f => f.toLowerCase().endsWith('.mp3'));
        const jsonFiles = files.filter(f => f.toLowerCase().endsWith('.info.json'));
        
        console.log(`📁 Found ${mp3Files.length} MP3 files and ${jsonFiles.length} .info.json files\n`);
        
        // Step 1: Match and rename .info.json files to their corresponding MP3 names
        console.log('📋 Step 1: Matching .info.json files to MP3s...\n');
        
        for (const jsonFile of jsonFiles) {
            const jsonPath = path.join(MUSIC_DIR, jsonFile);
            
            try {
                const content = await fs.readFile(jsonPath, 'utf8');
                const infoData = JSON.parse(content);
                
                // Get artist and title from metadata
                let artistName = infoData.artist || 'Unknown';
                let songTitle = infoData.title || infoData.track || 'Unknown';
                
                // Clean up title
                songTitle = songTitle.replace(/\s*\[\w+\]\s*$/, '').trim();
                
                // Expected MP3 filename
                const expectedMp3Name = `${artistName} - ${songTitle}.mp3`
                    .replace(/[<>:"/\\|?*]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();
                
                const expectedJsonName = expectedMp3Name.replace('.mp3', '.info.json');
                
                // Check if current json filename matches expected
                if (jsonFile !== expectedJsonName) {
                    const expectedJsonPath = path.join(MUSIC_DIR, expectedJsonName);
                    
                    // Check if expected file already exists
                    try {
                        await fs.access(expectedJsonPath);
                        console.log(`⚠ Skip (already exists): ${expectedJsonName}`);
                    } catch {
                        // File doesn't exist, safe to rename
                        await fs.rename(jsonPath, expectedJsonPath);
                        console.log(`✅ Renamed: ${jsonFile}`);
                        console.log(`   └─ To: ${expectedJsonName}`);
                        console.log(`   └─ Artist: ${artistName}, Title: ${songTitle}\n`);
                    }
                } else {
                    console.log(`✓ Already correct: ${jsonFile}\n`);
                }
            } catch (err) {
                console.error(`❌ Error processing ${jsonFile}: ${err.message}\n`);
            }
        }
        
        // Step 2: List orphaned MP3 files (without .info.json)
        console.log('\n📋 Step 2: Checking for orphaned MP3 files...\n');
        
        let orphanCount = 0;
        for (const mp3File of mp3Files) {
            const jsonName = mp3File.replace('.mp3', '.info.json');
            const jsonPath = path.join(MUSIC_DIR, jsonName);
            
            try {
                await fs.access(jsonPath);
            } catch {
                console.log(`⚠ Orphaned (no metadata): ${mp3File}`);
                orphanCount++;
            }
        }
        
        if (orphanCount === 0) {
            console.log('✓ All MP3 files have corresponding .info.json files');
        }
        
        console.log('\n✅ Metadata fix complete!\n');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Run the fix
fixMetadataFiles();
