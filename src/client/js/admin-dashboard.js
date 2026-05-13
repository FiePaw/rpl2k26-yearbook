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
    loadDashboardFull();
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
            // Load tab-specific data on switch
            onTabSwitch(currentTab);
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

// Initial full load (includes profiles & kolase once)
async function loadDashboardFull() {
    await loadDashboard();
    renderProfileManagement();
    renderKolaseManagement();
}

function startAutoRefresh() {
    // Realtime update every 3 seconds — no manual refresh needed
    autoRefreshInterval = setInterval(loadDashboard, 3000);
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
    // Only re-render profiles/kolase when user is on that tab (avoid flicker & upload interruption)
    if (currentTab === 'profiles') renderProfileManagement();
    if (currentTab === 'kolase') renderKolaseManagement();
}

// Also render tab-specific data when switching tabs
function onTabSwitch(tab) {
    if (tab === 'profiles') renderProfileManagement();
    if (tab === 'kolase') renderKolaseManagement();
    if (tab === 'music') renderMusicTab();
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
        <div class="ip-row" onclick="showVisitorIPDetail('${ip.ip}')" style="cursor:pointer;" title="Lihat log aktivitas">
            <div class="ip-addr"><i class="fas fa-globe"></i> ${ip.ip}</div>
            <div class="ip-meta">${ip.visits} requests &bull; Last: ${timeAgo(ip.lastSeen)} &bull; <span style="color:var(--accent-primary)"><i class="fas fa-list-alt"></i> Lihat Log</span></div>
        </div>
    `).join('');
}

async function showVisitorIPDetail(ip) {
    const modal = document.getElementById('accountModal');
    document.getElementById('modalAccountName').textContent = ip;
    document.getElementById('modalAccountType').textContent = 'Visitor IP';
    document.getElementById('modalAccountId').textContent = ip;

    // Sembunyikan section "Registered IPs" — tidak relevan untuk visitor IP
    const ipSection = document.getElementById('modalIPSection');
    if (ipSection) ipSection.style.display = 'none';

    const logsContainer = document.getElementById('modalAccountLogs');
    if (logsContainer) logsContainer.innerHTML = '<p class="empty-msg"><i class="fas fa-spinner fa-spin"></i> Memuat log...</p>';
    modal.classList.add('active');

    try {
        const res = await fetch(`${API_URL}/api/admin/visitor-logs/${encodeURIComponent(ip)}`);
        const data = await res.json();

        const geo = data.geo || {};
        const screens = data.screens || [];
        const visits = data.visits || [];
        const pages = [...new Set(visits.map(v => v.page).filter(Boolean))];

        // Inject geo + screen info di atas logs sebagai info card
        const infoHtml = `
            <div class="modal-section" style="margin-bottom:0.75rem;padding-bottom:0.75rem;border-bottom:1px solid var(--border-color);">
                <h4 style="margin-bottom:0.5rem;font-size:0.85rem;"><i class="fas fa-globe"></i> Info Visitor</h4>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.35rem 1rem;font-size:0.78rem;">
                    <div><span style="color:var(--text-muted)"><i class="fas fa-flag" style="width:14px"></i> Country</span><br><strong>${geo.country || '-'}</strong></div>
                    <div><span style="color:var(--text-muted)"><i class="fas fa-map-marker-alt" style="width:14px"></i> City</span><br><strong>${geo.city || '-'}</strong></div>
                    <div><span style="color:var(--text-muted)"><i class="fas fa-map" style="width:14px"></i> Region</span><br><strong>${geo.region || '-'}</strong></div>
                    <div><span style="color:var(--text-muted)"><i class="fas fa-wifi" style="width:14px"></i> ISP</span><br><strong style="word-break:break-word">${geo.isp || '-'}</strong></div>
                    <div><span style="color:var(--text-muted)"><i class="fas fa-desktop" style="width:14px"></i> Screen</span><br><strong>${screens.length ? screens.join(', ') : '-'}</strong></div>
                    <div><span style="color:var(--text-muted)"><i class="fas fa-eye" style="width:14px"></i> Halaman</span><br><strong style="word-break:break-all;font-size:0.72rem">${pages.length ? pages.join(', ') : '-'}</strong></div>
                </div>
            </div>`;

        const logs = data.logs || [];
        if (logsContainer) {
            logsContainer.innerHTML = infoHtml + (
                logs.slice(0, 50).map(log => `
                    <div class="modal-log">
                        <div class="log-action ${getLogClass(log.action)}">
                            <i class="fas fa-${getLogIcon(log.action)}"></i> ${formatAction(log.action)}
                        </div>
                        <div class="log-details">${log.details || '-'}${log.accountName ? ` <span style="opacity:.6">· ${log.accountName} (${log.accountType})</span>` : ''}</div>
                        <div class="log-meta"><code>${log.ip || ip}</code> &bull; ${timeAgo(log.timestamp)}</div>
                    </div>`).join('') || '<p class="empty-msg">Belum ada log aktivitas untuk IP ini</p>'
            );
        }
    } catch (err) {
        if (logsContainer) logsContainer.innerHTML = `<p class="empty-msg" style="color:var(--danger)">Gagal memuat log: ${err.message}</p>`;
    }
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

    // Pastikan section Registered IPs tampil (bisa tersembunyi dari showVisitorIPDetail)
    const ipSection = document.getElementById('modalIPSection');
    if (ipSection) ipSection.style.display = '';

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

    Promise.all([
        fetch(`${API_URL}/api/students`).then(r => r.json()),
        fetch(`${API_URL}/api/teachers/names`).then(r => r.json()).catch(() => [])
    ]).then(([students, teachers]) => {
        let html = '<h4 style="margin-bottom:0.8rem"><i class="fas fa-user-graduate"></i> Students</h4>';
        html += students.map(s => `
            <div class="profile-mgmt-row">
                <div class="pm-info">
                    <strong>${s.name}</strong>
                    <small>${s.id} &bull; ${s.birthday || 'No birthday'}</small>
                </div>
                <div class="pm-status">
                    ${s.message ? '<span class="badge badge-ok">Complete</span>' : '<span class="badge badge-warn">Incomplete</span>'}
                </div>
                <div class="pm-actions">
                    <button class="btn-sm btn-edit" onclick="openEditProfile('${s.id}', 'student')"><i class="fas fa-edit"></i> Edit</button>
                </div>
            </div>
        `).join('');

        if (teachers && teachers.length > 0) {
            html += '<h4 style="margin:1.5rem 0 0.8rem"><i class="fas fa-chalkboard-teacher"></i> Teachers</h4>';
            html += teachers.map(t => `
                <div class="profile-mgmt-row">
                    <div class="pm-info">
                        <strong>${t.name}</strong>
                        <small>${t.id} &bull; Teacher</small>
                    </div>
                    <div class="pm-actions">
                        <button class="btn-sm btn-edit" onclick="openEditProfile('${t.id}', 'teacher')"><i class="fas fa-edit"></i> Edit</button>
                    </div>
                </div>
            `).join('');
        }

        container.innerHTML = html;
    }).catch(() => {
        container.innerHTML = '<p class="empty-msg">Failed to load profiles</p>';
    });
}

// Edit Profile — redirect to profile.html with admin edit mode
function openEditProfile(id, type) {
    // Navigate to the actual profile page in admin edit mode
    // The profile page already has full editing UI (photo, audio, message, lyrics)
    window.location.href = `profile?edit=${id}&type=${type || 'student'}`;
}

function closeEditProfile() {
    document.getElementById('editProfileModal')?.classList.remove('active');
}

// ========== KOLASE MANAGEMENT ==========
function renderKolaseManagement() {
    const container = document.getElementById('kolaseMgmtContent');
    if (!container) return;

    // Pertama kali: render struktur statis (upload section) — TIDAK di-reset saat auto-refresh
    if (!document.getElementById('kolasePhotoType')) {
        container.innerHTML = `
        <div class="kolase-summary" id="kolaseSummary">
            <span><i class="fas fa-image"></i> <span id="kolaseTotalImages">...</span> Photos</span>
            <span><i class="fas fa-video"></i> <span id="kolaseTotalVideos">...</span> Videos</span>
        </div>

        <!-- Upload Photo Section -->
        <div class="kolase-upload-section">
            <h4><i class="fas fa-camera"></i> Upload Foto</h4>
            <div class="kolase-type-selector">
                <label>Tipe Foto:</label>
                <select id="kolasePhotoType">
                    <option value="boy">Boy RPL</option>
                    <option value="girl">Girl RPL</option>
                    <option value="walas">With Teacher</option>
                </select>
            </div>
            <div class="kolase-upload-area" id="kolasePhotoDropZone">
                <input type="file" id="kolasePhotoInput" multiple accept="image/jpeg,image/png,image/webp,image/gif" style="display:none">
                <div class="kolase-upload-inner" onclick="document.getElementById('kolasePhotoInput').click()">
                    <i class="fas fa-image"></i>
                    <p>Klik atau drag foto ke sini</p>
                    <small>Support: JPG, PNG, WEBP, GIF &bull; Maks <strong>20 foto</strong> per upload</small>
                </div>
            </div>
            <div id="kolasePhotoProgress" style="display:none">
                <div class="upload-progress-bar"><div class="upload-progress-fill" id="kolasePhotoProgressFill"></div></div>
                <small id="kolasePhotoStatus">Uploading...</small>
            </div>
        </div>

        <!-- Upload Video Section -->
        <div class="kolase-upload-section">
            <h4><i class="fas fa-video"></i> Upload Video</h4>
            <div class="kolase-upload-area" id="kolaseVideoDropZone">
                <input type="file" id="kolaseVideoInput" multiple accept="video/mp4,video/webm,video/quicktime" style="display:none">
                <div class="kolase-upload-inner" onclick="document.getElementById('kolaseVideoInput').click()">
                    <i class="fas fa-film"></i>
                    <p>Klik atau drag video ke sini</p>
                    <small>Support: MP4, WEBM, MOV &bull; Maks <strong>5 video</strong> per upload</small>
                </div>
            </div>
            <div id="kolaseVideoProgress" style="display:none">
                <div class="upload-progress-bar"><div class="upload-progress-fill" id="kolaseVideoProgressFill"></div></div>
                <small id="kolaseVideoStatus">Uploading...</small>
            </div>
        </div>

        <!-- Grid area — hanya ini yang di-update saat refresh -->
        <div id="kolaseGridArea"></div>`;

        // Attach upload event listeners hanya sekali saat pertama render
        setupKolaseUpload();
    }

    // Selalu update: summary counter + grid foto/video (tanpa menyentuh select)
    fetch(`${API_URL}/api/admin/kolase`).then(r => r.json()).then(data => {
        if (!data.success) throw new Error(data.error);

        // Update summary counter
        const totalImagesEl = document.getElementById('kolaseTotalImages');
        const totalVideosEl = document.getElementById('kolaseTotalVideos');
        if (totalImagesEl) totalImagesEl.textContent = data.totalImages;
        if (totalVideosEl) totalVideosEl.textContent = data.totalVideos;

        // Update hanya grid area — select TIDAK tersentuh
        const gridArea = document.getElementById('kolaseGridArea');
        if (!gridArea) return;

        // ---- PHOTOS ----
        let gridHtml = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.5rem;">
            <h4 style="margin:0"><i class="fas fa-image"></i> Photos</h4>
            <small style="color:var(--text-secondary)">${data.images.length} foto</small>
        </div>
        <div class="kolase-grid">`;
        data.images.slice(0, 50).forEach(img => {
            const typeLabel = { boy: 'Boy', girl: 'Girl', walas: 'Walas', all: 'All' }[img.photoType] || img.photoType || '?';
            const typeColor = { boy: '#00bcd4', girl: '#FF6B6B', walas: '#FFC107', all: '#aaa' }[img.photoType] || '#aaa';
            const isPinned  = !!img.pinned;
            gridHtml += `
                <div class="kolase-item${isPinned ? ' is-pinned' : ''}" data-filename="${img.filename}">
                    ${isPinned ? '<div class="photo-pin-badge"><i class="fas fa-thumbtack"></i></div>' : ''}
                    <img src="${img.url}" loading="lazy" alt="${img.filename}">
                    <div class="kolase-item-overlay">
                        <small>${img.filename.substring(0, 18)}…</small>
                        <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;">
                            <select class="photo-type-select" data-filename="${img.filename}"
                                style="font-size:0.62rem;padding:1px 3px;border-radius:4px;border:1.5px solid ${typeColor};background:${typeColor}22;color:${typeColor};font-weight:700;cursor:pointer;max-width:72px;">
                                <option value="boy"  ${img.photoType==='boy'  ?'selected':''}>Boy</option>
                                <option value="girl" ${img.photoType==='girl' ?'selected':''}>Girl</option>
                                <option value="walas"${img.photoType==='walas'?'selected':''}>Walas</option>
                                <option value="all"  ${img.photoType==='all'  ?'selected':''}>All</option>
                            </select>
                            <button class="btn-sm ${isPinned ? 'btn-pin-active' : 'btn-pin'}" title="${isPinned ? 'Unpin' : 'Pin ke atas'}"
                                onclick="togglePinPhoto('${img.filename}', ${!isPinned})">
                                <i class="fas fa-thumbtack"></i>
                            </button>
                            <button class="btn-sm btn-danger" onclick="deleteKolaseFile('${img.filename}')"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                </div>
            `;
        });
        gridHtml += '</div>';

        // ---- VIDEOS (drag-to-reorder) ----
        gridHtml += `
        <div style="display:flex;align-items:center;justify-content:space-between;margin:1.5rem 0 0.4rem;">
            <h4 style="margin:0"><i class="fas fa-video"></i> Videos <small style="font-weight:400;font-size:0.75rem;color:var(--text-secondary)">— drag untuk ubah urutan</small></h4>
            <button id="saveVideoOrderBtn" class="btn-action btn-save" style="font-size:0.75rem;padding:0.3rem 0.75rem;display:none;" onclick="saveVideoOrder()">
                <i class="fas fa-save"></i> Simpan Urutan
            </button>
        </div>
        <div class="kolase-grid kolase-video-sortable" id="videoSortableGrid">`;
        data.videos.forEach((vid, idx) => {
            gridHtml += `
                <div class="kolase-item kolase-video" draggable="true" data-filename="${vid.filename}" data-idx="${idx}"
                     style="cursor:grab;position:relative;">
                    <div class="video-order-badge">${idx + 1}</div>
                    <video src="${vid.url}" muted preload="metadata"></video>
                    <div class="kolase-item-overlay">
                        <div style="display:flex;align-items:center;gap:4px;">
                            <i class="fas fa-grip-vertical" style="opacity:.6;font-size:0.7rem;"></i>
                            <small>${vid.filename.substring(0, 18)}…</small>
                        </div>
                        <button class="btn-sm btn-danger" onclick="deleteKolaseFile('${vid.filename}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        });
        gridHtml += '</div>';

        gridArea.innerHTML = gridHtml;

        // ---- Bind photo-type change handlers ----
        gridArea.querySelectorAll('.photo-type-select').forEach(sel => {
            sel.addEventListener('change', async function() {
                const fn  = this.dataset.filename;
                const pt  = this.value;
                const col = { boy:'#00bcd4', girl:'#FF6B6B', walas:'#FFC107', all:'#aaa' }[pt] || '#aaa';
                this.style.borderColor  = col;
                this.style.background   = col + '22';
                this.style.color        = col;
                try {
                    const res  = await fetch(`${API_URL}/api/admin/kolase/photo/${encodeURIComponent(fn)}`,
                        { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photoType: pt }) });
                    const json = await res.json();
                    if (json.success) showToast(`Tipe foto diubah ke "${pt}"`);
                    else showToast(json.error || 'Gagal ubah tipe', 'error');
                } catch { showToast('Network error', 'error'); }
            });
        });

        // ---- Drag-to-reorder logic for videos ----
        initVideoSortable();

    }).catch(() => {
        const gridArea = document.getElementById('kolaseGridArea');
        if (gridArea) gridArea.innerHTML = '<p class="empty-msg">Failed to load kolase data</p>';
    });
}

function initVideoSortable() {
    const grid = document.getElementById('videoSortableGrid');
    if (!grid) return;
    let dragSrc = null;

    grid.querySelectorAll('.kolase-item.kolase-video').forEach(item => {
        item.addEventListener('dragstart', function(e) {
            dragSrc = this;
            e.dataTransfer.effectAllowed = 'move';
            this.style.opacity = '0.4';
        });
        item.addEventListener('dragend', function() {
            this.style.opacity = '1';
            grid.querySelectorAll('.kolase-item').forEach(i => i.classList.remove('drag-over-item'));
        });
        item.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            grid.querySelectorAll('.kolase-item').forEach(i => i.classList.remove('drag-over-item'));
            this.classList.add('drag-over-item');
        });
        item.addEventListener('drop', function(e) {
            e.preventDefault();
            if (dragSrc === this) return;
            const allItems = [...grid.querySelectorAll('.kolase-item.kolase-video')];
            const srcIdx  = allItems.indexOf(dragSrc);
            const destIdx = allItems.indexOf(this);
            if (srcIdx < destIdx) grid.insertBefore(dragSrc, this.nextSibling);
            else grid.insertBefore(dragSrc, this);
            // Update order badges
            grid.querySelectorAll('.kolase-item.kolase-video').forEach((el, i) => {
                const badge = el.querySelector('.video-order-badge');
                if (badge) badge.textContent = i + 1;
            });
            const btn = document.getElementById('saveVideoOrderBtn');
            if (btn) btn.style.display = 'inline-flex';
        });
    });
}

async function saveVideoOrder() {
    const grid = document.getElementById('videoSortableGrid');
    if (!grid) return;
    const order = [...grid.querySelectorAll('.kolase-item.kolase-video')].map(el => el.dataset.filename);
    try {
        const res  = await fetch(`${API_URL}/api/admin/kolase/reorder-videos`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order }) });
        const json = await res.json();
        if (json.success) {
            showToast('Urutan video disimpan!');
            const btn = document.getElementById('saveVideoOrderBtn');
            if (btn) btn.style.display = 'none';
        } else {
            showToast(json.error || 'Gagal simpan urutan', 'error');
        }
    } catch { showToast('Network error', 'error'); }
}

function setupKolaseUpload() {
    const photoInput = document.getElementById('kolasePhotoInput');
    const photoDropZone = document.getElementById('kolasePhotoDropZone');
    const videoInput = document.getElementById('kolaseVideoInput');
    const videoDropZone = document.getElementById('kolaseVideoDropZone');

    if (photoInput) {
        photoInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) uploadKolaseFiles(e.target.files, 'photo');
        });
    }
    if (videoInput) {
        videoInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) uploadKolaseFiles(e.target.files, 'video');
        });
    }

    [photoDropZone, videoDropZone].forEach(zone => {
        if (!zone) return;
        zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) {
                const type = zone.id.includes('Photo') ? 'photo' : 'video';
                uploadKolaseFiles(e.dataTransfer.files, type);
            }
        });
    });
}

async function uploadKolaseFiles(files, type) {
    const isPhoto = type === 'photo';
    const MAX_PHOTOS = 20;
    const MAX_VIDEOS = 5;
    const maxAllowed = isPhoto ? MAX_PHOTOS : MAX_VIDEOS;

    // Validate file count limit
    if (files.length > maxAllowed) {
        showToast(`Maksimal ${maxAllowed} ${isPhoto ? 'foto' : 'video'} per upload! (Kamu memilih ${files.length})`, 'error');
        return;
    }

    const progressContainer = document.getElementById(isPhoto ? 'kolasePhotoProgress' : 'kolaseVideoProgress');
    const progressFill = document.getElementById(isPhoto ? 'kolasePhotoProgressFill' : 'kolaseVideoProgressFill');
    const statusEl = document.getElementById(isPhoto ? 'kolasePhotoStatus' : 'kolaseVideoStatus');

    if (progressContainer) progressContainer.style.display = 'block';
    if (statusEl) statusEl.textContent = `Uploading ${files.length}/${maxAllowed} ${type}(s)...`;
    if (progressFill) progressFill.style.width = '10%';

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
    }
    
    // Add photoType for photos
    if (isPhoto) {
        const photoType = document.getElementById('kolasePhotoType')?.value || 'all';
        formData.append('photoType', photoType);
    }

    try {
        const res = await fetch(`${API_URL}/api/gallery/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (progressFill) progressFill.style.width = '90%';
        
        const data = await res.json();
        if (data.success || data.files || data.photos || data.videos) {
            if (progressFill) progressFill.style.width = '100%';
            if (statusEl) statusEl.textContent = `Upload berhasil!`;
            showToast(`${files.length} ${type}(s) uploaded!`);
            setTimeout(() => {
                if (progressContainer) progressContainer.style.display = 'none';
                renderKolaseManagement();
            }, 1500);
        } else {
            throw new Error(data.error || 'Upload failed');
        }
    } catch (e) {
        if (progressFill) progressFill.style.width = '0%';
        if (statusEl) statusEl.textContent = `Error: ${e.message}`;
        showToast('Upload failed: ' + e.message, 'error');
        setTimeout(() => { if (progressContainer) progressContainer.style.display = 'none'; }, 3000);
    }
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

async function togglePinPhoto(filename, pin) {
    try {
        const res  = await fetch(`${API_URL}/api/admin/kolase/pin/${encodeURIComponent(filename)}`,
            { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pinned: pin }) });
        const json = await res.json();
        if (json.success) {
            showToast(pin ? '📌 Foto di-pin ke atas!' : 'Pin dilepas');
            renderKolaseManagement();
        } else {
            showToast(json.error || 'Gagal pin foto', 'error');
        }
    } catch { showToast('Network error', 'error'); }
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
        'admin_delete_kolase': 'trash',
        'like_reels_video': 'heart',
        'pin_photo': 'thumbtack', 'unpin_photo': 'thumbtack'
    };
    return icons[action] || 'circle';
}

