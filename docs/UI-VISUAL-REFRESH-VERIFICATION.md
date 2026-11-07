# Verifikasi perapian UI mobile — 4 November 2026

Permintaan: UI lebih berkarakter dengan referensi visual, lalu aset 2D tanpa tampilan generatif 3D. Increment mempertahankan identitas indigo/ivory/apricot/mint dan kemampuan guru/siswa. Dashboard guru web merupakan rencana akses tambahan; fitur guru mobile tetap lengkap sesuai keputusan pengguna.

## Yang diterapkan

- Beranda dengan sapaan, konteks kelas nyata, panel aksi belajar, progres sebenarnya dan grid tujuan paralel.
- Materi sebagai urutan bernomor: selesai, tersedia, terkunci; progres siswa tidak ditampilkan sebagai progres guru.
- Kelas dan sesi memakai baris navigasi berikon dengan affordance panah; absensi memiliki panel mint, metadata sesi indigo, rekap status dan receipt dengan sumber/waktu pencatatan.
- Headline32/40 dipakai pada layar utama; label tombol memakai body16/24 semibold/bold dan minimum48dp. Grid124dp menyesuaikan satu kolom pada lebar kecil/font besar. Field menampilkan border fokus.
- Empat aset SVG2D khusus, editable dan sinkron ke renderer native: study, learn, attend dan forum. Tidak ada PNG3D hasil generasi yang direferensikan aplikasi. [Sumber dan cara edit](../assets/illustrations/README.md).
- Forum tetap placeholder jujur; tidak ada topik palsu, gamification, tugas tambahan atau pemeriksaan lokasi.

## Referensi dan penerapannya

[Headspace — Apple design profile](https://developer.apple.com/news/?id=fkfnhq8u) memberi referensi kehangatan palet dan pengelompokan konten. [Brilliant — course screenshots](https://www.smartworld.it/app/brilliant-app-allenamento-mente.html) memberi referensi urutan materi dan penandaan langkah saat ini. Referensi dipakai untuk prinsip komposisi; artwork dan kontennya tidak disalin. Arah serta batas increment ada pada `.impeccable/briefs/mobile-visual-refresh.md`.

## Metode dan batas bukti

Pemeriksaan memakai aplikasi native Android pada AVD Ruma_Audit_API_37, emulator-5554:720×1600px/360dp/font1.0 dan640×1422px/320dp/font1.3. Screenshot diambil lewat ADB. OS night-mode diuji dengan app tetap memakai konfigurasi tema terang; ini bukan implementasi dark theme baru. Focus/IME diperiksa pada profil. Pengaturan sistem yang diubah dikembalikan setelah pemeriksaan.

Akun, kelas, nilai dan progres visual adalah fixture yang diberi metadata serta nama Demo/Synthetic. Nilai80/100 dan dua materi selesai di-seed khusus untuk coverage tampilan; bukan klaim pengerjaan tes siswa nyata. Receipt memakai pencatatan guru melalui RPC, dengan label sumber manual yang ditampilkan. Increment ini tidak mengulang klaim uji optik kamera fisik; uji kamera emulator end-to-end sebelumnya dicatat pada laporan absensi.

TypeScript/lint tanpa error; satu warning lama `t` tidak terpakai di lab/[id].tsx tetap terpisah.19 tes yang ada lulus secara serial. Ekspor Android/Hermes berhasil. Tidak ada perubahan skema database atau dependensi native baru untuk perapian ini. Tidak ada klaim APK release, tablet atau TalkBack teruji.

Lingkungan development kadang menampilkan peringatan koneksi Expo CLI setelah idle lama; capture final diambil dari cold launch tanpa overlay tersebut. Ini tidak dianggap bukti uji performa jaringan produksi.

## Bukti

PNG dan XML terpilih berada pada `.impeccable/review/visual-*`. QR timer dicapture langsung sebagai PNG. Nama `menus` dan `current` menandai viewport yang sengaja digulir. Capture `visual-current` dan `visual-teacher-session-actions-360` adalah eksplorasi debug/loading dan tidak termasuk bukti final. Hasil finish review, perbaikan yang diminta dan pembersihan fixture dilengkapi setelah penilaian selesai.

## Tindak lanjut review — 5 November 2026

Review independen meminta judul kelas diberi ruang lebih pada layar sempit, label Present memakai warna success, dan dokumentasi desain diperbarui. Perubahan kode dan dokumentasi sudah diterapkan; typecheck, lint, dan ekspor Android kembali lulus (lint masih memiliki satu warning lama). Screenshot lama mendahului dua perbaikan tersebut. Pengambilan ulang belum selesai karena aplikasi pada emulator yang dibuka ulang masih menampilkan layar kosong setelah Metro memuat bundle. Dengan demikian, dua perubahan terakhir belum dinyatakan lolos pemeriksaan visual ulang.

Setelah koneksi Supabase kembali, enam akun dan satu kelas fixture uji dibersihkan dengan pemeriksaan metadata/asosiasi; verifikasi hosted menunjukkan nol akun dan kelas fixture tersisa. File kredensial fixture lokal telah dihapus.
