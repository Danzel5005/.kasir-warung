$filePath = "src/views/ViewOpenBill.jsx"
$content = [System.IO.File]::ReadAllText($filePath)

# Update empty state icon and text
$content = $content -replace '🧾','&#128221;'
$content = $content -replace 'pelanggan memesan','pelanggan membuat pesanan'

# Fix: Add table number AND customer name inline with status badge
# Replace existing main content section
$oldMain = @'
                  {/* Main content */}
                  <div style={{ ...row, justifyContent: "space-between", alignItems: "flex-start", marginBottom: SPACING.sm }}>
                    <div style={{ display: "flex", alignItems: "center", gap: SPACING.sm, flex: 1, minWidth: 0 }}>
                      <Tag label="BELUM DIBAYAR" bg="#fff4e0" tc="#b87a00" size="sm" />
                      {bill.tableNum && (
                        <span style={{
                          fontSize: TYPOGRAPHY.body.fontSize,
                          fontWeight: 700,
                          color: G,
                          background: "#f0fdf4",
                          padding: `${SPACING.xs} ${SPACING.sm}`,
                          borderRadius: RADIUS.md,
                          border: "1px solid #a8d5b8"
                        }}>
                          Meja {bill.tableNum}
                        </span>
                      )}
                    </div>
@'

$newMain = @'
                  {/* Main content */}
                  <div style={{ ...row, justifyContent: "flex-start", alignItems: "center", gap: SPACING.sm, marginBottom: SPACING.sm, flexWrap: "wrap" }}>
                    <Tag label="BELUM DIBAYAR" bg="#fff4e0" tc="#b87a00" size="sm" />
                    {bill.tableNumber || bill.tableNum ? (
                      <span style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: G,
                        background: "#f0fdf4",
                        padding: `${SPACING.xs} ${SPACING.sm}`,
                        borderRadius: RADIUS.md,
                        border: "1px solid #a8d5b8"
                      }}>
                        🪑 Meja {(bill.tableNumber || bill.tableNum).toString().trim()}
                      </span>
                    ) : null}
                    {customerEnabled && bill.customerNama && (
                      <span style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: G,
                        background: "#f0fdf4",
                        padding: `${SPACING.xs} ${SPACING.sm}`,
                        borderRadius: RADIUS.md,
                        border: "1px solid #a8d5b8"
                      }}>
                        👤 {String(bill.customerNama).trim()}
                      </span>
                    )}
                    <span style={{ flex: 1 }}></span>
                    <span style={{
                      fontSize: TYPOGRAPHY.caption.fontSize,
                      color: MT,
                      whiteSpace: "nowrap"
                    }}>
                      {formatDuration(bill.createdAt)}
                    </span>
                  </div>
@'

$content = $content -replace [regex]::Escape($oldMain), $newMain

# Remove old inline table badge after replacement
$content = $content -replace '<div style=\{.*?Meja \{bill\.tableNum\}.*?\}>\s*Meja \{bill\.tableNum\}\s*</div>', ''

[System.IO.File]::WriteAllText($filePath, $content, [System.Text.UTF8Encoding]::new($false))
Write-Host "✓ ViewOpenBill updated: Table & Customer shown inline with status"
