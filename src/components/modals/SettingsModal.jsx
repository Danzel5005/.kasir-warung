import { useState, useEffect, useRef } from "react";
import { G, W, BD, MT, LT } from "../../constants/colors.js";
import { row, inp, RADIUS, TYPOGRAPHY, COLOR_PALETTE } from "../../constants/theme.js";

export default function SettingsModal({ settingsH, authH }) {
  const [tab, setTab] = useState("printer"); // "printer", "payment", "qris", or "receipt"
  const [loadingPrinters, setLoadingPrinters] = useState(false);
  const qrisImageRef = useRef({});



  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 300,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) settingsH.setSettingsModal(false);
      }}
    >
      <div
        style={{
          background: W,
          borderRadius: RADIUS.lg,
          padding: "20px",
          width: 420,
          maxWidth: "95vw",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "80vh",
        }}
      >
        {/* Header */}
        <div style={{ ...row, marginBottom: 14 }}>
          <span style={{ fontSize: TYPOGRAPHY.body.fontSize, fontWeight: 700, color: G }}>
            Pengaturan
          </span>
          <button
            onClick={() => settingsH.setSettingsModal(false)}
            style={{
              background: "none",
              border: `1px solid ${BD}`,
              borderRadius: RADIUS.sm,
              width: 24,
              height: 24,
              cursor: "pointer",
              fontSize: TYPOGRAPHY.small.fontSize,
            }}
          >
            &#10005;
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14, borderBottom: `1px solid ${BD}`, paddingBottom: 10 }}>
          <button
            onClick={() => setTab("printer")}
            style={{
              background: "none",
              border: "none",
              borderBottom: tab === "printer" ? `2px solid ${G}` : "none",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: TYPOGRAPHY.small.fontSize,
              fontWeight: tab === "printer" ? 700 : 600,
              color: tab === "printer" ? G : MT,
              paddingBottom: 6,
            }}
          >
            🖨️ Printer
          </button>
          <button
            onClick={() => setTab("warung")}
            style={{
              background: "none",
              border: "none",
              borderBottom: tab === "warung" ? `2px solid ${G}` : "none",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: TYPOGRAPHY.small.fontSize,
              fontWeight: tab === "warung" ? 700 : 600,
              color: tab === "warung" ? G : MT,
              paddingBottom: 6,
            }}
          >
            🏪 Nama Warung
          </button>
          <button
            onClick={() => setTab("payment")}
            style={{
              background: "none",
              border: "none",
              borderBottom: tab === "payment" ? `2px solid ${G}` : "none",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: TYPOGRAPHY.small.fontSize,
              fontWeight: tab === "payment" ? 700 : 600,
              color: tab === "payment" ? G : MT,
              paddingBottom: 6,
            }}
          >
            💳 Metode Bayar
          </button>
          <button
            onClick={() => setTab("qris")}
            style={{
              background: "none",
              border: "none",
              borderBottom: tab === "qris" ? `2px solid ${G}` : "none",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: TYPOGRAPHY.small.fontSize,
              fontWeight: tab === "qris" ? 700 : 600,
              color: tab === "qris" ? G : MT,
              paddingBottom: 6,
            }}
          >
            📱 QRIS
          </button>
          <button
            onClick={() => setTab("receipt")}
            style={{
              background: "none",
              border: "none",
              borderBottom: tab === "receipt" ? `2px solid ${G}` : "none",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: TYPOGRAPHY.small.fontSize,
              fontWeight: tab === "receipt" ? 700 : 600,
              color: tab === "receipt" ? G : MT,
              paddingBottom: 6,
            }}
          >
            🧾 Resi
          </button>
          <button
            onClick={() => setTab("users")}
            style={{
              background: "none",
              border: "none",
              borderBottom: tab === "users" ? `2px solid ${G}` : "none",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: TYPOGRAPHY.small.fontSize,
              fontWeight: tab === "users" ? 700 : 600,
              color: tab === "users" ? G : MT,
              paddingBottom: 6,
            }}
          >
            👥 Kelola Pengguna
          </button>
        </div>

        {/* Content (scrollable) */}
        <div style={{ flex: 1, overflowY: "auto", marginBottom: 14 }}>
          {/* Printer Tab */}
          {tab === "printer" && (
            <div>
              <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, fontWeight: 600, marginBottom: 10 }}>
                Pilih printer thermal untuk mencetak resi. Pastikan driver printer sudah terinstall.
              </div>

              {/* Default system printer */}
              <button
                onClick={() => settingsH.selectPrinter("")}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  border: `2px solid ${!settingsH.settings.printerName ? G : BD}`,
                  borderRadius: RADIUS.md,
                  background: !settingsH.settings.printerName ? COLOR_PALETTE.primaryLight : W,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: TYPOGRAPHY.small.fontSize,
                  fontWeight: 600,
                  textAlign: "left",
                  marginBottom: 6,
                }}
              >
                Default Printer Sistem
              </button>

              {/* Printer list */}
              {settingsH.printerList.length === 0 ? (
                <div style={{ fontSize: TYPOGRAPHY.small.fontSize, color: MT, textAlign: "center", padding: "10px 0" }}>
                  Tidak ada printer terdeteksi. Pastikan driver terinstall.
                </div>
              ) : (
                settingsH.printerList.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => settingsH.selectPrinter(p.name)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      border: `2px solid ${settingsH.settings.printerName === p.name ? G : BD}`,
                      borderRadius: RADIUS.md,
                      background: settingsH.settings.printerName === p.name ? COLOR_PALETTE.primaryLight : W,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: TYPOGRAPHY.small.fontSize,
                      fontWeight: 600,
                      textAlign: "left",
                      marginBottom: 6,
                      ...row,
                    }}
                  >
                    <span>{p.name}</span>
                    {settingsH.settings.printerName === p.name && (
                      <span style={{ fontSize: TYPOGRAPHY.label.fontSize, color: G, marginLeft: "auto" }}>✓</span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {/* Warung Name Tab */}
          {tab === "warung" && (
            <div>
              <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, fontWeight: 600, marginBottom: 10 }}>
                Atur nama warung/kios/restoran, alamat, dan nomor telepon yang akan tampil di resi pembayaran.
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 600, color: G, marginBottom: 8 }}>
                  Info Warung Saat Ini:
                </div>
                <div style={{ padding: "12px", background: COLOR_PALETTE.primaryLight, borderRadius: RADIUS.md, border: `1px solid #b8ccf0` }}>
                  <div style={{ fontSize: TYPOGRAPHY.body.fontSize, fontWeight: 700, color: G }}>
                    {settingsH.settings.warungName || "Warung (default)"}
                  </div>
                  {settingsH.settings.warungAddress && (
                    <div style={{ fontSize: TYPOGRAPHY.small.fontSize, color: MT, marginTop: 4 }}>
                      {settingsH.settings.warungAddress}
                    </div>
                  )}
                  {settingsH.settings.warungPhone && (
                    <div style={{ fontSize: TYPOGRAPHY.small.fontSize, color: MT, marginTop: 2 }}>
                      Telp: {settingsH.settings.warungPhone}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ paddingTop: 12, borderTop: `1px solid ${BD}` }}>
                <div style={{ fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 600, color: G, marginBottom: 8 }}>
                  Ubah Nama Warung:
                </div>
                <div style={{ display: "flex", gap: 7 }}>
                  <input
                    type="text"
                    value={settingsH.warungNameInput}
                    onChange={(e) => settingsH.setWarungNameInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && settingsH.setWarungName(settingsH.warungNameInput)}
                    placeholder="Nama warung/kios/restoran Anda"
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      border: `1px solid ${BD}`,
                      borderRadius: RADIUS.md,
                      fontFamily: "inherit",
                      fontSize: TYPOGRAPHY.small.fontSize,
                    }}
                  />
                  <button
                    onClick={() => settingsH.setWarungName(settingsH.warungNameInput)}
                    style={{
                      padding: "8px 14px",
                      background: G,
                      color: W,
                      border: "none",
                      borderRadius: RADIUS.md,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: TYPOGRAPHY.small.fontSize,
                      fontWeight: 700,
                    }}
                  >
                    Simpan
                  </button>
                </div>
                <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, marginTop: 8 }}>
                  Kosongkan untuk kembali ke default "Warung"
                </div>
              </div>
              
              <div style={{ paddingTop: 12, borderTop: `1px solid ${BD}` }}>
                <div style={{ fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 600, color: G, marginBottom: 8 }}>
                  Alamat Warung:
                </div>
                <div style={{ display: "flex", gap: 7 }}>
                  <input
                    type="text"
                    value={settingsH.warungAddressInput || ""}
                    onChange={(e) => settingsH.setWarungAddressInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && settingsH.setWarungAddress(settingsH.warungAddressInput)}
                    placeholder="Alamat lengkap warung"
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      border: `1px solid ${BD}`,
                      borderRadius: RADIUS.md,
                      fontFamily: "inherit",
                      fontSize: TYPOGRAPHY.small.fontSize,
                    }}
                  />
                  <button
                    onClick={() => settingsH.setWarungAddress(settingsH.warungAddressInput)}
                    style={{
                      padding: "8px 14px",
                      background: G,
                      color: W,
                      border: "none",
                      borderRadius: RADIUS.md,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: TYPOGRAPHY.small.fontSize,
                      fontWeight: 700,
                    }}
                  >
                    Simpan
                  </button>
                </div>
                <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, marginTop: 8 }}>
                  Kosongkan untuk menghapus alamat
                </div>
              </div>

              <div style={{ paddingTop: 12, borderTop: `1px solid ${BD}` }}>
                <div style={{ fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 600, color: G, marginBottom: 8 }}>
                  Nomor Telepon Warung:
                </div>
                <div style={{ display: "flex", gap: 7 }}>
                  <input
                    type="text"
                    value={settingsH.warungPhoneInput || ""}
                    onChange={(e) => settingsH.setWarungPhoneInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && settingsH.setWarungPhone(settingsH.warungPhoneInput)}
                    placeholder="Nomor telepon/WA warung"
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      border: `1px solid ${BD}`,
                      borderRadius: RADIUS.md,
                      fontFamily: "inherit",
                      fontSize: TYPOGRAPHY.small.fontSize,
                    }}
                  />
                  <button
                    onClick={() => settingsH.setWarungPhone(settingsH.warungPhoneInput)}
                    style={{
                      padding: "8px 14px",
                      background: G,
                      color: W,
                      border: "none",
                      borderRadius: RADIUS.md,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: TYPOGRAPHY.small.fontSize,
                      fontWeight: 700,
                    }}
                  >
                    Simpan
                  </button>
                </div>
                <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, marginTop: 8 }}>
                  Kosongkan untuk menghapus nomor telepon
                </div>
              </div>
            </div>
          )}

          {/* Payment Methods Tab */}
          {tab === "payment" && (
            <div>
              {/* Payment methods list */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 600, color: G, marginBottom: 8 }}>
                  Metode Pembayaran Aktif:
                </div>
                {settingsH.settings.paymentMethods && settingsH.settings.paymentMethods.length > 0 ? (
                  settingsH.settings.paymentMethods.map((m) => (
                    <div
                      key={m.key}
                      style={{
                        ...row,
                        padding: "8px 10px",
                        background: "linear-gradient(135deg, #f5fdf8, #e8f5ee)",
                        borderRadius: RADIUS.md,
                        marginBottom: 6,
                        border: `1px solid ${COLOR_PALETTE.primaryLight}`,
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 600 }}>{m.label}</div>
                        <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT }}>
                          {m.category === "cash" ? "💵 Cash" : m.category === "qris" ? "📱 QRIS" : "🏦 Custom"}
                        </div>
                      </div>
                      <button
                        onClick={() => settingsH.deletePaymentMethod(m.key)}
                        style={{
                          background: COLOR_PALETTE.dangerLight,
                          color: COLOR_PALETTE.danger,
                          border: "none",
                          borderRadius: RADIUS.sm,
                          padding: "3px 8px",
                          cursor: "pointer",
                          fontFamily: "inherit",
                          fontSize: TYPOGRAPHY.label.fontSize,
                          fontWeight: 600,
                        }}
                      >
                        Hapus
                      </button>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: TYPOGRAPHY.small.fontSize, color: MT, textAlign: "center" }}>
                    Tidak ada metode pembayaran
                  </div>
                )}
              </div>

              {/* Add new payment method */}
              <div style={{ paddingTop: 12, borderTop: `1px solid ${BD}` }}>
                <div style={{ fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 600, color: G, marginBottom: 8 }}>
                  Tambah Metode Baru:
                </div>
                <div style={{ display: "flex", gap: 7 }}>
                  <input
                    type="text"
                    value={settingsH.newPaymentLabel}
                    onChange={(e) => settingsH.setNewPaymentLabel(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && settingsH.addPaymentMethod()}
                    placeholder="Nama metode (e.g., Transfer BRI)"
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      border: `1px solid ${BD}`,
                      borderRadius: RADIUS.md,
                      fontFamily: "inherit",
                      fontSize: TYPOGRAPHY.small.fontSize,
                    }}
                  />
                  <button
                    onClick={settingsH.addPaymentMethod}
                    style={{
                      padding: "8px 14px",
                      background: G,
                      color: W,
                      border: "none",
                      borderRadius: RADIUS.md,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: TYPOGRAPHY.small.fontSize,
                      fontWeight: 700,
                    }}
                  >
                    Tambah
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* QRIS Images Tab */}
          {tab === "qris" && (
            <div>
              <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, fontWeight: 600, marginBottom: 10 }}>
                Kelola gambar QRIS untuk setiap metode pembayaran. Gambar akan ditampilkan di resi pelanggan.
              </div>

              {/* QRIS Payment Methods with Image Upload */}
              {settingsH.settings.paymentMethods &&
                settingsH.settings.paymentMethods
                  .filter((m) => m.category === "qris")
                  .map((method) => (
                    <div
                      key={method.key}
                      style={{
                        padding: "12px",
                        background: COLOR_PALETTE.primaryLight,
                        borderRadius: RADIUS.md,
                        marginBottom: 10,
                        border: `1px solid #a8d5b8`,
                      }}
                    >
                      <div style={{ ...row, marginBottom: 8 }}>
                        <span style={{ fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 700 }}>
                          {method.label}
                        </span>
                        {settingsH.settings.qrisImages && settingsH.settings.qrisImages[method.key] && (
                          <span style={{ fontSize: TYPOGRAPHY.label.fontSize, color: G, fontWeight: 600 }}>
                            ✓ Ada gambar
                          </span>
                        )}
                      </div>

                      {/* QRIS Image Preview */}
                      {settingsH.settings.qrisImages && settingsH.settings.qrisImages[method.key] && (
                        <div style={{ marginBottom: 8 }}>
                          <img
                            src={settingsH.settings.qrisImages[method.key]}
                            alt={`QRIS ${method.label}`}
                            style={{
                              maxWidth: "100%",
                              maxHeight: "150px",
                              borderRadius: RADIUS.md,
                              border: `1px solid ${BD}`,
                            }}
                          />
                        </div>
                      )}

                      {/* Upload/Delete Buttons */}
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          ref={(el) => {
                            qrisImageRef.current[method.key] = el;
                          }}
                          type="file"
                          accept="image/jpeg,image/png"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              settingsH.handleQrisImageUpload(method.key, file);
                            }
                          }}
                          style={{ display: "none" }}
                        />
                        <button
                          onClick={() => qrisImageRef.current[method.key]?.click()}
                          style={{
                            flex: 1,
                            padding: "6px 10px",
                            background: COLOR_PALETTE.infoLight,
                            color: COLOR_PALETTE.info,
                            border: "none",
                            borderRadius: RADIUS.sm,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            fontSize: TYPOGRAPHY.label.fontSize,
                            fontWeight: 600,
                          }}
                        >
                          {settingsH.settings.qrisImages && settingsH.settings.qrisImages[method.key]
                            ? "Ganti Gambar"
                            : "Upload Gambar"}
                        </button>
                        {settingsH.settings.qrisImages && settingsH.settings.qrisImages[method.key] && (
                          <button
                            onClick={() => settingsH.deleteQrisImage(method.key)}
                            style={{
                              padding: "6px 10px",
                              background: COLOR_PALETTE.dangerLight,
                              color: COLOR_PALETTE.danger,
                              border: "none",
                              borderRadius: RADIUS.sm,
                              cursor: "pointer",
                              fontFamily: "inherit",
                              fontSize: TYPOGRAPHY.label.fontSize,
                              fontWeight: 600,
                            }}
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

              {!settingsH.settings.paymentMethods ||
                (settingsH.settings.paymentMethods.filter((m) => m.category === "qris").length === 0 && (
                  <div style={{ fontSize: TYPOGRAPHY.small.fontSize, color: MT, textAlign: "center", padding: "10px 0" }}>
                    Tidak ada metode QRIS yang tersedia
                  </div>
                ))}
            </div>
          )}

          {/* Receipt Additionals Tab */}
          {tab === "receipt" && (
            <div>
              <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, fontWeight: 600, marginBottom: 10 }}>
                Atur field yang muncul di checkout dan resi. Toggle "Wajib" untuk membuat field required. Semua field dapat dihapus.
              </div>

              {/* Receipt Fields */}
              {settingsH.settings.receiptAdditionals &&
                settingsH.settings.receiptAdditionals.map((field) => (
                  <div
                    key={field.key}
                    style={{
                      padding: "10px",
                      background: COLOR_PALETTE.infoLight,
                      borderRadius: RADIUS.md,
                      marginBottom: 8,
                      border: `1px solid #b8ccf0`,
                    }}
                  >
                    <div style={{ ...row, marginBottom: 8 }}>
                      <div>
                        <span style={{ fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 700 }}>
                          {field.label}
                        </span>
                        <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT }}>
                          📋 Field Resi
                        </div>
                      </div>
                      <button
                        onClick={() => settingsH.deleteReceiptAdditional(field.key)}
                        style={{
                          background: COLOR_PALETTE.dangerLight,
                          color: COLOR_PALETTE.danger,
                          border: "none",
                          borderRadius: RADIUS.sm,
                          padding: "3px 8px",
                          cursor: "pointer",
                          fontFamily: "inherit",
                          fontSize: TYPOGRAPHY.label.fontSize,
                          fontWeight: 600,
                        }}
                      >
                        Hapus
                      </button>
                    </div>

                    {/* For text/number fields: Toggle Required */}
                    <button
                      onClick={() => settingsH.toggleReceiptAdditionalRequired(field.key)}
                      style={{
                        width: "100%",
                        padding: "6px 10px",
                        background: field.required ? G : BD,
                        color: field.required ? W : MT,
                        border: "none",
                        borderRadius: RADIUS.sm,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        fontSize: TYPOGRAPHY.label.fontSize,
                        fontWeight: 600,
                      }}
                    >
                      {field.required ? "✓ Wajib di isi" : "Tidak wajib"}
                    </button>
                  </div>
                ))}

              {/* Add new custom field */}
              <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${BD}` }}>
                <div style={{ fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 600, color: G, marginBottom: 8 }}>
                  Tambah Field Baru:
                </div>
                <div style={{ display: "flex", gap: 7 }}>
                  <input
                    type="text"
                    value={settingsH.newReceiptFieldLabel}
                    onChange={(e) => settingsH.setNewReceiptFieldLabel(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && settingsH.addReceiptField()}
                    placeholder="Nama field (e.g., Catatan, Alamat)"
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      border: `1px solid ${BD}`,
                      borderRadius: RADIUS.md,
                      fontFamily: "inherit",
                      fontSize: TYPOGRAPHY.small.fontSize,
                    }}
                  />
                  <select
                    value={settingsH.newReceiptFieldType}
                    onChange={(e) => settingsH.setNewReceiptFieldType(e.target.value)}
                    style={{
                      padding: "8px 10px",
                      border: `1px solid ${BD}`,
                      borderRadius: RADIUS.md,
                      fontFamily: "inherit",
                      fontSize: TYPOGRAPHY.small.fontSize,
                    }}
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                  </select>
                  <button
                    onClick={settingsH.addReceiptField}
                    style={{
                      padding: "8px 14px",
                      background: G,
                      color: W,
                      border: "none",
                      borderRadius: RADIUS.md,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: TYPOGRAPHY.small.fontSize,
                      fontWeight: 700,
                    }}
                  >
                    Tambah
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Users Tab */}
          {tab === "users" && (
            <div>
              <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, fontWeight: 600, marginBottom: 10 }}>
                Kelola pengguna yang bisa login ke sistem kasir.
              </div>
              
              {/* Users list */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 600, color: G, marginBottom: 8 }}>
                  Daftar Pengguna ({authH?.users?.length || 0}):
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {authH?.users?.map(u => (
                    <div key={u.username} style={{ ...row, padding: "7px 10px", background: LT, borderRadius: RADIUS.md }}>
                      <div>
                        <div style={{ fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 600 }}>{u.nama}{u.username === authH?.currentUser?.username ? " (Anda)" : ""}</div>
                        <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT }}>@{u.username}</div>
                      </div>
                      {!authH?.currentUser || authH?.currentUser?.role !== "admin" ? (
                        <span style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, fontStyle: "italic" }}>Hanya admin</span>
                      ) : u.username === "admin" ? (
                        <span style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, fontStyle: "italic" }}>Utama (tidak bisa dihapus)</span>
                      ) : u.username === authH?.currentUser?.username ? (
                        <span style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, fontStyle: "italic" }}>Akun sendiri</span>
                      ) : (
                        <button
                          onClick={() => settingsH.authH.deleteUser(u.username)}
                          style={{ background: COLOR_PALETTE.dangerLight, color: COLOR_PALETTE.danger, border: "none", borderRadius: RADIUS.sm, padding: "4px 8px", cursor: "pointer", fontFamily: "inherit", fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 600 }}
                        >Hapus</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Add new user */}
              <div style={{ paddingTop: 12, borderTop: `1px solid ${BD}` }}>
                <div style={{ fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 600, color: G, marginBottom: 8 }}>
                  Tambah Pengguna Baru:
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Nama Lengkap (e.g., Kasir Budi)"
                    style={inp}
                  />
                  <input
                    type="text"
                    placeholder="Username (e.g., kasir1)"
                    style={inp}
                  />
                  <input
                    type="password"
                    placeholder="Password (min. 4 karakter)"
                    style={inp}
                  />
                  <button style={{ padding: "8px 14px", background: G, color: W, border: "none", borderRadius: RADIUS.md, cursor: "pointer", fontFamily: "inherit", fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 700 }}>
                    + Tambah Pengguna
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Close Button */}
        <div style={{ ...row }}>
          <button
            onClick={() => settingsH.setSettingsModal(false)}
            style={{
              marginLeft: "auto",
              padding: "8px 16px",
              background: COLOR_PALETTE.primaryLight,
              color: G,
              border: "none",
              borderRadius: RADIUS.md,
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: TYPOGRAPHY.small.fontSize,
              fontWeight: 700,
            }}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
