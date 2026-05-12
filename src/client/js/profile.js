// profile.js
if (!window.API_URL) {
    window.API_URL = 'https://rpl2k26.site';
}
const API_URL = window.API_URL;

// ========== SOCIAL MEDIA HELPERS ==========
// Keys: the 6 platforms supported in the UI. The second element of each
// pair is the DOM-id suffix used in the student form; the admin edit
// form uses the same suffixes but with an "admin" prefix.
const SOCIAL_MEDIA_FIELDS = [
    ['instagram', 'socialInstagram'],
    ['tiktok',    'socialTiktok'],
    ['linkedin',  'socialLinkedin'],
    ['facebook',  'socialFacebook'],
    ['twitter',   'socialTwitter'],
    ['threads',   'socialThreads']
];

/**
 * Read social media inputs from the form and return an object ready to
 * send to the server. `context` selects which set of inputs to read:
 *   - 'student' → socialInstagram, socialTiktok, ...
 *   - 'admin'   → adminSocialInstagram, adminSocialTiktok, ...
 * Empty strings are kept (so the server can clear a platform by saving
 * "" — the beranda renderer hides empty entries automatically).
 */
function collectSocialMediaFromForm(context = 'student') {
    const prefix = context === 'admin' ? 'adminSocial' : 'social';
    const data = {};
    SOCIAL_MEDIA_FIELDS.forEach(([key, idSuffix]) => {
        const id = context === 'admin'
            ? 'adminS' + idSuffix.slice(1) // socialInstagram → adminSocialInstagram
            : idSuffix;
        const el = document.getElementById(id);
        data[key] = el ? (el.value || '').trim() : '';
    });
    return data;
}

/**
 * Populate the social media form inputs from a `socialMedia` object
 * that came back from GET /api/students/:id. Missing object or missing
 * keys result in empty inputs (no-op).
 */
function populateSocialMediaForm(socialMedia, context = 'student') {
    const sm = socialMedia || {};
    SOCIAL_MEDIA_FIELDS.forEach(([key, idSuffix]) => {
        const id = context === 'admin'
            ? 'adminS' + idSuffix.slice(1)
            : idSuffix;
        const el = document.getElementById(id);
        if (el) el.value = sm[key] || '';
    });
}

// ========== ADMIN DASHBOARD REDIRECT ==========
function checkAndShowAdminLink() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.type === 'admin') {
            const adminLink = document.getElementById('adminDashboardLink');
            const adminLinkMobile = document.getElementById('adminDashboardLinkMobile');
            if (adminLink) adminLink.style.display = 'inline-flex';
            if (adminLinkMobile) adminLinkMobile.style.display = 'flex';
        }
    } catch (error) {
        console.warn('Could not check admin status:', error);
    }
}

function goToAdminDashboard(event) {
    event.preventDefault();
    window.location.href = 'admin-dashboard';
}

// Initialize admin link visibility
document.addEventListener('DOMContentLoaded', checkAndShowAdminLink);
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAndShowAdminLink);
} else {
    checkAndShowAdminLink();
}

// ========== EDIT MODE FOR ADMIN ==========
// Check if URL has edit parameter for admin to edit student profile
function checkEditMode() {
    const params = new URLSearchParams(window.location.search);
    const editStudentId = params.get('edit');
    
    if (editStudentId) {
        console.log('📝 Edit mode detected: Checking admin authorization...');
        
        // SECURITY CHECK: Only admin can access edit mode
        const user = JSON.parse(localStorage.getItem('user'));
        
        if (!user) {
            console.error('❌ SECURITY: No user logged in, redirecting to login');
            popup.error('Login dulu dong');
            window.location.href = '/';
            return;
        }
        
        if (user.type !== 'admin') {
            console.error('❌ SECURITY: Non-admin user attempted to access edit mode', { userId: user.id, userType: user.type, attemptedEdit: editStudentId });
            popup.error('ELU SIAPA YA?');
            window.location.href = 'profile';
            return;
        }
        
        console.log('✅ Admin authorized for edit mode:', { adminId: user.id, editingStudent: editStudentId });
        
        // Hide all other profiles - only show student profile for editing
        const adminProfile = document.getElementById('adminProfile');
        const teacherProfile = document.getElementById('teacherProfile');
        if (adminProfile) adminProfile.style.display = 'none';
        if (teacherProfile) teacherProfile.style.display = 'none';
        
        // Initialize theme
        initTheme();
        
        // Show student profile form for editing (bypass normal user login)
        document.getElementById('studentProfile').style.display = 'block';
        
        // Load student data and setup edit form
        loadStudentForEdit(editStudentId);
        
        // Setup audio tabs for admin edit mode
        setTimeout(() => {
            console.log('🎵 Initializing audio tabs for admin edit mode');
            setupAudioTabs('student');
            // Don't load audio files here - wait for user to click download tab
        }, 500);
        
        // Setup logout
        setupLogout();
    }
}

async function loadStudentForEdit(studentId) {
    try {
        // SECURITY: Verify admin user is still logged in
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || user.type !== 'admin') {
            throw new Error('Unauthorized: Admin access required');
        }
        
        const response = await fetch(`${API_URL}/api/students/${studentId}`);
        if (!response.ok) throw new Error('Student not found');
        
        const student = await response.json();
        
        // Populate form with student data
        const fullNameEl = document.getElementById('studentFullName');
        const birthdayEl = document.getElementById('studentBirthday');
        const messageEl = document.getElementById('studentMessage');
        
        if (fullNameEl) fullNameEl.value = student.name || '';
        if (birthdayEl) birthdayEl.value = student.birthday || '';
        if (messageEl) messageEl.value = student.message || '';

        // Load saved social media links into their corresponding inputs.
        populateSocialMediaForm(student.socialMedia, 'student');
        
        if (student.photo) {
            const photoPreview = document.querySelector('#studentProfile .photo-preview img') || document.getElementById('photoPreview');
            if (photoPreview) {
                photoPreview.src = student.photo;
            }
        }
        
        // Load audio if exists AND file is valid
        if (student.audioFile) {
            // Validate file exists before setting
            const fileExists = await checkAudioFileExists(student.audioFile);
            if (fileExists) {
                studentAudioPath = student.audioFile;
                studentAudioMetadata = null;  // Clear metadata, will be loaded when needed

                displayStudentAudio();
                displayStudentLyricsSection();  // Update form inputs with extracted artist/title
                console.log('✅ Student audio loaded for editing:', student.audioFile);
            } else {
                console.log('Audio file not found, skipping:', student.audioFile);
                // Clear invalid audio reference
                studentAudioPath = null;
                studentAudioMetadata = null;
            }
        }
        
        // Store student ID for updates
        window.currentEditStudentId = studentId;
        
        // Add visual indicator that we're in edit mode
        const header = document.querySelector('.profile-header');
        if (header) {
            const editIndicator = document.createElement('p');
            editIndicator.style.cssText = 'color: #FF9800; margin: 0.5rem 0; font-weight: 600;';
            editIndicator.innerHTML = `<i class="fas fa-edit"></i> Editing: ${student.name}`;
            header.appendChild(editIndicator);
        }
        
        console.log('✅ Student data loaded for editing:', studentId);
        
        // Setup form for edit mode
        setupStudentFormForEdit(studentId);
    } catch (error) {
        console.error('Error loading student for edit:', error);
        popup.error(`Yah Error: ${error.message}`);
        // Redirect back to profile if error
        setTimeout(() => {
            window.location.href = 'profile';
        }, 2000);
    }
}

// Setup form submit for edit mode
function setupStudentFormForEdit(studentId) {
    const form = document.getElementById('studentProfileForm');
    if (!form) {
        console.warn('Student form not found');
        return;
    }
    
    // Remove old event listeners by cloning
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    // Add new submit handler for edit mode
    newForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // SECURITY: Verify admin is still logged in before saving
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || user.type !== 'admin') {
            console.error('❌ SECURITY: Unauthorized save attempt - not admin');
            popup.error('Hayo Mau Ngapain?');
            window.location.href = 'profile';
            return;
        }
        
        const fullName = document.getElementById('studentFullName')?.value;
        const birthday = document.getElementById('studentBirthday')?.value;
        const message = document.getElementById('studentMessage')?.value;
        
        if (!fullName || !birthday || !message) {
            popup.error('Isi dulu yang niat');
            return;
        }
        
        // Get trim settings
        const trimStart = parseFloat(document.getElementById('studentAudioTrimStart')?.value) || 0;
        const trimEnd = parseFloat(document.getElementById('studentAudioTrimEnd')?.value) || null;
        
        const updateData = {
            name: fullName,
            birthday: birthday,
            message: message,
            photo: document.querySelector('#studentProfile .photo-preview img')?.src || null,
            audioFile: studentAudioPath || null,
        };
        
        let loadingDialog = null;
        
        try {
            // Show loading dialog
            loadingDialog = await showLyricsProcessingDialog();
            
            // First, save profile
            console.log('📤 Saving profile (admin edit by', user.id, ') to:', `${API_URL}/api/students/${studentId}`);
            
            const response = await fetch(`${API_URL}/api/students/${studentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });
            
            if (!response.ok) {
                throw new Error(`Server error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                updateLoadingDialog(loadingDialog, 'Profile updated successfully!', 100);
                
                // Skip automatic lyrics search - user already generates manually if needed
                
                setTimeout(() => {
                    if (loadingDialog) closeLoadingDialog(loadingDialog);
                    popup.success('SIP!', () => {
                        window.location.href = 'admin-dashboard';
                    });
                }, 1500);
            } else {
                if (loadingDialog) closeLoadingDialog(loadingDialog);
                popup.error('Yahh Error Nih: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            if (loadingDialog) closeLoadingDialog(loadingDialog);
            popup.error('Yahh Error Nih: ' + error.message);
        }
    });
}

// Initialize edit mode on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Wait a bit for form to be ready
        setTimeout(checkEditMode, 500);
    });
} else {
    // DOM already loaded
    setTimeout(checkEditMode, 500);
}

// Store for audio file path
let studentAudioPath = null;
let studentAudioMetadata = null;  // Store metadata (artist, title) from audio file

// ========== RESPONSIVE IMAGE HELPERS ==========
/**
 * Generate srcset for responsive images
 * @param {string} imageUrl - Original image URL
 * @returns {string} - srcset string (currently returns empty, variants not yet generated)
 */
function generateImageSrcset(imageUrl) {
    // Server doesn't produce size variants yet. Declaring the same URL as
    // both `1x` and `2x` (previous behavior) made retina browsers downscale
    // the image and render it blurry. Return '' so pages fall back to the
    // plain `src` at native resolution.
    return '';
}

/**
 * Generate sizes attribute for responsive images
 * @param {string} context - Context: 'gallery' or 'profile'
 * @returns {string} - sizes attribute for different breakpoints
 */
function getImageSizes(context = 'gallery') {
    // For now return auto since we're using original image
    return 'auto';
}

// ========== IMAGE CONVERSION TO WEBP ==========
/**
 * Convert any image format to WebP format
 * @param {File} file - The image file to convert
 * @param {number} quality - Quality level (0-1), default 0.8
 * @returns {Promise<Blob>} - WebP blob
 */
async function convertImageToWebP(file, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            
            img.onload = () => {
                // Create canvas with image dimensions
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                // Convert to WebP blob
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to convert image to WebP'));
                        }
                    },
                    'image/webp',
                    quality
                );
            };
            
            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };
            
            img.src = e.target.result;
        };
        
        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };
        
        reader.readAsDataURL(file);
    });
}

/**
 * Process multiple image files and convert to WebP
 * @param {FileList} files - List of files to convert
 * @returns {Promise<Map<string, Blob>>} - Map of filename to WebP blob
 */
async function convertMultipleImagesToWebP(files) {
    const convertedFiles = new Map();
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isImage = file.type.startsWith('image/');
        
        if (isImage) {
            try {
                console.log(`🔄 Converting image ${i + 1}/${files.length}: ${file.name}`);
                const webpBlob = await convertImageToWebP(file, 0.85);
                const filename = file.name.replace(/\.[^/.]+$/, '') + '.webp';
                convertedFiles.set(filename, webpBlob);
                console.log(`✅ Converted to WebP: ${filename}`);
            } catch (error) {
                console.error(`❌ Error converting ${file.name}:`, error);
                throw new Error(`Failed to convert ${file.name} to WebP: ${error.message}`);
            }
        } else {
            // Keep non-image files as-is
            convertedFiles.set(file.name, file);
        }
    }
    
    return convertedFiles;
}

/**
 * Open the crop modal for image cropping before upload
 * @param {File} file - The selected image file
 * @param {HTMLElement} photoInput - The file input element
 * @param {HTMLElement} photoPreview - The preview image element
 */
function openCropModal(file, photoInput, photoPreview) {
    const cropModal = document.getElementById('cropModal');
    const cropImage = document.getElementById('cropImage');
    let cropper = null;
    let cropperReady = false;

    // Read file and show in crop modal
    const reader = new FileReader();
    reader.onload = (e) => {
        cropImage.src = e.target.result;
        cropModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // Destroy previous cropper if exists
        if (cropper) {
            cropper.destroy();
            cropperReady = false;
        }

        // Initialize Cropper.js with 1:1 aspect ratio (square, matches card photo container)
        cropper = new Cropper(cropImage, {
            aspectRatio: 1,
            viewMode: 1,
            dragMode: 'move',
            autoCropArea: 0.9,
            responsive: true,
            restore: false,
            guides: true,
            center: true,
            highlight: false,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false,
            ready() {
                console.log('🖼️ Cropper ready');
                cropperReady = true;
            }
        });
    };
    reader.readAsDataURL(file);

    // Helper to close modal
    function closeCropModal() {
        cropModal.style.display = 'none';
        document.body.style.overflow = '';
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
        // Reset file input so same file can be selected again
        photoInput.value = '';
    }

    // Close button
    const closeBtn = document.getElementById('cropModalClose');
    const cancelBtn = document.getElementById('cropCancel');
    const overlay = cropModal.querySelector('.crop-modal-overlay');

    const handleClose = () => closeCropModal();
    closeBtn.onclick = handleClose;
    cancelBtn.onclick = handleClose;
    overlay.onclick = handleClose;

    // Rotate buttons
    document.getElementById('cropRotateLeft').onclick = () => {
        if (cropper) cropper.rotate(-90);
    };
    document.getElementById('cropRotateRight').onclick = () => {
        if (cropper) cropper.rotate(90);
    };
    document.getElementById('cropReset').onclick = () => {
        if (cropper) cropper.reset();
    };

    // Confirm crop
    document.getElementById('cropConfirm').onclick = async () => {
        if (!cropper || !cropperReady) {
            if (typeof popup !== 'undefined') {
                popup.error('Cropper belum siap. Tunggu sebentar lalu coba lagi.');
            }
            return;
        }

        try {
            // Show loading state
            const confirmBtn = document.getElementById('cropConfirm');
            confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
            confirmBtn.disabled = true;

            // Get cropped canvas
            const canvas = cropper.getCroppedCanvas({
                maxWidth: 800,
                maxHeight: 1067, // 800 * 4/3
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high'
            });

            // Check if canvas was successfully created
            if (!canvas) {
                throw new Error('Gagal membuat canvas crop. Pastikan gambar sudah dimuat sepenuhnya.');
            }

            // Convert canvas to WebP blob
            const webpBlob = await new Promise((resolve, reject) => {
                canvas.toBlob(
                    (blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error('Failed to create cropped image'));
                    },
                    'image/webp',
                    0.85
                );
            });

            // Set preview
            const previewReader = new FileReader();
            previewReader.onload = (ev) => {
                photoPreview.src = ev.target.result;
                photoPreview.style.opacity = '1';
                const overlayEl = photoPreview.nextElementSibling;
                if (overlayEl) overlayEl.innerHTML = '<i class="fas fa-camera"></i><span>Click to change</span>';
            };
            previewReader.readAsDataURL(webpBlob);

            // Store the converted blob for later upload
            photoInput.webpBlob = webpBlob;
            photoInput.webpFilename = file.name.replace(/\.[^/.]+$/, '') + '.webp';

            console.log(`✅ Photo cropped and converted to WebP: ${photoInput.webpFilename}`);

            // Close modal
            closeCropModal();

            // Reset button state
            confirmBtn.innerHTML = '<i class="fas fa-check"></i> Terapkan';
            confirmBtn.disabled = false;
        } catch (error) {
            console.error('Error cropping photo:', error);
            if (typeof popup !== 'undefined') {
                popup.error('Gagal crop foto: ' + error.message);
            }
            const confirmBtn = document.getElementById('cropConfirm');
            confirmBtn.innerHTML = '<i class="fas fa-check"></i> Terapkan';
            confirmBtn.disabled = false;
        }
    };
}

// Wait for loading to complete first
document.addEventListener('loadingComplete', () => {
    console.log('📍 Loading Complete on Profile, starting page initialization...');
    
    // Check if in edit mode - if so, skip normal initialization
    const params = new URLSearchParams(window.location.search);
    if (!params.get('edit')) {
        initPageContent();
    }
});

// Fallback if loadingComplete doesn't fire (after 6 seconds)
setTimeout(() => {
    if (!window.pageInitialized) {
        // Check if in edit mode - if so, skip normal initialization
        const params = new URLSearchParams(window.location.search);
        if (!params.get('edit')) {
            console.warn('⚠️ Loading timeout, initializing page anyway');
            initPageContent();
        }
    }
}, 6000);

