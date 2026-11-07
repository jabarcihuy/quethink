# PRD Quethink Mobile — React Native

**Status:** Draf berdasarkan survei kebutuhan 26–31 Oktober 2026  
**Platform awal:** Android  
**Produk:** Aplikasi pembelajaran basis data dan SQL untuk Siswa dan Guru

## 1. Ringkasan

Quethink Mobile membantu siswa belajar basis data relasional dan SQL melalui materi berurutan, Lab SQL pada materi terpilih, pretest dan posttest, absensi QR, forum diskusi umum, dan AI tutor. Guru mengelola kelas, menyesuaikan materi dan tes, menjalankan absensi, serta memantau progres dan nilai dari aplikasi.

Aplikasi dibuat dengan React Native. PRD mobile dan prototype menjadi acuan produk serta pengalaman pengguna. Backend Quethink yang sudah ada dapat dipakai ulang apabila sesuai kontrak dan kebutuhan mobile; layanan atau API dapat dikembangkan maupun diubah bila diperlukan. Struktur dan keterbatasan versi web tidak menentukan alur mobile. CMS Admin tetap tersedia melalui web.

**Keputusan 4 November 2026:** fitur Guru di mobile tetap lengkap. Dashboard Guru di web direncanakan sebagai akses tambahan untuk pengelolaan kelas, materi, soal, absensi, progres dan nilai. Kedua klien menggunakan identitas, data kelas dan aturan akses server yang sama; penambahan web tidak mengurangi fitur Guru di aplikasi Android. Implementasi dashboard web merupakan tahap tersendiri, sesudah ruang lingkup desktop dirancang.

## 2. Tujuan produk

- Membuat alur belajar basis data/SQL yang terstruktur dan dapat dipantau Guru.
- Mengukur kemampuan awal dan hasil belajar siswa melalui pretest dan posttest.
- Menghubungkan materi, latihan, hasil tes, dan absensi dengan kelas.
- Memberi Guru cara untuk menyesuaikan materi dan penilaian sesuai kebutuhan kelas.
- Menyediakan dukungan diskusi dan AI tanpa mengganggu pengerjaan tes.

## 3. Pengguna dan peran

### Siswa

- Mendaftar sendiri menggunakan email dan kata sandi.
- Mengisi nama dan NIM sebagai data wajib. Foto profil dan tanggal lahir bersifat opsional.
- Bergabung langsung ke satu kelas dengan kode yang valid.
- Mengikuti materi, Lab SQL yang ditetapkan, tes, absensi, forum umum, dan AI tutor.
- Pada versi awal, siswa tidak berpindah ke kelas baru setelah kelasnya diarsipkan.

### Guru

- Akun Guru dibuat oleh Admin melalui website. Pengguna tidak dapat memilih role Guru saat mendaftar.
- Satu Guru dapat mengelola beberapa kelas.
- Mengatur urutan materi kelas, menyesuaikan materi bawaan, menambah materi, mengatur materi mana yang memiliki Lab, serta menyesuaikan dan menambah soal tes.
- Membuka sesi absensi QR, mengatur periode sesi, melihat daftar hadir, serta mencatat atau mengoreksi absensi secara manual dengan alasan.
- Melihat jumlah siswa, progres, sesi absensi aktif, nilai, dan riwayat kelas yang diarsipkan.
- Memoderasi forum umum.

### Admin

- Admin mengelola pembuatan akun Guru dan CMS melalui website.
- Admin bukan role operasional di aplikasi mobile versi awal.

## 4. Kelas

- Guru dapat membuat dan mengelola beberapa kelas. Setiap kelas memiliki kode bergabung.
- Siswa yang memasukkan kode valid langsung masuk kelas tanpa persetujuan Guru.
- Siswa hanya dapat berada di satu kelas pada satu waktu.
- Kelas dapat diarsipkan. Kelas arsip bersifat baca saja: siswa dan Guru masih dapat melihat materi, nilai, serta absensi sebagai riwayat.
- Untuk sementara, siswa tidak dapat bergabung ke kelas baru setelah kelas sebelumnya diarsipkan.
- Materi, urutan belajar, tes, absensi, nilai, dan progres terkait dengan kelas.

## 5. Alur belajar

```text
Daftar / Masuk
      ↓
Bergabung ke kelas dengan kode
      ↓
Pretest satu kali
      ↓
Materi sesuai urutan kelas
      ├─ materi tanpa Lab: tandai selesai membaca
      └─ materi dengan Lab: lulus latihan inti
      ↓
Posttest satu kali setelah seluruh materi dan Lab wajib selesai
      ↓
Selesai; hasil tetap tersedia di kelas
```

