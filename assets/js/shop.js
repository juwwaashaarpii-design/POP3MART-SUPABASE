import { supabase } from "./supabase.js";
import { requireRole, escapeHTML, rupiah, showToast } from "./common.js";
import { productCard } from "./product-ui.js";
const context = await requireRole("buyer");
const grid = document.querySelector("#product-grid");
const dialog = document.querySelector("#product-dialog");
const params = new URLSearchParams(location.search);
const searchEl = document.querySelector("#search-products");
const categoryEl = document.querySelector("#category-filter");
const sortEl = document.querySelector("#sort-products");
let products = [];
let saved = new Set();

if (context) {
  const [catalog, wishlist] = await Promise.all([
    supabase.from("products").select("id,name,category,description,price,stock,image_url").eq("is_active",true).order("created_at", {ascending:false}),
    supabase.from("wishlist_items").select("product_id").eq("user_id",context.user.id)
  ]);
  if (catalog.error) showToast("Gagal memuat katalog: " + catalog.error.message,"error");
  if (wishlist.error) showToast("Gagal memuat wishlist: " + wishlist.error.message,"error");
  products = catalog.data || [];
  saved = new Set((wishlist.data || []).map(p => Number(p.product_id)));
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort((a,b) => a.localeCompare(b,"id"));
  categoryEl.innerHTML = `<option value="">Semua kategori</option>` + categories.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join("");
  searchEl.value = params.get("q") || "";
  categoryEl.value = params.get("category") || "";
  render();
  const detailId = Number(params.get("product"));
  if (detailId && products.some(p => Number(p.id) === detailId)) showDetails(detailId);
}
function render() {
  const query = (searchEl?.value || "").trim().toLocaleLowerCase("id-ID");
  const category = categoryEl?.value || "";
  let visible = products.filter(p => (!category || p.category === category) && [p.name,p.category,p.description].join(" ").toLocaleLowerCase("id-ID").includes(query));
  switch (sortEl?.value) {
    case "price-low": visible.sort((a,b)=>a.price-b.price);break;
    case "price-high": visible.sort((a,b)=>b.price-a.price);break;
    case "name": visible.sort((a,b)=>a.name.localeCompare(b.name,"id"));break;
  }
  document.querySelector("#result-count").textContent = `${visible.length} figures`;
  grid.innerHTML = visible.length ? visible.map(p => productCard(p,{mode:"shop",saved:saved.has(Number(p.id))})).join("")
    : `<div class="empty-state">Tidak ada figure yang cocok. Coba kata kunci atau kategori lain.</div>`;
}

function showDetails(id) {
  const p = products.find(p => Number(p.id) === Number(id));
  if (!p || !dialog) return;
  const img = p.image_url ? `<img src="${escapeHTML(p.image_url)}" alt="${escapeHTML(p.name)}">` : `<div class="detail-placeholder product-placeholder"><i class="bi bi-box-seam"></i></div>`;
  document.querySelector("#product-dialog-content").innerHTML = `<div class="detail-layout">${img}<div><span class="hero-eyebrow">${escapeHTML(p.category || "Collectible")}</span><h3>${escapeHTML(p.name)}</h3><p>${escapeHTML(p.description || "Figure koleksi POP-3 MART.")}</p><p class="detail-price">${rupiah(p.price)}</p><p><strong>${Number(p.stock) > 0 ? `Stok tersedia: ${Number(p.stock)}` : "Stok sedang habis"}</strong></p><button type="button" class="comic-btn yellow-btn" data-wishlist="${Number(p.id)}"><i class="bi bi-heart${saved.has(Number(p.id)) ? '-fill' : ''}"></i> ${saved.has(Number(p.id)) ? "REMOVE FROM WISHLIST" : "ADD TO WISHLIST"}</button></div></div>`;
  dialog.showModal();
}

searchEl?.addEventListener("input",render);
categoryEl?.addEventListener("change",render);
sortEl?.addEventListener("change",render);
document.querySelector("#reset-filters")?.addEventListener("click",() => {
  searchEl.value = ""; categoryEl.value = ""; sortEl.value = "latest";
  history.replaceState({},"",location.pathname);render();
});
document.querySelector("#close-product-dialog")?.addEventListener("click",()=>dialog.close());
dialog?.addEventListener("click", e => { if (e.target === dialog) dialog.close(); });
dialog?.addEventListener("close",()=> {if (location.search.includes("product=")) { const url = new URL(location.href);url.searchParams.delete("product");history.replaceState({},"",url);}});

async function toggleWishlist(id,button) {
  if (!context) return;
  const p = products.find(p=>Number(p.id) === id);
  if (!p) return;
  button.disabled = true;
  const present = saved.has(id);
  const response = present
    ? await supabase.from("wishlist_items").delete().eq("user_id",context.user.id).eq("product_id",id)
    : await supabase.from("wishlist_items").insert({user_id:context.user.id,product_id:id});
  if (response.error && response.error.code !== "23505") showToast("Wishlist gagal diperbarui: " + response.error.message,"error");
  else {
    if (present) saved.delete(id); else saved.add(id);
    showToast(present ? "Figure dihapus dari wishlist." : "Figure disimpan ke wishlist!");
    render();
    if (dialog.open) showDetailsUpdate(id);
  }
  button.disabled = false;
}
function showDetailsUpdate(id) {
  const button = dialog.querySelector("[data-wishlist]");
  if (!button) return;
  const s = saved.has(id);
  button.innerHTML = `<i class="bi bi-heart${s ? '-fill' : ''}"></i> ${s ? "REMOVE FROM WISHLIST" : "ADD TO WISHLIST"}`;
}
document.addEventListener("click",async e => {
  const link = e.target.closest('a[href*="?product="]');
  if (link && link.closest("#product-grid")) {
    e.preventDefault();
    const url = new URL(link.href);
    showDetails(Number(url.searchParams.get("product")));
  }
  const button = e.target.closest("[data-wishlist]");
  if (button) await toggleWishlist(Number(button.dataset.wishlist),button);
});
