import { supabase, isSupabaseConfigured } from "./supabase.js";
const form = document.querySelector("#register-form");
const message = document.querySelector("#form-message");
function showMessage(text, isError = false) { message.textContent = text; message.className = `form-message ${isError ? "is-error" : "is-success"}`; }
if (!isSupabaseConfigured) showMessage("Isi konfigurasi Supabase di assets/js/config.js terlebih dahulu.", true);
form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const fullName = form.full_name.value.trim();
  const email = form.email.value.trim().toLowerCase();
  const password = form.password.value;
  const confirm = form.confirm_password.value;
  if (password.length < 8) return showMessage("Password minimal 8 karakter.", true);
  if (password !== confirm) return showMessage("Konfirmasi password tidak sama.", true);
  const button = form.querySelector("button[type=submit]");
  button.disabled = true; button.textContent = "Membuat akun...";
  const emailRedirectTo = new URL("auth-callback.html", window.location.href).href;
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { full_name: fullName }, emailRedirectTo }
  });
  if (error) { showMessage("Pendaftaran gagal: " + error.message, true); button.disabled = false; button.textContent = "Buat Akun Buyer"; return; }
  if (data.session) {
    showMessage("Akun berhasil dibuat. Mengarahkan ke dashboard...");
    location.href = "buyer/dashboard.html";
  } else {
    showMessage("Akun berhasil dibuat! Cek inbox email kamu dan klik tautan verifikasi. Setelah terverifikasi, kamu bisa login.");
    form.reset(); button.disabled = false; button.textContent = "Buat Akun Buyer";
  }
});
