import os
import re
import requests

def sanitize_filename(filename):
    """Membersihkan nama file dari karakter yang tidak diizinkan"""
    filename = re.sub(r'[<>:"/\\|?*]', '', filename)
    filename = filename.strip()
    return filename[:200]  # Batasi panjang nama file

def download_tiktok_mp3(url, output_folder="profile_music"):
    """
    Download audio dari video TikTok dan simpan sebagai MP3
    
    Args:
        url: URL video TikTok
        output_folder: Folder tempat menyimpan file (default: "profile_music")
    """
    
    # Buat folder output jika belum ada
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
    
    try:
        print(f"Memproses URL: {url}")
        print("Mengambil data dari TikTok...")
        
        # Gunakan API tikwm.com (gratis dan tidak perlu API key)
        api_url = "https://www.tikwm.com/api/"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        # Request ke API
        response = requests.post(
            api_url, 
            data={'url': url, 'hd': 1},
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get('code') == 0:
                # Ambil URL audio
                audio_url = data['data'].get('music')
                
                # Ambil username
                username = data['data']['author'].get('unique_id', 'Unknown')
                
                if audio_url and username:
                    print(f"Username: @{username}")
                    print(f"Mengunduh audio...")
                    
                    # Download audio
                    audio_response = requests.get(audio_url, stream=True, headers=headers)
                    
                    if audio_response.status_code == 200:
                        # Buat nama file
                        safe_username = sanitize_filename(username)
                        filename = f"TiktokSound - {safe_username}.mp3"
                        filepath = os.path.join(output_folder, filename)
                        
                        # Simpan file
                        total_size = int(audio_response.headers.get('content-length', 0))
                        downloaded = 0
                        
                        with open(filepath, 'wb') as f:
                            for chunk in audio_response.iter_content(chunk_size=8192):
                                if chunk:
                                    f.write(chunk)
                                    downloaded += len(chunk)
                                    
                                    # Progress bar sederhana
                                    if total_size > 0:
                                        progress = (downloaded / total_size) * 100
                                        print(f"\rProgress: {progress:.1f}%", end='')
                        
                        print(f"\n✓ Berhasil! File disimpan: {filepath}")
                        print(f"Ukuran file: {os.path.getsize(filepath) / 1024:.2f} KB")
                        return True
                    else:
                        print(f"Gagal mengunduh audio. Status code: {audio_response.status_code}")
                        return False
                else:
                    print("Tidak dapat menemukan URL audio atau username")
                    return False
            elif data.get('code') == -1:
                print("Error: URL TikTok tidak valid atau video tidak ditemukan")
                return False
            else:
                print(f"Error dari API: {data.get('msg', 'Unknown error')}")
                return False
        else:
            print(f"Gagal mengakses API. Status code: {response.status_code}")
            return False
            
    except requests.exceptions.Timeout:
        print("Error: Request timeout. Koneksi internet lambat atau server tidak merespon")
        return False
    except requests.exceptions.RequestException as e:
        print(f"Error koneksi: {str(e)}")
        return False
    except Exception as e:
        print(f"Error: {str(e)}")
        return False

def main():
    """Fungsi utama"""
    print("=" * 50)
    print("TikTok MP3 Downloader")
    print("=" * 50)
    
    # Input URL
    tiktok_url = input("\nMasukkan URL TikTok: ").strip()
    
    # Validasi URL
    if not tiktok_url or 'tiktok.com' not in tiktok_url:
        print("URL TikTok tidak valid!")
        return
    
    # Download
    success = download_tiktok_mp3(tiktok_url)
    
    if success:
        print("\n✓ Download selesai!")
    else:
        print("\n✗ Download gagal!")
    
    input("\nTekan Enter untuk keluar...")

if __name__ == "__main__":
    main()