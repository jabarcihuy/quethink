# Navigasi role, pretest dan materi mobile

> Laporan tahap awal. Lab, posttest dan editor soal kini dilanjutkan dalam [implementasi siklus](CYCLE-IMPLEMENTATION.md); batas berikut mencatat keadaan sebelum increment tersebut.

Implementasi 2–3 November 2026, melanjutkan paket akun/kelas. Acuan tetap PRD mobile dan identitas prototype; backend web tidak menentukan alur mobile.

## Cakupan

Lima tab native Android: Siswa Home/Learn/Attendance/Forum/Profile; Guru Home/Classes/Attendance/Forum/Profile. Attendance dan Forum memiliki halaman penjelasan cakupan, belum memproses absensi/diskusi. Onboarding profil menggunakan route tersendiri sebelum tab agar tidak terjadi redirect ke profil dalam layout yang masih menuntut profil lengkap.

Pretest menyediakan empat pilihan ganda dan dua SQL SQLite, satu attempt per siswa/kelas, durasi awal 20 menit yang dapat diubah guru 1–180 menit sebelum siswa pertama mulai. Urutan soal diacak per attempt. Soal/default konten memiliki bahasa sendiri; label aplikasi mendukung English/Indonesia. Penyesuaian soal/tambah soal oleh Guru dan posttest tetap pekerjaan berikutnya.

Jawaban disimpan dengan revision server. Penyimpanan berurutan dan debounce 500 ms; UI menyatakan belum tersimpan, sedang menyimpan, tersimpan atau gagal. Konflik sesi tidak menimpa jawaban yang lebih baru. Menutup aplikasi tidak memperpanjang deadline. Jawaban sesudah deadline ditolak; hanya jawaban yang sudah diterima server yang dinilai. Submit membekukan jawaban; retry tidak membuat attempt baru. Nilai dan pembahasan dibuka sesudah grading, tanpa status lulus/gagal.

Materi published disalin ke kelas, termasuk teks Markdown. Kelas baru memakai dua Lab starter pada materi WHERE dan UPDATE, sesuai pengurangan Lab mobile; penanda latihan konseptual web tidak otomatis menjadi Lab mobile. Kelas yang sudah dibuat dan pilihan Guru dipertahankan. Materi kelas terpisah dari katalog; Guru dapat mengubah konten dan menambah bacaan, tautan PDF/video HTTPS serta memilih kebutuhan Lab. Materi yang sudah diselesaikan siswa dikunci dari perubahan untuk mempertahankan histori. Akses siswa mengikuti pretest selesai serta penyelesaian materi sebelumnya. Materi ber-Lab dapat dibaca tetapi belum bisa diselesaikan dengan tombol baca; implementasi Lab tetap tahap berikutnya. Ini bukan pemenuhan seluruh siklus pembelajaran/posttest.

## Backend

Migrasi baru menambah tabel private untuk settings, salinan materi, attempt, progres baca dan konfigurasi runner. Semua memakai RLS tanpa akses tabel langsung bagi anon/authenticated; RPC memvalidasi Auth uid, role, membership dan pemilik. Tidak ada role, nilai, completion atau deadline yang dipercaya dari client.

`mobile_learning(p_action,p_payload)` menyediakan status/start/attempt/save/submit/result/materials/material/read/edit_material/add_material/settings/results. Respons menggunakan `{data}` atau `{error:{code}}`. Results Guru dipaginasi 50 baris dengan cursor timestamp + UUID. Materi list hanya mengirim judul/metadata; konten terkunci ditolak oleh RPC walaupun ID diketahui.

Grading memakai Edge Function `mobile-grade`. Endpoint memverifikasi JWT lewat Auth getUser; panggilan Cron memakai token acak private. Verifikasi gateway JWT dinonaktifkan karena dua jenis pemanggil ini diverifikasi sendiri. Operasi mengambil job/commit hanya diberikan kepada service_role, tidak ke pengguna. Attempt yang sedang dinilai mempunyai lease; job gagal dapat dicoba lagi setelah lease berakhir. Kegagalan infrastruktur tidak diubah menjadi nilai nol.

SQL berjalan pada SQLite/WASM dalam memori, tanpa koneksi produksi. Dataset sintetis students, dua fixture privat, satu SELECT, tabel/fungsi yang diizinkan, pembatasan VM/waktu/output dan memori 32 MiB. ATTACH, PRAGMA, mutasi, tabel sistem, filesystem, ekstensi dan beberapa statement ditolak. Query dikirim sebagai data SQLite, bukan JavaScript. Hasil resmi dibandingkan dengan reference query pada fixture server; nilai lokal tidak dipercaya. Kunci jawaban baru diproyeksikan ke hasil setelah grading; fixture privat tidak dikirim.

