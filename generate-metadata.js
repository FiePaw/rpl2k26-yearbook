/**
 * Generate .info.json files untuk existing MP3 files
 * Parse metadata dari filename dan create metadata JSON files
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const MUSIC_DIR = path.join(__dirname, 'profile_music');

async function generateMetadataFiles() {
    try {
        console.log('🔄 Generating metadata files for existing MP3s...\n');
        
        const files = await fs.readdir(MUSIC_DIR);
        const mp3Files = files.filter(f => f.toLowerCase().endsWith('.mp3'));
        
        let generatedCount = 0;
        
        for (const mp3File of mp3Files) {
            const jsonName = mp3File.replace('.mp3', '.info.json');
            const jsonPath = path.join(MUSIC_DIR, jsonName);
            
            // Check if .info.json already exists
            try {
                await fs.access(jsonPath);
                console.log(`✓ Already exists: ${jsonName}`);
                continue;
            } catch {
                // File doesn't exist, generate it
            }
            
            try {
                let artist = 'Unknown Artist';
                let title = mp3File.replace('.mp3', '');
                
                // Parse format: "Artist - Title.mp3"
                if (title.includes(' - ')) {
                    const parts = title.split(' - ');
                    if (parts.length >= 2) {
                        artist = parts[0].trim();
                        title = parts.slice(1).join(' - ').trim();
                    }
                }
                // Parse format: "Artist_Title.mp3"
                else if (title.includes('_') && !title.match(/^\d+_/)) {
                    const parts = title.split('_');
                    if (parts.length >= 2) {
                        artist = parts[0].trim();
                        title = parts.slice(1).join(' ').trim();
                    }
                }
                // Remove video ID if present: "Title [videoId].mp3"
                title = title.replace(/\s*\[\w+\]\s*$/, '').trim();
                
                // Create metadata object
                const metadata = {
                    id: 'unknown',
                    title: title,
                    artist: artist,
                    ext: 'mp3',
                    format: 'Audio from video',
                    _generated: true,
                    _timestamp: new Date().toISOString()
                };
                
                // Write metadata file
                await fs.writeFile(jsonPath, JSON.stringify(metadata, null, 2));
                
                console.log(`✅ Generated: ${jsonName}`);
                console.log(`   └─ Artist: ${artist}`);
                console.log(`   └─ Title:  ${title}\n`);
                
                generatedCount++;
            } catch (err) {
                console.error(`❌ Error processing ${mp3File}: ${err.message}\n`);
            }
        }
        
        console.log(`\n✅ Complete! Generated ${generatedCount} metadata files\n`);
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Run the generation
generateMetadataFiles();
