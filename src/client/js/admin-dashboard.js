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