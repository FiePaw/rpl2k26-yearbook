# Changelog — Yearbook RPL 2026

Semua perubahan penting pada proyek ini dicatat di sini.  
Format mengikuti [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

---

## [3.0.1] — 2026-05-10

### Fixed
- **Admin Dashboard — Halaman tidak bisa di-scroll**: Ditambahkan `overflow-y: auto !important` pada `html, body` dan `min-height: 100vh` pada `.admin-layout` agar seluruh halaman dashboard bisa di-scroll.
- **Admin Dashboard — Kolase tidak bisa upload foto/video**: Ditambahkan area upload (drag & drop + file picker) di tab Kolase. Menggunakan endpoint `/api/gallery/upload` yang sudah ada. Support multi-file upload dengan progress bar.
- **Admin Dashboard — Edit profile UI tidak sesuai**: Tombol "Edit" di tab Profiles sekarang me-redirect ke halaman `profile.html?edit=id&type=student/teacher` yang sudah memiliki UI lengkap (foto, audio, message, lyrics) — sama persis seperti halaman profile student/guru. Daftar guru juga ditampilkan di tab Profiles.

---

## [3.0.0] — 2026-05-10

### Added — Admin Dashboard Major Refactor
Refaktor total Admin Dashboard dari nol — semua fitur sekarang berfungsi dengan data realtime.

#### Server-side (Tracking System v3.0)
- **Per-account tracking**: Setiap account (student/teacher/admin) memiliki data tersendiri di `adminbase.json` berisi: daftar IP yang pernah login, activity logs lengkap, first seen, last active.
- **Activity logging komprehensif**: Semua aktivitas tercatat — login, logout, update profile, view profile (di beranda), view foto kolase, view video kolase, view profile guru.
- **IP tracking per account**: Setiap kali login, IP dicatat ke account dengan jumlah penggunaan dan timestamp.
- **Visitor IP tracking**: Semua IP yang mengakses webapp tercatat dengan page yang diakses.
- **Top visited profiles**: Profile yang paling sering dikunjungi tercatat dengan detail siapa yang mengunjungi (IP + account).
- **New endpoints**:
  - `POST /api/track/activity` — Frontend melaporkan aktivitas generik
  - `POST /api/track/profile-view` — Track view profile di beranda
  - `POST /api/track/kolase` — Track view foto/video di kolase
  - `POST /api/track/teacher-view` — Track view profile guru
  - `POST /api/track/logout` — Track logout
  - `GET /api/admin/dashboard` — Single endpoint untuk semua data dashboard (realtime polling)
  - `GET /api/admin/account/:accountId` — Detail logs per account
  - `PUT /api/admin/student/:studentId` — Admin edit profile student
  - `PUT /api/admin/teacher/:teacherId` — Admin edit profile teacher
  - `GET /api/admin/kolase` — List semua foto & video di kolase
  - `DELETE /api/admin/kolase/:filename` — Admin hapus file kolase

#### Frontend (Dashboard UI v3.0)
- **Tabbed interface**: 5 tab — Overview, Accounts, Visitors, Profiles, Kolase.
- **Overview tab**: Stats grid (Students, Visits, Updates, IPs, Logins, Accounts), Top Visited Profiles (ranked), Login History, 24h Access Timeline chart, Refresh & Save buttons.
- **Accounts tab**: Daftar semua account yang pernah login. Klik account → modal detail menampilkan semua IP terdaftar dan activity logs lengkap (dengan ikon, warna, dan timestamp).
- **Visitors tab**: Daftar semua IP unik yang mengakses webapp, jumlah request, dan last seen.
- **Profiles tab**: Daftar semua student dengan status (Complete/Incomplete). Admin bisa klik Edit → modal untuk mengubah nama, nickname, birthday, message.
- **Kolase tab**: Grid semua foto dan video di kolase. Admin bisa hapus file langsung dari dashboard.
- **Realtime polling**: Data di-refresh otomatis setiap 5 detik.
- **Toast notifications**: Feedback visual untuk aksi save/delete/error.
- **Responsive**: Bekerja di mobile dan desktop.

#### Activity Tracker (`activity-tracker.js`)
- File baru `src/client/js/activity-tracker.js` — lightweight tracker untuk halaman frontend.
- Di-include di `beranda.html`, `kolase.html`, `wali-kelas.html`.
- `ActivityTracker.viewProfile(id, name)` — dipanggil saat klik profile di beranda.
- `ActivityTracker.viewKolasePhoto(filename)` / `viewKolaseVideo(filename)` — dipanggil saat lihat media kolase.
- `ActivityTracker.viewTeacher(id, name)` — dipanggil saat lihat profile guru.
- `ActivityTracker.logout()` — dipanggil saat user logout.

### Changed
- **adminbase.json schema**: Restructured dari flat ke per-account. Sekarang menyimpan `accounts`, `visitorIPs`, `topVisited`, `accessTimeline`, `loginHistory`, `pageVisits`, `profileUpdates`, dan `summary`.
- **Login routes**: Semua login handler (`/api/login/student`, `/api/login/teacher`, `/api/login/admin`) sekarang menyertakan IP address ke tracking system.
- **Beranda**: `playStudent()` sekarang memanggil `ActivityTracker.viewProfile()` untuk tracking. Logout memanggil `ActivityTracker.logout()`.

---

## [2.8.3] — 2026-05-10

### Fixed
- **Beranda — Lyrics loading hanya untuk profile dengan lagu**: Loading lirik ("Sabar yakk lirik nya lagi dibuat" + timer) sekarang hanya ditampilkan untuk profile yang memiliki `audioFile`. Profile tanpa lagu tidak lagi menampilkan lyrics container.

### Changed
- **Beranda — Auto-scroll lyric aktif di tengah**: Lyric line yang sedang aktif sekarang di-scroll ke tengah container (mirip Spotify), sehingga baris aktif selalu berada di antara baris yang sudah lewat (past) dan yang akan datang (upcoming).

---

## [2.8.2] — 2026-05-10

### Changed
- **Beranda — Lyrics waiting state**: Jika profile memiliki lagu tapi lirik belum tersedia, tampilkan pesan "Sabar yakk lirik nya lagi dibuat" dengan timer realtime (MM:SS) yang berjalan. Sebelumnya container lyrics di-hide.
- **Beranda — Lyric line style Spotify**: `.lyric-line.active` sekarang menggunakan style mirip Spotify — teks putih terang, font lebih besar (1.15rem), bold (700), scale up sedikit (1.02), text-shadow glow. Line yang belum/sudah lewat menggunakan warna putih redup (opacity-based).
- **Beranda — Hapus lyric-time**: Timestamp `[MM:SS]` di setiap baris lirik dihapus dari tampilan. Sekarang hanya menampilkan teks lirik saja (lebih clean seperti Spotify).

---

## [2.8.1] — 2026-05-10

### Changed
- **Profile — Redirect ke beranda setelah save**: Setelah student (non-admin) menyimpan perubahan profile, sekarang otomatis redirect ke halaman beranda (sebelumnya tetap di profile tanpa redirect).
- **Beranda — Hapus online lyrics search saat klik profile**: `loadAndDisplayLyrics()` tidak lagi melakukan request ke `/api/lyrics/search` (PRIORITY 3: AZLyric search). Jika lirik tidak ditemukan di database atau cache, container lyrics di-hide. Lirik akan di-generate oleh auto lyrics generation cycle di server-side.
- **AI Lyrics Fetcher — thinkMode diubah ke 'thinking'**: Semua 3 prompt ke Qwen AI sekarang menggunakan `thinkMode: 'thinking'` (sebelumnya `'fast'`). Memberikan response yang lebih akurat dan thoughtful.

---

## [2.8.0] — 2026-05-10

### Added
- **Cookie Rotator Module** (`src/server/utils/cookie-rotator.js`): Sistem rotating cookies untuk YouTube. Jika cookie invalid/expired, otomatis rotate ke cookie berikutnya. Mendukung banyak file cookies di `cookies/` directory (format: `ytCookies1.txt`, `ytCookies2.txt`, `ytCookies3.txt`, dst.).
- **Direktori `cookies/`**: Lokasi baru untuk menyimpan semua YouTube cookies (dipindahkan dari `downloads/`). Contoh: `cookies/ytCookies1.txt`, `cookies/ytCookies2.txt`, `cookies/ytCookies3.txt`.
- **Music Downloader — Fallback YouTube Search**: `searchYoutube()` sekarang memiliki 3 metode fallback berurutan:
  1. `play-dl` — Library pertama yang dicoba
  2. `yt-search` — Fallback kedua
  3. `youtube-sr` — Fallback ketiga
- **Dependencies baru** di `package.json`: `play-dl`, `yt-search`, `youtube-sr` (optional — loaded with try/catch).

### Changed
- **AI Lyrics Fetcher — Rate Limiting**: Setiap request ke Qwen API sekarang memiliki jeda random 1~2 menit (`MIN_REQUEST_INTERVAL_MS=60000`, `MAX_REQUEST_INTERVAL_MS=120000`). Mencegah spam request yang bisa menyebabkan ban/throttle.
- **AI Lyrics Fetcher — Prompt 3 Binary**: Prompt ketiga (request timestamped lyrics) sekarang di-encode sebagai Base64 lalu dikirim dengan instruksi decode. Menghindari deteksi/filtering prompt.
- **Server — Auto Lyrics Generation Cycle**: Interval diperbesar dari 60 detik menjadi **5 menit** (`300000ms`). First cycle dimulai setelah 60 detik (sebelumnya 30 detik).
- **Music Downloader — Cookie path**: Semua referensi cookie dipindahkan dari `downloads/youtube_cookies.txt` dan `__dirname/youtube_cookies.txt` ke sistem `CookieRotator` yang membaca dari `cookies/*`.
- **Music Downloader — Cookie retry**: Jika yt-dlp gagal karena cookie invalid/expired (403, login required, bot detected, dll.), otomatis rotate ke cookie berikutnya dan retry hingga 3 kali.

### Fixed
- **Music Downloader — `downloadFromYoutube()`**: Memperbaiki reference error `searchQuery` yang undefined (sebelumnya memanggil `searchYoutube(searchQuery)` pada direct YouTube URL). Sekarang langsung pass URL ke yt-dlp.
- **Music Downloader — `downloadFromYoutubeMusic()`**: Memperbaiki flow — sekarang langsung download via yt-dlp (YouTube Music URL kompatibel dengan yt-dlp) alih-alih extract parameter dan search ulang.

---

## [2.7.2] — 2026-05-10

### Fixed
- **Music Downloader — Path cookies salah**: `music-downloader.js` menggunakan `path.join(__dirname, '../../youtube_cookies.txt')` yang resolve ke `src/youtube_cookies.txt` (tidak ada). Diperbaiki menjadi mencari di project root (`../../../youtube_cookies.txt`) lalu fallback ke `downloads/youtube_cookies.txt`. Method `listAvailableFormats()` juga diperbaiki path-nya.

---

## [2.7.1] — 2026-05-10

### Fixed
- **AI Lyrics Fetcher — Klarifikasi await flow**: Prompt 1 dan Prompt 2 sekarang secara eksplisit menunggu (`await`) response selesai diterima sebelum lanjut ke prompt berikutnya. Log message diperjelas: "hasil diterima & diabaikan" untuk menunjukkan flow yang benar.

### Added
- **Test Script — Download Lagu** (`scripts/test-download.js`): Script CLI untuk menguji download lagu dari berbagai platform (Spotify, TikTok, YouTube, YouTube Music). Cara pakai: `node scripts/test-download.js <URL> [artist]`. Menampilkan info platform, progress, hasil download (filename, size, waktu), dan error handling yang informatif.

---

## [2.7.0] — 2026-05-10

### Removed
- **Profile — Trim functions dihapus**: `syncTrimInputs()`, `syncTrimSliders()`, `updateAudioTrimInfo()`, `previewStudentAudioTrim()`, `resetStudentAudioTrim()` beserta event listener references di `displayStudentAudio()`.
- **Profile — Generate Lyrics button/UI dihapus**: `generateStudentLyrics()`, `saveStudentLyrics()`, `regenerateStudentLyrics()`, `clearStudentLyrics()`, `setupLyricsAutoSave()`, `updateLyricsCharCount()` dan DOMContentLoaded listener terkait.

### Changed
- **Profile — Lyrics section disederhanakan**: Sekarang hanya berisi Artist Name + Song Title confirmation inputs, tanpa textarea, tanpa Generate/Regenerate/Save/Clear buttons, tanpa loading indicator, tanpa error container. Header diganti dari "Song Lyrics" menjadi "Song Info".
- **AI Lyrics Fetcher — Rewrite dengan 3-prompt conversation strategy**: Alur baru menggunakan 3 prompt berurutan dalam 1 session Qwen (bukan masing-masing `newSession`). Prompt 1 & 2 sebagai "pemanasan" konteks, Prompt 3 meminta lirik dengan format `[MM:SS]`. Hanya hasil Prompt 3 yang diambil, dan di-clean untuk hanya menyimpan baris `[MM:SS] Lyrics`.

### Added
- **Server-side auto lyrics generation cycle**: Background process yang berjalan setiap 60 detik. Membaca semua student dari database, cek apakah punya `lyricsArtistName` + `lyricsSongTitle` tapi belum punya `studentLyrics` → generate otomatis via `lyricsFetcher.searchLyrics()`. Memproses satu student per cycle untuk menghindari overload Qwen API.
- **Form saves `lyricsArtistName` dan `lyricsSongTitle`**: Field baru disimpan ke database saat profile form di-submit dari frontend.

---

## [2.6.4] — 2026-05-10

### Fixed
- **Profile — Lyric generation gagal dengan error "Please upload an audio file" padahal lagu sudah di-download** : Disebabkan oleh crash `TypeError: Cannot set properties of null (setting 'textContent')` di `updateAudioDurationDisplay()` (profile.js:1566). Fungsi ini mereferensikan elemen DOM (`studentAudioDuration`, `studentAudioTrimStart`, `studentAudioTrimEnd`, dll.) yang sudah tidak ada di `profile.html` — elemen-elemen tersebut sudah digantikan oleh Lyrics Section.
  - **Fix 1:** `updateAudioDurationDisplay()` — tambah null-check untuk semua elemen trim/duration. Fungsi sekarang gracefully skip jika elemen tidak ditemukan, dan tetap lanjut ke `drawAudioWaveform()`.
  - **Fix 2:** `syncTrimInputs()` — tambah null-check dan early return jika slider elements tidak ada.
  - **Fix 3:** `generateStudentLyrics()` — sekarang menggunakan local `studentAudioPath` sebagai fallback ketika `student.audioFile` dari API bernilai null (kasus ketika lagu baru di-download tapi form belum di-save). Referensi `student.audioFile` di body request dan filename extraction juga diupdate ke variabel `audioFile` yang sudah resolved.

---

## [2.6.3] — 2026-05-10

### Fixed
- **Kolase — Video player hitam pada video pertama (final fix)** : Perbaikan sebelumnya (v2.6.2) menggunakan flag `_primed` yang di-set di `showVideoSectionWhenReady()` via `requestAnimationFrame`. Masalahnya, `.load()` yang dipanggil dalam rAF belum tentu selesai me-reset decoder sebelum user scroll ke section. Saat IntersectionObserver atau tombol play memicu `requestVideoPlay()`, fungsi melihat `_primed = true` DAN `readyState >= 3` (stale dari pipeline display:none) → langsung `.play()` tanpa `.load()` ulang → tetap black frame.
  - **New approach:** Hapus flag `_primed` sepenuhnya. `requestVideoPlay()` sekarang menggunakan `currentTime > 0` sebagai indikator video benar-benar pernah diputar. Jika `currentTime === 0` (belum pernah play), **selalu** force `.load()` + tunggu `canplay` baru `.play()`.
  - `showVideoSectionWhenReady()` tetap memanggil `.load()` sebagai pre-prime, tapi tanpa set flag apapun — jadi tidak ada race condition lagi.
- **Profile — Crop foto gagal dengan error "Cannot read properties of null (reading 'toBlob')"** : `cropper.getCroppedCanvas()` mengembalikan `null` jika Cropper.js belum sepenuhnya ready (gambar belum decode). 
  - Tambah variabel `cropperReady` yang di-set `true` hanya setelah callback `ready()` dari Cropper.js terpanggil.
  - Tombol "Terapkan" sekarang cek `!cropper || !cropperReady` sebelum proses — jika belum siap, tampilkan pesan error user-friendly.
  - Tambah null-check pada hasil `getCroppedCanvas()` sebelum memanggil `.toBlob()`.

---

## [2.6.2] — 2026-05-10

### Fixed
- **Kolase — Video player hitam saat pertama kali scroll ke section, tombol play/pause tidak merespon, tapi prev/next langsung normal** : Bug ini muncul karena `<video>` elements dibuat oleh `initVideoCarousel()` ketika `.video-gallery-section` masih di-set `display: none` (menunggu memories gallery selesai loading). Pada sebagian build Chromium, decoder pipeline untuk video yang diciptakan dalam container `display:none` menjadi "lazy-attached" — `readyState` bisa melaporkan `HAVE_FUTURE_DATA` atau bahkan `HAVE_ENOUGH_DATA`, tapi compositor tidak pernah mendapat frame untuk di-render. Akibatnya saat user scroll ke section:
  - IntersectionObserver memanggil `.play()` → audio jalan tapi frame tetap hitam.
  - Klik play/pause tidak merespon karena handler hanya memanggil `.play()` polos pada pipeline yang stuck.
  - Sementara Next/Prev bekerja normal karena jalur `showVideo()` kebetulan lewat cabang `.load()` fallback yang me-reset pipeline.
- **Fix** :
  - Tambah helper `requestVideoPlay(videoEl)` yang menjadi single chokepoint untuk semua request "play sekarang". Flag `_primed` per-element memastikan panggilan pertama **selalu** memicu `.load()` penuh — reset HTMLMediaElement resource-selection algorithm dan memaksa pipeline fresh — lalu `.play()` setelah `canplay`.
  - Semua entry point memakai helper ini: IntersectionObserver auto-play, `showVideo()`, tombol play/pause (bar bawah & overlay tengah), spacebar keyboard.
  - Sebagai pengaman tambahan: saat `.hidden` class dilepas dari `.video-gallery-section`, video element aktif di-prime via `requestAnimationFrame` + `.load()` agar pipeline di-reset **begitu** section punya layout, jauh sebelum user scroll turun. Menghilangkan race condition antara observer dan section reveal.

---

## [2.6.1] — 2026-05-10

### Fixed
- **Kolase — Video player controls double-bound** : `initPlayerControlListeners()` dipasang dua kali (sekali dari dalam `initVideoCarousel` setelah video dibuat, sekali dari `DOMContentLoaded`). Setiap tombol (play/pause, volume, slider, progress bar, fullscreen) meregistrasi handler-nya dua kali. Efeknya paling terasa di tombol volume: satu klik = mute lalu unmute lagi dalam tick yang sama → tombol terlihat "tidak merespon". Ditambahkan guard `_playerControlListenersBound` agar listener hanya diikat satu kali.
- **Kolase — Video pertama kadang audio-only (iteration 2)** : Event `loadeddata` (HAVE_CURRENT_DATA) ternyata kadang fire sebelum decoder iOS Safari benar-benar siap render frame, sehingga `.play()` tetap memulai audio tanpa gambar. Diganti ke `canplay` (HAVE_FUTURE_DATA) di kedua titik: IntersectionObserver auto-play dan `showVideo()`. `videoEl.load()` tetap dipanggil untuk memaksa fetch saat `preload='none'`.
- **Kolase — Auto-rotate 40 detik memotong video yang baru di-pilih manual** : Timer `setInterval(38000)` berjalan terus-menerus tanpa pernah direset. Jika user menekan Next / swipe pada detik ke-20, video baru hanya dapat ~18 detik sebelum fade-out. Timer di-refactor menjadi `scheduleAutoRotate()` yang di-reset setiap kali `showVideo()` dipanggil (yaitu semua entry point navigasi: next/prev/keyboard/swipe).

### Performance
- **Image quality — Hilangkan artefak "pecah"/pixelated di memory frame** : `image-rendering: crisp-edges` + `-webkit-optimize-contrast` pada `.memory-frame img` dihapus. Kedua properti ini dirancang untuk pixel-art, bukan foto — di Firefox dan Safari ia menonaktifkan bilinear/bicubic resampling sehingga foto yang di-downscale terlihat kotak-kotak. Dikembalikan ke `image-rendering: auto`.
- **Image quality — Hilangkan blur di layar retina** : `generateImageSrcset()` di `kolase.js` dan `profile.js` sebelumnya mengembalikan string `"URL 1x, URL 2x"` padahal server belum menyediakan variant ukuran. Browser retina memilih versi "2x" lalu merender-nya di setengah ukuran natural → gambar tampak blur. Sekarang mengembalikan string kosong; pemanggil akan fallback ke atribut `src` di resolusi natural.
- **Image priority — Jangan paksa `fetchpriority="low"` untuk semua img** : `image-optimizer.js` sebelumnya memaksa `fetchpriority="low"` pada setiap `<img>` yang belum di-opt-out. Ini merugikan LCP image (hero landing, beranda card pertama). Sekarang hanya menerapkan `loading="lazy"` + `decoding="async"` — sudah cukup untuk defer gambar off-screen, tanpa mendeprioritize gambar above-the-fold.

---

## [2.6.0] — 2026-05-10

### Fixed
- **Kolase — Video Carousel "first video audio-only" bug** : Video pertama kadang hanya keluar suara tanpa gambar di sebagian browser (terutama iOS Safari dan saat autoplay via IntersectionObserver). Penyebab gabungan: atribut `playsinline` tidak ada, `muted` tidak di-set (autoplay ditolak), dan `.play()` dipanggil sebelum browser decode frame pertama.
  - `<video>` sekarang dibuat dengan `muted=true` + `playsinline` + `webkit-playsinline` sejak awal.
  - `controls=false` (menghindari bentrok dengan custom Spotify-style controls).
  - IntersectionObserver dan `showVideo()` kini menunggu `readyState >= HAVE_CURRENT_DATA` (atau event `loadeddata`) sebelum `.play()` → tidak ada lagi situasi "audio jalan, video masih blank".
  - Tombol volume dan slider diinisialisasi ke state **muted** (ikon `fa-volume-mute`, slider = 0); toggle / slider akan unmute otomatis saat user berinteraksi.

### Changed
- **Kolase — Memory Card** : `.polaroid-effect` dihapus dari template card (baik versi dinamis via API maupun fallback default) dan CSS rule nya juga dihapus dari `style.css`. Tampilan kartu kini lebih clean.
- **Fix (beranda) fotonya ikutan diupdate dari iterasi sebelumnya** — changelog ini melengkapi commit sebelumnya agar tercatat.

### Performance
- **App-wide image optimization** : Menambah file baru `src/client/js/image-optimizer.js` yang:
  - Meng-upgrade setiap `<img>` tanpa atribut `loading` menjadi `loading="lazy"` + `decoding="async"` + `fetchpriority="low"`.
  - Memakai `MutationObserver` untuk menangkap gambar yang di-inject dinamis (student cards, teacher cards, gallery, carousel, cropper preview, popup, dsb).
  - Menghormati author intent: img yang sudah set `loading` atau ditandai `data-eager` / `fetchpriority="high"` **tidak** disentuh.
- Di-load pada semua halaman: `index.html`, `beranda.html`, `kolase.html`, `wali-kelas.html`, `profile.html`, `admin-dashboard.html`.
- `beranda.js` — student card: `<img>` sekarang memiliki `loading="lazy" decoding="async"` (sebelumnya eager).
- `wali-kelas.js` — teacher card: sama (`loading="lazy" decoding="async"`).
- `landing.js` — mobile hero collage: menambah `decoding="async"`.
- `kolase.js` — memory card: menambah `decoding="async"` + `fetchpriority="low"` ke gambar galeri yang sudah lazy.
- Efek: halaman yang menampilkan banyak foto (beranda, kolase, wali-kelas) tidak lagi mem-block main thread untuk dekoding gambar off-screen → scroll lebih halus, initial paint lebih cepat.

---

## [2.5.0] — 2026-05-10

### Added
- **Landing Page — Mobile Hero Floating Photo Collage** : Menambahkan floating photo cards (kolase) sebagai elemen dekoratif di area hero mobile. Foto-foto siswa ditampilkan secara acak dengan efek scatter, rotasi, dan animasi floating. Badge dan tombol CTA diposisikan di atas collage untuk kontras visual yang baik.
- **Mobile Hero — collageFadeIn animation** : Animasi staggered fade-in untuk setiap card collage agar muncul secara bertahap.
- **Mobile Hero — collageFloat animation** : Animasi floating subtle (naik-turun 8px) untuk memberi kesan hidup pada foto-foto.

### Changed
- **Mobile Badge — backdrop blur** : Badge kini menggunakan `backdrop-filter: blur(8px)` untuk readability yang lebih baik di atas foto collage.
- **Mobile Hero Title — text shadow** : Ditambahkan text-shadow halus untuk memastikan judul tetap terbaca di atas floating cards.
- **Mobile Hero Content — z-index** : Dinaikkan dari `z-index: 1` ke `z-index: 2` agar konten (badge, title, CTA) selalu tampil di atas collage cards.

---

## [2.4.0] — 2026-05-10

### Fixed
- **Landing Page — mobile horizontal cards not showing** : `.mobile-landing` kini memiliki base CSS rule `display: none` (sebelumnya tidak ada base rule, hanya diatur via media queries yang saling bentrok). Pada `≤768px` menggunakan `display: flex !important` dengan proper flex layout.
- **Landing Page — desktop/mobile layout conflict** : Menghapus `height: auto` dan `body { padding-bottom }` rules dari media query `≤768px` dan `≤480px` yang mengoverride mobile landing redesign CSS. Hero section diubah ke `flex: 1 1 0` (dari `flex: 1 1 auto`) agar cards section selalu tampil di bawah.
- **Landing Page — mobile cards section clipped** : Ditambahkan `min-height: 180px` dan `z-index: 2` pada `.mobile-cards-section` agar selalu visible meskipun hero content besar.
- **Wali-Kelas — teacher-detail-content overflow/clipping** : Layout diubah dari CSS Grid (`1fr 1.5fr` + `gap: 3rem`) ke Flexbox dengan photo fixed `280px` width dan info `flex: 1`. Menghilangkan content yang terpotong.
- **Wali-Kelas — teacher-detail-photo tidak beraturan** : Photo kini memiliki `aspect-ratio: 3/4`, `object-fit: cover`, dan `max-width` constraint yang konsisten di semua breakpoint.

### Changed
- **Teacher Detail — desktop layout** : Padding dikurangi dari `3rem` ke `2.5rem`. Gap dari `3rem` ke `2.5rem`. Font title dari `2.5rem` ke `2rem`. Lebih proporsional.
- **Teacher Detail — tablet (≤1024px)** : Ditambahkan breakpoint baru. Photo menyusut ke `220px`, gap `2rem`.
- **Teacher Detail — mobile (≤768px)** : Layout berubah ke column-direction. Photo menjadi bulat (border-radius 50%) berukuran `200px`, centered. Info text centered.
- **Teacher Detail — close button** : Kini memiliki background circle (`rgba(0,0,0,0.3)`) dengan fixed size `40px` untuk visibility yang lebih baik.
- **Teacher Detail — .teacher-badge** : Ditambahkan styling baru (inline-flex, rounded pill, primary color background).
- **Teacher Detail — text overflow** : Ditambahkan `word-wrap: break-word` dan `overflow-wrap: break-word` pada heading dan message paragraph.

---

## [2.3.0] — 2026-05-10

### Fixed
- **`landing.js` — path fetch JSON** : `../nameMurid.json` & `../database.json` (404 setelah refactor) diganti ke endpoint API `${API_URL}/api/students/names` dan `${API_URL}/api/students`. Data response dibungkus `{students:[...]}` agar kompatibel dengan kode lama.
- **`profile.html`** : hapus referensi `whisper-transcriber.js` yang tidak ada. Fix path `lyrics-karaoke.js` yang hilang saat refactor.
- **`src/client/js/lyrics-karaoke.js`** : file client-side ini kini tersedia di `src/client/js/` (sebelumnya hanya ada di `src/server/lyrics/`).
- **`spotify-downloader.js`** : dibuat ulang di `src/server/media/` karena hilang saat refactor, menyebabkan `MODULE_NOT_FOUND` saat server start.

### Changed
- **Mobile hero background** : warna disamakan dengan desktop (`linear-gradient(135deg, #b6bac1 0%, #17d38c 50%, #94e3b0 100%)`).
- Teks mobile hero diubah ke hitam (`#000000`) dengan highlight putih (`#FFFFFF`) agar kontras di atas background terang.
- Badge mobile menggunakan warna gelap semi-transparan.
- Orbs dekoratif diubah ke putih semi-transparan.

---

## [2.2.0] — 2026-05-10

### Added
- **Mobile Landing Page Redesign** — tampilan landing page di layar ≤ 768px dirombak total tanpa menyentuh layout desktop.
  - Hero section baru: dark gradient background, glowing green orbs, badge "RPL 2k26 · Music Edition".
  - Rotating title mobile (element terpisah, fade tiap 5 detik).
  - Tombol CTA hijau besar dengan efek tap feedback.
  - Horizontal scroll strip: kartu siswa (foto + nama) dengan skeleton loading.
  - Breakpoint tambahan: 768px, 480px, 360px.
- **`loadMobileCards()`** di `landing.js` — render semua siswa sebagai kartu horizontal di mobile.
- **`initMobileRotatingTitle()`** di `landing.js` — animasi fade untuk judul rotating khusus mobile.

### Changed
- Desktop layout (`landing-left`, `landing-cards-right`) tidak berubah sama sekali.
- `landing.js` kini mendeteksi `window.innerWidth` dan memilih path render mobile vs desktop.

---

## [2.1.0] — 2026-05-10

### Changed — Restructure Folder (Refactor)
Proyek diorganisasi ulang agar lebih rapi dan mudah dipelihara.

| Sebelum (root) | Sesudah |
|---|---|
| `AIAPI.js`, `ai-api-lyrics-fetcher.js` | `src/server/ai/` |
| `lyrics-scraper.js`, `lyrics-fetcher.js`, `lyrics-karaoke.js` | `src/server/lyrics/` |
| `music-downloader.js`, `tiktok-downloader.js`, `videoOptimizer.js` | `src/server/media/` |
| `metadata-cache.js`, `rate-limit-handler.js` | `src/server/utils/` |
| `beranda.js`, `kolase.js`, `profile.js`, … (semua frontend JS) | `src/client/js/` |
| `style.css`, `loading.css`, `popup.css`, `admin-dashboard.css` | `src/client/styles/` |
| `database.json`, `nameMurid.json`, `nameGuru.json`, `adminbase.json`, `memories.json` | `data/` |
| `batch-optimize-videos.js`, `generate-metadata.js`, … | `scripts/` |
| `CHANGELOG.md`, `*.md` (docs) | `docs/` |

- Semua `require()` path di Node.js modules diperbarui.
- Semua `<script src>` dan `<link href>` di HTML files diperbarui ke path baru.
- `server.js` menambah `express.static('/src/client/')` untuk serve frontend assets.
- Path data JSON (`data/database.json`, dst.) diperbarui di `server.js`.
- `package.json` script `reset-db` diperbarui ke `scripts/reset-database.js`.

---

## [2.0.0] — 2026-05-10

### Changed — Migrasi AI API Lirik
Sistem pengambilan lirik diperbarui dari API lama ke API baru.

#### `AIAPI.js` → `QwenClient`
- **Sebelum:** `AIScraperClient` terhubung ke `http://16.79.192.14:5500` (endpoint `/api/qwen`, `/api/openai`, `/api/grok`).
- **Sesudah:** `QwenClient` terhubung ke `http://108.137.15.61:9000` (endpoint standar `/v1/chat/completions`).
- Session management otomatis via `X-Session-ID` header.
- Built-in timeout dengan `AbortController`.
- Method baru: `resetSession()`, `deleteSession()`, `health()`, `getModels()`.

#### `ai-api-lyrics-fetcher.js`
- Prompt lirik disederhanakan dan lebih formal (tidak lagi bahasa gaul).
- Setiap pencarian menggunakan `newSession: true` (tidak butuh konteks percakapan lama).
- `parseSegments()` lebih ketat: hanya terima `[MM:SS]`, timestamps harus naik.
- Kode dikurangi ~50% dengan logika yang sama.

### Fixed
- URL hardcoded `16.79.192.14:5500` diganti di semua file (`lyrics-fetcher.js`, `lyrics-scraper.js`, `music-downloader.js`).

---

## [1.1.0] — sebelum 2026-05-10

### Added
- Sistem karaoke lirik di halaman beranda:
  - `loadAndDisplayLyrics()` dengan 3 prioritas fetch (database → cache lama → search AI).
  - Karaoke sync dengan audio (`timeupdate`), highlight baris aktif, auto-scroll.
  - Manual scroll detection (pause auto-scroll 3 detik).
  - Klik baris lirik → seek audio ke timestamp.
- Admin tracking system (`data/adminbase.json`): kunjungan profil, login history, timeline akses.
- Endpoint baru: `/api/student/lyrics/generate`, `/api/student/lyrics/save`, `/api/student/lyrics/delete`.
- Video optimization: multi-quality encoding (auto/720p/480p/360p) via FFmpeg.
- Gallery upload: support multi-file (foto + video) dengan metadata `photoType`.

### Changed
- `MusicDownloader` menggantikan `SpotifyDownloader` langsung untuk download via yt-dlp.
- Metadata cache sistem (24 jam TTL) untuk mengurangi API calls ke Spotify.
- Rate limit handler dengan auto-retry.

---

## [1.0.0] — awal proyek

### Added
- Halaman landing dengan carousel siswa (5 kartu, auto-rotate 5 detik, swipe/wheel gesture).
- Rotating title dengan fade cross-transition.
- Halaman beranda: music player fullscreen (desktop + mobile), daftar siswa/guru.
- Halaman kolase: galeri foto masonry + video carousel adaptive bitrate.
- Halaman profil siswa/guru: upload foto, audio (Spotify/TikTok/upload), trim audio.
- Sistem login: Student (password = nama depan), Teacher (`RPL2k26`), Admin.
- Admin dashboard: statistik kunjungan, top profiles, login history.
- Pre-cache JSON data (`nameMurid.json`, `database.json`) saat loading screen.
- Loading screen dengan animasi logo.

---

*Dibuat dan dikelola oleh tim RPL Generation 2k26.*
