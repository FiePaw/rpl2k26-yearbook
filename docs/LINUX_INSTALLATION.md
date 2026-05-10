# 📘 Linux Ubuntu 22.x Installation Guide

Panduan lengkap untuk menginstal dan menjalankan Yearbook RPL 2026 di Ubuntu Linux 22.x.

## 📋 Daftar Isi

- [Prasyarat](#prasyarat)
- [Langkah Instalasi](#langkah-instalasi)
- [Konfigurasi](#konfigurasi)
- [Menjalankan Aplikasi](#menjalankan-aplikasi)
- [Troubleshooting](#troubleshooting)

---

## 🔧 Prasyarat

Pastikan sistem Anda memenuhi persyaratan berikut:

- **OS**: Ubuntu Linux 22.04 LTS atau lebih baru
- **RAM**: Minimal 2GB (4GB recommended)
- **Storage**: Minimal 1GB untuk aplikasi dan dependencies
- **Internet**: Koneksi internet yang stabil

### Verifikasi Ubuntu Version

```bash
lsb_release -a
```

---

## 📥 Langkah Instalasi

### 1️⃣ Update System Package Manager

Pertama, perbarui package manager sistem:

```bash
sudo apt update
sudo apt upgrade -y
```

### 2️⃣ Install Node.js dan npm

Yearbook memerlukan Node.js versi 14 atau lebih baru. Install menggunakan NodeSource repository:

```bash
# Download setup script untuk Node.js v18 (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js (termasuk npm)
sudo apt install -y nodejs
```

Verifikasi instalasi:

```bash
node --version
npm --version
```

**Output yang diharapkan:**
- Node.js v18.x.x atau lebih baru
- npm v9.x.x atau lebih baru

### 3️⃣ Install Python 3 dan pip

Aplikasi ini menggunakan Python untuk beberapa tools seperti `spotdl` dan TikTok downloader:

```bash
sudo apt install -y python3 python3-pip python3-venv
```

Verifikasi instalasi:

```bash
python3 --version
pip3 --version
```

### 4️⃣ Install FFmpeg

FFmpeg diperlukan untuk video optimization dan processing:

```bash
sudo apt install -y ffmpeg
```

Verifikasi instalasi:

```bash
ffmpeg -version | head -5
```

### 5️⃣ Install Git (Opsional)

Untuk memudahkan clone atau update project:

```bash
sudo apt install -y git
```

### 6️⃣ Clone atau Transfer Project

#### Opsi A: Gunakan Git (jika project ada di repository)

```bash
cd ~
git clone <URL_REPOSITORY_ANDA> yearbook
cd yearbook
```

#### Opsi B: Transfer dari Windows menggunakan SCP

Jika Anda menggunakan Windows, gunakan PowerShell untuk mentransfer folder:

```powershell
# Di Windows (PowerShell)
scp -r C:\Users\RYR\Desktop\Yearbook2 username@linux-ip:/home/username/yearbook
```

Atau gunakan WinSCP (GUI tool) untuk transfer folder secara visual.

#### Opsi C: Copy Manual

```bash
# Buat folder project
mkdir -p ~/yearbook
cd ~/yearbook

# Copy semua file dari Windows ke Linux
# Gunakan USB drive, cloud storage, atau network transfer
```

### 7️⃣ Install Node.js Dependencies

Masuk ke folder project dan install dependencies:

```bash
cd ~/yearbook

# Install packages dari package.json
npm install
```

Proses ini akan menginstal:
- express (Web framework)
- cors (Cross-origin support)
- multer (File upload handling)
- axios (HTTP client)
- cheerio (HTML parsing)
- @google/generative-ai (Gemini API)
- nodemon (Development tool)

### 8️⃣ Install Python Dependencies

Install tools Python yang diperlukan:

```bash
# Install Spotify downloader
pip3 install spotdl

# Install yt-dlp (untuk YouTube dan TikTok)
pip3 install yt-dlp

# Install dependencies lainnya (jika ada file requirements.txt)
# pip3 install -r requirements.txt
```

Verifikasi instalasi:

```bash
spotdl --version
yt-dlp --version
```

---

## ⚙️ Konfigurasi

### 1. Setup Lingkungan (Environment Variables)

Buat file `.env` untuk menyimpan konfigurasi sensitif:

```bash
nano ~/.env_yearbook
```

Tambahkan konfigurasi berikut:

```env
# Port untuk aplikasi
PORT=3000

# Gemini API Key (jika digunakan)
GEMINI_API_KEY=your_api_key_here

# Node Environment
NODE_ENV=production
```

Atau untuk development:

```env
PORT=3000
NODE_ENV=development
```

### 2. Setup Folder Struktur

Aplikasi akan membuat folder berikut secara otomatis:

```bash
~/yearbook/
├── public/              # Static files (HTML, CSS, JS)
├── profile_music/       # Downloaded music files
├── OurGallery/          # Gallery images and videos
├── lyrics_cache/        # Cached lyrics
├── downloads/           # Download folder
└── temp/                # Temporary files
```

Jika perlu membuat manual:

```bash
mkdir -p ~/yearbook/{public,profile_music,OurGallery,lyrics_cache,downloads,temp}
```

### 3. Konfigurasi File Database

Database menggunakan JSON files. Pastikan file berikut ada:

```bash
# File akan dibuat otomatis saat server pertama kali dijalankan
# Jika ingin copy dari Windows:
# - database.json
# - nameMurid.json
# - nameGuru.json
# - adminbase.json
```

---

## 🚀 Menjalankan Aplikasi

### Opsi 1: Development Mode (Dengan Auto-Reload)

```bash
cd ~/yearbook
npm run dev
```

Output yang diharapkan:
```
Server is running on http://localhost:3000
```

### Opsi 2: Production Mode

```bash
cd ~/yearbook
npm start
```

### Opsi 3: Menggunakan PM2 (Recommended untuk Production)

PM2 adalah process manager yang memastikan aplikasi terus berjalan:

#### Install PM2 Globally

```bash
sudo npm install -g pm2
```

#### Start Aplikasi dengan PM2

```bash
cd ~/yearbook
pm2 start server.js --name "yearbook"
```

#### Useful PM2 Commands

```bash
# Lihat status aplikasi
pm2 status

# Lihat logs
pm2 logs yearbook

# Restart aplikasi
pm2 restart yearbook

# Stop aplikasi
pm2 stop yearbook

# Start ulang saat reboot
pm2 startup
pm2 save
```

### Opsi 4: Menggunakan Systemd Service (Advanced)

Buat systemd service untuk auto-start:

```bash
sudo nano /etc/systemd/system/yearbook.service
```

Salin konfigurasi berikut:

```ini
[Unit]
Description=Yearbook RPL 2026
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/home/YOUR_USERNAME/yearbook
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Ganti `YOUR_USERNAME` dengan username Linux Anda.

Kemudian:

```bash
# Enable service
sudo systemctl enable yearbook

# Start service
sudo systemctl start yearbook

# Check status
sudo systemctl status yearbook

# View logs
sudo journalctl -u yearbook -f
```

---

## 🌐 Akses Aplikasi

Setelah server berjalan, akses aplikasi melalui:

### Local Access
```
http://localhost:3000
```

### Remote Access (dari komputer lain)

Dapatkan IP address Linux Anda:

```bash
hostname -I
```

Kemudian akses dari komputer lain:
```
http://<LINUX_IP>:3000
```

Contoh: `http://192.168.1.100:3000`

---

## 🔗 Mengakses Melalui Domain

Jika ingin mengakses melalui domain, setup Nginx sebagai reverse proxy:

### Install Nginx

```bash
sudo apt install -y nginx
```

### Konfigurasi Nginx

```bash
sudo nano /etc/nginx/sites-available/yearbook
```

Salin konfigurasi berikut:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    client_max_body_size 500M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable konfigurasi:

```bash
sudo ln -s /etc/nginx/sites-available/yearbook /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Setup SSL dengan Certbot (HTTPS)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 📊 Monitoring dan Logs

### View Real-time Logs

```bash
# Jika menggunakan npm start
tail -f ~/.npm/_logs/*.log

# Jika menggunakan PM2
pm2 logs yearbook

# Jika menggunakan systemd
sudo journalctl -u yearbook -f
```

### Check Server Port

```bash
# Verify port 3000 is listening
sudo netstat -tlnp | grep 3000

# Atau gunakan ss
sudo ss -tlnp | grep 3000
```

---

## 🐛 Troubleshooting

### 1. Port 3000 Already in Use

Jika mendapat error "EADDRINUSE":

```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill process (replace PID)
kill -9 <PID>

# Atau ubah port di server.js atau environment variable
PORT=3001 npm start
```

### 2. Permission Denied pada File Upload

```bash
# Berikan permission ke folder upload
chmod -R 755 ~/yearbook/profile_music
chmod -R 755 ~/yearbook/OurGallery

# Atau dengan ownership
sudo chown -R $USER:$USER ~/yearbook/
```

### 3. spotdl Tidak Ditemukan

```bash
# Ensure Python dan pip tersedia
python3 --version
pip3 --version

# Reinstall spotdl
pip3 uninstall spotdl -y
pip3 install spotdl

# Verify installation
spotdl --version
```

### 4. FFmpeg Tidak Ditemukan

```bash
# Verify installation
which ffmpeg
ffmpeg -version

# Reinstall jika perlu
sudo apt remove ffmpeg -y
sudo apt install ffmpeg -y
```

### 5. Module Not Found Errors

```bash
# Clear npm cache dan reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### 6. CORS Errors

Pastikan server berjalan dengan CORS enabled (sudah dikonfigurasi di `server.js`):

```javascript
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));
```

### 7. Database Connection Errors

```bash
# Pastikan file database ada
ls -la ~/yearbook/*.json

# Jika kosong, database akan dibuat otomatis saat server start
# Restart server untuk membuat database
npm start
```

---

## 📈 Performance Tuning

### Increase File Upload Limit

Di `server.js`, ubah limit:

```javascript
// Dari 50MB
app.use(express.json({ limit: '50mb' }));

// Menjadi sesuai kebutuhan (contoh 100MB)
app.use(express.json({ limit: '100mb' }));
```

### Enable Gzip Compression

```bash
# Install compression package
npm install compression

# Tambah di server.js
const compression = require('compression');
app.use(compression());
```

### Optimize Memory Usage

Untuk production dengan PM2:

```bash
# Monitor memory usage
pm2 monit

# Set memory limit
pm2 start server.js --max-memory-restart 512M
```

---

## 🔒 Security Best Practices

### 1. Ubah Admin Password

Di `server.js` baris ~250, ubah password admin:

```javascript
// DARI:
if (adminId === 'admin' && password === 'RYRisADMIN') {

// MENJADI:
if (adminId === 'admin' && password === 'STRONG_PASSWORD_HERE') {
```

### 2. Ubah Teacher Password

Di `server.js` baris ~247, ubah password teacher:

```javascript
// DARI:
if (password === 'RPL2k26') {

// MENJADI:
if (password === 'STRONG_PASSWORD_HERE') {
```

### 3. Enable Firewall

```bash
# Enable UFW firewall
sudo ufw enable

# Allow SSH (jangan lock yourself out!)
sudo ufw allow 22/tcp

# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS
sudo ufw allow 443/tcp

# Allow custom port jika tidak menggunakan port 80
sudo ufw allow 3000/tcp
```

### 4. Regular Backups

```bash
# Backup database dan uploaded files
tar -czf ~/yearbook_backup_$(date +%Y%m%d).tar.gz ~/yearbook/

# Copy backup ke lokasi aman
cp ~/yearbook_backup_*.tar.gz /backup/location/
```

---

## 📱 Cek Konektivitas

### Test dari Linux Server

```bash
# Test localhost
curl http://localhost:3000

# Test API endpoint
curl http://localhost:3000/api/students/names
```

### Test dari Windows Client

```powershell
# PowerShell
Invoke-WebRequest -Uri "http://<LINUX_IP>:3000"

# Atau dengan curl (Windows 10+)
curl http://<LINUX_IP>:3000
```

---

## 📚 Additional Resources

### Documentation Files

- `ADMINBASE_DOCUMENTATION.md` - Admin panel documentation
- `ANIMATION_MIGRATION_SUMMARY.md` - Animation updates
- `LANDING_OPTIMIZATION.md` - Landing page optimization
- `RESPONSIVE_IMAGES_OPTIMIZATION.md` - Image optimization

### Useful Links

- [Node.js Official Documentation](https://nodejs.org/docs/)
- [Express.js Documentation](https://expressjs.com/)
- [PM2 Documentation](https://pm2.keymetrics.io/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [spotdl GitHub](https://github.com/spotDL/spotify-downloader)
- [yt-dlp Documentation](https://github.com/yt-dlp/yt-dlp)

---

## 📞 Support & Troubleshooting

Jika mengalami masalah:

1. **Check logs** - Lihat console output dan system logs
2. **Verify installations** - Pastikan semua dependencies terinstall dengan benar
3. **Check permissions** - Pastikan file permissions sudah tepat
4. **Test connectivity** - Verify network connectivity ke service yang dibutuhkan
5. **Search issues** - Cari di GitHub issues atau stack overflow

---

## ✅ Checklist Instalasi

- [ ] Ubuntu 22.x sudah terinstall
- [ ] Node.js dan npm sudah terinstall
- [ ] Python3 dan pip3 sudah terinstall
- [ ] FFmpeg sudah terinstall
- [ ] Git sudah terinstall (opsional)
- [ ] Project sudah ditransfer ke Linux
- [ ] npm install sudah selesai
- [ ] spotdl sudah terinstall
- [ ] yt-dlp sudah terinstall
- [ ] Database files sudah ada atau dibuat otomatis
- [ ] Server bisa dijalankan tanpa error
- [ ] Aplikasi accessible di http://localhost:3000
- [ ] Admin credentials sudah diubah
- [ ] Teacher credentials sudah diubah

---

**Last Updated**: December 2025

Untuk update terbaru atau issue, silakan check project repository atau dokumentasi lainnya.
