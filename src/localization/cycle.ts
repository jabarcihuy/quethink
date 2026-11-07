const en = {
  reviewMaterials: "Review materials",
  labTitle: "SQL Lab",
  posttest: "Posttest",
  startPost: "Start posttest",
  resumePost: "Resume posttest",
  postResults: "Posttest results",
  postScore: "Posttest score",
  postIntro: "Complete this posttest once to measure what you have learned.",
  postLocked:
    "Complete every material and required Lab to unlock your posttest.",
  submitPost: "Submit posttest",
  submitPostTitle: "Submit your posttest?",
  submitPostBody:
    "Your saved answers will be graded. You cannot take this posttest again.",
  gradingPost: "Grading your posttest",
  cycleDone:
    "Your learning cycle is complete. Review your answers and compare your pretest and posttest scores.",
  manageQuestions: "Manage questions",
  bankHelp:
    "Edit this class’s question package. SQL questions use the students dataset shown below.",
  bankLocked:
    "This package is read-only because the class is archived or a student has already started. Existing attempts keep their question snapshot.",
  bankConflict:
    "This package changed in another session. Reopen the editor before saving again.",
  bankSaved: "Question package saved.",
  saveBank: "Validate SQL and save package",
  bankRules:
    "Use 2–30 questions: at least one multiple-choice question and 1–2 SQL questions. Include the correct answer and an explanation.",
  prompt: "Question text",
  explanation: "Explanation",
  reference: "Reference SQLite SELECT query",
  choice: "Multiple choice",
  sql: "SQL question",
  option: "Option",
  correct: "Correct option",
  addChoice: "Add multiple-choice question",
  addSql: "Add SQL question",
  remove: "Remove question",
  removeTitle: "Remove this question?",
  removeBody:
    "It will be removed from this draft. Save the package to apply the change.",
  referenceInvalid:
    "A reference query cannot run safely on the students dataset. Check its columns, syntax and allowed SELECT operations.",
  distinct:
    "Pretest and posttest need different question text. Change the duplicated prompts.",
  labRequired:
    "Complete the required SQL practice to unlock the next material.",
  openLab: "Open SQL Lab",
  labTeacher:
    "Keep practice focused: the starter course has two Labs, one core task each. Add a Lab only where practice is needed.",
  labTask: "Required Lab task",
  filterTask: "SELECT · filter and sort names",
  updateTask: "UPDATE · change a selected cohort",
  filterPrompt:
    "Return only the names of students in cohort 2025, sorted alphabetically.",
  updatePrompt:
    "Change cohort 2024 to 2026. Keep every other value unchanged. Use one UPDATE statement.",
  labHelp:
    "Each Run or Check starts from the original synthetic dataset. Run previews your result; Check verifies the task and saves completion.",
  run: "Run query",
  check: "Check answer",
  reset: "Reset query",
  output: "Query result",
  passed: "Practice completed. Your progress is saved.",
  notPassed:
    "The query ran, but the task is not complete. Review the condition and result, then try again.",
  queryRejected:
    "The query could not run. Use one allowed statement on students; check its syntax and column names.",
  preview: "Preview only. Check your answer to save progress.",
  emptyRows: "The query returned no rows.",
  runFailed:
    "No result was confirmed. Try the same action again to confirm the result.",
  testBlocked: "SQL practice is unavailable while a test is active.",
  rate: "Too many practice requests. Wait a minute and try again.",
  backMaterials: "Back to materials",
  schema: "students(id INTEGER PRIMARY KEY, name TEXT, cohort INTEGER)",
  sample: "1 | Alya | 2025\n2 | Bima | 2024\n3 | Citra | 2025",
  change: "Score change",
  points: "points",
  readOnly: "Archived class: practice is read-only.",
  bankDraft:
    "Changes are kept in this draft until you save. Leaving the editor discards unsaved changes.",
  leaveTitle: "Discard unsaved changes?",
  leaveBody: "Your question edits have not been saved.",
  discard: "Discard",
  stay: "Keep editing",
};
const id: Record<keyof typeof en, string> = {
  reviewMaterials: "Tinjau materi",
  labTitle: "Lab SQL",
  posttest: "Posttest",
  startPost: "Mulai posttest",
  resumePost: "Lanjutkan posttest",
  postResults: "Hasil posttest",
  postScore: "Nilai posttest",
  postIntro: "Kerjakan posttest satu kali untuk mengukur hasil belajarmu.",
  postLocked: "Selesaikan seluruh materi dan Lab wajib untuk membuka posttest.",
  submitPost: "Kumpulkan posttest",
  submitPostTitle: "Kumpulkan posttest?",
  submitPostBody:
    "Jawaban tersimpan akan dinilai. Kamu tidak dapat mengulang posttest.",
  gradingPost: "Menilai posttest",
  cycleDone:
    "Siklus belajarmu selesai. Tinjau jawaban dan bandingkan nilai pretest serta posttest.",
  manageQuestions: "Kelola soal",
  bankHelp:
    "Ubah paket soal kelas ini. Soal SQL memakai dataset students yang ditampilkan di bawah.",
  bankLocked:
    "Paket baca saja karena kelas diarsipkan atau siswa sudah mulai. Tes yang ada mempertahankan snapshot soalnya.",
  bankConflict:
    "Paket berubah pada sesi lain. Buka ulang editor sebelum menyimpan lagi.",
  bankSaved: "Paket soal tersimpan.",
  saveBank: "Validasi SQL dan simpan paket",
  bankRules:
    "Gunakan 2–30 soal: minimal satu pilihan ganda dan 1–2 soal SQL. Sertakan kunci dan pembahasan.",
  prompt: "Teks soal",
  explanation: "Pembahasan",
  reference: "Query SQLite SELECT acuan",
  choice: "Pilihan ganda",
  sql: "Soal SQL",
  option: "Pilihan",
  correct: "Pilihan benar",
  addChoice: "Tambah pilihan ganda",
  addSql: "Tambah soal SQL",
  remove: "Hapus soal",
  removeTitle: "Hapus soal ini?",
  removeBody:
    "Soal dihapus dari draf. Simpan paket untuk menerapkan perubahan.",
  referenceInvalid:
    "Query acuan belum dapat dijalankan dengan aman pada dataset students. Periksa kolom, sintaks dan operasi SELECT yang diizinkan.",
  distinct:
    "Pretest dan posttest memerlukan teks soal berbeda. Ubah soal yang sama.",
  labRequired: "Selesaikan praktik SQL wajib untuk membuka materi berikutnya.",
  openLab: "Buka Lab SQL",
  labTeacher:
    "Fokuskan praktik: kelas bawaan memiliki dua Lab, masing-masing satu tugas inti. Tambahkan Lab hanya pada materi yang perlu praktik.",
  labTask: "Tugas Lab wajib",
  filterTask: "SELECT · filter dan urutkan nama",
  updateTask: "UPDATE · ubah angkatan tertentu",
  filterPrompt: "Tampilkan hanya nama mahasiswa angkatan 2025, urut alfabet.",
  updatePrompt:
    "Ubah angkatan 2024 menjadi 2026. Pertahankan nilai lainnya. Gunakan satu perintah UPDATE.",
  labHelp:
    "Setiap Run atau Periksa dimulai dari dataset sintetis awal. Run menampilkan hasil; Periksa memverifikasi tugas dan menyimpan progres.",
  run: "Jalankan query",
  check: "Periksa jawaban",
  reset: "Reset query",
  output: "Hasil query",
  passed: "Praktik selesai. Progresmu tersimpan.",
  notPassed:
    "Query berjalan, tetapi tugas belum selesai. Tinjau kondisi dan hasilnya lalu coba lagi.",
  queryRejected:
    "Query belum dapat dijalankan. Gunakan satu perintah yang diizinkan pada students; periksa sintaks dan nama kolom.",
  preview: "Pratinjau saja. Periksa jawaban untuk menyimpan progres.",
  emptyRows: "Query tidak mengembalikan baris.",
  runFailed:
    "Hasil belum terkonfirmasi. Coba tindakan yang sama lagi untuk memastikan hasilnya.",
  testBlocked: "Praktik SQL tidak tersedia selama tes aktif.",
  rate: "Terlalu banyak permintaan praktik. Tunggu satu menit lalu coba lagi.",
  backMaterials: "Kembali ke materi",
  schema: en.schema,
  sample: en.sample,
  change: "Perubahan nilai",
  points: "poin",
  readOnly: "Kelas diarsipkan: praktik baca saja.",
  bankDraft:
    "Perubahan disimpan dalam draf sampai paket disimpan. Keluar dari editor membuang perubahan yang belum tersimpan.",
  leaveTitle: "Buang perubahan yang belum tersimpan?",
  leaveBody: "Perubahan soal belum disimpan.",
  discard: "Buang",
  stay: "Lanjutkan mengedit",
};
export const cycleMessages = { en, id };
