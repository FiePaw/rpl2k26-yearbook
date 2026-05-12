# Changelog — Yearbook RPL 2026

Semua perubahan penting pada proyek ini dicatat di sini.  
Format mengikuti [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

---

## [3.3.8] — 2026-05-12

### Fixed — Kolase: Space Kosong pada `memory-frame` (`src/client/styles/style.css`)

#### Root Cause
Layout galeri kolase sebelumnya menggunakan **CSS Grid** dengan `grid-row: span 2` untuk kartu portrait. Masalahnya:
- Kartu portrait "mereservasi" 2 baris di grid, namun karena tinggi gambar mengikuti konten (`height: auto`), baris ke-2 tidak selalu terisi penuh → timbul **ruang kosong (gap)** di bawah kartu.
- `object-fit: contain` membuat gambar tidak memenuhi frame, menyisakan ruang kosong di atas/bawah gambar.
- Walaupun sudah ada `grid-auto-flow: dense`, tetap tidak bisa mengisi gap karena row height yang tidak konsisten antar foto.

#### Solusi: Ganti ke CSS Multi-Column Masonry
- `.memories-container` diubah dari `display: grid` ke **`columns: N`** (CSS multi-column layout) — ini cara paling native dan stabil untuk layout foto berbeda ukuran tanpa space kosong.
- `.memory-card` ditambah `break-inside: avoid` + `display: inline-block` agar kartu tidak terpotong di tengah antar kolom.
- `.memory-card` ditambah `margin-bottom` sebagai pengganti `gap` (multi-column pakai margin, bukan gap).
- `object-fit` diubah dari `contain` ke `cover` agar gambar selalu memenuhi frame.
- Semua `grid-column: span` dan `grid-row: span` pada `.memory-card.landscape`, `.memory-card.portrait`, dan `.memory-large` dihapus — tidak relevan lagi dengan multi-column.

#### Breakpoints yang diupdate
- **Mobile** (`≤768px`): `columns: 2`, `column-gap: 0.7rem`
- **Tablet** (`≤1024px`): `columns: 3`, `column-gap: 1rem`
- **Desktop** (`≥1200px`): `columns: 4`, `column-gap: 1.4rem`
- **Default**: `columns: 4`, `column-gap: 1.2rem`

---

## [3.3.7] — 2026-05-12

### Fixed — Hotfix: Seluruh isi `studentProfile` keluar batas (`src/client/styles/style.css`, `public/profile.html`)

Fix lanjutan dari [3.3.6] — perbaikan sebelumnya pada `.audio-file-info` belum cukup menahan overflow di level grid dan flex parent.

#### Root cause
Grid child (`.form-fields`) tidak memiliki `min-width: 0`, sehingga di dalam CSS Grid `grid-template-columns: auto 1fr`, kolom `1fr` bisa melampaui batas container. Ini ditambah `.audio-file-item` yang pakai `flex-wrap: wrap` tanpa `max-width: 100%` menyebabkan seluruh konten daftar lagu melebar keluar kartu profil.

#### Perubahan `style.css`
- Tambah rule dasar `.form-grid` dan `.form-fields` dengan `min-width: 0` dan `overflow: hidden` agar grid child tidak bisa overflow melampaui kolom.
- `.audio-file-item` ditambah `max-width: 100%`, `overflow: hidden`, dan `box-sizing: border-box`.
- `.profile-form` ditambah `overflow: hidden` sebagai jaring pengaman terakhir agar konten apapun di dalamnya tidak bisa keluar batas kartu.

#### Perubahan `profile.html`
- `#studentAudioFilesContainer` ditambah `overflow-x: hidden` dan `box-sizing: border-box` agar scroll container tidak melampaui lebar parent meski konten di dalamnya lebar.

---

## [3.3.6] — 2026-05-12

### Fixed — Bug Profile: Overflow Nama Lagu, Ikon Sosmed, Artist Input (`public/profile.html`, `src/client/styles/style.css`, `src/client/js/profile.js`)

#### Bug 1 — Nama lagu panjang keluar batas `studentProfile` (`style.css`, `profile.js`)
- `.audio-file-info` diubah dari `min-width: 150px` ke `min-width: 0` + `overflow: hidden` agar flex child bisa di-constrain dengan benar.
- `.audio-file-title` ditambah `overflow: hidden`, `white-space: nowrap`, `text-overflow: ellipsis`, dan `max-width: 100%` — nama lagu kini terpotong dengan ellipsis jika terlalu panjang.
- Tambah class CSS baru `.audio-file-title-text` untuk wrapping teks judul secara spesifik di dalam flex container.
- Di `profile.js`, kedua fungsi render daftar lagu (`loadAvailableAudioFiles` dan `refreshStudentAudioList`) diupdate: `<span>` yang membungkus judul lagu kini menggunakan class `audio-file-title-text`.
- Di `profile.html`, container info di `selectedSongCard` ditambah `overflow: hidden` agar `text-overflow: ellipsis` pada `selectedSongTitle` dan `selectedSongArtist` bekerja dengan benar.

#### Bug 2 — Ikon `fab fa-x-twitter` dan `fab fa-threads` tidak tampil (`profile.html`)
- FontAwesome diupgrade dari versi `6.4.0` ke `6.7.2`.
- `fa-threads` baru tersedia mulai FA `6.5.0`, sehingga versi `6.4.0` yang sebelumnya digunakan tidak menampilkan ikon tersebut.
- `fa-x-twitter` juga lebih stabil di versi `6.7.2`.

#### Bug 3 — `studentArtistInput` tidak tampil saat pertama load (`profile.js`)
- `setupArtistInputMonitoring()` sebelumnya hanya dipanggil ketika user **mengklik tab "Download MP3"** (`switchStudentAudioTab`, index 1).
- Akibatnya, jika user langsung mengetik Spotify URL di tab Download tanpa berpindah tab terlebih dahulu, event listener untuk menampilkan field artist belum terpasang.
- Fix: `setupArtistInputMonitoring()` kini dipanggil langsung di akhir `setupStudentForm()` saat halaman pertama kali diinisialisasi, sehingga field artist sudah siap muncul tanpa perlu berpindah tab.

---

## [3.3.5] — 2026-05-12

### Added — Download Fallback: po_token + visitor_data jika semua cookies expired (`src/server/utils/po-token-generator.js`, `src/server/media/music-downloader.js`)

#### File Baru: `src/server/utils/po-token-generator.js`
- Kelas `PoTokenGenerator` yang bertanggung jawab generate dan cache `po_token` + `visitor_data` dari YouTube tanpa memerlukan login atau cookie.
- `visitor_data` di-fetch dari YouTube InnerTube API endpoint (`/youtubei/v1/visitor_id`) secara otomatis — tidak butuh autentikasi.
- `po_token` di-generate via yt-dlp menggunakan flag `--print po_token` + `--extractor-args` dengan `visitor_data` yang sudah didapat.
- Hasil token di-cache selama **6 jam** — tidak generate ulang setiap kali download.
- Cache auto-invalidate jika token terdeteksi expired (ditandai oleh error cookie-related dari yt-dlp).
- Method `invalidate()` untuk invalidate cache paksa jika diperlukan.
- Method `getStatus()` untuk monitoring status cache dari admin dashboard.

#### Update: `src/server/media/music-downloader.js`
- Import `PoTokenGenerator` dan inisialisasi `this.poTokenGenerator` di constructor.
- `downloadWithYtdlp()` kini memiliki **dua tahap fallback**:
  1. **Tahap 1 (existing):** Download dengan cookie rotation — jika satu cookie expired, otomatis rotate ke cookie berikutnya.
  2. **Tahap 2 (baru):** Jika **semua cookies sudah habis/invalid**, otomatis switch ke download menggunakan `po_token` + `visitor_data` tanpa cookie sama sekali via method `_downloadWithPoToken()`.
- Method baru `_downloadWithPoToken(url, outputPath)`: menjalankan yt-dlp dengan flag `--extractor-args youtube:po_token=web+<token>;visitor_data=<data>` tanpa `--cookies`.
- Jika po_token fallback juga gagal dengan cookie-related error, cache po_token di-invalidate otomatis agar di-regenerate pada request berikutnya.
- `getCookieStatus()` kini menyertakan field `poTokenFallback` berisi status cache po_token (cached, ageMinutes, expiresInMinutes).

#### Flow Download Baru
```
Request download
    │
    ▼
Cookie tersedia? ──Ya──▶ Download dengan cookie
                              │
                         Berhasil? ──Ya──▶ ✅ Selesai
                              │
                         Cookie error → mark invalid, rotate
                              │
                         Masih ada cookie lain? ──Ya──▶ (ulangi)
                              │
                         Tidak — semua habis
                              ▼
                    🔑 Fallback: generate po_token + visitor_data
                              │
                         Download tanpa cookie
                              │
                         Berhasil? ──Ya──▶ ✅ Selesai
                              │
                         Tidak ──▶ ❌ Error
```

---

## [3.3.4] — 2026-05-12

### Hapus semua fungsi trim

#### Adain preview lagu pas di profile

#### ngutamain Daftar lagu dengan cara tuker posisi "Upload MP3" di profile


---

## [3.3.3] — 2026-05-12

### Added — Profile: Thumbnail Lagu di Daftar Audio (`music-downloader.js`, `server.js`, `profile.js`, `style.css`)

#### Download Thumbnail via yt-dlp (`src/server/media/music-downloader.js`)
- Ditambah flag `--write-thumbnail`, `--convert-thumbnails jpg`, dan `--write-info-json` ke argumen yt-dlp saat download lagu.
- Setiap lagu yang didownload sekarang otomatis menyimpan file thumbnail `.jpg` di folder yang sama dengan file `.mp3`.

#### API Audio List (`server.js`)
- Endpoint `GET /api/audio/list` kini mendeteksi file thumbnail `.jpg` dengan nama yang sama seperti `.mp3`-nya.
- Jika thumbnail ditemukan, field `thumbnailUrl` (berupa path `/profile_music/<nama>.jpg`) disertakan di response JSON.
- Jika tidak ada thumbnail, `thumbnailUrl` bernilai `null`.

#### Tampilan Daftar Lagu (`src/client/js/profile.js`)
- Daftar lagu di `studentAudioFilesList` pada halaman profile kini menampilkan **foto thumbnail** di sebelah kiri judul lagu.
- Jika `thumbnailUrl` tersedia → render `<img>` dengan class `audio-file-thumbnail`.
- Jika tidak ada thumbnail → render placeholder ikon `fa-music` dengan class `audio-file-thumbnail-placeholder`.
- Diimplementasi pada dua fungsi render: initial load dan `refreshStudentAudioList()`.
- Ikon `fa-file-audio` lama dihapus dari judul lagu.

#### Responsif Mobile (`src/client/styles/style.css`)
- Di `@media (max-width: 768px)`: `.audio-file-item` berubah `align-items` dari `flex-start` ke `center`; thumbnail diperbesar ke `120×120px`; teks info dan meta diratakan tengah.
- Di `@media (max-width: 480px)`: thumbnail dikecilkan ke `100×100px`.

---

## [3.3.2] — 2026-05-11

### Added — Admin: Pin Foto ke Urutan Teratas (`admin-dashboard.js`, `admin-dashboard.css`)
- Setiap kartu foto di tab Kolase sekarang memiliki tombol **pin** (ikon thumbtack) di area overlay.
- Klik pin → foto dipindah ke urutan paling atas di halaman kolase untuk semua user; klik lagi → unpin.
- Foto yang di-pin ditandai dengan **badge kuning** di pojok kanan atas kartu dan **outline kuning** pada border kartu (`is-pinned` class).
- Ditambah fungsi `togglePinPhoto(filename, pin)` yang memanggil `PATCH /api/admin/kolase/pin/:filename`.
- Ditambah CSS: `.btn-pin`, `.btn-pin-active`, `.photo-pin-badge`, `.kolase-item.is-pinned`.
- Server endpoint `PATCH /api/admin/kolase/pin/:filename` sudah ada sejak sebelumnya dan sudah aktif digunakan.

### Changed — Admin: Limit Tampil Foto Grid Dinaikkan (`admin-dashboard.js`)
- Grid foto di tab Kolase sebelumnya hanya menampilkan **20 foto** pertama (`slice(0, 20)`).
- Sekarang dinaikkan menjadi **50 foto** (`slice(0, 50)`) agar semua foto bisa diakses dan di-pin tanpa harus delete dulu.

---

## [3.3.1] — 2026-05-11

### Added — Admin: Drag-to-Reorder Video & Ubah Tipe Foto (`admin-dashboard.js`, `admin-dashboard.css`, `server.js`)

#### Ubah Tipe Foto
- Setiap kartu foto di grid Kolase sekarang menampilkan `<select>` dropdown (Boy / Girl / Walas / All) menggantikan badge statis yang tidak bisa diedit.
- Perubahan tersimpan langsung via `PATCH /api/admin/kolase/photo/:filename` — warna dropdown ikut berubah sesuai tipe.
- Ditambah endpoint baru `PATCH /api/admin/kolase/photo/:filename` di `server.js` yang memperbarui `photoType` di `database.json`.

#### Drag-to-Reorder Video
- Video grid sekarang mendukung **drag & drop** untuk mengubah urutan tayang video di halaman kolase.
- Setiap kartu video menampilkan **nomor urut** (badge bulat pojok kiri atas) dan ikon grip.
- Setelah drag, tombol **"Simpan Urutan"** muncul — klik untuk menyimpan urutan ke server via `POST /api/admin/kolase/reorder-videos`.
- Ditambah endpoint `POST /api/admin/kolase/reorder-videos` di `server.js` yang menyimpan array `videoOrder` ke `database.json`.
- `GET /api/gallery/videos` dan `GET /api/admin/kolase` keduanya sekarang membaca `videoOrder` dan mengurutkan video sesuai pilihan admin.
- Ditambah CSS: `.drag-over-item` (outline dashed saat hover), `.video-order-badge`.

---

## [3.3.0] — 2026-05-11

### Fixed — Reels Enter Hint Menghilang Setelah Muncul (`kolase.js`)
- **Penyebab**: Rubber-band animation (`translateY`) yang dipicu bersamaan dengan `showEnterHint()` menyebabkan `scroll` event terpicu sesaat setelahnya. Scroll event memanggil `cancelEnterHint()` karena `isSnappedAtVideoSection()` sementara return `false` (halaman bergerak), sehingga hint langsung menghilang sebelum user sempat melihatnya.
- **Fix**: Ditambah variabel `hintShowTime` yang dicatat saat `showEnterHint()` dipanggil. Di `cancelEnterHint()` ditambah **grace period 600ms** — jika dipanggil sebelum 600ms berlalu sejak hint muncul, cancel diabaikan. Ini cukup untuk menunggu rubber-band selesai tanpa menghalangi user meng-cancel secara manual.

---

## [3.2.5] — 2026-05-11

### Fixed — Mobile ≤430px: Tampilan Kolase, Login Modal & Music Footer (`style.css`, `kolase.html`)

#### Halaman Kolase — Page Header & Filter Buttons
- Ditambah `@media (max-width: 430px)` di `<style>` inline `kolase.html`.
- `.page-header h1` dikecilkan dari `1.8rem` → `1.35rem`; `.page-header p` dari `1rem` → `0.82rem`.
- Tombol filter (`.photo-filter-btn`) — padding, font-size, dan border-radius dikurangi via `!important` untuk override inline style.
- Div pembungkus tombol filter diberi class `memories-filter-container` untuk memudahkan targeting CSS.

#### Landing Page — Login Modal Tabs
- Ditambah `@media (max-width: 430px)` di `style.css` untuk `.tab-btn`: padding dikurangi ke `0.55rem 0.5rem`, font-size ke `0.78rem`, border-radius ke `10px`.

#### Semua Halaman — Music Footer
- Di `@media (max-width: 430px)`, `.footer-center` dan `.footer-right` disembunyikan (`display: none !important`).
- Hanya `footer-left` (ikon headphone + teks "RPL Class of 2026") yang tampil di mobile kecil.
- Berlaku otomatis untuk semua halaman: beranda, kolase, wali-kelas, profile.

---

## [3.2.4] — 2026-05-11

### Changed — `reels-enter-hint` Posisi & Animasi Diubah ke Tengah Layar (`style.css`, `kolase.js`)

#### Posisi (`style.css`)
- **Sebelumnya**: `bottom: 1.8rem; left: 50%; transform: translateX(-50%)` — popup muncul di bagian bawah layar.
- **Sekarang**: `top: 0; left: 0; right: 0; bottom: 0; margin: auto` — popup berada tepat di tengah layar secara vertikal maupun horizontal, tanpa bergantung pada `transform` untuk centering (agar tidak bentrok dengan anime.js).
- Layout diubah dari **horizontal** (`flex-direction: row`) menjadi **vertikal** (`flex-direction: column; align-items: center`) — icon di atas, teks di tengah, tombol di bawah.
- Icon diperbesar (`2.2rem`) dengan lingkaran background `rgba(255,255,255,0.1)` berukuran `60×60px`.
- Tombol aksi sekarang `flex: 1` dan melebar penuh sejajar (`width: 100%`).
- `white-space: nowrap` dihapus agar teks sub bisa wrap pada layar sempit.

#### Backdrop (`kolase.html`, `style.css`, `kolase.js`)
- Ditambah elemen baru `#reels-enter-backdrop` (tepat sebelum `#reels-enter-hint` di HTML) sebagai overlay gelap `rgba(0,0,0,0.5)` fullscreen `z-index: 8499`.
- Toggle `.show` pada backdrop dilakukan bersamaan dengan popup di `showEnterHint()` dan `cancelEnterHint()`.
- Menggantikan pendekatan `::before` pseudo-element yang tidak bisa `position: fixed` dengan benar.

#### Animasi (`kolase.js`)
- **Sebelumnya**: slide up `translateY 30px → 0` / slide down `translateY 0 → 20px`.
- **Sekarang**: **scale popup** `0.7 → 1` + fade in (`easeOutBack`, 420ms) saat muncul; `1 → 0.8` + fade out (`easeInQuad`, 260ms) saat tutup.
- Dihapus `translateX/Y` dari `anime.set()` karena centering tidak lagi pakai `transform`.

---

## [3.2.3] — 2026-05-11

### Added — Label Hint Scroll Video Mobile (`kolase.html`)
- Ditambah elemen `#scroll-video-hint` tepat di bawah `</main>` — hanya tampil di mobile (≤768px) via `@media`.
- Teks: *"Paksa scroll ke bawah buat liat video!"* dengan ikon `fa-chevron-down` di kiri dan kanan.
- Animasi **bounce** naik-turun (`hintBounce` keyframe, 1.6s infinite) agar menarik perhatian tanpa mengganggu.
- Warna mengikuti `var(--text-secondary)` — otomatis menyesuaikan dark/light mode.

---

## [3.2.2] — 2026-05-11

### Fixed — Auto-masuk Reels saat Halaman Load (`kolase.js`)
- **Penyebab**: Class `kolase-page` langsung ditambah ke `html/body` saat JS init → `scroll-snap-type: y proximity` aktif sebelum konten galeri foto selesai di-render secara dinamis → browser bisa auto-snap ke posisi yang kebetulan memenuhi threshold `isSnappedAtVideoSection()` → swipe sekecil apapun (bahkan saat loading) bisa trigger dialog konfirmasi Reels.
- **Fix**: Class `kolase-page` sekarang hanya ditambah via `enableScrollSnap()` yang dipanggil dari event `window.load` + delay **800ms** sebagai buffer. Memastikan semua konten dinamis (galeri foto dari API) sudah ter-render sebelum snap aktif. Guard tambahan `if (!snapEnabled) return false` di `isSnappedAtVideoSection()` mencegah trigger apapun sebelum snap benar-benar diaktifkan.

### Fixed — Video-gallery-section Terlihat di Mobile (`style.css`)
- **Penyebab**: Tidak ada CSS yang menyembunyikan `.video-gallery-section` di mobile. User bisa scroll ke section tersebut dan melihat layout player desktop yang tidak dioptimasi untuk layar kecil.
- **Fix**: Ditambahkan `display: none !important` pada `.video-gallery-section` di dalam `@media (max-width: 768px)`. Section ini sepenuhnya tidak terlihat di mobile — satu-satunya cara melihat video adalah lewat **Reels mode fullscreen**. Desktop tidak terpengaruh.
- Efek rubber-band saat overscroll diupdate target dari `videoSection` (hidden) ke `#memoriesContainer` agar animasi tetap bisa terlihat user.

---

## [3.2.1] — 2026-05-11

### Added — Anime.js Transitions untuk Reels Mode (`kolase.js`, `style.css`)
Semua transisi masuk/keluar Reels mode sekarang dikontrol penuh oleh **anime.js** — CSS `transition` dan `@keyframes` pada overlay dihapus.

#### Transisi Masuk (`enterReelsMode`)
Timeline 3 tahap berurutan via `anime.timeline()`:
1. **Halaman utama** — `scale 1 → 0.94` + opacity fade out (`easeInQuart`, 320ms) — kesan "masuk ke dalam layar".
2. **Overlay reels** — slide dari bawah `translateY 100% → 0%` + fade in (`easeOutQuart`, 520ms), overlap 80ms dengan step 1.
3. **UI elements** (✕, counter, volume) — muncul dengan `anime.stagger(60ms)` per elemen, `easeOutBack` untuk efek bounce kecil (300ms).

#### Transisi Keluar (`exitReelsMode`)
Timeline 3 tahap berurutan:
1. **UI elements** — fade out + slide ke atas sedikit (`easeInQuad`, 180ms).
2. **Overlay reels** — slide keluar ke bawah `translateY 0% → 100%` + fade out (`easeInQuart`, 440ms), overlap 60ms.
3. **Halaman utama** — `scale 0.94 → 1` + fade in (`easeOutQuart`, 360ms), overlap 200ms — muncul saat overlay masih bergerak untuk transisi seamless.

#### Dialog Konfirmasi (`showEnterHint` / `cancelEnterHint`)
- **Muncul**: `anime()` slide up `translateY 30px → 0` + fade in (`easeOutBack`, 380ms) — efek spring ringan.
- **Tutup**: `anime()` slide down + fade out (`easeInQuad`, 240ms).
- CSS `@keyframes reels-hint-slide-up` dihapus — anime.js yang mengontrol sepenuhnya.

### Added — Mobile Page Scroll Snap + Overscroll Trigger (`kolase.js`, `style.css`)
Perilaku scroll halaman Kolase di mobile diubah total:

- **Scroll snap** aktif di `html.kolase-page` (`scroll-snap-type: y proximity`) — halaman berhenti natural setelah galeri foto habis.
- **Overscroll trigger**: jika user paksa swipe ke bawah `>55px` dalam `<600ms` saat sudah di posisi bawah halaman, muncul dialog konfirmasi Reels + efek **rubber-band** anime.js pada `#memoriesContainer` (naik 14px lalu bounce balik).
- Scroll kembali ke atas → dialog konfirmasi otomatis hilang dengan animasi.
- Class `kolase-page` ditambah ke `html`/`body` via JS (bukan langsung di HTML) agar snap hanya aktif setelah halaman fully loaded.

---

## [3.2.0] — 2026-05-11

### Added — Mobile Reels Mode (Kolase)
Fitur baru di halaman Kolase: mode tampilan video fullscreen bergaya Instagram Reels / TikTok, **khusus mobile** (≤768px). Desktop tidak terpengaruh sama sekali.

#### Trigger & Konfirmasi
- Saat user scroll mentok ke bawah dan section **Our Video** terlihat di viewport, sistem menunggu **2 detik** lalu menampilkan **dialog konfirmasi** dari bawah layar (slide-up animation).
- Dialog berisi: ikon 🎬, teks "Mode Reels" + subjudul "Masuk tampilan video fullscreen?", tombol **"Masuk"** (putih) dan **"Batal"** (transparan).
- Jika user scroll kembali sebelum menekan tombol, dialog otomatis hilang.
- User yang memilih "Batal" tidak masuk mode reels — tidak ada auto-enter paksa.

#### Tampilan Reels (Instagram-style)
- **Video `object-fit: cover`** — mengisi penuh layar portrait, tidak ada sisi kosong hitam.
- **Gradient atas & bawah** untuk readability UI seperti Instagram Reels asli.
- **Scroll snap vertikal** — geser ke atas/bawah antar video dengan snapping mulus.
- **Tap area tengah** untuk play/pause; ikon play besar muncul animasi saat video pause.
- **Action buttons di kanan** (❤️ Suka, ↗ Bagikan, 🔇 Suara) — persis layout Instagram Reels.
- **Info judul + nama channel** di kiri bawah dengan ikon vinyl.
- **Progress bar tipis** di atas area info.
- **Counter video** (misal `2 / 5`) di pojok kiri atas.
- **Tombol ✕** di pojok kanan atas untuk keluar.

#### Transisi (awal — sebelum upgrade ke anime.js di v3.2.1)
- **Masuk**: slide dari bawah layar + fade-in via CSS transition.
- **Keluar**: slide ke atas + fade-out via CSS transition.

#### Cara Keluar
- Tombol ✕ di pojok kanan atas.
- Swipe ke bawah saat berada di video pertama.
- Scroll paksa ke atas di video pertama (overscroll gesture).

#### Isolasi Desktop
- Semua elemen HTML reels mendapat `display: none` secara global.
- Di viewport `min-width: 769px` dipaksa `display: none !important; visibility: hidden !important` — layout desktop tidak bisa terpengaruh sama sekali meski ada JS yang berjalan.

#### File yang Diubah
- **`public/kolase.html`** — tambah HTML overlay reels (overlay, scroll container, close button, counter, volume toggle, exit hint, enter hint dengan tombol konfirmasi).
- **`src/client/styles/style.css`** — tambah blok CSS reels seluruhnya dalam `@media (max-width: 768px)` + default hidden di luar media query.
- **`src/client/js/kolase.js`** — tambah IIFE `initReelsMode()` di akhir file dengan guard `if (window.innerWidth > 768) return`.

---

### Changed — Autoplay Video Dihapus (Kolase)
Video di halaman Kolase sekarang **hanya diputar manual** oleh user — tidak ada autoplay sama sekali.

- **`IntersectionObserver`** sekarang hanya melakukan **pause** saat section keluar viewport. Tidak lagi auto-play saat section masuk viewport.
- **Auto-rotate timer 38 detik** dihapus sepenuhnya (`scheduleAutoRotate` → no-op).
- **`showVideo()`** tidak lagi memanggil `requestVideoPlay()` saat ganti video — video hanya berganti tampilan, user yang memulai play via tombol.
- Flag `window._videoUserPaused` dan `window._resetVideoAutoRotate` dibersihkan karena tidak relevan lagi.

---

### Fixed — Video Stream 400 Bad Request untuk Nama File dengan `..` (`server.js`)
- **Penyebab**: Validasi keamanan di endpoint `GET /api/video/stream/:filename` menolak semua filename yang mengandung `..` (double dot). Nama file video dari TikTok/Instagram sering mengandung `..` di tengah sebagai bagian dari nama aslinya (contoh: `1778462258904_AQOLjv…NFnDAwPHo3..mp4`), sehingga selalu di-reject dengan `400 Bad Request` → error `MEDIA_ELEMENT_ERROR: Format error` di browser.
- **Fix**: Regex validasi diperketat — hanya menolak pola *path traversal* asli (`../`, `..\`, `^..`) bukan sekadar kehadiran `..` di mana saja dalam nama file. Keamanan tetap terjaga, video dengan `..` di nama file bisa distream normal.

---

## [3.1.0] — 2026-05-10

### Changed — Video Streaming Refactor (TikTok-style delivery)
Refaktor total pipeline video, dari upload ke streaming, untuk mengejar target "video jernih, ukuran kecil, streaming mulus" seperti TikTok.

#### Server — `src/server/media/videoOptimizer.js`
- **Rewrite penuh** dengan profil encoder yang lebih efisien:
  - `libx264 high@4.0`, `preset=slow`, `-tune film`, `CRF 22` untuk 720p/auto (sebelumnya CRF 23 preset medium). CRF 23 untuk 480p, CRF 25 untuk 360p.
  - **Aspect-ratio preserving scale**: tidak lagi memaksa 1280x720 pada semua video. Scale longest-edge saja (720p → 1280px, 480p → 854px, 360p → 640px), sisi lain dihitung otomatis (`-2`) agar tetap genap. Video portrait (TikTok 9:16) tetap portrait, landscape tetap landscape.
  - **Keyframe tiap ~2 detik** (`-g fps*2`, `-keyint_min`, `-sc_threshold 0`) → scrubbing/seek responsif seperti TikTok, tidak perlu re-buffer saat geser timeline.
  - **Frame-rate cap 30fps** → mengurangi ukuran file tanpa kehilangan smoothness pada tampilan `<video>` di carousel.
  - **`yuv420p`** eksplisit → kompatibilitas lebar browser (Safari khususnya menolak yuv444/422).
  - **Audio `loudnorm=I=-16:TP=-1.5:LRA=11`** + `AAC 128k` stereo 44.1kHz → loudness konsisten antar klip (ciri khas TikTok "semua clip sama keras").
  - **`-movflags +faststart+use_metadata_tags`** → moov atom di depan file, `<video>` bisa mulai play sebelum download selesai.
- **Encode order: lowest-first** (`360p → 480p → 720p → auto`) agar variant mobile-fallback tersedia paling cepat setelah upload selesai.
- **`auto` variant = copy dari 720p** (tidak re-encode) untuk hemat CPU, tetap backward-compatible dengan kontrak `/api/gallery/videos`.
- **API shape tetap sama** (`optimizedVideos.{auto,720p,480p,360p}`), tidak ada breaking change untuk `server.js` / `kolase.js` yang sudah ada.
- Helper baru: `probeVideoDimensions()` (ffprobe: width, height, fps), `buildVideoFilter()` (generate VF chain per orientation), `buildVariantInfo()` (payload per variant).

#### Server — `server.js`
- **Endpoint baru `GET /api/video/stream/:filename?quality=auto|720p|480p|360p`**:
  - Single URL untuk streaming: client tinggal hit `/api/video/stream/<file>`, server yang memilih variant optimized terbaik berdasarkan query `quality` dengan fallback chain (requested → 720p → auto → 480p → 360p → original).
  - **Explicit byte-range handling**: `Accept-Ranges: bytes`, `Content-Range`, 206 Partial Content untuk Range request, 416 jika out-of-range.
  - **Cache-Control `public, max-age=31536000, immutable`** untuk variant optimized (nama file di-hash content, aman cache selamanya). Original file dapat `max-age=3600`.
  - **Security**: reject filename yang mengandung `..`, `/`, atau `\` untuk mencegah path traversal.
  - Content-Type eksplisit `video/mp4` agar iOS Safari mau inline playback.
- **`/api/gallery/videos` response**: menambah field `streamUrl: /api/video/stream/<filename>` pada setiap video agar client bisa langsung pakai unified endpoint.

#### Client — `src/client/js/kolase.js`
- **Fallback chain video di-reorder**: sekarang prioritas 0 = `streamUrl` (4 variant dengan query `?quality=`), prioritas 1 = URL optimized langsung, prioritas 2 = original URL. Memberi throughput/scrubbing terbaik sekaligus graceful degradation kalau endpoint streaming bermasalah.

### Fixed
- **Kolase — Bug video start/pause saat di-scroll**:
  - Penyebab: `IntersectionObserver` dengan `threshold: 0.3` memicu `play()` / `pause()` berkali-kali saat user scroll melewati 30% boundary. Handler firing berulang per piksel scroll → video oscillate antara play dan pause → efek "start/pause saat scroll" yang dilaporkan.
  - **Fix**:
    1. `threshold: 0` + `rootMargin: '-30% 0% -30% 0%'` — transition hanya fire saat section benar-benar keluar/masuk viewport, bukan pada setiap gerakan scroll kecil.
    2. **Scroll-state aware**: flag `isScrolling` di-set oleh `window.addEventListener('scroll')`. Saat scrolling aktif, keputusan play/pause di-queue saja, lalu di-apply setelah scroll selesai (~140ms idle).
    3. **Debounce 120ms** pada IntersectionObserver callback → quick in/out crossing tidak sampai ke video element.
    4. **Honor user intent**: flag `window._videoUserPaused` — jika user explicit pause (tombol play/pause / overlay button / spacebar), observer **tidak akan** auto-resume pada intersection berikutnya. Flag di-reset saat user next/prev/swipe (navigasi eksplisit = restart play).

### Added — Beranda Social Media Badges + Song Info
Fitur baru di halaman Beranda untuk setiap profile yang aktif di music player.

#### Frontend
- **Social media badges** muncul di `player-top-section`, tepat di bawah `playerSubtitle`. Mendukung 6 platform: **Instagram, TikTok, LinkedIn, Facebook, Twitter, Threads**.
  - Badge berupa inline SVG (bukan Font Awesome) untuk konsistensi visual dan coloring via `currentColor`.
  - Diklik → buka profile di tab baru (`target="_blank" rel="noopener"`).
  - **Opsional**: badge hanya muncul untuk platform yang diisi di profile. Kalau tidak diisi, badge tidak di-render sama sekali. Kalau semua kosong, container di-hide total.
  - Hover per platform → warna brand official (Instagram pink, TikTok merah, LinkedIn biru, Facebook biru, Twitter, Threads).
- **Song info** (`#playerSongInfo`) muncul di bawah badges (atau di bawah `playerSubtitle` kalau badges kosong):
  - Format: `<spinning vinyl icon> <song title> • <artist name>`
  - Pill style dengan border radius 999px, icon vinyl berputar (animasi CSS `songInfoSpin 6s linear`).
  - Hide kalau `lyricsSongTitle` dan `lyricsArtistName` dua-duanya kosong. Divider titik (`•`) auto-hide kalau salah satu kosong.

#### Profile Form
- Section baru **"Sosial Media"** di bawah "Kesan & Pesan" di `public/profile.html`:
  - 6 input text (opsional) dengan label icon berwarna brand masing-masing.
  - Support 2 format input: username saja (contoh: `johndoe`) atau full URL (`https://instagram.com/johndoe`). Normalizer di client side (`normalizeSocialUrl`) mengonversi username ke URL lengkap per platform.
- **Helpers baru di `profile.js`**:
  - `SOCIAL_MEDIA_FIELDS` — mapping 6 platform → DOM id suffix.
  - `collectSocialMediaFromForm(context)` — baca semua input social-media dari form (student/admin) → object.
  - `populateSocialMediaForm(socialMedia, context)` — isi form dari student record.
- Form student (`studentProfileForm`) dan admin edit form → keduanya menyimpan `socialMedia` object saat submit.

#### Server
- **`PUT /api/students/:id`** sekarang menerima dan menyimpan field `socialMedia`:
  - Hanya 6 key yang di-whitelist (`instagram`, `tiktok`, `linkedin`, `facebook`, `twitter`, `threads`).
  - Semua value di-coerce ke string dan di-trim.
  - Empty string dipertahankan (user bisa "clear" platform dengan mengosongkan input).
  - Jika request tidak mengirim `socialMedia` sama sekali, value lama di database tetap dipertahankan (tidak overwrite).

### Styles
- CSS baru `.player-social-badges` + `.social-badge-*` di `style.css` dengan hover brand color per platform.
- CSS baru `.player-song-info` (pill UI + spinning vinyl icon animation).
- Responsive: pada mobile (`≤768px`) badges center-aligned dan size dikecilkan (`32x32`, SVG `16x16`), song info font size `0.75rem`.

---

## [3.0.2] — 2026-05-10

### Fixed
- **Admin Dashboard — Data realtime tanpa refresh**: Auto-refresh interval dipercepat ke 3 detik. Overview, Accounts, Visitors, Login History, dan Timeline selalu update otomatis. Tab Profiles & Kolase hanya re-render saat aktif (mencegah gangguan saat upload).
- **Admin Dashboard — Kolase upload dipisah foto & video**: Tab Kolase sekarang memiliki 2 area upload terpisah — satu untuk foto (dengan selector tipe: Boy RPL, Girl RPL, With Teacher) dan satu untuk video. `photoType` dikirim ke server saat upload foto.
- **Kolase — Foto tidak ter-crop**: `object-fit` pada `.memory-frame img` diubah dari `cover` ke `contain`. Foto sekarang ditampilkan utuh menyesuaikan bingkai tanpa terpotong. Background frame diberi warna agar area kosong tidak terlihat aneh.

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