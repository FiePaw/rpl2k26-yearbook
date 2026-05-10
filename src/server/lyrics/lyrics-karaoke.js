/**
 * Lyrics Karaoke Module
 * Menampilkan lirik dalam style karaoke dengan sync real-time
 */

// Prevent duplicate class declaration
if (typeof LyricsKaraoke === 'undefined') {
    class LyricsKaraoke {
        constructor(containerSelector, audioElementSelector) {
            this.container = document.querySelector(containerSelector);
            this.audioElement = document.querySelector(audioElementSelector);
            this.segments = [];
            this.currentSegmentIndex = -1;
        this.isInitialized = false;

        if (!this.container) {
            throw new Error(`Container not found: ${containerSelector}`);
        }

        if (!this.audioElement) {
            throw new Error(`Audio element not found: ${audioElementSelector}`);
        }

        this.init();
    }

    /**
     * Initialize karaoke display
     * @private
     */
    init() {
        this.setupStyles();
        this.audioElement.addEventListener('timeupdate', () => this.updateLyricsSync());
        this.audioElement.addEventListener('play', () => this.onAudioPlay());
        this.audioElement.addEventListener('pause', () => this.onAudioPause());
        this.isInitialized = true;
    }

    /**
     * Setup CSS styles untuk karaoke
     * @private
     */
    setupStyles() {
        // Check if styles sudah ditambahkan
        if (document.getElementById('lyrics-karaoke-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'lyrics-karaoke-styles';
        style.textContent = `
            .lyrics-karaoke-container {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }

            .lyrics-karaoke-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 0.5rem;
            }

            .lyrics-karaoke-title {
                font-size: 1.1rem;
                font-weight: 600;
                color: var(--text-primary, #fff);
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .lyrics-karaoke-controls {
                display: flex;
                gap: 0.5rem;
            }

            .lyrics-karaoke-control-btn {
                padding: 0.5rem 1rem;
                background: var(--primary-color, #1DB954);
                color: white;
                border: none;
                border-radius: 0.25rem;
                cursor: pointer;
                font-size: 0.9rem;
                transition: all 0.3s ease;
            }

            .lyrics-karaoke-control-btn:hover {
                background: var(--primary-color-hover, #1ed760);
                transform: translateY(-2px);
            }

            .lyrics-karaoke-display {
                background: linear-gradient(135deg, rgba(29, 185, 84, 0.05) 0%, rgba(29, 185, 84, 0.02) 100%);
                border: 1px solid rgba(29, 185, 84, 0.2);
                border-radius: 0.8rem;
                padding: 1.5rem;
                min-height: 200px;
                max-height: 350px;
                overflow-y: auto;
                scroll-behavior: smooth;
            }

            /* Desktop scrollbar */
            .lyrics-karaoke-display::-webkit-scrollbar {
                width: 6px;
            }

            .lyrics-karaoke-display::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.1);
                border-radius: 3px;
            }

            .lyrics-karaoke-display::-webkit-scrollbar-thumb {
                background: var(--primary-color, #1DB954);
                border-radius: 3px;
            }

            .lyrics-karaoke-display::-webkit-scrollbar-thumb:hover {
                background: var(--primary-color-hover, #1ed760);
            }

            .lyric-segment {
                padding: 0.8rem 1rem;
                margin: 0.4rem 0;
                border-radius: 0.5rem;
                line-height: 1.6;
                font-size: 1rem;
                color: var(--text-secondary, #b3b3b3);
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                border-left: 3px solid transparent;
            }

            .lyric-segment:hover {
                background: rgba(29, 185, 84, 0.1);
                color: var(--text-primary, #fff);
                border-left-color: var(--primary-color, #1DB954);
            }

            /* Lyric yang sudah dilewati */
            .lyric-segment.past {
                opacity: 0.5;
                color: var(--text-muted, #666);
            }

            /* Lyric yang sedang aktif (real-time) */
            .lyric-segment.active {
                background: linear-gradient(135deg, var(--primary-color, #1DB954) 0%, rgba(29, 185, 84, 0.8) 100%);
                color: white;
                font-weight: 600;
                transform: translateX(8px) scale(1.02);
                border-left-color: white;
                box-shadow: 0 4px 15px rgba(29, 185, 84, 0.4);
                border-radius: 0.5rem;
            }

            /* Lyric yang akan datang */
            .lyric-segment.upcoming {
                opacity: 0.7;
            }

            .lyrics-karaoke-stats {
                display: flex;
                justify-content: space-between;
                font-size: 0.85rem;
                color: var(--text-secondary, #b3b3b3);
                padding: 0.5rem 1rem;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 0.5rem;
                margin-top: 0.5rem;
            }

            .lyrics-karaoke-empty {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 200px;
                color: var(--text-secondary, #b3b3b3);
                text-align: center;
                gap: 1rem;
            }

            .lyrics-karaoke-empty-icon {
                font-size: 2.5rem;
                opacity: 0.5;
            }

            /* Mobile responsiveness */
            @media (max-width: 768px) {
                .lyrics-karaoke-display {
                    min-height: 150px;
                    max-height: 300px;
                    padding: 1rem;
                }

                .lyric-segment {
                    padding: 0.6rem 0.8rem;
                    font-size: 0.95rem;
                }

                .lyric-segment.active {
                    transform: translateX(4px) scale(1.01);
                }

                .lyrics-karaoke-title {
                    font-size: 1rem;
                }

                .lyrics-karaoke-control-btn {
                    padding: 0.4rem 0.8rem;
                    font-size: 0.8rem;
                }
            }

            /* Loading state */
            .lyrics-karaoke-loading {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
                color: var(--primary-color, #1DB954);
            }

            .lyrics-karaoke-spinner {
                display: inline-block;
                width: 1rem;
                height: 1rem;
                border: 2px solid rgba(29, 185, 84, 0.2);
                border-top-color: var(--primary-color, #1DB954);
                border-radius: 50%;
                animation: karaoke-spin 0.8s linear infinite;
            }

            @keyframes karaoke-spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Load dan display lirik dari transcription result
     * @param {Object} transcriptionResult - Hasil dari Whisper transcriber
     * @param {Object} options - Options untuk display
     */
    loadLyrics(transcriptionResult, options = {}) {
        if (!transcriptionResult || !transcriptionResult.segments) {
            this.showEmpty('No lyrics available');
            return;
        }

        this.segments = transcriptionResult.segments;
        this.currentSegmentIndex = -1;

        const opts = {
            autoScroll: options.autoScroll !== false,
            highlight: options.highlight !== false,
            ...options
        };

        this.render(opts);
    }

    /**
     * Render lirik ke container
     * @private
     */
    render(options = {}) {
        const opts = {
            autoScroll: true,
            highlight: true,
            ...options
        };

        this.container.innerHTML = '';

        // Header
        const header = this.createHeader();
        this.container.appendChild(header);

        // Lyrics display
        const display = document.createElement('div');
        display.className = 'lyrics-karaoke-display';
        display.id = 'lyrics-display';

        if (this.segments.length === 0) {
            this.showEmpty('No lyrics to display', display);
        } else {
            const lyricsList = document.createElement('div');
            lyricsList.id = 'lyrics-list';

            this.segments.forEach((segment, index) => {
                const lyricEl = this.createLyricSegment(segment, index, opts);
                lyricsList.appendChild(lyricEl);
            });

            display.appendChild(lyricsList);
        }

        this.container.appendChild(display);

        // Stats
        const stats = this.createStats();
        this.container.appendChild(stats);
    }

    /**
     * Create header dengan controls
     * @private
     */
    createHeader() {
        const header = document.createElement('div');
        header.className = 'lyrics-karaoke-header';

        const title = document.createElement('div');
        title.className = 'lyrics-karaoke-title';
        title.innerHTML = '<i class="fas fa-music"></i> Lyrics Karaoke';

        const controls = document.createElement('div');
        controls.className = 'lyrics-karaoke-controls';

        const scrollBtn = document.createElement('button');
        scrollBtn.className = 'lyrics-karaoke-control-btn';
        scrollBtn.innerHTML = '<i class="fas fa-arrows-alt-v"></i> Auto Scroll';
        scrollBtn.onclick = () => this.toggleAutoScroll(scrollBtn);

        controls.appendChild(scrollBtn);

        header.appendChild(title);
        header.appendChild(controls);

        return header;
    }

    /**
     * Create single lyric segment element
     * @private
     */
    createLyricSegment(segment, index, options) {
        const el = document.createElement('div');
        el.className = 'lyric-segment';
        el.id = `lyric-${index}`;
        el.textContent = segment.text;

        // Click untuk seek
        el.addEventListener('click', () => {
            if (this.audioElement && segment.start !== undefined) {
                this.audioElement.currentTime = segment.start;
            }
        });

        return el;
    }

    /**
     * Create stats display
     * @private
     */
    createStats() {
        const stats = document.createElement('div');
        stats.className = 'lyrics-karaoke-stats';

        const totalSegments = document.createElement('span');
        totalSegments.id = 'stats-total';
        totalSegments.textContent = `Total lines: ${this.segments.length}`;

        const currentProgress = document.createElement('span');
        currentProgress.id = 'stats-progress';
        currentProgress.textContent = `Progress: 0/${this.segments.length}`;

        stats.appendChild(totalSegments);
        stats.appendChild(currentProgress);

        return stats;
    }

    /**
     * Update lirik sync berdasarkan posisi audio
     * @private
     */
    updateLyricsSync() {
        if (!this.audioElement || this.segments.length === 0) {
            return;
        }

        const currentTime = this.audioElement.currentTime;
        let activeIndex = -1;

        // Find current active segment
        for (let i = 0; i < this.segments.length; i++) {
            const segment = this.segments[i];
            const nextSegment = this.segments[i + 1];

            const segmentStart = segment.start || (i * 5);
            const segmentEnd = nextSegment ? (nextSegment.start || ((i + 1) * 5)) : (segment.end || (segmentStart + 5));

            if (currentTime >= segmentStart && currentTime < segmentEnd) {
                activeIndex = i;
                break;
            }
        }

        // Update classes jika berubah
        if (activeIndex !== this.currentSegmentIndex) {
            this.updateSegmentClasses(activeIndex);
            this.currentSegmentIndex = activeIndex;

            // Update progress stats
            const progressEl = document.getElementById('stats-progress');
            if (progressEl) {
                progressEl.textContent = `Progress: ${activeIndex + 1}/${this.segments.length}`;
            }

            // Auto scroll
            if (this.autoScrollEnabled) {
                this.scrollToActive(activeIndex);
            }
        }
    }

    /**
     * Update CSS classes untuk segments
     * @private
     */
    updateSegmentClasses(activeIndex) {
        this.segments.forEach((_, index) => {
            const el = document.getElementById(`lyric-${index}`);
            if (!el) return;

            el.classList.remove('past', 'active', 'upcoming');

            if (index < activeIndex) {
                el.classList.add('past');
            } else if (index === activeIndex) {
                el.classList.add('active');
            } else {
                el.classList.add('upcoming');
            }
        });
    }

    /**
     * Auto scroll ke active lyric
     * @private
     */
    scrollToActive(activeIndex) {
        const activeEl = document.getElementById(`lyric-${activeIndex}`);
        const display = document.getElementById('lyrics-display');

        if (activeEl && display) {
            const scrollOffset = activeEl.offsetTop - display.offsetHeight / 2 + activeEl.offsetHeight / 2;
            display.scrollTo({
                top: scrollOffset,
                behavior: 'smooth'
            });
        }
    }

    /**
     * Toggle auto scroll
     * @private
     */
    toggleAutoScroll(button) {
        this.autoScrollEnabled = !this.autoScrollEnabled;
        button.style.opacity = this.autoScrollEnabled ? '1' : '0.6';
    }

    /**
     * Callback saat audio dimainkan
     * @private
     */
    onAudioPlay() {
        // Bisa digunakan untuk animasi atau efek lainnya
    }

    /**
     * Callback saat audio dijeda
     * @private
     */
    onAudioPause() {
        // Bisa digunakan untuk animasi atau efek lainnya
    }

    /**
     * Show empty state
     * @private
     */
    showEmpty(message = 'No lyrics', container = null) {
        const target = container || this.container;
        target.innerHTML = `
            <div class="lyrics-karaoke-empty">
                <div class="lyrics-karaoke-empty-icon">
                    <i class="fas fa-music"></i>
                </div>
                <p>${message}</p>
            </div>
        `;
    }

    /**
     * Clear all lirik
     */
    clear() {
        this.segments = [];
        this.currentSegmentIndex = -1;
        this.showEmpty();
    }

    /**
     * Get current lyric text
     */
    getCurrentLyric() {
        if (this.currentSegmentIndex >= 0 && this.currentSegmentIndex < this.segments.length) {
            return this.segments[this.currentSegmentIndex].text;
        }
        return null;
    }

    /**
     * Get all lyrics as plain text
     */
    getAllLyricsText() {
        return this.segments.map(s => s.text).join('\n');
    }
}  // End of LyricsKaraoke class declaration
}  // End of "if (typeof LyricsKaraoke === 'undefined')" conditional

// Initialize only if container exists
if (document.querySelector('#lyricsDisplay') && !window.lyricsKaraoke) {
    try {
        window.lyricsKaraoke = new LyricsKaraoke('#lyricsDisplay', 'audio');
        console.log('✅ Lyrics Karaoke System initialized');
    } catch (error) {
        console.warn('Lyrics Karaoke initialization skipped:', error.message);
    }
}

// Export
if (!window.LyricsKaraoke && typeof LyricsKaraoke !== 'undefined') {
    window.LyricsKaraoke = LyricsKaraoke;
}
