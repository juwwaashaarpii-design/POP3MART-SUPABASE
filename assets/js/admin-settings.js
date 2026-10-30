import { supabase } from "./supabase.js";
import { requireRole, showToast } from "./common.js";
const context = await requireRole("admin");
const form = document.querySelector("#settings-form");
if (context) {
  const { data, error } = await supabase.from("store_settings").select("*").eq("id", 1).single();
  if (error) showToast("Gagal memuat pengaturan: " + error.message, "error");
  if (data) { form.store_name.value = data.store_name || "POP-3 MART"; form.support_email.value = data.support_email || ""; form.whatsapp.value = data.whatsapp || ""; form.announcement.value = data.announcement || ""; }
}
form?.addEventListener("submit", async (event) => {
  event.preventDefault(); if (!context) return;
  const button = form.querySelector("button[type=submit]"); button.disabled = true; button.textContent = "Menyimpan...";
  const { error } = await supabase.from("store_settings").update({ store_name: form.store_name.value.trim(), support_email: form.support_email.value.trim(), whatsapp: form.whatsapp.value.trim(), announcement: form.announcement.value.trim(), updated_at: new Date().toISOString() }).eq("id", 1);
  if (error) showToast("Gagal menyimpan pengaturan: " + error.message, "error"); else showToast("Pengaturan toko berhasil disimpan.");
  button.disabled = false; button.textContent = "Simpan Pengaturan";
});
