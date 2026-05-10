# Changelog — Yearbook RPL 2026

Semua perubahan penting pada proyek ini dicatat di sini.  
Format mengikuti [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

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