function getLogClass(action) {
    if (action === 'login') return 'log-login';
    if (action === 'logout') return 'log-logout';
    if (action.includes('view')) return 'log-view';
    if (action.includes('update') || action.includes('edit')) return 'log-edit';
    if (action.includes('delete')) return 'log-delete';
    if (action === 'like_reels_video') return 'log-view';
    if (action === 'pin_photo' || action === 'unpin_photo') return 'log-edit';
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


// ╔══════════════════════════════════════════════════════════════╗
// ║                    MUSIC TAB                                ║
// ╚══════════════════════════════════════════════════════════════╝

let musicTabLoaded = false;

async function renderMusicTab() {
    if (musicTabLoaded) return;
    musicTabLoaded = true;
    await loadMusicFiles();
}

// ── Smart wait messages (sama seperti profile page) ─────────────
const adminSmartWaitMessages = [
    'Lagi download file nya, sabar aja cuy...',
    'Nunggu lagi download emang lama...',
    'Dikit lagi selesai download...',
    'Sebentar doang kok download nya sabar ya...',
    'Okeee abis ini kelar download nya...',
    'Prosessss kebut download',
    'Tungguin aja jangan keluar dulu...',
    'Sabar lah download butuh waktu...',
    'Internet cepet buat apa😂',
    '⌛ Masih loading, tunggu sebentar... '
];

function adminStartSmartWait(statusEl) {
    let idx = 0;
    const id = setInterval(() => {
        if (!statusEl || statusEl.style.display === 'none') { clearInterval(id); return; }
        idx = (idx + 1) % adminSmartWaitMessages.length;
        statusEl.style.display = 'flex';
        statusEl.className = '';
        statusEl.innerHTML = `<i class="fas fa-spinner fa-spin"></i>&nbsp; ${adminSmartWaitMessages[idx]}`;
    }, 10000);
    return id;
}

// ── Download Music ──────────────────────────────────────────────
async function adminDownloadMusic() {
    const input       = document.getElementById('musicUrlInput');
    const artistInput = document.getElementById('musicArtistInput');
    const btn         = document.getElementById('musicDownloadBtn');
    const status      = document.getElementById('musicDownloadStatus');
    const url         = input?.value?.trim();
    const artist      = artistInput?.value?.trim() || '';

    if (!url) { showToast('Masukkan URL terlebih dahulu', 'error'); return; }

    const isSpotify = /spotify\.com/i.test(url);
    const isTikTok  = /tiktok\.com/i.test(url);

    // Validasi: hanya Spotify & TikTok (sama seperti profile page)
    if (!isSpotify && !isTikTok) {
        status.style.display = 'flex';
        status.className = 'ds-error';
        status.innerHTML = `<i class="fas fa-exclamation-circle"></i>&nbsp; Gak bisa pake URL ini!<br>
            <span style="font-size:0.8rem;opacity:0.85">Bisa nya cuma:<br>
            &mdash; TikTok (tiktok.com)<br>
            &mdash; Spotify (open.spotify.com)</span>`;
        return;
    }

    // Spotify butuh nama artist
    if (isSpotify && !artist) {
        showToast('Isi dulu nama artist untuk Spotify', 'error');
        artistInput?.focus();
        return;
    }

    // UI: loading state
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span> Downloading…</span>';
    status.style.display = 'flex';
    status.className = '';
    status.innerHTML = `<i class="fas fa-spinner fa-spin"></i>&nbsp; ${adminSmartWaitMessages[0]}`;

    const msgInterval = adminStartSmartWait(status);

    try {
        // Timeout 180 detik (sama seperti profile page)
        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), 180000);

        const endpoint = isSpotify ? `${API_URL}/api/spotify/download` : `${API_URL}/api/audio/download`;
        const body     = isSpotify ? { spotifyUrl: url, artist } : { url };

        const res  = await fetch(endpoint, {
            method : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify(body),
            signal : controller.signal
        });
        clearTimeout(timeoutId);
        clearInterval(msgInterval);

        const data = await res.json();

        if (data.success) {
            let filename = '';
            if (isSpotify) {
                filename = data.latestFile?.filename || data.tracks?.[0]?.filename || '';
            } else {
                filename = data.filename || '';
            }
            const srcTag = data.source
                ? ` <span style="opacity:0.65;font-size:0.75rem">[${data.source}]</span>` : '';

            status.className = 'ds-success';
            status.innerHTML = `<i class="fas fa-check-circle"></i>&nbsp; ✅ ${data.message || 'Download berhasil!'}${filename ? ` &mdash; <strong>${filename}</strong>` : ''}${srcTag}`;

            // Reset form
            input.value = '';
            if (artistInput) artistInput.value = '';
            const artistGroup = document.getElementById('musicArtistInputGroup');
            if (artistGroup) artistGroup.style.display = 'none';

            setTimeout(async () => {
                status.style.display = 'none';
                musicTabLoaded = false;
                await loadMusicFiles();
            }, 4000);

        } else {
            clearInterval(msgInterval);
            let errorMsg = data.error || data.message || 'Download gagal';

            if (data.isSetupError) {
                errorMsg = '⚙️ Setup Error: Python atau yt-dlp tidak ditemukan di server.';
            } else if (data.isRateLimit) {
                const wait = data.waitTimeSeconds ? ` Coba lagi dalam <strong>${data.waitTimeSeconds}s</strong>.` : '';
                errorMsg   = `⏳ Rate limit.${wait} ${data.message || ''}`;
            } else if (data.error === 'Unsupported URL') {
                errorMsg = '❌ URL tidak didukung.<br><span style="font-size:0.8rem">Gunakan link TikTok atau Spotify.</span>';
            } else if (data.error === 'spotdl is not installed') {
                errorMsg = '❌ spotdl belum terinstall.<br><span style="font-size:0.8rem">Jalankan: <code>pip install spotdl</code> lalu restart server.</span>';
            } else if (data.error === 'Invalid Spotify URL') {
                errorMsg = '❌ URL Spotify tidak valid.<br><span style="font-size:0.8rem">Gunakan link track/playlist Spotify yang benar.</span>';
            } else if (data.details) {
                errorMsg = data.details;
            }

            status.className = 'ds-error';
            status.innerHTML = `<i class="fas fa-exclamation-circle"></i>&nbsp; ${errorMsg}`;
        }

    } catch (err) {
        clearInterval(msgInterval);
        let errorMsg = err.message || 'Koneksi gagal';
        if (err.name === 'AbortError') {
            errorMsg = '⏱️ Timeout — download terlalu lama. Coba URL lain atau cek koneksi server.';
        }
        status.className = 'ds-error';
        status.innerHTML = `<i class="fas fa-times-circle"></i>&nbsp; ${errorMsg}`;

    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-download"></i><span> Download</span>';
    }
}
// ── Daftar file musik + inline lyrics per file ──────────────────
async function loadMusicFiles() {
    const container = document.getElementById('musicFileList');
    if (!container) return;

    // Stop preview jika sedang diputar
    if (_previewAudio) {
        _previewAudio.pause();
        _previewAudio.src = '';
        _previewAudio = null;
        _previewSafeId = null;
    }

    container.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-muted)">
        <i class="fas fa-spinner fa-spin" style="font-size:1.5rem;margin-bottom:0.5rem;display:block"></i>
        Memuat daftar musik…
    </div>`;

    try {
        const [audioRes, studentsRes] = await Promise.all([
            fetch(`${API_URL}/api/audio/list`),
            fetch(`${API_URL}/api/students`)
        ]);
        const audioData    = await audioRes.json();
        const studentsData = await studentsRes.json();

        const files    = audioData.files || [];
        const students = Array.isArray(studentsData) ? studentsData : [];

        if (files.length === 0) {
            container.innerHTML = `<div style="text-align:center;padding:2.5rem;color:var(--text-muted)">
                <i class="fas fa-music" style="font-size:2rem;margin-bottom:0.6rem;display:block;opacity:0.3"></i>
                <p style="margin:0;font-size:0.88rem">Belum ada file musik tersimpan.</p>
                <p style="margin:0.3rem 0 0;font-size:0.75rem;opacity:0.7">Download lagu dari URL di atas.</p>
            </div>`;
            return;
        }

        // Map: filename → siswa yang pakai lagu ini
        const usageMap = {};
        students.forEach(s => {
            if (!s.audioFile) return;
            const key = s.audioFile.split('/').pop();
            if (!usageMap[key]) usageMap[key] = [];
            usageMap[key].push(s);
        });

        const listHtml = files.map(f => {
            const sizeMB    = f.size ? (f.size / (1024*1024)).toFixed(1) + ' MB' : '';
            const thumbHtml = f.thumbnailUrl
                ? `<div class="music-thumb"><img src="${f.thumbnailUrl}" alt=""></div>`
                : `<div class="music-thumb"><i class="fas fa-music"></i></div>`;
            const usedBy    = usageMap[f.filename] || [];
            const safeId    = encodeFilename(f.filename);

            // ── Inline generate form ──
            const genFormHtml = `
            <div class="music-gen-form" id="genform-${safeId}">
                <div class="music-gen-inputs">
                    <input class="music-gen-input" id="gen-artist-${safeId}"
                        placeholder="Artis…" value="${(f.artist || '').replace(/"/g,'&quot;')}">
                    <input class="music-gen-input" id="gen-title-${safeId}"
                        placeholder="Judul lagu…" value="${(f.title || '').replace(/"/g,'&quot;')}">
                </div>
                <button class="btn-lyrics btn-lyrics-gen" id="gen-btn-${safeId}"
                    onclick="adminGenerateForFile('${safeId}','${f.filename}')">
                    <i class="fas fa-magic"></i> Generate Lirik
                </button>
                <div class="music-gen-status" id="gen-status-${safeId}" style="display:none;"></div>
            </div>`;

            // ── Baris per siswa yang memakai lagu ini ──
            const studentRowsHtml = usedBy.length > 0
                ? `<div class="music-students-label">
                    <i class="fas fa-users" style="font-size:0.7rem"></i> Dipakai oleh ${usedBy.length} siswa:
                   </div>
                   ${usedBy.map(s => {
                    const hasLyrics = !!s.studentLyrics;
                    return `<div class="music-student-lyrics-row" id="mslr-${s.id}">
                        <div class="mslr-name">${s.name}<small>${s.nickname || ''}</small></div>
                        <span class="lyrics-pill ${hasLyrics ? 'has' : 'none'}">${hasLyrics ? '✓ Ada' : 'Belum'}</span>
                        <div class="music-lyrics-btns">
                            <button class="btn-lyrics ${hasLyrics ? 'btn-lyrics-regen' : 'btn-lyrics-gen'}"
                                onclick="adminGenerateLyrics('${s.id}','${(f.artist||'').replace(/'/g,"\\'")}','${(f.title||'').replace(/'/g,"\\'")}','${f.filename}', this)">
                                <i class="fas fa-${hasLyrics ? 'sync-alt' : 'magic'}"></i> ${hasLyrics ? 'Regen' : 'Generate'}
                            </button>
                            ${hasLyrics ? `<button class="btn-lyrics btn-lyrics-del"
                                onclick="adminDeleteLyrics('${s.id}', this)">
                                <i class="fas fa-trash"></i>
                            </button>` : ''}
                        </div>
                    </div>`;
                   }).join('')}`
                : `<p class="music-no-usage">Belum ada siswa yang memakai lagu ini.</p>`;

            return `
            <div class="music-card" id="mcard-${safeId}">
                <div class="music-card-main">
                    ${thumbHtml}
                    <div class="music-card-info">
                        <div class="music-card-title">${f.title || f.filename}</div>
                        <div class="music-card-artist">${f.artist || '—'}</div>
                    </div>
                    <div class="music-card-meta">
                        ${sizeMB ? `<span class="music-card-size">${sizeMB}</span>` : ''}
                        <div class="music-card-actions">
                            <button class="btn-icon-sm btn-preview-music" id="prevbtn-${safeId}" title="Preview lagu"
                                onclick="adminPreviewMusic('${safeId}', '${encodeURIComponent(f.filename)}', this)">
                                <i class="fas fa-play"></i>
                            </button>
                            <button class="btn-icon-sm btn-del-music" title="Hapus lagu"
                                onclick="adminDeleteMusic('${f.filename}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="music-lyrics-section">
                    <div class="music-lyrics-header">
                        <span class="music-lyrics-label"><i class="fas fa-microphone-alt"></i> Generate & Kelola Lirik</span>
                    </div>
                    ${genFormHtml}
                    <div class="music-students-section">
                        ${studentRowsHtml}
                    </div>
                </div>
            </div>`;
        }).join('');

        container.innerHTML = `
            <div class="music-list-header">
                <h4><i class="fas fa-music"></i> Library</h4>
                <span class="music-count-badge">${files.length} lagu</span>
            </div>
            ${listHtml}`;

    } catch (err) {
        container.innerHTML = `<p class="empty-msg" style="color:var(--danger)">Gagal memuat: ${err.message}</p>`;
    }
}

// ── Generate lirik bebas dari form inline per lagu ──────────────
// Hasilnya disimpan ke SEMUA siswa yang memakai lagu tersebut sekaligus
async function adminGenerateForFile(safeId, filename) {
    const artistInput = document.getElementById(`gen-artist-${safeId}`);
    const titleInput  = document.getElementById(`gen-title-${safeId}`);
    const btn         = document.getElementById(`gen-btn-${safeId}`);
    const statusEl    = document.getElementById(`gen-status-${safeId}`);

    const artistName = artistInput?.value?.trim();
    const songTitle  = titleInput?.value?.trim();

    if (!artistName || !songTitle) {
        showToast('Isi Artis dan Judul lagu terlebih dahulu', 'error');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating…';
    statusEl.style.display = 'flex';
    statusEl.className = 'music-gen-status';
    statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i>&nbsp; Mengambil lirik, harap tunggu…';

    try {
        // Generate lirik
        const genRes  = await fetch(`${API_URL}/api/student/lyrics/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                studentId  : filename, // pakai filename sebagai key unik
                artistName,
                songTitle,
                audioFile  : `/profile_music/${filename}`
            })
        });
        const genData = await genRes.json();

        if (!genData.success || !genData.lyrics) {
            statusEl.className = 'music-gen-status ds-error';
            statusEl.innerHTML = `<i class="fas fa-times-circle"></i>&nbsp; ${genData.error || 'Gagal generate lirik'}`;
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-magic"></i> Generate Lirik';
            return;
        }

        // Ambil siswa yang memakai lagu ini, simpan lirik ke masing-masing
        const studentsRes  = await fetch(`${API_URL}/api/students`);
        const allStudents  = await studentsRes.json();
        const usedBy       = (Array.isArray(allStudents) ? allStudents : [])
            .filter(s => s.audioFile && s.audioFile.split('/').pop() === filename);

        if (usedBy.length > 0) {
            // Simpan ke semua siswa yang memakai lagu ini
            await Promise.all(usedBy.map(s =>
                fetch(`${API_URL}/api/student/lyrics/save`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        studentId  : s.id,
                        lyricsText : genData.lyrics,
                        source     : 'admin-file-generate'
                    })
                })
            ));
            statusEl.className = 'music-gen-status ds-success';
            statusEl.innerHTML = `<i class="fas fa-check-circle"></i>&nbsp; Lirik "<strong>${genData.title}</strong>" disimpan ke ${usedBy.length} siswa!`;
        } else {
            // Tidak ada siswa → simpan sebagai standalone lyrics file
            await fetch(`${API_URL}/api/lyrics/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename     : filename.replace(/\.mp3$/i, ''),
                    transcription: genData.lyrics
                })
            });
            statusEl.className = 'music-gen-status ds-success';
            statusEl.innerHTML = `<i class="fas fa-check-circle"></i>&nbsp; Lirik disimpan! (standalone — belum ada siswa yang memakai lagu ini)`;
        }

        showToast(`✅ Lirik "${genData.title}" berhasil di-generate!`);
        musicTabLoaded = false;
        await loadMusicFiles();

    } catch (err) {
        statusEl.className = 'music-gen-status ds-error';
        statusEl.innerHTML = `<i class="fas fa-times-circle"></i>&nbsp; Error: ${err.message}`;
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-magic"></i> Generate Lirik';
    }
}

function encodeFilename(filename) {
    return filename.replace(/[^a-zA-Z0-9]/g, '_');
}

// ── Preview / Play lagu di admin ────────────────────────────────
// Singleton audio player: hanya satu lagu yang bisa diputar sekaligus
let _previewAudio = null;
let _previewSafeId = null;

function adminPreviewMusic(safeId, encodedFilename, btn) {
    const url = `${API_URL}/profile_music/${encodedFilename}`;

    // Jika lagu yang sama sedang diputar → pause / stop
    if (_previewAudio && _previewSafeId === safeId) {
        if (!_previewAudio.paused) {
            _previewAudio.pause();
            btn.classList.remove('playing');
            btn.innerHTML = '<i class="fas fa-play"></i>';
        } else {
            _previewAudio.play();
            btn.classList.add('playing');
            btn.innerHTML = '<i class="fas fa-pause"></i>';
        }
        return;
    }

    // Stop lagu yang sedang diputar sebelumnya
    if (_previewAudio) {
        _previewAudio.pause();
        _previewAudio.src = '';
        // Reset tombol sebelumnya
        if (_previewSafeId) {
            const prevBtn = document.getElementById(`prevbtn-${_previewSafeId}`);
            if (prevBtn) {
                prevBtn.classList.remove('playing');
                prevBtn.innerHTML = '<i class="fas fa-play"></i>';
            }
        }
    }

    // Buat audio baru
    _previewAudio = new Audio(url);
    _previewSafeId = safeId;

    btn.classList.add('playing');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    _previewAudio.addEventListener('canplay', () => {
        _previewAudio.play();
        btn.innerHTML = '<i class="fas fa-pause"></i>';
    }, { once: true });

    _previewAudio.addEventListener('ended', () => {
        btn.classList.remove('playing');
        btn.innerHTML = '<i class="fas fa-play"></i>';
        _previewAudio = null;
        _previewSafeId = null;
    }, { once: true });

    _previewAudio.addEventListener('error', () => {
        showToast('Gagal memutar preview lagu', 'error');
        btn.classList.remove('playing');
        btn.innerHTML = '<i class="fas fa-play"></i>';
        _previewAudio = null;
        _previewSafeId = null;
    }, { once: true });

    _previewAudio.load();
}

async function adminDeleteMusic(filename) {
    if (!confirm(`Hapus file "${filename}"?`)) return;
    try {
        const res  = await fetch(`${API_URL}/api/audio/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename })
        });
        const data = await res.json();
        if (data.success) {
            showToast('File musik dihapus');
            musicTabLoaded = false;
            await loadMusicFiles();
        } else {
            showToast(data.error || 'Gagal hapus', 'error');
        }
    } catch (err) {
        showToast('Network error', 'error');
    }
}

