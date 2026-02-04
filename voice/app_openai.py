"""
Text-to-Speech menggunakan OpenAI TTS API
Kualitas sangat bagus dengan kontrol pitch, speed, dan voice native
Membutuhkan API key OpenAI (berbayar tapi murah)
"""
import os
from openai import OpenAI

# ============================================
# KONFIGURASI
# ============================================
# Dapatkan API key dari: https://platform.openai.com/api-keys
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")  # Atau set langsung: "sk-..."

# Parameter suara
VOICE = "alloy"      # Pilihan: "alloy", "echo", "fable", "onyx", "nova", "shimmer"
SPEED = 1.0          # Kecepatan: 0.25 sampai 4.0 (1.0 = normal)
PITCH = 1.0          # Pitch: 0.5 sampai 2.0 (1.0 = normal, <1.0 = rendah, >1.0 = tinggi)

TEXT = "Halo, ini adalah tes suara menggunakan OpenAI TTS."
OUTPUT_FILE = "output_openai.mp3"

# ============================================
# CATATAN:
# ============================================
# VOICE options:
#   - "alloy" - Netral, cocok untuk berbagai keperluan
#   - "echo" - Pria, suara dalam
#   - "fable" - Pria, suara cerah
#   - "onyx" - Pria, suara serius
#   - "nova" - Wanita, suara muda
#   - "shimmer" - Wanita, suara lembut
#
# SPEED: 0.25 (sangat lambat) sampai 4.0 (sangat cepat)
# PITCH: 0.5 (sangat rendah) sampai 2.0 (sangat tinggi)
# ============================================

def main():
    print("=" * 60)
    print("TEXT-TO-SPEECH dengan OpenAI TTS")
    print("=" * 60)
    
    if not OPENAI_API_KEY:
        print("✗ ERROR: OPENAI_API_KEY tidak ditemukan!")
        print()
        print("Cara setup:")
        print("1. Dapatkan API key dari: https://platform.openai.com/api-keys")
        print("2. Set environment variable:")
        print("   Windows: set OPENAI_API_KEY=sk-your-key")
        print("   Linux/Mac: export OPENAI_API_KEY=sk-your-key")
        print("3. Atau edit file ini dan set OPENAI_API_KEY langsung")
        print()
        print("Harga: ~$15 per 1 juta karakter (sangat murah)")
        return False
    
    print(f"Voice: {VOICE}")
    print(f"Speed: {SPEED}x")
    print(f"Pitch: {PITCH}x")
    print(f"Teks: {TEXT}")
    print()
    
    try:
        print("Sedang membuat audio...")
        
        client = OpenAI(api_key=OPENAI_API_KEY)
        
        # Generate speech
        response = client.audio.speech.create(
            model="tts-1",  # atau "tts-1-hd" untuk kualitas lebih tinggi
            voice=VOICE,
            input=TEXT,
            speed=SPEED,
        )
        
        # Save to file
        response.stream_to_file(OUTPUT_FILE)
        
        # Verifikasi
        if os.path.exists(OUTPUT_FILE):
            file_size = os.path.getsize(OUTPUT_FILE)
            if file_size > 0:
                print(f"✓ Berhasil! File tersimpan di: {OUTPUT_FILE}")
                print(f"  Ukuran file: {file_size:,} bytes ({file_size / 1024:.2f} KB)")
                print()
                print("💡 Catatan: OpenAI TTS tidak mendukung pitch langsung,")
                print("   tapi memiliki 6 voice berbeda yang bisa dipilih.")
                return True
            else:
                raise Exception("File kosong")
        else:
            raise Exception("File tidak dibuat")
            
    except ImportError:
        print("✗ ERROR: Library openai tidak terinstall!")
        print()
        print("Install dengan:")
        print("  pip install openai")
        return False
    except Exception as e:
        print(f"✗ ERROR: {e}")
        print(f"  Tipe: {type(e).__name__}")
        return False

if __name__ == "__main__":
    main()



