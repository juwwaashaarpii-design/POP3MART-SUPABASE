# POP-3 MART UAS | HTML + CSS + JavaScript + Supabase

Project ini adalah versi static website dari POP-3 MART. Frontend memakai HTML, CSS, dan JavaScript; Supabase menyediakan Authentication, PostgreSQL database, dan Storage untuk gambar produk. GitHub Pages dipakai untuk hosting file website.

## Fitur

### Buyer
- Daftar akun dengan email dan password.
- Verifikasi email melalui tautan yang dikirim Supabase Auth.
- Login dan logout.
- Dashboard buyer dan katalog figure.
- Cari produk dan filter kategori.
- Simpan/hapus figure dari wishlist.
- Ubah nama, nomor telepon, dan alamat profil.

### Admin
- Login menggunakan halaman login yang sama. Role dibaca dari database.
- Dashboard statistik total figure, produk aktif, stok habis, dan jumlah buyer.
- Tambah, edit, sembunyikan, dan hapus figure.
- Upload gambar produk dari komputer ke Supabase Storage.
- Ubah harga, stok, kategori, deskripsi, dan status tayang.
- Ubah nama toko, email support, WhatsApp, dan pengumuman.

### Keamanan
- Semua akun yang daftar dari website otomatis menjadi `buyer`.
- Tidak ada pilihan role admin pada halaman pendaftaran.
- Admin harus dipromosikan secara manual melalui Supabase SQL Editor.
- RLS (Row Level Security) membatasi akses data di database. Policy juga membatasi upload gambar hanya untuk admin.
- `SUPABASE_PUBLISHABLE_KEY` / legacy `anon` key boleh digunakan di frontend jika RLS aktif dan benar. **Jangan pernah menaruh `service_role` atau secret key di JavaScript, HTML, atau repository GitHub.**

## Isi folder

```text
POP3MART_SUPABASE/
├── admin/
│   ├── dashboard.html
│   ├── products.html
│   └── settings.html
├── buyer/
│   ├── dashboard.html
│   ├── shop.html
│   ├── wishlist.html
│   └── profile.html
├── assets/
│   ├── css/style.css
│   └── js/
│       ├── config.js
│       ├── supabase.js
│       ├── common.js
│       └── scripts halaman lainnya
├── database/schema.sql
├── index.html
├── login.html
├── register.html
└── auth-callback.html
```

# ARAHAN INSTALASI DARI AWAL

## Bagian A. Membuat project Supabase

