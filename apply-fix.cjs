const fs = require('fs');
const content = fs.readFileSync('src/views/ViewOpenBill.jsx', 'utf-8');

// Add customer name inline - only if exists
let updated = content.replace(
  '{bill.tableNum && (\n                        <span style={{',
  `{(bill.tableNumber || bill.tableNum) && (\n                      <span style={{\n                        fontSize: 13,\n                        fontWeight: 700,\n                        color: G,\n                        background: "#f0fdf4",\n                        padding: \`${SPACING.xs} ${SPACING.sm}\`,\n                        borderRadius: RADIUS.md,\n                        border: "1px solid #a8d5b8"\n                      }}>\n                        🪑 Meja ${(bill.tableNumber || bill.tableNum).toString().trim()}\n                      </span>\n                    )}\n                    {customerEnabled && bill.customerNama && (\n                      <span style={{\n                        fontSize: 13,\n                        fontWeight: 700,\n                        color: G,\n                        background: "#f0fdf4",\n                        padding: \`${SPACING.xs} ${SPACING.sm}\`,\n                        borderRadius: RADIUS.md,\n                        border: "1px solid #a8d5b8"\n                      }}>\n                        👤 {String(bill.customerNama).trim()}\n                      </span>\n                    )}`
);

updated = updated.replace(
  '</div>\n\n                  {/* Items preview */}',
  `</div>`
);

fs.writeFileSync('src/views/ViewOpenBill.jsx', updated, 'utf-8');
console.log('✓ Applied updates');
