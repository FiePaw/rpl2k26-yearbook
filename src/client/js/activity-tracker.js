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
    
    function track(endpoint, body) {
        const accountId = getUserId();
        if (!accountId) return; // Don't track anonymous
        fetch(`${API_URL}/api/track/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId, ...body })
        }).catch(() => {}); // Silent fail
    }
    
    // Public API
    window.ActivityTracker = {
        // Track viewing another student's profile on beranda
        viewProfile(profileId, profileName) {
            const viewerId = getUserId();
            fetch(`${API_URL}/api/track/profile-view`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ viewerId, viewerName: getUser()?.name, profileId, profileName })
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
})();
