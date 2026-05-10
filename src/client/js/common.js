// common.js - For pages without specific functionality

// Wait for loading to complete first
document.addEventListener('loadingComplete', () => {
    console.log('📍 Loading Complete on Memories, starting page initialization...');
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
    
    userBtn.addEventListener('click', () => {
        if (user) {
            if (confirm('Logout?')) {
                localStorage.removeItem('user');
                window.location.href = 'index.html';
            }
        } else {
            window.location.href = 'index.html';
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
    const themeToggle = e.target.closest('#themeToggle');
    
    if (!themeToggle) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const theme = document.documentElement.getAttribute('data-theme');
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    
    console.log(`🎨 Theme changed: ${theme} → ${newTheme}`);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('#themeToggle i');
    if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        console.log(`🎨 Theme icon updated to:`, icon.className);
    }
}

// Sidebar Navigation
function initSidebar() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarClose = document.getElementById('sidebarClose');
    const sidebarNav = document.getElementById('sidebarNav');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebarProfileLink = document.getElementById('sidebarProfileLink');
    const sidebarThemeToggle = document.getElementById('sidebarThemeToggle');
    
    if (!sidebarToggle) return; // Skip if sidebar doesn't exist
    
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
    
    // Theme toggle in sidebar
    sidebarThemeToggle.addEventListener('click', () => {
        const theme = document.documentElement.getAttribute('data-theme');
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
        updateSidebarThemeIcon(newTheme);
    });
    
    // Update sidebar theme icon on load
    const currentTheme = localStorage.getItem('theme') || 'dark';
    updateSidebarThemeIcon(currentTheme);
}

function updateSidebarThemeIcon(theme) {
    const sidebarThemeBtn = document.getElementById('sidebarThemeToggle');
    if (!sidebarThemeBtn) return;
    
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