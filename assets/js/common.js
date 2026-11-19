import { supabase, isSupabaseConfigured } from "./supabase.js";

export function escapeHTML(value = "") {
  return String(value).replace(/[&<>\"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;", "'": "&#039;"
  }[char]));
}

export function rupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", maximumFractionDigits: 0
  }).format(Number(value || 0));
}

export function showToast(message, type = "success") {
  let host = document.querySelector("#toast-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "toast-host";
    host.className = "toast-host";
    document.body.appendChild(host);
  }
  const item = document.createElement("div");
  item.className = `toast-message ${type === "error" ? "toast-error" : "toast-success"}`;
  item.textContent = message;
  host.appendChild(item);
  window.setTimeout(() => item.remove(), 4200);
}

export async function getProfile() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { user: null, profile: null, error: userError };
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,display_name,avatar_path,phone,address,role")
    .eq("id", user.id)
    .single();
  return { user, profile, error };
}


export function paintUserIdentity(profile, user) {
  const name = (profile?.display_name || profile?.full_name || user?.email || "Pengguna").trim();
  const initial = name.charAt(0).toUpperCase();
  document.querySelectorAll("[data-user-name]").forEach(el => el.textContent = name);
  document.querySelectorAll("[data-user-email]").forEach(el => el.textContent = user?.email || "");
  document.querySelectorAll("[data-user-role]").forEach(el => el.textContent = profile?.role === "admin" ? "Administrator" : "Buyer");
  const path = profile?.avatar_path;
  const url = path ? supabase.storage.from("profile-avatars").getPublicUrl(path).data.publicUrl : null;
  document.querySelectorAll("[data-user-initial]").forEach(el => {
    el.replaceChildren();
    if (url) {
      const img = document.createElement("img");
      img.src = url; img.alt = `Foto profil ${name}`; img.loading = "lazy";
      img.onerror = () => {if (el.contains(img)) el.textContent=initial;};
      el.append(img);
    } else el.textContent = initial;
  });
}

export async function requireRole(role) {
  if (!isSupabaseConfigured) {
    document.body.innerHTML = `<main class="setup-warning"><h1>Supabase belum dikonfigurasi</h1><p>Buka <code>assets/js/config.js</code>, lalu isi Project URL dan Publishable Key dari Supabase.</p></main>`;
    return null;
  }
  const { data: { session } } = await supabase.auth.getSession();
  const loginPath = location.pathname.includes("/admin/") || location.pathname.includes("/buyer/") ? "../login.html" : "login.html";
  if (!session) { location.replace(loginPath); return null; }
  const { user, profile, error } = await getProfile();
  if (error || !profile) {
    showToast("Profil akun belum tersedia. Pastikan SQL schema sudah dijalankan.", "error");
    return null;
  }
  if (role && profile.role !== role) {
    location.replace(profile.role === "admin" ? "../admin/dashboard.html" : "../buyer/dashboard.html");
    return null;
  }
  paintUserIdentity(profile, user);
  return { user, profile };
}

export async function logout(redirect = "../login.html") {
  await supabase.auth.signOut();
  location.href = redirect;
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-logout]");
  if (button) {
    event.preventDefault();
    const target = button.dataset.redirect || "../login.html";
    logout(target);
  }
});
