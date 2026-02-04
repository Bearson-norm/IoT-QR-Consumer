# IoT QR Consumer - Employee Matching System

Sistem matching data karyawan dengan database menggunakan QR Code Scanner. Sistem ini memiliki fitur pembatasan scan harian dan reporting data.

## Fitur

- **Scan Matching**: Matching data employee dengan database
- **Daily Limit**: Setiap karyawan hanya dapat melakukan scan maksimal 2 kali per hari
  - Scan pertama: Status "Normal"
  - Scan kedua: Status "Overtime"
  - Scan ketiga dan seterusnya: Ditolak
- **Reporting**: Tabel laporan dengan kolom dinamis berdasarkan tanggal
- **Modal Popup**: Menampilkan popup sukses atau penolakan

## Teknologi

- **Backend**: Node.js + Express
- **Database**: SQLite
- **Frontend**: HTML, CSS, JavaScript (Vanilla)

## Instalasi

1. Install dependencies:
```bash
npm install
```

2. Jalankan server:
```bash
npm start
```

Untuk development dengan auto-reload:
```bash
npm run dev
```

3. Buka browser di `http://localhost:3000`

## Struktur Database

### Tabel `employee_data`
- `employee_id` (TEXT, PRIMARY KEY)
- `name` (TEXT)

### Tabel `scan_records`
- `id` (INTEGER, PRIMARY KEY, AUTOINCREMENT)
- `employee_id` (TEXT, FOREIGN KEY)
- `scan_date` (DATE)
- `scan_type` (TEXT) - 'normal' atau 'overtime'
- `scan_time` (DATETIME)

## API Endpoints

### POST `/api/scan`
Matching dan recording scan employee.

**Request:**
```json
{
  "employee_id": "EMP001"
}
```

**Response Success:**
```json
{
  "success": true,
  "message": "Scan berhasil! Status: Normal",
  "type": "success",
  "employee": {
    "employee_id": "EMP001",
    "name": "John Doe"
  },
  "scan_type": "normal",
  "scan_count": 1
}
```

**Response Rejection:**
```json
{
  "success": false,
  "message": "Anda sudah melakukan scan lebih dari 2 kali hari ini",
  "type": "rejection",
  "employee": {
    "employee_id": "EMP001",
    "name": "John Doe"
  }
}
```

### GET `/api/report?days=7`
Mendapatkan data laporan untuk N hari terakhir.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "employee_id": "EMP001",
      "name": "John Doe",
      "dates": {
        "19/11/25": {
          "normal": true,
          "overtime": false
        }
      }
    }
  ],
  "dates": ["19/11/25", "20/11/25", ...]
}
```

### GET `/api/employee`
Mendapatkan daftar semua employee.

### POST `/api/employee`
Menambahkan employee baru.

## Penggunaan

1. **Scan Employee**: Masukkan atau scan Employee ID di halaman utama
2. **Lihat Reporting**: Klik tombol "Lihat Reporting" untuk melihat laporan scan
3. **Input OVT**: Login dan input jadwal makan overtime untuk employee

## Sample Data

Sistem akan otomatis membuat sample data employee saat pertama kali dijalankan:
- EMP001 - John Doe
- EMP002 - Jane Smith
- EMP003 - Bob Johnson
- EMP004 - Alice Williams
- EMP005 - Charlie Brown

## Troubleshooting

Jika menemukan error, lihat file `TROUBLESHOOTING.md` untuk panduan lengkap.

### Error Umum:

**Error: "Cannot create property 'lastLogTime' on number"**
- Error ini **BUKAN** dari aplikasi ini
- Pastikan Anda menjalankan aplikasi yang benar (IoT-QR-Consumer)
- Cek bahwa port 3000 tidak digunakan aplikasi lain

**Database Error:**
```bash
# Hapus dan buat ulang database
rm database.sqlite
npm start
```

**Port Already in Use:**
```bash
# Gunakan port lain
PORT=3001 npm start
```


