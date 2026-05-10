// server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const multer = require('multer');
const axios = require('axios');
const { parseFile } = require('music-metadata');
const SpotifyDownloader = require('./src/server/media/spotify-downloader');
const TikTokDownloader = require('./src/server/media/tiktok-downloader');
const VideoOptimizer = require('./src/server/media/videoOptimizer');
const LyricsScraper = require('./src/server/lyrics/lyrics-scraper');
const AIAPILyricsFetcher = require('./src/server/ai/ai-api-lyrics-fetcher');
const MusicDownloader = require('./src/server/media/music-downloader');

const app = express();
const PORT = 5000;

// Initialize services
const videoOptimizer = new VideoOptimizer();
const lyricsScraper = new LyricsScraper();
const lyricsFetcher = new AIAPILyricsFetcher();
const musicDownloader = new MusicDownloader('profile_music', 'metadata_cache');

// Log AI API Lyrics integration
console.log(`📚 Lyrics Scraper initialized with AI API (Qwen + OpenAI)`);
console.log(`🎵 Music Downloader initialized with Metadata Cache (Spotify oEmbed + YouTube)`);

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'profile_music');
        fs.mkdir(uploadDir, { recursive: true }).catch(console.error);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, `${timestamp}_${sanitized}`);
    }
});

// Configure multer for gallery uploads (images and videos)
const galleryStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'OurGallery');
        fs.mkdir(uploadDir, { recursive: true }).catch(console.error);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, `${timestamp}_${sanitized}`);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/mp3' || file.originalname.endsWith('.mp3')) {
            cb(null, true);
        } else {
            cb(new Error('Only MP3 files are allowed'));
        }
    }
});

const galleryUpload = multer({
    storage: galleryStorage,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit for gallery
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.mov'];
        
        const ext = path.extname(file.originalname).toLowerCase();
        const isAllowedExt = allowedExtensions.some(e => ext === e);
        const isAllowedMime = allowedMimes.includes(file.mimetype) || file.originalname.endsWith('.mp4') || file.originalname.endsWith('.webp');
        
        if (isAllowedExt || isAllowedMime) {
            cb(null, true);
        } else {
            cb(new Error('Only image and video files are allowed'));
        }
    }
});

// Middleware
// CRITICAL: Set CORS headers FIRST and make them apply to ALL responses
app.use((req, res, next) => {
    const origin = req.headers.origin || 'https://www.rpl2k26.site';
    const allowedOrigins = [
        'https://www.rpl2k26.site',
        'https://rpl2k26.site',
        'http://localhost:3000',
        'http://localhost:5000',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5000'
    ];
    
    // Determine which origin to allow
    const responseOrigin = allowedOrigins.includes(origin) ? origin : 'https://www.rpl2k26.site';
    
    // Set CORS headers on response object - these will apply to ALL responses
    res.setHeader('Access-Control-Allow-Origin', responseOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    console.log(`[CORS] Request from ${origin} → Allow ${responseOrigin}`);
    
    // Handle preflight OPTIONS requests
    if (req.method === 'OPTIONS') {
        console.log(`✅ CORS preflight OK`);
        return res.status(200).end();
    }
    
    next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Serve client-side JS and CSS dari src/client/
app.use('/src/client', express.static(path.join(__dirname, 'src/client')));

// Middleware untuk routing file HTML tanpa extension
app.use((req, res, next) => {
    // Jangan process API routes dan file dengan extension
    if (req.path.startsWith('/api/') || req.path.includes('.')) {
        return next();
    }
    
    // List file HTML yang bisa diakses tanpa extension
    const htmlFiles = ['index', 'beranda', 'kolase', 'wali-kelas', 'profile', 'loading', 'admin-dashboard'];
    const routeName = req.path.slice(1) || 'index'; // Remove leading slash
    
    if (htmlFiles.includes(routeName)) {
        // Redirect to index if only / is requested
        if (req.path === '/') {
            return res.sendFile(path.join(__dirname, 'public', 'index.html'));
        }
        
        // Try to serve .html file
        const filePath = path.join(__dirname, 'public', `${routeName}.html`);
        return res.sendFile(filePath, (err) => {
            if (err) next();
        });
    }
    
    next();
});

// Serve static files dari root directory (untuk backward compatibility)
app.use(express.static(__dirname));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Database file paths
const DB_PATH = './data/database.json';
const STUDENTS_PATH = './data/nameMurid.json';
const TEACHERS_PATH = './data/nameGuru.json';
const ADMIN_TRACKING_PATH = './data/adminbase.json';

// Helper function to read JSON file
async function readJSON(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        // Check if file is empty or invalid
        if (!data || data.trim() === '') {
            console.log(`${filePath} is empty, returning default structure`);
            if (filePath === DB_PATH) {
                return { students: [], teachers: [] };
            }
            return [];
        }
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        // Return default structure for database
        if (filePath === DB_PATH) {
            return { students: [], teachers: [] };
        }
        return null;
    }
}

// Helper function to write JSON file
async function writeJSON(filePath, data) {
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error);
        return false;
    }
}

// Initialize database if not exists
async function initializeDatabase() {
    try {
        await fs.access(DB_PATH);
    } catch {
        const initialData = {
            students: [],
            teachers: []
        };
        await writeJSON(DB_PATH, initialData);
        console.log('Database initialized');
    }
}

// Get student names from nameMurid.json
app.get('/api/students/names', async (req, res) => {
    const students = await readJSON(STUDENTS_PATH);
    if (students) {
        res.json(students);
    } else {
        res.status(500).json({ error: 'Failed to load student names' });
    }
});

// Get teacher names from nameGuru.json
app.get('/api/teachers/names', async (req, res) => {
    const teachers = await readJSON(TEACHERS_PATH);
    if (teachers) {
        res.json(teachers);
    } else {
        res.status(500).json({ error: 'Failed to load teacher names' });
    }
});

// Student login
app.post('/api/login/student', async (req, res) => {
    const { studentId, password } = req.body;
    
    const students = await readJSON(STUDENTS_PATH);
    const student = students.find(s => s.id === studentId);
    
    if (!student) {
        return res.json({ success: false, message: 'Student not found' });
    }
    
    // Get first name for password check
    const firstName = student.name.split(' ')[0];
    const correctPassword = `${firstName}`;
    
    if (password === correctPassword) {
        // Track login
        trackLogin(studentId, 'student', student.name);
        trackProfileVisit(studentId);
        
        res.json({ 
            success: true, 
            name: student.name,
            nickname: student.nickname || firstName
        });
    } else {
        res.json({ success: false, message: 'Incorrect password' });
    }
});

// Teacher login
app.post('/api/login/teacher', async (req, res) => {
    const { teacherId, password } = req.body;
    
    const teachers = await readJSON(TEACHERS_PATH);
    const teacher = teachers.find(t => t.id === teacherId);
    
    if (!teacher) {
        return res.json({ success: false, message: 'Teacher not found' });
    }
    
    if (password === 'RPL2k26') {
        // Track login
        trackLogin(teacherId, 'teacher', teacher.name);
        
        res.json({ 
            success: true, 
            name: teacher.name,
            nickname: teacher.nickname || teacher.name.split(' ')[0]
        });
    } else {
        res.json({ success: false, message: 'Incorrect password' });
    }
});

// Admin login
app.post('/api/login/admin', async (req, res) => {
    const { adminId, password } = req.body;
    
    // Admin only accepts ID 'admin' with password 'RYRisADMIN'
    if (adminId === 'admin' && password === 'RYRisADMIN') {
        // Track login
        trackLogin(adminId, 'admin', 'Admin');
        
        res.json({ 
            success: true, 
            name: 'Admin',
            nickname: 'Admin'
        });
    } else {
        res.json({ success: false, message: 'Incorrect admin credentials' });
    }
});

// Get all students with their data
app.get('/api/students', async (req, res) => {
    const studentsNames = await readJSON(STUDENTS_PATH);
    const database = await readJSON(DB_PATH);
    
    if (!studentsNames || !database) {
        return res.status(500).json({ error: 'Failed to load data' });
    }
    
    // Merge student names with their profile data
    const students = studentsNames.map(student => {
        const profileData = database.students.find(s => s.id === student.id);
        return {
            id: student.id,
            name: student.name,
            nickname: student.nickname,
            ...profileData
        };
    });
    
    res.json(students);
});

