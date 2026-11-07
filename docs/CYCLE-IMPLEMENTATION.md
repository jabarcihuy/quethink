# Lab SQL, posttest dan editor soal Guru

Implementasi 3 November 2026, melanjutkan [navigasi/pretest/materi](LEARNING-IMPLEMENTATION.md). PRD mobile dan prototype tetap menjadi acuan. Paket ini melengkapi siklus online; absensi, forum, offline, notifikasi, AI dan playground bebas tetap terpisah.

## Perilaku produk

Siswa menyelesaikan pretest, membaca materi berurutan, dan mengerjakan satu latihan inti pada setiap materi ber-Lab. Run menampilkan pratinjau; hanya Check benar dari server menyimpan completion. Lab dapat dicoba ulang. Setiap Run/Check memakai dataset sintetis awal sehingga eksperimen UPDATE tidak mengubah percobaan berikutnya. Reset membersihkan query/hasil di layar, bukan menghapus progres yang sudah sah.

Dua template Lab awal tersedia: SELECT nama angkatan 2025 urut alfabet, dan UPDATE angkatan 2024 menjadi 2026 tanpa mengubah nilai lain. Guru memilih template sesuai materi yang diberi Lab. Kelas baru tetap memakai dua Lab default pada WHERE dan UPDATE; materi lainnya ditentukan Guru. Tugas Lab kustom dan dataset/table bebas belum tersedia pada increment ini.

Posttest terbuka setelah seluruh materi dan Lab wajib selesai. Satu attempt per siswa/kelas/jenis tes; durasi awal 20 menit, bisa diubah sebelum tes jenis tersebut dimulai. Pretest dan posttest memiliki paket default berbeda serta pengacakan soal/pilihan. Identifier pilihan diganti acak pada snapshot attempt; posisi/ID opsi dalam paket Guru bukan petunjuk jawaban attempt.

Timer, autosave ber-revision, resume, submit idempoten, deadline server dan grading memakai mekanisme pretest yang sama. Cron menangani posttest kedaluwarsa walaupun aplikasi mati. Nilai dan pembahasan tersedia setelah grading; tidak ada lulus/gagal posttest atau retake. Beranda menampilkan kedua nilai dan selisih poin, tanpa menyimpulkan peningkatan bila nilainya menurun.

Guru membuka paket pretest/posttest dari pengelolaan kelas. Editor mendukung perubahan prompt, pilihan/kunci, query acuan, pembahasan dan durasi, tambah pilihan ganda/SQL, serta hapus soal. Batas paket 2–30 soal: minimal satu pilihan ganda dan 1–2 SQL. Pertanyaan SQL memakai tabel students yang ditampilkan di editor; query acuan harus lolos sandbox SELECT. Prompt yang sama persis pada kedua paket ditolak; kesetaraan tingkat kesulitan tetap memerlukan penilaian Guru.

Paket dikunci per jenis tes setelah siswa pertama mulai. Paket posttest masih dapat disesuaikan ketika pretest telah berlangsung. Snapshot attempt lama tidak ditimpa. Perubahan materi ditolak sesudah ada posttest agar prasyarat yang sudah dipenuhi tidak berubah. Materi yang sudah diselesaikan atau Lab-nya mulai dipakai juga dikunci. Kelas arsip tetap dapat membaca nilai, paket soal dan materi, dengan mutasi ditolak.

## Backend dan sandbox

Migrasi hosted/lokal `20261103045058_mobile_assessment_cycle.sql` memperluas kind attempt, menambah paket/durasi/revision posttest, pilihan template Lab dan tabel private mobile_lab_runs. Tidak ada perubahan attempt/progres web. Tabel Lab memakai RLS tanpa akses langsung client; seluruh endpoint memvalidasi akun, role, kepemilikan kelas dan membership.

RPC `mobile_learning` mempertahankan action sebelumnya serta menambah `bank`. `start`, `results` dan `settings` menerima kind PRETEST/POSTTEST, dengan PRETEST sebagai default kompatibilitas. Status mengirim pretest, posttest, ketersediaan posttest, jumlah soal dan durasi masing-masing. Material mengirim labKind filter/update.

RPC `mobile_cycle` hanya dapat dipanggil service_role. Edge `mobile-grade` memvalidasi JWT melalui Auth getUser dan actor dari hasil tersebut. Action save_bank memeriksa kepemilikan, struktur, revision dan tes aktif, menjalankan query acuan dalam SQLite, lalu memeriksa semuanya lagi ketika commit. Client tidak dapat mengesahkan query atau menyimpan nilai sendiri.

Action lab membuat job immutable dengan request ID milik siswa. Retry request yang sama mengembalikan hasil tersimpan; mengganti query/materi pada request ID yang sama ditolak. Batas 20 request Lab baru per menit per siswa. Lock kelas yang sama mengurutkan perubahan materi, pembukaan tes dan commit Lab. Progress hanya ditulis ketika service memverifikasi Check benar dan akses masih valid. Kegagalan/timeout tidak menghasilkan completion palsu; retry dapat memakai request ID yang sama.

SQLite berjalan dalam memori pada Edge, terpisah dari Postgres/Supabase produksi. SELECT hanya membaca students. Lab UPDATE mengizinkan perubahan name/cohort pada students; perubahan primary key, DELETE, DDL, ATTACH, PRAGMA, filesystem, tabel lain dan banyak statement ditolak. Satu query maksimal 4096 karakter; pembatasan VM/waktu/output/memori tetap mengikuti grader sebelumnya. Penilaian membandingkan hasil SELECT atau keadaan akhir tabel UPDATE pada dua dataset server. Dataset kedua tidak dikirim ke aplikasi. Dua percobaan tidak berbagi mutasi.

