# Analisa Petshop

Aplikasi Analisa & Monitoring Penjualan, Pembelian Supplier, Target Sales, dan Poin Kinerja Petshop.

---

## 🛠️ Menjalankan di Komputer Lokal (Development)

Di komputer lokal, aplikasi berjalan di port standar:
- **Frontend (Vite HMR)**: `http://localhost:3000`
- **Backend API (Express)**: `http://localhost:3001`

### Perintah:
```bash
# 1. Jalankan server dev lokal
npm run dev

# 2. Buka di browser
http://localhost:3000
```

---

## 🐳 Deployment ke ZimaOS (Docker Container di Port 8090)

Aplikasi sudah dilengkapi dengan [Dockerfile](file:///Users/wisnuwar/Documents/Coding/AnalisaPetshop/Dockerfile) dan [docker-compose.yml](file:///Users/wisnuwar/Documents/Coding/AnalisaPetshop/docker-compose.yml) yang dikonfigurasi khusus untuk mengekspos port **8090**.

### 1. Upload Folder Proyek ke ZimaOS
Copy atau clone folder ini ke ZimaOS Anda (misalnya di `/DATA/AppData/analisa-petshop`).

### 2. Jalankan Container
Masuk ke terminal ZimaOS di folder proyek, lalu jalankan:
```bash
docker compose up -d --build
```

### 3. Akses di ZimaOS
Buka browser:
```
http://<IP-ZIMAOS-ANDA>:8090
```

Container web akan otomatis menjalankan build production dan menghubungkan database postgres internal di port 8090.
# AnalisaPetshop
