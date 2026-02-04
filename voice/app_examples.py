"""
Contoh berbagai kombinasi parameter gTTS
Jalankan script ini untuk melihat perbedaan suara dengan parameter berbeda
"""
from gtts import gTTS
import os

# Contoh teks
TEXT = "Halo, selamat datang di sistem text to speech."

# Daftar kombinasi parameter untuk dicoba
EXAMPLES = [
    {
        "name": "Indonesia Normal (co.id)",
        "lang": "id",
        "tld": "co.id",
        "slow": False,
        "output": "output_id_normal.mp3"
    },
    {
        "name": "Indonesia Lambat (co.id)",
        "lang": "id",
        "tld": "co.id",
        "slow": True,
        "output": "output_id_slow.mp3"
    },
    {
        "name": "Indonesia Normal (com)",
        "lang": "id",
        "tld": "com",
        "slow": False,
        "output": "output_id_com.mp3"
    },
    {
        "name": "English US",
        "lang": "en",
        "tld": "com",
        "slow": False,
        "output": "output_en_us.mp3"
    },
    {
        "name": "English UK",
        "lang": "en",
        "tld": "co.uk",
        "slow": False,
        "output": "output_en_uk.mp3"
    },
    {
        "name": "English Slow",
        "lang": "en",
        "tld": "com",
        "slow": True,
        "output": "output_en_slow.mp3"
    },
]

def generate_voice(config):
    """Generate suara dengan konfigurasi tertentu"""
    try:
        print(f"  → {config['name']}...")
        tts = gTTS(
            text=TEXT,
            lang=config['lang'],
            tld=config['tld'],
            slow=config['slow']
        )
        tts.save(config['output'])
        
        if os.path.exists(config['output']):
            size = os.path.getsize(config['output'])
            print(f"    ✓ Berhasil! ({size:,} bytes)")
            return True
        else:
            print(f"    ✗ Gagal membuat file")
            return False
    except Exception as e:
        print(f"    ✗ Error: {e}")
        return False

def main():
    print("=" * 60)
    print("CONTOH BERBAGAI PARAMETER gTTS")
    print("=" * 60)
    print(f"Teks: {TEXT}")
    print()
    print("Membuat file audio dengan berbagai kombinasi parameter...")
    print()
    
    success_count = 0
    for i, example in enumerate(EXAMPLES, 1):
        print(f"{i}. {example['name']}")
        if generate_voice(example):
            success_count += 1
        print()
    
    print("=" * 60)
    print(f"Hasil: {success_count}/{len(EXAMPLES)} file berhasil dibuat")
    print("=" * 60)
    print()
    print("File yang dibuat:")
    for example in EXAMPLES:
        if os.path.exists(example['output']):
            size = os.path.getsize(example['output'])
            print(f"  - {example['output']} ({size:,} bytes)")
    print()
    print("💡 Dengarkan file-file tersebut untuk membandingkan perbedaannya!")

if __name__ == "__main__":
    main()



