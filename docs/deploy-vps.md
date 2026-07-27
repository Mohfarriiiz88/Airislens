# Deploy AirisLens ke VPS Ubuntu

Panduan ini diasumsikan untuk Ubuntu 24.04, Node.js 22, Nginx, dan MariaDB di VPS yang sama. Jika database Anda berada di server lain, install `mariadb-client` saja dan arahkan `DB_HOST` ke host database tersebut.

## 1. Install paket sistem

```bash
sudo apt update
sudo apt install -y curl git nginx mariadb-server mariadb-client
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

node -v
npm -v
mysql --version
```

Catatan:
- Error `mysql: command not found` seperti di screenshot berarti client MySQL/MariaDB belum terpasang.
- Aplikasi ini memang memakai MySQL/MariaDB melalui `mysql2`.

## 2. Siapkan database

Masuk ke MariaDB:

```bash
sudo mysql
```

Buat database dan user:

```sql
CREATE DATABASE airislens CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'airislens'@'127.0.0.1' IDENTIFIED BY 'ganti-password-kuat';
GRANT ALL PRIVILEGES ON airislens.* TO 'airislens'@'127.0.0.1';
FLUSH PRIVILEGES;
EXIT;
```

## 3. Ambil source code

```bash
sudo mkdir -p /var/www/airislens
sudo chown -R $USER:$USER /var/www/airislens
cd /var/www/airislens
git clone <URL-REPO-ANDA> current
cd current
```

## 4. Buat environment production

Gunakan file contoh ini:

```bash
cp .env.production.example .env.production
nano .env.production
```

Field minimum yang harus diisi:
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET`
- `SETTINGS_ENCRYPTION_KEY`
- `MIDTRANS_SERVER_KEY`
- `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`
- `MIDTRANS_IS_PRODUCTION`
- `FONNTE_TOKEN`
- `ADMIN_WA`
- `OPENROUTER_API_KEY`

Generate secret:

```bash
openssl rand -base64 48
openssl rand -base64 32
```

Gunakan hasil:
- `openssl rand -base64 48` untuk `JWT_SECRET`
- `openssl rand -base64 32` untuk `SETTINGS_ENCRYPTION_KEY`

## 5. Import schema database

Aplikasi ini sudah punya schema SQL penuh di repo:

```bash
mysql -u airislens -p airislens < database/ddl/airislens_relational_model.sql
mysql -u airislens -p airislens < database/migrations/2026-07-12_01_add_midtrans_config.sql
```

## 6. Install dependency dan build

```bash
npm ci
npm run build
```

Repo ini sekarang memakai `output: "standalone"`, jadi hasil build produksi utama ada di `.next/standalone`.

Salin aset statis agar ikut dilayani oleh `server.js`:

```bash
cp -r public .next/standalone/
mkdir -p .next/standalone/.next
cp -r .next/static .next/standalone/.next/
```

## 7. Seed superadmin

Script `seed-superadmin` membaca env dari process shell. Cara paling aman di VPS:

```bash
set -a
source .env.production
set +a

export SUPERADMIN_NAME="Super Admin"
export SUPERADMIN_EMAIL="admin@domainanda.com"
export SUPERADMIN_PASSWORD='PasswordKuat!123'

npm run seed:superadmin
```

## 8. Uji jalan manual

```bash
HOSTNAME=0.0.0.0 PORT=3000 node .next/standalone/server.js
```

Lalu cek:

```bash
curl http://127.0.0.1:3000
```

Jika sudah benar, hentikan proses manual dengan `Ctrl+C`.

## 9. Daftarkan sebagai service systemd

Contoh file ada di `ops/airislens.service.example`.

Install:

```bash
sudo cp ops/airislens.service.example /etc/systemd/system/airislens.service
sudo nano /etc/systemd/system/airislens.service
```

Pastikan nilai ini benar:
- `User`
- `Group`
- `WorkingDirectory`
- `EnvironmentFile`

Aktifkan service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable airislens
sudo systemctl start airislens
sudo systemctl status airislens
```

Lihat log bila gagal:

```bash
journalctl -u airislens -n 200 --no-pager
```

## 10. Pasang reverse proxy Nginx

Contoh file ada di `ops/nginx.airislens.conf.example`.

Install:

```bash
sudo cp ops/nginx.airislens.conf.example /etc/nginx/sites-available/airislens
sudo nano /etc/nginx/sites-available/airislens
sudo ln -s /etc/nginx/sites-available/airislens /etc/nginx/sites-enabled/airislens
sudo nginx -t
sudo systemctl reload nginx
```

Ganti `server_name` dengan domain Anda.

## 11. Pasang HTTPS

Jika domain sudah mengarah ke VPS:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d example.com -d www.example.com
```

## 12. Checklist troubleshooting

- `mysql: command not found`
  Install `mariadb-client` atau `mariadb-server`.
- `ECONNREFUSED 127.0.0.1:3306`
  MariaDB belum jalan, `DB_HOST` salah, atau user database belum dibuat.
- `Missing required environment variable`
  Ada env wajib yang belum terisi di `.env.production`.
- Midtrans tidak muncul
  Cek `MIDTRANS_SERVER_KEY`, `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`, dan `MIDTRANS_IS_PRODUCTION`.
- Service `airislens` restart terus
  Cek `journalctl -u airislens -n 200 --no-pager`.

## 13. Update aplikasi ke versi baru

```bash
cd /var/www/airislens/current
git pull
npm ci
npm run build
cp -r public .next/standalone/
mkdir -p .next/standalone/.next
cp -r .next/static .next/standalone/.next/
sudo systemctl restart airislens
```