function initPageContent() {
    window.pageInitialized = true;
    
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user) {
        popup.error('Login dulu dong');
        window.location.href = '/';
        return;
    }
    
    initTheme();
    
    if (user.type === 'student') {
        document.getElementById('studentProfile').style.display = 'block';
        loadStudentProfile(user.id);
        setupStudentForm(user.id);
        setupLyricsKaraoke();
    } else if (user.type === 'admin') {
        document.getElementById('adminProfile').style.display = 'block';
        setupAdminProfile();
    } else {
        document.getElementById('teacherProfile').style.display = 'block';
        loadTeacherProfile(user.id);
        setupTeacherForm(user.id);
    }
    
    setupLogout();
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

// Load student profile
async function loadStudentProfile(studentId) {
    try {
        const response = await fetch(`${API_URL}/api/students/${studentId}`);
        const student = await response.json();
        
        if (student.photo) {
            document.getElementById('photoPreview').src = student.photo;
        }
        document.getElementById('studentFullName').value = student.name || '';
        document.getElementById('studentBirthday').value = student.birthday || '';
        document.getElementById('studentMessage').value = student.message || '';

        // Load saved social media links (same helper as edit flow).
        populateSocialMediaForm(student.socialMedia, 'student');
        
        // Load audio if exists AND file is valid
        if (student.audioFile) {
            // Validate file exists before setting
            const fileExists = await checkAudioFileExists(student.audioFile);
            if (fileExists) {
                studentAudioPath = student.audioFile;
                studentAudioMetadata = null;  // Clear metadata, will be loaded when needed

                displayStudentAudio();
                displayStudentLyricsSection();  // Update form inputs with extracted artist/title
            } else {
                console.log('Audio file not found, skipping:', student.audioFile);
                // Clear invalid audio reference
                studentAudioPath = null;
                studentAudioMetadata = null;
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Load teacher profile
async function loadTeacherProfile(teacherId) {
    try {
        const response = await fetch(`${API_URL}/api/teachers/${teacherId}`);
        const teacher = await response.json();
        
        if (teacher.photo) {
            document.getElementById('teacherPhotoPreview').src = teacher.photo;
        }
        document.getElementById('teacherFullName').value = teacher.name || '';
        document.getElementById('teacherMessage').value = teacher.message || '';
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Setup student form
function setupStudentForm(studentId) {
    // Photo preview
    const photoInput = document.getElementById('photoInput');
    const photoPreview = document.getElementById('photoPreview');
    
    photoPreview.addEventListener('click', () => {
        photoInput.click();
    });
    
    photoInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            // Open crop modal instead of directly converting
            openCropModal(file, photoInput, photoPreview);
        }
    });
    
    // Audio file upload
    const audioFileInput = document.getElementById('studentAudioFile');
    if (audioFileInput) {
        audioFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                uploadStudentAudio(file);
            }
        });
    }
    
    // Form submit
    document.getElementById('studentProfileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Determine if this is admin edit mode or student self-edit
        const isAdminEdit = !!window.currentEditStudentId;
        const targetStudentId = isAdminEdit ? window.currentEditStudentId : studentId;
        
        // Get trim settings - use optional chaining to handle missing elements
        const trimStart = parseFloat(document.getElementById('studentAudioTrimStart')?.value) || 0;
        const trimEnd = parseFloat(document.getElementById('studentAudioTrimEnd')?.value) || null;
        
        const formData = {
            id: targetStudentId,
            name: document.getElementById('fullName')?.value || document.getElementById('studentFullName').value,
            birthday: document.getElementById('birthday')?.value || document.getElementById('studentBirthday').value,
            message: document.getElementById('message')?.value || document.getElementById('studentMessage').value,
            photo: photoPreview.src.startsWith('data:') ? photoPreview.src : null,
            audioFile: studentAudioPath,
            studentLyrics: document.getElementById('studentLyricsTextarea')?.value || null,
            lyricsArtistName: document.getElementById('lyricsArtistInput')?.value || null,
            lyricsSongTitle: document.getElementById('lyricsSongTitleInput')?.value || null,
            // Social media links — all optional. Empty strings are kept as
            // empty strings so the server can distinguish "removed" from
            // "never set". The beranda renderer hides badges for empty
            // values so the UX remains unaffected.
            socialMedia: collectSocialMediaFromForm('student')
        };
        
        let loadingDialog = null;
        
        try {
            // Show loading dialog
            loadingDialog = await showLyricsProcessingDialog();
            
            // First, save profile
            console.log('📤 Saving profile to:', `${API_URL}/api/students/${targetStudentId}`);
            
            const response = await fetch(`${API_URL}/api/students/${targetStudentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                throw new Error(`Server error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                // Skip automatic lyrics search on save - user already generated lyrics manually
                // Just show success message
                updateLoadingDialog(loadingDialog, 'Profile updated successfully!', 100);
                
                setTimeout(() => {
                    if (loadingDialog) closeLoadingDialog(loadingDialog);
                    
                    if (isAdminEdit) {
                        popup.success('Profile kamu udah jadi yuk liat!', () => {
                            window.location.href = 'admin-dashboard';
                        });
                    } else {
                        popup.success('Profile kamu udah jadi yuk liat!', () => {
                            window.location.href = 'beranda';
                        });
                    }
                }, 2000);
            } else {
                if (loadingDialog) closeLoadingDialog(loadingDialog);
                popup.error('Yahh Error Nih: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            if (loadingDialog) closeLoadingDialog(loadingDialog);
            popup.error('Yahh Error Nih: ' + error.message);
        }
    });

    // Setup artist input monitoring langsung saat form di-init,
    // tidak perlu tunggu user klik tab "Download MP3"
    setupArtistInputMonitoring();
}

// Setup teacher form
function setupTeacherForm(teacherId) {
    // Photo preview
    const photoInput = document.getElementById('teacherPhotoInput');
    const photoPreview = document.getElementById('teacherPhotoPreview');
    
    photoPreview.addEventListener('click', () => {
        photoInput.click();
    });
    
    photoInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                // Show conversion status
                photoPreview.style.opacity = '0.6';
                photoPreview.nextElementSibling.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Converting...';
                
                // Convert to WebP
                const webpBlob = await convertImageToWebP(file, 0.85);
                
                // Create blob URL for preview
                const reader = new FileReader();
                reader.onload = (e) => {
                    photoPreview.src = e.target.result;
                    photoPreview.style.opacity = '1';
                    photoPreview.nextElementSibling.innerHTML = '<i class="fas fa-camera"></i><span>Click to upload</span>';
                };
                reader.readAsDataURL(webpBlob);
                
                // Store the converted blob for later upload
                photoInput.webpBlob = webpBlob;
                photoInput.webpFilename = file.name.replace(/\.[^/.]+$/, '') + '.webp';
                
                console.log(`✅ Photo converted to WebP: ${photoInput.webpFilename}`);
            } catch (error) {
                console.error('Error converting photo:', error);
                popup.error('Foto nya gak bisa yang ini: ' + error.message + '. Coba foto yang lain');
                photoPreview.style.opacity = '1';
                photoPreview.nextElementSibling.innerHTML = '<i class="fas fa-camera"></i><span>Click to upload</span>';
            }
        }
    });
    
    // Form submit
    document.getElementById('teacherProfileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            id: teacherId,
            name: document.getElementById('teacherFullName').value,
            message: document.getElementById('teacherMessage').value,
            photo: photoPreview.src.startsWith('data:') ? photoPreview.src : null
        };
        
        try {
            const response = await fetch(`${API_URL}/api/teachers/${teacherId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                popup.success('Profile updated successfully!', () => {
                    window.location.href = 'beranda';
                });
            } else {
                popup.error('Yahh Error Nih');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            popup.error('Yahh Error Nih');
        }
    });
}

// Setup logout
function setupLogout() {
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        const confirmed = await popup.confirm('Yakin mau keluar?');
        if (confirmed) {
            localStorage.removeItem('user');
            window.location.href = 'index';
        }
    });
}

// ========== AUDIO HANDLING ==========
// ========== AUDIO HANDLING ==========




// Setup audio tabs
function setupAudioTabs(type) {
    const prefix = type === 'student' ? 'student' : 'teacher';
    const profile = document.getElementById(`${prefix}Profile`);
    
    if (!profile) {
        console.warn(`⚠️ Profile container not found for type: ${type}`);
        return;
    }
    
    const tabBtns = profile.querySelectorAll('.audio-tab-btn');
    const tabContents = profile.querySelectorAll('.audio-tab-content');
    
    console.log(`📋 Setting up audio tabs for ${type}:`, { btnCount: tabBtns.length, contentCount: tabContents.length });
    
    // Create array to store fresh references
    const contentArray = Array.from(tabContents);
    
    tabBtns.forEach((btn, btnIndex) => {
        // Remove old listeners by cloning
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            console.log(`🔘 Clicked tab button ${btnIndex}`);
            
            // Re-query to get fresh references (important!)
            const allBtns = profile.querySelectorAll('.audio-tab-btn');
            const allContents = profile.querySelectorAll('.audio-tab-content');
            
            // Remove active class from all buttons
            allBtns.forEach(b => b.classList.remove('active'));
            newBtn.classList.add('active');
            
            // Hide all tab contents
            allContents.forEach(content => {
                content.classList.remove('active');
                content.style.display = 'none';
            });
            
            // Show selected tab content
            if (contentArray[btnIndex]) {
                contentArray[btnIndex].classList.add('active');
                contentArray[btnIndex].style.display = 'block';
                console.log(`✅ Tab ${btnIndex} activated and displayed`);
                
                // Load audio files when switching to download tab (index 1)
                if (btnIndex === 1) {
                    console.log(`📥 Loading available audio files for tab ${btnIndex}`);
                    setTimeout(() => loadAvailableAudioFiles(), 100);
                }
            } else {
                console.warn(`⚠️ Tab content not found for index ${btnIndex}`);
            }
        });
    });
}

// Switch student audio tab
function switchStudentAudioTab(event) {
    event.preventDefault();
    const btn = event.target.closest('.audio-tab-btn');
    if (!btn) {
        console.warn('❌ Button not found');
        return;
    }
    
    const container = btn.closest('#studentProfile');
    if (!container) {
        console.warn('❌ Container not found');
        return;
    }
    
    const tabBtns = container.querySelectorAll('.audio-tab-btn');
    const tabContents = container.querySelectorAll('.audio-tab-content');
    
    console.log('🔄 Switching audio tab:', { btnCount: tabBtns.length, contentCount: tabContents.length });
    
    // Remove active from all
    tabBtns.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => {
        c.classList.remove('active');
        c.style.display = 'none';
    });
    
    // Add active to selected
    btn.classList.add('active');
    const index = Array.from(tabBtns).indexOf(btn);
    
    console.log('📍 Switching to tab index:', index);
    
    if (index >= 0 && index < tabContents.length) {
        const selectedContent = tabContents[index];
        selectedContent.classList.add('active');
        selectedContent.style.display = 'block';
        console.log('✅ Tab content displayed');
        
        // Load audio files when switching to download tab (index 1)
        if (index === 1) {
            console.log('📥 Loading available audio files');
            setTimeout(() => loadAvailableAudioFiles(), 100);
            
            // Setup URL monitoring for artist input visibility
            setupArtistInputMonitoring();
        } else if (index === 0) {
            // Clear artist input when switching to upload tab
            const artistInputGroup = document.getElementById('studentArtistInputGroup');
            const artistInput = document.getElementById('studentArtistInput');
            const urlInput = document.getElementById('studentAudioUrl');
            
            if (artistInputGroup) artistInputGroup.style.display = 'none';
            if (artistInput) artistInput.value = '';
            if (urlInput) urlInput.value = '';
        }
    } else {
        console.warn('⚠️ Tab content not found for index:', index);
    }
}

// Setup monitoring untuk artist input visibility
function setupArtistInputMonitoring() {
    const urlInput = document.getElementById('studentAudioUrl');
    const artistInputGroup = document.getElementById('studentArtistInputGroup');
    const artistInput = document.getElementById('studentArtistInput');
    
    if (!urlInput || !artistInputGroup) return;
    
    // Monitor URL input untuk Spotify detection
    urlInput.addEventListener('input', (e) => {
        const url = e.target.value.trim();
        const isSpotify = /spotify\.com/i.test(url);
        
        // Show artist input jika Spotify link terdeteksi
        if (isSpotify) {
            artistInputGroup.style.display = 'block';
            artistInput?.focus();
        } else {
            artistInputGroup.style.display = 'none';
            if (artistInput) artistInput.value = ''; // Reset artist input
        }
    });
    
    // Clear artist field when URL is cleared
    urlInput.addEventListener('change', (e) => {
        if (!e.target.value.trim()) {
            artistInputGroup.style.display = 'none';
            if (artistInput) artistInput.value = '';
        }
    });
}

// Upload student audio
async function uploadStudentAudio(file) {
    // Delete old audio file first if exists
    if (studentAudioPath) {
        await deleteStudentAudioFile(studentAudioPath);
    }
    
    const formData = new FormData();
    formData.append('audioFile', file);
    
    try {
        const response = await fetch(`${API_URL}/api/audio/upload`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            studentAudioPath = data.path;
            document.getElementById('studentAudioFileName').textContent = file.name;
            document.getElementById('studentAudioFilePreview').style.display = 'block';
            displayStudentAudio();
            displayStudentLyricsSection();  // Update form inputs with new audio metadata
            popup.success('Audio nya berhasil di upload!');
        } else {
            popup.error('Upload nya gagal: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Upload error:', error);
        popup.error('Upload nya gagal: ' + error.message);
    }
}
// ========== SMART WAIT MESSAGES ==========
const smartWaitMessages = [
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

function startSmartWaitMessages(statusDiv) {
    let messageIndex = 0;
    
    // Update message every 2 seconds
    const intervalId = setInterval(() => {
        if (!statusDiv || statusDiv.style.display === 'none') {
            clearInterval(intervalId);
            return;
        }
        
        messageIndex = (messageIndex + 1) % smartWaitMessages.length;
        statusDiv.innerHTML = `<p style="color: var(--primary-color);"><i class="fas fa-spinner fa-spin"></i> ${smartWaitMessages[messageIndex]}</p>`;
    }, 10000);
    
    return intervalId;
}

async function downloadStudentAudio() {
    const url = document.getElementById('studentAudioUrl').value;
    const artist = document.getElementById('studentArtistInput').value || '';
    const isSpotify = url.includes('spotify.com');
    
    if (!url) {
        popup.error('Masukin URL dulu dong!');
        return;
    }
    
    // Validate artist input for Spotify (if field is shown, it means we detected Spotify)
    if (isSpotify && !artist) {
        popup.error('Silakan masukkan nama pembuat lagu (artist) untuk Spotify\n\nSpotify API tidak punya data artist, jadi harus input manual untuk hasil pencarian lebih akurat.');
        return;
    }
    
    // Detect URL type
    const isTikTok = url.includes('tiktok.com');
    
    if (!isSpotify && !isTikTok) {
        popup.error('Gak bisa pake URL ini!\n\nBisa nya cuma ini:\n- TikTok (tiktok.com)\n- Spotify (open.spotify.com)');
        return;
    }
    
    // Delete old audio file first if exists
    if (studentAudioPath) {
        await deleteStudentAudioFile(studentAudioPath);
    }
    
    const statusDiv = document.getElementById('studentDownloadStatus');
    statusDiv.style.display = 'block';
    statusDiv.innerHTML = `<p style="color: var(--primary-color);"><i class="fas fa-spinner fa-spin"></i> ${smartWaitMessages[0]}</p>`;
    
    // Start smart wait messages
    const messageIntervalId = startSmartWaitMessages(statusDiv);
    
    try {
        // Create abort controller with 180 second timeout (3 minutes)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 180000);
        
        // Choose endpoint based on URL type
        let endpoint = isSpotify ? '/api/spotify/download' : '/api/audio/download';
        let body = isSpotify ? 
            { spotifyUrl: url, artist: artist } : 
            { url };
        
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        clearInterval(messageIntervalId);
        
        const data = await response.json();
        
        if (data.success) {
            let filename = '';
            
            // Handle Spotify response differently
            if (isSpotify) {
                // Spotify returns latest file and array of files
                if (data.latestFile) {
                    console.log('🎵 Spotify download response:', data.latestFile);
                    studentAudioPath = data.latestFile.url; // Use latest downloaded file
                    filename = data.latestFile.filename || '';
                    console.log('📁 Audio path set to:', studentAudioPath);
                    displayStudentAudio();
                    
                    // Extract metadata dari filename untuk populate form fields
                    const metadata = extractSongMetadata(filename);
                    displayStudentLyricsSection(metadata.artist, metadata.title);  // Pass extracted metadata
                    statusDiv.innerHTML = `<p style="color: var(--primary-color);"><i class="fas fa-check-circle"></i> ✅ ${data.message || 'Download completed successfully'}</p>`;
                    
                } else if (data.tracks && data.tracks.length > 0) {
                    studentAudioPath = data.tracks[0].url; // Fallback to first track
                    filename = data.tracks[0].filename || '';
                    displayStudentAudio();
                    
                    // Extract metadata dari filename untuk populate form fields
                    const metadata = extractSongMetadata(filename);
                    displayStudentLyricsSection(metadata.artist, metadata.title);  // Pass extracted metadata
                    statusDiv.innerHTML = `<p style="color: var(--primary-color);"><i class="fas fa-check-circle"></i> ✅ ${data.message || 'Download completed successfully'}</p>`;
                    
                } else {
                    throw new Error('No tracks were downloaded');
                }
            } else {
                // YouTube/TikTok response
                studentAudioPath = data.path;
                filename = data.filename || '';
                displayStudentAudio();
                
                // Extract metadata dari filename untuk populate form fields
                const metadata = extractSongMetadata(filename);
                displayStudentLyricsSection(metadata.artist, metadata.title);  // Pass extracted metadata
                statusDiv.innerHTML = `<p style="color: var(--primary-color);"><i class="fas fa-check-circle"></i> ✅ ${data.message}</p>`;
            }
            
            document.getElementById('studentAudioUrl').value = '';
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 3000);
        } else {
            clearInterval(messageIntervalId);
            let errorMsg = data.error || 'Download failed';
            
            // Check for specific errors
            if (data.error === 'Unsupported URL') {
                errorMsg = '❌ Unsupported URL!\n\nSupported platforms:\n- TikTok (tiktok.com)\n- Spotify (open.spotify.com)\n\nPlease use a valid link from these platforms.';
            } else if (data.error === 'spotdl is not installed') {
                errorMsg = '❌ spotdl is not installed!\n\nTo download from Spotify, install spotdl:\n\npip install spotdl\n\nThen restart the server.';
            } else if (data.error === 'Invalid Spotify URL') {
                errorMsg = '❌ Invalid Spotify URL!\n\nPlease use a valid Spotify track or playlist URL.\n\nExample: https://open.spotify.com/track/...';
            } else if (data.message) {
                errorMsg = '❌ ' + data.message;
            }
            
            statusDiv.innerHTML = `<p style="color: var(--accent-color);"><i class="fas fa-exclamation-circle"></i> ${errorMsg.replace(/\n/g, '<br>')}</p>`;
            console.error('Download error:', data);
        }
    } catch (error) {
        clearInterval(messageIntervalId);
        console.error('Download error:', error);
        
        let errorMsg = 'Download failed';
        if (error.name === 'AbortError') {
            errorMsg = '⏱️ Download timeout - took too long. The URL might be blocked or the server is too slow. Try another video.';
        } else {
            errorMsg = error.message || 'Make sure the server is running and the URL is valid.';
        }
        
        statusDiv.innerHTML = `<p style="color: var(--accent-color);"><i class="fas fa-exclamation-circle"></i> Error: ${errorMsg}</p>`;
    }
}

// Display student audio
function displayStudentAudio() {
    const preview = document.getElementById('studentAudioPreview');
    const input = document.getElementById('studentAudioInput');
    const player = document.getElementById('studentAudioPlayer');
    const source = document.getElementById('studentAudioSource');
    
    if (studentAudioPath) {
        console.log('📁 Setting audio source:', studentAudioPath);
        source.src = studentAudioPath;
        player.load();
        preview.style.display = 'block';
        input.style.display = 'none';
        
        // Populate selected song preview card pakai metadata yg sudah ada
        const titleEl = document.getElementById('selectedSongTitle');
        const artistEl = document.getElementById('selectedSongArtist');
        const thumbImg = document.getElementById('selectedSongThumbnail');
        const thumbFallback = document.getElementById('selectedSongThumbnailFallback');
        if (studentAudioMetadata) {
            if (titleEl) titleEl.textContent = studentAudioMetadata.title || '—';
            if (artistEl) artistEl.textContent = studentAudioMetadata.artist || '—';
        } else {
            // Fallback: pakai nama file
            const fallbackTitle = studentAudioPath.split('/').pop().replace('.mp3', '') || '—';
            if (titleEl) titleEl.textContent = fallbackTitle;
            if (artistEl) artistEl.textContent = '—';
        }
        // Thumbnail belum ada saat load profile (belum ada selectAudioFile), tampilkan fallback
        if (thumbImg) thumbImg.style.display = 'none';
        if (thumbFallback) thumbFallback.style.display = 'flex';
        
        // Handle loadedmetadata with proper timing
        function onLoadedMetadata() {
            console.log('✅ Audio loaded, duration:', player.duration);
            
            // Ensure canvas has proper dimensions
            const canvas = document.getElementById('studentAudioCanvas');
            if (canvas && canvas.offsetWidth === 0) {
                console.warn('⚠️ Canvas has 0 width, waiting for layout...');
                setTimeout(() => {
                    updateAudioDurationDisplay();
                }, 100);
            } else {
                updateAudioDurationDisplay();
            }
            
            // Load student lyrics from backend
            const user = JSON.parse(localStorage.getItem('user'));
            if (user) {
                loadStudentLyricsFromBackend(user.id);
            }
        }
        
        // Remove previous loadedmetadata listeners
        player.removeEventListener('loadedmetadata', onLoadedMetadata);
        
        // Add loadedmetadata listener
        if (player.readyState >= 1) {
            // Audio is already loaded (readyState >= 1)
            console.log('✅ Audio already loaded, duration:', player.duration);
            onLoadedMetadata();
        } else {
            // Wait for audio to load
            player.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
        }
        
        // Remove old timeupdate listeners
        player.removeEventListener('timeupdate', updatePlayhead);
        // Add new timeupdate listener
        player.addEventListener('timeupdate', updatePlayhead);
    }
}

// Update audio duration display
function updateAudioDurationDisplay() {
    const player = document.getElementById('studentAudioPlayer');
    const durationSpan = document.getElementById('studentAudioDuration');
    
    if (!player || (!player.duration) || isNaN(player.duration) || player.duration === Infinity) {
        console.warn('⚠️ Invalid player or duration:', player?.duration);
        return;
    }

    console.log('📊 Setting audio duration:', player.duration);
    
    // Update duration display if element exists
    if (durationSpan) {
        durationSpan.textContent = formatTime(player.duration);
    }
    
    const maxDuration = Math.floor(player.duration);
    
    // Draw waveform with slight delay to ensure canvas is ready
    setTimeout(() => {
        drawAudioWaveform();
    }, 50);
}

// Draw waveform on canvas (simplified)
function drawAudioWaveform() {
    const canvas = document.getElementById('studentAudioCanvas');
    if (!canvas) {
        // Canvas tidak dipakai di layout ini, skip
        return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.warn('Canvas context not available');
        return;
    }
    
    // Get actual dimensions from parent container
    const parent = canvas.parentElement;
    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;
    
    // If canvas hasn't rendered yet, use parent dimensions
    if (width === 0 || height === 0) {
        width = parent.offsetWidth || 300;
        height = parent.offsetHeight || 60;
        console.log('📐 Canvas using parent dimensions:', { width, height });
    }
    
    // Set canvas resolution (important for proper rendering)
    canvas.width = width;
    canvas.height = height;
    
    console.log('🎨 Drawing waveform:', { width, height });
    
    // Draw background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(100, 150, 200, 0.1)');
    gradient.addColorStop(1, 'rgba(100, 150, 200, 0.05)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Draw center line
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    
    // Draw simplified waveform bars
    const barCount = Math.min(150, Math.floor(width / 2));
    const barWidth = width / barCount;
    ctx.fillStyle = 'rgba(76, 175, 80, 0.4)';
    
    for (let i = 0; i < barCount; i++) {
        const barHeight = Math.random() * height * 0.6 + height * 0.2;
        const x = i * barWidth;
        const y = (height - barHeight) / 2;
        ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight);
    }
    
    console.log('✅ Waveform drawn successfully');
}

// Update playhead position
function updatePlayhead() {
    const player = document.getElementById('studentAudioPlayer');
    const playhead = document.getElementById('studentAudioPlayhead');
    const canvas = document.getElementById('studentAudioCanvas');
    
    if (!canvas || player.duration === 0) return;
    
    const currentPercent = (player.currentTime / player.duration) * 100;
    playhead.style.left = currentPercent + '%';
}

// Format time in MM:SS format
function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Load and display available audio files
async function loadAvailableAudioFiles() {
    const container = document.getElementById('studentAudioFilesContainer');
    const filesList = document.getElementById('studentAudioFilesList');
    
    try {
        const response = await fetch(`${API_URL}/api/audio/list`);
        const data = await response.json();
        
        if (data.success && data.files && data.files.length > 0) {
            filesList.style.display = 'block';
            let html = '';
            
            data.files.forEach((file, index) => {
                const uploadDate = new Date(file.uploadedAt).toLocaleDateString('id-ID', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
                
                // Escape special characters
                const escapedPath = file.path.replace(/'/g, "\\'");
                const escapedFilename = file.filename.replace(/'/g, "\\'");
                const escapedTitle = file.title.replace(/'/g, "\\'");
                const escapedArtist = file.artist.replace(/'/g, "\\'");
                
                // Build meta info dengan contributing artist jika ada
                let metaInfo = `<span>${escapedArtist}</span><span>•</span>`;
                if (file.contributingArtist) {
                    metaInfo += `<span>${file.contributingArtist}</span><span>•</span>`;
                }
                metaInfo += `<span>${formatFileSize(file.size)}</span><span>•</span><span>${uploadDate}</span>`;
                
                // Thumbnail: gunakan foto lagu jika ada, fallback ke ikon
                const thumbnailHtml = file.thumbnailUrl
                    ? `<img src="${file.thumbnailUrl}" alt="cover" class="audio-file-thumbnail" style="width:48px;height:48px;object-fit:cover;border-radius:6px;flex-shrink:0;">`
                    : `<div class="audio-file-thumbnail-placeholder" style="width:48px;height:48px;border-radius:6px;background:var(--border-color);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-music" style="color:var(--text-muted);font-size:1.2rem;"></i></div>`;

                html += `
                    <div class="audio-file-item">
                        ${thumbnailHtml}
                        <div class="audio-file-info">
                            <div class="audio-file-title">
                                <span class="audio-file-title-text">${escapedTitle}</span>
                            </div>
                            <div class="audio-file-meta">
                                ${metaInfo}
                            </div>
                        </div>
                        <button type="button" class="audio-file-btn" onclick="selectAudioFile('${escapedPath}', '${escapedFilename}')">
                            <i class="fas fa-check"></i> Select
                        </button>
                    </div>
                `;
            });
            
            container.innerHTML = html;
        } else {
            filesList.style.display = 'none';
            container.innerHTML = '';
        }
    } catch (error) {
        console.error('Error loading audio files:', error);
        filesList.style.display = 'block';
        container.innerHTML = '<p style="color: var(--accent-color); font-size: 0.9rem;"><i class="fas fa-exclamation-circle"></i> Error loading files</p>';
    }
}

// Refresh student audio files list
async function refreshStudentAudioList() {
    const container = document.getElementById('studentAudioFilesContainer');
    const refreshBtn = event.target.closest('button');
    
    // Show loading state
    container.innerHTML = '<p style="color: var(--primary-color); font-size: 0.9rem;"><i class="fas fa-spinner fa-spin"></i> Refreshing...</p>';
    
    // Add rotating animation to button
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.style.opacity = '0.6';
    }
    
    try {
        // Wait a bit to show loading state
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const response = await fetch(`${API_URL}/api/audio/list`);
        const data = await response.json();
        
        if (data.success && data.files && data.files.length > 0) {
            let html = '';
            
            data.files.forEach((file, index) => {
                const uploadDate = new Date(file.uploadedAt).toLocaleDateString('id-ID', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
                
                // Escape special characters
                const escapedPath = file.path.replace(/'/g, "\\'");
                const escapedFilename = file.filename.replace(/'/g, "\\'");
                const escapedTitle = file.title.replace(/'/g, "\\'");
                const escapedArtist = file.artist.replace(/'/g, "\\'");
                
                // Build meta info dengan contributing artist jika ada
                let metaInfo = `<span>${escapedArtist}</span><span>•</span>`;
                if (file.contributingArtist) {
                    metaInfo += `<span>${file.contributingArtist}</span><span>•</span>`;
                }
                metaInfo += `<span>${formatFileSize(file.size)}</span><span>•</span><span>${uploadDate}</span>`;
                
                // Thumbnail: gunakan foto lagu jika ada, fallback ke ikon
                const thumbnailHtml = file.thumbnailUrl
                    ? `<img src="${file.thumbnailUrl}" alt="cover" class="audio-file-thumbnail" style="width:48px;height:48px;object-fit:cover;border-radius:6px;flex-shrink:0;">`
                    : `<div class="audio-file-thumbnail-placeholder" style="width:48px;height:48px;border-radius:6px;background:var(--border-color);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-music" style="color:var(--text-muted);font-size:1.2rem;"></i></div>`;
                
                html += `
                    <div class="audio-file-item" style="animation: slideInUp 0.3s ease;">
                        ${thumbnailHtml}
                        <div class="audio-file-info">
                            <div class="audio-file-title">
                                <span class="audio-file-title-text">${escapedTitle}</span>
                            </div>
                            <div class="audio-file-meta">
                                ${metaInfo}
                            </div>
                        </div>
                        <button type="button" class="audio-file-btn" onclick="selectAudioFile('${escapedPath}', '${escapedFilename}')">
                            <i class="fas fa-check"></i> Select
                        </button>
                    </div>
                `;
            });
            
            container.innerHTML = html;
        } else {
            container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;"><i class="fas fa-inbox"></i> No audio files available</p>';
        }
    } catch (error) {
        console.error('Error refreshing audio files:', error);
        container.innerHTML = '<p style="color: var(--accent-color); font-size: 0.9rem;"><i class="fas fa-exclamation-circle"></i> Error refreshing files</p>';
    } finally {
        // Restore button state
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.style.opacity = '1';
        }
    }
}

// Select an audio file from the list
async function selectAudioFile(filePath, filename) {
    studentAudioPath = filePath;
    document.getElementById('studentAudioUrl').value = '';
    
    // Load metadata for this audio file from server
    try {
        const response = await fetch(`${API_URL}/api/audio/list`);
        const data = await response.json();
        
        if (data.success && data.files) {
            // Find matching file by filename
            const fileMetadata = data.files.find(f => f.filename === filename || f.path === filePath);
            if (fileMetadata) {
                studentAudioMetadata = {
                    artist: fileMetadata.artist || 'Unknown',
                    title: fileMetadata.title || filename.replace('.mp3', '')
                };
                console.log('✅ Loaded audio metadata:', studentAudioMetadata);
                
                // Populate selected song preview card
                const titleEl = document.getElementById('selectedSongTitle');
                const artistEl = document.getElementById('selectedSongArtist');
                const thumbImg = document.getElementById('selectedSongThumbnail');
                const thumbFallback = document.getElementById('selectedSongThumbnailFallback');
                
                if (titleEl) titleEl.textContent = studentAudioMetadata.title;
                if (artistEl) artistEl.textContent = studentAudioMetadata.artist;
                
                if (fileMetadata.thumbnailUrl && thumbImg) {
                    thumbImg.src = fileMetadata.thumbnailUrl;
                    thumbImg.style.display = 'block';
                    if (thumbFallback) thumbFallback.style.display = 'none';
                } else {
                    if (thumbImg) thumbImg.style.display = 'none';
                    if (thumbFallback) thumbFallback.style.display = 'flex';
                }
            }
        }
    } catch (error) {
        console.warn('Could not load audio metadata:', error);
        studentAudioMetadata = null;
    }
    
    displayStudentAudio();
    displayStudentLyricsSection();
    popup.success(`Kamu pilih: ${filename}`);
}

// Format file size in human readable format
// ===== SONG PREVIEW PLAYER =====

function toggleSongPreview() {
    const player  = document.getElementById('studentAudioPlayer');
    const btnIcon = document.getElementById('songPreviewBtnIcon');
    const playIcon = document.getElementById('songPlayIcon');
    const overlay = document.getElementById('songPlayOverlay');
    if (!player) return;

    if (player.paused) {
        player.play();
        if (btnIcon) { btnIcon.className = 'fas fa-pause'; }
        if (playIcon) { playIcon.className = 'fas fa-pause'; }
        if (overlay) overlay.style.opacity = '1';
        startSongProgressUpdate();
    } else {
        player.pause();
        if (btnIcon) { btnIcon.className = 'fas fa-play'; }
        if (playIcon) { playIcon.className = 'fas fa-play'; }
        if (overlay) overlay.style.opacity = '0';
    }
}

let _songProgressInterval = null;
function startSongProgressUpdate() {
    if (_songProgressInterval) clearInterval(_songProgressInterval);
    const player   = document.getElementById('studentAudioPlayer');
    const fill     = document.getElementById('songProgressFill');
    const timeEl   = document.getElementById('songProgressTime');
    const bar      = document.getElementById('songProgressBar');
    const barTime  = document.getElementById('songProgressTime');
    if (bar) bar.style.display = 'block';
    if (barTime) barTime.style.display = 'block';

    _songProgressInterval = setInterval(() => {
        if (!player || player.paused || player.ended) {
            clearInterval(_songProgressInterval);
            const btnIcon  = document.getElementById('songPreviewBtnIcon');
            const playIcon = document.getElementById('songPlayIcon');
            const overlay  = document.getElementById('songPlayOverlay');
            if (btnIcon)  btnIcon.className  = 'fas fa-play';
            if (playIcon) playIcon.className = 'fas fa-play';
            if (overlay)  overlay.style.opacity = '0';
            return;
        }
        const pct = player.duration ? (player.currentTime / player.duration) * 100 : 0;
        if (fill)   fill.style.width = pct + '%';
        if (timeEl) timeEl.textContent = `${formatTime(player.currentTime)} / ${formatTime(player.duration)}`;
    }, 300);
}

// Show play overlay on thumbnail hover
document.addEventListener('DOMContentLoaded', () => {
    const wrap = document.getElementById('selectedSongThumbnailWrap');
    const overlay = document.getElementById('songPlayOverlay');
    if (wrap && overlay) {
        wrap.addEventListener('mouseenter', () => {
            const player = document.getElementById('studentAudioPlayer');
            if (player && player.paused) overlay.style.opacity = '1';
        });
        wrap.addEventListener('mouseleave', () => {
            const player = document.getElementById('studentAudioPlayer');
            if (player && player.paused) overlay.style.opacity = '0';
        });
    }
});

// ===== END SONG PREVIEW PLAYER =====

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Check if audio file exists on server
async function checkAudioFileExists(filePath) {
    try {
        const response = await fetch(filePath, { method: 'HEAD' });
        return response.ok;
    } catch (error) {
        console.error('Error checking file:', filePath, error);
        return false;
    }
}

// Remove student audio
function removeStudentAudio() {
    // Delete audio file from server
    if (studentAudioPath) {
        deleteStudentAudioFile(studentAudioPath);
    }
    
    studentAudioPath = null;
    studentAudioMetadata = null;  // Clear metadata as well
    
    // Hide audio preview
    const preview = document.getElementById('studentAudioPreview');
    if (preview) preview.style.display = 'none';
    
    // Show audio input options
    const input = document.getElementById('studentAudioInput');
    if (input) input.style.display = 'block';
    
    // Clear inputs
    const audioFile = document.getElementById('studentAudioFile');
    if (audioFile) audioFile.value = '';
    
    const filePreview = document.getElementById('studentAudioFilePreview');
    if (filePreview) filePreview.style.display = 'none';
    
    const audioUrl = document.getElementById('studentAudioUrl');
    if (audioUrl) audioUrl.value = '';
    
    // Reset tabs to default (Upload tab active)
    const profile = document.getElementById('studentProfile');
    if (profile) {
        const tabBtns = profile.querySelectorAll('.audio-tab-btn');
        const tabContents = profile.querySelectorAll('.audio-tab-content');
        
        // Clear all active states
        tabBtns.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => {
            content.classList.remove('active');
            content.style.display = 'none';
        });
        
        // Set first tab (Upload) as active
        if (tabBtns[0]) {
            tabBtns[0].classList.add('active');
            console.log('✅ Upload tab reset as default');
        }
        if (tabContents[0]) {
            tabContents[0].classList.add('active');
            tabContents[0].style.display = 'block';
        }
    }
    
    console.log('✅ Audio removed, input options displayed');
}

// Delete audio file from server
async function deleteStudentAudioFile(audioPath) {
    // NOTE: We don't actually delete files from server, just remove from profile
    // Files are reused and managed centrally
    if (!audioPath) return;
    
    try {
        console.log('Removing audio from profile (file preserved on server):', audioPath);
        // Just log for audit, actual deletion not performed
    } catch (error) {
        console.error('Error in audio removal:', error);
    }
}

// ========== LYRICS PROCESSING FUNCTIONS ==========

/**
 * Show loading dialog with progress
 */
function showLyricsProcessingDialog() {
    return new Promise((resolve) => {
        const isMobile = window.innerWidth <= 768;
        
        const modal = document.createElement('div');
        modal.id = 'lyricsProcessingModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: var(--bg-color);
            border-radius: 0.8rem;
            padding: 2rem;
            max-width: 400px;
            width: 90%;
            text-align: center;
            color: var(--text-color);
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        `;
        
        content.innerHTML = `
            <div style="margin-bottom: 1.5rem;">
                <div class="lyrics-karaoke-spinner" style="margin: 0 auto 1rem;"></div>
                <h3 style="margin: 0 0 0.5rem 0; color: var(--primary-color);">Processing Your Audio</h3>
                <p style="margin: 0; font-size: 0.9rem; color: var(--text-muted);">Converting speech to lyrics...</p>
            </div>
            
            <div style="background: var(--light-bg); border-radius: 0.5rem; padding: 1rem; margin-bottom: 1rem;">
                <div style="height: 8px; background: var(--border-color); border-radius: 4px; overflow: hidden; margin-bottom: 0.5rem;">
                    <div id="progressBar" style="height: 100%; background: var(--primary-color); width: 0%; transition: width 0.3s ease;"></div>
                </div>
                <p id="progressText" style="margin: 0; font-size: 0.85rem; font-weight: 500;">0%</p>
            </div>
            
            <p id="statusText" style="margin: 0; font-size: 0.85rem; color: var(--text-muted); min-height: 2.5rem; display: flex; align-items: center; justify-content: center;">Saving profile...</p>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        resolve({
            modal,
            content,
            progressBar: content.querySelector('#progressBar'),
            progressText: content.querySelector('#progressText'),
            statusText: content.querySelector('#statusText')
        });
    });
}

/**
 * Update loading dialog progress
 */
function updateLoadingDialog(dialog, message, progress) {
    if (dialog && dialog.progressBar) {
        dialog.progressBar.style.width = progress + '%';
        dialog.progressText.textContent = progress + '%';
    }
    if (dialog && dialog.statusText) {
        dialog.statusText.textContent = message;
    }
}

/**
 * Close loading dialog
 */
function closeLoadingDialog(dialog) {
    if (dialog && dialog.modal) {
        dialog.modal.remove();
    }
}


/**
 * Extract song metadata dari filename
 * Format: "Artist - Song Title.mp3" atau "Song Title.mp3"
 */
function extractSongMetadata(filename) {
    // Remove extension
    let name = filename.replace(/\.[^/.]+$/, '').trim();
    
    // Remove YouTube/TikTok video IDs in brackets (e.g., [xDuckgE8WeY])
    name = name.replace(/\s*\[[a-zA-Z0-9_-]{11}\]\s*/g, ' ').trim();
    
    // Try to split by " - " untuk artist - title format
    const parts = name.split(' - ');
    
    if (parts.length === 2) {
        return {
            artist: parts[0].trim(),
            title: parts[1].trim()
        };
    }
    
    // Fallback: gunakan filename sebagai title
    return {
        artist: '',
        title: name
    };
}

/**
 * Search lyrics online
 */
async function searchLyricsOnline(title, artist = '') {
    try {
        const response = await fetch(`${API_URL}/api/lyrics/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title,
                artist
            })
        });
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Lyrics search error:', error);
        return null;
    }
}

