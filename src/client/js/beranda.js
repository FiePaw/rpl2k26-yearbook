// beranda.js
const API_URL = 'https://rpl2k26.site';
let allStudents = [];
let currentStudentIndex = 0;
let currentStudentId = null; // Track by ID instead of index (more reliable)
let isPlaying = false;
let progressInterval = null;
let currentProgress = 0;
let totalDuration = 30; // Default 30 seconds
let updatePlayerTimeoutId = null; // Track timeout untuk update player content
let studentsPreloaded = false; // Track if students already loaded
let lyricsAbortController = null; // Abort controller untuk cancel old lyric requests
let lastLoadedAudioFile = null; // Prevent duplicate audio loads
let audioCleanupTimeout = null; // Track cleanup timeout
let userManuallyPaused = false; // Track if user intentionally paused (prevent auto-advance on play error)
let navigationCooldownActive = false; // Prevent navigation spam (next/prev button cooldown)

// ========== PARALLEL LOADING STRATEGY ==========
// Start loading students IMMEDIATELY without waiting for loading screen
function preloadStudentsData() {
    fetch(`${API_URL}/api/students`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-cache'
    })
    .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    })
    .then(data => {
        allStudents = data;
        studentsPreloaded = true;
        console.log('✅ Students pre-loaded in parallel:', allStudents.length);
    })
    .catch(error => {
        console.error('❌ Error in parallel loading:', error);
    });
}

// Start preload immediately
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', preloadStudentsData);
} else {
    preloadStudentsData();
}

// Wait for loading to complete first
document.addEventListener('loadingComplete', () => {
    console.log('📍 Loading Complete on Beranda, starting page initialization...');
    initPageContent();
});

// Fallback if loadingComplete doesn't fire (after 6 seconds)
setTimeout(() => {
    if (!window.pageInitialized) {
        console.warn('⚠️ Loading timeout, initializing page anyway');
        initPageContent();
    }
}, 3500);

function initPageContent() {
    // CRITICAL: Set flag IMMEDIATELY to prevent race condition
    // (flag di-set SEBELUM guard check)
    if (window.pageInitialized) {
        console.log('⚠️ Page already initialized, skipping duplicate initialization...');
        return;
    }
    
    // Set flag FIRST to block concurrent calls
    window.pageInitialized = true;
    console.log('🚀 Initializing page content (one-time only)...');
    
    checkLoginStatus();
    initTheme();
    // Only load students if not preloaded in parallel
    if (!studentsPreloaded) {
        loadStudents();
    } else {
        // Use preloaded data
        displayStudents(allStudents);
    }
    setupEventListeners();
    initMusicPlayer();
    initSidebar();
}

// Check login status
function checkLoginStatus() {
    const user = JSON.parse(localStorage.getItem('user'));
    const userBtn = document.getElementById('userBtn');
    const userName = document.getElementById('userName');
    const profileLink = document.getElementById('profileLink');
    
    if (user) {
        userName.textContent = user.nickname;
        profileLink.href = 'profile';
    } else {
        profileLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'index';
        });
    }
    
    userBtn.addEventListener('click', async () => {
        if (user) {
            const result = await popup.confirm('Mau logout nih?');
            if (result) {
                if (window.ActivityTracker) ActivityTracker.logout();
                localStorage.removeItem('user');
                window.location.href = 'index';
            }
        } else {
            window.location.href = 'index';
        }
    });
}

// Theme toggle - Using event delegation for robustness
function initTheme() {
    const currentTheme = localStorage.getItem('theme') || 'dark';
    
    // Set theme on documentElement
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme);
    
    // Use event delegation on document to handle theme toggle anywhere
    // Remove old delegated listener if exists
    document.removeEventListener('click', handleThemeToggle);
    
    // Add delegated listener
    document.addEventListener('click', handleThemeToggle);
    
    console.log('✅ Theme toggle initialized with theme:', currentTheme);
}

// Global handler for theme toggle (using event delegation)
function handleThemeToggle(e) {
    const themeToggle = e.target.closest('#themeToggle, #sidebarThemeToggle');
    
    if (!themeToggle) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const theme = document.documentElement.getAttribute('data-theme');
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    
    console.log(`🎨 Theme changed: ${theme} → ${newTheme}`);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
    
    // Update sidebar icon if it exists
    if (typeof updateSidebarThemeIcon === 'function') {
        updateSidebarThemeIcon(newTheme);
    }
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('#themeToggle i');
    if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        console.log(`🎨 Theme icon updated to:`, icon.className);
    }
}

// Load students (fallback if parallel loading fails)
async function loadStudents() {
    // Skip if already loaded in parallel
    if (allStudents.length > 0) {
        displayStudents(allStudents);
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/students`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            cache: 'no-cache'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        allStudents = await response.json();
        displayStudents(allStudents);
    } catch (error) {
        console.error('Error loading students:', error);
        const grid = document.getElementById('studentsGrid');
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--accent-color); margin-bottom: 1rem;"></i>
                <h2>Gagal Memuat Data</h2>
                <p>Error nih, coba tanya ke developer nya soal ini.</p>
                <button onclick="location.reload()" class="btn-primary" style="margin-top: 1rem; padding: 0.8rem 2rem;">
                    <i class="fas fa-sync"></i> Refresh
                </button>
            </div>
        `;
    }
}

// Display students
function displayStudents(students) {
    const grid = document.getElementById('studentsGrid');
    grid.innerHTML = '';
    
    students.forEach(student => {
        const card = createStudentCard(student);
        grid.appendChild(card);
    });
    
    // Trigger grid animations after cards are added
    if (typeof initStudentsGridAnimations === 'function') {
        initStudentsGridAnimations();
    }
}

