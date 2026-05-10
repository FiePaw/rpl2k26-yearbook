# Admin Dashboard Data Persistence - adminbase.json

## Ringkasan Perubahan

Semua data dashboard admin (Top Visited Profiles, Login History, Profile Statistics, Total Visits, Profile Updates) sekarang disimpan dan diperbarui pada file `adminbase.json`.

## File yang Dibuat/Diubah

### File Baru:
- **adminbase.json** - Database untuk menyimpan semua data tracking admin

### File yang Dimodifikasi:
- **server.js** - Menambahkan sistem penyimpanan data persistent
- **admin-dashboard.html** - Menambahkan tombol "Save to DB"
- **admin-dashboard.js** - Menambahkan handler untuk manual save

## Struktur adminbase.json

```json
{
  "profileStats": [
    {
      "id": "student_001",
      "name": "ALMA RADITYA KHALID",
      "visits": 15,
      "updates": 2,
      "lastVisit": "2025-11-24T10:30:00.000Z"
    }
  ],
  "topProfiles": [
    {
      "id": "student_031",
      "name": "RYR",
      "visits": 45
    }
  ],
  "loginHistory": [
    {
      "userId": "student_031",
      "type": "student",
      "name": "RYR",
      "timestamp": "2025-11-24T10:15:00.000Z"
    }
  ],
  "accessTimeline": {
    "09": 12,
    "10": 25,
    "11": 18
  },
  "pageVisits": {
    "student_001": 15,
    "student_002": 8,
    "student_031": 45
  },
  "profileUpdates": {
    "student_001": 2,
    "student_031": 3
  },
  "summary": {
    "totalVisits": 68,
    "totalUpdates": 5,
    "uniqueIPs": 3,
    "totalLogins": 12,
    "lastUpdated": "2025-11-24T10:30:00.000Z"
  }
}
```

## Fitur-Fitur Baru

### 1. Auto-Save (Otomatis)
- Data otomatis disimpan ke `adminbase.json` setiap **30 detik**
- Semua perubahan tracking otomatis tersimpan

### 2. Manual Save (Manual)
- Tombol "Save to DB" di dashboard untuk manual save kapan saja
- Klik tombol untuk trigger penyimpanan data ke `adminbase.json`

### 3. Data Loading
- Saat server startup, data dari `adminbase.json` otomatis dimuat
- Riwayat data tidak akan hilang meski server restart

## Endpoint API Baru

### 1. Force Save Tracking Data
```bash
POST /api/admin/save
```
**Response:**
```json
{
  "success": true,
  "message": "Tracking data saved successfully",
  "timestamp": "2025-11-24T10:30:00.000Z",
  "summary": {
    "totalVisits": 68,
    "totalUpdates": 5,
    "uniqueIPs": 3,
    "totalLogins": 12,
    "lastUpdated": "2025-11-24T10:30:00.000Z"
  }
}
```

### 2. Get All Admin Data
```bash
GET /api/admin/data
```
**Response:**
```json
{
  "success": true,
  "data": {
    "profileStats": [...],
    "topProfiles": [...],
    "loginHistory": [...],
    "accessTimeline": {...},
    "pageVisits": {...},
    "profileUpdates": {...},
    "summary": {...}
  },
  "timestamp": "2025-11-24T10:30:00.000Z"
}
```

### 3. Reset Tracking Data
```bash
POST /api/admin/reset
```
**Response:**
```json
{
  "success": true,
  "message": "Tracking data reset successfully",
  "timestamp": "2025-11-24T10:30:00.000Z"
}
```

### 4. Get Profile Statistics (Updated)
```bash
GET /api/admin/stats/profiles
```
Data sekarang dibaca dari `adminbase.json`

### 5. Get Top Visited Profiles (Updated)
```bash
GET /api/admin/stats/top-profiles
```
Data sekarang dibaca dari `adminbase.json`

### 6. Get Login History (Updated)
```bash
GET /api/admin/stats/login-history
```
Data sekarang dibaca dari `adminbase.json`

### 7. Get Access Timeline (Updated)
```bash
GET /api/admin/stats/timeline
```
Data sekarang dibaca dari `adminbase.json`

## Alur Data Tracking

```
1. User akses profile
   ↓
2. Server track visit → trackingData.pageVisits
   ↓
3. Auto-save setiap 30 detik → adminbase.json
   ↓
4. Dashboard load dari adminbase.json
   ↓
5. Admin dapat lihat semua statistik
```

## Data yang Disimpan

### Profile Statistics
- ID student
- Nama
- Total visits
- Total updates
- Last visit timestamp

### Top Visited Profiles
- Top 5 profile dengan visit terbanyak
- ID, Nama, dan jumlah visits

### Login History
- User ID
- Tipe user (student/teacher/admin)
- Nama
- Timestamp login
- Maksimal 50 entries terakhir

### Access Timeline
- Hits per jam (24 jam terakhir)
- Format: `{ "09": 12, "10": 25, ... }`

### Page Visits
- Jumlah visit per student
- Format: `{ "student_001": 15, "student_002": 8, ... }`

### Profile Updates
- Jumlah update per student
- Format: `{ "student_001": 2, "student_031": 3, ... }`

## Backup & Recovery

File `adminbase.json` merupakan backup data tracking yang persisten. Jika perlu:

1. **Backup Manual**: Copy file `adminbase.json` ke lokasi aman
2. **Recovery**: Restore file `adminbase.json` ke folder project
3. **Reset**: Call endpoint `POST /api/admin/reset` untuk reset semua data

## Catatan Penting

- Data di-update otomatis setiap 30 detik
- History login disimpan maksimal 50 entries terakhir
- IP access log disimpan di memory (tidak persistent saat ini)
- Timeline access di-reset saat server restart
- Untuk IP access realtime yang persistent, perlu konfigurasi tambahan

## Troubleshooting

### Data tidak tersimpan?
- Pastikan folder project memiliki permission write
- Check console log untuk error messages
- Coba klik tombol "Save to DB" manual

### File adminbase.json kosong?
- Delete file lalu server akan create otomatis saat startup
- Atau call endpoint `POST /api/admin/reset`

### Data lama hilang?
- Backup adminbase.json tidak overwrite
- Cek apakah ada backup di folder lain
- Load dari backup jika diperlukan

## Penggunaan di Dashboard

1. **Auto-Save**: Tidak perlu action, data otomatis tersimpan
2. **Manual Save**: Klik tombol "Save to DB" untuk force save
3. **Refresh**: Klik "Refresh Now" untuk reload data dari server
4. **Monitor**: Semua statistik terupdate real-time dari adminbase.json

---

**Last Updated**: 2025-11-24
**Version**: 1.0
