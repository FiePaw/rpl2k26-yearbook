#!/usr/bin/env python3
"""
Test Spotify info extraction
"""

import sys
import requests
import re

def test_spotify_scrape(url):
    """Test scraping track info from Spotify URL"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        print(f"Fetching URL: {url}")
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        html = response.text
        print(f"Got response, length: {len(html)}")
        
        # Try title pattern
        title_match = re.search(r'<title>(.+?) · (.+?) \|', html)
        if title_match:
            print(f"Title pattern matched!")
            print(f"  Title: {title_match.group(1)}")
            print(f"  Artist: {title_match.group(2)}")
            return
        
        # Try og:title
        og_title = re.search(r'<meta property="og:title" content="([^"]+)"', html)
        if og_title:
            print(f"og:title found: {og_title.group(1)}")
        
        # Try og:description
        og_desc = re.search(r'<meta property="og:description" content="([^"]+)"', html)
        if og_desc:
            print(f"og:description found: {og_desc.group(1)}")
        
        if og_title and og_desc:
            print("\nUsing og:title and og:description")
            print(f"  Title: {og_title.group(1)}")
            print(f"  Description: {og_desc.group(1)}")
            return
        
        print("No metadata found!")
        print("\nSearching in HTML for artist/track data...")
        
        # Print first 5000 chars to see structure
        print(html[:5000])
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python test_spotify.py <url>")
        sys.exit(1)
    
    test_spotify_scrape(sys.argv[1])
