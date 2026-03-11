# 🎓 YearBook RPL 2026 - Interactive Digital Yearbook

A modern, interactive digital yearbook for RPL (Rekayasa Perangkat Lunak / Software Engineering) class of 2026 with **AI-powered lyrics generation**, **karaoke sync**, and **multimedia content management**.

## ✨ Features

### 🎵 Lyrics & Karaoke System
- **AI-Powered Lyrics Generation** - Uses Qwen AI to generate song lyrics with automatic timestamps
- **Timestamp Format** - Strict `[MM:SS]` format for precise audio sync
- **Karaoke Sync** - Real-time lyrics highlighting synchronized with audio playback
- **Click-to-Seek** - Click any lyric line to jump to that exact timestamp in the song
- **Fallback Timing** - Gracefully handles lyrics without timestamps using smart defaults

### 👥 Student Profiles
- **Photo & Audio** - Upload profile photos and custom audio files
- **Metadata Extraction** - Auto-extract artist/title from MP3 files
- **Audio Trimming** - Audio trim controls (start/end time in seconds)
- **Birthday & Messages** - Personal birthday info and custom messages
- **Admin Dashboard** - Manage all student profiles from centralized admin panel

### 📱 Responsive Design
- **Desktop** (1201px+) - Vertical cards with photos on top
- **Tablet** (768px-1200px) - Horizontal layout with photos on side
- **Mobile** (below 768px) - Single column optimized for touch
- **Dark/Light Theme** - Toggle between dark and light modes

### 🎬 Multimedia
- **Video Gallery (Kolase)** - Browse and view student video memories
- **Teacher Profiles** - Special section for teachers (Wali Kelas)
- **Responsive Media** - Videos and images adapt to all screen sizes

### 🔐 Admin Features
- **Student Management** - Create, edit, delete student profiles
- **Profile Editor** - Edit all fields including lyrics in one place
- **Real-time Dashboard** - Monitor profile visits and statistics
- **Access Control** - Admin login with password protection

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v14+)
- Nginx (for HTTPS reverse proxy)
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. **Clone or download the project**
   ```bash
   cd YearBook
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   - Update `API_URL` in HTML files to match your backend domain
   - Ensure Nginx is configured as reverse proxy (HTTPS recommended)

4. **Start server**
   ```bash
   npm start
   # or
   node server.js
   ```

5. **Access the application**
   - Home: `https://your-domain.com/`
   - Admin: `https://your-domain.com/admin` (password protected)

---

## 📁 Project Structure

```
YearBook/
├── public/                      # Frontend static files
│   ├── index.html              # Main home page
│   ├── profile.html            # Student profiles page
│   ├── beranda.html            # Interactive carousel view
│   ├── kolase.html             # Video gallery
│   ├── wali-kelas.html         # Teacher profiles
│   ├── admin-dashboard.html    # Admin control panel
│   └── style.css               # Global styles
│
├── server.js                    # Express.js backend server
├── ai-api-lyrics-fetcher.js    # Qwen AI integration for lyrics
├── AIAPI/                       # AI API client module
│   └── client.js               # Qwen query client
│
├── profile.js                   # Student profile logic
├── beranda.js                   # Carousel/home page logic
├── kolase.js                    # Video gallery logic
├── wali-kelas.js               # Teacher profiles logic
├── admin-dashboard.js          # Admin dashboard logic
│
├── lyrics-karaoke.js           # Karaoke display module
├── lyrics-fetcher.js           # Legacy lyrics fetcher
├── music-metadata              # MP3 metadata extraction
│
├── database.json               # Student data (JSON storage)
├── profile_lyrics/             # Cached lyrics storage
│   └── {studentId}_lyrics.json
│
├── CHANGELOG.md                # Version history (detailed)
├── README.md                   # This file
└── fixLYRICS.md                # Lyrics feature documentation

```

---

## 🎯 Core Features Usage

