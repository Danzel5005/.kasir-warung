## MORE BUG FIXES
# Fix Session 1
- [1] Unable to delete Pengguna As Admin. Should be as admin only
- [2] Kasir name is still "Kasir" in printed receipt. It should be the logged in User "Nama Pengguna"
- [3] Remove ALL "Meja" in Open Bill
- [4] Pada useAuth.js confirmCloseShift menghapus SEMUA open bill tanpa undo. Ubah supaya TIDAK PERNAH menghapus open bill, kecuali user sudah mengkonfirmasi bahwa bill sudah terbayar
- [5] Add the feature that automatically detects, if a metode bayar has a name "QRIS" (no case sensitive), it automatically shows up as one of the QRIS payment that the user can upload the image in QRIS setting 

# Fix Session 2
- [6] Konfirmasi bayar doesn't erase the TRX in openbill
- [7] costum Metode Bayar only show key, not Label - Never Show Key, Always Label
