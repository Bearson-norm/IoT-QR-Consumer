# Perbandingan Model Text-to-Speech

Dokumen ini membandingkan berbagai model TTS yang tersedia di folder ini.

## 📊 Tabel Perbandingan

| Model | Kualitas | Pitch Control | Rate Control | Volume Control | Internet | Biaya | Bahasa ID |
|-------|----------|---------------|--------------|----------------|----------|-------|-----------|
| **gTTS** | ⭐⭐⭐ | ❌ (via pydub) | ✅ (slow) | ❌ | ✅ | Gratis | ✅ |
| **OpenAI TTS** | ⭐⭐⭐⭐⭐ | ❌ (via voice) | ✅ | ❌ | ✅ | Berbayar | ❌ (English) |
| **Azure TTS** | ⭐⭐⭐⭐⭐ | ✅ Native | ✅ Native | ✅ Native | ✅ | Free tier | ✅ |
| **pyttsx3** | ⭐⭐ | ❌ | ✅ | ✅ | ❌ | Gratis | ⚠️ (tergantung sistem) |
| **edge_tts** | ⭐⭐⭐⭐ | ❌ | ✅ | ❌ | ✅ | Gratis | ✅ |

## 🎯 Rekomendasi Berdasarkan Kebutuhan

### 1. **Kualitas Terbaik + Kontrol Pitch Native**
   → **Azure TTS** (`app_azure.py`)
   - ✅ Kontrol pitch, rate, volume native
   - ✅ Mendukung bahasa Indonesia
   - ✅ Free tier: 5 juta karakter/bulan
   - ❌ Membutuhkan Azure account

### 2. **Gratis + Kontrol Pitch (via pydub)**
   → **gTTS** (`app.py`)
   - ✅ Gratis
   - ✅ Mudah digunakan
   - ✅ Mendukung bahasa Indonesia
   - ✅ Pitch control via pydub
   - ❌ Tidak ada kontrol pitch native

### 3. **Kualitas Premium (English)**
   → **OpenAI TTS** (`app_openai.py`)
   - ✅ Kualitas sangat bagus
   - ✅ 6 voice berbeda
   - ✅ Kontrol speed
   - ❌ Tidak mendukung bahasa Indonesia
   - ❌ Berbayar (tapi murah)

### 4. **Offline + Gratis**
   → **pyttsx3** (`app_offline.py` atau `app_pyttsx3_advanced.py`)
   - ✅ Tidak perlu internet
   - ✅ Gratis
   - ✅ Kontrol rate dan volume
   - ⚠️ Kualitas tergantung sistem
   - ⚠️ Bahasa Indonesia tergantung sistem

## 📝 Detail Setiap Model

### gTTS (Google Text-to-Speech)
**File**: `app.py`

**Kelebihan:**
- Gratis, tidak perlu API key
- Mudah digunakan
- Mendukung banyak bahasa termasuk Indonesia
- Bisa kontrol pitch via pydub

**Kekurangan:**
- Tidak ada kontrol pitch native
- Membutuhkan internet
- Kualitas cukup baik tapi tidak premium

**Instalasi:**
```bash
pip install gtts pydub
```

---

### OpenAI TTS
**File**: `app_openai.py`

**Kelebihan:**
- Kualitas sangat bagus
- 6 voice berbeda (alloy, echo, fable, onyx, nova, shimmer)
- Kontrol speed
- API mudah digunakan

**Kekurangan:**
- Tidak mendukung bahasa Indonesia (hanya English)
- Berbayar (~$15 per 1 juta karakter)
- Membutuhkan API key

**Instalasi:**
```bash
pip install openai
```

**Setup:**
1. Dapatkan API key dari https://platform.openai.com/api-keys
2. Set environment variable: `OPENAI_API_KEY=sk-your-key`

---

### Azure Cognitive Services TTS
**File**: `app_azure.py`

**Kelebihan:**
- ✅ **KONTROL PITCH NATIVE** (via SSML)
- Kontrol rate dan volume native
- Kualitas sangat bagus
- Mendukung bahasa Indonesia (ArdiNeural, GadisNeural)
- Free tier: 5 juta karakter/bulan

**Kekurangan:**
- Membutuhkan Azure account
- Setup sedikit lebih kompleks
- Membutuhkan internet

**Instalasi:**
```bash
pip install azure-cognitiveservices-speech
```

**Setup:**
1. Buat Azure account (gratis)
2. Buat Speech Service di Azure Portal
3. Copy Key dan Region
4. Set environment variable: `AZURE_SPEECH_KEY=your-key`

**Contoh Parameter:**
```python
PITCH = "+10Hz"   # Lebih tinggi
PITCH = "-10Hz"   # Lebih rendah
RATE = "+20%"     # Lebih cepat
VOLUME = "+10%"   # Lebih keras
```

---

### pyttsx3 (Offline)
**File**: `app_offline.py` atau `app_pyttsx3_advanced.py`

**Kelebihan:**
- Tidak perlu internet
- Gratis
- Kontrol rate dan volume
- Menggunakan suara sistem

**Kekurangan:**
- Kualitas tergantung sistem
- Bahasa Indonesia tidak selalu tersedia
- Tidak ada kontrol pitch
- Suara terbatas

**Instalasi:**
```bash
pip install pyttsx3
```

**Windows**: SAPI5 sudah built-in
**Linux**: `sudo apt-get install espeak`
**Mac**: `pip install pyobjc`

---

## 🎚️ Kontrol Pitch

### Model dengan Kontrol Pitch Native:
1. **Azure TTS** - ✅ Via SSML (`pitch="+10Hz"`)
2. **OpenAI TTS** - ❌ Tapi punya 6 voice berbeda

### Model dengan Kontrol Pitch via Library:
1. **gTTS** - ✅ Via pydub (post-processing)

### Model Tanpa Kontrol Pitch:
1. **pyttsx3** - ❌ Tapi bisa pilih suara pria/wanita

## 💰 Biaya

| Model | Biaya |
|-------|-------|
| gTTS | Gratis |
| pyttsx3 | Gratis |
| Azure TTS | Free tier: 5M karakter/bulan, lalu $4 per 1M karakter |
| OpenAI TTS | ~$15 per 1M karakter |
| edge_tts | Gratis |

## 🚀 Quick Start

### Untuk Kontrol Pitch Terbaik:
```bash
# Install Azure TTS
pip install azure-cognitiveservices-speech

# Setup API key
set AZURE_SPEECH_KEY=your-key  # Windows
export AZURE_SPEECH_KEY=your-key  # Linux/Mac

# Run
python app_azure.py
```

### Untuk Gratis + Pitch Control:
```bash
# Install
pip install gtts pydub

# Run
python app.py
# Edit PITCH_SHIFT di app.py untuk mengubah pitch
```

### Untuk Offline:
```bash
# Install
pip install pyttsx3

# Run
python app_pyttsx3_advanced.py
```

## 📌 Kesimpulan

**Jika Anda butuh kontrol pitch native terbaik:**
→ Gunakan **Azure TTS** (`app_azure.py`)

**Jika Anda butuh gratis + pitch control:**
→ Gunakan **gTTS** (`app.py`) dengan pydub

**Jika Anda butuh offline:**
→ Gunakan **pyttsx3** (`app_pyttsx3_advanced.py`)



