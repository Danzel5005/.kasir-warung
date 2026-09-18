const ADMIN_ROLE = "admin";

const isAdmin = (user) => user?.role === ADMIN_ROLE || user?.username === "admin";

const canAccessView = (user, view) => isAdmin(user) || ["menu", "bills", "history", "laporan"].includes(view);

export { ADMIN_ROLE, isAdmin, canAccessView };
