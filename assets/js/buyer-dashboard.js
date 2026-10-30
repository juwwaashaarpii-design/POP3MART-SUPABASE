import { supabase } from "./supabase.js";
import { requireRole, escapeHTML, rupiah, showToast } from "./common.js";
const context = await requireRole("buyer");
if (context) {
  const [{ data: products, error }, { count: wishlistCount }] = await Promise.all([
    supabase.from("products").select("id,name,category,price,stock,image_url").eq("is_active", true).order("created_at", { ascending: false }).limit(4),
    supabase.from("wishlist_items").select("id", { count: "exact", head: true }).eq("user_id", context.user.id)
  ]);
  if (error) showToast("Gagal memuat katalog: " + error.message, "error");
  document.querySelector("#wishlist-count").textContent = wishlistCount ?? 0;
  document.querySelector("#catalog-count").textContent = products?.length ?? 0;
  const host = document.querySelector("#latest-products");
  if (!products?.length) host.innerHTML = `<div class="empty-state">Belum ada figure. Admin dapat menambahkan produk melalui Admin Dashboard.</div>`;
  else host.innerHTML = products.map(p => `
    <article class="product-card">
      ${p.image_url ? `<img class="product-image" src="${escapeHTML(p.image_url)}" alt="${escapeHTML(p.name)}">` : `<div class="product-image product-placeholder"><i class="bi bi-box-seam"></i></div>`}
      <div class="product-card-body"><span class="eyebrow">${escapeHTML(p.category || "Collectible")}</span><h3>${escapeHTML(p.name)}</h3><div class="product-meta"><strong>${rupiah(p.price)}</strong><span class="stock-pill ${p.stock > 0 ? "in-stock" : "out-stock"}">${p.stock > 0 ? `Stok ${p.stock}` : "Habis"}</span></div></div>
    </article>`).join("");
}
