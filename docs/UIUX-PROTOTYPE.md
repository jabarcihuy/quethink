# UI/UX Prototype — Quethink Mobile

**Status:** Prototype dan wireframe v2 · 2 November 2026  
**Platform:** Android, React Native  
**Bahasa:** English default; Bahasa Indonesia tersedia  
**Sumber kebutuhan:** [PRD Mobile](PRD-MOBILE-REACT-NATIVE.md)  
**Prototype visual:** [Quethink-Mobile-Prototype.figcraft](Quethink-Mobile-Prototype.figcraft)  
**Pratinjau prototype:** [Quethink-Mobile-Prototype-Overview.png](Quethink-Mobile-Prototype-Overview.png)

## Tujuan rancangan

Membantu Siswa melanjutkan pembelajaran dan menyelesaikan tugas kelas dengan cepat, serta memberi Guru akses ringkas untuk mengelola kelas, absensi, materi, dan hasil belajar. Prototype mengutamakan alur yang sering dipakai di ponsel dan memisahkan tampilan berdasarkan role.

## Prinsip UI

- Gunakan pola navigasi Android Material 3, tombol dengan area sentuh minimal 48 dp, system Back, safe area, dan keyboard yang tidak menutupi tindakan utama.
- Gunakan tema terang Indigo–apricot sebagai ekspansi identitas Quethink yang sudah dipakai di produk mobile sebelumnya.
- English menjadi bahasa awal. Label Bahasa Indonesia tersedia melalui pengaturan profil.
- Materi menonjolkan judul, ringkasan, posisi di urutan kelas, serta satu tindakan berikutnya.
- Informasi status selalu memakai teks dan bentuk, tidak hanya warna.
- Diagram skema SQL bersifat 2D dan hanya muncul saat membantu materi atau Lab.
- Peran Siswa dan Guru menggunakan kerangka aplikasi yang sama dengan item navigasi serta tindakan utama sesuai role.

## Peta layar

| Role | Layar | Tujuan utama |
|---|---|---|
| Semua | Masuk / daftar | Masuk dengan email; Siswa dapat mendaftar |
| Siswa | Gabung kelas | Memasukkan kode dan melihat konfirmasi kelas |
| Siswa | Beranda | Lanjut belajar, progres, absensi, dan ringkasan nilai |
| Siswa | Daftar materi | Melihat urutan materi dan status terkunci/selesai |
| Siswa | Baca materi | Membaca teks/PDF/video, mengunduh, dan menandai selesai |
| Siswa | Lab SQL | Menyelesaikan latihan wajib pada materi terpilih |
| Siswa | Tes | Mengerjakan pretest/posttest bertimer dan melihat hasil |
| Siswa | Absensi | Memindai QR dengan izin kamera dan menerima hasil validasi |
| Siswa/Guru | Forum umum | Menelusuri kategori, topik, dan balasan lintas kelas |
| Siswa | Playground SQL | Memilih dataset atau merancang tabel/data sendiri dengan AI |
| Siswa/Guru | AI tutor | Bertanya tentang materi dan SQL; tidak tersedia selama tes |
| Guru | Beranda | Memilih kelas, melihat siswa, progres, nilai, dan absensi aktif |
| Guru | Detail kelas | Mengelola urutan materi, Lab, siswa, dan tes kelas |
| Guru | Sesi absensi | Mengatur waktu sesi, menampilkan QR, mengoreksi kehadiran |
| Guru | Editor materi/tes | Mengubah atau menambah teks, PDF, video, dan soal |
| Semua | Profil | Melihat/mengedit identitas, foto, tanggal lahir, serta bahasa |
| Semua | Riwayat kelas | Melihat materi, nilai, dan absensi kelas arsip dalam mode baca saja |

## Navigasi utama

