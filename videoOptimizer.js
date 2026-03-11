/**
 * Video Optimizer Service
 * Mengoptimalkan video dengan H.264 (libx264) dan AAC untuk audio
 * Menghasilkan multiple quality versions untuk adaptive streaming
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const crypto = require('crypto');

class VideoOptimizer {
    constructor() {
        this.optimizedDir = path.join(__dirname, 'OurGallery', 'optimized');
        this.cachesDir = path.join(__dirname, 'OurGallery', 'cache');
        
        // Ensure directories exist
        if (!fs.existsSync(this.optimizedDir)) {
            fs.mkdirSync(this.optimizedDir, { recursive: true });
        }
        if (!fs.existsSync(this.cachesDir)) {
            fs.mkdirSync(this.cachesDir, { recursive: true });
        }
        
        // Quality presets untuk adaptive streaming - 720p (1280x720) sebagai default
        this.qualityPresets = {
            auto: { width: 1280, height: 720, bitrate: '2500k', label: 'Auto (1280x720)' },
            '720p': { width: 1280, height: 720, bitrate: '2500k', label: 'HD (1280x720)' },
            '480p': { width: 854, height: 480, bitrate: '1500k', label: 'SD (854x480)' },
            '360p': { width: 640, height: 360, bitrate: '800k', label: 'Mobile (640x360)' }
        };
    }
    
    /**
     * Get file hash untuk caching
     */
    getFileHash(filePath) {
        const fileBuffer = fs.readFileSync(filePath);
        const hashSum = crypto.createHash('md5');
        hashSum.update(fileBuffer);
        return hashSum.digest('hex');
    }
    
    /**
     * Check jika video sudah di-optimize
     */
    isOptimized(filePath) {
        try {
            const hash = this.getFileHash(filePath);
            const optimizedPath = path.join(this.optimizedDir, `${hash}_720p.mp4`);
            return fs.existsSync(optimizedPath);
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Get duration video dalam detik
     */
    async getVideoDuration(filePath) {
        return new Promise((resolve, reject) => {
            try {
                const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1:noprint_wrappers=1 "${filePath}"`;
                const duration = parseFloat(execSync(command, { encoding: 'utf8' }).trim());
                resolve(duration);
            } catch (error) {
                console.error('Error getting video duration:', error);
                resolve(0);
            }
        });
    }
    
    /**
     * Optimize video ke multiple quality levels
     */
    async optimizeVideo(filePath, fileName, options = {}) {
        return new Promise(async (resolve, reject) => {
            try {
                const hash = this.getFileHash(filePath);
                const duration = await this.getVideoDuration(filePath);
                
                console.log(`🎬 Optimizing video: ${fileName} (${Math.round(duration)}s)`);
                
                const optimizedVideos = {
                    auto: null,
                    '720p': null,
                    '480p': null,
                    '360p': null
                };
                
                // Process each quality level
                const qualities = Object.keys(this.qualityPresets);
                
                for (const quality of qualities) {
                    try {
                        const preset = this.qualityPresets[quality];
                        const outputPath = path.join(
                            this.optimizedDir,
                            `${hash}_${quality}.mp4`
                        );
                        
                        // Skip jika sudah ada
                        if (fs.existsSync(outputPath)) {
                            console.log(`✓ ${quality} already optimized`);
                            optimizedVideos[quality] = {
                                quality: quality,
                                url: `/OurGallery/optimized/${path.basename(outputPath)}`,
                                bitrate: preset.bitrate,
                                height: preset.height,
                                fileName: path.basename(outputPath)
                            };
                            continue;
                        }
                        
                        // Optimize dengan H.264 + AAC
                        console.log(`⏳ Encoding ${quality}...`);
                        
                        const ffmpegCommand = [
                            '-i', filePath,
                            '-c:v', 'libx264',           // H.264 video codec
                            '-preset', 'medium',          // medium = balance kecepatan/kualitas
                            '-crf', '23',                 // 0-51, lower = better quality, 23 = default
                            '-vf', `scale=${preset.width}:${preset.height}`,  // Resize
                            '-b:v', preset.bitrate,       // Video bitrate
                            '-maxrate', preset.bitrate,
                            '-bufsize', preset.bitrate,
                            '-c:a', 'aac',                // AAC audio codec
                            '-b:a', '128k',               // Audio bitrate
                            '-movflags', '+faststart',    // Enable streaming from beginning
                            '-y',                         // Overwrite output file
                            outputPath
                        ];
                        
                        await this.executeFFmpeg(ffmpegCommand);
                        
                        const stats = fs.statSync(outputPath);
                        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
                        
                        console.log(`✓ ${quality} ready (${sizeMB}MB)`);
                        
                        optimizedVideos[quality] = {
                            quality: quality,
                            url: `/OurGallery/optimized/${path.basename(outputPath)}`,
                            bitrate: preset.bitrate,
                            height: preset.height,
                            fileSize: stats.size,
                            fileName: path.basename(outputPath),
                            label: preset.label
                        };
                        
                    } catch (error) {
                        console.error(`Error encoding ${quality}:`, error.message);
                    }
                }
                
                resolve({
                    success: true,
                    hash: hash,
                    duration: Math.round(duration),
                    originalFile: fileName,
                    optimizedVideos: optimizedVideos,
                    timestamp: new Date().toISOString()
                });
                
            } catch (error) {
                console.error('Video optimization error:', error);
                reject(error);
            }
        });
    }
    
    /**
     * Execute FFmpeg command
     */
    executeFFmpeg(args) {
        return new Promise((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', args, {
                stdio: ['ignore', 'pipe', 'pipe']
            });
            
            let stderr = '';
            
            ffmpeg.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`));
                }
            });
            
            ffmpeg.on('error', (err) => {
                reject(err);
            });
        });
    }
    
    /**
     * Get recommended quality berdasarkan bandwidth
     * Menggunakan adaptive bitrate untuk mencegah buffering
     */
    getRecommendedQuality(bandwidthMbps = null) {
        // Default assume 2.5 Mbps (good 4G)
        if (!bandwidthMbps) {
            return 'auto'; // Return auto quality (720p)
        }
        
        if (bandwidthMbps >= 5) return 'auto';      // 5+ Mbps = 720p
        if (bandwidthMbps >= 2.5) return '720p';    // 2.5+ Mbps = 720p
        if (bandwidthMbps >= 1.5) return '480p';    // 1.5+ Mbps = 480p
        return '360p';                               // < 1.5 Mbps = 360p
    }
    
    /**
     * Cleanup old optimized videos
     */
    cleanupOptimized(fileHash) {
        try {
            const qualities = Object.keys(this.qualityPresets);
            qualities.forEach(quality => {
                const filePath = path.join(this.optimizedDir, `${fileHash}_${quality}.mp4`);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`Deleted: ${quality} optimized video`);
                }
            });
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }
    
    /**
     * Get info video (duration, codec, bitrate, dll)
     */
    async getVideoInfo(filePath) {
        return new Promise((resolve, reject) => {
            try {
                const command = `ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,r_frame_rate -show_entries format=duration,bit_rate -of default=noprint_wrappers=1 "${filePath}"`;
                const info = execSync(command, { encoding: 'utf8' });
                resolve(info);
            } catch (error) {
                console.error('Error getting video info:', error);
                reject(error);
            }
        });
    }
}

module.exports = VideoOptimizer;
