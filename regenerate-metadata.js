/**
 * Regenerate .info.json files untuk remove uploader field
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const MUSIC_DIR = path.join(__dirname, 'profile_music');

async function regenerateMetadataFiles() {
    try {
        console.log('🔄 Regenerating metadata files (removing uploader field)...\n');
        
        const files = await fs.readdir(MUSIC_DIR);
        const jsonFiles = files.filter(f => f.toLowerCase().endsWith('.info.json'));
        
        let regeneratedCount = 0;
        
        for (const jsonFile of jsonFiles) {
            const jsonPath = path.join(MUSIC_DIR, jsonFile);
            
            try {
                const infoContent = await fs.readFile(jsonPath, 'utf8');
                const infoData = JSON.parse(infoContent);
                
                // Remove uploader field jika ada
                if (infoData.uploader) {
                    delete infoData.uploader;
                    
                    // Write back updated metadata
                    await fs.writeFile(jsonPath, JSON.stringify(infoData, null, 2));
                    
                    console.log(`✅ Updated: ${jsonFile}`);
                    regeneratedCount++;
                } else {
                    console.log(`✓ Already clean: ${jsonFile}`);
                }
            } catch (err) {
                console.error(`❌ Error processing ${jsonFile}: ${err.message}`);
            }
        }
        
        console.log(`\n✅ Complete! Updated ${regeneratedCount} metadata files\n`);
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Run the regeneration
regenerateMetadataFiles();