## Verifikasi

TypeScript, lint dan 17 pengujian lokal lulus (termasuk ekuivalensi UPDATE RETURNING). Pengujian baru meliputi gate posttest, kunci paket/revision, otorisasi RPC service, Run dibanding Check, retry, arsip, SQL UPDATE dan reset dataset, query berbahaya, serta validasi query acuan. Tes PostgreSQL dan SQLite dijalankan pada proses terpisah; integrasi lengkap memakai JWT hosted.

Uji hosted lulus: query acuan ke tabel produksi ditolak sebelum penyimpanan; paket tidak berubah ketika validasi gagal; siswa tidak dapat authoring; Run dan query salah tidak menyimpan completion; Check SELECT/UPDATE benar menyimpan progres; retry idempoten; posttest terkunci sebelum seluruh materi selesai, lalu mendapat nilai 100; hasil Guru terfilter jenis tes. Posttest siswa kedua dibiarkan kedaluwarsa dan Cron menyelesaikannya tanpa client submit atau grading request.

Edge mobile-grade versi 5 ACTIVE; total histori hosted 51 migrasi. WASM dipaketkan dengan gzip untuk memperkecil unggahan MCP, lalu didekompresi sekali ketika runtime dimuat. SQLite/adapter memori dan batas sandbox tidak berubah; Node dan Deno check/runtime lulus.

Ekspor Android/Hermes berhasil. Walkthrough Android API 37 (360 dp) lulus untuk mengubah, menambah, menghapus dan menyimpan soal Guru; Back dengan draf belum tersimpan memunculkan konfirmasi dan dapat dibatalkan; durasi paket enam soal berhasil disimpan. Siswa mengerjakan Run SELECT, Check SELECT benar, Check UPDATE tanpa WHERE yang belum memenuhi tugas, lalu UPDATE dengan WHERE dan RETURNING yang benar. Hasil SQLite dan completion berasal dari Edge versi 5. Setelah syarat materi selesai, posttest dua soal fixture dikerjakan melalui UI dengan autosave, submit/grade dan hasil 100/100. Beranda menampilkan selisih 0 poin; Guru membuka hasil posttest siswa. Pretest dan bacaan biasa pada fixture native disiapkan/diselesaikan melalui API yang sama dengan aplikasi, bukan manipulasi tabel progres; dua Lab dan posttest dikerjakan lewat UI.

English font scale 1.0 serta Bahasa Indonesia font scale 1.3 diperiksa pada editor soal dan daftar hasil Guru. Konten soal tetap dalam bahasa Guru. Capture bank font1.3 memakai cold-start deep link tanpa riwayat stack, sehingga tidak menampilkan Back pada app bar; navigasi kursus biasa menampilkan Back. Font besar Lab SQL dan seluruh variasi layar belum diperiksa.

Fresh finish review memeriksa 19 capture native dan menemukan satu pesan kegagalan jaringan yang keliru menyatakan progres belum berubah. Dua terjemahan diperbaiki untuk meminta pengguna mencoba lagi guna mengonfirmasi hasil; server mungkin telah commit sebelum respons terputus. Verdict pass menilai **resolved / SHIP** pada satu koreksi tersebut; review awal tidak menemukan masalah material tata letak pada capture yang diberikan. Ini bukan sertifikasi seluruh produk.

Request emulator masih sesekali dibatalkan oleh timeout transport, termasuk capture tambahan bank yang terkunci setelah perubahan font. JWT hosted mengonfirmasi bank kelas berjalan mengembalikan locked=true, bank draft locked=false dan tidak ada error server; capture tambahan tersebut tidak dihitung sebagai bukti visual. Tunnel CONNECT lokal sementara mempertahankan TLS end-to-end. Perilaku ini belum dibuktikan pada perangkat fisik dan akar kendala jaringan emulator belum seluruhnya diisolasi. Bukti native tetap dibatasi pada alur dan capture yang dinyatakan di atas. Ini belum bukti perangkat fisik, TalkBack, tablet, build release atau kesiapan seluruh PRD.

Advisori sesudah migrasi: tabel private termasuk Lab sengaja tidak memberi policy client dan hanya diakses lewat RPC. Enam peringatan fungsi public backend lama dan pengaturan perlindungan password bocor tetap ada; tidak ada peringatan fungsi public baru dari increment ini. Lihat [RLS tanpa policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [fungsi SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) dan [perlindungan password](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Temuan foreign key tanpa index berasal dari tabel lama; index Lab diperlukan untuk ownership/rate limit dan penguncian materi walaupun advisor dapat menandainya belum digunakan.

## Cleanup dan kondisi akhir

Enam akun fixture dan tiga kelas sintetis telah dihapus setelah objek Storage dibersihkan melalui API. Pemeriksaan hosted memastikan nol akun fixture, kelas fixture, attempt fixture dan Lab run fixture. FK menghapus salinan materi/settings/progres milik kelas uji. Manifest kredensial fixture lokal dihapus; secret provider AI tetap privat dan tidak ditemukan dalam ekspor Android. Data aplikasi emulator dibersihkan, font kembali 1.0, proxy uji dihapus, serta emulator, Metro dan tunnel pengujian dihentikan.

Pemeriksaan akhir sesudah koreksi copy: TypeScript + lint + 17 tes lulus, ekspor Android/Hermes berhasil. Native menggunakan development/debug shell yang sudah terpasang dan Metro dari source terbaru, bukan APK release baru. Deno check dan uji SQLite Deno juga lulus.