/**
 * Save lyrics ke profile
 */
async function saveLyricsToProfile(studentId, lyricsData) {
    try {
        const transcriptionData = {
            text: lyricsData.lyrics || lyricsData.text,
            segments: lyricsData.segments || [],
            language: lyricsData.language || 'en',
            studentId: studentId,
            source: lyricsData.source || 'unknown',
            processedAt: new Date().toISOString()
        };
        
        // Save ke profile_lyrics folder via fetch (server-side save)
        const response = await fetch(`${API_URL}/api/lyrics/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                studentId,
                transcription: transcriptionData
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('💾 Lyrics saved:', result.path);
            return result.path;
        }
        
        throw new Error('Failed to save lyrics');
    } catch (error) {
        console.error('Error saving lyrics:', error);
        throw error;
    }
}

// ========== LYRICS KARAOKE FUNCTIONS ==========

/**
 * Setup Lyrics Karaoke
 */
function setupLyricsKaraoke() {
    try {
        const container = document.getElementById('studentLyricsKaraokeContainer');
        const player = document.getElementById('studentAudioPlayer');
        
        if (container && player) {
            // Initialize LyricsKaraoke
            lyricsKaraoke = new LyricsKaraoke('#studentLyricsKaraokeContainer', '#studentAudioPlayer');
            console.log('✅ Lyrics Karaoke initialized');
            
            // Load lyrics for current student
            const user = JSON.parse(localStorage.getItem('user'));
            if (user) {
                loadStudentLyricsFromBackend(user.id);
            }
        }
    } catch (error) {
        console.error('Error initializing Lyrics Karaoke:', error);
    }
}

/**
 * Load student lyrics dari backend dengan Gemini API support
 */
async function loadStudentLyricsFromBackend(studentId) {
    try {
        console.log('🎵 Loading lyrics for student (profile):', studentId);
        
        // Gunakan studentLyricsKaraokeContainer (profile)
        const actualContainer = document.getElementById('studentLyricsKaraokeContainer');
        
        if (!actualContainer) {
            // Container belum ada di DOM saat ini, skip
            return;
        }

        console.log('📍 Found lyrics container');

        // Show loading state
        actualContainer.innerHTML = `
            <div class="lyrics-loading">
                <div class="lyrics-loading-spinner"></div>
                <span>Loading synchronized lyrics...</span>
            </div>
        `;

        // First try: Load from saved lyrics file (backend cache)
        const cachedUrl = `${API_URL}/api/transcribe/lyrics/${studentId}`;
        console.log('📡 Checking for cached lyrics:', cachedUrl);
        
        try {
            const cachedResponse = await fetch(cachedUrl);
            
            if (cachedResponse.ok) {
                const cachedData = await cachedResponse.json();
                
                if (cachedData.success && cachedData.transcription && cachedData.transcription.segments) {
                    console.log('✅ Found cached lyrics with', cachedData.transcription.segments.length, 'segments');
                    
                    displayProfileLyricsSegments(cachedData.transcription.segments, actualContainer);
                    syncProfileLyricsWithAudio();
                    return;
                }
            }
        } catch (cachedError) {
            console.warn('⚠️ Could not load cached lyrics:', cachedError.message);
        }

        // Search online using Gemini API (with automatic fallback to web scraper)
        console.log('📌 Searching online for synchronized lyrics...');
        
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.id) {
            console.warn('User not found');
            actualContainer.innerHTML = `
                <div style="text-align: center; padding: 1rem;">
                    <i class="fas fa-exclamation-circle" style="font-size: 2rem; opacity: 0.5; display: block; margin-bottom: 0.5rem;"></i>
                    <p style="margin: 0; font-size: 0.9rem;">User information not available</p>
                </div>
            `;
            return;
        }

        // Get student data untuk extract song title
        const response = await fetch(`${API_URL}/api/students/${user.id}`);
        if (!response.ok) {
            throw new Error('Failed to fetch student data');
        }

        const student = await response.json();
        const artistName = student.name || 'Unknown Artist';
        
        // Try to get song title dari profile_music file
        let songTitle = null;
        if (student.audioFile) {
            const match = student.audioFile.match(/profile_music\/(.+?)(?:\.|$)/);
            if (match) {
                songTitle = match[1].replace(/_/g, ' ').trim();
            }
        }

        if (!songTitle) {
            console.log('⚠️ Could not determine song title');
            actualContainer.innerHTML = `
                <div style="text-align: center; padding: 1rem;">
                    <i class="fas fa-music" style="font-size: 2rem; opacity: 0.5; display: block; margin-bottom: 0.5rem;"></i>
                    <p style="margin: 0; font-size: 0.9rem;">Please upload audio file first to search for lyrics</p>
                </div>
            `;
            return;
        }

        console.log(`🔍 Searching for: "${songTitle}" by "${artistName}"`);

        // Call search endpoint yang sudah support Gemini API
        const searchResponse = await fetch(`${API_URL}/api/lyrics/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: songTitle,
                artist: artistName
            })
        });

        if (!searchResponse.ok) {
            throw new Error(`Search failed with status ${searchResponse.status}`);
        }

        const searchData = await searchResponse.json();
        console.log('📦 Received data:', searchData);

        if (searchData.success && searchData.segments && searchData.segments.length > 0) {
            console.log(`✅ Found ${searchData.segments.length} ${searchData.source} segments`);
            
            // Display lyrics using LyricsKaraoke if available
            if (lyricsKaraoke && searchData.source === 'gemini-api') {
                console.log('Using LyricsKaraoke instance for synced lyrics');
                lyricsKaraoke.loadLyrics({
                    text: searchData.lyrics,
                    segments: searchData.segments,
                    language: 'en'
                }, {
                    autoScroll: true,
                    highlight: true
                });
            } else {
                // Fallback: display manually
                console.log('Using manual display');
                displayProfileLyricsSegments(searchData.segments, actualContainer);
                syncProfileLyricsWithAudio();
            }
            
            console.log('✅ Lyrics displayed successfully');
        } else {
            console.log('⚠️ No lyrics found:', searchData.message);
            actualContainer.innerHTML = `
                <div style="text-align: center; padding: 1rem;">
                    <i class="fas fa-music" style="font-size: 2rem; opacity: 0.5; display: block; margin-bottom: 0.5rem;"></i>
                    <p style="margin: 0; font-size: 0.9rem;">${searchData.message || 'No lyrics available for this song'}</p>
                </div>
            `;
        }

    } catch (error) {
        console.error('❌ Error loading lyrics:', error);
        const container = document.getElementById('studentLyricsKaraokeContainer');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 1rem; color: var(--accent-color);">
                    <i class="fas fa-exclamation-circle" style="font-size: 2rem; display: block; margin-bottom: 0.5rem;"></i>
                    <p style="margin: 0; font-size: 0.9rem;">Error loading lyrics: ${error.message}</p>
                </div>
            `;
        }
    }
}

/**
 * Display lyrics segments for profile
 */
function displayProfileLyricsSegments(segments, container) {
    console.log('🎵 Displaying', segments.length, 'lyrics segments for profile');
    
    const html = segments.map((seg, idx) => `
        <div class="lyric-line" data-index="${idx}" data-start="${seg.start || 0}" data-end="${seg.end || 0}">
            ${(seg.text || '').trim()}
        </div>
    `).join('');

    container.innerHTML = html;
    console.log('✅ Lyrics HTML rendered');

    // Add click handlers to sync to timestamp
    container.querySelectorAll('.lyric-line').forEach(line => {
        line.addEventListener('click', () => {
            const audioElement = document.getElementById('studentAudioPlayer');
            if (audioElement) {
                const startTime = parseFloat(line.dataset.start);
                audioElement.currentTime = startTime;
            }
        });
    });
}

/**
 * Sync profile lyrics dengan audio playback
 */
function syncProfileLyricsWithAudio() {
    const audioElement = document.getElementById('studentAudioPlayer');
    if (!audioElement) {
        console.warn('Audio element not found for sync');
        return;
    }

    console.log('🔄 Setting up lyrics sync');

    // Remove previous listener if exists
    if (audioElement.profileLyricsTimeUpdateListener) {
        audioElement.removeEventListener('timeupdate', audioElement.profileLyricsTimeUpdateListener);
    }

    const timeUpdateListener = () => {
        const currentTime = audioElement.currentTime;
        const container = document.getElementById('studentLyricsKaraokeContainer');
        
        if (!container) return;

        const lines = container.querySelectorAll('.lyric-line');

        lines.forEach((line, idx) => {
            const start = parseFloat(line.dataset.start);
            const end = parseFloat(line.dataset.end);
            const next = lines[idx + 1];
            const nextStart = next ? parseFloat(next.dataset.start) : end;
            const actualEnd = nextStart > 0 ? nextStart : (end || audioElement.duration);

            if (currentTime >= start && currentTime < actualEnd) {
                line.classList.add('active');
                line.classList.remove('past');
                // Auto-scroll to active line
                line.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else if (currentTime >= actualEnd) {
                line.classList.remove('active');
                line.classList.add('past');
            } else {
                line.classList.remove('active', 'past');
            }
        });
    };

    audioElement.profileLyricsTimeUpdateListener = timeUpdateListener;
    audioElement.addEventListener('timeupdate', timeUpdateListener);
}

/**
 * Transcribe audio dan generate lirik menggunakan Whisper
 */
async function transcribeStudentAudio() {
    const player = document.getElementById('studentAudioPlayer');
    const btn = event.target;
    
    if (!studentAudioPath) {
        popup.error('Pilih lagu dulu');
        return;
    }

    if (!player.src) {
        popup.error('Lagu nya gak ada');
        return;
    }

    // Disable button
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';

    try {
        // Show loading state
        const container = document.getElementById('studentLyricsKaraokeContainer');
        container.innerHTML = `
            <div class="lyrics-karaoke-loading">
                <div class="lyrics-karaoke-spinner"></div>
                <span>Transcribing audio... This may take a moment</span>
            </div>
        `;

        // Get current student ID
        const user = JSON.parse(localStorage.getItem('user'));
        const studentId = user.id;

        // Check if transcription already exists
        let transcription = await whisperTranscriber.loadTranscription(studentId);
        
        if (!transcription) {
            // Create a blob from audio element and transcribe
            const response = await fetch(player.src);
            const blob = await response.blob();
            
            // Rename blob ke File object
            const audioFile = new File([blob], `${studentId}_audio.mp3`, { type: blob.type });

            // Transcribe
            transcription = await whisperTranscriber.transcribeAudio(audioFile, 'id', (progress) => {
                console.log(`📊 Transcription progress:`, progress);
                
                container.innerHTML = `
                    <div class="lyrics-karaoke-loading">
                        <div class="lyrics-karaoke-spinner"></div>
                        <span>${progress.message}</span>
                    </div>
                `;
            });

            // Save transcription
            await whisperTranscriber.saveTranscription(studentId, transcription);
            console.log('💾 Transcription saved');
        }

        // Store transcription
        currentTranscription = transcription;

        // Display lirik dengan karaoke
        if (lyricsKaraoke && transcription.segments.length > 0) {
            lyricsKaraoke.loadLyrics(transcription, {
                autoScroll: true,
                highlight: true
            });
            console.log('🎵 Lyrics loaded and synced');
        } else {
            container.innerHTML = `
                <div class="lyrics-karaoke-empty">
                    <div class="lyrics-karaoke-empty-icon">
                        <i class="fas fa-exclamation-circle"></i>
                    </div>
                    <p>No lyrics could be extracted from the audio</p>
                </div>
            `;
        }

        popup.success('Selesai! Lirik sudah digenerate.');

    } catch (error) {
        console.error('Transcription error:', error);
        
        const container = document.getElementById('studentLyricsKaraokeContainer');
        container.innerHTML = `
            <div class="lyrics-karaoke-empty">
                <div class="lyrics-karaoke-empty-icon">
                    <i class="fas fa-exclamation-circle"></i>
                </div>
                <p>Transcription failed: ${error.message}</p>
                <p style="font-size: 0.8rem; margin-top: 0.5rem; opacity: 0.7;">Make sure Whisper CLI is installed on the server</p>
            </div>
        `;
        
        popup.error('Gagal: ' + error.message);

    } finally {
        // Re-enable button
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Generate Lyrics';
    }
}

/**
 * Export lirik ke berbagai format
 */
function exportLyricsFormat(format = 'lrc') {
    if (!currentTranscription) {
        popup.warning('Gak ada lirik untuk diexport');
        return;
    }

    let content = '';
    let filename = `lyrics_${Date.now()}`;
    let mimeType = 'text/plain';

    switch (format) {
        case 'lrc':
            content = whisperTranscriber.formatToLRC(currentTranscription);
            filename += '.lrc';
            break;
        case 'srt':
            content = whisperTranscriber.formatToSRT(currentTranscription);
            filename += '.srt';
            break;
        case 'json':
            content = JSON.stringify(currentTranscription, null, 2);
            filename += '.json';
            mimeType = 'application/json';
            break;
        default:
            content = currentTranscription.text;
            filename += '.txt';
    }

    // Download file
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    popup.success(`Exported menjadi ${format.toUpperCase()}`);
}

// ========== ADMIN FUNCTIONS ==========

async function setupAdminProfile() {
    // Admin profile now redirects to dashboard
    // No setup needed as dashboard is handled separately
    console.log('✅ Admin profile setup complete - dashboard redirect is active');
    
    // Optional: Auto-redirect after a short delay
    setTimeout(() => {
        const dashboardLink = document.querySelector('#adminProfile a[href="admin-dashboard"]');
        if (dashboardLink) {
            console.log('💡 Tip: Click the dashboard button or navigate to admin-dashboard');
        }
    }, 1000);
}

async function loadAllStudents() {
    // This function is no longer needed as admin interface moved to separate dashboard
    // Kept for compatibility but doesn't do anything
    console.log('✓ loadAllStudents - admin interface moved to dashboard');
    try {
        const response = await fetch(`${API_URL}/api/students`);
        if (response.ok) {
            const students = await response.json();
            return students;
        }
    } catch (error) {
        console.error('Error loading students:', error);
    }
    return [];
}

function displayAdminStudentsList(students) {
    const container = document.getElementById('adminStudentsList');
    
    let html = `
        <table style="width: 100%; border-collapse: collapse;">
            <thead style="background: var(--primary-color); color: white; position: sticky; top: 0;">
                <tr>
                    <th style="padding: 1rem; text-align: left; border-bottom: 2px solid var(--primary-color);">Name</th>
                    <th style="padding: 1rem; text-align: left; border-bottom: 2px solid var(--primary-color);">Birthday</th>
                    <th style="padding: 1rem; text-align: center; border-bottom: 2px solid var(--primary-color);">Status</th>
                    <th style="padding: 1rem; text-align: center; border-bottom: 2px solid var(--primary-color);">Action</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    students.forEach(student => {
        const hasProfile = student.message ? '✓ Complete' : '○ Incomplete';
        const statusColor = student.message ? 'var(--success-color)' : '#ff9800';
        const lastUpdate = student.updatedAt ? new Date(student.updatedAt).toLocaleDateString('id-ID') : '--';
        
        html += `
            <tr style="border-bottom: 1px solid var(--border-color); hover: background: var(--light-bg);">
                <td style="padding: 1rem;">
                    <strong>${student.name || student.id}</strong><br>
                    <small style="color: var(--text-muted);">${student.id}</small>
                </td>
                <td style="padding: 1rem;">
                    ${student.birthday || '--'}
                </td>
                <td style="padding: 1rem; text-align: center;">
                    <span style="color: ${statusColor};">${hasProfile}</span><br>
                    <small style="color: var(--text-muted);">${lastUpdate}</small>
                </td>
                <td style="padding: 1rem; text-align: center;">
                    <button type="button" class="btn-small" onclick="selectAndEditStudent('${student.id}')" 
                            style="background: var(--primary-color); color: white; border: none; padding: 0.5rem 1rem; border-radius: 5px; cursor: pointer;">
                        Edit
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

async function loadAdminStudentProfile() {
    const studentId = document.getElementById('adminStudentSelect').value;
    
    if (!studentId) {
        popup.warning('Pilih murid nya dulu');
        return;
    }
    
    await selectAndEditStudent(studentId);
}

// Store for admin audio file path
let adminAudioPath = null;

async function selectAndEditStudent(studentId) {
    try {
        const response = await fetch(`${API_URL}/api/students/${studentId}`);
        const student = await response.json();
        
        // Populate form fields
        document.getElementById('adminEditStudentName').textContent = student.name || 'Unknown';
        document.getElementById('adminFullName').value = student.name || '';
        document.getElementById('adminBirthday').value = student.birthday || '';
        document.getElementById('adminMessage').value = student.message || '';
        document.getElementById('adminStudentLyricsTextarea').value = student.studentLyrics || '';

        // Load saved social media links into the admin edit form.
        populateSocialMediaForm(student.socialMedia, 'admin');
        
        // Set photo
        if (student.photo) {
            document.getElementById('adminPhotoPreview').src = student.photo;
        } else {
            document.getElementById('adminPhotoPreview').src = 'https://via.placeholder.com/300x300?text=Upload+Photo';
        }
        
        // Load audio if exists
        if (student.audioFile) {
            adminAudioPath = student.audioFile;
            displayAdminAudio();
            

        } else {
            adminAudioPath = null;
            removeAdminAudio();
        }
        
        // Store current student ID for submission
        window.currentAdminEditingStudentId = studentId;
        
        // Show edit form
        document.getElementById('adminEditForm').style.display = 'block';
        
        // Setup audio download functionality
        setupAdminAudioDownload();
        
        // Scroll to form
        document.getElementById('adminEditForm').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error loading student:', error);
        popup.error('Failed to load student profile');
    }
}

function closeAdminEditForm() {
    document.getElementById('adminEditForm').style.display = 'none';
    document.getElementById('adminStudentSelect').value = '';
    window.currentAdminEditingStudentId = null;
}

async function submitAdminStudentEdit(e) {
    e.preventDefault();
    
    const studentId = window.currentAdminEditingStudentId;
    
    if (!studentId) {
        popup.error('Murid nya belom dipilih');
        return;
    }
    
    const adminPhotoPreview = document.getElementById('adminPhotoPreview');
    
    const formData = {
        id: studentId,
        name: document.getElementById('adminFullName').value,
        birthday: document.getElementById('adminBirthday').value,
        message: document.getElementById('adminMessage').value,
        studentLyrics: document.getElementById('adminStudentLyricsTextarea')?.value || null,
        photo: adminPhotoPreview.src.startsWith('data:') ? adminPhotoPreview.src : null,
        audioFile: adminAudioPath || null,
        audioTrimStart: parseFloat(document.getElementById('adminAudioTrimStart').value) || 0,
        audioTrimEnd: parseFloat(document.getElementById('adminAudioTrimEnd').value) || null,
        // Social media links collected from the admin edit form's inputs
        // (prefix adminSocial*). Same shape as student form — the server
        // stores them under student.socialMedia.
        socialMedia: collectSocialMediaFromForm('admin')
    };
    
    try {
        const response = await fetch(`${API_URL}/api/students/${studentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            popup.success('Student profile updated successfully!', () => {
                closeAdminEditForm();
                loadAllStudents();
            });
        } else {
            popup.error('Failed to update student profile');
        }
    } catch (error) {
        console.error('Error updating student:', error);
        popup.error('Failed to update student profile');
    }
}

// ========== ADMIN AUDIO HANDLERS ==========

// Setup admin audio file upload listener
document.addEventListener('DOMContentLoaded', () => {
    const adminAudioFile = document.getElementById('adminAudioFile');
    if (adminAudioFile) {
        adminAudioFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                uploadAdminAudio(file);
            }
        });
    }
});

