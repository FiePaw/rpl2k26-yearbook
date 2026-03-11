// animations.js - Anime.js Animations for Yearbook
// Mengganti GSAP dengan Anime.js untuk animasi yang smooth dan performant

// Prevent duplicate configuration declaration
if (typeof PAGE_ANIMATION_CONFIG === 'undefined') {

// ========== HEADER ANIMATIONS ==========
function initHeaderAnimations() {
    const header = document.querySelector('.music-header');
    const headerLeft = document.querySelector('.header-left');
    const headerNav = document.querySelector('.header-nav');
    const headerRight = document.querySelector('.header-right');
    
    if (!header) return;
    
    // Header slide down from top
    anime({
        targets: header,
        duration: 800,
        translateY: ['-100px', '0px'],
        opacity: [0, 1],
        easing: 'easeOutQuad'
    });
    
    // Stagger header elements
    anime({
        targets: [headerLeft, headerNav, headerRight],
        duration: 600,
        opacity: [0, 1],
        translateY: ['-20px', '0px'],
        delay: anime.stagger(150, { start: 300 }),
        easing: 'easeOutBack'
    });
}

// ========== SIDEBAR ANIMATIONS ==========
function initSidebarAnimations() {
    const sidebar = document.querySelector('.sidebar-nav');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    
    if (!sidebar) return;
    
    // Set initial state for sidebar items
    anime.set(sidebarItems, { opacity: 1, translateX: '0px' });
    
    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarClose = document.getElementById('sidebarClose');
    const sidebarOverlayEl = document.getElementById('sidebarOverlay');
    
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            // Open sidebar animation
            anime.timeline({
                autoplay: true
            })
            .add({
                targets: sidebar,
                duration: 400,
                translateX: '0px',
                easing: 'easeOutCubic'
            }, 0)
            .add({
                targets: sidebarOverlay,
                duration: 300,
                opacity: 1,
                pointerEvents: 'auto',
                easing: 'easeOutQuad'
            }, 0)
            .add({
                targets: sidebarItems,
                duration: 400,
                translateX: '0px',
                delay: anime.stagger(50),
                easing: 'easeOutBack'
            }, 100);
            
            anime.set(sidebar, { display: 'flex' });
            document.body.style.overflow = 'hidden';
        });
    }
    
    if (sidebarClose || sidebarOverlayEl) {
        const closeSidebar = () => {
            anime.timeline({
                autoplay: true
            })
            .add({
                targets: sidebarOverlay,
                duration: 300,
                opacity: 0,
                pointerEvents: 'none',
                easing: 'easeInQuad'
            }, 0)
            .add({
                targets: sidebar,
                duration: 400,
                translateX: '-280px',
                easing: 'easeInCubic',
                complete: () => {
                    anime.set(sidebar, { display: 'none' });
                }
            }, 0);
            
            document.body.style.overflow = 'auto';
        };
        
        if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
        if (sidebarOverlayEl) sidebarOverlayEl.addEventListener('click', closeSidebar);
        
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.addEventListener('click', closeSidebar);
        });
    }
}

// ========== PAGE HEADER ANIMATIONS ==========
function initPageHeaderAnimations() {
    const pageHeader = document.querySelector('.page-header');
    const pageH1 = document.querySelector('.page-header h1');
    const pageP = document.querySelector('.page-header p');
    
    if (!pageHeader) return;
    
    anime({
        targets: pageHeader,
        duration: 800,
        translateY: ['30px', '0px'],
        opacity: [0, 1],
        delay: 300,
        easing: 'easeOutQuad'
    });
    
    anime({
        targets: pageH1,
        duration: 700,
        scale: [0.9, 1],
        opacity: [0, 1],
        delay: 400,
        easing: 'easeOutBack'
    });
    
    anime({
        targets: pageP,
        duration: 700,
        opacity: [0, 1],
        delay: 500,
        easing: 'easeOutQuad'
    });
}

// ========== FILTER SECTION ANIMATIONS ==========
function initFilterAnimations() {
    const filterSection = document.querySelector('.filter-section');
    const searchBox = document.querySelector('.search-box');
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    if (!filterSection) return;
    
    anime({
        targets: filterSection,
        duration: 600,
        translateY: ['20px', '0px'],
        opacity: [0, 1],
        delay: 500,
        easing: 'easeOutQuad'
    });
    
    anime({
        targets: searchBox,
        duration: 600,
        translateX: ['-30px', '0px'],
        opacity: [0, 1],
        delay: 600,
        easing: 'easeOutQuad'
    });
    
    anime({
        targets: filterBtns,
        duration: 500,
        opacity: [0, 1],
        delay: anime.stagger(100, { start: 700 }),
        easing: 'easeOutQuad'
    });
}

