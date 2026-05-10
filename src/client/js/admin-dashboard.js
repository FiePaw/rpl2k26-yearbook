// admin-dashboard.js v3.0 — Full refactor
const API_URL = window.API_URL || 'https://rpl2k26.site';

let dashboardData = null;
let autoRefreshInterval = null;
let currentTab = 'overview';
let selectedAccountId = null;

// Initialize
document.addEventListener('loadingComplete', () => initDashboard());
setTimeout(() => { if (!window.dashboardInitialized) initDashboard(); }, 5000);

function initDashboard() {
    if (window.dashboardInitialized) return;
    window.dashboardInitialized = true;

    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.type !== 'admin') {
        alert('Admin access required');
        window.location.href = 'index';
        return;
    }

    initTheme();
    setupNavTabs();
    setupEventListeners();
    loadDashboard();
    startAutoRefresh();
}

// ========== THEME ==========
function initTheme() {
    const theme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('#themeToggle');
        if (!btn) return;
        const cur = document.documentElement.getAttribute('data-theme');
        const next = cur === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        updateThemeIcon(next);
    });
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('#themeToggle i');
    if (icon) icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// ========== NAV TABS ==========
function setupNavTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTab = btn.dataset.tab;
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            const target = document.getElementById(`tab-${currentTab}`);
            if (target) target.classList.add('active');
        });
    });
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
    document.getElementById('refreshBtn')?.addEventListener('click', () => loadDashboard());
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        if (confirm('Logout?')) {
            stopAutoRefresh();
            localStorage.removeItem('user');
            window.location.href = 'index';
        }
    });
    document.getElementById('saveBtn')?.addEventListener('click', async () => {
        try {
            await fetch(`${API_URL}/api/admin/save`, { method: 'POST' });
            showToast('Data saved to adminbase.json');
        } catch (e) { showToast('Save failed', 'error'); }
    });
}

// ========== DATA LOADING ==========
async function loadDashboard() {
    try {
        const res = await fetch(`${API_URL}/api/admin/dashboard`);
        const data = await res.json();
        if (data.success) {
            dashboardData = data;
            renderAll();
            document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString('id-ID');
        }
    } catch (e) {
        console.error('Dashboard load error:', e);
    }
}

function startAutoRefresh() {
    autoRefreshInterval = setInterval(loadDashboard, 5000);
}

function stopAutoRefresh() {
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
}

// ========== RENDER ALL ==========
function renderAll() {
    if (!dashboardData) return;
    renderSummary();
    renderTopVisited();
    renderVisitorIPs();
    renderAccounts();
    renderLoginHistory();
    renderTimeline();
    renderProfileManagement();
    renderKolaseManagement();
}

// ========== SUMMARY STATS ==========
function renderSummary() {
    const s = dashboardData.summary;
    setText('statStudents', s.totalStudents);
    setText('statVisits', s.totalVisits);
    setText('statUpdates', s.totalUpdates);
    setText('statIPs', s.uniqueIPs);
    setText('statLogins', s.totalLogins);
    setText('statAccounts', s.totalAccounts);
}

// ========== TOP VISITED ==========
function renderTopVisited() {
    const container = document.getElementById('topVisitedList');
    if (!container) return;
    const profiles = dashboardData.topVisited || [];
    
    if (profiles.length === 0) {
        container.innerHTML = '<p class="empty-msg">Belum ada data kunjungan</p>';
        return;
    }

    container.innerHTML = profiles.map((p, i) => `
        <div class="rank-item">
            <div class="rank-badge rank-${i + 1}">${i + 1}</div>
            <div class="rank-info">
                <strong>${p.name}</strong>
                <small>${p.id}</small>
            </div>
            <div class="rank-count">${p.count} visits</div>
        </div>
    `).join('');
}

// ========== VISITOR IPs ==========
function renderVisitorIPs() {
    const container = document.getElementById('visitorIPsList');
    if (!container) return;
    const ips = dashboardData.visitorIPs || [];

    if (ips.length === 0) {
        container.innerHTML = '<p class="empty-msg">Belum ada visitor IP</p>';
        return;
    }

    container.innerHTML = ips.slice(0, 30).map(ip => `
        <div class="ip-row">
            <div class="ip-addr"><i class="fas fa-globe"></i> ${ip.ip}</div>
            <div class="ip-meta">${ip.visits} requests &bull; Last: ${timeAgo(ip.lastSeen)}</div>
        </div>
    `).join('');
}

