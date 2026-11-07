# Kontrak integrasi Supabase mobile — akun dan kelas M1

Tanggal: 2 November 2026. Kontrak akun/kelas berikut sudah diterapkan; nama file dipertahankan agar tautan lama tetap berlaku. Kontrak pretest, materi dan progres baca berikutnya sudah tersedia melalui `mobile_learning`; lihat [kontrak pembelajaran](LEARNING-IMPLEMENTATION.md). Posttest, Lab dan editor soal sudah dilanjutkan pada [kontrak siklus](CYCLE-IMPLEMENTATION.md). Lihat [laporan implementasi](M1-IMPLEMENTATION-VERIFICATION.md) untuk bukti dan batas verifikasi.

Supabase project: `https://dadjfyjvalnaqqrmqpfa.supabase.co`. Client memakai publishable key dan JWT akun. Tidak ada service role/provider key di APK. Auth memakai SDK; operasi bisnis kelas memakai RPC dengan identitas dari `auth.uid()`.

## Akun dan sesi

| Kebutuhan | Operasi aktual | Perilaku |
|---|---|---|
| Daftar Siswa | `auth.signUp` email/password | Trigger selalu USER, metadata role diabaikan; onboarding nama/NIM sesudah session tersedia |
| Login | `auth.signInWithPassword` | Role dari RPC profil, bukan pilihan form |
| Sesi | SDK persistence, koordinasi refresh bawaan, auto refresh sesuai AppState | SecureStore dengan chunk dan manifest commit; password tidak disimpan |
| Logout | `auth.signOut({scope:'local'})` | Hapus sesi perangkat dan state privat; belum ada cache/unduhan fitur lain |
| Reset | `auth.resetPasswordForEmail`, PKCE `exchangeCodeForSession`, `auth.updateUser` | Callback `quethink://auth/callback`; link harus dibuka di perangkat peminta |
| Guru | Admin membuat akun baru di layanan tepercaya, menetapkan profil TEACHER | Tidak tersedia pada signup mobile; ADMIN menggunakan panel web |

Snapshot Auth: email/password aktif, signup aktif, konfirmasi email nonaktif (`mailer_autoconfirm=true`). UI tetap menangani signup tanpa session jika pengaturan ini berubah. Pengguna melaporkan redirect callback sudah ditambahkan; allowlist tidak bisa dibaca lewat MCP yang tersedia. Reset lewat inbox belum diuji menyeluruh.

## RPC aktual

Semua wrapper `public.mobile_*` memakai SECURITY INVOKER dan EXECUTE hanya untuk authenticated. Dispatcher berprivilege berada pada schema private, mempunyai `search_path` tetap dan memeriksa akun/role/kepemilikan untuk setiap operasi. Tidak ada mutasi profil/kelas/membership langsung dari client.

RPC mengembalikan JSON `{data: ...}`, atau business error `{error:{code:'...'}}`. Respons daftar juga mempunyai `nextCursor: string|null`. Error bisnis bukan sukses operasi. Error SDK/transport tetap terpisah dan dipetakan repository menjadi pesan lokal.

| RPC | Parameter | Data |
|---|---|---|
| `mobile_get_my_profile` | — | Profil sendiri |
| `mobile_update_my_profile` | `p_display_name`, `p_nim=null`, `p_birth_date=null`, `p_avatar_path=null` | Profil tersimpan; tanggal berbentuk teks YYYY-MM-DD; role/id tidak dapat dikirim |
| `mobile_resolve_class_code` | `p_code` | Ringkasan `{id,name,teacherName}` kelas aktif untuk konfirmasi |
| `mobile_join_class` | `p_code` | Membership `{id,classId,studentId,joinedAt}`; satu kelas per siswa, retry kelas sama idempoten |
| `mobile_get_my_class` | — | Kelas siswa atau null |
| `mobile_list_my_classes` | `p_cursor=null` | Daftar kelas Guru pemanggil, halaman maksimum 50 |
| `mobile_list_templates` | — | Learning path yang published: `{id,title}`; pilihan sumber kelas, belum salinan materi |
| `mobile_create_class` | `p_name`, `p_template_id` | Kelas + kode untuk Guru pemilik |
| `mobile_archive_class` | `p_class_id` | Kelas arsip; pemilik saja; panggilan ulang idempoten |
| `mobile_get_class_roster` | `p_class_id`, `p_cursor=null` | Anggota `{id,displayName,nim,joinedAt}`; pemilik saja; maksimum 50 |
| `mobile_get_dashboard` | `p_class_id=null` | `{class,nextAction,progress:null,pretestScore:null,posttestScore:null}` |

