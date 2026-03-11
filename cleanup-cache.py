#!/usr/bin/env python3
"""
Cleanup script untuk menghapus yt-dlp cache dan temp files
Jalankan ini untuk membersihkan cache lama yang mungkin menyebabkan double download
"""

import os
import shutil
from pathlib import Path

def cleanup_yt_dlp_cache():
    """Remove yt-dlp cache directories"""
    cache_paths = [
        Path.home() / '.cache' / 'yt-dlp',  # Linux/Mac
        Path.home() / 'AppData' / 'Local' / 'yt-dlp',  # Windows
        Path(__file__).parent / '.ytdlp_cache',
        Path(__file__).parent / 'yt-dlp-cache',
    ]
    
    for cache_path in cache_paths:
        if cache_path.exists():
            try:
                shutil.rmtree(cache_path)
                print(f"✅ Removed cache: {cache_path}")
            except Exception as e:
                print(f"❌ Error removing {cache_path}: {e}")
        else:
            print(f"ℹ️  Cache not found: {cache_path}")

def cleanup_temp_files():
    """Remove temp files from profile_music directory"""
    profile_music = Path(__file__).parent / 'profile_music'
    
    if not profile_music.exists():
        print("ℹ️  profile_music directory not found")
        return
    
    # Remove temp_*.mp3 files
    temp_files = list(profile_music.glob('temp_*.mp3'))
    for temp_file in temp_files:
        try:
            os.remove(temp_file)
            print(f"✅ Removed temp file: {temp_file.name}")
        except Exception as e:
            print(f"❌ Error removing {temp_file.name}: {e}")
    
    if not temp_files:
        print("ℹ️  No temp files found")

def list_profile_music():
    """List all files in profile_music"""
    profile_music = Path(__file__).parent / 'profile_music'
    
    if not profile_music.exists():
        print("ℹ️  profile_music directory not found")
        return
    
    mp3_files = sorted(profile_music.glob('*.mp3'))
    print(f"\n📁 Files in profile_music/ ({len(mp3_files)} total):")
    for i, file in enumerate(mp3_files, 1):
        size_mb = file.stat().st_size / 1024 / 1024
        print(f"  {i}. {file.name:<60} ({size_mb:.2f} MB)")

if __name__ == '__main__':
    print("=" * 70)
    print("yt-dlp CACHE AND TEMP FILE CLEANUP")
    print("=" * 70)
    print()
    
    print("Cleaning up yt-dlp cache...")
    cleanup_yt_dlp_cache()
    print()
    
    print("Cleaning up temp files...")
    cleanup_temp_files()
    print()
    
    print("Listing profile_music contents...")
    list_profile_music()
    print()
    
    print("=" * 70)
    print("✅ Cleanup complete!")
    print("=" * 70)
