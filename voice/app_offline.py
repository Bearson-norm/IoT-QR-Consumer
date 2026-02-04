"""
Text-to-Speech menggunakan pyttsx3 (Offline TTS)
Tidak memerlukan koneksi internet, menggunakan suara sistem lokal
"""
import pyttsx3
import os

# Konfigurasi
TEXT = "Halo, ini adalah tes suara setelah perbaikan kode."
OUTPUT_FILE = "output_offline.mp3"

def main():
    print("=" * 50)
    print("TEXT-TO-SPEECH dengan pyttsx3 (Offline)")
    print("=" * 50)
    print(f"Teks: {TEXT}")
    print()
    
    try:
        print("Menginisialisasi engine TTS...")
        
        # Inisialisasi engine
        engine = pyttsx3.init()
        
        # Cek suara yang tersedia
        voices = engine.getProperty('voices')
        print(f"Suara yang tersedia: {len(voices)}")
        
        # Cari suara Indonesia jika ada
        indonesian_voice = None
        for voice in voices:
            if 'indonesia' in voice.name.lower() or 'id' in voice.id.lower():
                indonesian_voice = voice
                print(f"  ✓ Ditemukan suara Indonesia: {voice.name}")
                break
        
        if indonesian_voice:
            engine.setProperty('voice', indonesian_voice.id)
        else:
            print("  ⚠ Suara Indonesia tidak ditemukan, menggunakan default")
        
        # Set properties
        engine.setProperty('rate', 150)  # Kecepatan bicara (words per minute)
        engine.setProperty('volume', 1.0)  # Volume (0.0 to 1.0)
        
        print()
        print("Sedang membuat file audio...")
        
        # Simpan ke file
        engine.save_to_file(TEXT, OUTPUT_FILE)
        engine.runAndWait()
        
        # Verifikasi file
        if os.path.exists(OUTPUT_FILE):
            file_size = os.path.getsize(OUTPUT_FILE)
            if file_size > 0:
                print(f"✓ Berhasil! File tersimpan di: {OUTPUT_FILE}")
                print(f"  Ukuran file: {file_size:,} bytes ({file_size / 1024:.2f} KB)")
                print()
                print("File siap digunakan!")
                return True
            else:
                raise Exception("File dibuat tapi kosong")
        else:
            raise Exception("File tidak dibuat")
            
    except Exception as e:
        print(f"✗ ERROR: {e}")
        print(f"  Tipe error: {type(e).__name__}")
        print()
        print("=== TROUBLESHOOTING ===")
        print("1. Pastikan pyttsx3 terinstall: pip install pyttsx3")
        print("2. Windows: Pastikan SAPI5 tersedia (biasanya sudah built-in)")
        print("3. Linux: Install espeak atau festival")
        print("   sudo apt-get install espeak")
        print("4. Mac: Install pyobjc: pip install pyobjc")
        return False

if __name__ == "__main__":
    success = main()
    if not success:
        exit(1)



