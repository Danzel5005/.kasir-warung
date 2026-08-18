// Receipt Additionals — Configurable fields that appear on receipts/checkout
// Users can control which fields are required and which are displayed

const DEFAULT_RECEIPT_ADDITIONALS = [
  {
    key: "nomor_meja",
    label: "Nomor Meja",
    type: "text",
    required: true,
    visible: true,
    category: "receipt",
  },
  {
    key: "jumlah_pax",
    label: "Jumlah Pax",
    type: "number",
    required: false,
    visible: true,
    category: "receipt",
  },
  {
    key: "tax",
    label: "Pajak 10%",
    type: "toggle",
    required: false,
    visible: true,
    category: "charges",
    enabled: true,
  },
  {
    key: "service",
    label: "Service 6%",
    type: "toggle",
    required: false,
    visible: true,
    category: "charges",
    enabled: true,
  },
];

export { DEFAULT_RECEIPT_ADDITIONALS };
