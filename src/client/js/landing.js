// landing.js
const API_URL = 'https://rpl2k26.site';

// ========== LOADING TIMING CONFIGURATION ==========
// JANGAN OTAK ATIK KALO GAK NGERTI!!
const LANDING_PAGE_CONFIG = {
    LOADING_DURATION: 300,      // Reduced from 500ms
    CONTENT_TRANSITION_DELAY: 100,  // Reduced from 200ms
    ANIMATION_START_DELAY: 50,  // Reduced from 100ms
};

const TOTAL_WAIT_TIME_LANDING = LANDING_PAGE_CONFIG.LOADING_DURATION + 
                                LANDING_PAGE_CONFIG.CONTENT_TRANSITION_DELAY + 
                                LANDING_PAGE_CONFIG.ANIMATION_START_DELAY;

// Gradient colors for cards config
// JANGAN SENTUH KALO GAK NGERTI!
const CARD_GRADIENTS = [
    'linear-gradient(135deg, #085078, #85d8ce)',
    'linear-gradient(135deg, #9198e5, #712020)',
    'linear-gradient(135deg, #FF6B6B, #4ECDC4)',
    'linear-gradient(135deg, #1DB954, #1ed760)',
    'linear-gradient(135deg, #667eea, #764ba2)'
];

// Carousel configuration 
// JANGAN SENTUH KALO GAK NGERTI!
const CAROUSEL_CONFIG = {
    ROTATION_INTERVAL: 5000, // pake ms juga
    CARDS_PER_VIEW: 5,
    TRANSITION_DURATION: 3000 // pake ms
};

// ========== ROTATING TITLE CONFIGURATION ==========
const ROTATING_TITLES = [
    "Algoritma Punya Rumus Pasti,<span class=\"highlight\"><br>Kisah Kita Punya Sejuta Misteri.</span>",
    "Syntax Error Bisa Diperbaiki,<span class=\"highlight\"><br>Waktu Bersama Tak Bisa Diulangi.</span>",
    "Komputer Mengenal 0 dan 1,<span class=\"highlight\"><br>Kita Mengenal Arti Bersatu.</span>",
    "Kita Adalah Variabel Berbeda<span class=\"highlight\"><br>yang Membentuk Satu Fungsi Indah.</span>",
    "Sinyal Wifi Bisa Putus,<span class=\"highlight\"><br>Tali Pertemanan Kita Connected Terus.</span>",
    "Jarak Hanyalah Latency,<span class=\"highlight\"><br>Hati Kita Tetap Terkoneksi.</span>"
];

const TITLE_CONFIG = {
    ROTATION_INTERVAL: 5000, // 5 detik per teks
    FADE_OUT_DURATION: 800, // durasi fade out
    FADE_IN_DURATION: 1000, // durasi fade in
};

let titleState = {
    currentIndex: 0,
    titleInterval: null,
    isAnimating: false
};

let carouselState = {
    allStudents: [],
    currentIndex: 0,
    carouselInterval: null,
    touchStartY: 0,
    touchEndY: 0,
    lastScrollTop: 0,
    isAutoRotating: true
};

// ========== JSON DATA CACHE ==========
// Global cache untuk menyimpan data JSON di memory
let jsonDataCache = {
    students: null,
    database: null,
    lastFetchTime: null,
    isCaching: false
};

// ========== ROTATING TITLE ANIMATION ==========
function initRotatingTitle() {
    const titleElement = document.getElementById('rotatingTitle');
    
    if (!titleElement) {
        console.warn('⚠️ Rotating title element not found');
        return;
    }
    
    console.log('🎬 Initializing rotating title animation');
    
    // Display first title
    rotateTitle();
    
    // Start rotation interval
    titleState.titleInterval = setInterval(() => {
        rotateTitle();
    }, TITLE_CONFIG.ROTATION_INTERVAL);
}

