# Latihan ringan dan grid menu

Perubahan 3 November 2026 berdasarkan masukan agar latihan tidak berlebihan dan beberapa menu memakai grid.

Default starter course tetap dua Lab terpilih (WHERE dan UPDATE), masing-masing satu tugas inti. Tidak ditambahkan latihan pada setiap bacaan. PRD dan panduan form Guru menegaskan praktik hanya diberikan ketika materi memerlukannya. Jumlah bawaan sudah sesuai, sehingga tidak ada perubahan schema, migrasi atau penghapusan konfigurasi kelas. Guru tetap dapat menyesuaikan konteks kelas.

Grid digunakan untuk tujuan setara: pasangan kelola soal/hasil tiap tes pada pengelolaan kelas Guru, serta pasangan hasil pretest/posttest Siswa setelah posttest selesai. Materi berurutan, kelas, roster dan soal tetap list. Tombol utama Siswa menjadi “Review materials” / “Tinjau materi” setelah semua materi selesai.

MenuGrid memakai ikon outline yang tersedia, apricot untuk kelola soal dan lavender untuk hasil. Dua kolom digunakan ketika lebar konten minimal 300 dp dan font scale kurang dari 1.25. Layar lebih sempit atau font besar memakai satu kolom; label boleh wrap. Target minimal 104 dp, padding 16 dp, jarak 12 dp, radius 12 dp. Label aksesibilitas aksi soal menyebut jenis tes agar dua menu Guru dapat dibedakan.

Verifikasi visual memakai komponen MenuGrid yang sama pada route QA sementara, dengan label sintetis yang ditandai jelas: emulator Android API37, 360 dp English/font1, 360 dp Indonesia/font1.3, serta 320 dp English/font1. Semua label terbaca; scroll mencapai tile terakhir. Satu tile membuka halaman bahasa dan system Back kembali. Ini verifikasi komponen, bukan walkthrough ulang Home/course dengan akun nyata; routing produksi diperiksa lewat source dan TypeScript. Route QA dihapus sebelum ekspor akhir.

Fresh finish reviewer memberi disposition **ship** pada cakupan tersebut tanpa temuan material, dengan syarat route sementara dihapus dan pemeriksaan akhir lulus. Tidak ada klaim pengujian perangkat fisik, TalkBack, tablet, dark mode atau seluruh alur role. Canvas FigCraft belum diperbarui; keputusan UI/UX dan implementasi React Native menjadi catatan perubahan ini.

Pemeriksaan akhir: TypeScript, lint (tanpa error; satu warning unused variable Lab yang sudah ada) dan 17 tes lulus. Ekspor Android berhasil dan marker route QA tidak ditemukan dalam bundle. Penghapusan route sementara memenuhi syarat disposition ship. Ukuran layar emulator dikembalikan, font dikembalikan ke nilai awal sesi 1.3, data aplikasi uji dibersihkan dan proses emulator/Metro dihentikan.