// ========== STUDENT/TEACHER CARD ANIMATIONS ==========
function initCardAnimations() {
    const cards = document.querySelectorAll('.student-card, .teacher-card');
    
    if (cards.length === 0) return;
    
    // Ensure cards are visible initially
    anime.set(cards, { 
        opacity: 1, 
        visibility: 'visible',
        translateY: '0px'
    });
    
    // Stagger card load animations
    anime({
        targets: cards,
        duration: 600,
        translateY: ['40px', '0px'],
        opacity: [0, 1],
        delay: anime.stagger(80, { start: 400 }),
        easing: 'easeOutBack'
    });
    
    // Hover animations
    cards.forEach((card) => {
        card.addEventListener('mouseenter', () => {
            anime({
                targets: card,
                duration: 300,
                translateY: '-15px',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
                easing: 'easeOutQuad'
            });
        });
        
        card.addEventListener('mouseleave', () => {
            anime({
                targets: card,
                duration: 300,
                translateY: '0px',
                boxShadow: 'var(--shadow)',
                easing: 'easeOutQuad'
            });
        });
    });
}

// ========== MUSIC PLAYER ANIMATIONS ==========
function initMusicPlayerAnimations() {
    const playerContainer = document.querySelector('.music-player-container');
    const playerTop = document.querySelector('.player-top-section');
    const playerMiddle = document.querySelector('.player-middle-section');
    const playerBottom = document.querySelector('.player-bottom-section');
    const albumArt = document.querySelector('.album-art');
    const artistInfo = document.querySelector('.artist-info');
    const messageDisplay = document.querySelector('.message-display-new');
    const infoSection = document.querySelector('.info-section');
    const progressSection = document.querySelector('.progress-section');
    const controlButtons = document.querySelector('.control-buttons');
    const volumeSection = document.querySelector('.volume-section');
    
    if (!playerContainer) return;
    
    // Filter out null elements for animation targets
    const validElements = [playerTop, playerMiddle, playerBottom, albumArt, artistInfo, messageDisplay, infoSection, progressSection, controlButtons, volumeSection].filter(el => el !== null);
    
    // Helper function to conditionally add animation only if target exists
    function addAnimationIfValid(timeline, target, animConfig, time) {
        if (target !== null && target !== undefined) {
            return timeline.add({
                targets: target,
                ...animConfig
            }, time);
        }
        return timeline;
    }
    
    // Create timeline for opening animation
    const openTL = anime.timeline({ autoplay: false });
    
    // Stagger all elements with smooth easing
    openTL
        .add({
            targets: playerContainer,
            duration: 600,
            opacity: 1,
            scale: 0.95,
            easing: 'easeOutElastic'
        }, 0)
        .add({
            targets: validElements,
            duration: 0,
            opacity: 1
        }, 0)
        .add({
            targets: playerContainer,
            duration: 600,
            scale: 1,
            easing: 'easeOutElastic'
        }, 0);
    
    // Add animations only for elements that exist
    if (playerTop) {
        openTL.add({
            targets: playerTop,
            duration: 500,
            opacity: 1,
            translateX: '0px',
            easing: 'easeOutBack'
        }, 100);
    }
    if (albumArt) {
        openTL.add({
            targets: albumArt,
            duration: 600,
            rotateY: '0deg',
            scale: 1,
            opacity: 1,
            easing: 'easeOutBack'
        }, 150);
    }
    if (artistInfo) {
        openTL.add({
            targets: artistInfo,
            duration: 500,
            opacity: 1,
            translateX: '0px',
            easing: 'easeOutQuad'
        }, 250);
    }
    if (playerMiddle) {
        openTL.add({
            targets: playerMiddle,
            duration: 500,
            opacity: 1,
            translateX: '0px',
            easing: 'easeOutQuad'
        }, 300);
    }
    if (messageDisplay) {
        openTL.add({
            targets: messageDisplay,
            duration: 400,
            opacity: 1,
            scale: 1,
            easing: 'easeOutBack'
        }, 350);
    }
    if (infoSection) {
        openTL.add({
            targets: infoSection,
            duration: 400,
            opacity: 1,
            easing: 'easeOutQuad'
        }, 400);
    }
    if (playerBottom) {
        openTL.add({
            targets: playerBottom,
            duration: 500,
            opacity: 1,
            translateY: '0px',
            easing: 'easeOutBack'
        }, 400);
    }
    if (progressSection) {
        openTL.add({
            targets: progressSection,
            duration: 400,
            opacity: 1,
            easing: 'easeOutQuad'
        }, 500);
    }
    if (controlButtons) {
        openTL.add({
            targets: controlButtons,
            duration: 500,
            opacity: 1,
            scale: 1,
            easing: 'easeOutBack'
        }, 550);
    }
    if (volumeSection) {
        openTL.add({
            targets: volumeSection,
            duration: 400,
            opacity: 1,
            easing: 'easeOutQuad'
        }, 600);
    }
    
    // Create timeline for closing animation
    const closeTL = anime.timeline({ autoplay: false });
    
    if (volumeSection) {
        closeTL.add({
            targets: volumeSection,
            duration: 300,
            opacity: 0,
            easing: 'easeInQuad'
        }, 0);
    }
    if (controlButtons) {
        closeTL.add({
            targets: controlButtons,
            duration: 300,
            opacity: 0,
            scale: 0.9,
            easing: 'easeInBack'
        }, 100);
    }
    if (progressSection) {
        closeTL.add({
            targets: progressSection,
            duration: 300,
            opacity: 0,
            easing: 'easeInQuad'
        }, 150);
    }
    if (playerBottom) {
        closeTL.add({
            targets: playerBottom,
            duration: 400,
            opacity: 0,
            translateY: '20px',
            easing: 'easeInBack'
        }, 200);
    }
    if (infoSection) {
        closeTL.add({
            targets: infoSection,
            duration: 300,
            opacity: 0,
            easing: 'easeInQuad'
        }, 250);
    }
    if (messageDisplay) {
        closeTL.add({
            targets: messageDisplay,
            duration: 300,
            opacity: 0,
            scale: 0.95,
            easing: 'easeInBack'
        }, 300);
    }
    if (playerMiddle) {
        closeTL.add({
            targets: playerMiddle,
            duration: 400,
            opacity: 0,
            translateX: '20px',
            easing: 'easeInQuad'
        }, 350);
    }
    if (artistInfo) {
        closeTL.add({
            targets: artistInfo,
            duration: 300,
            opacity: 0,
            translateX: '-10px',
            easing: 'easeInQuad'
        }, 400);
    }
    if (albumArt) {
        closeTL.add({
            targets: albumArt,
            duration: 500,
            rotateY: '90deg',
            scale: 0.9,
            opacity: 0,
            easing: 'easeInBack'
        }, 450);
    }
    if (playerTop) {
        closeTL.add({
            targets: playerTop,
            duration: 400,
            opacity: 0,
            translateX: '-20px',
            easing: 'easeInQuad'
        }, 500);
    }
    
    closeTL.add({
        targets: playerContainer,
        duration: 400,
        scale: 0.95,
        opacity: 0,
        easing: 'easeInQuad',
        complete: () => {
            playerContainer.style.display = 'none';
            playerContainer.style.visibility = 'hidden';
            playerContainer.classList.remove('closing');
            const resetElements = [playerTop, playerMiddle, playerBottom, artistInfo, messageDisplay, infoSection, progressSection, controlButtons, volumeSection].filter(el => el !== null);
            if (resetElements.length > 0) {
                anime.set(resetElements, {
                    opacity: 1,
                    scale: 1,
                    rotateY: '0deg',
                    translateX: '0px',
                    translateY: '0px',
                    visibility: 'visible'
                });
            }
            if (albumArt) {
                anime.set(albumArt, {
                    opacity: 1,
                    scale: 1,
                    rotateY: '0deg',
                    visibility: 'visible'
                });
            }
        }
    }, 550);
    
    // Create timeline for profile changing
    const profileChangeTL = anime.timeline({ autoplay: false });
    
    if (albumArt) {
        profileChangeTL.add({
            targets: albumArt,
            duration: 300,
            rotateY: '90deg',
            scale: 0.8,
            opacity: 0,
            easing: 'easeInOutQuad'
        }, 0);
    }
    if (artistInfo) {
        profileChangeTL.add({
            targets: artistInfo,
            duration: 250,
            opacity: 0,
            translateX: '-10px',
            easing: 'easeInOutQuad'
        }, 50);
    }
    if (messageDisplay) {
        profileChangeTL.add({
            targets: messageDisplay,
            duration: 250,
            opacity: 0,
            easing: 'easeInOutQuad'
        }, 80);
    }
    if (infoSection) {
        profileChangeTL.add({
            targets: infoSection,
            duration: 250,
            opacity: 0,
            easing: 'easeInOutQuad'
        }, 110);
    }
    if (playerBottom) {
        profileChangeTL.add({
            targets: playerBottom,
            duration: 250,
            opacity: 0.3,
            easing: 'easeInOutQuad'
        }, 100);
    }
    
    profileChangeTL.add(() => {
        playerContainer.classList.remove('profile-changing');
        const resetElements = [albumArt, artistInfo, messageDisplay, infoSection, playerBottom].filter(el => el !== null);
        if (resetElements.length > 0) {
            anime.set(resetElements, {
                opacity: 1,
                scale: 1,
                rotateY: '0deg',
                translateX: '0px',
                visibility: 'visible'
            });
        }
    }, 300);
    
    if (albumArt) {
        profileChangeTL.add({
            targets: albumArt,
            duration: 400,
            rotateY: '-90deg',
            scale: 0.9,
            opacity: 1,
            easing: 'easeOutBack'
        }, 300);
    }
    if (artistInfo) {
        profileChangeTL.add({
            targets: artistInfo,
            duration: 350,
            opacity: 1,
            translateX: '0px',
            easing: 'easeOutQuad'
        }, 350);
    }
    if (messageDisplay) {
        profileChangeTL.add({
            targets: messageDisplay,
            duration: 350,
            opacity: 1,
            scale: 1,
            easing: 'easeOutBack'
        }, 400);
    }
    if (infoSection) {
        profileChangeTL.add({
            targets: infoSection,
            duration: 350,
            opacity: 1,
            easing: 'easeOutQuad'
        }, 450);
    }
    
    // Set initial states - ONLY set hidden elements
    anime.set(playerContainer, { opacity: 0, scale: 0.95, visibility: 'hidden' });
    
    // Only set elements if player is initially hidden
    if (playerContainer.style.display === 'none') {
        const hiddenElements = [playerTop, playerMiddle, playerBottom, artistInfo, messageDisplay, infoSection, progressSection, controlButtons, volumeSection].filter(el => el !== null);
        if (hiddenElements.length > 0) {
            anime.set(hiddenElements, {
                opacity: 0,
                visibility: 'hidden'
            });
        }
        if (albumArt) {
            anime.set(albumArt, { 
                opacity: 0,
                rotateY: '-20deg',
                scale: 0.9,
                visibility: 'hidden'
            });
        }
    }
    
    // Track animation state to prevent conflicts
    let currentAnimationState = 'idle'; // idle, opening, closing, changing
    
    // Watch for player visibility changes
    const observer = new MutationObserver(() => {
        const isVisible = playerContainer.style.display !== 'none';
        const isClosing = playerContainer.classList.contains('closing');
        const isChanging = playerContainer.classList.contains('profile-changing');
        
        // Determine the desired state
        let targetState = 'idle';
        if (isClosing) {
            targetState = 'closing';
        } else if (isChanging) {
            targetState = 'changing';
        } else if (isVisible) {
            targetState = 'opening';
        }
        
        // Only trigger animation if state changed
        if (targetState !== currentAnimationState) {
            currentAnimationState = targetState;
            
            // Kill any running timelines to prevent conflicts
            openTL.pause();
            closeTL.pause();
            profileChangeTL.pause();
            
            if (targetState === 'opening') {
                // Ensure visibility is set for all elements
                const visibleElements = [playerContainer, playerTop, playerMiddle, playerBottom, albumArt, artistInfo, messageDisplay, infoSection, progressSection, controlButtons, volumeSection].filter(el => el !== null);
                if (visibleElements.length > 0) {
                    anime.set(visibleElements, { visibility: 'visible' });
                }
                openTL.play();
            } else if (targetState === 'closing') {
                closeTL.play();
            } else if (targetState === 'changing') {
                // Ensure visibility for profile change
                const visibleElements = [playerContainer, playerTop, playerMiddle, playerBottom, albumArt, artistInfo, messageDisplay, infoSection, progressSection, controlButtons, volumeSection].filter(el => el !== null);
                if (visibleElements.length > 0) {
                    anime.set(visibleElements, { visibility: 'visible' });
                }
                profileChangeTL.play();
            }
        }
    });
    
    observer.observe(playerContainer, {
        attributes: true,
        attributeFilter: ['style', 'class']
    });
}

