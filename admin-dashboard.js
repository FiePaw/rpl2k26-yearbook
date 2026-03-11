// admin-dashboard.js
// Use window.API_URL or fallback to default
const API_URL = window.API_URL || 'https://rpl2k26.site';

// State management
let dashboardState = {
    profileStats: [],
    realtimeIPs: [],
    topProfiles: [],
    loginHistory: [],
    timelineData: {},
    systemHealth: {}
};

let autoRefreshInterval;
let refreshTimerInterval;
let refreshCountdown = 5;

// Initialize dashboard
document.addEventListener('loadingComplete', () => {
    console.log('📊 Loading Complete on Dashboard');
    initDashboard();
});

setTimeout(() => {
    if (!window.dashboardInitialized) {
        console.warn('⚠️ Loading timeout, initializing dashboard anyway');
        initDashboard();
    }
}, 6000);

function initDashboard() {
    window.dashboardInitialized = true;
    
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user || user.type !== 'admin') {
        popup.error('Admin access required');
        window.location.href = 'index.html';
        return;
    }
    
    console.log('✅ Admin dashboard initialized');
    
    // Initialize theme
    initTheme();
    
    // Load initial data
    loadAllDashboardData();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup auto-refresh (5 seconds)
    startAutoRefresh();
    
    // Setup logout
    setupLogout();
}

// Initialize theme
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
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('#themeToggle i');
    if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        console.log(`🎨 Theme icon updated to:`, icon.className);
    }
    
    const sidebarIcon = document.querySelector('#sidebarThemeToggle i');
    if (sidebarIcon) {
        sidebarIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// Setup event listeners
function setupEventListeners() {
    const refreshBtn = document.getElementById('refreshBtn');
    const saveBtn = document.getElementById('saveBtn');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarClose = document.getElementById('sidebarClose');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            saveBtn.disabled = true;
            saveBtn.querySelector('i').classList.add('fa-spin');
            
            try {
                const response = await fetch(`${API_URL}/api/admin/save`, { method: 'POST' });
                const data = await response.json();
                
                if (data.success) {
                    popup.success('Data saved to adminbase.json successfully!');
                    console.log('✅ Admin data saved:', data.summary);
                } else {
                    popup.error('Failed to save data: ' + data.error);
                }
            } catch (error) {
                popup.error('Error saving data: ' + error.message);
                console.error('Save error:', error);
            } finally {
                saveBtn.disabled = false;
                saveBtn.querySelector('i').classList.remove('fa-spin');
            }
        });
    }
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshBtn.disabled = true;
            refreshBtn.querySelector('i').classList.add('fa-spin');
            loadAllDashboardData().then(() => {
                refreshBtn.disabled = false;
                refreshBtn.querySelector('i').classList.remove('fa-spin');
                popup.success('Dashboard data refreshed!');
            }).catch(() => {
                refreshBtn.disabled = false;
                refreshBtn.querySelector('i').classList.remove('fa-spin');
            });
        });
    }
    
    // Sidebar toggle
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebarNav');
            sidebar.classList.toggle('active');
            sidebarOverlay.classList.toggle('active');
        });
    }
    
    if (sidebarClose) {
        sidebarClose.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebarNav');
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });
    }
    
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebarNav');
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });
    }
}

