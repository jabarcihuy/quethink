# Backlog implementasi Quethink Mobile

Tanggal: 3 November 2026. Urutan ini mengikuti [PRD](PRD-MOBILE-REACT-NATIVE.md). Seluruh fitur tetap dalam cakupan produk; milestone memisahkan pengerjaan dan kriteria selesai. Tidak ada estimasi hari sebelum integrasi layanan diketahui.

Status: **selesai** berarti tersedia dan diverifikasi pada cakupan item; **berikutnya** berarti target implementasi terdekat; **terencana** berarti belum dikerjakan. Kontrak akun/kelas serta pretest/materi baca sudah diterapkan; posttest, Lab SELECT/UPDATE serta editor soal telah dilanjutkan pada [siklus online](CYCLE-IMPLEMENTATION.md). Bukti dan batas pengujian: [laporan akun/kelas](M1-IMPLEMENTATION-VERIFICATION.md).

## M0 — Rancangan dan fondasi

| ID | Pekerjaan | Kriteria penerimaan | Status |
|---|---|---|---|
| F-01 | Rancangan teknis dan pemetaan fitur | Ada batas mobile/backend, state sesi, kepemilikan nilai/progres, keputusan tertunda | Selesai |
| F-02 | Kontrak API awal | Kebutuhan akun, kelas, beranda, materi, error dan autentikasi tertulis sebagai usulan | Selesai |
| F-03 | Expo/React Native TypeScript Android | Install dengan lockfile, typecheck dan bundle Android berhasil | Selesai |
| F-04 | Token visual dan komponen dasar | Warna dari prototype; teks adaptif; tombol 48 dp; native stack dan Back | Selesai |
| F-05 | English/Indonesia | English awal; pilihan bahasa bekerja dan tersimpan; tidak ada teks campuran pada layar fondasi | Selesai |
| F-06 | Transport HTTP | Locale/token terpasang saat diberikan, error jaringan/HTTP/timeout jelas, tanpa retry mutasi otomatis | Selesai |
| F-07 | Pemeriksaan berulang | Script typecheck/lint/test/export dan CI Node menggantikan pemeriksaan Flutter | Selesai |

Status F-03–F-07 mengacu hasil pemeriksaan dalam README. M0 belum membuat autentikasi, shell role, atau kelas sungguhan.

## M1 — Akun sampai akses materi dengan data nyata

Akun/kelas sudah terhubung ke Supabase dan diuji; navigasi tab dan reader berikutnya melengkapi alur M1.

| ID | Pekerjaan | Kriteria penerimaan | Status |
|---|---|---|---|
| A-01 | Cocokkan layanan dengan kontrak mobile | Matriks tersedia/perlu adapter/perlu baru, snapshot schema/ACL dan paket perubahan | Selesai — audit, empat migrasi, uji JWT hosted |
| A-02 | Login, registrasi siswa, reset | Email/password; role guru tidak bisa dipilih; loading/error/validasi; kebijakan verifikasi email jelas | Implementasi tersedia; reset via inbox belum diuji |
| A-03 | Sesi dan logout | Token tersimpan aman; refresh satu kali terkoordinasi; sesi invalid kembali login; data privat dibersihkan | Selesai — SDK refresh, SecureStore dan logout |
| A-04 | Profil dan foto | Nama/NIM wajib siswa; foto/DOB opsional; validasi tanggal; akses berdasarkan akun | Implementasi tersedia — Storage privat; lihat batas uji native |
| C-01 | Gabung kelas | Konfirmasi identitas kelas lalu join langsung; kode salah dan kelas arsip ditolak; satu keanggotaan siswa ditegakkan server | Selesai — RPC atomik, RLS dan konfirmasi UI |
| N-01 | Shell Siswa/Guru | Lima tab sesuai role; deep link tidak melewati akses; guru tanpa kelas mendapat empty state | Selesai pada cakupan shell — lima tab berlabel per role diverifikasi Android |
| L-01 | Beranda dan daftar materi | Data nyata; availability dari server; pretest belum selesai menahan materi; empty/error/retry | Selesai pada cakupan online — status/progres nyata dan gate berurutan diuji |
| L-02 | Reader awal | Teks/PDF/tautan video; materi terkunci ditolak server; tidak mengarang progres | Implementasi tersedia — bacaan native, PDF/video lewat HTTPS reader eksternal; offline belum dibuat |

Demo penerimaan M1: daftar → lengkapi profil → join → beranda → lihat urutan materi. Siswa mengerjakan pretest sesungguhnya dan hasilnya membuka reader tanpa syarat nilai minimum. Jangan melewati pretest hanya demi demo.

Hasil A-01: [audit Supabase](SUPABASE-DATABASE-AUDIT.md), [paket perubahan](DATABASE-CHANGE-PLAN.md), dan [kontrak integrasi](API-CONTRACT-DRAFT.md). Paket database dan integrasi Android akun/kelas sudah dibuat. Navigasi, pretest dan materi baca telah diimplementasikan; bukti dan batasnya ada pada [implementasi pembelajaran](LEARNING-IMPLEMENTATION.md). Reset lewat inbox nyata dan gerbang pilot masih perlu pengujian.

## M2 — Siklus pembelajaran dan penilaian

