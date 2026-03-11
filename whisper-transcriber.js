/**
 * Whisper Transcriber Module
 * Mengintegrasikan Local Whisper untuk transcription lirik dari audio
 */

// Prevent duplicate class declaration
if (typeof WhisperTranscriber === 'undefined') {
    class WhisperTranscriber {
    constructor(apiUrl = 'http://13.215.61.92:5000') {
        this.apiUrl = apiUrl;
        this.isTranscribing = false;
    }

    /**
     * Transcribe audio file menggunakan Local Whisper
     * @param {File} audioFile - File audio yang akan ditranscribe
     * @param {string} language - Bahasa audio (default: 'id' untuk Indonesia)
     * @param {Function} onProgress - Callback untuk progress updates
     * @returns {Promise<Object>} - Hasil transcription dengan segments dan text
     */
    async transcribeAudio(audioFile, language = 'id', onProgress = null) {
        if (this.isTranscribing) {
            throw new Error('Transcription already in progress');
        }

        if (!audioFile) {
            throw new Error('Audio file is required');
        }

        // Validate file type
        const allowedTypes = [
            'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav',
            'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/ogg', 'audio/opus',
            'audio/webm', 'audio/flac', 'audio/x-flac', 'video/mp4',
            'application/octet-stream'
        ];

        if (!allowedTypes.includes(audioFile.type) && !audioFile.name.match(/\.(mp3|wav|m4a|ogg|flac|webm|mp4)$/i)) {
            throw new Error('Unsupported audio format. Please use MP3, WAV, M4A, OGG, or FLAC');
        }

        this.isTranscribing = true;

        try {
            // Create FormData untuk upload
            const formData = new FormData();
            formData.append('audio', audioFile);
            formData.append('language', language);

            // Progress callback untuk upload
            if (onProgress) {
                onProgress({
                    status: 'uploading',
                    message: 'Uploading audio file...',
                    progress: 0
                });
            }

            // Transcribe menggunakan server endpoint
            const response = await fetch(`${this.apiUrl}/api/transcribe`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP Error: ${response.status}`);
            }

            if (onProgress) {
                onProgress({
                    status: 'processing',
                    message: 'Processing transcription...',
                    progress: 50
                });
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Transcription failed');
            }

            if (onProgress) {
                onProgress({
                    status: 'completed',
                    message: 'Transcription completed successfully!',
                    progress: 100
                });
            }

            // Normalize dan return result
            return this.normalizeTranscriptionResult(result.transcription);

        } catch (error) {
            console.error('Transcription error:', error);
            throw new Error(`Transcription failed: ${error.message}`);
        } finally {
            this.isTranscribing = false;
        }
    }

    /**
     * Normalize hasil transcription dari berbagai format Whisper
     * @private
     */
    normalizeTranscriptionResult(transcription) {
        if (!transcription) {
            throw new Error('No transcription data');
        }

        let segments = [];
        let fullText = '';

        // Handle berbagai format response
        if (Array.isArray(transcription.segments)) {
            segments = transcription.segments;
        } else if (transcription.segments) {
            segments = Object.values(transcription.segments);
        }

        // Extract text dari segments
        if (segments.length > 0) {
            fullText = segments.map(seg => {
                if (typeof seg === 'object' && seg.text) {
                    return seg.text.trim();
                } else if (typeof seg === 'string') {
                    return seg.trim();
                }
                return '';
            }).filter(Boolean).join(' ');

            // Normalize segment format
            segments = segments.map((seg, i) => {
                if (typeof seg === 'string') {
                    return {
                        text: seg,
                        start: i * 5,
                        end: (i + 1) * 5
                    };
                }

                return {
                    text: seg.text || '',
                    start: seg.start !== undefined ? seg.start : (seg.timestamp || (i * 5)),
                    end: seg.end !== undefined ? seg.end : (seg.start !== undefined ? seg.start + 5 : ((i + 1) * 5))
                };
            });
        } else if (transcription.text) {
            fullText = transcription.text;
            segments = [{
                text: fullText,
                start: 0,
                end: 0
            }];
        }

        return {
            text: fullText,
            segments: segments,
            language: transcription.language || 'id',
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Save transcription result ke local storage atau file
     * @param {string} filename - Nama file (gunakan student ID)
     * @param {Object} transcriptionResult - Hasil dari transcribeAudio
     * @returns {Promise<boolean>} - Status penyimpanan
     */
    async saveTranscription(filename, transcriptionResult) {
        try {
            // Prepare data untuk penyimpanan
            const lyricsData = {
                filename: filename,
                timestamp: new Date().toISOString(),
                transcription: transcriptionResult,
                format: 'json'
            };

            // Kirim ke server untuk disimpan di profile_lyrics
            const response = await fetch(`${this.apiUrl}/api/lyrics/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(lyricsData)
            });

            if (!response.ok) {
                throw new Error(`Failed to save lyrics: ${response.status}`);
            }

            const result = await response.json();
            return result.success;

        } catch (error) {
            console.error('Error saving transcription:', error);
            // Fallback: save to localStorage
            try {
                localStorage.setItem(`lyrics_${filename}`, JSON.stringify({
                    transcription: transcriptionResult,
                    timestamp: new Date().toISOString()
                }));
                console.log('Transcription saved to localStorage');
                return true;
            } catch (e) {
                console.error('Failed to save to localStorage:', e);
                return false;
            }
        }
    }

    /**
     * Load transcription yang sudah tersimpan
     * @param {string} filename - Nama file untuk dimuat
     * @returns {Promise<Object|null>} - Transcription result atau null jika tidak ada
     */
    async loadTranscription(filename) {
        try {
            // Try server first
            const response = await fetch(`${this.apiUrl}/api/lyrics/load?filename=${filename}`);

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.transcription) {
                    return data.transcription;
                }
            }

            // Fallback ke localStorage
            const localData = localStorage.getItem(`lyrics_${filename}`);
            if (localData) {
                const parsed = JSON.parse(localData);
                return parsed.transcription;
            }

            return null;

        } catch (error) {
            console.error('Error loading transcription:', error);
            return null;
        }
    }

    /**
     * Format transcription ke LRC format untuk lyrics karaoke
     * @param {Object} transcriptionResult - Hasil dari transcribeAudio
     * @returns {string} - LRC formatted text
     */
    formatToLRC(transcriptionResult) {
        const segments = transcriptionResult.segments || [];

        return segments.map(seg => {
            const time = this.formatTimeToLRC(seg.start);
            return `${time} ${seg.text}`;
        }).join('\n');
    }

    /**
     * Format transcription ke SRT format (subtitle)
     * @param {Object} transcriptionResult - Hasil dari transcribeAudio
     * @returns {string} - SRT formatted text
     */
    formatToSRT(transcriptionResult) {
        const segments = transcriptionResult.segments || [];

        return segments.map((seg, i) => {
            const start = this.formatTimeToSRT(seg.start);
            const end = this.formatTimeToSRT(seg.end);
            return `${i + 1}\n${start} --> ${end}\n${seg.text}\n`;
        }).join('\n');
    }

    /**
     * Format time to LRC format [MM:SS.XX]
     * @private
     */
    formatTimeToLRC(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(2);
        return `[${String(mins).padStart(2, '0')}:${String(secs).padStart(5, '0')}]`;
    }

    /**
     * Format time to SRT format HH:MM:SS,MS
     * @private
     */
    formatTimeToSRT(seconds) {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);

        return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
    }

    /**
     * Check if Whisper is available on server
     * @returns {Promise<boolean>}
     */
    async checkWhisperAvailability() {
        try {
            const response = await fetch(`${this.apiUrl}/api/whisper/check`);
            const data = await response.json();
            return data.success && data.available;
        } catch (error) {
            console.error('Error checking Whisper availability:', error);
            return false;
        }
    }
}  // End of WhisperTranscriber class declaration
}  // End of "if (typeof WhisperTranscriber === 'undefined')" conditional

// Initialize if available
if (typeof Whisper !== 'undefined' && !window.whisperTranscriber) {
    window.whisperTranscriber = new WhisperTranscriber();
}

// Export
if (!window.WhisperTranscriber) {
    window.WhisperTranscriber = WhisperTranscriber;
}