// Create student card
function createStudentCard(student) {
    const card = document.createElement('div');
    card.className = 'student-card';
    card.dataset.studentId = student.id;
    
    const photoUrl = student.photo;
    const altText = photoUrl ? student.name : 'FOTO BELUM ADA';
    
    card.innerHTML = `
        <div class="card-photo-section">
            <div class="card-photo-frame">
                <img src="${photoUrl}" alt="${altText}" loading="lazy" decoding="async">
                <div class="play-overlay">
                    <div class="play-btn">
                        <i class="fas fa-play"></i>
                    </div>
                </div>
            </div>
        </div>
        <div class="card-content-section">
            <div class="card-message-label">
                <span>Message & Thoughts</span>
            </div>
            <div class="card-message-box">
                ${student.message || 'Belum ada pesan...'}
            </div>
            <div class="card-footer">
                <h3>${student.name}</h3>
                <p>${student.birthday || 'Tanggal Ultah belom ada'}</p>
            </div>
        </div>
        <div class="card-info">
            <h3>${student.name}</h3>
            <p>${student.birthday || 'Tanggal Ultah belom ada'}</p>
        </div>
    `;
    
    card.addEventListener('click', () => {
        // Find student index and play music player
        const studentIndex = allStudents.findIndex(s => s.id === student.id);
        if (studentIndex !== -1) {
            playStudent(studentIndex);
            // Scroll to top to see the player on desktop
            if (window.innerWidth > 768) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    });
    
    return card;
}

// Initialize Music Player
function initMusicPlayer() {
    const playerContainer = document.getElementById('musicPlayer');
    const closeBtn = document.getElementById('closePlayer');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const shuffleBtn = document.getElementById('shuffleBtn');
    const repeatBtn = document.getElementById('repeatBtn');
    const progressBar = document.querySelector('.progress-bar');
    const volumeBar = document.querySelector('.volume-bar');

    // Safety check for required elements
    if (!playerContainer || !closeBtn || !playPauseBtn) {
        console.warn('⚠️ Music player elements not found, skipping initialization');
        return;
    }

    // Close player
    closeBtn.addEventListener('click', () => {
        closePlayerWithAnimation();
    });

    // Play/Pause
    playPauseBtn.addEventListener('click', () => {
        console.log(`🎵 Play-Pause clicked. Current state: ${isPlaying ? 'PLAYING' : 'PAUSED'}`);
        
        // Toggle play state
        isPlaying = !isPlaying;
        
        // Update button icon immediately
        updatePlayPauseButton();
        
        if (isPlaying) {
            // RESET FLAG: User wants to play, so auto-advance is OK if error happens
            userManuallyPaused = false;
            
            // Try to play audio
            if (audioElement && audioElement.src) {
                console.log(`▶️ Resuming audio playback`);
                audioElement.play().catch(error => {
                    console.error('❌ Error playing audio:', error);
                    // Revert state if play fails
                    isPlaying = false;
                    updatePlayPauseButton();
                });
                startProgress();
            } else {
                console.warn('⚠️ No audio loaded, cannot play');
                isPlaying = false;
                updatePlayPauseButton();
            }
        } else {
            // SET FLAG: User intentionally paused - don't auto-advance if play() error occurs
            userManuallyPaused = true;
            
            // Pause audio
            console.log(`⏸️ Pausing audio playback (user manual pause)`);
            if (audioElement) {
                audioElement.pause();
            }
            stopProgress();
        }
    });

    // Navigation - Previous
    prevBtn.addEventListener('click', () => {
        // Check cooldown - prevent spam
        if (navigationCooldownActive) {
            console.log('⏸️ Navigation on cooldown, please wait...');
            return;
        }
        
        const currentIndex = allStudents.findIndex(s => s.id === currentStudentId);
        let prevIndex = (currentIndex - 1 + allStudents.length) % allStudents.length;
        
        currentStudentIndex = prevIndex;
        const prevStudent = allStudents[prevIndex];
        
        console.log(`⬅️ Playing previous: ${prevStudent.name} (index ${prevIndex})`);
        currentStudentId = prevStudent.id;
        
        // Set cooldown for next/prev button
        setNavigationCooldown(500);
        
        playStudent(prevIndex);
    });

    // Navigation - Next
    nextBtn.addEventListener('click', () => {
        // Check cooldown - prevent spam
        if (navigationCooldownActive) {
            console.log('⏸️ Navigation on cooldown, please wait...');
            return;
        }
        
        const currentIndex = allStudents.findIndex(s => s.id === currentStudentId);
        let nextIndex = (currentIndex + 1) % allStudents.length;
        
        currentStudentIndex = nextIndex;
        const nextStudent = allStudents[nextIndex];
        
        console.log(`➡️ Playing next: ${nextStudent.name} (index ${nextIndex})`);
        currentStudentId = nextStudent.id;
        
        // Set cooldown for next/prev button
        setNavigationCooldown(500);
        
        playStudent(nextIndex);
    });

    // Shuffle
    shuffleBtn.addEventListener('click', () => {
        shuffleBtn.classList.toggle('active');
    });

    // Repeat
    repeatBtn.addEventListener('click', () => {
        repeatBtn.classList.toggle('active');
    });

    // Progress bar - disabled (not clickable)
    // progressBar.addEventListener('click', (e) => {
    //     const rect = progressBar.getBoundingClientRect();
    //     const percent = (e.clientX - rect.left) / rect.width;
    //     currentProgress = Math.max(0, Math.min(100, percent * 100));
    //     updateProgress();
    // });

    // Volume control
    if (volumeBar) {
        volumeBar.addEventListener('click', (e) => {
            const rect = volumeBar.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            updateVolume(Math.max(0, Math.min(1, percent)));
        });
    }
    
    // Swipe gesture untuk mobile (close player)
    let touchStartY = 0;
    playerContainer.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
    });
    
    playerContainer.addEventListener('touchend', (e) => {
        const touchEndY = e.changedTouches[0].clientY;
        const diff = touchEndY - touchStartY;
        
        // Swipe down untuk close player
        if (diff > 100 && window.innerWidth <= 768) {
            closePlayerWithAnimation();
        }
    });
    
    // Keyboard shortcut untuk close
    document.addEventListener('keydown', (e) => {
        if (playerContainer.style.display === 'block' && e.key === 'Escape') {
            closePlayerWithAnimation();
        }
    });
}

