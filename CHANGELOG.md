# Changelog - YearBook RPL 2026

## [In Progress] - March 12, 2026

### 🎵 Lyrics Timestamp Sync - Complete Overhaul
**Status**: ✅ IMPLEMENTED  
**Priority**: CRITICAL - Fixes core karaoke feature

#### Problems Fixed
1. **Timestamp Format Parsing Bug** - Was parsing `[HH:MM:SS]` as `[MM:SS]` causing completely wrong timings
2. **Overly Strict Validation** - Rejected any song > 10 minutes (600s)
3. **Lost Timing Information** - Timestamps were discarded when loading from database
4. **Fake Default Timing** - Beranda used hardcoded 3-second intervals for all songs
5. **Ambiguous Qwen Prompt** - AI could generate different timestamp formats

#### Changes Made

**1. Strict Qwen Prompt Format** - [ai-api-lyrics-fetcher.js](ai-api-lyrics-fetcher.js#L220-L226)
```javascript
// BEFORE: Ambiguous format instruction
// AFTER: Crystal clear [MM:SS] format requirement
const prompt = `...
FORMAT WAJIB:
[MM:SS] Lirik pertama
[MM:SS] Lirik kedua

PERATURAN KETAT:
1. HANYA format [MM:SS] - MM adalah MENIT (00-59), SS adalah DETIK (00-59)
2. Jangan gunakan [HH:MM:SS] atau format lain!
3. Timestamps harus NAIK (tidak boleh mundur)
...`;
```
✅ **Result**: Qwen now only generates strict `[MM:SS]` format with no ambiguity

**2. Fixed [MM:SS] Parser** - [ai-api-lyrics-fetcher.js](ai-api-lyrics-fetcher.js#L94-L158)
- Removed support for `[HH:MM:SS]` format (caused calculation errors)
- Strict format validation: `[(\d{1,2}):(\d{2})] text`
- Proper MM:SS calculation: `minutes * 60 + seconds` (was incorrectly multiplying)
- Removed 600-second (10 minute) duration limit - now supports any length
- Improved validation: only reject non-ascending timestamps
- Better error logging for debugging

**3. Smart Beranda Loading** - [beranda.js](beranda.js#L792-L865)
- Added `parseLyricsWithTimestamps()` function - parses `[MM:SS]` format intelligently
- Added `parseLyricsWithoutTimestamps()` function - graceful fallback with 6s default per line
- Updated `loadAndDisplayLyrics()` with priority loading:
  1. Try parse with `[MM:SS]` timestamps from database
  2. Fallback to default timing if no timestamps found
  3. Proper error handling for malformed lyrics

**4. Enhanced Display** - [beranda.js](beranda.js#L967-L1005)
- Show timestamp `[MM:SS]` for each lyric line
- Click-to-seek functionality (click line to jump to that timestamp)
- Proper `data-start` and `data-end` attributes for audio sync
- Better visual feedback for timing display

#### Database Strategy
- ✅ Keep raw text format in database: `"[00:15] Lirik pertama\n[00:22] Lirik kedua\n..."`
- ✅ Parse on-the-fly when loading (no schema migration needed)
- ✅ Flexible for future improvements

#### Testing
- [x] Qwen generates strict `[MM:SS]` format
- [x] Parser correctly extracts timestamps (MM 00-59, SS 00-59)
- [x] Supports songs of any duration
- [x] Beranda parses timestamps correctly
- [x] Click-to-seek works properly
- [x] Fallback to default timing works
- [x] Audio sync accurate to the second

---

### 📝 Lyrics Persistence - Full Pipeline Fix
**Status**: ✅ COMPLETED

#### Problems Fixed
1. **formData Missing Lyrics** - Form save wasn't including `studentLyrics` field
2. **Admin Form Had No UI** - Admin edit form HTML was missing entirely
3. **Admin Lyrics Not Saved** - Admin form couldn't save lyrics

#### Changes Made

**1. Fixed Form Save Pipeline** - [profile.js](profile.js#L625)
```javascript
// BEFORE: Missing studentLyrics field
const formData = {
    id, name, birthday, message, photo,
    audioFile, audioTrimStart, audioTrimEnd
    // Missing: studentLyrics!
};

// AFTER: Include studentLyrics in form data
const formData = {
    id, name, birthday, message, photo,
    audioFile, audioTrimStart, audioTrimEnd,
    studentLyrics: document.getElementById('studentLyricsTextarea')?.value || null
};
```
✅ **Result**: Lyrics now properly saved to database when form submitted

**2. Created Admin Edit Form** - [admin-dashboard.html](public/admin-dashboard.html)
- Added complete `#adminEditForm` HTML structure (was referenced in JS but didn't exist)
- Fields: Name, Birthday, Message, Photo, Audio File, Trim Controls
- **NEW**: Lyrics textarea field for editing saved lyrics
- Submit/Cancel buttons with proper styling

**3. Updated Admin Functions** - [profile.js](profile.js#L2640-L2740)
- `selectAndEditStudent()` - Now loads `student.studentLyrics` into form
- `submitAdminStudentEdit()` - Now saves `studentLyrics` to database

#### Audio Metadata Integration
- Auto-populate Name, Birthday, Message from student data when editing
- Extract artist/title from MP3 metadata when available
- Optional chaining for safe input access: `?.value`

---

### 🔄 Beranda Lyrics Loading Priority
**Status**: ✅ IMPROVED

#### Changes Made - [beranda.js](beranda.js#L792-L865)
```javascript
// PRIORITY 1: Load from student.studentLyrics (database - newest saved version)
//   ✅ This is what user saved with current timestamp format
const studentData = await fetch(/api/students/{id});
if (studentData.studentLyrics) {
    // Parse [MM:SS] timestamps
}

// PRIORITY 2: Fall back to cached lyrics (old transcription endpoint)
const cachedData = await fetch(/api/transcribe/lyrics/{id});

// PRIORITY 3: Search online via AZLyric (last resort)
```

✅ **Result**: Beranda now loads most recent user-saved lyrics with proper timestamp handling

---

## [Completed] - January 19, 2026

### ✅ Student Card Layout Redesign
- **Modified**: [beranda.js](beranda.js) - Updated `createStudentCard()` function with new HTML structure
- **Modified**: [style.css](style.css) - Complete redesign of student/teacher card styling
- **Changes Made**:
  - Changed card layout from **vertical (photo on top)** to **horizontal (photo on left)**
  - Responsive design: 
    - **Desktop 1000+** (1201px+): Vertical layout with photo on top, info below
    - **Tablet/Mobile** (below 1200px): Horizontal layout with photo on left, message & info on right
  - Grid system updated with uniform row heights using `grid-auto-rows`
  - Card sizing consistent across all breakpoints
  - Added `Message & Thoughts` display on mobile/tablet views
  - Removed borders from desktop view, kept for tablet/mobile

### 📐 Responsive Grid Updates
- **Modified**: [style.css](style.css) - `.students-grid` and `.teachers-grid` classes
- **Grid Layout Changes**:
  - Desktop (1201px+): `minmax(280px, 1fr)` - 3-4 columns
  - Large Tablet (1024px-1200px): `minmax(320px, 1fr)` - 2-3 columns
  - Tablet (768px-1024px): Single column
  - Mobile (480px-768px): Single column
  - Small Mobile (below 480px): Single column

### 📱 Mobile-First Responsive Design
- **Breakpoints Implemented**:
  - `@media (min-width: 1201px)` - Desktop view (vertical cards)
  - `@media (max-width: 1024px)` - Large tablet
  - `@media (max-width: 768px)` - Tablet/mobile
  - `@media (max-width: 480px)` - Small mobile

### 🎨 Card Component Styling
- **New CSS Classes Added**:
  - `.card-photo-section` - Photo container (left on mobile, top on desktop)
  - `.card-content-section` - Message & info section (right on mobile, hidden on desktop)
  - `.card-info` - Info section for desktop only
  - `.card-message-label` - "Message & Thoughts" label
  - `.card-message-box` - Message content display with 3-line ellipsis
  - `.card-footer` - Name and birthday footer

---

## 🐛 Known Bugs / Issues to Fix

### 1. Theme Toggle Not Working on Beranda
**Severity**: Medium  
**Location**: [beranda.js](beranda.js) - `initTheme()` function  
**Description**: The theme toggle button is not functioning properly on the home page. Theme switching may not persist or may not update UI correctly.  
**Affected Elements**:
- Theme toggle button (`.theme-btn`)
- Theme persistence in localStorage
- UI theme update across components

**Needs Investigation**:
- Check `initTheme()` function logic
- Verify localStorage theme key consistency
- Check if theme changes are applied to all affected elements
- Verify event listener attachment

---

### 2. Teacher Page (Wali-Kelas) Layout Issues
**Severity**: High  
**Location**: [wali-kelas.js](wali-kelas.js) + [style.css](style.css)  
**Description**: Teacher card layout is inconsistent and appears broken. Layout may not be adapting properly to the new card structure.  
**Affected Elements**:
- `.teacher-card` styling
- `.teachers-grid` layout
- Teacher card display on desktop vs mobile

**Issues Observed**:
- Cards may have irregular sizing
- Layout appears disorganized on different screen sizes
- Possible CSS class naming conflicts between student and teacher cards

**Needs Investigation**:
- Check if teacher cards inherit all new responsive styles correctly
- Verify `.teacher-card` CSS matches `.student-card` new structure
- Check media query application for teacher cards
- Test grid layout on all breakpoints

---

### 3. Video Gallery Section Not Responsive (Kolase Page)
**Severity**: High  
**Location**: [kolase.js](kolase.js) + [style.css](style.css)  
**Description**: The video-gallery-section appears to not be responsive and may break on smaller screen sizes.  
**Affected Elements**:
- `.video-gallery-section` container
- Video cards within gallery
- Gallery grid layout

**Issues Observed**:
- Section may overflow on mobile devices
- Grid layout may not adapt to smaller viewports
- Possible missing media queries for responsive behavior

**Needs Investigation**:
- Check if `.video-gallery-section` has proper responsive grid setup
- Verify media queries are applied correctly
- Test on mobile, tablet, and desktop breakpoints
- Check for overflow/scrolling issues
- Verify video card sizing on different screens

---

## 📝 Summary

### Completed Tasks
- ✅ Student card layout completely redesigned
- ✅ Responsive grid system implemented
- ✅ Desktop (1000+) layout restored to original vertical view
- ✅ Mobile/tablet horizontal layout with messages implemented
- ✅ Uniform card sizing with CSS Grid `grid-auto-rows`

### Pending Tasks
- ⏳ Fix theme toggle functionality on beranda
- ⏳ Debug and repair teacher page layout
- ⏳ Make video gallery section responsive
- ⏳ Test all pages across breakpoints
- ⏳ Cross-browser testing

### Files Modified
1. [beranda.js](beranda.js) - Card creation logic
2. [style.css](style.css) - Complete card and grid styling
3. *Files to investigate*: [wali-kelas.js](wali-kelas.js), [kolase.js](kolase.js)

### Next Steps
1. Test and fix theme toggle on beranda page
2. Audit and repair teacher page CSS/layout
3. Implement proper responsive design for video gallery
4. Full responsive testing across all breakpoints
5. Cross-browser validation

---

**Last Updated**: January 19, 2026  
**Status**: Ready for bug fixes on next session
