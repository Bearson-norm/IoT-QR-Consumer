"""
Text-to-Speech menggunakan gTTS (Google Text-to-Speech)
Library yang lebih reliable dan mudah digunakan dibanding edge_tts
Dengan dukungan manipulasi pitch menggunakan pydub
"""
from gtts import gTTS
import os

# Cek apakah pydub tersedia untuk manipulasi pitch
try:
    from pydub import AudioSegment
    from pydub.effects import speedup, normalize
    PYDUB_AVAILABLE = True
except ImportError:
    PYDUB_AVAILABLE = False
    print("⚠️  pydub tidak terinstall. Pitch control tidak tersedia.")
    print("   Install dengan: pip install pydub")
    print("   Untuk pitch control penuh, install juga: pip install simpleaudio atau ffmpeg")
    print()

# ============================================
# KONFIGURASI PARAMETER SUARA
# ============================================
LANG = "id"          # Bahasa: "id" (Indonesia), "en" (English), "es" (Spanish), dll.
TLD = "co.id"        # Top-Level Domain untuk aksen: "co.id" (Indonesia), "com" (default), "co.uk" (UK), dll.
SLOW = False          # Kecepatan bicara: False (normal), True (lambat)

# PITCH CONTROL (membutuhkan pydub)
PITCH_SHIFT = -7      # Perubahan pitch dalam semitones: -12 sampai +12
                     # Negatif = lebih rendah (pria), Positif = lebih tinggi (wanita)
                     # 0 = normal, -3 = sedikit lebih rendah, +3 = sedikit lebih tinggi
                     # Contoh: -5 (pria), 0 (normal), +5 (wanita)

TEXT = "Halo, ini adalah tes suara setelah perbaikan kode."
OUTPUT_FILE = "output_edge.mp3"  # Nama file output
TEMP_FILE = "temp_audio.mp3"     # File temporary untuk processing

# ============================================
# CATATAN PARAMETER:
# ============================================
# - LANG: Kode bahasa ISO 639-1 (2 huruf)
#   Contoh: "id", "en", "es", "fr", "de", "ja", "zh", dll.
#
# - TLD: Domain untuk mempengaruhi aksen suara
#   Untuk Indonesia: "co.id" (lebih natural untuk bahasa Indonesia)
#   Untuk English: "com" (US), "co.uk" (UK), "com.au" (Australia)
#   Default: "com"
#
# - SLOW: Mengatur kecepatan bicara
#   False = Normal speed (default)
#   True = Slow speed (lebih jelas, cocok untuk pembelajaran)
#
# - PITCH_SHIFT: Perubahan pitch dalam semitones (membutuhkan pydub)
#   0 = Normal (default)
#   -12 sampai -1 = Lebih rendah (suara pria)
#   +1 sampai +12 = Lebih tinggi (suara wanita)
#   Contoh: -5 (pria), 0 (normal), +5 (wanita)
#   Catatan: Perubahan ekstrem bisa membuat suara tidak natural
# ============================================

def change_pitch(audio_file, semitones):
    """
    Mengubah pitch audio menggunakan pydub
    semitones: -12 sampai +12 (negatif = lebih rendah, positif = lebih tinggi)
    """
    if not PYDUB_AVAILABLE:
        return False
    
    try:
        # Load audio
        audio = AudioSegment.from_mp3(audio_file)
        
        # Ubah pitch dengan mengubah frame rate
        # Formula: new_sample_rate = old_sample_rate * (2 ** (semitones / 12))
        new_sample_rate = int(audio.frame_rate * (2 ** (semitones / 12.0)))
        
        # Apply pitch change
        audio_shifted = audio._spawn(audio.raw_data, overrides={"frame_rate": new_sample_rate})
        
        # Set frame rate kembali ke original untuk menjaga durasi
        audio_shifted = audio_shifted.set_frame_rate(audio.frame_rate)
        
        # Normalize audio
        audio_shifted = normalize(audio_shifted)
        
        # Save
        audio_shifted.export(audio_file, format="mp3")
        return True
    except Exception as e:
        print(f"  ⚠️  Error saat mengubah pitch: {e}")
        return False