- Pretest terbuka otomatis setelah siswa bergabung ke kelas. Nilainya tidak menjadi syarat untuk memulai materi.
- Siswa mengikuti materi dalam urutan yang ditetapkan Guru.
- Materi tanpa Lab selesai ketika siswa menekan **Selesai membaca**.
- Pada materi yang ditandai memiliki Lab, siswa harus lulus latihan inti untuk membuka materi berikutnya.
- Posttest terbuka otomatis setelah semua materi dan Lab wajib diselesaikan.
- Lab hanya ditempatkan pada materi yang membutuhkan praktik SQL. Default tetap dua Lab per kelas, masing-masing satu tugas inti; tidak ada latihan tambahan di setiap bacaan. Guru menyesuaikan hanya bila konteks materi memerlukannya.

## 6. Materi dan konten kelas

- Aplikasi menyediakan materi standar khusus basis data relasional dan SQL. Materi Quethink yang sudah ada menjadi sumber awal, termasuk urutan Relasi → Read → Write.
- Guru dapat mengubah atau menyesuaikan materi bawaan untuk kelasnya dan menambahkan materi baru dari awal.
- Materi mendukung teks, lampiran PDF, dan tautan video.
- Penyesuaian Guru berlaku pada kelas yang dikelolanya; tidak mengubah materi standar untuk kelas lain.
- Materi, video, Lab, tes, absensi, forum, dan AI memerlukan koneksi internet. Unduhan materi untuk penggunaan offline tidak termasuk cakupan saat ini (keputusan 5 November 2026).

## 7. Pretest dan posttest

- Setiap siswa mengerjakan pretest satu kali dan posttest satu kali.
- Kedua tes memiliki timer. Aplikasi menyediakan durasi awal yang dapat diubah Guru per kelas.
- Saat timer habis, jawaban yang telah tersimpan dikumpulkan dan dinilai otomatis.
- Setiap tes berisi pilihan ganda dan sekitar 1–2 soal praktik SQL.
- Soal praktik SQL dinilai otomatis. Guru dapat melihat hasil tes siswa.
- Pretest dan posttest memakai paket soal berbeda dengan tingkat kesulitan setara.
- Guru dapat menyesuaikan soal bawaan dan menambahkan soal sendiri.
- Setelah siswa mengumpulkan tes, nilai, kunci jawaban, dan pembahasan langsung dapat dilihat siswa.
- Posttest tidak memiliki status lulus/gagal dan tidak dapat diulang. Nilai pretest dan posttest digunakan untuk melihat perubahan hasil belajar.
- Gunakan variasi dan pengacakan soal untuk mengurangi kebocoran jawaban antar siswa.
- AI tutor diblokir selama pretest dan posttest aktif.

## 8. Lab SQL dan playground

### Lab materi

- Lab muncul hanya pada materi pilihan Guru.
- Latihan inti berhubungan langsung dengan tujuan materi dan menjadi syarat progres bila ditandai wajib.
- SQL siswa berjalan pada sandbox berisi data sintetis. Sistem tidak menjalankan SQL siswa pada database produksi atau Supabase.
- Hasil penilaian yang menentukan progres harus diverifikasi oleh server.

### Playground SQL

- Siswa dapat mencoba query di luar alur wajib dengan dataset yang disediakan.
- Siswa dapat membuat tabel dan data sendiri dalam lingkungan playground.
- AI membantu membuat rancangan tabel dan data awal untuk ditinjau siswa sebelum digunakan.
- Playground tidak mengubah progres materi atau nilai tes resmi.

## 9. Absensi QR

- Guru membuka sesi absensi untuk kelas dan mengatur periode berlakunya.
- Aplikasi menampilkan QR yang dipindai siswa melalui kamera aplikasi.
- Server memvalidasi token QR, sesi aktif, waktu, kelas, akun siswa, dan duplikasi sebelum mencatat kehadiran.
- Satu siswa hanya dapat dicatat sekali pada satu sesi absensi.
- Guru dapat mencatat kehadiran secara manual atau mengoreksi hasil, dengan alasan perubahan tersimpan.
- Absensi hanya meminta izin kamera untuk pemindaian QR; tidak menggunakan radius, GPS, koordinat atau izin lokasi.

## 10. Forum diskusi

- Forum bersifat umum dan lintas kelas, menggantikan forum per kelas.
- Forum mendukung beberapa kategori sesuai konteks, topik diskusi, dan balasan.
- Siswa dan Guru dapat berdiskusi; Guru dapat memoderasi.
- Identitas yang tampil adalah nama. NIM, email, dan tanggal lahir tidak ditampilkan kepada anggota lain.
- Forum tidak dapat digunakan selama tes aktif.

## 11. AI tutor

- AI tutor tersedia bagi Siswa dan Guru untuk bertanya tentang materi basis data dan SQL.
- AI dapat membantu siswa memahami tugas dan menyarankan perbaikan query; AI tidak menggantikan penilaian resmi.
- Di playground, AI dapat membuat rancangan tabel serta data sintetis untuk ditinjau dan diterapkan pengguna.
- AI diblokir selama pretest atau posttest aktif.

## 12. Beranda

### Beranda Siswa

- Kelas yang diikuti.
- Tombol lanjut belajar dan materi berikutnya.
- Progres materi.
- Status dan informasi absensi.
- Nilai pretest dan posttest setelah tersedia.