1. Buka [Supabase](https://supabase.com/) dan login / buat akun.
2. Klik **New project**.
3. Pilih organisasi, isi nama project misalnya `POP-3-MART`, buat database password yang kuat, lalu pilih region terdekat yang tersedia.
4. Tunggu sampai project selesai dibuat.
5. Buka **SQL Editor** di dashboard Supabase.
6. Klik **New query**.
7. Buka file `database/schema.sql` dari folder project ini, salin seluruh isinya, tempel ke SQL Editor, lalu klik **Run**.
8. Pastikan query selesai tanpa error. Script ini membuat tabel `profiles`, `products`, `wishlist_items`, `store_settings`, policy keamanan RLS, dan bucket Storage `product-images`.

## Bagian B. Menghubungkan website ke Supabase

1. Di Supabase, buka **Project Settings > API Keys** (di beberapa tampilan dashboard bisa bernama **API**).
2. Salin **Project URL**.
3. Salin **Publishable key** (`sb_publishable_...`). Jika project menampilkan key lama, gunakan `anon` / public key.
4. Buka folder project di VS Code.
5. Buka `assets/js/config.js`.
6. Ganti dua nilai placeholder menjadi milik project kamu:

```js
export const SUPABASE_URL = "https://PROJECT-ID-KAMU.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_KEY_KAMU";
```

Jangan menyalin `service_role` atau `secret` key. Publishable/anon key memang digunakan di browser; keamanan datanya dijaga oleh RLS.

## Bagian C. Mengaktifkan verifikasi email

1. Di Supabase buka **Authentication > Providers > Email**.
2. Pastikan provider Email aktif.
3. Aktifkan **Confirm email** agar user wajib membuka email verifikasi sebelum login.
4. Buka **Authentication > URL Configuration**.
5. Untuk tes lokal dengan VS Code Live Server, tambahkan URL berikut ke **Redirect URLs**:

```text
http://127.0.0.1:5500/**
http://localhost:5500/**
```

6. Setelah website terbit di GitHub Pages, tambahkan URL website kamu juga. Contoh jika username GitHub `namakamu` dan nama repository `POP3MART_SUPABASE`:

```text
https://namakamu.github.io/POP3MART_SUPABASE/**
```

7. Atur **Site URL** ke URL utama GitHub Pages setelah website sudah diterbitkan. Saat uji lokal, gunakan URL lokal yang sedang dipakai.
8. Untuk pengiriman email yang lebih andal, konfigurasi SMTP sendiri di Supabase **Authentication > SMTP Settings**. Layanan email bawaan memiliki batas penggunaan dan bukan pilihan ideal untuk produksi.

Catatan: verifikasi di versi ini memakai **tautan email Supabase**, bukan kode OTP 6 karakter seperti versi PHP sebelumnya.

## Bagian D. Menjalankan website di laptop (Laragon / VS Code)

Website ini tidak membutuhkan PHP atau MySQL lokal. Database berada di Supabase.

**Cara yang direkomendasikan: VS Code Live Server**
1. Buka folder `POP3MART_SUPABASE` di VS Code.
2. Install extension **Live Server** jika belum ada.
3. Klik kanan `index.html` > **Open with Live Server**.
4. Website biasanya terbuka di `http://127.0.0.1:5500/`.
5. Coba daftar buyer, buka email verifikasi, lalu login.

Jangan membuka file dengan alamat `file:///...` karena modul JavaScript dan autentikasi membutuhkan web server lokal. Laragon juga boleh dipakai hanya sebagai local web server: letakkan folder di `C:\laragon\www\` lalu buka melalui `http://localhost/POP3MART_SUPABASE/`.

## Bagian E. Membuat akun Admin

1. Jalankan website dan daftar akun menggunakan email yang akan dijadikan admin.
2. Buka inbox email tersebut dan klik tautan verifikasi.
3. Login sekali sebagai buyer (atau pastikan pendaftaran selesai).
4. Buka Supabase **SQL Editor > New query**.
5. Jalankan perintah berikut. Ganti email contoh dengan email admin yang benar:

```sql
update public.profiles
set role = 'admin'
where lower(email) = lower('email-admin-kamu@example.com');
```

6. Logout dari website, lalu login kembali.
7. Website akan membaca role dari database dan mengarahkan akun ke **Admin Dashboard**.

Jangan pernah membuat form publik yang mengizinkan pengunjung memilih role Admin.

## Bagian F. Upload ke GitHub Pages

1. Buat repository baru di GitHub, misalnya `POP3MART_SUPABASE`.
2. Upload seluruh isi folder project ini ke repository. Pastikan `index.html` berada di root repository, bukan di dalam folder tambahan.
3. Buka repository > **Settings > Pages**.
4. Pada **Build and deployment**, pilih **Deploy from a branch**.
5. Pilih branch `main` dan folder `/(root)`, lalu klik **Save**.
6. Tunggu proses deployment selesai. GitHub akan menampilkan alamat website, biasanya:

```text
https://USERNAME.github.io/POP3MART_SUPABASE/
```

7. Masukkan alamat itu ke Supabase **Authentication > URL Configuration > Redirect URLs** seperti pada Bagian C.
8. Tes lagi register, verifikasi email, login Buyer, login Admin, upload gambar, dan perubahan katalog.

GitHub Pages hanya meng-host file HTML/CSS/JS. Database, login, dan file gambar tetap dikelola oleh Supabase.

## Cara memakai dashboard Admin

1. Login menggunakan akun yang role-nya sudah `admin`.
2. Buka **Manage Figures**.
3. Klik **Tambah Figure**.
4. Isi nama, kategori, harga, stok, deskripsi, dan pilih gambar.
5. Centang **Tampilkan produk di katalog buyer** jika produk ingin terlihat.
6. Klik **Simpan Produk**.
7. Untuk mengubah produk, klik **Edit** pada baris produk.
8. Untuk menghapus, klik **Hapus** dan konfirmasi.
9. Perubahan akan tersimpan ke Supabase dan katalog buyer akan mengambil data terbaru.

## Troubleshooting singkat

- **Halaman menampilkan Supabase belum dikonfigurasi:** periksa `assets/js/config.js`.
- **Invalid API key:** pastikan memakai Publishable key atau legacy anon key, bukan secret/service_role.
- **Email tidak datang:** cek Spam, status Confirm email, URL Configuration, dan pengaturan SMTP.
- **Email confirmation redirect tidak cocok:** pastikan URL `auth-callback.html` (termasuk nama repository pada GitHub Pages) masuk ke daftar Redirect URLs.
- **Tidak bisa tambah/edit produk:** pastikan akun memiliki role `admin` di `public.profiles` dan schema SQL sudah dijalankan.
- **Upload gambar ditolak:** pastikan bucket `product-images` ada, format JPG/PNG/WEBP, ukuran maksimal 5 MB, dan policy Storage sudah dibuat oleh schema.
- **Buyer tidak bisa mengakses halaman admin:** ini memang disengaja. Role diperiksa di database melalui RLS dan kode halaman.

## Batasan versi ini

- Belum ada checkout, pembayaran online, keranjang belanja, pengelolaan pesanan, atau reset password kustom.
- Wishlist dan katalog sudah tersambung ke database.
- Produk dan gambar sudah dapat dikelola Admin.
- Untuk toko produksi sungguhan, tambahkan backend/Edge Function untuk proses sensitif seperti pembayaran dan pembuatan pesanan. Jangan melakukan validasi transaksi hanya di browser.