def main():
    print("=" * 50)
    print("TEXT-TO-SPEECH dengan gTTS (Google TTS)")
    print("=" * 50)
    print(f"Bahasa (lang): {LANG}")
    print(f"Domain/Aksen (tld): {TLD}")
    print(f"Kecepatan (slow): {'Lambat' if SLOW else 'Normal'}")
    if PYDUB_AVAILABLE:
        pitch_desc = "Normal"
        if PITCH_SHIFT < 0:
            pitch_desc = f"Lebih rendah ({PITCH_SHIFT} semitones)"
        elif PITCH_SHIFT > 0:
            pitch_desc = f"Lebih tinggi (+{PITCH_SHIFT} semitones)"
        print(f"Pitch shift: {pitch_desc}")
    else:
        print(f"Pitch shift: Tidak tersedia (pydub tidak terinstall)")
    print(f"Teks: {TEXT}")
    print()
    
    try:
        print("Sedang mengunduh audio dari Google TTS...")
        
        # Buat objek gTTS dengan parameter yang bisa disesuaikan
        tts = gTTS(
            text=TEXT,
            lang=LANG,
            tld=TLD,
            slow=SLOW
        )
        
        # Simpan ke file temporary dulu jika perlu pitch adjustment
        output_path = TEMP_FILE if (PYDUB_AVAILABLE and PITCH_SHIFT != 0) else OUTPUT_FILE
        tts.save(output_path)
        
        # Verifikasi file
        if not os.path.exists(output_path):
            raise Exception("File tidak dibuat")
        
        file_size = os.path.getsize(output_path)
        if file_size == 0:
            raise Exception("File dibuat tapi kosong")
        
        # Apply pitch shift jika diperlukan
        if PYDUB_AVAILABLE and PITCH_SHIFT != 0:
            print(f"Mengaplikasikan pitch shift: {PITCH_SHIFT} semitones...")
            if change_pitch(output_path, PITCH_SHIFT):
                # Copy ke output file final
                if output_path != OUTPUT_FILE:
                    import shutil
                    shutil.copy(output_path, OUTPUT_FILE)
                    os.remove(output_path)  # Hapus temp file
                print("✓ Pitch berhasil diubah")
            else:
                print("⚠️  Pitch shift gagal, menggunakan audio original")
                if output_path != OUTPUT_FILE:
                    import shutil
                    shutil.copy(output_path, OUTPUT_FILE)
                    os.remove(output_path)
        
        # Verifikasi file final
        if os.path.exists(OUTPUT_FILE):
            file_size = os.path.getsize(OUTPUT_FILE)
            if file_size > 0:
                print(f"✓ Berhasil! File tersimpan di: {OUTPUT_FILE}")
                print(f"  Ukuran file: {file_size:,} bytes ({file_size / 1024:.2f} KB)")
                print()
                print("File siap digunakan!")
                print()
                print("💡 TIP: Untuk mengubah parameter suara, edit bagian KONFIGURASI di atas")
                if not PYDUB_AVAILABLE and PITCH_SHIFT != 0:
                    print()
                    print("⚠️  Install pydub untuk pitch control:")
                    print("   pip install pydub")
                    print("   Untuk Windows, install juga ffmpeg atau simpleaudio")
                return True
            else:
                raise Exception("File final kosong")
        else:
            raise Exception("File final tidak dibuat")
            
    except Exception as e:
        print(f"✗ ERROR: {e}")
        print(f"  Tipe error: {type(e).__name__}")
        print()
        print("=== TROUBLESHOOTING ===")
        print("1. Pastikan koneksi internet stabil")
        print("2. Pastikan gTTS terinstall: pip install gtts")
        print("3. Cek parameter LANG, TLD, dan SLOW di konfigurasi")
        print("4. Coba jalankan lagi")
        return False

if __name__ == "__main__":
    success = main()
    if not success:
        exit(1)