// Show music player with student data
function playStudent(index) {
    // Validate index
    if (index < 0 || index >= allStudents.length) {
        console.error(`❌ Invalid student index: ${index}`);
        return;
    }
    
    currentStudentIndex = index;
    const student = allStudents[index];
    
    // Track by ID for better navigation
    currentStudentId = student.id;
    
    // RESET: When switching profile, user manually paused flag should reset
    // (user clicked on new profile, so they want to play)
    userManuallyPaused = false;
    
    console.log(`🎯 Playing student: ${student.name} (ID: ${student.id}, Index: ${index})`);
    
    const playerContainer = document.getElementById('musicPlayer');
    const photoUrl = student.photo

    // Reset manual scroll flag when changing student
    lyricsManualScrolling = false;

    // Cancel previous timeout jika ada untuk mencegah update gambar lama
    if (updatePlayerTimeoutId) {
        clearTimeout(updatePlayerTimeoutId);
        updatePlayerTimeoutId = null;
    }

    // Ensure visibility before making changes
    playerContainer.style.visibility = 'visible';
    
    // Check if player was hidden, if so show it first
    if (playerContainer.style.display === 'none') {
        playerContainer.style.display = 'block';
        // Let display change trigger the opening animation
    } else {
        // If already showing, trigger profile change animation
        playerContainer.classList.add('profile-changing');
    }
    
    // Wait for transition to complete before updating content
    updatePlayerTimeoutId = setTimeout(() => {
        // Trigger fade animation on photo by forcing reflow
        const albumArt = document.querySelector('.album-art');
        if (albumArt) {
            // Reset animation by removing and re-adding it
            albumArt.style.animation = 'none';
            // Force reflow to restart animation
            void albumArt.offsetWidth;
            albumArt.style.animation = 'albumFadeIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
        }
        
        document.getElementById('playerPhoto').src = photoUrl;
        document.getElementById('playerPhoto').alt = photoUrl ? student.name : 'FOTO BELUM ADA';
        document.getElementById('playerName').textContent = student.name;
        document.getElementById('playerBirthday').textContent = student.birthday || 'Not set';
        document.getElementById('playerMessage').textContent = student.message || 'No message available...';
        document.getElementById('playerUpdated').textContent = student.updatedAt ? new Date(student.updatedAt).toLocaleDateString('id-ID') : '-';

        // Render social media badges & song info under the subtitle
        renderSocialMediaBadges(student.socialMedia || {});
        renderSongInfo(student);

        // Remove transition class after updating
        playerContainer.classList.remove('profile-changing');
        updatePlayerTimeoutId = null;
    }, 300);

    isPlaying = true;
    currentProgress = 0;
    
    // Update play-pause button
    updatePlayPauseButton();
    
    // Track profile view for admin dashboard
    if (window.ActivityTracker) {
        ActivityTracker.viewProfile(student.id, student.name);
    }
    
    // Load dan tampilkan lyrics hanya jika student punya lagu
    if (student.audioFile) {
        loadAndDisplayLyrics(student.id);
    } else {
        // Sembunyikan lyrics container jika tidak ada lagu
        const lyricsContainer = document.getElementById('playerLyricsKaraokeContainer');
        if (lyricsContainer) {
            lyricsContainer.style.display = 'none';
        }
    }
    
    // Play profile audio if available with trim times
    const trimData = {
        start: student.audioTrimStart || 0,
        end: student.audioTrimEnd || null
    };
    playProfileAudio(student.audioFile, trimData, student.name || '');
    
    startProgress();
}

// Start progress animation
function startProgress() {
    if (progressInterval) clearInterval(progressInterval);
    
    // Update progress every 100ms for smooth animation
    progressInterval = setInterval(() => {
        if (audioElement && audioElement.src) {
            // Sync progress with actual audio playback
            if (audioElement.duration) {
                const audioProgress = (audioElement.currentTime / audioElement.duration) * 100;
                currentProgress = Math.min(audioProgress, 100);
            }
        } else {
            // Fallback if no audio: slower increment for smooth feel
            currentProgress += 0.33; // ~30 seconds for full progress
        }
        
        if (currentProgress >= 100) {
            currentProgress = 0;
            // Move to next student
            currentStudentIndex = (currentStudentIndex + 1) % allStudents.length;
            playStudent(currentStudentIndex);
        }
        
        updateProgress();
    }, 100);
}

// Stop progress animation
function stopProgress() {
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
}

// Stop music
function stopMusic() {
    stopProgress();
    isPlaying = false;
    currentProgress = 0;
    updateProgress();
    
    // Stop audio playback and cleanup
    if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
        audioElement.src = '';
        // Remove event listeners
        audioElement.onended = null;
        audioElement.onerror = null;
        audioElement.onloadedmetadata = null;
        audioElement.ontimeupdate = null;
    }
    
    // Reset cache
    lastLoadedAudioFile = null;
    
    const playPauseBtn = document.getElementById('playPauseBtn');
    playPauseBtn.querySelector('i').className = 'fas fa-play';
}

