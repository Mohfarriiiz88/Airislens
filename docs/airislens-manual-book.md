# MANUAL BOOK WEBSITE BOOKING FOTOGRAFER AIRISLENS
Panduan Penggunaan Sistem
Disusun berdasarkan implementasi source code AIRISLENS

[[PAGEBREAK]]

## BAB I PENDAHULUAN

### 1.1 Tujuan Pembuatan Dokumen

Dokumen ini disusun sebagai panduan penggunaan website AIRISLENS bagi setiap role yang tersedia di dalam sistem.

Tujuan utama dokumen ini adalah:

- menjelaskan cara menggunakan fitur sesuai implementasi source code,
- membantu pengguna memahami alur penggunaan sistem,
- menjadi dokumen pendukung akademik dan administratif.

### 1.2 Sasaran Pengguna

Dokumen ini ditujukan untuk:

- User / Customer, yaitu pengguna yang mengakses website untuk melihat informasi layanan, melakukan booking, melihat galeri, mengubah profil, dan menggunakan chatbot.
- Admin / Fotografer Partner, yaitu pengguna dengan role `admin` yang mengelola layanan fotografer, booking, jadwal, paket, galeri, keuangan, dan profil partner.
- Super Admin, yaitu pengguna dengan role `superadmin` yang mengelola user, partner, pengajuan partner, finance, dan gallery control.

## BAB II PANDUAN PENGGUNAAN USER

### 2.1 Halaman Utama

Tujuan

Halaman utama berfungsi sebagai pintu masuk website AIRISLENS dan media pengenalan layanan.

Menu yang Tersedia

- `Home`
- `FindFG`
- `Gallery`
- `History`
- `Login` atau nama akun pengguna

Langkah Penggunaan

1. Buka website AIRISLENS melalui browser.
2. Perhatikan menu navigasi pada bagian atas halaman.
3. Gunakan menu `Home`, `FindFG`, `Gallery`, atau `History` untuk berpindah halaman.
4. Scroll halaman untuk melihat informasi utama yang ditampilkan sistem.

Input

- Tidak ada input wajib pada halaman ini.

Output

- Informasi umum layanan AIRISLENS tampil.
- Navigasi menuju fitur user tersedia.

Validasi dan Pesan Sistem

- Menu `History` hanya dapat digunakan oleh user yang login sebagai customer.

Screenshot yang Disarankan

- `user-homepage.png` — tampilan halaman utama AIRISLENS.
- `user-navbar.png` — navigasi utama website.

Catatan

- Halaman utama memuat section hero, preview fotografer, alasan memilih layanan, panduan singkat, dan style fotografi.

### 2.2 Login dan Register

Tujuan

Fitur ini digunakan untuk membuat akun baru dan masuk ke sistem.

Langkah Penggunaan

1. Klik tombol `Login` pada navbar.
2. Untuk membuat akun baru, pilih tab `Register`.
3. Isi `Full Name`, `Email`, dan `Password`.
4. Klik tombol `Register`.
5. Untuk masuk ke sistem, pilih tab `Login`.
6. Isi `Email` dan `Password`.
7. Klik tombol `Login`.

Input

- Register: nama, email, password.
- Login: email, password.

Output

- Akun baru berhasil dibuat dengan role default `user`.
- Sesi login aktif dan pengguna diarahkan ke halaman sesuai role.

Validasi dan Pesan Sistem

- `Nama, email, dan password wajib diisi.`
- `Email dan password wajib diisi.`
- `Email sudah terdaftar.`
- `Email atau password salah.`
- `Password minimal 8 karakter.`
- `Password harus memakai huruf besar dan kecil.`
- `Password harus mengandung angka.`
- `Password harus mengandung simbol.`
- `Password tidak boleh sama atau mengandung email.`
- `Email ini dicadangkan untuk akun superadmin dan tidak bisa dibuat dari register publik.`
- `Tidak dapat terhubung ke server.`

Screenshot yang Disarankan

- `user-login.png` — form login.
- `user-register.png` — form register dan indikator aturan password.

