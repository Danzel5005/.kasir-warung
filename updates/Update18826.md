## 1. Storage Revision

# 1.1 Integrating
- [IMPORTANT] DO NOT transform basic application configuration settings like user themes, window size dimensions, or login flags to SQLite
- [x] Check if any files uses .json, make sure they are the file that will stores data in SQLite
- [x] Ask further questions if the edits will compromise data

# 1.2 Transform for more compact storage
- [x] Current data stores in .json, if possible turn it into SQLite, because the app is fully offline
- [x] Make sure the old data (.json) has a backup, and a SQLite copy
- [x] The only data that i want to store as SQLite is transactions and shifts data, because that is the data that WILL accumulate everyday

## 2. Features Update
# 2.1 Removal of Tags
- [1] Remove the tag options from the categories
- [2] "Additionals" should be an option to add when adding items
- [3] "Additionals" should work as 120826.md described
- [4] Tags should have a "hapus" buttons that deletes the tags that attached at a category (new)
# 2.2 Metode Bayar Update
- [1] Metode bayar can be added in settings, but stil have all the features the original Metode Bayar has.
- [2] Keep Tunai and Qris, but have the option to delete them
- [3] Make sure metode bayar, or the costum metode bayar shows up in all receipts, preview, etc.
- [4] Delete the old metode bayar (new)
- [5] Set Qris BCA, QRIS BNI as "Qris"(new)
- [6] For Qris, give the user the option to add their own image that will be printed in all receipts in settings (new)
- [7] Make sure metode bayar shows up in all receipts (new)
# 2.3 Settings update
- [1] Printers should be in Settings
- [2] Replace the printers button with this settings button, 
# 2.4 Kasir Update (new)
- [1] Nomor Meja and Jumlah Pax should be in the category of Receipt Additionals which can be added in settings
- [2] Nomor meja and Jumlah Pax is currently important, because if the user didnt fill it out, the user coudln't checkout the orders. This important conditions should be tagged as "Wajib di isi"
- [3] "Wajib di isi" feature should be able to turned on and off with a switch
- [4] Pajak and Service should be capable to be turned on and off and works as it should



[IMPORTANT] If you create a new .md file, please store it in the "updates" folder