// ========== TEACHER DETAIL FORM ANIMATIONS ==========
function initTeacherDetailAnimations() {
    const teacherForm = document.querySelector('.teacher-detail-form');
    
    if (!teacherForm) return;
    
    // Set initial state to ensure visibility
    anime.set(teacherForm, { 
        opacity: 1,
        translateY: '0px'
    });
    
    if (teacherForm.querySelector('.teacher-detail-photo')) {
        anime.set(teacherForm.querySelector('.teacher-detail-photo'), {
            opacity: 1,
            translateX: '0px'
        });
    }
    
    if (teacherForm.querySelector('.teacher-detail-info')) {
        anime.set(teacherForm.querySelector('.teacher-detail-info'), {
            opacity: 1,
            translateX: '0px'
        });
    }
    
    const formTL = anime.timeline({ autoplay: false });
    
    formTL
        .add({
            targets: teacherForm,
            duration: 500,
            translateY: '0px',
            opacity: 1,
            easing: 'easeOutQuad'
        }, 0)
        .add({
            targets: teacherForm.querySelector('.teacher-detail-photo'),
            duration: 500,
            translateX: '0px',
            opacity: 1,
            easing: 'easeOutQuad'
        }, 100)
        .add({
            targets: teacherForm.querySelector('.teacher-detail-info'),
            duration: 500,
            translateX: '0px',
            opacity: 1,
            easing: 'easeOutQuad'
        }, 200);
    
    const observer = new MutationObserver(() => {
        const isVisible = teacherForm.style.display !== 'none';
        if (isVisible) {
            formTL.play();
        } else {
            formTL.pause();
        }
    });
    
    observer.observe(teacherForm, {
        attributes: true,
        attributeFilter: ['style']
    });
}

