# Troubleshooting Guide

## Error: "Cannot create property 'lastLogTime' on number"

### Penjelasan
Error ini **BUKAN** dari proyek IoT-QR-Consumer. Error ini berasal dari aplikasi lain yang mungkin berjalan bersamaan atau salah package yang di-deploy.

### Ciri-ciri Error dari Aplikasi Lain:
- Log menunjukkan "Work Order", "RecipePanel", "TEH M4B2002"
- WebSocket connection ke `ws://localhost:3001/ws/scale`
- File error: `index-c560ad2c.js` (file bundle yang sudah di-compile)

### Solusi untuk IoT-QR-Consumer:

#### 1. Pastikan Package yang Benar
```bash
# Pastikan Anda di direktori yang benar
cd IoT-QR-Consumer

# Cek file yang ada
ls -la

# Pastikan ada file-file berikut:
# - server.js
# - package.json
# - public/index.html
# - routes/scan.js
```

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Build dan Deploy
```bash
# Untuk development
npm start

# Atau untuk production
NODE_ENV=production npm start
```

#### 4. Cek Port yang Digunakan
Pastikan port 3000 tidak digunakan aplikasi lain:
```bash
# Windows
netstat -ano | findstr :3000

# Linux/Mac
lsof -i :3000
```

#### 5. Clear Cache Browser
Jika error muncul di browser:
- Clear browser cache
- Hard refresh (Ctrl+Shift+R atau Cmd+Shift+R)
- Coba di incognito/private mode

## Error Umum Lainnya

### Database Error
```bash
# Jika database.sqlite tidak ada, akan dibuat otomatis
# Jika ada error, hapus dan buat ulang:
rm database.sqlite
npm start
```

### Port Already in Use
```bash
# Ganti port di server.js atau gunakan environment variable
PORT=3001 npm start
```

### Module Not Found
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## Verifikasi Aplikasi Berjalan dengan Benar

1. **Cek Server Running:**
   ```
   http://localhost:3000
   ```

2. **Test Endpoints:**
   - GET `/` - Halaman utama scanner
   - GET `/reporting` - Halaman reporting
   - GET `/ovt-input` - Halaman input OVT
   - POST `/api/scan` - API scan
   - GET `/api/employee` - API list employee

3. **Cek Console Browser:**
   - Buka Developer Tools (F12)
   - Tab Console tidak ada error
   - Tab Network menunjukkan request berhasil

## Jika Masih Ada Error

1. **Cek Log Server:**
   ```bash
   npm start
   # Lihat output di terminal
   ```

2. **Cek Browser Console:**
   - F12 → Console tab
   - Screenshot error yang muncul

3. **Cek Network Tab:**
   - F12 → Network tab
   - Lihat request yang gagal (status merah)

4. **Pastikan Database:**
   ```bash
   node scripts/check-employees.js
   ```

## Kontak Support

Jika masalah masih terjadi, siapkan informasi berikut:
- Screenshot error
- Output `npm start`
- Browser console log
- Versi Node.js (`node --version`)
- OS yang digunakan








