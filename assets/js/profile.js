import { supabase } from "./supabase.js";
import { requireRole, showToast } from "./common.js";
const context = await requireRole("buyer");
const form = document.querySelector("#profile-form");
if (context) {
  const { data: profile, error } = await supabase.from("profiles").select("full_name,email,phone,address").eq("id", context.user.id).single();
  if (error) showToast(error.message, "error");
  if (profile) { form.full_name.value = profile.full_name || ""; form.email.value = profile.email || context.user.email; form.phone.value = profile.phone || ""; form.address.value = profile.address || ""; }
}
form?.addEventListener("submit", async (event) => {
  event.preventDefault(); if (!context) return;
  const button = form.querySelector("button[type=submit]"); button.disabled = true; button.textContent = "Menyimpan...";
  const { error } = await supabase.from("profiles").update({ full_name: form.full_name.value.trim(), phone: form.phone.value.trim(), address: form.address.value.trim(), updated_at: new Date().toISOString() }).eq("id", context.user.id);
  if (error) showToast("Gagal menyimpan profil: " + error.message, "error"); else { showToast("Profil berhasil diperbarui."); document.querySelectorAll("[data-user-name]").forEach(el => el.textContent = form.full_name.value.trim()); }
  button.disabled = false; button.textContent = "Simpan Perubahan";
});