// Upload admin audio
async function uploadAdminAudio(file) {
    // Delete old audio file first if exists
    if (adminAudioPath) {
        await deleteAdminAudioFile(adminAudioPath);
    }
    
    const formData = new FormData();
    formData.append('audioFile', file);
    
    try {
        const response = await fetch(`${API_URL}/api/audio/upload`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            adminAudioPath = data.path;
            document.getElementById('adminAudioFileName').textContent = file.name;
            document.getElementById('adminAudioFilePreview').style.display = 'block';
            displayAdminAudio();
            popup.success('Berhasil upload audio!');
        } else {
            popup.error('Upload Gagal: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Upload error:', error);
        popup.error('Upload Gagal: ' + error.message);
    }
}

// Display admin audio
function displayAdminAudio() {
    const preview = document.getElementById('adminAudioPreview');
    const input = document.getElementById('adminAudioInput');
    const player = document.getElementById('adminAudioPlayer');
    const source = document.getElementById('adminAudioSource');
    
    if (adminAudioPath) {
        source.src = adminAudioPath;
        player.load();
        preview.style.display = 'block';
        input.style.display = 'none';
        
        // Load trim settings and duration
        player.addEventListener('loadedmetadata', function onLoadedMetadata() {
            updateAdminAudioDurationDisplay();
            syncAdminTrimSliders();
            
            // Remove listener after first call
            player.removeEventListener('loadedmetadata', onLoadedMetadata);
        });
        
        // Update trim info when user changes inputs
        
        // Update playhead position
        player.addEventListener('timeupdate', updateAdminPlayhead);
    }
}

// Update admin audio duration display
function updateAdminAudioDurationDisplay() {
    const player = document.getElementById('adminAudioPlayer');
    const durationSpan = document.getElementById('adminAudioDuration');
    
    if (player.duration && !isNaN(player.duration)) {
        durationSpan.textContent = formatTime(player.duration);
        
        // Set slider max value
        
        // Set end time default to full duration if not set
        if (!endInput.value || endInput.value === '0') {
            endInput.value = Math.floor(player.duration);
            endInputNum.value = Math.floor(player.duration);
        }
        
        // Draw waveform
        drawAdminAudioWaveform();
    }
}


// Draw admin audio waveform on canvas
function drawAdminAudioWaveform() {
    const canvas = document.getElementById('adminAudioCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    
    canvas.width = width;
    canvas.height = height;
    
    // Draw background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(100, 150, 200, 0.1)');
    gradient.addColorStop(1, 'rgba(100, 150, 200, 0.05)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Draw center line
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.2)';
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    
    // Draw simplified waveform bars
    const barCount = 100;
    const barWidth = width / barCount;
    ctx.fillStyle = 'rgba(76, 175, 80, 0.4)';
    
    for (let i = 0; i < barCount; i++) {
        const barHeight = Math.random() * height * 0.6 + height * 0.2;
        ctx.fillRect(i * barWidth, (height - barHeight) / 2, barWidth - 1, barHeight);
    }
}

// Update admin playhead position
function updateAdminPlayhead() {
    const player = document.getElementById('adminAudioPlayer');
    const playhead = document.getElementById('adminAudioPlayhead');
    const canvas = document.getElementById('adminAudioCanvas');
    
    if (!canvas || player.duration === 0) return;
    
    const currentPercent = (player.currentTime / player.duration) * 100;
    playhead.style.left = currentPercent + '%';
}


// Remove admin audio
function removeAdminAudio() {
    adminAudioPath = null;
    document.getElementById('adminAudioPreview').style.display = 'none';
    document.getElementById('adminAudioInput').style.display = 'block';
    document.getElementById('adminAudioFile').value = '';
    document.getElementById('adminAudioFilePreview').style.display = 'none';
}

// Delete admin audio file
async function deleteAdminAudioFile(path) {
    try {
        const response = await fetch(`${API_URL}/api/audio/delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path })
        });
        
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('Error deleting audio:', error);
        return false;
    }
}

// ========== ADMIN MEMORIES MANAGEMENT ==========

// Store memories in admin profile setup
function setupAdminMemoriesManagement() {
    const addMemoryForm = document.getElementById('addMemoryForm');
    const memoryFile = document.getElementById('memoryFile');
    
    if (addMemoryForm) {
        addMemoryForm.addEventListener('submit', submitAddMemory);
    }
    
    if (memoryFile) {
        memoryFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                document.getElementById('memoryFileName').textContent = file.name;
                document.getElementById('memoryFilePreview').style.display = 'block';
            }
        });
    }
    
    // Load and display memories
    loadMemoriesList();
}

async function submitAddMemory(e) {
    e.preventDefault();
    
    const title = document.getElementById('memoryTitle').value;
    const description = document.getElementById('memoryDescription').value;
    const fileInput = document.getElementById('memoryFile');
    const size = document.getElementById('memorySize').value;
    const file = fileInput.files[0];
    
    if (!file) {
        popup.error('Pilih File nya dulu');
        return;
    }
    
    try {
        // Upload file
        const formData = new FormData();
        formData.append('file', file);
        
        const uploadResponse = await fetch(`${API_URL}/api/gallery/upload`, {
            method: 'POST',
            body: formData
        });
        
        const uploadData = await uploadResponse.json();
        
        if (uploadData.success) {
            const filePath = uploadData.path;
            
            // Add memory to database
            const memoryData = {
                title: title,
                description: description,
                filePath: filePath,
                fileType: file.type.startsWith('image/') ? 'image' : 'video',
                size: size,
                uploadedAt: new Date().toISOString()
            };
            
            const saveResponse = await fetch(`${API_URL}/api/gallery/memory`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(memoryData)
            });
            
            const saveData = await saveResponse.json();
            
            if (saveData.success) {
                popup.success('Memory added successfully!');
                
                // Reset form
                e.target.reset();
                document.getElementById('memoryFilePreview').style.display = 'none';
                
                // Reload memories list
                await loadMemoriesList();
            } else {
                popup.error('Gagal buat nyimpen ini');
            }
        } else {
            popup.error('Upload Gagal: ' + (uploadData.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error adding memory:', error);
        popup.error('Failed to add memory');
    }
}

// Gallery tab switching
function switchGalleryTab(tab) {
    console.log(`📂 Switching to ${tab} tab`);
    
    const tabImages = document.getElementById('tabImages');
    const tabVideos = document.getElementById('tabVideos');
    const imagesTab = document.getElementById('imagesTab');
    const videosTab = document.getElementById('videosTab');
    
    if (tab === 'images') {
        // Show images tab
        imagesTab.style.display = 'block';
        videosTab.style.display = 'none';
        
        // Update tab styles
        tabImages.style.color = 'var(--text-primary)';
        tabImages.style.borderBottomColor = 'var(--primary-color)';
        tabVideos.style.color = 'var(--text-secondary)';
        tabVideos.style.borderBottomColor = 'transparent';
    } else {
        // Show videos tab
        imagesTab.style.display = 'none';
        videosTab.style.display = 'block';
        
        // Update tab styles
        tabImages.style.color = 'var(--text-secondary)';
        tabImages.style.borderBottomColor = 'transparent';
        tabVideos.style.color = 'var(--text-primary)';
        tabVideos.style.borderBottomColor = 'var(--primary-color)';
    }
}

async function loadMemoriesList() {
    try {
        console.log('🖼️ Loading gallery media...');
        
        // Load both images and videos from OurGallery
        const [imagesResponse, videosResponse] = await Promise.all([
            fetch(`${API_URL}/api/gallery/images`),
            fetch(`${API_URL}/api/gallery/videos`)
        ]);
        
        const imagesData = await imagesResponse.json();
        const videosData = await videosResponse.json();
        
        // Load images
        loadGalleryImages(imagesData);
        
        // Load videos
        loadGalleryVideos(videosData);
        
    } catch (error) {
        console.error('Error loading gallery:', error);
        const imagesListContainer = document.getElementById('memoriesListImages');
        const videosListContainer = document.getElementById('memoriesListVideos');
        
        if (imagesListContainer) {
            imagesListContainer.innerHTML = `
                <p style="grid-column: 1/-1; color: var(--accent-color); text-align: center; padding: 2rem;">
                    <i class="fas fa-exclamation-circle"></i> Error loading images
                </p>
            `;
        }
        if (videosListContainer) {
            videosListContainer.innerHTML = `
                <p style="grid-column: 1/-1; color: var(--accent-color); text-align: center; padding: 2rem;">
                    <i class="fas fa-exclamation-circle"></i> Error loading videos
                </p>
            `;
        }
    }
}

// Intersection Observer for lazy loading gallery images
let galleryImageObserver = null;

function initGalleryImageLazyLoading() {
    if (!galleryImageObserver) {
        galleryImageObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const src = img.dataset.src;
                    
                    if (src) {
                        img.src = src;
                        img.removeAttribute('data-src');
                        
                        img.addEventListener('load', () => {
                            img.classList.remove('loading');
                            img.classList.add('loaded');
                        }, { once: true });
                    }
                    
                    galleryImageObserver.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px'
        });
    }
    
    // Observe all gallery images
    document.querySelectorAll('.gallery-item img[data-src]').forEach(img => {
        galleryImageObserver.observe(img);
    });
}

function loadGalleryImages(imagesData) {
    const memoriesListImages = document.getElementById('memoriesListImages');
    
    if (!memoriesListImages) return;
    
    if (imagesData.success && imagesData.images && imagesData.images.length > 0) {
        let html = '';
        
        imagesData.images.forEach((image) => {
            const uploadDate = new Date(image.uploadedAt).toLocaleDateString('id-ID');
            const sizeInMB = (image.size / (1024 * 1024)).toFixed(2);
            const cleanName = image.name || image.filename;
            
            html += createGalleryItemHTML(image, cleanName, uploadDate, sizeInMB, 'image');
        });
        
        memoriesListImages.innerHTML = html;
        
        // Initialize lazy loading after DOM is updated
        setTimeout(() => {
            initGalleryImageLazyLoading();
        }, 0);
        
        console.log(`✅ Loaded ${imagesData.images.length} images with lazy loading`);
    } else {
        memoriesListImages.innerHTML = `
            <p style="grid-column: 1/-1; color: var(--text-muted); text-align: center; padding: 2rem;">
                <i class="fas fa-inbox"></i> No images in gallery yet.
            </p>
        `;
    }
}

function loadGalleryVideos(videosData) {
    const memoriesListVideos = document.getElementById('memoriesListVideos');
    
    if (!memoriesListVideos) return;
    
    if (videosData.success && videosData.videos && videosData.videos.length > 0) {
        let html = '';
        
        videosData.videos.forEach((video) => {
            const uploadDate = new Date(video.uploadedAt).toLocaleDateString('id-ID');
            const sizeInMB = (video.size / (1024 * 1024)).toFixed(2);
            const cleanName = video.name || video.filename;
            
            html += createGalleryItemHTML(video, cleanName, uploadDate, sizeInMB, 'video');
        });
        
        memoriesListVideos.innerHTML = html;
        console.log(`✅ Loaded ${videosData.videos.length} videos`);
    } else {
        memoriesListVideos.innerHTML = `
            <p style="grid-column: 1/-1; color: var(--text-muted); text-align: center; padding: 2rem;">
                <i class="fas fa-inbox"></i> No videos in gallery yet.
            </p>
        `;
    }
}

function createGalleryItemHTML(media, cleanName, uploadDate, sizeInMB, type) {
    const placeholderColor = `hsl(${Math.random() * 360}, 70%, 75%)`;
    
    return `
        <div class="gallery-item" style="position: relative; background: var(--bg-card); border-radius: 10px; overflow: hidden; border: 1px solid var(--border-color); transition: transform 0.3s ease, box-shadow 0.3s ease;">
            <div style="position: relative; width: 100%; padding-top: 100%; overflow: hidden; background: ${placeholderColor};">
                <img 
                    data-src="${media.url}" 
                    alt="${cleanName}" 
                    loading="lazy"
                    class="gallery-item-img loading"
                    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; cursor: pointer; background-color: ${placeholderColor};"
                    onclick="openMediaPreview('${media.url}', '${type}')"
                >
                <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0); display: flex; align-items: center; justify-content: center; transition: background 0.3s ease;" onmouseover="this.style.background='rgba(0,0,0,0.5)'" onmouseout="this.style.background='rgba(0,0,0,0)'">
                    <i class="fas fa-${type === 'image' ? 'image' : 'video'}" style="color: white; font-size: 2rem; opacity: 0; transition: opacity 0.3s ease;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0"></i>
                </div>
            </div>
            
            <div style="padding: 1rem; background: var(--bg-secondary);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.8rem;">
                    <div style="flex: 1; min-width: 0;">
                        <h4 style="margin: 0; color: var(--text-primary); font-size: 0.95rem; word-break: break-word;">
                            ${cleanName}
                        </h4>
                        <p style="margin: 0.3rem 0 0 0; font-size: 0.75rem; color: var(--text-secondary);">
                            ${type.toUpperCase()}
                        </p>
                    </div>
                    <button type="button" class="btn-delete" onclick="deleteGalleryItem('${media.filename}', '${type}')" style="padding: 0.5rem 0.7rem; background: #FF6B6B; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 0.85rem; flex-shrink: 0; transition: background 0.3s ease;" onmouseover="this.style.background='#E63946'" onmouseout="this.style.background='#FF6B6B'">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.8rem; color: var(--text-secondary);">
                    <div>
                        <strong>Size:</strong> ${sizeInMB} MB
                    </div>
                    <div>
                        <strong>Date:</strong> ${uploadDate}
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function deleteMemory(index) {
    const confirmed = await popup.confirm('Yakin mau hapus ini?');
    
    if (!confirmed) return;
    
    try {
        const response = await fetch(`${API_URL}/api/gallery/memory/${index}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            popup.success('Okedeh Berhasil dihapus!');
            await loadMemoriesList();
        } else {
            popup.error('Failed to delete memory');
        }
    } catch (error) {
        console.error('Error deleting memory:', error);
        popup.error('Failed to delete memory');
    }
}

// Delete gallery item (image or video)
async function deleteGalleryItem(filename, mediaType) {
    const confirmed = await popup.confirm(`Delete this ${mediaType}? This action cannot be undone.`);
    
    if (!confirmed) return;
    
    try {
        // Note: We need to add a delete endpoint on the backend
        // For now, we'll call a generic delete endpoint
        const response = await fetch(`${API_URL}/api/gallery/file`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filename: filename,
                type: mediaType
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            popup.success(`${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} deleted successfully!`);
            await loadMemoriesList();
        } else {
            popup.error('Failed to delete ' + mediaType);
        }
    } catch (error) {
        console.error('Error deleting gallery item:', error);
        popup.error('Failed to delete ' + mediaType);
    }
}

// Preview media in a modal
function openMediaPreview(mediaUrl, mediaType) {
    // Create a simple modal preview
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        cursor: pointer;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        max-width: 90vw;
        max-height: 90vh;
        position: relative;
    `;
    
    if (mediaType === 'image') {
        const img = document.createElement('img');
        img.src = mediaUrl;
        img.style.cssText = `
            max-width: 100%;
            max-height: 90vh;
            border-radius: 10px;
        `;
        content.appendChild(img);
    } else {
        const video = document.createElement('video');
        video.src = mediaUrl;
        video.controls = true;
        video.style.cssText = `
            max-width: 100%;
            max-height: 90vh;
            border-radius: 10px;
        `;
        content.appendChild(video);
    }
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.style.cssText = `
        position: absolute;
        top: 20px;
        right: 20px;
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 1.5rem;
        transition: background 0.3s ease;
    `;
    closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255,255,255,0.3)';
    closeBtn.onmouseout = () => closeBtn.style.background = 'rgba(255,255,255,0.2)';
    closeBtn.onclick = (e) => {
        e.stopPropagation();
        modal.remove();
    };
    
    content.appendChild(closeBtn);
    modal.appendChild(content);
    
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    };
    
    document.body.appendChild(modal);
}

// Update setupAdminProfile to include memories management
const originalSetupAdminProfile = window.setupAdminProfile;
window.setupAdminProfile = async function() {
    if (originalSetupAdminProfile) {
        await originalSetupAdminProfile();
    }
    
    setupAdminMemoriesManagement();
};

// ========== GALLERY VIDEO & PHOTO UPLOAD ==========
function setupGalleryUploadForm() {
    // Setup photo type buttons
    const photoTypeButtons = document.querySelectorAll('.photo-type-btn');
    const selectedPhotoTypeInput = document.getElementById('selectedPhotoType');
    const selectedPhotoTypeLabel = document.getElementById('selectedPhotoTypeLabel');
    
    photoTypeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active state from all buttons
            photoTypeButtons.forEach(b => {
                b.style.background = 'white';
                b.style.transform = 'scale(1)';
            });
            
            // Add active state to clicked button
            btn.style.background = 'rgba(29, 185, 84, 0.1)';
            btn.style.transform = 'scale(1.05)';
            
            // Update selected type
            const photoType = btn.dataset.type;
            selectedPhotoTypeInput.value = photoType;
            
            const typeLabels = {
                'girl': '👧 Girl RPL',
                'boy': '👦 Boy RPL',
                'walas': '👨‍🏫 With Walas'
            };
            selectedPhotoTypeLabel.textContent = typeLabels[photoType] || 'None';
            console.log('📸 Selected photo type:', photoType);
        });
    });
    
    // Video input - handle multiple files
    const videoInput = document.getElementById('galleryVideoInput');
    const videoPreview = document.getElementById('galleryVideoPreview');
    const videoPreviewList = document.getElementById('galleryVideoPreviewList');
    const videoCount = document.getElementById('galleryVideoCount');
    
    if (videoInput) {
        videoInput.addEventListener('change', (e) => {
            const files = e.target.files;
            
            if (files.length > 0) {
                videoCount.textContent = files.length;
                videoPreviewList.innerHTML = '';
                
                // Create thumbnails for each video
                Array.from(files).forEach((file, index) => {
                    const url = URL.createObjectURL(file);
                    const thumbnail = document.createElement('div');
                    thumbnail.style.cssText = 'position: relative; aspect-ratio: 1; border-radius: 5px; overflow: hidden; background: #000; display: flex; align-items: center; justify-content: center; cursor: pointer;';
                    
                    const video = document.createElement('video');
                    video.src = url;
                    video.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
                    
                    const badge = document.createElement('div');
                    badge.style.cssText = 'position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,0.7); color: white; font-size: 0.7rem; padding: 2px 5px; border-radius: 3px;';
                    badge.textContent = (index + 1);
                    
                    thumbnail.appendChild(video);
                    thumbnail.appendChild(badge);
                    videoPreviewList.appendChild(thumbnail);
                });
                
                videoPreview.style.display = 'block';
                console.log('✅ Videos selected:', files.length);
            } else {
                videoPreview.style.display = 'none';
            }
        });
    }
    
    // Photo input - handle multiple files
    const photoInput = document.getElementById('galleryPhotoInput');
    const photoPreview = document.getElementById('galleryPhotoPreview');
    const photoPreviewList = document.getElementById('galleryPhotoPreviewList');
    const photoCount = document.getElementById('galleryPhotoCount');
    
    if (photoInput) {
        photoInput.addEventListener('change', async (e) => {
            const files = e.target.files;
            
            if (files.length > 0) {
                try {
                    photoCount.textContent = files.length + ' (converting...)';
                    photoPreviewList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 1rem; color: var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Converting images to WebP...</p>';
                    
                    // Convert all photos to WebP
                    const convertedFiles = await convertMultipleImagesToWebP(files);
                    
                    photoCount.textContent = convertedFiles.size + ' converted to WebP';
                    photoPreviewList.innerHTML = '';
                    
                    // Create thumbnails for each converted photo
                    let index = 0;
                    for (const [filename, blob] of convertedFiles.entries()) {
                        if (blob.type.startsWith('image/')) {
                            const reader = new FileReader();
                            reader.onload = ((idx) => (event) => {
                                const thumbnail = document.createElement('div');
                                thumbnail.style.cssText = 'position: relative; aspect-ratio: 1; border-radius: 5px; overflow: hidden; background: #eee; display: flex; align-items: center; justify-content: center;';
                                
                                const img = document.createElement('img');
                                img.src = event.target.result;
                                img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
                                
                                const badge = document.createElement('div');
                                badge.style.cssText = 'position: absolute; top: 2px; right: 2px; background: rgba(76, 175, 80, 0.9); color: white; font-size: 0.7rem; padding: 2px 5px; border-radius: 3px; font-weight: bold;';
                                badge.innerHTML = '<i class="fas fa-check" style="margin-right: 2px;"></i>' + (idx + 1);
                                
                                thumbnail.appendChild(img);
                                thumbnail.appendChild(badge);
                                photoPreviewList.appendChild(thumbnail);
                            })(index);
                            reader.readAsDataURL(blob);
                            index++;
                        }
                    }
                    
                    // Store converted files in input
                    photoInput.convertedFiles = convertedFiles;
                    photoPreview.style.display = 'block';
                    console.log(`✅ Photos converted to WebP: ${convertedFiles.size} files`);
                } catch (error) {
                    console.error('Error converting photos:', error);
                    popup.error('Gagal nih: ' + error.message);
                    photoPreview.style.display = 'none';
                    photoCount.textContent = '0';
                }
            } else {
                photoPreview.style.display = 'none';
            }
        });
    }
    
    // Form submit
    const form = document.getElementById('uploadVideoGalleryForm');
    if (form) {
        form.addEventListener('submit', uploadVideoGallery);
    }
}

