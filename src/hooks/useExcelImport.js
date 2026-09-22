import { useCallback, useMemo, useState } from "react";
import { api } from "../utilities/utils.js";
import {
  parseImportWorkbook,
  validateMenuRows,
  validateBahanRows,
  validateResepRows,
  buildResolvers,
  buildImportPlan,
  mergeResep,
  mergeBahan,
} from "../utilities/excelImport.js";

// Hook impor Excel (Menu / BahanBaku / Resep).
//
// Murni orkestrasi state + pemanggilan api. seluruh logika bisnis (parsing,
// validasi, perencanaan) ada di utilities/excelImport.js supaya bisa diuji
// tanpa React/IPC. Hook ini HANYA menyimpan state langkah, keputusan baris,
// dan menjalankan komit ke penyimpanan saat diminta.
//
// alur step: "idle" -> "preview" -> "committing" -> "done"
export function useExcelImport({ menu = [], cats = {}, advancedData, toast_ }) {
  const [step, setStep] = useState("idle");
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState(null); // hasil parseImportWorkbook
  const [error, setError] = useState(""); // error fatal (file rusak / sheet kosong)
  const [decisions, setDecisions] = useState({ menu: {}, bahan: {} });
  const [result, setResult] = useState(null); // ringkasan commit

  const existingMenu = useMemo(() => (Array.isArray(menu) ? menu : []), [menu]);
  const existingBahan = useMemo(
    () => (Array.isArray(advancedData?.bahanBaku) ? advancedData.bahanBaku : []),
    [advancedData?.bahanBaku],
  );
  const existingResep = useMemo(
    () => (advancedData?.resep && typeof advancedData.resep === "object" ? advancedData.resep : {}),
    [advancedData?.resep],
  );

  // Daftar kategori existing (object map key->label atau array).
  const existingCats = useMemo(() => {
    if (Array.isArray(cats)) return cats;
    if (cats && typeof cats === "object") {
      return Object.entries(cats).map(([key, label]) => ({ key, label }));
    }
    return [];
  }, [cats]);

  // ── Validasi turunan (recompute saat parsed / data existing / keputusan) ──
  const validated = useMemo(() => {
    if (!parsed) return null;

    const vMenu = validateMenuRows(parsed.menuRows, existingMenu, existingCats);
    const vBahan = validateBahanRows(parsed.bahanRows, existingBahan);
    const resolvers = buildResolvers(vMenu, vBahan, existingMenu, existingBahan);
    const vResep = validateResepRows(parsed.resepRows, resolvers.menuMap, resolvers.bahanMap);
    const plan = buildImportPlan(vMenu, vBahan, vResep, decisions);

    return { vMenu, vBahan, vResep, plan };
  }, [parsed, existingMenu, existingBahan, existingCats, decisions]);

  const reset = useCallback(() => {
    setStep("idle");
    setFileName("");
    setParsed(null);
    setError("");
    setDecisions({ menu: {}, bahan: {} });
    setResult(null);
  }, []);

  // Baca file -> parse -> masuk mode preview.
  const loadFile = useCallback(async (file) => {
    if (!file) return;
    setError("");
    setResult(null);
    try {
      const buf = await file.arrayBuffer();
      const data = await parseImportWorkbook(buf);

      if (!data.foundSheets.length) {
        setError(
          `Sheet tidak dikenali. Ditemukan: ${(data.sheetNames || []).join(", ") || "(kosong)"}. ` +
            "Butuh sheet minimal salah satu dari: Menu, BahanBaku, Resep.",
        );
        setStep("idle");
        setParsed(null);
        return;
      }

      setFileName(file.name || "");
      setParsed(data);
      setDecisions({ menu: {}, bahan: {} });
      setStep("preview");
    } catch (err) {
      setError("Gagal membaca file Excel. Pastikan file .xlsx yang valid.");
      setStep("idle");
      setParsed(null);
    }
  }, []);

  // Set keputusan untuk satu baris konflik (menu atau bahan).
  const setRowDecision = useCallback((kind, index, value) => {
    setDecisions((prev) => {
      const bucket = { ...(prev[kind] || {}) };
      if (!value) delete bucket[index];
      else bucket[index] = value; // "keep" | "overwrite"
      return { ...prev, [kind]: bucket };
    });
  }, []);

  // Set keputusan sekaligus untuk semua baris konflik.
  const setAllDecisions = useCallback(
    (kind, value) => {
      if (!validated) return;
      const rows = kind === "menu" ? validated.vMenu.rows : validated.vBahan.rows;
      const next = {};
      for (const r of rows) {
        if (r.status === "conflict") next[r.index] = value;
      }
      setDecisions((prev) => ({ ...prev, [kind]: next }));
    },
    [validated],
  );

  // Komit seluruh rencana ke penyimpanan.
  const commit = useCallback(async () => {
    if (!validated) return { ok: false };
    const { plan } = validated;
    if (plan.hasPendingDecisions) {
      if (toast_) toast_(`Masih ada ${plan.pendingCount} baris konflik yang belum dipilih`, "err");
      return { ok: false };
    }

    setStep("committing");
    try {
      // 1. Menu (upsert massal, stok existing tidak ditimpa oleh main process).
      if (plan.menuToUpsert.length) {
        await api.bulkUpsertMenu(plan.menuToUpsert);
      }

      // 2. Kategori baru (auto-create untuk kategori tak dikenal).
      if (plan.newCategories.length) {
        const current = await api.loadCats();
        const list = Array.isArray(current) ? current : [];
        const seen = new Set(list.map((c) => String(c?.key || "")));
        const merged = [...list];
        for (const c of plan.newCategories) {
          if (!seen.has(String(c.key))) {
            merged.push(c);
            seen.add(String(c.key));
          }
        }
        await api.saveCats(merged);
      }

      // 3. Bahan baku (gabung berdasarkan id).
      if (plan.bahanToUpsert.length && advancedData?.saveBahanBaku) {
        await advancedData.saveBahanBaku(mergeBahan(existingBahan, plan.bahanToUpsert));
      }

      // 4. Resep (gabung, resep import menggantikan baris menu ybs).
      const resepMenuCount = Object.keys(plan.resepToSet).length;
      if (resepMenuCount && advancedData?.saveResep) {
        await advancedData.saveResep(mergeResep(existingResep, plan.resepToSet));
      }

      const summary = {
        menu: plan.menuToUpsert.length,
        bahan: plan.bahanToUpsert.length,
        resepMenu: resepMenuCount,
        kategori: plan.newCategories.length,
        stats: plan.stats,
      };
      setResult(summary);
      setStep("done");
      if (toast_) toast_("Import selesai", "ok");
      return { ok: true, summary };
    } catch (err) {
      setStep("preview");
      if (toast_) toast_("Import gagal saat menyimpan", "err");
      return { ok: false, error: String(err?.message || err) };
    }
  }, [validated, advancedData, existingBahan, existingResep, toast_]);

  return {
    step,
    fileName,
    error,
    parsed,
    validated,
    decisions,
    result,
    loadFile,
    setRowDecision,
    setAllDecisions,
    commit,
    reset,
  };
}
