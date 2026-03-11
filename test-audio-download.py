#!/usr/bin/env python3
"""
Quick test script untuk verify audio downloads bekerja dengan benar
"""

import json
import sys
from pathlib import Path

# Add parent directory to path untuk import modules
sys.path.insert(0, str(Path(__file__).parent))

from audio_downloader import AudioDownloader

def test_downloads():
    downloader = AudioDownloader()
    
    print("=" * 60)
    print("AUDIO DOWNLOADER TEST")
    print("=" * 60)
    
    # Test cases dengan URL yang bisa di-test
    test_cases = [
        {
            'name': 'YouTube Test',
            'url': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',  # Rick Roll
            'type': 'youtube',
            'expected_format': 'Artist_Title.mp3'
        },
        # Note: TikTok dan Spotify bisa ditambah sesuai kebutuhan
    ]
    
    for test in test_cases:
        print(f"\n[TEST] {test['name']}")
        print(f"URL: {test['url']}")
        print(f"Type: {test['type']}")
        print("-" * 60)
        
        result = downloader.download(test['url'])
        
        print(f"Success: {result.get('success')}")
        if result.get('success'):
            print(f"Filename: {result.get('filename')}")
            print(f"Title: {result.get('title')}")
            print(f"Artist: {result.get('artist', 'N/A')}")
            print(f"Message: {result.get('message')}")
            
            # Verify file exists
            file_path = downloader.output_dir / result.get('filename')
            if file_path.exists():
                file_size = file_path.stat().st_size
                print(f"✅ File exists: {file_path}")
                print(f"📊 Size: {file_size / 1024 / 1024:.2f} MB")
            else:
                print(f"❌ File NOT found: {file_path}")
        else:
            print(f"❌ Error: {result.get('message')}")
        
        print()
    
    # List all files in profile_music
    print("\n" + "=" * 60)
    print("FILES IN profile_music/")
    print("=" * 60)
    
    music_files = list(downloader.output_dir.glob('*.mp3'))
    if music_files:
        for i, file in enumerate(sorted(music_files), 1):
            size_mb = file.stat().st_size / 1024 / 1024
            print(f"{i}. {file.name:<50} {size_mb:>6.2f} MB")
    else:
        print("No MP3 files found")
    
    print()

if __name__ == '__main__':
    test_downloads()
