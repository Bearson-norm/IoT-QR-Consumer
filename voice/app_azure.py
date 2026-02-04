"""
Text-to-Speech menggunakan Azure Cognitive Services TTS
Kualitas sangat bagus dengan kontrol pitch, rate, volume native
Membutuhkan Azure account dan API key (ada free tier)
"""
import os
import azure.cognitiveservices.speech as speechsdk

# ============================================
# KONFIGURASI
# ============================================
# Dapatkan dari Azure Portal: https://portal.azure.com
AZURE_SPEECH_KEY = os.getenv("AZURE_SPEECH_KEY", "")  # Atau set langsung
AZURE_SPEECH_REGION = os.getenv("AZURE_SPEECH_REGION", "southeastasia")  # Atau "eastus", dll.

# Parameter suara
VOICE_NAME = "id-ID-ArdiNeural"  # Pilihan: "id-ID-ArdiNeural" (pria), "id-ID-GadisNeural" (wanita)
RATE = "+0%"      # Kecepatan: "-50%" sampai "+200%" (+0% = normal)
PITCH = "+0Hz"    # Pitch: "-50Hz" sampai "+50Hz" (+0Hz = normal)
VOLUME = "+0%"    # Volume: "-100%" sampai "+100%" (+0% = normal)

TEXT = "Halo, ini adalah tes suara menggunakan Azure TTS."
OUTPUT_FILE = "output_azure.wav"

# ============================================
# CATATAN:
# ============================================
# VOICE_NAME untuk Indonesia:
#   - "id-ID-ArdiNeural" - Pria
#   - "id-ID-GadisNeural" - Wanita
#
# RATE: "-50%" (sangat lambat) sampai "+200%" (sangat cepat)
# PITCH: "-50Hz" (rendah) sampai "+50Hz" (tinggi)
# VOLUME: "-100%" (silent) sampai "+100%" (sangat keras)
# ============================================

def main():
    print("=" * 60)
    print("TEXT-TO-SPEECH dengan Azure Cognitive Services")
    print("=" * 60)
    
    if not AZURE_SPEECH_KEY:
        print("✗ ERROR: AZURE_SPEECH_KEY tidak ditemukan!")
        print()
        print("Cara setup:")
        print("1. Buat Azure account (ada free tier)")
        print("2. Buat Speech Service di Azure Portal")
        print("3. Copy Key dan Region")
        print("4. Set environment variable:")
        print("   Windows: set AZURE_SPEECH_KEY=your-key")
        print("   Linux/Mac: export AZURE_SPEECH_KEY=your-key")
        print("5. Atau edit file ini dan set langsung")
        print()
        print("Free tier: 5 juta karakter/bulan gratis")
        return False
    
    print(f"Voice: {VOICE_NAME}")
    print(f"Rate: {RATE}")
    print(f"Pitch: {PITCH}")
    print(f"Volume: {VOLUME}")
    print(f"Teks: {TEXT}")
    print()
    
    try:
        print("Sedang membuat audio...")
        
        # Setup Azure Speech
        speech_config = speechsdk.SpeechConfig(
            subscription=AZURE_SPEECH_KEY,
            region=AZURE_SPEECH_REGION
        )
        speech_config.speech_synthesis_voice_name = VOICE_NAME
        
        # SSML untuk kontrol penuh
        ssml = f"""<speak version='1.0' xml:lang='id-ID'>
            <voice xml:lang='id-ID' name='{VOICE_NAME}'>
                <prosody rate='{RATE}' pitch='{PITCH}' volume='{VOLUME}'>
                    {TEXT}
                </prosody>
            </voice>
        </speak>"""
        
        # Create synthesizer
        audio_config = speechsdk.audio.AudioOutputConfig(filename=OUTPUT_FILE)
        synthesizer = speechsdk.SpeechSynthesizer(
            speech_config=speech_config,
            audio_config=audio_config
        )
        
        # Synthesize
        result = synthesizer.speak_ssml_async(ssml).get()
        
        if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
            if os.path.exists(OUTPUT_FILE):
                file_size = os.path.getsize(OUTPUT_FILE)
                if file_size > 0:
                    print(f"✓ Berhasil! File tersimpan di: {OUTPUT_FILE}")
                    print(f"  Ukuran file: {file_size:,} bytes ({file_size / 1024:.2f} KB)")
                    print()
                    print("💡 Azure TTS memiliki kontrol pitch, rate, dan volume native!")
                    return True
                else:
                    raise Exception("File kosong")
            else:
                raise Exception("File tidak dibuat")
        else:
            cancellation_details = speechsdk.CancellationDetails(result)
            raise Exception(f"Synthesis failed: {cancellation_details.reason}")
            
    except ImportError:
        print("✗ ERROR: Library azure-cognitiveservices-speech tidak terinstall!")
        print()
        print("Install dengan:")
        print("  pip install azure-cognitiveservices-speech")
        return False
    except Exception as e:
        print(f"✗ ERROR: {e}")
        print(f"  Tipe: {type(e).__name__}")
        return False

if __name__ == "__main__":
    main()