### Generating Lyrics for a Student

1. **Access Student Profile**
   - Go to student's profile page
   - Scroll to "Student Lyrics" section

2. **Upload Audio File**
   - Click audio upload button
   - Select MP3 file with clear audio
   - (Optional) Trim start/end times

3. **Generate Lyrics**
   - Enter Artist name and Song title
   - Click "Generate Lyrics" button
   - Wait for Qwen AI to process (2-5 minutes typical)
   - Lyrics appear with `[MM:SS]` timestamps

4. **Edit if Needed**
   - Manually edit lyrics in text area
   - Ensure `[MM:SS]` format is maintained
   - Click "Save Changes"

5. **Verify in Karaoke**
   - Go to Beranda (carousel view)
   - Select the student profile
   - Audio plays and lyrics sync in real-time

### Timestamp Format

**Strict Format: `[MM:SS] Text`**
- MM = Minutes (00-59)
- SS = Seconds (00-59)
- Must be ascending (timestamps can't go backwards)

**Examples:**
```
[00:12] Verse pertama dimulai
[00:20] Verse berlanjut dengan lirik
[01:05] Chorus dimension
[02:30] Bridge section
[03:15] Final verse
```

### Admin Panel

1. **Login**
   - Go to admin page: `/admin`
   - Default ID: `admin` (change password!)
   - Enter admin password

2. **Manage Students**
   - View all student profiles in table
   - Click "Edit" to modify student data
   - Edit form includes lyrics field

3. **Edit Student Profile**
   - Update Name, Birthday, Message
   - Upload/change photo
   - Upload/change audio file
   - Edit lyrics directly
   - Click "Save Changes"

4. **Dashboard Stats**
   - Total students count
   - Total visits to profiles
   - Profile update frequency
   - Unique IP access tracking
   - Real-time access timeline

---

## 🔧 API Endpoints

### Student Management
```
GET  /api/students                    # Get all students
GET  /api/students/:id                # Get specific student
POST /api/students                    # Create student
PUT  /api/students/:id                # Update student
DELETE /api/students/:id              # Delete student
```

### Lyrics Generation
```
POST /api/student/lyrics/generate     # Generate lyrics via Qwen AI
POST /api/student/lyrics/save         # Save lyrics to database
GET  /api/transcribe/lyrics/:id       # Get cached lyrics
DELETE /api/student/lyrics/:id        # Delete lyrics
```

### Audio Management
```
POST /api/audio/upload                # Upload audio file
DELETE /api/audio/:path               # Delete audio file
GET  /audio/:path                     # Stream audio file
```

### Statistics
```
GET /api/students/stats               # View all stats
GET /api/visits/:studentId            # Get visit count
POST /api/record-visit/:studentId     # Record profile visit
```

---

## 🔌 Qwen AI Integration

### How It Works
1. **Prompt** - User uploads audio and enters artist/title
2. **API Call** - Backend sends prompt to Qwen AI via local network
3. **Generation** - Qwen generates full lyrics with `[MM:SS]` timestamps
4. **Caching** - Lyrics cached locally for future use
5. **Display** - Frontend parses and displays with karaoke sync

### Qwen Prompt Format
```
Cari lirik lagu "{title}" dari "{artist}" dengan format KETAT berikut:

FORMAT WAJIB:
[MM:SS] Lirik pertama
[MM:SS] Lirik kedua

PERATURAN KETAT:
1. HANYA format [MM:SS] - MM adalah MENIT (00-59), SS adalah DETIK (00-59)
2. Jangan gunakan [HH:MM:SS] atau format lain!
3. Timestamps harus NAIK (tidak boleh mundur)
4. Lirik HARUS akurat, jangan ada kata tambahan
5. Setiap baris = 1 lirik dengan 1 timestamp
6. Jika lagu tidak ditemukan, HANYA respond: NO_LYRICS_FOUND
```

### Configuration
- **AI API URL**: `http://16.79.192.14:5500` (local network)
- **Model**: Qwen (via AI API layer)
- **Timeout**: 180 seconds per request
- **Caching**: 24-hour local cache

---

## 🎨 Customization

### Theme Customization
Edit CSS variables in [style.css](style.css):
```css
:root {
    --primary-color: #1DB954;        /* For buttons, highlights */
    --secondary-color: #191414;      /* Background */
    --text-color: #ffffff;           /* Main text */
    --text-secondary: #b3b3b3;       /* Secondary text */
    --border-color: #282828;         /* Borders */
}
```

### Responsive Breakpoints
Modify media queries in [style.css](style.css):
```css
@media (min-width: 1201px) { ... }   /* Desktop */
@media (max-width: 1200px) { ... }   /* Tablet */
@media (max-width: 768px) { ... }    /* Mobile */
@media (max-width: 480px) { ... }    /* Small Mobile */
```

---

## 🐛 Known Issues & Troubleshooting

### Issue: Lyrics Not Syncing with Audio
**Cause**: Invalid or missing `[MM:SS]` timestamps
**Solution**: 
1. Check lyrics format: each line must have `[MM:SS] text`
2. Ensure timestamps are ascending
3. Re-generate lyrics via Qwen

### Issue: Audio File Won't Upload
**Cause**: File size or format incompatible
**Solution**:
1. Use MP3 format (recommended)
2. Check file size (< 50MB)
3. Ensure metadata is readable (artist, title)

### Issue: Qwen Request Timeout
**Cause**: AI API unreachable or processing too long
**Solution**:
1. Check network connectivity to `16.79.192.14:5500`
2. Wait longer (up to 10 minutes for complex lyrics)
3. Try different song with shorter lyrics

### Issue: Admin Login Fails
**Cause**: Wrong password or corrupted admin data
**Solution**:
1. Check default admin ID: `admin`
2. Verify password in system
3. Reset admin credentials if needed

---

## 📊 Performance Optimization

### Caching
- Lyrics cached locally for 24 hours
- Uses in-memory caching for API responses
- Browser localStorage for theme/user data

### Image Optimization
- Photos automatically resized during upload
- Responsive images for different breakpoints
- Lazy loading for off-screen content

### Compression
- Gzip compression for HTTP responses
- Minified CSS and JavaScript
- Nginx reverse proxy compression enabled

---

## 🔐 Security

### Admin Authentication
- Password-protected admin panel
- Session-based access control
- Input validation on all forms

### Data Protection
- All data stored in `database.json`
- Files stored in secure directories with `.gitignore`
- HTTPS via Nginx reverse proxy
- CORS headers properly configured

### File Uploads
- Mime-type validation for files
- File size limits enforced
- Paths sanitized to prevent directory traversal

---

## 🚀 Deployment

### Prerequisites for Production
1. **HTTPS Certificate** - Required (Let's Encrypt recommended)
2. **Nginx Configuration** - Reverse proxy setup
3. **Node.js Process Manager** - PM2 or similar
4. **Firewall Rules** - Allow only necessary ports (80, 443)

### Nginx Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### PM2 Startup Script
```bash
pm2 start server.js --name "yearbook"
pm2 save
pm2 startup
```

---

## 📝 License

This project is created for RPL 2026 class yearbook. Rights reserved.

---

## 👥 Contributors

- **Development**: YearBook XYZ Team
- **AI Integration**: Qwen AI (via AI API)
- **Design**: Modern CSS3 & Responsive Framework

---

## 📞 Support & Contact

For issues or feature requests:
1. Check [CHANGELOG.md](CHANGELOG.md) for recent fixes
2. Review [fixLYRICS.md](fixLYRICS.md) for lyrics-specific docs
3. Check browser console for error messages
4. Contact admin team for access issues

---

**Last Updated**: March 12, 2026  
**Version**: 2.0.0 (Lyrics Timestamp Sync Complete)