Catatan

- Register publik selalu membuat akun dengan role `user`.
- Setelah login, user diarahkan ke halaman utama, sedangkan admin dan superadmin diarahkan ke dashboard masing-masing.
- Teks `Forgot Password` saat ini hanya tampil di antarmuka dan belum menjalankan alur reset password.

### 2.3 Cara Booking

Tujuan

Booking merupakan proses inti pada AIRISLENS untuk memesan layanan fotografer.

Langkah Penggunaan

1. Buka menu `FindFG`.
2. Pilih kategori fotografer atau lihat seluruh partner yang tersedia.
3. Klik salah satu kartu partner untuk membuka halaman detail.
4. Tinjau deskripsi partner, spesialisasi, lokasi, sosial media, dan daftar paket.
5. Klik tombol `Booking` atau `Choose Package`.
6. Isi `Full Name` dan `WhatsApp Number`.
7. Pilih paket layanan.
8. Pilih tanggal booking.
9. Pilih jam booking yang masih tersedia.
10. Isi alamat acara.
11. Gunakan fitur `Cari alamat`, `Use Current Location`, atau pilih titik pada peta.
12. Pastikan `Event Latitude` dan `Event Longitude` terisi.
13. Tambahkan catatan jika diperlukan.
14. Periksa rincian biaya paket dan biaya transport.
15. Klik tombol pembayaran untuk membuka popup Midtrans Snap.
16. Selesaikan pembayaran.
17. Buka menu `History` untuk melihat hasil booking.
18. Jika tombol tersedia pada `History`, user dapat membatalkan booking, mengajukan refund, atau mengonfirmasi booking selesai.

Input

- Nama lengkap.
- Nomor WhatsApp.
- Paket layanan.
- Tanggal booking.
- Jam booking.
- Alamat acara.
- Latitude acara.
- Longitude acara.
- Catatan.

Output

- Sistem menampilkan rincian biaya booking.
- Sistem membuat data booking.
- Sistem membuka popup pembayaran Midtrans Snap.
- Hasil booking tercatat pada halaman `History`.

Validasi dan Pesan Sistem

- `Tidak ada fotografer yang dipilih. Silakan kembali ke halaman FindFG.`
- `Fotografer ini belum memiliki paket aktif.`
- `Nama lengkap dan nomor WhatsApp wajib diisi.`
- `Tanggal dan jam booking wajib dipilih.`
- `Pilih paket terlebih dahulu.`
- `Alamat acara wajib diisi.`
- `Latitude dan longitude acara wajib diisi.`
- `Latitude atau longitude acara tidak valid.`
- `Masukkan alamat terlebih dahulu sebelum mencari.`
- `Alamat tidak ditemukan. Coba kata kunci yang lebih spesifik.`
- `Layanan pencarian alamat sedang tidak tersedia.`
- `Slot ditutup oleh partner.`
- `Kuota pada jam ini sudah penuh.`
- `Jam yang dipilih sudah tidak tersedia.`
- `Format nomor WhatsApp tidak valid.`
- `Popup pembayaran belum siap. Coba beberapa saat lagi.`
- `Booking berhasil dibuat dan pembayaran sukses. Status booking akan diperbarui otomatis.`
- `Booking sudah dibuat. Pembayaran masih menunggu penyelesaian dari Anda.`
- `Pembayaran gagal diproses. Booking tetap tercatat dan status akhirnya menunggu update dari Midtrans.`
- `Popup pembayaran ditutup. Booking tetap dibuat dan menunggu status pembayaran berikutnya.`

Alur Bisnis

- User memilih partner dan paket dari halaman publik.
- Sistem memeriksa ketersediaan slot berdasarkan tanggal dan jam.
- Sistem menghitung harga paket dan biaya transport dari koordinat lokasi acara.
- Setelah user menekan pembayaran, sistem membuat booking dengan status awal `Pending`.
- Jika pembayaran tervalidasi, status internal dapat berubah menjadi `Confirmed`.
- Saat partner menandai sesi selesai, lifecycle booking berubah menjadi `Menunggu Konfirmasi Customer`.
- Setelah customer menekan `Konfirmasi Selesai`, booking menjadi `Selesai` dan dana dapat dirilis ke partner.

