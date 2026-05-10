/**
 * SpotifyDownloader
 * Stub module untuk kompatibilitas endpoint /api/spotify/*
 * Download lagu Spotify sebenarnya dilakukan via MusicDownloader (yt-dlp).
 * Module ini hanya menyediakan helper: cek instalasi spotdl, list track, hapus track.
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SpotifyDownloader {
    /**
     * @param {string} outputDir - Direktori output MP3 (default: 'profile_music')
     */
    constructor(outputDir = 'profile_music') {
        this.outputDir = outputDir;
    }

    // ─────────────────────────────────────────────
    // HEALTH CHECK
    // ─────────────────────────────────────────────

    /**
     * Cek apakah spotdl terinstall di sistem.
     * @returns {Promise<boolean>}
     */
    async checkSpotdlInstalled() {
        try {
            execSync('spotdl --version', { stdio: 'pipe', timeout: 5000 });
            return true;
        } catch {
            return false;
        }
    }

    // ─────────────────────────────────────────────
    // TRACK LIST
    // ─────────────────────────────────────────────

    /**
     * Ambil daftar semua file MP3 di outputDir.
     * @returns {Promise<Array<{filename: string, path: string}>>}
     */
    async getDownloadedTracks() {
        try {
            await fs.access(this.outputDir);
        } catch {
            return [];
        }

        const files = await fs.readdir(this.outputDir);
        const mp3Files = files.filter(f => f.toLowerCase().endsWith('.mp3'));

        return mp3Files.map(filename => ({
            filename,
            path: path.join(this.outputDir, filename),
        }));
    }

    /**
     * Ambil info file (ukuran, tanggal buat).
     * @param {string} filename
     * @returns {Promise<{filename: string, sizeInMB: string, createdAt: string}>}
     */
    async getFileInfo(filename) {
        try {
            const filePath = path.join(this.outputDir, filename);
            const stats = await fs.stat(filePath);
            return {
                filename,
                sizeInMB: (stats.size / (1024 * 1024)).toFixed(2),
                createdAt: stats.birthtime.toISOString(),
            };
        } catch {
            return {
                filename,
                sizeInMB: '0.00',
                createdAt: new Date().toISOString(),
            };
        }
    }

    // ─────────────────────────────────────────────
    // DELETE
    // ─────────────────────────────────────────────

    /**
     * Hapus satu file MP3.
     * @param {string} filename
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async deleteTrack(filename) {
        try {
            // Security: cegah path traversal
            const filePath = path.join(this.outputDir, filename);
            if (!filePath.startsWith(path.resolve(this.outputDir))) {
                return { success: false, message: 'Access denied' };
            }

            await fs.unlink(filePath);
            return { success: true, message: `${filename} deleted` };
        } catch (err) {
            if (err.code === 'ENOENT') {
                return { success: true, message: 'File already deleted' };
            }
            return { success: false, message: err.message };
        }
    }
}

module.exports = SpotifyDownloader;
