import { supabase, isSupabaseConfigured } from "./supabase.js";
const form = document.querySelector("#login-form");
const message = document.querySelector("#form-message");
function showMessage(text, isError = false) { message.textContent = text; message.className = `form-message ${isError ? "is-error" : "is-success"}`; }
if (!isSupabaseConfigured) showMessage("Isi konfigurasi Supabase di assets/js/config.js terlebih dahulu.", true);
form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = form.querySelector("button[type=submit]");
  button.disabled = true; button.textContent = "Memeriksa akun...";
  const email = form.email.value.trim().toLowerCase();
  const password = form.password.value;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    showMessage(error.message.includes("Email not confirmed") ? "Email belum diverifikasi. Buka email konfirmasi terlebih dahulu." : "Login gagal: " + error.message, true);
    button.disabled = false; button.textContent = "Login"; return;
  }
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
  if (profileError || !profile) { showMessage("Profil tidak ditemukan. Jalankan database/schema.sql di Supabase.", true); button.disabled = false; button.textContent = "Login"; return; }
  location.href = profile.role === "admin" ? "admin/dashboard.html" : "buyer/dashboard.html";
});
