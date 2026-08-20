// Default fallback users — digunakan kalau storage kosong.
// `role: "admin"` menandai pengguna yang berhak kelola pengguna lain.
const DEFAULT_USERS = [
  { username: "admin",  password: "admin123",  nama: "Administrator", role: "admin" }
];

// Helper: cek apakah sebuah user punya hak admin.
const isAdminUser = (u) => !!(u && (u.role === "admin" || u.username === "admin"));

export { DEFAULT_USERS, isAdminUser };

