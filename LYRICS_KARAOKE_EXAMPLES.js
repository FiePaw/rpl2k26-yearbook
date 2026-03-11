/**
 * LYRICS KARAOKE - EXAMPLE USAGE
 * Demonstrasi penggunaan WhisperTranscriber dan LyricsKaraoke
 */

// ============================================
// EXAMPLE 1: Basic Usage (Auto)
// ============================================

// Semua auto-integrated di profile.js
// User hanya perlu:
// 1. Upload audio → Click "Generate Lyrics"
// 2. Lirik auto-muncul dan tersinkron
// 3. Done! ✨

// ============================================
// EXAMPLE 2: Manual Integration (Advanced)
// ============================================

// Create Whisper transcriber
const transcriber = new WhisperTranscriber('http://13.215.61.92:5000');

// Create Lyrics Karaoke display
const karaoke = new LyricsKaraoke('.lyrics-container', '#audio-player');

// Load and transcribe audio file
async function setupKaraoke(audioFile) {
    try {
        // Show loading
        console.log('🎵 Starting transcription...');
        
        // Transcribe with progress callback
        const result = await transcriber.transcribeAudio(
            audioFile, 
            'id',  // Indonesian
            (progress) => {
                console.log(`📊 ${progress.status}: ${progress.message}`);
            }
        );
        
        console.log('✅ Transcription result:', result);
        // Result format:
        // {
        //   text: "full lyrics text...",
        //   segments: [
        //     {text: "lirik 1", start: 0.5, end: 2.3},
        //     {text: "lirik 2", start: 2.4, end: 4.1}
        //   ],
        //   language: "id",
        //   timestamp: "2024-11-19T..."
        // }
        
        // Save for future use
        await transcriber.saveTranscription('student_123', result);
        
        // Display in karaoke
        karaoke.loadLyrics(result, {
            autoScroll: true,
            highlight: true
        });
        
        console.log('🎤 Karaoke ready!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// ============================================
// EXAMPLE 3: Load Previously Transcribed Lirik
// ============================================

async function loadExistingLyrics(studentId) {
    // Load dari server cache
    const result = await transcriber.loadTranscription(studentId);
    
    if (result) {
        karaoke.loadLyrics(result);
        console.log('✅ Loaded cached lyrics');
    } else {
        console.log('No cached lyrics found');
    }
}

// ============================================
// EXAMPLE 4: Export Lirik ke berbagai format
// ============================================

async function exportLyrics(transcriptionResult) {
    // Export ke LRC format (untuk player lain)
    const lrcContent = transcriber.formatToLRC(transcriptionResult);
    console.log('LRC Format:\n', lrcContent);
    // Output:
    // [00:00.50] lirik baris pertama
    // [00:02.40] lirik baris kedua
    // [00:04.10] lirik baris ketiga
    
    // Export ke SRT format (subtitle)
    const srtContent = transcriber.formatToSRT(transcriptionResult);
    console.log('SRT Format:\n', srtContent);
    // Output:
    // 1
    // 00:00:00,500 --> 00:00:02,300
    // lirik baris pertama
    //
    // 2
    // 00:00:02,400 --> 00:00:04,100
    // lirik baris kedua
    
    // Get full text
    const fullText = transcriptionResult.text;
    console.log('Full Text:', fullText);
}

// ============================================
// EXAMPLE 5: Real-time Lirik Sync Events
// ============================================

// Setup event listeners untuk sync updates
document.addEventListener('DOMContentLoaded', () => {
    const audioPlayer = document.getElementById('audio-player');
    const lyricsDisplay = document.getElementById('lyrics-display');
    
    if (audioPlayer && lyricsDisplay) {
        // Monitor lirik changes
        audioPlayer.addEventListener('timeupdate', () => {
            const currentLyric = karaoke.getCurrentLyric();
            if (currentLyric) {
                console.log('🎵 Now: ' + currentLyric);
                // Bisa trigger UI effects di sini
            }
        });
        
        // Auto-save progress (optional)
        audioPlayer.addEventListener('play', () => {
            console.log('▶️ Audio started');
        });
        
        audioPlayer.addEventListener('pause', () => {
            console.log('⏸️ Audio paused');
        });
        
        audioPlayer.addEventListener('ended', () => {
            console.log('✅ Audio finished');
            // Show summary atau save progress
        });
    }
});

// ============================================
// EXAMPLE 6: Advanced - Lirik Search & Filter
// ============================================

function searchLyrics(query, transcriptionResult) {
    const matches = [];
    
    transcriptionResult.segments.forEach((segment, index) => {
        if (segment.text.toLowerCase().includes(query.toLowerCase())) {
            matches.push({
                index,
                text: segment.text,
                time: segment.start
            });
        }
    });
    
    return matches;
}

// Usage:
const results = searchLyrics('cinta', transcriptionResult);
results.forEach(match => {
    console.log(`Found at ${match.time}s: "${match.text}"`);
});

// ============================================
// EXAMPLE 7: Error Handling Best Practices
// ============================================

async function robustTranscription(audioFile) {
    try {
        // Check Whisper availability first
        const available = await transcriber.checkWhisperAvailability();
        
        if (!available) {
            throw new Error('Whisper not available on server');
        }
        
        // Validate file
        if (!audioFile) {
            throw new Error('Audio file required');
        }
        
        if (audioFile.size > 100 * 1024 * 1024) {
            throw new Error('File size exceeds 100MB limit');
        }
        
        // Supported formats
        const supportedFormats = [
            'audio/mpeg', 'audio/wav', 'audio/m4a', 
            'audio/ogg', 'audio/flac', 'video/mp4'
        ];
        
        if (!supportedFormats.includes(audioFile.type)) {
            throw new Error(`Unsupported format: ${audioFile.type}`);
        }
        
        // Proceed with transcription
        const result = await transcriber.transcribeAudio(audioFile, 'id');
        
        // Validate result
        if (!result.segments || result.segments.length === 0) {
            throw new Error('No text extracted from audio');
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ Transcription failed:');
        console.error('   Error:', error.message);
        
        // Provide user-friendly message
        if (error.message.includes('Whisper')) {
            return 'Whisper service not available. Contact admin.';
        } else if (error.message.includes('size')) {
            return 'File terlalu besar. Max 100MB.';
        } else if (error.message.includes('format')) {
            return 'Format audio tidak didukung.';
        } else if (error.message.includes('No text')) {
            return 'Tidak ada text terdeteksi. Coba audio lain.';
        } else {
            return error.message;
        }
    }
}

// ============================================
// EXAMPLE 8: Custom Lirik Display (Render Lirik ke DOM)
// ============================================

function customLyricsDisplay(transcriptionResult) {
    const container = document.getElementById('custom-lyrics');
    
    // Clear previous content
    container.innerHTML = '';
    
    // Create custom display dengan extra info
    const header = document.createElement('div');
    header.className = 'lyrics-header';
    header.innerHTML = `
        <h3>Lyrics: <span id="current-lyric">Ready...</span></h3>
        <p>Total: ${transcriptionResult.segments.length} lines</p>
    `;
    container.appendChild(header);
    
    // Render each segment dengan timeline
    const list = document.createElement('div');
    list.className = 'lyrics-list';
    
    transcriptionResult.segments.forEach((segment, i) => {
        const line = document.createElement('div');
        line.className = 'lyrics-line';
        line.id = `lyric-${i}`;
        line.innerHTML = `
            <span class="time">[${formatTime(segment.start)}]</span>
            <span class="text">${segment.text}</span>
        `;
        
        // Click to seek
        line.addEventListener('click', () => {
            const player = document.getElementById('audio-player');
            player.currentTime = segment.start;
        });
        
        list.appendChild(line);
    });
    
    container.appendChild(list);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${mins}:${secs}`;
}

// ============================================
// EXAMPLE 9: Integration dengan Firebase/Database
// ============================================

async function saveLyricsToDatabase(studentId, transcriptionResult) {
    try {
        const lyricsData = {
            studentId,
            transcription: transcriptionResult,
            savedAt: new Date().toISOString(),
            formats: {
                lrc: transcriber.formatToLRC(transcriptionResult),
                srt: transcriber.formatToSRT(transcriptionResult)
            }
        };
        
        // Save ke server
        const response = await fetch('/api/lyrics/save', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                filename: studentId,
                transcription: transcriptionResult
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Lyrics saved:', data.path);
            return true;
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('❌ Failed to save lyrics:', error);
        return false;
    }
}

// ============================================
// EXAMPLE 10: Full Workflow Example
// ============================================

async function fullWorkflow() {
    // 1. Get audio file from input
    const fileInput = document.getElementById('audio-input');
    const audioFile = fileInput.files[0];
    
    if (!audioFile) {
        alert('Please select audio file');
        return;
    }
    
    // 2. Show loading UI
    const loadingEl = document.getElementById('loading');
    loadingEl.style.display = 'block';
    
    try {
        // 3. Transcribe audio
        console.log('🎵 Transcribing: ' + audioFile.name);
        const result = await transcriber.transcribeAudio(
            audioFile,
            'id',
            (progress) => {
                console.log(`📊 ${progress.status}: ${progress.progress}%`);
                loadingEl.textContent = progress.message;
            }
        );
        
        // 4. Save to database
        const saved = await saveLyricsToDatabase('current_student', result);
        
        if (!saved) {
            throw new Error('Failed to save lyrics');
        }
        
        // 5. Display in karaoke
        karaoke.loadLyrics(result);
        
        // 6. Setup audio player
        const audio = document.getElementById('audio-player');
        const audioUrl = URL.createObjectURL(audioFile);
        audio.src = audioUrl;
        
        // 7. Hide loading dan show result
        loadingEl.style.display = 'none';
        console.log('✅ Workflow complete!');
        alert('Lyrics ready! Play your audio to see karaoke.');
        
    } catch (error) {
        loadingEl.style.display = 'none';
        console.error('❌ Workflow error:', error);
        alert('Error: ' + error.message);
    }
}

// ============================================
// Export untuk digunakan
// ============================================

window.lyricsExamples = {
    setupKaraoke,
    loadExistingLyrics,
    exportLyrics,
    searchLyrics,
    robustTranscription,
    customLyricsDisplay,
    saveLyricsToDatabase,
    fullWorkflow
};

console.log('✅ Lyrics Karaoke examples loaded');
console.log('Usage: lyricsExamples.fullWorkflow()');