async function uploadVideoGallery(e) {
    e.preventDefault();
    
    const videoInput = document.getElementById('galleryVideoInput');
    const photoInput = document.getElementById('galleryPhotoInput');
    const photoType = document.getElementById('selectedPhotoType').value;
    const statusDiv = document.getElementById('galleryUploadStatus');
    
    // Validate photo type is selected
    if (!photoType) {
        showUploadStatus('❌ Please select a photo type (Girl RPL, Boy RPL, or With Walas)', 'error', statusDiv);
        return;
    }
    
    // Validate at least one file is selected
    if (!videoInput.files.length && !photoInput.files.length) {
        showUploadStatus('❌ Please select at least a video or a photo', 'error', statusDiv);
        return;
    }
    
    try {
        statusDiv.style.display = 'block';
        showUploadStatus('⏳ Uploading files...', 'info', statusDiv);
        
        const formData = new FormData();
        
        // Add photo type
        formData.append('photoType', photoType);
        
        // Add all videos if selected
        if (videoInput.files.length > 0) {
            Array.from(videoInput.files).forEach((file, index) => {
                formData.append('videos', file);
                console.log(`📹 Adding video ${index + 1}:`, file.name);
            });
        }
        
        // Add all photos if selected (use converted WebP files)
        if (photoInput.convertedFiles && photoInput.convertedFiles.size > 0) {
            let photoIndex = 1;
            for (const [filename, blob] of photoInput.convertedFiles.entries()) {
                if (blob.type.startsWith('image/')) {
                    // Create File object from blob with WebP filename
                    const file = new File([blob], filename, { type: 'image/webp' });
                    formData.append('photos', file);
                    console.log(`📷 Adding photo ${photoIndex} (WebP): ${filename}`);
                    photoIndex++;
                }
            }
        } else if (photoInput.files.length > 0) {
            // Fallback if conversion didn't happen
            console.warn('⚠️ Using original photos (WebP conversion may have failed)');
            Array.from(photoInput.files).forEach((file, index) => {
                formData.append('photos', file);
                console.log(`📷 Adding photo ${index + 1}:`, file.name);
            });
        }
        
        // Upload
        const response = await fetch(`${API_URL}/api/gallery/upload`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            const videoCount = videoInput.files.length;
            const photoCount = photoInput.convertedFiles ? photoInput.convertedFiles.size : photoInput.files.length;
            const typeLabel = {
                'girl': '👧 Girl RPL',
                'boy': '👦 Boy RPL',
                'walas': '👨‍🏫 With Walas'
            }[photoType] || photoType;
            
            showUploadStatus(
                `✅ Upload successful!\n${videoCount} video(s) + ${photoCount} photo(s) uploaded as WebP\n📸 Type: ${typeLabel}`,
                'success',
                statusDiv
            );
            
            console.log('✅ Upload response:', data);
            
            // Reset form after 2 seconds
            setTimeout(() => {
                resetGalleryForm();
                statusDiv.style.display = 'none';
            }, 2000);
        } else {
            showUploadStatus(`❌ Upload failed: ${data.message || 'Unknown error'}`, 'error', statusDiv);
        }
    } catch (error) {
        console.error('Error uploading:', error);
        showUploadStatus(`❌ Error: ${error.message}`, 'error', statusDiv);
    }
}

