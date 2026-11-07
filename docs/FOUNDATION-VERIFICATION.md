# Verifikasi fondasi mobile

Tanggal: 2 November 2026. Cakupan: M0, bukan penerimaan seluruh fitur PRD.

## Pemeriksaan otomatis

| Pemeriksaan | Hasil |
|---|---|
| `npm ci` | Lulus; instalasi dapat direproduksi dari lockfile |
| `npm run typecheck` | Lulus |
| `npm run lint` | Lulus |
| `npm test` | 6 pengujian lulus |
| `npx expo install --check` | Dependensi sesuai SDK |
| `npx expo-doctor` | 20/20 lulus |
| `npm run export:android` | Lulus; bundle Hermes Android terbentuk |
| Link lokal dokumen baru | Seluruh target tersedia |

Pengujian transport mencakup header sesi/bahasa, prefix URL, error legacy, penolakan mutasi tanpa retry, pembatalan, timeout, respons invalid dan 204. Belum ada tes fitur bisnis karena fitur tersebut belum diimplementasikan.

## Android

Native build `assembleDebug` berhasil dengan Expo SDK 58 / React Native 0.88.1, Gradle 9.4.1, JDK 25, compile SDK 37, target SDK 36, NDK 27.1.12297006. APK debug terbentuk di `android/app/build/outputs/apk/debug/app-debug.apk` (sekitar 75 MB, x86_64 untuk emulator, memerlukan Metro; bukan APK pilot mandiri).

Build pertama memasang SDK Build-Tools 37 dan NDK yang belum tersedia. Emulator pertama berhenti (exit 139) saat kompilasi; CLI gagal pada tahap pemasangan karena perangkat sudah tidak tersedia, meskipun Gradle mencatat BUILD SUCCESSFUL. Setelah daemon build dihentikan, emulator 1 GB / 2 core dengan Vulkan dinonaktifkan berhasil menjalankan APK.

Perangkat uji: AVD Ruma_Audit_API_37, 720 × 1600 px, 320 dpi (360 × 800 dp), Android API 37. APK dipasang melalui ADB dan menjalankan JavaScript dari Metro lokal. Metro dimulai ulang dengan `--clear` setelah instalasi ulang dependensi untuk menyegarkan cache resolver.

| Walkthrough native | Hasil |
|---|---|
| Cold start | Halaman awal tampil, English menjadi bahasa awal |
| Journey dan system Back | Navigasi maju/kembali bekerja |
| Bahasa | English → Indonesia memperbarui label, header, dan isi |
| Persistensi preferensi | Force-stop/relaunch mempertahankan Indonesia; beralih kembali ke English juga tersimpan |
| Font scale 1.3 | Teks membesar; kontrol bahasa dan CTA tetap terbaca; perjalanan belajar dapat digulir sampai catatan tes |
| Device night mode | Halaman tetap memakai tema terang sesuai rancangan |
| Deep link tidak dikenal | Halaman pemulihan tampil; Return to Quethink kembali ke root tanpa menambah Back yang tidak diperlukan |
| Log runtime | Tidak ditemukan error ReactNativeJS/AndroidRuntime pada walkthrough akhir |

Capture native lokal tersimpan dalam `.impeccable/review/phone-*.png` beserta dump hierarchy. Pengaturan emulator dikembalikan ke font scale 1.0 dan night mode off. Ini smoke test satu emulator, bukan pengujian perangkat fisik atau audit TalkBack penuh.

Review visual terpisah memeriksa 12 capture native dan source, dengan verdict **ship untuk UI fondasi M0**. Tidak ditemukan masalah fungsional/layout yang menghalangi tahap berikutnya pada cakupan itu. Review memverifikasi target sentuh serta kontras pasangan teks utama; bukan persetujuan kesiapan seluruh produk. Keterbatasan mencakup satu kelas perangkat, tidak ada walkthrough TalkBack/perangkat fisik, dan belum ada pengukuran performa.

## Batasan

- Tidak menguji server karena belum menghubungkan API.
- Tidak ada login/kelas sungguhan atau APK pilot produk lengkap.
- Belum menguji perangkat fisik, tablet, atau aksesibilitas seluruh fitur.
- Dependency audit setelah instalasi menunjukkan 24 advisory moderate pada toolchain transitif Expo/lint, tanpa high/critical pada hasil saat pemeriksaan. Tidak menerapkan downgrade/major override otomatis. ESLint 9 dipakai karena peer dependency plugin React/import dalam konfigurasi Expo saat ini belum menerima ESLint 10; npm menandai versi 9 deprecated. Evaluasi pembaruan toolchain sebelum build pilot; jumlah dan cakupan aktual mengikuti `npm audit`.
