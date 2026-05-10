# Changelog — Yearbook RPL 2026

Semua perubahan penting pada proyek ini dicatat di sini.  
Format mengikuti [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

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