// Close player with animation
function closePlayerWithAnimation() {
    const playerContainer = document.getElementById('musicPlayer');
    
    // Add closing class to trigger animation
    playerContainer.classList.add('closing');
    
    // Wait for animation to complete
    setTimeout(() => {
        playerContainer.style.display = 'none';
        playerContainer.style.visibility = 'hidden';
        playerContainer.classList.remove('closing');
        stopMusic();
    }, 650);
}

// Update progress bar display
function updateProgress() {
    const progressFill = document.getElementById('progressFill');
    const progressHandle = document.getElementById('progressHandle');
    const currentTimeEl = document.getElementById('currentTime');
    const totalTimeEl = document.getElementById('totalTime');
    
    if (progressFill && progressHandle) {
        progressFill.style.width = currentProgress + '%';
        progressHandle.style.left = currentProgress + '%';
    }
    
    // Update time display dengan durasi yang sesuai
    const currentSeconds = Math.floor((currentProgress / 100) * totalDuration);
    const minutes = Math.floor(currentSeconds / 60);
    const seconds = currentSeconds % 60;
    currentTimeEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Update total time display
    const totalMinutes = Math.floor(totalDuration / 60);
    const totalSecs = Math.floor(totalDuration % 60);
    totalTimeEl.textContent = `${totalMinutes}:${totalSecs.toString().padStart(2, '0')}`;
}

// Update volume display
function updateVolume(percent) {
    const volumeFill = document.getElementById('volumeFill');
    if (volumeFill) {
        volumeFill.style.width = (percent * 100) + '%';
    }
}

// Helper: Update play-pause button UI based on current state
function updatePlayPauseButton() {
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (!playPauseBtn) return;
    
    const icon = playPauseBtn.querySelector('i');
    if (!icon) return;
    
    // Update icon based on playing state
    icon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
    console.log(`🎯 Play-Pause button updated: ${isPlaying ? 'PAUSE' : 'PLAY'}`);
}

// Helper: Set navigation cooldown to prevent spam on next/prev buttons
function setNavigationCooldown(duration = 500) {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    // Disable buttons
    navigationCooldownActive = true;
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
    
    // Add visual feedback with opacity/pointer-events
    if (prevBtn) prevBtn.style.opacity = '0.5';
    if (nextBtn) nextBtn.style.opacity = '0.5';
    
    // Re-enable after duration
    setTimeout(() => {
        navigationCooldownActive = false;
        if (prevBtn) {
            prevBtn.disabled = false;
            prevBtn.style.opacity = '1';
        }
        if (nextBtn) {
            nextBtn.disabled = false;
            nextBtn.style.opacity = '1';
        }
    }, duration);
}

// ========== AUDIO PLAYBACK ==========
let audioElement = null;

// Play profile audio with proper lifecycle management
function playProfileAudio(audioFile, trimData = {}, studentName = '') {
    // CRITICAL FIX: Always cleanup previous audio regardless of conditions
    if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
        // Remove ALL event listeners to prevent lingering events
        audioElement.onended = null;
        audioElement.onplay = null;
        audioElement.ontimeupdate = null;
        audioElement.onerror = null;
        audioElement.onloadedmetadata = null;
        audioElement.src = '';
    }
    
    // Clear previous timeout if exists
    if (audioCleanupTimeout) {
        clearTimeout(audioCleanupTimeout);
        audioCleanupTimeout = null;
    }
    
    // If no audio file, exit cleanly
    if (!audioFile) {
        console.log(`ℹ️ No audio file for student: ${studentName || 'Unknown'}`);
        lastLoadedAudioFile = null;
        isPlaying = false;
        stopProgress();
        updatePlayPauseButton();
        return;
    }
    
    // Create or get audio element
    if (!audioElement) {
        audioElement = new Audio();
        audioElement.volume = 0.7;
    }
    
    // Update last loaded file
    lastLoadedAudioFile = audioFile;
    
    // Set audio source
    audioElement.src = audioFile;
    
    // Handle trim times
    const trimStart = trimData.start || 0;
    const trimEnd = trimData.end;
    
    // Set start time when audio is ready
    audioElement.onloadedmetadata = function() {
        console.log(`✅ Audio metadata loaded: ${studentName}`);
        
        // Set total duration based on actual audio duration or trim end
        if (trimEnd) {
            totalDuration = Math.ceil(trimEnd - trimStart);
        } else {
            totalDuration = Math.ceil(audioElement.duration - trimStart);
        }
        
        // Ensure minimum 30 seconds
        if (totalDuration < 30) {
            totalDuration = 30;
        }
        
        // Reset progress bar
        currentProgress = 0;
        updateProgress();
        
        if (trimStart > 0) {
            audioElement.currentTime = trimStart;
        }
    };
    
    // Check for trim end time during playback
    audioElement.ontimeupdate = function() {
        if (trimEnd && audioElement.currentTime >= trimEnd) {
            console.log(`⏹️ Trim end reached`);
            audioElement.pause();
            // Only auto-advance if NOT manually paused
            if (!userManuallyPaused) {
                playNextStudent();
            }
        }
    };
    
    audioElement.onended = function() {
        console.log(`🎵 Audio ended, moving to next student`);
        // Only auto-advance if NOT manually paused
        if (!userManuallyPaused) {
            playNextStudent();
        } else {
            console.log('⏸️ Audio ended but user manually paused, not auto-advancing');
        }
    };
    
    // Handle error events - if file not found, skip to next (but NOT if user paused)
    audioElement.onerror = function() {
        console.error(`❌ Error loading audio file: ${audioFile}`);
        // Only auto-advance if NOT manually paused
        if (!userManuallyPaused) {
            playNextStudent();
        } else {
            console.log('⏸️ Audio error but user manually paused, not auto-advancing');
        }
    };
    
    // Play audio
    audioElement.play().catch(error => {
        console.error('❌ Error playing audio:', error.name);
        // Only auto-advance if NOT manually paused
        if (!userManuallyPaused) {
            console.log('🔀 Auto-advancing to next due to play error');
            playNextStudent();
        } else {
            console.log('⏸️ Play error but user manually paused, not auto-advancing');
            isPlaying = false;
            updatePlayPauseButton();
        }
    });
}

