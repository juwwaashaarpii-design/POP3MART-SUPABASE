import { supabase } from "./supabase.js";
import { requireRole, showToast,escapeHTML,rupiah } from "./common.js";
import { productCard } from "./product-ui.js";
const context = await requireRole("buyer");
if (context) {
  const [pResult, wishlistResult, categoriesResult] = await Promise.all([
    supabase.from("products").select("id,name,category,price,stock,image_url", { count: "exact" }).eq("is_active", true).order("created_at", { ascending: false }).limit(4),
    supabase.from("wishlist_items").select("id", { count: "exact", head: true }).eq("user_id", context.user.id),
    supabase.from("products").select("category").eq("is_active", true).limit(2000)
  ]);
  if (pResult.error) showToast("Gagal memuat katalog: " + pResult.error.message, "error");
  if (wishlistResult.error) showToast("Gagal memuat jumlah wishlist: " + wishlistResult.error.message, "error");
  document.querySelector("#wishlist-count").textContent = wishlistResult.count ?? "–";
  document.querySelector("#catalog-count").textContent = pResult.count ?? "–";
  document.querySelector("#category-count").textContent = categoriesResult.error ? "–" : new Set((categoriesResult.data || []).map(p => p.category || "Collectible")).size;
  const host = document.querySelector("#latest-products");
  const products = pResult.data || [];
  host.innerHTML = products.length
    ? products.map(p => productCard(p)).join("")
    : `<div class="empty-state">Belum ada figure aktif di katalog. Admin dapat menambahkan produk di halaman Manage Figures.</div>`;
}

// Live purchase summary from RLS-protected orders (buyer only).
if(context){
 const {data,error}=await supabase.from('orders').select('id,product_name,total_amount,order_status,created_at').eq('user_id',context.user.id).order('created_at',{ascending:false}).limit(5);
 if(error){showToast('Pesanan belum dapat dimuat: '+error.message,'error');}
 else{
  const rows=data||[];
  const {count}=await supabase.from('orders').select('id',{count:'exact',head:true}).eq('user_id',context.user.id);
  document.querySelector('#orders-count').textContent=count??rows.length;
  document.querySelector('#recent-orders').innerHTML=rows.length?rows.map(o=>`<tr><td><strong>${escapeHTML(o.product_name)}</strong></td><td>${new Date(o.created_at).toLocaleDateString('id-ID')}</td><td>${rupiah(o.total_amount)}</td><td><a class="status-pill status-${escapeHTML(o.order_status)}" href="orders.html?order=${encodeURIComponent(o.id)}">${escapeHTML(o.order_status.replace(/_/g,' ').toUpperCase())}</a></td></tr>`).join(''):'<tr><td colspan="4" class="empty-cell">Belum ada transaksi. Jelajahi katalog untuk mulai membeli figure!</td></tr>';
 }
}