// ========== BUTTON HOVER ANIMATIONS ==========
function initButtonAnimations() {
    const buttons = document.querySelectorAll('.btn-primary, .btn-secondary, .control-btn, .theme-btn, .user-btn, .filter-btn, .sidebar-item');
    
    buttons.forEach((btn) => {
        btn.addEventListener('mouseenter', () => {
            anime({
                targets: btn,
                duration: 300,
                scale: 1.08,
                easing: 'easeOutElastic(1.2, .6)'
            });
        });
        
        btn.addEventListener('mouseleave', () => {
            anime({
                targets: btn,
                duration: 300,
                scale: 1,
                easing: 'easeOutElastic(1.2, .6)'
            });
        });
        
        btn.addEventListener('mousedown', () => {
            anime({
                targets: btn,
                duration: 150,
                scale: 0.95,
                easing: 'easeOutQuad'
            });
        });
        
        btn.addEventListener('mouseup', () => {
            anime({
                targets: btn,
                duration: 150,
                scale: 1.08,
                easing: 'easeOutQuad'
            });
        });
    });
    
    // Special animations for music player controls
    const controlBtns = document.querySelectorAll('.control-btn');
    controlBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            anime({
                targets: btn,
                duration: 400,
                scale: [1.2, 1.1, 1],
                easing: 'easeOutBack'
            });
        });
    });
    
    // Next/Prev button special animation
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            anime({
                targets: nextBtn,
                duration: 500,
                rotate: '360deg',
                scale: [1.2, 1.15, 1],
                easing: 'easeInOutQuad'
            });
        });
    }
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            anime({
                targets: prevBtn,
                duration: 500,
                rotate: '-360deg',
                scale: [1.2, 1.15, 1],
                easing: 'easeInOutQuad'
            });
        });
    }
}

