"""
Contoh berbagai pitch dengan gTTS + pydub
Menunjukkan bagaimana pitch mempengaruhi suara
"""
from gtts import gTTS
from pydub import AudioSegment
from pydub.effects import normalize
import os

TEXT = "Halo, ini adalah tes suara dengan berbagai pitch."

# Daftar pitch untuk dicoba
PITCH_EXAMPLES = [
    {"name": "Sangat Rendah (Pria)", "semitones": -8, "output": "output_pitch_very_low.mp3"},
    {"name": "Rendah (Pria)", "semitones": -5, "output": "output_pitch_low.mp3"},
    {"name": "Sedikit Rendah", "semitones": -3, "output": "output_pitch_slightly_low.mp3"},
    {"name": "Normal", "semitones": 0, "output": "output_pitch_normal.mp3"},
    {"name": "Sedikit Tinggi", "semitones": +3, "output": "output_pitch_slightly_high.mp3"},
    {"name": "Tinggi (Wanita)", "semitones": +5, "output": "output_pitch_high.mp3"},
    {"name": "Sangat Tinggi (Wanita)", "semitones": +8, "output": "output_pitch_very_high.mp3"},
]

def change_pitch(audio_file, semitones):
    """Mengubah pitch audio"""
    try:
        audio = AudioSegment.from_mp3(audio_file)
        new_sample_rate = int(audio.frame_rate * (2 ** (semitones / 12.0)))
        audio_shifted = audio._spawn(audio.raw_data, overrides={"frame_rate": new_sample_rate})
        audio_shifted = audio_shifted.set_frame_rate(audio.frame_rate)
        audio_shifted = normalize(audio_shifted)
        audio_shifted.export(audio_file, format="mp3")
        return True
    except Exception as e:
        print(f"    ✗ Error: {e}")
        return False

def main():
    print("=" * 60)
    print("CONTOH BERBAGAI PITCH DENGAN gTTS + pydub")
    print("=" * 60)
    print(f"Teks: {TEXT}")
    print()
    
    # Buat audio base dulu
    print("1. Membuat audio base dari gTTS...")
    temp_file = "temp_base.mp3"
    try:
        tts = gTTS(text=TEXT, lang="id", tld="co.id", slow=False)
        tts.save(temp_file)
        print(f"   ✓ Audio base dibuat: {temp_file}")
    except Exception as e:
        print(f"   ✗ Error membuat audio base: {e}")
        return
    
    print()
    print("2. Membuat variasi pitch...")
    print()
    
    success_count = 0
    for i, example in enumerate(PITCH_EXAMPLES, 1):
        print(f"{i}. {example['name']} ({example['semitones']:+d} semitones)")
        
        try:
            # Copy base file
            import shutil
            shutil.copy(temp_file, example['output'])
            
            # Apply pitch change
            if example['semitones'] != 0:
                if change_pitch(example['output'], example['semitones']):
                    print(f"   ✓ Berhasil!")
                    success_count += 1
                else:
                    print(f"   ✗ Gagal")
            else:
                print(f"   ✓ Berhasil! (normal)")
                success_count += 1
        except Exception as e:
            print(f"   ✗ Error: {e}")
        print()
    
    # Cleanup
    if os.path.exists(temp_file):
        os.remove(temp_file)
    
    print("=" * 60)
    print(f"Hasil: {success_count}/{len(PITCH_EXAMPLES)} file berhasil dibuat")
    print("=" * 60)
    print()
    print("File yang dibuat:")
    for example in PITCH_EXAMPLES:
        if os.path.exists(example['output']):
            size = os.path.getsize(example['output'])
            print(f"  - {example['output']} ({size:,} bytes) - {example['name']}")
    print()
    print("💡 Dengarkan file-file tersebut untuk membandingkan perbedaan pitch!")
    print()
    print("📝 Catatan:")
    print("  - Semitones negatif = suara lebih rendah (pria)")
    print("  - Semitones positif = suara lebih tinggi (wanita)")
    print("  - Range yang disarankan: -5 sampai +5 untuk hasil natural")
    print("  - Range ekstrem (-8 sampai +8) bisa membuat suara tidak natural")

if __name__ == "__main__":
    try:
        from pydub import AudioSegment
    except ImportError:
        print("✗ ERROR: pydub tidak terinstall!")
        print()
        print("Install dengan:")
        print("  pip install pydub")
        print()
        print("Untuk Windows, install juga ffmpeg:")
        print("  Download dari: https://ffmpeg.org/download.html")
        print("  Atau: pip install simpleaudio")
        exit(1)
    
    main()



