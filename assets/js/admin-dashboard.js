import { supabase } from "./supabase.js";
import { requireRole, escapeHTML, rupiah, showToast } from "./common.js";
const context = await requireRole("admin");
if (context) {
  const [allProducts, activeProducts, outStock, buyers, recent] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("stock", 0),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "buyer"),
    supabase.from("products").select("id,name,price,stock,is_active").order("created_at", { ascending: false }).limit(5)
  ]);
  document.querySelector("#stat-products").textContent = allProducts.count ?? 0;
  document.querySelector("#stat-active").textContent = activeProducts.count ?? 0;
  document.querySelector("#stat-outstock").textContent = outStock.count ?? 0;
  document.querySelector("#stat-buyers").textContent = buyers.count ?? 0;
  if (recent.error) showToast(recent.error.message, "error");
  const body = document.querySelector("#recent-products");
  body.innerHTML = (recent.data || []).map(p => `<tr><td><strong>${escapeHTML(p.name)}</strong></td><td>${rupiah(p.price)}</td><td>${p.stock}</td><td><span class="status-pill ${p.is_active ? "status-active" : "status-hidden"}">${p.is_active ? "Aktif" : "Disembunyikan"}</span></td></tr>`).join("") || `<tr><td colspan="4" class="empty-cell">Belum ada produk.</td></tr>`;
}