Cursor adalah string JSON `{at,id}` yang harus diperlakukan sebagai nilai buram oleh client. Urutan timestamp + UUID mencegah baris hilang saat timestamp sama. Tidak ada parameter userId/teacherId yang dipercaya client.

## DTO dan aturan

**Profile:** `{id,role,displayName,nim,avatarPath,birthDate,profileComplete}`. Role USER→student, TEACHER→teacher, ADMIN→admin. Nama maksimal 100 karakter, NIM teks maksimal 64; keduanya wajib untuk siswa sebelum join. DOB opsional tidak boleh di masa depan. `profileComplete` dihitung server.

**Class:** `{id,name,status,teacherName,studentCount,joinCode,createdAt,archivedAt}`. Nama maksimal 120 karakter; status active/archived. `joinCode` selalu null bagi siswa. Timestamp ISO UTC; DOB tanggal kalender. UUID string.

**Membership:** UNIQUE(student_id), tetap ada sesudah arsip; siswa belum dapat mengganti kelas. Join mengunci profil dan kelas untuk menangani dua request bersamaan serta race dengan arsip. Resolve dan join berbagi batas 10 panggilan per menit per akun; tebakan salah ikut dihitung. Kode baru 12 digit hex uppercase, spasi/hyphen dinormalisasi.

**Dashboard akun/kelas lama:** `mobile_get_dashboard` tetap mengembalikan `pretest_not_started` atau `archived` dengan metrik null. Beranda mobile sekarang menggunakan action `status` pada `mobile_learning` untuk attempt, nilai dan progres aktual; jangan gunakan DTO lama sebagai status pembelajaran.

**Avatar:** bucket `avatars` privat, path `accountId/...`, JPEG/PNG/WebP maksimum 5 MB. Pemilik saja boleh upload/read/update/delete dan membuat signed URL. Profil menyimpan path; URL bertenggat dibentuk saat menampilkan foto, bukan disimpan permanen.

## Error dan akses

Business error utama: AUTH_REQUIRED, PROFILE_INCOMPLETE, VALIDATION_ERROR, STUDENT_REQUIRED, TEACHER_REQUIRED, CLASS_CODE_INVALID, CLASS_ARCHIVED, ALREADY_JOINED, FORBIDDEN, RATE_LIMITED. Repository memvalidasi bentuk DTO dan tidak menampilkan SQL/error internal ke pengguna.

Guru hanya mengelola/menampilkan roster kelas sendiri. Profil siswa lain tidak dapat dibaca langsung. Nama/NIM roster dibatasi untuk Guru pemilik; DOB/email bukan bagian respons roster. Signup metadata tidak dapat mengangkat role. Kelas arsip menolak join dan tidak menampilkan kode di layar detail; mutasi akun pribadi tetap diperbolehkan.

## Berikutnya

Materi kelas, completion baca, attempt/deadline pretest dan hasil tersedia melalui `mobile_learning`; kontrak dan batasnya dijelaskan pada [implementasi pembelajaran](LEARNING-IMPLEMENTATION.md). Lab, posttest dan authoring soal tersedia pada increment siklus; `mobile_learning` menerima kind PRETEST/POSTTEST dan `bank`, sedangkan RPC `mobile_cycle` hanya untuk service Edge. Lampiran saat ini berupa tautan HTTPS eksternal, belum upload privat/signed URL. SELECT katalog global tidak menggantikan aturan membership/pretest mobile; gunakan RPC untuk mengakses salinan konten kelas.

Referensi implementasi: [Supabase Expo React Native](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [native deep links](https://supabase.com/docs/guides/auth/native-mobile-deep-linking). Hasil uji JWT hosted melengkapi pengujian SQL; hak postgres MCP sendiri tidak membuktikan akses aplikasi.

## Increment absensi QR

Kontrak implementasi `mobile_attendance(action,payload)` sudah tersedia pada [implementasi absensi](ATTENDANCE-IMPLEMENTATION.md#kontrak-aktual). Sesi, QR berotasi, pemindaian, roster dan koreksi beralasan memakai otorisasi server. Tidak ada parameter lokasi/radius. Bagian tersebut menjadi acuan absensi aktual; bagian rencana yang lebih lama tetap konteks historis.