function rotateTitle() {
    if (titleState.isAnimating) return;
    
    const titleElement = document.getElementById('rotatingTitle');
    const titleText = titleElement.querySelector('.title-text');
    
    // Get next title index
    const nextIndex = (titleState.currentIndex + 1) % ROTATING_TITLES.length;
    
    titleState.isAnimating = true;
    
    // Cross-fade: Fade out opacity smooth
    anime({
        targets: titleText,
        duration: TITLE_CONFIG.FADE_OUT_DURATION,
        opacity: 0, // smooth opacity transition to 0
        easing: 'easeInOutQuad',
        complete: () => {
            // Update teks dengan teks baru
            titleText.innerHTML = ROTATING_TITLES[nextIndex];
            titleState.currentIndex = nextIndex;
            
            // Cross-fade: Fade in opacity smooth
            anime({
                targets: titleText,
                duration: TITLE_CONFIG.FADE_IN_DURATION,
                opacity: [0, 1], // smooth opacity transition dari 0 ke 1
                easing: 'easeInOutQuad',
                complete: () => {
                    titleState.isAnimating = false;
                }
            });
        }
    });
}

// Start loading data IMMEDIATELY when page loads (while loading screen is shown)
// This ensures data is ready BEFORE loading screen hides
console.log('🚀 Starting data preload during loading screen...');
initRotatingTitle();
initMobileRotatingTitle();
setupLoginPage();

// Pre-cache JSON data and load cards
(async () => {
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
        // Mobile: start pre-cache AND render mobile cards in parallel
        // Don't wait for pre-cache - loadMobileCards will fetch its own data if needed
        preCacheJsonData().then(ok => {
            console.log(`📦 Pre-cache: ${ok ? '✅' : '⚠️ fallback'}`);
        }).catch(() => {});
        
        console.log('📱 Mobile detected, loading mobile cards...');
        loadMobileCards();
    } else {
        // Desktop: wait for pre-cache then load carousel
        try {
            const cacheSuccess = await preCacheJsonData();
            console.log(`📦 Pre-cache result: ${cacheSuccess ? '✅ Success' : '⚠️ Failed (will fetch on-demand)'}`);
        } catch (error) {
            console.warn('⚠️ Pre-cache error:', error.message);
        }

        Promise.race([
            loadStudentCards(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Loading timeout')), 8000))
        ]).catch(error => {
            console.error('❌ Error loading student cards:', error);
            const container = document.getElementById('studentCardsContainer');
            if (container) {
                container.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-secondary); font-size: 0.9rem; width: 100%; display: flex; align-items: center; justify-content: center; min-height: 180px;">⚠️ Unable to load cards</div>';
            }
        });
    }
})();

// Wait for loading screen to hide before considering page ready
setTimeout(() => {
    console.log('📍 Loading animation complete, page ready!');
    window.pageInitialized = true;
}, TOTAL_WAIT_TIME_LANDING);

// Fallback if nothing happens
setTimeout(() => {
    if (!window.pageInitialized) {
        console.warn('⚠️ Loading timeout, marking page as initialized anyway');
        window.pageInitialized = true;
    }
}, TOTAL_WAIT_TIME_LANDING + 500);

