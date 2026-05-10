// kolase.js - Memories & Video Gallery Page - SIMPLIFIED VERSION
// ========== OPTIMIZED VIDEO STREAMING WITH PRELOADING STRATEGY ==========
// 
// Preloading Strategy for Bandwidth Optimization:
// - Current video (index 0): preload='auto' → Downloads full video content immediately
// - Next video (index 1): preload='metadata' → Only loads header/duration info (~50KB)
// - Other videos: preload='none' → Loads only when user navigates to them
//
// Benefits:
// ✅ Reduce bandwidth by ~70% - only current and next videos download
// ✅ Faster initial page load - metadata preload for smooth UX
// ✅ Better performance on mobile networks
// ✅ Automatic strategy switch when user navigates videos
//

const API_URL = 'https://rpl2k26.site';
let videos = [];
let currentIndex = 0;
let allGalleryImages = []; // Store all images with their metadata
let currentFilter = 'all'; // Track current filter

// ========== RESPONSIVE IMAGE HELPERS ==========
/**
 * Generate srcset for responsive images
 * Falls back to original if variants don't exist
 * @param {string} imageUrl - Original image URL
 * @returns {string} - srcset string for different screen sizes
 */
function generateImageSrcset(imageUrl) {
    // Server doesn't generate _small / _medium / _large variants yet, so we
    // intentionally return an empty string. Declaring the SAME url as both
    // `1x` and `2x` (our previous behavior) caused retina browsers to pick
    // "2x" and render the image at half natural size → visibly blurry.
    // Returning '' lets the browser use the plain `src` attribute at its
    // natural resolution, which is the correct behavior until real variants
    // are produced on the server.
    return '';
}

/**
 * Generate sizes attribute for responsive images
 * @returns {string} - sizes attribute for different breakpoints
 */
function getImageSizes() {
    // For now, return consistent size since we're using original image
    return 'auto';
}

