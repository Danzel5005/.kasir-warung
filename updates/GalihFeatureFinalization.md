## BUG 
- [1] Nomor Meja and Pax is NOT Default, make sure to delete it
- [2] QRIS Image doesn't show up in the printed receipt
- [3] The Costum Restaurant Name doesn't show up in the printed or preview receipt. Still showing Restaurant
- [4] Change ALL "restaurant" strings (no case sensitive) to be editable in the "Nama Warung" settings. The default will be "Warung"
- [5] Additional Receipt doesnt show up in printed receipt only in preview
- [6] Make sure printpreview doesn't follow the deleted Meja & Pax anymore

- [NOTICE/IMPORTANT] After completing this. Read RECEIPTFORMAT.md in this folder and run it as a prompt

## 3rd PHASE
# FIXES
- [1] the Costum Name didn't load in the printed receipt, make it dynamic as it should follow the name in "Nama Warung" setting
- [2] the hardcoded "Kasir" part in the printed receipt. let the name be the user name
- [3] Categories doesn't load properly, make sure it detects the category name (case sensitive)
- [4] Receipt Additional is previewed inline, make sure they're previewed in different paragraph
- [5] There's no item total
- [6] The trx number format is "TRX-ddmmyyy(no. of trx today)" no space
- [7] The Category total didn't show (Total items in Category1 + Total items in Category1 + etc...)
- [8] Add "ROKOK"  as a tag
- [9] As in [7], separate the category that don't have a tag, and a tag. 
- [10] Make sure all text in the printed receipt are bold
- [11] Erase "-- Preview Tagihan --" in the preview receipt. And the footer just "Belum Lunas" 

# 2nd Batch of Fixes
- [1] Remove ALL pajak and service fee's. Make sure it doesn't show up ANYWHERE
- [2] Kasir page doesn't reset after completing an order
- [3] Remove ALL meja from all parts of the riwayat page. Currently, there's a "Meja undefined" text at laporan
- [4] Remove "Total Pax" from Laporan"
- [5] Enable deletion of "Metode Pembayaran" in setting
- [6] Move "Kelola Pengguna" in Menu to Setting
- [7] Add "Alamat Warung" in Nama Warung Settings, and it will display under "Nama Warung" in every receipt
- [8] Add contact number, behave as [7] 
- [9] Add Item Total
- [10] Update The trx number format to "TRX-ddmmyyy(no. of trx today)" no space
- [11] Update hardcoded "Kasir" name in the printed receipt. let the name be the "nama pengguna" of the user that's logged in
[IMPORTANT] After completing all to-do's, check everypoint to make sure it's already executed