- **Siswa:** Beranda · Belajar · Absensi · Forum · Profil. SQLab dan AI dapat dibuka dari area Belajar atau Menu belajar.
- **Guru:** Beranda · Kelas · Absensi · Forum · Profil. Pengelolaan materi dan tes dibuka dari Detail kelas.
- Pretest/posttest dibuka dari status belajar di Beranda atau Daftar materi.
- Setiap halaman sekunder menggunakan top app bar dengan judul dan system Back Android.
- Ikon selalu disertai label navigasi agar tujuan tiap tab jelas.

## Alur dan interaksi utama

### Siswa memulai kelas

Masuk/daftar → isi nama dan NIM → masukkan kode kelas → konfirmasi nama kelas dan Guru → pretest terbuka otomatis.

### Siswa belajar

Beranda → Lanjut belajar → baca materi → unduh PDF bila diperlukan → tandai selesai. Pada materi yang memiliki Lab, tindakan lanjut menjadi **Buka Lab**; materi berikutnya terbuka setelah latihan inti lulus.

### Siswa mengerjakan tes

Beranda/Belajar → halaman instruksi berisi jenis soal, jumlah soal, dan waktu → mulai tes → jawab pilihan ganda/SQL → kirim atau auto-submit saat waktu habis → nilai, kunci, dan pembahasan.

### Siswa absen

Absensi → minta izin kamera saat pertama dipakai → pindai QR → validasi token, sesi aktif, waktu, kelas, dan duplikasi → tampilkan berhasil/gagal serta tindakan pemulihan.

### Guru membuka absensi

Beranda/Kelas → pilih kelas → Absensi → atur batas waktu sesi → tampilkan QR dan jumlah siswa yang hadir → tutup sesi atau koreksi daftar hadir dengan alasan.

### Guru mengatur pembelajaran

Beranda → pilih kelas → Materi/Tes → ubah urutan, pilih materi berlabs, sunting konten/soal, tambah item → pratinjau → simpan untuk kelas tersebut.

## Struktur konten layar kunci

### Beranda Siswa

1. Salam singkat dan kelas aktif.
2. Bagian **Lanjut belajar** berisi materi berikutnya dan tindakan utama.
3. Progres urutan materi dengan status teks (Belum dimulai, Sedang dipelajari, Selesai, Terkunci).
4. Ringkasan absensi dan jadwal/sesi aktif jika ada.
5. Nilai pretest dan posttest setelah tersedia.

### Beranda Guru

1. Pilihan kelas yang dikelola.
2. Daftar ringkas kelas dengan jumlah siswa.
3. Sesi absensi aktif dengan tombol **Lihat QR**.
4. Ringkasan progres dan nilai; navigasi ke daftar siswa.

### Baca Materi dan Lab

- Baca Materi: judul, posisi materi, estimasi baca bila tersedia, konten, unduh PDF, video opsional, tombol selesai.
- Lab: instruksi singkat, diagram 2D skema, editor query, tombol Run/Check, hasil query, status lulus/coba lagi, reset sesi.
- Pada layar kecil, diagram dan hasil query ditampilkan vertikal. Area tabel boleh digeser secara horizontal.

### Absensi

- Siswa melihat status sesi, tombol pindai yang besar, status izin kamera, dan pesan hasil yang menyebut alasan serta langkah berikutnya.
- Guru melihat QR besar dengan timer, status sesi, dan jumlah kehadiran. Koreksi manual memakai alasan wajib.

## Sistem visual awal

Palet mengacu pada tema terang Indigo–apricot produk mobile terdahulu dan diterapkan melalui token Material 3:

| Peran warna | Token awal |
|---|---|
| Primary / tindakan utama | Indigo `#5145CD` |
| Primary container | Lavender `#EEEAFF` |
| Secondary / aksen belajar | Apricot `#F6D2B2` |
| Surface | Putih hangat `#FFFFFF` |
| Background | Ivory `#FCFAF8` |
| On surface | Ink gelap `#202033` |
| Success | Hijau `#287A58` |
| Error | Merah `#B42318` |