// ========== ACCOUNTS & ACTIVITY LOGS ==========
function renderAccounts() {
    const container = document.getElementById('accountsList');
    if (!container) return;
    const accounts = dashboardData.accounts || {};
    const entries = Object.entries(accounts).sort((a, b) => 
        new Date(b[1].lastActive) - new Date(a[1].lastActive)
    );

    if (entries.length === 0) {
        container.innerHTML = '<p class="empty-msg">Belum ada account terdaftar</p>';
        return;
    }

    container.innerHTML = entries.map(([id, acc]) => `
        <div class="account-item" onclick="showAccountDetail('${id}')">
            <div class="account-header">
                <div class="account-name">
                    <i class="fas fa-${acc.type === 'teacher' ? 'chalkboard-teacher' : acc.type === 'admin' ? 'shield-alt' : 'user-graduate'}"></i>
                    <strong>${acc.name}</strong>
                    <span class="badge badge-${acc.type}">${acc.type}</span>
                </div>
                <small class="account-time">${timeAgo(acc.lastActive)}</small>
            </div>
            <div class="account-meta">
                <span><i class="fas fa-network-wired"></i> ${acc.ips?.length || 0} IPs</span>
                <span><i class="fas fa-list"></i> ${acc.logs?.length || 0} logs</span>
            </div>
        </div>
    `).join('');
}

function showAccountDetail(accountId) {
    selectedAccountId = accountId;
    const acc = dashboardData.accounts[accountId];
    if (!acc) return;

    const modal = document.getElementById('accountModal');
    document.getElementById('modalAccountName').textContent = acc.name;
    document.getElementById('modalAccountType').textContent = acc.type;
    document.getElementById('modalAccountId').textContent = accountId;

    // IPs
    const ipsEl = document.getElementById('modalAccountIPs');
    ipsEl.innerHTML = (acc.ips || []).map(ip => `
        <div class="modal-ip">
            <code>${ip.ip}</code>
            <span>Used ${ip.count}x &bull; Last: ${timeAgo(ip.lastUsed)}</span>
        </div>
    `).join('') || '<p class="empty-msg">No IPs recorded</p>';

    // Logs
    const logsEl = document.getElementById('modalAccountLogs');
    const logs = (acc.logs || []).slice().reverse();
    logsEl.innerHTML = logs.slice(0, 50).map(log => `
        <div class="modal-log">
            <div class="log-action ${getLogClass(log.action)}">
                <i class="fas fa-${getLogIcon(log.action)}"></i> ${formatAction(log.action)}
            </div>
            <div class="log-details">${log.details || '-'}</div>
            <div class="log-meta"><code>${log.ip}</code> &bull; ${timeAgo(log.timestamp)}</div>
        </div>
    `).join('') || '<p class="empty-msg">No activity logs</p>';

    modal.classList.add('active');
}

function closeAccountModal() {
    document.getElementById('accountModal')?.classList.remove('active');
}

// ========== LOGIN HISTORY ==========
function renderLoginHistory() {
    const container = document.getElementById('loginHistoryList');
    if (!container) return;
    const logins = dashboardData.loginHistory || [];

    if (logins.length === 0) {
        container.innerHTML = '<p class="empty-msg">Belum ada login history</p>';
        return;
    }

    container.innerHTML = logins.slice(0, 20).map(l => `
        <div class="login-row">
            <div class="login-info">
                <strong>${l.name}</strong>
                <span class="badge badge-${l.type}">${l.type}</span>
            </div>
            <div class="login-meta">
                <code>${l.ip || '-'}</code> &bull; ${timeAgo(l.timestamp)}
            </div>
        </div>
    `).join('');
}

// ========== TIMELINE ==========
function renderTimeline() {
    const container = document.getElementById('timelineChart');
    if (!container) return;
    const timeline = dashboardData.accessTimeline || {};
    
    let maxVal = 0;
    for (let h = 0; h < 24; h++) {
        const key = h.toString().padStart(2, '0');
        maxVal = Math.max(maxVal, timeline[key] || 0);
    }
    if (maxVal === 0) maxVal = 1;

    let html = '';
    for (let h = 0; h < 24; h++) {
        const key = h.toString().padStart(2, '0');
        const val = timeline[key] || 0;
        const pct = (val / maxVal) * 100;
        html += `
            <div class="tl-bar">
                <div class="tl-fill" style="height:${Math.max(4, pct)}%"></div>
                <div class="tl-label">${key}</div>
                <div class="tl-val">${val}</div>
            </div>
        `;
    }
    container.innerHTML = html;
}

// ========== PROFILE MANAGEMENT ==========
function renderProfileManagement() {
    const container = document.getElementById('profileMgmtList');
    if (!container) return;

    // We need student list from accounts or fetch separately
    // Use a fetch to get students
    fetch(`${API_URL}/api/students`).then(r => r.json()).then(students => {
        container.innerHTML = students.map(s => `
            <div class="profile-mgmt-row">
                <div class="pm-info">
                    <strong>${s.name}</strong>
                    <small>${s.id} &bull; ${s.birthday || 'No birthday'}</small>
                </div>
                <div class="pm-status">
                    ${s.message ? '<span class="badge badge-ok">Complete</span>' : '<span class="badge badge-warn">Incomplete</span>'}
                </div>
                <div class="pm-actions">
                    <button class="btn-sm btn-edit" onclick="openEditProfile('${s.id}')"><i class="fas fa-edit"></i></button>
                </div>
            </div>
        `).join('');
    }).catch(() => {
        container.innerHTML = '<p class="empty-msg">Failed to load profiles</p>';
    });
}