Dependensi: M1, API attempt/progres, runner SQL terisolasi, authoring soal.

| ID | Pekerjaan | Kriteria penerimaan |
|---|---|---|
| T-01 | Konfigurasi pre/post oleh guru | Paket berbeda setara; pilihan ganda dan 1–2 SQL; tambah/edit soal; timer dan snapshot terversi |
| T-02 | Attempt sekali dan resume | Start atomik/idempoten; memulihkan attempt sama; tidak membuat ulang sesudah submit |
| T-03 | Autosave dan deadline | Status simpan terlihat; revision berurutan; server auto-submit saat app mati/offline; jawaban setelah deadline ditolak |
| T-04 | Nilai dan pembahasan | Langsung tersedia setelah submit; tanpa lulus/gagal posttest; guru melihat hasil milik kelasnya |
| L-03 | Materi berurutan | Selesai membaca diverifikasi; pretest tanpa nilai minimum; posttest dibuka setelah syarat terpenuhi |
| S-01 | Lab materi terpilih | Query di sandbox sintetis; error/timeout/hasil; hanya lulus terverifikasi membuka progres |
| G-01 | Guru mengelola konten | Salinan materi standar per kelas; tambah teks/PDF/video, urutan dan Lab; arsip menolak mutasi |
| G-02 | Kelas, siswa, progres, arsip | Guru banyak kelas; arsip tetap dibaca; siswa arsip belum dapat join baru |

Paket awal pretest sudah mengerjakan bagian T-01 (durasi/default soal), T-02–T-04 (attempt, autosave/deadline, nilai/pembahasan) dan bagian L-03 (baca berurutan). G-01 mencakup salinan, ubah/tambah bacaan dan lampiran HTTPS; pengurutan ulang dan versi berikutnya belum dibuat. Increment siklus kini melengkapi posttest T-02–T-04, authoring T-01 dan S-01 pada dua template Lab SELECT/UPDATE. Pengurutan/versi materi dan tugas Lab kustom tetap berikutnya. Concurrent start/save/submit, deadline server, force-stop/resume dan akses lintas siswa/kelas telah diuji untuk pretest; lihat [bukti dan batasnya](LEARNING-IMPLEMENTATION.md).

## M3 — Absensi dan notifikasi

| ID | Pekerjaan | Kriteria penerimaan |
|---|---|---|
| AT-01 | Guru membuka/menutup sesi | Kelas, waktu dan status sesi tervalidasi; QR dan daftar hadir tampil |
| AT-02 | Siswa pindai QR | Izin kamera kontekstual; server memeriksa token/sesi aktif/waktu/kelas/duplikasi; pemulihan QR salah, kedaluwarsa, sesi ditutup dan sudah absen |
| AT-03 | Koreksi manual | Alasan wajib; pelaku dan sebelum/sesudah tersimpan; guru kelas lain ditolak |
| P-01 | Notifikasi Android | Opt-in; kategori kelas/absensi/materi/pengingat; deep link dicek akses; token perangkat dilepas saat logout |

AT-01–AT-03 diimplementasikan sebagai absensi QR tanpa lokasi/radius; lihat [kontrak dan bukti](ATTENDANCE-IMPLEMENTATION.md). QR berlaku maksimal 45 detik dan berganti sekitar 20 detik; sesi 1–180 menit. Notifikasi masih terencana; penggunaan offline dikeluarkan dari cakupan pada 5 November 2026. Kamera fisik perlu diperiksa sebelum pilot.

## M4 — Forum umum

Database forum umum, pencarian, topik, balasan, moderasi guru, pagination, privasi nama, dan pemblokiran saat tes telah diterapkan dan diuji pada cakupan [implementasi database forum](FORUM-DATABASE-IMPLEMENTATION.md). Saat ini kategori yang tersedia adalah `DATABASE` dan `GENERAL`; perluasan kategori masih perlu rancangan kompatibilitas. Layar mobile, empty/error state, dan uji alur Android masih terencana.

## M5 — Playground dan AI

Playground dataset bawaan dan tabel/data sendiri; terisolasi dari nilai. AI tutor siswa/guru dan draft schema/data dengan pratinjau serta konfirmasi penerapan. Server menerapkan batas pemakaian dan pemblokiran AI selama tes. Semua terencana.

## Gerbang pilot

- Siswa dan Guru menjalankan skenario PRD dengan akun terpisah, termasuk kelas kosong dan arsip.
- Uji akses negatif server, sekali tes, deadline, pengumpulan ulang jaringan, sandbox, serta privasi forum dan data kehadiran.
- Uji ponsel Android, system Back, izin ditolak, keyboard SQL, font scale 1.3, koneksi lambat/terputus, dan unduhan.
- Dosen meninjau alur materi, paket soal dan hasil; siswa meninjau keterbacaan dan kenyamanan tugas.
- Build APK pilot, petunjuk instalasi, daftar batasan diketahui, dan mekanisme laporan masalah tersedia.

## Definisi selesai per fitur

UI sesuai prototype dengan state loading/empty/error, memakai data nyata, pemeriksaan server berlaku, terjemahan en/id lengkap, pengujian risiko utama lulus, dan walkthrough Android tercatat. Demo hardcoded atau hasil lokal tidak dihitung sebagai fitur bisnis selesai.