- Tipografi: Roboto melalui skala Material 3; gunakan monospace hanya untuk identifier, tabel data, atau SQL.
- Bentuk: sudut komponen 12–16 dp; gunakan tonal surface dan outline Material, bukan bayangan dekoratif.
- Status terkunci dan selesai memakai ikon + label yang dapat dibaca screen reader.
- Ukuran teks mengikuti pengaturan Android; komponen perlu menyesuaikan font scale.

## State yang wajib diprototipekan

- Kelas belum dimasuki, kode tidak valid, dan akun Siswa belum bergabung.
- Materi belum dimulai, sedang dibaca, offline/tersedia offline, selesai, terkunci.
- Lab query kosong, berjalan, berhasil, belum lulus, dan gagal dijalankan.
- Tes sebelum mulai, berlangsung dengan sisa waktu, waktu habis, hasil, serta tes telah selesai/tidak dapat diulang.
- Kamera belum diizinkan, sesi QR kedaluwarsa/ditutup, kelas tidak sesuai, QR tidak valid, sudah absen, hadir berhasil.
- Guru belum memiliki kelas, kelas kosong, sesi absensi aktif, belum ada nilai, dan kelas arsip baca saja.
- Forum kosong, gagal memuat, dan AI tidak tersedia saat tes aktif.

## Isi prototype dan wireframe v2

File FigCraft memiliki page panduan, page prototype visual, dan page wireframe. Ada **75 layar/keadaan visual dan 75 wireframe pasangan**, dengan titik mulai terpisah untuk setiap alur utama. Wireframe mempertahankan hierarki, form, tabel, editor, dan navigasi dari rancangan visual, dengan palet netral.

Cakupan meliputi onboarding dan pemulihan akun, gabung kelas, materi dan unduhan, Lab dan retry, pretest/posttest, hasil dan pembahasan, absensi dan pemulihan izin, forum/topik/balasan, AI, playground/schema/draf AI, profil, pengelolaan kelas/materi/soal/nilai Guru, koreksi absensi, dan konfirmasi arsip.

Baca [panduan dan indeks seluruh layar](PROTOTYPE-REVIEW-GUIDE.md) untuk titik mulai, ID node, dan batas simulasi. [Pratinjau visual](Quethink-Mobile-Prototype-Overview.png) serta [pratinjau wireframe](Quethink-Mobile-Wireframes-Overview.png) telah diperbarui untuk versi ini.

Prototype ini merupakan storyboard klik. Form, pilihan jawaban, toggle, timer, kamera, QR, SQL, dan AI belum menjalankan logika aplikasi. Hasil dan pesan adalah contoh state untuk ditinjau. Bahasa Inggris ditampilkan sebagai default; layar pengaturan menunjukkan pilihan Bahasa Indonesia.

## Aturan interaksi dan tata letak

- Area tindakan utama minimal 48 dp; area navigasi bawah 78 × 70 dp. State terpilih memiliki warna dan label.
- Layar sekunder memiliki Back di atas; implementasi wajib mendukung system Back Android.
- Form memakai label di atas field, bukan placeholder sebagai satu-satunya label. Tombol simpan diberi tujuan jelas.
- Materi dan Lab memiliki layar terpisah. Query contoh materi tidak menjadi editor aktif di halaman membaca.
- Pretest menampilkan nilai baseline saja. Perbandingan hasil tersedia pada contoh state setelah posttest selesai.
- Pengiriman tes, penutupan sesi absensi, serta arsip kelas memiliki langkah konfirmasi.
- Izin kamera dijelaskan sebelum pemindaian; kegagalan memiliki retry atau jalur bantuan Guru.
- Konten menggunakan grid inset 24 dp. Judul 24 sp, body 14–16 sp, label 12–14 sp; monospace khusus query dan tabel.
- Page panduan memuat peta perjalanan agar reviewer dapat menilai alur sebelum membahas gaya visual.

## Keputusan yang masih terbuka

