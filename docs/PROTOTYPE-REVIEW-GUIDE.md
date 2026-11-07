# Prototype review guide

Versi 2 · 2 November 2026

Buka [file FigCraft](Quethink-Mobile-Prototype.figcraft). File ini memiliki empat page:

1. **00 · Review guide & flows** — panduan dan peta perjalanan.
2. **01 · Interactive prototype** — 75 layar/keadaan dengan tema Indigo–apricot.
3. **02 · Wireframes** — 75 pasangan struktur layar dengan palet netral.
4. **03 · Colors & SVG icons** — palet section dan katalog 24 ikon SVG orisinal.

Pilih flow di panel Prototype lalu Present. Mulai dari **00 · Start here** untuk memilih demo Siswa atau Guru. Flow terpisah tersedia untuk onboarding, belajar, pretest, posttest, absensi, forum, playground, Guru, arsip, dan pembatasan saat tes. Masing-masing juga tersedia pada page Wireframes.

## Cakupan dan batas simulasi

Aksi utama memiliki navigasi ke layar berikutnya, hasil, konfirmasi, atau pemulihan. Terdapat 658 aksi navigasi pada kedua page. Pemeriksaan struktur menemukan semua tujuan navigasi tersedia dan tidak ada anak frame melewati batas tinggi layar.

Ini storyboard klik. Nilai, nama, jam, QR, peta, jawaban, dan dataset adalah contoh. Form belum menerima pengetikan bebas, opsi/radio dan toggle belum memiliki perubahan state aplikasi, kamera/GPS tidak diakses, timer tidak berjalan, SQL dan AI tidak dieksekusi. Penguncian belajar/tes ditampilkan melalui layar keadaan, bukan mesin aturan aplikasi. Alur utama serta state dapat ditinjau sebelum implementasi React Native.

Guru dan Siswa berbagi preview forum. Tampilan history berbagi contoh konten; desain izin edit kelas arsip tetap harus diterapkan pada aplikasi. Angka awal tes, radius, dan waktu absensi adalah contoh rancangan, bukan keputusan produk final.

## Pratinjau

- [Prototype visual](Quethink-Mobile-Prototype-Overview.png)
- [Wireframes](Quethink-Mobile-Wireframes-Overview.png)
- [Dokumen UI/UX](UIUX-PROTOTYPE.md)
- [PRD](PRD-MOBILE-REACT-NATIVE.md)

## Pemeriksaan visual

Dua belas layar representatif ditinjau dari hasil render. Perbaikan mencakup penanda lokasi pada skema peta dan konsistensi waktu sesi QR. Reviewer memverifikasi kedua perbaikan selesai. Pemeriksaan ini tidak sama dengan pengujian perangkat Android atau usability siswa/guru.

## Indeks layar

ID di bawah merujuk node FigCraft pada versi ini. Setiap wireframe merupakan pasangan layar visual yang sama.

| Key | Layar / state | Role | UI node | Wireframe node |
|---|---|---|---|---|
| start | Quethink | none | 1901 | 3937 |
| login | Welcome back | none | 1902 | 3938 |
| reset | Reset your password | none | 1903 | 3939 |
| resetdone | Check your email | none | 1904 | 3940 |
| register | Create your account | none | 1905 | 3941 |
| join | Find your class | none | 1906 | 3942 |
| joinerror | Class not found | none | 1907 | 3943 |
| joinconfirm | Join Class A? | none | 1908 | 3944 |
| home | Hello, Alya | student | 1909 | 3945 |
| learn | Your learning path | student | 1910 | 3946 |
| locked | Keep following your path | student | 1911 | 3947 |
| read | Filter rows with WHERE | student | 1912 | 3948 |
| video | Supporting video | student | 1913 | 3949 |
| lab | Practice WHERE | student | 1914 | 3950 |
| labpass | Core practice passed | student | 1915 | 3951 |
| labretry | Try your query again | student | 1916 | 3952 |
| preintro | Before you begin | student | 1917 | 3953 |
| postlocked | Posttest is locked | student | 1918 | 3954 |
| postintro | Measure your progress | student | 1919 | 3955 |
| exam | Pretest | test | 1920 | 3956 |
| postexam | Posttest | test | 1921 | 3957 |
| sqltest | Pretest · SQL | test | 1922 | 3958 |
| sqlresult | Query preview | test | 1923 | 3959 |
| submit | Submit your answers? | test | 1924 | 3960 |
| expired | Time is up | test | 1925 | 3961 |
| results | Your learning results | student | 1926 | 3962 |
| review | Answer explanation | student | 1927 | 3963 |
| permissions | Ready to scan? | student | 1928 | 3964 |
| denied | Permission needed | student | 1929 | 3965 |
| scan | Scan attendance QR | student | 1930 | 3966 |
| attok | You're marked present | student | 1931 | 3967 |
| atterror | We couldn't mark you present | student | 1932 | 3968 |
| atthelp | Ask your teacher | student | 1933 | 3969 |
| forum | Discussion forum | student | 1934 | 3970 |
| topic | Understanding JOIN | student | 1935 | 3971 |
| replydone | Reply posted | student | 1936 | 3972 |
| newtopic | Start a discussion | student | 1937 | 3973 |
| ai | AI tutor | student | 1938 | 3974 |
| blocked | Helpers are paused | test | 1939 | 3975 |
| profile | Your profile | student | 1940 | 3976 |
| profilesaved | Profile updated | student | 1941 | 3977 |
| language | App language | student | 1942 | 3978 |
| downloads | Your downloads | student | 1943 | 3979 |
| offline | Tables and relations | student | 1944 | 3980 |
| playground | SQL Playground | student | 1945 | 3981 |
| schema | Database schema | student | 1946 | 3982 |
| aibuilder | Create with AI | student | 1947 | 3983 |
| aidraft | Review AI draft | student | 1948 | 3984 |
| playresult | Query result | student | 1949 | 3985 |
| teacher | Hello, Ms. Maya | teacher | 1950 | 3986 |
| classes | Your classes | teacher | 1951 | 3987 |
| createclass | Create a class | teacher | 1952 | 3988 |
| classcreated | Class created | teacher | 1953 | 3989 |
| class | Database Fundamentals | teacher | 1954 | 3990 |
| students | Class A students | teacher | 1955 | 3991 |
| studentdetail | Alya Rahma | teacher | 1956 | 3992 |
| materials | Class A materials | teacher | 1957 | 3993 |
| materialedit | Edit material | teacher | 1958 | 3994 |
| preview | Student preview | teacher | 1959 | 3995 |
| assessments | Class assessments | teacher | 1960 | 3996 |
| questions | Question bank | teacher | 1961 | 3997 |
| questionedit | Edit choice question | teacher | 1962 | 3998 |
| sqledit | Edit SQL question | teacher | 1963 | 3999 |
| scores | Class A results | teacher | 1964 | 4000 |
| attsetup | Open attendance | teacher | 1965 | 4001 |
| qr | Attendance is open | teacher | 1966 | 4002 |
| closeconfirm | Close this session? | teacher | 1967 | 4003 |
| roster | Attendance roster | teacher | 1968 | 4004 |
| correct | Correct attendance | teacher | 1969 | 4005 |
| corrected | Correction saved | teacher | 1970 | 4006 |
| archiveconfirm | Archive Class A? | teacher | 1971 | 4007 |
| archive | Class A · Archived | teacher | 1972 | 4008 |
| teacherprofile | Teacher profile | teacher | 1973 | 4009 |
| finalresults | Your learning results | student | 1974 | 4010 |
| postsubmit | Submit your answers? | test | 1975 | 4011 |