// Helper function: Move to next student safely using ID
function playNextStudent() {
    // Find current student in filtered array or all students
    let nextIndex = currentStudentIndex + 1;
    
    // Safely wrap around
    if (nextIndex >= allStudents.length) {
        nextIndex = 0;
    }
    
    currentStudentIndex = nextIndex;
    const nextStudent = allStudents[nextIndex];
    
    if (nextStudent) {
        console.log(`➡️ Playing next: ${nextStudent.name} (index ${nextIndex})`);
        currentStudentId = nextStudent.id;
        playStudent(nextIndex);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Close modal
    const closeBtn = document.querySelector('#studentModal .close');
    closeBtn.addEventListener('click', () => {
        const modal = document.getElementById('studentModal');
        modal.classList.add('closing');
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.remove('closing');
            modal.classList.remove('active');
        }, 350);
    });
    
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('studentModal');
        if (e.target === modal) {
            modal.classList.add('closing');
            setTimeout(() => {
                modal.style.display = 'none';
                modal.classList.remove('closing');
                modal.classList.remove('active');
            }, 350);
        }
    });
    
    // Search
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filtered = allStudents.filter(student => 
            student.name.toLowerCase().includes(searchTerm)
        );
        displayStudents(filtered);
    });
    
    // Filter buttons
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const filter = btn.dataset.filter;
            let filtered = allStudents;
            
            if (filter === 'hasData') {
                filtered = allStudents.filter(s => s.message && s.message.trim() !== '');
            }
            
            displayStudents(filtered);
        });
    });
}

// Sidebar Navigation
function initSidebar() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarClose = document.getElementById('sidebarClose');
    const sidebarNav = document.getElementById('sidebarNav');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebarMenu = document.querySelector('.sidebar-menu');
    const sidebarProfileLink = document.getElementById('sidebarProfileLink');
    const sidebarThemeToggle = document.getElementById('sidebarThemeToggle');
    
    console.log('🔧 Sidebar elements:', { sidebarToggle, sidebarClose, sidebarNav, sidebarOverlay, sidebarMenu });
    
    // Validate elements exist
    if (!sidebarToggle || !sidebarClose || !sidebarNav || !sidebarOverlay) {
        console.error('❌ Sidebar elements not found!');
        return;
    }
    
    // Toggle sidebar
    sidebarToggle.addEventListener('click', (e) => {
        console.log('📖 Sidebar toggle clicked');
        e.preventDefault();
        e.stopPropagation();
        sidebarNav.classList.add('active');
        sidebarOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
    
    // Close sidebar
    function closeSidebar() {
        console.log('❌ Closing sidebar');
        sidebarNav.classList.remove('active');
        sidebarOverlay.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
    
    sidebarClose.addEventListener('click', (e) => {
        console.log('❌ Close button clicked');
        e.preventDefault();
        e.stopPropagation();
        closeSidebar();
    });
    
    sidebarOverlay.addEventListener('click', (e) => {
        console.log('❌ Overlay clicked');
        e.preventDefault();
        closeSidebar();
    });
    
    // Use event delegation for sidebar menu items - more reliable
    if (sidebarMenu) {
        sidebarMenu.addEventListener('click', (e) => {
            const sidebarItem = e.target.closest('.sidebar-item');
            if (sidebarItem) {
                console.log('🔗 Sidebar item clicked:', sidebarItem.href);
                // Allow default navigation after closing
                closeSidebar();
            }
        });
    }
    
    // Fallback: Direct click handlers for sidebar items
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => {
        item.style.pointerEvents = 'auto';
        item.addEventListener('click', (e) => {
            console.log('🔗 Direct sidebar item click:', item.href);
            if (!e.defaultPrevented) {
                closeSidebar();
            }
        }, { passive: false });
    });
    
    // Profile link in sidebar with better handling
    const user = JSON.parse(localStorage.getItem('user'));
    if (sidebarProfileLink) {
        if (!user) {
            sidebarProfileLink.addEventListener('click', (e) => {
                e.preventDefault();
                closeSidebar();
                setTimeout(() => {
                    window.location.href = 'index';
                }, 300);
            });
        } else {
            sidebarProfileLink.href = 'profile';
        }
    }
    
    // Theme toggle in sidebar
    if (sidebarThemeToggle) {
        sidebarThemeToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const theme = document.documentElement.getAttribute('data-theme');
            const newTheme = theme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
            updateSidebarThemeIcon(newTheme);
        });
    }
    
    // Update sidebar theme icon on load
    const currentTheme = localStorage.getItem('theme') || 'dark';
    updateSidebarThemeIcon(currentTheme);
}