function resetGalleryForm() {
    // Clear file inputs
    document.getElementById('galleryVideoInput').value = '';
    document.getElementById('galleryPhotoInput').value = '';
    
    // Hide previews
    document.getElementById('galleryVideoPreview').style.display = 'none';
    document.getElementById('galleryPhotoPreview').style.display = 'none';
    
    // Reset photo type selection
    document.getElementById('selectedPhotoType').value = '';
    document.getElementById('selectedPhotoTypeLabel').textContent = 'None';
    
    // Reset photo type buttons
    document.querySelectorAll('.photo-type-btn').forEach(btn => {
        btn.style.background = 'white';
        btn.style.transform = 'scale(1)';
    });
    
    // Hide status
    document.getElementById('galleryUploadStatus').style.display = 'none';
    
    console.log('🔄 Gallery form reset');
}

function showUploadStatus(message, type, statusDiv) {
    let backgroundColor = '#1DB954';
    let borderColor = '#1DB954';
    let icon = '✅';
    
    if (type === 'error') {
        backgroundColor = '#FF6B6B';
        borderColor = '#FF6B6B';
        icon = '❌';
    } else if (type === 'info') {
        backgroundColor = '#FF9800';
        borderColor = '#FF9800';
        icon = '⏳';
    }
    
    statusDiv.innerHTML = `
        <div style="background: ${backgroundColor}20; border-left: 4px solid ${borderColor}; padding: 1rem; border-radius: 5px;">
            <p style="margin: 0; color: var(--text-color); font-size: 0.95rem;">
                ${message}
            </p>
        </div>
    `;
    statusDiv.style.display = 'block';
}

