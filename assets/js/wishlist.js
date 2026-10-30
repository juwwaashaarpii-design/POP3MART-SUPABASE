import { supabase } from "./supabase.js";
import { requireRole, escapeHTML, rupiah, showToast } from "./common.js";
const context = await requireRole("buyer");
const host = document.querySelector("#wishlist-grid");
async function loadWishlist() {
  if (!context) return;
  const { data, error } = await supabase.from("wishlist_items").select("id,products(id,name,category,price,stock,image_url)").eq("user_id", context.user.id).order("created_at", { ascending: false });
  if (error) { showToast("Gagal memuat wishlist: " + error.message, "error"); return; }
  const rows = (data || []).filter(row => row.products);
  if (!rows.length) { host.innerHTML = `<div class="empty-state">Wishlist kamu masih kosong. Jelajahi katalog dan simpan figure favoritmu.</div>`; return; }
  host.innerHTML = rows.map(row => { const p = row.products; return `<article class="product-card">${p.image_url ? `<img class="product-image" src="${escapeHTML(p.image_url)}" alt="${escapeHTML(p.name)}">` : `<div class="product-image product-placeholder"><i class="bi bi-box-seam"></i></div>`}<div class="product-card-body"><span class="eyebrow">${escapeHTML(p.category || "Collectible")}</span><h3>${escapeHTML(p.name)}</h3><div class="product-meta"><strong>${rupiah(p.price)}</strong><span class="stock-pill ${p.stock > 0 ? "in-stock" : "out-stock"}">${p.stock > 0 ? `Stok ${p.stock}` : "Habis"}</span></div><button class="comic-btn red-btn full-btn" data-remove="${row.id}"><i class="bi bi-trash"></i> Hapus dari Wishlist</button></div></article>`; }).join("");
}
if (context) await loadWishlist();
host?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-remove]"); if (!button) return;
  const { error } = await supabase.from("wishlist_items").delete().eq("id", button.dataset.remove).eq("user_id", context.user.id);
  if (error) showToast("Gagal menghapus: " + error.message, "error"); else { showToast("Figure dihapus dari wishlist."); await loadWishlist(); }
});
