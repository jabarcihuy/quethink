# Absensi QR mobile

Increment 3 November 2026 menambahkan absensi online Android melalui React Native dan RPC Supabase. Tidak memakai lokasi, radius, GPS atau izin lokasi. Guru membuka sesi untuk kelasnya; siswa memindai melalui akun masing-masing. Riwayat tetap dapat dibaca pada kelas arsip.

## Perilaku

- Guru memilih kelas melalui tab Attendance atau halaman kelola kelas. Judul sesi wajib 1–120 karakter, durasi 1–180 menit (default 15). Hanya satu sesi yang dapat terbuka per kelas. Guru dapat menutup sesi lebih awal.
- Layar sesi menampilkan QR, batas waktu, ringkasan status dan tautan daftar siswa. QR berganti setiap sekitar 20 detik saat layar aktif; setiap token berlaku maksimal 45 detik, dibatasi akhir sesi. QR disembunyikan saat kedaluwarsa, aplikasi masuk latar atau permintaan gagal. Hitung mundur memakai selisih waktu server dan jam monotonic perangkat.
- Siswa memerlukan izin kamera hanya saat membuka pemindai. Penolakan izin menyediakan coba kembali atau buka pengaturan Android. Kamera dilepas saat layar tidak aktif. Kegagalan kamera dapat ditangani melalui pencatatan manual guru.
- Server memeriksa identitas, role, keanggotaan kelas, sesi, token, batas waktu server, kelas arsip dan tes aktif. Tes yang belum selesai menghalangi scan. Token hanya tersimpan sebagai SHA-256; riwayat dan daftar siswa tidak memuat token.
- Catatan unik per sesi/siswa. Pemindaian valid berikutnya mengembalikan catatan yang sudah ada, termasuk koreksi manual; tidak menimpa status dan tidak menggandakan kehadiran. QR lama tetap ditolak meski siswa sudah tercatat. Pengguna dapat melihat riwayat untuk memeriksa hasil permintaan yang terputus.
- Guru dapat mencatat Hadir, Alpa, Izin atau Sakit, termasuk setelah sesi ditutup. Alasan wajib 3–500 karakter. Sebelum/sesudah, guru pelaku dan waktu server tersimpan dalam audit append-only melalui RPC. Revisi mencegah koreksi bersamaan saling menimpa; konflik meminta muat ulang.
- Tidak ada catatan berarti **Belum tercatat**, bukan otomatis Alpa. Riwayat siswa hanya miliknya; roster guru menampilkan nama/NIM untuk kelasnya. Email/tanggal lahir tidak disertakan.
- Kelas arsip menolak semua perubahan, token baru dan pemindaian; riwayat, roster dan alasan koreksi tetap dapat dibaca.

## Kontrak aktual

`public.mobile_attendance(p_action text, p_payload jsonb)` adalah wrapper SECURITY INVOKER menuju dispatcher privat dengan `search_path=''`, pemeriksaan `auth.uid()` dan otorisasi pada setiap tindakan. Hasil `{data: ...}` atau `{error:{code:...}}` mengikuti repository akun. Tanpa grant bagi anon.

| Action | Payload | Hasil |
|---|---|---|
| list | classId untuk guru, cursor opsional | class, items, nextCursor; siswa memakai keanggotaan sendiri |
| start | classId, title, minutes | session, class, serverTime, counts |
| session / close | sessionId | detail sesi; close hanya pemilik kelas |
| qr | sessionId | value, expiresAt, serverTime; hanya guru pemilik |
| scan | sessionId, token | session dengan catatan sendiri, alreadyRecorded |
| roster | sessionId, cursor | items, session, archived, nextCursor |
| record | sessionId, studentId, cursor | name, record, audit, archived, session, nextCursor |
| correct | sessionId, studentId, state, reason, revision | detail catatan dan audit terbaru |

Daftar sesi memakai keyset waktu/id 20 entri; roster keyset UUID 50; audit keyset bigint 20. Semua FK memiliki indeks pendukung. Mutasi mengunci kelas sebelum sesi/catatan, sehingga pembukaan sesi, pemindaian, koreksi dan pengarsipan tidak saling melewati validasi. ID sesi bukan bukti otorisasi. Tidak ada pengeditan/penghapusan audit melalui API klien.

Migrasi hosted: `20261103103555_mobile_attendance.sql`, empat tabel privat (`sessions`, `tokens`, `records`, `audit`) dengan RLS dan tanpa akses tabel langsung. Migrasi `20261103111016_mobile_attendance_archive.sql` menutup sesi terbuka secara otomatis ketika kelas diarsipkan. Edge Function penilaian tidak diubah.

## Bukti pengujian