// ========== ADMIN AUDIO TAB SWITCHING ==========
function switchAdminAudioTab(event) {
    event.preventDefault();
    const btn = event.target.closest('.audio-tab-btn');
    if (!btn) return;
    
    const container = document.getElementById('adminAudioInput');
    if (!container) return;
    
    const tabBtns = container.querySelectorAll('.audio-tab-btn');
    const tabContents = container.querySelectorAll('.audio-tab-content');
    
    // Remove active from all
    tabBtns.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    
    // Add active to selected
    btn.classList.add('active');
    const index = Array.from(tabBtns).indexOf(btn);
    if (tabContents[index]) {
        tabContents[index].classList.add('active');
        
        // Load audio files when switching to download tab
        if (index === 1) { // Download tab is second
            setTimeout(() => loadAvailableAdminAudioFiles(), 100);
        }
    }
}

// Download admin audio from URL
async function downloadAdminAudio() {
    const url = document.getElementById('adminAudioUrl').value;
    
    if (!url) {
        popup.error('Masukin URL nya dulu');
        return;
    }
    
    // Detect URL type
    const isSpotify = url.includes('spotify.com');
    const isTikTok = url.includes('tiktok.com');
    
    if (!isSpotify && !isTikTok) {
        popup.error('Unsupported URL!\n\nSupported platforms:\n- TikTok (tiktok.com)\n- Spotify (open.spotify.com)');
        return;
    }
    
    const statusDiv = document.getElementById('adminDownloadStatus');
    statusDiv.style.display = 'block';
    statusDiv.innerHTML = `<p style="color: var(--primary-color);"><i class="fas fa-spinner fa-spin"></i> Downloading audio...</p>`;
    
    try {
        // Create abort controller with 180 second timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 180000);
        
        let endpoint = isSpotify ? '/api/spotify/download' : '/api/audio/download';
        let body = isSpotify ? 
            { spotifyUrl: url } : 
            { url };
        
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const data = await response.json();
        
        if (data.success) {
            if (isSpotify && data.latestFile) {
                document.getElementById('adminAudioUrl').value = '';
                statusDiv.innerHTML = `<p style="color: #4CAF50;"><i class="fas fa-check-circle"></i> Audio downloaded successfully!</p>`;
            } else if (data.url) {
                document.getElementById('adminAudioUrl').value = '';
                statusDiv.innerHTML = `<p style="color: #4CAF50;"><i class="fas fa-check-circle"></i> Audio downloaded successfully!</p>`;
            }
            
            // Refresh file list
            setTimeout(() => {
                loadAvailableAdminAudioFiles();
                statusDiv.style.display = 'none';
            }, 1500);
        } else {
            statusDiv.innerHTML = `<p style="color: #FF6B6B;"><i class="fas fa-exclamation-circle"></i> ${data.error || 'Download failed'}</p>`;
        }
    } catch (error) {
        console.error('Download error:', error);
        if (error.name === 'AbortError') {
            statusDiv.innerHTML = `<p style="color: #FF6B6B;"><i class="fas fa-exclamation-circle"></i> Download timeout - try shorter audio or slower connection</p>`;
        } else {
            statusDiv.innerHTML = `<p style="color: #FF6B6B;"><i class="fas fa-exclamation-circle"></i> ${error.message}</p>`;
        }
    }
}

// ========== SETUP ADMIN AUDIO DOWNLOAD ==========
// Setup admin audio download functionality when edit form is shown
function setupAdminAudioDownload() {
    const downloadBtn = document.getElementById('adminDownloadAudioBtn');
    const urlInput = document.getElementById('adminAudioUrl');
    const artistInputGroup = document.getElementById('adminArtistInputGroup');
    
    if (!downloadBtn) return;
    
    // Remove existing event listeners to prevent duplicates
    const newBtn = downloadBtn.cloneNode(true);
    downloadBtn.parentElement.replaceChild(newBtn, downloadBtn);
    
    // Setup URL monitoring for artist input visibility
    if (urlInput && artistInputGroup) {
        // Remove existing listeners first
        const newUrlInput = urlInput.cloneNode(true);
        urlInput.parentElement.replaceChild(newUrlInput, urlInput);
        
        newUrlInput.addEventListener('input', (e) => {
            const url = e.target.value.trim();
            const isSpotify = /spotify\.com/i.test(url);
            
            if (isSpotify) {
                artistInputGroup.style.display = 'block';
                document.getElementById('adminArtistInput')?.focus();
            } else {
                artistInputGroup.style.display = 'none';
                const artistInput = document.getElementById('adminArtistInput');
                if (artistInput) artistInput.value = '';
            }
        });
    }
    
    // Setup download button
    const newdownloadBtn = document.getElementById('adminDownloadAudioBtn');
    newdownloadBtn.addEventListener('click', adminDownloadAudio);
}

// Admin download audio function (called from button)
async function adminDownloadAudio(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    const url = document.getElementById('adminAudioUrl').value;
    const artist = document.getElementById('adminArtistInput')?.value || '';
    const isSpotify = url.includes('spotify.com');
    
    if (!url) {
        popup.error('Silakan masukkan URL dulu!');
        return;
    }
    
    // Validate artist input for Spotify
    if (isSpotify && !artist) {
        popup.error('Silakan masukkan nama pembuat lagu (artist) untuk Spotify');
        return;
    }
    
    const isTikTok = url.includes('tiktok.com');
    if (!isSpotify && !isTikTok) {
        popup.error('Hanya Spotify dan TikTok yang didukung!');
        return;
    }
    
    const statusDiv = document.getElementById('adminDownloadStatus');
    const downloadBtn = document.getElementById('adminDownloadAudioBtn');
    
    statusDiv.style.display = 'block';
    statusDiv.innerHTML = `<p style="color: var(--primary-color);"><i class="fas fa-spinner fa-spin"></i> Sedang download... mohon tunggu</p>`;
    downloadBtn.disabled = true;
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 180000);
        
        let endpoint = isSpotify ? '/api/spotify/download' : '/api/audio/download';
        let body = isSpotify ? 
            { spotifyUrl: url, artist: artist } : 
            { url };
        
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const data = await response.json();
        
        if (data.success) {
            // Set the audio file input to indicate a file was downloaded
            const audioFileInput = document.getElementById('adminAudioFile');
            if (audioFileInput && data.latestFile) {
                // Create a virtual file object for display
                const fileName = data.latestFile.url.split('/').pop();
                document.getElementById('adminAudioFileName').textContent = fileName;
                document.getElementById('adminAudioFilePreview').style.display = 'block';
                
                // Store the downloaded file path for later save
                audioFileInput.dataset.downloadedPath = data.latestFile.url;
                adminAudioPath = data.latestFile.url;
                
                // Navigate to the success message
                displayAdminAudio();
            }
            
            statusDiv.innerHTML = `<p style="color: var(--primary-color);"><i class="fas fa-check-circle"></i> ✅ Download berhasil!</p>`;
            document.getElementById('adminAudioUrl').value = '';
            document.getElementById('adminArtistInput').value = '';
            document.getElementById('adminArtistInputGroup').style.display = 'none';
            
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 3000);
        } else {
            throw new Error(data.error || data.message || 'Download gagal');
        }
    } catch (error) {
        console.error('Download error:', error);
        statusDiv.innerHTML = `<p style="color: #e74c3c;"><i class="fas fa-times-circle"></i> ❌ ${error.message}</p>`;
    } finally {
        downloadBtn.disabled = false;
    }
}