// Get single student
app.get('/api/students/:id', async (req, res) => {
    const { id } = req.params;
    const studentsNames = await readJSON(STUDENTS_PATH);
    const database = await readJSON(DB_PATH);
    
    // Track the visit
    trackProfileVisit(id);
    
    const studentName = studentsNames.find(s => s.id === id);
    const profileData = database.students.find(s => s.id === id);
    
    if (!studentName) {
        return res.status(404).json({ error: 'Student not found' });
    }
    
    res.json({
        id: studentName.id,
        name: studentName.name,
        nickname: studentName.nickname,
        ...profileData
    });
});

// Update student profile
app.put('/api/students/:id', async (req, res) => {
    const { id } = req.params;
    const { name, birthday, message, photo, audioFile, audioTrimStart, audioTrimEnd, studentLyrics, lyricsGeneratedFrom, lyricsUpdatedAt, lyricsArtistName, lyricsSongTitle } = req.body;
    
    const database = await readJSON(DB_PATH);
    
    // Find existing student data
    const existingIndex = database.students.findIndex(s => s.id === id);
    const existingData = existingIndex >= 0 ? database.students[existingIndex] : {};
    
    const studentData = {
        id,
        name,
        birthday,
        message,
        photo,
        audioFile: audioFile || null,
        audioTrimStart: audioTrimStart !== null && audioTrimStart !== undefined ? audioTrimStart : null,
        audioTrimEnd: audioTrimEnd !== null && audioTrimEnd !== undefined ? audioTrimEnd : null,
        studentLyrics: studentLyrics !== undefined ? studentLyrics : (existingData.studentLyrics || null),
        lyricsGeneratedFrom: lyricsGeneratedFrom !== undefined ? lyricsGeneratedFrom : (existingData.lyricsGeneratedFrom || null),
        lyricsUpdatedAt: lyricsUpdatedAt !== undefined ? lyricsUpdatedAt : (existingData.lyricsUpdatedAt || null),
        lyricsArtistName: lyricsArtistName !== undefined ? lyricsArtistName : (existingData.lyricsArtistName || null),
        lyricsSongTitle: lyricsSongTitle !== undefined ? lyricsSongTitle : (existingData.lyricsSongTitle || null),
        updatedAt: new Date().toISOString()
    };
    
    if (existingIndex >= 0) {
        database.students[existingIndex] = studentData;
    } else {
        database.students.push(studentData);
    }
    
    const success = await writeJSON(DB_PATH, database);
    
    // Track the update
    if (success) {
        trackProfileUpdate(id);
    }
    
    if (success) {
        res.json({ success: true, data: studentData });
    } else {
        res.status(500).json({ success: false, error: 'Failed to update profile' });
    }
});

// ========== LYRICS MANAGEMENT ENDPOINTS ==========

// POST /api/student/lyrics/generate - Generate lyrics using AI API
app.post('/api/student/lyrics/generate', async (req, res) => {
    try {
        const { studentId, audioFile, artistName, songTitle } = req.body;
        
        if (!studentId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required field: studentId' 
            });
        }

        let finalArtistName = artistName;
        let finalSongTitle = songTitle;

        // If artist/title not provided, try to extract from audio file metadata
        if ((!finalArtistName || !finalSongTitle) && audioFile) {
            try {
                const audioFilePath = path.join(__dirname, audioFile);
                
                // Check if file exists
                await fs.access(audioFilePath);
                
                console.log(`📂 Extracting metadata from: ${audioFilePath}`);
                const metadata = await parseFile(audioFilePath);
                
                if (metadata && metadata.common) {
                    finalArtistName = finalArtistName || metadata.common.artist || 'Unknown Artist';
                    finalSongTitle = finalSongTitle || metadata.common.title || path.basename(audioFile, path.extname(audioFile));
                    console.log(`🎵 Metadata extracted - Artist: "${finalArtistName}", Title: "${finalSongTitle}"`);
                }
            } catch (metadataError) {
                console.warn('⚠️ Failed to extract metadata:', metadataError.message);
                // Fallback if metadata extraction fails
                if (!finalArtistName || !finalSongTitle) {
                    const filename = path.basename(audioFile || 'unknown', '.mp3');
                    const parts = filename.split('-');
                    finalArtistName = finalArtistName || (parts.length > 1 ? parts[0].trim() : 'Unknown Artist');
                    finalSongTitle = finalSongTitle || (parts.length > 1 ? parts.slice(1).join('-').trim() : filename);
                }
            }
        }

        // Validate that we have artist and title
        if (!finalArtistName || !finalSongTitle) {
            return res.status(400).json({ 
                success: false, 
                error: 'Unable to determine artist name and song title. Please provide them manually.' 
            });
        }

        console.log(`🎵 Generating lyrics for "${finalSongTitle}" by "${finalArtistName}"...`);

        // Set longer timeout (600 seconds / 10 minutes) - AI API processing can take several minutes
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout - Qwen took too long')), 600000)
        );

        // Use AIAPILyricsFetcher to search lyrics
        const searchPromise = lyricsFetcher.searchLyrics(finalArtistName, finalSongTitle);
        
        let lyrics;
        try {
            const startTime = Date.now();
            lyrics = await Promise.race([searchPromise, timeoutPromise]);
            const elapsed = Date.now() - startTime;
            console.log(`✅ Lyrics fetched successfully in ${elapsed}ms`);
        } catch (timeoutError) {
            console.error('⏱️ Timeout waiting for Qwen:', timeoutError.message);
            return res.status(504).json({
                success: false,
                error: 'AI API request timeout - Qwen took too long to respond. Please try again.'
            });
        }

        if (!lyrics) {
            return res.status(404).json({ 
                success: false, 
                error: 'Lyrics not found. Try different artist or song name.' 
            });
        }

        res.json({ 
            success: true, 
            lyrics,
            source: 'qwen',
            artist: finalArtistName,
            title: finalSongTitle,
            message: 'Lyrics generated successfully'
        });
    } catch (error) {
        console.error('❌ Lyrics generation error:', error);
        
        // Provide specific error messages
        let errorMessage = error.message;
        if (error.message.includes('timeout') || error.message.includes('took too long')) {
            errorMessage = 'AI API request timeout - please try again';
        } else if (error.message.includes('ENOENT')) {
            errorMessage = 'Audio file not found';
        }
        
        res.status(500).json({ 
            success: false, 
            error: `Failed to generate lyrics: ${errorMessage}` 
        });
    }
});

// POST /api/student/lyrics/save - Save lyrics to database
app.post('/api/student/lyrics/save', async (req, res) => {
    try {
        const { studentId, lyricsText, source } = req.body;

        if (!studentId || !lyricsText) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: studentId, lyricsText' 
            });
        }

        const database = await readJSON(DB_PATH);
        const studentIndex = database.students.findIndex(s => s.id === studentId);

        if (studentIndex < 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Student not found' 
            });
        }

        // Update student lyrics
        database.students[studentIndex].studentLyrics = lyricsText;
        database.students[studentIndex].lyricsGeneratedFrom = source || 'manual-edit';
        database.students[studentIndex].lyricsUpdatedAt = new Date().toISOString();

        const success = await writeJSON(DB_PATH, database);

        if (success) {
            console.log(`✅ Lyrics saved for student ${studentId}`);
            res.json({ 
                success: true, 
                message: 'Lyrics saved successfully',
                data: {
                    studentId,
                    lyricsUpdatedAt: database.students[studentIndex].lyricsUpdatedAt
                }
            });
        } else {
            res.status(500).json({ 
                success: false, 
                error: 'Failed to save lyrics to database' 
            });
        }
    } catch (error) {
        console.error('❌ Lyrics save error:', error);
        res.status(500).json({ 
            success: false, 
            error: `Failed to save lyrics: ${error.message}` 
        });
    }
});

