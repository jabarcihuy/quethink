# Audit database untuk Quethink Mobile

Tanggal: 2 November 2026. Project: `dadjfyjvalnaqqrmqpfa`. Pemeriksaan melalui Supabase MCP menggunakan katalog PostgreSQL dan hitungan agregat, tanpa mengambil baris profil atau identitas pengguna.

## Hasil utama

Database sudah mempunyai fondasi konten, progres, forum, dan penilaian. Database **belum sesuai untuk langsung menjalankan alur akun–kelas mobile**: role Guru belum ada, profil belum lengkap, kelas/keanggotaan belum tersedia, dan beberapa fungsi belajar masih mengikuti aturan lama.

Tidak ada migrasi, perubahan data, atau perubahan konfigurasi server yang diterapkan dalam audit ini. [Rencana perubahan](DATABASE-CHANGE-PLAN.md) dan [kontrak integrasi M1](API-CONTRACT-DRAFT.md) adalah hasil pemetaannya.

## Bukti yang diperiksa

- PostgreSQL 17.6; 18 tabel public, semuanya RLS aktif.
- 2 view public, keduanya memakai `security_invoker=true`.
- 15 policy public; semua policy yang ditemukan adalah SELECT.
- 17 fungsi aplikasi public; definisi 11 fungsi relevan diperiksa, termasuk seluruh 6 fungsi SECURITY DEFINER yang dapat dipanggil authenticated dan ditandai advisor.
- 98 constraint, 54 indeks, 42 entri migrasi, 6 trigger pada public/auth.
- Tidak ada Edge Function terdeploy atau bucket Storage pada saat pemeriksaan.
- ACL tabel/kolom, trigger pembuatan profil, dan security advisors diperiksa.

Snapshot lengkap: [metadata audit](database/supabase-audit-2026-11-02.json). Query yang dapat diulang: [audit-readonly.sql](database/audit-readonly.sql). Snapshot berisi metadata dan agregat konten, bukan data akun atau kredensial.

Angka `rows=0` dari metadata awal MCP adalah estimasi. Query COUNT yang dijalankan secara terpisah menunjukkan konten nyata berikut:

| Konten | Total | Terpublikasi |
|---|---:|---:|
| Learning paths | 4 | 1 |
| Chapters | 22 | 3 |
| Lessons | 29 | 11 |
| Exercises | 67 | 45 |
| Assessments | 16 | 1 |

Hitungan publikasi exercise tidak menjamin seluruh exercise dapat diakses: view/RLS juga memeriksa publikasi parent dan availability. Audit tidak menilai isi konten atau paket soal.

## Pemetaan terhadap PRD

| Area | Kondisi aktual | Kebutuhan mobile / keputusan |
|---|---|---|
| Akun | `profiles.id` FK ke `auth.users`; trigger `handle_new_user` membuat role USER | Pakai Supabase Auth; uji konfigurasi signup/konfirmasi/reset ketika integrasi |
| Role | enum `app_role`: USER, ADMIN; default USER | Tambahkan TEACHER; USER dipetakan sebagai student di DTO mobile; ADMIN tetap CMS |
| Profil | `id`, `role`, `display_name`, timestamp; nama nullable | Tambah NIM, path foto, tanggal lahir; validasi onboarding sesuai role |
| Edit profil | Hanya SELECT own-profile policy; belum ada UPDATE policy/RPC profil | Sediakan operasi edit yang hanya menerima field profil; role tidak dapat ditulis pengguna |
| Kelas | Tidak ada tabel kelas atau membership pada schema aplikasi yang ditemukan | Tambah kelas milik Guru, kode bergabung privat, dan satu membership per Siswa |
| Materi standar | learning_paths → chapters → lessons; 11 lesson terpublikasi | Jadikan sumber/template, bukan langsung dianggap materi kelas yang terotorisasi |
| Materi Guru | Konten global; belum ada salinan/perubahan per kelas atau lampiran mobile | Tambah materi kelas berversi, lampiran PDF/video, dan Lab terpilih |
| Progres | `lesson_progress` unik user/lesson; read_at dan status tersedia | Progres mobile harus terikat materi kelas, prasyarat pretest, baca/Lab, dan arsip |
| Pretest | Enum PRETEST ada, tetapi `start_assessment_session` melempar `Assessment retired` untuk PRETEST | Buat alur pretest kelas yang aktif; jangan menganggap fungsi lama siap dipakai |
| Posttest | Jenis lama CHECKPOINT/FINAL/PRETEST; hasil menyimpan passed/highest_score/attempt_count | Tambah semantik PRETEST/POSTTEST mobile, tanpa lulus/gagal posttest dan tanpa pengulangan |
| Timer/attempt | Session belum punya expires_at; tidak ada unique yang membatasi satu attempt per jenis/kelas | Deadline server, start/resume idempoten, snapshot soal, sekali kirim, auto-submit server |
| Absensi | Tidak ditemukan tabel absensi/QR/koreksi | Dibangun pada M3, dengan lokasi sekali ambil dan audit koreksi |
| Forum | Topik lintas kelas sudah ada; baca diblokir saat assessment aktif | Konsep sesuai; moderasi lama memeriksa ADMIN, perlu dukungan TEACHER |
| AI | Riwayat sesi/pesan dan kuota ada; tidak ada Edge Function | Provider sudah dicatat terpisah; backend AI dan pemblokiran tes perlu integrasi |
| Foto/PDF | Belum ada bucket atau policy Storage | Sediakan bucket privat dan akses sesuai pemilik/kelas saat fitur dibangun |