// ── Generate / Regenerate Lirik ─────────────────────────────────
// artistName, songTitle, audioFilename dikirim langsung dari data file musik
// sehingga endpoint tidak perlu guess lagi → fix bug "Unable to determine..."
async function adminGenerateLyrics(studentId, artistName, songTitle, audioFilename, btn) {
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }

    try {
        const res  = await fetch(`${API_URL}/api/student/lyrics/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                studentId,
                artistName : artistName  || undefined,
                songTitle  : songTitle   || undefined,
                audioFile  : audioFilename ? `/profile_music/${audioFilename}` : undefined
            })
        });
        const data = await res.json();

        if (data.success && data.lyrics) {
            const saveRes  = await fetch(`${API_URL}/api/student/lyrics/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentId, lyricsText: data.lyrics, source: 'admin-generate' })
            });
            const saveData = await saveRes.json();
            if (saveData.success) {
                showToast(`✅ Lirik "${data.title}" berhasil disimpan!`);
                // Refresh baris siswa ini saja tanpa full reload
                musicTabLoaded = false;
                await loadMusicFiles();
            } else {
                showToast(`Generate OK tapi gagal simpan: ${saveData.error}`, 'error');
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-magic"></i> Generate'; }
            }
        } else {
            showToast(`Gagal generate: ${data.error || 'Unknown error'}`, 'error');
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-magic"></i> Generate'; }
        }
    } catch (err) {
        showToast(`Error: ${err.message}`, 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-magic"></i> Generate'; }
    }
}