Screenshot yang Disarankan

- `user-findfg.png` — daftar partner pada menu `FindFG`.
- `user-detail-partner.png` — halaman detail partner dan tombol booking.
- `user-booking-form.png` — form booking utama.
- `user-booking-address-search.png` — hasil pencarian alamat.
- `user-booking-map.png` — pemilihan titik lokasi pada peta.
- `user-booking-quote.png` — rincian biaya booking.
- `user-midtrans-popup.png` — popup pembayaran Midtrans Snap.
- `user-booking-history.png` — hasil booking pada menu `History`.

Catatan

- Slot waktu dapat tampil sebagai tersedia, sisa slot terbatas, penuh, atau ditutup partner.
- Halaman `History` menampilkan status lifecycle: `Menunggu Pembayaran`, `Dijadwalkan`, `Menunggu Konfirmasi Customer`, `Selesai`, dan `Dibatalkan`.
- User hanya dapat membatalkan booking pada kondisi yang diizinkan sistem.

### 2.4 Gallery

Tujuan

Halaman `Gallery` digunakan untuk menampilkan foto publik yang tersedia di sistem.

Langkah Penggunaan

1. Klik menu `Gallery`.
2. Tunggu proses loading data selesai.
3. Lihat foto-foto yang tampil pada halaman galeri.

Input

- Tidak ada input wajib.

Output

- Daftar foto galeri publik tampil pada halaman.

Validasi dan Pesan Sistem

- Jika data galeri gagal dimuat, halaman tetap menampilkan kondisi kosong sesuai respons sistem.

Screenshot yang Disarankan

- `user-gallery.png` — halaman gallery publik.

Catatan

- Konten galeri publik berasal dari data galeri yang tersedia pada sistem.

### 2.5 Edit Profil

Tujuan

Fitur profil digunakan untuk melihat dan memperbarui data dasar akun user.

Langkah Penggunaan

1. Login sebagai user.
2. Buka halaman `Profile`.
3. Ubah data `Name`, `Email`, atau `Phone`.
4. Klik tombol simpan.
5. Konfirmasi perubahan pada dialog yang muncul.

Input

- Name.
- Email.
- Phone.

Output

- Data profil user diperbarui.

Validasi dan Pesan Sistem

- `Name dan email wajib diisi`
- `Gagal update profile`
- `Profile berhasil diupdate`
- `Terjadi kesalahan`

Screenshot yang Disarankan

- `user-profile.png` — halaman profil user.
- `user-profile-confirmation.png` — dialog konfirmasi simpan profil.

Catatan

- Pada implementasi saat ini, password hanya tampil sebagai placeholder dan tidak diproses sebagai ubah password.
- Jika role akun adalah admin atau superadmin, halaman profil menyediakan tombol menuju dashboard role tersebut.

### 2.6 Chatbot

Tujuan

Chatbot `Airis AI` digunakan sebagai asisten virtual untuk menjawab pertanyaan singkat mengenai layanan AIRISLENS.

Langkah Penggunaan

1. Klik tombol chatbot di kanan bawah halaman.
2. Ketik pertanyaan pada kolom chat.
3. Tekan `Enter` atau klik tombol kirim.
4. Tunggu balasan dari `Airis AI`.
5. Jika perlu, tutup panel chatbot dengan tombol tutup.

Input

- Pertanyaan dalam bentuk teks.

Output

- Balasan chatbot mengenai paket, alur booking, jadwal, pembayaran, dan informasi umum website.

Validasi dan Pesan Sistem

- `Terjadi kendala saat menghubungi Airis AI.`
- `Maaf, Airis AI sedang mengalami kendala. Coba kirim lagi beberapa saat lagi.`

Screenshot yang Disarankan

