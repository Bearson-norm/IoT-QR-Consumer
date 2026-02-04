# Voice Generation dengan gTTS

Script untuk generate suara dari teks menggunakan Google Text-to-Speech (gTTS).

## Instalasi

```bash
pip install -r requirements.txt
# atau
pip install gtts
```

## Penggunaan

```bash
python app.py
```

## Konfigurasi

Edit file `app.py` untuk mengubah parameter suara:

### Parameter yang Bisa Diubah:

1. **LANG** - Bahasa
   - `"id"` - Indonesia (default)
   - `"en"` - English
   - `"es"` - Spanish
   - `"fr"` - French
   - `"de"` - German
   - `"ja"` - Japanese
   - dll. (kode ISO 639-1)

2. **TLD** - Top-Level Domain (mempengaruhi aksen)
   - `"co.id"` - Indonesia (default, lebih natural untuk bahasa Indonesia)
   - `"com"` - Default/US
   - `"co.uk"` - UK English
   - `"com.au"` - Australian English
   - `"co.in"` - India

3. **SLOW** - Kecepatan bicara
   - `False` - Normal speed (default)
   - `True` - Slow speed (lebih jelas, cocok untuk pembelajaran)

4. **PITCH_SHIFT** - Perubahan pitch (membutuhkan pydub)
   - `0` - Normal (default)
   - `-12` sampai `-1` - Lebih rendah (suara pria)
   - `+1` sampai `+12` - Lebih tinggi (suara wanita)
   - Contoh: `-5` (pria), `0` (normal), `+5` (wanita)
   - **Catatan**: Range yang disarankan: -5 sampai +5 untuk hasil natural
   - **Install**: `pip install pydub` (untuk Windows, install juga ffmpeg)

5. **TEXT** - Teks yang akan diubah menjadi suara

6. **OUTPUT_FILE** - Nama file output (default: "output_edge.mp3")

## Bahasa yang Didukung

gTTS mendukung banyak bahasa. Beberapa contoh:
- `id` - Indonesia
- `en` - English
- `es` - Spanish
- `fr` - French
- `de` - German
- `ja` - Japanese
- dll.

Lihat dokumentasi gTTS untuk daftar lengkap: https://gtts.readthedocs.io/

## Contoh Penggunaan Parameter

### Parameter Dasar (gTTS)
```python
# Indonesia normal
tts = gTTS(text="Halo", lang="id", tld="co.id", slow=False)

# Indonesia lambat
tts = gTTS(text="Halo", lang="id", tld="co.id", slow=True)

# English US
tts = gTTS(text="Hello", lang="en", tld="com", slow=False)
```

### Kontrol Pitch (dengan pydub)
Edit `PITCH_SHIFT` di `app.py`:
```python
PITCH_SHIFT = -5   # Suara pria (lebih rendah)
PITCH_SHIFT = 0    # Normal
PITCH_SHIFT = +5   # Suara wanita (lebih tinggi)
```

### Script Contoh

1. **Berbagai kombinasi parameter dasar**:
   ```bash
   python app_examples.py
   ```

2. **Berbagai pitch** (membutuhkan pydub):
   ```bash
   python app_pitch_examples.py
   ```

## Keuntungan gTTS

✅ Lebih reliable dibanding edge_tts
✅ Tidak memerlukan API key
✅ Mudah digunakan
✅ Mendukung banyak bahasa
✅ Kualitas suara bagus
✅ Bisa mengubah aksen dengan parameter TLD
✅ Bisa mengatur kecepatan bicara
✅ **Bisa mengubah pitch dengan pydub** (setelah audio dibuat)

## Instalasi untuk Pitch Control

Untuk menggunakan fitur pitch control, install pydub:

```bash
pip install pydub
```

**Untuk Windows**, install juga salah satu dari:
- FFmpeg: Download dari https://ffmpeg.org/download.html
- Atau: `pip install simpleaudio`

**Untuk Linux/Mac**:
```bash
# Ubuntu/Debian
sudo apt-get install ffmpeg

# Mac
brew install ffmpeg
```

## Catatan

- Memerlukan koneksi internet
- Menggunakan layanan Google (gratis, tapi ada rate limit)
- File output format MP3

