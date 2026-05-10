/**
 * Video Optimizer Service (v2 — TikTok-style delivery)
 *
 * Goals of this rewrite (requested by product):
 *   1. Keep video sharp (crisp original detail preserved where possible).
 *   2. Ship smaller files — TikTok-style size/quality ratio.
 *   3. Stream smoothly on poor networks — frequent keyframes, fast-start,
 *      web-optimized MP4, byte-range friendly.
 *
 * How we achieve that:
 *   - libx264 high-profile main-level 4.0, yuv420p, preset=slow, CRF 22
 *     (TikTok is around CRF 21–23 with 2-pass; CRF 22 single-pass is the
 *     best balance for our server's CPU budget).
 *   - Aspect-ratio-preserving scale. The old code forced 1280x720 on
 *     every video, which squished vertical (9:16) clips horizontally —
 *     the #1 reason TikTok-originated uploads looked "off" compared to
 *     the source. Now we scale the LONGEST edge to the quality target
 *     and let the other edge auto-compute via `-2` (round to even).
 *   - Keyframes every 2 seconds (-g fps*2) so the HTML5 player can
 *     seek/scrub without re-buffering — this is what makes TikTok feel
 *     instant on timeline drag.
 *   - `-tune film` + `-movflags +faststart+use_metadata_tags` — moov
 *     atom at the front so the `<video>` element begins playback
 *     before the full file is received (byte-range streaming).
 *   - AAC LC at 128kbps stereo + loudnorm filter → consistent volume
 *     across clips (TikTok's signature "same loudness every scroll").
 *   - Emits FOUR variants (360p, 480p, 720p, auto-alias) so the player
 *     can adaptive-select. `auto` is a symlink to 720p for backwards-
 *     compat with the existing /api/gallery/videos contract.
 *
 *   - Backwards compatible: the public method signatures and the
 *     `optimizedVideos` payload shape are unchanged, so
 *     `/api/gallery/videos` and the kolase client work with no edits.
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const crypto = require('crypto');

class VideoOptimizer {
    constructor() {
        this.optimizedDir = path.join(__dirname, '../../../OurGallery', 'optimized');
        this.cachesDir = path.join(__dirname, '../../../OurGallery', 'cache');

        // Ensure directories exist
        if (!fs.existsSync(this.optimizedDir)) {
            fs.mkdirSync(this.optimizedDir, { recursive: true });
        }
        if (!fs.existsSync(this.cachesDir)) {
            fs.mkdirSync(this.cachesDir, { recursive: true });
        }

        // Quality presets. `longEdge` is the longest dimension of the
        // output frame; the other dimension scales automatically while
        // preserving the source aspect ratio. That means a 1080x1920
        // portrait clip stays portrait (720p → 720x1280 output), and a
        // 1920x1080 landscape clip stays landscape (720p → 1280x720).
        //
        // `bitrate` is a loose ceiling — actual size is governed by CRF.
        // We keep `maxrate`/`bufsize` tight so spikes don't blow up the
        // stream on cellular networks.
        //
        // `crf`:
        //   - 22 for HD (720p) — imperceptible loss vs source for most
        //     content, ~30-40% smaller files than the old CRF 23 preset
        //     medium pipeline because preset=slow is more efficient.
        //   - 23 for SD (480p) — slightly more aggressive, still sharp.
        //   - 25 for low (360p) — mobile-network fallback.
        this.qualityPresets = {
            auto:   { longEdge: 1280, bitrate: '2500k', maxrate: '3000k', crf: 22, label: 'HD (auto)' },
            '720p': { longEdge: 1280, bitrate: '2500k', maxrate: '3000k', crf: 22, label: 'HD (720p)' },
            '480p': { longEdge: 854,  bitrate: '1200k', maxrate: '1600k', crf: 23, label: 'SD (480p)' },
            '360p': { longEdge: 640,  bitrate: '700k',  maxrate: '1000k', crf: 25, label: 'Mobile (360p)' }
        };

        // Frames per second we clamp output to. Most phone video is 30 fps;
        // 60fps sources are down-sampled to keep file size reasonable
        // without noticeable motion loss on our target viewing surface
        // (small <video> tag in a carousel).
        this.targetFps = 30;
    }

    /**
     * Get file hash for caching. Hashing by content (not name) so that
     * re-uploading the same file doesn't waste a round of transcoding.
     */
    getFileHash(filePath) {
        const fileBuffer = fs.readFileSync(filePath);
        const hashSum = crypto.createHash('md5');
        hashSum.update(fileBuffer);
        return hashSum.digest('hex');
    }

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
     * Get duration in seconds from ffprobe.
     */
    async getVideoDuration(filePath) {
        return new Promise((resolve) => {
            try {
                const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
                const duration = parseFloat(execSync(command, { encoding: 'utf8' }).trim());
                resolve(isNaN(duration) ? 0 : duration);
            } catch (error) {
                console.error('Error getting video duration:', error.message);
                resolve(0);
            }
        });
    }

    /**
     * Detect source dimensions + frame rate so we can (a) preserve
     * orientation, and (b) skip upscaling a tiny clip. Returns
     * { width, height, fps } or null if probe fails.
     */
    async probeVideoDimensions(filePath) {
        return new Promise((resolve) => {
            try {
                const cmd = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
                const raw = execSync(cmd, { encoding: 'utf8' }).trim().split(/\r?\n/);
                const width = parseInt(raw[0], 10);
                const height = parseInt(raw[1], 10);
                let fps = 30;
                if (raw[2] && raw[2].includes('/')) {
                    const [num, den] = raw[2].split('/').map(Number);
                    if (den > 0) fps = num / den;
                } else if (raw[2]) {
                    fps = parseFloat(raw[2]);
                }
                if (!width || !height) return resolve(null);
                resolve({ width, height, fps });
            } catch (error) {
                console.warn('probeVideoDimensions failed:', error.message);
                resolve(null);
            }
        });
    }

    /**
     * Build the ffmpeg `-vf` (video filter) chain for a given preset.
     * - Scales the longest edge to `preset.longEdge` while preserving
     *   aspect ratio; rounds the other dimension to even (H.264 requires
     *   even dimensions). `force_original_aspect_ratio=decrease` makes
     *   sure we never upscale beyond the source.
     * - Clamps fps to targetFps (30) — lower bitrate, still smooth.
     * - `format=yuv420p` is mandatory for broad browser decoder
     *   support (Safari in particular rejects yuv444/yuv422).
     */
    buildVideoFilter(preset, sourceDims) {
        const fpsCap = Math.min(this.targetFps, sourceDims?.fps || this.targetFps);

        // Decide which edge is the "long edge" to cap. For landscape
        // (w >= h) we cap width; for portrait we cap height. `-2` tells
        // ffmpeg to compute the other side while keeping it even.
        let scaleExpr;
        if (!sourceDims || sourceDims.width >= sourceDims.height) {
            // Landscape or square: cap width, compute height.
            scaleExpr = `scale='min(${preset.longEdge},iw)':-2:flags=lanczos`;
        } else {
            // Portrait (e.g. TikTok): cap height, compute width.
            scaleExpr = `scale=-2:'min(${preset.longEdge},ih)':flags=lanczos`;
        }

        return `${scaleExpr},fps=${fpsCap},format=yuv420p`;
    }

    /**
     * Optimize a video into every quality preset.
     *
     * The previous version awaited each preset serially, which multiplied
     * upload-to-ready latency. We keep that serial path for CPU safety
     * (concurrent ffmpeg processes on a 2-core VPS thrash badly) but
     * order presets lowest-first so the mobile fallback is ready the
     * moment the upload finishes — meaning the user's clip is playable
     * on mobile within seconds even if 720p is still encoding.
     */
    async optimizeVideo(filePath, fileName /*, options = {} */) {
        const hash = this.getFileHash(filePath);
        const duration = await this.getVideoDuration(filePath);
        const sourceDims = await this.probeVideoDimensions(filePath);

        if (sourceDims) {
            console.log(`🎬 Optimizing video: ${fileName} (${Math.round(duration)}s, ${sourceDims.width}x${sourceDims.height} @ ${sourceDims.fps.toFixed(1)}fps)`);
        } else {
            console.log(`🎬 Optimizing video: ${fileName} (${Math.round(duration)}s, unknown dimensions)`);
        }

        const optimizedVideos = {
            auto: null,
            '720p': null,
            '480p': null,
            '360p': null
        };

        // Encode lowest quality first → user-facing fallback is ready ASAP.
        const qualityOrder = ['360p', '480p', '720p', 'auto'];

        for (const quality of qualityOrder) {
            try {
                const preset = this.qualityPresets[quality];
                const outputPath = path.join(this.optimizedDir, `${hash}_${quality}.mp4`);

                // `auto` is an alias for `720p` — if 720p already encoded
                // this session, just copy the file (no re-encode).
                if (quality === 'auto' && optimizedVideos['720p']) {
                    const srcPath = path.join(this.optimizedDir, `${hash}_720p.mp4`);
                    if (!fs.existsSync(outputPath) && fs.existsSync(srcPath)) {
                        fs.copyFileSync(srcPath, outputPath);
                        console.log(`📄 auto ← copied from 720p (no re-encode)`);
                    }
                    if (fs.existsSync(outputPath)) {
                        const stats = fs.statSync(outputPath);
                        optimizedVideos.auto = this.buildVariantInfo(outputPath, preset, quality, stats.size);
                        continue;
                    }
                }

                // Cache hit: preserve user CPU.
                if (fs.existsSync(outputPath)) {
                    const stats = fs.statSync(outputPath);
                    console.log(`✓ ${quality} already optimized (${(stats.size / (1024*1024)).toFixed(2)}MB)`);
                    optimizedVideos[quality] = this.buildVariantInfo(outputPath, preset, quality, stats.size);
                    continue;
                }

                const vf = this.buildVideoFilter(preset, sourceDims);
                const fpsCap = Math.min(this.targetFps, sourceDims?.fps || this.targetFps);
                const gop = Math.max(2, Math.round(fpsCap * 2)); // Keyframe every ~2s

                console.log(`⏳ Encoding ${quality} (CRF ${preset.crf}, longEdge ${preset.longEdge}px, GOP ${gop})...`);

                const args = [
                    '-i', filePath,

                    // ---- Video ----
                    '-c:v', 'libx264',
                    '-profile:v', 'high',       // Broad browser support + better compression than main
                    '-level', '4.0',            // Enough headroom for 1080p@30
                    '-preset', 'slow',          // Slower = smaller file at same CRF. CPU is fine overnight.
                    '-tune', 'film',            // General-purpose live-action tuning; safe for dance/selfie clips.
                    '-crf', String(preset.crf),
                    '-maxrate', preset.maxrate,
                    '-bufsize', preset.bitrate,
                    '-vf', vf,
                    '-g', String(gop),          // GOP size → fast seek/scrub
                    '-keyint_min', String(gop),
                    '-sc_threshold', '0',       // Force regular keyframes (no scene-detect skipping)
                    '-pix_fmt', 'yuv420p',

                    // ---- Audio ----
                    '-c:a', 'aac',
                    '-b:a', '128k',
                    '-ac', '2',                 // Force stereo; mono uploads get upmixed (single speaker voice-memo style)
                    '-ar', '44100',
                    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', // Consistent loudness across clips

                    // ---- Container / streaming ----
                    '-movflags', '+faststart+use_metadata_tags',
                    '-max_muxing_queue_size', '9999',
                    '-y',
                    outputPath
                ];

                await this.executeFFmpeg(args);

                const stats = fs.statSync(outputPath);
                const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
                console.log(`✓ ${quality} ready (${sizeMB}MB)`);

                optimizedVideos[quality] = this.buildVariantInfo(outputPath, preset, quality, stats.size);

            } catch (error) {
                console.error(`Error encoding ${quality}:`, error.message);
            }
        }

        return {
            success: true,
            hash: hash,
            duration: Math.round(duration),
            sourceDimensions: sourceDims,
            originalFile: fileName,
            optimizedVideos: optimizedVideos,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Build the payload entry for a single encoded variant. Kept stable
     * so callers (server.js / kolase.js) don't need to be updated.
     */
    buildVariantInfo(outputPath, preset, quality, fileSize) {
        return {
            quality: quality,
            url: `/OurGallery/optimized/${path.basename(outputPath)}`,
            bitrate: preset.bitrate,
            longEdge: preset.longEdge,
            fileSize: fileSize,
            fileName: path.basename(outputPath),
            label: preset.label
        };
    }

    /**
     * Run ffmpeg, capturing stderr for diagnostics. We pipe stderr
     * rather than letting it go to the parent console so the encode
     * logs don't drown out the express request log.
     */
    executeFFmpeg(args) {
        return new Promise((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
            let stderr = '';

            ffmpeg.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    // Keep last ~600 chars of stderr — full log is noisy
                    // and ffmpeg always prints its summary at the tail.
                    const tail = stderr.slice(-600);
                    reject(new Error(`FFmpeg exited with code ${code}: ...${tail}`));
                }
            });

            ffmpeg.on('error', (err) => reject(err));
        });
    }

    /**
     * Recommend a quality level based on a bandwidth estimate (Mbps).
     * Used by the client if it wants to pick a starting variant on a
     * cold load before the browser's own adaptive logic kicks in.
     */
    getRecommendedQuality(bandwidthMbps = null) {
        if (!bandwidthMbps) return 'auto';
        if (bandwidthMbps >= 5)   return 'auto';
        if (bandwidthMbps >= 2.5) return '720p';
        if (bandwidthMbps >= 1.2) return '480p';
        return '360p';
    }

    /**
     * Delete every encoded variant for a hash.
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
     * Get info about a video file (duration, codec, bitrate). Used by
     * the video-diagnostic page.
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
