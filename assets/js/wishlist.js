import { supabase } from "./supabase.js";
import { requireRole, showToast } from "./common.js";
import { productCard } from "./product-ui.js";
const context = await requireRole("buyer");
const host = document.querySelector("#wishlist-grid");
async function loadWishlist() {
  if (!context) return;
  const { data, error } = await supabase.from("wishlist_items")
    .select("id,products(id,name,category,price,stock,image_url)").eq("user_id",context.user.id)
    .order("created_at",{ascending:false});
  if (error) {showToast("Gagal memuat wishlist: " + error.message,"error");return;}
  const rows = (data||[]).filter(row => row.products);
  host.innerHTML = rows.length ? rows.map(row => productCard(row.products,{mode:"wishlist",wishlistId:row.id})).join("")
    : `<div class="empty-state">Wishlist masih kosong. Coba jelajahi Shop Figures untuk menyimpan koleksimu!</div>`;
}
if (context) await loadWishlist();
host?.addEventListener("click",async event=>{
  const button = event.target.closest("[data-remove]");if (!button || !context) return;
  button.disabled = true;
  const {error} = await supabase.from("wishlist_items").delete().eq("id",button.dataset.remove).eq("user_id",context.user.id);
  if(error){showToast("Gagal menghapus: " + error.message,"error");button.disabled=false;}
  else {showToast("Figure dihapus dari wishlist.");await loadWishlist();}
});
