# Forum umum — implementasi database

Tanggal: 5 November 2026. Cakupan pekerjaan ini adalah backend Supabase untuk forum umum lintas kelas; layar forum di aplikasi mobile masih berupa placeholder.

## Desain

Forum mobile menggunakan tabel `public.forum_topics` dan `public.forum_replies` yang sudah ada, sehingga tidak membuat forum terpisah per kelas. RPC `public.mobile_forum(p_action text, p_payload jsonb)` memeriksa identitas dan role berdasarkan Auth/profil server. Hanya role siswa (`USER`) dan guru (`TEACHER`) dapat memakai RPC; permintaan anonim tidak memiliki izin. Saat ada assessment aktif, setiap aksi RPC menolak dengan `OTHER_TEST_ACTIVE`. Kebijakan baca langsung tabel forum yang sudah ada juga memeriksa assessment aktif.

Aksi yang tersedia:

| Aksi | Payload | Hasil dan aturan |
| --- | --- | --- |
| `topics` | `category?`, `search?`, `limit?`, `offset?` | Daftar topik, nama penulis, jumlah balasan, `hasMore`; filter dan pencarian judul/isi. |
| `topic` | `topicId` | Detail topik yang terlihat. |
| `replies` | `topicId`, `limit?`, `offset?` | Daftar balasan berurutan dan `hasMore`. |
| `create_topic` | `title`, `body`, `category` | Membuat topik sebagai akun pemanggil, maksimal lima topik per jam. |
| `create_reply` | `topicId`, `body` | Membalas topik terbuka, maksimal 30 balasan per jam. |
| `moderate` | `targetId`, `operation`, `value` | Hanya guru: `lock_topic`, `hide_topic`, atau `hide_reply`; boolean `value` memungkinkan membalik tindakan. |

Kategori yang saat ini didukung mengikuti constraint tabel lama: `DATABASE` dan `GENERAL`. Penambahan kategori lain perlu perubahan kontrak/constraint dan pemeriksaan kompatibilitas klien. Limit halaman 1–50 dengan offset maksimal 10.000; `hasMore` diperiksa dengan mengambil satu item tambahan. Offset dapat bergeser bila topik baru masuk antarhalaman. Nama penulis dikembalikan sebagai `authorName` dan kepemilikan sebagai `isMine`, tanpa mengembalikan NIM, email, tanggal lahir, maupun UUID penulis melalui RPC ini. Guru dapat melihat konten tersembunyi untuk moderasi; siswa tidak. Kunci dan data forum tetap mengikuti penyimpanan yang sudah ada.

Penulisan dan awal tes mobile diserialkan menggunakan kunci kelas yang sama; penulis forum juga memakai advisory lock per akun untuk pembatasan laju. Pembacaan diperiksa pada saat permintaan, bukan penguncian sepanjang pengguna membuka layar. Fungsi penulisan forum lama untuk `service_role` dipertahankan dan ditambah pemeriksaan tes mobile; helper di skema privat hanya dapat dijalankan `service_role`.

## Penerapan dan pengujian

Migrasi hosted `20261105150650_mobile_general_forum` diterapkan pada proyek Quethink. Pemeriksaan hosted memastikan RPC tidak tersedia untuk `anon`, tersedia untuk `authenticated`, helper privat tidak dapat dijalankan oleh pengguna biasa, dan fungsi writer lama tidak dapat dijalankan pengguna biasa. Transaksi data sintetis yang dibatalkan memverifikasi pembuatan topik, proyeksi nama tanpa NIM, moderasi guru, penolakan moderasi siswa, penolakan balasan topik terkunci, serta pemblokiran saat tes mobile melalui RPC mobile dan writer lama. Tidak ada data sintetis pengujian yang disimpan.

`tests/forum.test.ts` menguji jalur tersebut ditambah balasan, item tersembunyi, kategori/pencarian, batas input, pagination, RLS baca saat assessment, dan penolakan penulisan langsung. Rangkaian pengujian lokal 24 tes lulus sebelum perluasan terakhir atas tes pagination; tes forum diperbarui juga lulus tersendiri. Typecheck dan lint lulus tanpa error; lint masih memiliki satu peringatan lama pada Lab.

Supabase Security Advisor mengeluarkan WARN untuk RPC `SECURITY DEFINER` yang sengaja dapat dipanggil `authenticated`. Fungsi memeriksa `auth.uid()`, role server, serta status tes dan membatasi output; hak eksekusi untuk `anon` dicabut. Tinjau kembali izin ini saat kontrak diubah: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable

Pengujian ini belum mencakup antarmuka forum mobile, pengujian provider AI, atau uji beban/concurrency multi-client terhadap server hosted. Fitur belum dapat digunakan di aplikasi sampai layar mobile dihubungkan ke RPC.
