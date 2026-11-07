# Implementasi desain Quethink Mobile — fondasi, akun, kelas, siklus pembelajaran dan absensi QR

Diperbarui: 5 November 2026. Cakupan: fondasi M0 Android, akun/kelas, navigasi role, pretest/posttest, hasil, materi kelas, Lab SQL, editor soal Guru dan absensi QR. Dokumen ini tidak menyatakan seluruh M1 atau produk selesai.

## Overview

Kebutuhan produk mengikuti [PRD mobile](PRD-MOBILE-REACT-NATIVE.md). Identitas visual tetap mengikuti [UI/UX prototype](UIUX-PROTOTYPE.md) dan [preview Beranda Siswa](prototype-previews/home.png): Indigo–apricot terang, latar ivory, permukaan tonal, ikon outline, serta inset konten 24 dp. Dokumen ini mencatat implementasi yang sudah ada, bukan identitas visual baru atau pengganti prototype. Nilai runtime bersumber dari [`src/theme/tokens.ts`](../src/theme/tokens.ts).

Fondasi M0 tetap menyediakan welcome (`/`), penjelasan alur belajar (`/journey`), pemilihan bahasa (`/language`), dan pemulihan route tidak ditemukan. Welcome menjelaskan produk tanpa kelas, nilai, atau progres contoh; kini tersedia tombol masuk dan sesi aktif diarahkan ke beranda. Kartu apricot mempertahankan penekanan tindakan belajar dari prototype, tetapi isinya mengarahkan pengguna membaca alur, bukan membuka materi sungguhan.

Increment akun/kelas menambah login, daftar Siswa, permintaan reset, callback PKCE, kata sandi baru, onboarding/edit profil dengan foto privat, gabung satu kelas melalui konfirmasi, beranda sesuai role server, serta daftar/buat/detail/roster/arsip kelas Guru. Seluruh layar memakai komponen native React Native dan Expo Router, bukan HTML/WebView. Auth dan data kelas terhubung ke Supabase nyata; role tidak dipilih atau ditetapkan oleh form mobile.

Increment pembelajaran menambah lima tab native berlabel sesuai role, pretest satu kali dengan pilihan ganda dan SQL, penilaian server dan hasil/pembahasan, progres nyata, materi kelas berurutan serta reader dan form materi Guru. Template published kini disalin menjadi materi kelas terpisah; perubahan Guru tidak mengubah katalog atau kelas lain. Kontrak perilaku ada di [implementasi pembelajaran](LEARNING-IMPLEMENTATION.md).

Increment siklus menambah Lab SELECT/UPDATE pada materi, posttest sesudah seluruh prasyarat selesai, nilai pretest/posttest terpisah dan editor paket soal Guru. Detail perilaku dan batas sandbox mengikuti [implementasi siklus](CYCLE-IMPLEMENTATION.md). Ini perluasan komponen native dan identitas yang sama, tanpa aset raster atau dunia visual baru. Forum masih menyediakan halaman penjelasan cakupan; diskusi, playground bebas, offline, notifikasi dan AI tetap pekerjaan berikutnya. Alur pretest → materi → praktik → posttest pada `/journey` kini mempunyai implementasi online dengan batas yang dicatat di bawah. Urutan pengembangan ada di [backlog](IMPLEMENTATION-BACKLOG.md); kontrak aktual serta batasnya ada di [kontrak integrasi](API-CONTRACT-DRAFT.md).

