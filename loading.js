// loading.js 

// ========== CONFIGURATION SECTION ==========
// JANGAN OTAK ATIK KALO GAK ADA BACKUP!
if (!globalThis.LOADING_CONFIG) {
    globalThis.LOADING_CONFIG = {
        LOADING_DURATION: 2500,           // Total loading animation duration (ms) - Match CSS --loading-duration
        LOGO_ANIMATION_DELAY: 0,          // Delay before logo starts (ms)
        TEXT_FADE_DELAY: 0,               // Delay before text starts fading (ms)
        WOBBLE_START_TIME: 1800,          // When wobble effect starts (ms) - Before end to allow completion
        WOBBLE_DURATION: 250,             // Duration of wobble effect (ms) - Shorter to fit before hide
        CONTENT_TRANSITION_DELAY: 2400,    // Delay after hiding loading to show content (ms)
        CONTENT_FADE_DURATION: 0,       // Duration of content fade-in (ms)
        OVERLAY_FADE_DURATION: 1500,       // Duration of overlay fade out (ms)
    };
}
const LOADING_CONFIG = globalThis.LOADING_CONFIG;
// =========================================

if (!globalThis.LoadingManager) {
    class LoadingManager {
    constructor() {
        this.loadingOverlay = null;
        this.loadingTimeout = null;
        this.isLoading = false;
        this.pageContentHidden = true;
        
        this.init();
    }

    init() {
        this.hidePageContent();
        this.createLoadingOverlay();
        this.attachEventListeners();
        this.showLoadingOnPageLoad();
    }

    hidePageContent() {
        const savedTheme = localStorage.getItem('theme');
        const dataTheme = document.documentElement.getAttribute('data-theme');
        const isDarkTheme = (savedTheme !== 'light') && (dataTheme !== 'light');
        
        const style = document.createElement('style');
        style.id = 'smartLoadingStyle';
        style.innerHTML = `
            body.loading-active {
                overflow: hidden;
            }
            body.loading-active > *:not(#loadingOverlay) {
                opacity: 0 !important;
                pointer-events: none;
                animation: none !important;
                will-change: opacity;
            }
            #loadingOverlay {
                animation: none !important;
                background: ${isDarkTheme ? '#121212' : '#FFFFFF'} !important;
                will-change: opacity, visibility;
            }
            #loadingOverlay .loading-text {
                color: ${isDarkTheme ? '#FFFFFF' : '#121212'} !important;
            }
        `;
        document.head.appendChild(style);
        document.body.classList.add('loading-active');
    }

    showPageContent() {
        document.body.classList.remove('loading-active');
        
        const existingStyle = document.getElementById('contentTransitionStyle');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        const style = document.createElement('style');
        style.id = 'contentTransitionStyle';
        style.innerHTML = `
            body > *:not(#loadingOverlay):not(#sidebarNav):not(.sidebar-overlay) {
                transition: opacity ${LOADING_CONFIG.CONTENT_FADE_DURATION}ms ease !important;
                opacity: 1 !important;
                pointer-events: auto !important;
            }
        `;
        document.head.appendChild(style);
        
        this.pageContentHidden = false;
    }

    createLoadingOverlay() {
        // cek loading.html juga
        if (!document.getElementById('loadingOverlay')) {
            const loadingHTML = `
                <div id="loadingOverlay" class="loading-overlay active">
                    <div class="loading-container">
                        <div class="loading-content">
                            <img src="loadinglogo.svg" alt="Loading Logo" class="loading-logo">
                            <div class="loading-text glitch">  RPL 2K26</div>
                        </div>
                    </div>
                </div>
            `;
            
            const temp = document.createElement('div');
            temp.innerHTML = loadingHTML;
            document.body.insertBefore(temp.firstElementChild, document.body.firstChild);
        }
        
        this.loadingOverlay = document.getElementById('loadingOverlay');
    }

    show() {
        if (!this.loadingOverlay) {
            this.createLoadingOverlay();
        }

        // Allow showing loading even if it was previously hidden (e.g., navigation between pages)
        this.isLoading = true;
        this.loadingOverlay.classList.add('active');
        this.hidePageContent();
        console.log('✅ Loading SHOW');
        
        if (this.loadingTimeout) {
            clearTimeout(this.loadingTimeout);
            this.loadingTimeout = null;
        }
        
        if (this.safetyTimeout) {
            clearTimeout(this.safetyTimeout);
            this.safetyTimeout = null;
        }

        // IMPORTANT: Always wait full LOADING_DURATION for animation to complete
        this.loadingTimeout = setTimeout(() => {
            this.hide();
        }, LOADING_CONFIG.LOADING_DURATION);
        
        console.log(`⏱️ Loading will hide after ${LOADING_CONFIG.LOADING_DURATION}ms`);
    }

    hide() {
        if (!this.loadingOverlay) return;
        
        // Only hide if loading is currently active
        if (!this.isLoading) {
            console.log('⚠️  Loading already hidden, skipping...');
            return;
        }

        this.isLoading = false;
        this.loadingOverlay.classList.remove('active');
        console.log('✅ Loading HIDE');
        
        if (this.loadingTimeout) {
            clearTimeout(this.loadingTimeout);
            this.loadingTimeout = null;
        }
        
        this.showPageContent();
        
        // Dispatch loadingComplete event after content transition
        setTimeout(() => {
            const smartStyle = document.getElementById('smartLoadingStyle');
            if (smartStyle) {
                smartStyle.remove();
            }
            
            // Dispatch event for all listeners (beranda, kolase, wali-kelas, profile)
            document.dispatchEvent(new Event('loadingComplete'));
            console.log('📢 Dispatched loadingComplete event');
        }, LOADING_CONFIG.CONTENT_TRANSITION_DELAY);
    }

    showLoadingOnPageLoad() {
        console.log(' SHOW LOADING ANIMATION');
        
        // Always show loading on page load
        this.show();
        
        // Safety timeout to force hide if something goes wrong
        const maxLoadingTime = LOADING_CONFIG.LOADING_DURATION + 2000; // Add 2s buffer
        this.safetyTimeout = setTimeout(() => {
            if (this.isLoading) {
                console.warn('⚠️  SAFETY: Force hiding stuck loading');
                this.hide();
            }
        }, maxLoadingTime);
        
        console.log('⏳ Loading animation initiated - will display for full duration');
    }

    attachEventListeners() {
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            
            if (!link) return;

            if (link.target === '_blank' || !link.href) return;

            if (link.href.includes('#')) return;

            if (link.href === window.location.href) return;

            if (link.href.startsWith(window.location.origin)) {
                e.preventDefault();
                
                console.log('🔗 Link clicked - Show loading animation');
                this.show();
                
                setTimeout(() => {
                    window.location.href = link.href;
                }, 100);
            }
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Page is hidden
                if (this.loadingTimeout) {
                    clearTimeout(this.loadingTimeout);
                    this.loadingTimeout = null;
                }
            }
        });
    }

    forceHideAfter(delay) {
        if (this.loadingTimeout) {
            clearTimeout(this.loadingTimeout);
        }
        
        this.loadingTimeout = setTimeout(() => {
            this.hide();
        }, delay);
    }

    getState() {
        return this.isLoading;
    }
}
globalThis.LoadingManager = LoadingManager;
}
const LoadingManager = globalThis.LoadingManager;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.loadingManager = new LoadingManager();
    });
} else {
    window.loadingManager = new LoadingManager();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LoadingManager;
}
