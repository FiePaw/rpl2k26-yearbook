/**
 * Test script to verify metadata reading from .info.json files
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const MUSIC_DIR = path.join(__dirname, 'profile_music');

async function testMetadataReading() {
    try {
        console.log('🧪 Testing metadata reading...\n');
        
        const files = await fs.readdir(MUSIC_DIR);
        const mp3Files = files.filter(f => f.toLowerCase().endsWith('.mp3'));
        
        for (const mp3File of mp3Files.slice(0, 3)) {  // Test first 3 files
            console.log(`\n📄 File: ${mp3File}`);
            
            const jsonName = mp3File.replace('.mp3', '.info.json');
            const jsonPath = path.join(MUSIC_DIR, jsonName);
            
            try {
                const infoStats = await fs.stat(jsonPath);
                if (infoStats.isFile()) {
                    const infoContent = await fs.readFile(jsonPath, 'utf8');
                    const infoData = JSON.parse(infoContent);
                    
                    console.log(`   ✓ Metadata found`);
                    console.log(`   └─ Artist: ${infoData.artist}`);
                    console.log(`   └─ Title:  ${infoData.title}`);
                    console.log(`   └─ Uploader: ${infoData.uploader}`);
                }
            } catch (err) {
                console.log(`   ✗ No metadata: ${err.message}`);
            }
        }
        
        console.log('\n✅ Test complete\n');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testMetadataReading();
