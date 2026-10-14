# Analisa Petshop

Aplikasi Analisa & Monitoring Penjualan, Pembelian Supplier, Target Sales, dan Poin Kinerja Petshop.

---

## 🛠️ Menjalankan di Komputer Lokal (Development)

Di komputer lokal, aplikasi berjalan di port standar:
- **Frontend (Vite HMR)**: `http://localhost:3000`
- **Backend API (Express)**: `http://localhost:3001`

### Perintah:
```bash
# 1. Salin template konfigurasi environment
cp .env.example .env

# 2. Install dependencies & generate database schema
npm install
npx prisma generate
npx prisma db push

# 3. Jalankan server dev lokal
npm run dev

# 4. Buka di browser
http://localhost:3000
```

---

## 🐳 Deployment dengan Docker

Aplikasi sudah dilengkapi dengan [Dockerfile](file:///Users/wisnuwar/Documents/Coding/AnalisaPetshop/Dockerfile) dan [docker-compose.yml](file:///Users/wisnuwar/Documents/Coding/AnalisaPetshop/docker-compose.yml).

### 1. Jalankan Container
```bash
docker compose up -d --build
```

### 2. Akses Aplikasi
Buka browser:
```
http://<IP-SERVER>:<PORT>
```
*(atau `http://localhost:<PORT>` jika dijalankan di mesin lokal)*