// ========== FORM INPUT ANIMATIONS ==========
function initFormAnimations() {
    const inputs = document.querySelectorAll('.form-group input, .form-group select, .form-group textarea');
    
    inputs.forEach((input) => {
        input.addEventListener('focus', () => {
            anime({
                targets: input,
                duration: 200,
                borderColor: 'var(--primary-color)',
                easing: 'easeOutQuad'
            });
        });
        
        input.addEventListener('blur', () => {
            anime({
                targets: input,
                duration: 200,
                borderColor: 'var(--border-color)',
                easing: 'easeOutQuad'
            });
        });
    });
}

// ========== MEMORIES PAGE ANIMATIONS ==========
function initMemoriesAnimations() {
    const memoryCards = document.querySelectorAll('.memory-card');
    
    if (memoryCards.length === 0) return;
    
    // Initialize scroll animations for memory cards
    initMemoryCardScrollAnimations(memoryCards);
    
    // Add hover effects for mouse interactions
    memoryCards.forEach((card) => {
        card.addEventListener('mouseenter', () => {
            anime({
                targets: card,
                duration: 300,
                scale: 1.02,
                rotate: '1deg',
                easing: 'easeOutQuad'
            });
        });
        
        card.addEventListener('mouseleave', () => {
            anime({
                targets: card,
                duration: 300,
                scale: 1,
                rotate: '0deg',
                easing: 'easeOutQuad'
            });
        });
    });
}