// DELETE /api/student/lyrics/:studentId - Delete lyrics  
app.delete('/api/student/lyrics/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;

        const database = await readJSON(DB_PATH);
        const studentIndex = database.students.findIndex(s => s.id === studentId);

        if (studentIndex < 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Student not found' 
            });
        }

        // Clear lyrics
        database.students[studentIndex].studentLyrics = null;
        database.students[studentIndex].lyricsGeneratedFrom = null;
        database.students[studentIndex].lyricsUpdatedAt = null;

        const success = await writeJSON(DB_PATH, database);

        if (success) {
            console.log(`✅ Lyrics deleted for student ${studentId}`);
            res.json({ 
                success: true, 
                message: 'Lyrics deleted successfully' 
            });
        } else {
            res.status(500).json({ 
                success: false, 
                error: 'Failed to delete lyrics' 
            });
        }
    } catch (error) {
        console.error('❌ Lyrics delete error:', error);
        res.status(500).json({ 
            success: false, 
            error: `Failed to delete lyrics: ${error.message}` 
        });
    }
});

// Get all teachers with their data
app.get('/api/teachers', async (req, res) => {
    const teachersNames = await readJSON(TEACHERS_PATH);
    const database = await readJSON(DB_PATH);
    
    if (!teachersNames || !database) {
        return res.status(500).json({ error: 'Failed to load data' });
    }
    
    // Merge teacher names with their profile data
    const teachers = teachersNames.map(teacher => {
        const profileData = database.teachers.find(t => t.id === teacher.id);
        return {
            id: teacher.id,
            name: teacher.name,
            nickname: teacher.nickname,
            grade: teacher.grade,
            ...profileData
        };
    });
    
    res.json(teachers);
});

// Get single teacher
app.get('/api/teachers/:id', async (req, res) => {
    const { id } = req.params;
    const teachersNames = await readJSON(TEACHERS_PATH);
    const database = await readJSON(DB_PATH);
    
    const teacherName = teachersNames.find(t => t.id === id);
    const profileData = database.teachers.find(t => t.id === id);
    
    if (!teacherName) {
        return res.status(404).json({ error: 'Teacher not found' });
    }
    
    res.json({
        id: teacherName.id,
        name: teacherName.name,
        nickname: teacherName.nickname,
        grade: teacherName.grade,
        ...profileData
    });
});

// Update teacher profile
app.put('/api/teachers/:id', async (req, res) => {
    const { id } = req.params;
    const { name, message, photo, audioFile } = req.body;
    
    const database = await readJSON(DB_PATH);
    
    // Find existing teacher data
    const existingIndex = database.teachers.findIndex(t => t.id === id);
    
    const teacherData = {
        id,
        name,
        message,
        photo,
        audioFile: audioFile || null,
        updatedAt: new Date().toISOString()
    };
    
    if (existingIndex >= 0) {
        database.teachers[existingIndex] = teacherData;
    } else {
        database.teachers.push(teacherData);
    }
    
    const success = await writeJSON(DB_PATH, database);
    
    if (success) {
        res.json({ success: true, data: teacherData });
    } else {
        res.status(500).json({ success: false, error: 'Failed to update profile' });
    }
});

// ========== SPOTIFY ENDPOINTS ==========

