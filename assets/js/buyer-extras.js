import { supabase } from "./supabase.js";
import { requireRole, escapeHTML, showToast } from "./common.js";
const context = await requireRole("buyer");
const current = document.body.dataset.page;
if (context && current === "collections") {
  const grid = document.getElementById("collections-grid");
  const { data, error } = await supabase.from("products").select("category").eq("is_active",true).order("category").limit(2000);
  if (error) {showToast("Gagal memuat koleksi: " + error.message,"error");grid.innerHTML='<div class="empty-state">Koleksi belum dapat dimuat.</div>';} else {
    const counts = new Map();
    for (const row of data||[]) {const category = row.category || "Collectible";counts.set(category,(counts.get(category)||0)+1);}
    grid.innerHTML = counts.size ? [...counts].map(([category,count])=>`<a class="collection-tile" href="shop.html?category=${encodeURIComponent(category)}"><i class="bi bi-stars tile-icon"></i><strong>${escapeHTML(category)}</strong><small>${count} FIGURE${count>1?"S":""} <i class="bi bi-arrow-up-right tile-arrow"></i></small></a>`).join("") : '<div class="empty-state">Belum ada kategori. Admin dapat menambahkan figure terlebih dahulu.</div>';
  }
}
if (context && current === "settings") {
  const form = document.getElementById("preferences-form");
  try {
    form.querySelector("#compact-cards").checked = localStorage.getItem("pop3mart_compact") === "1";
    form.querySelector("#reduce-motion").checked = localStorage.getItem("pop3mart_reduce_motion") === "1";
  } catch (_) {}
  form?.addEventListener("submit",e=>{
    e.preventDefault();
    const compact = form.querySelector("#compact-cards").checked;
    const motion = form.querySelector("#reduce-motion").checked;
    try {localStorage.setItem("pop3mart_compact",compact?"1":"0");localStorage.setItem("pop3mart_reduce_motion",motion?"1":"0");}
    catch (_) {showToast("Browser tidak mengizinkan penyimpanan preferensi.","error");return;}
    document.body.classList.toggle("compact-cards",compact);
    document.body.classList.toggle("reduce-animations",motion);
    showToast("Preferensi tampilan berhasil disimpan.");
  });
}
if (context && current === "help") {
  const {data,error} = await supabase.from("store_settings").select("support_email,whatsapp").eq("id",1).maybeSingle();
  const email = document.getElementById("support-email");const whatsapp=document.getElementById("support-whatsapp");
  if (error) showToast("Gagal memuat kontak toko.","error");
  if (email && data?.support_email) { const a=document.createElement("a");a.href=`mailto:${data.support_email}`;a.textContent=data.support_email;email.replaceChildren(a);}
  if (whatsapp && data?.whatsapp) { const a=document.createElement("a");const digits=data.whatsapp.replace(/\D/g,"");a.href=`https://wa.me/${digits}`;a.target="_blank";a.rel="noopener noreferrer";a.textContent=data.whatsapp;whatsapp.replaceChildren(a);}
  if (location.hash) {const target=document.querySelector(location.hash); if (target?.tagName === "DETAILS") target.open=true;}
}