Runtime dipin ke `@sqlite.org/sqlite-wasm@3.54.1-build1`. `scripts/vendor-sqlite.mjs` menghasilkan modul Edge dari paket dan menjaga lisensi. Ada adapter satu baris untuk pembacaan memori: runtime Edge membungkus WebAssembly.Memory sehingga pemeriksaan instanceof pada helper heap tidak menemukan buffer. Adapter memeriksa buffer milik memori yang dibuat host; batas memori tetap berlaku. Runtime diuji pada Node, Deno dan Edge hosted. Acuan [SQLite WASM](https://sqlite.org/wasm/doc/trunk/index.md), [WASM Edge](https://supabase.com/docs/guides/functions/wasm) dan [Cron](https://supabase.com/docs/guides/cron).

Cron berjalan setiap 10 detik dan membangunkan grader hanya jika ada attempt yang telah lewat deadline atau job grading yang dapat diambil. Grader memproses maksimal lima job per panggilan. Deadline tetap batas penerimaan jawaban; penyelesaian grading bersifat asynchronous dan dapat tertunda oleh antrean/layanan. Pengarsipan kelas membekukan attempt aktif untuk dinilai dari jawaban tersimpan, serta menolak start/edit/completion baru. Helper tes aktif yang dipakai layanan lama juga mengenali attempt mobile.

## Verifikasi

Pengujian otomatis meliputi otorisasi, privasi kunci/fixture, idempotensi start, revision conflict, lease/commit grading, deadline, gate materi, Lab wajib, read-only arsip, penambahan materi, validasi lampiran dan pagination bertimestamp sama. Grader SQLite diuji terpisah dari PGlite; integrasi lengkap memakai JWT hosted.

Hosted: jawaban benar mendapat 100, materi pertama terbuka, tanda selesai baca membuka materi berikutnya. Attempt lain dengan jawaban parsial dibiarkan sampai deadline; Cron menilai tanpa client submit atau grading request. Kegagalan awal kompatibilitas WASM dipulihkan tanpa menghapus jawaban atau membuat ulang attempt.

`npm run check` lulus: TypeScript, ESLint dan 13 pengujian. `npm run export:android` berhasil menghasilkan bundle Android/Hermes. Build debug x86_64 tersedia (`android/app/build/outputs/apk/debug/app-debug.apk`, sekitar 79 MiB), dibangun 2 November dan dipasang ulang saat walkthrough 3 November. Build debug membutuhkan Metro; ini bukan build release atau bukti pengujian perangkat fisik.

Walkthrough Android API 37, 360 dp, memakai akun/kelas sintetis: Guru melengkapi profil, membuat kelas, mengubah durasi menjadi 30 menit dan menambah bacaan; Siswa melengkapi profil, bergabung dengan kode, menjawab empat pilihan ganda serta dua SQL. Force-stop/resume mempertahankan attempt dan jawaban SQL tersimpan, sementara timer terus berkurang. Submit menampilkan grading lalu nilai 100/100 dengan jawaban dan pembahasan. Server mencatat satu attempt, revision 9. Nilai ini berasal dari grader hosted, bukan data contoh UI.

Reader menampilkan bacaan dan tabel native. Tanda selesai baca tersimpan di server dan membuka materi kedua; materi ketiga tetap terkunci. Akun Guru menampilkan nama/NIM/nilai siswa serta membuka pembahasan hasil dengan copy khusus Guru. Bukti screenshot tersedia lokal di `.impeccable/review/learning-*.png`; paket review menggunakan berkas yang telah dibuka dan diperiksa, bukan seluruh screenshot percobaan di direktori tersebut.

Fresh finish review memberi disposition **ship** untuk cakupan 360 dp yang diperiksa: navigasi role, pretest, reader berurutan dan pengelolaan Guru. Tidak ada temuan material pada paket screenshot wajib. Ini bukan penilaian kesiapan seluruh PRD.

Lingkungan emulator sempat mengalami request langsung yang tidak konsisten; walkthrough yang stabil memakai tunnel CONNECT lokal sementara, dengan TLS end-to-end tetap diverifikasi. Timeout transport 20 detik mencegah request aplikasi menggantung tanpa batas. Tunnel bukan konfigurasi aplikasi atau persyaratan perangkat pengguna; penyebab jaringan emulator belum sepenuhnya diisolasi. Pembaruan WebView sistem juga menutup proses debug ketika pengujian; sesi dipulihkan dan hasil Guru dibuka ulang. Reset lewat inbox nyata, viewer PDF/video eksternal, TalkBack, tablet dan perangkat fisik belum diuji.

Bahasa Indonesia serta font scale 1.3 diperiksa pada Beranda Guru dan daftar hasil. Reviewer membuka ulang bukti bahasa/Beranda dan mempertahankan disposition ship; cakupan ini tidak membuktikan semua layar pada setiap skala font.

Akun sintetis, kedua kelas uji, attempt, progres dan objek avatar uji telah dibersihkan. Pemeriksaan hosted sesudah cleanup memastikan nol akun fixture, kelas fixture dan attempt fixture. Manifest kredensial lokal dihapus; secret provider AI tetap tersimpan privat. Data aplikasi uji emulator dibersihkan, font kembali 1.0, proxy uji dihapus dan proses emulator/Metro/tunnel milik pengujian dihentikan.

Empat migrasi pembelajaran hosted sesuai berkas lokal: `20261102163214`, `20261102163619`, `20261102164926`, `20261102165804`. Total histori hosted 50 migrasi termasuk backend lama dan empat migrasi akun/kelas. Edge `mobile-grade` versi 3 berstatus ACTIVE; jadwal Cron setiap 10 detik. Tabel private memang tidak memiliki policy akses client dan diakses melalui RPC terotorisasi. Peringatan advisor backend lama serta perlindungan password bocor yang belum aktif tetap tercatat pada [audit database](SUPABASE-DATABASE-AUDIT.md); paket ini tidak mengklaim seluruh advisori bersih.

## Batas berikutnya

Posttest, authoring/tambah soal, Lab SQL materi, pengurutan ulang versi materi, offline, absensi QR/lokasi, forum, notifikasi dan AI belum selesai pada paket ini. Katalog global lama tetap mempunyai akses sesuai layanan web; gate mobile melindungi salinan/konten kelas, bukan klaim bahwa bacaan katalog publik menjadi rahasia.
