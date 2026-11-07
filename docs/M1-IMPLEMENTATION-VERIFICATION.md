# Verifikasi implementasi akun dan kelas

Tanggal: 2 November 2026. Catatan ini merekam paket akun/kelas awal; kelanjutannya ada pada [implementasi pembelajaran](LEARNING-IMPLEMENTATION.md). Cakupan implementasi: Auth Android, profil pribadi, role server, kelas/keanggotaan, roster, arsip dan avatar. Ini penyelesaian paket akun/kelas, bukan seluruh M1 atau seluruh produk.

## Perubahan yang diterapkan

Project Supabase bersama `dadjfyjvalnaqqrmqpfa` menerima empat migrasi additive: `20261102134333_mobile_teacher_role`, `20261102134336_mobile_profiles_classes`, `20261102134339_mobile_class_rpcs`, `20261102134341_mobile_avatars`. File lokal mengikuti versi hosted. Tidak ada reset database atau penggantian katalog/hasil lama. Riwayat sebelumnya tetap berasal dari proyek web.

Tambahan: enum TEACHER, NIM/DOB/path foto, kelas dan membership unik per siswa, kode privat, rate limit join, 11 RPC terotorisasi dan bucket avatar privat. Client memakai publishable key/JWT, bukan service role. Semua public RPC mobile SECURITY INVOKER; operasi internal berprivilege berada pada schema private dengan pemeriksaan identitas/role/pemilik.

Layar akun: login, daftar Siswa, permintaan reset, callback PKCE, kata sandi baru, onboarding/edit profil, gabung kelas dengan konfirmasi, beranda Siswa/Guru, buat kelas dari referensi template published, detail/roster dan arsip. Navigasi native stack; lima tab produk belum dibuat. Beranda siswa menampilkan kelas nyata dan pretest pending tanpa nilai atau progres contoh.

## Pemeriksaan otomatis dan layanan nyata

- TypeScript dan ESLint lulus.
- Sembilan pengujian lulus: enam transport/error, satu integrasi PostgreSQL untuk keseluruhan migrasi/otorisasi, dua adapter SecureStore.
- PGlite memeriksa signup role spoof, privilege mutasi, isolasi guru, onboarding, join idempoten/satu kelas, quota tebakan salah, arsip, transisi role, DOB/avatar, pagination 55 baris bertimestamp sama, dan anon RPC ditolak. Fixture merupakan subset baseline audit, bukan full restore Supabase.
- Hosted memakai enam akun sintetis dan sign-in email/password sesungguhnya. RPC/Data API dijalankan dengan JWT akun, bukan hak postgres MCP. Lulus: perubahan role ditolak, profil sendiri saja, guru kelas lain ditolak, dua join bersamaan menghasilkan satu membership, join kelas sama idempoten, quota setelah 10 tebakan, arsip menolak join, roster tanpa DOB/email, upload/sign URL pemilik dan akses avatar akun lain ditolak.
- APK debug x86_64 berhasil dibangun dengan Gradle pada Android SDK 37. Bundle Android/Hermes diekspor. Build debug membutuhkan Metro dan bukan APK release/pilot.

## Walkthrough native Android

Emulator ponsel API 37, 360 dp (screenshot 720 px), development build x86_64 dan Metro. Bukti berada di `.impeccable/review/m1-*` dan menggunakan akun/data sintetis.

- Login siswa lewat Auth nyata, onboarding nama/NIM wajib, DOB boleh kosong.
- Kode kelas salah → pesan pemulihan; kode valid → nama kelas/Guru → join → beranda dengan kelas sebenarnya dan pretest pending.
- Force-stop lalu buka ulang → sesi SecureStore pulih dan kelas tetap tampil.
- Gallery Android → pilih foto sintetis → crop → upload → buka ulang profil → foto privat tampil.
- Guru membuat kelas dari template published, membaca roster dua siswa, dan mengarsipkan kelas uji. Detail kelas menampilkan kode dan aksi berbagi native. Sesudah arsip, kode/aksi mutasi tidak lagi tampil. Pengiriman melalui tujuan share eksternal tidak diuji.
- Bahasa Indonesia diperiksa pada font scale 1.3; form profil dan daftar kelas tetap terbaca dan dapat di-scroll. Pengaturan dikembalikan ke English/font 1.0.
- Logout mengembalikan alur masuk. Register menjelaskan akun siswa/Guru oleh admin; forgot menampilkan form tanpa mengirim email uji.
- Callback invalid diuji saat aplikasi sudah terbuka dan saat cold start. Ditemukan penggunaan hook URL lama yang melewatkan tautan warm start; diganti `useLinkingURL`. Tautan invalid kini memberi pesan dan tindakan meminta ulang/kembali masuk, bukan spinner tanpa akhir.