// Check if spotdl is installed
app.get('/api/spotify/check', async (req, res) => {
    try {
        const downloader = new SpotifyDownloader();
        const isInstalled = await downloader.checkSpotdlInstalled();
        
        if (isInstalled) {
            res.json({
                success: true,
                message: 'spotdl is installed and ready',
                installed: true
            });
        } else {
            res.json({
                success: false,
                message: 'spotdl is not installed',
                installed: false,
                instruction: 'Install with: pip install spotdl'
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Download Spotify track (NEW: Menggunakan MusicDownloader dengan caching)
app.post('/api/spotify/download', async (req, res) => {
    const { spotifyUrl, artist } = req.body;
    
    if (!spotifyUrl) {
        return res.status(400).json({ 
            success: false, 
            error: 'Spotify URL is required' 
        });
    }
    
    try {
        // Check rate limit status
        const rateLimitStatus = musicDownloader.getRateLimitStatus();
        if (rateLimitStatus.isRateLimited) {
            return res.status(429).json({
                success: false,
                error: 'Rate limited',
                message: rateLimitStatus.lastError,
                waitTimeSeconds: rateLimitStatus.waitTimeSeconds,
                isRateLimit: true
            });
        }

        // Download menggunakan MusicDownloader (dengan caching dan smart platform detection)
        // Pass artist parameter untuk search yang lebih akurat
        const result = await musicDownloader.download(spotifyUrl, artist);
        
        if (!result.success) {
            // Check if it's a setup error (Python/yt-dlp not found)
            if (result.isSetupError) {
                return res.status(503).json({
                    success: false,
                    error: 'Setup Error',
                    message: result.message,
                    isSetupError: true
                });
            }

            return res.status(500).json({
                success: false,
                error: 'Download failed',
                details: result.message,
                isRateLimit: result.isRateLimit
            });
        }

        // Get list of downloaded tracks
        const tracks = await musicDownloader.getDownloadedFiles();

        res.json({
            success: true,
            message: result.message || 'Download berhasil',
            outputDir: 'profile_music',
            source: result.source,
            latestFile: result.fileName ? {
                filename: result.fileName,
                url: `/profile_music/${result.fileName}`
            } : null,
            tracks: tracks.map(filename => ({
                filename: filename,
                url: `/profile_music/${filename}`
            }))
        });

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({
            success: false,
            error: 'Download failed',
            details: error.message
        });
    }
});

// Get list of downloaded tracks
app.get('/api/spotify/tracks', async (req, res) => {
    try {
        const downloader = new SpotifyDownloader('profile_music');
        const tracks = await downloader.getDownloadedTracks();
        
        const tracksWithInfo = await Promise.all(
            tracks.map(async (track) => {
                const info = await downloader.getFileInfo(track.filename);
                return {
                    filename: track.filename,
                    url: `/profile_music/${track.filename}`,
                    size: info.sizeInMB + ' MB',
                    created: info.createdAt
                };
            })
        );
        
        res.json({
            success: true,
            tracks: tracksWithInfo,
            count: tracksWithInfo.length
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete Spotify track
app.post('/api/spotify/delete', async (req, res) => {
    const { filename } = req.body;
    
    if (!filename) {
        return res.status(400).json({ success: false, error: 'Filename is required' });
    }
    
    try {
        const downloader = new SpotifyDownloader('profile_music');
        const result = await downloader.deleteTrack(filename);
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== AUDIO ENDPOINTS ==========

// Upload audio file
app.post('/api/audio/upload', upload.single('audioFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }
        
        res.json({
            success: true,
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            path: `/profile_music/${req.file.filename}`
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Download audio from TikTok
app.post('/api/audio/download', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ success: false, error: 'URL is required' });
    }
    
    // Validate it's a TikTok URL
    if (!url.includes('tiktok.com')) {
        return res.status(400).json({ 
            success: false, 
            error: 'Unsupported URL',
            message: 'Only TikTok URLs are supported. Please use a valid TikTok video link.'
        });
    }
    
    try {
        const downloader = new TikTokDownloader('profile_music');
        
        console.log('Starting TikTok download:', url);
        
        const result = await downloader.downloadTikTokAudio(url);
        
        if (result.success) {
            res.json({
                success: true,
                filename: result.filename,
                path: `/profile_music/${result.filename}`,
                message: result.message,
                fileSize: result.fileSizeMB,
                username: result.username
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Download failed',
                message: result.message || 'Unable to download TikTok audio'
            });
        }
    } catch (error) {
        console.error('TikTok Download error:', error);
        
        let errorMsg = error.message;
        
        if (error.message.includes('ENOTFOUND') || error.message.includes('timeout')) {
            errorMsg = 'Connection error - unable to reach TikTok API. Check your internet connection.';
        } else if (error.message.includes('URL TikTok tidak valid')) {
            errorMsg = 'Invalid TikTok URL or video not found. Please check the URL and try again.';
        }
        
        res.status(500).json({
            success: false,
            error: 'Download failed',
            message: errorMsg
        });
    }
});

// List available audio files
app.get('/api/audio/list', async (req, res) => {
    try {
        const musicDir = path.join(__dirname, 'profile_music');
        
        // Create directory if it doesn't exist
        try {
            await fs.access(musicDir);
        } catch {
            await fs.mkdir(musicDir, { recursive: true });
            return res.json({ success: true, files: [] });
        }
        
        // Read all MP3 files in the directory
        const files = await fs.readdir(musicDir);
        const audioFiles = files.filter(f => f.toLowerCase().endsWith('.mp3'));
        
        //console.log(`📂 Found ${audioFiles.length} MP3 files in profile_music/`);
        
        // Get file info with metadata
        const fileList = [];
        for (const filename of audioFiles) {
            const filepath = path.join(musicDir, filename);
            try {
                const stats = await fs.stat(filepath);
                let artist = 'Unknown';
                let title = filename.replace('.mp3', '');
                let contributingArtist = null;
                
                // Parse filename format: "Artist - Title.mp3" (format baru dari Spotify downloader)
                if (filename.includes(' - ')) {
                    const parts = title.split(' - ');
                    if (parts.length >= 2) {
                        artist = parts[0].trim();
                        title = parts.slice(1).join(' - ').trim(); // Handle titles with " - " in them
                    }
                }
                // Fallback: Parse filename format: "Artist_Title.mp3" (format lama)
                else if (filename.includes('_') && !filename.match(/^\d+_/)) {
                    const parts = title.split('_');
                    if (parts.length >= 2) {
                        artist = parts[0];
                        title = parts.slice(1).join(' ');
                    }
                } else if (filename.match(/^\d+_/)) {
                    // Timestamp-based filename, try to extract info differently
                    title = filename.replace(/^\d+_/, '').replace('.mp3', '');
                }
                
                // Try to get additional metadata dari .info.json jika ada
                const infoJsonPath = filepath.replace('.mp3', '.info.json');
                
                try {
                    // Check if .info.json file exists
                    const infoStats = await fs.stat(infoJsonPath);
                    if (infoStats.isFile()) {
                        const infoContent = await fs.readFile(infoJsonPath, 'utf8');
                        const infoData = JSON.parse(infoContent);
                        
                        //console.log(`📄 Found metadata for: ${filename}`);
                        
                        // Get contributing artist dari yt-dlp metadata
                        if (infoData.artist) {
                            //console.log(`   Artist: ${infoData.artist}`);
                            artist = infoData.artist;
                        }
                        if (infoData.title) {
                            //console.log(`   Title: ${infoData.title}`);
                            title = infoData.title.replace(/\s*\[\w+\]\s*$/, '').trim();
                        }
                        // Channel owner / uploader bisa jadi artist lain
                        if (infoData.uploader && infoData.uploader !== artist && infoData.uploader !== 'Unknown Channel') {
                            //console.log(`   Uploader: ${infoData.uploader}`);
                            contributingArtist = infoData.uploader;
                        }
                    }
                } catch (err) {
                    // File doesn't exist or can't be parsed
                    if (err.code !== 'ENOENT') {
                        console.warn(`⚠ Could not read metadata for ${filename}:`, err.message);
                    }
                    // If no .info.json found, the filename parsing above will be used as fallback
                }
                
                const fileData = {
                    filename,
                    title,
                    artist,
                    size: stats.size,
                    uploadedAt: stats.mtime.toISOString(),
                    path: `/profile_music/${filename}`
                };
                
                // Tambahkan contributing artist jika ada
                if (contributingArtist) {
                    fileData.contributingArtist = contributingArtist;
                }
                
                fileList.push(fileData);
            } catch (err) {
                console.error(`Error reading file info for ${filename}:`, err);
            }
        }
        
        // Sort by modification time (newest first)
        fileList.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
        
        console.log(`✅ Returning ${fileList.length} files with metadata`);
        
        res.json({ 
            success: true, 
            files: fileList
        });
    } catch (error) {
        console.error('List audio error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to list audio files',
            details: error.message
        });
    }
});

// Delete profile music file
app.post('/api/audio/delete', async (req, res) => {
    try {
        const { filename } = req.body;
        
        if (!filename) {
            return res.status(400).json({ success: false, error: 'Filename is required' });
        }
        
        // Security: prevent directory traversal
        const filepath = path.join(__dirname, 'profile_music', filename);
        if (!filepath.startsWith(path.join(__dirname, 'profile_music'))) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }
        
        // Check if file exists and delete
        try {
            await fs.unlink(filepath);
            res.json({ success: true, message: 'File deleted successfully' });
        } catch (err) {
            if (err.code === 'ENOENT') {
                // File doesn't exist - that's okay
                res.json({ success: true, message: 'File already deleted or does not exist' });
            } else {
                throw err;
            }
        }
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to delete file',
            details: error.message
        });
    }
});

// Get profile music file
app.get('/profile_music/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const filepath = path.join(__dirname, 'profile_music', filename);
        
        // Security: prevent directory traversal
        if (!filepath.startsWith(path.join(__dirname, 'profile_music'))) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        // Check if file exists
        await fs.access(filepath);
        res.sendFile(filepath);
    } catch (error) {
        res.status(404).json({ error: 'File not found' });
    }
});

// ========== GALLERY ENDPOINTS ==========

// Get memories database file path
const MEMORIES_DB_PATH = './data/memories.json';

// Initialize memories database
async function initializeMemoriesDatabase() {
    try {
        await fs.access(MEMORIES_DB_PATH);
    } catch {
        const initialData = {
            memories: []
        };
        await writeJSON(MEMORIES_DB_PATH, initialData);
        console.log('Memories database initialized');
    }
}

// Helper function to wrap route with multer error handling
function handleMulterError(fn) {
    return (req, res, next) => {
        fn(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                console.error('Multer error:', err.message);
                
                if (err.code === 'FILE_TOO_LARGE') {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'File too large. Maximum file size is 500MB.' 
                    });
                }
                if (err.code === 'LIMIT_FILE_COUNT') {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'Too many files. Please upload fewer files.' 
                    });
                }
                
                return res.status(400).json({ 
                    success: false, 
                    error: 'File upload error: ' + err.message 
                });
            } else if (err) {
                // File filter error
                console.error('File filter error:', err.message);
                return res.status(400).json({ 
                    success: false, 
                    error: err.message 
                });
            }
            next();
        });
    };
}

// Upload video and photo to gallery (handles multiple files)
app.post('/api/gallery/upload', handleMulterError(galleryUpload.any()), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, error: 'No files uploaded' });
        }
        
        const title = req.body.title || 'Untitled';
        const date = req.body.date || new Date().toISOString().split('T')[0];
        const description = req.body.description || '';
        const photoType = req.body.photoType || 'all'; // Get photo type from request
        
        console.log(`📸 Received photoType: ${photoType}`); // Debug log
        console.log(`📁 Received files:`, req.files.map(f => ({ name: f.originalname, mime: f.mimetype, size: f.size })));
        
        const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
        
        let uploadedVideos = [];
        let uploadedPhotos = [];
        let optimizedVersions = {};
        
        // Process each uploaded file
        for (const file of req.files) {
            const ext = path.extname(file.originalname).toLowerCase();
            const isVideo = videoExtensions.includes(ext);
            const isImage = imageExtensions.includes(ext);
            
            if (isVideo) {
                console.log(`📹 Processing video: ${file.filename}`);
                
                try {
                    // Optimize video
                    const videoPath = file.path;
                    const optimizeResult = await videoOptimizer.optimizeVideo(videoPath, file.filename);
                    
                    // Convert optimizedVideos to quality URLs
                    const videoQualityVersions = {};
                    Object.entries(optimizeResult.optimizedVideos).forEach(([quality, videoInfo]) => {
                        if (videoInfo && videoInfo.url) {
                            videoQualityVersions[quality] = videoInfo.url;
                        }
                    });
                    
                    uploadedVideos.push({
                        url: `/OurGallery/${file.filename}`,
                        name: file.originalname,
                        optimized: videoQualityVersions,
                        photoType: photoType  // Add photoType
                    });
                    
                    console.log(`✅ Video optimized: ${file.filename}`);
                } catch (optimizeError) {
                    console.error('Video optimization error:', optimizeError);
                    uploadedVideos.push({
                        url: `/OurGallery/${file.filename}`,
                        name: file.originalname,
                        optimized: null,
                        photoType: photoType  // Add photoType
                    });
                    console.log(`⚠️ Video optimization failed, using original: ${file.filename}`);
                }
            } 
            else if (isImage) {
                console.log(`📷 Processing photo: ${file.filename}`);
                uploadedPhotos.push({
                    url: `/OurGallery/${file.filename}`,
                    name: file.originalname,
                    photoType: photoType  // Add photoType
                });
                console.log(`✅ Photo uploaded: ${file.filename}`);
            }
        }
        
        // Save metadata to database.json
        try {
            const databasePath = path.join(__dirname, 'database.json');
            let database = { galleries: [] };
            
            // Read existing database
            try {
                const data = await fs.readFile(databasePath, 'utf8');
                database = JSON.parse(data);
                if (!database.galleries) {
                    database.galleries = [];
                }
            } catch (err) {
                console.log('Creating new database.json');
            }
            
            // Add uploaded files to galleries
            const galleryEntry = {
                id: Date.now().toString(),
                title: title,
                date: date,
                description: description,
                photoType: photoType,
                videos: uploadedVideos,
                photos: uploadedPhotos,
                uploadedAt: new Date().toISOString()
            };
            
            database.galleries.push(galleryEntry);
            
            // Write back to database
            await fs.writeFile(databasePath, JSON.stringify(database, null, 2));
            console.log(`💾 Saved metadata for photoType: ${photoType}`);
        } catch (dbError) {
            console.error('Error saving metadata:', dbError);
            // Don't fail the upload, just log the error
        }
        
        // Prepare response
        const response = {
            success: true,
            title: title,
            date: date,
            description: description,
            photoType: photoType, 
            videos: uploadedVideos,
            photos: uploadedPhotos,
            videoCount: uploadedVideos.length,
            photoCount: uploadedPhotos.length
        };
        
        console.log('📤 Gallery upload response:', response);
        
        res.json(response);
        
    } catch (error) {
        console.error('Gallery upload error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// OLD: Single file upload endpoint (kept for backward compatibility)
app.post('/api/gallery/upload-single', handleMulterError(galleryUpload.single('file')), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }
        
        // Check if it's a video file
        const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
        const ext = path.extname(req.file.originalname).toLowerCase();
        const isVideo = videoExtensions.includes(ext);
        
        if (isVideo) {
            console.log(`Optimizing video: ${req.file.filename}`);
            
            try {
                // Optimize video dengan H.264/AAC encoding
                const videoPath = req.file.path;
                const optimizeResult = await videoOptimizer.optimizeVideo(videoPath, req.file.filename);
                
                // Convert optimizedVideos object to quality URLs map
                const optimizedVersions = {};
                Object.entries(optimizeResult.optimizedVideos).forEach(([quality, videoInfo]) => {
                    if (videoInfo && videoInfo.url) {
                        optimizedVersions[quality] = videoInfo.url;
                    }
                });
                
                // Return dengan optimized versions URLs
                res.json({
                    success: true,
                    filename: req.file.filename,
                    originalName: req.file.originalname,
                    size: req.file.size,
                    path: `/OurGallery/${req.file.filename}`,
                    url: `/OurGallery/${req.file.filename}`,
                    isVideo: true,
                    optimized: true,
                    optimizedVersions: optimizedVersions,
                    duration: optimizeResult.duration,
                    timestamp: optimizeResult.timestamp
                });
            } catch (optimizeError) {
                console.error('Video optimization error:', optimizeError);
                
                // If optimization fails, return original file
                res.json({
                    success: true,
                    filename: req.file.filename,
                    originalName: req.file.originalname,
                    size: req.file.size,
                    path: `/OurGallery/${req.file.filename}`,
                    url: `/OurGallery/${req.file.filename}`,
                    isVideo: true,
                    optimized: false,
                    warning: 'Video optimization failed, using original file',
                    error: optimizeError.message
                });
            }
        } else {
            // For non-video files (images, etc)
            res.json({
                success: true,
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
                path: `/OurGallery/${req.file.filename}`,
                url: `/OurGallery/${req.file.filename}`,
                isVideo: false
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete gallery file (image or video)
app.delete('/api/gallery/file', async (req, res) => {
    try {
        const { filename, type } = req.body;
        
        if (!filename) {
            return res.status(400).json({ success: false, error: 'Filename is required' });
        }
        
        const filepath = path.join(__dirname, 'OurGallery', filename);
        
        // Security: prevent directory traversal
        if (!filepath.startsWith(path.join(__dirname, 'OurGallery'))) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }
        
        // Check if file exists and delete
        try {
            await fs.unlink(filepath);
            console.log(`🗑️ Deleted ${type}: ${filename}`);
            
            res.json({ 
                success: true, 
                message: `${type} deleted successfully` 
            });
        } catch (err) {
            if (err.code === 'ENOENT') {
                // File doesn't exist - that's okay
                res.json({ 
                    success: true, 
                    message: 'File already deleted or does not exist' 
                });
            } else {
                throw err;
            }
        }
    } catch (error) {
        console.error('Delete file error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to delete file',
            details: error.message
        });
    }
});

// Get all images from OurGallery folder
app.get('/api/gallery/images', async (req, res) => {
    try {
        const galleryDir = path.join(__dirname, 'OurGallery');
        
        // Create directory if it doesn't exist
        try {
            await fs.access(galleryDir);
        } catch {
            await fs.mkdir(galleryDir, { recursive: true });
            return res.json({ success: true, images: [], count: 0 });
        }
        
        // Read all image files in the directory
        const files = await fs.readdir(galleryDir);
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
        const imageFiles = files.filter(f => {
            const ext = path.extname(f).toLowerCase();
            return imageExtensions.includes(ext);
        });
        
        // Load gallery metadata from database.json
        let galleryMetadata = {};
        try {
            const databasePath = path.join(__dirname, 'database.json');
            const data = await fs.readFile(databasePath, 'utf8');
            const database = JSON.parse(data);
            
            if (database.galleries && Array.isArray(database.galleries)) {
                // Create a map of filename -> photoType from uploaded photos
                database.galleries.forEach(gallery => {
                    if (gallery.photos && Array.isArray(gallery.photos)) {
                        gallery.photos.forEach(photo => {
                            // Extract filename from URL or name
                            const filename = photo.url ? photo.url.split('/').pop() : photo.name;
                            galleryMetadata[filename] = {
                                photoType: gallery.photoType || 'all',
                                uploadedAt: gallery.uploadedAt
                            };
                        });
                    }
                });
            }
            console.log(`📚 Loaded metadata for ${Object.keys(galleryMetadata).length} images`);
        } catch (err) {
            console.warn('Could not load gallery metadata:', err.message);
        }
        
        // Sort by modification time (newest first)
        const images = [];
        for (const filename of imageFiles) {
            const filepath = path.join(galleryDir, filename);
            try {
                const stats = await fs.stat(filepath);
                
                const metadata = galleryMetadata[filename] || { photoType: 'all', uploadedAt: stats.mtime.toISOString() };
                
                images.push({
                    name: filename.replace(/^\d+_/, '').replace(/\.[^/.]+$/, ''),
                    filename: filename,
                    url: `/OurGallery/${filename}`,
                    size: stats.size,
                    uploadedAt: stats.mtime.toISOString(),
                    isImage: true,
                    photoType: metadata.photoType  // Add photoType from metadata
                });
            } catch (err) {
                console.error(`Error reading file info for ${filename}:`, err);
            }
        }
        
        // Sort by modification time (newest first)
        images.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
        
        console.log(`✅ Returning ${images.length} images with photoType`);
        
        res.json({
            success: true,
            images: images,
            count: images.length
        });
    } catch (error) {
        console.error('List images error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to list images',
            details: error.message
        });
    }
});

// Get all videos from OurGallery folder
app.get('/api/gallery/videos', async (req, res) => {
    try {
        const galleryDir = path.join(__dirname, 'OurGallery');
        
        // Create directory if it doesn't exist
        try {
            await fs.access(galleryDir);
        } catch {
            await fs.mkdir(galleryDir, { recursive: true });
            return res.json({ success: true, videos: [] });
        }
        
        // Read all video files in the directory
        const files = await fs.readdir(galleryDir);
        const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
        const videoFiles = files.filter(f => {
            const ext = path.extname(f).toLowerCase();
            return videoExtensions.includes(ext);
        });
        
        // Sort by modification time (newest first)
        const videos = [];
        for (const filename of videoFiles) {
            const filepath = path.join(galleryDir, filename);
            try {
                const stats = await fs.stat(filepath);
                
                // Hash file content (same way as videoOptimizer does)
                const fileBuffer = await fs.readFile(filepath);
                const hashSum = require('crypto').createHash('md5');
                hashSum.update(fileBuffer);
                const fileHash = hashSum.digest('hex');
                
                const optimizedDir = path.join(__dirname, 'OurGallery', 'optimized');
                const optimizedVersions = {};
                let hasValidOptimized = false;
                
                try {
                    // List all files in optimized directory
                    const optimizedFiles = await fs.readdir(optimizedDir);
                    
                    // Find optimized versions matching this video's hash
                    const qualities = ['auto', '720p', '480p', '360p'];
                    
                    for (const quality of qualities) {
                        const optimizedFilename = `${fileHash}_${quality}.mp4`;
                        const optimizedFile = path.join(optimizedDir, optimizedFilename);
                        
                        try {
                            await fs.access(optimizedFile);
                            optimizedVersions[quality] = `/OurGallery/optimized/${optimizedFilename}`;
                            if (quality === 'auto' || quality === '720p') hasValidOptimized = true;
                            //console.log(`✅ Found optimized: ${optimizedFilename}`);
                        } catch {
                            // Optimized version not found for this quality
                        }
                    }
                } catch (e) {
                    // No optimized directory or error reading it
                    console.log(`No optimized directory for ${filename}`);
                }
                
                // Only include video if it has optimized versions OR if file is valid
                // (Optimized versions are more reliable)
                if (Object.keys(optimizedVersions).length > 0 || stats.size > 0) {
                    videos.push({
                        name: filename.replace(/^\d+_/, '').replace(/\.[^/.]+$/, ''),
                        filename: filename,
                        url: `/OurGallery/${filename}`,
                        size: stats.size,
                        uploadedAt: stats.mtime.toISOString(),
                        isVideo: true,
                        optimizedVersions: Object.keys(optimizedVersions).length > 0 ? optimizedVersions : null,
                        hasOptimized: hasValidOptimized
                    });
                }
            } catch (err) {
                console.error(`Error reading file info for ${filename}:`, err);
            }
        }
        
        // Sort by modification time (newest first)
        videos.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
        
        res.json({
            success: true,
            videos: videos,
            count: videos.length
        });
    } catch (error) {
        console.error('List videos error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to list videos',
            details: error.message
        });
    }
});

// Get all memories
app.get('/api/gallery/memories', async (req, res) => {
    try {
        const database = await readJSON(MEMORIES_DB_PATH);
        
        res.json({
            success: true,
            memories: database.memories || [],
            count: (database.memories || []).length
        });
    } catch (error) {
        console.error('Get memories error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get memories',
            details: error.message
        });
    }
});

