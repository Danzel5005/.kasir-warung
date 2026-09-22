const ADMIN_ROLE = "admin";

const isAdmin = (user) => user?.role === ADMIN_ROLE || user?.username === "admin";

// "kelola" dan "fitur-lanjutan" sengaja TIDAK ada di daftar ini — keduanya
// halaman pengelolaan yang hanya boleh dibuka admin.
const canAccessView = (user, view) => isAdmin(user) || ["menu", "bills", "history", "laporan"].includes(view);

export { ADMIN_ROLE, isAdmin, canAccessView };
