# Implementation TODO

## Feature 1: Shift-based view in Riwayat Transaksi
- [x] Modify `useHistory.js` — Add `viewMode`, `shiftIdFilter`, `histByShift`, `filteredByShift` states/memos
- [x] Modify `ViewRiwayat.jsx` — Add toggle for "Hari"/"Shift" view mode, render shift groups, shift selector
- [x] Modify `App.jsx` — Pass shifts data and new handlers to ViewRiwayat

## Feature 2: Collapse shifts when > 5 in Riwayat
- [x] Modify `ViewRiwayat.jsx` — Add `showAllShifts` state, collapse to 5, "Lihat semua"/"Tampilkan lebih sedikit" buttons

## Feature 3: Admin user management
- [x] Modify `utils.js` — Add `loadUsers()`/`saveUsers()` API
- [x] Modify `users.js` — Refactor to `DEFAULT_USERS` for dynamic loading
- [x] Modify `useAuth.js` — Load users dynamically from storage, add `addUser`/`deleteUser` methods
- [x] Create `UserModal.jsx` — Modal component for managing users (add/delete)
- [x] Modify `ViewKelola.jsx` — Add "Kelola Pengguna" button
- [x] Modify `App.jsx` — Integrate UserModal, pass user management props

## Testing
- [ ] Test all three features in browser mode