// Load available audio files for admin
async function loadAvailableAdminAudioFiles() {
    const container = document.getElementById('adminAudioFilesContainer');
    const listDiv = document.getElementById('adminAudioFilesList');
    
    if (!container) return;
    
    try {
        console.log('📂 Loading available audio files for admin...');
        
        // Try both endpoints for compatibility
        let response = await fetch(`${API_URL}/api/audio/list`);
        let data = await response.json();
        
        // Fallback to older endpoint if /list doesn't work
        if (!data.success) {
            response = await fetch(`${API_URL}/api/audio/files`);
            data = await response.json();
        }
        
        console.log('📋 Audio files response:', data);
        
        if (data.success && data.files && data.files.length > 0) {
            // Always show the files list container
            if (listDiv) listDiv.style.display = 'block';
            
            let html = '';
            
            data.files.forEach(file => {
                const filename = file.filename || file.name || 'Unknown';
                const title = file.title || filename;
                const artist = file.artist || '';
                const fileSize = file.size ? (file.size / 1024 / 1024).toFixed(2) : 'N/A';
                const filePath = file.path || file.url;
                
                // Escape special characters for HTML
                const escapedPath = filePath.replace(/'/g, "\\'");
                const escapedFilename = filename.replace(/'/g, "\\'");
                
                html += `
                    <div style="padding: 0.8rem; border-bottom: 1px solid var(--border-color); cursor: pointer; transition: background 0.2s;" 
                         onmouseover="this.style.background='var(--bg-secondary)'" 
                         onmouseout="this.style.background='transparent'"
                         onclick="selectAdminAudioFile('${escapedPath}', '${escapedFilename}')">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="flex: 1;">
                                <p style="margin: 0; color: var(--text-primary); font-weight: 500; word-break: break-word;">
                                    <i class="fas fa-music"></i> ${title}
                                </p>
                                <small style="color: var(--text-secondary);">
                                    ${artist ? artist + ' • ' : ''}${fileSize} MB
                                </small>
                            </div>
                            <i class="fas fa-play-circle" style="color: var(--primary-color); font-size: 1.2rem; opacity: 0.7; margin-left: 0.5rem;"></i>
                        </div>
                    </div>
                `;
            });
            
            container.innerHTML = html;
            console.log(`✅ Loaded ${data.files.length} audio files`);
        } else {
            // Show empty state message but keep list visible
            if (listDiv) listDiv.style.display = 'block';
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem 1rem; color: var(--text-secondary);">
                    <i class="fas fa-music" style="font-size: 2rem; opacity: 0.5; margin-bottom: 0.5rem; display: block;"></i>
                    <p style="margin: 0; font-size: 0.9rem;">No audio files found yet</p>
                    <small style="color: var(--text-secondary);">Upload an audio file to see it here</small>
                </div>
            `;
            console.log('⚠️ No audio files found');
        }
    } catch (error) {
        console.error('Error loading audio files:', error);
        if (listDiv) listDiv.style.display = 'block';
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 1rem; color: var(--accent-color);">
                    <i class="fas fa-exclamation-circle" style="display: block; margin-bottom: 0.5rem;"></i>
                    <p style="margin: 0; font-size: 0.9rem;">Error loading files</p>
                    <small>${error.message}</small>
                </div>
            `;
        }
    }
}

// Select audio file for admin student edit
function selectAdminAudioFile(filePath, fileName) {
    // CRITICAL FIX: Set adminAudioPath so it will be saved
    adminAudioPath = filePath;
    
    // Set as current student's audio
    document.getElementById('adminAudioUrl').value = '';
    
    // Show in preview
    const audioPreview = document.getElementById('adminAudioPreview');
    const audioInput = document.getElementById('adminAudioInput');
    const audioSource = document.getElementById('adminAudioSource');
    
    audioSource.src = `${API_URL}${filePath}`;
    document.getElementById('adminAudioPlayer').load();
    
    audioPreview.style.display = 'block';
    audioInput.style.display = 'none';
    
    console.log('✅ Selected audio:', fileName, 'Path:', filePath);
    popup.success(`Kepilih: ${fileName}`);
}

// Refresh admin audio file list
function refreshAdminAudioList() {
    loadAvailableAdminAudioFiles();
}

// ============================================================================= //
// LYRICS KARAOKE SYSTEM - WITH AUTO-GENERATION AND CACHING
// ============================================================================= //

/**
 * Initialize lyrics karaoke system for a profile
 * Checks if lyrics exist, generates if needed
 */
async function initializeLyricsKaraoke(audioPath, studentName) {
    try {
        if (!audioPath) {
            console.log('⚠️ No audio path provided, skipping lyrics initialization');
            return;
        }

        console.log(`🎵 Initializing lyrics for: ${studentName}`);
        
        const audioFilename = getFilenameFromPath(audioPath);
        const lyricsSection = document.getElementById('lyricsKaraokeSection');
        
        if (!lyricsSection) {
            console.warn('⚠️ Lyrics section not found in DOM');
            return;
        }

        // Step 1: Show loading state
        showLyricsLoading(lyricsSection, true);
        updateLyricsStatus(lyricsSection, 'Checking lyrics cache...', 'loading');
        
        // Step 2: Call new endpoint yang handle check + auto-generate
        console.log(`🔄 Calling check-and-generate endpoint for: ${audioFilename}`);
        
        const checkResponse = await fetch(`${API_URL}/api/lyrics/check-and-generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                audioFilename: audioFilename,
                audioPath: audioPath,
                language: 'id'
            })
        });

        const result = await checkResponse.json();

        if (!checkResponse.ok) {
            console.error('❌ Check/Generate failed:', result);
            updateLyricsStatus(
                lyricsSection, 
                '⚠️ Lirik belum tersedia - Akan di-generate saat profil diakses ulang', 
                'warning'
            );
            showLyricsLoading(lyricsSection, false);
            return;
        }

        // Step 3: Handle response
        if (result.status === 'cached') {
            console.log(`✅ Lyrics loaded from cache: ${result.segments.length} segments`);
            displayLyricsKaraoke(result.segments, lyricsSection);
            updateLyricsStatus(lyricsSection, `✅ Lirik dimuat dari cache (${result.segments.length} baris)`, 'success');
        } else if (result.status === 'generated') {
            console.log(`🎤 Lyrics generated successfully: ${result.segments.length} segments`);
            displayLyricsKaraoke(result.segments, lyricsSection);
            updateLyricsStatus(
                lyricsSection, 
                `✅ Lirik berhasil di-generate! (${result.segments.length} baris) - Tersimpan di cache untuk penggunaan berikutnya`, 
                'success'
            );
        } else {
            throw new Error('Unexpected response status: ' + result.status);
        }

        showLyricsLoading(lyricsSection, false);
        
    } catch (error) {
        console.error('❌ Lyrics initialization error:', error);
        const lyricsSection = document.getElementById('lyricsKaraokeSection');
        if (lyricsSection) {
            updateLyricsStatus(lyricsSection, `⚠️ Lirik belum tersedia (${error.message})`, 'error');
            showLyricsLoading(lyricsSection, false);
        }
    }
}

/**
 * Check if lyrics exist in cache (profile_lyrics folder)
 */
async function checkLyricsCache(audioFilename) {
    try {
        const basename = getBasenameWithoutExtension(audioFilename);
        const cacheUrl = `${API_URL}/api/lyrics/${basename}`;
        
        console.log(`🔍 Checking lyrics cache: ${cacheUrl}`);
        
        const response = await fetch(cacheUrl);
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ Found cached lyrics: ${basename}`);
            return data;
        }
        
        console.log(`⚠️ No cached lyrics for: ${basename}`);
        return null;
        
    } catch (error) {
        console.log('ℹ️ Lyrics cache check failed (this is okay):', error.message);
        return null;
    }
}

/**
 * Download audio file for transcription
 */
async function downloadAudioForTranscription(audioPath) {
    try {
        const fullUrl = audioPath.startsWith('http') ? audioPath : `${API_URL}${audioPath}`;
        
        console.log(`📥 Downloading audio from: ${fullUrl}`);
        
        const response = await fetch(fullUrl);
        
        if (!response.ok) {
            throw new Error(`Failed to download audio: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        console.log(`✅ Audio downloaded: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
        
        return blob;
        
    } catch (error) {
        console.error('❌ Download error:', error);
        return null;
    }
}

/**
 * Transcribe audio using Whisper API
 */
async function transcribeAudioWithWhisper(audioBlob, audioFilename) {
    try {
        console.log(`🎤 Starting Whisper transcription for: ${audioFilename}`);
        
        // Create FormData with audio file
        const formData = new FormData();
        formData.append('audio', audioBlob, audioFilename);
        formData.append('language', 'id'); // Indonesian
        
        const response = await fetch(`${API_URL}/api/transcribe`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.details || error.error || 'Transcription failed');
        }
        
        const result = await response.json();
        
        if (!result.success || !result.transcription) {
            throw new Error('Invalid transcription response');
        }
        
        console.log(`✅ Whisper transcription successful: ${result.transcription.segments.length} segments`);
        
        return result.transcription;
        
    } catch (error) {
        console.error('❌ Whisper transcription error:', error);
        throw error;
    }
}

/**
 * Save lyrics to cache (profile_lyrics folder)
 */
async function saveLyricsToCache(audioFilename, segments) {
    try {
        const basename = getBasenameWithoutExtension(audioFilename);
        
        const lyricsData = {
            filename: audioFilename,
            savedAt: new Date().toISOString(),
            segments: segments,
            duration: Math.max(...segments.map(s => s.end || 0))
        };
        
        const response = await fetch(`${API_URL}/api/lyrics/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(lyricsData)
        });
        
        if (response.ok) {
            console.log(`💾 Lyrics saved to cache: ${basename}`);
            return true;
        } else {
            console.warn('⚠️ Failed to save lyrics to cache');
            return false;
        }
        
    } catch (error) {
        console.warn('⚠️ Lyrics cache save error:', error.message);
        return false;
    }
}

/**
 * Display lyrics in karaoke format with sync support
 */
function displayLyricsKaraoke(segments, lyricsSection) {
    try {
        const lyricsDisplay = lyricsSection.querySelector('#lyricsDisplay');
        
        if (!lyricsDisplay) {
            console.warn('⚠️ Lyrics display element not found');
            return;
        }
        
        // Clear previous content
        lyricsDisplay.innerHTML = '';
        
        if (!segments || segments.length === 0) {
            lyricsDisplay.innerHTML = `
                <div class="lyrics-empty">
                    <i class="fas fa-music"></i>
                    <p>No lyrics available</p>
                </div>
            `;
            return;
        }
        
        // Create lyric lines
        segments.forEach((segment, index) => {
            const lyricLine = document.createElement('div');
            lyricLine.className = 'lyric-line';
            lyricLine.dataset.index = index;
            lyricLine.dataset.start = segment.start || 0;
            lyricLine.dataset.end = segment.end || 0;
            
            const timestamp = formatTimeForLyrics(segment.start || 0);
            
            lyricLine.innerHTML = `
                ${segment.text}
                <span class="lyric-timestamp">${timestamp}</span>
            `;
            
            // Click to play from this point
            lyricLine.addEventListener('click', () => {
                const audioElement = document.querySelector('audio');
                if (audioElement) {
                    audioElement.currentTime = segment.start || 0;
                    audioElement.play();
                }
            });
            
            lyricsDisplay.appendChild(lyricLine);
        });
        
        console.log(`✅ Displayed ${segments.length} lyric lines`);
        lyricsSection.style.display = 'block';
        
        // Setup sync listeners
        syncLyricsWithAudio(segments, lyricsSection);
        
        // Setup control buttons
        setupLyricsControls(lyricsSection, segments);
        
    } catch (error) {
        console.error('❌ Display lyrics error:', error);
    }
}

/**
 * Sync lyrics with audio playback
 */
function syncLyricsWithAudio(segments, lyricsSection) {
    try {
        const audioElement = document.querySelector('audio');
        if (!audioElement) {
            console.warn('⚠️ Audio element not found for lyrics sync');
            return;
        }
        
        // Remove previous listeners
        const existingTimeUpdateListener = audioElement.lyricsTimeUpdateListener;
        if (existingTimeUpdateListener) {
            audioElement.removeEventListener('timeupdate', existingTimeUpdateListener);
        }
        
        const timeUpdateListener = () => {
            const currentTime = audioElement.currentTime;
            const lyricsDisplay = lyricsSection.querySelector('#lyricsDisplay');
            const lyricLines = lyricsDisplay.querySelectorAll('.lyric-line');
            
            let activeIndex = -1;
            
            // Find current lyric
            for (let i = 0; i < segments.length; i++) {
                const current = segments[i];
                const next = segments[i + 1];
                const start = current.start || 0;
                const end = next ? (next.start || 0) : audioElement.duration;
                
                if (currentTime >= start && currentTime < end) {
                    activeIndex = i;
                    break;
                }
            }
            
            // Update visual state
            lyricLines.forEach((line, index) => {
                line.classList.remove('active', 'past');
                
                if (index === activeIndex) {
                    line.classList.add('active');
                    // Auto-scroll to active line
                    line.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center' 
                    });
                } else if (index < activeIndex) {
                    line.classList.add('past');
                }
            });
        };
        
        // Save listener for cleanup
        audioElement.lyricsTimeUpdateListener = timeUpdateListener;
        audioElement.addEventListener('timeupdate', timeUpdateListener);
        
        console.log('✅ Lyrics sync enabled');
        
    } catch (error) {
        console.error('❌ Sync error:', error);
    }
}

/**
 * Setup lyrics control buttons
 */
function setupLyricsControls(lyricsSection, segments) {
    try {
        const downloadBtn = lyricsSection.querySelector('#lyricsDownloadBtn');
        const copyBtn = lyricsSection.querySelector('#lyricsCopyBtn');
        
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                downloadLyricsAsFile(segments);
            });
        }
        
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                copyLyricsToClipboard(segments);
            });
        }
        
    } catch (error) {
        console.error('❌ Setup controls error:', error);
    }
}

/**
 * Download lyrics as file
 */
function downloadLyricsAsFile(segments) {
    try {
        const plainText = segments.map(s => s.text).join('\n');
        const blob = new Blob([plainText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `lyrics_${Date.now()}.txt`;
        link.click();
        
        URL.revokeObjectURL(url);
        popup.success('Lyrics downloaded!');
        
    } catch (error) {
        popup.error('Failed to download lyrics');
        console.error(error);
    }
}

/**
 * Copy lyrics to clipboard
 */
function copyLyricsToClipboard(segments) {
    try {
        const plainText = segments.map(s => s.text).join('\n');
        
        navigator.clipboard.writeText(plainText).then(() => {
            popup.success('Lyrics copied to clipboard!');
        }).catch(err => {
            console.error('Clipboard error:', err);
            popup.error('Failed to copy lyrics');
        });
        
    } catch (error) {
        popup.error('Failed to copy lyrics');
        console.error(error);
    }
}

/**
 * Show/hide loading indicator
 */
function showLyricsLoading(lyricsSection, show) {
    try {
        const display = lyricsSection.querySelector('#lyricsDisplay');
        
        if (show) {
            display.innerHTML = `
                <div class="lyrics-loading active">
                    <div class="lyrics-spinner"></div>
                    <p>Generating lyrics... Please wait</p>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('❌ Loading indicator error:', error);
    }
}

/**
 * Update lyrics status message
 */
function updateLyricsStatus(lyricsSection, message, type = 'info') {
    try {
        const statusElement = lyricsSection.querySelector('#lyricsStatus');
        
        if (!statusElement) return;
        
        statusElement.className = `lyrics-status active ${type}`;
        statusElement.innerHTML = `<i class="fas fa-${
            type === 'success' ? 'check-circle' : 
            type === 'error' ? 'exclamation-circle' : 
            type === 'loading' ? 'spinner' : 'info-circle'
        }"></i> ${message}`;
        
        if (type === 'loading') {
            statusElement.querySelector('i').style.animation = 'spin 1s linear infinite';
        }
        
    } catch (error) {
        console.error('❌ Status update error:', error);
    }
}

/**
 * Helper: Get filename from full path
 */
function getFilenameFromPath(path) {
    return path.split('/').pop() || path;
}

/**
 * Helper: Get basename without extension
 */
function getBasenameWithoutExtension(filename) {
    return filename.replace(/\.[^/.]+$/, '');
}

/**
 * Helper: Format time for lyrics display
 */
function formatTimeForLyrics(seconds) {
    if (isNaN(seconds) || seconds === undefined) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================================================= //
// LYRICS KARAOKE SYSTEM - GENERATOR, SYNC, AND DISPLAY
// ============================================================================= //

let currentLyricsSegments = [];
let currentLyricsActiveIndex = -1;

// Initialize lyrics karaoke section
function initLyricsKaraoke() {
    const lyricsDisplay = document.getElementById('lyricsDisplay');
    const lyricsDownloadBtn = document.getElementById('lyricsDownloadBtn');
    const lyricsCopyBtn = document.getElementById('lyricsCopyBtn');
    
    if (lyricsDownloadBtn) {
        lyricsDownloadBtn.addEventListener('click', downloadLyrics);
    }
    
    if (lyricsCopyBtn) {
        lyricsCopyBtn.addEventListener('click', copyAllLyrics);
    }
}

// Generate lyrics from audio using Whisper
async function generateLyricsFromAudio(audioPath, audioElement) {
    try {
        console.log('🎤 Generating lyrics from:', audioPath);
        
        const lyricsSection = document.getElementById('lyricsKaraokeSection');
        const lyricsStatus = document.getElementById('lyricsStatus');
        const lyricsDisplay = document.getElementById('lyricsDisplay');
        
        // Show status
        lyricsStatus.classList.add('active');
        lyricsStatus.innerHTML = `
            <i class="fas fa-spinner fa-spin"></i> Generating lyrics... This may take a few minutes.
        `;
        
        // Fetch audio file
        const response = await fetch(`${API_URL}${audioPath}`);
        if (!response.ok) {
            throw new Error('Failed to fetch audio file');
        }
        
        const audioBlob = await response.blob();
        const formData = new FormData();
        formData.append('audio', audioBlob, 'audio.mp3');
        formData.append('language', 'id');
        
        // Transcribe
        const transcribeResponse = await fetch(`${API_URL}/api/transcribe`, {
            method: 'POST',
            body: formData
        });
        
        if (!transcribeResponse.ok) {
            const errorData = await transcribeResponse.json();
            throw new Error(errorData.details || errorData.error || 'Transcription failed');
        }
        
        const transcribeData = await transcribeResponse.json();
        console.log('✅ Transcription successful:', transcribeData.transcription.segments.length, 'segments');
        
        // Save and display lyrics
        await displayLyricsFromSegments(transcribeData.transcription.segments, audioPath);
        
        lyricsStatus.innerHTML = `
            <i class="fas fa-check-circle"></i> Lyrics generated successfully! (${transcribeData.transcription.segments.length} segments)
        `;
        lyricsStatus.classList.remove('error');
        lyricsStatus.classList.add('success');
        lyricsSection.style.display = 'block';
        
        setTimeout(() => {
            lyricsStatus.classList.remove('active');
        }, 3000);
        
        return transcribeData.transcription.segments;
        
    } catch (error) {
        console.error('❌ Lyrics generation error:', error);
        
        const lyricsStatus = document.getElementById('lyricsStatus');
        lyricsStatus.classList.add('active', 'error');
        lyricsStatus.innerHTML = `
            <i class="fas fa-exclamation-circle"></i> ${error.message}
        `;
        
        throw error;
    }
}

// Display lyrics from segments with trim support
async function displayLyricsFromSegments(segments, audioPath) {
    try {
        console.log('📝 Displaying lyrics:', segments.length, 'segments');
        
        currentLyricsSegments = segments;
        
        const lyricsDisplay = document.getElementById('lyricsDisplay');
        const lyricsSection = document.getElementById('lyricsKaraokeSection');
        
        // Build lyrics HTML
        let lyricsHTML = '';
        segments.forEach((segment, index) => {
            const startMin = Math.floor(segment.start / 60);
            const startSec = Math.floor(segment.start % 60);
            const timeStr = `${startMin}:${startSec.toString().padStart(2, '0')}`;
            
            lyricsHTML += `
                <div class="lyric-line" data-index="${index}" data-start="${segment.start}" data-end="${segment.end}" 
                     onclick="seekToLyricTime(${segment.start})">
                    <span>${segment.text}</span>
                    <span class="lyric-timestamp">${timeStr}</span>
                </div>
            `;
        });
        
        lyricsDisplay.innerHTML = lyricsHTML;
        lyricsSection.style.display = 'block';
        
        // Save lyrics data for reuse
        await saveLyricsData(audioPath, segments);
        
    } catch (error) {
        console.error('❌ Error displaying lyrics:', error);
        throw error;
    }
}

// Save lyrics data to profile_lyrics folder
async function saveLyricsData(audioPath, segments) {
    try {
        const filename = audioPath.split('/').pop();
        
        const response = await fetch(`${API_URL}/api/lyrics/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filename: filename,
                segments: segments,
                metadata: {
                    generatedAt: new Date().toISOString(),
                    language: 'id'
                }
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to save lyrics');
        }
        
        const data = await response.json();
        console.log('💾 Lyrics saved:', data.message);
        
        return data;
        
    } catch (error) {
        console.error('⚠️ Warning - Could not save lyrics:', error);
        // Don't throw - this is not critical
    }
}

// Load existing lyrics for audio file
async function loadExistingLyrics(audioPath) {
    try {
        const filename = audioPath.split('/').pop();
        
        const response = await fetch(`${API_URL}/api/lyrics/${filename}`);
        
        if (!response.ok) {
            return null; // No existing lyrics
        }
        
        const data = await response.json();
        console.log('📚 Loaded existing lyrics:', data.segments.length, 'segments');
        
        await displayLyricsFromSegments(data.segments, audioPath);
        
        return data.segments;
        
    } catch (error) {
        console.log('ℹ️ No existing lyrics found for this audio');
    }
}

// ========== AUTO-GENERATED LYRICS MANAGEMENT ==========

/**
 * Display lyrics section in student profile
 * @param {string} downloadedArtist - Artist name extracted from just-downloaded file (optional)
 * @param {string} downloadedTitle - Song title extracted from just-downloaded file (optional)
 */
async function displayStudentLyricsSection(downloadedArtist = null, downloadedTitle = null) {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) return;

        const lyricsSection = document.getElementById('studentLyricsSection');
        if (!lyricsSection) return;

        // Fetch current student data
        const response = await fetch(`${API_URL}/api/students/${user.id}`);
        if (!response.ok) return;

        const student = await response.json();

        // Get audio info for lyrics source
        let artistName = student.lyricsArtistName || student.name || 'Unknown';
        let songTitle = student.lyricsSongTitle || 'Unknown';
        
        // PRIORITY 1: Use parameters from just-downloaded file (most reliable)
        if (downloadedArtist || downloadedTitle) {
            artistName = downloadedArtist || studentAudioMetadata?.artist || student.name || 'Unknown';
            songTitle = downloadedTitle || studentAudioMetadata?.title || 'Unknown';
            console.log('📝 Form populated from downloaded file:', { artistName, songTitle });
        }
        // PRIORITY 2: Use studentAudioMetadata if available (from recent file selection/upload)
        else if (studentAudioMetadata && studentAudioMetadata.artist && studentAudioMetadata.title) {
            artistName = studentAudioMetadata.artist;
            songTitle = studentAudioMetadata.title;
            console.log('📝 Form populated from studentAudioMetadata:', { artistName, songTitle });
        }
        // PRIORITY 3: Use saved lyricsArtistName/lyricsSongTitle from student data
        else if (student.lyricsArtistName && student.lyricsSongTitle) {
            artistName = student.lyricsArtistName;
            songTitle = student.lyricsSongTitle;
            console.log('📝 Form populated from saved artist/title:', { artistName, songTitle });
        }
        // PRIORITY 4: Extract from student audioFile (first time page load)
        else if (student.audioFile) {
            const filename = student.audioFile.split('/').pop();
            const parsed = extractSongMetadata(filename);
            artistName = parsed.artist || student.name || 'Unknown';
            songTitle = parsed.title || filename;
            console.log('📝 Form populated from student.audioFile:', { artistName, songTitle });
        }

        // Populate form inputs with extracted values
        const artistInput = document.getElementById('lyricsArtistInput');
        const songTitleInput = document.getElementById('lyricsSongTitleInput');
        
        if (artistInput) artistInput.value = artistName;
        if (songTitleInput) songTitleInput.value = songTitle;

        // Show lyrics section
        lyricsSection.style.display = 'block';

        // Set status information
        const statusEl = document.getElementById('lyricsStatus');
        if (student.studentLyrics && statusEl) {
            const lastUpdate = student.lyricsUpdatedAt ? new Date(student.lyricsUpdatedAt).toLocaleDateString('id-ID') : 'Unknown';
            const source = student.lyricsGeneratedFrom || 'unknown';
            statusEl.textContent = `✅ Lirik auto-generated (${source}) • ${lastUpdate}`;
        } else if (statusEl) {
            statusEl.textContent = 'Lirik akan di-generate otomatis oleh server';
        }

    } catch (error) {
        console.error('Error displaying lyrics section:', error);
    }
}


// Seek to lyric timestamp
function seekToLyricTime(timeInSeconds) {
    const audioElement = document.querySelector('audio');
    if (audioElement) {
        audioElement.currentTime = timeInSeconds;
        if (audioElement.paused) {
            audioElement.play();
        }
    }
}

// Download lyrics as file
function downloadLyrics() {
    if (currentLyricsSegments.length === 0) {
        popup.error('No lyrics to download');
        return;
    }
    
    // Create LRC format
    const lrcContent = currentLyricsSegments.map(seg => {
        const minutes = Math.floor(seg.start / 60);
        const seconds = Math.floor(seg.start % 60);
        const milliseconds = Math.floor((seg.start % 1) * 100);
        return `[${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}] ${seg.text}`;
    }).join('\n');
    
    // Create blob and download
    const blob = new Blob([lrcContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lyrics_${Date.now()}.lrc`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    popup.success('Lyrics downloaded successfully!');
}

// Copy all lyrics to clipboard
function copyAllLyrics() {
    if (currentLyricsSegments.length === 0) {
        popup.error('No lyrics to copy');
        return;
    }
    
    const plainText = currentLyricsSegments.map(seg => seg.text).join('\n');
    
    navigator.clipboard.writeText(plainText).then(() => {
        popup.success('Lyrics copied to clipboard!');
    }).catch(() => {
        popup.error('Failed to copy lyrics');
    });
}

// ============================================================================= //