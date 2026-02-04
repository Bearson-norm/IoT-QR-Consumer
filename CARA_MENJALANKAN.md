# Cara Menjalankan Aplikasi IoT-QR-Consumer

## ⚠️ PENTING: Pastikan Anda Menjalankan Aplikasi yang Benar!

Error yang Anda lihat di console browser **BUKAN** dari aplikasi ini jika:
- ❌ Port yang digunakan adalah **3001** (bukan 3000)
- ❌ Ada log tentang "Work Order", "RecipePanel", "TEH M4B2002"
- ❌ Ada WebSocket ke `ws://localhost:3001/ws/scale`
- ❌ Ada API call ke `http://localhost:3001/api/scale/read`

Aplikasi **IoT-QR-Consumer** menggunakan:
- ✅ Port **3000** (default)
- ✅ API: `/api/scan`, `/api/report`, `/api/employee`, `/api/auth`, `/api/ovt`
- ✅ Halaman: `/`, `/reporting`, `/ovt-input`

---

## Langkah-langkah Menjalankan Aplikasi

### 1. Pastikan Anda di Direktori yang Benar
```bash
# Windows
cd C:\Users\info\Documents\Project\not-released\IoT-Project\Released-Github\IoT-QR-Consumer

# Verifikasi dengan melihat file
dir
# Harus ada: server.js, package.json, public/index.html
```

### 2. Install Dependencies (jika belum)
```bash
npm install
```

### 3. Verifikasi Setup
```bash
npm run verify
```

### 4. Jalankan Server
```bash
npm start
```

**Output yang benar:**
```
Connected to SQLite database
employee_data table ready
scan_records table ready
users table ready
Server running on http://localhost:3000
Scheduler started - Daily reset at 6:00 AM WIB
```

### 5. Buka Browser
```
http://localhost:3000
```

**Halaman yang harus muncul:**
- Judul: "QR Code Scanner"
- Ada input field "Employee ID"
- Ada tombol "Scan"
- Ada tombol "Lihat Reporting" dan "Input OVT"

---

## Cara Memastikan Aplikasi yang Benar Berjalan

### Cek di Browser Console (F12)

**Console yang BENAR (IoT-QR-Consumer):**
- ✅ Tidak ada error
- ✅ Tidak ada log tentang "Work Order" atau "RecipePanel"
- ✅ Tidak ada WebSocket ke port 3001
- ✅ Network tab menunjukkan request ke `localhost:3000`

**Console yang SALAH (Aplikasi Lain):**
- ❌ Banyak error 429 (Too Many Requests)
- ❌ Log tentang "Work Order", "RecipePanel", "TEH M4B2002"
- ❌ WebSocket ke `ws://localhost:3001/ws/scale`
- ❌ Request ke `localhost:3001/api/scale/read`

### Cek Port yang Digunakan

**Windows:**
```bash
netstat -ano | findstr :3000
netstat -ano | findstr :3001
```

**Linux/Mac:**
```bash
lsof -i :3000
lsof -i :3001
```

Jika port 3001 digunakan, itu adalah aplikasi lain (bukan IoT-QR-Consumer).

---

## Troubleshooting

### Problem: Port 3000 sudah digunakan
**Solusi:**
```bash
# Gunakan port lain
PORT=3002 npm start
# Lalu buka: http://localhost:3002
```

### Problem: Browser masih menampilkan aplikasi lain
**Solusi:**
1. Tutup semua tab browser
2. Clear browser cache (Ctrl+Shift+Delete)
3. Buka tab baru
4. Ketik manual: `http://localhost:3000`
5. Jangan gunakan bookmark yang mungkin mengarah ke aplikasi lain

### Problem: Masih melihat error dari aplikasi lain
**Solusi:**
1. Tutup aplikasi lain yang berjalan di port 3001
2. Restart browser
3. Pastikan hanya menjalankan `npm start` di direktori IoT-QR-Consumer

---

## Verifikasi Aplikasi Berjalan dengan Benar

### Test 1: Cek Halaman Utama
1. Buka `http://localhost:3000`
2. Harus muncul halaman dengan:
   - Header: "QR Code Scanner"
   - Input field untuk Employee ID
   - Tombol "Scan"

### Test 2: Cek API
Buka di browser atau Postman:
```
http://localhost:3000/api/employee
```
Harus return JSON dengan list employee.

### Test 3: Test Scan
1. Masukkan Employee ID (contoh: `HL210706001`)
2. Klik "Scan"
3. Harus muncul modal sukses atau penolakan
4. Harus ada suara (text-to-speech)

---

## Jika Masih Ada Masalah

1. **Cek terminal/server log:**
   - Pastikan server berjalan tanpa error
   - Pastikan port yang digunakan adalah 3000

2. **Cek browser:**
   - F12 → Console tab
   - F12 → Network tab
   - Pastikan request ke `localhost:3000`, bukan `3001`

3. **Cek direktori:**
   - Pastikan Anda di folder `IoT-QR-Consumer`
   - Bukan di folder aplikasi lain

4. **Restart:**
   ```bash
   # Stop server (Ctrl+C)
   # Hapus node_modules jika perlu
   rm -rf node_modules
   npm install
   npm start
   ```

---

## Catatan Penting

- **Aplikasi ini (IoT-QR-Consumer)** = Port 3000, untuk scan employee
- **Aplikasi lain (Production/Weighing)** = Port 3001, untuk work order/recipe

Pastikan Anda membuka aplikasi yang benar di browser!