## Catatan keamanan layanan

Advisors sesudah migrasi: enam tabel RLS tanpa policy (empat legacy server-only dan dua tabel private mobile yang sengaja tidak dapat diakses client), enam public SECURITY DEFINER legacy callable oleh authenticated, serta leaked-password protection masih nonaktif. Tidak ada public SECURITY DEFINER mobile baru. Temuan lama dan batas akses didokumentasikan dalam [audit baseline](SUPABASE-DATABASE-AUDIT.md); jangan menganggap seluruh backend lama sudah dirombak untuk materi/tes mobile.

Referensi: [RLS tanpa policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [SECURITY DEFINER callable](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Kondisi lingkungan pengujian

Pada pemeriksaan ulang, DNS emulator sempat tidak dapat me-resolve host Supabase; host tetap mendapat HTTP 200. Aplikasi menampilkan kegagalan koneksi. Emulator dibuka ulang dengan DNS eksplisit, lalu login berhasil kembali. Sesudah cold boot juga pernah terjadi ANR input dengan alasan tidak ada focused window; kembali ke Launcher lalu membuka aplikasi memulihkan input. Penyebab AVD/SDK belum diisolasi; hasil ini belum menggantikan pengujian perangkat fisik atau gerbang pilot. Perubahan font ketika development app hidup pernah memunculkan peringatan linking ganda; tidak muncul lagi sesudah proses dibuka ulang. Hanya satu root native stack didefinisikan aplikasi.

## Batas dan langkah berikutnya

Pengguna melaporkan Redirect URLs sudah berisi `quethink://auth/callback`. Tool MCP tidak membaca allowlist Auth; laporan ini bukan konfirmasi mandiri konfigurasi dashboard atau keberhasilan email reset. Alur nyata inbox → tautan → kata sandi baru perlu diuji dengan akun pemilik inbox. Konfirmasi email saat ini nonaktif; UI menangani perubahan konfigurasi yang menghasilkan signup tanpa session.

Belum termasuk provisioning Guru lewat UI admin baru, materi/salinan konten kelas, reader, attempt tes, nilai, Lab, QR/lokasi, forum, notifikasi, offline dan AI. Pemilihan template ketika membuat kelas baru menyimpan referensi sumber; belum menyalin materi. Runner SQL, dialek dan authoring soal diselesaikan sebelum M2. Pemilihan, crop, upload dan pemuatan ulang foto privat juga diuji lewat gallery emulator; perangkat fisik belum diuji.

## Pembersihan fixture

Selesai: foto fixture dihapus melalui Storage API milik akun masing-masing, kemudian tiga membership, empat kelas sintetis, sesi dan enam akun Auth dihapus dengan guard UUID serta penanda fixture. Pemeriksaan hosted mengonfirmasi sisa akun dan kelas fixture nol. Manifest kredensial sementara dihapus. Secret provider AI tetap tersimpan privat dan tidak disalin ke APK/dokumen.

## Review tampilan dan dokumentasi

Review native terpisah memeriksa 13 capture akun/kelas dan menemukan satu perbaikan material: selected state template hanya lewat warna. Indikator radio lingkaran/titik ditambahkan, role/state aksesibel dan target sentuh dipertahankan, lalu capture Android diambil ulang. Verdict reviewer yang sama: **resolved**, disposition **ship** pada cakupan satu koreksi tersebut. Dokumentasi visual diperbarui melalui documenter terpisah dalam [implementasi desain](DESIGN-IMPLEMENTATION.md), dengan token/identitas lama dipertahankan dan batas fitur dicatat.