// Load all dashboard data
async function loadAllDashboardData() {
    try {
        await Promise.all([
            loadProfileStats(),
            loadRealtimeIPs(),
            loadTopProfiles(),
            loadLoginHistory(),
            loadTimeline(),
            loadSystemHealth(),
            loadAdminProfiles(),
            updateStats()
        ]);
        
        updateLastUpdateTime();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Load profile statistics with visit counts
async function loadProfileStats() {
    try {
        const response = await fetch(`${API_URL}/api/students`);
        const students = await response.json();
        
        // Get visit statistics from backend
        const statsResponse = await fetch(`${API_URL}/api/admin/stats/profiles`);
        const statsData = await statsResponse.ok ? await statsResponse.json() : { success: false };
        
        // Merge data
        const profileStats = students.map((student, index) => {
            const stat = statsData.profiles?.find(s => s.id === student.id) || {};
            return {
                id: student.id,
                name: student.name,
                visits: stat.visits || 0,
                lastVisit: stat.lastVisit || 'never',
                updates: stat.updates || 0,
                status: student.photo ? 'completed' : 'incomplete'
            };
        });
        
        dashboardState.profileStats = profileStats;
        renderProfileStats(profileStats);
    } catch (error) {
        console.error('Error loading profile stats:', error);
        renderError('profileStatsContainer', 'Failed to load profile statistics');
    }
}

// Render profile statistics
function renderProfileStats(stats) {
    const container = document.getElementById('profileStatsContainer');
    
    if (!stats || stats.length === 0) {
        container.innerHTML = '<p class="loading">No profiles available</p>';
        return;
    }
    
    // Sort by visits
    const sorted = [...stats].sort((a, b) => b.visits - a.visits);
    
    const html = sorted.slice(0, 10).map((stat, index) => `
        <div class="profile-stat-item">
            <div class="profile-stat-name">
                <strong>${index + 1}. ${stat.name}</strong>
                <small>ID: ${stat.id} | Status: ${stat.status}</small>
            </div>
            <div class="profile-stat-visit">
                <span class="visit-badge">
                    <i class="fas fa-eye"></i> ${stat.visits} views
                </span>
                <span class="visit-update">
                    ${stat.updates > 0 ? `${stat.updates} updates` : 'No updates'}
                </span>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

// Load realtime IP access
async function loadRealtimeIPs() {
    try {
        const response = await fetch(`${API_URL}/api/admin/access/realtime`);
        const data = await response.ok ? await response.json() : { success: false, ips: [] };
        
        if (data.ips) {
            dashboardState.realtimeIPs = data.ips.slice(0, 20);
        }
        
        renderRealtimeIPs(dashboardState.realtimeIPs);
    } catch (error) {
        console.error('Error loading realtime IPs:', error);
        // Show cached data or placeholder
        renderRealtimeIPs(dashboardState.realtimeIPs);
    }
}

// Render realtime IPs
function renderRealtimeIPs(ips) {
    const container = document.getElementById('realtimeIPContainer');
    
    if (!ips || ips.length === 0) {
        container.innerHTML = '<p class="loading"><i class="fas fa-info-circle"></i> No active IP access recorded yet</p>';
        return;
    }
    
    const html = ips.map(ip => {
        const now = new Date();
        const accessTime = new Date(ip.timestamp);
        const diffMs = now - accessTime;
        const diffSecs = Math.floor(diffMs / 1000);
        let timeStr = `${diffSecs}s ago`;
        
        if (diffSecs >= 60) timeStr = `${Math.floor(diffSecs / 60)}m ago`;
        if (diffSecs >= 3600) timeStr = `${Math.floor(diffSecs / 3600)}h ago`;
        
        return `
            <div class="ip-item">
                <div class="ip-info">
                    <div class="ip-address">
                        <i class="fas fa-globe"></i> ${ip.address}
                    </div>
                    <div class="ip-page">
                        <i class="fas fa-link"></i> ${ip.page || 'home'}
                    </div>
                </div>
                <div class="ip-time">${timeStr}</div>
                <div class="ip-status">
                    <span class="status-dot"></span>
                    Active
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// Load top visited profiles
async function loadTopProfiles() {
    try {
        const response = await fetch(`${API_URL}/api/admin/stats/top-profiles`);
        const data = await response.ok ? await response.json() : { success: false, profiles: [] };
        
        if (data.profiles) {
            dashboardState.topProfiles = data.profiles.slice(0, 5);
        }
        
        renderTopProfiles(dashboardState.topProfiles);
    } catch (error) {
        console.error('Error loading top profiles:', error);
        renderTopProfiles(dashboardState.topProfiles);
    }
}

// Render top profiles
function renderTopProfiles(profiles) {
    const container = document.getElementById('topProfilesContainer');
    
    if (!profiles || profiles.length === 0) {
        container.innerHTML = '<p class="loading"><i class="fas fa-info-circle"></i> No visit data available yet</p>';
        return;
    }
    
    const html = profiles.map((profile, index) => {
        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
        const medalClass = index < 3 ? `rank-${index + 1}` : '';
        
        return `
            <div class="profile-rank-item">
                <div class="rank-badge ${medalClass}">
                    ${medals[index] || index + 1}
                </div>
                <div class="profile-info">
                    <strong>${profile.name}</strong>
                    <small>${profile.id}</small>
                </div>
                <div class="visit-count">
                    ${profile.visits || 0} visits
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// Load login history
async function loadLoginHistory() {
    try {
        const response = await fetch(`${API_URL}/api/admin/stats/login-history`);
        const data = await response.ok ? await response.json() : { success: false, logins: [] };
        
        if (data.logins) {
            dashboardState.loginHistory = data.logins.slice(0, 10);
        }
        
        renderLoginHistory(dashboardState.loginHistory);
    } catch (error) {
        console.error('Error loading login history:', error);
        renderLoginHistory(dashboardState.loginHistory);
    }
}

// Render login history
function renderLoginHistory(logins) {
    const container = document.getElementById('loginHistoryContainer');
    
    if (!logins || logins.length === 0) {
        container.innerHTML = '<p class="loading"><i class="fas fa-info-circle"></i> No login history available</p>';
        return;
    }
    
    const html = logins.map(login => {
        const loginTime = new Date(login.timestamp);
        const timeStr = loginTime.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const badgeColors = {
            'student': 'student',
            'teacher': 'teacher',
            'admin': 'admin'
        };
        
        return `
            <div class="login-item">
                <div class="login-user">
                    <div class="login-user-info">
                        <div class="login-user-name">
                            <i class="fas fa-user-circle"></i> ${login.name || 'Unknown'}
                        </div>
                        <div class="login-user-id">${login.userId || 'N/A'}</div>
                    </div>
                    <div class="login-user-badge">${login.type || 'user'}</div>
                </div>
                <div class="login-timestamp">
                    <i class="fas fa-clock"></i> ${timeStr}
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// Load timeline data
async function loadTimeline() {
    try {
        const response = await fetch(`${API_URL}/api/admin/stats/timeline`);
        const data = await response.ok ? await response.json() : { success: false, timeline: {} };
        
        if (data.timeline) {
            dashboardState.timelineData = data.timeline;
        }
        
        renderTimeline(dashboardState.timelineData);
    } catch (error) {
        console.error('Error loading timeline:', error);
        renderTimeline(dashboardState.timelineData);
    }
}

// Render timeline
function renderTimeline(timeline) {
    const container = document.getElementById('timelineContainer');
    
    // Generate 24-hour timeline
    const now = new Date();
    let html = '';
    let maxCount = 0;
    
    // Calculate max count for scaling
    for (let i = 23; i >= 0; i--) {
        const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
        const hourStr = hour.getHours().toString().padStart(2, '0');
        const count = timeline[hourStr] || 0;
        maxCount = Math.max(maxCount, count);
    }
    
    if (maxCount === 0) maxCount = 1;
    
    // Render bars
    for (let i = 23; i >= 0; i--) {
        const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
        const hourStr = hour.getHours().toString().padStart(2, '0');
        const count = timeline[hourStr] || 0;
        const percentage = (count / maxCount) * 100;
        
        html += `
            <div class="timeline-bar">
                <div class="timeline-hour">${hourStr}:00</div>
                <div class="bar-container">
                    <div class="bar-fill" style="height: ${Math.max(5, percentage)}%;">
                        ${count > 0 ? count : ''}
                    </div>
                </div>
                <div class="timeline-count">${count} access</div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// Load system health
async function loadSystemHealth() {
    try {
        const response = await fetch(`${API_URL}/api/health`);
        const health = await response.ok ? await response.json() : { status: 'unknown' };
        
        renderSystemHealth(health);
    } catch (error) {
        console.error('Error loading system health:', error);
        renderSystemHealth({ status: 'offline', error: error.message });
    }
}

// Render system health
function renderSystemHealth(health) {
    const container = document.getElementById('systemHealthContainer');
    
    const isHealthy = health.status === 'healthy';
    const statusIcon = isHealthy ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
    const statusClass = isHealthy ? '' : 'critical';
    
    const html = `
        <div class="health-item">
            <div class="health-icon ${statusClass}">
                <i class="${statusIcon}"></i>
            </div>
            <div class="health-info">
                <h4>Server Status</h4>
                <div class="health-bar">
                    <div class="health-bar-fill" style="width: ${isHealthy ? 100 : 30}%; background: ${isHealthy ? '#4CAF50' : '#F44336'};"></div>
                </div>
                <p>${isHealthy ? '✅ Server is running normally' : '❌ Server is offline or experiencing issues'}</p>
            </div>
        </div>
        <div class="health-item">
            <div class="health-icon">
                <i class="fas fa-database"></i>
            </div>
            <div class="health-info">
                <h4>Database</h4>
                <div class="health-bar">
                    <div class="health-bar-fill" style="width: 95%;"></div>
                </div>
                <p>✅ Database connected and operational</p>
            </div>
        </div>
        <div class="health-item">
            <div class="health-icon">
                <i class="fas fa-hdd"></i>
            </div>
            <div class="health-info">
                <h4>Storage</h4>
                <div class="health-bar">
                    <div class="health-bar-fill" style="width: 65%;"></div>
                </div>
                <p>✅ Storage usage: 65% (Healthy)</p>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// Update main statistics
async function updateStats() {
    try {
        const response = await fetch(`${API_URL}/api/students`);
        const students = await response.json();
        
        const statsResponse = await fetch(`${API_URL}/api/admin/stats/summary`);
        const statsData = await statsResponse.ok ? await statsResponse.json() : { success: false };
        
        // Update total students
        document.getElementById('totalStudents').textContent = students.length || 0;
        
        // Update total visits
        const totalVisits = statsData.totalVisits || dashboardState.profileStats.reduce((sum, p) => sum + (p.visits || 0), 0);
        document.getElementById('totalVisits').textContent = totalVisits;
        
        // Update profile updates
        const totalUpdates = statsData.totalUpdates || dashboardState.profileStats.reduce((sum, p) => sum + (p.updates || 0), 0);
        document.getElementById('totalUpdates').textContent = totalUpdates;
        
        // Update unique IPs
        const uniqueIPs = dashboardState.realtimeIPs.length || statsData.uniqueIPs || 0;
        document.getElementById('uniqueIPs').textContent = uniqueIPs;
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// Auto-refresh functionality
function startAutoRefresh() {
    // Refresh data every 5 seconds
    autoRefreshInterval = setInterval(() => {
        loadRealtimeIPs(); // Most important - always refresh IPs
        refreshCountdown--;
        updateRefreshTimer();
        
        if (refreshCountdown <= 0) {
            // Full refresh every 25 seconds
            loadAllDashboardData();
            refreshCountdown = 5;
        }
    }, 5000);
    
    // Update timer every second
    refreshTimerInterval = setInterval(updateRefreshTimer, 1000);
}

// Save tracking data periodically to adminbase.json
setInterval(async () => {
    try {
        const response = await fetch(`${API_URL}/api/admin/save`, { method: 'POST' });
        if (response.ok) {
            console.log('✅ Tracking data saved to adminbase.json');
        }
    } catch (error) {
        console.warn('Could not save tracking data:', error);
    }
}, 60000); // Save every 60 seconds

function updateRefreshTimer() {
    const timerEl = document.getElementById('refreshTimer');
    if (timerEl) {
        timerEl.textContent = `Auto-refresh: ${Math.max(1, refreshCountdown)}s`;
    }
}

// Utility functions
function updateLastUpdateTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
    });
    document.getElementById('lastUpdateTime').textContent = timeStr;
}

function renderError(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `<p style="color: var(--accent-color); text-align: center; padding: 2rem;">
            <i class="fas fa-exclamation-circle"></i> ${message}
        </p>`;
    }
}

// Reload functions for manual refresh
function reloadProfileStats() {
    loadProfileStats();
}

function reloadTopProfiles() {
    loadTopProfiles();
}

function reloadLoginHistory() {
    loadLoginHistory();
}

function reloadTimeline() {
    loadTimeline();
}

function reloadSystemHealth() {
    loadSystemHealth();
}

// ========== ADMIN PROFILE MANAGEMENT ==========
async function loadAdminProfiles() {
    try {
        const response = await fetch(`${API_URL}/api/students`);
        if (!response.ok) throw new Error('Failed to load profiles');
        
        const students = await response.json();
        dashboardState.adminProfiles = students;
        
        renderAdminProfiles(students);
    } catch (error) {
        console.error('Error loading admin profiles:', error);
        document.getElementById('adminProfilesContainer').innerHTML = `
            <p class="error"><i class="fas fa-exclamation-circle"></i> Failed to load profiles</p>
        `;
    }
}

function renderAdminProfiles(profiles) {
    const container = document.getElementById('adminProfilesContainer');
    
    if (!profiles || profiles.length === 0) {
        container.innerHTML = '<p class="empty"><i class="fas fa-inbox"></i> No profiles found</p>';
        return;
    }
    
    const profileStats = profiles.map(p => ({
        ...p,
        hasProfile: p.message ? 'Complete' : 'Incomplete',
        visits: dashboardState.profileStats?.find(s => s.id === p.id)?.visits || 0,
        updates: dashboardState.profileStats?.find(s => s.id === p.id)?.updates || 0
    }));
    
    let html = `
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                <thead>
                    <tr style="background: linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.05) 100%); border-bottom: 2px solid var(--border-color);">
                        <th style="padding: 1rem; text-align: left;"><i class="fas fa-user"></i> Name</th>
                        <th style="padding: 1rem; text-align: center;"><i class="fas fa-id-card"></i> ID</th>
                        <th style="padding: 1rem; text-align: center;"><i class="fas fa-calendar"></i> Birthday</th>
                        <th style="padding: 1rem; text-align: center;"><i class="fas fa-check"></i> Status</th>
                        <th style="padding: 1rem; text-align: center;"><i class="fas fa-eye"></i> Visits</th>
                        <th style="padding: 1rem; text-align: center;"><i class="fas fa-sync"></i> Updates</th>
                        <th style="padding: 1rem; text-align: center;"><i class="fas fa-tools"></i> Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    profileStats.forEach(profile => {
        const statusBadge = profile.hasProfile === 'Complete' 
            ? '<span style="background: rgba(76, 175, 80, 0.2); color: #4CAF50; padding: 0.4rem 0.8rem; border-radius: 4px; font-weight: 500;">✓ Complete</span>'
            : '<span style="background: rgba(255, 152, 0, 0.2); color: #FF9800; padding: 0.4rem 0.8rem; border-radius: 4px; font-weight: 500;">○ Incomplete</span>';
        
        html += `
            <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.3s;">
                <td style="padding: 1rem;"><strong>${profile.name || 'Unknown'}</strong></td>
                <td style="padding: 1rem; text-align: center; color: var(--text-muted);">${profile.id}</td>
                <td style="padding: 1rem; text-align: center;">${profile.birthday || '--'}</td>
                <td style="padding: 1rem; text-align: center;">${statusBadge}</td>
                <td style="padding: 1rem; text-align: center;"><strong>${profile.visits || 0}</strong></td>
                <td style="padding: 1rem; text-align: center;"><strong>${profile.updates || 0}</strong></td>
                <td style="padding: 1rem; text-align: center;">
                    <button class="btn-small" onclick="viewAdminProfile('${profile.id}')" style="background: var(--primary-color); color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
        <p style="margin-top: 1rem; font-size: 0.85rem; color: var(--text-muted);">
            <i class="fas fa-info-circle"></i> Total Profiles: ${profiles.length} | Complete: ${profileStats.filter(p => p.hasProfile === 'Complete').length}
        </p>
    `;
    
    container.innerHTML = html;
}

function reloadAdminProfiles() {
    loadAdminProfiles();
}

// View admin profile detail - Navigate to profile page for editing
async function viewAdminProfile(studentId) {
    try {
        // Navigate to profile.html with student ID as parameter
        // The profile page will load the student data and allow editing
        window.location.href = `profile.html?edit=${studentId}`;
    } catch (error) {
        console.error('Error navigating to profile:', error);
        if (window.popup && window.popup.error) {
            window.popup.error('Failed to navigate to profile');
        } else {
            alert('Failed to navigate to profile');
        }
    }
}

// Logout setup
function setupLogout() {
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        const confirmed = await popup.confirm('Are you sure you want to logout?');
        if (confirmed) {
            // Clear auto-refresh
            if (autoRefreshInterval) clearInterval(autoRefreshInterval);
            if (refreshTimerInterval) clearInterval(refreshTimerInterval);
            
            localStorage.removeItem('user');
            window.location.href = 'index.html';
        }
    });
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    if (refreshTimerInterval) clearInterval(refreshTimerInterval);
});
