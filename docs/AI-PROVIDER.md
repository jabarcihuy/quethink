# Konfigurasi provider AI

Dicatat pada 2 November 2026 berdasarkan konfigurasi yang diberikan pengguna, untuk integrasi AI pada tahap berikutnya.

| Konfigurasi | Nilai |
|---|---|
| Base URL | `https://router.bynara.id/v1` |
| Chat endpoint | `https://router.bynara.id/v1/chat/completions` |
| Model | `glm-5.3-flash` |
| Autentikasi | Header `Authorization: Bearer <AI_API_KEY>` |
| Bentuk request yang diberikan | JSON `model` dan `messages` |

Kunci disimpan hanya dalam konfigurasi lokal `.secrets/ai-provider.env`, dengan izin file `0600` dan direktori `0700`. Direktori tersebut diabaikan Git. Dokumen ini tidak berisi kunci.

Nama variabel server: `AI_BASE_URL`, `AI_MODEL`, dan `AI_API_KEY`. Konfigurasi lokal ini belum dipasang sebagai secret pada layanan server dan tidak dimuat oleh aplikasi React Native.

Saat fitur AI dikerjakan, aplikasi memanggil layanan server Quethink. Layanan itu membaca secret provider dan meneruskan permintaan ke endpoint di atas. Kunci tidak dimasukkan ke `EXPO_PUBLIC_*`, kode mobile, atau APK. Pemeriksaan sesi, pembatasan penggunaan, dan pemblokiran AI selama tes tetap berlaku di server sesuai PRD.

Endpoint, kunci, dan dukungan model belum diuji; belum ada request atau pemakaian kuota yang dilakukan. Verifikasi format respons, streaming bila diperlukan, serta penanganan error saat integrasi.

## Implementasi lokal — 5 November 2026

Tersedia layar tutor satu pertanyaan untuk siswa/guru, fungsi `mobile-ai`, dan migrasi batas penggunaan 15 permintaan per akun per jam. Fungsi memvalidasi sesi, memeriksa akses dan tes aktif sebelum panggilan provider, serta memeriksa kembali tes sebelum menyerahkan jawaban. Tidak ada riwayat percakapan atau prompt yang disimpan di tabel batas. AI terpisah dari playground yang masih terencana.

**Status hosted:** migrasi `20261105145507_mobile_ai_tutor` dan Edge Function `mobile-ai` versi 1 telah dipasang di proyek Quethink. JWT wajib untuk Edge Function. Di database hosted, akses siswa/guru, penolakan saat tes aktif, dan pembatasan 15 permintaan diverifikasi dengan data sintetis dalam transaksi yang dibatalkan; permintaan fungsi tanpa login ditolak 401. Akun dan kelas sintetis untuk uji tersebut dibersihkan.

**Belum aktif untuk pengguna:** secret provider belum dipasang; kunci yang sebelumnya dibagikan perlu dirotasi. Pengujian provider lokal memakai tiruan, bukan panggilan ke Bynara. Layar tutor menunjukkan bahwa layanan belum tersedia dan tombolnya nonaktif sampai konfigurasi build `EXPO_PUBLIC_AI_ENABLED=true` ditetapkan. Simpan `AI_BASE_URL`, `AI_MODEL`, dan `AI_API_KEY` baru sebagai secret Supabase, lalu uji provider, akses siswa/guru, tes aktif, rate limit, kesalahan provider, dan alur Android dengan akun uji sebelum mengaktifkan fitur. Jangan memasukkan kunci ke APK atau dokumen.