- `user-chatbot-button.png` — tombol chatbot pada halaman website.
- `user-chatbot-panel.png` — panel chatbot saat terbuka.

Catatan

- Chatbot difokuskan untuk pertanyaan seputar layanan AIRISLENS, bukan untuk pengelolaan akun dashboard.

## BAB III CARA PENGGUNAAN ADMIN

Pada AIRISLENS, role `admin` digunakan oleh partner atau fotografer.

Menu Admin

- `Dashboard`
- `Booking`
- `Jadwal`
- `Paket`
- `Galeri`
- `Keuangan`
- `Profile`
- `Back to Website`
- `Logout`

### 3.1 Dashboard

Tujuan

Dashboard admin digunakan untuk memantau ringkasan aktivitas partner.

Langkah Penggunaan

1. Login menggunakan akun admin.
2. Masuk ke halaman `Dashboard`.
3. Periksa kartu statistik utama.
4. Lihat analytics status booking, daftar upcoming schedule, dan booking terbaru.

Input

- Tidak ada input wajib.

Output

- Total booking.
- Booking hari ini.
- Booking bulan ini.
- Pendapatan.
- Breakdown status booking.
- Upcoming schedule.
- Booking terbaru.
- Popup booking baru.

Validasi dan Pesan Sistem

- Halaman ini hanya dapat diakses role `admin`.

Screenshot yang Disarankan

- `admin-dashboard.png` — dashboard admin lengkap.

Catatan

- Data dashboard mengikuti booking partner yang sedang login.

### 3.2 Booking

Tujuan

Menu `Booking` digunakan untuk mengelola booking yang masuk ke partner.

Langkah Penggunaan

1. Buka menu `Booking`.
2. Gunakan kolom pencarian untuk mencari nama customer, paket, lokasi, atau order ID.
3. Gunakan filter status bila diperlukan.
4. Pilih status baru pada kolom aksi.
5. Klik tombol `Simpan`.

Input

- Kata kunci pencarian.
- Filter status.
- Pilihan status booking.

Output

- Tabel booking partner tampil.
- Status booking diperbarui jika perubahan valid.

Validasi dan Pesan Sistem

- Perubahan status yang tersedia:
- `Pending` dapat menjadi `Pending`, `Confirmed`, atau `Cancelled`.
- `Confirmed` dapat menjadi `Confirmed`, `Completed`, atau `Cancelled`.
- `Completed` tetap `Completed`.
- `Cancelled` tetap `Cancelled`.
- `Perubahan status dari ... ke ... tidak diizinkan.`
- `Status booking berhasil diperbarui.`
- `Gagal memperbarui status booking.`

Screenshot yang Disarankan

- `admin-booking-list.png` — tabel booking admin.
- `admin-booking-status.png` — contoh perubahan status booking.

Catatan

- Lifecycle yang terlihat pada tabel admin adalah `Menunggu Pembayaran`, `Dijadwalkan`, `Menunggu Konfirmasi Customer`, `Selesai`, dan `Dibatalkan`.

### 3.3 Jadwal

Tujuan

Menu `Jadwal` digunakan untuk mengatur slot kerja partner dan melihat booking per tanggal.

Langkah Penggunaan

1. Buka menu `Jadwal`.
2. Pilih tanggal yang ingin diperiksa.
3. Klik `+ Tambah Jadwal` jika ingin membuat jadwal manual.
4. Isi judul jadwal, tanggal, jam, lokasi, dan catatan.
5. Klik `Simpan`.
6. Gunakan tombol `Edit` atau `Hapus` jika ingin mengubah jadwal manual.
7. Lihat bagian `Booking Masuk` untuk melihat booking customer pada tanggal terpilih.

Input

- Judul jadwal.
- Tanggal.
- Jam.
- Lokasi.
- Catatan.

Output

- Jadwal manual tersimpan.
- Slot yang telah terisi terlihat pada kalender.
- Daftar booking masuk per tanggal tampil.

Validasi dan Pesan Sistem