async function adminDeleteLyrics(studentId, btn) {
    if (!confirm('Hapus lirik siswa ini?')) return;
    if (btn) { btn.disabled = true; }
    try {
        const res  = await fetch(`${API_URL}/api/student/lyrics/${studentId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            showToast('Lirik dihapus');
            musicTabLoaded = false;
            await loadMusicFiles();
        } else {
            showToast(data.error || 'Gagal hapus lirik', 'error');
            if (btn) btn.disabled = false;
        }
    } catch (err) {
        showToast('Network error', 'error');
        if (btn) btn.disabled = false;
    }
}

// ── Event listeners untuk music download form ───────────────────
document.addEventListener('DOMContentLoaded', () => {
    const urlInput    = document.getElementById('musicUrlInput');
    const artistGroup = document.getElementById('musicArtistInputGroup');
    const artistInput = document.getElementById('musicArtistInput');

    if (!urlInput) return;

    // Enter key pada URL → download
    urlInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') adminDownloadMusic();
    });

    // Enter key pada artist → download
    if (artistInput) {
        artistInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') adminDownloadMusic();
        });
    }

    // Deteksi Spotify → tampilkan field artist (sama seperti profile page)
    urlInput.addEventListener('input', e => {
        const val       = e.target.value.trim();
        const isSpotify = /spotify\.com/i.test(val);
        if (artistGroup) {
            artistGroup.style.display = isSpotify ? 'block' : 'none';
        }
        if (!isSpotify && artistInput) {
            artistInput.value = '';
        }
        if (isSpotify && artistInput) {
            artistInput.focus();
        }
    });

    // Reset artist jika URL dikosongkan
    urlInput.addEventListener('change', e => {
        if (!e.target.value.trim()) {
            if (artistGroup) artistGroup.style.display = 'none';
            if (artistInput) artistInput.value = '';
        }
    });
});