// Pre-cache JSON data function
async function preCacheJsonData() {
    // Prevent multiple simultaneous caching attempts
    if (jsonDataCache.isCaching) {
        console.log('⏳ JSON data is already being cached...');
        return false;
    }
    
    try {
        jsonDataCache.isCaching = true;
        console.log('📥 Pre-caching JSON data into memory...');
        
        // Cache-busting dengan timestamp
        const timestamp = new Date().getTime();
        
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.log('⏱️ Pre-cache timeout triggered');
            controller.abort();
        }, 5000);
        
        try {
            const [studentRes, dbRes] = await Promise.all([
                fetch(`${API_URL}/api/students/names`, { 
                    cache: 'no-cache',
                    signal: controller.signal
                }),
                fetch(`${API_URL}/api/students`, { 
                    cache: 'no-cache',
                    signal: controller.signal
                })
            ]);
            
            clearTimeout(timeoutId);
            
            if (studentRes.ok && dbRes.ok) {
                const studentsArr = await studentRes.json();
                const studentsFullArr = await dbRes.json();
                // API /api/students/names → [{id, name, nickname}]
                // API /api/students       → [{id, name, nickname, photo, audioFile, ...}]
                jsonDataCache.students = studentsArr;
                // Bungkus dalam format {students:[...]} agar kompatibel dengan kode lama
                jsonDataCache.database = { students: Array.isArray(studentsFullArr) ? studentsFullArr : [] };
                jsonDataCache.lastFetchTime = Date.now();
                jsonDataCache.isCaching = false;
                
                console.log('✅ JSON data successfully cached in memory');
                console.log('   - Students:', jsonDataCache.students?.length || 0);
                console.log('   - Profiles:', jsonDataCache.database?.students?.length || 0);
                return true;
            } else {
                throw new Error(`HTTP Error: ${studentRes.status}, ${dbRes.status}`);
            }
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    } catch (error) {
        jsonDataCache.isCaching = false;
        console.warn('⚠️ Pre-cache failed:', error.message);
        console.log('💡 Will fetch data on-demand in loadStudentCards()');
        return false;
    }
}

// Load and display student cards with carousel rotation
async function loadStudentCards() {
    try {
        let allStudents, dbData;
        
        // ===== TRY CACHE FIRST =====
        if (jsonDataCache.students && jsonDataCache.database) {
            console.log('💾 Using cached JSON data');
            allStudents = jsonDataCache.students;
            dbData = jsonDataCache.database;
        } else {
            // ===== IF NO CACHE, FETCH NOW =====
            console.log('🔄 Cache miss, fetching data from server...');
            const timestamp = new Date().getTime();
            
            try {
                // Create AbortController for timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => {
                    console.log('⏱️ Fetch timeout triggered');
                    controller.abort();
                }, 6000);
                
                try {
                    const [studentRes, dbRes] = await Promise.all([
                        fetch(`${API_URL}/api/students/names`, { 
                            cache: 'no-cache',
                            signal: controller.signal
                        }),
                        fetch(`${API_URL}/api/students`, { 
                            cache: 'no-cache',
                            signal: controller.signal
                        })
                    ]);
                    
                    clearTimeout(timeoutId);
                    
                    if (!studentRes.ok || !dbRes.ok) {
                        throw new Error(`HTTP Error: ${studentRes.status}, ${dbRes.status}`);
                    }
                    
                    allStudents = await studentRes.json();
                    const studentsFullArr = await dbRes.json();
                    // Bungkus agar kompatibel dengan kode lama yang akses dbData.students
                    dbData = { students: Array.isArray(studentsFullArr) ? studentsFullArr : [] };
                    
                    // Store in cache for next time
                    jsonDataCache.students = allStudents;
                    jsonDataCache.database = dbData;
                    jsonDataCache.lastFetchTime = Date.now();
                    
                    console.log('✅ Fetched and cached data');
                } catch (fetchError) {
                    clearTimeout(timeoutId);
                    throw fetchError;
                }
            } catch (fetchError) {
                console.warn('⚠️ Fetch failed:', fetchError.message);
                // Use empty fallback
                allStudents = [];
                dbData = { students: [] };
            }
        }
        
        // Filter out admin and non-student entries
        const filteredStudents = Array.isArray(allStudents) 
            ? allStudents.filter(s => s && s.id && s.id.startsWith('student_'))
            : [];
        
        if (filteredStudents.length === 0) {
            console.warn('⚠️ No students found in data');
        }
        
        // Create map of student profiles for photo lookup
        const studentProfileMap = {};
        if (dbData && dbData.students && Array.isArray(dbData.students)) {
            dbData.students.forEach(profile => {
                if (profile && profile.id) {
                    studentProfileMap[profile.id] = profile;
                }
            });
        }
        
        carouselState.allStudents = filteredStudents;
        carouselState.studentProfiles = studentProfileMap;
        
        console.log('📸 Loaded', filteredStudents.length, 'students for carousel');
        
        // Display first batch immediately (even if empty)
        displayCarouselCards();
        
        // Setup gesture handlers only if we have students
        if (filteredStudents.length > 0) {
            setupGestureHandlers();
            
            // Preload images for first batch in the background
            preloadFirstBatchImages();
            
            // Start carousel rotation
            startAutoRotation();
        }
        
    } catch (error) {
        console.error('❌ Critical error loading student cards:', error);
        // Ensure container is visible with error message
        const container = document.getElementById('studentCardsContainer');
        if (container) {
            container.style.visibility = 'visible';
            container.style.opacity = '1';
        }
    }
}

