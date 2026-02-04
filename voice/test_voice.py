import os

text = "Halo, ini adalah percobaan menggunakan perintah sistem. Semoga berhasil."
voice = "id-ID-GadisNeural"
output = "audio_final.mp3"

# Menjalankan perintah terminal lewat Python
command = f'edge-tts --text "{text}" --voice {voice} --write-media {output}'

print("Sedang menjalankan perintah...")
exit_code = os.system(command)

if exit_code == 0:
    print(f"Sukses! Cek file {output}")
else:
    print("Gagal. Pastikan library edge-tts terinstall.")