// Add new memory
app.post('/api/gallery/memory', async (req, res) => {
    try {
        const { title, description, filePath, fileType, size } = req.body;
        
        if (!title || !filePath) {
            return res.status(400).json({
                success: false,
                error: 'Title and filePath are required'
            });
        }
        
        const database = await readJSON(MEMORIES_DB_PATH);
        
        const newMemory = {
            id: database.memories.length,
            title,
            description: description || '',
            filePath,
            fileType: fileType || 'image',
            size: size || 'medium',
            uploadedAt: new Date().toISOString()
        };
        
        database.memories.push(newMemory);
        
        const success = await writeJSON(MEMORIES_DB_PATH, database);
        
        if (success) {
            res.json({
                success: true,
                memory: newMemory,
                message: 'Memory added successfully'
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to save memory'
            });
        }
    } catch (error) {
        console.error('Add memory error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add memory',
            details: error.message
        });
    }
});

// Delete memory
app.delete('/api/gallery/memory/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const database = await readJSON(MEMORIES_DB_PATH);
        
        const memoryIndex = database.memories.findIndex(m => m.id === parseInt(id));
        
        if (memoryIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Memory not found'
            });
        }
        
        const deletedMemory = database.memories[memoryIndex];
        database.memories.splice(memoryIndex, 1);
        
        // Try to delete the file
        try {
            const filepath = path.join(__dirname, deletedMemory.filePath.replace(/^\//, ''));
            await fs.unlink(filepath);
        } catch (err) {
            console.warn(`Could not delete file ${deletedMemory.filePath}:`, err.message);
        }
        
        const success = await writeJSON(MEMORIES_DB_PATH, database);
        
        if (success) {
            res.json({
                success: true,
                message: 'Memory deleted successfully'
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to delete memory'
            });
        }
    } catch (error) {
        console.error('Delete memory error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete memory',
            details: error.message
        });
    }
});

