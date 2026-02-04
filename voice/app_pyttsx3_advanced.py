"""
Text-to-Speech menggunakan pyttsx3 (Offline)
Dengan kontrol rate, volume, dan voice selection
Tidak memerlukan internet, menggunakan suara sistem
"""
import pyttsx3
import os

# ============================================
# KONFIGURASI
# ============================================
RATE = 150          # Kecepatan bicara (words per minute): 50-300 (150 = normal)
VOLUME = 1.0        # Volume: 0.0 sampai 1.0 (1.0 = maksimal)
VOICE_INDEX = None # Index suara (None = default, 0 = pertama, 1 = kedua, dll.)

TEXT = "Halo, ini adalah tes suara menggunakan pyttsx3 dengan kontrol lanjutan."
OUTPUT_FILE = "output_pyttsx3_advanced.wav"

# ============================================
# CATATAN:
# ============================================
# RATE: 50 (sangat lambat) sampai 300 (sangat cepat), 150 = normal
# VOLUME: 0.0 (silent) sampai 1.0 (maksimal)
# VOICE_INDEX: None (default) atau angka untuk pilih suara tertentu
# ============================================

def main():
    print("=" * 60)
    print("TEXT-TO-SPEECH dengan pyttsx3 (Advanced)")
    print("=" * 60)
    print(f"Rate: {RATE} WPM")
    print(f"Volume: {VOLUME * 100:.0f}%")
    print(f"Teks: {TEXT}")
    print()
    
    try:
        print("Menginisialisasi engine TTS...")
        engine = pyttsx3.init()
        
        # List semua suara yang tersedia
        voices = engine.getProperty('voices')
        print(f"\nSuara yang tersedia: {len(voices)}")
        for i, voice in enumerate(voices):
            marker = " ← Dipilih" if (VOICE_INDEX is not None and i == VOICE_INDEX) else ""
            print(f"  {i}. {voice.name} ({voice.id}){marker}")
        
        # Set voice
        if VOICE_INDEX is not None and 0 <= VOICE_INDEX < len(voices):
            engine.setProperty('voice', voices[VOICE_INDEX].id)
            print(f"\n✓ Menggunakan suara: {voices[VOICE_INDEX].name}")
        else:
            current_voice = engine.getProperty('voice')
            print(f"\n✓ Menggunakan suara default: {current_voice}")
        
        # Set rate
        engine.setProperty('rate', RATE)
        print(f"✓ Rate: {RATE} WPM")
        
        # Set volume
        engine.setProperty('volume', VOLUME)
        print(f"✓ Volume: {VOLUME * 100:.0f}%")
        
        print()
        print("Sedang membuat file audio...")
        
        # Save to file
        engine.save_to_file(TEXT, OUTPUT_FILE)
        engine.runAndWait()
        
        # Verifikasi
        if os.path.exists(OUTPUT_FILE):
            file_size = os.path.getsize(OUTPUT_FILE)
            if file_size > 0:
                print(f"✓ Berhasil! File tersimpan di: {OUTPUT_FILE}")
                print(f"  Ukuran file: {file_size:,} bytes ({file_size / 1024:.2f} KB)")
                print()
                print("💡 Catatan: pyttsx3 tidak memiliki kontrol pitch langsung,")
                print("   tapi Anda bisa memilih suara pria/wanita yang berbeda.")
                print("   Untuk pitch control, gunakan Azure TTS atau OpenAI TTS.")
                return True
            else:
                raise Exception("File kosong")
        else:
            raise Exception("File tidak dibuat")
            
    except ImportError:
        print("✗ ERROR: pyttsx3 tidak terinstall!")
        print()
        print("Install dengan:")
        print("  pip install pyttsx3")
        print()
        print("Untuk Windows: SAPI5 sudah built-in")
        print("Untuk Linux: sudo apt-get install espeak")
        print("Untuk Mac: pip install pyobjc")
        return False
    except Exception as e:
        print(f"✗ ERROR: {e}")
        print(f"  Tipe: {type(e).__name__}")
        return False

if __name__ == "__main__":
    main()



