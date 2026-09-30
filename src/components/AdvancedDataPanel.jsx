import { memo } from "react";
import { isAdvancedFeatureOn } from "../constants/advancedFeatures.js";
import BahanBakuPanel from "./advanced/BahanBakuPanel.jsx";
import SupplierPanel from "./advanced/SupplierPanel.jsx";
import LoyaltyPanel from "./advanced/LoyaltyPanel.jsx";
import ResepPanel from "./advanced/ResepPanel.jsx";
import ImportExcelPanel from "./advanced/ImportExcelPanel.jsx";

// AdvancedDataPanel -- panel pengelolaan fitur lanjutan (Bahan Baku, Supplier,
// Loyalty Tier, Resep/HPP). Setiap sub-panel muncul HANYA bila flag terkait
// aktif (via isAdvancedFeatureOn). Flag key berasal dari advancedFeatures.js.
// Komponen sub-panel dipecah ke folder ./advanced/.
//
// Props:
//   settings     - objek settings (untuk isAdvancedFeatureOn)
//   advancedData - nilai balik useAdvancedData()
//   menu         - daftar menu (untuk editor resep)
//   toast_       - feedback opsional
function AdvancedDataPanel({ settings, advancedData, menu, cats, toast_, addUndo, onImported }) {
  const showBahan = isAdvancedFeatureOn(settings, "bahanBaku");
  const showSupplier = isAdvancedFeatureOn(settings, "supplier");
  const showLoyalty = isAdvancedFeatureOn(settings, "loyalty");
  const showResep = isAdvancedFeatureOn(settings, "resepHpp");

  if (!advancedData) return null;

  return (
    <div style={{ padding: "10px 16px 0", flexShrink: 0 }}>
      <ImportExcelPanel menu={menu} cats={cats} advancedData={advancedData} toast_={toast_} onImported={onImported} />
      {showResep && <ResepPanel advancedData={advancedData} menu={menu} toast_={toast_} />}
      {showBahan && (
        <BahanBakuPanel advancedData={advancedData} toast_={toast_} addUndo={addUndo} suppliers={advancedData.supplier} menu={menu} />
      )}
      {showSupplier && <SupplierPanel advancedData={advancedData} toast_={toast_} />}
      {showLoyalty && <LoyaltyPanel advancedData={advancedData} toast_={toast_} />}
    </div>
  );
}

export default memo(AdvancedDataPanel);