// Get gallery file (image or video)
app.get('/OurGallery/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const filepath = path.join(__dirname, 'OurGallery', filename);
        
        // Security: prevent directory traversal
        if (!filepath.startsWith(path.join(__dirname, 'OurGallery'))) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        // Check if file exists
        await fs.access(filepath);
        res.sendFile(filepath);
    } catch (error) {
        res.status(404).json({ error: 'File not found' });
    }
});

// Serve optimized videos
app.get('/OurGallery/optimized/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const filepath = path.join(__dirname, 'OurGallery', 'optimized', filename);
        
        // Security: prevent directory traversal
        if (!filepath.startsWith(path.join(__dirname, 'OurGallery', 'optimized'))) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        // Check if file exists
        await fs.access(filepath);
        
        // Set appropriate headers for video streaming
        const stat = await fs.stat(filepath);
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Length', stat.size);
        res.setHeader('Accept-Ranges', 'bytes');
        
        res.sendFile(filepath);
    } catch (error) {
        res.status(404).json({ error: 'Optimized file not found' });
    }
});



// POST endpoint untuk save lirik
app.post('/api/lyrics/save', async (req, res) => {
    try {
        // Support both old format (filename + transcription) dan new format (studentId + transcription)
        const { filename, studentId, transcription } = req.body;

        if (!transcription) {
            return res.status(400).json({
                success: false,
                error: 'transcription is required'
            });
        }

        const fileKey = studentId || filename;
        if (!fileKey) {
            return res.status(400).json({
                success: false,
                error: 'studentId or filename is required'
            });
        }

        // Buat folder profile_lyrics jika belum ada
        const lyricsDir = path.join(__dirname, 'profile_lyrics');
        await fs.mkdir(lyricsDir, { recursive: true });

        // Simpan lirik dengan format JSON
        const lyricsPath = path.join(lyricsDir, `${fileKey}_lyrics.json`);
        const lyricsData = {
            studentId: studentId || filename,
            transcription: transcription,
            savedAt: new Date().toISOString()
        };

        await fs.writeFile(lyricsPath, JSON.stringify(lyricsData, null, 2));

        console.log(`💾 Lyrics saved: ${lyricsPath}`);

        res.json({
            success: true,
            message: 'Lyrics saved successfully',
            path: `/profile_lyrics/${fileKey}_lyrics.json`
        });

    } catch (error) {
        console.error('Error saving lyrics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save lyrics: ' + error.message
        });
    }
});

// GET endpoint untuk load lirik
app.get('/api/lyrics/load', async (req, res) => {
    try {
        const { filename } = req.query;

        if (!filename) {
            return res.status(400).json({
                success: false,
                error: 'filename is required'
            });
        }

        const lyricsPath = path.join(__dirname, 'profile_lyrics', `${filename}.json`);

        // Baca file lirik
        const lyricsData = JSON.parse(await fs.readFile(lyricsPath, 'utf8'));

        res.json({
            success: true,
            transcription: lyricsData.transcription
        });

    } catch (error) {
        res.status(404).json({
            success: false,
            error: 'Lyrics not found: ' + error.message
        });
    }
});

// GET endpoint untuk list lirik yang tersimpan
app.get('/api/lyrics/list', async (req, res) => {
    try {
        const lyricsDir = path.join(__dirname, 'profile_lyrics');

        // Create directory jika belum ada
        await fs.mkdir(lyricsDir, { recursive: true });

        // List semua file JSON
        const files = await fs.readdir(lyricsDir);
        const jsonFiles = files.filter(f => f.endsWith('.json'));

        res.json({
            success: true,
            lyrics: jsonFiles,
            count: jsonFiles.length
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to list lyrics: ' + error.message
        });
    }
});





// GET endpoint untuk load lyrics dari profile
app.get('/api/transcribe/lyrics/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        const lyricsPath = path.join(__dirname, 'profile_lyrics', `${studentId}_lyrics.json`);

        // Check if file exists
        try {
            await fs.access(lyricsPath);
        } catch {
            return res.status(404).json({
                success: false,
                error: 'Lyrics not found for this student'
            });
        }

        const fileData = JSON.parse(await fs.readFile(lyricsPath, 'utf8'));
        
        // Extract transcription from file structure
        const transcription = fileData.transcription || fileData;

        res.json({
            success: true,
            transcription: transcription
        });

    } catch (error) {
        console.error('Error loading lyrics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load lyrics: ' + error.message
        });
    }
});

