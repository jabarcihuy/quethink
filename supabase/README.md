# Migrasi mobile Quethink

Project bersama: dadjfyjvalnaqqrmqpfa. Riwayat sebelum mobile tercatat dalam docs/database/supabase-audit-2026-11-02.json (42 migrasi); sumber migrasi lama tetap di repository web. Folder ini adalah sumber kanonis perubahan mobile berikutnya; perubahan lintas repository harus mengoordinasikan versi agar tidak diterapkan dua kali.

Migrasi di sini adalah delta terhadap schema yang diaudit, bukan reset atau salinan ulang seed web. Snapshot audit menyimpan metadata schema awal untuk review. Fixture test memakai bagian baseline yang diperlukan migrasi mobile dan stub auth/storage; bukan backup produksi.

Jalankan `npm run test:db` untuk memverifikasi migrasi dan otorisasi pada PostgreSQL WASM (PGlite). Test API hosted dengan akun sintetis dilakukan terpisah lalu dibersihkan. Jangan menjalankan db reset/push yang menghapus riwayat remote.

## Paket yang sudah diterapkan

- `20261102134333_mobile_teacher_role.sql`
- `20261102134336_mobile_profiles_classes.sql`
- `20261102134339_mobile_class_rpcs.sql`
- `20261102134341_mobile_avatars.sql`

Versi ini mengikuti riwayat hosted. Jangan mengedit migrasi yang sudah diterapkan; perbaikan berikutnya memakai migrasi baru. Empat migrasi ini menambah TEACHER, profil, kelas/membership, RPC mobile dan bucket avatar privat. Nama, parameter dan batas endpoint dijelaskan di `docs/API-CONTRACT-DRAFT.md`.

## Provisioning akun Guru

Administrator membuat akun Auth baru melalui Dashboard atau layanan admin tepercaya, lalu menetapkan `profiles.role = 'TEACHER'` pada UUID akun tersebut di lingkungan berprivilege. Periksa UUID dan email akun sebelum perubahan; jangan mengubah akun siswa yang sudah mempunyai membership. Trigger database menolak transisi role yang tidak konsisten. Jangan mengirim service key ke aplikasi atau memakai `user_metadata.role` sebagai izin. Form signup mobile selalu membuat USER. UI provisioning admin baru belum dibuat dalam repository mobile.

## Pengujian hosted

`scripts/test-hosted-m1.mjs` menyediakan workflow eksplisit `setup`, `test`, `remove-objects`. Jangan menjalankannya sebagai test rutin atau di CI: workflow ini membuat akun/kelas sintetis pada project terhubung, memerlukan provisioning role untuk dua fixture Guru, lalu pembersihan berprivilege yang dibatasi UUID dan penanda fixture. Manifest kredensial sementara disimpan mode 0600 dalam `.secrets/`, diabaikan dari version control, dan dihapus setelah cleanup. Pengujian rutin memakai PGlite dan tidak menyentuh hosted.

Penghapusan foto harus melalui Storage API sebelum akun dihapus. Setelah itu hapus membership dan kelas fixture, cabut sesi serta hapus akun fixture yang cocok UUID/penanda, lalu verifikasi tidak tersisa. Jangan menjalankan perintah cleanup berdasarkan nama/email umum.