// ========== SCROLL ANIMATION FOR MEMORY CARDS ==========
function initMemoryCardScrollAnimations(cards) {
    // Set initial state
    anime.set(cards, {
        opacity: 0,
        scale: 0.8,
        translateY: '30px'
    });
    
    // Use IntersectionObserver for scroll-triggered animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '50px'
    };
    
    const cardObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            const card = entry.target;
            
            if (entry.isIntersecting) {
                // Card entering viewport - Fade In + Scale animation
                anime({
                    targets: card,
                    duration: 700,
                    opacity: [0, 1],
                    scale: [0.8, 1],
                    translateY: ['30px', '0px'],
                    delay: index * 80, // Stagger effect
                    easing: 'easeOutCubic'
                });
            } else {
                // Card leaving viewport - Fade Out + Scale animation
                anime({
                    targets: card,
                    duration: 500,
                    opacity: [1, 0],
                    scale: [1, 0.8],
                    translateY: ['0px', '-30px'],
                    delay: 0,
                    easing: 'easeInCubic'
                });
            }
        });
    }, observerOptions);
    
    // Observe all cards
    cards.forEach((card, index) => {
        card.dataset.cardIndex = index;
        cardObserver.observe(card);
    });
}

// ========== TIMELINE ANIMATIONS ==========
function initTimelineAnimations() {
    const timelineItems = document.querySelectorAll('.timeline-item');
    
    if (timelineItems.length === 0) return;
    
    // Ensure timeline items are visible initially
    anime.set(timelineItems, {
        opacity: 1,
        visibility: 'visible'
    });
    
    timelineItems.forEach((item, index) => {
        const content = item.querySelector('.timeline-content');
        const dot = item.querySelector('.timeline-dot');
        
        // Animate timeline content (ScrollTrigger removed)
        anime({
            targets: content,
            duration: 600,
            opacity: [0, 1],
            translateX: [index % 2 === 0 ? '-50px' : '50px', '0px'],
            easing: 'easeOutQuad'
        });
        
        // Animate timeline dot
        anime({
            targets: dot,
            duration: 400,
            scale: [0, 1],
            opacity: [0, 1],
            delay: 300,
            easing: 'easeOutBack'
        });
    });
}

// ========== FOOTER ANIMATIONS ==========
function initFooterAnimations() {
    const footer = document.querySelector('.music-footer');
    const equalizer = document.querySelectorAll('.equalizer span');
    
    if (!footer) return;
    
    anime({
        targets: footer,
        duration: 800,
        translateY: ['40px', '0px'],
        opacity: [0, 1],
        easing: 'easeOutQuad',
        delay: 1000
    });
    
    // Equalizer bars continuous animation
    equalizer.forEach((bar, index) => {
        anime({
            targets: bar,
            duration: 600,
            height: '40px',
            easing: 'easeInOutQuad',
            delay: index * 100,
            loop: true,
            direction: 'alternate'
        });
    });
}

// ========== PROGRESS BAR WAVE ANIMATION ==========
function initProgressWaveAnimation() {
    const progressBar = document.querySelector('.progress-bar');
    const progressHandle = document.querySelector('.progress-handle');
    const playPauseBtn = document.getElementById('playPauseBtn');
    
    if (progressBar) {
        // Add hover effect
        progressBar.addEventListener('mouseenter', () => {
            anime({
                targets: progressBar,
                duration: 300,
                filter: 'brightness(1.2)',
                easing: 'easeOutQuad'
            });
            
            anime({
                targets: progressHandle,
                duration: 300,
                scale: 1.3,
                boxShadow: '0 6px 20px rgba(29, 185, 84, 0.6)',
                easing: 'easeOutQuad'
            });
        });
        
        progressBar.addEventListener('mouseleave', () => {
            anime({
                targets: progressBar,
                duration: 300,
                filter: 'brightness(1)',
                easing: 'easeOutQuad'
            });
            
            anime({
                targets: progressHandle,
                duration: 300,
                scale: 1,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                easing: 'easeOutQuad'
            });
        });
    }
    
    // Play button pulse animation
    if (playPauseBtn) {
        const playPulseAnim = anime({
            targets: playPauseBtn,
            duration: 1500,
            boxShadow: [
                '0 0 0 0px rgba(29, 185, 84, 0.7)',
                '0 0 0 10px rgba(29, 185, 84, 0.4)',
                '0 0 0 20px rgba(29, 185, 84, 0)'
            ],
            easing: 'easeOutQuad',
            loop: true
        });
        
        playPauseBtn.addEventListener('mouseenter', () => {
            playPulseAnim.pause();
            anime({
                targets: playPauseBtn,
                duration: 300,
                scale: 1.15,
                easing: 'easeOutBack',
                boxShadow: '0 8px 25px rgba(29, 185, 84, 0.5)'
            });
        });
        
        playPauseBtn.addEventListener('mouseleave', () => {
            playPulseAnim.play();
            anime({
                targets: playPauseBtn,
                duration: 300,
                scale: 1,
                easing: 'easeOutBack'
            });
        });
    }
}