- PostgreSQL lokal PGlite: izin guru/siswa/lintas kelas, tabel privat, validasi, satu sesi terbuka, QR valid/salah/kedaluwarsa, idempotensi, koreksi CAS/audit, nilai manual bertahan, penutupan idempoten, kedaluwarsa sesi dan arsip.
- Parser QR: hanya prefix/version, UUID dan token hex dengan panjang tepat; menolak URL/payload asing atau terlalu panjang.
- Hosted dengan JWT akun sintetis: dua pembukaan bersamaan menghasilkan satu sesi; empat scan bersamaan menghasilkan tepat satu insert; dua koreksi pada revisi sama menghasilkan satu sukses dan satu konflik. Pemeriksaan akses lintas guru/siswa, token invalid, audit dan privasi lulus.
- Advisor: empat tabel privat menambah INFO RLS tanpa policy karena akses memang melalui RPC terotorisasi; tidak ada FK absensi tanpa indeks. Enam WARN fungsi SECURITY DEFINER publik lama dan WARN leaked-password protection sebelumnya tetap terpisah. [RLS privat](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [fungsi lama](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

- TypeScript dan ESLint tanpa error; satu warning `t` tidak terpakai yang sudah ada di `lab/[id].tsx` tetap terpisah. Semua 19 tes lulus pada rerun serial terakhir; rerun yang terinterupsi tidak dihitung sebagai bukti lulus. Ekspor Android final berhasil (Hermes 4.3 MB).
- APK debug x86_64 sekitar 89 MiB berhasil dibangun dengan Expo Camera; manifest memiliki CAMERA tanpa RECORD_AUDIO atau izin lokasi. Percobaan multi-ABI dibatalkan karena tekanan memori. APK development memerlukan Metro; bukan artefak release untuk distribusi fisik.
- Emulator Android: kelas/sesi/QR/roster/koreksi/audit, riwayat siswa, izin kamera/penolakan permanen/pengaturan diperiksa pada 360 dp; riwayat absensi dan preview kamera juga diperiksa pada 320 dp dengan font scale 1.3. Preview akhir menampilkan scene kamera emulator berwarna; ini tidak membuktikan scan optik. QR pada screenshot berhasil didekode independen oleh JSQR dan cocok dengan sesi hosted sintetis.
- Koreksi manual melalui UI tersimpan dan alasannya muncul di audit. Hosted archive menutup sesi secara otomatis, menolak QR/scan baru dan mempertahankan riwayat. Perbaikan dokumentasi yang ditemukan review terpisah dinilai terselesaikan; hasil ship terbatas pada daftar perbaikan tersebut, bukan persetujuan seluruh produk.
- Bukti PNG/XML terpilih diindeks pada [catatan desain](DESIGN-IMPLEMENTATION.md); capture debug di luar indeks bukan hasil review final. Tidak ada pengujian tablet, TalkBack atau scan optik Android fisik yang diklaim.
- Enam akun sintetis dengan metadata fixture, sesi Auth, refresh token, keanggotaan dan satu kelas uji dihapus dengan pemeriksaan identitas/asosiasi. Verifikasi hosted menunjukkan 0 akun/kelas fixture tersisa; data sesi/record/audit mengikuti penghapusan kelas. File kredensial fixture lokal dihapus; secret AI lokal dipertahankan.

## Batas

Absensi memerlukan jaringan. Pemindaian optik pada perangkat Android fisik tetap perlu diuji sebelum pilot, termasuk kondisi cahaya dan kamera berbeda. QR tanpa pemeriksaan lokasi tidak membuktikan posisi fisik siswa dan tidak mencegah kode dibagikan saat masih berlaku. Tidak ada ekspor rekap, background scan, foto bukti, atau penandaan alpa otomatis. Offline/notifikasi/forum/AI/playground bebas tetap increment terpisah. Prototype FigCraft lama yang menyebut GPS/radius bukan kontrak implementasi terbaru.

Dependensi native baru: `expo-camera@58.0.14`, `react-native-qrcode-svg@6.3.50`; perlu development build baru. Plugin kamera menonaktifkan rekaman audio. Izin lokasi tidak ditambahkan. Referensi: [Expo Camera](https://docs.expo.dev/versions/latest/sdk/camera/), [QR SVG](https://github.com/Expensify/react-native-qrcode-svg).

## Uji kamera emulator — 3 November 2026

Uji tambahan pada AVD `Ruma_Audit_API_37` (Android API 37) berhasil melewati jalur kamera → decoder QR native → handler aplikasi → RPC absensi → catatan Supabase. Kamera belakang memakai opsi emulator `-camera-back imagefile:/tmp/quethink-optical-camera.png`; kamera depan `emulated`. Ini input gambar kamera virtual, bukan pemanggilan RPC scan dari skrip.

`scripts/test-emulator-attendance.mjs` menyiapkan kelas/akun sintetis, meminta QR sebagai guru, membuat sumber gambar kamera, menutup sesi sebagai guru, dan memeriksa hasil baca sebagai siswa. Skrip tersebut tidak memanggil action `scan`. Login dan tindakan siswa dilakukan pada aplikasi Android melalui ADB. Tidak ada perubahan kode aplikasi atau migrasi pada pengujian tambahan ini.

| Kasus kamera | Hasil yang diamati |
|---|---|
| QR aktif, siswa belum absen | Layar `Attendance recorded`; server `present`, `source=qr`, `revision=1`, tepat satu record |
| QR aktif dipindai ulang | Layar `Attendance was already recorded`; record tetap satu, revisi tetap 1 |
| QR yang masa berlakunya habis | Pesan QR kedaluwarsa dan tombol retry; record tidak berubah |
| QR dipindai setelah guru menutup sesi | Pesan sesi berakhir dan tombol retry; record tidak berubah |

Bukti PNG/XML: `attendance-optical-before`, `attendance-optical-success`, `attendance-optical-duplicate`, `attendance-optical-expired`, `attendance-optical-closed` dalam `.impeccable/review/`. Dua capture `camera-attempt1/2` adalah percobaan kalibrasi yang belum berhasil karena kode terpotong, bukan bukti scan lulus. Sumber QR akhirnya dibuat pada canvas putih 1024 px, gambar QR 400 px di posisi (72,312) agar masuk penuh pada bidang kamera imagefile AVD ini. Parameter tersebut khusus fixture emulator; ukuran QR dan UI produksi tidak diubah. Token tetap memakai batas waktu server sebenarnya, tanpa memperpanjang TTL demi tes.

Dengan bukti ini scan kamera virtual emulator sudah terverifikasi. Uji perangkat fisik, variasi cahaya, fokus dan sensor tetap belum dilakukan. Enam akun dan satu kelas sintetis dibersihkan setelah pengujian; bukti tidak memuat kata sandi atau bearer token.