### Beranda Guru

- Daftar kelas yang dikelola dan jumlah siswa tiap kelas.
- Sesi absensi yang sedang aktif.
- Ringkasan progres belajar.
- Ringkasan nilai siswa per kelas.

## 13. Profil dan akun

- Profil Siswa memuat nama dan NIM wajib, serta foto profil dan tanggal lahir opsional.
- Nama, NIM, email, dan tanggal lahir tidak boleh terekspos di forum selain sesuai kebutuhan akses Guru di kelas.
- Login menggunakan email dan kata sandi.
- Aplikasi mendukung Bahasa Indonesia dan English; English menjadi bahasa default.

## 14. Notifikasi

Aplikasi Android mengirim notifikasi untuk:

- Informasi kelas.
- Sesi absensi dibuka.
- Materi baru.
- Pengingat melanjutkan belajar.

## 15. Tahapan rilis

### Tahap 1 — Alur kelas dan belajar

Akun dan role, beranda, kelas dan kode bergabung, materi bawaan dan penyesuaian Guru, progres berurutan, pretest/posttest, Lab wajib pada materi terpilih, absensi QR dan koreksi manual, profil, serta notifikasi. Penggunaan memerlukan koneksi internet.

### Tahap 2 — Diskusi

Forum umum lintas kelas dengan kategori, topik, balasan, dan moderasi Guru.

### Tahap 3 — Bantuan belajar dan praktik mandiri

AI tutor serta playground SQL bebas, termasuk pembuatan schema/data sendiri dan rancangan awal dengan AI.

Semua tahap di atas bagian dari cakupan produk. Urutan tahap mengatur implementasi, bukan menghapus fitur dari visi produk.

## 16. Kebutuhan mutu dan batasan

- Aplikasi awal menargetkan Android dengan React Native. Dukungan iOS belum termasuk rilis awal.
- Web Quethink dan CMS Admin tetap tersedia; aplikasi mobile tidak menggantikan situs Admin.
- UI memakai English sebagai default dan menyediakan pilihan Bahasa Indonesia.
- Aplikasi harus tetap mudah digunakan dengan pembesaran teks, pembaca layar, dan ukuran tombol sentuh yang nyaman.
- Akses berdasarkan role dan kepemilikan kelas diperiksa di server.
- SQL latihan dibatasi pada sandbox sintetis dan tidak pernah memiliki akses ke data produksi.
- Nilai, progres wajib, dan hasil tes resmi ditentukan atau diverifikasi server.
- Data absensi menyimpan sesi, siswa, waktu dan hasil validasi; tidak mengumpulkan koordinat siswa.

## 17. Di luar cakupan versi awal

- Aplikasi iOS.
- Admin CMS di aplikasi mobile.
- Bergabung ke beberapa kelas sekaligus atau berpindah ke kelas baru setelah kelas siswa diarsipkan.
- Penggunaan offline, termasuk unduhan bacaan/PDF, tes, absensi, forum, Lab, dan AI.
- SQL terhadap database produksi, server database milik siswa, atau layanan eksekusi SQL tanpa batas.
- Fitur pengajaran di luar basis data relasional dan SQL.

## 18. Kriteria keberhasilan

- Siswa dapat mendaftar, melengkapi profil, dan bergabung ke kelas dengan kode yang valid.
- Siswa dapat menyelesaikan pretest satu kali, mengikuti alur materi kelas, serta mengerjakan Lab pada materi yang ditentukan Guru.
- Materi berikutnya terbuka hanya setelah syarat baca atau Lab materi sebelumnya terpenuhi.
- Posttest terbuka setelah syarat alur belajar terpenuhi, berjalan dengan timer, dan hanya dapat dikirim satu kali.
- Nilai serta pembahasan pretest dan posttest dapat diakses siswa setelah tes masing-masing selesai, dan Guru dapat melihat hasil kelas.
- Siswa dapat absen dengan QR selama sesi kelas aktif dan dalam periode yang ditentukan, sementara Guru dapat mencatat koreksi manual beserta alasannya.
- Siswa dan Guru dapat melihat konten kelas yang diarsipkan sebagai riwayat baca saja.
- Forum, AI, dan playground mengikuti batas akses yang ditentukan role dan status tes.
- Materi bacaan dan PDF yang sudah diunduh tetap dapat dibuka tanpa koneksi internet.

## 19. Keputusan untuk dirinci saat desain teknis

- Nilai awal durasi tes, batas waktu sesi QR serta batas pemakaian notifikasi ditentukan saat Guru mengatur kelas atau saat nilai bawaan produk disepakati.
- Jika dukungan offline direncanakan kembali, alur sinkronisasi progres perlu dirancang pada tahap tersebut.
- Format konten dan alur penulisan soal SQL oleh Guru perlu dirinci saat desain layar pengelolaan kelas dan tes.
- Mekanisme variasi/pengacakan soal harus menjaga tingkat kesulitan setara dan kunci jawaban tetap rahasia sebelum siswa selesai tes.
