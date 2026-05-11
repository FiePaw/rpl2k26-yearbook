// wali-kelas.js
const API_URL = 'https://rpl2k26.site';
let allTeachers = [];
let currentTeacherIndex = 0;

// Wait for loading to complete first
document.addEventListener('loadingComplete', () => {
    console.log('📍 Loading Complete on Teachers, starting page initialization...');
    initPageContent();
});

// Fallback if loadingComplete doesn't fire (after 6 seconds)
setTimeout(() => {
    if (!window.pageInitialized) {
        console.warn('⚠️ Loading timeout, initializing page anyway');
        initPageContent();
    }
}, 6000);

function initPageContent() {
    window.pageInitialized = true;
    checkLoginStatus();
    initTheme();
    loadTeachers();
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
        profileLink.href = 'profile.html';
    } else {
        profileLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'index.html';
        });
    }
    
    userBtn.addEventListener('click', async () => {
        if (user) {
            const result = await popup.confirm('Are you sure you want to logout?');
            if (result) {
                localStorage.removeItem('user');
                window.location.href = 'index.html';
            }
        } else {
            window.location.href = 'index.html';
        }
    });
}

// Theme toggle
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

// Load teachers
async function loadTeachers() {
    try {
        const response = await fetch(`${API_URL}/api/teachers`);
        const teachers = await response.json();
        displayTeachers(teachers);
    } catch (error) {
        console.error('Error loading teachers:', error);
    }
}

// Display teachers
function displayTeachers(teachers) {
    const grid = document.getElementById('teachersGrid');
    grid.innerHTML = '';
    
    teachers.forEach(teacher => {
        const card = createTeacherCard(teacher);
        grid.appendChild(card);
    });
}

// Create teacher card
function createTeacherCard(teacher) {
    const card = document.createElement('div');
    card.className = 'teacher-card';
    
    const photoUrl = teacher.photo || 'https://via.placeholder.com/300x300?text=' + encodeURIComponent(teacher.name);
    const gradeLabel = teacher.grade === 'grade10' ? 'Grade 10' : 
                       teacher.grade === 'grade11' ? 'Grade 11' : 'Grade 12';
    
    card.innerHTML = `
        <div class="card-photo-section">
            <div class="card-photo-frame">
                <img src="${photoUrl}" alt="${teacher.name}" loading="lazy" decoding="async">
                <div class="play-overlay">
                    <div class="play-btn">
                        <i class="fas fa-star"></i>
                    </div>
                </div>
            </div>
        </div>
        <div class="card-content-section">
            <div class="card-message-label">
                <span>Message & Thoughts</span>
            </div>
            <div class="card-message-box">
                ${teacher.message || 'No message yet...'}
            </div>
            <div class="card-footer">
                <h3>${teacher.name}</h3>
                <p>${gradeLabel} Wali kelas</p>
            </div>
        </div>
        <div class="card-info">
            <h3>${teacher.name}</h3>
            <p>${gradeLabel} Wali kelas</p>
        </div>
    `;
    
    card.addEventListener('click', () => showTeacherDetail(teacher));
    
    return card;
}

// Show teacher detail modal
function showTeacherDetail(teacher) {
    const form = document.getElementById('teacherDetailForm');
    const photoUrl = teacher.photo || 'https://via.placeholder.com/400x400?text=' + encodeURIComponent(teacher.name);
    const gradeLabel = teacher.grade === 'grade10' ? 'Kelas 10' : 
                       teacher.grade === 'grade11' ? 'Kelas 11' : 'Kelas 12';
    
    document.getElementById('detailPhoto').src = photoUrl;
    document.getElementById('detailName').textContent = teacher.name;
    document.getElementById('detailGrade').textContent = gradeLabel + ' Wali kelas';
    document.getElementById('detailMessage').textContent = teacher.message || 'Belom ada pesan kesan nya...';
    
    form.style.display = 'block';
}

// Close detail form
const closeDetailFormBtn = document.getElementById('closeDetailForm');
closeDetailFormBtn.addEventListener('click', () => {
    document.getElementById('teacherDetailForm').style.display = 'none';
});

// Close when clicking outside
window.addEventListener('click', (e) => {
    const form = document.getElementById('teacherDetailForm');
    if (e.target === form) {
        form.style.display = 'none';
    }
});

// Sidebar Navigation
function initSidebar() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarClose = document.getElementById('sidebarClose');
    const sidebarNav = document.getElementById('sidebarNav');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebarProfileLink = document.getElementById('sidebarProfileLink');
    const sidebarThemeToggle = document.getElementById('sidebarThemeToggle');
    
    // Toggle sidebar
    sidebarToggle.addEventListener('click', () => {
        sidebarNav.classList.add('active');
        sidebarOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
    
    // Close sidebar
    function closeSidebar() {
        sidebarNav.classList.remove('active');
        sidebarOverlay.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
    
    sidebarClose.addEventListener('click', closeSidebar);
    sidebarOverlay.addEventListener('click', closeSidebar);
    
    // Close sidebar when navigation link is clicked
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => {
        item.addEventListener('click', closeSidebar);
    });
    
    // Profile link in sidebar
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        sidebarProfileLink.addEventListener('click', (e) => {
            e.preventDefault();
            closeSidebar();
            window.location.href = 'index.html';
        });
    } else {
        sidebarProfileLink.href = 'profile.html';
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