// ========== LYRICS SEARCH ENDPOINT ==========

/**
 * Search lyrics dari AI API (Qwen + OpenAI)
 * Menggunakan LyricsScraper dengan AI API Fetcher
 * Dengan caching untuk performance
 */
// DEPRECATED: LRCLIB endpoint removed - replaced with AI API
// DEPRECATED: AZLyrics scraping removed - replaced with AI API (Qwen + OpenAI)

/**
 * Search lyrics endpoint - uses AI API (Qwen Primary, OpenAI Secondary)
 * Qwen and OpenAI provide comprehensive lyrics search with automatic timestamp generation
 */
app.post('/api/lyrics/search', async (req, res) => {
    try {
        const { title, artist } = req.body;

        if (!title) {
            return res.status(400).json({
                success: false,
                error: 'Song title is required'
            });
        }

        console.log(`🎵 Searching lyrics for: "${title}" by "${artist || 'Unknown'}"`);

        // Use LyricsScraper (AI API with Qwen + OpenAI)
        const segments = await lyricsScraper.searchLyrics(artist || '', title);

        if (segments && segments.length > 0) {
            const fullText = segments.map(s => s.text).join('\n');
            
            console.log(`✅ Found lyrics (${segments.length} segments)`);
            
            return res.json({
                success: true,
                title: title,
                artist: artist || 'Unknown',
                lyrics: fullText,
                segments: segments,
                source: 'azlyrics-gemini-timestamps',
                message: `Found ${segments.length} lyrics segments with Gemini-corrected timestamps`
            });
        }

        // If not found from any source
        res.json({
            success: false,
            message: 'Lyrics not found from any source',
            recommendation: 'Try different artist/title or use Whisper audio transcription',
            tips: [
                'Make sure artist and song title are correct',
                'AZLyrics works with most popular songs',
                'Timestamps are corrected and analyzed using Gemini API'
            ]
        });

    } catch (error) {
        console.error('Lyrics search error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search lyrics: ' + error.message
        });
    }
});

// ========== ADMIN TRACKING SYSTEM ==========

// In-memory tracking data
const trackingData = {
    pageVisits: {},      // Store visit counts per profile
    ipAccess: [],        // Store realtime IP access logs
    loginHistory: [],    // Store login history
    profileUpdates: {},  // Store update counts per profile
    accessTimeline: {}   // Store hourly access counts
};

// Load tracking data from adminbase.json on startup
async function loadTrackingData() {
    try {
        const data = await readJSON(ADMIN_TRACKING_PATH);
        if (data) {
            trackingData.pageVisits = data.pageVisits || {};
            trackingData.loginHistory = data.loginHistory || [];
            trackingData.profileUpdates = data.profileUpdates || {};
            trackingData.accessTimeline = data.accessTimeline || {};
            console.log('📊 Tracking data loaded from adminbase.json');
        }
    } catch (error) {
        console.log('📝 Creating new adminbase.json for tracking data');
    }
}

// Save tracking data to adminbase.json
async function saveTrackingData() {
    try {
        const studentsNames = await readJSON(STUDENTS_PATH);
        
        // Build profile stats
        const profileStats = studentsNames.map(student => ({
            id: student.id,
            name: student.name,
            visits: trackingData.pageVisits[student.id] || 0,
            updates: trackingData.profileUpdates[student.id] || 0,
            lastVisit: new Date().toISOString()
        }));
        
        // Build top profiles
        const topProfiles = profileStats
            .sort((a, b) => b.visits - a.visits)
            .slice(0, 5);
        
        // Calculate summary
        const totalVisits = Object.values(trackingData.pageVisits).reduce((a, b) => a + b, 0);
        const totalUpdates = Object.values(trackingData.profileUpdates).reduce((a, b) => a + b, 0);
        const uniqueIPs = new Set(trackingData.ipAccess.map(log => log.address)).size;
        
        const adminData = {
            profileStats: profileStats,
            topProfiles: topProfiles,
            loginHistory: trackingData.loginHistory.slice(-50), // Keep last 50
            accessTimeline: trackingData.accessTimeline,
            pageVisits: trackingData.pageVisits,
            profileUpdates: trackingData.profileUpdates,
            summary: {
                totalVisits: totalVisits,
                totalUpdates: totalUpdates,
                uniqueIPs: uniqueIPs,
                totalLogins: trackingData.loginHistory.length,
                lastUpdated: new Date().toISOString()
            }
        };
        
        await writeJSON(ADMIN_TRACKING_PATH, adminData);
    } catch (error) {
        console.error('Error saving tracking data:', error);
    }
}

// Save tracking data every 30 seconds
setInterval(saveTrackingData, 30000);

// Track access middleware
app.use((req, res, next) => {
    // Get IP address
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const page = req.path;
    
    // Track access
    if (page.includes('/api/')) {
        trackingData.ipAccess.push({
            address: ip,
            page: page,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 100 entries
        if (trackingData.ipAccess.length > 100) {
            trackingData.ipAccess.shift();
        }
        
        // Track hourly timeline
        const now = new Date();
        const hour = now.getHours().toString().padStart(2, '0');
        trackingData.accessTimeline[hour] = (trackingData.accessTimeline[hour] || 0) + 1;
    }
    
    next();
});

// Track profile visits
function trackProfileVisit(profileId) {
    if (!trackingData.pageVisits[profileId]) {
        trackingData.pageVisits[profileId] = 0;
    }
    trackingData.pageVisits[profileId]++;
}

// Track login
function trackLogin(userId, type, name) {
    trackingData.loginHistory.push({
        userId: userId,
        type: type,
        name: name,
        timestamp: new Date().toISOString()
    });
    
    // Keep only last 50 entries
    if (trackingData.loginHistory.length > 50) {
        trackingData.loginHistory.shift();
    }
}

// Track profile update
function trackProfileUpdate(profileId) {
    if (!trackingData.profileUpdates[profileId]) {
        trackingData.profileUpdates[profileId] = 0;
    }
    trackingData.profileUpdates[profileId]++;
}

// ========== TRACKING ENDPOINTS ==========

// Get profile statistics
app.get('/api/admin/stats/profiles', async (req, res) => {
    try {
        const adminData = await readJSON(ADMIN_TRACKING_PATH);
        
        res.json({
            success: true,
            profiles: adminData.profileStats || []
        });
    } catch (error) {
        res.json({
            success: false,
            profiles: []
        });
    }
});

// Get summary statistics
app.get('/api/admin/stats/summary', async (req, res) => {
    try {
        const adminData = await readJSON(ADMIN_TRACKING_PATH);
        
        res.json({
            success: true,
            totalVisits: adminData.summary?.totalVisits || 0,
            totalUpdates: adminData.summary?.totalUpdates || 0,
            uniqueIPs: adminData.summary?.uniqueIPs || 0,
            logins: adminData.summary?.totalLogins || 0
        });
    } catch (error) {
        res.json({
            success: false,
            totalVisits: 0,
            totalUpdates: 0,
            uniqueIPs: 0,
            logins: 0
        });
    }
});

// Get top visited profiles
app.get('/api/admin/stats/top-profiles', async (req, res) => {
    try {
        const adminData = await readJSON(ADMIN_TRACKING_PATH);
        
        res.json({
            success: true,
            profiles: adminData.topProfiles || []
        });
    } catch (error) {
        res.json({
            success: false,
            profiles: []
        });
    }
});

// Get realtime IP access
app.get('/api/admin/access/realtime', (req, res) => {
    const recentIPs = trackingData.ipAccess.slice(-20).reverse();
    
    res.json({
        success: true,
        ips: recentIPs,
        count: trackingData.ipAccess.length
    });
});

// Get login history
app.get('/api/admin/stats/login-history', async (req, res) => {
    try {
        const adminData = await readJSON(ADMIN_TRACKING_PATH);
        const history = (adminData.loginHistory || []).slice(-10).reverse();
        
        res.json({
            success: true,
            logins: history,
            count: history.length
        });
    } catch (error) {
        res.json({
            success: false,
            logins: [],
            count: 0
        });
    }
});

// Get access timeline (hourly)
app.get('/api/admin/stats/timeline', async (req, res) => {
    try {
        const adminData = await readJSON(ADMIN_TRACKING_PATH);
        
        res.json({
            success: true,
            timeline: adminData.accessTimeline || {}
        });
    } catch (error) {
        res.json({
            success: false,
            timeline: {}
        });
    }
});

// Health check endpoint untuk bandwidth monitoring
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        server: 'Yearbook API'
    });
});