// ========== CLOSE BUTTON ANIMATION ==========
function initCloseButtonAnimation() {
    const closeBtn = document.querySelector('.close-player');
    
    if (!closeBtn) return;
    
    closeBtn.addEventListener('mouseenter', () => {
        anime({
            targets: closeBtn,
            duration: 300,
            scale: 1.15,
            rotate: '90deg',
            easing: 'easeOutBack',
            boxShadow: '0 6px 20px rgba(255, 107, 107, 0.5)'
        });
    });
    
    closeBtn.addEventListener('mouseleave', () => {
        anime({
            targets: closeBtn,
            duration: 400,
            scale: 1,
            rotate: '0deg',
            easing: 'easeOutElastic(1.2, .6)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
        });
    });
    
    closeBtn.addEventListener('click', () => {
        anime({
            targets: closeBtn,
            duration: 200,
            scale: 0.9,
            easing: 'easeInQuad'
        });
    });
}

// ========== STUDENTS GRID ANIMATIONS ==========
function initStudentsGridAnimations() {
    const studentsGrid = document.getElementById('studentsGrid');
    
    if (!studentsGrid) return;
    
    // Watch for grid updates with MutationObserver
    const gridObserver = new MutationObserver(() => {
        const cards = studentsGrid.querySelectorAll('.student-card');
        
        if (cards.length > 0) {
            initCardScrollAnimations(cards);
        }
    });
    
    gridObserver.observe(studentsGrid, {
        childList: true,
        subtree: true
    });
}

// ========== SCROLL ANIMATION FOR STUDENT CARDS ==========
function initCardScrollAnimations(cards) {
    // Set initial state
    anime.set(cards, {
        opacity: 0,
        scale: 0.8,
        translateY: '30px'
    });
    
    // Use IntersectionObserver for scroll-triggered animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '50px'
    };
    
    const cardObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            const card = entry.target;
            
            if (entry.isIntersecting) {
                // Card entering viewport - Fade In + Scale animation
                anime({
                    targets: card,
                    duration: 700,
                    opacity: [0, 1],
                    scale: [0.8, 1],
                    translateY: ['30px', '0px'],
                    delay: index * 80, // Stagger effect
                    easing: 'easeOutCubic'
                });
            } else {
                // Card leaving viewport - Fade Out + Scale animation
                anime({
                    targets: card,
                    duration: 500,
                    opacity: [1, 0],
                    scale: [1, 0.8],
                    translateY: ['0px', '-30px'],
                    delay: 0,
                    easing: 'easeInCubic'
                });
            }
        });
    }, observerOptions);
    
    // Observe all cards
    cards.forEach((card, index) => {
        card.dataset.cardIndex = index;
        cardObserver.observe(card);
    });
}