// Edit Profile Modal
let editingStudentId = null;

function openEditProfile(studentId) {
    editingStudentId = studentId;
    const modal = document.getElementById('editProfileModal');

    fetch(`${API_URL}/api/students/${studentId}`).then(r => r.json()).then(s => {
        document.getElementById('editName').value = s.name || '';
        document.getElementById('editBirthday').value = s.birthday || '';
        document.getElementById('editMessage').value = s.message || '';
        document.getElementById('editNickname').value = s.nickname || '';
        modal.classList.add('active');
    }).catch(() => showToast('Failed to load student', 'error'));
}

function closeEditProfile() {
    document.getElementById('editProfileModal')?.classList.remove('active');
    editingStudentId = null;
}

async function saveEditProfile() {
    if (!editingStudentId) return;
    
    const updates = {
        name: document.getElementById('editName').value,
        birthday: document.getElementById('editBirthday').value,
        message: document.getElementById('editMessage').value,
        nickname: document.getElementById('editNickname').value
    };

    try {
        const res = await fetch(`${API_URL}/api/admin/student/${editingStudentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        const data = await res.json();
        if (data.success) {
            showToast('Profile updated!');
            closeEditProfile();
            renderProfileManagement();
        } else {
            showToast(data.error || 'Update failed', 'error');
        }
    } catch (e) {
        showToast('Network error', 'error');
    }
}

// ========== KOLASE MANAGEMENT ==========
function renderKolaseManagement() {
    const container = document.getElementById('kolaseMgmtContent');
    if (!container) return;

    fetch(`${API_URL}/api/admin/kolase`).then(r => r.json()).then(data => {
        if (!data.success) throw new Error(data.error);

        let html = `<div class="kolase-summary">
            <span><i class="fas fa-image"></i> ${data.totalImages} Photos</span>
            <span><i class="fas fa-video"></i> ${data.totalVideos} Videos</span>
        </div>`;

        html += '<h4><i class="fas fa-image"></i> Photos</h4><div class="kolase-grid">';
        data.images.slice(0, 20).forEach(img => {
            html += `
                <div class="kolase-item">
                    <img src="${img.url}" loading="lazy" alt="${img.filename}">
                    <div class="kolase-item-overlay">
                        <small>${img.filename.substring(0, 20)}...</small>
                        <button class="btn-sm btn-danger" onclick="deleteKolaseFile('${img.filename}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        });
        html += '</div>';

        html += '<h4 style="margin-top:1.5rem"><i class="fas fa-video"></i> Videos</h4><div class="kolase-grid">';
        data.videos.slice(0, 10).forEach(vid => {
            html += `
                <div class="kolase-item kolase-video">
                    <video src="${vid.url}" muted preload="metadata"></video>
                    <div class="kolase-item-overlay">
                        <small>${vid.filename.substring(0, 20)}...</small>
                        <button class="btn-sm btn-danger" onclick="deleteKolaseFile('${vid.filename}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        });
        html += '</div>';

        container.innerHTML = html;
    }).catch(() => {
        container.innerHTML = '<p class="empty-msg">Failed to load kolase data</p>';
    });
}

async function deleteKolaseFile(filename) {
    if (!confirm(`Delete "${filename}"?`)) return;
    try {
        const res = await fetch(`${API_URL}/api/admin/kolase/${encodeURIComponent(filename)}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            showToast('File deleted');
            renderKolaseManagement();
        } else {
            showToast(data.error || 'Delete failed', 'error');
        }
    } catch (e) {
        showToast('Network error', 'error');
    }
}

// ========== UTILITY ==========
function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val ?? 0;
}

function timeAgo(ts) {
    if (!ts) return 'never';
    const diff = (Date.now() - new Date(ts).getTime()) / 1000;
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function getLogIcon(action) {
    const icons = {
        'login': 'sign-in-alt', 'logout': 'sign-out-alt',
        'profile_update': 'edit', 'view_profile': 'eye',
        'view_kolase_photo': 'image', 'view_kolase_video': 'video',
        'view_teacher': 'chalkboard-teacher',
        'admin_edit_profile': 'user-edit', 'admin_edit_teacher': 'user-edit',
        'admin_delete_kolase': 'trash'
    };
    return icons[action] || 'circle';
}

function getLogClass(action) {
    if (action === 'login') return 'log-login';
    if (action === 'logout') return 'log-logout';
    if (action.includes('view')) return 'log-view';
    if (action.includes('update') || action.includes('edit')) return 'log-edit';
    if (action.includes('delete')) return 'log-delete';
    return '';
}

function formatAction(action) {
    return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function showToast(msg, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${msg}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
}

// Cleanup
window.addEventListener('beforeunload', stopAutoRefresh);