function updateSidebarThemeIcon(theme) {
    const sidebarThemeBtn = document.getElementById('sidebarThemeToggle');
    const icon = sidebarThemeBtn.querySelector('i');
    const text = sidebarThemeBtn.querySelector('span');
    
    if (theme === 'dark') {
        icon.className = 'fas fa-sun';
        text.textContent = 'Light Mode';
    } else {
        icon.className = 'fas fa-moon';
        text.textContent = 'Dark Mode';
    }
}

// ========== LYRICS KARAOKE FUNCTIONS ==========

// Track manual scroll state for lyrics
let lyricsManualScrolling = false;
let lyricsScrollTimeout = null;

/**
 * Load dan display lyrics untuk student menggunakan AZLyric sebagai sumber utama
 */
/**
 * Parse lyrics text dengan format [MM:SS] menjadi segments dengan timing
 * MM = menit (00-59), SS = detik (00-59)
 */
function parseLyricsWithTimestamps(lyricsText) {
    if (!lyricsText) return [];

    const lines = lyricsText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    const segments = [];
    let prevTimestamp = -1;
    let hasValidTimestamps = false;

    lines.forEach((line) => {
        // Parse STRICT format: [MM:SS] text
        // MM = 00-59 (menit), SS = 00-59 (detik)
        const timestampMatch = line.match(/^\[(\d{1,2}):(\d{2})\]\s*(.+)$/);
        
        if (!timestampMatch) {
            // Line tidak punya [MM:SS] format - skip
            return;
        }

        const minutes = parseInt(timestampMatch[1]);
        const seconds = parseInt(timestampMatch[2]);
        const text = timestampMatch[3].trim();

        // Validate format: MM harus 00-59, SS harus 00-59
        if (minutes > 59 || seconds > 59) {
            console.warn(`⚠️  Invalid timestamp format: [${minutes}:${seconds}]`);
            return;
        }

        // Convert to seconds
        const startTime = minutes * 60 + seconds;

        // Validate: timestamps must be ascending
        if (startTime <= prevTimestamp) {
            console.warn(`⚠️  Timestamps not ascending: [${minutes}:${seconds}]`);
            return;
        }

        // Skip very short text
        if (text.length < 2) {
            return;
        }

        segments.push({
            text: text,
            start: startTime,
            end: null // Will be set after
        });

        prevTimestamp = startTime;
        hasValidTimestamps = true;
    });

    // No timestamps found, return empty
    if (!hasValidTimestamps) {
        console.log('ℹ️  No [MM:SS] timestamps found, will use default timing');
        return [];
    }

    // Set end times: each segment ends when next starts
    for (let i = 0; i < segments.length; i++) {
        if (i < segments.length - 1) {
            segments[i].end = segments[i + 1].start;
        } else {
            // Last segment: estimate 5 seconds
            segments[i].end = segments[i].start + 5;
        }
    }

    const duration = segments[segments.length - 1]?.start || 0;
    console.log(`✅ Parsed ${segments.length} segments (duration: ${(duration / 60).toFixed(1)} min)`);
    return segments;
}

/**
 * Parse lyrics without timestamps to default segments
 */
function parseLyricsWithoutTimestamps(lyricsText) {
    if (!lyricsText) return [];

    const lines = lyricsText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    // Estimate duration based on line count (assume 5-7 seconds per line)
    const DEFAULT_INTERVAL = 6;

    const segments = lines.map((text, idx) => ({
        text: text,
        start: idx * DEFAULT_INTERVAL,
        end: (idx + 1) * DEFAULT_INTERVAL
    }));

    console.log(`✅ Generated ${segments.length} segments with default ${DEFAULT_INTERVAL}s timing`);
    return segments;
}

