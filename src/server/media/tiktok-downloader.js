const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

/**
 * TikTok Downloader Module untuk Node.js
 * Download audio dari video TikTok menggunakan API tikwm.com
 */

class TikTokDownloader {
    constructor(outputDir = 'profile_music') {
        this.outputDir = outputDir;
        this.apiUrl = 'https://www.tikwm.com/api/';
    }

    /**
     * Membersihkan nama file dari karakter yang tidak diizinkan
     */
    sanitizeFilename(filename) {
        let sanitized = filename.replace(/[<>:"/\\|?*]/g, '');
        sanitized = sanitized.trim();
        return sanitized.slice(0, 200);
    }

    /**
     * Download file dari URL
     */
    async downloadFile(url, filePath) {
        return new Promise((resolve, reject) => {
            const protocol = url.startsWith('https') ? https : http;
            
            const file = fs.createWriteStream(filePath);
            
            protocol.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            }, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`HTTP ${response.statusCode}`));
                    return;
                }

                const totalSize = parseInt(response.headers['content-length'], 10);
                let downloadedSize = 0;

                response.on('data', (chunk) => {
                    downloadedSize += chunk.length;
                    const progress = ((downloadedSize / totalSize) * 100).toFixed(1);
                    console.log(`Progress: ${progress}%`);
                });

                response.pipe(file);

                file.on('finish', () => {
                    file.close();
                    resolve();
                });

                file.on('error', (err) => {
                    fs.unlink(filePath, () => {});
                    reject(err);
                });
            }).on('error', (err) => {
                fs.unlink(filePath, () => {});
                reject(err);
            });
        });
    }

    /**
     * Fetch data dari TikTok API
     */
    async fetchTikTokData(url) {
        return new Promise((resolve, reject) => {
            const postData = `url=${encodeURIComponent(url)}&hd=1`;

            const options = {
                hostname: 'www.tikwm.com',
                path: '/api/',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': postData.length,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 30000
            };

            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);
                        resolve(jsonData);
                    } catch (err) {
                        reject(new Error('Invalid JSON response from API'));
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.abort();
                reject(new Error('Request timeout'));
            });

            req.write(postData);
            req.end();
        });
    }

    /**
     * Download TikTok audio
     */
    async downloadTikTokAudio(url) {
        return new Promise(async (resolve, reject) => {
            try {
                // Buat folder output jika belum ada
                if (!fs.existsSync(this.outputDir)) {
                    fs.mkdirSync(this.outputDir, { recursive: true });
                    console.log(`✓ Folder '${this.outputDir}' dibuat`);
                }

                console.log(`Memproses URL: ${url}`);
                console.log('Mengambil data dari TikTok...');

                // Fetch data dari API
                const data = await this.fetchTikTokData(url);

                if (data.code === 0) {
                    const audioUrl = data.data?.music;
                    const username = data.data?.author?.unique_id || 'Unknown';

                    if (!audioUrl) {
                        throw new Error('Tidak dapat menemukan URL audio');
                    }

                    console.log(`Username: @${username}`);
                    console.log('Mengunduh audio...');

                    // Buat nama file
                    const safeUsername = this.sanitizeFilename(username);
                    const filename = `TiktokSound - ${safeUsername}.mp3`;
                    const filepath = path.join(this.outputDir, filename);

                    // Download file
                    await this.downloadFile(audioUrl, filepath);

                    const stats = fs.statSync(filepath);
                    const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);

                    console.log(`\n✓ Berhasil! File disimpan: ${filename}`);
                    console.log(`Ukuran file: ${fileSizeMB} MB`);

                    resolve({
                        success: true,
                        message: 'Download completed successfully',
                        filename: filename,
                        filepath: filepath,
                        fileSize: stats.size,
                        fileSizeMB: fileSizeMB,
                        username: username
                    });
                } else if (data.code === -1) {
                    throw new Error('URL TikTok tidak valid atau video tidak ditemukan');
                } else {
                    throw new Error(`Error dari API: ${data.msg || 'Unknown error'}`);
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Get list file MP3 di output directory
     */
    async getDownloadedTracks() {
        try {
            const files = fs.readdirSync(this.outputDir);
            const mp3Files = files
                .filter(file => file.endsWith('.mp3'))
                .map(file => ({
                    filename: file,
                    path: path.join(this.outputDir, file),
                    url: `/profile_music/${file}`
                }));
            return mp3Files;
        } catch (error) {
            console.error('Error reading downloads:', error);
            return [];
        }
    }

    /**
     * Delete file track
     */
    async deleteTrack(filename) {
        try {
            const filePath = path.join(this.outputDir, filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                return { success: true, message: 'File deleted successfully' };
            }
            return { success: false, message: 'File not found' };
        } catch (error) {
            console.error('Error deleting file:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Get file info
     */
    async getFileInfo(filename) {
        try {
            const filePath = path.join(this.outputDir, filename);
            const stats = fs.statSync(filePath);
            return {
                filename,
                size: stats.size,
                sizeInMB: (stats.size / (1024 * 1024)).toFixed(2),
                createdAt: stats.birthtime,
                modifiedAt: stats.mtime
            };
        } catch (error) {
            console.error('Error getting file info:', error);
            return null;
        }
    }
}

module.exports = TikTokDownloader;

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log("=" .repeat(50));
        console.log("🎵  TIKTOK DOWNLOADER");
        console.log("=" .repeat(50));
        console.log();
        console.log("Usage:");
        console.log("  node tiktok-downloader.js <tiktok_url> [output_dir]");
        console.log();
        console.log("Example:");
        console.log("  node tiktok-downloader.js 'https://www.tiktok.com/@user/video/...' profile_music");
        process.exit(1);
    }

    const tiktokUrl = args[0];
    const outputDir = args[1] || "profile_music";

    console.log("=" .repeat(50));
    console.log("🎵  TIKTOK DOWNLOADER");
    console.log("=" .repeat(50));
    console.log();

    const downloader = new TikTokDownloader(outputDir);
    downloader.downloadTikTokAudio(tiktokUrl)
        .then(result => {
            console.log('\n✅ Download selesai!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Download gagal:', error.message);
            process.exit(1);
        });
}
