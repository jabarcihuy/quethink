# Quethink Mobile

Aplikasi pembelajaran basis data dan SQL, React Native untuk Android. [PRD mobile](docs/PRD-MOBILE-REACT-NATIVE.md) dan [prototype](docs/UIUX-PROTOTYPE.md) menjadi acuan utama; layanan web dapat dimanfaatkan sesuai kebutuhan mobile.

## Status implementasi

Fondasi Expo SDK 58 / React Native 0.88.1 sudah dilanjutkan ke integrasi akun dan kelas Supabase. Tersedia login, registrasi Siswa, pemulihan kata sandi melalui callback Android, sesi SecureStore, profil/foto privat, gabung kelas, serta daftar/buat/detail/arsip kelas dan roster untuk Guru. Role ditentukan server; pendaftaran tidak menyediakan pilihan Guru.

Empat migrasi akun/kelas dan empat migrasi pembelajaran mobile sudah diterapkan pada project bersama. Pengujian lokal PostgreSQL dan integrasi hosted memakai JWT akun sintetis memeriksa pembatasan role, akses lintas kelas, join bersamaan, rate limit, dan foto privat. Hasil dan batas verifikasi dicatat dalam [laporan implementasi akun/kelas](docs/M1-IMPLEMENTATION-VERIFICATION.md).

Navigasi lima tab sesuai role, pretest satu attempt dengan timer/autosave/penilaian server, salinan materi kelas, reader dan progres baca berurutan kini tersedia. Guru dapat mengatur durasi pretest, melihat hasil, mengubah dan menambah materi. Lab SELECT/UPDATE, posttest satu kali dan editor soal Guru tersedia pada [increment siklus](docs/CYCLE-IMPLEMENTATION.md). Absensi QR tanpa lokasi, sesi Guru dan koreksi manual tersedia pada [implementasi absensi](docs/ATTENDANCE-IMPLEMENTATION.md). Forum, playground, offline, notifikasi dan AI tetap berikutnya. Lihat [implementasi pembelajaran](docs/LEARNING-IMPLEMENTATION.md) untuk bukti dan batasnya.

## Menjalankan

Gunakan Node 24 (`.nvmrc`) dan npm. Untuk Android, siapkan Android SDK, JDK yang sesuai dengan Gradle proyek, serta emulator atau perangkat dengan USB debugging. Lockfile menyimpan versi dependensi.

```sh
npm ci
npm run android:build
```

Perintah kedua membuat proyek native Android dari konfigurasi Expo bila belum ada, membangun development/debug app, dan menjalankan Metro. SDK dan JDK harus terdeteksi oleh lingkungan (`ANDROID_HOME`, `JAVA_HOME`, dan platform-tools pada PATH bila diperlukan).

Untuk menjalankan ulang Metro setelah development app terpasang:

```sh
npm start
```

Proyek memakai SDK 58. Gunakan development build yang sesuai; jangan menganggap Expo Go versi berbeda kompatibel. Tidak memerlukan akun Expo atau deployment untuk build lokal.

`.env.example` berisi contoh konfigurasi publik. Isi URL Supabase dan publishable key untuk fitur akun/kelas. Halaman pengantar dan pilihan bahasa tetap dapat digunakan tanpa backend. Jangan menaruh secret dalam `EXPO_PUBLIC_*`. Application ID `com.quethink.mobile` adalah nilai pengembangan yang perlu dikonfirmasi sebelum distribusi store.

## Pemeriksaan

```sh
npm run check
npx expo install --check
npm run export:android
```

`check` menjalankan TypeScript, ESLint, pengujian transport, migrasi/otorisasi PostgreSQL, adapter sesi aman, sandbox SQLite dan aturan pretest/materi. Ekspor Android memverifikasi bundle JavaScript/Hermes, bukan menghasilkan APK atau membuktikan fitur bisnis. CI menjalankan pemeriksaan yang sama. Pemeriksaan emulator dan batasan lingkungan dicatat di [laporan fondasi](docs/FOUNDATION-VERIFICATION.md).

## Dokumen kerja

- [Rancangan teknis](docs/TECHNICAL-DESIGN.md): struktur, sesi, aturan server, offline, dan batas layanan.
- [Backlog implementasi](docs/IMPLEMENTATION-BACKLOG.md): milestone, dependensi, dan kriteria penerimaan.
- [Draf kontrak API M1](docs/API-CONTRACT-DRAFT.md): akun, kelas, beranda, dan materi.
- [Audit database Supabase](docs/SUPABASE-DATABASE-AUDIT.md) dan [rencana perubahannya](docs/DATABASE-CHANGE-PLAN.md): struktur/izin aktual serta paket profil, role, dan kelas yang diperlukan.
- [Konfigurasi provider AI](docs/AI-PROVIDER.md): endpoint/model yang disiapkan untuk tahap AI; kunci hanya tersimpan lokal.
- [Lab, posttest dan editor soal](docs/CYCLE-IMPLEMENTATION.md): siklus online, sandbox UPDATE, penguncian paket dan bukti pengujian.
- [Navigasi, pretest dan materi](docs/LEARNING-IMPLEMENTATION.md): kontrak, sandbox SQLite, deadline server dan batas fitur.
- [Implementasi sistem visual](docs/DESIGN-IMPLEMENTATION.md): token dan komponen fondasi yang sudah tersedia.
- [Panduan prototype](docs/PROTOTYPE-REVIEW-GUIDE.md): indeks desain dan batas storyboard.

Siklus online kini mencakup pretest, materi/Lab berurutan dan posttest. Pengurutan/versi materi, tugas Lab kustom dan dataset bebas belum tersedia. Target produk berikutnya adalah offline/notifikasi, kemudian forum dan AI sesuai backlog. Absensi QR sudah tersedia; verifikasi kamera fisik tetap diperlukan sebelum pilot.

## Catatan workspace

Folder ini mewarisi metadata Flutter (`.dart_tool`, `.metadata`, dan beberapa panduan di `.claude/agents`). File tersebut tidak dipakai oleh aplikasi React Native. Workflow CI, dependabot, dan launcher VS Code aktif sudah disesuaikan. Seluruh file FigCraft dan dokumen desain dipertahankan.

Folder `android/`, `ios/`, `.expo/`, `dist/`, dan `node_modules/` diabaikan karena dihasilkan dari konfigurasi dan lockfile. Perubahan native permanen dilakukan melalui konfigurasi Expo/config plugin agar dapat direproduksi.