- Sinkronisasi tanda selesai membaca saat konten dibuka offline.
- Nilai default durasi tes, masa berlaku QR dan batas waktu sesi absensi.
- Aturan font scale dan tema gelap Android; rancangan visual awal memakai tema terang yang diwarisi dari mobile sebelumnya.
- Editor soal SQL dan format kriteria penilaian otomatis untuk soal buatan Guru.

## Pembaruan warna dan ikon — 2 November 2026

Prototype visual menggunakan lavender untuk belajar, mint–teal untuk pengelolaan Guru dan absensi, blue–navy untuk penilaian, serta pink–rose untuk forum. Apricot memberi aksen hangat pada langkah belajar berikutnya. Tindakan utama tetap memakai indigo agar mudah ditemukan. Warna section dipadukan dengan ikon dan label.

Set [24 ikon SVG orisinal](assets/icons/README.md) tersedia sebagai file dan vector editable dalam FigCraft. Page **03 · Colors & SVG icons** mendokumentasikan palet serta katalog ikon. Header, navigasi, baris fitur, dan petunjuk aksi memakai ikon outline dengan ketebalan yang konsisten. Wireframe mempertahankan palet netral untuk peninjauan struktur.

Pasangan warna utama memiliki rasio kontras terhitung 5.45:1–8.72:1: white/indigo, teal/mint, rose/pink, navy/blue, serta brown/apricot. Pemeriksaan ini mencakup pasangan token tersebut, bukan audit aksesibilitas aplikasi yang berjalan.

## Perapian layout — 2 November 2026

Baris fitur memakai inset luar 24 dp dengan ikon pada kolom tetap dan teks pada kolom yang sama. Ikon navigasi diseragamkan pada ukuran 24 dp. Tombol lanjut belajar menyatu dengan kartu materi berikutnya. Status materi selesai/terkunci memakai ikon check/lock. Gesture indicator Android ditambahkan pada preview.

[Lihat status dan cara menghubungkan desktop live editing](FIGCRAFT-LIVE-EDITING.md). Saat diperiksa, koneksi MCP masih headless; render desain tersedia tetapi belum mewakili jendela desktop pengguna.

## Presisi ikon dan teks — desktop review

364 ikon visual dipindahkan ke artboard transparan 24 × 24 dengan path asli tanpa peregangan kotak gambar. Ikon baris dipusatkan di tile 36 dp, ikon navigasi memakai artboard yang sama, dan chevron tidak lagi melebar. Judul serta sublabel baris memakai posisi vertikal tetap 12/36 dp dari atas kartu. Label Back disejajarkan dengan pusat panah. Penggantian dilakukan langsung di aplikasi desktop melalui koneksi lokal; vector lama yang digantikan dibersihkan.

## Preferensi terbaru — latihan ringan dan grid menu

Default pembelajaran tetap dua Lab terpilih, satu tugas inti per Lab. Bacaan lainnya tidak mendapat latihan tambahan. Gunakan grid dua kolom untuk tujuan setara: hasil pretest/posttest Siswa dan aksi soal/hasil pada pengelolaan kelas Guru. Materi berurutan, daftar siswa, daftar kelas dan isi soal tetap berupa list. Grid kembali satu kolom ketika lebar konten kurang dari 300 dp atau skala font minimal 1.25 (termasuk pengujian 1.3); jangan memadatkan label agar muat. Ini keputusan implementasi terbaru, belum perubahan canvas FigCraft.

## Keputusan terbaru — absensi QR tanpa lokasi

Absensi hanya memakai QR dan izin kamera; tidak menggunakan GPS, radius atau pemeriksaan lokasi. Validasi server tetap mencakup akun, kelas, token/sesi aktif, waktu dan duplikasi. Layar peta/radius/izin lokasi pada canvas FigCraft lama tidak lagi menjadi kebutuhan dan perlu disesuaikan saat revisi canvas berikutnya; perubahan ini memperbarui dokumen, bukan berkas FigCraft.