// Display current batch of 5 cards with stagger animation
function displayCarouselCards() {
    const container = document.getElementById('studentCardsContainer');
    if (!container) {
        console.error('❌ Cards container not found!');
        return;
    }
    
    // Ensure container is visible immediately
    container.style.visibility = 'visible';
    container.style.opacity = '1';
    
    const totalStudents = carouselState.allStudents.length;
    
    if (totalStudents === 0) {
        container.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-secondary); font-size: 0.9rem; width: 100%; display: flex; align-items: center; justify-content: center; min-height: 180px;">📝 Cards are loading...</div>';
        return;
    }
    
    const cardsPerView = CAROUSEL_CONFIG.CARDS_PER_VIEW;
    
    // Get current batch of students (with wrap-around)
    const currentBatch = [];
    for (let i = 0; i < cardsPerView; i++) {
        const index = (carouselState.currentIndex + i) % totalStudents;
        currentBatch.push(carouselState.allStudents[index]);
    }
    
    // Clear container immediately and build HTML in one go
    container.innerHTML = currentBatch.map((student, index) => {
        if (!student || !student.id) {
            console.warn('⚠️ Invalid student data');
            return '';
        }
        
        // Get student profile for photo
        let photoUrl = null;
        const studentProfile = carouselState.studentProfiles[student.id];
        
        if (studentProfile && studentProfile.photo) {
            photoUrl = studentProfile.photo;
        }
        
        // Build card HTML with initial visibility
        const gradientIndex = index % CARD_GRADIENTS.length;
        const imgStyle = photoUrl 
            ? `background-image: url('${photoUrl}'); background-size: cover; background-position: center;`
            : `background: ${CARD_GRADIENTS[gradientIndex]};`;
        
        return `
            <div class="card" style="opacity: 1; transform: translateY(0px); visibility: visible;">
                <div class="img" style="${imgStyle}"></div>
                <div class="textBox">
                    <div class="textContent">
                        <p class="h1">${truncateName(student.name)}</p>
                        <span class="span">now</span>
                    </div>
                    <p class="p">Class RPL 2k26</p>
                </div>
            </div>
        `;
    }).join('');
    
    // Animate cards in with reduced delay (staggered entrance)
    const cards = container.querySelectorAll('.card');
    if (cards.length > 0) {
        anime({
            targets: cards,
            duration: 300,
            opacity: [0.7, 1],
            translateY: ['10px', '0px'],
            delay: anime.stagger(50),
            easing: 'easeOutQuad'
        });
    }
}

// Rotate forward (next batch)
function rotateCarouselForward() {
    const totalStudents = carouselState.allStudents.length;
    carouselState.currentIndex = (carouselState.currentIndex + CAROUSEL_CONFIG.CARDS_PER_VIEW) % totalStudents;
    displayCarouselCards();
    console.log(`🔄 Carousel rotated forward to index ${carouselState.currentIndex}`);
}

// Rotate backward (previous batch)
function rotateCarouselBackward() {
    const totalStudents = carouselState.allStudents.length;
    carouselState.currentIndex = (carouselState.currentIndex - CAROUSEL_CONFIG.CARDS_PER_VIEW + totalStudents) % totalStudents;
    displayCarouselCards();
    console.log(`🔄 Carousel rotated backward to index ${carouselState.currentIndex}`);
}