## Aturan akses yang sudah ada

`handle_new_user` menetapkan USER secara langsung, tanpa mengambil role dari user metadata. Ini dipertahankan untuk pendaftaran mandiri. Profil, progres, hasil, session tes, dan riwayat AI memiliki policy baca berdasarkan pemilik. User tidak mendapatkan akses baca tabel soal/kriteria tes secara umum.

View `published_exercise_catalog` memilih kolom publik tanpa `solution_code` dan config privat. View `published_visible_test_cases` hanya mengambil test case yang tidak hidden. ACL kolom dan `security_invoker` menjadi bagian penting dari perlindungan tersebut; jangan menggantinya dengan SELECT semua kolom saat integrasi.

`lesson_progress` dan `profiles` memiliki grant tabel luas, tetapi tidak memiliki policy INSERT/UPDATE/DELETE untuk pengguna. Karena itu, grant saja tidak berarti user dapat mengubah progres atau role. Jangan menambahkan policy update-own-profile tanpa sekaligus melindungi kolom role.

Sebagian tabel masih memberikan TRUNCATE/TRIGGER/REFERENCES ke anon/authenticated. Ini perlu dirapikan menjadi privilege minimum. RLS tidak melindungi TRUNCATE, tetapi temuan ACL tersebut **bukan bukti** bahwa endpoint REST dapat menjalankan TRUNCATE. Tidak dilakukan percobaan penghapusan data. Lihat [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).

## Perbedaan perilaku yang memengaruhi mobile

1. **Materi global belum dibatasi kelas.** Policy `Authenticated users read published lessons` memeriksa publikasi parent, bukan membership atau pretest. Filter layar tidak cukup untuk memberi isolasi kelas.
2. **Nama baseline tidak menjamin pretest.** `course_has_baseline` saat ini hanya memeriksa adanya learning path terpublikasi. `phase1_lesson_is_available` memeriksa urutan materi global, tanpa syarat pretest kelas.
3. **Tes lama dapat membuat session baru setelah session sebelumnya selesai.** Fungsi start hanya menggunakan ulang session IN_PROGRESS; tidak ditemukan batas satu attempt mobile pada constraint. Ini hasil pembacaan fungsi/constraint, bukan percobaan membuat attempt.
4. **Belum ada deadline server pada session.** `current_user_has_active_assessment` melihat status IN_PROGRESS saja. Rancangan mobile harus menyelesaikan tes yang sudah lewat waktu agar forum/AI tidak terkunci tanpa batas.
5. **Operasi forum dan penilaian tertentu bersifat server-only.** Contohnya fungsi forum penulisan/moderasi tidak dapat dieksekusi authenticated. Keberadaan fungsi SQL tidak berarti aplikasi dapat langsung memanggilnya. Adapter/endpoint server masih dibutuhkan.

## Hasil security advisors

Advisor mengembalikan tiga kelompok. Temuan ini perlu ditangani sesuai konteks, bukan dengan membuka akses semua tabel.

| Kelompok | Jumlah | Penilaian untuk rencana implementasi |
|---|---:|---|
| RLS enabled, no policy (INFO) | 4 tabel | assessments, assessment_items, assessment_test_cases, code_request_limits saat ini server-only; jangan membuka soal/kriteria privat demi menghilangkan INFO. [Remediasi](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) |
| Authenticated dapat menjalankan SECURITY DEFINER (WARN) | 6 fungsi | Fungsi yang diperiksa memakai search_path kosong dan memeriksa/menurunkan identitas dari auth.uid(). Ini bukan pembuktian keamanan menyeluruh. Batasi surface RPC baru dan tempatkan implementasi berprivilege di schema privat. [Remediasi](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) |
| Leaked password protection disabled (WARN) | 1 pengaturan | Tinjau pengaktifan sebelum pilot sesuai ketersediaan pengaturan project; tidak diubah oleh audit. [Remediasi](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) |

## Keputusan integrasi

Gunakan Supabase Auth untuk akun dan session, Data API untuk pembacaan yang lolos RLS/ACL, serta RPC/layanan server untuk operasi bisnis atomik. HTTP client generik yang sudah tersedia tetap berguna bagi endpoint custom; respons SDK Supabase tidak perlu dipaksa ke envelope HTTP draf awal.

Prioritas berikutnya adalah perluasan profil/role dan kelas, baru integrasi akun–kelas di Android. Pengembangan tes, konten kelas, dan absensi mengikuti milestone. Katalog serta RPC lama tidak diganti diam-diam karena mempunyai perilaku yang berbeda dari mobile.

## Batas audit

Audit tidak menjalankan signup/login aplikasi, tidak membuat akun uji atau fixture, tidak menulis database, dan tidak menguji sesi nyata lintas siswa/guru. Site URL, redirect allowlist, konfigurasi konfirmasi email, SMTP, dan setting exposed schemas Data API belum diverifikasi. Pembacaan `pgrst.db_schemas` dari session SQL menghasilkan null, sehingga tidak dipakai sebagai bukti konfigurasi gateway.

Keamanan RLS aplikasi harus diuji lagi dengan fixture dan JWT role nyata setelah migrasi. Hasil katalog/advisors tidak menggantikan uji otorisasi tersebut.
