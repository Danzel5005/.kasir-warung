const LICENSE_SECRET = "Q8x-7NqP-Z3mK-4VtR-8H2c-9wL6pX5sJ1";

function generateKey(hardwareId) {
  const crypto = require("crypto");
  const hash = crypto
    .createHmac("sha256", LICENSE_SECRET)
    .update(hardwareId.replace(/-/g, "").toUpperCase())
    .digest("hex")
    .toUpperCase();
  const s = hash.slice(0, 20);
  return `YKK-${s.slice(0, 5)}-${s.slice(5, 10)}-${s.slice(10, 15)}-${s.slice(15, 20)}`;
}

module.exports = { LICENSE_SECRET, generateKey };