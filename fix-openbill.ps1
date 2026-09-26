# Fix OpenBill styling

$filePath = "src/views/ViewOpenBill.jsx"
$content = [System.IO.File]::ReadAllText($filePath)

# Make buttons always visible with consistent styling
$newButtons = @'
{/* Action buttons — always visible */}
<div style={{ display: "flex", gap: SPACING.xs, flexShrink: 0 }}>
  <button
    aria-label="Tambah Pesanan"
    onClick={() => handleAddOrder(bill)}
    style={{
      padding: `${SPACING.xs} ${SPACING.md}`,
      background: COLOR_PALETTE.primaryLight,
      color: G,
      border: `1px solid #a8d5b8`,
      borderRadius: RADIUS.md,
      cursor: "pointer",
      fontFamily: "inherit",
      fontSize: 12,
      fontWeight: 700,
      whiteSpace: "nowrap"
    }}
  >Tambah Pesanan
  </button>
  <button
    aria-label="Bayar"
    onClick={(e) => { e.stopPropagation(); handlePay(bill); }}
    style={{
      padding: `${SPACING.xs} ${SPACING.md}`,
      background: OR,
      color: W,
      border: "none",
      borderRadius: RADIUS.md,
      cursor: "pointer",
      fontFamily: "inherit",
      fontSize: 12,
      fontWeight: 700,
      whiteSpace: "nowrap",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
    }}
  >Bayar
  </button>
  <button
    aria-label="Hapus"
    onClick={(e) => { e.stopPropagation(); handleDelete(bill); }}
    style={{
      padding: `${SPACING.xs} ${SPACING.md}`,
      background: COLOR_PALETTE.dangerLight,
      color: COLOR_PALETTE.danger,
      border: "none",
      borderRadius: RADIUS.md,
      cursor: "pointer",
      fontFamily: "inherit",
      fontSize: 12,
      fontWeight: 700,
      whiteSpace: "nowrap",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
    }}
  >Hapus
  </button>
</div>
'@

$content = $content.Replace('<div style={{ display: "flex", gap: SPACING.xs,\n                      opacity: 0,\n                      transition: "opacity 0.15s ease",\n                      flexShrink: 0\n                    }\n                    // Note: We'\'\'ll use CSS :hover on parent to show actions\n                    >\n                      <button\n                        onClick={(e) => { e.stopPropagation(); handleAddOrder(bill); }}\n                        style={{\n                          padding: `${SPACING.xs} ${SPACING.sm}`,\n                          background: COLOR_PALETTE.primaryLight,\n                          color: G,\n                          border: `1px solid #a8d5b8`,\n                          borderRadius: RADIUS.md,\n                          cursor: "pointer",\n                          fontFamily: "inherit",\n                          fontSize: TYPOGRAPHY.caption.fontSize,\n                          fontWeight: 600,\n                          whiteSpace: "nowrap"\n                        }}\n                        title="Tambah Pesanan"\n                      >\n                        + Pesanan\n                      </button>\n                      <button\n                        onClick={(e) => { e.stopPropagation(); handlePay(bill); }}\n                        style={{\n                          padding: `${SPACING.xs} ${SPACING.sm}`,\n                          background: OR,\n                          color: W,\n                          border: "none",\n                          borderRadius: RADIUS.md,\n                          cursor: "pointer",\n                          fontFamily: "inherit",\n                          fontSize: TYPOGRAPHY.caption.fontSize,\n                          fontWeight: 700,\n                          whiteSpace: "nowrap"\n                        }}\n                        title="Bayar"\n                      >\n                        Bayar\n                      </button>\n                      <button\n                        onClick={(e) => { e.stopPropagation(); handleDelete(bill); }}\n                        style={{\n                          padding: `${SPACING.xs} ${SPACING.sm}`,\n                          background: COLOR_PALETTE.dangerLight,\n                          color: COLOR_PALETTE.danger,\n                          border: "none",\n                          borderRadius: RADIUS.md,\n                          cursor: "pointer",\n                          fontFamily: "inherit",\n                          fontSize: TYPOGRAPHY.caption.fontSize,\n                          fontWeight: 600,\n                          whiteSpace: "nowrap"\n                        }}\n                        title="Hapus"\n                      >\n                        Hapus\n                      </button>\n                    </div>', $newButtons)

[System.IO.File]::WriteAllText($filePath, $content, [System.Text.UTF8Encoding]::new($false))

Write-Host "Done!"
