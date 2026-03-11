// reset-database.js
const fs = require('fs').promises;
const path = require('path');

const DB_PATH = './database.json';

async function resetDatabase() {
    try {
        // Create clean database structure
        const cleanDatabase = {
            students: [],
            teachers: []
        };
        
        // Write to file with proper formatting
        await fs.writeFile(DB_PATH, JSON.stringify(cleanDatabase, null, 2), 'utf8');
        
        console.log('✅ Database reset successfully!');
        console.log('📄 File location:', path.resolve(DB_PATH));
        console.log('📊 Structure:', JSON.stringify(cleanDatabase, null, 2));
        
        // Verify the file was written correctly
        const verify = await fs.readFile(DB_PATH, 'utf8');
        const parsed = JSON.parse(verify);
        
        if (parsed.students && parsed.teachers) {
            console.log('✅ Verification passed - database is valid');
        } else {
            console.log('❌ Verification failed - please check manually');
        }
        
    } catch (error) {
        console.error('❌ Error resetting database:', error);
        process.exit(1);
    }
}

// Run the reset
resetDatabase();