Increment absensi menambah sesi bertimer Guru, QR berputar, pemindai kamera Siswa, riwayat, roster dan koreksi manual beralasan dengan audit. Implementasi mengikuti [PRD §9](PRD-MOBILE-REACT-NATIVE.md#9-absensi-qr) dan [kontrak absensi aktual](ATTENDANCE-IMPLEMENTATION.md): QR saja, tanpa GPS, lokasi, radius atau izin lokasi. Acuan FigCraft lama yang memakai GPS/radius tidak menjadi kontrak fitur ini. Ini perluasan sistem native yang sama dengan Page, Button, Field, Radio dan styles bersama, tanpa token global atau aset raster baru.

Refinement terbaru menerapkan grid menu untuk tujuan penilaian yang setara, sesuai [preferensi terbaru prototype](UIUX-PROTOTYPE.md#preferensi-terbaru--latihan-ringan-dan-grid-menu). Materi, kelas, roster dan urutan soal tetap list. Default praktik tetap dua Lab bawaan dengan satu tugas inti masing-masing; bacaan lain tidak mendapat latihan tambahan. Guru tetap dapat menyesuaikan kebutuhan Lab menurut konteks materi. Tidak diperlukan atau dilakukan pengurangan latihan backend maupun migrasi untuk refinement ini.

Perapian visual mobile memperkuat identitas tersebut melalui panel indigo/apricot/mint, kelompok baris putih, jalur materi dan ilustrasi geometris 2D asli. Beranda memakai nama, kelas, tindakan dan progres dari data aktual. Dashboard Guru web direncanakan sebagai akses tambahan; kemampuan Guru mobile tetap dipertahankan lengkap sesuai cakupan produk yang sudah diimplementasikan. Arah dan batas increment dicatat dalam [brief visual](../.impeccable/briefs/mobile-visual-refresh.md) dan [verifikasi perapian](UI-VISUAL-REFRESH-VERIFICATION.md).

## Colors

Berikut snapshot token bersama yang tetap digunakan tanpa palet baru. Token cadangan ditandai agar tidak disalahartikan sebagai fitur selesai.

| Token | Nilai | Penggunaan saat ini |
|---|---|---|
| `primary` | `#5145CD` | Tombol utama, tindakan teks/header, ikon, nomor langkah, kode kelas dan radio terpilih |
| `onPrimary` | `#FFFFFF` | Label dan indikator sibuk tombol utama |
| `primaryContainer` | `#EEEAFF` | Pilihan bahasa/template terpilih, latar nomor langkah, kartu kelas/konfirmasi/kode, tile hasil MenuGrid, ripple pilihan bahasa |
| `background` | `#FCFAF8` | Konten, header native, dan layar pemuatan preferensi |
| `surface` | `#FFFFFF` | Permukaan input dan opsi template tidak terpilih |
| `onSurface` | `#24243A` | Judul, label field/pilihan, teks input, dan warna ikon default |
| `onSurfaceVariant` | `#626477` | Body, catatan pendamping, placeholder dan tindakan nonaktif |
| `outline` | `#D8D5E2` | Batas input/pilihan tidak terpilih dan pemisah roster |
| `secondaryContainer` | `#F6D2B2` | Kartu penjelasan perjalanan belajar pada welcome, kartu ajakan pretest dan tile kelola soal MenuGrid |
| `onSecondaryContainer` | `#4C2D18` | Judul kartu apricot welcome/pretest serta ikon/label tile kelola soal |
| `secondaryText` | `#6E4021` | Body kartu apricot welcome/pretest |
| `successContainer` | `#E2F3EB` | Panel dan tile mint, termasuk konfirmasi absensi; status tetap ditulis sebagai teks |
| `success` | `#176B61` | Ikon mint, node dan label materi selesai, serta teks receipt absensi |
| `error` | `#B42318` | Pesan kegagalan preferensi bahasa, validasi, Auth, profil dan operasi kelas |

Pembelajaran memakai kembali lavender untuk kartu kelas/timer dan apricot untuk ajakan pretest; tidak ada palet fitur baru. State selesai/tersedia/terkunci dan hasil benar/perlu ditinjau memakai label, bukan warna saja. Absensi memakai kembali `successContainer` dan `success` untuk receipt; materi selesai memakai label dan check bersama warna success.

Tema dikunci terang melalui `userInterfaceStyle: light` di [`app.json`](../app.json); status bar memakai ikon gelap. Warna section prototype belum menjadi palet baru; grid penilaian/pengelolaan memakai kembali apricot dan lavender dari token yang sama.

## Typography

Tidak ada font kustom. Teks umum menggunakan font sistem Android, sesuai arah Roboto default. `styles.code` pada pembelajaran menetapkan `fontFamily: "monospace"` dengan body 16/24 untuk SQL, dataset tes/Lab dan inline/fenced code reader. Input SQL berupa TextInput multiline native, bukan editor syntax-highlight. Sel tabel Markdown reader tetap menggunakan body sistem; ini berbeda dari arahan monospace tabel pada prototype.

| Peran | Ukuran / line height | Weight | Penggunaan |
|---|---|---|---|
| `headline` | 32 / 40 | 700 | Judul welcome dan layar utama yang diperbarui |
| `title` | 24 / 32 | 700 | Judul kartu welcome, pemilihan bahasa, layar akun/kelas dan route tidak ditemukan; kode kelas (letter spacing 2) |
| `subtitle` | 18 / 26 | 600 | Judul bagian welcome/langkah belajar, kartu kelas dan nama siswa pada roster |
| `body` | 16 / 24 | 400 | Penjelasan, pilihan, isian form dan pesan error |
| `label` | 14 / 20 | 600 | Tindakan teks/header, label field dan nomor langkah; tombol utama memakai body 16/24 tebal |
| `caption` | 14 / 20 | 400 | Catatan aturan tes |

Angka merupakan nilai style React Native sebelum pengaturan skala font perangkat. Tidak ada `allowFontScaling={false}` atau batas `maxFontSizeMultiplier`. Konten memakai tinggi fleksibel dan scroll. Walkthrough historis akun/kelas memeriksa English pada skala 1.0 serta Bahasa Indonesia pada skala 1.3, termasuk daftar kelas Guru dan form profil. Capture learning sebelumnya memeriksa Beranda dan daftar hasil Guru dalam Bahasa Indonesia pada font scale 1.3 tanpa clipping yang terlihat. Paket cycle menambah bukti editor bank (termasuk prompt/pilihan) dan daftar hasil posttest Guru dalam Bahasa Indonesia pada skala 1.3; konten soal buatan Guru tetap English. Reader, attempt, pembahasan, form materi dan Lab SQL pada skala 1.3 belum dibuktikan; hasil historis tidak memperluas cakupan ini. Ini bukan audit aksesibilitas seluruh aplikasi. Tipografi judul header mengikuti native stack dan tidak seluruhnya mengambil skala token.

## Layout

[`Page`](../src/components/Page.tsx) menyediakan `ScrollView` dengan inset 24 dp, konten selebar tersedia sampai maksimum 560 dp, dan jarak antarbagiannya 24 dp. Padding bawah memakai nilai terbesar antara inset sistem dan 24 dp. Scroll mempertahankan tap kontrol saat keyboard tampil (`keyboardShouldPersistTaps="handled"`) dan meminta keyboard ditutup ketika drag (`keyboardDismissMode="on-drag"`). Tidak ada wrapper keyboard-avoiding khusus. Header dikelola native stack; lima tab role dikelola native tabs. Tidak ada header atau gesture indicator buatan dalam konten. Reader, Lab, attempt, hasil, pengelolaan materi dan bank soal dibuka sebagai route stack sekunder di luar bar tab. Konfigurasi Android mengaktifkan predictive Back.

Skala spacing: `xs` 4, `sm` 8, `md` 12, `lg` 16, `xl` 24, `xxl` 32, dan `section` 40 dp. `section` belum dipakai. Baris langkah memakai nomor tetap di sisi kiri dan area teks fleksibel; daftar bahasa memakai label fleksibel di samping tanda centang.

Tombol utama, `TextAction`, dan tindakan header memiliki target minimum 48 dp. `Field` dan opsi template memakai tinggi minimum 52 dp; input mempunyai padding 12 dp dan label terpisah dengan gap 8 dp. Pilihan bahasa memiliki tinggi minimum 64 dp. Nomor langkah 36 dp merupakan dekorasi, bukan kontrol. Radio soal memakai minimum 52 dp; baris switch kebutuhan Lab minimum 48 dp. Label tab native 12 sp selalu tampil bersama ikon 24 dp. Ukuran keseluruhan bar tab mengikuti komponen native, bukan ukuran literal 78 × 70 dp dari preview. Tidak ada breakpoint tablet khusus; pembatasan lebar dan scroll adalah perilaku adaptif yang saat ini tersedia.

[`MenuGrid`](../src/components/MenuGrid.tsx) mengukur lebar parent melalui `onLayout`. Untuk lebih dari satu item, grid memakai dua kolom ketika lebar konten minimal 300 dp dan `fontScale < 1.25`; selain itu satu kolom, termasuk skala 1.3. Gap 12 dp, padding tile 16 dp dan tinggi minimum tile 124 dp; label dapat wrap tanpa tinggi tetap. Ini adaptasi komponen, bukan breakpoint tablet. Materi berurutan, daftar kelas/roster dan isi soal tetap list agar urutannya terbaca. Pada panel kelas Beranda Siswa, ilustrasi disembunyikan ketika lebar kurang dari 350 dp atau font scale minimal 1.25 agar judul mendapat lebar penuh pada 320 dp.

Reader memakai scroll vertikal `Page`, dengan blok Markdown berjarak 24 dp. Fenced code dan tabel mempunyai scroll horizontal tersendiri; sel tabel selebar 120 dp dengan padding 12 dp. Dataset tes juga dapat digeser horizontal. `QueryTable` pada Lab dan bank soal memakai scroll horizontal; lebar setiap kolom dihitung dari panjang header/isi, dibatasi 96–200 dp, dengan padding sel 12 dp. Header memakai label sistem, isi memakai monospace dan selectable. Tabel kosong mempunyai pesan tersendiri. Input SQL multiline dan jawaban SQL pada hasil membungkus teks, bukan area scroll horizontal. `SqlEditor` Lab/query acuan bank dibatasi tinggi 144–288 dp dan 4096 karakter; prompt/pembahasan bank dibatasi 104–208 dp dan 2000 karakter. Pilihan bank multiline maksimal 500 karakter memakai tinggi fleksibel Field. Batas tinggi itu bukan klaim editor tes mempunyai maksimum yang sama. Pergantian soal mengembalikan posisi halaman ke atas.

## Elevation & Depth

Komponen fondasi, akun/kelas dan pembelajaran tidak mendefinisikan shadow atau elevation. Apricot/lavender dan outline memberi pemisahan permukaan. Shadow header native dimatikan. Ini sesuai prinsip tonal surface pada prototype.

## Shapes

Token radius `control` 12 dp dipakai tombol, pilihan bahasa, input dan opsi template; `surface` 16 dp dipakai kartu apricot/lavender. Tombol, pilihan bahasa, input, opsi template dan kartu tersebut meminta `borderCurve: continuous`. Tile MenuGrid memakai radius `control` 12 dp dan clipping ripple, tanpa properti kurva tambahan. Nomor langkah memakai radius 18 dp. Pilihan bahasa/input/opsi template mempunyai outline 1 dp; radio template mempunyai lingkaran 20 dp, border 2 dp dan titik terpilih 10 dp. Preview foto profil berukuran 88 × 88 dp dengan radius 16 dp literal, belum mereferensikan token. Kode kelas memakai font sistem, bukan monospace. Kartu dan tombol memakai isi warna tanpa border dekoratif.

## Components

| Komponen / pola | Keputusan yang sudah diterapkan |
|---|---|
| [`Button`](../src/components/Button.tsx) | Satu varian primary; padding horizontal 16 dan vertikal 12 dp; label dapat menyusut/wrap. Pressed opacity 0.88 dengan skala 0.99 dan ripple putih transparan. `busy` menambah spinner dan menonaktifkan aksi; disabled opacity 0.55. Role button serta state busy/disabled tersedia. |
| [`MenuGrid`](../src/components/MenuGrid.tsx) | Tujuan penilaian setara: kelola soal apricot (`secondaryContainer`, ikon/label `onSecondaryContainer`), hasil lavender (`primaryContainer`, ikon indigo dan label ink). Label body 16/24 weight 700, gap ikon/label 8 dp; tata letak mengikuti aturan di atas. Native `Pressable`, role button, state disabled, ripple outline, pressed opacity 0.85 dan disabled opacity 0.55. Label aksesibel memakai label tujuan; aksi kelola soal menambahkan konteks Pretest/Posttest agar dua bagian Guru dapat dibedakan. Ini dukungan source, bukan bukti pengujian TalkBack. |
| [`TonalPanel`, `DestinationRow`, `ProgressTrack`](../src/components/ClassroomUI.tsx) | Panel indigo/apricot/mint berbagi radius dan padding; baris tujuan putih memakai badge ikon, judul/subjudul dan chevron atau lock, dengan feedback tekan. Progress bar berlabel dan nilai aksesibel memakai jumlah selesai/total aktual. |
| Jalur materi | Node bernomor terhubung menyajikan materi berurutan; selesai memakai check dan label success, tersedia dan terkunci memiliki label eksplisit. Hanya tampilan Siswa menampilkan hitungan progres; tampilan Guru tidak menyamar sebagai progres Siswa. Judul mendapat ruang fleksibel di samping chevron/lock. |
| [Ilustrasi 2D](../assets/illustrations/README.md) | Empat SVG geometris editable: `study` (tabel skema), `learn` (buku), `attend` (receipt/check), `forum` (percakapan). Fill datar dan stroke memakai palet incumbent, tanpa raster 3D, tekstur, gradien atau perspektif. Setelah mengedit SVG, jalankan `node scripts/sync-learning-art.mjs` untuk menyinkronkan XML native; ilustrasi dekoratif tidak dibaca terpisah dari teks. |
| Kartu perjalanan | Kartu apricot dengan padding 24 dan gap 16 dp; judul, body, serta satu tombol menuju penjelasan alur. Belum menjadi komponen kartu reusable. |
| Langkah perjalanan | Empat baris berurutan, gap 32 dp, badge nomor lavender dan judul/body. Badge disembunyikan dari aksesibilitas agar tidak menjadi elemen dekoratif terpisah. |
| Pilihan bahasa | Dua baris radio: English dan Bahasa Indonesia. State checked, outline indigo, lavender, dan check menyatakan pilihan; tidak mengandalkan warna saja. Aksi dinonaktifkan selama penyimpanan; spinner dan pesan error tersedia. Pesan pendamping menjelaskan bahwa pilihan berlaku pada perangkat ini, tanpa menyatakan penyimpanan baru berhasil. |
| [`Icon`](../src/components/Icon.tsx) | SVG viewBox 24 × 24, stroke 1.75, round cap/join; default 24 dp. Ikon welcome memakai 40 dp. Ikon dekoratif tidak dibaca screen reader. Ikon konten tetap memakai SVG React Native; layar fondasi memakai database dan check, sedangkan daftar materi memakai book/check. Tab memakai native Android vector drawable, bukan SVG langsung atau emoji. Sumber mengikuti [set SVG prototype](assets/icons/README.md). |
| [`Field`](../src/components/AccountUI.tsx) | Label ink di atas `TextInput` putih ber-outline, body 16/24, seleksi indigo, placeholder muted; tinggi minimum 52 dp. Border berubah indigo saat fokus dan kembali outline saat blur. Email memakai keyboard email dan tanpa kapitalisasi, password masked dengan autocomplete; kode kelas tanpa autocorrect dan kapitalisasi karakter. DOB masih input teks `YYYY-MM-DD`, bukan date picker. |
| `TextAction` / `ErrorText` | Aksi teks indigo terpusat, target minimum 48 dp, role button/state disabled; teks disabled muted. Error body merah dengan live region polite, dipetakan ke pesan `en`/`id`, bukan SQL/error internal. |
| Kartu akun/kelas | `ui.card`: lavender, radius 16 dp, padding 24 dan gap 12 dp; dipakai untuk kelas, konfirmasi join dan kode privat Guru. `ui.warm` tersedia tetapi belum dipakai oleh layar akun/kelas. |
| Opsi template Guru | Seluruh baris dapat ditekan, label fleksibel/wrap, role radio/state checked. Pilihan pertama otomatis menjadi default ketika data tersedia. Indigo/lavender disertai lingkaran dan titik terpilih; indikator dekoratif disembunyikan dari aksesibilitas. Ini memperbaiki temuan finish review yang semula hanya membedakan pilihan lewat warna. |
| Native stack | Header ivory, judul ink, tint navigasi indigo, tanpa shadow. Welcome dan profil memiliki tindakan bahasa; profil akun tersedia pada tab Profile. Back native tetap untuk layar sekunder; header Back disembunyikan pada beranda, callback dan kata sandi baru. Onboarding lengkap berada di `/complete-profile`, sebelum masuk shell tab. |
| Native tabs | Siswa: Home · Learn · Attendance · Forum · Profile; Guru: Home · Classes · Attendance · Forum · Profile. Label dilokalkan melalui dictionary English/Indonesia. Background ivory, ikon nonaktif muted, ikon/label terpilih indigo dengan indikator lavender. [`plugins/with-tab-icons.js`](../plugins/with-tab-icons.js) mengekstrak path dari `docs/assets/icons/{home,book,users,qr,forum,user}.svg` ke drawable `quethink_*`: viewport/ukuran 24, stroke 1.75, round cap/join. Ini mempertahankan geometri SVG prototype pada tab Android native. |
| Preferensi bahasa | English default; pilihan `en`/`id` disimpan di AsyncStorage dengan key `quethink.locale.v1`. UI menunggu pembacaan preferensi; perubahan locale dilakukan setelah penyimpanan berhasil. Dictionary mengetik kedua bahasa dengan key yang sama. |
| [`SqlDataset`, `QueryTable`, `SqlEditor`](../src/features/learning/Sql.tsx) | Skema teks dan dataset tetap `students(id, name, cohort)` ditumpuk vertikal dengan editor/hasil. Data contoh Alya/Bima/Citra bersifat sintetis; bukan dataset bebas atau diagram skema 2D. Input berlabel native, monospace, tanpa autocorrect/kapitalisasi, seleksi indigo dan batas multiline di atas. |
| Pola absensi native | Daftar sesi memakai pemisah outline, tinggi minimum 72 dp dan label status/sumber QR atau manual. QR dirender SVG dengan quiet zone 16 dp, ukuran mengikuti lebar ponsel (160–248 dp); bukan aset raster atau bahasa ikon baru. Preview kamera selebar konten, tinggi 320 dp, radius 16 dp dan clipping; hasil scan memakai mint yang sudah tersedia. Koreksi memakai Radio, Field dan Button bersama; status tidak disampaikan melalui warna saja. |
| Dialog konfirmasi native | `Alert` Android untuk submit tes, hapus soal, tinggalkan bank dengan perubahan belum disimpan, arsip kelas dan penutupan sesi absensi. Tindakan batal tetap tersedia; hapus/discard memakai intent destructive. Tidak ada modal dekoratif baru. |
| Route tidak ditemukan | Judul, penjelasan, dan tombol yang mengganti route dengan welcome. |

### Alur dan state akun/kelas

| Permukaan | Perilaku yang sudah tersedia |
|---|---|
| Login/daftar/reset | Form vertikal dengan penjelasan, field, error dan tombol busy. Daftar hanya Siswa; copy menjelaskan Guru dibuat administrator. Permintaan reset memberi pesan bersyarat jika akun tersedia dan meminta tautan dibuka pada perangkat peminta. Signup tanpa session menampilkan instruksi konfirmasi email. Callback memvalidasi tautan dan menukar kode PKCE; tautan invalid/kedaluwarsa memberi jalan meminta ulang atau kembali masuk. Kata sandi baru menyediakan save/cancel dan setelah berhasil meminta login ulang. |
| Guard/sesi | Spinner selama sesi/profil dibaca; tanpa sesi menuju login; recovery menuju reset; profil belum lengkap menuju `/complete-profile`. Gagal memuat profil menyediakan retry/logout. Akun Admin diberi penjelasan panel web dan logout. Role dari server menentukan beranda. Sesi dipersistensikan melalui SecureStore; logout lokal membersihkan state privat. |
| Profil | Nama wajib; NIM hanya untuk Siswa dan wajib sebelum join. DOB/foto opsional. Gallery dan crop native memilih foto; preview, ganti/hapus dan upload berjalan ketika profil disimpan. Foto disimpan di bucket privat, ditampilkan lewat signed URL; profil menyimpan path. Tombol save busy dan kontrol edit terkait dinonaktifkan selama penyimpanan. |
| Join Siswa | Input kode → resolve nama kelas/Guru dalam kartu → konfirmasi join; tersedia gunakan kode lain. Tombol awal disabled untuk kode kosong, spinner selama request, error salah kode/arsip/sudah bergabung/rate limit. Server membatasi satu membership Siswa; belum ada pindah kelas. |
| Beranda Siswa | Loading, error/retry, kosong dengan aksi join, kartu kelas nyata dan ajakan pretest apricot berisi durasi/jumlah soal serta aturan satu kali. Setelah pretest selesai: jumlah materi selesai/total, nilai pretest, Continue learning dan View result. Tombol utama menjadi Review materials / Tinjau materi ketika seluruh materi selesai dan jumlah materi lebih dari nol. Bagian posttest membedakan terkunci/siap/aktif/grading/selesai; ketika selesai menampilkan nilai posttest, selisih poin bertanda sesuai perhitungan dan grid hasil pretest/posttest terpisah yang hanya muncul setelah posttest completed, tanpa menyimpulkan kenaikan bila selisih negatif. Tidak ada nilai/progres contoh. Kelas arsip menampilkan penjelasan baca saja. |
| Tab Classes/buat kelas Guru | Aksi buat kelas, loading/error/retry, daftar kosong dengan petunjuk, kartu kelas berisi jumlah Siswa/status dan detail, serta Load more jika cursor tersedia. Form buat kelas memuat template published dan retry bila gagal; tombol disabled tanpa nama/template atau saat error, busy ketika submit. Daftar template kosong belum memiliki pesan kosong khusus; tombol tetap disabled. |
| Detail/roster/arsip | Loading/error/retry; kelas aktif menampilkan kode selectable dan share sheet Android. Roster berisi nama/NIM, pemisah dan Load more; roster kosong mempunyai pesan. Arsip meminta konfirmasi melalui Alert native. Setelah arsip, status/riwayat dan roster tetap terbaca; kode, share dan tombol arsip hilang. Tidak ada nilai, materi, DOB atau email Siswa pada roster. |

`useResource` memuat ulang data saat route kembali fokus; request lama tidak mengganti state setelah kehilangan fokus. Public RPC mobile memakai SECURITY INVOKER dan JWT client; otorisasi server membatasi profil sendiri dan kelas Guru pemilik. Tidak ada service key atau secret AI dalam aplikasi. Rincian keamanan/DTO tetap mengikuti [kontrak integrasi](API-CONTRACT-DRAFT.md).

### Alur dan state pembelajaran

| Permukaan | Perilaku yang sudah tersedia |
|---|---|
| Pretest `/attempt/[id]` | Satu attempt per Siswa/kelas/jenis; paket default berisi empat pilihan ganda dan dua SQL SQLite, dapat disunting Guru sebelum terkunci. Urutan soal/pilihan dan ID pilihan diacak pada snapshot attempt. Default durasi 20 menit; Guru dapat mengubah 1–180 menit sebelum attempt pertama untuk jenis tes tersebut. Capture memakai durasi kelas 30 menit, bukan default global baru. Timer bersumber waktu/deadline server dan tetap berjalan di luar aplikasi. Shell Siswa mengembalikan attempt aktif atau grading ke route tes. |
| Jawaban dan submit | Radio mempunyai lingkaran/titik dan state checked; input SQL monospace, tanpa autocorrect/kapitalisasi. Autosave debounce 500 ms, request berurutan dan revision server. UI membedakan belum tersimpan/menyimpan/tersimpan/gagal, menyediakan retry dan reload saat error. Submit memakai konfirmasi Alert native dan mencoba menyimpan draft dahulu. Deadline hanya menilai jawaban yang diterima server; menutup aplikasi tidak memperpanjang waktu. |
| Grading dan hasil `/result/[id]` | Jawaban dibekukan setelah submit. Spinner, penjelasan grading, Check result dan pemulihan error tersedia; status dipoll dan penilaian resmi berlangsung di server. SQL dinilai pada SQLite sandbox dengan data sintetis, bukan database produksi. Hasil berisi skor /100, jawaban sendiri, jawaban benar dan pembahasan per soal; tanpa lulus/gagal atau retake. Retry grading tidak membuat attempt baru. |
| Daftar materi `/learn`, `/course-materials/[id]` | Ikon check/book dengan label completed/available/locked, penanda kebutuhan praktik dan alasan terkunci. Siswa harus menyelesaikan pretest; nilai tidak menjadi ambang. Penyelesaian materi sebelumnya membuka yang berikutnya. Judul/metadata terkunci dapat terlihat, kontennya tetap ditolak server. |
| Reader `/material/[id]` | Judul, catatan bahasa konten, Markdown native terbatas (paragraf, heading, bold, inline/fenced code, tabel dan tautan HTTPS), lampiran PDF/video eksternal, error dan kembali. Konten Guru tidak otomatis diterjemahkan mengikuti bahasa UI. Tanda selesai baca hanya untuk materi tanpa Lab pada kelas aktif; setelah berhasil tampil Completed. Materi ber-Lab membuka route praktik terpisah; selesai baca tidak menggantikan Check Lab yang benar. |
| Guru `/course/[id]` | Akses materi tetap tombol utama, serta dua bagian Pretest/Posttest dengan jumlah soal, durasi dan MenuGrid aksi kelola paket/hasil per jenis; durasi kini disunting bersama paket soal, dengan validasi integer serta error server ketika terkunci. Beranda Guru berisi nama, akses Classes dan daftar kelas dengan aksi Manage class learning. |
| Form materi `/material-editor/[id]`, `/new-material/[id]` | Judul, body multiline, switch Requires a Lab, pilihan template SELECT/UPDATE bila memakai Lab, URL PDF/video HTTPS dan save busy. Body minimum 240/maksimum 360 dp; ini form teks, bukan editor kaya atau preview. Lampiran menolak protokol selain HTTPS dan kredensial URL. Materi kelas tersalin dapat diubah/ditambah, tetapi materi yang sudah diselesaikan Siswa atau Lab-nya mulai dipakai dikunci server untuk histori; perubahan materi juga ditolak sesudah ada posttest. Arsip menolak edit/completion baru. |
| Hasil Guru `/course-results/[id]` | Daftar terfilter per jenis PRETEST/POSTTEST, judul sesuai jenis; nama/NIM, pending atau skor /100, aksi menuju pembahasan untuk attempt completed, kosong/error/retry dan Load more berbasis cursor. Guru pemilik membaca hasil Siswa, bukan mengubah skor lokal. |
| Lab `/lab/[id]` | Instruksi SELECT nama angkatan 2025 urut alfabet atau UPDATE angkatan 2024 menjadi 2026 tanpa perubahan lain, dataset, query, Run, Check, Reset dan output. Run hanya pratinjau; Check benar yang diverifikasi server menyimpan completion. Query salah memberi coba lagi; query ditolak, sibuk dan kegagalan request mempunyai pesan terpisah. Setiap Run/Check berawal dari dataset sintetis awal. Reset membersihkan editor/hasil tanpa mencabut completion. Arsip menonaktifkan mutasi; Lab tidak tersedia saat tes aktif. |
| Posttest `/attempt/[id]` | Terbuka setelah seluruh materi dan Lab wajib selesai, satu attempt per Siswa/kelas/jenis. Memakai timer, autosave, resume, konfirmasi submit native dan grading yang sama, dengan copy posttest. Paket berbeda dari pretest; durasi default 20 menit dan kunci durasi/paket terpisah per jenis. Hasil `/result/[id]` mengenali kind server dan menampilkan skor/pembahasan posttest tanpa lulus/gagal atau retake. |
| Bank soal `/question-bank/[id]` | Guru pemilik menyunting paket per jenis: durasi, prompt, pilihan/kunci radio, query acuan SELECT dan pembahasan; Previous/Next mengembalikan scroll ke atas. Mendukung tambah pilihan ganda/SQL, hapus dengan konfirmasi, save busy, validasi/revision conflict dan pesan berhasil melalui live region. Paket 2–30 soal, minimal satu pilihan ganda dan 1–2 SQL, memakai dataset students tetap. Query acuan divalidasi server; prompt persis sama antarjenis ditolak, kesetaraan kesulitan tetap penilaian Guru. |
| Kunci dan perubahan bank | Paket terkunci per jenis setelah Siswa pertama mulai; posttest tetap dapat disunting setelah pretest dimulai. Field menjadi read-only dan aksi tambah/hapus/save tidak tersedia pada paket terkunci/arsip. Snapshot attempt lama tetap. Perubahan belum tersimpan menahan native/system Back melalui `usePreventRemove` dan dialog Stay/Discard; save berhasil membersihkan dirty state. |
| Forum | Halaman placeholder dengan penjelasan cakupan yang jujur; belum memproses diskusi. |

### Alur dan state absensi

| Permukaan | Perilaku yang sudah tersedia |
|---|---|
| Tab Attendance `/attend`, `/attendance-class/[id]` | Guru memilih kelas dan membaca daftar sesi; Siswa melihat sesi/riwayat kelasnya serta aksi scan. Loading, kosong, error/retry dan pemuatan lanjutan tersedia. Form Guru meminta judul dan durasi integer 1–180 menit (default 15), dengan validasi dan save busy; satu sesi terbuka per kelas. |
| Sesi `/attendance-session/[id]` | Judul, kelas, status dan akhir sesi; Guru melihat ringkasan status, QR, refresh, penutupan dengan konfirmasi native dan akses roster. QR diperbarui sekitar 20 detik, token maksimal 45 detik atau akhir sesi. QR disembunyikan saat latar, kedaluwarsa atau gagal dimuat; hitung mundur memakai waktu server. Siswa melihat status sendiri atau Belum tercatat, sumber QR/manual dan aksi scan pada sesi aktif. |
| Pemindai `/attendance-scan` | Izin kamera diminta saat dibutuhkan; penolakan menyediakan coba kembali atau pengaturan Android. Kamera dilepas saat layar tidak aktif/latar. State mulai kamera, busy, QR invalid, kegagalan kamera dan retry tersedia; watchdog kesiapan 20 detik memberi pemulihan, termasuk pencatatan manual Guru. Cancel kembali melalui stack atau ke Attendance jika dibuka dari deep link. Konfirmasi menampilkan hasil server dan membedakan sudah tercatat; scan ulang tidak menimpa koreksi manual. |
| Roster/koreksi `/attendance-roster/[id]`, `/attendance-record/[id]` | Nama/NIM, status dan sumber catatan tanpa email/DOB. Guru memilih Hadir/Alpa/Izin/Sakit dan wajib alasan 3–500 karakter; kontrol busy/disabled, pesan berhasil serta konflik revisi yang meminta refresh tersedia. Audit menampilkan perubahan sebelum/sesudah, alasan dan waktu server dengan pemuatan lanjutan. Belum tercatat tidak otomatis menjadi Alpa. |
| Arsip dan otorisasi | Kelas arsip menutup sesi terbuka otomatis dan menolak sesi/token/scan/koreksi baru; riwayat, roster dan audit tetap terbaca. Server membatasi Guru pemilik dan Siswa anggota, serta menolak scan saat tes belum selesai. Riwayat Siswa hanya miliknya. English default dan Bahasa Indonesia tersedia. |

Kontrak, pemeriksaan server, persistensi audit dan batas QR tanpa pembuktian posisi fisik mengikuti [implementasi absensi](ATTENDANCE-IMPLEMENTATION.md). Tidak ada pengambilan lokasi, background scan, foto bukti, ekspor atau Alpa otomatis.

### Bukti perapian visual mobile

Paket [verifikasi perapian](UI-VISUAL-REFRESH-VERIFICATION.md) mencatat capture aplikasi Android pada emulator API 37, 360 dp/font 1.0 dan 320 dp/font 1.3, termasuk pemeriksaan fokus dan keyboard pada profil. Night mode OS diperiksa ketika aplikasi tetap dipaksa terang; ini bukan dark theme. Akun, kelas, skor dan progres dalam capture adalah fixture Demo/Synthetic; nilai dan completion yang di-seed dipakai untuk mencakup state, bukan bukti hasil siswa nyata. Perubahan review memberikan judul ruang penuh pada panel kelas sempit dan memberi label selesai warna success. Pemeriksaan ini tidak membuktikan perangkat fisik, TalkBack, tablet atau build release. Rincian capture dan pemeriksaan teknis mengikuti laporan tersebut; dokumentasi ini mencocokkan source, bukan menjalankan ulang walkthrough.

### Bukti native dan batas review

Capture historis learning/cycle memakai data sintetis pada emulator Android API 37, lebar 360 dp (720 px); dimensi bukti grid terbaru dicatat terpisah di bawah. Preview Beranda prototype dibandingkan dengan source/token dan capture aktual untuk kesinambungan identitas, bukan parity seluruh produk. Paket bukti berada di [direktori review](../.impeccable/review/). Capture learning berikut merupakan bukti historis increment sebelumnya; state yang kemudian berubah mengikuti paket cycle di bawah:

| Bukti `learning-*.png` | Keadaan yang dicatat |
|---|---|
| `student-pretest-home` | Kartu kelas, pretest apricot, aturan satu kali, durasi kelas dan lima tab Siswa berlabel |
| `pretest-restored` | Attempt dipulihkan dengan SQL tersimpan dan timer yang telah berkurang |
| `pretest-submit-confirm`, `pretest-grading`, `pretest-result` | Konfirmasi submit native, menunggu server dan nilai/pembahasan SQL |
| `student-home-completed` | Skor nyata, jumlah materi selesai dan tindakan lanjut belajar/hasil |
| `materials-unlocked` | Materi pertama completed, berikutnya available, materi selanjutnya locked |
| `reader-top`, `reader-scroll`, `reader-completed` | Konten native panjang, tabel dan tautan, state selesai baca |
| `material-editor` | Form tambah materi Guru, body multiline, switch dan URL lampiran; judul capture Add material memakai form yang sama dengan editor |
| `teacher-home-final`, `teacher-results`, `teacher-result-feedback` | Lima tab Guru, hasil kelas dan pembahasan Siswa |
| `language-id-current`, `teacher-home-id-font130`, `teacher-results-id-font130` | Bahasa Indonesia terpilih; Beranda dan daftar hasil Guru pada font scale 1.3, tanpa clipping yang terlihat; bukan audit font seluruh learning |

Finish review **historis increment learning** memberi disposition **ship** pada cakupan learning yang ditangkap di emulator 360 dp, tanpa temuan material. Ini tidak membuktikan seluruh produk atau seluruh skenario aksesibilitas. Capture Beranda/daftar hasil Guru dalam Bahasa Indonesia pada font scale 1.3 menunjukkan label terbaca tanpa clipping yang terlihat; pada review historis tersebut, cakupan learning lainnya pada font diperbesar belum diverifikasi. Tambahan bukti bank soal pada increment cycle dicatat terpisah di bawah. Jangan menyamakan dukungan scaling pada source dengan kelulusan visual seluruh alur.

Paket **cycle** berikut adalah bukti historis increment siklus yang dipasok dari walkthrough dan dibuka satu per satu oleh pelaksana serta reviewer, bukan hasil menjalankan ulang UI oleh documenter. Seluruh nama berawalan `cycle-` dan berakhiran `.png` di direktori review yang sama.

| Capture cycle | Keadaan yang dicatat |
|---|---|
| `lab-select-top`, `lab-preview`, `lab-select-completed` | Instruksi/dataset/editor native, Run berlabel pratinjau dan Check SELECT selesai |
| `lab-update-not-passed`, `lab-update-completed` | UPDATE belum memenuhi tugas dan completion sah setelah Check |
| `bank-editor-final`, `bank-unsaved-confirm`, `bank-saved-final`, `bank-remove-confirm` | Editor Guru, dialog Back dengan perubahan belum disimpan, save berhasil dan konfirmasi hapus |
| `posttest-ready`, `posttest-active`, `posttest-confirm`, `posttest-grading`, `posttest-result` | Prasyarat terbuka, attempt bertimer, konfirmasi native, menunggu grading dan nilai/pembahasan |
| `home-completed`, `teacher-posttest-results` | Kedua nilai/selisih poin di Beranda serta daftar posttest Guru terpisah |
| `bank-id-font130`, `bank-question-id-font130`, `teacher-results-id-font130` | UI Guru Bahasa Indonesia pada font scale 1.3; prompt/pilihan konten tetap English |

Paket ini berjumlah **19 capture**, Android API 37 pada 360 dp; English font scale 1.0 kecuali tiga capture Indonesia/font 1.3 di atas. Capture bank font 1.3 berasal dari cold-start deep link tanpa stack sebelumnya sehingga app-bar Back tidak muncul; navigasi biasa dari course English mempunyai Back. Perbedaan konteks itu tidak dinilai sebagai regresi Back.

Full finish review atas 19 capture tidak menemukan masalah visual/layout material, tetapi menemukan satu pesan ketidakpastian jaringan yang terlalu memastikan tidak ada progres tersimpan. Hanya dua terjemahan `runFailed` diperbaiki: English “No result was confirmed. Try the same action again to confirm the result.” dan Indonesia “Hasil belum terkonfirmasi. Coba tindakan yang sama lagi untuk memastikan hasilnya.” Pemeriksaan ulang sempit memberi status **resolved / SHIP untuk temuan tunggal tersebut**. Disposition itu tidak memperluas bukti menjadi kesiapan seluruh produk atau verifikasi visual ulang semua layar setelah perubahan copy.

Pretest dan tanda selesai bacaan fixture disiapkan melalui API sah; kedua Lab dan posttest pada walkthrough benar-benar dikerjakan melalui UI. TypeScript/lint, 17 pengujian backend/lokal, hasil hosted posttest 100 dan Cron posttest kedaluwarsa 0 adalah bukti teknis **yang dipasok pelaksana**, bukan pengujian yang dijalankan ulang oleh documenter. Kontrak dan rincian verifikasi ada di [implementasi siklus](CYCLE-IMPLEMENTATION.md). Bukti native ini belum mencakup Lab SQL font scale 1.3, perangkat fisik, tablet, TalkBack, dark mode atau build release. Tema runtime tetap light; hasil emulator bukan kelulusan aksesibilitas atau kesiapan seluruh PRD.

Paket **grid** mencatat refinement terbaru pada komponen MenuGrid aktual di emulator Android API 37. Pelaksana dan reviewer membuka keempat capture berikut; documenter memakai bukti dan disposition yang dipasok tersebut, serta memeriksa source komponen, caller produksi dan localization. Capture memakai route QA komponen sementara yang secara eksplisit sintetis, bukan Beranda/course terautentikasi atau bukti alur end-to-end. Route QA tidak menjadi fitur produk dan harus dihapus sebelum penyelesaian refinement.

| Capture grid | Keadaan yang dicatat |
|---|---|
| [`grid-phone-en.png`](../.impeccable/review/grid-phone-en.png) | MenuGrid English pada ponsel, susunan dua kolom untuk tujuan setara |
| [`grid-phone-id-font130.png`](../.impeccable/review/grid-phone-id-font130.png) | Bahasa Indonesia pada font scale 1.3, susunan satu kolom |
| [`grid-phone-narrow320.png`](../.impeccable/review/grid-phone-narrow320.png) | Ponsel 320 dp, konten di bawah ambang 300 dp, susunan satu kolom |
| [`grid-phone-narrow320-bottom.png`](../.impeccable/review/grid-phone-narrow320-bottom.png) | Bagian bawah capture sempit untuk label dan tujuan hasil berikutnya |

Fresh finish review memberi disposition **SHIP tanpa temuan pada bukti komponen/source yang sempit ini**, dengan syarat route preview sementara dihapus dan pemeriksaan akhir selesai. Binding produksi diperiksa pada source/type, bukan melalui screenshot Home/course terautentikasi. Bukti grid tidak memperluas cakupan menjadi seluruh alur, TalkBack, perangkat fisik, tablet, dark mode atau build release; status pemeriksaan akhir mengikuti laporan pelaksana.

Bukti M0/M1 berikut bersifat **historis**: `m1-login.png`, `m1-register.png`, `m1-onboarding.png`, `m1-invalid-code.png`, `m1-student-home.png`, `m1-create-class.png`, `m1-class-detail.png`, `m1-roster.png`, `m1-class-archived.png`, `m1-invalid-callback-cold.png`, `m1-teacher-home-id-font130.png`, `m1-profile-id-font130.png` dan `m1-photo-persisted.png`. Pesan pretest belum tersedia pada capture lama merekam keadaan sebelum increment learning, bukan state saat ini. Temuan historis radio template yang hanya memakai warna telah diselesaikan dengan lingkaran/titik dan capture baru.

Walkthrough historis akun/kelas mencakup login/onboarding/join, pemulihan sesi setelah force-stop, gallery/crop/upload/buka ulang foto, serta Guru membuat kelas/membaca roster/mengarsipkan. Verifikasi backend dan batas teknis mengikuti [implementasi learning](LEARNING-IMPLEMENTATION.md). Perangkat fisik, TalkBack, tablet, build release, reset inbox sampai kata sandi baru, viewer PDF eksternal dan pengiriman share ke tujuan eksternal belum dibuktikan. Build debug membutuhkan Metro; ini bukan bukti release/pilot siap.

## Do's and Don'ts

- **Do** lanjutkan identitas Indigo–apricot dan ikon outline yang sudah ditetapkan prototype.
- **Do** ambil warna, spacing, radius, dan peran teks dari token bersama saat menambah fitur.
- **Do** gunakan MenuGrid hanya untuk tujuan penilaian yang setara; pertahankan satu kolom pada konten di bawah 300 dp atau font scale minimal 1.25, serta list untuk materi/kelas/roster/soal.
- **Do** pertahankan dua Lab bawaan dengan satu tugas inti per Lab dan penyesuaian Guru sesuai konteks; jangan menambah latihan pada setiap bacaan.
- **Do** pertahankan label/state aksesibel, target sentuh minimum 48 dp, font scale sistem, native Back, dan inset sistem.
- **Do** bedakan penjelasan alur dari kemampuan bisnis yang sudah berjalan.
- **Don't** menganggap storyboard, token cadangan, atau path ikon yang tersedia sebagai fitur aplikasi selesai.
- **Do** pertahankan lima tab native berlabel sesuai role dan ikon drawable yang bersumber dari SVG prototype; bedakan Forum yang masih placeholder dari Attendance yang sudah memproses absensi QR.
- **Do** nyatakan selected state dengan bentuk/indikator dan state aksesibel, seperti titik radio template, selain warna.
- **Don't** mengganti nilai/progres server dengan angka contoh, menyebut SQL pretest sebagai Lab selesai, atau menyamakan Run pratinjau dengan Check yang menyimpan completion.
- **Do** pertahankan monospace untuk SQL/code, scroll horizontal tabel/code reader, dan pesan eksplisit untuk autosave, deadline, grading, materi/paket terkunci, Run pratinjau dan completion Check terverifikasi. Jangan memastikan progres gagal tersimpan ketika respons jaringan belum terkonfirmasi.

### Perbedaan terhadap acuan dan batas bukti

1. `onSurface` di kode berbeda dari tabel awal prototype (`#202033`), tetapi mengikuti ink dari penyempurnaan palet prototype berikutnya. Tabel awal dan implementasi tidak sepenuhnya sinkron; ini bukan penggantian identitas.
2. `success` di kode berbeda dari tabel awal prototype (`#287A58`) dan mengikuti perlakuan mint–teal pada perluasan palet. Perapian kini memakainya untuk ikon, label/check materi selesai dan teks receipt; state tetap dinyatakan melalui teks atau bentuk selain warna.
3. Judul welcome memakai headline lebih besar daripada judul layar 24 sp yang dicatat prototype. Welcome merupakan permukaan pengantar baru; beranda aktual learning tetap komposisi native yang lebih sederhana dari preview.
4. Pengaturan bahasa tetap dapat dibuka dari header welcome dan kini juga header profil; prototype menempatkannya pada profil. Akses welcome dari M0 tetap tersedia.
5. Preview Beranda dan implementasi native memiliki komposisi yang berbeda: perapian terbaru memakai panel tonal, tujuan paralel, serta kelas, progres dan tindakan berdasarkan data aktual. Canvas FigCraft belum diperbarui mengikuti implementasi; tidak ada klaim pixel parity atau penggantian identitas. Nilai posttest dan selisih poin tersedia sesuai state server.
6. Native header dan judul konten mengulang nama layar pada beberapa form, terlihat pada capture buat kelas/profil. Preview foto memakai radius literal 16 dp; input DOB masih teks. Hal ini dicatat sebagai implementasi saat ini tanpa perbaikan source di dalam tugas dokumentasi.

7. Reader membuka PDF/video melalui tautan HTTPS eksternal; belum ada viewer tertanam, unduhan/offline atau estimasi baca. Tabel Markdown body sistem, jawaban SQL hasil tes yang wrap, dataset skema teks tanpa diagram 2D, dan native tab bar juga tidak identik dengan perlakuan tabel monospace/ukuran tab preview. Guru sudah memiliki authoring soal, tetapi belum memiliki pengurutan materi atau preview kaya. Lab masih dua template tetap, tanpa tugas/dataset/tabel kustom; playground, offline, forum dan AI belum selesai. Absensi QR sudah tersedia tanpa lokasi/radius sesuai PRD terbaru; pemindaian optik perangkat fisik masih perlu dibuktikan sebelum pilot. Ini batas implementasi, bukan perbaikan desain yang dilakukan oleh dokumentasi.

Perbedaan di atas dicatat dari inspeksi kode, capture dan acuan tanpa mengubah implementasi. Hasil M0 tetap mengikuti [verifikasi fondasi](FOUNDATION-VERIFICATION.md). Bukti increment akun/kelas dan batas pengujiannya mengikuti [verifikasi implementasi](M1-IMPLEMENTATION-VERIFICATION.md), bukan klaim kelulusan dari inspeksi source saja.

Verifikasi akhir refinement grid: route QA sementara telah dihapus dari source dan ekspor; TypeScript/lint tanpa error, 17 tes dan ekspor Android berhasil. Syarat cleanup/check pada disposition ship telah dipenuhi. Bukti tetap terbatas pada komponen native dan inspeksi binding source, bukan walkthrough ulang akun nyata.


Paket **attendance** mencatat increment absensi pada emulator Android: 720 × 1600 px (360 dp) dan 640 × 1422 px (320 dp) dengan font scale 1.3 untuk dua capture sempit. Pelaksana dan reviewer telah membuka bukti PNG/XML berikut; documenter mencocokkan kontrak dan komponen source, bukan menjalankan ulang walkthrough. Semua nama berikut berawalan `attendance-` di direktori review yang sama.

| Capture attendance | Keadaan yang dicatat |
|---|---|
| `teacher-class-360`, `teacher-qr-360`, `teacher-session-actions-360` | Form sesi Guru, QR bertimer, ringkasan dan akses roster/penutupan |
| `teacher-roster-360`, `teacher-correction-360`, `teacher-audit-360` | Daftar Siswa, pilihan status/alasan dan hasil save/audit manual |
| `student-history-360`, `student-permission-360`, `student-denied-360` | Riwayat Siswa, permintaan izin serta pemulihan penolakan kamera |
| `student-camera-320-large`, `student-history-320-large` | Preview kamera dengan scene emulator berwarna serta riwayat pada 320 dp/font scale 1.3; bukti layout/preview, bukan keberhasilan scan optik |

Fresh finish review atas bukti ponsel ini tidak menemukan perbaikan UI material; temuan dokumentasi Attendance yang masih disebut placeholder diselesaikan pada increment ini. QR capture berhasil didekode independen dengan JSQR ke sesi sintetis nyata; hosted JWT concurrency serta save/audit manual melalui UI dilaporkan lulus. Ini tidak membuktikan scan optik kamera perangkat fisik. Tidak ada detector web yang dijalankan karena permukaannya native. Palet ivory/indigo/lavender/apricot, type ramp sistem, permukaan tonal, komponen bersama dan tab dari SVG prototype tetap merupakan sistem incumbent; dokumen tidak menyahkan world atau token baru.

Verifikasi teknis akhir yang dipasok pelaksana: typecheck/lint tanpa error, 19/19 tes dijalankan serial dan ekspor Android 4.3 MB berhasil. Satu warning ESLint `t` tidak terpakai yang sudah ada di `lab/[id].tsx` tetap terpisah. APK debug x86_64 sekitar 89 MiB berhasil dibuat; percobaan multi-ABI dibatalkan karena tekanan memori. Manifest memiliki izin kamera tanpa audio/lokasi. Dua migrasi absensi sudah diterapkan hosted sesuai kontrak absensi. APK development membutuhkan Metro dan bukan bukti build release. Bukti ini belum mencakup tablet, TalkBack atau scan optik perangkat Android fisik; uji optik pada perangkat fisik tetap wajib sebelum pilot. Hasil increment absensi tidak menyatakan seluruh produk selesai.

### Verifikasi kamera emulator tambahan

Pada 3 November 2026, pengujian tambahan berhasil membaca QR asli melalui kamera virtual AVD Ruma (mode `imagefile`), decoder native dan handler aplikasi hingga record Supabase tersimpan. Capture `attendance-optical-{success,duplicate,expired,closed}.png` beserta XML membuktikan konfirmasi, pemindaian ulang tanpa duplikasi, QR kedaluwarsa dan sesi ditutup. Ini menambah bukti perilaku tanpa perubahan UI/token/dunia visual dan tanpa memperluas verdict review sebelumnya. [Kontrak absensi](ATTENDANCE-IMPLEMENTATION.md#uji-kamera-emulator--3-november-2026) mencatat metode, kalibrasi fixture dan batasnya. Bukti ini tetap tidak menggantikan uji kamera perangkat fisik.

### Login pertama dan status Tutor AI — 5 November 2026

Route `/` kini langsung mengarahkan ke `/login`: pengguna tanpa sesi melihat form email dan kata sandi sejak awal. Sesi aktif dialihkan ke beranda, sedangkan sesi recovery ke reset password. Header tetap menyediakan bahasa; tindakan masuk, pendaftaran, dan lupa kata sandi tetap tersedia. Panel sambutan indigo dan ilustrasi belajar 2D meneruskan identitas serta komponen incumbent, dengan hierarki form langsung yang mengambil inspirasi dari [acuan pendidikan](https://gornicki.me/projects/art-direction-and-ux-for-education-app/) dan [layar onboarding](https://www.appetiteui.com/docs/screens-onboarding/). Ilustrasi login hanya tampil pada lebar minimal 350 dp dan font scale di bawah 1.25 agar ruang teks tetap cukup. Catatan welcome sebelumnya tetap menggambarkan permukaan lama; alur masuk awal saat ini menggunakan login langsung.

Bukti yang diperiksa adalah capture emulator Android berbahasa Inggris: `login-first-360.png` pada 360 dp dan `login-first-320-large.png` pada 320 dp dengan font besar, di `.impeccable/review/`. Keduanya menunjukkan form dan tindakan akun; capture sempit menunjukkan panel tanpa ilustrasi. Ini bukti keadaan visual yang ditangkap, bukan pengujian perangkat fisik atau seluruh alur autentikasi.

Capture `ai-tutor-360.png` menunjukkan pesan bahwa Tutor AI sedang disiapkan, dengan input dan tombol nonaktif saat fitur tidak diaktifkan. Review menilai perbaikan keadaan tidak tersedia tersebut telah terselesaikan; Tutor AI tetap sengaja belum tersedia sambil menunggu backend, dan hasil review ini tidak menyatakan produk lengkap.