- Slot yang sudah terisi dinonaktifkan saat memilih jam.
- `Jadwal berhasil ditambahkan.`
- `Jadwal berhasil diperbarui.`
- `Jadwal berhasil dihapus.`

Screenshot yang Disarankan

- `admin-jadwal.png` — halaman jadwal admin.
- `admin-jadwal-form.png` — form tambah atau edit jadwal.

Catatan

- Jadwal manual membantu partner menutup slot di luar booking customer.

### 3.4 Paket

Tujuan

Menu `Paket` digunakan untuk mengelola paket layanan yang akan tampil pada halaman detail partner.

Langkah Penggunaan

1. Buka menu `Paket`.
2. Klik `+ Tambah Paket` untuk menambahkan paket baru.
3. Isi nama paket, durasi, harga, dan deskripsi.
4. Klik `Simpan`.
5. Gunakan tombol edit atau hapus untuk mengubah data paket yang sudah ada.

Input

- Nama paket.
- Durasi.
- Harga.
- Deskripsi.

Output

- Paket tersimpan dan dapat tampil pada halaman publik partner.

Validasi dan Pesan Sistem

- `Paket berhasil ditambahkan.`
- `Paket berhasil diperbarui.`
- `Paket berhasil dihapus.`
- `Paket berhasil disimpan.`

Screenshot yang Disarankan

- `admin-paket-list.png` — daftar paket.
- `admin-paket-form.png` — form tambah atau edit paket.

Catatan

- Paket yang dibuat admin dapat dipilih customer pada alur booking.

### 3.5 Galeri

Tujuan

Menu `Galeri` digunakan untuk mengelola portofolio visual partner.

Langkah Penggunaan

1. Buka menu `Galeri`.
2. Klik `+ Tambah Foto`.
3. Isi judul foto dan kategori.
4. Upload file gambar.
5. Klik `Simpan`.
6. Gunakan tombol detail atau hapus untuk mengelola foto yang sudah ada.

Input

- Judul foto.
- Kategori.
- File gambar.

Output

- Foto galeri tersimpan dan dapat digunakan sebagai portofolio partner.

Validasi dan Pesan Sistem

- Input file hanya menerima `image/*`.
- `Galeri berhasil disimpan.`
- Konfirmasi hapus muncul sebelum foto dihapus.

Screenshot yang Disarankan

- `admin-galeri-list.png` — daftar galeri partner.
- `admin-galeri-form.png` — form tambah foto dengan preview.

Catatan

- Foto galeri digunakan pada profil publik partner dan galeri sistem.

### 3.6 Keuangan

Tujuan

Menu `Keuangan` digunakan untuk memantau saldo partner dan mengajukan pencairan dana.

Langkah Penggunaan

1. Buka menu `Keuangan`.
2. Periksa ringkasan saldo dan escrow.
3. Isi form pencairan dana jika ingin melakukan withdrawal.
4. Masukkan nominal, nama bank, nama pemilik rekening, dan nomor rekening.
5. Klik kirim permintaan pencairan.
6. Tinjau riwayat withdrawal, mutasi wallet, dan settlement booking.

Input

- Requested amount.
- Bank name.
- Account name.
- Account number.

Output

- Ringkasan saldo wallet tampil.
- Data escrow tampil.
- Permintaan withdrawal tercatat.
- Riwayat settlement dan transaksi tampil.

Validasi dan Pesan Sistem

- `Gagal memuat data keuangan.`
- `Gagal membuat withdrawal.`
- `Permintaan pencairan berhasil dibuat.`

Screenshot yang Disarankan

- `admin-keuangan-overview.png` — ringkasan keuangan partner.
- `admin-keuangan-withdrawal.png` — form permintaan withdrawal.

Catatan

- Dana booking dapat berada pada status belum dibayar, ditahan escrow, siap dirilis, sudah masuk wallet, atau sudah dicairkan.

### 3.7 Profile

Tujuan

Menu `Profile` digunakan untuk mengelola identitas partner dan parameter yang memengaruhi halaman publik serta perhitungan booking.

