# Rancangan teknis Quethink Mobile

Tanggal: 2 November 2026. Acuan: [PRD](PRD-MOBILE-REACT-NATIVE.md) dan [prototype](UIUX-PROTOTYPE.md).

## Arah dan batas tahap ini

Quethink Mobile dikembangkan sebagai produk Android dengan pengalaman sendiri. Kebutuhan mobile menentukan kontrak layanan; implementasi web boleh dimanfaatkan setelah cocok dengan kontrak tersebut. Dokumen ini tidak menganggap API web sudah siap dan tidak mengubah proyek web.

Keputusan 4 November 2026 menambahkan rencana dashboard Guru di web. Fitur Guru di mobile tetap lengkap; web merupakan klien tambahan dengan pengalaman desktop sendiri. Identitas Supabase, kelas, materi, soal, sesi absensi dan hasil belajar tetap satu sumber data, dengan otorisasi role/kepemilikan diterapkan di server untuk kedua klien. Kontrak RPC/Edge yang sudah cocok dapat dipakai bersama; pengembangan frontend web dan penyesuaian kontrak yang diperlukan direncanakan terpisah dari perapian visual mobile ini.

Fondasi sudah dilanjutkan ke akun/profil dan kelas nyata melalui Supabase. AuthProvider mengelola sesi dan pemulihan, repository account memanggil RPC terotorisasi, serta native stack menyediakan alur Siswa/Guru. Kelanjutan pretest/materi serta native tabs dijelaskan di [implementasi pembelajaran](LEARNING-IMPLEMENTATION.md). Lab SELECT/UPDATE, posttest dan editor soal sudah dilanjutkan pada [siklus online](CYCLE-IMPLEMENTATION.md). [Absensi QR tanpa lokasi](ATTENDANCE-IMPLEMENTATION.md) sudah ditambahkan. Forum dan notifikasi masih terencana; fungsi dan database tutor AI sudah dipasang, tetapi tutor belum diaktifkan sambil menunggu secret provider dan uji menyeluruh. Penggunaan offline tidak termasuk cakupan saat ini. Lihat [bukti implementasi](M1-IMPLEMENTATION-VERIFICATION.md).

## Keputusan implementasi

| Area | Keputusan | Alasan / batas |
|---|---|---|
| Runtime | React Native melalui Expo SDK 58, TypeScript strict | Integrasi native Android dan pengembangan bertahap; versi terpasang dikunci di package-lock.json |
| Navigasi | Expo Router dengan native stack | Mendukung system Back; route hanya menghubungkan layar |
| Navigasi role | Siswa: Home, Learn, Attend, Forum, Profile; Guru: Home, Classes, Attend, Forum, Profile | Dibangun setelah autentikasi; server menentukan role, bukan pilihan saat daftar |
| Visual | StyleSheet dan token Indigo–apricot dari prototype | Tema terang; minimum target sentuh 48 dp; teks mengikuti font scale |
| Bahasa | Dictionary TypeScript en/id, English awal, preferensi lokal tersimpan | ID data dan route tidak diterjemahkan; konten guru tidak otomatis diterjemahkan |
| State lokal | React state/context untuk preferensi dan sesi | Tidak menambah global store sebelum dibutuhkan |
| Data server | Repository per fitur dengan adapter Supabase Auth/Data API/RPC; HTTP client untuk endpoint custom | Tambahkan query cache saat alur akun/kelas masuk, bukan membuat cache ganda sekarang |
| Token akun | SecureStore dengan adapter chunk dan penulisan terserialisasi | Kata sandi tidak disimpan; refresh token tidak masuk AsyncStorage/log |
| Konektivitas | Penggunaan memerlukan internet | Unduhan bacaan/PDF offline tidak termasuk cakupan saat ini |
| Backend | Supabase Auth + Data API/RPC; operasi provider/berprivilege pada server | Empat migrasi perluasan role/profil/kelas/avatar sudah diterapkan; Auth dan RPC terhubung ke aplikasi |