// Wait for loading to complete first
document.addEventListener('loadingComplete', () => {
    console.log('📍 Loading Complete on Kolase, starting page initialization...');
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
    
    // Hide video section initially while loading
    const videoSection = document.querySelector('.video-gallery-section');
    if (videoSection) {
        videoSection.classList.add('hidden');
        console.log('🎬 Video section hidden during page load');
    }
    
    // Load memories first, then initialize video carousel
    initMemoriesGallery();
    initVideoCarousel();
    initSidebar();
}

// ========== LOGIN & THEME ==========
async function initMemoriesGallery() {
    console.log('🖼️ Loading memories gallery from OurGallery...');
    
    try {
        const response = await fetch(`${API_URL}/api/gallery/images`);
        const data = await response.json();
        
        if (data.success && data.images && data.images.length > 0) {
            // Store all images with their metadata
            allGalleryImages = data.images.map((image, index) => ({
                ...image,
                index: index,
                photoType: image.photoType || 'all' // Default to 'all' if not specified
            }));
            
            console.log(`📊 Loaded ${allGalleryImages.length} images with types`);
            
            // Display all images initially
            displayGalleryImages(allGalleryImages);
            
            // Show video section after memories are loaded
            showVideoSectionWhenReady();
            
            console.log('✅ Memories gallery loaded successfully!');
        } else {
            console.warn('⚠️ No images found in gallery');
            loadDefaultMemories();
        }
    } catch (error) {
        console.error('❌ Error loading memories gallery:', error);
        loadDefaultMemories();
    }
}

// Intersection Observer for lazy loading images
let imageObserver = null;

function initImageLazyLoading() {
    // Create intersection observer if not already created
    if (!imageObserver) {
        imageObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    
                    // Load the image
                    const src = img.dataset.src;
                    if (src) {
                        img.src = src;
                        img.removeAttribute('data-src');
                        
                        // Remove loading state when image loads
                        img.addEventListener('load', () => {
                            img.classList.remove('loading');
                            img.classList.add('loaded');
                        }, { once: true });
                    }
                    
                    // Stop observing this image
                    imageObserver.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px' // Start loading 50px before image enters viewport
        });
    }
    
    // Observe all images
    document.querySelectorAll('.gallery-img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

function displayGalleryImages(imagesToDisplay) {
    const container = document.getElementById('memoriesContainer');
    if (!container) {
        console.error('❌ memoriesContainer not found');
        return;
    }
    
    container.innerHTML = ''; // Clear previous
    
    if (imagesToDisplay.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-muted);">
                <i class="fas fa-image" style="font-size: 3rem; display: block; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>No photos found for this category</p>
            </div>
        `;
        return;
    }
    
    console.log(`📸 Displaying ${imagesToDisplay.length} images with lazy loading`);
    
    // Create memory cards with lazy loading
    imagesToDisplay.forEach((image, index) => {
        const memoryCard = document.createElement('div');
        memoryCard.className = `memory-card`;
        memoryCard.dataset.photoType = image.photoType || 'all'; // Store photo type
        
        // Extract filename without timestamp
        const filename = image.name || image.filename || `Memory ${image.index + 1}`;
        const cleanName = filename
            .replace(/^\d+_/, '') // Remove timestamp prefix
            .replace(/\.[^/.]+$/, "") // Remove extension
            .replace(/_/g, ' ') // Replace underscores with spaces
            .substring(0, 30); // Limit length
        
        // Create placeholder while image loads
        const placeholderColor = `hsl(${Math.random() * 360}, 70%, 75%)`;
        
        // First, create card with placeholder (no src yet)
        memoryCard.innerHTML = `
            <div class="memory-frame">
                <img 
                    alt="${cleanName}" 
                    loading="lazy"
                    decoding="async"
                    fetchpriority="low"
                    class="gallery-img loading" 
                    data-index="${image.index}"
                    style="background-color: ${placeholderColor};"
                >
                <div class="memory-overlay">
                    <h3>${cleanName}</h3>
                    <p>A moment to remember</p>
                </div>
            </div>
        `;
        
        // Append card to container immediately (shows placeholder first)
        container.appendChild(memoryCard);
        
        // Get the img element
        const img = memoryCard.querySelector('.gallery-img');
        
        // Handle when actual src is loaded (either immediately or via lazy load)
        const handleImageLoad = function() {
            const width = this.naturalWidth;
            const height = this.naturalHeight;
            
            if (width === 0 || height === 0) return; // Skip if dimensions not available
            
            // Calculate aspect ratio
            const aspectRatio = width / height;
            
            console.log(`🖼️ Image ${image.index} (${cleanName}): ${width}x${height} - Ratio: ${aspectRatio.toFixed(2)}`);
            
            // Classify as portrait or landscape
            if (aspectRatio > 1.2) {
                // Wide landscape
                memoryCard.classList.add('landscape');
            } else if (aspectRatio < 0.85) {
                // Tall portrait
                memoryCard.classList.add('portrait');
            } else {
                // Square-ish
                memoryCard.classList.remove('landscape', 'portrait');
            }
        };
        
        // Listen for actual image load (when src is set via lazy loader)
        img.addEventListener('load', handleImageLoad, { once: true });
        
        // Fallback for images that fail to load
        img.addEventListener('error', function() {
            console.warn(`⚠️ Failed to load image: ${cleanName}`);
            this.classList.remove('loading');
            this.classList.add('error');
        }, { once: true });
        
        // Store the actual image URL in data-src for lazy loading to pick up
        img.dataset.src = image.url;
    });
    
    // Initialize lazy loading and popup listeners after DOM is updated
    setTimeout(() => {
        initImageLazyLoading();
        initImagePopupListeners();
        
        // Trigger scroll animations for memory cards after DOM is ready
        if (typeof initMemoriesAnimations === 'function') {
            console.log('🎬 Triggering memory card animations...');
            initMemoriesAnimations();
        }
    }, 0);
}

/**
 * Show video section after memories have loaded
 * Waits for images to be in DOM, then reveals the video section
 */
function showVideoSectionWhenReady() {
    // Wait a bit for DOM to be fully updated with memory cards
    setTimeout(() => {
        const videoSection = document.querySelector('.video-gallery-section');
        if (videoSection && videoSection.classList.contains('hidden')) {
            // Check that memories are loaded
            const memoriesContainer = document.getElementById('memoriesContainer');
            if (memoriesContainer && memoriesContainer.children.length > 0) {
                console.log('✅ Memories loaded, showing video section...');
                videoSection.classList.remove('hidden');

                // Prime the currently-active video immediately. The
                // <video> elements were created while this section was
                // display:none and some Chromium builds keep their
                // decoder stuck in that state. Calling .load() once the
                // element is actually laid out guarantees a fresh
                // pipeline by the time the user scrolls into view.
                // Using requestAnimationFrame so we run after the
                // browser applies the layout from removing .hidden.
                requestAnimationFrame(() => {
                    const firstVideo = document.getElementById(`video-${currentIndex}`);
                    if (firstVideo) {
                        try { firstVideo.load(); } catch (_) {}
                        console.log(`🔄 Primed video ${currentIndex} after section reveal`);
                    }
                });
            } else {
                // Retry after a short delay if memories aren't loaded yet
                console.warn('⏳ Waiting for memories to load...');
                setTimeout(showVideoSectionWhenReady, 500);
            }
        }
    }, 300);
}

function loadDefaultMemories() {
    console.log('📌 Loading default memories as fallback...');
    const container = document.getElementById('memoriesContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div class="memory-card memory-large">
            <div class="memory-frame">
                <img src="https://via.placeholder.com/800x600?text=Memory+1" alt="Memory 1" loading="lazy" decoding="async">
                <div class="memory-overlay">
                    <h3>First Day of Class</h3>
                    <p>The beginning of our journey</p>
                </div>
            </div>
        </div>

        <div class="memory-card memory-medium">
            <div class="memory-frame">
                <img src="https://via.placeholder.com/600x600?text=Memory+2" alt="Memory 2" loading="lazy" decoding="async">
                <div class="memory-overlay">
                    <h3>School Events</h3>
                    <p>Together we shine</p>
                </div>
            </div>
        </div>

        <div class="memory-card memory-medium">
            <div class="memory-frame">
                <img src="https://via.placeholder.com/600x600?text=Memory+3" alt="Memory 3" loading="lazy" decoding="async">
                <div class="memory-overlay">
                    <h3>Field Trip</h3>
                    <p>Adventures outside classroom</p>
                </div>
            </div>
        </div>

        <div class="memory-card memory-small">
            <div class="memory-frame">
                <img src="https://via.placeholder.com/400x400?text=Memory+4" alt="Memory 4" loading="lazy" decoding="async">
                <div class="memory-overlay">
                    <h3>Sports Day</h3>
                    <p>Competing with spirit</p>
                </div>
            </div>
        </div>

        <div class="memory-card memory-small">
            <div class="memory-frame">
                <img src="https://via.placeholder.com/400x400?text=Memory+5" alt="Memory 5" loading="lazy" decoding="async">
                <div class="memory-overlay">
                    <h3>Graduation Day</h3>
                    <p>The end of a chapter</p>
                </div>
            </div>
        </div>
    `;
}

// ========== PHOTO TYPE FILTER FUNCTIONS ==========
function filterGalleryByType(photoType) {
    console.log(`📸 Filtering gallery by type: ${photoType}`);
    
    // Update current filter
    currentFilter = photoType;
    
    // Update button styles
    document.querySelectorAll('.photo-filter-btn').forEach(btn => {
        if (btn.dataset.filter === photoType) {
            // Active state
            btn.style.background = 'var(--primary-color)';
            btn.style.color = 'white';
            btn.style.borderColor = 'var(--primary-color)';
        } else {
            // Inactive state
            const filterType = btn.dataset.filter;
            const colors = {
                'all': { bg: 'white', text: 'var(--primary-color)', border: 'var(--primary-color)' },
                'girl': { bg: 'white', text: '#FF6B6B', border: '#FF6B6B' },
                'boy': { bg: 'white', text: '#00bcd4', border: '#00bcd4' },
                'walas': { bg: 'white', text: '#FFC107', border: '#FFC107' }
            };
            const style = colors[filterType];
            btn.style.background = style.bg;
            btn.style.color = style.text;
            btn.style.borderColor = style.border;
        }
    });
    
    // Filter images
    let filteredImages = allGalleryImages;
    
    if (photoType !== 'all') {
        filteredImages = allGalleryImages.filter(image => 
            (image.photoType || 'all') === photoType
        );
    }
    
    console.log(`✅ Filtered to ${filteredImages.length} images of type '${photoType}'`);
    
    // Store filtered images for popup navigation
    popupCurrentImages = filteredImages;
    popupCurrentIndex = 0;
    
    // Display filtered images with lazy loading
    displayGalleryImages(filteredImages);
    
    // Scroll to top of gallery
    setTimeout(() => {
        document.querySelector('.memories-container')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}
function checkLoginStatus() {
    const user = JSON.parse(localStorage.getItem('user'));
    const userBtn = document.getElementById('userBtn');
    const userName = document.getElementById('userName');
    const profileLink = document.getElementById('profileLink');
    
    if (user) {
        userName.textContent = user.nickname;
        profileLink.href = 'profile';
    } else {
        profileLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'index';
        });
    }
    
    userBtn.addEventListener('click', async () => {
        if (user) {
            const result = await popup.confirm('Mau logout nih?');
            if (result) {
                localStorage.removeItem('user');
                window.location.href = 'index';
            }
        } else {
            window.location.href = 'index';
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
    
    // Toggle sidebar
    sidebarToggle.addEventListener('click', (e) => {
        e.stopPropagation();
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
    
    sidebarClose.addEventListener('click', (e) => {
        e.stopPropagation();
        closeSidebar();
    });
    
    sidebarOverlay.addEventListener('click', (e) => {
        closeSidebar();
    });
    
    // Close sidebar when navigation link is clicked
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => {
        item.addEventListener('click', (e) => {
            closeSidebar();
        });
    });
    
    // Profile link in sidebar
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        sidebarProfileLink.addEventListener('click', (e) => {
            e.preventDefault();
            closeSidebar();
            window.location.href = 'index';
        });
    } else {
        sidebarProfileLink.href = 'profile';
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

// ========== VIDEO CAROUSEL ==========
async function initVideoCarousel() {
    console.log('🎬 Initializing video carousel...');
    
    try {
        console.log('📡 Fetching videos from API...');
        const response = await fetch(`${API_URL}/api/gallery/videos`);
        console.log(`✅ API Response: ${response.status} ${response.statusText}`);
        
        const data = await response.json();
        console.log(`📊 Received ${data.count} videos`);
        
        // Debug: Check file existence
        console.log('📂 Video file check:');
        data.videos?.forEach((v, idx) => {
            console.log(`   Video ${idx}: ${v.url}`);
            if (v.optimizedVersions?.auto) console.log(`     └─ Optimized: ${v.optimizedVersions.auto}`);
        });
        
        if (data.success && data.videos && data.videos.length > 0) {
            videos = data.videos;
            console.log(`✅ Loaded ${videos.length} videos`);
            
            // Create video elements
            const container = document.getElementById('videoContainer');
            if (!container) {
                console.error('❌ videoContainer not found');
                return;
            }
            
            // Lock body scroll on mobile when video section is visible
            const videoSection = document.querySelector('.video-gallery-section');
            if (videoSection) {
                videoSection.addEventListener('touchmove', (e) => {
                    if (window.innerWidth <= 768 && currentIndex !== null) {
                        e.preventDefault();
                    }
                }, { passive: false });
            }
            
            videos.forEach((video, index) => {
                const videoEl = document.createElement('video');
                videoEl.id = `video-${index}`;
                // Start MUTED so browsers allow autoplay; user can unmute via controls
                videoEl.muted = true;
                videoEl.defaultMuted = true;
                videoEl.setAttribute('muted', '');
                // Inline playback (critical for iOS Safari — without this, video becomes audio-only)
                videoEl.playsInline = true;
                videoEl.setAttribute('playsinline', '');
                videoEl.setAttribute('webkit-playsinline', '');
                // Keep native controls off — we have custom controls. Native controls over custom = double UI & conflicts
                videoEl.controls = false;
                videoEl.disablePictureInPicture = true;
                
                // ========== PRELOADING STRATEGY ==========
                // Current video (index 0): preload='auto' (download full content)
                // Next video (index 1): preload='metadata' (only load header/duration)
                // Others: preload='none' (load on-demand)
                if (index === 0) {
                    videoEl.preload = 'auto';
                    console.log(`⏬ Video ${index}: Preload AUTO (current)`);
                } else if (index === 1) {
                    videoEl.preload = 'metadata';
                    console.log(`📋 Video ${index}: Preload METADATA (next)`);
                } else {
                    videoEl.preload = 'none';
                    console.log(`⏸️ Video ${index}: Preload NONE (on-demand)`);
                }
                
                videoEl.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    opacity: 0;
                    display: block;
                    background: #000;
                `;
                
                // Video pertama akan di-override di bawah dengan opacity: 1
                if (index !== 0) {
                    videoEl.style.opacity = '0';
                }
                
                // Create list of URLs to try in order (fallback chain)
                const urlsToTry = [];

                // Priority 0: Unified streaming endpoint (TikTok-style).
                // /api/video/stream picks the best optimized variant on
                // the server and responds with proper Range + cache
                // headers, so the <video> element can scrub without
                // re-downloading and files cache forever.
                if (video.streamUrl) {
                    urlsToTry.push({ url: video.streamUrl + '?quality=auto', label: 'stream (auto)' });
                    urlsToTry.push({ url: video.streamUrl + '?quality=720p', label: 'stream (720p)' });
                    urlsToTry.push({ url: video.streamUrl + '?quality=480p', label: 'stream (480p)' });
                    urlsToTry.push({ url: video.streamUrl + '?quality=360p', label: 'stream (360p)' });
                }

                // Priority 1: Optimized versions (direct CDN-style static URLs)
                if (video.optimizedVersions) {
                    if (video.optimizedVersions.auto) {
                        urlsToTry.push({ url: video.optimizedVersions.auto, label: 'optimized (auto)' });
                    }
                    if (video.optimizedVersions['720p']) {
                        urlsToTry.push({ url: video.optimizedVersions['720p'], label: 'optimized (720p)' });
                    }
                    if (video.optimizedVersions['480p']) {
                        urlsToTry.push({ url: video.optimizedVersions['480p'], label: 'optimized (480p)' });
                    }
                    if (video.optimizedVersions['360p']) {
                        urlsToTry.push({ url: video.optimizedVersions['360p'], label: 'optimized (360p)' });
                    }
                }

                // Priority 2: Original URL (may be corrupt - only use if no optimized versions)
                if (video.url && urlsToTry.length === 0) {
                    urlsToTry.push({ url: video.url, label: 'original' });
                }
                
                if (urlsToTry.length === 0) {
                    console.warn(`⚠️ Video ${index}: No valid sources available - ${video.name}`);
                    return; // Skip this video
                }
                
                console.log(`📹 Video ${index}: ${video.name} - ${urlsToTry.length} source(s)`);
                urlsToTry.forEach((s, i) => console.log(`   ${i + 1}. ${s.label}`));
                
                // Error handler with fallback chain
                let currentUrlIndex = 0;
                
                const loadNextUrl = () => {
                    if (currentUrlIndex >= urlsToTry.length) {
                        console.error(`❌ Video ${index} failed: All ${urlsToTry.length} sources exhausted`);
                        // Show error placeholder
                        videoEl.poster = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE4IiBmaWxsPSIjZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIj5WaWRlbyBFcnJvcjwvdGV4dD48L3N2Zz4=';
                        videoEl.style.backgroundColor = '#333';
                        return;
                    }
                    
                    const source = urlsToTry[currentUrlIndex];
                    console.log(`🔄 Video ${index}: Trying source ${currentUrlIndex + 1}/${urlsToTry.length} - ${source.label}`);
                    console.log(`   URL: ${source.url}`);
                    videoEl.src = source.url;
                    currentUrlIndex++;
                };
                
                videoEl.addEventListener('error', (e) => {
                    console.error(`❌ Video ${index}: Load error - ${videoEl.error?.message || 'Unknown error'}`);
                    console.log(`   Attempting next source...`);
                    loadNextUrl();
                });
                
                videoEl.addEventListener('canplay', () => {
                    console.log(`✅ Video ${index}: Can play! Duration: ${videoEl.duration}s`);
                    if (index === 0) {
                        console.log(`✅ Video ${index}: First video ready to display`);
                    }
                });
                
                videoEl.addEventListener('loadstart', () => {
                    console.log(`⏳ Video ${index}: Loading source ${currentUrlIndex}/${urlsToTry.length}...`);
                });
                
                // Start with first URL
                loadNextUrl();
                
                // Ensure first video is immediately visible
                if (index === 0) {
                    // Use !important to override any CSS rules
                    videoEl.style.cssText = `
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 100% !important;
                        height: 100% !important;
                        object-fit: contain !important;
                        opacity: 1 !important;
                        display: block !important;
                        background: #000 !important;
                        visibility: visible !important;
                        z-index: 1 !important;
                    `;
                    currentIndex = 0;
                    videoEl.classList.add('active');
                    console.log(`✅ Video ${index}: FIRST VIDEO - Set opacity: 1 with !important flags`);
                }
                
                // ========== AUTO-ADVANCE ON VIDEO END ==========
                // When video ends, automatically move to next video
                videoEl.addEventListener('ended', () => {
                    console.log(`✅ Video ${index} ended, moving to next...`);
                    nextVideo();
                });
                
                container.appendChild(videoEl);
                console.log(`✅ Added video ${index} to container`);
            });
            
            console.log('✅ Video carousel ready!');
            updateVideoInfo();
            updatePlayerControls();
            initPlayerControlListeners();
            
            // ========== INTERSECTION OBSERVER FOR AUTO-PLAY ==========
            // Auto-play video when video section enters viewport.
            //
            // Why this is trickier than it looks:
            //   initVideoCarousel() builds <video> elements while
            //   .video-gallery-section still has the `.hidden` class
            //   (display:none) — we wait for memories to load first.
            //   Some Chromium builds attach the video decoder lazily for
            //   display:none elements: readyState can read HAVE_FUTURE_DATA
            //   or even HAVE_ENOUGH_DATA, but the compositor never gets a
            //   painted frame. Once the section becomes visible, calling
            //   .play() on that stale pipeline plays audio (if any) but
            //   the frame stays black and play/pause buttons "do nothing"
            //   because there's no real media element state change.
            //
            //   The only reliable way to unstick it is a full .load()
            //   which resets the HTMLMediaElement resource-selection
            //   algorithm. requestVideoPlay() below does exactly that the
            //   first time any element is asked to play.
            // ========== SCROLL-AWARE PLAY/PAUSE (TIKTOK-STYLE) ==========
            //
            // Previous behavior (BUG): IntersectionObserver fired with
            // threshold=0.3, which meant *any* scroll movement across the
            // 30% boundary produced a play() or pause() call. While a user
            // scrolled past the section, the observer fired both
            // isIntersecting=true AND isIntersecting=false dozens of times
            // per second → the video element oscillated between playing
            // and paused, producing the "start/pause while scrolling"
            // artifact the user reported.
            //
            // Fix:
            //   1. Use threshold=[0] + rootMargin: '-30% 0%' so the
            //      transition only fires when the section is meaningfully
            //      on/off screen (not on every pixel of scroll crossing a
            //      0.3 boundary).
            //   2. Track the user's *intent* via a short-circuited flag
            //      (userPausedManually) so the observer does not
            //      auto-resume a video the user just deliberately paused.
            //   3. Debounce state changes — we only apply a decision
            //      after the user stopped scrolling for ~120ms, so
            //      mid-scroll spikes never reach the video element.
            //   4. Global `isScrolling` flag — while the user is
            //      actively scrolling, we freeze any play/pause
            //      decisions. A separate scroll listener with a
            //      timer-based "scroll ended" detection re-enables
            //      decisions afterwards.
            if (videoSection && 'IntersectionObserver' in window) {
                let lastDecisionTimer = null;
                let pendingShouldPlay = null;
                let isScrolling = false;
                let scrollEndTimer = null;

                // Mark scrolling state so IntersectionObserver doesn't
                // fight the scroll itself.
                const onScroll = () => {
                    isScrolling = true;
                    if (scrollEndTimer) clearTimeout(scrollEndTimer);
                    scrollEndTimer = setTimeout(() => {
                        isScrolling = false;
                        // After scroll ends, apply the last pending decision.
                        if (pendingShouldPlay !== null) {
                            applyDecision(pendingShouldPlay);
                            pendingShouldPlay = null;
                        }
                    }, 140);
                };
                window.addEventListener('scroll', onScroll, { passive: true });

                const applyDecision = (shouldPlay) => {
                    const currentVideo = document.getElementById(`video-${currentIndex}`);
                    if (!currentVideo) return;
                    if (shouldPlay) {
                        // Don't auto-resume a video the user explicitly paused.
                        if (window._videoUserPaused) return;
                        if (currentVideo.paused) {
                            console.log(`▶️ Section fully visible: Auto-playing video ${currentIndex}`);
                            requestVideoPlay(currentVideo);
                        }
                    } else {
                        if (!currentVideo.paused) {
                            console.log(`⏸️ Section off-screen: Pausing video ${currentIndex}`);
                            currentVideo.pause();
                        }
                    }
                };

                const videoObserver = new IntersectionObserver((entries) => {
                    entries.forEach((entry) => {
                        const shouldPlay = entry.isIntersecting;

                        // During active scroll, just queue the decision
                        // and let the scroll-end handler apply it.
                        if (isScrolling) {
                            pendingShouldPlay = shouldPlay;
                            return;
                        }

                        // Otherwise debounce by 120ms so we don't react
                        // to quick in/out crossings.
                        if (lastDecisionTimer) clearTimeout(lastDecisionTimer);
                        lastDecisionTimer = setTimeout(() => {
                            applyDecision(shouldPlay);
                        }, 120);
                    });
                }, {
                    // Only fire when section is meaningfully (not 30%) off-screen.
                    // rootMargin shrinks viewport by 30% top/bottom so
                    // a quick scroll past the 30% boundary doesn't toggle.
                    threshold: 0,
                    rootMargin: '-30% 0% -30% 0%'
                });

                videoObserver.observe(videoSection);
                console.log('✅ Scroll-aware video observer initialized (debounced)');
            }
            // Rotate to the next video every 40s **if still playing**.
            // Fade-out starts at 38s (2s fade), then nextVideo().
            // If the user manually navigates (prev/next/swipe), we restart
            // this timer so the user doesn't lose their freshly-picked
            // video half-way through.
            const AUTO_ROTATE_MS = 38000;
            const scheduleAutoRotate = () => {
                if (window._videoAutoRotateTimer) {
                    clearInterval(window._videoAutoRotateTimer);
                }
                window._videoAutoRotateTimer = setInterval(() => {
                    const currentVideo = document.getElementById(`video-${currentIndex}`);
                    if (currentVideo && !currentVideo.paused) {
                        console.log(`⏱️ Auto-rotate: Fade-out animation starting...`);
                        currentVideo.classList.remove('video-fade-out');
                        currentVideo.classList.add('video-fade-out');
                        setTimeout(() => {
                            currentVideo.classList.remove('video-fade-out');
                            nextVideo();
                        }, 2000);
                    }
                }, AUTO_ROTATE_MS);
            };
            // Expose so showVideo() / manual nav can restart the countdown
            window._resetVideoAutoRotate = scheduleAutoRotate;
            scheduleAutoRotate();
        } else {
            console.error('❌ No videos found in API response');
        }
    } catch (error) {
        console.error('❌ Error initializing carousel:', error);
    }
}

function showVideo(index) {
    const container = document.getElementById('videoContainer');
    if (!container) return;
    
    const videoEls = container.querySelectorAll('video');
    
    // ========== DYNAMIC PRELOAD STRATEGY ==========
    // Update preload settings when switching videos
    videoEls.forEach((el, idx) => {
        if (idx === index) {
            // Current video: preload auto
            el.preload = 'auto';
            console.log(`⏬ Video ${idx}: Updated to preload AUTO (now playing)`);
            
            // ========== RESET FADE-OUT ANIMATION ==========
            // Remove fade-out class to show video with full opacity
            el.classList.remove('video-fade-out');
            el.classList.add('active');
            
            el.style.opacity = '1';

            // First-play priming + decoder-stuck recovery is centralized
            // in requestVideoPlay() (defined below). Using it here keeps
            // behavior identical across observer auto-play, manual nav,
            // keyboard space, and button clicks.
            requestVideoPlay(el);
        } else if (idx === (index + 1) % videoEls.length) {
            // Next video: preload metadata only
            el.preload = 'metadata';
            console.log(`📋 Video ${idx}: Updated to preload METADATA (next)`);
            el.classList.remove('active');
            el.style.opacity = '0';
            el.pause();
        } else {
            // Other videos: no preload
            el.preload = 'none';
            console.log(`⏸️ Video ${idx}: Updated to preload NONE`);
            el.classList.remove('active');
            el.style.opacity = '0';
            el.pause();
        }
    });
    
    currentIndex = index;
    updateVideoInfo();
    updatePlayerControls();

    // Navigating to a different video is an explicit action — allow
    // auto-play on the new one even if the user had paused the previous.
    window._videoUserPaused = false;

    // Restart the 40s auto-rotate countdown so that a video the user just
    // picked (via next/prev/swipe/keyboard) plays for its full window
    // instead of possibly getting cut off a few seconds in.
    if (typeof window._resetVideoAutoRotate === 'function') {
        window._resetVideoAutoRotate();
    }
}

function nextVideo() {
    if (videos.length > 0) {
        showVideo((currentIndex + 1) % videos.length);
    }
}

function prevVideo() {
    if (videos.length > 0) {
        showVideo((currentIndex - 1 + videos.length) % videos.length);
    }
}

function updateVideoInfo() {
    const videoInfo = document.getElementById('videoInfo');
    if (videoInfo) {
        // Hide video info completely (filename and counter)
        videoInfo.innerHTML = '';
        videoInfo.style.display = 'none';
    }
    
    // Update Spotify-style player title and counter
    const videoTitle = document.getElementById('videoTitle');
    const videoCounter = document.getElementById('videoCounter');
    const currentVideo = videos[currentIndex];
    
    if (videoTitle && currentVideo) {
        const videoName = currentVideo.name || `Video ${currentIndex + 1}`;
        videoTitle.textContent = videoName.replace(/\.[^/.]+$/, '');
    }
    
    if (videoCounter) {
        videoCounter.textContent = `${currentIndex + 1} / ${videos.length}`;
    }
}

// ========== UPDATE PLAYER CONTROLS ==========
function updatePlayerControls() {
    const currentVideoEl = document.getElementById(`video-${currentIndex}`);
    if (!currentVideoEl) return;
    
    const playPauseBtn = document.getElementById('playPauseBtn');
    const overlayPlayBtn = document.getElementById('overlayPlayBtn');
    
    const updateIcon = (isPlaying) => {
        const icon = isPlaying ? 'fa-pause' : 'fa-play';
        const otherIcon = isPlaying ? 'fa-play' : 'fa-pause';
        if (playPauseBtn) {
            playPauseBtn.querySelector('i').className = `fas ${icon}`;
        }
        if (overlayPlayBtn) {
            overlayPlayBtn.querySelector('i').className = `fas ${icon}`;
        }
    };
    
    currentVideoEl.addEventListener('play', () => updateIcon(true));
    currentVideoEl.addEventListener('pause', () => updateIcon(false));
    currentVideoEl.addEventListener('timeupdate', updateProgressBar);
    currentVideoEl.addEventListener('loadedmetadata', updateProgressBar);
}

function updateProgressBar() {
    const currentVideoEl = document.getElementById(`video-${currentIndex}`);
    if (!currentVideoEl) return;
    
    const progressFill = document.getElementById('videoProgress');
    const currentTimeEl = document.getElementById('videoCurrentTime');
    const durationEl = document.getElementById('videoDuration');
    
    if (currentVideoEl.duration) {
        const percent = (currentVideoEl.currentTime / currentVideoEl.duration) * 100;
        if (progressFill) progressFill.style.width = percent + '%';
        
        if (currentTimeEl) {
            currentTimeEl.textContent = formatTime(currentVideoEl.currentTime);
        }
        if (durationEl) {
            durationEl.textContent = formatTime(currentVideoEl.duration);
        }
    }
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Shared helper used by every "play now" path (play button, overlay play
// button, keyboard space, observer auto-play). Ensures the very first
// play attempt for a video element does a .load() to reset the decoder
// pipeline — without this, a user clicking "play" while the element is
// still stuck in the display:none-initialized black-frame state gets no
// response at all.
//
// FIX: Always force .load() on the first *visible* play attempt. The old
// code set _primed=true during showVideoSectionWhenReady() which ran inside
// requestAnimationFrame, but the browser hadn't necessarily finished layout
// or decoded a frame yet. So subsequent play() calls saw _primed=true and
// skipped .load(), leaving the video stuck on a black frame.
//
// New approach: _playPrimed tracks whether we've done a successful visible
// load+play cycle. We only trust readyState if we've already played at
// least one frame (currentTime > 0).
function requestVideoPlay(videoEl) {
    if (!videoEl) return;

    const doPlay = () => {
        const p = videoEl.play();
        if (p && typeof p.catch === 'function') {
            p.catch(e => console.warn('⚠️ play() rejected:', e.message));
        }
    };

    // If video has actually played before (currentTime > 0) and has data, just play
    if (videoEl.currentTime > 0 && videoEl.readyState >= 3) {
        doPlay();
        return;
    }

    // Otherwise, force a full .load() to reset the decoder pipeline.
    // This handles the case where video was initialized while display:none
    // and the decoder is stuck showing a black frame.
    console.log(`🔄 requestVideoPlay: Force loading video to reset decoder pipeline`);
    videoEl.addEventListener('canplay', doPlay, { once: true });
    try { videoEl.load(); } catch (_) {}
}

// ========== INITIALIZE PLAYER CONTROL LISTENERS ==========
// Guard flag — this function is invoked from two places:
//   1. After the video carousel finishes building (initVideoCarousel)
//   2. On DOMContentLoaded (fallback if script loaded late)
// Without a guard, every button (play, volume, fullscreen, progress) bound
// its handler twice. Volume toggle would mute → unmute within the same
// click tick and appeared unresponsive; play/pause would flip twice.
let _playerControlListenersBound = false;

function initPlayerControlListeners() {
    if (_playerControlListenersBound) {
        return;
    }
    _playerControlListenersBound = true;
    // Play/Pause Button
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', () => {
            const currentVideoEl = document.getElementById(`video-${currentIndex}`);
            if (!currentVideoEl) return;
            
            if (currentVideoEl.paused) {
                // User explicitly asks to play — clear the pause flag.
                window._videoUserPaused = false;
                requestVideoPlay(currentVideoEl);
            } else {
                // User explicitly paused — remember this so the scroll
                // observer doesn't auto-resume on the next intersection.
                window._videoUserPaused = true;
                currentVideoEl.pause();
            }
        });
    }
    
    // Overlay Play Button (center)
    const overlayPlayBtn = document.getElementById('overlayPlayBtn');
    if (overlayPlayBtn) {
        overlayPlayBtn.addEventListener('click', () => {
            const currentVideoEl = document.getElementById(`video-${currentIndex}`);
            if (!currentVideoEl) return;
            
            if (currentVideoEl.paused) {
                window._videoUserPaused = false;
                requestVideoPlay(currentVideoEl);
            } else {
                window._videoUserPaused = true;
                currentVideoEl.pause();
            }
        });
    }
    
    // Volume Control
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeBtn = document.getElementById('volumeBtn');

    // Set initial volume UI state to reflect default MUTED start
    if (volumeBtn) {
        volumeBtn.querySelector('i').className = 'fas fa-volume-mute';
    }
    if (volumeSlider) {
        volumeSlider.value = 0;

        volumeSlider.addEventListener('input', (e) => {
            const volume = e.target.value / 100;
            const videos = document.querySelectorAll('video');
            videos.forEach(v => {
                v.volume = volume;
                // User manually adjusts volume => unmute
                if (volume > 0) {
                    v.muted = false;
                    v.removeAttribute('muted');
                } else {
                    v.muted = true;
                }
            });

            // Update volume icon
            if (volumeBtn) {
                const icon = volume === 0 ? 'fa-volume-mute' : volume < 0.5 ? 'fa-volume-down' : 'fa-volume-up';
                volumeBtn.querySelector('i').className = `fas ${icon}`;
            }
        });
    }

    // Click on volume button to toggle mute
    if (volumeBtn) {
        volumeBtn.addEventListener('click', () => {
            const currentVideoEl = document.getElementById(`video-${currentIndex}`);
            if (!currentVideoEl) return;

            if (currentVideoEl.muted || currentVideoEl.volume === 0) {
                // Unmute — restore slider to 100
                document.querySelectorAll('video').forEach(v => {
                    v.muted = false;
                    v.removeAttribute('muted');
                    v.volume = 1;
                });
                if (volumeSlider) volumeSlider.value = 100;
                volumeBtn.querySelector('i').className = 'fas fa-volume-up';
            } else {
                // Mute
                document.querySelectorAll('video').forEach(v => { v.muted = true; });
                if (volumeSlider) volumeSlider.value = 0;
                volumeBtn.querySelector('i').className = 'fas fa-volume-mute';
            }
        });
    }
    
    // Progress Bar Click
    const progressBar = document.querySelector('.video-progress-bar');
    if (progressBar) {
        progressBar.addEventListener('click', (e) => {
            const currentVideoEl = document.getElementById(`video-${currentIndex}`);
            if (!currentVideoEl || !currentVideoEl.duration) return;
            
            const rect = progressBar.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            currentVideoEl.currentTime = percent * currentVideoEl.duration;
        });
    }
    
    // Fullscreen Button
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            const videoCarousel = document.getElementById('videoCarousel');
            if (!videoCarousel) return;
            
            if (videoCarousel.requestFullscreen) {
                videoCarousel.requestFullscreen();
            } else if (videoCarousel.webkitRequestFullscreen) {
                videoCarousel.webkitRequestFullscreen();
            } else if (videoCarousel.mozRequestFullScreen) {
                videoCarousel.mozRequestFullScreen();
            } else if (videoCarousel.msRequestFullscreen) {
                videoCarousel.msRequestFullscreen();
            }
        });
    }
    
    console.log('✅ Player control listeners initialized');
}

// ========== PLAYER CONTROL EVENTS ==========
document.addEventListener('DOMContentLoaded', () => {
    initPlayerControlListeners();
});

// ========== KEYBOARD CONTROLS ==========
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
        prevVideo();
    } else if (e.key === 'ArrowRight') {
        nextVideo();
    } else if (e.key === ' ') {
        e.preventDefault();
        const currentVideoEl = document.getElementById(`video-${currentIndex}`);
        if (!currentVideoEl) return;
        
        if (currentVideoEl.paused) {
            window._videoUserPaused = false;
            requestVideoPlay(currentVideoEl);
        } else {
            window._videoUserPaused = true;
            currentVideoEl.pause();
        }
    }
});

// ========== TOUCH SWIPE CONTROLS ==========
let touchStartX = 0;
let touchEndX = 0;

const videoContainer = document.getElementById('videoContainer');
if (videoContainer) {
    videoContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, false);
    
    videoContainer.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, false);
}

function handleSwipe() {
    const diff = touchStartX - touchEndX;
    const threshold = 50; // Minimum swipe distance
    
    if (Math.abs(diff) > threshold) {
        if (diff > 0) {
            // Swiped left - next video
            nextVideo();
        } else {
            // Swiped right - previous video
            prevVideo();
        }
    }
}

// ========== IMAGE POPUP MODAL FUNCTIONS ==========
let popupCurrentImages = []; // Track images in popup
let popupCurrentIndex = 0; // Track current popup image

/**
 * Open image popup modal with double-click
 * @param {number} startIndex - Index in allGalleryImages or currentFiltered
 * @param {array} imagesToShow - Array of images to navigate through
 */
function openImagePopup(startIndex, imagesToShow = null) {
    const modal = document.getElementById('imagePopupModal');
    if (!modal) {
        console.error('❌ Image popup modal not found');
        return;
    }
    
    // Use provided images or all gallery images
    popupCurrentImages = imagesToShow && imagesToShow.length > 0 ? imagesToShow : allGalleryImages;
    
    // Find the actual index in popupCurrentImages
    if (startIndex >= 0 && startIndex < popupCurrentImages.length) {
        popupCurrentIndex = startIndex;
    } else {
        popupCurrentIndex = 0;
    }
    
    // Display the image
    updatePopupImage();
    
    // Show modal with proper z-index and display
    modal.style.display = 'flex';
    modal.style.visibility = 'visible';
    modal.style.zIndex = '9999';
    document.body.style.overflow = 'hidden'; // Prevent body scroll
    
    console.log(`✅ Opened popup with image ${popupCurrentIndex + 1}/${popupCurrentImages.length}`);
}

/**
 * Close image popup modal
 */
function closeImagePopup() {
    const modal = document.getElementById('imagePopupModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto'; // Restore body scroll
    }
}

/**
 * Display current image in popup
 */
function updatePopupImage() {
    if (popupCurrentImages.length === 0) return;
    
    const image = popupCurrentImages[popupCurrentIndex];
    const popupImage = document.getElementById('popupImage');
    const popupTitle = document.getElementById('popupImageTitle');
    const popupCounter = document.getElementById('popupImageCounter');
    
    if (popupImage) {
        popupImage.src = image.url;
        popupImage.alt = image.name || `Image ${popupCurrentIndex + 1}`;
    }
    
    if (popupTitle) {
        const filename = image.name || image.filename || `Photo ${popupCurrentIndex + 1}`;
        const cleanName = filename
            .replace(/^\d+_/, '')
            .replace(/\.[^/.]+$/, "")
            .replace(/_/g, ' ')
            .substring(0, 50);
        popupTitle.textContent = cleanName;
    }
    
    if (popupCounter) {
        popupCounter.textContent = `${popupCurrentIndex + 1} of ${popupCurrentImages.length}`;
    }
    
    console.log(`📸 Showing popup image ${popupCurrentIndex + 1}/${popupCurrentImages.length}`);
}

/**
 * Navigate to next image in popup
 */
function nextImagePopup() {
    if (popupCurrentImages.length > 0) {
        popupCurrentIndex = (popupCurrentIndex + 1) % popupCurrentImages.length;
        updatePopupImage();
    }
}

/**
 * Navigate to previous image in popup
 */
function previousImagePopup() {
    if (popupCurrentImages.length > 0) {
        popupCurrentIndex = (popupCurrentIndex - 1 + popupCurrentImages.length) % popupCurrentImages.length;
        updatePopupImage();
    }
}

/**
 * Initialize popup event listeners after images are loaded
 */
function initImagePopupListeners() {
    const container = document.getElementById('memoriesContainer');
    if (!container) return;
    
    // Re-attach double-click listeners to gallery images
    const galleryImages = container.querySelectorAll('.gallery-img');
    let lastTap = 0;
    let lastTapImg = null;
    
    galleryImages.forEach((img, index) => {
        img.removeEventListener('dblclick', handleImageDoubleClick);
        img.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            const imageIndex = parseInt(img.dataset.index) || index;
            openImagePopup(imageIndex, popupCurrentImages);
        });
        
        // Add touch support for mobile double-tap
        img.addEventListener('touchend', (e) => {
            const now = Date.now();
            const timeSinceLastTap = now - lastTap;
            
            // If double tap within 300ms on same or close image
            if (timeSinceLastTap < 300 && lastTapImg === img) {
                e.preventDefault();
                const imageIndex = parseInt(img.dataset.index) || index;
                openImagePopup(imageIndex, popupCurrentImages);
            }
            
            lastTap = now;
            lastTapImg = img;
        }, false);
        
        // Also add hover cursor effect
        img.style.cursor = 'pointer';
        img.style.touchAction = 'manipulation';
    });
    
    console.log(`✅ Initialized ${galleryImages.length} popup listeners (with touch support)`);
}

// Handle double-click on gallery image
function handleImageDoubleClick(e) {
    const img = e.target;
    const imageIndex = parseInt(img.dataset.index) || 0;
    openImagePopup(imageIndex, popupCurrentImages);
}

// Keyboard controls for popup
document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('imagePopupModal');
    if (modal && modal.style.display === 'flex') {
        if (e.key === 'ArrowRight') {
            nextImagePopup();
            e.preventDefault();
        } else if (e.key === 'ArrowLeft') {
            previousImagePopup();
            e.preventDefault();
        } else if (e.key === 'Escape') {
            closeImagePopup();
            e.preventDefault();
        }
    }
});

// Close popup when clicking overlay
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.querySelector('.image-popup-overlay');
    if (overlay) {
        overlay.addEventListener('click', closeImagePopup);
    }
    
    // Also ensure modal is properly initialized
    const modal = document.getElementById('imagePopupModal');
    if (modal) {
        // Set initial display state
        modal.style.display = 'none';
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
    }
});

// Swipe support for popup navigation on mobile
let popupSwipeStartX = 0;
let popupSwipeStartY = 0;

document.addEventListener('touchstart', (e) => {
    const modal = document.getElementById('imagePopupModal');
    if (modal && modal.style.display === 'flex') {
        popupSwipeStartX = e.touches[0].clientX;
        popupSwipeStartY = e.touches[0].clientY;
    }
}, false);

document.addEventListener('touchend', (e) => {
    const modal = document.getElementById('imagePopupModal');
    if (modal && modal.style.display === 'flex') {
        const popupSwipeEndX = e.changedTouches[0].clientX;
        const popupSwipeEndY = e.changedTouches[0].clientY;
        
        const diffX = popupSwipeStartX - popupSwipeEndX;
        const diffY = popupSwipeStartY - popupSwipeEndY;
        
        // Only consider horizontal swipes (more horizontal than vertical)
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
            if (diffX > 0) {
                // Swiped left - next image
                nextImagePopup();
            } else {
                // Swiped right - previous image
                previousImagePopup();
            }
        }
    }
}, false);