// Start auto rotation
function startAutoRotation() {
    if (carouselState.carouselInterval) {
        clearInterval(carouselState.carouselInterval);
    }
    carouselState.carouselInterval = setInterval(() => {
        if (carouselState.isAutoRotating) {
            rotateCarouselForward();
        }
    }, CAROUSEL_CONFIG.ROTATION_INTERVAL);
}

// Setup swipe and scroll handlers
function setupGestureHandlers() {
    const container = document.getElementById('studentCardsContainer');
    
    // Mobile Swipe Handlers
    container.addEventListener('touchstart', (e) => {
        carouselState.touchStartY = e.touches[0].clientY;
        carouselState.isAutoRotating = false;
        // Pause auto-rotation during interaction
        clearInterval(carouselState.carouselInterval);
    }, false);
    
    container.addEventListener('touchend', (e) => {
        carouselState.touchEndY = e.changedTouches[0].clientY;
        handleSwipe();
        // Resume auto-rotation after interaction
        setTimeout(() => {
            carouselState.isAutoRotating = true;
            startAutoRotation();
        }, 2000);
    }, false);
    
    // Prevent default scroll behavior
    container.addEventListener('scroll', (e) => {
        e.preventDefault();
        container.scrollTop = 0;
    }, { passive: false });
    
    // Wheel event for mouse scroll detection
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        const wheelThreshold = 50;
        
        if (e.deltaY > wheelThreshold) {
            // Scroll down (wheel down) - next batch
            console.log('🖱️  Wheel DOWN - showing next batch');
            rotateCarouselForward();
        } else if (e.deltaY < -wheelThreshold) {
            // Scroll up (wheel up) - previous batch
            console.log('🖱️  Wheel UP - showing previous batch');
            rotateCarouselBackward();
        }
        
        // Pause auto-rotation during wheel interaction
        carouselState.isAutoRotating = false;
        clearInterval(carouselState.carouselInterval);
        
        // Resume after 2 seconds
        setTimeout(() => {
            carouselState.isAutoRotating = true;
            startAutoRotation();
        }, 2000);
    }, { passive: false });
}

// Handle swipe gesture (mobile)
function handleSwipe() {
    const swipeThreshold = 50; // minimum distance to trigger swipe
    const diff = carouselState.touchStartY - carouselState.touchEndY;
    
    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
            // Swiped up - next batch
            console.log('👆 Swiped UP - showing next batch');
            rotateCarouselForward();
        } else {
            // Swiped down - previous batch
            console.log('👇 Swiped DOWN - showing previous batch');
            rotateCarouselBackward();
        }
    }
}

// Helper function to truncate name
function truncateName(name) {
    if (name.length > 25) {
        return name.substring(0, 25) + '...';
    }
    return name;
}

// Preload images for first batch of cards
function preloadFirstBatchImages() {
    if (!carouselState.allStudents || carouselState.allStudents.length === 0) return;
    
    const cardsPerView = CAROUSEL_CONFIG.CARDS_PER_VIEW;
    for (let i = 0; i < cardsPerView; i++) {
        const student = carouselState.allStudents[i];
        const studentProfile = carouselState.studentProfiles[student.id];
        
        if (studentProfile && studentProfile.photo) {
            const img = new Image();
            img.src = studentProfile.photo;
        }
    }
    console.log('🖼️ Preloading first batch images');
}