async function loadAndDisplayLyrics(studentId) {
    try {
        console.log('🎵 Loading lyrics for student:', studentId);
        
        // ABORT OLD REQUESTS: Cancel previous lyric fetch if any
        if (lyricsAbortController) {
            console.log('❌ Cancelling previous lyrics request');
            lyricsAbortController.abort();
        }
        
        // Create new abort controller for this request
        lyricsAbortController = new AbortController();
        
        const lyricsContainer = document.getElementById('playerLyricsKaraokeContainer');
        const lyricsContent = document.getElementById('playerLyricsContent');
        
        if (!lyricsContainer) {
            console.warn('⚠️ Lyrics container not found');
            return;
        }

        // Show loading state
        lyricsContainer.style.display = 'block';
        lyricsContent.innerHTML = `
            <div class="lyrics-loading">
                <div class="lyrics-loading-spinner"></div>
                <span>Loading lyrics...</span>
            </div>
        `;

        // Reset manual scroll flag when loading new lyrics
        lyricsManualScrolling = false;

        // PRIORITY 1: Load from student data (database) - newest lyrics saved by user
        const studentDataUrl = `${API_URL}/api/students/${studentId}`;
        console.log('📚 Checking student data for saved lyrics:', studentDataUrl);
        
        try {
            const studentResponse = await fetch(studentDataUrl, {
                signal: lyricsAbortController.signal
            });
            
            if (studentResponse.ok) {
                const studentData = await studentResponse.json();
                
                // Check if student has saved lyrics in database
                if (studentData.studentLyrics && studentData.studentLyrics.length > 10) {
                    console.log('✅ Found saved lyrics in student data');
                    
                    // TRY: Parse with [MM:SS] timestamps first
                    let segments = parseLyricsWithTimestamps(studentData.studentLyrics);
                    
                    // FALLBACK: If no timestamps found, create default timing
                    if (segments.length === 0) {
                        console.log('ℹ️  No [MM:SS] format found, using default timing');
                        segments = parseLyricsWithoutTimestamps(studentData.studentLyrics);
                    }
                    
                    if (segments.length > 0) {
                        displayLyricsSegments(segments, lyricsContent);
                        setupLyricsScrollDetection(lyricsContent);
                        syncBerandaLyricsWithAudio();
                        return;
                    }
                }
            }
        } catch (studentError) {
            if (studentError.name === 'AbortError') {
                console.log('⚠️ Student data fetch was cancelled (new request made)');
                return;
            }
            console.warn('⚠️ Could not load student data:', studentError.message);
        }

        // PRIORITY 2: Load from backend cache (old transcription format)
        const cachedUrl = `${API_URL}/api/transcribe/lyrics/${studentId}`;
        console.log('📡 Checking for cached lyrics:', cachedUrl);
        
        try {
            const cachedResponse = await fetch(cachedUrl, {
                signal: lyricsAbortController.signal
            });
            
            if (cachedResponse.ok) {
                const cachedData = await cachedResponse.json();
                
                if (cachedData.success && cachedData.transcription && cachedData.transcription.segments) {
                    console.log('✅ Found cached lyrics with', cachedData.transcription.segments.length, 'segments');
                    
                    displayLyricsSegments(cachedData.transcription.segments, lyricsContent);
                    setupLyricsScrollDetection(lyricsContent);
                    syncBerandaLyricsWithAudio();
                    return;
                }
            }
        } catch (cachedError) {
            if (cachedError.name === 'AbortError') {
                console.log('⚠️ Cached lyrics fetch was cancelled (new request made)');
                return;
            }
            console.warn('⚠️ Could not load cached lyrics:', cachedError.message);
        }

        // No lyrics found in database or cache — show waiting message with timer
        // Auto lyrics generation cycle will generate lyrics server-side
        console.log('⚠️ No lyrics found for student (waiting for auto-generation cycle)');
        
        // Show waiting message with realtime timer
        const startTime = Date.now();
        lyricsContent.innerHTML = `
            <div class="lyrics-loading" style="flex-direction: column; gap: 0.8rem; padding: 2rem 1rem;">
                <div class="lyrics-loading-spinner"></div>
                <span style="font-size: 0.95rem; font-weight: 500; color: var(--text-color);">Sabar yakk lirik nya lagi dibuat</span>
                <span id="lyricsWaitTimer" style="font-size: 0.8rem; color: var(--text-muted); font-family: monospace;">00:00</span>
            </div>
        `;
        
        // Start realtime timer
        const timerEl = document.getElementById('lyricsWaitTimer');
        if (timerEl) {
            const timerInterval = setInterval(() => {
                if (!document.getElementById('lyricsWaitTimer')) {
                    clearInterval(timerInterval);
                    return;
                }
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
                const secs = (elapsed % 60).toString().padStart(2, '0');
                timerEl.textContent = `${mins}:${secs}`;
            }, 1000);
        }

    } catch (error) {
        // Only handle non-abort errors
        if (error.name !== 'AbortError') {
            console.error('❌ Error loading lyrics:', error);
            const lyricsContainer = document.getElementById('playerLyricsKaraokeContainer');
            if (lyricsContainer) {
                lyricsContainer.style.display = 'none';
            }
        }
    }
}

/**
 * Display lyrics segments dengan default 7.8 detik per line
 */
function displayLyricsSegments(segments, container) {
    console.log('🎵 Displaying', segments.length, 'lyrics segments');
    
    const html = segments.map((seg, idx) => {
        const start = seg.start !== undefined ? seg.start : 0;
        const end = seg.end !== undefined ? seg.end : start + 5;
        
        return `
        <div class="lyric-line" data-index="${idx}" data-start="${start}" data-end="${end}">
            <span class="lyric-text">${(seg.text || '').trim()}</span>
        </div>
    `;
    }).join('');

    container.innerHTML = html;
    console.log(`✅ Rendered ${segments.length} lyrics lines`);

    // Add click handlers to sync to timestamp
    container.querySelectorAll('.lyric-line').forEach(line => {
        line.addEventListener('click', () => {
            if (audioElement) {
                const startTime = parseFloat(line.dataset.start);
                audioElement.currentTime = startTime;
                audioElement.play();
                console.log(`⏪ Seek to ${startTime.toFixed(1)}s`);
            }
        });
    });
}

/**
 * Setup manual scroll detection untuk lyrics container
 */
function setupLyricsScrollDetection(lyricsContent) {
    if (!lyricsContent) return;
    
    const lyricsContainer = lyricsContent.closest('.lyrics-karaoke-display');
    if (!lyricsContainer) return;
    
    let isScrolling = false;
    let scrollTimeout = null;
    
    lyricsContainer.addEventListener('scroll', () => {
        // User is manually scrolling
        lyricsManualScrolling = true;
        isScrolling = true;
        
        // Clear existing timeout
        if (scrollTimeout) clearTimeout(scrollTimeout);
        
        // Resume auto-scroll setelah 3 detik tidak ada scroll atau saat lagu berubah
        scrollTimeout = setTimeout(() => {
            lyricsManualScrolling = false;
            isScrolling = false;
            console.log('🔄 Auto-scroll resumed');
        }, 3000);
    }, { passive: true });
    
    // Resume auto-scroll when song changes
    window.addEventListener('playStudent', () => {
        lyricsManualScrolling = false;
        if (scrollTimeout) clearTimeout(scrollTimeout);
    });
}

/**
 * Sync lyrics dengan audio playback pada beranda
 * Support manual scrolling dengan toggle auto-scroll
 */