Langkah Penggunaan

1. Buka menu `Profile`.
2. Isi atau ubah `Nama Brand`, `Deskripsi`, `Spesialisasi`, dan `Alamat`.
3. Isi `Latitude` dan `Longitude`.
4. Isi `Jarak Gratis Transport` dan `Biaya Transport per Km`.
5. Tentukan `Tipe Partner` dan `Kuota Tim per Slot`.
6. Lengkapi `No. WhatsApp`, `Instagram`, `TikTok`, `Facebook`, dan `Website`.
7. Upload `Photo Profile` jika diperlukan.
8. Klik `Simpan Profile`.

Input

- Nama brand.
- Deskripsi.
- Spesialisasi.
- Alamat.
- Latitude dan longitude.
- Jarak gratis transport.
- Biaya transport per kilometer.
- Tipe partner.
- Kuota tim per slot.
- WhatsApp dan sosial media.
- Website.
- Foto profil.

Output

- Profil partner diperbarui.
- Data partner tampil pada halaman `FindFG` dan detail partner.
- Parameter transport dipakai pada perhitungan biaya booking.

Validasi dan Pesan Sistem

- `Simpan Profile`
- `Menyimpan...`

Screenshot yang Disarankan

- `admin-profile-form.png` — form profil partner.
- `admin-profile-preview.png` — area preview profil partner.

Catatan

- Jika `Tipe Partner` adalah `individual`, kuota tim per slot akan mengikuti pengaturan sistem untuk partner individual.

## BAB IV CARA PENGGUNAAN SUPERADMIN

Menu Superadmin

- `Dashboard`
- `Clients`
- `Partners`
- `Partners App`
- `Finance`
- `Gallery Control`
- `Back to Website`
- `Logout`

### 4.1 Dashboard

Tujuan

Dashboard superadmin digunakan untuk memantau kondisi sistem secara keseluruhan.

Langkah Penggunaan

1. Login menggunakan akun superadmin.
2. Buka menu `Dashboard`.
3. Tinjau statistik utama dan daftar ringkas yang tersedia.

Input

- Tidak ada input wajib.

Output

- Total user.
- Total partner.
- Total booking.
- Revenue.
- Ringkasan daftar user.
- Ringkasan daftar partner.
- Ringkasan booking pada dashboard.

Validasi dan Pesan Sistem

- Halaman ini digunakan khusus oleh role `superadmin`.

Screenshot yang Disarankan

- `superadmin-dashboard.png` — dashboard superadmin.

Catatan

- Dashboard superadmin berfungsi sebagai ringkasan global, bukan halaman transaksi detail.

### 4.2 Clients

Tujuan

Menu `Clients` digunakan untuk mengelola akun user biasa.

Langkah Penggunaan

1. Buka menu `Clients`.
2. Gunakan kolom pencarian untuk mencari nama atau email client.
3. Klik `Refresh` bila ingin memuat ulang data.
4. Klik `Jadikan Partner` jika client akan diangkat menjadi partner.

Input

- Kata kunci pencarian.

Output

- Daftar client tampil.
- Role client dapat diubah menjadi partner.

Validasi dan Pesan Sistem

- `Gagal memuat data client.`
- `Tidak dapat terhubung ke server.`
- `Client berhasil diangkat menjadi partner.`
- `Gagal mengangkat client menjadi partner.`

Screenshot yang Disarankan

- `superadmin-clients.png` — daftar client.

Catatan

- Setelah client diangkat menjadi partner, data tersebut akan keluar dari daftar client dan masuk ke daftar partner.

### 4.3 Partners

Tujuan

Menu `Partners` digunakan untuk mengelola akun partner atau fotografer.

Langkah Penggunaan

1. Buka menu `Partners`.
2. Cari partner berdasarkan nama atau email.
3. Klik `Refresh` bila diperlukan.
4. Klik `Turunkan ke Client` untuk mengubah role partner menjadi user biasa.

Input

- Kata kunci pencarian.

Output