function setupLoginPage() {
    // Modal functionality
    const modal = document.getElementById('loginModal');
    const loginBtn = document.getElementById('loginBtn');
    const headerLoginBtn = document.getElementById('headerLoginBtn');
    const closeBtn = document.getElementsByClassName('close')[0];

    // Handle both login buttons
    const openLoginModal = () => {
        modal.style.display = 'block';
        loadStudentNames();
        loadTeacherNames();
    };

    if (loginBtn) {
        loginBtn.onclick = openLoginModal;
    }
    if (headerLoginBtn) {
        headerLoginBtn.onclick = openLoginModal;
    }

    closeBtn.onclick = () => {
        modal.style.display = 'none';
    };

    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };

    // Tab functionality
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            
            // Remove active class from all tabs
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab
            btn.classList.add('active');
            document.getElementById(tabName + 'Tab').classList.add('active');
        });
    });
    
    // Setup form submissions
    setupFormListeners();
}

// Load student names
async function loadStudentNames() {
    try {
        const response = await fetch(`${API_URL}/api/students/names`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            cache: 'no-cache'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const select = document.getElementById('studentName');
        
        select.innerHTML = '<option value="">Select your name...</option>';
        data.forEach(student => {
            const option = document.createElement('option');
            option.value = student.id;
            option.textContent = student.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading student names:', error);
        popup.error('Gagal memuat data murid. Pastikan server sudah berjalan di http://13.215.61.92:5000\n\nError: ' + error.message);
    }
}

// Load teacher names
async function loadTeacherNames() {
    try {
        const response = await fetch(`${API_URL}/api/teachers/names`);
        const data = await response.json();
        const select = document.getElementById('teacherName');
        
        select.innerHTML = '<option value="">Select your name...</option>';
        data.forEach(teacher => {
            const option = document.createElement('option');
            option.value = teacher.id;
            option.textContent = teacher.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading teacher names:', error);
    }
}

// Student login
function setupFormListeners() {
    document.getElementById('studentLoginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const studentId = document.getElementById('studentName').value;
        const password = document.getElementById('studentPassword').value;
        
        if (!studentId) {
            popup.warning('Please select your name');
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/api/login/student`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ studentId, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                localStorage.setItem('user', JSON.stringify({
                    type: 'student',
                    id: studentId,
                    name: data.name,
                    nickname: data.nickname
                }));
                
                popup.success('Login successful!');
                window.location.href = 'beranda';
            } else {
                popup.error(data.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            popup.error('Login failed. Please try again.');
        }
    });

    // Teacher login
    document.getElementById('teacherLoginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const teacherId = document.getElementById('teacherName').value;
        const password = document.getElementById('teacherPassword').value;
        
        if (!teacherId) {
            popup.warning('Please select your name');
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/api/login/teacher`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ teacherId, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                localStorage.setItem('user', JSON.stringify({
                    type: 'teacher',
                    id: teacherId,
                    name: data.name,
                    nickname: data.nickname
                }));
                
                popup.success('Login successful!');
                window.location.href = 'beranda.html';
            } else {
                popup.error(data.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            popup.error('Login failed. Please try again.');
        }
    });

    // Admin login
    document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const adminId = document.getElementById('adminId').value;
        const password = document.getElementById('adminPassword').value;
        
        if (!adminId) {
            popup.warning('Please enter admin ID');
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/api/login/admin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ adminId, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                localStorage.setItem('user', JSON.stringify({
                    type: 'admin',
                    id: adminId,
                    name: data.name,
                    nickname: data.nickname
                }));
                
                popup.success('Admin login successful!');
                window.location.href = 'profile.html';
            } else {
                popup.error(data.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            popup.error('Login failed. Please try again.');
        }
    });

    // Check if already logged in
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        const loginBtn = document.getElementById('loginBtn');
        loginBtn.innerHTML = `<i class="fas fa-user"></i> ${user.nickname}`;
    }
}



// ═══════════════════════════════════════════════════════════════
//  MOBILE LANDING — rotating title + horizontal cards
// ═══════════════════════════════════════════════════════════════

/**
 * Rotating title khusus untuk element #rotatingTitleMobile
 */
function initMobileRotatingTitle() {
    const el = document.getElementById('rotatingTitleMobile');
    if (!el) return;

    const textEl = el.querySelector('.mobile-title-text');
    if (!textEl) return;

    // Set teks awal (index 1, biar sync berbeda dengan desktop)
    textEl.innerHTML = ROTATING_TITLES[1].replace(/<br>/g, ' ');

    let mobileIdx = 1;

    setInterval(() => {
        // Fade out
        textEl.style.transition = 'opacity 0.5s ease';
        textEl.style.opacity = '0';

        setTimeout(() => {
            mobileIdx = (mobileIdx + 1) % ROTATING_TITLES.length;
            // Hapus tag <br> — baris mobile lebih sempit, biarkan natural wrap
            textEl.innerHTML = ROTATING_TITLES[mobileIdx].replace(/<br>/g, ' ');
            textEl.style.opacity = '1';
        }, 520);
    }, TITLE_CONFIG.ROTATION_INTERVAL);
}

/**
 * Load & render horizontal card strip di mobile
 */
async function loadMobileCards() {
    const strip = document.getElementById('mobileCardsScroll');
    if (!strip) {
        console.warn('⚠️ #mobileCardsScroll element not found');
        return;
    }

    console.log('📱 loadMobileCards() called');

    // Tampilkan skeleton sementara data loading
    strip.innerHTML = Array(6).fill(0).map(() => `
        <div class="mobile-card-skeleton">
            <div class="skel-photo"></div>
            <div class="skel-text"></div>
            <div class="skel-text-sm"></div>
        </div>
    `).join('');

    let students, dbData;

    // Pakai cache kalau sudah ada
    if (jsonDataCache.students && jsonDataCache.database) {
        students = jsonDataCache.students;
        dbData   = jsonDataCache.database;
    } else {
        try {
            const ts = Date.now();
            const [sRes, dRes] = await Promise.all([
                fetch(`${API_URL}/api/students/names`, { cache: 'no-cache' }),
                fetch(`${API_URL}/api/students`, { cache: 'no-cache' })
            ]);
            students = await sRes.json();
            const studentsFullArr = await dRes.json();
            // Bungkus dalam format {students:[...]} agar kompatibel dengan kode lama
            dbData = { students: Array.isArray(studentsFullArr) ? studentsFullArr : [] };
            jsonDataCache.students  = students;
            jsonDataCache.database  = dbData;
        } catch (err) {
            console.warn('⚠️ Mobile cards fetch failed:', err.message);
            strip.innerHTML = '<p style="padding:1rem;color:#B3B3B3;font-size:0.8rem;">⚠️ Gagal memuat data</p>';
            return;
        }
    }

    // Filter hanya student
    const filtered = (Array.isArray(students) ? students : [])
        .filter(s => s && s.id && s.id.startsWith('student_'));

    if (filtered.length === 0) {
        strip.innerHTML = '<p style="padding:1rem;color:#B3B3B3;font-size:0.8rem;">📝 Data tidak tersedia</p>';
        return;
    }

    // Buat map foto
    const photoMap = {};
    (dbData?.students || []).forEach(p => {
        if (p?.id) photoMap[p.id] = p.photo || null;
    });

    // Gradient fallback per index
    const gradients = CARD_GRADIENTS;

    // Render kartu
    strip.innerHTML = filtered.map((s, i) => {
        const photo = photoMap[s.id];
        const photoStyle = photo
            ? `background-image:url('${photo}');background-size:cover;background-position:center;`
            : `background:${gradients[i % gradients.length]};`;

        const shortName = s.name && s.name.length > 18
            ? s.name.substring(0, 18) + '…'
            : (s.name || '—');

        return `
        <div class="mobile-card" onclick="window.location.href='beranda'">
            <div class="mobile-card-photo" style="${photoStyle}"></div>
            <div class="mobile-card-info">
                <p class="mobile-card-name">${shortName}</p>
                <p class="mobile-card-class">RPL 2k26</p>
            </div>
        </div>`;
    }).join('');

    console.log(`📱 Mobile cards rendered: ${filtered.length} students`);
}
