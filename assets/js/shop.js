import { supabase } from "./supabase.js";
import { requireRole, escapeHTML, rupiah, showToast } from "./common.js";
const context = await requireRole("buyer");
const grid = document.querySelector("#product-grid");
let products = [];
if (context) {
  const { data, error } = await supabase.from("products").select("id,name,category,description,price,stock,image_url").eq("is_active", true).order("created_at", { ascending: false });
  if (error) showToast("Tidak dapat mengambil katalog: " + error.message, "error");
  products = data || [];
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
  document.querySelector("#category-filter").innerHTML = `<option value="">Semua kategori</option>` + categories.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join("");
  renderProducts();
}
function renderProducts() {
  const query = document.querySelector("#search-products").value.trim().toLowerCase();
  const category = document.querySelector("#category-filter").value;
  const filtered = products.filter(p => (!category || p.category === category) && [p.name,p.category,p.description].join(" ").toLowerCase().includes(query));
  if (!filtered.length) { grid.innerHTML = `<div class="empty-state">Tidak ada figure yang cocok. Coba kata kunci lain.</div>`; return; }
  grid.innerHTML = filtered.map(p => `
    <article class="product-card">
      ${p.image_url ? `<img class="product-image" src="${escapeHTML(p.image_url)}" alt="${escapeHTML(p.name)}">` : `<div class="product-image product-placeholder"><i class="bi bi-box-seam"></i></div>`}
      <div class="product-card-body"><span class="eyebrow">${escapeHTML(p.category || "Collectible")}</span><h3>${escapeHTML(p.name)}</h3><p class="product-description">${escapeHTML(p.description || "Figure koleksi POP-3 MART.")}</p><div class="product-meta"><strong>${rupiah(p.price)}</strong><span class="stock-pill ${p.stock > 0 ? "in-stock" : "out-stock"}">${p.stock > 0 ? `Stok ${p.stock}` : "Habis"}</span></div><button class="comic-btn yellow-btn full-btn" data-wishlist="${p.id}"><i class="bi bi-heart"></i> Simpan ke Wishlist</button></div>
    </article>`).join("");
}
document.querySelector("#search-products")?.addEventListener("input", renderProducts);
document.querySelector("#category-filter")?.addEventListener("change", renderProducts);
grid?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-wishlist]"); if (!button || !context) return;
  button.disabled = true;
  const { error } = await supabase.from("wishlist_items").insert({ user_id: context.user.id, product_id: Number(button.dataset.wishlist) });
  if (error?.code === "23505") showToast("Figure ini sudah ada di wishlist.");
  else if (error) showToast("Gagal menyimpan wishlist: " + error.message, "error");
  else showToast("Figure berhasil ditambahkan ke wishlist!");
  button.disabled = false;
});