function syncBerandaLyricsWithAudio() {
    if (!audioElement) return;

    // Remove previous listener if exists
    if (audioElement.berandaLyricsTimeUpdateListener) {
        audioElement.removeEventListener('timeupdate', audioElement.berandaLyricsTimeUpdateListener);
    }

    const timeUpdateListener = () => {
        const currentTime = audioElement.currentTime;
        const lyricsContent = document.getElementById('playerLyricsContent');
        
        if (!lyricsContent) return;

        const lines = lyricsContent.querySelectorAll('.lyric-line');
        const lyricsContainer = lyricsContent.closest('.lyrics-karaoke-display');

        lines.forEach((line, idx) => {
            const start = parseFloat(line.dataset.start);
            const end = parseFloat(line.dataset.end);
            const next = lines[idx + 1];
            const nextStart = next ? parseFloat(next.dataset.start) : end;
            const actualEnd = nextStart > 0 ? nextStart : (end || audioElement.duration);

            if (currentTime >= start && currentTime < actualEnd) {
                line.classList.add('active');
                line.classList.remove('past');
                
                // Auto-scroll to active line hanya jika tidak manual scroll
                if (!lyricsManualScrolling && lyricsContainer) {
                    line.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            } else if (currentTime >= actualEnd) {
                line.classList.remove('active');
                line.classList.add('past');
            } else {
                line.classList.remove('active', 'past');
            }
        });
    };

    audioElement.berandaLyricsTimeUpdateListener = timeUpdateListener;
    audioElement.addEventListener('timeupdate', timeUpdateListener);
}


// ========== SOCIAL MEDIA BADGES & SONG INFO ==========
//
// These renderers are called every time a profile becomes active in the
// music player. Both the badge container and the song-info container are
// *optional* — they hide themselves when the corresponding data is
// missing (as described in the product spec: badges only appear for
// networks the student actually filled in during profile editing, and
// the song info only appears when lyricsArtistName / lyricsSongTitle
// are present on the student record).

// Inline-SVG icon set for the six supported networks. Using inline SVG
// (instead of, say, Font Awesome <i class="fab fa-...">) so the badges
// render with a consistent visual weight and can be colored cleanly via
// CSS currentColor regardless of which icon font is loaded.
const SOCIAL_MEDIA_SVG = {
    instagram: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.063 2.063 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
    twitter: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    threads: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.781 3.631 2.695 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32L5.564 7.828c.978-1.458 2.568-2.263 4.478-2.263h.044c3.194.02 5.097 1.975 5.287 5.388.108.046.216.094.321.142 1.49.7 2.58 1.761 3.154 3.07.797 1.82.871 4.79-1.548 7.158-1.85 1.81-4.094 2.628-7.26 2.65Zm1.003-11.69c-.242 0-.487.007-.739.021-1.836.103-2.98.946-2.916 2.143.067 1.256 1.452 1.839 2.784 1.767 1.224-.065 2.818-.543 3.086-3.71a10.5 10.5 0 0 0-2.215-.221z"/></svg>'
};

const SOCIAL_MEDIA_ORDER = ['instagram', 'tiktok', 'linkedin', 'facebook', 'twitter', 'threads'];

function normalizeSocialUrl(platform, raw) {
    if (!raw) return null;
    const val = String(raw).trim();
    if (!val) return null;
    // Already a full URL
    if (/^https?:\/\//i.test(val)) return val;
    // Username with @ prefix — strip it
    const handle = val.replace(/^@/, '').replace(/^\/+/, '');
    if (!handle) return null;
    switch (platform) {
        case 'instagram': return `https://instagram.com/${handle}`;
        case 'tiktok':    return `https://tiktok.com/@${handle}`;
        case 'linkedin':  return `https://linkedin.com/in/${handle}`;
        case 'facebook':  return `https://facebook.com/${handle}`;
        case 'twitter':   return `https://twitter.com/${handle}`;
        case 'threads':   return `https://threads.net/@${handle}`;
        default:          return val;
    }
}

function renderSocialMediaBadges(socialMedia) {
    const container = document.getElementById('playerSocialMediaBadges');
    if (!container) return;

    container.innerHTML = '';

    // Filter to only platforms the student actually provided. Empty /
    // null / whitespace values are skipped.
    const entries = SOCIAL_MEDIA_ORDER
        .map(p => [p, normalizeSocialUrl(p, socialMedia?.[p])])
        .filter(([, url]) => !!url);

    if (entries.length === 0) {
        container.style.display = 'none';
        return;
    }

    entries.forEach(([platform, url]) => {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.className = `social-badge social-badge-${platform}`;
        a.title = platform.charAt(0).toUpperCase() + platform.slice(1);
        a.setAttribute('aria-label', `Open ${platform} profile`);
        a.innerHTML = SOCIAL_MEDIA_SVG[platform];
        container.appendChild(a);
    });

    container.style.display = 'flex';
}

function renderSongInfo(student) {
    const wrap = document.getElementById('playerSongInfo');
    const titleEl = document.getElementById('playerSongTitle');
    const artistEl = document.getElementById('playerSongArtist');
    if (!wrap || !titleEl || !artistEl) return;

    const title = (student?.lyricsSongTitle || '').trim();
    const artist = (student?.lyricsArtistName || '').trim();

    // Hide entirely when both are missing. When only one exists, hide
    // the divider dot and just show the one that's present.
    if (!title && !artist) {
        wrap.style.display = 'none';
        return;
    }

    titleEl.textContent = title;
    artistEl.textContent = artist;

    const divider = wrap.querySelector('.song-info-divider');
    if (divider) divider.style.display = (title && artist) ? '' : 'none';

    wrap.style.display = 'inline-flex';
}