// ========== MODAL & DETAIL VIEW ANIMATIONS ==========
function initModalAnimations() {
    const studentModal = document.getElementById('studentModal');
    
    if (studentModal) {
        const modalObserver = new MutationObserver(() => {
            const isVisible = studentModal.style.display !== 'none' && studentModal.classList.contains('active');
            const isClosing = studentModal.classList.contains('closing');
            
            if (isVisible) {
                // Modal opening animation
                anime.set(studentModal, { display: 'flex', visibility: 'visible' });
                
                anime.timeline({ autoplay: true })
                    .add({
                        targets: studentModal,
                        duration: 300,
                        opacity: [0, 1],
                        easing: 'easeOutQuad'
                    }, 0)
                    .add({
                        targets: '.modal-content',
                        duration: 400,
                        scale: [0.8, 1],
                        translateY: ['30px', '0px'],
                        opacity: [0, 1],
                        easing: 'easeOutBack'
                    }, 100);
            } else if (isClosing) {
                // Modal closing animation
                anime.timeline({ autoplay: true })
                    .add({
                        targets: '.modal-content',
                        duration: 300,
                        scale: [1, 0.8],
                        translateY: ['0px', '30px'],
                        opacity: [1, 0],
                        easing: 'easeInBack'
                    }, 0)
                    .add({
                        targets: studentModal,
                        duration: 300,
                        opacity: [1, 0],
                        easing: 'easeInQuad'
                    }, 100);
            }
        });
        
        modalObserver.observe(studentModal, {
            attributes: true,
            attributeFilter: ['style', 'class']
        });
    }
}

// ========== CARD CLICK ANIMATION ==========
function initCardClickAnimations() {
    const cards = document.querySelectorAll('.student-card, .teacher-card');
    
    cards.forEach((card) => {
        card.addEventListener('click', () => {
            // Ripple effect on card click
            anime({
                targets: card,
                duration: 600,
                boxShadow: [
                    '0 8px 24px rgba(29, 185, 84, 0)',
                    '0 8px 24px rgba(29, 185, 84, 0.4)',
                    '0 8px 24px rgba(29, 185, 84, 0)'
                ],
                easing: 'easeOutQuad'
            });
        });
    });
}

// ========== INITIALIZE ALL ANIMATIONS ==========
function initAllAnimations() {
    // Check for prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        anime.set('.sidebar-nav', { translateX: '-280px' }); // Set initial position
        return;
    }
    
    initHeaderAnimations();
    initSidebarAnimations();
    initPageHeaderAnimations();
    initFilterAnimations();
    initCardAnimations();
    initStudentsGridAnimations();
    initModalAnimations();
    initCardClickAnimations();
    initMusicPlayerAnimations();
    initTeacherDetailAnimations();
    initButtonAnimations();
    initFormAnimations();
    initMemoriesAnimations();
    initFooterAnimations();
    initProgressWaveAnimation();
    initCloseButtonAnimation();
    
    console.log('✅ Anime.js Animations initialized successfully!');
}

// ========== LOADING TIMING CONFIGURATION ==========
// This must match LOADING_CONFIG in loading.js
const PAGE_ANIMATION_CONFIG = {
    LOADING_DURATION: 2500,           // Total loading duration (ms) - MUST MATCH loading.js (LOADING_CONFIG.LOADING_DURATION)
    CONTENT_TRANSITION_DELAY: 100,    // Delay after loading to show content (MUST MATCH loading.js CONTENT_TRANSITION_DELAY)
    ANIMATION_START_DELAY: 0,       // Additional delay before starting page animations
};

// Calculate total wait time = LOADING_DURATION + CONTENT_TRANSITION_DELAY + ANIMATION_START_DELAY
function getTotalWaitTime() {
    const config = PAGE_ANIMATION_CONFIG;
    return config.LOADING_DURATION + config.CONTENT_TRANSITION_DELAY + config.ANIMATION_START_DELAY;
}

const TOTAL_WAIT_TIME = getTotalWaitTime();

// Initialize when DOM is ready - Wait for loading to complete first
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Wait for loading animation to complete before starting page animations
        setTimeout(initAllAnimations, TOTAL_WAIT_TIME);
        
        console.log(`⏱️ Page animations will start after ${TOTAL_WAIT_TIME}ms (Loading: ${PAGE_ANIMATION_CONFIG.LOADING_DURATION}ms + Transition: ${PAGE_ANIMATION_CONFIG.CONTENT_TRANSITION_DELAY}ms + Delay: ${PAGE_ANIMATION_CONFIG.ANIMATION_START_DELAY}ms)`);
    });
} else {
    setTimeout(initAllAnimations, TOTAL_WAIT_TIME);
    
    console.log(`⏱️ Page animations will start after ${TOTAL_WAIT_TIME}ms (Loading: ${PAGE_ANIMATION_CONFIG.LOADING_DURATION}ms + Transition: ${PAGE_ANIMATION_CONFIG.CONTENT_TRANSITION_DELAY}ms + Delay: ${PAGE_ANIMATION_CONFIG.ANIMATION_START_DELAY}ms)`);
}
}  // End of "if (typeof PAGE_ANIMATION_CONFIG === 'undefined')" conditional
