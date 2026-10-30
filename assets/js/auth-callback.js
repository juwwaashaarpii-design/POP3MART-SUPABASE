import { supabase } from "./supabase.js";
const status = document.querySelector("#callback-status");
status.textContent = "Memverifikasi sesi akun...";
// Supabase JS mendeteksi token konfirmasi pada URL ketika client dibuat.
const { data: { session }, error } = await supabase.auth.getSession();
if (error || !session) {
  status.textContent = "Verifikasi belum berhasil. Coba klik tautan terbaru di email, atau minta tautan verifikasi baru.";
} else {
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
  status.textContent = "Email berhasil diverifikasi. Mengarahkan...";
  setTimeout(() => location.replace(profile?.role === "admin" ? "admin/dashboard.html" : "buyer/dashboard.html"), 900);
}
