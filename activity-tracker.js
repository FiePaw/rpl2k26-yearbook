// activity-tracker.js — Lightweight activity tracking for admin dashboard
// Include on pages: beranda, kolase, wali-kelas, profile
(function() {
    const API_URL = window.API_URL || 'https://rpl2k26.site';
    
    function getUser() {
        try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
    }
    
    function getUserId() {
        const user = getUser();
        return user?.id || user?.studentId || user?.teacherId || null;
    }

    function getScreenResolution() {
        return `${window.screen.width}x${window.screen.height}`;
    }
    
    function track(endpoint, body) {
        const accountId = getUserId();
        if (!accountId) return; // Don't track anonymous
        fetch(`${API_URL}/api/track/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId, screenResolution: getScreenResolution(), ...body })
        }).catch(() => {}); // Silent fail
    }

    // Send a lightweight ping so the server can record the IP + screen for this visit
    function pingVisit() {
        fetch(`${API_URL}/api/track/ping`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                screenResolution: getScreenResolution(),
                page: window.location.pathname
            })
        }).catch(() => {});
    }
    
    // Public API
    window.ActivityTracker = {
        // Track viewing another student's profile on beranda
        viewProfile(profileId, profileName) {
            const viewerId = getUserId();
            fetch(`${API_URL}/api/track/profile-view`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ viewerId, viewerName: getUser()?.name, profileId, profileName, screenResolution: getScreenResolution() })
            }).catch(() => {});
        },
        
        // Track viewing photo in kolase
        viewKolasePhoto(filename) {
            track('kolase', { type: 'photo', filename });
        },
        
        // Track viewing video in kolase
        viewKolaseVideo(filename) {
            track('kolase', { type: 'video', filename });
        },
        
        // Track viewing teacher profile
        viewTeacher(teacherId, teacherName) {
            track('teacher-view', { teacherId, teacherName });
        },
        
        // Track logout
        logout() {
            track('logout', {});
        },
        
        // Generic activity
        activity(action, details) {
            track('activity', { action, details });
        }
    };

    // Auto-ping on load to capture IP + screen resolution
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', pingVisit);
    } else {
        pingVisit();
    }
})();