Referensi toolchain: [Expo project setup](https://docs.expo.dev/get-started/create-a-project/), [Expo Router](https://docs.expo.dev/router/introduction/), [native stack](https://docs.expo.dev/router/advanced/stack/). Versi paket aktual dicatat oleh lockfile; panduan Expo Go dapat berbeda dari development build SDK ini.

## Struktur kode

```text
src/
  app/                  route dan konfigurasi navigator
  components/           komponen tampilan lintas fitur
  theme/                warna, spacing, radius, peran tipografi
  localization/         dictionary dan preferensi bahasa
  lib/api/              transport HTTP, error, dan kontrak umum
  features/             modul bisnis, ditambahkan sesuai backlog
    account/            sesi, Auth form, repository profil/kelas, resource lifecycle
    learning/           materi, progres, unduhan
    assessments/        attempt, jawaban, timer, hasil
    attendance/         sesi QR, validasi, koreksi
    forum/              topik lintas kelas dan moderasi
    sql/                lab dan playground
    ai/                 tutor dan draft playground
tests/                  pengujian aturan dan transport penting
```

Folder fitur ditambahkan ketika ada implementasinya. Layar membaca state fitur; repository memanggil API dan memetakan respons. Layar tidak berisi SQL penilaian, akses database produksi, atau kunci provider.

## Sesi, akses, dan routing

Alur sesi akun yang tersedia (shell lima tab sesuai role sudah diterapkan):

```text
starting → signedOut → authenticating → resolvingProfile
  → Siswa belum lengkap: completeProfile
  → Siswa belum punya kelas: joinClass
  → Siswa punya kelas: studentShell
  → Guru: teacherShell
```

Pemulihan sesi memuat sesi SDK lalu meminta profil melalui RPC terautentikasi sebelum layar akun dibuka. Refresh dikelola SDK dengan koordinasi refresh bawaan dan lifecycle AppState; password tidak disimpan. Penyimpanan sesi besar dipecah ke SecureStore dengan manifest commit, agar kegagalan penulisan tidak merusak sesi sebelumnya. Role tidak berasal dari form, parameter route, atau storage lokal. Router menjaga pengalaman pengguna; server tetap memeriksa kepemilikan kelas dan izin tiap operasi. Sesi kadaluarsa mengosongkan cache data pengguna dan kembali ke login tanpa membocorkan data akun sebelumnya. Guru yang belum memiliki kelas mendapat empty state.

Kelas arsip mematikan semua mutasi, dengan pengecualian tindakan akun pribadi yang tidak mengubah kelas. Siswa kelas arsip belum boleh bergabung ke kelas baru. Forum umum tetap layanan terpisah dari arsip kelas, dengan batas saat ujian aktif.

## Objek domain dan kebutuhan layanan

Ini model konseptual untuk pertukaran data, bukan migrasi database.

| Objek | Data penting dan pemilik kebenaran |
|---|---|
| Profile | id, role, name, NIM siswa, photoUrl?, birthDate?; server |
| Class / Membership | classId, teacherId, status active/archived, kode join, siswa; server |
| Material / Progress | konten dan version, urutan, hasRequiredLab, completion; server |
| Assessment / Attempt | jenis pre/post, snapshot soal, startsAt, expiresAt, submittedAt, hasil; server |
| Answer | attemptId, questionId, revision, payload, savedAt; server |
| AttendanceSession / Record | kelas, token/sesi aktif, batas waktu, validasi, waktu hadir; server |
| AttendanceCorrection | pelaku, alasan, nilai sebelum/sesudah, waktu; audit server |
| ForumTopic / Reply | kategori, isi, author public profile, moderasi; server |
| Download | accountId, classId, materialId, version, path, downloadedAt; lokal |
| Playground | lingkungan sintetis milik pengguna; terpisah dari penilaian resmi |

NIM/email/tanggal lahir tidak disertakan dalam public profile forum. Profil guru tidak memerlukan NIM siswa. Semua waktu API memakai ISO 8601 UTC dan ditampilkan mengikuti zona perangkat; server memberikan serverTime pada operasi bertimer.

## Aturan belajar dan tes

- Server mengembalikan availability beserta alasan terkunci. UI tidak menyimpulkan kelayakan dari nilai lokal.
- Pretest sekali selesai membuka materi tanpa syarat nilai minimum. Materi wajib berurutan; Lab terpilih diverifikasi server. Posttest tersedia setelah semuanya selesai.
- Memulai tes membuat satu attempt atomik per siswa, kelas, dan jenis tes. Retry request tidak membuat attempt kedua. Melanjutkan attempt aktif setelah app ditutup bukan mengulang tes.
- Soal dan kriteria penilaian dibekukan dalam attempt. Pengeditan guru tidak mengubah attempt yang sudah dimulai.
- Deadline menggunakan expiresAt server. Countdown lokal hanya tampilan; menutup app, mengubah jam, dan kehilangan koneksi tidak memperpanjang tes.
- Jawaban disimpan ke server setiap perubahan dengan antrean berurutan dan revision. Tampilkan status tersimpan/belum tersimpan secara jelas. Server mengumpulkan jawaban yang sudah diterima saat deadline, termasuk ketika app tidak aktif.
- Submit idempoten. Saat koneksi kembali, ambil status attempt sebelum menawarkan tindakan; jangan membuka attempt baru. Hasil berisi nilai dan pembahasan tanpa status lulus/gagal.
- API tidak mengirim kunci atau expected SQL sebelum attempt selesai. AI dan forum diblokir server selama attempt aktif, termasuk akses dari perangkat lain. Pembatasan aplikasi tidak menjamin pencegahan bantuan eksternal.

## Absensi dan SQL

QR berisi token sesi yang divalidasi server. Pengiriman absensi membawa token dan sesi akun; waktu pencatatan memakai waktu server. Server memeriksa akun, keanggotaan kelas, sesi aktif, periode dan duplikasi. Penolakan izin kamera atau QR tidak valid menyediakan retry/bantuan Guru. Guru menentukan batas waktu sesi.

Absensi tidak meminta izin lokasi, mengirim koordinat atau menghitung radius. Simpan hasil validasi dan waktu sesuai PRD. Koreksi manual harus menyertakan alasan dan audit.

Lab dan tes memakai runner SQL terisolasi dengan data sintetis, pembatasan waktu/baris/resource, dan tanpa koneksi produksi. Implementasi saat ini memakai SQLite/WASM, dataset students, query acuan SELECT untuk tes dan dua template Lab SELECT/UPDATE; lihat kontrak dan batas authoring pada [siklus online](CYCLE-IMPLEMENTATION.md). Playground menggunakan ruang terpisah dan tidak memengaruhi nilai. Draft AI harus ditinjau sebelum diterapkan. Kunci AI berada di layanan server.

Provider AI yang diberikan pengguna: endpoint chat Bynara dengan model `glm-5.3-flash`. [Catatan konfigurasi provider](AI-PROVIDER.md) memuat endpoint dan lokasi secret lokal untuk digunakan saat integrasi, tanpa menyalin kunci ke dokumen.

## Offline, error, dan privasi

- Materi, tes, Lab, QR, forum, AI, dan video memerlukan internet. Gangguan jaringan tidak dianggap keberhasilan; unduhan dan sinkronisasi baca offline tidak termasuk cakupan saat ini.
- Logout membersihkan sesi, cache, unduhan privat, dan antrean akun. Jangan menerapkan antrean akun lama ke akun baru.
- HTTP client membedakan konfigurasi belum siap, jaringan gagal, timeout, HTTP error, dan respons invalid. POST tidak otomatis diulang; idempotency key diberikan untuk operasi yang kontraknya menjamin pengulangan aman.
- Tidak mencatat token, jawaban tes, NIM, atau koordinat dalam log. Tidak ada service secret di EXPO_PUBLIC_*.
- Izin kamera dan notifikasi baru ditambahkan bersama fitur yang menggunakannya, lalu diminta saat diperlukan.

## Verifikasi dan keputusan sebelum integrasi

Fondasi: typecheck, lint, pengujian transport, ekspor bundle Android, dan smoke test emulator bila build lokal tersedia. Fitur bisnis: uji negatif lintas role/kelas, concurrent start/submit, deadline server, resume app, izin ditolak, jaringan putus, font scale, dan read-only arsip.

M1 akun/kelas memakai project dan publishable key lokal. Konfirmasi email sedang nonaktif pada snapshot layanan; UI tetap menangani pendaftaran tanpa session. Pengguna sudah melaporkan penambahan redirect `quethink://auth/callback`; pengiriman/reset melalui inbox belum diverifikasi. Kontrak aktual dicatat dalam [kontrak integrasi](API-CONTRACT-DRAFT.md). Sebelum M2: tetapkan dialek/runner SQL dan format soal guru. Absensi memakai token 45 detik, rotasi sekitar 20 detik, sesi 1–180 menit dan penutupan manual. Semua ini adalah pekerjaan implementasi, bukan alasan menahan fondasi lokal.

Pemeriksaan Supabase sudah menghasilkan [audit struktur dan izin](SUPABASE-DATABASE-AUDIT.md) serta [rencana perubahan database](DATABASE-CHANGE-PLAN.md). Kontrak M1 memakai SDK Supabase untuk Auth dan RPC untuk aturan kelas; tabel/RPC akun dan kelas sudah tersedia setelah empat migrasi mobile. Materi, attempt dan progres berikutnya masih rancangan.