app.head('/api/health', (req, res) => {
    res.status(200).end();
});

// ========== ADMIN BASE CONTROL ENDPOINTS ==========

// Force save tracking data to adminbase.json
app.post('/api/admin/save', async (req, res) => {
    try {
        await saveTrackingData();
        
        const adminData = await readJSON(ADMIN_TRACKING_PATH);
        
        res.json({
            success: true,
            message: 'Tracking data saved successfully',
            timestamp: new Date().toISOString(),
            summary: adminData.summary
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to save tracking data',
            message: error.message
        });
    }
});

// Get all admin data from adminbase.json
app.get('/api/admin/data', async (req, res) => {
    try {
        const adminData = await readJSON(ADMIN_TRACKING_PATH);
        
        res.json({
            success: true,
            data: adminData,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to load admin data',
            message: error.message
        });
    }
});

// Reset tracking data
app.post('/api/admin/reset', async (req, res) => {
    try {
        trackingData.pageVisits = {};
        trackingData.profileUpdates = {};
        trackingData.loginHistory = [];
        trackingData.accessTimeline = {};
        trackingData.ipAccess = [];
        
        await saveTrackingData();
        
        res.json({
            success: true,
            message: 'Tracking data reset successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to reset tracking data',
            message: error.message
        });
    }
});

// Helper function untuk read sync
function readJSONSync(filePath) {
    try {
        const data = fsSync.readFileSync(filePath, 'utf8');
        if (!data || data.trim() === '') {
            if (filePath === DB_PATH) {
                return { students: [], teachers: [] };
            }
            return [];
        }
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        if (filePath === DB_PATH) {
            return { students: [], teachers: [] };
        }
        return null;
    }
}

// ========== 404 FALLBACK HANDLER ==========
// Fallback untuk route yang tidak ditemukan - redirect ke home
app.use((req, res) => {
    // Log 404 request
// ============================================
// CACHE & RATE LIMIT ENDPOINTS (Music Downloader)
// ============================================

/**
 * GET /api/cache/stats - Get metadata cache statistics
 * Shows how many tracks are cached and total cache size
 */
app.get('/api/cache/stats', async (req, res) => {
    try {
        const stats = await musicDownloader.getCacheStats();
        res.json({
            success: true,
            cache: stats,
            message: `${stats.totalTracks} tracks cached (${stats.totalSizeMB} MB)`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get cache stats',
            details: error.message
        });
    }
});

/**
 * POST /api/cache/clear - Clear all metadata cache
 * WARNING: This will clear all cached metadata
 */
app.post('/api/cache/clear', async (req, res) => {
    try {
        const result = await musicDownloader.clearCache();
        if (result) {
            res.json({
                success: true,
                message: 'Cache cleared successfully'
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to clear cache'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to clear cache',
            details: error.message
        });
    }
});

/**
 * GET /api/rate-limit/status - Get rate limit status
 * Check jika sedang rate limited dan berapa lama harus tunggu
 */
app.get('/api/rate-limit/status', async (req, res) => {
    try {
        const status = musicDownloader.getRateLimitStatus();
        res.json({
            success: true,
            rateLimit: status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get rate limit status',
            details: error.message
        });
    }
});

// ============================================
// LEGACY SDK ROUTES (Keep for backward compatibility)
// ============================================


    
    // Jika adalah request untuk file/resource (bukan HTML), return 404
    if (req.path.includes('.') || req.path.startsWith('/api/')) {
        return res.status(404).json({ 
            success: false, 
            error: 'Not Found',
            message: 'The requested resource was not found',
            path: req.path
        });
    }
    
    // Untuk HTML route yang tidak ada, redirect ke home (index.html)
    console.log(`📍 Redirecting ${req.path} → /`);
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
initializeDatabase().then(() => {
    initializeMemoriesDatabase().then(() => {
        loadTrackingData().then(() => {
            app.listen(PORT, () => {
                console.log(`Server running on http://localhost:${PORT}`);
                console.log('Yearbook application is ready!');
                console.log('📊 Admin tracking system initialized');

                // ========== AUTO LYRICS GENERATION CYCLE ==========
                console.log('🎵 Starting auto lyrics generation cycle (every 5 minutes)');
                
                let isLyricsCycleRunning = false;

                async function autoLyricsGenerationCycle() {
                    if (isLyricsCycleRunning) {
                        console.log('⏭️ Auto lyrics cycle already running, skipping...');
                        return;
                    }

                    isLyricsCycleRunning = true;
                    console.log('🔄 Auto lyrics cycle started...');

                    try {
                        const database = await readJSON(DB_PATH);
                        if (!database || !database.students || database.students.length === 0) {
                            console.log('📭 No students in database, skipping lyrics cycle');
                            return;
                        }

                        let generated = 0;
                        let skipped = 0;
                        let noInfo = 0;

                        for (const student of database.students) {
                            // Skip if student already has lyrics
                            if (student.studentLyrics) {
                                skipped++;
                                continue;
                            }

                            // Determine artist and title
                            let artist = student.lyricsArtistName || null;
                            let title = student.lyricsSongTitle || null;

                            // Fallback: try to extract from audioFile filename
                            if ((!artist || !title) && student.audioFile) {
                                const filename = student.audioFile.split('/').pop();
                                // Try pattern: "Artist - Title" or "timestamp_Artist - Title.ext"
                                const cleanName = filename.replace(/^\d+_/, '').replace(/\.[^.]+$/, '').replace(/\s*\[.*?\]\s*/g, '');
                                const parts = cleanName.split(' - ');
                                if (parts.length >= 2) {
                                    artist = artist || parts[0].trim();
                                    title = title || parts.slice(1).join(' - ').trim();
                                }
                            }

                            // Skip if no artist/title info available
                            if (!artist || !title) {
                                noInfo++;
                                continue;
                            }

                            // Generate lyrics for this student
                            console.log(`🎵 Auto-generating lyrics for student ${student.id}: "${title}" by "${artist}"`);

                            try {
                                const lyrics = await lyricsFetcher.searchLyrics(artist, title);

                                if (lyrics && lyrics.length >= 50) {
                                    // Save lyrics to database
                                    const freshDb = await readJSON(DB_PATH);
                                    const idx = freshDb.students.findIndex(s => s.id === student.id);
                                    if (idx >= 0) {
                                        freshDb.students[idx].studentLyrics = lyrics;
                                        freshDb.students[idx].lyricsGeneratedFrom = 'auto-qwen-3prompt';
                                        freshDb.students[idx].lyricsUpdatedAt = new Date().toISOString();
                                        await writeJSON(DB_PATH, freshDb);
                                        generated++;
                                        console.log(`✅ Lyrics saved for student ${student.id} (${lyrics.length} chars)`);
                                    }
                                } else {
                                    console.log(`⚠️ No valid lyrics found for student ${student.id}`);
                                }
                            } catch (err) {
                                console.error(`❌ Error generating lyrics for student ${student.id}:`, err.message);
                            }

                            // Process ONE student at a time - rate limiter handles 1~2 min jeda
                            // Additional 5s buffer for safety
                            await new Promise(resolve => setTimeout(resolve, 5000));
                        }

                        console.log(`🎵 Auto lyrics cycle complete: ${generated} generated, ${skipped} already have lyrics, ${noInfo} no artist/title info`);

                    } catch (error) {
                        console.error('❌ Auto lyrics cycle error:', error.message);
                    } finally {
                        isLyricsCycleRunning = false;
                    }
                }

                // Run first cycle after 60 seconds (let server fully start)
                setTimeout(() => {
                    autoLyricsGenerationCycle();
                }, 60000);

                // Then run every 5 minutes (300000ms)
                setInterval(() => {
                    autoLyricsGenerationCycle();
                }, 300000);
            });
        });
    });
});