- Daftar partner tampil.
- Role partner dapat diturunkan menjadi client.

Validasi dan Pesan Sistem

- `Gagal memuat data partner.`
- `Partner berhasil diturunkan menjadi client.`
- `Gagal menurunkan partner.`

Screenshot yang Disarankan

- `superadmin-partners.png` — daftar partner.

Catatan

- Menu ini menampilkan akun dengan role `admin`.

### 4.4 Partners App

Tujuan

Menu `Partners App` digunakan untuk memeriksa pengajuan user yang ingin menjadi partner.

Langkah Penggunaan

1. Buka menu `Partners App`.
2. Gunakan kolom pencarian bila ingin mencari nama pengaju.
3. Buka detail pengajuan untuk melihat data lengkap.
4. Klik `Approve` untuk menyetujui.
5. Klik `Reject` untuk menolak.

Input

- Kata kunci pencarian.
- Keputusan approve atau reject.

Output

- Status pengajuan partner diperbarui.

Validasi dan Pesan Sistem

- `Gagal mengambil data pengajuan`
- `Pengajuan berhasil diterima`
- `Pengajuan berhasil ditolak`
- `Gagal menerima pengajuan`
- `Gagal menolak pengajuan`

Screenshot yang Disarankan

- `superadmin-partner-applications.png` — daftar pengajuan partner.
- `superadmin-partner-application-detail.png` — detail salah satu pengajuan.

Catatan

- Data pengajuan berisi nama, email, telepon, lokasi, kategori, pengalaman, tautan portofolio, dan deskripsi diri.

### 4.5 Finance

Tujuan

Menu `Finance` digunakan untuk mengelola withdrawal partner dan permintaan refund customer.

Langkah Penggunaan

1. Buka menu `Finance`.
2. Pilih filter status jika ingin menyaring permintaan withdrawal.
3. Tinjau data withdrawal partner.
4. Isi catatan admin atau referensi transfer jika diperlukan.
5. Gunakan aksi `Approve`, `Processing`, `Mark Paid`, atau `Reject` pada withdrawal.
6. Tinjau bagian `Refund Requests`.
7. Isi resolution jika diperlukan.
8. Gunakan aksi `Refund via Midtrans`, refund manual, atau `Reject`.

Input

- Filter status.
- Admin note.
- Transfer reference.
- Resolution refund.
- Aksi perubahan status.

Output

- Ringkasan finance sistem tampil.
- Status withdrawal diperbarui.
- Status refund request diperbarui.

Validasi dan Pesan Sistem

- `Gagal memuat data finance.`
- `Gagal memperbarui withdrawal.`
- `Status withdrawal berhasil diperbarui.`
- `Gagal memperbarui refund request.`
- `Status refund request berhasil diperbarui.`

Screenshot yang Disarankan

- `superadmin-finance-overview.png` — ringkasan finance superadmin.
- `superadmin-finance-withdrawal.png` — tabel withdrawal partner.
- `superadmin-finance-refund.png` — tabel refund request.

Catatan

- Menu ini juga menampilkan saldo wallet partner, saldo escrow, dan dana pending cair pada level sistem.

### 4.6 Gallery Control

Tujuan

Menu `Gallery Control` digunakan sebagai area kontrol galeri pada level superadmin.

Langkah Penggunaan

1. Buka menu `Gallery Control`.
2. Tinjau daftar foto yang tampil.
3. Klik tombol `Hapus` pada foto yang ingin dihapus dari tampilan halaman ini.

Input

- Aksi hapus item galeri.

Output

- Item galeri hilang dari tampilan halaman `Gallery Control`.

Validasi dan Pesan Sistem

- Dialog konfirmasi `Hapus foto ini?`
- `Tidak ada foto` jika seluruh item pada halaman sudah dihapus.

Screenshot yang Disarankan

- `superadmin-gallery-control.png` — halaman gallery control.

Catatan

- Pada implementasi source code saat ini, `Gallery Control` masih memakai data contoh statis dan belum terhubung ke backend galeri utama.
