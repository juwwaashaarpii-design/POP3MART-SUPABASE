import { supabase } from "./supabase.js";
import { requireRole, escapeHTML, rupiah, showToast } from "./common.js";
const context = await requireRole("admin");
if (context) {
  const [allProducts, activeProducts, outStock, buyers, recent] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("stock", 0),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "buyer"),
    supabase.from("products").select("id,name,price,stock,is_active,image_url").order("created_at", { ascending: false }).limit(5)
  ]);
  document.querySelector("#stat-products").textContent = allProducts.count ?? 0;
  document.querySelector("#stat-active").textContent = activeProducts.count ?? 0;
  document.querySelector("#stat-outstock").textContent = outStock.count ?? 0;
  document.querySelector("#stat-buyers").textContent = buyers.count ?? 0;
  if (recent.error) showToast(recent.error.message, "error");
  const body = document.querySelector("#recent-products");
  body.innerHTML = (recent.data || []).map(p => {
    const figureImage = p.image_url
      ? `<img class="recent-figure-thumb" src="${escapeHTML(p.image_url)}" alt="Foto ${escapeHTML(p.name)}" loading="lazy" decoding="async">`
      : `<div class="recent-figure-thumb thumb-placeholder" aria-label="Belum ada gambar"><i class="bi bi-image" aria-hidden="true"></i></div>`;
    return `<tr>
      <td class="image-col">${figureImage}</td>
      <td><strong>${escapeHTML(p.name)}</strong></td>
      <td>${rupiah(p.price)}</td>
      <td>${p.stock}</td>
      <td><span class="status-pill ${p.is_active ? "status-active" : "status-hidden"}">${p.is_active ? "Aktif" : "Disembunyikan"}</span></td>
    </tr>`;
  }).join("") || `<tr><td colspan="5" class="empty-cell">Belum ada produk.</td></tr>`;
}

if(context){
 const {data,error}=await supabase.from('orders').select('id,product_name,total_amount,order_status,created_at').order('created_at',{ascending:false}).limit(100);
 const awaiting=(data||[]).filter(o=>o.order_status==='under_review');
 const {count: reviewCount}=await supabase.from('orders').select('id',{count:'exact',head:true}).eq('order_status','under_review');
 document.querySelector('#stat-awaiting').textContent=reviewCount??awaiting.length;
 const host=document.querySelector('#recent-payments');
 if(error){host.innerHTML='<div class="empty-state">Jalankan database/upgrade_checkout.sql untuk mengaktifkan order & pembayaran.</div>';}
 else{host.innerHTML=awaiting.length?awaiting.slice(0,5).map(o=>`<a class="mini-order" href="payments.html"><strong>${escapeHTML(o.product_name)}</strong><span>${rupiah(o.total_amount)}</span><span class="status-pill status-under_review">PERIKSA BUKTI</span></a>`).join(''):'<p class="empty-state">Belum ada pembayaran yang perlu diverifikasi.</p>';}
}
